// src/routes/api/feedback/meet.ts
// POST /api/feedback/meet — record actual meet-up feedback (24h+ after plan).
// Body: { match_id: string, meet_plan_id?: string, rating: 1-5, did_meet?: boolean, comment?: string }

import { createFileRoute } from "@tanstack/react-router";
import { json, preflight, requireUser, safeError } from "@/lib/api/_helpers.server";

export const Route = createFileRoute("/api/feedback/meet")({
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

        const matchId = typeof body.match_id === "string" ? body.match_id.trim() : "";
        const meetPlanId = typeof body.meet_plan_id === "string" ? body.meet_plan_id.trim() : null;
        const rating = typeof body.rating === "number" ? body.rating : NaN;
        const didMeet = typeof body.did_meet === "boolean" ? body.did_meet : null;
        const comment = typeof body.comment === "string" ? body.comment.trim() : null;

        if (matchId.length < 1) {
          return json({ error: "match_id required" }, { status: 400 }, request);
        }
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
          return json({ error: "rating must be 1-5" }, { status: 400 }, request);
        }

        // Verify the match belongs to this user.
        const { data: matchRow } = await supabase
          .from("matches")
          .select("id")
          .eq("id", matchId)
          .eq("user_id", userId)
          .maybeSingle();
        if (!matchRow) {
          return json({ error: "Match not found" }, { status: 404 }, request);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from as any)("meet_feedback")
          .insert({
            user_id: userId,
            match_id: matchId,
            meet_plan_id: meetPlanId ?? undefined,
            rating,
            did_meet: didMeet ?? undefined,
            comment: comment ?? undefined,
          })
          .select("id, created_at")
          .single();

        if (error) {
          if ((error as { code?: string }).code === "23505") {
            return json({ data: null, message: "Feedback already recorded" }, undefined, request);
          }
          return json({ error: safeError(error) }, { status: 500 }, request);
        }
        return json({ data, message: "Meet feedback recorded" }, undefined, request);
      },
    },
  },
});
