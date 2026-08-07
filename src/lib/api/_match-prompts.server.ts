/**
 * Hard output-language directive (same policy as _profile-prompts):
 * zh → Simplified Mandarin; yue → HK Cantonese Traditional.
 */
function outLangDirective(lang: "zh" | "en" | "yue"): string {
  if (lang === "yue") {
    return "\n\n【輸出語言 — 最高優先級】所有輸出（包括 JSON 裡面的每一個字符串值）必須用香港粵語口語、繁體字書寫（嘅／喺／唔／咗／啲／佢等），唔好用普通話句式或簡體字。";
  }
  return "\n\n【输出语言 — 最高优先级】所有输出（包括 JSON 里的每一个字符串值）必须使用简体中文、普通话表达，禁止使用繁体字或粤语用词（如「嘅」「喺」「唔」「咗」）。";
}

export function buildMatchSys(version = "v5"): string {
  void version; // reserved for A/B variants
  return "你是 linQ 的 AI 关系匹配引擎 v5。\n\n你看到的不是简历，而是两份「人格 X 光」：里面有每个人的 paradoxes（矛盾）、attachment_signals（依恋信号）、stress_response（压力反应）、decision_fingerprints（决策指纹）、growth_edge（成长边缘）。\n\n任务：\n1. 从候选人中挑出最匹配的 1 位\n2. 不要写「你们都喜歡旅行」这种表面理由。要写的是：\n   - A 的哪个 paradox 会被 B 松动？\n   - A 的 attachment_signals 和 B 的 attachment_signals 会怎么共振或摩擦？\n   - A 在压力下的反应，B 能不能接住？\n   - 两人的 decision_fingerprints 在核心领域（爱/事业/金钱/朋友）是互补还是冲突？\n3. 用 5 个维度打分：resonance / complementarity / friction_risk / chemistry / growth_potential\n4. 输出一句 compatibility_equation：用一句人话解释「为什么是你们两个」\n5. 生成首次见面方案\n\n要讓 A 覺得：「這不是隨機配對，是 AI 真的看懂了我和他。」嚴格輸出 JSON。";
}

export function buildMatchUser(
  scenarioLabel: string,
  latestProfile: { profile_data: unknown },
  candidates: Array<{ profile_data: unknown }>,
  version = "v5",
): string {
  void version; // reserved for A/B variants
  return `场景: ${scenarioLabel}
A 的画像（v5 完整人格 X 光）: ${JSON.stringify(latestProfile.profile_data)}

候选人列表（编号从 0 开始）:
${candidates.map((c, i) => `[${i}] ${JSON.stringify(c.profile_data)}`).join("\n")}

輸出 JSON：
{
  "best_index": number,
  "match_score": number (60-99, 两位小数),
  "name": string (对方画像里的名字或昵称),
  "headline": string (10-20 字符画像标签),
  "bio": string (一段 60-100 字的画像描写 —— 让 A 看到对方的灵魂，不是简历),
  "summary": string (1-2 句 30-50 字的极简总结，用于 detail 页卡片开头),
  "compatibility_equation": string (一句話總結「為什麼是你們兩個」，必須涉及 A 和 B 的深層模式，例如「你們都用理性包裝感性，但 ta 比你早半步說出口」),
  "paradox_intersection": { "a_paradox": "A 的具體矛盾", "how_b_loosens": "B 的哪種特質會讓這個矛盾鬆動", "risk": "如果 B 接不住會怎樣" },
  "attachment_dance": { "a_style": "A 的依恋模式一話總結", "b_style": "B 的依恋模式一話總結", "why_it_works": "為什麼這兩種模式會互相吸引", "landmine": "最容易踩到的雷" },
  "resonance": string[] (3-5 条深層契合，不要關鍵詞重合),
  "complementarity": string[] (3 条具體互補),
  "friction": string[] (2-3 条真實衝突點),
  "chemistry": { "first_10_minutes": string, "the_unspoken": string },
  "growth": { "in_6_months": string, "the_third_thing": string },
  "compatibility_breakdown": { "resonance": number, "complementarity": number, "friction_risk": number, "chemistry": number, "growth_potential": number },
  "shared_interests": string[] (3-6 个),
  "meet_plan": { "when": string, "where": string, "location_intro": string, "dress_code": string, "icebreakers": string[], "duration": string, "budget": string, "pitfalls": string[], "highlights": string[] }
}
全部用中文表达。`;
}

