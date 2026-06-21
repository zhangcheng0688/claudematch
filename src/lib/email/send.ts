// src/lib/email/send.ts
//
// 漏洞 B + G：统一的邮件发送入口。所有 linQ 的 transactional email
// 都走这里 — visit confirmation follow-up (24h), 7-day check-in,
// weekly digest, etc. The send is fire-and-forget (we don't block
// the API response on email delivery) but we log every send with
// a traceId so failures are findable.
//
// Provider: Resend (https://resend.com). Free tier = 3000 emails/month,
// 100/day. We expect ~50 emails/day at month 1 and ~500 at month 3,
// well within limits.
//
// Why not Supabase's built-in auth emails:
//   - They're tied to auth flows (signup / recovery / magic link).
//   - We need transactional marketing-style emails: confirm visit,
//     7-day check-in, weekly digest. None of these are auth flows.
//   - We need to track opens / clicks for iteration; Resend has this
//     built-in (we'd have to add it ourselves on top of Supabase).

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FROM_ADDRESS = "linQ <[email protected]>";
const REPLY_TO = process.env.LINQ_REPLY_TO ?? "[email protected]";

export type SendEmailArgs = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** Tag for log filtering. e.g. "visit-confirm", "7day-checkin". */
  tag: string;
  /** Optional traceId we thread through so failed sends join
   *  with the original API request in Cloudflare logs. */
  traceId?: string;
};

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; reason: "missing_key" | "http_error" | "network"; detail?: string };

export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error(
      JSON.stringify({
        at: "send_email_failed",
        reason: "missing_key",
        tag: args.tag,
        traceId: args.traceId,
        to: args.to,
      }),
    );
    return { ok: false, reason: "missing_key" };
  }

  const body: Record<string, unknown> = {
    from: FROM_ADDRESS,
    to: args.to,
    subject: args.subject,
    html: args.html,
    text: args.text ?? stripHtml(args.html),
    reply_to: REPLY_TO,
    tags: [{ name: "tag", value: args.tag }],
    headers: args.traceId ? { "X-LinQ-Trace": args.traceId } : undefined,
  };

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(
        JSON.stringify({
          at: "send_email_failed",
          reason: "http_error",
          tag: args.tag,
          traceId: args.traceId,
          to: args.to,
          status: res.status,
          detail: detail.slice(0, 500),
        }),
      );
      return { ok: false, reason: "http_error", detail };
    }
    const data = (await res.json()) as { id?: string };
    return { ok: true, id: data.id ?? "unknown" };
  } catch (e) {
    console.error(
      JSON.stringify({
        at: "send_email_failed",
        reason: "network",
        tag: args.tag,
        traceId: args.traceId,
        to: args.to,
        error: e instanceof Error ? e.message : String(e),
      }),
    );
    return { ok: false, reason: "network" };
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
