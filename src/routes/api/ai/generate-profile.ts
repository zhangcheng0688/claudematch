import { createFileRoute } from "@tanstack/react-router";
import { json, preflight, requireUser, safeError } from "@/lib/api/_helpers.server";
import { llmChatEx, safeParseJSON } from "@/lib/api/_llm.server";
import { getCachedResponse, hashInputs, setCachedResponse } from "@/lib/api/_ai-cache.server";
import {
  buildPerceiveSys,
  buildPerceiveUser,
  buildRefineSys,
  buildRefineUser,
  buildSynthSys,
  buildSynthUser,
  type ProfileLang,
} from "@/lib/api/_profile-prompts.server";
import { selectPromptVersion } from "@/lib/api/_prompt-versions.server";
import { moderateText } from "@/lib/api/_moderation.server";
import { embedText, profileToEmbeddingText } from "@/lib/api/_embeddings.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function saveProfile(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  profile_data: Record<string, unknown>,
  input: string,
  scenario: string,
  traceId: string,
  request: Request,
  promptVersion?: string,
) {
  // Upsert scenario authorization so /api/ai/match can find this user.
  // SECURITY: flag columns are revoked from the authenticated role, so
  // all user_authorizations writes must go through the service-role client
  // here on the server (user_id is always the authenticated caller's own).
  const flags = { business: false, dating: false, partner: false } as Record<string, boolean>;
  flags[scenario] = true;
  const { data: existingAuth } = await supabaseAdmin
    .from("user_authorizations")
    .select("id, business, dating, partner")
    .eq("user_id", userId)
    .maybeSingle();
  if (existingAuth) {
    await supabaseAdmin
      .from("user_authorizations")
      .update({
        business: existingAuth.business || flags.business,
        dating: existingAuth.dating || flags.dating,
        partner: existingAuth.partner || flags.partner,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingAuth.id);
  } else {
    await supabaseAdmin.from("user_authorizations").insert({ user_id: userId, ...flags });
  }

  // Compute vector embedding for the profile so match.ts can do
  // fast similarity pre-filtering. Non-blocking: if OpenAI is
  // unavailable we still save the profile and fall back to
  // priority/recency ordering in match.ts.
  let embedding: number[] | null = null;
  try {
    const embedText_ = profileToEmbeddingText({
      headline: (profile_data.ai as Record<string, unknown> | undefined)?.headline as
        | string
        | undefined,
      bio: input,
      scenario_tags: [scenario],
      profile_data: { ai: profile_data.ai },
    });
    const embedResult = await embedText(embedText_);
    if (embedResult.ok) embedding = embedResult.embedding;
    else {
      console.warn(
        JSON.stringify({
          at: "generate-profile:embedding_failed",
          traceId,
          reason: embedResult.reason,
        }),
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabaseAdmin.rpc as any)("set_user_profile_embedding", {
        p_user_id: userId,
        p_embedding: embedding,
      });
    } catch (e) {
      console.warn(
        JSON.stringify({
          at: "generate-profile:embedding_write_failed",
          traceId,
          error: String(e),
        }),
      );
    }
  }

  if (error) return json({ error: safeError(error) }, { status: 500 }, request);
  return json({
    data,
    message: "AI profile generated",
    ai_provider: profile_data.ai_provider,
    prompt_version: promptVersion ?? (profile_data.prompt_version as string | undefined) ?? "v5",
  });
}

export function buildFallbackProfile(input: string, llmLang: ProfileLang): Record<string, unknown> {
  return llmLang !== "en"
    ? {
        headline: "独一无二的你",
        narrative:
          "你正在寻找属于自己的连接。这段描述是一个起点 —— 告诉 AI 你关心什么、你在意什么，AI 会把这些信号打包成一份让对方一眼看懂你的画像。\n\n每一次重新描述，都会被 AI 重新理解。linQ 不会把任何标签贴在你身上。",
        hidden_superpower: {
          what: "你愿意先敞开自己，这是稀缺的能力",
          evidence: input.slice(0, 24),
        },
        blind_spot: {
          what: "可能把「被理解」的期待放得太高",
          cost: "容易因为对方一次没听懂就撤退",
        },
        patterns: [
          {
            insight: "你愿意花时间描述自己 —— 这本身说明你在认真对待这次匹配。",
            evidence: input.slice(0, 24),
            reasoning_chain: [
              "观察：你写了一段自我介绍",
              "假设：多数人不会这样做",
              "推断：你把这次匹配当回事",
            ],
            confidence: 0.8,
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
          risks: [{ what: "在被快速匹配时感到不被理解", impact: "会因为「太快了」而退出对话" }],
        },
        what_people_miss: {
          surface_impression: "看起来在认真找一个人",
          reality: "其实在找一个能接住自己敏感的人",
          why: "描述里充满了对「被理解」的精确要求",
        },
        growth_edge: {
          area: "信任",
          what: "太快把对方的犹豫解读为「不够懂我」",
          invitation: "如果愿意多给一两次解释的机会，关系会深很多",
        },
        attachment_signals: {
          trust_build: "通过对方记得细节来建立信任",
          need_expression: "倾向暗示多过直接开口",
          distance_response: "会先退后观察，确定安全再靠近",
          repair_style: "需要对方主动开口，但很难主动破冰",
        },
        stress_response: {
          early_signal: "话变少，开始分析而非感受",
          escalation: "进入「算了」模式，表面冷静但内心撤退",
          repair: "独处、写东西、或听熟悉的音乐",
          support_need: "不需要建议，只需要被问「你现在怎样」",
        },
        life_themes: [{ name: "寻找连接", evidence: "你写下了这段话，本身就是寻找的一部分" }],
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
        hidden_superpower: {
          what: "Your willingness to open up first is rare",
          evidence: input.slice(0, 24),
        },
        blind_spot: {
          what: "You may expect to be understood too quickly",
          cost: "You might withdraw after one mismatch",
        },
        patterns: [
          {
            insight:
              "You took the time to describe yourself — that alone signals you're taking this match seriously.",
            evidence: input.slice(0, 24),
            reasoning_chain: [
              "Observation: you wrote a self-intro",
              "Hypothesis: most people don't do this",
              "Inference: you take this match seriously",
            ],
            confidence: 0.8,
          },
        ],
        dimensions: [
          {
            key: "decision_style",
            score: 0.7,
            why: "describes first, decides second",
            signals: [],
          },
          { key: "trust_pattern", score: 0.6, why: "builds connection through text", signals: [] },
          { key: "energy_source", score: 0.5, why: "energized by deep conversation", signals: [] },
          { key: "conflict_mode", score: 0.7, why: "leans toward direct expression", signals: [] },
          {
            key: "ideal_match",
            score: 0.7,
            why: "seeks someone who understands them",
            signals: [],
          },
        ],
        paradoxes: [
          {
            surface: "You say you want someone who 'gets' you",
            depth: "But what you actually want is 'to be seen without having to explain'",
            tension:
              "These look the same but differ: the first requires you to perform, the second requires the other to perceive",
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
          needs: [
            {
              what: "Quiet listening",
              why: "Your description reveals this is your scarcest thing",
            },
          ],
          gifts: [
            {
              what: "Earnest attention",
              why: "Your willingness to write at length is itself rare",
            },
          ],
          risks: [
            {
              what: "May feel misunderstood when matched quickly",
              impact: "Will exit conversations that feel 'too fast'",
            },
          ],
        },
        what_people_miss: {
          surface_impression: "Looks like someone seriously looking",
          reality: "Actually looking for someone who can catch their sensitivity",
          why: "The description is full of precise demands to be understood",
        },
        growth_edge: {
          area: "trust",
          what: "Reads hesitation as 'they don't get me' too quickly",
          invitation: "Giving one or two more chances to explain would deepen relationships",
        },
        attachment_signals: {
          trust_build: "Builds trust through remembered details",
          need_expression: "Tends to hint more than ask directly",
          distance_response: "Steps back to observe before moving closer",
          repair_style: "Needs the other to initiate, finds it hard to break the ice",
        },
        stress_response: {
          early_signal: "Talks less, starts analyzing instead of feeling",
          escalation: "Shuts down into 'never mind' mode, outwardly calm but inwardly withdrawing",
          repair: "Solitude, writing, or listening to familiar music",
          support_need: "Doesn't need advice, just to be asked 'how are you right now'",
        },
        life_themes: [
          {
            name: "Seeking connection",
            evidence: "Your willingness to write at length signals this",
          },
        ],
        scene_predictions: [
          {
            context: "Wednesday 9pm, alone at home",
            behavior: "You re-read what you wrote",
            why: "Reflection is how you recharge",
          },
        ],
        growth_stage: {
          stage: "exploration",
          label: "exploration",
          why: "You're trying a new way to connect",
        },
        aesthetic_signature: {
          preferences: ["depth over breadth", "authenticity over expression"],
          contradiction: "wants to be seen, but not by too many",
        },
        defense_mechanisms: [
          {
            mechanism: "Intellectualization",
            when_triggered: "When emotions might slip out",
            behavior: "Converts feelings into analysis",
          },
        ],
        communication_recipes: [
          {
            context: "Wanting to decline",
            recipe: "Affirm the intent, then state a specific boundary",
            avoid: "Direct refusal with no explanation",
          },
        ],
      };
}

const VALID_SCENARIOS = new Set(["business", "dating", "partner"]);

/**
 * POST /api/ai/generate-profile
 * Body: {
 *   input: string,
 *   scenario?: "business" | "dating" | "partner",
 *   lang?: "en" | "zh" | "yue",
 *   follow_up_answers?: Array<{ question: string; answer: string }>
 * }
 *
 * v5 — AI portrait engine. Three-stage pipeline:
 *   Call 1 (perceive): structured perception with evidence chain + confidence.
 *   Call 2 (synthesize): literary headline/narrative/dimensions.
 *   Call 3 (refine): adversarial critique + persona tournament.
 *
 * New in v5:
 *   - Optional follow-up answers from /api/ai/interview-questions
 *   - what_people_miss / growth_edge / attachment_signals / stress_response
 *   - decision_fingerprints across love/work/money/friendship
 *   - confidence scores on every inference
 */

export const Route = createFileRoute("/api/ai/generate-profile")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const { userId, supabase } = auth;

        const traceId =
          (crypto as { randomUUID?: () => string })?.randomUUID?.() ??
          Math.random().toString(36).slice(2) + Date.now().toString(36);

        let body: {
          input?: unknown;
          scenario?: unknown;
          lang?: unknown;
          follow_up_answers?: unknown;
        } = {};
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
        const lang: "zh" | "en" | "yue" =
          body.lang === "en" ? "en" : body.lang === "yue" ? "yue" : "zh";
        const llmLang: ProfileLang = lang === "en" ? "en" : lang === "yue" ? "yue" : "zh";
        const promptVersion = selectPromptVersion("profile", userId);

        const followUpAnswers = Array.isArray(body.follow_up_answers)
          ? (body.follow_up_answers as Array<{ question?: string; answer?: string }>)
              .filter((a) => typeof a.answer === "string" && a.answer.trim().length > 0)
              .map((a) => ({ question: String(a.question ?? ""), answer: a.answer!.trim() }))
          : [];

        const fullInput = [input, ...followUpAnswers.map((a) => `${a.question} ${a.answer}`)].join(
          "\n",
        );
        const moderation = await moderateText(
          fullInput,
          llmLang === "en" ? "en" : "zh",
          "generate-profile",
        );
        if (!moderation.safe) {
          return json(
            { error: "Input violates content policy", moderation },
            { status: 400 },
            request,
          );
        }

        const interviewBlock =
          followUpAnswers.length > 0
            ? llmLang !== "en"
              ? `\n\n【用戶對追問的回答】\n${followUpAnswers.map((a, i) => `${i + 1}. 問題：${a.question}\n   回答：${a.answer}`).join("\n\n")}\n`
              : `\n\n[User's follow-up answers]\n${followUpAnswers.map((a, i) => `${i + 1}. Q: ${a.question}\n   A: ${a.answer}`).join("\n\n")}\n`
            : "";

        // MEMORY LAYER — fetch user's past pattern_feedback.
        const feedbackContext: { agrees: string[]; disagrees: string[] } = {
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
            ? llmLang !== "en"
              ? `\n\n【用户过去反馈 - 必须参考】\n用户过去同意过的洞察方向（这些方向应该强化）：\n${feedbackContext.agrees.map((s) => `  - ${s}`).join("\n")}\n用户过去否定过的洞察方向（这些方向应该避开或换角度）：\n${feedbackContext.disagrees.map((s) => `  - ${s}`).join("\n")}\n`
              : `\n\n[User's past feedback — must consider]\nDirections the user agreed with (lean into these):\n${feedbackContext.agrees.map((s) => `  - ${s}`).join("\n")}\nDirections the user disagreed with (avoid or reframe these):\n${feedbackContext.disagrees.map((s) => `  - ${s}`).join("\n")}\n`
            : "";

        // P1-3: result cache. Profile generation for identical input +
        // scenario + lang + feedback is deterministic and expensive.
        const feedbackHash = await hashInputs(feedbackContext.agrees, feedbackContext.disagrees);
        const profileCacheKey = await hashInputs(
          "profile",
          userId,
          input,
          scenario,
          lang,
          feedbackHash,
        );
        type CachedProfileData = {
          version: string;
          prompt_version: string;
          scenario: string;
          lang: string;
          input: string;
          ai: Record<string, unknown>;
          facts: Record<string, unknown>;
          feedback_used: { agrees_count: number; disagrees_count: number };
          ai_provider: string;
        };
        const cachedProfile = await getCachedResponse<CachedProfileData>(supabaseAdmin, profileCacheKey);
        if (cachedProfile?.response) {
          const cachedData = cachedProfile.response;
          const profile_data = {
            ...cachedData,
            generated_at: new Date().toISOString(),
            ai_provider: `cached:${cachedData.ai_provider}`,
          };
          return await saveProfile(
            supabase,
            userId,
            profile_data as never,
            input,
            scenario,
            traceId,
            request,
            cachedData.prompt_version,
          );
        }

        // ============================================================
        // CALL 1 — Perceive (facts + deep inference + scene/context)
        // ============================================================
        const dimensionKeysZh = ["决策模式", "信任建立", "能量来源", "冲突处理", "理想匹配"];
        const dimensionKeysEn = [
          "decision_style",
          "trust_pattern",
          "energy_source",
          "conflict_mode",
          "ideal_match",
        ];
        const dimensionKeys = llmLang !== "en" ? dimensionKeysZh : dimensionKeysEn;

        const perceiveSys = buildPerceiveSys(llmLang, scenario, promptVersion);
        const perceiveUser = buildPerceiveUser(
          llmLang,
          scenario,
          input,
          interviewBlock,
          feedbackContextBlock,
          promptVersion,
        );

        const perceiveRes = await llmChatEx(
          [
            { role: "system", content: perceiveSys },
            { role: "user", content: perceiveUser },
          ],
          {
            json: true,
            temperature: 0.85,
            max_tokens: 4000,
            label: "call-1-perceive",
            traceId,
            timeoutMs: 30_000,
            deadlineMs: 50_000,
          },
        );
        const perceiveRaw = perceiveRes?.content ?? null;
        const perceive =
          safeParseJSON<{
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
        const synthSys = buildSynthSys(llmLang, promptVersion);
        const synthUser = buildSynthUser(
          llmLang,
          input,
          facts,
          inferred,
          sceneFields,
          dimensionKeys,
          promptVersion,
        );

        const synthRes = await llmChatEx(
          [
            { role: "system", content: synthSys },
            { role: "user", content: synthUser },
          ],
          {
            json: true,
            temperature: 0.85,
            max_tokens: 2000,
            label: "call-2-synth",
            traceId,
            timeoutMs: 25_000,
            deadlineMs: 50_000,
          },
        );
        const synthRaw = synthRes?.content ?? null;
        const synth = safeParseJSON<Record<string, unknown>>(synthRaw) ?? {};

        // ============================================================
        // CALL 3 — Adversarial refinement (critique + 3 personas)
        // ============================================================
        const profileBlob = JSON.stringify({ ...synth, ...sceneFields, ...inferred });

        const refineSys = buildRefineSys(llmLang, promptVersion);
        const refineUser = buildRefineUser(llmLang, input, profileBlob, promptVersion);

        const refineRes = await llmChatEx(
          [
            { role: "system", content: refineSys },
            { role: "user", content: refineUser },
          ],
          {
            json: true,
            temperature: 0.7,
            max_tokens: 2500,
            label: "call-3-refine",
            traceId,
            timeoutMs: 30_000,
            deadlineMs: 50_000,
          },
        );
        const refineRaw = refineRes?.content ?? null;
        const refine =
          safeParseJSON<{
            critique?: Record<string, unknown>;
            persona_tournament?: Array<{
              persona: string;
              label: string;
              most_moved?: Array<{ field: string; why: string }>;
              most_disappointed?: Array<{
                field: string;
                quote?: string;
                why: string;
                rewrite: string;
              }>;
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
              const fpMatch = (
                finalRevision.dimensions as Array<Record<string, unknown>> | undefined
              )?.find((cd) => cd.key === d.key);
              const cMatch = (
                critique.dimensions as Array<Record<string, unknown>> | undefined
              )?.find((cd) => cd.key === d.key);
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

        const fallback = buildFallbackProfile(input, llmLang);

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
              what_people_miss: inferred.what_people_miss,
              growth_edge: inferred.growth_edge,
              attachment_signals: inferred.attachment_signals,
              stress_response: inferred.stress_response,
              decision_fingerprints: inferred.decision_fingerprints,
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
          version: "v5.0",
          prompt_version: promptVersion,
          scenario,
          lang,
          input,
          follow_up_answers: followUpAnswers,
          ai,
          facts,
          feedback_used: {
            agrees_count: feedbackContext.agrees.length,
            disagrees_count: feedbackContext.disagrees.length,
          },
          ai_provider: useFallback ? "fallback" : (perceiveRes?.provider ?? "llm"),
          generated_at: new Date().toISOString(),
        };

        // Persist the expensive final profile so identical input doesn't
        // re-call the model pipeline. TTL is short (1h) because feedback
        // and user state evolve quickly.
        await setCachedResponse(
          supabaseAdmin,
          profileCacheKey,
          "profile",
          profileCacheKey,
          perceiveRes?.provider,
          profile_data,
          1,
        );

        return await saveProfile(
          supabase,
          userId,
          profile_data,
          input,
          scenario,
          traceId,
          request,
          promptVersion,
        );
      },
    },
  },
});
