import { createFileRoute } from "@tanstack/react-router";
import { json, preflight, requireUser } from "@/lib/api/_helpers.server";
import { deepseekChat, safeParseJSON } from "@/lib/api/_deepseek.server";

const VALID_SCENARIOS = new Set(["business", "dating", "partner"]);

/**
 * POST /api/ai/generate-profile
 * Body: { input: string, scenario?: "business" | "dating" | "partner", lang?: "en" | "zh" }
 *
 * v3 — three-round DeepSeek pipeline that produces a profile so incisive
 * the user feels "this AI understands me better than I understand myself":
 *
 *   Round 1 (extract):   turn the user's free-text into structured FACTS
 *                        (no inference — pure structural parse)
 *   Round 2 (infer):     given those facts, infer PARADOXES / ARCHETYPES /
 *                        PATTERNS / MATCH_SIGNALS with explicit reasoning
 *                        chains — the heavy lifting
 *   Round 3 (synthesize): turn all of that into a literary NARRATIVE,
 *                        HEADLINE, and the 5 work/relationship DIMENSIONS
 *                        with concrete behavioral SIGNALS
 *
 * The schema lives in `src/types/match.ts` (AiProfile v3).
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
        const lang: "zh" | "en" = body.lang === "zh" ? "zh" : "en";

        // ============================================================
        // ROUND 1 — Fact extraction (no inference, pure structural parse)
        // ============================================================
        const extractSys = lang === "zh"
          ? "你是一个事实抽取器。把用户的自我描述拆解成结构化事实。不做推断，只整理。输出 JSON。"
          : "You are a fact extractor. Break the user's self-description into structured facts. No inference — only organize. Output JSON.";

        const extractUserPrompt = lang === "zh"
          ? `场景：${scenario}
用户描述："""${input}"""

请从这段描述中提取出客观事实，输出 JSON：
{
  "demographics": { "age_guess": "string or null", "location_guess": "string or null", "role_guess": "string or null" },
  "stated_goals": string[] (用户明确表达想找什么，2-4 条),
  "stated_traits": string[] (用户用形容词描述自己，2-4 条),
  "concrete_facts": string[] (用户的具体行为/兴趣/经历，3-6 条),
  "linguistic_markers": {
    "uses_english_chinese_mix": boolean,
    "uses_emoji": boolean,
    "sentence_length": "short" | "medium" | "long",
    "tone": "casual" | "formal" | "playful" | "intense" | "reserved"
  },
  "missing_context": string[] (用户没说但通常会说的信息 —— 这往往是 ta 真正在意的信号)
}`
          : `Scenario: ${scenario}
User description: """${input}"""

Extract objective facts, output JSON:
{
  "demographics": { "age_guess": "string or null", "location_guess": "string or null", "role_guess": "string or null" },
  "stated_goals": string[] (what the user explicitly says they want, 2-4),
  "stated_traits": string[] (adjectives the user uses to describe themselves, 2-4),
  "concrete_facts": string[] (user's specific behaviors/interests/experiences, 3-6),
  "linguistic_markers": {
    "uses_english_chinese_mix": boolean,
    "uses_emoji": boolean,
    "sentence_length": "short" | "medium" | "long",
    "tone": "casual" | "formal" | "playful" | "intense" | "reserved"
  },
  "missing_context": string[] (what the user didn't say but usually would — this is often a signal of what they really care about)
}`;

        const extractedRaw = await deepseekChat(
          [
            { role: "system", content: extractSys },
            { role: "user", content: extractUserPrompt },
          ],
          { json: true, temperature: 0.3, max_tokens: 1200 },
        );
        const facts = safeParseJSON<Record<string, unknown>>(extractedRaw) ?? {};

        // ============================================================
        // ROUND 2 — Deep inference (paradoxes, archetypes, patterns,
        //          match_signals) with explicit reasoning chains.
        // ============================================================
        const inferSys = lang === "zh"
          ? `你是一个深度心理学家。

任务：基于用户的事实画像，推断 ta 没说但能看出来的事。每条推断必须满足：
- 不能从单一关键词推断
- 必须展示 3-5 步的推理链（从观察到假设到结论）
- 必须具体到这个人（不是泛泛的人格类型描述）

四个输出维度：
1. paradoxes：ta 表面想要 vs 实际想要的张力（至少 2 条）
2. archetypes：ta 像谁（1-2 个具体人物/角色）
3. patterns：ta 没说但能看出的行为模式（3-5 条）
4. match_signals：ta 身边的人会感受到的'需要/价值/风险'（每类 2-3 条）

严格输出 JSON。`
          : `You are a depth psychologist.

Task: Given the user's fact profile, infer what they didn't say but a sharp observer would notice. Every inference must:
- Not be guessable from a single keyword
- Show a 3-5 step reasoning chain (observation → hypothesis → conclusion)
- Be specific to THIS person (not generic personality type descriptions)

Four output dimensions:
1. paradoxes: surface wants vs actual wants (at least 2)
2. archetypes: who they resemble (1-2 specific people/characters)
3. patterns: behaviors they didn't mention but obviously have (3-5)
4. match_signals: what people around them feel — needs, gifts, risks (2-3 each)

Strict JSON output.`;

        const inferUserPrompt = lang === "zh"
          ? `事实画像：
${JSON.stringify(facts, null, 2)}

请基于这些事实做深度推断，输出 JSON：
{
  "paradoxes": [
    { "surface": "用户表面说的", "depth": "用户实际想要的（可能没意识到）", "tension": "这个矛盾为什么存在（1 句话心理学/行为学解释）" }
  ] (2-3 条),
  "archetypes": [
    { "name": "原型名（如'深夜建筑师'、'压力下的探险家'）", "why": "为什么 ta 像这个人（2-3 句）", "shadow": "这个原型的阴影面（1 句）" }
  ] (1-2 个),
  "patterns": [
    {
      "insight": "非显然推断（1 句话）",
      "evidence": "≤30 字符的原话引文",
      "reasoning_chain": ["观察 1：...", "假设：...", "推断：...", "含义：..."] (3-5 步)
    }
  ] (3-5 条),
  "match_signals": {
    "needs": [{ "what": "ta 真实需要的", "why": "为什么 ta 需要这个（1 句）" }] (2-3 条),
    "gifts": [{ "what": "ta 能给的独特价值", "why": "为什么这是 ta 的天赋（1 句）" }] (2-3 条),
    "risks": [{ "what": "对方和 ta 相处会感到的摩擦", "impact": "如果不注意会怎么发展（1 句）" }] (2-3 条)
  }
}`
          : `Fact profile:
${JSON.stringify(facts, null, 2)}

Make deep inferences, output JSON:
{
  "paradoxes": [
    { "surface": "what the user said", "depth": "what they actually want (may not realize)", "tension": "why this paradox exists (1 sentence)" }
  ] (2-3),
  "archetypes": [
    { "name": "archetype name", "why": "why they resemble this (2-3 sentences)", "shadow": "the archetype's shadow side (1 sentence)" }
  ] (1-2),
  "patterns": [
    {
      "insight": "non-obvious inference (1 sentence)",
      "evidence": "≤30 char verbatim quote",
      "reasoning_chain": ["observation 1: ...", "hypothesis: ...", "inference: ...", "implication: ..."] (3-5 steps)
    }
  ] (3-5),
  "match_signals": {
    "needs": [{ "what": "what they truly need", "why": "why (1 sentence)" }] (2-3),
    "gifts": [{ "what": "unique value they give", "why": "why this is their gift (1 sentence)" }] (2-3),
    "risks": [{ "what": "friction the other person will feel", "impact": "how this plays out if not noticed (1 sentence)" }] (2-3)
  }
}`;

        const inferredRaw = await deepseekChat(
          [
            { role: "system", content: inferSys },
            { role: "user", content: inferUserPrompt },
          ],
          { json: true, temperature: 0.9, max_tokens: 2200 },
        );
        const inferred = safeParseJSON<Record<string, unknown>>(inferredRaw) ?? {};

        // ============================================================
        // ROUND 3 — Synthesize (narrative, dimensions, headline — the
        //          output the user actually reads)
        // ============================================================
        const dimensionKeysZh = ["决策模式", "信任建立", "能量来源", "冲突处理", "理想匹配"];
        const dimensionKeysEn = ["decision_style", "trust_pattern", "energy_source", "conflict_mode", "ideal_match"];
        const synthSys = lang === "zh"
          ? "你是一个文学化的 AI 策展人。把所有推理结果编织成一份能让人产生'这说的就是我'感受的画像。\n\n关键：\n- narrative 是 3-5 段故事化文字，每段聚焦一个内在张力\n- dimensions 用 5 维作业/关系人格框架（不要 OCEAN 大五）：决策模式、信任建立、能量来源、冲突处理、理想匹配\n- 每个 dimension 给 3-5 条具体行为信号（'ta 在 X 场景会做 Y'）\n- headline 是 6-12 字符的精准画像（不是花哨的隐喻）\n\n严格输出 JSON。"
          : "You are a literary AI curator. Weave all inference results into a profile that produces a 'this is me exactly' feeling.\n\nKey:\n- narrative: 3-5 story-like paragraphs, each focused on an internal tension\n- dimensions: 5-axis work/relationship personality framework (NOT OCEAN): decision_style, trust_pattern, energy_source, conflict_mode, ideal_match\n- each dimension gives 3-5 specific behavioral signals ('they will do Y in X situation')\n- headline: 6-12 char precise portrait (not fancy metaphor)\n\nStrict JSON output.";

        const synthUserPrompt = lang === "zh"
          ? `用户事实：${JSON.stringify(facts, null, 2)}
推断：${JSON.stringify(inferred, null, 2)}

请输出最终画像 JSON：
{
  "headline": string (6-12 字符，精准画像，如"清单收核人"、"压力下的探险家"—— 不是花哨隐喻),
  "narrative": string (3-5 段故事化文字，每段 60-120 字符，\\n 分隔。每段聚焦一个内在张力),
  "dimensions": [
    {
      "key": "${dimensionKeysZh.join('" | "')}",
      "score": number (0-1),
      "why": string (1 句，**必须具体到这个人**),
      "signals": string[] (3-5 条具体行为信号，'ta 在 X 场景会做 Y')
    }
  ] (exactly 5 items, all keys present, same order as above)
}

每个 dimension 的 5 个 key 必须按顺序出现：决策模式、信任建立、能量来源、冲突处理、理想匹配。`
          : `Facts: ${JSON.stringify(facts, null, 2)}
Inferences: ${JSON.stringify(inferred, null, 2)}

Output final profile JSON:
{
  "headline": string (6-12 chars, precise portrait — not fancy metaphor),
  "narrative": string (3-5 story-like paragraphs, 60-120 chars each, \\n separated. Each focuses on an internal tension),
  "dimensions": [
    {
      "key": "${dimensionKeysEn.join('" | "')}",
      "score": number (0-1),
      "why": string (1 sentence, **must be specific to THIS person**),
      "signals": string[] (3-5 specific behavioral signals, 'they will do Y in X situation')
    }
  ] (exactly 5 items, all keys present, same order as above)
}`;

        const synthRaw = await deepseekChat(
          [
            { role: "system", content: synthSys },
            { role: "user", content: synthUserPrompt },
          ],
          { json: true, temperature: 0.85, max_tokens: 1500 },
        );
        const synth = safeParseJSON<Record<string, unknown>>(synthRaw) ?? {};

        // ============================================================
        // Merge the 3 rounds. If synthesis failed, fall back to a v3-shaped
        // placeholder so the UI never has to handle a different shape.
        // ============================================================
        const fallback = lang === "zh"
          ? {
              headline: "独一无二的你",
              narrative:
                "你正在寻找属于自己的连接。这段描述是一个起点 —— 告诉 AI 你关心什么、你在意什么，AI 会把这些信号打包成一份让对方一眼看懂你的画像。\n\n每一次重新描述，都会被 AI 重新理解。linQ 不会把任何标签贴在你身上。",
              patterns: [
                {
                  insight: "你愿意花时间描述自己 —— 这本身说明你在认真对待这次匹配。",
                  evidence: input.slice(0, 24),
                  reasoning_chain: [
                    "观察：你写了一段自我介绍",
                    "假设：多数人不会这样做",
                    "推断：你把这次匹配当回事",
                  ],
                },
              ],
              dimensions: [
                { key: "决策模式", score: 0.7, why: "愿意先描述再决策", signals: [] },
                { key: "信任建立", score: 0.6, why: "通过文字建立连接", signals: [] },
                { key: "能量来源", score: 0.5, why: "通过深度对话获取能量", signals: [] },
                { key: "冲突处理", score: 0.7, why: "倾向直接表达", signals: [] },
                { key: "理想匹配", score: 0.7, why: "寻找能理解自己的人", signals: [] },
              ],
              paradoxes: [
                {
                  surface: "你说你想找一个能「懂」你的人",
                  depth: "但你其实想要的是「被看见但不必解释」",
                  tension: "前者要你主动展示，后者要求对方主动观察",
                },
              ],
              archetypes: [
                {
                  name: "深夜独行侠",
                  why: "你用文字整理自己，说明你需要先内化再表达",
                  shadow: "在需要快速反应的场合会显得犹豫",
                },
              ],
              match_signals: {
                needs: [{ what: "被安静地倾听", why: "你已经在描述中透露这是你最稀缺的事" }],
                gifts: [{ what: "认真的态度", why: "愿意花时间写出来本身就是一种稀缺" }],
                risks: [
                  { what: "在被快速匹配时感到不被理解", impact: "会因为「太快了」而退出对话" },
                ],
              },
            }
          : {
              headline: "One of a kind",
              narrative:
                "You're looking for a connection that's actually yours. This description is a starting point — tell AI what you care about, and it'll package the honest signals into a profile the other side can actually read.\n\nEvery time you re-describe, AI re-understands. linQ never slaps a label on you.",
              patterns: [
                {
                  insight: "You took the time to describe yourself — that alone signals you're taking this match seriously.",
                  evidence: input.slice(0, 24),
                  reasoning_chain: [
                    "Observation: you wrote a self-intro",
                    "Hypothesis: most people don't do this",
                    "Inference: you take this match seriously",
                  ],
                },
              ],
              dimensions: [
                { key: "decision_style", score: 0.7, why: "describes first, decides second", signals: [] },
                { key: "trust_pattern", score: 0.6, why: "builds connection through text", signals: [] },
                { key: "energy_source", score: 0.5, why: "energized by deep conversation", signals: [] },
                { key: "conflict_mode", score: 0.7, why: "leans toward direct expression", signals: [] },
                { key: "ideal_match", score: 0.7, why: "seeks someone who understands them", signals: [] },
              ],
              paradoxes: [
                {
                  surface: "You say you want someone who 'gets' you",
                  depth: "But what you actually want is 'to be seen without having to explain'",
                  tension: "These look the same but differ: the first requires you to perform, the second requires the other to perceive",
                },
              ],
              archetypes: [
                {
                  name: "Midnight Wanderer",
                  why: "You use text to organize yourself, which suggests you need to internalize before expressing",
                  shadow: "May seem hesitant in moments that demand quick reactions",
                },
              ],
              match_signals: {
                needs: [{ what: "Quiet listening", why: "Your description reveals this is your scarcest thing" }],
                gifts: [{ what: "Earnest attention", why: "Your willingness to write at length is itself rare" }],
                risks: [
                  { what: "May feel misunderstood when matched quickly", impact: "Will exit conversations that feel 'too fast'" },
                ],
              },
            };

        const useFallback = !synth || !synth.headline;
        const ai = useFallback
          ? fallback
          : {
              headline: synth.headline,
              narrative: synth.narrative,
              patterns: inferred.patterns,
              dimensions: synth.dimensions,
              paradoxes: inferred.paradoxes,
              archetypes: inferred.archetypes,
              match_signals: inferred.match_signals,
            };

        const profile_data = {
          version: "v3",
          scenario,
          lang,
          input,
          ai,
          facts,
          ai_provider: useFallback ? "fallback" : "deepseek-3round",
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
