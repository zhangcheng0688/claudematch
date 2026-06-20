-- AI result cache layer (P1-3).
-- Caches LLM-generated responses for profile, match, and meet-plan calls
-- so repeated identical requests don't re-hit the model providers.

create table if not exists ai_cache (
  id bigint generated always as identity primary key,
  cache_key text not null unique,
  call_type text not null,           -- 'profile' | 'match' | 'meet-plan'
  payload_hash text not null,        -- sha256 of the deterministic inputs
  provider text,                     -- which provider produced the cached response
  response_json jsonb,               -- the parsed AI response
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_cache_expires_at_idx on ai_cache(expires_at);
create index if not exists ai_cache_call_type_payload_idx on ai_cache(call_type, payload_hash);

-- Auto-cleanup expired rows once an hour via pg_cron if available; otherwise
-- the application ignores expired entries and a background job can vacuum.
