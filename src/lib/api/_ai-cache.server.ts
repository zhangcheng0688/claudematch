/**
 * AI result cache layer backed by Supabase.
 *
 * Use this for deterministic, expensive LLM outputs:
 *   - meet-plan for a given match_id + lang (TTL 7 days)
 *   - profile generation for a given user input + scenario + lang (TTL 1 hour)
 *   - match analysis for a given user + scenario + candidate set (TTL 24 hours)
 *
 * The cache key is a SHA-256 hex digest of the deterministic inputs so we
 * don't need a database roundtrip to know whether a key is likely unique.
 */

export type AICacheType = "profile" | "match" | "meet-plan";

export type CachedResponse = {
  provider?: string;
  response: unknown;
};

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashInputs(...parts: unknown[]): Promise<string> {
  const serialized = parts
    .map((p) => (typeof p === "string" ? p : JSON.stringify(p)))
    .join("\u0000");
  return sha256Hex(serialized);
}

export async function getCachedResponse<T = unknown>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  cacheKey: string,
): Promise<CachedResponse & { response: T } | null> {
  const { data, error } = await supabase
    .from("ai_cache")
    .select("provider, response_json, expires_at")
    .eq("cache_key", cacheKey)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    console.warn(JSON.stringify({ at: "ai_cache:get_error", error: error.message, cacheKey }));
    return null;
  }
  if (!data) return null;
  return { provider: data.provider ?? undefined, response: data.response_json as T };
}

export async function setCachedResponse(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  cacheKey: string,
  callType: AICacheType,
  payloadHash: string,
  provider: string | undefined,
  response: unknown,
  ttlHours: number,
): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from("ai_cache").upsert(
    {
      cache_key: cacheKey,
      call_type: callType,
      payload_hash: payloadHash,
      provider: provider ?? null,
      response_json: response,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "cache_key" },
  );

  if (error) {
    console.warn(JSON.stringify({ at: "ai_cache:set_error", error: error.message, cacheKey }));
  }
}

export async function invalidateCache(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  cacheKey: string,
): Promise<void> {
  await supabase.from("ai_cache").delete().eq("cache_key", cacheKey);
}
