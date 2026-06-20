// src/routes/api/referrals/claim.ts
// POST /api/referrals/claim — current user claims a referral code.
// Body: { code: string }

import { createFileRoute } from "@tanstack/react-router";
import { json, preflight, requireUser, safeError } from "@/lib/api/_helpers.server";

export const Route = createFileRoute("/api/referrals/claim")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const { userId, supabase } = auth;

        let body: Record<string, unknown> = {};
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid JSON body" }, { status: 400 }, request);
        }

        const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
        if (code.length < 4) {
          return json({ error: "Invalid referral code" }, { status: 400 }, request);
        }

        // Prevent self-referral.
        const { data: existing } = await (supabase.from as any)("referrals")
          .select("referrer_id")
          .eq("code", code)
          .maybeSingle();
        if (existing?.referrer_id === userId) {
          return json({ error: "Cannot use your own code" }, { status: 400 }, request);
        }

        const { data, error } = await (supabase.from as any)("referrals")
          .update({ referred_id: userId, status: "signed_up", converted_at: new Date().toISOString() })
          .eq("code", code)
          .is("referred_id", null)
          .select("*")
          .single();

        if (error || !data) {
          return json({ error: safeError(error ?? { message: "Code already used or not found" }) }, { status: 400 }, request);
        }
        return json({ data, message: "Referral claimed" }, undefined, request);
      },
    },
  },
});
