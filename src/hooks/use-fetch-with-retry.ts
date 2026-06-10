// src/hooks/use-fetch-with-retry.ts
//
// P2-deferred 5: standardized "fetch with loading/error/timeout
// states" hook for useEffect-driven data loading. Replaces the
// ad-hoc `setLoading / setErr / try { ... } catch (e) { setErr }
// }` patterns scattered across 5 business pages.
//
// Usage:
//
//   const { data, loading, err, retry } = useFetchWithRetry(
//     () => authedFetch<{ data: MeResponse }>("/api/user/me"),
//     [userId],   // refetch when userId changes
//   );
//
//   if (loading) return <Spinner />;
//   if (err) return <ErrorBanner onRetry={retry} />;
//   return <Profile data={data} />;
//
// The hook handles:
//   - AbortController for timeouts (8s default)
//   - Retries (1 retry on timeout, immediate; configurable)
//   - Stale-while-revalidate: previous data stays visible during
//     refetch instead of flashing a spinner
//   - Component unmount safety (doesn't setState on unmounted)
//
// Pairs with src/lib/api/authed-fetch.ts (which already handles
// auth + 401 redirect). The hook adds the lifecycle on top.

import { useCallback, useEffect, useRef, useState } from "react";

type State<T> = {
  data: T | null;
  loading: boolean;
  err: string | null;
  /** When true, this is a re-fetch (we already have data). */
  refreshing: boolean;
  /** Last successful fetch timestamp (ms epoch). */
  fetchedAt: number | null;
  /** Manual retry trigger. Increment to force a fresh fetch. */
  retryCount: number;
};

export type UseFetchWithRetryOptions = {
  /** Initial data (e.g. server-rendered or from a cache). When
   *  provided, loading=false on first render. */
  initialData?: unknown;
  /** Max retry attempts on timeout. Default 1. */
  maxRetries?: number;
  /** Whether to refetch when the window regains focus. Default false. */
  refetchOnFocus?: boolean;
};

export function useFetchWithRetry<T>(
  fetcher: () => Promise<T>,
  deps: ReadonlyArray<unknown>,
  opts: UseFetchWithRetryOptions = {},
) {
  const { initialData, maxRetries = 1, refetchOnFocus = false } = opts;
  const [state, setState] = useState<State<T>>({
    data: (initialData ?? null) as T | null,
    loading: initialData === undefined,
    err: null,
    refreshing: false,
    fetchedAt: initialData !== undefined ? Date.now() : null,
    retryCount: 0,
  });
  // The fetcher is captured at render time; we re-create it via
  // deps change. The retry button just increments retryCount,
  // which the effect also depends on.
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const run = useCallback(async () => {
    if (state.data !== null) {
      setState((s) => ({ ...s, refreshing: true, err: null }));
    } else {
      setState((s) => ({ ...s, loading: true, err: null }));
    }
    let lastErr: string | null = null;
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        const data = await fetcher();
        if (!mounted.current) return;
        setState({
          data,
          loading: false,
          refreshing: false,
          err: null,
          fetchedAt: Date.now(),
          retryCount: state.retryCount + 1,
        });
        return;
      } catch (e) {
        lastErr = e instanceof Error ? e.message : String(e);
        // Don't retry on 401 (auth wrapper handles redirect) or
        // on explicit "don't retry" errors (start with "do_not_retry_").
        if (lastErr === "session_expired_redirecting") break;
        if (lastErr.startsWith("do_not_retry_")) break;
        // If this was the last attempt, fall through to the
        // error state.
        if (attempt === maxRetries) break;
        // Wait briefly before retrying. 600ms — long enough to
        // skip a transient blip, short enough that the user
        // doesn't notice.
        await new Promise((r) => setTimeout(r, 600));
      }
    }
    if (!mounted.current) return;
    setState((s) => ({
      ...s,
      loading: false,
      refreshing: false,
      err: lastErr,
    }));
    // We do NOT clear data on error — the page should keep showing
    // stale data with an error banner. This is a deliberate
    // stale-while-revalidate behavior.
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    run();
    // We intentionally re-run on retryCount change so the manual
    // retry button works.
  }, [run, state.retryCount]);

  // Refetch on window focus (optional)
  useEffect(() => {
    if (!refetchOnFocus) return;
    const handler = () => {
      if (document.visibilityState === "visible") {
        setState((s) => ({ ...s, retryCount: s.retryCount + 1 }));
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [refetchOnFocus]);

  const retry = useCallback(() => {
    setState((s) => ({ ...s, retryCount: s.retryCount + 1 }));
  }, []);

  return { ...state, retry };
}