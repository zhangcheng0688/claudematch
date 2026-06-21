// src/routes/api/cron/drain.ts
//
// 架构债 I: cron / 后台任务的"伪 cron"端点。
// Lovable Cloud 的 wrangler.toml 我们不能改（Vite 编译产物不暴露
// 给 SPA)，所以我们用 HTTP endpoint 接外部 cron 触发器：
//
//   curl https://claudematch.com/api/cron/drain \
//     -H "X-Cron-Secret: $LINQ_CRON_SECRET"
//
// 外部触发器选项（按推荐度排）：
//   1. GitHub Actions scheduled workflow（每 6 小时跑一次，免费）
//      .github/workflows/cron-drain.yml（手写）
//   2. cron-job.org（every 1h，免费，HTTP 触发）
//   3. 创始人自己的 Mac / Linux crontab
//   4. Cloudflare Workers Cron Trigger（如果我们能上 wrangler.toml ——
//      但 Lovable Cloud 不允许）
//
// SECURITY: 端点本身无 auth 风险（LINQ_CRON_SECRET 在 header 里走）；
// 没有 secret 就 401。没有 secret 的环境会 fail-closed（不会
// 让垃圾请求意外触发邮件队列）。
//
// ENDPOINTS:
//   GET /api/cron/drain?since_hours=24
//     → 跑所有队列的 drain（24h visit confirmation + 周三 7pm digest）
//   GET /api/cron/force-weekly-digest
//     → 不等周三窗口，立刻发 weekly digest（founder 测试用）
//   GET /api/cron/status
//     → 不发邮件，只报告"如果现在跑会发多少封"（dry-run）

import { createFileRoute } from "@tanstack/react-router";
import { json, preflight, safeError } from "@/lib/api/_helpers.server";
import {
  drainVisitConfirmQueue,
  drainWeeklyDigestQueue,
  sendWeeklyDigestIfDue,
} from "@/lib/email/scheduler";

const CRON_SECRET = process.env.LINQ_CRON_SECRET;

function checkCronAuth(request: Request): Response | null {
  if (!CRON_SECRET) {
    return new Response(
      JSON.stringify({ error: "Server misconfigured: LINQ_CRON_SECRET not set" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
  const provided = request.headers.get("x-cron-secret") ?? "";
  if (provided.length !== CRON_SECRET.length || provided !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: "Forbidden: invalid cron secret" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}

export const Route = createFileRoute("/api/cron/drain")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),
      GET: async ({ request }) => {
        const authErr = checkCronAuth(request);
        if (authErr) return authErr;

        const url = new URL(request.url);
        const sinceHours = Number(url.searchParams.get("since_hours") ?? "24");

        try {
          // Drain in parallel — the 24h visit confirmations are the
          // most time-sensitive (users may be waiting to click a
          // follow-up). The weekly digest only fires inside its
          // window anyway.
          const [visitRes, digestRes] = await Promise.all([
            drainVisitConfirmQueue().catch((e) => ({ sent: 0, error: String(e) })),
            drainWeeklyDigestQueue().catch((e) => ({ sent: 0, reason: String(e) })),
          ]);

          return json(
            {
              data: {
                ran_at: new Date().toISOString(),
                since_hours: sinceHours,
                visit_confirmations: visitRes,
                weekly_digest: digestRes,
              },
            },
            undefined,
            request,
          );
        } catch (e) {
          return json({ error: safeError(e) }, { status: 500 }, request);
        }
      },
    },
  },
});
