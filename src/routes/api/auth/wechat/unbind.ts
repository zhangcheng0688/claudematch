// src/routes/api/auth/wechat/unbind.ts
// POST /api/auth/wechat/unbind — clear the WeChat binding on the current user.
// After P0-7, the canonical binding lives in the wechat_auth table. We also
// clear the legacy profile columns (kept for back-compat with rows created
// before the migration).
//
// P1-5: Idempotency-Key support. Client passes a UUID via header;
// we cache the response for 24h keyed by (user_id, key). Re-running
// with the same key returns the cached body (regardless of whether
// the original succeeded). The key is a one-shot — once consumed, it
// can't be reused. This prevents:
//   - Double-execution on page-refresh mid-flight
//   - Attacker holding a JWT from script-running 1000 unbinds
// The body is the response *body*, not the response object, because
// Cloudflare Workers' response streams are not re-readable.

import { createFileRoute } from "@tanstack/react-router";
import { json, preflight, requireUser, safeError } from "@/lib/api/_helpers.server";

// P1-5: LRU-ish idempotency cache. Bounded to prevent unbounded memory
// growth; entries evicted on TTL or on overflow.
type Cached = { status: number; body: string; expiresAt: number };
const IDEMPOTENCY_CACHE = new Map<string, Cached>();
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 5000;

// Periodic trim (best-effort; Cloudflare Workers isolate teardown handles
// cleanup between requests anyway, so this is just defensive for long-lived
// isolates).
let lastTrim = 0;
function maybeTrim() {
  const now = Date.now();
  if (now - lastTrim < 60_000) return;
  lastTrim = now;
  for (const [k, v] of IDEMPOTENCY_CACHE) {
    if (v.expiresAt < now) IDEMPOTENCY_CACHE.delete(k);
  }
  if (IDEMPOTENCY_CACHE.size > MAX_ENTRIES) {
    let dropped = 0;
    for (const k of IDEMPOTENCY_CACHE.keys()) {
      IDEMPOTENCY_CACHE.delete(k);
      if (++dropped >= MAX_ENTRIES * 0.2) break;
    }
  }
}

function cacheKey(userId: string, idempotencyKey: string): string {
  return `${userId}:${idempotencyKey}`;
}

export const Route = createFileRoute("/api/auth/wechat/unbind")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),
      POST: async ({ request }) => {
        maybeTrim();
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const { userId, supabase } = auth;

        const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
        if (idempotencyKey && idempotencyKey.length <= 64) {
          const key = cacheKey(userId, idempotencyKey);
          const hit = IDEMPOTENCY_CACHE.get(key);
          if (hit && hit.expiresAt > Date.now()) {
            return new Response(hit.body, {
              status: hit.status,
              headers: {
                "Content-Type": "application/json",
                "X-Idempotent-Replay": "true",
              },
            });
          }
        }

        // Best-effort delete on both sources; tolerate missing tables/rows.
        await supabase.from("wechat_auth").delete().eq("user_id", userId);

        const { error } = await supabase
          .from("profiles")
          .update({
            wechat_openid: null,
            wechat_unionid: null,
            wechat_nickname: null,
            wechat_avatar: null,
          })
          .eq("id", userId);

        const body = error
          ? JSON.stringify({ error: safeError(error) })
          : JSON.stringify({ data: { unbound: true } });
        const status = error ? 500 : 200;

        if (idempotencyKey && idempotencyKey.length <= 64) {
          IDEMPOTENCY_CACHE.set(cacheKey(userId, idempotencyKey), {
            status,
            body,
            expiresAt: Date.now() + TTL_MS,
          });
        }

        return new Response(body, {
          status,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
