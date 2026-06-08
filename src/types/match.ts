// src/types/match.ts
// Shared types for matching flows. Extracted from routes/_authenticated/start.tsx
// so MatchCard / PlanCard / new pages (match list, match detail) all share one source of truth.

export type Scenario = "business" | "dating" | "partner";

export const SCENARIO_LABEL: Record<Scenario, { en: string; zh: string; icon: "Briefcase" | "Heart" | "Users" }> = {
  business: { en: "Business", zh: "工作", icon: "Briefcase" },
  dating: { en: "Dating", zh: "恋爱", icon: "Heart" },
  partner: { en: "Local friends", zh: "本地朋友", icon: "Users" },
};

export const SCENARIO_DESC: Record<Scenario, { en: string; zh: string }> = {
  business: {
    en: "Co-founders, collaborators, mentors.",
    zh: "合伙人、合作者、导师。",
  },
  dating: {
    en: "Real chemistry, not endless swipes.",
    zh: "真实的化学反应，告别无限左滑。",
  },
  partner: {
    en: "Weekend partners, hobby buddies.",
    zh: "周末搭子、兴趣伙伴。",
  },
};

/** AI-generated profile (DeepSeek output) stored in `user_profiles.profile_data.ai`. */
export type AiPattern = {
  /** AI 推断的洞察（用户没明说但能看出来的事） */
  insight: string;
  /** 从用户输入里抓到的原话引文，作为洞察的证据 */
  evidence: string;
  /** 5 步推理链：从输入到推断的中间步骤，每步 1 句话 */
  reasoning_chain?: string[];
};

export type AiDimension = {
  /** 维度 key（v3: 决策模式/信任建立/能量来源/冲突处理/理想匹配） */
  key: string;
  /** 0-1 之间的评分 */
  score: number;
  /** 一句话解读：为什么给这个分数（不允许空泛） */
  why: string;
  /** 具体可观察的行为信号列表（3-5 条，每条是"ta 在 X 场景会做 Y"） */
  signals?: string[];
};

/** v3: 内在矛盾 —— "你表面想要 vs 实际想要" */
export type AiParadox = {
  /** 你说的 / 表面表达的 */
  surface: string;
  /** 你实际想要的（可能没意识到） */
  depth: string;
  /** 为什么这个张力存在（一句心理学/行为学解释） */
  tension: string;
};

/** v3: 内在人格原型 —— "ta 像谁" */
export type AiArchetype = {
  /** 原型名（如"深夜建筑师"、"压力下的探险家"） */
  name: string;
  /** 为什么 ta 像这个人（2-3 句话） */
  why: string;
  /** 这个原型的核心冲突/阴影面 */
  shadow: string;
};

/** v3: 匹配信号 —— 对方和 ta 在一起会感受到什么 */
export type AiMatchSignals = {
  /** ta 需要的（情感/认知/行动层面的真实需求） */
  needs: Array<{ what: string; why: string }>;
  /** ta 能给的（独特的价值） */
  gifts: Array<{ what: string; why: string }>;
  /** 风险信号 —— 对方和 ta 相处会感到的摩擦 */
  risks: Array<{ what: string; impact: string }>;
};

/**
 * AI 画像结构。
 * 2026-06-08 v2：新增 headline / narrative / patterns / dimensions
 * 2026-06-08 v3：新增 paradoxes / archetypes / match_signals / dimensions.signals
 * 老字段（summary / traits / interests / communication_style / looking_for / ideal_match）
 * 保留在 schema 中做向后兼容，但 UI 不再展示。
 */
export type AiProfile = {
  /** v1 老字段（兼容） */
  summary?: string;
  traits?: Record<string, number>;
  interests?: string[];
  communication_style?: string;
  looking_for?: string;
  ideal_match?: string;
  /** v2 字段 */
  headline?: string;
  narrative?: string;
  patterns?: AiPattern[];
  dimensions?: AiDimension[];
  /** v3 字段 */
  paradoxes?: AiParadox[];
  archetypes?: AiArchetype[];
  match_signals?: AiMatchSignals;
};

export type Profile = {
  id: string;
  profile_data: {
    ai?: AiProfile;
    version?: string;
    scenario?: string;
    lang?: string;
    input?: string;
    ai_provider?: "deepseek" | "fallback";
    generated_at?: string;
  };
};

/** One match row. `details` carries the user-facing fields the AI returned. */
export type MatchDetails = {
  name?: string;
  age?: number;
  city?: string;
  headline?: string;
  bio?: string;
  shared_interests?: string[];
  /** v2 legacy single-line reason (kept for back-compat) */
  reason?: string;
  /** v3 deep analysis: 5-axis compatibility */
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
  is_real_user?: boolean;
  ai_provider?: "deepseek" | "fallback";
};

export type MatchRow = {
  id: string;
  match_score: number;
  scenario: string;
  details: MatchDetails;
};

/** AI-generated meet-up plan. */
export type MeetPlanAi = {
  when?: string;
  where?: string;
  location_intro?: string;
  dress_code?: string;
  icebreakers?: string[];
  duration?: string;
  budget?: string;
  pitfalls?: string[];
  highlights?: string[];
  activity?: string;
  vibe_tip?: string;
  first_message?: string;
};

export type MeetPlan = {
  id: string;
  plan_content: {
    ai?: MeetPlanAi;
    version?: string;
    scenario?: string;
    ai_provider?: "deepseek" | "fallback";
    generated_at?: string;
  };
};
