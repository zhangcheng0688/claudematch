// src/types/match.ts
// Shared types for matching flows. Extracted from routes/_authenticated/start.tsx
// so MatchCard / PlanCard / new pages (match list, match detail) all share one source of truth.

export type Scenario = "business" | "dating" | "partner";

export const SCENARIO_LABEL: Record<
  Scenario,
  { en: string; zh: string; icon: "Briefcase" | "Heart" | "Users" }
> = {
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

/** v4: 人生主题 —— ta 正在经历/经历过的核心叙事 */
export type AiLifeTheme = {
  /** 主题名（如"逃离原生家庭"、"建构自我"） */
  name: string;
  /** 1 句解释 + 引用 */
  evidence: string;
};

/** v4: 场景行为预测 —— ta 在具体场景下会怎么表现 */
export type AiScenePrediction = {
  /** 场景描述（如"周三晚上 9 点独自在家"） */
  context: string;
  /** 预测行为 */
  behavior: string;
  /** 为什么（基于画像推断） */
  why: string;
};

/** v4: 人生阶段 */
export type AiGrowthStage = {
  /** 4 选 1 */
  stage: "exploration" | "construction" | "transition" | "integration";
  /** 中文标签（用于 UI 展示） */
  label: string;
  /** 为什么 ta 在这个阶段 */
  why: string;
};

/** v4: 审美指纹 */
export type AiAestheticSignature = {
  /** 偏好模式（3-5 条） */
  preferences: string[];
  /** 矛盾点（ta 自己在审美/价值观上的冲突） */
  contradiction: string;
};

/** v4: 心理防御机制 */
export type AiDefenseMechanism = {
  /** 机制名（如"理智化"、"反向形成"） */
  mechanism: string;
  /** 何时被触发 */
  when_triggered: string;
  /** 外显行为 */
  behavior: string;
};

/** v4: 沟通建议 —— 在不同场景下 ta 的最优沟通方式 */
export type AiCommunicationRecipe = {
  /** 场景（如"被误解时"） */
  context: string;
  /** 推荐做法 */
  recipe: string;
  /** 应避免 */
  avoid: string;
};

/**
 * AI 画像结构。
 * 2026-06-08 v2：新增 headline / narrative / patterns / dimensions
 * 2026-06-08 v3：新增 paradoxes / archetypes / match_signals / dimensions.signals
 * 2026-06-08 v4：新增 life_themes / scene_predictions / growth_stage /
 *                aesthetic_signature / defense_mechanisms / communication_recipes
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
  /** v4 字段 */
  life_themes?: AiLifeTheme[];
  scene_predictions?: AiScenePrediction[];
  growth_stage?: AiGrowthStage;
  aesthetic_signature?: AiAestheticSignature;
  defense_mechanisms?: AiDefenseMechanism[];
  communication_recipes?: AiCommunicationRecipe[];
};

export type Profile = {
  id: string;
  profile_data: {
    ai?: AiProfile;
    version?: string;
    prompt_version?: string;
    scenario?: string;
    lang?: string;
    input?: string;
    ai_provider?: "deepseek" | "fallback";
    generated_at?: string;
  };
};

/** v4: A 的矛盾在 B 身上的解决路径 */
export type AiParadoxResolution = {
  /** A 的具体矛盾 */
  a_paradox: string;
  /** B 是怎么让这个矛盾松动的（具体到行为） */
  how_b_resolves: string;
  /** 为什么 B 能解决（基于两人画像） */
  why: string;
};

/** v4: 关系时间线 */
export type AiTimelinePoint = {
  /** phase label */
  phase: "3_months" | "6_months" | "1_year";
  /** 这段时间会怎么样 */
  what_happens: string;
  /** 关注什么信号（怎么判断是否健康） */
  signals_to_watch: string;
};

/** v4: 第一次见面对话流程 */
export type AiConversationArc = {
  /** 前 5 分钟：谁先开口 / 说什么 / 空气感 */
  opening: string;
  /** 5-15 分钟：聊什么会让双方都放松 */
  warming: string;
  /** 15-25 分钟：哪个话题能让 ta 说出真话 */
  depth: string;
  /** 25-30 分钟：怎么自然结束（不尴尬） */
  closing: string;
};

/** v4: 见面后跟进策略 */
export type AiFollowUpStrategy = {
  /** 当晚怎么发消息 */
  day_1: string;
  /** 第一周怎么维持节奏 */
  week_1: string;
  /** 第一个月怎么判断是否继续 */
  month_1: string;
};

/** v4: 多维度兼容性评分 */
export type AiCompatibilityBreakdown = {
  resonance: number;
  complementarity: number;
  friction_risk: number;
  chemistry: number;
  growth_potential: number;
};

/** v5: one-sentence "why these two". */
export type AiCompatibilityEquation = string;

