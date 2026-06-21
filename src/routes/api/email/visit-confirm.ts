// src/routes/api/email/visit-confirm.ts
//
// 漏洞 B：24h 二次确认邮件的落地页。
//
//   GET /api/email/visit-confirm?token=...&verdict=confirm|deny
//     → 查询 visit_confirmations 行
//     → 校验 expires_at > now()
//     → 设置 confirmed_at 或 denied_at
//     → 触发 trigger propagate_visit_confirmation() → 更新 attribution
//        的 metadata.email_confirmed
//     → 返回简单的 HTML 确认页（不是 React 路由，纯 server-rendered）
//
// 端点无需 auth——token 本身是凭证。Token 是 32-byte base64url
// 不可枚举。

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "https://claudematch.com";

const PAGE_CSS = `
  body { font-family: system-ui, -apple-system, sans-serif; background: #0a0a0a; color: #fafafa;
         margin: 0; padding: 40px 20px; min-height: 100vh; display: flex; align-items: center;
         justify-content: center; }
  main { max-width: 480px; text-align: center; }
  h1 { font-size: 28px; font-weight: 600; margin: 0 0 16px; letter-spacing: -0.02em; }
  p { font-size: 15px; line-height: 1.7; color: #a1a1aa; margin: 0 0 24px; }
  .ok { color: #facc15; }
  .err { color: #ef4444; }
  a.cta { display: inline-block; background: #facc15; color: #0a0a0a; padding: 12px 24px;
          border-radius: 4px; text-decoration: none; font-weight: 600; margin-top: 8px; }
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

export const Route = createFileRoute("/api/email/visit-confirm")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token") ?? "";
        const verdict = url.searchParams.get("verdict") ?? "";

        if (!token || !["confirm", "deny"].includes(verdict)) {
          return new Response(
            page({
              title: "链接无效",
              body: `<p class="err">这个确认链接无效或已过期。</p>
                     <p>如果你最近在 linQ 标记了「我去了」但没收到我们的邮件，
                     请直接回复这封邮件或在 linQ App 内反馈。</p>`,
            }),
            { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
          );
        }

        const supabase = supabaseAdmin;
        const { data: row, error } = await supabase
          .from("visit_confirmations")
          .select("id, expires_at, confirmed_at, denied_at, venue_id")
          .eq("token", token)
          .maybeSingle();

        if (error || !row) {
          return new Response(
            page({
              title: "链接无效",
              body: `<p class="err">找不到这条确认记录。</p>
                     <p>可能你点击了旧的链接，或者已经被撤销。</p>`,
            }),
            { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } },
          );
        }

        if (new Date(row.expires_at) < new Date()) {
          return new Response(
            page({
              title: "链接已过期",
              body: `<p class="err">这条确认链接已过期（7 天有效）。</p>
                     <p>下次记得 24 小时内确认哦。</p>`,
            }),
            { status: 410, headers: { "Content-Type": "text/html; charset=utf-8" } },
          );
        }

        if (row.confirmed_at || row.denied_at) {
          return new Response(
            page({
              title: "已经记录过了",
              body: `<p>这条确认已经被你处理过 ——
                     谢谢你！如果你改主意了，再去 linQ App 里点 "我去了" 重新标记即可。</p>`,
            }),
            { headers: { "Content-Type": "text/html; charset=utf-8" } },
          );
        }

        const nowIso = new Date().toISOString();
        const updateObj = verdict === "confirm" ? { confirmed_at: nowIso } : { denied_at: nowIso };
        const { error: updErr } = await supabase
          .from("visit_confirmations")
          .update(updateObj)
          .eq("id", row.id);

        if (updErr) {
          console.error(
            JSON.stringify({ at: "visit_confirm_update_failed", error: updErr.message }),
          );
          return new Response(
            page({
              title: "出了点小问题",
              body: `<p class="err">我们没能保存你的确认 ——
                     请直接回复邮件或在 linQ App 里反馈，我们会手动处理。</p>`,
            }),
            { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } },
          );
        }

        // The DB trigger propagate_visit_confirmation() handles the
        // meetup_attributions.metadata update atomically.
        if (verdict === "confirm") {
          return new Response(
            page({
              title: "已确认！🎉",
              body: `<p class="ok">谢谢你确认去了！</p>
                     <p>这次见面会帮助我们以后给你推荐更准的匹配。
                     也意味着这次方案可以计入返点对账 ——
                     餐厅真的会因为你去了而付我们一点佣金，
                     这是我们能持续做这件事的方式。</p>`,
              cta: { href: `${FRONTEND_ORIGIN}/match`, label: "看看我的见面记录 →" },
            }),
            { headers: { "Content-Type": "text/html; charset=utf-8" } },
          );
        }
        return new Response(
          page({
            title: "已记录",
            body: `<p>已记录：这次没去。不会进入返点对账。</p>
                   <p>感谢你的诚实反馈 —— 我们会继续优化推荐的准确度。</p>`,
            cta: { href: `${FRONTEND_ORIGIN}/start`, label: "再来一次匹配 →" },
          }),
          { headers: { "Content-Type": "text/html; charset=utf-8" } },
        );
      },
    },
  },
});
