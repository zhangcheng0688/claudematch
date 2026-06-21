import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/_helpers.server", () => ({
  json: (body: unknown, init?: { status?: number }) =>
    new Response(JSON.stringify(body), {
      status: init?.status ?? 200,
      headers: { "Content-Type": "application/json" },
    }),
  preflight: () => new Response(null, { status: 204 }),
  requireUser: vi.fn(),
  safeError: (e: unknown) => (e instanceof Error ? e.message : "error"),
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

vi.mock("@/lib/email/scheduler", () => ({
  scheduleVisitConfirm: vi.fn(),
}));

import { requireUser } from "@/lib/api/_helpers.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { scheduleVisitConfirm } from "@/lib/email/scheduler";
import { handleTrackPost } from "@/routes/api/venues/track";

const mockSupabaseFrom = vi.mocked(supabaseAdmin.from) as unknown as ReturnType<typeof vi.fn>;
const mockScheduleVisitConfirm = vi.mocked(scheduleVisitConfirm);

function mockRequireUser(userId = "user-1") {
  (requireUser as ReturnType<typeof vi.fn>).mockResolvedValue({ userId, email: "a@b.com" });
}

function mockVenueFound() {
  mockSupabaseFrom.mockImplementation((table: string) => {
    if (table === "venues") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({ data: { id: "venue-1", name: "Cafe", city: "Shenzhen" } }),
          }),
        }),
      };
    }
    if (table === "meetup_attributions") {
      return {
        insert: () => ({
          select: () => ({
            single: () =>
              Promise.resolve({ data: { id: "attr-1", created_at: "2026-01-01T00:00:00Z" } }),
          }),
        }),
      };
    }
    throw new Error(`Unexpected table: ${table}`);
  });
}

describe("handleTrackPost", () => {
  it("rejects requests without authentication", async () => {
    (requireUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });

    const res = await handleTrackPost(
      new Request("http://localhost/api/venues/track", { method: "POST" }),
    );
    expect(res.status).toBe(401);
  });

  it("rejects invalid action", async () => {
    mockRequireUser();
    const res = await handleTrackPost(
      new Request("http://localhost/api/venues/track", {
        method: "POST",
        body: JSON.stringify({ venue_id: "venue-1", action: "invalid_action" }),
      }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("invalid action");
  });

  it("tracks a valid action and returns confirmation token for confirm_i_went", async () => {
    mockRequireUser();
    mockVenueFound();
    mockScheduleVisitConfirm.mockResolvedValue({ token: "token-abc" });

    const res = await handleTrackPost(
      new Request("http://localhost/api/venues/track", {
        method: "POST",
        body: JSON.stringify({
          venue_id: "venue-1",
          action: "confirm_i_went",
          metadata: { request_24h_followup: true },
        }),
      }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { confirmation_token: string } };
    expect(body.data.confirmation_token).toBe("token-abc");
    expect(mockScheduleVisitConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        attributionId: "attr-1",
        userId: "user-1",
        venueId: "venue-1",
      }),
    );
  });

  it("returns 404 when venue is not found", async () => {
    mockRequireUser();
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "venues") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    const res = await handleTrackPost(
      new Request("http://localhost/api/venues/track", {
        method: "POST",
        body: JSON.stringify({ venue_id: "missing-venue", action: "view_details" }),
      }),
    );

    expect(res.status).toBe(404);
  });
});
