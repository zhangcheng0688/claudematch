/**
 * Unified LLM chat helper with multi-provider fallback, per-provider retry,
 * and optional request deadline.
 *
 * Provider chain (P1-2): DeepSeek -> MiniMax -> Kimi.
 * All three expose an OpenAI-compatible /chat/completions endpoint, so we can
 * share request/response parsing. Provider-specific headers/models live in the
 * `PROVIDERS` registry.
 *
 * Usage:
 *   const raw = await llmChat(messages, { label: "match:round-1", deadlineMs: 45_000 });
 *
 * Environment variables:
 *   DEEPSEEK_API_KEY, MINIMAX_API_KEY, MOONSHOT_API_KEY (Kimi)
 */

export type LLMMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LLMErrorReason =
  | "missing_key"
  | "timeout"
  | "http_error"
  | "network"
  | "deadline_exceeded";

export type LLMCallOptions = {
  model?: string;
  temperature?: number;
  json?: boolean;
  max_tokens?: number;
  /**
   * Per-provider timeout. Default 8s. Long-form calls should pass 25-30s.
   */
  timeoutMs?: number;
  /**
   * Hard ceiling for the entire llmChat() invocation across all providers and
   * retries. When the deadline passes we stop trying and return null.
   * Recommended for request handlers (e.g. 50s to stay inside Cloudflare's
   * 60s gateway limit).
   */
  deadlineMs?: number;
  label?: string;
  traceId?: string;
  /**
   * Override the default provider chain. Useful for tests or special routing.
   */
  providers?: LLMProviderName[];
};

export type LLMError = {
  ok: false;
  reason: LLMErrorReason;
  provider: LLMProviderName;
  status?: number;
  elapsedMs: number;
  traceId: string;
  label?: string;
};

type LLMProviderName = "deepseek" | "minimax" | "kimi";

type ProviderConfig = {
  name: LLMProviderName;
  baseUrl: string;
  envKey: string;
  defaultModel: string;
  /** Optional header tweaks. */
  headers?: Record<string, string>;
};

const PROVIDERS: Record<LLMProviderName, ProviderConfig> = {
  deepseek: {
    name: "deepseek",
    baseUrl: "https://api.deepseek.com/v1",
    envKey: "DEEPSEEK_API_KEY",
    defaultModel: "deepseek-chat",
  },
  minimax: {
    name: "minimax",
    baseUrl: "https://api.minimax.io/v1",
    envKey: "MINIMAX_API_KEY",
    defaultModel: "MiniMax-M3",
  },
  kimi: {
    name: "kimi",
    baseUrl: "https://api.moonshot.cn/v1",
    envKey: "MOONSHOT_API_KEY",
    defaultModel: "moonshot-v1-8k",
  },
};

const DEFAULT_CHAIN: LLMProviderName[] = ["deepseek", "minimax", "kimi"];
const DEFAULT_TIMEOUT_MS = 8_000;

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

export async function llmChat(
  messages: LLMMessage[],
  opts: LLMCallOptions = {},
): Promise<string | null> {
  const result = await llmChatEx(messages, opts);
  return result?.content ?? null;
}

export type LLMResult = {
  content: string;
  provider: LLMProviderName;
};

export async function llmChatEx(
  messages: LLMMessage[],
  opts: LLMCallOptions = {},
): Promise<LLMResult | null> {
  const traceId = opts.traceId ?? randomUUID();
  const label = opts.label ?? "llmChat";
  const deadlineMs = opts.deadlineMs;
  const chain = opts.providers ?? DEFAULT_CHAIN;
  const start = Date.now();

  const remainingMs = (): number | undefined =>
    deadlineMs ? Math.max(0, deadlineMs - (Date.now() - start)) : undefined;

  for (const providerName of chain) {
    const cfg = PROVIDERS[providerName];
    const key = process.env[cfg.envKey];

    if (!key) {
      logError({
        reason: "missing_key",
        provider: providerName,
        elapsedMs: Date.now() - start,
        traceId,
        label,
      });
      continue;
    }

    // Respect the global deadline when choosing this provider's timeout.
    const baseTimeout = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const rem = remainingMs();
    const providerTimeout = rem !== undefined ? Math.min(baseTimeout, rem) : baseTimeout;
    if (rem !== undefined && rem <= 0) {
      logError({
        reason: "deadline_exceeded",
        provider: providerName,
        elapsedMs: Date.now() - start,
        traceId,
        label,
      });
      return null;
    }

    // One automatic retry on transient failures (timeout/http_error).
    const attempt = await llmChatOnce(messages, key, cfg, {
      ...opts,
      traceId,
      timeoutMs: providerTimeout,
    });
    if (attempt.ok) return { content: attempt.content, provider: providerName };

    if (attempt.reason === "timeout" || attempt.reason === "http_error") {
      const rem2 = remainingMs();
      const retryTimeout = rem2 !== undefined ? Math.min(baseTimeout, rem2) : baseTimeout;
      if (rem2 !== undefined && rem2 <= 0) {
        logError({
          reason: "deadline_exceeded",
          provider: providerName,
          elapsedMs: Date.now() - start,
          traceId,
          label,
        });
        return null;
      }
      console.warn(
        JSON.stringify({
          at: "llm_retry",
          traceId,
          label,
          provider: providerName,
          reason: attempt.reason,
        }),
      );
      const retry = await llmChatOnce(messages, key, cfg, {
        ...opts,
        traceId,
        timeoutMs: retryTimeout,
      });
      if (retry.ok) return { content: retry.content, provider: providerName };
    }
  }

  return null;
}

type LLMOnceResult =
  | { ok: true; content: string; reason?: undefined }
  | { ok: false; content?: undefined; reason: LLMErrorReason };

async function llmChatOnce(
  messages: LLMMessage[],
  key: string,
  cfg: ProviderConfig,
  opts: LLMCallOptions & { traceId: string; timeoutMs: number },
): Promise<LLMOnceResult> {
  const url = `${cfg.baseUrl}/chat/completions`;
  const model = opts.model ?? cfg.defaultModel;
  const traceId = opts.traceId;

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: opts.temperature ?? 0.8,
    max_tokens: opts.max_tokens ?? 1024,
    stream: false,
  };
  if (opts.json) body.response_format = { type: "json_object" };

  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), opts.timeoutMs);
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        ...cfg.headers,
      },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    clearTimeout(to);
    const elapsed = Date.now() - start;

    if (!res.ok) {
      const responseBody = await res.text().catch(() => "");
      logError({
        reason: "http_error",
        provider: cfg.name,
        status: res.status,
        elapsedMs: elapsed,
        traceId,
        label: opts.label,
        responseBody,
      });
      return { ok: false, reason: "http_error" };
    }

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      return { ok: false, reason: "http_error" };
    }
    return { ok: true, content };
  } catch (e) {
    clearTimeout(to);
    const elapsed = Date.now() - start;
    const reason: LLMErrorReason = ctl.signal.aborted ? "timeout" : "network";
    logError({
      reason,
      provider: cfg.name,
      elapsedMs: elapsed,
      traceId,
      label: opts.label,
      error: String(e),
    });
    return { ok: false, reason };
  }
}

function logError(
  payload: {
    reason: string;
    provider: LLMProviderName;
    status?: number;
    elapsedMs: number;
    traceId: string;
    label?: string;
    responseBody?: string;
    error?: string;
  },
) {
  console.error(
    JSON.stringify({
      at: "llm_call_failed",
      ...payload,
    }),
  );
}

function randomUUID(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
