import { describe, expect, it } from "vitest";
import { extractInterests, fallbackVenueName } from "./extract-interests";

describe("extractInterests", () => {
  it("extracts Chinese token runs", () => {
    const out = extractInterests("我喜欢咖啡、阅读和徒步旅行");
    // The regex extracts contiguous runs of 2+ Chinese characters.
    expect(out).toContain("我喜欢咖啡");
    expect(out).toContain("阅读和徒步旅行");
  });

  it("returns up to 3 unique tokens", () => {
    const out = extractInterests("咖啡 咖啡 阅读 徒步 电影 音乐");
    expect(out.length).toBeLessThanOrEqual(3);
  });

  it("handles empty input", () => {
    expect(extractInterests("")).toEqual([]);
  });
});

describe("fallbackVenueName", () => {
  it("composes a Chinese venue name", () => {
    const name = fallbackVenueName("深圳", ["咖啡", "阅读"], "zh");
    expect(name).toContain("深圳");
    expect(name).toContain("咖啡");
  });

  it("returns null when no interests", () => {
    expect(fallbackVenueName("深圳", [], "zh")).toBeNull();
  });
});
