import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { json, preflight, requireUser, safeError } from "@/lib/api/_helpers.server";
import { deepseekChat, safeParseJSON } from "@/lib/api/_deepseek.server";

const VALID_SCENARIOS = new Set(["business", "dating", "partner"]);
const SCENARIO_LABEL: Record<string, string> = {
  dating: "恋爱",
  business: "事业合作",
  partner: "兴趣搭子",
};

/**
 * POST /api/ai/match — strict 1:1 real-user matching.
 * - Picks the best real user (DeepSeek scored) from other users who authorized
 *   the same scenario and have a profile.
 * - If none, enqueues the requester to `waitlist` and returns waitlisted=true.
 * - On success: creates a match for both sides, generates a meet plan via
 *   DeepSeek, persists to `meet_plans`, and emails the linQ plan to both
 *   users' registered addresses.
 */
export const Route = createFileRoute("/api/ai/match")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const { userId, supabase } = auth;

        let body: { scenario?: unknown; lang?: unknown } = {};
        try {
          body = await request.json();
        } catch {
          /* allow empty body */
        }
        const scenario =
          typeof body.scenario === "string" && VALID_SCENARIOS.has(body.scenario)
            ? (body.scenario as "business" | "dating" | "partner")
            : "dating";

        // 1) Load my latest AI profile and registered email.
        const { data: latestProfile } = await supabase
          .from("user_profiles")
          .select("profile_data, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!latestProfile) {
          return json({ error: "Generate your profile first" }, { status: 400 }, request);
        }
        const { data: meUser } = await supabaseAdmin.auth.admin.getUserById(userId);
        const myEmail = meUser?.user?.email ?? "";

        // 2) Find authorized real candidates (admin bypasses RLS for discovery).
        const { data: authed } = await supabaseAdmin
          .from("user_authorizations")
          .select("user_id")
          .eq(scenario, true)
          .neq("user_id", userId);
        const candidateIds = (authed ?? []).map((c) => c.user_id);

        // Exclude users I'm already matched with for this scenario.
        let excluded = new Set<string>();
        if (candidateIds.length) {
          const { data: prev } = await supabaseAdmin
            .from("matches")
            .select("matched_user_id")
            .eq("user_id", userId)
            .eq("scenario", scenario)
            .in("matched_user_id", candidateIds);
          excluded = new Set((prev ?? []).map((r) => r.matched_user_id));
        }
        const availableIds = candidateIds.filter((id) => !excluded.has(id));

        // Fetch latest profile per available candidate.
        type Cand = { user_id: string; profile_data: unknown };
        const candidates: Cand[] = [];
        if (availableIds.length) {
          const { data: profs } = await supabaseAdmin
            .from("user_profiles")
            .select("user_id, profile_data, created_at")
            .in("user_id", availableIds)
            .order("created_at", { ascending: false });
          const seen = new Set<string>();
          for (const p of profs ?? []) {
            if (!seen.has(p.user_id)) {
              seen.add(p.user_id);
              candidates.push({ user_id: p.user_id, profile_data: p.profile_data });
            }
          }
        }

        // 3) No real candidate → add to waitlist.
        if (candidates.length === 0) {
          if (myEmail) {
            await supabaseAdmin.from("waitlist").insert({
              email: myEmail,
              status: `waiting:${scenario}`,
            });
          }
          return json({
            data: [],
            waitlisted: true,
            scenario,
            message: "暂无匹配，已加入等待池，待有合适人选时我们将通过邮件通知您。",
          });
        }

        // 4) DeepSeek: pick best match + craft meeting plan + give deep
        // 5-axis analysis (resonance / complementarity / friction /
        // chemistry / growth). The previous version of this prompt only
        // asked for a single `reason` field which produced surface-level
        // "you both like X" outputs. The 5-axis split forces the model
        // to think about each layer of compatibility independently.
        //
        // v4: two-round pipeline. Round 1 = the 5-axis analysis + meet plan
        // (the same as v3 but bigger). Round 2 = timeline / conversation
        // arc / follow-up / paradox resolution. Splitting these rounds
        // forces the model to do *separate* reasoning for each rather
        // than collapsing them into one shallow paragraph.
        const sys =
          "你是 linQ 的 AI 匹配引擎 —— 一个比任何交友 App 都更懂关系的角色。\n\n任务：\n1. 从候选人中挑出最匹配的 1 位\n2. 不仅写「匹配理由」(那是 surface)，要分析 5 个层面：\n   - resonance（共鸣）—— 表面上的共同点之外的深层契合\n   - complementarity（互补）—— 哪里互相补足\n   - friction（摩擦）—— 哪里会起冲突（必须真实，不回避）\n   - chemistry（化学反应）—— 见面头 10 分钟会发生什么\n   - growth（成长）—— 6 个月后你们会让对方变成什么样\n3. 生成详细的首次见面方案（meet_plan）\n\n不要'表面贴合'。要写出让人'这说的就是我'的感受。严格输出 JSON。";
        const prompt = `场景: ${SCENARIO_LABEL[scenario]}
A 的画像: ${JSON.stringify(latestProfile.profile_data)}

候选人列表（编号从 0 开始）:
${candidates.map((c, i) => `[${i}] ${JSON.stringify(c.profile_data)}`).join("\n")}

输出 JSON：
{
  "best_index": number,
  "match_score": number (60-99, 两位小数),
  "name": string (对方画像里的名字或昵称),
  "headline": string (10-20 字符画像标签),
  "bio": string (一段 60-100 字的画像描写 —— 不是简历，是让 A 看了能"看到"对方的一段文字),
  "summary": string (1-2 句 30-50 字的极简总结，用于 detail 页的卡片开头 —— 要让人"一眼就懂这段关系"),
  "resonance": string[] (共鸣点 —— 3-5 条，**每条必须展示深层契合而非关键词重合**，例如"你们的孤独感来自同一处：不被理解的精确性，而不是不被看见的本身"),
  "complementarity": string[] (互补点 —— 3 条，**具体到 ta 的哪种特质补了你的哪种缺口**),
  "friction": string[] (摩擦点 —— 2-3 条，**真实存在的潜在冲突点**，例如"你们都会在压力下沉默，初期这会变成'两个人都不开口'的僵局"),
  "chemistry": {
    "first_10_minutes": string (见面头 10 分钟会发生什么 —— 谁先开口、会聊什么、空气是舒服还是紧绷),
    "the_unspoken": string (双方不会说出口但都会感觉到的那种东西，例如"你感觉到 ta 在用问题测你"或"ta 比你预期更紧张")
  },
  "growth": {
    "in_6_months": string (6 个月后你们会让对方变成什么样 —— 改变、保留、风险),
    "the_third_thing": string (你们在一起后会产生的'第三个东西'，不属于你也不属于 ta，而是关系本身的新产物，例如'一种你们都说不出来但都喜欢的生活方式'")
  },
  "compatibility_breakdown": {
    "resonance": number (0-100, 共鸣强度),
    "complementarity": number (0-100, 互补强度),
    "friction_risk": number (0-100, 摩擦风险，**这个数值越低越好**),
    "chemistry": number (0-100, 化学反应强度),
    "growth_potential": number (0-100, 成长潜力)
  },
  "shared_interests": string[] (3-6 个共同兴趣标签),
  "meet_plan": {
    "when": string (未来 7 天内,含星期与具体时段),
    "where": string (城市 + 具体场所类型/名称示例),
    "location_intro": string (30 字以内场所简介),
    "dress_code": string (着装建议),
    "icebreakers": string[] (3 条破冰开场话术,带'如果 ta 看起来有点紧张'的考虑),
    "duration": string (建议会面时长,如"60-90 分钟"),
    "budget": string (人均消费参考),
    "pitfalls": string[] (3 条沟通避坑提醒,针对**这两人**的具体场景),
    "highlights": string[] (3 条双方适配亮点,带具体场景)
  }
}
全部用中文表达。`;

        const raw = await deepseekChat(
          [
            { role: "system", content: sys },
            { role: "user", content: prompt },
          ],
          { json: true, temperature: 0.9, max_tokens: 2400 },
        );
        const parsed = safeParseJSON<ParsedT>(raw) ?? {};

        // ============================================================
        // ROUND 2 (v4) — Deep temporal + interaction analysis
        //   - paradox_resolution: how B's presence specifically addresses
        //     A's paradoxes (drawn from the latest profile data on A)
        //   - timeline: 3-month / 6-month / 1-year projection
        //   - conversation_arc: the 30-minute first-meeting flow
        //   - follow_up_strategy: day_1 / week_1 / month_1
        // ============================================================
        const deepSys = lang === "zh"
          ? `你是 linQ 的关系动力学引擎。

任务：基于 A 的画像（包括 ta 的矛盾）和被选中的候选人 B 的画像，分析：
1. A 的某个具体矛盾在 B 身上是怎么被松动/解决的（**不是泛泛的"我们互补"**）
2. 关系在 3 个月 / 6 个月 / 1 年的演化轨迹（具体到会经历什么阶段）
3. 第一次见面的 30 分钟对话流程（**不是 3 个破冰话术**，是分段流程：前 5 分钟/5-15/15-25/25-30）
4. 见面后的跟进策略（**不是"保持联系"这种废话**，是 day 1/week 1/month 1 各自怎么操作）

**关键要求**：
- 所有内容**必须具体到这两个人** —— 不写"保持真诚"这种泛泛建议
- 跟进策略**考虑 A 的防御机制和 B 的沟通风格**（来自两人画像）
- 第一次见面流程**考虑 A 的场景化行为预测**（ta 在陌生场合会怎么反应）
- 关系时间线**考虑 A 的成长阶段**（如果 A 在"探索期"，3 个月后可能还在探索中）

严格输出 JSON。`
          : `You are linQ's relationship dynamics engine.

Task: based on A's profile (including ta's paradoxes) and selected candidate B's profile, analyze:
1. How B's presence specifically loosens/solves one of A's paradoxes (NOT generic 'we complement each other')
2. Relationship trajectory at 3 months / 6 months / 1 year
3. First-meeting 30-minute conversation flow (NOT 3 icebreaker questions — segmented flow: 0-5 / 5-15 / 15-25 / 25-30 min)
4. Post-meeting follow-up strategy (NOT 'keep in touch' — specific day 1 / week 1 / month 1 actions)

Critical: all output must be specific to these two people.
Strict JSON output.`;

        const deepUserPrompt = lang === "zh"
          ? `A 的画像：${JSON.stringify(latestProfile.profile_data, null, 2)}
被选中的 B (候选 ${parsed.best_index ?? 0})：${JSON.stringify(candidates[Math.max(0, Math.min(candidates.length - 1, Number(parsed.best_index ?? 0)))]?.profile_data, null, 2)}

请输出 v4 字段 JSON：
{
  "paradox_resolution": {
    "a_paradox": "A 的一个具体矛盾（**用 A 画像里 paradoxes 数组里的某条**，不是新造的）",
    "how_b_resolves": "B 是怎么让这个矛盾松动的（**具体到 B 的哪种行为/特质/沟通方式起了作用**，不是泛泛的'B 会理解'）",
    "why": "为什么 B 能解决（**基于两人画像具体推论**）"
  },
  "timeline": [
    {
      "phase": "3_months",
      "what_happens": "3 个月后关系大概是什么状态（具体会经历什么）",
      "signals_to_watch": "关注哪些信号判断是否健康（**不是泛泛的'注意沟通'**）"
    },
    { "phase": "6_months", "what_happens": "...", "signals_to_watch": "..." },
    { "phase": "1_year", "what_happens": "...", "signals_to_watch": "..." }
  ],
  "conversation_arc": {
    "opening": "前 5 分钟：谁先开口、会说什么、空气是舒服还是紧绷（**考虑 A 的 scene_predictions 中的'在咖啡馆遇到陌生人'那种场景**）",
    "warming": "5-15 分钟：聊什么会让双方都放松（**避开 A 的 defense_mechanisms 触发的雷区**）",
    "depth": "15-25 分钟：哪个话题能让 ta 说出真话（**用 A 的 communication_recipes 中的'想表达好感时'反向推——什么话题 ta 会最放松）",
    "closing": "25-30 分钟：怎么自然结束不尴尬（**给 A 一个具体的'结束信号'和'下一步约定'**）"
  },
  "follow_up_strategy": {
    "day_1": "当晚怎么发消息（**具体到用什么开场、避免什么话题、聊多久**）",
    "week_1": "第一周怎么维持节奏（**不要泛泛的'保持联系'——具体到第几天做什么、什么时间发、聊什么**）",
    "month_1": "第一个月怎么判断是否继续（**具体到看哪些信号、看 B 的哪种行为意味着 ta 也有兴趣**）"
  }
}`
          : `A's profile: ${JSON.stringify(latestProfile.profile_data, null, 2)}
Selected B (candidate ${parsed.best_index ?? 0}): ${JSON.stringify(candidates[Math.max(0, Math.min(candidates.length - 1, Number(parsed.best_index ?? 0)))]?.profile_data, null, 2)}

Output v4 fields JSON:
{
  "paradox_resolution": { "a_paradox": "...", "how_b_resolves": "...", "why": "..." },
  "timeline": [
    { "phase": "3_months", "what_happens": "...", "signals_to_watch": "..." },
    { "phase": "6_months", "what_happens": "...", "signals_to_watch": "..." },
    { "phase": "1_year", "what_happens": "...", "signals_to_watch": "..." }
  ],
  "conversation_arc": { "opening": "...", "warming": "...", "depth": "...", "closing": "..." },
  "follow_up_strategy": { "day_1": "...", "week_1": "...", "month_1": "..." }
}`;

        const deepRaw = await deepseekChat(
          [
            { role: "system", content: deepSys },
            { role: "user", content: deepUserPrompt },
          ],
          { json: true, temperature: 0.9, max_tokens: 2000 },
        );
        const deep = safeParseJSON<{
          paradox_resolution?: {
            a_paradox?: string;
            how_b_resolves?: string;
            why?: string;
          };
          timeline?: Array<{ phase: string; what_happens?: string; signals_to_watch?: string }>;
          conversation_arc?: {
            opening?: string;
            warming?: string;
            depth?: string;
            closing?: string;
          };
          follow_up_strategy?: {
            day_1?: string;
            week_1?: string;
            month_1?: string;
          };
        }>(deepRaw) ?? {};
        type ParsedT = {
          best_index?: number;
          match_score?: number;
          name?: string;
          headline?: string;
          bio?: string;
          summary?: string;
          shared_interests?: string[];
          resonance?: string[];
          complementarity?: string[];
          friction?: string[];
          chemistry?: {
            first_10_minutes?: string;
            the_unspoken?: string;
          };
          growth?: {
            in_6_months?: string;
            the_third_thing?: string;
          };
          compatibility_breakdown?: {
            resonance: number;
            complementarity: number;
            friction_risk: number;
            chemistry: number;
            growth_potential: number;
          };
          reason?: string;
          meet_plan?: {
            when?: string;
            where?: string;
            location_intro?: string;
            dress_code?: string;
            icebreakers?: string[];
            duration?: string;
            budget?: string;
            pitfalls?: string[];
            highlights?: string[];
          };
        };
        const _typedParsed: ParsedT = parsed;
        const bestIdx = Math.max(
          0,
          Math.min(candidates.length - 1, Number(parsed.best_index ?? 0)),
        );
        const matched = candidates[bestIdx];
        const score =
          typeof parsed.match_score === "number" ? parsed.match_score : 82.5;

        const plan = parsed.meet_plan ?? {
          when: "本周六下午 3:00",
          where: "市中心一家安静的精品咖啡馆",
          location_intro: "环境安静、便于深度交谈的独立精品咖啡馆。",
          dress_code: "简洁舒适的休闲风",
          icebreakers: [
            "最近让你感到兴奋的一件事是什么？",
            "如果可以教别人一小时课，你会教什么？",
            "你最近做过的最满意的事是什么？",
          ],
          duration: "60-90 分钟",
          budget: "人均 80-150 元",
          pitfalls: [
            "避免一上来就聊敏感隐私话题",
            "避免长时间单方面输出，多倾听",
            "避免过早讨论金钱与得失评价",
          ],
          highlights: [
            "节奏与生活方式高度契合",
            "兴趣与价值观存在天然交集",
            "彼此能在对方擅长领域获得启发",
          ],
        };

        const details = {
          name: parsed.name ?? "匹配对象",
          headline: parsed.headline ?? "",
          bio: parsed.bio ?? "",
          summary: parsed.summary ?? parsed.bio?.slice(0, 60) ?? "",
          shared_interests: Array.isArray(parsed.shared_interests)
            ? parsed.shared_interests
            : [],
          // v3 deep analysis
          resonance: Array.isArray(parsed.resonance) ? parsed.resonance : [],
          complementarity: Array.isArray(parsed.complementarity) ? parsed.complementarity : [],
          friction: Array.isArray(parsed.friction) ? parsed.friction : [],
          chemistry: {
            first_10_minutes: parsed.chemistry?.first_10_minutes ?? "",
            the_unspoken: parsed.chemistry?.the_unspoken ?? "",
          },
          growth: {
            in_6_months: parsed.growth?.in_6_months ?? "",
            the_third_thing: parsed.growth?.the_third_thing ?? "",
          },
          compatibility_breakdown: parsed.compatibility_breakdown ?? null,
          // v4 deep analysis
          paradox_resolution: deep.paradox_resolution ?? null,
          timeline: Array.isArray(deep.timeline) ? deep.timeline : [],
          conversation_arc: deep.conversation_arc ?? null,
          follow_up_strategy: deep.follow_up_strategy ?? null,
          // legacy (back-compat with /match detail page that may still read it)
          reason: parsed.reason ?? "",
          is_real_user: true,
          ai_provider: raw ? "deepseek-2round" : "fallback",
        };

        // 5) Persist match for requester + reverse row for the matched user.
        const { data: myMatch, error: insErr } = await supabase
          .from("matches")
          .insert({
            user_id: userId,
            matched_user_id: matched.user_id,
            match_score: score,
            scenario,
            details: details as never,
          })
          .select("*")
          .single();
        if (insErr) return json({ error: safeError(insErr) }, { status: 500 }, request);

        await supabaseAdmin.from("matches").insert({
          user_id: matched.user_id,
          matched_user_id: userId,
          match_score: score,
          scenario,
          details: { ...details, name: "您的匹配对象" } as never,
        });

        // 6) Persist meet plan.
        const plan_content = {
          version: "v1",
          scenario,
          ai: plan,
          ai_provider: raw ? "deepseek" : "fallback",
          generated_at: new Date().toISOString(),
        };
        const { data: planRow } = await supabaseAdmin
          .from("meet_plans")
          .insert({ match_id: myMatch.id, plan_content: plan_content as never })
          .select("*")
          .single();

        // 7) Email both users via the transactional queue.
        const { data: otherUser } = await supabaseAdmin.auth.admin.getUserById(
          matched.user_id,
        );
        const otherEmail = otherUser?.user?.email ?? "";
        const html = renderPlanHtml(plan);
        const text = renderPlanText(plan);

        for (const to of [myEmail, otherEmail].filter(Boolean)) {
          const messageId = crypto.randomUUID();
          await supabaseAdmin.from("email_send_log").insert({
            message_id: messageId,
            template_name: "meet_plan",
            recipient_email: to,
            status: "pending",
          });
          await supabaseAdmin.rpc("enqueue_email", {
            queue_name: "transactional_emails",
            payload: {
              message_id: messageId,
              to,
              from: "linQ <noreply@claudematch.com>",
              sender_domain: "notify.claudematch.com",
              subject: "【linQ】您的专属见面方案已生成",
              html,
              text,
              purpose: "transactional",
              label: "meet_plan",
              queued_at: new Date().toISOString(),
            },
          });
        }

        return json({
          data: [myMatch],
          plan: planRow,
          waitlisted: false,
          scenario,
          message: "匹配成功，见面方案已发送至双方邮箱。",
        });
      },
    },
  },
});

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

