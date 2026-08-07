/**
 * POST /api/ai/interview-questions
 * Body: { input: string, scenario?: "business" | "dating" | "partner", lang?: "en" | "zh" | "yue" }
 *
 * Dynamic follow-up question generator. After the user writes their initial
 * self-description, we ask 2-3 *personalized* questions that drill into the
 * gaps / tensions / hidden patterns. The answers are then fed back into
 * /api/ai/generate-profile via the `follow_up_answers` field.
 *
 * This is the key upgrade that moves linQ from "one-pass summarization" to
 * a real AI interview: the model decides what it still doesn't know about
 * this specific person, instead of asking generic onboarding questions.
 */

import { createFileRoute } from "@tanstack/react-router";
import { json, preflight, requireUser, safeError } from "@/lib/api/_helpers.server";
import { llmChatEx, safeParseJSON } from "@/lib/api/_llm.server";
import { moderateText } from "@/lib/api/_moderation.server";

const VALID_SCENARIOS = new Set(["business", "dating", "partner"]);

export const Route = createFileRoute("/api/ai/interview-questions")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;

        let body: { input?: unknown; scenario?: unknown; lang?: unknown } = {};
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid JSON body" }, { status: 400 }, request);
        }

        const input = typeof body.input === "string" ? body.input.trim() : "";
        if (input.length < 4 || input.length > 4000) {
          return json({ error: "input must be 4-4000 chars" }, { status: 400 }, request);
        }
        const scenario =
          typeof body.scenario === "string" && VALID_SCENARIOS.has(body.scenario)
            ? (body.scenario as "business" | "dating" | "partner")
            : "dating";
        const lang: "en" | "zh" | "yue" =
          body.lang === "en" ? "en" : body.lang === "yue" ? "yue" : "zh";
        const llmLang: "en" | "zh" = lang === "en" ? "en" : "zh";

        const moderation = await moderateText(input, llmLang, "interview-questions");
        if (!moderation.safe) {
          return json(
            { error: "Input violates content policy", moderation },
            { status: 400 },
            request,
          );
        }

        const sys =
          lang === "yue"
            ? `你係 linQ 嘅 AI 訪談設計師。用戶啱啱寫咗一段自我描述，你嘅任務係設計 2-3 條最應該追問嘅問題。

設計原則：
1. 唔好問已經明確講過嘅嘢（例如用戶已經講咗做咩工，就唔好再問職業）
2. 要戳中描述入面嘅空白、矛盾或者潛台詞
3. 每條問題都要具體到呢個人，唔可以係通用問題
4. 問題應該令用戶講一個具體場景或者感受，而唔係一個抽象答案
5. 問題要短，一句話，口語化，似一個細心朋友喺度問

【輸出語言】全部用香港粵語口語、繁體字輸出。嚴格輸出 JSON。`
            : lang === "zh"
              ? `你是 linQ 的 AI 访谈设计师。用户刚写了一段自我描述，你的任务是设计 2-3 个最应该追问的问题。

设计原则：
1. 不要问已经明确说过的事（例如用户已经说了做什么工作，就不要再问职业）
2. 要戳中描述里的空白、矛盾或潜台词
3. 每个问题都要具体到这个人，不能是通用问题
4. 问题应该让用户讲一个具体场景或感受，而不是一个抽象答案
5. 问题要短，一句话，口语化，像一个细心朋友在问

【输出语言】全部使用简体中文、普通话表达，禁止使用繁体字或粤语用词。严格输出 JSON。`
              : `You are linQ's AI interview designer. The user just wrote a self-description. Design 2-3 follow-up questions that dig into the gaps, tensions, or subtext.

Principles:
1. Don't ask what is already explicitly stated.
2. Target blanks, contradictions, or implied patterns in the description.
3. Each question must be specific to THIS person, not generic.
4. Questions should elicit a concrete scene or feeling, not an abstract answer.
5. Keep each question to one sentence, conversational, like a perceptive friend asking.

Strict JSON output.`;

        const userPrompt =
          lang === "yue"
            ? `場景：${scenario}\n用戶描述："""${input}"""\n\n請輸出 JSON：\n{\n  "questions": [\n    { "id": "q1", "question": "第一條追問", "why_ask": "點解呢條問題對呢個人重要" },\n    { "id": "q2", "question": "第二條追問", "why_ask": "..." },\n    { "id": "q3", "question": "第三條追問（可選，如果已經夠清楚可以淨係兩條）", "why_ask": "..." }\n  ]\n}`
            : lang === "zh"
              ? `场景：${scenario}\n用户描述："""${input}"""\n\n请输出 JSON：\n{\n  "questions": [\n    { "id": "q1", "question": "第一条追问", "why_ask": "为什么这个问题对这个人重要" },\n    { "id": "q2", "question": "第二条追问", "why_ask": "..." },\n    { "id": "q3", "question": "第三条追问（可选，如果已经够清楚可以只有两条）", "why_ask": "..." }\n  ]\n}`
              : `Scenario: ${scenario}\nUser description: """${input}"""\n\nOutput JSON:\n{\n  "questions": [\n    { "id": "q1", "question": "first follow-up", "why_ask": "why this matters for this person" },\n    { "id": "q2", "question": "second follow-up", "why_ask": "..." },\n    { "id": "q3", "question": "optional third follow-up", "why_ask": "..." }\n  ]\n}`;

        const res = await llmChatEx(
          [
            { role: "system", content: sys },
            { role: "user", content: userPrompt },
          ],
          {
            json: true,
            temperature: 0.85,
            max_tokens: 1200,
            label: "interview-questions",
            timeoutMs: 25_000, // long-form LLM call — default 8s per-attempt aborts it
            deadlineMs: 30_000,
          },
        );

        const parsed =
          safeParseJSON<{
            questions?: Array<{ id?: string; question?: string; why_ask?: string }>;
          }>(res?.content ?? null) ?? {};
        const questions = (parsed.questions ?? [])
          .filter((q) => typeof q.question === "string" && q.question.trim().length > 0)
          .slice(0, 3)
          .map((q) => ({
            id: q.id ?? `q_${Math.random().toString(36).slice(2, 8)}`,
            question: q.question!.trim(),
            why_ask: q.why_ask ?? "",
          }));

        return json(
          { data: questions, ai_provider: res?.provider ?? "fallback" },
          undefined,
          request,
        );
      },
    },
  },
});
