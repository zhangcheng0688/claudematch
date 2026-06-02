import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400",
} as const;

export function json(body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
      ...(init?.headers ?? {}),
    },
  });
}

export function preflight() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Verify the request's Bearer token. Returns { userId, supabase } on success
 * or a 401 Response on failure. Uses the publishable key + bearer token so
 * RLS applies as the signed-in user.
 */
export async function requireUser(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return { error: json({ error: "Unauthorized: missing bearer token" }, { status: 401 }) } as const;
  }
  const token = auth.slice("Bearer ".length).trim();
  if (!token) {
    return { error: json({ error: "Unauthorized: empty token" }, { status: 401 }) } as const;
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return { error: json({ error: "Server misconfigured" }, { status: 500 }) } as const;
  }
  const supabase = createClient<Database>(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { error: json({ error: "Unauthorized: invalid token" }, { status: 401 }) } as const;
  }
  return { userId: data.user.id, email: data.user.email ?? null, supabase } as const;
}

/** Lightweight email format check. */
export function isValidEmail(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const v = value.trim();
  if (v.length < 5 || v.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}