/** v5: how A's paradox is loosened by B. */
export type AiParadoxIntersection = {
  a_paradox?: string;
  how_b_loosens?: string;
  risk?: string;
};

/** v5: attachment style dance between A and B. */
export type AiAttachmentDance = {
  a_style?: string;
  b_style?: string;
  why_it_works?: string;
  landmine?: string;
};

/** v5: long-term health adjustments for both sides. */
export type AiLongTermHealth = {
  a_must_adjust?: string;
  b_must_adjust?: string;
  shared_practice?: string;
};

/** One match row. `details` carries the user-facing fields the AI returned. */
export type MatchDetails = {
  name?: string;
  age?: number;
  city?: string;
  headline?: string;
  bio?: string;
  summary?: string;
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
  /** v4 deep analysis: paradox resolution, timeline, conversation arc, follow-up */
  paradox_resolution?: AiParadoxResolution;
  timeline?: AiTimelinePoint[];
  conversation_arc?: AiConversationArc;
  follow_up_strategy?: AiFollowUpStrategy;
  compatibility_breakdown?: AiCompatibilityBreakdown;
  /** v5 relationship-engine outputs */
  compatibility_equation?: AiCompatibilityEquation;
  paradox_intersection?: AiParadoxIntersection;
  attachment_dance?: AiAttachmentDance;
  long_term_health?: AiLongTermHealth;
  is_real_user?: boolean;
  ai_provider?: "deepseek" | "fallback";
  prompt_version?: string;
};

export type MatchRow = {
  id: string;
  user_id?: string;
  matched_user_id?: string;
  matched_target_id?: string;
  match_score: number;
  scenario: string;
  is_ai_persona?: boolean;
  details: MatchDetails;
};

/** v2: 见面方案 v2 —— multi-plan + 场景化设计 + venue 模板 */
export type AiVenueOption = {
  /** 场所类型/名称示例（如"xx 区某品牌精品咖啡"） — v2 only */
  name_example?: string;
  /** v3: 真实 venue_id（指向 venues 表） */
  venue_id?: string;
  /** 区域（用户所在城市） */
  district?: string;
  /** 为什么这个场所适合这两人 */
  why?: string;
  /** 步行距离（分钟，从双方中点） */
  distance_walking_minutes?: number;
  /** 价格档（人均 ¥） */
  price_level?: string;
  /** v3: 人均价格（数字） */
  price_per_person?: number;
};

export type AiActivityDesign = {
  /** 为什么这个活动适合这两人（基于画像） */
  why_this_activity: string;
  /** 具体 30 / 60 / 90 分钟活动流程 */
  flow: {
    "0_30_min": string;
    "30_60_min": string;
    "60_90_min": string;
  };
  /** 如果 30 分钟就冷场，怎么切换 */
  backup_if_bored: string;
};

export type AiTimeConsiderations = {
  best_window: string;
  avoid_window: string;
  weather_check?: string;
};

export type AiExitStrategy = {
  /** 怎么体面结束（"如果 90 分钟感觉不对..."） */
  natural_close: string;
  /** 结束时的「下一步约定」 */
  followup_anchor: string;
};

export type AiMultiPlan = {
  id: "A" | "B" | "C";
  /** 标签（"安静型" / "互动型" / "折中型"） */
  label: string;
  /** 1 句话描述 */
  description: string;
  /** 这个 plan 的首选 venue */
  venue_options: AiVenueOption[];
  /** v3: 活动设计 */
  activity_design?: AiActivityDesign;
  /** v3: 时间窗口建议 */
  time_considerations?: AiTimeConsiderations;
  /** v3: 结束策略 */
  exit_strategy?: AiExitStrategy;
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
  /** v2 fields */
  multi_plan?: AiMultiPlan[];
  activity_design?: AiActivityDesign;
  time_considerations?: AiTimeConsiderations;
  exit_strategy?: AiExitStrategy;
};

export type MeetPlan = {
  id: string;
  created_at?: string;
  plan_content: {
    ai?: MeetPlanAi;
    version?: string;
    scenario?: string;
    city?: string;
    /** v3: server pre-resolves the LLM's venue_id references so the SPA
     *  doesn't have to make a follow-up fetch to /api/venues/lookup. */
    venue_lookup?: Record<
      string,
      {
        id: string;
        name: string;
        city: string;
        district: string | null;
        address: string | null;
        lat: number | null;
        lng: number | null;
        cuisine_tags: string[];
        vibe_tags: string[];
        price_per_person: number | null;
        rating: number | null;
        tel: string | null;
        opening_hours: string | null;
        photos: string[];
        booking_method: "walk_in" | "phone" | "wechat";
        commission_pct: number;
      }
    >;
    ai_provider?: "deepseek" | "fallback";
    generated_at?: string;
  };
};
