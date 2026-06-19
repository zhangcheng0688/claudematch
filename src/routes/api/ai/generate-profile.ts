import { createFileRoute } from "@tanstack/react-router";
import { json, preflight, requireUser, safeError } from "@/lib/api/_helpers.server";
import { deepseekChat, safeParseJSON } from "@/lib/api/_deepseek.server";
import { embedText, profileToEmbeddingText } from "@/lib/api/_embeddings.server";

const VALID_SCENARIOS = new Set(["business", "dating", "partner"]);

/**
 * POST /api/ai/generate-profile
 * Body: { input: string, scenario?: "business" | "dating" | "partner", lang?: "en" | "zh" }
 *
 * v4.5 — compressed DeepSeek pipeline. We collapse the previous 6-round /
 * 8-call pipeline into 3 calls:
 *
 *   Call 1 (perceive):  fact extraction + deep inference + scene/context
 *                       prediction in ONE call. The LLM sees the raw input
 *                       and produces a structured perception blob.
 *   Call 2 (synthesize): turn the perception blob into the user-facing
 *                       headline, narrative, and 5 dimensions.
 *   Call 3 (refine):     adversarial self-critique + 3-persona tournament
 *                       merged into a single revision pass.
 *
 * The schema lives in `src/types/match.ts` (AiProfile v4+).
 */

