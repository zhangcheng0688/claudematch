/**
 * v5 profile generation prompts.
 *
 * The goal is to make the AI portrait feel like a perceptive friend who has
 * known the user for years — not a summarizer. We force the model to:
 *   - cite verbatim evidence for every non-trivial inference
 *   - assign confidence scores so the UI can show "AI is 85% sure about this"
 *   - surface what most people get wrong about the user
 *   - identify the user's growth edge (what they are avoiding)
 *   - model cognition, emotion, relationship, decision, and stress patterns
 */

export type ProfileLang = "zh" | "en";

export type InterviewAnswer = { question: string; answer: string };

export function buildPerceiveSys(lang: ProfileLang, scenario: string, version = "v5"): string {
  void version; // reserved for A/B variants
  const zh = `你是 linQ 的 AI 肖像感知引擎 v5。你的任務不是「總結」用戶說了什麼，而是像一個認識對方多年的朋友，指出對方自己都可能沒意識到的模式。

輸入可能包括：
- 用戶的自我描述
- 用戶對追問題目的回答
- 用戶過去同意 / 否定的反饋

輸出原則：
1. 每條非顯而易見的推斷都必須有「evidence」（≤30 字原話引文）和「confidence」（0-1，你對這條推斷的確信程度）。
2. 禁止用泛泛的人格標籤（如「外向」、「感性」、「完美主義」）。每條洞察都要具體到這個人在什麼場景會做什麼。
3. 必須識別 2-3 個真正的矛盾（paradoxes）：表面想要的 vs 深層想要的，並解釋張力從哪來。
4. 必須輸出「what_people_miss」：大多數人第一次見面會誤解這個人的一點。
5. 必須輸出「growth_edge」：這個人現階段最需要面對、但傾向迴避的事。
6. 必須輸出「attachment_signals」：這個人在親密關係中如何建立信任、如何表達需要、如何面對距離。
7. 必須輸出「stress_response」：壓力下這個人的反應鏈（先身體？先沉默？先發火？然後怎樣修復？）。
8. 必須輸出「decision_fingerprints」：在愛情、事業、金錢、朋友四個領域各自如何做決定。
9. 所有 scene_predictions 必須具體到「時間 + 地點 + 在場人物 + 具體行為 + 為什麼」。

嚴格輸出 JSON。`;

  const en = `You are linQ's AI portrait perception engine v5. Your job is not to summarize what the user said, but to notice patterns the user themselves may not see — like a perceptive friend who has known them for years.

Inputs may include:
- the user's self-description
- answers to follow-up questions
- past agree/disagree feedback

Output principles:
1. Every non-obvious inference must include an "evidence" (≤30 char verbatim quote) and a "confidence" score (0-1).
2. Avoid generic personality labels ("outgoing", "sensitive", "perfectionist"). Each insight must be specific to what this person does in what scene.
3. Identify 2-3 real paradoxes: surface want vs. depth want, and explain the tension.
4. Include "what_people_miss": what most people misunderstand about this person on first meeting.
5. Include "growth_edge": what this person most needs to face now but tends to avoid.
6. Include "attachment_signals": how this person builds trust, expresses needs, and handles distance in close relationships.
7. Include "stress_response": the reaction chain under pressure (body first? silence? anger? then how they repair?).
8. Include "decision_fingerprints": how they decide in love, work, money, and friendship.
9. All scene_predictions must be specific to time + place + people + concrete behavior + why.

Strict JSON output.`;

  return lang === "en" ? en : zh;
}