export function buildDeepSys(lang: "zh" | "en" | "yue", version = "v5"): string {
  void version; // reserved for A/B variants
  const zh = `你是 linQ 的关系动力学引擎 v5。

任务：基于 A 的画像（包括 ta 的矛盾、依恋信号、压力反应、决策指纹）和被选中的候选人 B 的画像，分析：
1. A 的某个具体矛盾在 B 身上是怎么被松动/解决的（**不是泛泛的"我们互补"**）
2. 关系在 3 个月 / 6 个月 / 1 年的演化轨迹（具体到会经历什么阶段）
3. 第一次见面的 30 分钟对话流程（分段：0-5 / 5-15 / 15-25 / 25-30）
4. 见面后的跟进策略（day 1 / week 1 / month 1 各自怎么操作）
5. **new**: 如果关系要长期健康，A 需要调整什么？B 需要调整什么？

**关键要求**：
- 所有内容**必须具体到这两个人**
- 跟进策略**考虑 A 的防御机制和 B 的沟通风格**
- 第一次见面流程**考虑 A 的场景化行为预测和压力反应**
- 关系时间线**考虑 A 的成长阶段和成长边缘**

严格输出 JSON。`;

  const en = `You are linQ's v5 relationship dynamics engine.

Task: based on A's profile (paradoxes, attachment signals, stress response, decision fingerprints) and selected candidate B's profile, analyze:
1. How B's presence specifically loosens/solves one of A's paradoxes
2. Relationship trajectory at 3 months / 6 months / 1 year
3. First-meeting 30-minute conversation flow (0-5 / 5-15 / 15-25 / 25-30 min)
4. Post-meeting follow-up strategy (specific day 1 / week 1 / month 1 actions)
5. For long-term health, what must A adjust? What must B adjust?

Critical: all output must be specific to these two people.
Strict JSON output.`;

  return lang === "en" ? en : zh + outLangDirective(lang);
}

export function buildDeepUser(
  lang: "zh" | "en" | "yue",
  latestProfile: { profile_data: unknown },
  bestIndex: number,
  candidates: Array<{ profile_data: unknown }>,
  version = "v5",
): string {
  void version; // reserved for A/B variants
  const selected = candidates[Math.max(0, Math.min(candidates.length - 1, bestIndex))];
  const zh = `A 的画像：${JSON.stringify(latestProfile.profile_data, null, 2)}
被选中的 B (候选 ${bestIndex})：${JSON.stringify(selected?.profile_data, null, 2)}

请输出 v5 字段 JSON：
{
  "paradox_resolution": { "a_paradox": "A 的一个具体矛盾", "how_b_resolves": "B 是怎么让这个矛盾松动的", "why": "为什么 B 能解决" },
  "timeline": [
    { "phase": "3_months", "what_happens": "...", "signals_to_watch": "..." },
    { "phase": "6_months", "what_happens": "...", "signals_to_watch": "..." },
    { "phase": "1_year", "what_happens": "...", "signals_to_watch": "..." }
  ],
  "conversation_arc": { "opening": "...", "warming": "...", "depth": "...", "closing": "..." },
  "follow_up_strategy": { "day_1": "...", "week_1": "...", "month_1": "..." },
  "long_term_health": { "a_must_adjust": "A 需要改變什麼", "b_must_adjust": "B 需要改變什麼", "shared_practice": "兩個人可以一起建立的習慣" }
}`;

  const en = `A's profile: ${JSON.stringify(latestProfile.profile_data, null, 2)}
Selected B (candidate ${bestIndex}): ${JSON.stringify(selected?.profile_data, null, 2)}

Output v5 fields JSON:
{
  "paradox_resolution": { "a_paradox": "...", "how_b_resolves": "...", "why": "..." },
  "timeline": [
    { "phase": "3_months", "what_happens": "...", "signals_to_watch": "..." },
    { "phase": "6_months", "what_happens": "...", "signals_to_watch": "..." },
    { "phase": "1_year", "what_happens": "...", "signals_to_watch": "..." }
  ],
  "conversation_arc": { "opening": "...", "warming": "...", "depth": "...", "closing": "..." },
  "follow_up_strategy": { "day_1": "...", "week_1": "...", "month_1": "..." },
  "long_term_health": { "a_must_adjust": "...", "b_must_adjust": "...", "shared_practice": "..." }
}`;

  return lang === "en" ? en : zh + outLangDirective(lang);
}
