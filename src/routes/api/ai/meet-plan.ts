import { createFileRoute } from "@tanstack/react-router";
import { json, preflight, requireUser } from "@/lib/api/_helpers.server";
import { deepseekChat, safeParseJSON } from "@/lib/api/_deepseek.server";

/**
 * POST /api/ai/meet-plan
 * Body: { match_id: string, lang?: "en" | "zh" }
 * Uses DeepSeek to draft a thoughtful first meet-up plan grounded in the
 * match's `details` (name, bio, shared interests, scenario).
 */

export const Route = createFileRoute("/api/ai/meet-plan")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const { userId, supabase } = auth;

        let body: { match_id?: unknown; lang?: unknown } = {};
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid JSON body" }, { status: 400 });
        }
        const match_id = body.match_id;
        const lang = body.lang === "zh" ? "zh" : "en";
        if (typeof match_id !== "string" || match_id.length < 8) {
          return json({ error: "match_id is required" }, { status: 400 });
        }

        const { data: match, error: mErr } = await supabase
          .from("matches")
          .select("id, user_id, matched_user_id, scenario, details, match_score")
          .eq("id", match_id)
          .maybeSingle();

        if (mErr) return json({ error: mErr.message }, { status: 500 });
        if (!match || match.user_id !== userId) {
          return json({ error: "Match not found" }, { status: 404 });
        }

        const sys =
          lang === "zh"
            ? "你是 linQ 的 AI 见面策划师。根据匹配信息，生成一份贴心、具体、可执行的首次见面方案。严格输出 JSON，不要 markdown。"
            : "You are linQ's AI meet-up planner. Draft a thoughtful, specific, actionable first meeting plan based on the match. Output JSON only, no markdown.";

        const prompt = `Scenario: ${match.scenario}\nMatch details: ${JSON.stringify(match.details)}\n\nReturn JSON of shape:\n{\n  "when": string (a suggested day & time within the next 7 days${lang === "zh" ? "，中文" : ""}),\n  "where": string (a real-sounding venue type and neighborhood${lang === "zh" ? "，中文" : ""}),\n  "activity": string (the actual thing you'll do${lang === "zh" ? "，中文" : ""}),\n  "duration": string (e.g. "60-90 min"),\n  "icebreakers": string[] (3 open-ended questions${lang === "zh" ? "，中文" : ""}),\n  "vibe_tip": string (1 sentence on how to show up${lang === "zh" ? "，中文" : ""}),\n  "first_message": string (a short opener you could send right now${lang === "zh" ? "，中文" : ""})\n}`;

        const raw = await deepseekChat(
          [
            { role: "system", content: sys },
            { role: "user", content: prompt },
          ],
          { json: true, temperature: 0.85 },
        );

        const parsed = safeParseJSON<Record<string, unknown>>(raw);
        const next = new Date();
        next.setUTCDate(next.getUTCDate() + 3);
        next.setUTCHours(19, 0, 0, 0);

        const plan_content = {
          version: "v1",
          scenario: match.scenario,
          ai: parsed ?? {
            when: next.toISOString(),
            where: "A quiet specialty coffee bar downtown",
            activity: "Coffee and a short walk",
            duration: "60-90 min",
            icebreakers: [
              "What's something you got unreasonably into this year?",
              "If you could teach a 1-hour class on anything, what would it be?",
              "What's the best thing you've made or built recently?",
            ],
            vibe_tip: "Show up curious, leave space for silence.",
            first_message: "Hey — linQ matched us. Want to grab coffee this week?",
          },
          ai_provider: parsed ? "deepseek" : "fallback",
          generated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from("meet_plans")
          .insert({ match_id, plan_content: plan_content as never })
          .select("*")
          .single();

        if (error) return json({ error: error.message }, { status: 500 });
        return json({ data, message: "Meet-up plan generated" });
      },
    },
  },
});