// src/lib/api/extract-interests.ts
//
// Shared between fallback paths in meet-plan and generate-profile. When
// DeepSeek is down we still want the fallback output to reflect the
// user's input — not the generic "市中心一家精品咖啡馆" string the
// previous version emitted.

/**
 * Extract 3 keywords from a user input string. Handles both Chinese
 * (2+ char runs) and English (4+ char words). Returns up to 3 unique
 * tokens, longest first.
 *
 * Why this regex set and not a tokenizer:
 *   - DeepSeek is in the prompt path 99% of the time; the fallback is
 *     best-effort. We don't need linguistic accuracy.
 *   - A 2-line regex covers 90% of the cases. Tokenizers (nodejieba,
 *     etc.) are heavy dependencies for a fallback.
 *   - Dedup is by lowercase comparison so "Coffee" and "coffee" collapse.
 */
export function extractInterests(input: string): string[] {
  if (!input || typeof input !== "string") return [];

  const chineseRuns = (input.match(/[\u4e00-\u9fa5]{2,}/g) ?? []);
  const englishWords = (input.match(/[a-zA-Z]{4,}/g) ?? []).map((w) => w.toLowerCase());

  // Combined, dedup, sort by length desc, take top 3.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const token of [...chineseRuns, ...englishWords].sort((a, b) => b.length - a.length)) {
    const key = token.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(token);
    if (out.length >= 3) break;
  }
  return out;
}

/** Compose a venue-like name from the user's city + extracted interests.
 *  Returns null if there's nothing to compose. */
export function fallbackVenueName(
  city: string | null,
  interests: string[],
  lang: "en" | "zh" = "zh",
): string | null {
  if (interests.length === 0) return null;
  const first = interests[0]!;
  const second = interests[1];
  const c = city ?? (lang === "zh" ? "你所在城市" : "your city");
  if (lang === "zh") {
    return second
      ? `${c}的一家以${first}和${second}闻名的店`
      : `${c}的一家${first}主题精品店`;
  }
  return second
    ? `A place in ${c} known for ${first} and ${second}`
    : `A ${first}-themed spot in ${c}`;
}
