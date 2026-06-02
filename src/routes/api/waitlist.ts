import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { CORS_HEADERS, isValidEmail, json, preflight } from "@/lib/api/_helpers.server";

export const Route = createFileRoute("/api/waitlist")({
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
        if (!isValidEmail(email)) {
          return json({ error: "Invalid email" }, { status: 400 });
        }
        const normalized = email.trim().toLowerCase();

        const { data, error } = await supabaseAdmin
          .from("waitlist")
          .upsert({ email: normalized, status: "pending" }, { onConflict: "email", ignoreDuplicates: false })
          .select("id, email, status, created_at")
          .single();

        if (error) {
          return json({ error: error.message }, { status: 500 });
        }
        return json({ data, message: "Joined the waitlist" }, { status: 200 });
      },
    },
  },
});

export const _cors = CORS_HEADERS; // keep import used in type-checked envs