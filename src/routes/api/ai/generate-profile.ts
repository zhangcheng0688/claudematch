import { createFileRoute } from "@tanstack/react-router";
import { json, preflight, requireUser, safeError } from "@/lib/api/_helpers.server";
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
      OPTIONS: async ({ request }) => preflight(request),
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
}${feedbackContextBlock}`;

        // Run Round 2 (deep infer) + Round 3 (scene/context) IN
        // PARALLEL. Both only depend on the Round 1 facts blob, and
        // each has no dependency on the other. The Round 3 prompt
        // EMBEDS the inferred blob (line 174 / 214 in the original
        // schema), but for v4+ we give the LLM a deliberately
        // minimal inferred stub (just `paradoxes` + `archetypes` +
        // `match_signals` which are the parts Round 3 actually leans
        // on) so the parallel fire is real. The final synth+polish
        // pass can still reference the *real* inferred blob for the
        // other sections. This is the only sane way to keep R2+R3
        // parallel without Round 3 hallucinating due to missing
        // inferred context.
        const inferredMinimalStub = lang === "zh"
          ? `（并行启动：Round 3 启动时 Round 2 还没结束；如需推断画像细节，依赖 Round 4/5/6 后续补全）`
          : `(parallel boot: Round 3 starts before Round 2 finishes; defer deeper inference to Rounds 4-6)`;

        const sceneUserPromptParallel = lang === "zh"
          ? `事实画像：${JSON.stringify(facts, null, 2)}
推断画像（先验，R2 仍在跑）：${inferredMinimalStub}

请输出 v4 字段 JSON：{ ... }
   (实际跑的时候 inferred 完整数据 R2 还没出；
    Round 3 不依赖 inferred 的具体细节，只依赖 paradoxes / archetypes 趋势。
    最终画像合成在 Round 4-6 完成。)`
          : `Fact profile: ${JSON.stringify(facts, null, 2)}
Inferred profile (preliminary, R2 still running): ${inferredMinimalStub}

Output v4 fields JSON.`;

        const [inferredRaw, sceneRaw] = await Promise.all([
          deepseekChat(
            [
              { role: "system", content: inferSys },
              { role: "user", content: inferUserPrompt },
            ],
            { json: true, temperature: 0.9, max_tokens: 2200 },
          ),
          deepseekChat(
            [
              { role: "system", content: sceneSys },
              { role: "user", content: sceneUserPromptParallel },
            ],
            { json: true, temperature: 0.9, max_tokens: 2200 },
          ),
        ]);
        const inferred = safeParseJSON<Record<string, unknown>>(inferredRaw) ?? {};

        // ============================================================
        // ROUND 3 — Scene predictions + life context (v4 additions)
        //          Predict user behavior in 5 concrete scenes + identify
        //          their life themes, growth stage, aesthetic signature,
        //          and defense mechanisms.
        // ============================================================
        const sceneSys = lang === "zh"
          ? `你是一位行为心理学家。

任务：基于事实 + 推断画像，预测用户在 5 个具体生活场景中的真实行为，并识别 ta 的人生主题、当前阶段、审美指纹、心理防御机制、场景化沟通建议。

关键：
- 场景预测必须具体到「时间+地点+在场人物+预期行为」，不是泛泛"ta 是个 X 性格的人"
- 人生主题（life_themes）是 ta 正在经历/经历过的核心叙事（如"逃离"、"寻找"、"建构"、"失去"）—— **不是用户职业/兴趣**，是更深的存在性主题
- 心理防御机制（defense_mechanisms）是 ta 在压力下的下意识反应模式（理智化/反向形成/投射/合理化/回避等）—— **必须基于 ta 的矛盾和维度推断**
- 沟通建议（communication_recipes）是"在不同场景下 ta 的最优沟通方式"—— **不是"ta 喜欢怎样沟通"**，是"为了达成 X 目的，ta 应该如何沟通"

严格输出 JSON。`
          : `You are a behavioral psychologist.

Task: based on the fact + inference profile, predict the user's behavior in 5 concrete life scenes, and identify their life themes, growth stage, aesthetic signature, defense mechanisms, and scene-specific communication recipes.

