import { createFileRoute } from "@tanstack/react-router";
import { json, preflight, requireUser, safeError } from "@/lib/api/_helpers.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/authorize")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const { userId } = auth;

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid JSON body" }, { status: 400 }, request);
        }
        const b = (body ?? {}) as Record<string, unknown>;
        const business = Boolean(b.business);
        const dating = Boolean(b.dating);
        const partner = Boolean(b.partner);
        const discoverable = b.discoverable === undefined ? true : Boolean(b.discoverable);

        // SECURITY: dating/business/partner columns are revoked from the
        // authenticated role; writes go through the service-role client on
        // the server. user_id is forced to the authenticated caller.
        const { data, error } = await supabaseAdmin
          .from("user_authorizations")
          .upsert({ user_id: userId, business, dating, partner, discoverable } as never, {
            onConflict: "user_id",
          })
          .select("*")
          .single();

        if (error) return json({ error: safeError(error) }, { status: 500 }, request);
        return json({ data, message: "Authorizations saved" }, undefined, request);
      },
    },
  },
});
