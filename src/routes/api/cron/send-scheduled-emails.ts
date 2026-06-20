// src/routes/api/cron/send-scheduled-emails.ts
// POST /api/cron/send-scheduled-emails
// Intended to be called by an external cron (e.g. Supabase cron / GitHub Actions)
// every 15-60 minutes. Sends pending scheduled_emails whose scheduled_at has passed.
// A simple cron secret can be passed as ?secret=... to prevent public abuse.

import { createFileRoute } from "@tanstack/react-router";
import { json } from "@/lib/api/_helpers.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CRON_SECRET = process.env.CRON_SECRET ?? "";

export const Route = createFileRoute("/api/cron/send-scheduled-emails")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const secret = url.searchParams.get("secret");
        if (CRON_SECRET && secret !== CRON_SECRET) {
          return json({ error: "Unauthorized" }, { status: 401 }, request);
        }

        const now = new Date().toISOString();
        const { data: pending } = await (supabaseAdmin.from as any)("scheduled_emails")
          .select("*")
          .eq("status", "pending")
          .lte("scheduled_at", now)
          .order("scheduled_at", { ascending: true })
          .limit(100);

        const results: Array<{ id: string; status: string; error?: string }> = [];
        for (const row of pending ?? []) {
          const id = String(row.id);
          const userId = String(row.user_id);
          const kind = String(row.kind);
          const payload = (row.payload ?? {}) as Record<string, unknown>;

          try {
            const { data: user } = await supabaseAdmin.auth.admin.getUserById(userId);
            const to = user?.user?.email;
            if (!to) {
              results.push({ id, status: "cancelled", error: "no_email" });
              continue;
            }

            const { subject, html, text } = renderEmail(kind, payload);
            const messageId = crypto.randomUUID();
            await supabaseAdmin.from("email_send_log").insert({
              message_id: messageId,
              template_name: kind,
              recipient_email: to,
              status: "pending",
            });
            await supabaseAdmin.rpc("enqueue_email", {
              queue_name: "transactional_emails",
              payload: {
                message_id: messageId,
                to,
                from: "linQ <noreply@claudematch.com>",
                sender_domain: "notify.claudematch.com",
                subject,
                html,
                text,
                purpose: "transactional",
                label: kind,
                queued_at: new Date().toISOString(),
              },
            });

            await (supabaseAdmin.from as any)("scheduled_emails")
              .update({ status: "sent", sent_at: new Date().toISOString() })
              .eq("id", id);
            results.push({ id, status: "sent" });
          } catch (e) {
            const err = String(e);
            await (supabaseAdmin.from as any)("scheduled_emails")
              .update({ status: "failed", error: err.slice(0, 500) })
              .eq("id", id);
            results.push({ id, status: "failed", error: err });
          }
        }

        return json({ sent: results.length, results }, undefined, request);
      },
    },
  },
});

function renderEmail(kind: string, payload: Record<string, unknown>) {
  const otherName = String(payload.other_name ?? "匹配对象");
  const scenario = String(payload.scenario ?? "dating");
  const scenarioLabel: Record<string, string> = { dating: "恋爱", business: "事业合作", partner: "兴趣搭子" };

  if (kind === "follow_up_day_1" || kind === "follow_up_week_1" || kind === "follow_up_month_1") {
    const phaseLabel = String(payload.label ?? "后续");
    const advice = String(payload.advice ?? "保持真诚，慢慢来。");
    const subject = `【linQ】${phaseLabel}跟进建议 · ${otherName}`;
    const html = `<!doctype html><html lang="zh"><body style="margin:0;padding:24px;background:#f7f7f8;font-family:-apple-system,Helvetica,Arial,sans-serif;color:#111">
      <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e5e7;border-radius:10px;padding:32px">
        <h2 style="margin:0 0 12px;font-size:20px">【linQ】${phaseLabel}建议</h2>
        <p style="margin:0 0 16px;line-height:1.7">根据你们的 ${scenarioLabel[scenario] ?? scenario} 画像，AI 为你整理了 ${phaseLabel} 的相处建议：</p>
        <div style="border-left:3px solid #d4a853;padding-left:16px;margin:16px 0;line-height:1.8;color:#333">${escapeHtml(advice)}</div>
        <p style="margin:0;color:#888;font-size:12px">来自：linQ | claudematch.com</p>
      </div></body></html>`;
    const text = `【linQ】${phaseLabel}建议\n\n根据你们的 ${scenarioLabel[scenario] ?? scenario} 画像，AI 为你整理了 ${phaseLabel} 的相处建议：\n\n${advice}\n\n来自：linQ | claudematch.com`;
    return { subject, html, text };
  }

  if (kind === "rematch") {
    const subject = "【linQ】有新的匹配人选了，再来试试？";
    const html = `<!doctype html><html lang="zh"><body style="margin:0;padding:24px;background:#f7f7f8;font-family:-apple-system,Helvetica,Arial,sans-serif;color:#111">
      <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e5e7;border-radius:10px;padding:32px">
        <h2 style="margin:0 0 12px;font-size:20px">【linQ】新匹配机会</h2>
        <p style="margin:0 0 16px;line-height:1.7">过去一周有新的用户和 AI 角色加入了 linQ。为你推荐的 ${scenarioLabel[scenario] ?? scenario} 匹配可能有了新的选择。</p>
        <a href="https://claudematch.com/start" style="display:inline-block;margin:8px 0;padding:10px 20px;background:#111;color:#fff;text-decoration:none;border-radius:6px">去重新匹配</a>
        <p style="margin:16px 0 0;color:#888;font-size:12px">来自：linQ | claudematch.com</p>
      </div></body></html>`;
    const text = `【linQ】新匹配机会\n\n过去一周有新的用户和 AI 角色加入了 linQ。为你推荐的 ${scenarioLabel[scenario] ?? scenario} 匹配可能有了新的选择。\n\n去重新匹配：https://claudematch.com/start\n\n来自：linQ | claudematch.com`;
    return { subject, html, text };
  }

  if (kind === "meet_feedback_24h") {
    const subject = `【linQ】你们见面了吗？`;
    const html = `<!doctype html><html lang="zh"><body style="margin:0;padding:24px;background:#f7f7f8;font-family:-apple-system,Helvetica,Arial,sans-serif;color:#111">
      <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e5e7;border-radius:10px;padding:32px">
        <h2 style="margin:0 0 12px;font-size:20px">【linQ】见面反馈</h2>
        <p style="margin:0 0 16px;line-height:1.7">你和 ${escapeHtml(otherName)} 的见面方案已经过去一天。如果见面了，方便花 10 秒告诉我们真实感受吗？这会帮助 linQ 越配越准。</p>
        <a href="https://claudematch.com/match" style="display:inline-block;margin:8px 0;padding:10px 20px;background:#111;color:#fff;text-decoration:none;border-radius:6px">去填写反馈</a>
        <p style="margin:16px 0 0;color:#888;font-size:12px">来自：linQ | claudematch.com</p>
      </div></body></html>`;
    const text = `【linQ】见面反馈\n\n你和 ${otherName} 的见面方案已经过去一天。如果见面了，方便花 10 秒告诉我们真实感受吗？\n\n去填写反馈：https://claudematch.com/match\n\n来自：linQ | claudematch.com`;
    return { subject, html, text };
  }

  const subject = "【linQ】提醒";
  return { subject, html: "", text: "" };
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
