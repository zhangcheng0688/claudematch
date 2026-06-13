import { createFileRoute } from "@tanstack/react-router";
import { json, preflight, requireUser, safeError } from "@/lib/api/_helpers.server";
import { deepseekChat, safeParseJSON } from "@/lib/api/_deepseek.server";
import { extractInterests, fallbackVenueName } from "@/lib/api/extract-interests";

/**
 * POST /api/ai/meet-plan
 * Body: { match_id: string, lang?: "en" | "zh" }
 *
 * v3 — venue-grounded planning. The previous version asked the LLM to
 * "invent" venue names (`name_example: "xx 区 yy 路某品牌精品咖啡"`).
 * That broke the **餐厅返点** revenue model: a user can't actually
 * go to a fictional restaurant, and we have no way to track the
 * conversion. The new version:
 *
 *   1. Queries the `venues` table (高德-sourced, see
 *      scripts/scrape-amap.mjs) for ~30 candidate venues in the user's
 *      city. Filters by `vibe_tags` when the user has expressed a
 *      preference (otherwise random sample).
 *   2. Hands the candidate list to the LLM. The LLM picks 3-4 per plan
 *      and outputs their `venue_id` (UUID) — NOT a free-text name.
 *   3. Server resolves the venue_ids back to full venue rows so the
 *      client can render real names + addresses + a booking button.
 *
 * Edge cases:
 *   - User has no city in profile → fall back to Shenzhen (default)
 *   - venues table is empty for the city → graceful fallback
 *     (LLM still returns text descriptions, with venue_id = null)
 *   - LLM hallucinates a venue_id that doesn't exist in our table
 *     → server-side validation drops it, keeps the rest
 */

const DEFAULT_CITY = "shenzhen";
const VENUE_SAMPLE_SIZE = 30;

type VenueCandidate = {
  id: string;
  name: string;
  district: string | null;
  address: string | null;
  cuisine_tags: string[];
  vibe_tags: string[];
  price_per_person: number | null;
  rating: number | null;
};

async function loadVenuesForCity(
  supabase: ReturnType<typeof Object>,
  city: string,
  preferredVibes: string[],
): Promise<VenueCandidate[]> {
  // Step 1: venues that match the vibe (if any)
  // Step 2: top up with random sample to VENUE_SAMPLE_SIZE
  // We use a service-role client bypass to read venues — RLS blocks
  // the user JWT from reading this table (no public policies).
  // requireUser() above gives us the per-user `supabase`; we need
  // the admin client for the venues table read.
  // We import it lazily to keep the import surface small.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const ordered: VenueCandidate[] = [];
  const seenIds = new Set<string>();

  if (preferredVibes.length > 0) {
    const { data: vibeMatches } = await supabaseAdmin
      .from("venues")
      .select("id, name, district, address, cuisine_tags, vibe_tags, price_per_person, rating")
      .eq("city", city)
      .eq("is_active", true)
      .overlaps("vibe_tags", preferredVibes) // any vibe match
      .limit(20);
    for (const v of vibeMatches ?? []) {
      if (seenIds.has(v.id)) continue;
      seenIds.add(v.id);
      ordered.push(v as VenueCandidate);
    }
  }

  // Top up with random sample (use a stable but per-call-different order
  // — we sample by created_at desc and take the top N; pseudo-random
  // enough for LLM context window).
  if (ordered.length < VENUE_SAMPLE_SIZE) {
    const { data: topUp } = await supabaseAdmin
      .from("venues")
      .select("id, name, district, address, cuisine_tags, vibe_tags, price_per_person, rating")
      .eq("city", city)
      .eq("is_active", true)
      .order("rating", { ascending: false, nullsFirst: false })
      .limit(VENUE_SAMPLE_SIZE * 2); // 2x so we can drop duplicates
    for (const v of topUp ?? []) {
      if (seenIds.has(v.id)) continue;
      seenIds.add(v.id);
      ordered.push(v as VenueCandidate);
      if (ordered.length >= VENUE_SAMPLE_SIZE) break;
    }
  }

  return ordered.slice(0, VENUE_SAMPLE_SIZE);
}

