-- 2026-06-21: growth, trust & safety, referral infrastructure.
-- Safe to re-run: every statement is guarded with IF NOT EXISTS.

-- 1) Scheduled transactional emails for post-match follow-up strategy.
CREATE TABLE IF NOT EXISTS public.scheduled_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id uuid REFERENCES public.matches(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('follow_up_day_1', 'follow_up_week_1', 'follow_up_month_1', 'meet_feedback_24h', 'rematch')),
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_emails_user_id ON public.scheduled_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_status_scheduled_at ON public.scheduled_emails(status, scheduled_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_emails TO authenticated;
GRANT ALL ON public.scheduled_emails TO service_role;
ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "sched_email_select_own" ON public.scheduled_emails
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "sched_email_insert_own" ON public.scheduled_emails
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2) Actual meet-up feedback (collected ~24h after a meet plan is generated).
CREATE TABLE IF NOT EXISTS public.meet_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  meet_plan_id uuid REFERENCES public.meet_plans(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  did_meet boolean,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meet_feedback_user_id ON public.meet_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_meet_feedback_match_id ON public.meet_feedback(match_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meet_feedback TO authenticated;
GRANT ALL ON public.meet_feedback TO service_role;
ALTER TABLE public.meet_feedback ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "meet_feedback_select_own" ON public.meet_feedback
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "meet_feedback_insert_own" ON public.meet_feedback
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3) User reports / blocks.
CREATE TABLE IF NOT EXISTS public.user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id uuid REFERENCES public.matches(id) ON DELETE SET NULL,
  reason text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_reports_reporter ON public.user_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported ON public.user_reports(reported_id);

GRANT SELECT, INSERT ON public.user_reports TO authenticated;
GRANT ALL ON public.user_reports TO service_role;
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "user_report_insert_own" ON public.user_reports
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "user_report_select_own" ON public.user_reports
    FOR SELECT TO authenticated USING (auth.uid() = reporter_id OR auth.uid() = reported_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4) Referral tracking.
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  code text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed_up', 'completed')),
  reward_status text NOT NULL DEFAULT 'pending' CHECK (reward_status IN ('pending', 'granted', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  converted_at timestamptz,
  UNIQUE(referrer_id, code)
);

CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);

GRANT SELECT, INSERT, UPDATE ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "referral_select_own" ON public.referrals
    FOR SELECT TO authenticated USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "referral_insert_own" ON public.referrals
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = referrer_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5) Privacy / discoverability switch on user_authorizations.
DO $$ BEGIN
  ALTER TABLE public.user_authorizations ADD COLUMN discoverable boolean NOT NULL DEFAULT true;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
