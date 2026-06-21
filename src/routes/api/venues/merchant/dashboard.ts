// src/routes/api/venues/merchant/dashboard.ts
//
// GET /api/venues/merchant/dashboard?token=<merchant_token>
//
// Token-based merchant dashboard. The onboarding endpoint returns a
// unique `merchant_token`; the merchant uses it to read their own
// attribution stats without needing a full user account.

import { createFileRoute } from "@tanstack/react-router";
import { json, preflight, safeError } from "@/lib/api/_helpers.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/venues/merchant/dashboard")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token") ?? "";
        if (!token) {
          return json({ error: "token is required" }, { status: 400 }, request);
        }

        const { data: venue, error: venueErr } = await supabaseAdmin
          .from("venues")
          .select(
            "id, name, city, district, address, onboarding_status, is_active, commission_pct, price_per_person, merchant_email",
          )
          .eq("merchant_token", token)
          .maybeSingle();

        if (venueErr) return json({ error: safeError(venueErr) }, { status: 500 }, request);
        if (!venue) {
          return json({ error: "invalid or expired token" }, { status: 401 }, request);
        }

        // Aggregate attribution events for this venue.
        const { data: rows, error: aggErr } = await supabaseAdmin
          .from("meetup_attributions")
          .select("action, created_at")
          .eq("venue_id", venue.id);

        if (aggErr) return json({ error: safeError(aggErr) }, { status: 500 }, request);

        const counts = {
          views: 0,
          calls: 0,
          navigations: 0,
          confirmations: 0,
        };
        for (const r of rows ?? []) {
          if (r.action === "view_details") counts.views++;
          if (r.action === "tap_call") counts.calls++;
          if (r.action === "tap_navigate") counts.navigations++;
          if (r.action === "confirm_i_went") counts.confirmations++;
        }

        // Estimate commissionable value (very rough: confirmations ×
        // price_per_person × 2 people × commission_pct).
        const estimatedRevenue = venue.price_per_person
          ? counts.confirmations * venue.price_per_person * 2
          : null;
        const estimatedCommission =
          estimatedRevenue && venue.commission_pct
            ? Math.round((estimatedRevenue * Number(venue.commission_pct)) / 100)
            : null;

        return json(
          {
            data: {
              venue,
              summary: {
                ...counts,
                estimated_revenue_hkd: estimatedRevenue,
                estimated_commission_hkd: estimatedCommission,
              },
              recent_attributions: (rows ?? []).slice(-50).reverse(),
            },
          },
          undefined,
          request,
        );
      },
    },
  },
});
