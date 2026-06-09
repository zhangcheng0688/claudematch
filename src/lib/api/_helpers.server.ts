import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// ─────────────────────────────────────────────────────────────────────────────
// CORS — P0-5 fix
// Was: Access-Control-Allow-Origin: * (any domain could call our API).
// Now: only the configured FRONTEND_ORIGIN (and any extras in the comma list).
// Falls back to https://claudematch.com if env is unset.
// ─────────────────────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = (
  process.env.FRONTEND_ORIGIN ?? "https://claudematch.com"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function corsHeadersFor(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") ?? "";
  // Echo the origin only if it's in the allow-list. Browser will reject the
  // response otherwise. We can't use `*` here because we sometimes return
  // `Access-Control-Allow-Credentials: true` in the future, and that combo
  // is illegal.
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]!;
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400",
  };
}

export function CORS_HEADERS(request?: Request): Record<string, string> {
  // Backwards-compat shim: existing callers passing no arg still get the
  // first allowed origin. New callers should pass the request to honor the
  // actual Origin header.
  if (!request) return corsHeadersFor(new Request("https://x/"));
  return corsHeadersFor(request);
}

export function preflight(request?: Request) {
  return new Response(null, { status: 204, headers: CORS_HEADERS(request) });
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON response helper — pairs every json() with CORS.
// ─────────────────────────────────────────────────────────────────────────────

export function json(
  body: unknown,
  init?: { status?: number; headers?: Record<string, string> },
  request?: Request,
) {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS(request),
      ...(init?.headers ?? {}),
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// P0-4: safeError
// Hides internal error.message from the client in production (Supabase errors
// leak SQL fragments, column names, function signatures — schema fingerprint
// for an attacker). In dev, we still pass the real message for debugging.
// ─────────────────────────────────────────────────────────────────────────────

const PUBLIC_ERROR_MAP: Record<string, string> = {
  // Supabase auth.js canonical messages worth translating
  "User already registered": "An account with this email already exists. Try signing in.",
  "Invalid login credentials": "That code didn't work. Please check and try again.",
  "Email not confirmed": "Please confirm your email first by clicking the link we sent.",
  "Token has expired or is invalid": "That link or code has expired. Please request a new one.",
  "Rate limit exceeded": "Too many attempts. Please wait a moment and try again.",
};

export function safeError(error: unknown): string {
  const isProd = process.env.NODE_ENV === "production";
  if (error instanceof Error) {
    // 1. Known public-safe error → use that
    const known = PUBLIC_ERROR_MAP[error.message];
    if (known) return known;
    // 2. In dev, return real message; in prod, generic
    if (!isProd) return error.message;
  }
  return "Something went wrong. Please try again.";
}

// ─────────────────────────────────────────────────────────────────────────────
// P0-1: in-memory IP-bucketed rate limiter
// Loose enough to not break legitimate flows (5 sign-in emails in 10 min is
// normal for a user retrying); tight enough to make spam expensive.
//
// On Cloudflare Workers each isolate has its own memory; that's fine for
// rate limiting — the worst case is a 2-3x slack, which still blocks the
// script-kiddie attack we care about. (If we ever outgrow this, swap the
// Map for a Cloudflare KV / Upstash Redis lookup — the call sites don't
// change.)
// ─────────────────────────────────────────────────────────────────────────────

type Bucket = { count: number; resetAt: number };
const RATE_BUCKETS = new Map<string, Bucket>();

// Trim periodically so the map doesn't grow unboundedly.
const MAX_BUCKETS = 10_000;
let lastTrim = 0;
function maybeTrim() {
  const now = Date.now();
  if (now - lastTrim < 60_000) return; // at most once per minute
  lastTrim = now;
  for (const [k, v] of RATE_BUCKETS) {
    if (v.resetAt < now) RATE_BUCKETS.delete(k);
  }
  // If still over cap, drop oldest 20% — they're not "important" buckets
  if (RATE_BUCKETS.size > MAX_BUCKETS) {
    let dropped = 0;
    for (const k of RATE_BUCKETS.keys()) {
      RATE_BUCKETS.delete(k);
      if (++dropped >= MAX_BUCKETS * 0.2) break;
    }
  }
}

export type RateLimitConfig = {
  /** window length in ms */
  windowMs: number;
  /** max requests in the window per key */
  max: number;
};

export type RateLimitResult =
  | { allowed: true; remaining: number; resetAt: number }
  | { allowed: false; retryAfterMs: number; resetAt: number };

export function checkRateLimit(
  key: string,
  cfg: RateLimitConfig,
  now: number = Date.now(),
): RateLimitResult {
  maybeTrim();
  const bucket = RATE_BUCKETS.get(key);
  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + cfg.windowMs;
    RATE_BUCKETS.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: cfg.max - 1, resetAt };
  }
  if (bucket.count >= cfg.max) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now, resetAt: bucket.resetAt };
  }
  bucket.count += 1;
  return { allowed: true, remaining: cfg.max - bucket.count, resetAt: bucket.resetAt };
}

/** Extract the caller's IP from Cloudflare's CF-Connecting-IP header (set by
 *  Cloudflare for both Workers and pages-functions). Falls back to X-Forwarded-For
 *  for local dev. Returns "unknown" if neither is present (we still rate-limit
 *  by the literal key "unknown" so all unidentified callers share a bucket —
 *  attacker can't bypass by stripping headers, because we still bucket them
 *  together with everyone else unidentified). */
export function clientIp(request: Request): string {
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return "unknown";
}

// ─────────────────────────────────────────────────────────────────────────────
// P0-3: redirectTo whitelist
// `emailRedirectTo` and `redirect_to` from request bodies / queries must
// resolve to a same-origin path we control. Anything else is ignored and we
// fall back to a safe default.
// ─────────────────────────────────────────────────────────────────────────────

function safeRedirectUrl(
  raw: unknown,
  fallback: string,
): string {
  if (typeof raw !== "string" || !raw) return fallback;
  try {
    const origin = ALLOWED_ORIGINS[0]!;
    const u = new URL(raw, origin);
    if (u.origin !== origin) return fallback;
    if (!u.pathname.startsWith("/")) return fallback;
    // Block protocol-relative (`//evil.com/...`) — URL parser resolves them
    // to an external origin; the origin check above already catches it, but
    // belt + suspenders:
    if (u.pathname.startsWith("//")) return fallback;
    return u.toString();
  } catch {
    return fallback;
  }
}

export function safeRedirectTo(
  raw: unknown,
  fallbackPath = "/start",
): string {
  // Always return a relative path; the caller can wrap with `new URL(s, origin)`.
  if (typeof raw !== "string" || !raw) return fallbackPath;
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return fallbackPath;
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth: verify Bearer token, return { userId, supabase, email } or 401.
// ─────────────────────────────────────────────────────────────────────────────

export async function requireUser(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return { error: json({ error: "Unauthorized: missing bearer token" }, { status: 401 }, request) } as const;
  }
  const token = auth.slice("Bearer ".length).trim();
  if (!token) {
    return { error: json({ error: "Unauthorized: empty token" }, { status: 401 }, request) } as const;
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return { error: json({ error: "Server misconfigured" }, { status: 500 }, request) } as const;
  }
  const supabase = createClient<Database>(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { error: json({ error: "Unauthorized: invalid token" }, { status: 401 }, request) } as const;
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
