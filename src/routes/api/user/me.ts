// src/routes/api/user/me.ts
// GET /api/user/me — return current user (email + WeChat bind status) plus
// profile, scenario authorizations, and latest AI profile.

import { createFileRoute } from "@tanstack/react-router";
import { json, preflight, requireUser, safeError } from "@/lib/api/_helpers.server";
import { migrateAiProfile } from "@/lib/api/migrate-profile";
import { drainAllQueuesFireAndForget } from "@/lib/email/scheduler";

export const Route = createFileRoute("/api/user/me")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const { userId, supabase, email } = auth;

        const [{ data: profile }, { data: authz }, { data: aiProfileRow }] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
          supabase.from("user_authorizations").select("*").eq("user_id", userId).maybeSingle(),
          supabase
            .from("user_profiles")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        // WeChat binding flag. After P0-7 the canonical source of truth is
        // the `wechat_auth` table (which the callback now writes to). The
        // profile.wechat_openid column is kept for legacy rows; the OR
        // below ensures either path still flips the bound state correctly.
        let wechatBound = Boolean(
          (profile as { wechat_openid?: string | null } | null)?.wechat_openid,
        );
        if (!wechatBound) {
          const { data: wa } = await supabase
            .from("wechat_auth")
            .select("user_id")
            .eq("user_id", userId)
            .maybeSingle();
          wechatBound = Boolean(wa?.user_id);
        }

        // P1-3: normalize the AI profile through migrateAiProfile so
        // the SPA never has to defend-read v1/v2/v3 vs v4 fields.
        // The raw row's `profile_data` may be a v1 shape (legacy
        // users bound via WeChat before v2), so the migration is
        // necessary even though generate-profile.ts now writes v4.
        const rawAi = (aiProfileRow as { profile_data?: unknown } | null)?.profile_data;
        const aiProfile = rawAi
          ? {
              ...(aiProfileRow as Record<string, unknown>),
              profile_data: {
                ...(typeof rawAi === "object" && rawAi !== null
                  ? (rawAi as Record<string, unknown>)
                  : {}),
                ai: migrateAiProfile(
                  typeof rawAi === "object" && rawAi !== null
                    ? (rawAi as { ai?: unknown }).ai
                    : undefined,
                ),
              },
            }
          : null;

        // 漏洞 B + H: drain the email queues lazily. Any API hit
        // becomes a scheduler tick. 0 cron required (架构债 I).
        drainAllQueuesFireAndForget();

        return json(
          {
            data: {
              user: { id: userId, email, wechat_bound: wechatBound },
              profile: profile ?? null,
              authorizations: authz ?? {
                business: false,
                dating: false,
                partner: false,
                discoverable: true,
              },
              ai_profile: aiProfile,
            },
          },
          undefined,
          request,
        );
      },
    },
  },
});
