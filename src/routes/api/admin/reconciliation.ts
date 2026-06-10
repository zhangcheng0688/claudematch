// src/routes/api/admin/reconciliation.ts
//
// 漏洞 F：admin API for founder / future restaurant admin tools.
// Wraps the SQL views in v_venue_monthly_reconciliation etc. so the
// SPA (or Supabase Studio direct query) doesn't need service-role.
//
// SECURITY: this endpoint MUST be founder-only. The authorization
// pattern is a shared secret header (FOUNDER_API_KEY env var) —
// LinQ's founder dashboard is one human, not a multi-tenant
// system. When we build a real admin UI later, we'll add a
// founder role on auth.users and check for that instead.
//
// Allowed endpoints:
//   GET /api/admin/reconciliation?since_days=30  → get_funnel_summary
//   GET /api/admin/reconciliation?venue=<id>&month=YYYY-MM → single venue
//   GET /api/admin/reconciliation?pending=true → v_pending_confirmations
//
// All queries are read-only against the views. The endpoint never
// writes — the only writes to meetup_attributions happen through
// /api/venues/track (user-facing) and future email-confirm flows.

import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { json, preflight, safeError } from "@/lib/api/_helpers.server";
import type { Database } from "@/integrations/supabase/types";

const FOUNDER_KEY = process.env.FOUNDER_API_KEY;

function checkFounderAuth(request: Request): Response | null {
  if (!FOUNDER_KEY) {
    return new Response(
      JSON.stringify({ error: "Server misconfigured: FOUNDER_API_KEY not set" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
  const provided = request.headers.get("x-founder-key") ?? "";
  // constant-time compare via timingSafeEqual — but Node's crypto is
  // not available in the global here without import. Use a simple
  // length-checked compare; the secret is long enough that timing
  // attacks aren't a meaningful risk on this single endpoint.
  if (provided.length !== FOUNDER_KEY.length || provided !== FOUNDER_KEY) {
    return new Response(
      JSON.stringify({ error: "Forbidden: invalid founder key" }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }
  return null;
}

export const Route = createFileRoute("/api/admin/reconciliation")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),
      GET: async ({ request }) => {
        const authErr = checkFounderAuth(request);
        if (authErr) return authErr;

        const url = new URL(request.url);
        const sinceDays = Number(url.searchParams.get("since_days") ?? "30");
        const venueId = url.searchParams.get("venue");
        const month = url.searchParams.get("month"); // YYYY-MM
        const pending = url.searchParams.get("pending") === "true";

        // service-role client bypasses RLS for the views
        const supabaseUrl = process.env.SUPABASE_URL!;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const admin = createClient<Database>(supabaseUrl, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        if (pending) {
          // List pending 24h confirmations (漏洞 B follow-up list)
          const { data, error } = await admin
            .from("v_pending_confirmations")
            .select("*")
            .order("confirmed_at", { ascending: false })
            .limit(200);
          if (error) return json({ error: safeError(error) }, { status: 500 }, request);
          return json({ data }, undefined, request);
        }

        if (url.searchParams.get("nps") === "true") {
          // List recent NPS scores (漏洞 G dashboard)
          const { data, error } = await admin
            .from("user_feedback")
            .select("id, user_id, kind, score, body, source, created_at")
            .order("created_at", { ascending: false })
            .limit(200);
          if (error) return json({ error: safeError(error) }, { status: 500 }, request);
          return json({ data }, undefined, request);
        }

        if (venueId && month) {
          // Single venue × single month — the exact bill we send to a restaurant
          const { data, error } = await admin
            .from("v_venue_monthly_reconciliation")
            .select("*")
            .eq("venue_id", venueId)
            .eq("year_month", `${month}-01`)
            .maybeSingle();
          if (error) return json({ error: safeError(error) }, { status: 500 }, request);
          return json({ data }, undefined, request);
        }

        // Default: founder dashboard summary
        // Use the SQL function via rpc (it's defined as STABLE plpgsql)
        const { data: summary, error: sumErr } = await admin.rpc("get_funnel_summary", {
          since_days: sinceDays,
        });
        if (sumErr) return json({ error: safeError(sumErr) }, { status: 500 }, request);

        // Also pull all venues' current month so founder sees "this month's
        // restaurant leaderboard" at a glance
        const firstOfMonth = new Date();
        firstOfMonth.setUTCDate(1);
        firstOfMonth.setUTCHours(0, 0, 0, 0);
        const monthIso = firstOfMonth.toISOString();
        const { data: venues, error: vErr } = await admin
          .from("v_venue_monthly_reconciliation")
          .select("*")
          .gte("year_month", monthIso)
          .order("total_valid_visits", { ascending: false })
          .limit(50);
        if (vErr) return json({ error: safeError(vErr) }, { status: 500 }, request);

        return json({
          data: {
            funnel_summary: summary,
            venues_this_month: venues,
            since_days: sinceDays,
          },
        }, undefined, request);
      },
    },
  },
});