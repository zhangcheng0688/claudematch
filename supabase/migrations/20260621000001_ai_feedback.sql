-- 2026-06-21: ai_feedback table for profile/match quality loop.
-- Lets users rate the overall quality of an AI-generated profile or match,
-- linked to the prompt_version used so we can A/B test prompt improvements.
-- Safe to re-run: every statement is guarded with IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS public.ai_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('profile', 'match')),
  target_id text NOT NULL,
  scenario text,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  prompt_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_user_id
  ON public.ai_feedback(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_kind_target
  ON public.ai_feedback(kind, target_id);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_prompt_version
  ON public.ai_feedback(prompt_version);

GRANT SELECT, INSERT, DELETE ON public.ai_feedback TO authenticated;
GRANT ALL ON public.ai_feedback TO service_role;

ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "ai_feedback_select_own" ON public.ai_feedback
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "ai_feedback_insert_own" ON public.ai_feedback
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "ai_feedback_delete_own" ON public.ai_feedback
    FOR DELETE TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
