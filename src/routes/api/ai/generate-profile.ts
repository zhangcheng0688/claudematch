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
            ? "你是 linQ 的 AI 画像引擎。任务：基于用户的自我描述做「推断」和「洞察」，而不是「复述」和「归并」。严格只输出 JSON，不要 markdown 代码块。"
            : "You are linQ's AI profile engine. Your job is to INFER and REVEAL — never to restate or paraphrase the user's words. Output JSON ONLY, no markdown.";

        const userPrompt = `Scenario: ${scenario}
User description: """${input}"""

CRITICAL RULES — read before writing JSON:
1. NEVER quote the user verbatim in summary, narrative, or insights. Synthesize; do not parrot.
2. patterns[] is the centerpiece. Find 3-5 things the user did NOT explicitly say but a sharp observer would notice. Each pattern must be non-obvious — if it could be guessed from one keyword, it's not good enough.
3. evidence is a SHORT (≤ 30 chars) verbatim quote from the user description, used as a hint, not the whole point.
4. narrative reads like a literary character sketch, not a bullet list. 3-5 short paragraphs.
5. dimensions[].why must say something specific to THIS user — no generic "high openness means creative" filler.
6. Output in ${lang === "zh" ? "Chinese (zh-CN)" : "English"}.

Return JSON with this exact shape:
{
  "headline": string (10-20 chars, a poetic label, e.g. "热情内敛的探险家" or "The Quiet Contrarian"),
  "narrative": string (3-5 short paragraphs, 60-120 chars each, no line breaks inside the JSON string),
  "patterns": [
    { "insight": string (the non-obvious inference, 1 sentence), "evidence": string (≤ 30 chars, verbatim from user) }
  ] (3-5 items),
  "dimensions": [
    { "key": "openness" | "conscientiousness" | "extraversion" | "agreeableness" | "curiosity", "score": number (0-1), "why": string (1 sentence, specific to this user) }
  ] (exactly 5 items, all keys present),
  "interests": string[] (3-6 items, short tags),
  "communication_style": string (1 short phrase),
  "looking_for": string (1 sentence),
  "ideal_match": string (1 sentence)
}`;

        const raw = await deepseekChat(
          [
            { role: "system", content: sys },
            { role: "user", content: userPrompt },
          ],
          { json: true, temperature: 0.85 },
        );

        const parsed = safeParseJSON<Record<string, unknown>>(raw);
        // Fallback for when DeepSeek is down / returns junk. Still uses v2 schema
        // so the UI never has to handle two different shapes.
        const fallback = {
          headline: lang === "zh" ? "独一无二的你" : "One of a kind",
          narrative: lang === "zh"
            ? "你正在寻找属于自己的连接。这段描述是一个起点——告诉 AI 你关心什么、你在意什么，AI 会把这些信号打包成一份让对方一眼看懂你的画像。\n\n每一次重新描述，都会被 AI 重新理解。linQ 不会把任何标签贴在你身上。"
            : "You're looking for a connection that's actually yours. This description is a starting point — tell AI what you care about, and it'll package the honest signals into a profile the other side can actually read.\n\nEvery time you re-describe, AI re-understands. linQ never slaps a label on you.",
          patterns: [
            {
              insight: lang === "zh"
                ? "你愿意花时间描述自己——这本身说明你在认真对待这次匹配。"
                : "You took the time to describe yourself — that alone signals you're taking this match seriously.",
              evidence: input.slice(0, 24),
            },
          ],
          dimensions: [
            { key: "openness", score: 0.7, why: lang === "zh" ? "愿意尝试新描述" : "willing to try new descriptions" },
            { key: "conscientiousness", score: 0.6, why: lang === "zh" ? "主动填写了这段文字" : "took the initiative to write" },
            { key: "extraversion", score: 0.5, why: lang === "zh" ? "内向外向待观察" : "ambivalent from text alone" },
            { key: "agreeableness", score: 0.7, why: lang === "zh" ? "描述中没有攻击性" : "no hostility in the description" },
            { key: "curiosity", score: 0.7, why: lang === "zh" ? "正在探索新的连接方式" : "exploring a new way to connect" },
          ],
          interests: [],
          communication_style: lang === "zh" ? "诚恳、探索" : "earnest, exploratory",
          looking_for: input.slice(0, 120),
          ideal_match: lang === "zh" ? "真诚、好奇、愿意被看见的人" : "someone genuine, curious, willing to be seen",
        };
        const profile_data = {
          version: "v2",
          scenario,
          lang,
          input,
          ai: parsed ?? fallback,
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