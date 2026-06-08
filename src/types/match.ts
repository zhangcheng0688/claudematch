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
export type AiProfile = {
  summary?: string;
  traits?: Record<string, number>;
  interests?: string[];
  communication_style?: string;
  looking_for?: string;
  ideal_match?: string;
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
  reason?: string;
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
