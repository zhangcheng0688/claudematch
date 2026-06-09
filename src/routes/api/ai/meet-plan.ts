import { createFileRoute } from "@tanstack/react-router";
import { json, preflight, requireUser, safeError } from "@/lib/api/_helpers.server";
import { deepseekChat, safeParseJSON } from "@/lib/api/_deepseek.server";

/**
 * POST /api/ai/meet-plan
 * Body: { match_id: string, lang?: "en" | "zh" }
 *
 * v2 — multi-plan + activity design + venue templates + exit strategy.
 * Returns 3 alternative plans (A: quiet, B: interactive, C: balanced) so
 * the user can pick. Each plan includes venue_options, activity_design,
 * time_considerations, and exit_strategy. All grounded in the two
 * participants' profiles.
 */

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
        const lang = body.lang === "zh" ? "zh" : "en";
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

        const sys = lang === "zh"
          ? `你是 linQ 的 AI 见面策划师 —— 一个比朋友更懂这两人的角色。

任务：为这对匹配设计 **3 套备选见面方案**（plan A / B / C），让用户能选。

A = 安静型：偏向独立场所、轻互动、深度交流
B = 互动型：偏向有共同参与的活动、活跃氛围、边做边聊
C = 折中型：兼有两类元素

每套方案必须包含：
- venue_options：3-4 个具体场所建议（含类型/区域/为什么/价格档/距离）
- activity_design：基于两人画像的活动设计（**不要泛泛的"喝咖啡"**——是"你们俩都内向，所以选一个能并行做事但不时被强迫说话的地方"）
- time_considerations：最佳时间窗口/避免时间
- exit_strategy：怎么体面结束 + 怎么留下"下一步约定"

**关键**：
- 方案设计必须**基于两人画像的细节**（不是"看天气"、"看预算"这种空话）
- venue_options 的"为什么"必须**对得上两人的具体特质**
- exit_strategy 不能是"说再见然后走"——要具体到"如果你感觉到 ta 在 60 分钟就开始看手机，你应该怎么接住这个信号"

严格输出 JSON。`
          : `You are linQ's AI meet-up planner — a role that knows these two people better than their friends do.

Task: design 3 alternative meet-up plans (A / B / C) for this match, so the user can pick.

A = quiet type: independent venues, light interaction, depth conversation
B = interactive type: shared activity, lively atmosphere, doing-while-talking
C = balanced type: mix of both

Each plan must include:
- venue_options: 3-4 specific venue suggestions (type/area/why/price level/distance)
- activity_design: activity designed for these two profiles specifically
- time_considerations: best window / avoid window
- exit_strategy: how to end gracefully + how to anchor the next step

Critical: every design decision must be grounded in both participants' profiles.
Strict JSON output.`;

        const prompt = `Scenario: ${match.scenario}
Match details: ${JSON.stringify(match.details, null, 2)}

Return JSON of shape:
{
  "multi_plan": [
    {
      "id": "A" | "B" | "C",
      "label": "标签（"安静型" / "互动型" / "折中型"）",
      "description": "1 句描述（"适合你们的节奏"）",
      "venue_options": [
        {
          "name_example": "具体场所名（如'xx 区 yy 路某品牌精品咖啡'）",
          "district": "城市区域",
          "why": "为什么这个场所适合这两人（**具体到两人特质**）",
          "distance_walking_minutes": number (从双方中点步行分钟数),
          "price_level": "¥¥" (人均价格档)
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
${lang === "zh" ? "全部用中文表达" : "Express in English"}.`;

        const raw = await deepseekChat(
          [
            { role: "system", content: sys },
            { role: "user", content: prompt },
          ],
          { json: true, temperature: 0.9, max_tokens: 2400 },
        );

        const parsed = safeParseJSON<{
          multi_plan?: Array<{
            id?: string;
            label?: string;
            description?: string;
            venue_options?: Array<{
              name_example?: string;
              district?: string;
              why?: string;
              distance_walking_minutes?: number;
              price_level?: string;
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

        // Fallback when DeepSeek is down
        const next = new Date();
        next.setUTCDate(next.getUTCDate() + 3);
        next.setUTCHours(19, 0, 0, 0);
        const fallback = {
          multi_plan: [
            {
              id: "A",
              label: lang === "zh" ? "安静型" : "Quiet",
              description: lang === "zh" ? "适合你们慢热的节奏" : "For your slow-burn rhythm",
              venue_options: [
                {
                  name_example: lang === "zh" ? "市中心一家精品咖啡馆" : "A specialty coffee bar downtown",
                  district: lang === "zh" ? "市中心" : "Downtown",
                  why: lang === "zh" ? "环境安静，便于深度交谈" : "Quiet, conducive to depth conversation",
                  distance_walking_minutes: 10,
                  price_level: "¥¥",
                },
              ],
              activity_design: {
                why_this_activity: lang === "zh" ? "两人都是慢热型" : "Both introverted",
                flow: {
                  "0_30_min": lang === "zh" ? "点单，找位子，从菜单聊起" : "Order, find a seat, start from the menu",
                  "30_60_min": lang === "zh" ? "聊近期最让你兴奋的事" : "Talk about what excites you lately",
                  "60_90_min": lang === "zh" ? "自然地收，约定下次" : "Wrap up, plan next time",
                },
                backup_if_bored: lang === "zh" ? "换话题：童年食物" : "Switch topic: childhood food",
              },
              time_considerations: {
                best_window: lang === "zh" ? "周三到周五 19:00-20:30" : "Wed-Fri 7-8:30pm",
                avoid_window: lang === "zh" ? "周一早上" : "Monday morning",
                weather_check: lang === "zh" ? "室内" : "Indoor",
              },
              exit_strategy: {
                natural_close: lang === "zh" ? "感觉不对就以'还有事'为由" : "If it feels off, mention another commitment",
                followup_anchor: lang === "zh" ? "约 ta 周末再喝一杯" : "Plan another coffee this weekend",
              },
            },
          ],
        };

        const plan_content = {
          version: "v2",
          scenario: match.scenario,
          ai: parsed.multi_plan ? parsed : fallback,
          ai_provider: parsed.multi_plan ? "deepseek" : "fallback",
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
