-- 20260609210000_venues_and_attributions.sql
--
-- R1: venues table (the restaurant / venue catalog)
-- R4: meetup_attributions table (booking click tracking, for future 返点 reconciliation)
--
-- Schema notes:
-- - amap_id is unique when present (lets us dedupe if we re-scrape)
-- - commission_pct defaults to 0 — non-zero rows are venues with signed rebate agreements
-- - vibe_tags / cuisine_tags are arrays so we can filter with `cs && ARRAY[...]` and
--   score relevance with `<@>` in queries without a join table
-- - is_active lets us soft-delete a venue (vs hard delete, which would orphan
--   historical meetup_attributions references — we use ON DELETE SET NULL for that)
-- - RLS: server-only (service role bypass). No anon/authenticated policies on purpose.
--   The lookup API in /api/venues/* handles user-facing reads.

CREATE TABLE IF NOT EXISTS public.venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amap_id TEXT UNIQUE,
  name TEXT NOT NULL,
  city TEXT NOT NULL,                -- 'shenzhen' | 'shanghai' (lowercase, stable)
  district TEXT,                     -- 行政区: '福田', '南山', '黄浦', '徐汇', ...
  address TEXT,
  lat NUMERIC(10, 6),
  lng NUMERIC(10, 6),
  cuisine_tags TEXT[] DEFAULT '{}',  -- ['日料', 'omakase', '西餐', '意大利餐', ...]
  vibe_tags TEXT[] DEFAULT '{}',     -- ['安静', '适合聊天', '景观位', '灯光好', '适合拍照', ...]
  price_per_person INT,              -- 人均 ¥, null = unknown
  rating NUMERIC(3, 2),              -- 0-5, null = unknown
  review_count INT,
  tel TEXT,                          -- null if not in source data
  opening_hours TEXT,                -- "11:00-22:00" or descriptive
  photos TEXT[] DEFAULT '{}',
  source TEXT NOT NULL,              -- 'amap' | 'manual' | 'dianping'
  source_url TEXT,
  booking_method TEXT NOT NULL DEFAULT 'walk_in',  -- 'walk_in' | 'phone' | 'wechat'
  commission_pct NUMERIC(5, 2) NOT NULL DEFAULT 0,  -- 0-100, 0 = no signed agreement
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,                        -- 内部备注 (e.g. "米其林一星 2024")
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- City / district / price range is the dominant query pattern for LLM prompt
-- context and for the eventual venue search UI.
CREATE INDEX IF NOT EXISTS venues_city_active_idx
  ON public.venues (city, is_active);

CREATE INDEX IF NOT EXISTS venues_city_price_idx
  ON public.venues (city, price_per_person)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS venues_cuisine_gin_idx
  ON public.venues USING GIN (cuisine_tags);

CREATE INDEX IF NOT EXISTS venues_vibe_gin_idx
  ON public.venues USING GIN (vibe_tags);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS venues_set_updated_at ON public.venues;
CREATE TRIGGER venues_set_updated_at
  BEFORE UPDATE ON public.venues
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
-- No policies: service-role-only.


-- R4: meetup_attributions
-- Records every time a user clicks a venue-related action (book button, "I went"
-- confirm). The match_id + venue_id pair is what future 返点 reconciliation
-- queries will join on. The schema is deliberately lean — we only add columns
-- when we know we need them (otherwise we end up with 30 half-empty columns).
--
-- `action` is an enum-ish text so we can grow the surface (book / i_went / share)
-- without a migration. We don't have a CHECK constraint on purpose — adding a
-- new action should not require a migration, and invalid values won't break
-- anything (reconciliation queries filter on known actions).
CREATE TABLE IF NOT EXISTS public.meetup_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  action TEXT NOT NULL,              -- 'view_details' | 'tap_call' | 'tap_navigate' | 'confirm_i_went'
  metadata JSONB,                    -- flexible: plan_id, action_target (deep_link url), lang
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS meetup_attributions_user_idx
  ON public.meetup_attributions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS meetup_attributions_venue_idx
  ON public.meetup_attributions (venue_id, action, created_at DESC);

CREATE INDEX IF NOT EXISTS meetup_attributions_match_idx
  ON public.meetup_attributions (match_id, created_at DESC)
  WHERE match_id IS NOT NULL;

ALTER TABLE public.meetup_attributions ENABLE ROW LEVEL SECURITY;

-- Users can read their own attributions (for the "where I went" history UI later).
-- Service role bypasses for cross-user queries (admin dashboards, reconciliation).
CREATE POLICY meetup_attributions_self_read ON public.meetup_attributions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- No insert policy for authenticated: writes go through /api/venues/track
-- which is service-role-backed (so the user_id we write is what the JWT
-- resolves to, and we never trust the client to self-attest user_id).
-- No update / delete for the same reason: attribution rows are append-only
-- evidence for the future 返点 reconciliation.
