/**
 * OpenAI text-embedding-3-small helper.
 *
 * Uses a raw fetch rather than the `openai` SDK to keep the dependency tree
 * small. The helper is safe to call from server handlers (TanStack Start API
 * routes) and scripts.
 */

export type EmbeddingError = {
  ok: false;
  reason: "missing_key" | "timeout" | "http_error" | "network" | "parse_error";
  status?: number;
  message?: string;
};

export type EmbeddingResult =
  | { ok: true; embedding: number[] }
  | EmbeddingError;

const ENDPOINT = "https://api.openai.com/v1/embeddings";
const MODEL = "text-embedding-3-small";
const DIMENSIONS = 1536;

/**
 * Embed a single text string. Returns a 1536-dim float vector.
 * Truncates input at ~8k chars to stay well under the 8191 token limit.
 */
export async function embedText(text: string): Promise<EmbeddingResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return { ok: false, reason: "missing_key" };
  }

  const cleaned = text.trim().slice(0, 8000);
  if (!cleaned) {
    return { ok: false, reason: "parse_error", message: "empty input" };
  }

  try {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 15_000);
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        input: cleaned,
        model: MODEL,
        dimensions: DIMENSIONS,
      }),
      signal: ctl.signal,
    });
    clearTimeout(to);

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        reason: "http_error",
        status: res.status,
        message: body.slice(0, 500),
      };
    }

    const json = (await res.json()) as {
      data?: Array<{ embedding?: number[] }>;
    };
    const embedding = json.data?.[0]?.embedding;
    if (!Array.isArray(embedding) || embedding.length !== DIMENSIONS) {
      return {
        ok: false,
        reason: "parse_error",
        message: `unexpected embedding shape: ${Array.isArray(embedding) ? embedding.length : "none"}`,
      };
    }
    return { ok: true, embedding };
  } catch (e) {
    const reason = e instanceof Error && e.name === "AbortError" ? "timeout" : "network";
    return { ok: false, reason, message: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Build a dense, match-relevant text representation from a profile blob.
 * This is what gets embedded for vector pre-filtering.
 */
export function profileToEmbeddingText(profile: {
  headline?: string | null;
  bio?: string | null;
  occupation?: string | null;
  scenario_tags?: string[];
  profile_data?: Record<string, unknown>;
}): string {
  const parts: string[] = [];
  if (profile.headline) parts.push(profile.headline);
  if (profile.occupation) parts.push(profile.occupation);
  if (profile.bio) parts.push(profile.bio);
  if (Array.isArray(profile.scenario_tags)) parts.push(profile.scenario_tags.join(" "));

  const ai = profile.profile_data?.ai as Record<string, unknown> | undefined;
  if (ai) {
    if (ai.headline) parts.push(String(ai.headline));
    if (ai.narrative) parts.push(String(ai.narrative));
    if (Array.isArray(ai.patterns)) {
      for (const p of ai.patterns as Array<Record<string, unknown>>) {
        if (p.insight) parts.push(String(p.insight));
      }
    }
    if (Array.isArray(ai.dimensions)) {
      for (const d of ai.dimensions as Array<Record<string, unknown>>) {
        if (d.key) parts.push(String(d.key));
        if (d.why) parts.push(String(d.why));
        if (Array.isArray(d.signals)) parts.push((d.signals as string[]).join(" "));
      }
    }
    if (Array.isArray(ai.paradoxes)) {
      for (const p of ai.paradoxes as Array<Record<string, unknown>>) {
        if (p.surface) parts.push(String(p.surface));
        if (p.depth) parts.push(String(p.depth));
      }
    }
    if (Array.isArray(ai.life_themes)) {
      for (const t of ai.life_themes as Array<Record<string, unknown>>) {
        if (t.name) parts.push(String(t.name));
      }
    }
  }

  return parts.join("\n").slice(0, 8000);
}
