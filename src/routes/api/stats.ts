import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { json, preflight, safeError } from "@/lib/api/_helpers.server";

// P0-6: BASE_COUNT (156000) was a hardcoded fake stat. We now return the
// real waitlist count only. The /api/stats endpoint is intended for internal
// dashboards; the public landing page no longer references it (see Hero copy
// change in src/routes/index.tsx).

export const Route = createFileRoute("/api/stats")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),
      GET: async ({ request }) => {
        const { count, error } = await supabaseAdmin
          .from("waitlist")
          .select("*", { count: "exact", head: true });
        if (error) {
          return json({ error: safeError(error) }, { status: 500 }, request);
        }
        return json({
          data: {
            waitlist_count: count ?? 0,
            updated_at: new Date().toISOString(),
          },
        }, undefined, request);
      },
    },
  },
});