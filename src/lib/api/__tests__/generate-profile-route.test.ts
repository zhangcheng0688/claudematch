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
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: () => ({ data: null }) })) })),
    })),
    auth: { admin: { getUserById: vi.fn() } },
  },
}));

describe("/api/ai/generate-profile module", () => {
  it("imports without ReferenceError/TDZ", async () => {
    const mod = await import("@/routes/api/ai/generate-profile");
    expect(mod).toBeDefined();
    expect((mod as { Route?: unknown }).Route).toBeDefined();
  });

  it("buildFallbackProfile returns a zh profile for llmLang=zh", async () => {
    const mod = await import("@/routes/api/ai/generate-profile");
    const profile = mod.buildFallbackProfile("I like coffee and books.", "zh") as {
      headline: string;
      narrative: string;
    };
    expect(profile.headline).toBe("独一无二的你");
    expect(profile.narrative).toContain("你正在寻找属于自己的连接");
  });

  it("buildFallbackProfile returns an en profile for llmLang=en", async () => {
    const mod = await import("@/routes/api/ai/generate-profile");
    const profile = mod.buildFallbackProfile("I like coffee and books.", "en") as {
      headline: string;
      narrative: string;
    };
    expect(profile.headline).toBe("One of a kind");
    expect(profile.narrative).toContain("You're looking for a connection");
  });
});
