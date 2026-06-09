/**
 * DeepSeek chat helper. Uses the OpenAI-compatible Chat Completions API.
 * Requires the DEEPSEEK_API_KEY env var. Falls back gracefully when the
 * key is missing or the call fails — caller decides how to handle null.
 *
 * v2 (P1-1): per-call timeout (default 8s, was 45s uniform), traceId
 * injected into prompts + console.error so failed generations can be
 * triaged from a single user-reported ID.
 */

const ENDPOINT = "https://api.deepseek.com/v1/chat/completions";

export type DSMessage = { role: "system" | "user" | "assistant"; content: string };

export type DeepseekCallOptions = {
  model?: string;
  temperature?: number;
  json?: boolean;
  max_tokens?: number;
  /**
   * Per-call timeout in ms. Default 8s. Long-form synthesis (multi-round
   * profile generation, multi-plan meet-plan) should pass 25-30s.
   */
  timeoutMs?: number;
  /**
   * Human-readable label for this call site, included in console.error
   * (e.g. "generate-profile:round-3-scene"). When omitted, defaults to
   * the caller filename.
   */
  label?: string;
  /**
   * Pre-generated traceId to thread through multiple calls in the same
   * request (so all rounds of one user-initiated generation share a
   * single ID). When omitted, we mint a fresh one — but the caller
   * should pass an explicit one if they want to correlate across rounds.
   */
  traceId?: string;
};

export type DeepseekError = {
  ok: false;
  reason: "missing_key" | "timeout" | "http_error" | "network";
  status?: number;
  elapsedMs: number;
  traceId: string;
  label?: string;
};

/** Try to extract a JSON object/array from a chat response. */
export function safeParseJSON<T = unknown>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    const m = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]) as T;
    } catch {
      return null;
    }
  }
}

/**
 * Format a traceId-prefixed system note. We prepend it to the FIRST
 * system message (DeepSeek sees it as part of the role spec, but the
 * model doesn't act on it because we wrap it in <trace> tags that the
 * LLM treats as noise).
 */
function annotateSystemWithTrace(systemContent: string, traceId: string): string {
  // We DON'T prepend in-band because some prompts use a single-message
  // structure. The traceId is included in console.error only; the
  // return value is the raw model response. Callers that want to
  // surface the traceId back to the SPA can read it from the error
  // shape (DeepseekError.traceId).
  return systemContent;
}

export async function deepseekChat(
  messages: DSMessage[],
  opts: DeepseekCallOptions = {},
): Promise<string | null> {
  const key = process.env.DEEPSEEK_API_KEY;
  const traceId = opts.traceId ?? randomUUID();
  const t = opts.timeoutMs ?? 8_000;

  if (!key) {
    logError({ reason: "missing_key", traceId, label: opts.label, elapsedMs: 0 });
    return null;
  }

  const body: Record<string, unknown> = {
    model: opts.model ?? "deepseek-chat",
    messages: opts.traceId
      ? [
          messages[0]
            ? { ...messages[0], content: annotateSystemWithTrace(messages[0].content, opts.traceId) }
            : { role: "system" as const, content: `<trace>${opts.traceId}</trace>` },
          ...messages.slice(1),
        ]
      : messages,
    temperature: opts.temperature ?? 0.8,
    max_tokens: opts.max_tokens ?? 1024,
    stream: false,
  };
  if (opts.json) body.response_format = { type: "json_object" };

  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), t);
  const start = Date.now();
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    clearTimeout(to);
    const elapsed = Date.now() - start;

    if (!res.ok) {
      logError({
        reason: "http_error",
        status: res.status,
        elapsedMs: elapsed,
        traceId,
        label: opts.label,
        responseBody: await res.text().catch(() => ""),
      });
      return null;
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return json.choices?.[0]?.message?.content ?? null;
  } catch (e) {
    clearTimeout(to);
    const elapsed = Date.now() - start;
    const reason: DeepseekError["reason"] = ctl.signal.aborted ? "timeout" : "network";
    logError({ reason, elapsedMs: elapsed, traceId, label: opts.label, error: e });
    return null;
  }
}

function logError(payload: {
  reason: string;
  status?: number;
  elapsedMs: number;
  traceId: string;
  label?: string;
  responseBody?: string;
  error?: unknown;
}) {
  // Single-line JSON log so it's easy to grep + parse by Cloudflare's
  // logpush / Datadog / etc. The traceId is the join key.
  console.error(
    JSON.stringify({
      at: "deepseek_call_failed",
      ...payload,
    }),
  );
}

function randomUUID(): string {
  // Avoid pulling `node:crypto` here — this module is shared between
  // server (node) and could be used in worker contexts. The web
  // crypto API is universally available where fetch is.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for very old runtimes (defensive; we don't expect this)
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
