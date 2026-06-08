-- 2026-06-08: pattern_feedback table for memory layer.
-- Lets users agree / disagree with each pattern insight, and the next
-- profile generation reads the last 20 entries as context.
--
-- Safe to re-run: every statement is guarded with IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS public.pattern_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern_text TEXT NOT NULL,
  section text NOT NULL DEFAULT 'patterns',
  verdict text NOT NULL CHECK (verdict IN ('agree', 'disagree')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pattern_feedback_user_id
  ON public.pattern_feedback(user_id);

CREATE INDEX IF NOT EXISTS idx_pattern_feedback_created_at
  ON public.pattern_feedback(created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.pattern_feedback TO authenticated;
GRANT ALL ON public.pattern_feedback TO service_role;

ALTER TABLE public.pattern_feedback ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "feedback_select_own" ON public.pattern_feedback
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "feedback_insert_own" ON public.pattern_feedback
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "feedback_delete_own" ON public.pattern_feedback
    FOR DELETE TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
