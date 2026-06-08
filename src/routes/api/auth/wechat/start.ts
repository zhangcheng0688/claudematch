// src/routes/api/auth/wechat/start.ts
// POST /api/auth/wechat/start
// Body: { redirect_to?: string } (defaults to /start)
// Response: { url: string } — WeChat's QR-code page URL.
//
// The state is self-contained: it embeds the redirect_to and a timestamp
// signed with WECHAT_APP_SECRET. Callback verifies the signature and
// timestamp, then redirects the user back to redirect_to.

import { createFileRoute } from "@tanstack/react-router";
import { createHmac, randomBytes } from "node:crypto";
import { json, preflight } from "@/lib/api/_helpers.server";

export const Route = createFileRoute("/api/auth/wechat/start")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      POST: async ({ request }) => {
        const appId = process.env.WECHAT_APP_ID;
        const appSecret = process.env.WECHAT_APP_SECRET;
        const baseRedirect = process.env.WECHAT_REDIRECT_URI;

        if (!appId || !appSecret || !baseRedirect) {
          return json(
            {
              error:
                "WeChat login is not configured. Set WECHAT_APP_ID, WECHAT_APP_SECRET, and WECHAT_REDIRECT_URI.",
            },
            { status: 503 },
          );
        }

        let body: { redirect_to?: unknown } = {};
        try {
          body = (await request.json()) as { redirect_to?: unknown };
        } catch {
          /* allow empty body */
        }
        const redirectTo =
          typeof body.redirect_to === "string" && body.redirect_to.startsWith("/")
            ? body.redirect_to
            : "/start";

        const nonce = randomBytes(8).toString("hex");
        const ts = Date.now();
        const payload = `${redirectTo}|${ts}|${nonce}`;
        const sig = createHmac("sha256", appSecret).update(payload).digest("hex");
        const state = `${Buffer.from(payload).toString("base64url")}.${sig}`;

        const params = new URLSearchParams({
          appid: appId,
          redirect_uri: baseRedirect,
          response_type: "code",
          scope: "snsapi_login",
          state,
        });
        const url = `https://open.weixin.qq.com/connect/qrconnect?${params.toString()}`;

        return json({ url });
      },
    },
  },
});
