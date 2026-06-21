import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/_helpers.server", () => ({
  json: (body: unknown, init?: { status?: number }) =>
    new Response(JSON.stringify(body), {
      status: init?.status ?? 200,
      headers: { "Content-Type": "application/json" },
    }),
  preflight: () => new Response(null, { status: 204 }),
  safeError: (e: unknown) => (e instanceof Error ? e.message : "error"),
  constantTimeCompare: (a: string, b: string) => a === b,
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({ limit: vi.fn(() => ({ data: [] })) })),
        eq: vi.fn(() => ({ maybeSingle: vi.fn(() => ({ data: null })) })),
        gte: vi.fn(() => ({ order: vi.fn(() => ({ limit: vi.fn(() => ({ data: [] })) })) })),
      })),
    })),
    rpc: vi.fn(() => ({ data: [], error: null })),
  },
}));

vi.stubEnv("FOUNDER_API_KEY", "secret");

import { handleReconciliationGet } from "@/routes/api/admin/reconciliation";

describe("handleReconciliationGet founder auth", () => {
  it("returns 403 for missing founder key header", async () => {
    const res = await handleReconciliationGet(
      new Request("http://localhost/api/admin/reconciliation"),
    );
    expect(res.status).toBe(403);
  });

  it("returns 403 for wrong founder key", async () => {
    const res = await handleReconciliationGet(
      new Request("http://localhost/api/admin/reconciliation", {
        headers: { "X-Founder-Key": "wrong" },
      }),
    );
    expect(res.status).toBe(403);
  });

  it("returns 200 for correct founder key", async () => {
    const res = await handleReconciliationGet(
      new Request("http://localhost/api/admin/reconciliation", {
        headers: { "X-Founder-Key": "secret" },
      }),
    );
    expect(res.status).toBe(200);
  });

  it("returns 500 when FOUNDER_API_KEY is not configured", async () => {
    vi.stubEnv("FOUNDER_API_KEY", "");
    // Re-import to pick up the empty env var.
    const mod = await import("@/routes/api/admin/reconciliation");
    const res = await mod.handleReconciliationGet(
      new Request("http://localhost/api/admin/reconciliation", {
        headers: { "X-Founder-Key": "anything" },
      }),
    );
    expect(res.status).toBe(500);
  });
});
