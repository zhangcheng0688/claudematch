// src/lib/api/authed-fetch.ts
// Shared authenticated fetch wrapper. Centralized so every authenticated route
// uses the same Bearer-token logic, error shape, and TypeScript types.

import { supabase } from "@/integrations/supabase/client";

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

  const body = (await res.json().catch(() => ({}))) as unknown;
  if (!res.ok) {
    const errMsg =
      (body as { error?: string })?.error ?? `Request failed (${res.status})`;
    throw new Error(errMsg);
  }
  return body as T;
}
