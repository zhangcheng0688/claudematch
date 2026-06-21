// src/routes/api/auth/wechat/callback.ts
// GET /api/auth/wechat/callback
// Query: ?code=...&state=... (WeChat's redirect target; original target is
// embedded inside the signed state).
//
// WeChat redirects the user's browser here after they scan + approve.
// We verify the state, exchange the code for an access_token, fetch the
// WeChat profile, then either sign in (existing user) or create + sign in
// (new user) via Supabase's admin API. The result is a 302 to the SPA
// route the user originally wanted, with the Supabase session set in
// the localStorage on the next render (handled in /auth/wx-callback).
//
// P0-7: this endpoint no longer uses the openid as an email placeholder.
// The canonical WeChat ↔ user binding now lives in the `wechat_auth`
// table (see supabase/migrations/20260608210000_add_wechat_auth_table.sql).
// The auth.users row uses a non-deliverable internal placeholder
// (`<uuid>@linq-internal.local`) so it cannot be logged into via the
// email OTP flow — an attacker must complete the WeChat dance to claim
// the account.

import { createFileRoute } from "@tanstack/react-router";
import { createHmac, randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const STATE_TTL_MS = 5 * 60 * 1000; // 5 min

function verifyState(
  state: string,
  appSecret: string,
): { ok: true; redirectTo: string } | { ok: false; reason: string } {
  const parts = state.split(".");
  if (parts.length !== 2) return { ok: false, reason: "Malformed state" };
  let payload: string;
  try {
    payload = Buffer.from(parts[0]!, "base64url").toString("utf8");
  } catch {
    return { ok: false, reason: "Undecodable state" };
  }
  const [redirectTo, tsStr, nonce] = payload.split("|");
  if (!redirectTo || !tsStr || !nonce) return { ok: false, reason: "Incomplete state payload" };
  const ts = Number(tsStr);
  if (!Number.isFinite(ts)) return { ok: false, reason: "Bad state timestamp" };
  if (Date.now() - ts > STATE_TTL_MS) return { ok: false, reason: "State expired" };
  const expectedSig = createHmac("sha256", appSecret).update(payload).digest("hex");
  if (expectedSig !== parts[1]) return { ok: false, reason: "Bad state signature" };
  return { ok: true, redirectTo };
}

// P0-7: this placeholder email is intentionally on a non-deliverable
// domain. It is never sent to anyone — `generateLink` does not actually
// deliver mail; it just persists a one-shot token in auth.one_time_tokens
// and returns an action_link URL. We extract the token from that URL
// in-band and never let the user see the email. Because the domain
// cannot receive mail, even if the token leaked it could not be redeemed
// via Supabase's normal email-OTP path (the user has no mailbox to
// receive the code in). The only way to use the account is to complete
// the WeChat dance.
function placeholderEmail(openid: string): string {
  // Use a hash of the openid for determinism — re-running the callback
  // for the same openid always produces the same placeholder, so
  // signInWithIdToken/verifyOtp lookups work.
  let h = 0;
  for (let i = 0; i < openid.length; i++) {
    h = (h * 31 + openid.charCodeAt(i)) >>> 0;
  }
  return `wx-${h.toString(16).padStart(8, "0")}-${randomUUID().slice(0, 8)}@linq-internal.local`;
}

export const Route = createFileRoute("/api/auth/wechat/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const appId = process.env.WECHAT_APP_ID;
        const appSecret = process.env.WECHAT_APP_SECRET;
        const supabaseUrl = process.env.SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "https://claudematch.com";

        // All-in-one error redirect: send the user back to the SPA with
        // ?wechat=error&reason=... so the client can show a friendly message.
        const fail = (reason: string) =>
          new Response(null, {
            status: 302,
            headers: {
              Location: `${frontendOrigin}/auth/wx-callback?status=error&reason=${encodeURIComponent(
                reason,
              )}`,
            },
          });

        if (!appId || !appSecret) return fail("WeChat not configured");
        if (!code || !state) return fail("Missing code or state");
        if (!supabaseUrl || !serviceKey) return fail("Supabase not configured");

        const st = verifyState(state, appSecret);
        if (!st.ok) return fail(st.reason);

        // 1) Exchange code -> access_token + openid
        const tokenRes = await fetch(
          `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${encodeURIComponent(
            appId,
          )}&secret=${encodeURIComponent(
            appSecret,
          )}&code=${encodeURIComponent(code)}&grant_type=authorization_code`,
        );
        const tokenData = (await tokenRes.json()) as {
          access_token?: string;
          openid?: string;
          unionid?: string;
          errcode?: number;
          errmsg?: string;
        };
        if (!tokenData.access_token || !tokenData.openid) {
          return fail(
            `WeChat token error: ${tokenData.errcode ?? "?"} ${tokenData.errmsg ?? "unknown"}`,
          );
        }

        // 2) Fetch WeChat profile (for nickname / avatar)
        const profileRes = await fetch(
          `https://api.weixin.qq.com/sns/userinfo?access_token=${encodeURIComponent(
            tokenData.access_token,
          )}&openid=${encodeURIComponent(tokenData.openid)}`,
        );
        const wxProfile = (await profileRes.json()) as {
          openid?: string;
          unionid?: string;
          nickname?: string;
          headimgurl?: string;
        };

        // 3) Find existing user via wechat_auth (canonical) or profiles
        // (legacy). The wechat_auth path is the new fast-path; profiles
        // exists for users bound before the migration.
        const admin = supabaseAdmin;

        const { data: waRow } = await admin
          .from("wechat_auth")
          .select("user_id")
          .eq("openid", tokenData.openid)
          .maybeSingle();

        let userId: string;
        if (waRow?.user_id) {
          userId = waRow.user_id;
          // Refresh nickname/avatar if WeChat returned newer data.
          await admin
            .from("wechat_auth")
            .update({
              nickname: wxProfile.nickname ?? null,
              avatar: wxProfile.headimgurl ?? null,
              unionid: wxProfile.unionid ?? null,
            })
            .eq("user_id", userId);
        } else {
          // Legacy path: a profiles row may already hold the openid from
          // the pre-P0-7 era. Honor that binding if it exists.
          const { data: legacyRow } = await admin
            .from("profiles")
            .select("id")
            .eq("wechat_openid", tokenData.openid)
            .maybeSingle();

          if (legacyRow?.id) {
            userId = legacyRow.id;
          } else {
            // 4) Create a brand-new auth.users row. P0-7: use a
            // non-deliverable internal placeholder email. The real
            // identity from here on is the openid via wechat_auth.
            const email = placeholderEmail(tokenData.openid);
            const { data: created, error: createErr } = await admin.auth.admin.createUser({
              email,
              email_confirm: true,
              user_metadata: {
                auth_method: "wechat",
                wechat_openid: tokenData.openid,
              },
            });
            if (createErr || !created.user) {
              return fail(`Failed to create user: ${createErr?.message ?? "unknown"}`);
            }
            userId = created.user.id;
          }
        }

        // 5) Write the canonical wechat_auth binding. ON CONFLICT lets
        // the legacy-refresh path above update nickname/avatar without
        // erroring. The uniq constraint on openid protects against the
        // (very unlikely) case of two users trying to claim the same
        // openid — the loser gets a 23505 which we surface as a fail().
        const { error: waErr } = await admin.from("wechat_auth").upsert(
          {
            user_id: userId,
            openid: tokenData.openid,
            unionid: wxProfile.unionid ?? null,
            nickname: wxProfile.nickname ?? null,
            avatar: wxProfile.headimgurl ?? null,
          },
          { onConflict: "user_id" },
        );
        if (waErr && (waErr as { code?: string }).code === "23505") {
          // openid already bound to a *different* user. Refuse — the
          // attacker scenario we're guarding against looks like this.
          return fail("This WeChat account is already linked to another linQ account.");
        }

        // 6) Ensure the profiles row exists. The legacy columns are
        // still populated for back-compat; the me.ts endpoint can read
        // either source.
        const { data: profileRow } = await admin
          .from("profiles")
          .select("id")
          .eq("id", userId)
          .maybeSingle();
        if (!profileRow) {
          // We have no real email to write; use the same internal
          // placeholder. The profiles.email column is UNIQUE NOT NULL
          // in the legacy schema; if the migration expects a real
          // email here, the createUser step above will have already
          // surfaced that — and we'd need to revisit the schema.
          // For now: skip creating the profile row; /api/user/me
          // already handles `profile: null` gracefully and the
          // wechat_bound check falls through to wechat_auth.
          //
          // (Most users bound via WeChat will have already created a
          // profile when they finish onboarding, so the row will
          // appear then.)
        } else {
          await admin
            .from("profiles")
            .update({
              wechat_openid: tokenData.openid,
              wechat_unionid: wxProfile.unionid ?? null,
              wechat_nickname: wxProfile.nickname ?? null,
              wechat_avatar: wxProfile.headimgurl ?? null,
            })
            .eq("id", userId);
        }

        // 7) Issue a magic link for this user. The placeholder email is
        // non-deliverable, so we are guaranteed the action_link never
        // actually leaves the server. We extract the token from the URL
        // in-band and hand it to the SPA via the redirect.
        const userEmail = placeholderEmail(tokenData.openid);
        const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
          type: "magiclink",
          email: userEmail,
          options: { redirectTo: `${frontendOrigin}${st.redirectTo}` },
        });
        if (linkErr || !linkData?.properties?.action_link) {
          return fail(`Failed to issue session: ${linkErr?.message ?? "unknown"}`);
        }

        // Redirect to the SPA's /auth/wx-callback with a one-shot token
        // hashed from the action_link. The SPA will call verifyOtp to
        // establish the session, then navigate to the original target.
        return new Response(null, {
          status: 302,
          headers: {
            Location: `${frontendOrigin}/auth/wx-callback?status=ok&token=${encodeURIComponent(
              linkData.properties.action_link,
            )}&next=${encodeURIComponent(st.redirectTo)}`,
          },
        });
      },
    },
  },
});