export const Route = createFileRoute("/api/ai/meet-plan")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const { userId, supabase } = auth;

        let body: { match_id?: unknown; lang?: unknown } = {};
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid JSON body" }, { status: 400 }, request);
        }
        const match_id = body.match_id;
        const lang: "en" | "zh" | "yue" =
          body.lang === "yue" ? "yue" : body.lang === "en" ? "en" : "zh";
        const llmLang: "en" | "zh" = lang === "en" ? "en" : "zh";
        if (typeof match_id !== "string" || match_id.length < 8) {
          return json({ error: "match_id is required" }, { status: 400 }, request);
        }

        const { data: match, error: mErr } = await supabase
          .from("matches")
          .select("id, user_id, matched_user_id, scenario, details, match_score")
          .eq("id", match_id)
          .maybeSingle();

        if (mErr) return json({ error: safeError(mErr) }, { status: 500 }, request);
        if (!match || match.user_id !== userId) {
          return json({ error: "Match not found" }, { status: 404 }, request);
        }

        // Resolve the user's city. The match.details may carry it on
        // the *other* user's profile (in v2 details.headline / city),
        // but we want the requesting user's city. We read it from
        // the user_profiles row.
        const { data: myProfile } = await supabase
          .from("user_profiles")
          .select("profile_data")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const myCity = (myProfile?.profile_data as { city?: string } | null)?.city ?? DEFAULT_CITY;

        // Heuristic for preferred vibes: derive from scenario.
        // - dating: 适合聊天 / 浪漫
        // - business: 安静 / 适合聊天 / 高端
        // - partner: 适合拍照 / 轻松 / 适合聊天
        const scenarioVibes: Record<string, string[]> = {
          dating: ["适合聊天", "浪漫"],
          business: ["安静", "适合聊天", "高端"],
          partner: ["适合拍照", "轻松", "适合聊天"],
        };
        const preferredVibes = scenarioVibes[match.scenario] ?? [];

        // Load the candidate venue set.
        const candidates = await loadVenuesForCity(supabase, myCity, preferredVibes);
        const hasVenues = candidates.length > 0;

        // LLM system prompt — same as v2, but explicitly notes that
        // venue options are *real* restaurants and the model must
        // pick from them (not invent).
        const sys = llmLang === "zh"
          ? `你是 linQ 的 AI 见面策划师 —— 一个比朋友更懂这两人的角色。

任务：为这对匹配设计 **3 套备选见面方案**（plan A / B / C），让用户能选。

A = 安静型：偏向独立场所、轻互动、深度交流
B = 互动型：偏向有共同参与的活动、活跃氛围、边做边聊
C = 折中型：兼有两类元素

每套方案必须包含：
- venue_options：3-4 个**从下方候选清单中挑选**的具体餐厅/场所（含 venue_id, name, district, why, price_per_person 字段）
- activity_design：基于两人画像的活动设计
- time_considerations：最佳时间窗口/避免时间
- exit_strategy：怎么体面结束 + 怎么留下"下一步约定"

**关键**：
- 方案设计必须基于两人画像的细节
- venue_options **必须**用下面候选清单里的 venue_id（不要编造）
- 如果候选清单里没有完美匹配的，挑最接近的 3-4 个，**不要**自己编
- exit_strategy 不能是"说再见然后走"——要具体到"如果你感觉到 ta 在 60 分钟就开始看手机，你应该怎么接住这个信号"

严格输出 JSON。`
          : `You are linQ's AI meet-up planner — a role that knows these two people better than their friends do.

Task: design 3 alternative meet-up plans (A / B / C) for this match, so the user can pick.

A = quiet type: independent venues, light interaction, depth conversation
B = interactive type: shared activity, lively atmosphere, doing-while-talking
C = balanced type: mix of both

Each plan must include:
- venue_options: 3-4 venues **selected from the candidate list below** (with venue_id, name, district, why, price_per_person)
- activity_design: activity designed for these two profiles specifically
- time_considerations: best window / avoid window
- exit_strategy: how to end gracefully + how to anchor the next step

Critical:
- every design decision must be grounded in both participants' profiles
- venue_options MUST use venue_id from the candidate list — never invent a restaurant
- if no perfect match exists in the candidates, pick the closest 3-4 — do not fabricate
- exit_strategy must be specific (e.g. "if you notice them checking their phone at the 60-minute mark, pivot to...")

Strict JSON output.`;

        // User prompt: scenario + match details + candidate venue list.
        const candidatesBlock = hasVenues
          ? (llmLang === "zh"
            ? `\n\n候选餐厅清单（必须从下面选，**不要**自己编）：\n${candidates
                .map((v, i) => `[${i}] venue_id=${v.id}\n    name=${v.name}\n    district=${v.district ?? "?"}\n    cuisine=${v.cuisine_tags.join("/")}\n    vibe=${v.vibe_tags.join("/")}\n    price_per_person=${v.price_per_person ?? "?"} 元\n    rating=${v.rating ?? "?"}`)
                .join("\n\n")}`
            : `\n\nCandidate venues (pick from this list — DO NOT invent):\n${candidates
                .map((v, i) => `[${i}] venue_id=${v.id}\n    name=${v.name}\n    district=${v.district ?? "?"}\n    cuisine=${v.cuisine_tags.join("/")}\n    vibe=${v.vibe_tags.join("/")}\n    price_per_person=${v.price_per_person ?? "?"} CNY\n    rating=${v.rating ?? "?"}`)
                .join("\n\n")}`)
          : (lang === "zh"
            ? "\n\n注意：当前城市的餐厅数据尚未入库。请输出 venue_options 为空数组，activity_design 仍然生成。"
            : "\n\nNote: no venue data available for this city. Output venue_options as an empty array, but still generate activity_design.");

        const prompt = `Scenario: ${match.scenario}
Match details: ${JSON.stringify(match.details, null, 2)}${candidatesBlock}

Return JSON of shape:
{
  "multi_plan": [
    {
      "id": "A" | "B" | "C",
      "label": "标签（"安静型" / "互动型" / "折中型"）",
      "description": "1 句描述（"适合你们的节奏"）",
      "venue_options": [
        {
          "venue_id": "从候选清单里挑出的 UUID（必填，**必须是真实存在的 ID**）",
          "why": "为什么这个场所适合这两人（**具体到两人特质**）",
          "distance_walking_minutes": number (从双方中点步行分钟数，估算)
        }
      ] (3-4 条),
      "activity_design": {
        "why_this_activity": "为什么这个活动适合这两人（**基于画像**）",
        "flow": {
          "0_30_min": "前 30 分钟：具体做什么、聊什么",
          "30_60_min": "30-60 分钟：节奏如何切换",
          "60_90_min": "60-90 分钟：如何收尾"
        },
        "backup_if_bored": "如果 30 分钟就冷场，怎么切换活动或话题"
      },
      "time_considerations": {
        "best_window": "最佳时间窗口（如"周三到周五 19:00-20:30"）",
        "avoid_window": "应避免的时间（如"周一早上"）",
        "weather_check": "天气考虑（户外 vs 室内）"
      },
      "exit_strategy": {
        "natural_close": "怎么体面结束（**如果感觉不对**）",
        "followup_anchor": "结束时的「下一步约定」（具体到"约 ta 周六再喝一杯"）"
      }
    }
  ] (exactly 3 plans: A, B, C)
}
${llmLang === "zh" ? "全部用中文表达" : "Express in English"}.`;

        const raw = await deepseekChat(
          [
            { role: "system", content: sys },
            { role: "user", content: prompt },
          ],
          { json: true, temperature: 0.9, max_tokens: 2800 },
        );

        const parsed = safeParseJSON<{
          multi_plan?: Array<{
            id?: string;
            label?: string;
            description?: string;
            venue_options?: Array<{
              venue_id?: string;
              why?: string;
              distance_walking_minutes?: number;
            }>;
            activity_design?: {
              why_this_activity?: string;
              flow?: { "0_30_min"?: string; "30_60_min"?: string; "60_90_min"?: string };
              backup_if_bored?: string;
            };
            time_considerations?: {
              best_window?: string;
              avoid_window?: string;
              weather_check?: string;
            };
            exit_strategy?: {
              natural_close?: string;
              followup_anchor?: string;
            };
          }>;
        }>(raw) ?? {};

        // Server-side validation: keep only venue_options whose
        // venue_id is in our candidate set. This defends against
        // the LLM hallucinating UUIDs.
        const candidateIds = new Set(candidates.map((v) => v.id));
        const validatedPlans = (parsed.multi_plan ?? []).map((plan) => ({
          ...plan,
          venue_options: (plan.venue_options ?? []).filter(
            (vo) => typeof vo.venue_id === "string" && candidateIds.has(vo.venue_id),
          ),
        }));

        // Build a venue-by-id lookup for the client (avoids a second
        // roundtrip from the SPA).
        const venueById = Object.fromEntries(candidates.map((v) => [v.id, v]));

        // Fallback when DeepSeek is down — try to reflect the user's
        // actual input + city instead of the generic coffee shop string.
        const userInput = (myProfile?.profile_data as { input?: string } | null)?.input ?? "";
        const interests = extractInterests(userInput);
        const fallbackVenue = fallbackVenueName(myCity, interests, llmLang);

        const next = new Date();
        next.setUTCDate(next.getUTCDate() + 3);
        next.setUTCHours(19, 0, 0, 0);
        const fallback = {
          multi_plan: [
            {
              id: "A",
              label: lang === "en" ? "Quiet" : "安静型",
              description: lang === "en" ? "For your slow-burn rhythm" : "适合你们慢热的节奏",
              venue_options: candidates.slice(0, 1).map((v) => ({
                venue_id: v.id,
                why: fallbackVenue ?? (lang === "en" ? "Quiet, conducive to depth conversation" : "环境安静，便于深度交谈"),
                distance_walking_minutes: 10,
              })),
              activity_design: {
                why_this_activity: lang === "en" ? "Both introverted" : "两人都是慢热型",
                flow: {
                  "0_30_min": lang === "en" ? "Order, find a seat, start from the menu" : "点单，找位子，从菜单聊起",
                  "30_60_min": lang === "en" ? "Talk about what excites you lately" : "聊近期最让你兴奋的事",
                  "60_90_min": lang === "en" ? "Wrap up, plan next time" : "自然地收，约定下次",
                },
                backup_if_bored: lang === "en" ? "Switch topic: childhood food" : "换话题：童年食物",
              },
              time_considerations: {
                best_window: lang === "en" ? "Wed-Fri 7-8:30pm" : "周三到周五 19:00-20:30",
                avoid_window: lang === "en" ? "Monday morning" : "周一早上",
                weather_check: lang === "en" ? "Indoor" : "室内",
              },
              exit_strategy: {
                natural_close: lang === "en" ? "If it feels off, mention another commitment" : "感觉不对就以'还有事'为由",
                followup_anchor: lang === "en" ? "Plan another coffee this weekend" : "约 ta 周末再喝一杯",
              },
            },
          ],
        };

        const plan_content = {
          version: "v3",
          scenario: match.scenario,
          city: myCity,
          ai: validatedPlans.length > 0 ? { multi_plan: validatedPlans } : fallback,
          ai_provider: validatedPlans.length > 0 ? "deepseek" : "fallback",
          venue_lookup: venueById, // client uses this to render
          generated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from("meet_plans")
          .insert({ match_id, plan_content: plan_content as never })
          .select("*")
          .single();

        if (error) return json({ error: safeError(error) }, { status: 500 }, request);
        return json({ data, message: "Meet-up plan generated" }, undefined, request);
      },
    },
  },
});
