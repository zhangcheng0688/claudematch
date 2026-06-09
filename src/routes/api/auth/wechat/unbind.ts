// src/routes/api/auth/wechat/unbind.ts
// POST /api/auth/wechat/unbind — clear the WeChat binding on the current user.
// After P0-7, the canonical binding lives in the wechat_auth table. We also
// clear the legacy profile columns (kept for back-compat with rows created
// before the migration).

import { createFileRoute } from "@tanstack/react-router";
import { json, preflight, requireUser, safeError } from "@/lib/api/_helpers.server";

export const Route = createFileRoute("/api/auth/wechat/unbind")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const { userId, supabase } = auth;

        // Best-effort delete on both sources; tolerate missing tables/rows.
        await supabase.from("wechat_auth").delete().eq("user_id", userId);

        const { error } = await supabase
          .from("profiles")
          .update({
            wechat_openid: null,
            wechat_unionid: null,
            wechat_nickname: null,
            wechat_avatar: null,
          })
          .eq("id", userId);

        if (error) return json({ error: safeError(error) }, { status: 500 }, request);
        return json({ data: { unbound: true } }, undefined, request);
      },
    },
  },
});
