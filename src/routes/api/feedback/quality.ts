// src/routes/api/feedback/quality.ts
// POST /api/feedback/quality — record a 1-5 rating + optional comment
// for an AI-generated profile or match. Links to prompt_version for A/B analysis.
// Body: { kind: "profile" | "match", target_id: string, rating: 1-5,
//         comment?: string, prompt_version?: string, scenario?: string }

import { createFileRoute } from "@tanstack/react-router";
import { json, preflight, requireUser, safeError } from "@/lib/api/_helpers.server";

const VALID_KINDS = new Set(["profile", "match"]);

export const Route = createFileRoute("/api/feedback/quality")({
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

        const kind =
          typeof body.kind === "string" && VALID_KINDS.has(body.kind)
            ? (body.kind as "profile" | "match")
            : null;
        const targetId = typeof body.target_id === "string" ? body.target_id.trim() : "";
        const rating = typeof body.rating === "number" ? body.rating : NaN;
        const comment = typeof body.comment === "string" ? body.comment.trim() : null;
        const promptVersion =
          typeof body.prompt_version === "string" ? body.prompt_version.trim() : null;
        const scenario = typeof body.scenario === "string" ? body.scenario.trim() : null;

        if (!kind) {
          return json({ error: "kind must be 'profile' or 'match'" }, { status: 400 }, request);
        }
        if (targetId.length < 1 || targetId.length > 128) {
          return json({ error: "target_id must be 1-128 chars" }, { status: 400 }, request);
        }
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
          return json({ error: "rating must be an integer 1-5" }, { status: 400 }, request);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from as any)("ai_feedback")
          .insert({
            user_id: userId,
            kind,
            target_id: targetId,
            scenario,
            rating,
            comment: comment ?? undefined,
            prompt_version: promptVersion ?? undefined,
          })
          .select("id, created_at")
          .single();

        if (error) {
          if ((error as { code?: string }).code === "23505") {
            return json({ data: null, message: "Feedback already recorded" }, undefined, request);
          }
          return json({ error: safeError(error) }, { status: 500 }, request);
        }
        return json({ data, message: "Feedback recorded" }, undefined, request);
      },
    },
  },
});
