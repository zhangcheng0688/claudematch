// src/routes/api/auth/wechat/unbind.ts
// POST /api/auth/wechat/unbind — clear the WeChat binding on the current user.

import { createFileRoute } from "@tanstack/react-router";
import { json, preflight, requireUser } from "@/lib/api/_helpers.server";

export const Route = createFileRoute("/api/auth/wechat/unbind")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const { userId, supabase } = auth;

        const { error } = await supabase
          .from("profiles")
          .update({
            wechat_openid: null,
            wechat_unionid: null,
            wechat_nickname: null,
            wechat_avatar: null,
          })
          .eq("id", userId);

        if (error) return json({ error: error.message }, { status: 500 });
        return json({ data: { unbound: true } });
      },
    },
  },
});
