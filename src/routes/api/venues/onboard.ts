// src/routes/api/venues/onboard.ts
//
// POST /api/venues/onboard
// Body: {
//   name: string,
//   city: string,
//   district?: string,
//   address?: string,
//   merchant_email: string,
//   cuisine_tags?: string[],
//   vibe_tags?: string[],
//   price_per_person?: number,
//   tel?: string,
//   opening_hours?: string,
//   notes?: string
// }
//
// Self-service restaurant onboarding. Creates a `venues` row in
// `onboarding_status = 'pending'` and returns the merchant_token so the
// submitter can immediately bookmark their dashboard URL. An admin can
// later flip the row to 'approved' / `is_active = true`.

import { createFileRoute } from "@tanstack/react-router";
import { json, preflight, safeError } from "@/lib/api/_helpers.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendEmail } from "@/lib/email/send";

const VALID_CITIES = new Set(["shenzhen", "shanghai", "hongkong"]);

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export const Route = createFileRoute("/api/venues/onboard")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),
      POST: async ({ request }) => {
        let body: Record<string, unknown> = {};
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid JSON body" }, { status: 400 }, request);
        }

        const name = typeof body.name === "string" ? body.name.trim() : "";
        const city = typeof body.city === "string" ? body.city.toLowerCase().trim() : "";
        const district = typeof body.district === "string" ? body.district.trim() : null;
        const address = typeof body.address === "string" ? body.address.trim() : null;
        const merchantEmail =
          typeof body.merchant_email === "string" ? body.merchant_email.trim() : "";
        const tel = typeof body.tel === "string" ? body.tel.trim() : null;
        const openingHours =
          typeof body.opening_hours === "string" ? body.opening_hours.trim() : null;
        const notes = typeof body.notes === "string" ? body.notes.trim() : null;
        const price = typeof body.price_per_person === "number" ? body.price_per_person : null;
        const cuisineTags = Array.isArray(body.cuisine_tags) ? body.cuisine_tags.map(String) : [];
        const vibeTags = Array.isArray(body.vibe_tags) ? body.vibe_tags.map(String) : [];

        if (!name || name.length < 2) {
          return json({ error: "name is required (min 2 chars)" }, { status: 400 }, request);
        }
        if (!VALID_CITIES.has(city)) {
          return json(
            { error: `city must be one of: ${[...VALID_CITIES].join(", ")}` },
            { status: 400 },
            request,
          );
        }
        if (!isValidEmail(merchantEmail)) {
          return json({ error: "merchant_email is invalid" }, { status: 400 }, request);
        }

        const { data, error } = await supabaseAdmin
          .from("venues")
          .insert({
            name,
            city,
            district,
            address,
            merchant_email: merchantEmail,
            cuisine_tags: cuisineTags,
            vibe_tags: vibeTags,
            price_per_person: price,
            tel,
            opening_hours: openingHours,
            notes,
            source: "merchant_onboarding",
            onboarding_status: "pending",
            is_active: false,
          })
          .select("id, name, city, merchant_token, onboarding_status, created_at")
          .single();

        if (error) return json({ error: safeError(error) }, { status: 500 }, request);

        // Best-effort notification email to the linQ ops team via Resend.
        sendEmail({
          to: "ops@claudematch.com",
          subject: "【linQ】新餐廳入駐申請",
          html: `<p>新餐廳申請：${name}（${city}）</p><p>聯絡郵箱：${merchantEmail}</p><p>請到後台審核。</p>`,
          text: `新餐廳申請：${name}（${city}）\n聯絡郵箱：${merchantEmail}\n請到後台審核。`,
          tag: "venue_onboarding_alert",
          traceId: `venue_onboard:${data.id}`,
        }).catch(() => {
          // Non-fatal: the venue row is already persisted.
        });

        return json(
          {
            data,
            message: "Submission received. We'll review and email you once approved.",
            dashboard_url: `/merchant/dashboard?token=${data.merchant_token}`,
          },
          undefined,
          request,
        );
      },
    },
  },
});
