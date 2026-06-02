import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { json, preflight, requireUser } from "@/lib/api/_helpers.server";
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
      OPTIONS: async () => preflight(),
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
          return json({ error: "Generate your profile first" }, { status: 400 });
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

        // 4) DeepSeek: pick best match + craft meeting plan in one call.
        const sys =
          "你是 linQ 的 AI 匹配引擎。根据 A 的画像，从候选人中挑选最匹配的一位，并生成匹配理由与首次见面方案。严格输出 JSON，不要 markdown。";
        const prompt = `场景: ${SCENARIO_LABEL[scenario]}
A 的画像: ${JSON.stringify(latestProfile.profile_data)}

候选人列表（编号从 0 开始）:
${candidates.map((c, i) => `[${i}] ${JSON.stringify(c.profile_data)}`).join("\n")}

输出 JSON：
{
  "best_index": number,
  "match_score": number,
  "name": string,
  "headline": string,
  "bio": string,
  "shared_interests": string[],
  "reason": string,
  "meet_plan": {
    "when": string,
    "where": string,
    "dress_code": string,
    "icebreakers": string[]
  }
}
全部用中文表达。match_score 在 60-99 之间，两位小数。meet_plan.when 在未来 7 天内，含星期与具体时段；where 含城市与场所类型；icebreakers 提供 3 条破冰开场话术。`;

        const raw = await deepseekChat(
          [
            { role: "system", content: sys },
            { role: "user", content: prompt },
          ],
          { json: true, temperature: 0.85, max_tokens: 1600 },
        );
        type ParsedT = {
          best_index?: number;
          match_score?: number;
          name?: string;
          headline?: string;
          bio?: string;
          shared_interests?: string[];
          reason?: string;
          meet_plan?: {
            when?: string;
            where?: string;
            dress_code?: string;
            icebreakers?: string[];
          };
        };
        const parsed = safeParseJSON<ParsedT>(raw) ?? {};
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
          dress_code: "简洁舒适的休闲风",
          icebreakers: [
            "最近让你感到兴奋的一件事是什么？",
            "如果可以教别人一小时课，你会教什么？",
            "你最近做过的最满意的事是什么？",
          ],
        };

        const details = {
          name: parsed.name ?? "匹配对象",
          headline: parsed.headline ?? "",
          bio: parsed.bio ?? "",
          shared_interests: Array.isArray(parsed.shared_interests)
            ? parsed.shared_interests
            : [],
          reason: parsed.reason ?? "",
          is_real_user: true,
          ai_provider: raw ? "deepseek" : "fallback",
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
        if (insErr) return json({ error: insErr.message }, { status: 500 });

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

function renderPlanHtml(p: {
  when?: string;
  where?: string;
  dress_code?: string;
  icebreakers?: string[];
}): string {
  const ice = (p.icebreakers ?? [])
    .map((s) => `<li style="margin:4px 0">${escapeHtml(s)}</li>`)
    .join("");
  return `<!doctype html><html lang="zh"><body style="margin:0;padding:24px;background:#f7f7f8;font-family:-apple-system,Helvetica,Arial,sans-serif;color:#111">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e5e7;border-radius:10px;padding:32px">
    <h2 style="margin:0 0 12px;font-size:20px">【linQ】您的专属见面方案已生成</h2>
    <p style="margin:0 0 16px;line-height:1.7">恭喜您匹配成功！根据双方画像，linQ 为您定制完整赴约计划：</p>
    <ol style="line-height:1.9;padding-left:20px;margin:0 0 16px">
      <li><b>建议会面时间：</b>${escapeHtml(p.when ?? "")}</li>
      <li><b>推荐碰面地点：</b>${escapeHtml(p.where ?? "")}</li>
      <li><b>着装 Dress Code：</b>${escapeHtml(p.dress_code ?? "")}</li>
      <li><b>破冰聊天话术：</b><ul style="padding-left:18px;margin:6px 0">${ice}</ul></li>
    </ol>
    <p style="margin:0 0 16px;line-height:1.7">可依托方案轻松线下见面，开启事业 / 恋爱 / 兴趣新联结。</p>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
    <p style="margin:0;color:#888;font-size:12px">来自：linQ | claudematch.com</p>
  </div></body></html>`;
}

function renderPlanText(p: {
  when?: string;
  where?: string;
  dress_code?: string;
  icebreakers?: string[];
}): string {
  const ice = (p.icebreakers ?? [])
    .map((s, i) => `   ${i + 1}) ${s}`)
    .join("\n");
  return `【linQ】您的专属见面方案已生成

恭喜您匹配成功！根据双方画像，linQ 为您定制完整赴约计划：
1. 建议会面时间：${p.when ?? ""}
2. 推荐碰面地点：${p.where ?? ""}
3. 着装 Dress Code：${p.dress_code ?? ""}
4. 破冰聊天话术：
${ice}

可依托方案轻松线下见面，开启事业 / 恋爱 / 兴趣新联结。
来自：linQ | claudematch.com`;
}