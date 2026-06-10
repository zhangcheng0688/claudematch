// src/lib/api/authed-fetch.ts
// Shared authenticated fetch wrapper. Centralized so every authenticated route
// uses the same Bearer-token logic, error shape, and TypeScript types.

import { supabase } from "@/integrations/supabase/client";
import { fetchWithTimeout } from "@/lib/api/fetch-with-timeout";

const DEFAULT_TIMEOUT_MS = 8_000;

/**
 * Authenticated fetch. Init.headers may include `Idempotency-Key` (or any
 * custom header); we forward everything in the final merged headers
 * map. The bearer token is appended last so callers can't accidentally
 * override it.
 *
 * P2-deferred 5: default 8s timeout. Callers can override via the
 * `timeoutMs` extension. A timeout throws a regular Error with the
 * message "request_timed_out_after_Nms" — UI components catch
 * that to render a "网络不好 / retry" state instead of a blank
 * spinner.
 */
export async function authedFetch<T = unknown>(
  path: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const timeoutMs = init?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const { signal: _ignoreSignal, timeoutMs: _ignore, ...restInit } = init ?? {};
  const result = await fetchWithTimeout(
    path,
    {
      ...restInit,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(restInit?.headers ?? {}),
      },
    },
    timeoutMs,
  );

  if (result.kind === "timeout") {
    throw new Error(`request_timed_out_after_${result.ms}ms`);
  }
  if (result.kind === "error") {
    throw new Error(result.error);
  }
  const res = result.response;

  // P1-7: 401 → redirect to /auth with the current path preserved
  // so we can return the user to where they were after re-login.
  if (res.status === 401 && typeof window !== "undefined") {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    window.location.replace(`/auth?reason=session_expired&next=${next}`);
    throw new Error("session_expired_redirecting");
  }

  const body = (await res.json().catch(() => ({}))) as unknown;
  if (!res.ok) {
    const errMsg =
      (body as { error?: string })?.error ?? `Request failed (${res.status})`;
    throw new Error(errMsg);
  }
  return body as T;
}
