import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import {
  checkRateLimit,
  clientIp,
  isValidEmail,
  json,
  preflight,
  safeError,
  safeRedirectTo,
} from "@/lib/api/_helpers.server";

/**
 * POST /api/login
 * Body: { email: string, redirect_to?: string }
 * Sends a magic-link / OTP email. Same response shape regardless of whether
 * the email already exists (prevents user enumeration).
 *
 * P0-1: rate-limited by caller IP (5 requests per 10 min per IP).
 * P0-3: redirect_to is whitelisted to a same-origin path.
 * P0-4: internal errors are mapped through safeError before being returned.
 */
export const Route = createFileRoute("/api/login")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),
      POST: async ({ request }) => {
        // P0-1: per-IP rate limit. 5 sign-in emails per 10 min is more than
        // any legitimate user needs; anything beyond is a script attack.
        const ip = clientIp(request);
        const rl = checkRateLimit(`login:${ip}`, { windowMs: 10 * 60_000, max: 5 });
        if (!rl.allowed) {
          return json(
            { error: "Too many attempts. Please wait a few minutes and try again." },
            { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } },
            request,
          );
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid JSON body" }, { status: 400 }, request);
        }
        const email = (body as { email?: unknown })?.email;
        const redirect_to = (body as { redirect_to?: unknown })?.redirect_to;
        if (!isValidEmail(email)) {
          return json({ error: "Invalid email" }, { status: 400 }, request);
        }

        const url = process.env.SUPABASE_URL;
        const anon = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!url || !anon) {
          return json({ error: "Server misconfigured" }, { status: 500 }, request);
        }

        const supabase = createClient(url, anon, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        // P0-3: redirect_to is whitelisted to same-origin paths only.
        const safeRedirect = safeRedirectTo(redirect_to, "/start");
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim().toLowerCase(),
          options: {
            shouldCreateUser: true,
            emailRedirectTo: safeRedirect,
          },
        });

        if (error) {
          // P0-4: never leak the raw Supabase error message. Use safeError
          // (which knows about the public error whitelist) instead.
          return json({ error: safeError(error) }, { status: 400 }, request);
        }

        return json(
          {
            message: "Login email sent. Check your inbox for the magic link or 6-digit code.",
          },
          undefined,
          request,
        );
      },
    },
  },
});
