import { describe, expect, it, vi } from "vitest";

// The previous version of this file had fatal TDZ bugs (personaCalls and
// feedbackContextBlock used before declaration). This test simply imports the
// module: if those bugs regress, the import itself throws a ReferenceError.

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

vi.mock("@/lib/api/_llm.server", () => ({
  llmChatEx: vi.fn(),
  safeParseJSON: (raw: string | null) => {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: () => ({ data: null }) })) })) })),
    auth: { admin: { getUserById: vi.fn() } },
  },
}));

describe("/api/ai/generate-profile module", () => {
  it("imports without ReferenceError/TDZ", async () => {
    const mod = await import("@/routes/api/ai/generate-profile");
    expect(mod).toBeDefined();
    expect((mod as { Route?: unknown }).Route).toBeDefined();
  });
});
