import { createFileRoute } from "@tanstack/react-router";
import { json, preflight, requireUser } from "@/lib/api/_helpers.server";
import { deepseekChat, safeParseJSON } from "@/lib/api/_deepseek.server";

const VALID_SCENARIOS = new Set(["business", "dating", "partner"]);

/**
 * POST /api/ai/generate-profile
 * Body: { input: string, scenario?: "business" | "dating" | "partner", lang?: "en" | "zh" }
 * Uses DeepSeek to turn the user's free-form intro into a structured
 * behavioral profile, persists it to `user_profiles`, and upserts the
 * scenario authorization so the matcher can find them later.
 */

export const Route = createFileRoute("/api/ai/generate-profile")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const { userId, supabase } = auth;

        let body: { input?: unknown; scenario?: unknown; lang?: unknown } = {};
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid JSON body" }, { status: 400 });
        }
        const input = typeof body.input === "string" ? body.input.trim() : "";
        if (input.length < 4 || input.length > 4000) {
          return json({ error: "input must be 4-4000 chars" }, { status: 400 });
        }
        const scenario =
          typeof body.scenario === "string" && VALID_SCENARIOS.has(body.scenario)
            ? (body.scenario as "business" | "dating" | "partner")
            : "dating";
        const lang = body.lang === "zh" ? "zh" : "en";

        const sys =
          lang === "zh"
            ? "你是 linQ 的 AI 画像引擎。根据用户的自我描述生成结构化的人物画像。严格只输出 JSON，不要 markdown 代码块。"
            : "You are linQ's AI profile engine. Turn the user's self-description into a structured behavioral profile. Output JSON ONLY, no markdown.";

        const userPrompt = `Scenario: ${scenario}\nUser description: """${input}"""\n\nReturn JSON with this shape:\n{\n  "summary": string (1-2 sentences, in ${lang === "zh" ? "Chinese" : "English"}),\n  "traits": { "openness": 0-1, "conscientiousness": 0-1, "extraversion": 0-1, "agreeableness": 0-1, "curiosity": 0-1 },\n  "interests": string[] (3-6 items),\n  "communication_style": string,\n  "looking_for": string (1 sentence),\n  "ideal_match": string (1 sentence)\n}`;

        const raw = await deepseekChat(
          [
            { role: "system", content: sys },
            { role: "user", content: userPrompt },
          ],
          { json: true, temperature: 0.7 },
        );

        const parsed = safeParseJSON<Record<string, unknown>>(raw);
        const profile_data = {
          version: "v1",
          scenario,
          lang,
          input,
          ai: parsed ?? {
            summary: input.slice(0, 160),
            traits: { openness: 0.7, conscientiousness: 0.6, extraversion: 0.5, agreeableness: 0.7, curiosity: 0.7 },
            interests: [],
            communication_style: "warm & exploratory",
            looking_for: input.slice(0, 120),
            ideal_match: "open-minded, curious people who show up authentically.",
          },
          ai_provider: parsed ? "deepseek" : "fallback",
          generated_at: new Date().toISOString(),
        };

        // Upsert scenario authorization so /api/ai/match can find this user.
        const flags = { business: false, dating: false, partner: false } as Record<string, boolean>;
        flags[scenario] = true;
        const { data: existingAuth } = await supabase
          .from("user_authorizations")
          .select("id, business, dating, partner")
          .eq("user_id", userId)
          .maybeSingle();
        if (existingAuth) {
          await supabase
            .from("user_authorizations")
            .update({
              business: existingAuth.business || flags.business,
              dating: existingAuth.dating || flags.dating,
              partner: existingAuth.partner || flags.partner,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingAuth.id);
        } else {
          await supabase.from("user_authorizations").insert({ user_id: userId, ...flags });
        }

        const { data, error } = await supabase
          .from("user_profiles")
          .insert({ user_id: userId, profile_data: profile_data as never })
          .select("*")
          .single();

        if (error) return json({ error: error.message }, { status: 500 });
        return json({ data, message: "AI profile generated", ai_provider: profile_data.ai_provider });
      },
    },
  },
});