import { createFileRoute } from "@tanstack/react-router";
import { json, preflight, requireUser } from "@/lib/api/_helpers.server";

/**
 * Placeholder AI profile generator — returns a deterministic, structured
 * "behavioral signal" profile and persists it. Real AI hookup can replace
 * the `buildProfile` body without changing the response shape.
 */
function buildProfile(seed: string) {
  const hash = Array.from(seed).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const r = (n: number) => ((hash >> n) & 0xff) / 255;
  return {
    version: "v1",
    traits: {
      openness: +(0.5 + r(0) * 0.5).toFixed(2),
      conscientiousness: +(0.4 + r(2) * 0.5).toFixed(2),
      extraversion: +(0.3 + r(4) * 0.6).toFixed(2),
      agreeableness: +(0.5 + r(6) * 0.4).toFixed(2),
      curiosity: +(0.4 + r(8) * 0.5).toFixed(2),
    },
    interests: ["startups", "coffee", "weekend hikes", "indie music", "design"].filter((_, i) => (hash >> i) & 1),
    communication_style: r(10) > 0.5 ? "direct & concise" : "warm & exploratory",
    availability: { weekday_evenings: r(12) > 0.4, weekend_brunch: r(14) > 0.3 },
    generated_at: new Date().toISOString(),
  };
}

export const Route = createFileRoute("/api/ai/generate-profile")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const { userId, supabase } = auth;

        const profile_data = buildProfile(userId);

        const { data, error } = await supabase
          .from("user_profiles")
          .insert({ user_id: userId, profile_data })
          .select("*")
          .single();

        if (error) return json({ error: error.message }, { status: 500 });
        return json({ data, message: "AI profile generated" });
      },
    },
  },
});