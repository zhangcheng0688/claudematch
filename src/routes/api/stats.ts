import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { json, preflight } from "@/lib/api/_helpers.server";

const BASE_COUNT = 156000;

export const Route = createFileRoute("/api/stats")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async () => {
        const { count, error } = await supabaseAdmin
          .from("waitlist")
          .select("*", { count: "exact", head: true });
        if (error) {
          return json({ error: error.message }, { status: 500 });
        }
        const waitlist_count = (count ?? 0) + BASE_COUNT;
        return json({
          data: {
            waitlist_count,
            real_signups: count ?? 0,
            updated_at: new Date().toISOString(),
          },
        });
      },
    },
  },
});