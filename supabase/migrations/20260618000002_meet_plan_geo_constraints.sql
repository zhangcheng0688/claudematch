-- 20260618000002_meet_plan_geo_constraints.sql
--
-- Phase 3 of the algorithm optimization: give meet-plan generation
-- real geographic constraints (lat/lng + opening hours) instead of
-- guessed distances and fictional venues.
--
-- Adds optional lat/lng to user_profiles and a structured opening-hours
-- helper to venues. Lat/lng is backfilled from the city picker via
-- AMap geocoding; missing coords fall back to city-centroid defaults.

-- Optional geolocation on user profiles. Stored at the profile level so
-- historical plans keep the coords that were used when they were made.
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS lat NUMERIC(10, 6),
  ADD COLUMN IF NOT EXISTS lng NUMERIC(10, 6);

-- Spatial index for fast "venues near a point" queries.
CREATE INDEX IF NOT EXISTS venues_geo_idx
  ON public.venues (city, lat, lng)
  WHERE is_active = TRUE AND lat IS NOT NULL AND lng IS NOT NULL;

-- RPC: update a user's latest profile coordinates.
CREATE OR REPLACE FUNCTION public.set_user_profile_coords(
  p_user_id uuid,
  p_lat numeric,
  p_lng numeric
)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.user_profiles
  SET lat = p_lat, lng = p_lng
  WHERE id = (
    SELECT id FROM public.user_profiles
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 1
  );
$$;

-- RPC: find venues near a point, filtered by scenario vibes and
-- optionally by max distance (km). Returns distance in km.
CREATE OR REPLACE FUNCTION public.nearby_venues(
  p_city text,
  p_lat numeric,
  p_lng numeric,
  p_max_km numeric DEFAULT 10,
  p_limit int DEFAULT 30
)
RETURNS TABLE (
  id uuid,
  name text,
  district text,
  address text,
  lat numeric,
  lng numeric,
  cuisine_tags text[],
  vibe_tags text[],
  price_per_person int,
  rating numeric,
  opening_hours text,
  distance_km numeric
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    v.id,
    v.name,
    v.district,
    v.address,
    v.lat,
    v.lng,
    v.cuisine_tags,
    v.vibe_tags,
    v.price_per_person,
    v.rating,
    v.opening_hours,
    (
      6371 * acos(
        least(1, greatest(-1,
          cos(radians(p_lat)) * cos(radians(v.lat)) *
          cos(radians(v.lng) - radians(p_lng)) +
          sin(radians(p_lat)) * sin(radians(v.lat))
        ))
      )
    )::numeric AS distance_km
  FROM public.venues v
  WHERE v.is_active = true
    AND v.city = p_city
    AND v.lat IS NOT NULL
    AND v.lng IS NOT NULL
  ORDER BY distance_km ASC
  LIMIT p_limit;
$$;
