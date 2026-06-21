// src/routes/api/feedback/report.ts
// POST /api/feedback/report — report or block another user.
// Body: { reported_id: string, match_id?: string, reason?: string }

import { createFileRoute } from "@tanstack/react-router";
import { json, preflight, requireUser, safeError } from "@/lib/api/_helpers.server";

export const Route = createFileRoute("/api/feedback/report")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const { userId, supabase } = auth;

        let body: Record<string, unknown> = {};
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid JSON body" }, { status: 400 }, request);
        }

        const reportedId = typeof body.reported_id === "string" ? body.reported_id.trim() : "";
        const matchId = typeof body.match_id === "string" ? body.match_id.trim() : null;
        const reason = typeof body.reason === "string" ? body.reason.trim() : null;

        if (reportedId.length < 1) {
          return json({ error: "reported_id required" }, { status: 400 }, request);
        }
        if (reportedId === userId) {
          return json({ error: "Cannot report yourself" }, { status: 400 }, request);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from as any)("user_reports")
          .insert({
            reporter_id: userId,
            reported_id: reportedId,
            match_id: matchId ?? undefined,
            reason: reason ?? undefined,
          })
          .select("id, created_at")
          .single();

        if (error) return json({ error: safeError(error) }, { status: 500 }, request);
        return json({ data, message: "Report recorded" }, undefined, request);
      },
    },
  },
});
