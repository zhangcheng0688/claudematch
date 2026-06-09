// src/routes/api/venues/lookup.ts
//
// GET /api/venues/lookup?ids=<uuid,uuid,...>
// Bulk-fetch a small set of venues by ID. The PlanCard SPA needs the
// full venue row (name, address, tel, lat, lng, ...) after the LLM
// returns venue_id. We pre-embed venue_lookup in the plan_content,
// but the SPA sometimes needs to re-fetch (e.g. after a page refresh
// where the user opens the booking modal).
//
// The endpoint is intentionally minimal: it's a thin wrapper around a
// Supabase query, but we need it because (a) the venues table is
// RLS service-role-only, so the SPA can't read it directly, and
// (b) we want to keep the response shape stable even if the schema
// changes.

import { createFileRoute } from "@tanstack/react-router";
import { json, preflight, requireUser, safeError } from "@/lib/api/_helpers.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const MAX_IDS = 20;

export const Route = createFileRoute("/api/venues/lookup")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;

        const url = new URL(request.url);
        const idsParam = url.searchParams.get("ids") ?? "";
        const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean);
        if (ids.length === 0) {
          return json({ data: [] }, undefined, request);
        }
        if (ids.length > MAX_IDS) {
          return json({ error: `Max ${MAX_IDS} ids per request` }, { status: 400 }, request);
        }

        const { data, error } = await supabaseAdmin
          .from("venues")
          .select("id, name, city, district, address, lat, lng, cuisine_tags, vibe_tags, price_per_person, rating, tel, opening_hours, photos, booking_method, commission_pct")
          .in("id", ids)
          .eq("is_active", true);

        if (error) return json({ error: safeError(error) }, { status: 500 }, request);
        return json({ data: data ?? [] }, undefined, request);
      },
    },
  },
});
