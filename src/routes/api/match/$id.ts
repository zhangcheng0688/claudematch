// src/routes/api/match/$id.ts
// GET /api/match/$id — return one match (must belong to caller) plus its most
// recent meet plan, if any. Used by /match/$id detail page.

import { createFileRoute } from "@tanstack/react-router";
import { json, preflight, requireUser, safeError } from "@/lib/api/_helpers.server";

export const Route = createFileRoute("/api/match/$id")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),
      GET: async ({ request, params }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const { userId, supabase } = auth;

        const id = params.id;
        if (!id) return json({ error: "Match id required" }, { status: 400 }, request);

        const { data: match, error: mErr } = await supabase
          .from("matches")
          .select("id, user_id, matched_user_id, match_score, scenario, details, created_at")
          .eq("id", id)
          .eq("user_id", userId)
          .maybeSingle();

        if (mErr) return json({ error: safeError(mErr) }, { status: 500 }, request);
        if (!match) return json({ error: "Match not found" }, { status: 404 }, request);

        const { data: plan, error: pErr } = await supabase
          .from("meet_plans")
          .select("id, match_id, plan_content, created_at")
          .eq("match_id", id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (pErr) return json({ error: safeError(pErr) }, { status: 500 }, request);

        return json({ data: { match, plan: plan ?? null } }, undefined, request);
      },
    },
  },
});
