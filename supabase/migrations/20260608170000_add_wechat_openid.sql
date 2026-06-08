-- 2026-06-08: WeChat binding columns on profiles.
-- Adds wechat_openid (unique), wechat_unionid, wechat_nickname, wechat_avatar.
-- Safe to re-run: every statement is guarded with IF NOT EXISTS / DO blocks.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'wechat_openid'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN wechat_openid TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'wechat_unionid'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN wechat_unionid TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'wechat_nickname'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN wechat_nickname TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'wechat_avatar'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN wechat_avatar TEXT;
  END IF;
END $$;

-- Unique index on wechat_openid (only when present) so we can fast-lookup
-- "is this WeChat user already linked to a linQ account?" and so the index
-- doesn't bloat with NULL rows.
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_wechat_openid
  ON public.profiles (wechat_openid)
  WHERE wechat_openid IS NOT NULL;

-- RLS: profiles already has RLS for self-read / self-update. The WeChat
-- callback runs as service_role (uses SUPABASE_SERVICE_ROLE_KEY), so the
-- RLS bypass is implicit and no policy change is needed.