type PlanForEmail = {
  when?: string;
  where?: string;
  location_intro?: string;
  dress_code?: string;
  icebreakers?: string[];
  duration?: string;
  budget?: string;
  pitfalls?: string[];
  highlights?: string[];
};

function liList(items?: string[]): string {
  return (items ?? [])
    .map((s) => `<li style="margin:4px 0">${escapeHtml(s)}</li>`)
    .join("");
}

function renderPlanHtml(p: PlanForEmail): string {
  return `<!doctype html><html lang="zh"><body style="margin:0;padding:24px;background:#f7f7f8;font-family:-apple-system,Helvetica,Arial,sans-serif;color:#111">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e5e7;border-radius:10px;padding:32px">
    <h2 style="margin:0 0 12px;font-size:20px">【linQ】您的专属见面方案已生成</h2>
    <p style="margin:0 0 16px;line-height:1.7">恭喜您匹配成功！根据双方画像，linQ 为您定制完整赴约计划：</p>
    <ol style="line-height:1.9;padding-left:20px;margin:0 0 16px">
      <li><b>推荐会面时间：</b>${escapeHtml(p.when ?? "")}</li>
      <li><b>精准碰面地点：</b>${escapeHtml(p.where ?? "")}${p.location_intro ? `<div style="color:#666;font-size:13px;margin-top:2px">${escapeHtml(p.location_intro)}</div>` : ""}</li>
      <li><b>着装 Dress Code：</b>${escapeHtml(p.dress_code ?? "")}</li>
      <li><b>破冰开场话术：</b><ul style="padding-left:18px;margin:6px 0">${liList(p.icebreakers)}</ul></li>
      <li><b>建议会面时长：</b>${escapeHtml(p.duration ?? "")}</li>
      <li><b>人均消费参考：</b>${escapeHtml(p.budget ?? "")}</li>
      <li><b>沟通避坑提醒：</b><ul style="padding-left:18px;margin:6px 0">${liList(p.pitfalls)}</ul></li>
      <li><b>双方适配亮点：</b><ul style="padding-left:18px;margin:6px 0">${liList(p.highlights)}</ul></li>
    </ol>
    <p style="margin:0 0 16px;line-height:1.7">可依托方案轻松线下见面，开启事业 / 恋爱 / 兴趣新联结。</p>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
    <p style="margin:0;color:#888;font-size:12px">来自：linQ | claudematch.com</p>
  </div></body></html>`;
}

function numList(items?: string[]): string {
  return (items ?? []).map((s, i) => `   ${i + 1}) ${s}`).join("\n");
}

function renderPlanText(p: PlanForEmail): string {
  return `【linQ】您的专属见面方案已生成

恭喜您匹配成功！根据双方画像，linQ 为您定制完整赴约计划：
1. 推荐会面时间：${p.when ?? ""}
2. 精准碰面地点：${p.where ?? ""}${p.location_intro ? `（${p.location_intro}）` : ""}
3. 着装 Dress Code：${p.dress_code ?? ""}
4. 破冰开场话术：
${numList(p.icebreakers)}
5. 建议会面时长：${p.duration ?? ""}
6. 人均消费参考：${p.budget ?? ""}
7. 沟通避坑提醒：
${numList(p.pitfalls)}
8. 双方适配亮点：
${numList(p.highlights)}

可依托方案轻松线下见面，开启事业 / 恋爱 / 兴趣新联结。
来自：linQ | claudematch.com`;
}