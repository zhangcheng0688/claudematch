// src/routes/api/cron/force-weekly-digest.ts
//
// Founder-triggered manual override for the weekly digest.
// Bypasses the Wed 19:00 UTC window so the founder can test
// the rendering + check that the recipient list looks right.

import { createFileRoute } from "@tanstack/react-router";
import { json, preflight, safeError, constantTimeCompare } from "@/lib/api/_helpers.server";
import { sendWeeklyDigestIfDue } from "@/lib/email/scheduler";

const FOUNDER_KEY = process.env.FOUNDER_API_KEY;

function checkAuth(request: Request): Response | null {
  if (!FOUNDER_KEY) {
    return new Response(
      JSON.stringify({ error: "Server misconfigured: FOUNDER_API_KEY not set" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
  const provided = request.headers.get("x-founder-key") ?? "";
  if (!constantTimeCompare(provided, FOUNDER_KEY)) {
    return new Response(JSON.stringify({ error: "Forbidden: invalid founder key" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}

export const Route = createFileRoute("/api/cron/force-weekly-digest")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),
      GET: async ({ request }) => {
        const authErr = checkAuth(request);
        if (authErr) return authErr;
        try {
          const res = await sendWeeklyDigestIfDue({ force: true });
          return json({ data: res }, undefined, request);
        } catch (e) {
          return json({ error: safeError(e) }, { status: 500 }, request);
        }
      },
    },
  },
});
