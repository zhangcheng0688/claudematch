import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { isValidEmail, json, preflight } from "@/lib/api/_helpers.server";

/**
 * POST /api/login
 * Body: { email: string, redirect_to?: string }
 * Sends a magic-link / OTP email. Same response shape regardless of whether
 * the email already exists (prevents user enumeration).
 */
export const Route = createFileRoute("/api/login")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid JSON body" }, { status: 400 });
        }
        const email = (body as { email?: unknown })?.email;
        const redirect_to = (body as { redirect_to?: unknown })?.redirect_to;
        if (!isValidEmail(email)) {
          return json({ error: "Invalid email" }, { status: 400 });
        }

        const url = process.env.SUPABASE_URL;
        const anon = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!url || !anon) {
          return json({ error: "Server misconfigured" }, { status: 500 });
        }

        const supabase = createClient(url, anon, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim().toLowerCase(),
          options: {
            shouldCreateUser: true,
            emailRedirectTo: typeof redirect_to === "string" ? redirect_to : undefined,
          },
        });

        if (error) {
          return json({ error: error.message }, { status: 400 });
        }

        return json({
          message: "Login email sent. Check your inbox for the magic link or 6-digit code.",
        });
      },
    },
  },
});