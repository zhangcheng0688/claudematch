// src/lib/email/render-visit-confirm.ts
//
// Server-side renderer for the VisitConfirmEmail component. We keep
// the render separate from the template so the scheduler can import
// the renderer without pulling in the .tsx file directly (TanStack
// Start server route handlers can't import .tsx files; they can only
// import .ts).

import { renderToStaticMarkup } from "react-dom/server";
import { VisitConfirmEmail } from "@/lib/email/templates/visit-confirm";

export function renderVisitConfirmEmail(args: {
  venueName: string;
  venueCity?: string;
  confirmUrl: string;
  denyUrl: string;
  recipientName?: string;
}): { html: string; text: string; subject: string } {
  const subject = `昨天在 ${args.venueName} 怎么样？`;
  const html =
    "<!DOCTYPE html>" +
    renderToStaticMarkup(
      VisitConfirmEmail({
        venueName: args.venueName,
        venueCity: args.venueCity,
        confirmUrl: args.confirmUrl,
        denyUrl: args.denyUrl,
        recipientName: args.recipientName,
      }),
    );
  const text = `${subject}

${args.recipientName ? args.recipientName + "，" : ""}昨天你在 linQ 上标记了「我去了 ${args.venueName}」。

确认你去了吗？
✅ 是的：${args.confirmUrl}
❌ 这次没去：${args.denyUrl}

链接 7 天内有效。

— linQ`;
  return { html, text, subject };
}