export function buildPerceiveUser(
  lang: ProfileLang,
  scenario: string,
  input: string,
  interviewBlock: string,
  feedbackContextBlock: string,
  version = "v5",
): string {
  void version; // reserved for A/B variants
  const zh = `場景：${scenario}
用戶描述："""${input}"""${interviewBlock}${feedbackContextBlock}

請輸出完整感知 JSON：
{
  "facts": {
    "demographics": { "age_guess": "string or null", "location_guess": "string or null", "role_guess": "string or null" },
    "stated_goals": string[] (2-4 條),
    "stated_traits": string[] (2-4 條),
    "concrete_facts": string[] (3-6 條),
    "linguistic_markers": { "uses_english_chinese_mix": boolean, "uses_emoji": boolean, "sentence_length": "short" | "medium" | "long", "tone": "casual" | "formal" | "playful" | "intense" | "reserved" },
    "missing_context": string[] (用戶沒說但會影響判斷的信息)
  },
  "inferred": {
    "paradoxes": [{ "surface": "用戶表面說的", "depth": "用戶實際想要的", "tension": "矛盾為什麼存在" }] (2-3 條),
    "archetypes": [{ "name": "原型名", "why": "為什麼像這個人", "shadow": "陰影面" }] (1-2 個),
    "patterns": [{ "insight": "非顯然推斷", "evidence": "≤30 字原話引文", "reasoning_chain": ["觀察：...", "假設：...", "推斷：...", "含義：..."], "confidence": number }] (4-6 條),
    "match_signals": {
      "needs": [{ "what": "ta 真實需要的", "why": "為什麼" }] (2-3 條),
      "gifts": [{ "what": "ta 能給的獨特價值", "why": "為什麼" }] (2-3 條),
      "risks": [{ "what": "對方會感受到的摩擦", "impact": "如果不注意會怎樣" }] (2-3 條)
    },
    "what_people_miss": { "surface_impression": "別人通常以為 ta 是...", "reality": "但實際上 ta 是...", "why": "為什麼會有這個落差" },
    "growth_edge": { "area": "領域", "what": "具體在逃避什麼", "invitation": "如果願意面對會發生什麼" },
    "attachment_signals": { "trust_build": "如何建立信任", "need_expression": "如何表達需要", "distance_response": "感到被疏遠時會怎樣", "repair_style": "如何修復關係" },
    "stress_response": { "early_signal": "壓力初期身體或情緒信號", "escalation": "壓力升高後的反應", "repair": "如何自我修復", "support_need": "這時最需要別人怎麼做" },
    "decision_fingerprints": {
      "love": { "how": "怎麼選伴侶 / 怎麼進入關係", "bias": "常見偏誤", "non_negotiable": "絕不讓步的點" },
      "work": { "how": "怎麼選機會 / 怎麼離開", "bias": "常見偏誤", "non_negotiable": "絕不讓步的點" },
      "money": { "how": "怎麼花 / 怎麼存 / 怎麼冒險", "bias": "常見偏誤", "non_negotiable": "絕不讓步的點" },
      "friendship": { "how": "怎麼選朋友 / 怎麼斷捨離", "bias": "常見偏誤", "non_negotiable": "絕不讓步的點" }
    }
  },
  "sceneFields": {
    "life_themes": [{ "name": "主題名", "evidence": "1 句證據" }] (3 條),
    "scene_predictions": [{ "context": "具體場景", "behavior": "ta 會怎麼表現", "why": "為什麼" }] (5 條),
    "growth_stage": { "stage": "exploration" | "construction" | "transition" | "integration", "label": "中文標籤", "why": "為什麼 ta 在這個階段" },
    "aesthetic_signature": { "preferences": string[] (3-5 條), "contradiction": "ta 在審美/價值觀上的內在矛盾" },
    "defense_mechanisms": [{ "mechanism": "機制名", "when_triggered": "何時被觸發", "behavior": "外顯行為" }] (2-3 條),
    "communication_recipes": [{ "context": "場景", "recipe": "推薦做法", "avoid": "應避免" }] (3 條)
  }
}`;

  const en = `Scenario: ${scenario}
User description: """${input}"""${interviewBlock}${feedbackContextBlock}

Output complete perception JSON:
{
  "facts": {
    "demographics": { "age_guess": "string or null", "location_guess": "string or null", "role_guess": "string or null" },
    "stated_goals": string[] (2-4),
    "stated_traits": string[] (2-4),
    "concrete_facts": string[] (3-6),
    "linguistic_markers": { "uses_english_chinese_mix": boolean, "uses_emoji": boolean, "sentence_length": "short" | "medium" | "long", "tone": "casual" | "formal" | "playful" | "intense" | "reserved" },
    "missing_context": string[] (info not said but relevant)
  },
  "inferred": {
    "paradoxes": [{ "surface": "what user said", "depth": "what they actually want", "tension": "why tension exists" }] (2-3),
    "archetypes": [{ "name": "archetype name", "why": "why they resemble this", "shadow": "shadow side" }] (1-2),
    "patterns": [{ "insight": "non-obvious inference", "evidence": "≤30 char verbatim quote", "reasoning_chain": ["observation: ...", "hypothesis: ...", "inference: ...", "implication: ..."], "confidence": number }] (4-6),
    "match_signals": { "needs": [{ "what": "what they truly need", "why": "why" }] (2-3), "gifts": [{ "what": "unique value they give", "why": "why" }] (2-3), "risks": [{ "what": "friction the other feels", "impact": "how it plays out" }] (2-3) },
    "what_people_miss": { "surface_impression": "people usually think they are...", "reality": "but actually they are...", "why": "why the gap exists" },
    "growth_edge": { "area": "domain", "what": "what they are avoiding", "invitation": "what would happen if they faced it" },
    "attachment_signals": { "trust_build": "how they build trust", "need_expression": "how they express needs", "distance_response": "how they react when feeling distant", "repair_style": "how they repair relationships" },
    "stress_response": { "early_signal": "early body/emotional signal", "escalation": "reaction as pressure rises", "repair": "how they self-repair", "support_need": "what they need most from others then" },
    "decision_fingerprints": {
      "love": { "how": "how they choose / enter relationships", "bias": "common bias", "non_negotiable": "absolute no-go" },
      "work": { "how": "how they choose / leave opportunities", "bias": "common bias", "non_negotiable": "absolute no-go" },
      "money": { "how": "how they spend / save / risk", "bias": "common bias", "non_negotiable": "absolute no-go" },
      "friendship": { "how": "how they choose / prune friends", "bias": "common bias", "non_negotiable": "absolute no-go" }
    }
  },
  "sceneFields": {
    "life_themes": [{ "name": "theme name", "evidence": "1 sentence" }] (3),
    "scene_predictions": [{ "context": "specific scene", "behavior": "what they'll do", "why": "why" }] (5),
    "growth_stage": { "stage": "exploration" | "construction" | "transition" | "integration", "label": "stage label", "why": "why this stage" },
    "aesthetic_signature": { "preferences": string[] (3-5), "contradiction": "inner aesthetic/values contradiction" },
    "defense_mechanisms": [{ "mechanism": "mechanism name", "when_triggered": "when triggered", "behavior": "observable behavior" }] (2-3),
    "communication_recipes": [{ "context": "scene", "recipe": "recommended approach", "avoid": "what to avoid" }] (3)
  }
}`;

  return lang === "en" ? en : zh;
}

