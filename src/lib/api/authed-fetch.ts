// src/lib/api/authed-fetch.ts
// Shared authenticated fetch wrapper. Centralized so every authenticated route
// uses the same Bearer-token logic, error shape, and TypeScript types.

import { supabase } from "@/integrations/supabase/client";

/**
 * Authenticated fetch. Init.headers may include `Idempotency-Key` (or any
 * custom header); we forward everything in the final merged headers
 * map. The bearer token is appended last so callers can't accidentally
 * override it.
 */
export async function authedFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  // P1-7: 401 → redirect to /auth with the current path preserved
  // so we can return the user to where they were after re-login.
  if (res.status === 401 && typeof window !== "undefined") {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    // We can't await getSession from a 401 response without an infinite
    // loop — signOut first, then redirect. Use replace so back-button
    // doesn't bring us back to the dead page.
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