export const Route = createFileRoute("/api/ai/generate-profile")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const { userId, supabase } = auth;

        const traceId = (crypto as { randomUUID?: () => string })?.randomUUID?.() ??
          Math.random().toString(36).slice(2) + Date.now().toString(36);

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
        const lang: "zh" | "en" = body.lang === "zh" ? "zh" : "en";

        // MEMORY LAYER — fetch user's past pattern_feedback.
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

        const feedbackContextBlock =
          feedbackContext.agrees.length > 0 || feedbackContext.disagrees.length > 0
            ? lang === "zh"
              ? `\n\n【用户过去反馈 - 必须参考】\n用户过去同意过的洞察方向（这些方向应该强化）：\n${feedbackContext.agrees.map((s) => `  - ${s}`).join("\n")}\n用户过去否定过的洞察方向（这些方向应该避开或换角度）：\n${feedbackContext.disagrees.map((s) => `  - ${s}`).join("\n")}\n`
              : `\n\n[User's past feedback — must consider]\nDirections the user agreed with (lean into these):\n${feedbackContext.agrees.map((s) => `  - ${s}`).join("\n")}\nDirections the user disagreed with (avoid or reframe these):\n${feedbackContext.disagrees.map((s) => `  - ${s}`).join("\n")}\n`
            : "";

        // ============================================================
        // CALL 1 — Perceive (facts + inference + scene/context in one)
        // ============================================================
        const dimensionKeysZh = ["决策模式", "信任建立", "能量来源", "冲突处理", "理想匹配"];
        const dimensionKeysEn = ["decision_style", "trust_pattern", "energy_source", "conflict_mode", "ideal_match"];

        const perceiveSys = lang === "zh"
          ? `你是 linQ 的 AI 画像感知引擎。你的任务是把用户的自我描述一次性加工成一份完整的结构化感知。\n\n分三步在同一输出中完成：\n1) 事实抽取：只整理用户明确说出的东西，不做推断。\n2) 深度推断：基于事实推断用户没说但能看出来的东西。每条推断必须具体到这个人，展示 3-5 步推理链，不能从单一关键词推断。\n3) 场景/人生预测：预测用户在 5 个具体生活场景中的真实行为，识别 ta 的人生主题、当前阶段、审美指纹、心理防御机制、场景化沟通建议。\n\n关键原则：\n- 所有推断必须具体到这个人，不是泛泛的人格类型描述\n- paradoxes 必须是"表面想要 vs 实际想要"的真实张力\n- patterns 每条都要有证据（原话引文）和推理链\n- scene_predictions 必须具体到"时间+地点+在场人物+预期行为"\n- life_themes 是存在性主题，不是职业/兴趣\n- defense_mechanisms 必须基于矛盾和维度推断\n\n严格输出 JSON。`
          : `You are linQ's AI profile perception engine. Process the user's self-description into a complete structured perception in one pass.\n\nComplete these three steps in a single output:\n1) Fact extraction: organize only what the user explicitly stated.\n2) Deep inference: infer what they didn't say but a sharp observer would notice. Each inference must be specific to THIS person, show a 3-5 step reasoning chain, and not be guessable from a single keyword.\n3) Scene/life prediction: predict behavior in 5 concrete life scenes, and identify life themes, growth stage, aesthetic signature, defense mechanisms, and scene-specific communication recipes.\n\nKey principles:\n- All inferences must be specific to THIS person, not generic personality labels\n- paradoxes must be real surface-vs-depth tensions\n- patterns need evidence (verbatim quote) and reasoning chains\n- scene_predictions must be specific to time+place+people+behavior\n- life_themes are existential narratives, not career/interests\n- defense_mechanisms must derive from paradoxes + dimensions\n\nStrict JSON output.`;

        const perceiveUser = lang === "zh"
          ? `场景：${scenario}\n用户描述："""${input}"""\n${feedbackContextBlock}\n\n请输出完整感知 JSON：\n{\n  "facts": {\n    "demographics": { "age_guess": "string or null", "location_guess": "string or null", "role_guess": "string or null" },\n    "stated_goals": string[] (2-4 条),\n    "stated_traits": string[] (2-4 条),\n    "concrete_facts": string[] (3-6 条),\n    "linguistic_markers": {\n      "uses_english_chinese_mix": boolean,\n      "uses_emoji": boolean,\n      "sentence_length": "short" | "medium" | "long",\n      "tone": "casual" | "formal" | "playful" | "intense" | "reserved"\n    },\n    "missing_context": string[] (用户没说但通常会说的信息)\n  },\n  "inferred": {\n    "paradoxes": [\n      { "surface": "用户表面说的", "depth": "用户实际想要的", "tension": "矛盾为什么存在" }\n    ] (2-3 条),\n    "archetypes": [\n      { "name": "原型名", "why": "为什么像这个人", "shadow": "阴影面" }\n    ] (1-2 个),\n    "patterns": [\n      {\n        "insight": "非显然推断",\n        "evidence": "≤30 字符原话引文",\n        "reasoning_chain": ["观察：...", "假设：...", "推断：...", "含义：..."] (3-5 步)\n      }\n    ] (3-5 条),\n    "match_signals": {\n      "needs": [{ "what": "ta 真实需要的", "why": "为什么" }] (2-3 条),\n      "gifts": [{ "what": "ta 能给的独特价值", "why": "为什么" }] (2-3 条),\n      "risks": [{ "what": "对方会感受到的摩擦", "impact": "如果不注意会怎样" }] (2-3 条)\n    }\n  },\n  "sceneFields": {\n    "life_themes": [{ "name": "主题名", "evidence": "1 句证据" }] (3 条),\n    "scene_predictions": [\n      { "context": "具体场景", "behavior": "ta 会怎么表现", "why": "为什么" }\n    ] (5 条),\n    "growth_stage": {\n      "stage": "exploration" | "construction" | "transition" | "integration",\n      "label": "中文标签",\n      "why": "为什么 ta 在这个阶段"\n    },\n    "aesthetic_signature": {\n      "preferences": string[] (3-5 条),\n      "contradiction": "ta 在审美/价值观上的内在矛盾"\n    },\n    "defense_mechanisms": [\n      { "mechanism": "机制名", "when_triggered": "何时被触发", "behavior": "外显行为" }\n    ] (2-3 条),\n    "communication_recipes": [\n      { "context": "场景", "recipe": "推荐做法", "avoid": "应避免" }\n    ] (3 条)\n  }\n}`
          : `Scenario: ${scenario}\nUser description: """${input}"""\n${feedbackContextBlock}\n\nOutput complete perception JSON:\n{\n  "facts": {\n    "demographics": { "age_guess": "string or null", "location_guess": "string or null", "role_guess": "string or null" },\n    "stated_goals": string[] (2-4),\n    "stated_traits": string[] (2-4),\n    "concrete_facts": string[] (3-6),\n    "linguistic_markers": {\n      "uses_english_chinese_mix": boolean,\n      "uses_emoji": boolean,\n      "sentence_length": "short" | "medium" | "long",\n      "tone": "casual" | "formal" | "playful" | "intense" | "reserved"\n    },\n    "missing_context": string[] (what user didn't say but usually would)\n  },\n  "inferred": {\n    "paradoxes": [\n      { "surface": "what user said", "depth": "what they actually want", "tension": "why tension exists" }\n    ] (2-3),\n    "archetypes": [\n      { "name": "archetype name", "why": "why they resemble this", "shadow": "shadow side" }\n    ] (1-2),\n    "patterns": [\n      {\n        "insight": "non-obvious inference",\n        "evidence": "≤30 char verbatim quote",\n        "reasoning_chain": ["observation: ...", "hypothesis: ...", "inference: ...", "implication: ..."] (3-5 steps)\n      }\n    ] (3-5),\n    "match_signals": {\n      "needs": [{ "what": "what they truly need", "why": "why" }] (2-3),\n      "gifts": [{ "what": "unique value they give", "why": "why" }] (2-3),\n      "risks": [{ "what": "friction the other feels", "impact": "how it plays out" }] (2-3)\n    }\n  },\n  "sceneFields": {\n    "life_themes": [{ "name": "theme name", "evidence": "1 sentence" }] (3),\n    "scene_predictions": [\n      { "context": "specific scene", "behavior": "what they'll do", "why": "why" }\n    ] (5),\n    "growth_stage": {\n      "stage": "exploration" | "construction" | "transition" | "integration",\n      "label": "stage label",\n      "why": "why this stage"\n    },\n    "aesthetic_signature": {\n      "preferences": string[] (3-5),\n      "contradiction": "internal contradiction in aesthetics/values"\n    },\n    "defense_mechanisms": [\n      { "mechanism": "name", "when_triggered": "when", "behavior": "behavior" }\n    ] (2-3),\n    "communication_recipes": [\n      { "context": "scene", "recipe": "recommended action", "avoid": "what to avoid" }\n    ] (3)\n  }\n}`;

        const perceiveRaw = await deepseekChat(
          [
            { role: "system", content: perceiveSys },
            { role: "user", content: perceiveUser },
          ],
          { json: true, temperature: 0.85, max_tokens: 3500, label: "call-1-perceive", traceId, timeoutMs: 30_000 },
        );
        const perceive = safeParseJSON<{
          facts?: Record<string, unknown>;
          inferred?: Record<string, unknown>;
          sceneFields?: Record<string, unknown>;
        }>(perceiveRaw) ?? {};
        const facts = perceive.facts ?? {};
        const inferred = perceive.inferred ?? {};
        const sceneFields = perceive.sceneFields ?? {};

        // ============================================================
        // CALL 2 — Synthesize (headline / narrative / dimensions)
        // ============================================================
        const synthSys = lang === "zh"
          ? `你是一个文学化的 AI 策展人。把感知结果编织成一份能让人产生"这说的就是我"感受的画像。\n\n关键：\n- narrative 是 3-5 段故事化文字，每段 60-120 字符，每段聚焦一个内在张力\n- dimensions 用 5 维框架（不要 OCEAN 大五）：决策模式、信任建立、能量来源、冲突处理、理想匹配\n- 每个 dimension 给 3-5 条具体行为信号（'ta 在 X 场景会做 Y'）\n- headline 是 6-12 字符的精准画像（不是花哨的隐喻）\n- 所有解读必须具体到这个人，不能是泛泛标签\n\n严格输出 JSON。`
          : `You are a literary AI curator. Weave the perception into a profile that produces a "this is me exactly" feeling.\n\nKey:\n- narrative: 3-5 story-like paragraphs, 60-120 chars each, each focused on an internal tension\n- dimensions: 5-axis framework (NOT OCEAN): decision_style, trust_pattern, energy_source, conflict_mode, ideal_match\n- each dimension gives 3-5 specific behavioral signals ('they will do Y in X situation')\n- headline: 6-12 char precise portrait (not fancy metaphor)\n- all interpretations must be specific to THIS person, not generic labels\n\nStrict JSON output.`;

        const synthUser = lang === "zh"
          ? `用户原始输入："""${input}"""\n\n感知结果：\n${JSON.stringify({ facts, inferred, sceneFields }, null, 2)}\n\n请输出最终画像 JSON：\n{\n  "headline": string (6-12 字符，精准画像),\n  "narrative": string (3-5 段故事化文字，60-120 字符/段，\\n 分隔，每段聚焦一个内在张力),\n  "dimensions": [\n    {\n      "key": "${dimensionKeysZh.join('" | "')}",\n      "score": number (0-1),\n      "why": string (1 句，必须具体到这个人),\n      "signals": string[] (3-5 条具体行为信号)\n    }\n  ] (exactly 5 items, all keys present, same order as above)\n}\n\n每个 dimension 的 5 个 key 必须按顺序出现：决策模式、信任建立、能量来源、冲突处理、理想匹配。`
          : `Original user input: """${input}"""\n\nPerception result:\n${JSON.stringify({ facts, inferred, sceneFields }, null, 2)}\n\nOutput final profile JSON:\n{\n  "headline": string (6-12 chars, precise portrait),\n  "narrative": string (3-5 story-like paragraphs, 60-120 chars each, \\n separated, each focused on an internal tension),\n  "dimensions": [\n    {\n      "key": "${dimensionKeysEn.join('" | "')}",\n      "score": number (0-1),\n      "why": string (1 sentence, must be specific to THIS person),\n      "signals": string[] (3-5 specific behavioral signals)\n    }\n  ] (exactly 5 items, all keys present, same order as above)\n}`;

        const synthRaw = await deepseekChat(
          [
            { role: "system", content: synthSys },
            { role: "user", content: synthUser },
          ],
          { json: true, temperature: 0.85, max_tokens: 1800, label: "call-2-synth", traceId, timeoutMs: 25_000 },
        );
        const synth = safeParseJSON<Record<string, unknown>>(synthRaw) ?? {};

        // ============================================================
        // CALL 3 — Adversarial refinement (critique + 3 personas in one)
        // ============================================================
        const profileBlob = JSON.stringify({ ...synth, ...sceneFields, ...inferred });

        const refineSys = lang === "zh"
          ? `你是 linQ 的最终画像打磨师。你同时拥有四种视角：\n\n1) 内部审查员：找出任何还像 paraphrase（用同义词复述用户输入）的部分。\n2) 理性怀疑型：35 岁产品经理，习惯拆解一切"看起来深刻"的话术，只被"具体"打动。\n3) 情感共鸣型：28 岁设计师，刚结束一段 3 年关系，最想从画像里看到"被看见"的感觉。\n4) 结果导向型：32 岁创业者，只关心画像能不能"帮到我配对人"。\n\n任务：\n- 先以内部审查员身份找出还像 paraphrase 或泛泛的部分\n- 再以三个用户视角分别找出最失望/最被打动的 section\n- 最后综合成一份修订版画像，只改真正需要改的地方\n\n改写原则：\n- 每条都加至少一个"用户没说但能看出来"的具体观察\n- 不要写"对外部世界敏感"这种泛泛标签 —— 写"在餐桌上被问到'最近怎么样'时，你会先停下来 0.5 秒判断对方是否真想知道"\n- 不要给建议，只描述\n- 如果某个 section 已经够具体，保持原样\n\n严格输出 JSON。`
          : `You are linQ's final profile polisher. You hold four perspectives simultaneously:\n\n1) Internal reviewer: find anything that still feels like paraphrase.\n2) Skeptical analyst: 35-year-old PM who only trusts specifics.\n3) Emotionally engaged: 28-year-old designer who wants to feel SEEN.\n4) Result-oriented: 32-year-old founder who only cares if the profile helps matching.\n\nTask:\n- First identify paraphrase or generic sections as the internal reviewer\n- Then find most disappointed/most moved sections from each user perspective\n- Finally synthesize into a revised profile, changing only what truly needs change\n\nRevision principles:\n- Each revised item must add at least one specific observation the user didn't say but a sharp reader would notice\n- Don't write generic labels. Write "when asked at dinner 'how are you', you pause 0.5s to judge if they really want to know"\n- Don't give advice, only describe\n- Keep sections that are already specific\n\nStrict JSON output.`;

        const refineUser = lang === "zh"
          ? `用户原始输入："""${input}"""\n\n当前画像：\n${profileBlob}\n\n请输出 JSON：\n{\n  "critique": {\n    "headline": "改写后的 headline（如不需要改可省略）",\n    "narrative": "改写后的 narrative（如不需要改可省略）",\n    "patterns": [ "改写后的 pattern insight 字符串数组 —— 只输出 insight，按原 patterns 顺序覆盖对应位置；不需要改的可以省略" ],\n    "dimensions": [\n      { "key": "原 key", "why": "改写后的 why", "signals": ["改写后的 signal", ...] }\n    ] (只输出需要改的)\n  },\n  "persona_tournament": [\n    {\n      "persona": "skeptical_analyst | emotionally_engaged | result_oriented",\n      "label": "标签",\n      "most_moved": [\n        { "field": "section 名称", "why": "为什么打动你" }\n      ] (1-2 条),\n      "most_disappointed": [\n        { "field": "section 名称", "quote": "≤30 字符原话片段", "why": "为什么失望", "rewrite": "1 句话改写建议（30-80 字）" }\n      ] (1-2 条)\n    }\n  ],\n  "final_revision": {\n    "headline": "最终 headline（如不需要改可省略）",\n    "narrative": "最终 narrative（如不需要改可省略）",\n    "patterns": [ "最终 pattern insight 字符串数组" ],\n    "dimensions": [\n      { "key": "原 key", "why": "最终 why", "signals": ["最终 signal", ...] }\n    ] (只输出需要改的)\n  }\n}\n\n注意：\n- critique 和 final_revision 的字段结构相同\n- final_revision 是最终输出，优先于 critique\n- 只输出需要改的字段，不需要改的字段可以省略\n- 如果当前画像已经足够好，三个 revision 对象都可以是空对象 {}`
          : `Original user input: """${input}"""\n\nCurrent profile:\n${profileBlob}\n\nOutput JSON:\n{\n  "critique": {\n    "headline": "rewritten headline (omit if not needed)",\n    "narrative": "rewritten narrative (omit if not needed)",\n    "patterns": [ "rewritten pattern insight strings — only insight, in original order; omit unchanged" ],\n    "dimensions": [\n      { "key": "original key", "why": "rewritten why", "signals": ["rewritten signal", ...] }\n    ] (only changed)\n  },\n  "persona_tournament": [\n    {\n      "persona": "skeptical_analyst | emotionally_engaged | result_oriented",\n      "label": "label",\n      "most_moved": [\n        { "field": "section name", "why": "why it moved you" }\n      ] (1-2),\n      "most_disappointed": [\n        { "field": "section name", "quote": "≤30 char quote", "why": "why disappointed", "rewrite": "1 sentence rewrite (30-80 chars)" }\n      ] (1-2)\n    }\n  ],\n  "final_revision": {\n    "headline": "final headline (omit if not needed)",\n    "narrative": "final narrative (omit if not needed)",\n    "patterns": [ "final pattern insight strings" ],\n    "dimensions": [\n      { "key": "original key", "why": "final why", "signals": ["final signal", ...] }\n    ] (only changed)\n  }\n}\n\nNotes:\n- critique and final_revision have the same field structure\n- final_revision is the final output and wins over critique\n- only output fields that need changing\n- if the profile is already good, all three revision objects can be {}`;

        const refineRaw = await deepseekChat(
          [
            { role: "system", content: refineSys },
            { role: "user", content: refineUser },
          ],
          { json: true, temperature: 0.7, max_tokens: 2500, label: "call-3-refine", traceId, timeoutMs: 30_000 },
        );
        const refine = safeParseJSON<{
          critique?: Record<string, unknown>;
          persona_tournament?: Array<{
            persona: string;
            label: string;
            most_moved?: Array<{ field: string; why: string }>;
            most_disappointed?: Array<{ field: string; quote?: string; why: string; rewrite: string }>;
          }>;
          final_revision?: Record<string, unknown>;
        }>(refineRaw) ?? {};

        const critique = refine.critique ?? {};
        const finalRevision = refine.final_revision ?? {};
        const personaResults = (refine.persona_tournament ?? []).map((p) => ({
          persona: p.persona,
          label: p.label,
          most_moved: p.most_moved ?? [],
          most_disappointed: p.most_disappointed ?? [],
        }));

        // ============================================================
        // Merge layers: synth → critique → final_revision
        // ============================================================
        const applyRevisions = (base: Record<string, unknown>) => {
          const out: Record<string, unknown> = { ...base };
          const winnerHeadline =
            typeof finalRevision.headline === "string" && finalRevision.headline.trim().length > 0
              ? finalRevision.headline
              : typeof critique.headline === "string" && critique.headline.trim().length > 0
                ? critique.headline
                : null;
          if (winnerHeadline) out.headline = winnerHeadline;

          const winnerNarrative =
            typeof finalRevision.narrative === "string" && finalRevision.narrative.trim().length > 0
              ? finalRevision.narrative
              : typeof critique.narrative === "string" && critique.narrative.trim().length > 0
                ? critique.narrative
                : null;
          if (winnerNarrative) out.narrative = winnerNarrative;

          if (Array.isArray(out.patterns)) {
            out.patterns = (out.patterns as Array<Record<string, unknown>>).map((p, i) => {
              const fpNew = (finalRevision.patterns as unknown[] | undefined)?.[i];
              const cNew = (critique.patterns as unknown[] | undefined)?.[i];
              const winner =
                typeof fpNew === "string" && fpNew.trim().length > 0
                  ? fpNew
                  : typeof cNew === "string" && cNew.trim().length > 0
                    ? cNew
                    : null;
              if (winner) return { ...p, insight: winner };
              return p;
            });
          }

          if (Array.isArray(out.dimensions)) {
            out.dimensions = (out.dimensions as Array<Record<string, unknown>>).map((d) => {
              const fpMatch = (finalRevision.dimensions as Array<Record<string, unknown>> | undefined)?.find(
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
            });
          }
          return out;
        };

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

        const ai = useFallback
          ? fallback
          : {
              ...applyRevisions(synth),
              patterns: (() => {
                const fp = finalRevision.patterns;
                const cp = critique.patterns;
                if (Array.isArray(inferred.patterns)) {
                  return (inferred.patterns as Array<Record<string, unknown>>).map((p, i) => {
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
                  });
                }
                return inferred.patterns;
              })(),
              paradoxes: inferred.paradoxes,
              archetypes: inferred.archetypes,
              match_signals: inferred.match_signals,
              life_themes: sceneFields.life_themes,
              scene_predictions: sceneFields.scene_predictions,
              growth_stage: sceneFields.growth_stage,
              aesthetic_signature: sceneFields.aesthetic_signature,
              defense_mechanisms: sceneFields.defense_mechanisms,
              communication_recipes: sceneFields.communication_recipes,
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

        const profile_data = {
          version: "v4.5",
          scenario,
          lang,
          input,
          ai,
          facts,
          feedback_used: {
            agrees_count: feedbackContext.agrees.length,
            disagrees_count: feedbackContext.disagrees.length,
          },
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

        // Compute vector embedding for the profile so match.ts can do
        // fast similarity pre-filtering. Non-blocking: if OpenAI is
        // unavailable we still save the profile and fall back to
        // priority/recency ordering in match.ts.
        let embedding: number[] | null = null;
        try {
          const embedText_ = profileToEmbeddingText({
            headline: (ai as Record<string, unknown>).headline as string | undefined,
            bio: input,
            scenario_tags: [scenario],
            profile_data: { ai },
          });
          const embedResult = await embedText(embedText_);
          if (embedResult.ok) embedding = embedResult.embedding;
          else {
            console.warn(
              JSON.stringify({ at: "generate-profile:embedding_failed", traceId, reason: embedResult.reason }),
            );
          }
        } catch (e) {
          console.warn(
            JSON.stringify({ at: "generate-profile:embedding_exception", traceId, error: String(e) }),
          );
        }

        const { data, error } = await supabase
          .from("user_profiles")
          .insert({ user_id: userId, profile_data: profile_data as never })
          .select("*")
          .single();

        if (embedding && !error) {
          try {
            await (supabase.rpc as any)("set_user_profile_embedding", {
              p_user_id: userId,
              p_embedding: embedding,
            });
          } catch (e) {
            console.warn(
              JSON.stringify({ at: "generate-profile:embedding_write_failed", traceId, error: String(e) }),
            );
          }
        }

        if (error) return json({ error: safeError(error) }, { status: 500 }, request);
        return json({ data, message: "AI profile generated", ai_provider: profile_data.ai_provider });
      },
    },
  },
});
