-- 20260609220000_ai_personas.sql
--
-- P0 of the cold-start solution: 200 AI personas seed the matching
-- pool so the first user (with no real candidates) gets a complete
-- experience. Personas are openly disclosed in the UI as "AI 角色";
-- they never trigger the mutual-email flow that real matches do.
--
-- Why a separate table (not on user_profiles):
--   - AI personas don't have auth.users rows; we want RLS that
--     trivially excludes them from user-only queries.
--   - The match.ts candidate query needs to UNION this with real
--     users; keeping them in their own table means the JOIN/UNION
--     is clean.
--   - Persona deactivation (is_active=false) is a single UPDATE;
--     on user_profiles we'd have to invent a column.
--
-- Schema mirrors user_profiles.profile_data so the LLM matching
-- prompt can treat both equally. The persona.id and persona.name
-- are also surfaced as the matched_user_id / name fields in the
-- generated match row.
--
-- image_url: optional. Most personas have none (we don't have a
-- stock-image budget). When present, the MatchCard renders it as
-- the avatar. Avatars are an enhancement, not a requirement.
--
-- match_count: incremented every time this persona is returned as
-- a match (capped at a useful number). Used for analytics: which
-- personas get picked most often? Helps us understand which
-- archetype resonates.
--
-- display_priority: 0=normal, higher = shown earlier when the
-- score is similar. Lets us manually boost personas we want to
-- feature (e.g. ones that pair well with very common user
-- profiles).

CREATE TABLE IF NOT EXISTS public.ai_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  age INT NOT NULL,
  city TEXT NOT NULL,                 -- 'shenzhen' | 'shanghai' (matches user_profiles convention)
  occupation TEXT NOT NULL,           -- e.g. '产品经理', '摄影师', '私厨'
  headline TEXT,                      -- 一句话 headline, 跟 user_profiles 一样
  bio TEXT,                           -- 2-3 句自我介绍
  image_url TEXT,                     -- optional, 多数 persona 没图
  scenario_tags TEXT[] DEFAULT '{}',  -- 哪些 scenario 适用: ['dating', 'business', 'partner']
  profile_data JSONB NOT NULL,        -- 同 user_profiles.profile_data 结构, 喂给 LLM matching
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_priority INT NOT NULL DEFAULT 0,
  match_count INT NOT NULL DEFAULT 0,
  last_matched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The hot path: "give me 30 active personas in this city for this
-- scenario, ordered by priority + recency". The composite covers it.
CREATE INDEX IF NOT EXISTS ai_personas_city_scenario_idx
  ON public.ai_personas (city, scenario_tags, is_active)
  USING GIN (scenario_tags);

-- For display sorting when scoring is similar.
CREATE INDEX IF NOT EXISTS ai_personas_priority_idx
  ON public.ai_personas (is_active, display_priority DESC, last_matched_at DESC NULLS LAST);

-- A safety check: persona ages should be 18-99. The seed script enforces
-- this; the constraint is a guard against future inserts via Supabase UI.
ALTER TABLE public.ai_personas
  ADD CONSTRAINT ai_personas_age_range CHECK (age >= 18 AND age <= 99);

-- Service-role only (like venues). No anon/authenticated policies.
ALTER TABLE public.ai_personas ENABLE ROW LEVEL SECURITY;
