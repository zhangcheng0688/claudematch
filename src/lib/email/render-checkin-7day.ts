// src/lib/email/render-checkin-7day.ts
//
// Server-side renderer for the Checkin7DayEmail component.
// NPS buttons need signed tokens so the URL is unforgeable; the
// signing is inlined here so the scheduler only has to know the
// user_id + score, not the HMAC secret.

import { renderToStaticMarkup } from "react-dom/server";
import { createHmac } from "node:crypto";
import { Checkin7DayEmail } from "@/lib/email/templates/checkin-7day";

const NPS_SECRET = process.env.LINQ_NPS_SIGNING_SECRET ?? process.env.FOUNDER_API_KEY ?? "dev-fallback";

function signNps(userId: string, score: number | "unsubscribe"): string {
  const payload = `${userId}|${score}`;
  const sig = createHmac("sha256", NPS_SECRET).update(payload).digest("base64url").slice(0, 16);
  return `${payload}|${sig}`;
}

export function renderCheckin7DayEmail(args: {
  recipientUserId: string;
  recipientName?: string;
  surveyUrl: string;
  /** The base URL for the NPS endpoint, e.g. https://claudematch.com
   *  (no trailing slash). The component will append ?token=...&score=N
   *  with a signed token for each button. */
  npsBaseUrl: string;
}): { html: string; text: string; subject: string } {
  const subject = "用 linQ 一周了，想听你的想法";

  // Pre-compute the signed URLs so we can both render the HTML and
  // embed in the text body.
  const npsButton = (score: number) =>
    `${args.npsBaseUrl}?token=${encodeURIComponent(signNps(args.recipientUserId, score))}&score=${score}`;
  const unsubUrl = `${args.npsBaseUrl}?token=${encodeURIComponent(signNps(args.recipientUserId, "unsubscribe"))}&unsubscribe=1`;

  const html = "<!DOCTYPE html>" + renderToStaticMarkup(
    Checkin7DayEmail({
      recipientName: args.recipientName,
      surveyUrl: args.surveyUrl,
      npsButton: (score) => npsButton(score),
      unsubscribeUrl: unsubUrl,
    }),
  );

  const text = `${subject}

${args.recipientName ? args.recipientName + "，" : ""}你加入 linQ 已经 7 天了。

1. 你有多大概率会向朋友推荐 linQ？(0-10): ${args.npsBaseUrl}
2. 那次 AI 见面方案你用了吗？回答 3 个问题: ${args.surveyUrl}

— linQ`;
  return { html, text, subject };
}
