// src/lib/api/fetch-with-timeout.ts
//
// P2-deferred 5: every fetch in the SPA gets a default 8s timeout
// (so users don't see "Loading…" forever when the API is slow).
// Helpers here wrap the native fetch with AbortController-based
// timeouts + a typed error that callers can distinguish from
// network errors.
//
// Usage:
//   const res = await fetchWithTimeout("/api/foo", { method: "GET" }, 8000);
//   if (res.kind === "timeout") { showDegradedUI(); return; }
//   if (res.kind === "error") { showErrorBanner(res.error); return; }
//   const data = await res.response.json();
//
// Why a wrapper (not just AbortController inline): we want every
// authenticated call to share the SAME timeout policy, and we
// want the timeout to compose cleanly with the AbortSignal that
// authedFetch already plumbs through. Re-implementing this in 12
// different call sites is the kind of drift that bites us later.

export type FetchWithTimeoutResult =
  | { kind: "ok"; response: Response }
  | { kind: "timeout"; ms: number }
  | { kind: "error"; error: string };

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 8_000,
): Promise<FetchWithTimeoutResult> {
  const ctl = new AbortController();
  // If the caller already has an AbortSignal (e.g. React Strict Mode
  // double-mount, or a parent component's cancellation), forward
  // it: abort when either fires.
  const onCallerAbort = () => ctl.abort();
  if (init.signal) {
    if (init.signal.aborted) ctl.abort();
    else init.signal.addEventListener("abort", onCallerAbort);
  }
  const to = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(input, { ...init, signal: ctl.signal });
    return { kind: "ok", response: res };
  } catch (e) {
    if (ctl.signal.aborted) {
      // Could be caller abort or timeout. We can't distinguish
      // from just the signal state; heuristic: if the timeout
      // already fired, it's a timeout.
      return { kind: "timeout", ms: timeoutMs };
    }
    return { kind: "error", error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(to);
    if (init.signal) init.signal.removeEventListener("abort", onCallerAbort);
  }
}
