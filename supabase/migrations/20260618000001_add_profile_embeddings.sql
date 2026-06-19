-- 20260618000001_add_profile_embeddings.sql
--
-- Phase 2 of the algorithm optimization: add vector embeddings for
-- user profiles and AI personas so match.ts can pre-filter candidates
-- by cosine similarity instead of scanning the whole pool.
--
-- Uses OpenAI text-embedding-3-small (1536 dims). Embeddings are
-- optional at the schema level; missing embeddings fall back to the
-- existing priority/recency ordering.

-- Enable pgvector extension. Supabase already ships this; the IF NOT
-- EXISTS makes the migration idempotent.
CREATE EXTENSION IF NOT EXISTS vector;

-- User profile embedding. Updated by generate-profile.ts after each
-- successful AI profile generation.
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- AI persona embedding. Backfilled by scripts/compute-persona-embeddings.mjs
-- after the persona seed import.
ALTER TABLE public.ai_personas
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Approximate nearest-neighbor indexes for fast pre-filtering.
CREATE INDEX IF NOT EXISTS ai_personas_embedding_idx
  ON public.ai_personas
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS user_profiles_embedding_idx
  ON public.user_profiles
  USING hnsw (embedding vector_cosine_ops);

-- RPC: find the top-K most similar AI personas for a given user
-- embedding. Filters by city, scenario, active flag, and excludes
-- already-seen personas. Falls back gracefully when embedding is NULL.
CREATE OR REPLACE FUNCTION public.match_personas_by_embedding(
  p_user_embedding vector(1536),
  p_city text,
  p_scenario text,
  p_seen_ids uuid[],
  p_limit int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  name text,
  age int,
  city text,
  occupation text,
  headline text,
  bio text,
  image_url text,
  scenario_tags text[],
  profile_data jsonb,
  is_active boolean,
  display_priority int,
  match_count int,
  last_matched_at timestamptz,
  similarity float
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p.id,
    p.name,
    p.age,
    p.city,
    p.occupation,
    p.headline,
    p.bio,
    p.image_url,
    p.scenario_tags,
    p.profile_data,
    p.is_active,
    p.display_priority,
    p.match_count,
    p.last_matched_at,
    CASE
      WHEN p.embedding IS NULL OR p_user_embedding IS NULL THEN 0
      ELSE 1 - (p.embedding <=> p_user_embedding)
    END::float AS similarity
  FROM public.ai_personas p
  WHERE p.is_active = true
    AND p.city = p_city
    AND p.scenario_tags @> ARRAY[p_scenario]
    AND NOT (p.id = ANY(COALESCE(p_seen_ids, ARRAY[]::uuid[])))
  ORDER BY
    CASE WHEN p.embedding IS NOT NULL AND p_user_embedding IS NOT NULL THEN 0 ELSE 1 END,
    p.embedding <=> p_user_embedding ASC NULLS LAST,
    p.display_priority DESC,
    p.last_matched_at ASC NULLS FIRST,
    p.match_count ASC
  LIMIT p_limit;
$$;

-- RPC: backfill a single AI persona embedding (used by batch script).
CREATE OR REPLACE FUNCTION public.set_persona_embedding(
  p_persona_id uuid,
  p_embedding vector(1536)
)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.ai_personas
  SET embedding = p_embedding
  WHERE id = p_persona_id;
$$;

-- RPC: backfill a single user profile embedding (used if generation
-- somehow missed the write).
CREATE OR REPLACE FUNCTION public.set_user_profile_embedding(
  p_user_id uuid,
  p_embedding vector(1536)
)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.user_profiles
  SET embedding = p_embedding
  WHERE user_id = p_user_id;
$$;
