import { describe, expect, it } from "vitest";
import { constantTimeCompare } from "./_helpers.server";

describe("constantTimeCompare", () => {
  it("returns true for identical strings", () => {
    expect(constantTimeCompare("abc", "abc")).toBe(true);
  });

  it("returns false for different strings of same length", () => {
    expect(constantTimeCompare("abc", "abd")).toBe(false);
  });

  it("returns false for different lengths", () => {
    expect(constantTimeCompare("abc", "ab")).toBe(false);
    expect(constantTimeCompare("ab", "abc")).toBe(false);
  });

  it("returns false for empty vs non-empty", () => {
    expect(constantTimeCompare("", "x")).toBe(false);
    expect(constantTimeCompare("x", "")).toBe(false);
  });

  it("returns true for two empty strings", () => {
    expect(constantTimeCompare("", "")).toBe(true);
  });
});
