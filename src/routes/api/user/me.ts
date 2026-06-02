import { createFileRoute } from "@tanstack/react-router";
import { json, preflight, requireUser } from "@/lib/api/_helpers.server";

export const Route = createFileRoute("/api/user/me")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const { userId, supabase, email } = auth;

        const [{ data: profile }, { data: authz }, { data: aiProfile }] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
          supabase.from("user_authorizations").select("*").eq("user_id", userId).maybeSingle(),
          supabase
            .from("user_profiles")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        return json({
          data: {
            user: { id: userId, email },
            profile: profile ?? null,
            authorizations: authz ?? { business: false, dating: false, partner: false },
            ai_profile: aiProfile ?? null,
          },
        });
      },
    },
  },
});