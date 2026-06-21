// src/routes/api/feedback/nps.ts
//
// 漏洞 G：NPS 0-10 click landing page.
//
//   GET /api/feedback/nps?score=0..10
//     → 写一行 user_feedback (kind=nps, score)
//     → 返回简单的 "thanks" 页
//
//   GET /api/feedback/nps?unsubscribe=1
//     → 写一行 user_feedback (kind=unsubscribe)
//     → 写 auth.users.user_metadata.comm_email_opt_in = false
//     → 返回 "you're unsubscribed" 页
//
// 端点无需 auth——user 已经在邮件里点了链接。score= 的 URL 不带
// 任何 user id；user_id 在 service-role lookup 时通过 token 解析。
// v1 简化：直接把 user_id 写到 query 里（email 内含 jwt token，
// 与 24h visit-confirm 共用 token 机制 — 此处复用 visit_confirmations
// 不够干净，所以 v1 我们简化：要求 SPA 在生成 NPS URL 时塞 user_id
// + 短期签名）。

import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "https://claudematch.com";

// Re-exported so other modules (render-checkin-7day.ts) can use the
// same signing path. We re-implement here rather than import from
// render-checkin-7day.ts to avoid a circular dep (render imports
// nps, nps would import render back).
const NPS_SECRET =
  process.env.LINQ_NPS_SIGNING_SECRET ?? process.env.FOUNDER_API_KEY ?? "dev-fallback";

export function signNpsToken(userId: string, score: number | "unsubscribe"): string {
  const payload = `${userId}|${score}`;
  const sig = createHmac("sha256", NPS_SECRET).update(payload).digest("base64url").slice(0, 16);
  return `${payload}|${sig}`;
}

const PAGE_CSS = `
  body { font-family: system-ui, -apple-system, sans-serif; background: #0a0a0a; color: #fafafa;
         margin: 0; padding: 40px 20px; min-height: 100vh; display: flex; align-items: center;
         justify-content: center; }
  main { max-width: 480px; text-align: center; }
  h1 { font-size: 28px; font-weight: 600; margin: 0 0 16px; letter-spacing: -0.02em; }
  p { font-size: 15px; line-height: 1.7; color: #a1a1aa; margin: 0 0 24px; }
  a.cta { display: inline-block; background: #facc15; color: #0a0a0a; padding: 12px 24px;
          border-radius: 4px; text-decoration: none; font-weight: 600; }
  a.muted { color: #a1a1aa; text-decoration: underline; display: inline-block; margin-top: 24px; }
`;

function page(opts: { title: string; body: string; cta?: { href: string; label: string } }) {
  return `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${opts.title} — linQ</title>
  <style>${PAGE_CSS}</style>
</head>
<body>
  <main>
    <h1>${opts.title}</h1>
    ${opts.body}
    ${opts.cta ? `<a class="cta" href="${opts.cta.href}">${opts.cta.label}</a>` : ""}
    <a class="muted" href="${FRONTEND_ORIGIN}">回到 linQ 首页</a>
  </main>
</body>
</html>`;
}

/** Sign a (user_id, action) pair so the URL is unforgeable. The
 *  signature includes the score so an attacker can't downgrade
 *  a "10" to a "9" by editing the URL. */
// (signNpsToken is exported above; no duplicate here.)

function verifyNpsToken(
  token: string,
  expectedScore: number | "unsubscribe",
): { userId: string } | null {
  const parts = token.split("|");
  if (parts.length !== 3) return null;
  const [userId, score, sig] = parts;
  if (!userId || !score || !sig) return null;
  if (score !== String(expectedScore)) return null;
  const expected = createHmac("sha256", NPS_SECRET)
    .update(`${userId}|${score}`)
    .digest("base64url")
    .slice(0, 16);
  // constant-time compare
  try {
    if (sig.length !== expected.length) return null;
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  return { userId };
}

export const Route = createFileRoute("/api/feedback/nps")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const scoreRaw = url.searchParams.get("score");
        const unsubscribe = url.searchParams.get("unsubscribe") === "1";
        const token = url.searchParams.get("token") ?? "";

        const supabase = supabaseAdmin;

        // ── unsubscribe branch ──
        if (unsubscribe) {
          const verified = token ? verifyNpsToken(token, "unsubscribe") : null;
          if (verified) {
            const { data: userData } = await supabase.auth.admin.getUserById(verified.userId);
            if (userData?.user) {
              await supabase.auth.admin.updateUserById(verified.userId, {
                user_metadata: { ...(userData.user.user_metadata ?? {}), linq_comm_opt_in: false },
              });
              await supabase.from("user_feedback").insert({
                user_id: verified.userId,
                kind: "unsubscribe",
                source: "checkin-7day-email",
              });
            }
          }
          return new Response(
            page({
              title: "已取消订阅",
              body: `<p>已不会再收到 linQ 的运营邮件（match 提醒、7 天回访等）。</p>
                     <p>你仍然会收到验证码、安全告警等账号相关邮件。</p>`,
            }),
            { headers: { "Content-Type": "text/html; charset=utf-8" } },
          );
        }

        // ── NPS score branch ──
        if (scoreRaw === null) {
          return new Response(
            page({
              title: "评分无效",
              body: `<p>请从邮件里点 0-10 的按钮来评分。</p>`,
            }),
            { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
          );
        }
        const score = Number(scoreRaw);
        if (!Number.isInteger(score) || score < 0 || score > 10) {
          return new Response(
            page({
              title: "评分无效",
              body: `<p>分数必须在 0-10 之间。</p>`,
            }),
            { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
          );
        }

        const verified = token ? verifyNpsToken(token, score) : null;
        if (!verified) {
          return new Response(
            page({
              title: "链接无效",
              body: `<p class="err">这个评分链接已过期或被修改。</p>
                     <p>请回到邮件重新点 0-10 的按钮。</p>`,
            }),
            { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
          );
        }

        await supabase.from("user_feedback").insert({
          user_id: verified.userId,
          kind: "nps",
          score,
          source: "checkin-7day-email",
        });

        // Personalized follow-up copy based on the score band
        const verdict = score >= 9 ? "超级粉丝 🥹" : score >= 7 ? "还不错 👋" : "有改进空间 🙏";
        const followUp =
          score >= 9
            ? "谢谢你！如果你愿意把 linQ 推荐给 1 个朋友，我会非常感激。"
            : score >= 7
              ? "我们还在持续优化体验 — 任何具体建议都欢迎回复这封邮件。"
              : "我们想了解你最大的痛点是什么。回复这封邮件或去 linQ App 内的「反馈」入口告诉我们。";

        return new Response(
          page({
            title: `已记录：${score} 分 (${verdict})`,
            body: `<p>${followUp}</p>
                   <p>这条记录匿名汇总后会进我们的产品改进 backlog。</p>`,
            cta: { href: `${FRONTEND_ORIGIN}/match`, label: "回到 linQ →" },
          }),
          { headers: { "Content-Type": "text/html; charset=utf-8" } },
        );
      },
    },
  },
});
