// src/routes/api/venues/track.ts
//
// POST /api/venues/track
// Body: {
//   match_id?: string,
//   venue_id: string,
//   action: "view_details" | "tap_call" | "tap_navigate" | "confirm_i_went",
//   metadata?: object
// }
//
// Appends a row to meetup_attributions. The user_id is taken from
// the authenticated session (not the request body) so a malicious
// client can't attribute other users' actions. This is the data
// that the future 餐厅返点 reconciliation will join on.
//
// 漏洞 B: when the user action is 'confirm_i_went' and the metadata
// includes request_24h_followup: true, we ALSO insert a row into
// visit_confirmations so the scheduler can send the 24h follow-up
// email (漏洞 B) and the user can confirm/deny via the link.

import { createFileRoute } from "@tanstack/react-router";
import { json, preflight, requireUser, safeError } from "@/lib/api/_helpers.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { scheduleVisitConfirm } from "@/lib/email/scheduler";

const VALID_ACTIONS = new Set(["view_details", "tap_call", "tap_navigate", "confirm_i_went"]);

export async function handleTrackPost(request: Request): Promise<Response> {
  const auth = await requireUser(request);
  if ("error" in auth && auth.error) return auth.error;
  const { userId } = auth;

  let body: {
    match_id?: unknown;
    venue_id?: unknown;
    action?: unknown;
    metadata?: unknown;
  } = {};
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 }, request);
  }

  const venueId = typeof body.venue_id === "string" ? body.venue_id : "";
  const action = typeof body.action === "string" ? body.action : "";
  const matchId = typeof body.match_id === "string" ? body.match_id : null;
  const metadata = (
    body.metadata && typeof body.metadata === "object" ? body.metadata : null
  ) as Record<string, unknown> | null;

  if (!venueId) return json({ error: "venue_id required" }, { status: 400 }, request);
  if (!VALID_ACTIONS.has(action)) {
    return json(
      { error: `invalid action; must be one of: ${[...VALID_ACTIONS].join(", ")}` },
      { status: 400 },
      request,
    );
  }

  // Sanity-check: the venue must exist (we don't want bot-driven
  // junk rows referencing random UUIDs). Cost: 1 round trip;
  // we eat it because bad rows are worse than bad latency.
  const { data: v } = await supabaseAdmin
    .from("venues")
    .select("id, name, city, district")
    .eq("id", venueId)
    .maybeSingle();
  if (!v) {
    return json({ error: "venue not found" }, { status: 404 }, request);
  }

  const { data, error } = await supabaseAdmin
    .from("meetup_attributions")
    .insert({
      user_id: userId,
      match_id: matchId,
      venue_id: venueId,
      action,
      metadata: metadata as never,
    })
    .select("id, created_at")
    .single();

  if (error) return json({ error: safeError(error) }, { status: 500 }, request);

  // 漏洞 B: when the user "claims" they went and asks for the
  // 24h follow-up, schedule a confirmation row. The DB trigger
  // we wrote in 20260610220000_visit_confirmations.sql will
  // propagate the eventual user click into meetup_attributions
  // metadata.email_confirmed.
  let confirmationToken: string | null = null;
  if (action === "confirm_i_went" && metadata?.request_24h_followup === true) {
    try {
      const result = await scheduleVisitConfirm({
        attributionId: data.id,
        userId,
        venueId,
        venueName: v.name,
        venueCity: v.city ?? "",
      });
      confirmationToken = result.token;
    } catch (e) {
      console.error(
        JSON.stringify({
          at: "schedule_visit_confirm_threw",
          error: e instanceof Error ? e.message : String(e),
          attribution_id: data.id,
        }),
      );
      // non-fatal — track row is still persisted; the user
      // can still see the "I went" success state.
    }
  }

  return json(
    {
      data: { ...data, confirmation_token: confirmationToken },
      message: "Tracked",
    },
    undefined,
    request,
  );
}

export const Route = createFileRoute("/api/venues/track")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),
      POST: async ({ request }) => handleTrackPost(request),
    },
  },
});
