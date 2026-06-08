// src/routes/api/match/index.ts
// GET /api/match — list the signed-in user's past matches (read-only).
// Distinct from /api/ai/match (which creates a new match + emails both sides).
// Required by the /match list page so it can render history without side effects.

import { createFileRoute } from "@tanstack/react-router";
import { json, preflight, requireUser } from "@/lib/api/_helpers.server";

export const Route = createFileRoute("/api/match/")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const { userId, supabase } = auth;

        const { data, error } = await supabase
          .from("matches")
          .select("id, user_id, matched_user_id, match_score, scenario, details, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) return json({ error: error.message }, { status: 500 });
        return json({ data: data ?? [] });
      },
    },
  },
});