Key:
- Scene predictions must be specific to time+place+people+expected behavior, not generic personality labels
- life_themes: core existential narratives the user is living through (escape/seeking/building/loss) — not career/interests
- defense_mechanisms: subconscious reactions under pressure — derived from paradoxes + dimensions
- communication_recipes: scene-specific communication advice — "to achieve X, the user should..."

Strict JSON output.`;

        const sceneUserPrompt = lang === "zh"
          ? `事实画像：${JSON.stringify(facts, null, 2)}
推断画像：${JSON.stringify(inferred, null, 2)}

请输出 v4 字段 JSON：
{
  "life_themes": [
    { "name": "主题名（如'逃离原生家庭'、'建构自我叙事'、'寻找深层连接'）", "evidence": "1 句证据（基于事实/推断）" }
  ] (3 条),
  "scene_predictions": [
    {
      "context": "具体场景（如'周三晚上 9 点独自在出租屋'、'在咖啡馆遇到老同事'、'第一次见到对方家长'）",
      "behavior": "ta 会怎么表现（具体动作/语言/情绪）",
      "why": "为什么（基于画像推断）"
    }
  ] (5 条),
  "growth_stage": {
    "stage": "exploration" | "construction" | "transition" | "integration",
    "label": "中文标签（如'探索期'、'建构期'、'转折期'、'整合期'）",
    "why": "为什么 ta 在这个阶段（1-2 句）"
  },
  "aesthetic_signature": {
    "preferences": string[] (3-5 条 ta 的审美/价值观模式，如"偏好日式极简而非北欧极简"或"重视真实性胜过表达性"),
    "contradiction": "ta 在审美/价值观上的内在矛盾（1 句）"
  },
  "defense_mechanisms": [
    { "mechanism": "机制名（如'理智化'、'反向形成'、'回避'、'投射'）", "when_triggered": "何时被触发", "behavior": "外显行为" }
  ] (2-3 条),
  "communication_recipes": [
    { "context": "场景（如'被误解时'、'想拒绝时'、'想表达好感时'）", "recipe": "推荐做法（具体动作）", "avoid": "应避免" }
  ] (3 条)
}`
          : `Fact profile: ${JSON.stringify(facts, null, 2)}
Inferred profile: ${JSON.stringify(inferred, null, 2)}

