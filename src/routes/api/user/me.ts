// src/routes/api/user/me.ts
// GET /api/user/me — return current user (email + WeChat bind status) plus
// profile, scenario authorizations, and latest AI profile.

import { createFileRoute } from "@tanstack/react-router";
import { json, preflight, requireUser } from "@/lib/api/_helpers.server";

export const Route = createFileRoute("/api/user/me")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const { userId, supabase, email } = auth;

        const [{ data: profile }, { data: authz }, { data: aiProfile }] = await Promise.all([
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

        // WeChat binding flag — populated by /api/auth/wechat/callback when
        // a WeChat user links an account. The wechat_openid column is added
        // by supabase/migrations/20260608_add_wechat_openid.sql.
        const wechatBound = Boolean(
          (profile as { wechat_openid?: string | null } | null)?.wechat_openid,
        );

        return json({
          data: {
            user: { id: userId, email, wechat_bound: wechatBound },
            profile: profile ?? null,
            authorizations: authz ?? { business: false, dating: false, partner: false },
            ai_profile: aiProfile ?? null,
          },
        });
      },
    },
  },
});
