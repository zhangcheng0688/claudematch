-- 20260608210000_add_wechat_auth_table.sql
--
-- P0-7 protocol-level fix. Previously the WeChat callback used
-- `wx_${openid}@wechat.linq.app` as a placeholder email for the
-- `auth.users` row. This had two security holes:
--   1. An attacker who learned a user's WeChat openid could log into
--      wx_${openid}@wechat.linq.app directly via the email OTP flow,
--      bypassing WeChat auth entirely.
--   2. The placeholder email was deliverable to the linq.app domain but
--      no one monitored that inbox, so password-reset flows silently
--      failed.
--
-- The fix decouples WeChat identity from the auth.users email:
--   * `wechat_auth` is the canonical binding table. It maps
--     auth.users.id ↔ wechat openid. The openid is the identity; the
--     email is irrelevant.
--   * The `auth.users` rows created via WeChat can now use a
--     non-deliverable internal placeholder (handled in the callback;
--     this migration only adds the binding table).
--   * The legacy columns on `profiles` (wechat_openid / unionid /
--     nickname / avatar) are kept for back-compat — the unbind flow
--     clears them, and the me.ts endpoint falls through to wechat_auth
--     when the legacy columns are empty.
--
-- RLS: the binding table is server-only (we use supabaseAdmin to
-- read/write it from the callback). We don't expose any RLS policies
-- to anon/authenticated — the service role bypasses RLS anyway, and
-- there's no UI that needs to read the openid directly.

CREATE TABLE IF NOT EXISTS public.wechat_auth (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  openid TEXT NOT NULL,
  unionid TEXT,
  nickname TEXT,
  avatar TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- openid must be globally unique across users (it identifies a
-- WeChat account, not a user, so two users can't share it).
CREATE UNIQUE INDEX IF NOT EXISTS wechat_auth_openid_unique
  ON public.wechat_auth (openid);

-- updated_at trigger (re-use the helper if it's already installed
-- elsewhere; otherwise inline the trigger).
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS wechat_auth_set_updated_at ON public.wechat_auth;
CREATE TRIGGER wechat_auth_set_updated_at
  BEFORE UPDATE ON public.wechat_auth
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- No RLS policies on purpose: this table is service-role-only.
ALTER TABLE public.wechat_auth ENABLE ROW LEVEL SECURITY;
