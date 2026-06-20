// src/routes/api/referrals.ts
// GET  /api/referrals        — get my referral code + stats
// POST /api/referrals        — create/generate my referral code
// POST /api/referrals/claim  — claim a referral code for current user
// Body for claim: { code: string }

import { createFileRoute } from "@tanstack/react-router";
import { json, preflight, requireUser, safeError } from "@/lib/api/_helpers.server";

function generateCode(userId: string): string {
  const tail = userId.replace(/-/g, "").slice(0, 6).toUpperCase();
  return `LINQ${tail}`;
}

export const Route = createFileRoute("/api/referrals")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const { userId, supabase } = auth;

        const { data } = await (supabase.from as any)("referrals")
          .select("*")
          .eq("referrer_id", userId)
          .maybeSingle();

        const stats = await (supabase.from as any)("referrals")
          .select("status", { count: "exact" })
          .eq("referrer_id", userId)
          .eq("status", "signed_up");

        return json({
          data: {
            code: data?.code ?? null,
            status: data?.status ?? null,
            signed_up_count: stats.count ?? 0,
          },
        }, undefined, request);
      },
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const { userId, supabase } = auth;

        const code = generateCode(userId);
        const { data, error } = await (supabase.from as any)("referrals")
          .insert({ referrer_id: userId, code, status: "pending" })
          .select("*")
          .single();

        if (error) {
          if ((error as { code?: string }).code === "23505") {
            const { data: existing } = await (supabase.from as any)("referrals")
              .select("*")
              .eq("referrer_id", userId)
              .maybeSingle();
            return json({ data: existing, message: "Code already exists" }, undefined, request);
          }
          return json({ error: safeError(error) }, { status: 500 }, request);
        }
        return json({ data, message: "Referral code created" }, undefined, request);
      },
    },
  },
});