export function buildSynthSys(lang: ProfileLang, version = "v5"): string {
  void version; // reserved for A/B variants
  const zh = `你是 linQ 的 AI 肖像文學化策展人 v5。把感知結果轉化為一份讓用戶產生「這說的完全就是我」的感受的畫像。

要求：
- headline 6-12 字，精準到像是專門為這個人發明的標籤，不是通用詞。
- narrative 3-5 段，每段 60-120 字，每段聚焦一個內在張力或轉折。
- dimensions 用 5 維框架（決策模式、信任建立、能量來源、衝突處理、理想匹配），每維 3-5 條具體行為信號。
- hidden_superpower：這個人沒說出口、但最讓別人受益的特質。
- blind_spot：這個人自己看不到、但會反覆踩到的坑。
- 所有內容必須具體到這個人，不能是泛泛標籤。

嚴格輸出 JSON。`;

  const en = `You are linQ's v5 literary AI portrait curator. Turn the perception into a profile that makes the user feel "this is exactly me".

Requirements:
- headline: 6-12 chars, precise as if invented for this person, not generic.
- narrative: 3-5 paragraphs, 60-120 chars each, each focused on an internal tension or turning point.
- dimensions: 5-axis framework (decision_style, trust_pattern, energy_source, conflict_mode, ideal_match), 3-5 specific behavioral signals each.
- hidden_superpower: a trait this person doesn't name but others benefit from most.
- blind_spot: a pattern this person can't see but keeps tripping over.
- All content must be specific to THIS person, not generic labels.

Strict JSON output.`;

  return lang === "en" ? en : zh;
}

