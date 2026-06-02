/**
 * DeepSeek chat helper. Uses the OpenAI-compatible Chat Completions API.
 * Requires the DEEPSEEK_API_KEY env var. Falls back gracefully when the
 * key is missing or the call fails — caller decides how to handle null.
 */

const ENDPOINT = "https://api.deepseek.com/v1/chat/completions";

export type DSMessage = { role: "system" | "user" | "assistant"; content: string };

export async function deepseekChat(
  messages: DSMessage[],
  opts: { model?: string; temperature?: number; json?: boolean; max_tokens?: number } = {},
): Promise<string | null> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return null;
  try {
    const body: Record<string, unknown> = {
      model: opts.model ?? "deepseek-chat",
      messages,
      temperature: opts.temperature ?? 0.8,
      max_tokens: opts.max_tokens ?? 1024,
      stream: false,
    };
    if (opts.json) body.response_format = { type: "json_object" };

    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 45_000);
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
    if (!res.ok) {
      console.error("deepseek error", res.status, await res.text().catch(() => ""));
      return null;
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return json.choices?.[0]?.message?.content ?? null;
  } catch (e) {
    console.error("deepseek call failed", e);
    return null;
  }
}

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