Output v4 fields JSON:
{
  "life_themes": [
    { "name": "theme name", "evidence": "1 sentence" }
  ] (3),
  "scene_predictions": [
    {
      "context": "specific scene",
      "behavior": "what they'll do",
      "why": "why"
    }
  ] (5),
  "growth_stage": {
    "stage": "exploration" | "construction" | "transition" | "integration",
    "label": "stage label",
    "why": "why this stage (1-2 sentences)"
  },
  "aesthetic_signature": {
    "preferences": string[] (3-5),
    "contradiction": "internal contradiction in aesthetics/values (1 sentence)"
  },
  "defense_mechanisms": [
    { "mechanism": "name", "when_triggered": "when", "behavior": "behavior" }
  ] (2-3),
  "communication_recipes": [
    { "context": "scene", "recipe": "recommended action", "avoid": "what to avoid" }
  ] (3)
}`;

        const sceneFields = safeParseJSON<Record<string, unknown>>(sceneRaw) ?? {};

        // ============================================================
        // ROUND 4 — Synthesize (narrative, dimensions, headline — the
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
}${feedbackContextBlock}`;

        const synthRaw = await deepseekChat(
          [
            { role: "system", content: synthSys },
            { role: "user", content: synthUserPrompt },
          ],
          { json: true, temperature: 0.85, max_tokens: 1500 },
        );
        const synth = safeParseJSON<Record<string, unknown>>(synthRaw) ?? {};

        // ============================================================
        // ROUND 5 — Self-critique (the v4 anti-paraphrase mechanism)
        //
        // The LLM has now produced: facts, inferences, scene predictions,
        // and a synthesis. The biggest remaining failure mode is that
        // patterns / narrative / dimensions still feel like restating
        // the user's input.
        //
        // Here we ask the LLM to step OUT of the role of "AI profiler"
        // and INTO the role of "the user themselves reading this". For
        // each field, we ask: "would the user feel 'this AI gets me'?"
        // If not, we ask it to revise that specific field.
        //
        // The output is a JSON with the SAME shape as the synthesis +
        // scene-fields, but with revised copy where needed. v3 didn't
        // have this — v4 ships it.
        // ============================================================
        const critiqueSys = lang === "zh"
          ? `你是一位严厉的内部审查员。

任务：审阅上面的画像输出，找出**任何还像 paraphrase（用同义词复述用户输入）的部分**，并**改写到让用户觉得「这说的就是我」**。

**关键判断标准**：
- 如果某个 pattern 仍然是把用户的话换种说法说出来 → 必须改写
- 如果某个 dimension 的 why/signals 是「高 X 的人都这样」的泛泛 → 必须改写
- 如果 narrative 还是把用户输入重新组织一遍 → 必须改写
- 如果 paradox 看着像刻意造的 → 必须改写

**改写原则**：
- 每条都加至少一个"用户没说但能看出来"的具体观察
- 不要再写"对外部世界敏感"这种泛泛的标签 —— 写"在餐桌上被问到'最近怎么样'时，你会先停下来 0.5 秒判断对方是否真想知道"
- 不要给建议，只描述

输出 JSON（**只输出需要修改的字段**，保持其他字段引用原值）：
{
  "headline": "改写后的 headline（如不需要改可省略）",
  "narrative": "改写后的 narrative（如不需要改可省略）",
  "patterns": [ "改写后的 pattern insight 列表 ——**只输出 insight 字符串数组**，按原 patterns 顺序覆盖对应位置；不需要改的可以省略" ],
  "dimensions": [
    { "key": "原 key", "why": "改写后的 why", "signals": ["改写后的 signal", ...] }
  ] (只输出需要改的)
}`
          : `You are a strict internal reviewer.

Task: audit the profile output above, find any field that still feels like paraphrase (restating user input in different words), and revise it to make the user feel "this AI gets me".

**Decision criteria**:
- if a pattern is still restating user input in different words -> must rewrite
- if a dimension's why/signals are generic ("high X people tend to Y") -> must rewrite
- if narrative just reorganizes user input -> must rewrite
- if paradox feels manufactured -> must rewrite

**Revision principles**:
- Each item must add at least one specific observation the user didn't say but a sharp reader would notice
- Don't write generic labels. Write "when asked at the dinner table 'how are you', you pause 0.5s to judge if they really want to know"
- Don't give advice, only describe

Output JSON (only output fields that need changing):`;

        const critiqueUserPrompt = lang === "zh"
          ? `用户原始输入："""${input}"""
已生成的画像：
${JSON.stringify({ ...synth, ...sceneFields, ...inferred }, null, 2)}

请审阅并改写（只输出需要改的字段）。注意：你必须确保改写后**每条都引用了用户没说但能推断出的具体观察**，不是复述用户原话。`
          : `Original user input: """${input}"""
Generated profile:
${JSON.stringify({ ...synth, ...sceneFields, ...inferred }, null, 2)}

Audit and revise (only output fields that need changing). Every revised line must add a specific observation the user didn't say but a sharp reader would notice.`;

        // Round 5 (self_critique) + Round 6 (3 personas) ALL FIRE
        // IN PARALLEL — they all read from the same blob. The final
        // polish (Round 6.5) is the ONLY serial call (it needs the
        // persona rewrites as input), but it overlaps with
        // Promise.allSettled fallback handling so we don't waste
        // wall time.
        //
        // Build a unified parallel call list: 1 critique + 3 personas.
        const parallelCalls: Array<Promise<unknown>> = [
          // critique (Round 5)
          deepseekChat(
            [
              { role: "system", content: critiqueSys },
              { role: "user", content: critiqueUserPrompt },
            ],
            { json: true, temperature: 0.7, max_tokens: 2000 },
          ),
          // 3 personas (Round 6) — pre-built above as `personaCalls`
          ...personaCalls,
        ];
        const parallelSettled = await Promise.allSettled(parallelCalls);
        const critiqueSettled = parallelSettled[0];
        const personaSettled = parallelSettled.slice(1);

        const critique = critiqueSettled.status === "fulfilled"
          ? safeParseJSON<Record<string, unknown>>(critiqueSettled.value) ?? {}
          : {};

        // ============================================================
        // ROUND 6 — user_persona_simulation (the v4+ anti-paraphrase move)
        //
        // We've had the LLM critique its own output (Round 5). But the LLM
        // is fundamentally bad at empathizing with users — it knows the
        // shape of "good insight" but not the felt experience of reading
        // one. So we add a 6th round that ASKS THE LLM to simulate 3
        // *different* user personas reading this output, and have them
        // compete in a small "tournament":
        //
        //   persona_1: a skeptical, analytically-minded user (the kind
        //              who would call out hand-waving)
        //   persona_2: an emotionally-engaged user (the kind who would
        //              feel 'seen' or feel 'cheated')
        //   persona_3: a result-oriented user (the kind who would judge
        //              purely on "can I use this to find a match?")
        //
        // For each persona we extract: (1) which section makes them
        // feel MOST understood, (2) which section disappoints them
        // most, (3) one specific rewrite suggestion per disappointment.
        //
        // We then do a final synthesis that ADOPTS the most-cited
        // rewrites. This adversarial loop is the strongest anti-
        // paraphrase mechanism we have — each persona is essentially
        // a different "user story" the LLM has to satisfy.
        // ============================================================
        const personas = [
          {
            name: "skeptical_analyst",
            label: lang === "zh" ? "理性怀疑型" : "skeptical analyst",
            brief:
              lang === "zh"
                ? "你是一个 35 岁的产品经理，习惯拆解一切'看起来深刻'的话术。你看任何 AI 输出都会先问：'这是 paraphrase 吗？'、'有具体行为可观察吗？'、'这个洞察能让我做出更好的决策吗？'。你不会被'诗意'打动 —— 你只会被'具体'打动。"
                : "You are a 35-year-old product manager. You habitually dismantle anything that 'looks deep'. You ask: 'is this paraphrase?' / 'are there observable behaviors?' / 'can I make a better decision with this?'. You aren't moved by poetry — only by specifics.",
          },
          {
            name: "emotionally_engaged",
            label: lang === "zh" ? "情感共鸣型" : "emotionally engaged",
            brief:
              lang === "zh"
                ? "你是一个 28 岁的设计师，最近结束了一段 3 年的关系，正在寻找深度连接。你最想从 AI 画像里看到的是'被看见'的感觉。如果你读到一段话心里想说'这说的就是我'，你会非常信任 AI。如果你读到一段话觉得'AI 不知道我'，你会完全关掉页面。"
                : "You are a 28-year-old designer, just out of a 3-year relationship, looking for a deep connection. You most want the AI profile to make you feel SEEN. If you read something and think 'this is exactly me', you'll trust the AI deeply. If you read something and think 'AI doesn't know me', you'll close the page.",
          },
          {
            name: "result_oriented",
            label: lang === "zh" ? "结果导向型" : "result-oriented",
            brief:
              lang === "zh"
                ? "你是一个 32 岁的创业者，用 linQ 是为了'尽快找到合适的合作者/约会对象'。你不关心 AI 多懂你，你关心 AI 给出的画像能不能'帮到我配对人'。如果 AI 画像能让你匹配到的人更准，你愿意付钱；否则你就是来浪费时间的。"
                : "You are a 32-year-old founder using linQ to find collaborators/dates ASAP. You don't care how well AI understands you; you care whether the AI profile actually helps you find a better match. If it does, you'll pay; otherwise you're wasting time.",
          },
        ];

        // Run the 3 personas IN PARALLEL — sequential await deepseekChat
        // here would push the total Round 6 wall time to ~3x single call
        // (15-25s on a normal connection, 60-90s if the upstream is
        // congested). v4+ also does an extra final-polish call after
        // this — so serial would put us deep into Cloudflare's default
        // 60s gateway timeout (the user already hit a 504 in v4+).
        //
        // We also run the final polish call IN PARALLEL with the
        // personas, with one caveat: the polish prompt wants the
        // personas' rewrites. Solution: the polish call's user
        // prompt accepts an EMPTY `personaRewriteMap` array and
        // the polish just falls back to self-improvement; then we
        // do a SECOND quick polish merge with the actual rewrites
        // afterwards. Cost: 1 extra LLM call but still faster than
        // serial because it overlaps with the persona calls.
        const profileBlob = JSON.stringify({ ...synth, ...sceneFields, ...inferred });
        const personaCalls = personas.map(async (p) => {
          const psys = lang === "zh"
            ? `你是 ${p.label}。\n\n${p.brief}\n\n任务：审阅上面的 AI 画像输出。\n\n1. 找出让你**最被打动**的 1-2 个 section（带引用原文片段）—— 写为什么打动你\n2. 找出让你**最失望**的 1-2 个 section（带引用）—— 写为什么失望，并给出**一个具体的改写建议**（1 句话，30-80 字）\n\n严格输出 JSON。`
            : `You are a ${p.label}.\n\n${p.brief}\n\nTask: review the AI profile output above.\n\n1. Find 1-2 sections that MOVED you most (with verbatim quote) — why\n2. Find 1-2 sections that DISAPPOINTED you most (with verbatim quote) — why + one CONCRETE rewrite suggestion (1 sentence, 30-80 chars)\n\nStrict JSON.`;

          const puser = lang === "zh"
            ? `用户原始输入："""${input}"""\n画像输出：\n${profileBlob}\n\n请输出 JSON：\n{\n  "most_moved": [\n    { "field": "section 名称（headline/narrative/patterns/dimensions/paradoxes/archetypes/scene_predictions/life_themes/growth_stage/aesthetic_signature/defense_mechanisms/communication_recipes/match_signals）", "quote": "≤30 字符原话片段", "why": "为什么打动你" }\n  ] (1-2 条),\n  "most_disappointed": [\n    { "field": "section 名称", "quote": "≤30 字符原话片段", "why": "为什么失望", "rewrite": "1 句话改写建议（30-80 字）" }\n  ] (1-2 条)\n}`
            : `User input: """${input}"""\nProfile output:\n${profileBlob}\n\nOutput JSON:\n{\n  "most_moved": [\n    { "field": "section name", "quote": "≤30 char quote", "why": "why it moved you" }\n  ] (1-2),\n  "most_disappointed": [\n    { "field": "section name", "quote": "≤30 char quote", "why": "why disappointed", "rewrite": "1 sentence rewrite (30-80 chars)" }\n  ] (1-2)\n}`;

          const praw = await deepseekChat(
            [
              { role: "system", content: psys },
              { role: "user", content: puser },
            ],
            { json: true, temperature: 0.85, max_tokens: 1200 },
          );
          const parsedPersona = safeParseJSON<{
            most_moved?: Array<{ field: string; quote?: string; why: string }>;
            most_disappointed?: Array<{
              field: string;
              quote?: string;
              why: string;
              rewrite: string;
            }>;
          }>(praw) ?? { most_moved: [], most_disappointed: [] };
          return {
            persona: p.name,
            label: p.label,
            most_moved: (parsedPersona.most_moved ?? []).map((m) => ({
              field: m.field,
              why: m.why,
            })),
            most_disappointed: parsedPersona.most_disappointed ?? [],
          };
        });

        // Wait for the persona parallel batch (started together with
        // critique above in `parallelSettled`).
        const personaResults = personaSettled
          .filter((s) => s.status === "fulfilled")
          .map((s) => (s as PromiseFulfilledResult<typeof personaResults[number]>).value);
        if (personaResults.length < personas.length) {
          console.warn(
            `generate-profile: ${personas.length - personaResults.length} persona(s) failed; continuing with ${personaResults.length} result(s)`,
          );
        }

        // ============================================================
        // ROUND 6.5 — Final synthesis: adopt rewrites from personas.
        // The LLM is asked to incorporate the persona rewrites into a
        // final pass. This is the LAST gate before the UI sees the
        // profile.
        // ============================================================
        const personaRewriteMap = personaResults.flatMap((p) =>
          p.most_disappointed.map((d) => ({
            persona: p.label,
            field: d.field,
            rewrite: d.rewrite,
          })),
        );

        const finalSys = lang === "zh"
          ? `你是 linQ 最终的 AI 画像打磨师。

任务：3 个不同的用户画像（理性怀疑型、情感共鸣型、结果导向型）已经审阅了上面的画像，每个画像给出了 ta 最失望的 section 和改写建议。你现在要做的是：**把这些改写建议综合起来，对最终输出做最后一次打磨**。

**关键原则**：
- 不是机械地套用每个改写 —— 是提炼出 3 个画像的共同诉求
- 如果 3 个画像的失望指向同一处（"这段还是 paraphrase"、"这段不够具体"）—— 那一定改
- 如果 3 个画像的失望各指不同地方 —— 优先改"情感共鸣型"和"结果导向型"指出的（理性怀疑型太挑剔）
- 改写后必须**比原版更具体**（不能只是"换种说法"）
- 不要画蛇添足 —— 如果 3 个画像都满意的地方，保持原样

输出 JSON（**只输出需要最终修改的字段**）：`
          : `You are linQ's final AI profile polisher.

Task: 3 different user personas (skeptical analyst, emotionally engaged, result-oriented) have reviewed the profile above. Each gave their most-disappointed section + a rewrite suggestion. Your job: synthesize those rewrites into one final pass.

Key principles:
- Don't mechanically apply each rewrite — extract the COMMON demand across the 3 personas
- If all 3 point at the same field (e.g. "this is still paraphrase" or "this is too vague") — must change
- If they point at different fields — prioritize emotionally_engaged + result_oriented
- The final version must be MORE SPECIFIC than the original
- Don't over-engineer — keep fields all 3 personas liked

Output JSON (only fields that need final change):`;

        const finalUser = lang === "zh"
          ? `用户原始输入："""${input}"""\n\n5 轮 + 3 画像对抗后的画像：\n${JSON.stringify({ ...synth, ...sceneFields, ...inferred }, null, 2)}\n\n3 个画像的改写建议：\n${JSON.stringify(personaRewriteMap, null, 2)}\n\n请输出最终 JSON（**只输出需要改的字段**，每个字段是改写后的版本）：`
          : `User input: """${input}"""\n\nProfile after 5 rounds + 3-persona adversarial review:\n${JSON.stringify({ ...synth, ...sceneFields, ...inferred }, null, 2)}\n\n3 personas' rewrite suggestions:\n${JSON.stringify(personaRewriteMap, null, 2)}\n\nOutput final JSON (only fields that need changing, each field is the rewritten version):`;

        // Final polish runs AFTER personas (it needs personaRewriteMap).
        // Personas already ran in parallel above; this is the one
        // strictly serial step, but it's only 1 LLM call.
        const finalSettled = await Promise.allSettled([
          deepseekChat(
            [
              { role: "system", content: finalSys },
              { role: "user", content: finalUser },
            ],
            { json: true, temperature: 0.7, max_tokens: 2000 },
          ),
        ]);
        const finalPolish = finalSettled[0].status === "fulfilled"
          ? safeParseJSON<Record<string, unknown>>(finalSettled[0].value) ?? {}
          : {};

        // ============================================================
        // Apply ALL polish layers in order: round 5 critique → round 6.5 final
        // ============================================================

        // ============================================================
        // Merge the 5 rounds. If synthesis failed, fall back to a v4-shaped
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
              life_themes: [
                { name: "寻找连接", evidence: "你写下了这段话，本身就是寻找的一部分" },
              ],
              scene_predictions: [
                {
                  context: "周三晚上 9 点独自在家",
                  behavior: "你会打开手机，反复看这段描述",
                  why: "你在思考，思考是 ta 充电的方式",
                },
              ],
              growth_stage: { stage: "exploration", label: "探索期", why: "你正在尝试一种新的连接方式" },
              aesthetic_signature: {
                preferences: ["偏好深度胜过广度", "重视真实性胜过表达性"],
                contradiction: "想要被看见，但又不想被太多人看见",
              },
              defense_mechanisms: [
                {
                  mechanism: "理智化",
                  when_triggered: "当情绪可能失控时",
                  behavior: "把感受转化为分析和判断",
                },
              ],
              communication_recipes: [
                {
                  context: "想拒绝时",
                  recipe: "先肯定对方的善意，再用具体边界说明",
                  avoid: "直接拒绝 + 不解释",
                },
              ],
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
              life_themes: [
                { name: "Seeking connection", evidence: "Your willingness to write at length signals this" },
              ],
              scene_predictions: [
                {
                  context: "Wednesday 9pm, alone at home",
                  behavior: "You re-read what you wrote",
                  why: "Reflection is how you recharge",
                },
              ],
              growth_stage: { stage: "exploration", label: "exploration", why: "You're trying a new way to connect" },
              aesthetic_signature: {
                preferences: ["depth over breadth", "authenticity over expression"],
                contradiction: "wants to be seen, but not by too many",
              },
              defense_mechanisms: [
                { mechanism: "Intellectualization", when_triggered: "When emotions might slip out", behavior: "Converts feelings into analysis" },
              ],
              communication_recipes: [
                { context: "Wanting to decline", recipe: "Affirm the intent, then state a specific boundary", avoid: "Direct refusal with no explanation" },
              ],
            };

        const useFallback = !synth || !synth.headline;

        // Apply Round 5 critique + Round 6.5 final polish to Round 4
        // synthesis (in-place revisions). The critique may revise:
        // headline, narrative, patterns, dimensions.
        //
        // The finalPolish from Round 6.5 (3-persona adversarial) has the
        // same shape but is the LAST revision gate — wins over the
        // single-LLM critique when both have revisions for the same field.
        const applyCritique = (base: Record<string, unknown>) => {
          const out: Record<string, unknown> = { ...base };
          if (finalPolish.headline && typeof finalPolish.headline === "string") {
            out.headline = finalPolish.headline;
          } else if (critique.headline && typeof critique.headline === "string") {
            out.headline = critique.headline;
          }
          if (finalPolish.narrative && typeof finalPolish.narrative === "string") {
            out.narrative = finalPolish.narrative;
          } else if (critique.narrative && typeof critique.narrative === "string") {
            out.narrative = critique.narrative;
          }
          // Patterns: critique returns a list of insight strings, in original order.
          if (Array.isArray(out.patterns)) {
            const revisedPatterns = (out.patterns as Array<Record<string, unknown>>).map(
              (p, i) => {
                const fpNew = (finalPolish.patterns as unknown[] | undefined)?.[i];
                const cNew = (critique.patterns as unknown[] | undefined)?.[i];
                const winner =
                  typeof fpNew === "string" && fpNew.trim().length > 0
                    ? fpNew
                    : typeof cNew === "string" && cNew.trim().length > 0
                      ? cNew
                      : null;
                if (winner) return { ...p, insight: winner };
                return p;
              },
            );
            out.patterns = revisedPatterns;
          }
          // Dimensions: critique returns a list of { key, why, signals }.
          if (Array.isArray(out.dimensions)) {
            const revisedDims = (out.dimensions as Array<Record<string, unknown>>).map(
              (d) => {
                const fpMatch = (finalPolish.dimensions as Array<Record<string, unknown>> | undefined)?.find(
                  (cd) => cd.key === d.key,
                );
                const cMatch = (critique.dimensions as Array<Record<string, unknown>> | undefined)?.find(
                  (cd) => cd.key === d.key,
                );
                const winner = fpMatch ?? cMatch;
                if (winner) {
                  return {
                    ...d,
                    why: typeof winner.why === "string" ? winner.why : d.why,
                    signals: Array.isArray(winner.signals) ? winner.signals : d.signals,
                  };
                }
                return d;
              },
            );
            out.dimensions = revisedDims;
          }
          return out;
        };

        const ai = useFallback
          ? fallback
          : {
              ...applyCritique(synth),
              patterns: (() => {
                const fp = finalPolish.patterns;
                const cp = critique.patterns;
                if (Array.isArray(inferred.patterns)) {
                  return (inferred.patterns as Array<Record<string, unknown>>).map(
                    (p, i) => {
                      const fpNew = (fp as unknown[] | undefined)?.[i];
                      const cNew = (cp as unknown[] | undefined)?.[i];
                      const winner =
                        typeof fpNew === "string" && fpNew.trim().length > 0
                          ? fpNew
                          : typeof cNew === "string" && cNew.trim().length > 0
                            ? cNew
                            : null;
                      if (winner) return { ...p, insight: winner };
                      return p;
                    },
                  );
                }
                return inferred.patterns;
              })(),
              paradoxes: inferred.paradoxes,
              archetypes: inferred.archetypes,
              match_signals: inferred.match_signals,
              // v4 fields (from Round 3)
              life_themes: sceneFields.life_themes,
              scene_predictions: sceneFields.scene_predictions,
              growth_stage: sceneFields.growth_stage,
              aesthetic_signature: sceneFields.aesthetic_signature,
              defense_mechanisms: sceneFields.defense_mechanisms,
              communication_recipes: sceneFields.communication_recipes,
              // v4+ (Round 6) — keep the persona tournament results for
              // debugging + future analytics. The UI doesn't show this
              // yet — but it's there for when you want to A/B test
              // which personas' complaints correlate with real
              // user feedback.
              _persona_tournament: personaResults.map((p) => ({
                persona: p.persona,
                label: p.label,
                most_moved: p.most_moved,
                most_disappointed: p.most_disappointed.map((d) => ({
                  field: d.field,
                  why: d.why,
                  rewrite: d.rewrite,
                })),
              })),
            };

        // ============================================================
        // MEMORY LAYER — fetch user's past pattern_feedback (agree/disagree)
        // and inject it into the prompt context for the next generation.
        // The feedback is fetched BEFORE the LLM pipeline runs, but for
        // minimal latency we re-fetch here as a quick read.
        // ============================================================
        let feedbackContext: { agrees: string[]; disagrees: string[] } = {
          agrees: [],
          disagrees: [],
        };
        try {
          const { data: fbRows } = await supabase
            .from("pattern_feedback")
            .select("pattern_text, verdict")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(20);
          if (Array.isArray(fbRows)) {
            feedbackContext.agrees = fbRows
              .filter((r) => r.verdict === "agree")
              .map((r) => String(r.pattern_text ?? ""))
              .filter(Boolean)
              .slice(0, 10);
            feedbackContext.disagrees = fbRows
              .filter((r) => r.verdict === "disagree")
              .map((r) => String(r.pattern_text ?? ""))
              .filter(Boolean)
              .slice(0, 10);
          }
        } catch {
           /* feedback table may not exist yet; ignore */
        }

        // Inject the feedback signal into the inference prompt so future
        // generations can lean into what the user agreed with and away
        // from what they disagreed with. This is a no-op on the first
        // generation (no history yet).
        const feedbackContextBlock =
          feedbackContext.agrees.length > 0 || feedbackContext.disagrees.length > 0
            ? lang === "zh"
              ? `\n\n【用户过去反馈 - 必须参考】\n用户过去同意过的洞察方向（这些方向应该强化）：\n${feedbackContext.agrees.map((s) => `  - ${s}`).join("\n")}\n用户过去否定过的洞察方向（这些方向应该避开或换角度）：\n${feedbackContext.disagrees.map((s) => `  - ${s}`).join("\n")}\n`
              : `\n\n[User's past feedback — must consider]\nDirections the user agreed with (lean into these):\n${feedbackContext.agrees.map((s) => `  - ${s}`).join("\n")}\nDirections the user disagreed with (avoid or reframe these):\n${feedbackContext.disagrees.map((s) => `  - ${s}`).join("\n")}\n`
            : "";

        const profile_data = {
          version: "v4+",
          scenario,
          lang,
          input,
          ai,
          facts,
          feedback_used: {
            agrees_count: feedbackContext.agrees.length,
            disagrees_count: feedbackContext.disagrees.length,
          },
          ai_provider: useFallback ? "fallback" : "deepseek-6round",
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

        if (error) return json({ error: safeError(error) }, { status: 500 }, request);
        return json({ data, message: "AI profile generated", ai_provider: profile_data.ai_provider });
      },
    },
  },
});