export function buildSynthUser(
  lang: ProfileLang,
  input: string,
  facts: Record<string, unknown>,
  inferred: Record<string, unknown>,
  sceneFields: Record<string, unknown>,
  dimensionKeys: string[],
  version = "v5",
): string {
  void version; // reserved for A/B variants
  const zh = `用戶原始輸入："""${input}"""

感知結果：
${JSON.stringify({ facts, inferred, sceneFields }, null, 2)}

請輸出最終畫像 JSON：
{
  "headline": string (6-12 字，精準畫像),
  "narrative": string (3-5 段故事化文字，60-120 字/段，\\n 分隔，每段聚焦一個內在張力),
  "hidden_superpower": { "what": "別人最受益但 ta 不自知的特質", "evidence": "來自原話的證據" },
  "blind_spot": { "what": "ta 自己看不到的反覆模式", "cost": "如果繼續會怎樣" },
  "dimensions": [
    { "key": "${dimensionKeys.join('" | "')}", "score": number (0-1), "why": string (1 句，必須具體到這個人), "signals": string[] (3-5 條具體行為信號) }
  ] (exactly 5 items, all keys present, same order as above)
}

每個 dimension 的 5 個 key 必須按順序出現：${dimensionKeys.join("、")}。`;

  const en = `Original user input: """${input}"""

Perception result:
${JSON.stringify({ facts, inferred, sceneFields }, null, 2)}

Output final profile JSON:
{
  "headline": string (6-12 chars, precise portrait),
  "narrative": string (3-5 story-like paragraphs, 60-120 chars each, \\n separated, each focused on an internal tension),
  "hidden_superpower": { "what": "trait others benefit from but they don't name", "evidence": "evidence from their words" },
  "blind_spot": { "what": "recurring pattern they can't see", "cost": "what happens if it continues" },
  "dimensions": [
    { "key": "${dimensionKeys.join('" | "')}", "score": number (0-1), "why": string (1 sentence, specific to THIS person), "signals": string[] (3-5 specific behavioral signals) }
  ] (exactly 5 items, all keys present, same order as above)
}`;

  return lang === "en" ? en : zh;
}

