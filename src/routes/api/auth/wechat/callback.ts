// src/routes/api/auth/wechat/callback.ts
// GET /api/auth/wechat/callback
// Query: ?code=...&state=...&redirect_to=... (WeChat's redirect target)
//
// WeChat redirects the user's browser here after they scan + approve.
// We verify the state, exchange the code for an access_token, fetch the
// WeChat profile, then either sign in (existing user) or create + sign in
// (new user) via Supabase's admin API. The result is a 302 to the SPA
// route the user originally wanted, with the Supabase session set in
// the localStorage on the next render (handled in /auth/wx-callback).

import { createFileRoute } from "@tanstack/react-router";
import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const STATE_TTL_MS = 5 * 60 * 1000; // 5 min

function verifyState(state: string, appSecret: string): { ok: true; redirectTo: string } | { ok: false; reason: string } {
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
        const frontendOrigin =
          process.env.FRONTEND_ORIGIN ?? "https://claudematch.com";

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

        // 3) Find existing user by wechat_openid in profiles table
        const admin = createClient<Database>(supabaseUrl, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: existing } = await admin
          .from("profiles")
          .select("id")
          .eq("wechat_openid", tokenData.openid)
          .maybeSingle();

        let userId: string;
        if (existing?.id) {
          userId = existing.id;
        } else {
          // Create a new Supabase auth user. Email is a placeholder so the
          // auth.users table is happy; the WeChat openid is the real
          // identity going forward.
          const placeholderEmail = `wx_${tokenData.openid}@wechat.linq.app`;
          const { data: created, error: createErr } =
            await admin.auth.admin.createUser({
              email: placeholderEmail,
              email_confirm: true,
              user_metadata: {
                wechat_openid: tokenData.openid,
                wechat_unionid: wxProfile.unionid ?? null,
                nickname: wxProfile.nickname ?? null,
                avatar: wxProfile.headimgurl ?? null,
              },
            });
          if (createErr || !created.user) {
            return fail(`Failed to create user: ${createErr?.message ?? "unknown"}`);
          }
          userId = created.user.id;
        }

        // 4) Ensure profiles row exists + write wechat_openid / nickname
        const { data: profileRow } = await admin
          .from("profiles")
          .select("id")
          .eq("id", userId)
          .maybeSingle();
        if (!profileRow) {
          await admin.from("profiles").insert({
            id: userId,
            email: `wx_${tokenData.openid}@wechat.linq.app`,
            wechat_openid: tokenData.openid,
            wechat_unionid: wxProfile.unionid ?? null,
            wechat_nickname: wxProfile.nickname ?? null,
            wechat_avatar: wxProfile.headimgurl ?? null,
          });
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

        // 5) Generate a magic-link-style OTP for this user, then redirect
        // to the SPA which calls verifyOtp to establish a session.
        // (Supabase admin doesn't directly expose session creation for
        // arbitrary email; the verifyOtp-via-signInWithOtp round-trip
        // is the simplest no-password path. The user_metadata is already
        // set; the client just needs to consume the magic link.)
        const { data: linkData, error: linkErr } =
          await admin.auth.admin.generateLink({
            type: "magiclink",
            email: `wx_${tokenData.openid}@wechat.linq.app`,
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
