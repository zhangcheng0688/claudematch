import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { json, preflight, requireUser } from "@/lib/api/_helpers.server";

const VALID_SCENARIOS = new Set(["business", "dating", "partner"]);

/**
 * POST /api/ai/match
 * Body: { scenario?: "business" | "dating" | "partner" }
 * Returns top-3 candidate users for the given scenario. Placeholder logic
 * picks other users with matching authorization on that scenario, deterministic
 * scoring by user_id pair. Persists rows into `matches`.
 */
export const Route = createFileRoute("/api/ai/match")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const { userId, supabase } = auth;

        let body: unknown = {};
        try {
          body = await request.json();
        } catch {
          /* allow empty body */
        }
        const raw = (body as { scenario?: unknown })?.scenario;
        const scenario = typeof raw === "string" && VALID_SCENARIOS.has(raw) ? raw : "dating";

        // Use admin client to read across users for candidate pool.
        const { data: candidates, error: candErr } = await supabaseAdmin
          .from("user_authorizations")
          .select("user_id, business, dating, partner")
          .eq(scenario as "business" | "dating" | "partner", true)
          .neq("user_id", userId)
          .limit(50);

        if (candErr) return json({ error: candErr.message }, { status: 500 });

        const score = (a: string, b: string) => {
          const h = Array.from(a + b).reduce((acc, c) => (acc * 17 + c.charCodeAt(0)) >>> 0, 11);
          return +(60 + (h % 4000) / 100).toFixed(2); // 60.00 - 99.99
        };

        const top3 = (candidates ?? [])
          .map((c) => ({ matched_user_id: c.user_id, match_score: score(userId, c.user_id) }))
          .sort((a, b) => b.match_score - a.match_score)
          .slice(0, 3);

        if (top3.length === 0) {
          return json({ data: [], message: "No candidates yet — try again later." });
        }

        const rows = top3.map((m) => ({
          user_id: userId,
          matched_user_id: m.matched_user_id,
          match_score: m.match_score,
          scenario,
        }));

        const { data: inserted, error: insErr } = await supabase
          .from("matches")
          .insert(rows)
          .select("*");

        if (insErr) return json({ error: insErr.message }, { status: 500 });
        return json({ data: inserted, scenario, message: "Top 3 matches generated" });
      },
    },
  },
});