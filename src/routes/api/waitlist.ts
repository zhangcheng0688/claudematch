import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  checkRateLimit,
  clientIp,
  isValidEmail,
  json,
  preflight,
  safeError,
} from "@/lib/api/_helpers.server";

// P0-1: per-IP rate limit on the public waitlist endpoint — otherwise an
// attacker can poison the table (DoS the unique-email index) with junk.
const WAITLIST_LIMIT = { windowMs: 10 * 60_000, max: 3 };

export const Route = createFileRoute("/api/waitlist")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),
      POST: async ({ request }) => {
        const rl = checkRateLimit(`waitlist:${clientIp(request)}`, WAITLIST_LIMIT);
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
        if (!isValidEmail(email)) {
          return json({ error: "Invalid email" }, { status: 400 }, request);
        }
        const normalized = email.trim().toLowerCase();

        const { data, error } = await supabaseAdmin
          .from("waitlist")
          .upsert({ email: normalized, status: "pending" }, { onConflict: "email", ignoreDuplicates: false })
          .select("id, email, status, created_at")
          .single();

        if (error) {
          return json({ error: safeError(error) }, { status: 500 }, request);
        }
        return json({ data, message: "Joined the waitlist" }, { status: 200 }, request);
      },
    },
  },
});