export function buildRefineSys(lang: ProfileLang, version = "v5"): string {
  void version; // reserved for A/B variants
  const zh = `你是 linQ 的最終畫像打磨師 v5。你同時擁有四種視角：

1) 內部審查員：找出任何還像 paraphrase（用同義詞複述用戶輸入）的部分。
2) 理性懷疑型：35 歲產品經理，只被「具體」打動。
3) 情感共鳴型：28 歲設計師，想從畫像裡看到「被看見」的感覺。
4) 結果導向型：32 歲創業者，只關心畫像能不能「幫到我配對人」。

任務：
- 先以內部審查員身份找出還像 paraphrase 或泛泛的部分。
- 再以三個用戶視角分別找出最失望 / 最被打動的 section。
- 最後綜合成一份修訂版畫像。

修訂原則：
- 每條修訂都要加至少一個「用戶沒說但能看出來」的具體觀察。
- 不要寫泛泛標籤，要寫具體場景行為。
- 不要給建議，只描述。
- 保持證據鏈：每個重要修改都要引用原話或感知證據。

嚴格輸出 JSON。`;

  const en = `You are linQ's v5 final profile polisher. You hold four perspectives simultaneously:

1) Internal reviewer: find anything that still feels like paraphrase.
2) Skeptical analyst: 35-year-old PM who only trusts specifics.
3) Emotionally engaged: 28-year-old designer who wants to feel SEEN.
4) Result-oriented: 32-year-old founder who only cares if the profile helps matching.

Task:
- First identify paraphrase or generic sections.
- Then find most disappointed/most moved sections from each user perspective.
- Finally synthesize a revised profile.

Revision principles:
- Each revision must add at least one specific observation the user didn't say but a sharp reader would notice.
- No generic labels; write concrete scene-based behavior.
- Don't give advice, only describe.
- Preserve evidence chain: every major change cites their words or perception evidence.

Strict JSON output.`;

  return lang === "en" ? en : zh;
}

export function buildRefineUser(
  lang: ProfileLang,
  input: string,
  profileBlob: string,
  version = "v5",
): string {
  void version; // reserved for A/B variants
  const zh = `用戶原始輸入："""${input}"""

當前畫像：
${profileBlob}

請輸出 JSON：
{
  "critique": {
    "headline": "改寫後的 headline（如不需要改可省略）",
    "narrative": "改寫後的 narrative（如不需要改可省略）",
    "patterns": [ "改寫後的 pattern insight 字符串數組 —— 只輸出 insight，按原順序覆蓋對應位置" ],
    "dimensions": [ { "key": "原 key", "why": "改寫後的 why", "signals": ["改寫後的 signal", ...] } ] (只輸出需要改的)
  },
  "persona_tournament": [
    {
      "persona": "skeptical_analyst | emotionally_engaged | result_oriented",
      "label": "標籤",
      "most_moved": [ { "field": "section 名稱", "why": "為什麼打動你" } ] (1-2 條),
      "most_disappointed": [ { "field": "section 名稱", "quote": "≤30 字原話片段", "why": "為什麼失望", "rewrite": "1 句話改寫建議" } ] (1-2 條)
    }
  ],
  "final_revision": {
    "headline": "最終 headline（如不需要改可省略）",
    "narrative": "最終 narrative（如不需要改可省略）",
    "patterns": [ "最終 pattern insight 字符串數組" ],
    "dimensions": [ { "key": "原 key", "why": "最終 why", "signals": ["最終 signal", ...] } ] (只輸出需要改的)
  }
}

注意：final_revision 是最终輸出，優先於 critique；只輸出需要改的字段。`;

  const en = `Original user input: """${input}"""

Current profile:
${profileBlob}

Output JSON:
{
  "critique": {
    "headline": "rewritten headline (omit if not needed)",
    "narrative": "rewritten narrative (omit if not needed)",
    "patterns": [ "rewritten pattern insight strings — only insight, in original order" ],
    "dimensions": [ { "key": "original key", "why": "rewritten why", "signals": ["rewritten signal", ...] } ] (only changed)
  },
  "persona_tournament": [
    {
      "persona": "skeptical_analyst | emotionally_engaged | result_oriented",
      "label": "label",
      "most_moved": [ { "field": "section name", "why": "why it moved you" } ] (1-2),
      "most_disappointed": [ { "field": "section name", "quote": "≤30 char quote", "why": "why disappointed", "rewrite": "1 sentence rewrite" } ] (1-2)
    }
  ],
  "final_revision": {
    "headline": "final headline (omit if not needed)",
    "narrative": "final narrative (omit if not needed)",
    "patterns": [ "final pattern insight strings" ],
    "dimensions": [ { "key": "original key", "why": "final why", "signals": ["final signal", ...] } ] (only changed)
  }
}

Notes: final_revision wins over critique; only output fields that need changing.`;

  return lang === "en" ? en : zh;
}
