// src/routes/api/feedback/pattern.ts
// POST /api/feedback/pattern — record user agree/disagree on a pattern
// Body: { pattern_text: string, section?: string, verdict: "agree" | "disagree" }
// Used by the 👍 / 👎 buttons in the AI profile card.

import { createFileRoute } from "@tanstack/react-router";
import { json, preflight, requireUser, safeError } from "@/lib/api/_helpers.server";

export const Route = createFileRoute("/api/feedback/pattern")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const { userId, supabase } = auth;

        let body: {
          pattern_text?: unknown;
          section?: unknown;
          verdict?: unknown;
        } = {};
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid JSON body" }, { status: 400 }, request);
        }

        const text = typeof body.pattern_text === "string" ? body.pattern_text.trim() : "";
        const verdict =
          body.verdict === "agree" || body.verdict === "disagree" ? body.verdict : null;
        const section = typeof body.section === "string" ? body.section.slice(0, 64) : "patterns";

        if (text.length < 4 || text.length > 1000) {
          return json({ error: "pattern_text must be 4-1000 chars" }, { status: 400 }, request);
        }
        if (!verdict) {
          return json({ error: "verdict must be 'agree' or 'disagree'" }, { status: 400 }, request);
        }

        // P1-6: de-dup. Without a unique index, a user clicking 👍 5 times
        // inserts 5 rows — which then gets injected back into the LLM prompt
        // (bloats context, biases feedback). The unique index is added by
        // supabase/migrations/20260608200000_add_pattern_feedback.sql; the
        // onConflict: "ignore" here makes the duplicate insert a 200 no-op
        // (so the UI doesn't show a confusing error).
        const { data, error } = await supabase
          .from("pattern_feedback")
          .insert({ user_id: userId, pattern_text: text, section, verdict })
          .select("id, created_at")
          .single();

        if (error) {
          // 23505 = unique_violation in Postgres. Treat as success — the
          // user has already recorded this feedback.
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
