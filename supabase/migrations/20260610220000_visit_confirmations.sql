-- 20260610220000_visit_confirmations.sql
--
-- 漏洞 B：24h 二次确认 token 表。
-- 当用户在 BookingModal 点 "I went" 时，我们生成一个 token，
-- 把 confirmation URL 嵌入到 24h 后发出的邮件里。Token 表让：
--   1. 用户可以撤销/重新生成 token（不会泄漏 attribution_id）
--   2. 我们可以追踪"邮件是否打开"（设 opened_at）
--   3. 失败的 token 可以被 founder 在 admin 后台清理
--
-- 设计：
--   - attribution_id 1:1 链接到 meetup_attributions 那条 confirm_i_went 记录
--   - token 是 random 32-byte base64url (43 chars)
--   - expires_at = now() + 7 days（24h 触发 + 7 天宽限）
--   - confirmed / denied 是二选一（带 CHECK 约束）
--   - 当用户点击邮件链接，访问 /api/email/visit-confirm?token=...
--     → 校验 token → 更新本表的 confirmed/denied + timestamp
--     → 同时 UPDATE meetup_attributions SET metadata = metadata ||
--       '{"email_confirmed": true}' 让 reconciliation view 能看到
--
-- RLS：service-role-only（这是内部状态机，不需要 SPA 直接读）

CREATE TABLE IF NOT EXISTS public.visit_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attribution_id UUID NOT NULL REFERENCES public.meetup_attributions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE,
  -- exactly one of these is non-null after the user clicks
  confirmed_at TIMESTAMPTZ,
  denied_at TIMESTAMPTZ,
  email_sent_at TIMESTAMPTZ,         -- when we actually fired the 24h email
  email_opened_at TIMESTAMPTZ,       -- tracking pixel ping (future)
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT visit_confirmations_exclusive_outcome
    CHECK ((confirmed_at IS NULL) <> (denied_at IS NULL))
);

CREATE INDEX IF NOT EXISTS visit_confirmations_token_idx
  ON public.visit_confirmations (token)
  WHERE confirmed_at IS NULL AND denied_at IS NULL;

CREATE INDEX IF NOT EXISTS visit_confirmations_user_idx
  ON public.visit_confirmations (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS visit_confirmations_pending_24h_idx
  ON public.visit_confirmations (created_at)
  WHERE confirmed_at IS NULL AND denied_at IS NULL;

ALTER TABLE public.visit_confirmations ENABLE ROW LEVEL SECURITY;

-- Supabase trigger: when visit_confirmations.confirmed_at is set,
-- propagate to meetup_attributions.metadata so v_venue_monthly_reconciliation
-- sees it. We use a trigger because we want this to happen atomically
-- even when called from outside the API layer (e.g. a manual SQL fixup).
CREATE OR REPLACE FUNCTION public.propagate_visit_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.confirmed_at IS NOT NULL AND (OLD.confirmed_at IS NULL OR OLD.confirmed_at IS DISTINCT FROM NEW.confirmed_at) THEN
    UPDATE public.meetup_attributions
    SET metadata = metadata || jsonb_build_object('email_confirmed', true, 'confirmed_at', NEW.confirmed_at)
    WHERE id = NEW.attribution_id;
  ELSIF NEW.denied_at IS NOT NULL AND (OLD.denied_at IS NULL OR OLD.denied_at IS DISTINCT FROM NEW.denied_at) THEN
    UPDATE public.meetup_attributions
    SET metadata = metadata || jsonb_build_object('email_confirmed', false, 'denied_at', NEW.denied_at)
    WHERE id = NEW.attribution_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS visit_confirmations_propagate ON public.visit_confirmations;
CREATE TRIGGER visit_confirmations_propagate
  AFTER UPDATE ON public.visit_confirmations
  FOR EACH ROW
  EXECUTE FUNCTION public.propagate_visit_confirmation();

-- ────────────────────────────────────────────────────────────────────────────
-- 漏洞 G：7 天回访 NPS 表
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 'nps' = 0-10 score; 'survey' = free text from the form; 'unsubscribe' = opt out
  kind TEXT NOT NULL,
  score INT,                                 -- 0-10 for NPS, NULL for others
  body TEXT,                                 -- free text for survey responses
  source TEXT,                               -- 'checkin-7day-email', 'in-app', etc.
  metadata JSONB,                            -- flexible
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT user_feedback_kind_valid
    CHECK (kind IN ('nps', 'survey', 'unsubscribe', 'bug_report', 'praise')),
  CONSTRAINT user_feedback_score_range
    CHECK (score IS NULL OR (score >= 0 AND score <= 10))
);

CREATE INDEX IF NOT EXISTS user_feedback_user_idx
  ON public.user_feedback (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS user_feedback_kind_idx
  ON public.user_feedback (kind, created_at DESC);

-- Each user can read + write their own feedback
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_feedback_self_write ON public.user_feedback
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY user_feedback_self_read ON public.user_feedback
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());