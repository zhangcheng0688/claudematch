// src/routes/api/user/set-city.ts
//
// 漏洞 C: minimal endpoint to set the user's city. Called from
// start.tsx step 0 (the city picker). Writes to user_profiles.profile_data.city
// so subsequent calls to /api/ai/match / /api/ai/meet-plan read it
// via the profile join.
//
// POST /api/user/set-city
// Body: { city: "shenzhen" | "shanghai" }
//
// Idempotent. If the user already has a row, we update; if not, we
// insert. (Profiles table has a NOT NULL email column; we use the
// auth user's email.)

import { createFileRoute } from "@tanstack/react-router";
import { json, preflight, requireUser, safeError } from "@/lib/api/_helpers.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { geocodeCity } from "@/lib/api/_geo.server";

const VALID_CITIES = new Set(["shenzhen", "shanghai"]);

export const Route = createFileRoute("/api/user/set-city")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const { userId, supabase } = auth;

        let body: { city?: unknown } = {};
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid JSON body" }, { status: 400 }, request);
        }

        const city = typeof body.city === "string" ? body.city : "";
        if (!VALID_CITIES.has(city)) {
          return json({ error: "city must be 'shenzhen' or 'shanghai'" }, { status: 400 }, request);
        }

        // We update the latest user_profiles row (the AI profile) to
        // record the city. This is what meet-plan.ts reads via
        // (myProfile.profile_data as { city?: string }).city ?? DEFAULT_CITY.
        // If there's no row yet (first-time user), we insert a stub
        // so the city sticks.
        const { data: latest } = await supabase
          .from("user_profiles")
          .select("id, profile_data")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Resolve city coordinates via AMap (or fallback centroid).
        const coords = await geocodeCity(city);

        if (latest?.id) {
          const existing = (latest.profile_data as Record<string, unknown> | null) ?? {};
          const { error } = await supabaseAdmin
            .from("user_profiles")
            .update({
              profile_data: { ...existing, city } as never,
              lat: coords.lat,
              lng: coords.lng,
            } as never)
            .eq("id", latest.id);
          if (error) return json({ error: safeError(error) }, { status: 500 }, request);
        } else {
          // No profile yet — we still want to remember the city.
          // Insert a stub row that the future /api/ai/generate-profile
          // call will update in place.
          const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
          const email = userData?.user?.email ?? "";
          if (!email) {
            return json({ error: "user has no email on file" }, { status: 400 }, request);
          }
          const { error } = await supabaseAdmin.from("user_profiles").insert({
            user_id: userId,
            profile_data: { city } as never,
            lat: coords.lat,
            lng: coords.lng,
          } as never);
          if (error) return json({ error: safeError(error) }, { status: 500 }, request);
        }

        return json(
          { data: { city, lat: coords.lat, lng: coords.lng, geo_source: coords.source } },
          undefined,
          request,
        );
      },
    },
  },
});
