-- 20260618000000_ai_persona_match_support.sql
--
-- 让 matches 表支持 AI persona 作为匹配对象。
--
-- 背景：
--   ai_personas.id 不是 auth.users.id，但原先 matches.matched_user_id
--   有 FK REFERENCES auth.users(id)，导致 AI persona fallback 匹配
--   写入时报错。本迁移移除此 FK，并显式区分真实用户与 AI persona。

-- 1) 让 matched_user_id 可为 NULL 并移除对 auth.users 的外键约束。
ALTER TABLE public.matches
  ALTER COLUMN matched_user_id DROP NOT NULL;

ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_matched_user_id_fkey;

-- 2) 新增标记列：是否为 AI persona 匹配。
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS is_ai_persona BOOLEAN NOT NULL DEFAULT FALSE;

-- 3) 新增 matched_target_id，未来可作为统一抽象（user_id 或 persona_id）。
--    目前与 matched_user_id 保持同值，方便后续若统一 match_targets 表时迁移。
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS matched_target_id UUID;

-- 4) 加速 "某用户在某场景下已匹配的 AI persona" 排除查询。
CREATE INDEX IF NOT EXISTS matches_user_scenario_ai_idx
  ON public.matches (user_id, scenario, is_ai_persona);

-- 5) 记录用户与 AI persona 的匹配历史，避免同一个用户反复匹配到同一个角色。
CREATE TABLE IF NOT EXISTS public.user_persona_matches (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL REFERENCES public.ai_personas(id) ON DELETE CASCADE,
  scenario TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, persona_id, scenario)
);

CREATE INDEX IF NOT EXISTS user_persona_matches_user_scenario_idx
  ON public.user_persona_matches (user_id, scenario);

-- 6) 权限：service_role 全权操作；authenticated 只读自己的历史（非必须，但符合 RLS 习惯）。
GRANT ALL ON public.user_persona_matches TO service_role;
GRANT SELECT ON public.user_persona_matches TO authenticated;

ALTER TABLE public.user_persona_matches ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "user_persona_matches_select_own"
    ON public.user_persona_matches
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 7) RPC to atomically increment a persona's match_count and update
--    last_matched_at. Used by /api/ai/match when an AI persona is
--    selected, to avoid the read-modify-write race on match_count.
CREATE OR REPLACE FUNCTION public.increment_persona_match_count(persona_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.ai_personas
  SET match_count = match_count + 1,
      last_matched_at = now()
  WHERE id = persona_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_persona_match_count(UUID) TO service_role;
