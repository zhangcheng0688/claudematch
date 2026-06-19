# Algorithm Optimization — Plan B

## Overview

We optimized the Claudematch matching algorithm along three axes:

1. **Profile-generation latency** — compressed the 6-round / 8-call DeepSeek
   pipeline into 3 calls.
2. **Match pre-filtering** — added OpenAI `text-embedding-3-small` vectors and
   pgvector similarity search for AI persona retrieval.
3. **Meet-plan realism** — grounded venue recommendations in real `venues` rows
   with lat/lng, opening-hour checks, and actual straight-line distances.

## Phase 1: 3-call profile pipeline

### Before

- Round 1: fact extraction
- Round 2: deep inference
- Round 3: scene/context prediction (parallel with R2)
- Round 4: synthesis
- Round 5: self-critique (parallel with R6)
- Round 6: 3-persona tournament
- Round 6.5: final polish

Total: **8 DeepSeek calls** per profile generation.

### After

- **Call 1 — Perceive**: facts + inference + scene/context in one call.
- **Call 2 — Synthesize**: headline / narrative / dimensions.
- **Call 3 — Refine**: internal critique + 3-persona tournament + final polish
  merged into a single adversarial refinement call.

Total: **3 DeepSeek calls** per profile generation.

### Expected impact

- Wall time: ~45–70s → ~20–35s (depending on DeepSeek congestion).
- Cost: ~60% reduction in input/output tokens for the same quality bar.
- Timeout risk on Lovable Cloudflare Workers (60s gateway): significantly lower.

## Phase 2: Vector pre-filtering for persona matches

### New infra

- `pgvector` extension enabled.
- `user_profiles.embedding vector(1536)` and `ai_personas.embedding vector(1536)`.
- HNSW cosine-similarity indexes.
- RPC `match_personas_by_embedding(user_embedding, city, scenario, seen_ids, limit)`.

### Flow

1. `generate-profile.ts` computes an embedding for the new profile and stores it.
2. `match.ts` loads the requester's embedding; if missing, computes and caches it.
3. Persona candidates are retrieved via vector similarity (with fallback to
   priority/recency ordering when embeddings are unavailable).
4. The LLM scoring round still runs on the top-K personas, preserving quality.

### Backfill

Run after importing `ai-personas-1000.sql`:

```bash
node --env-file=.env.local scripts/compute-persona-embeddings.mjs
```

## Phase 3: Geo-grounded meet plans

### New infra

- `user_profiles.lat` / `user_profiles.lng`.
- RPC `nearby_venues(city, lat, lng, max_km, limit)` returns venues ordered by
  haversine distance from a point.
- `src/lib/api/_geo.server.ts` provides haversine distance, walking-minute
  estimation, AMap geocoding, and opening-hour parsing.

### Flow

1. `set-city.ts` geocodes the selected city via AMap and stores lat/lng.
2. `match.ts` resolves both users' coordinates, computes the midpoint, queries
   nearby venues, scores by vibe + opening hours + price, and overrides the
   LLM's guessed `where`/`budget` with the real venue.
3. `meet-plan.ts` does the same for the multi-plan endpoint and computes real
   walking distances for every returned `venue_option`.

## A/B testing plan

We will run a 50/50 shadow test once deployed:

| Metric | Old (control) | New (treatment) |
|--------|---------------|-----------------|
| Profile generation wall time | ~45–70s | ~20–35s |
| Profile generation DeepSeek calls | 8 | 3 |
| Persona match candidate selection | priority/recency | vector similarity |
| Meet-plan venue grounding | fictional/guessed | real venues + hours + distance |

### Implementation

- Keep the old `generate-profile.ts` logic in a branch (`archive/v4-6round`) for
  emergency rollback.
- Add `ai_provider: "deepseek-3round"` to new profile rows; control rows remain
  `"deepseek-6round"`.
- Track per-request trace IDs and log call counts/labels so we can compare
  directly in Cloudflare logs.
- Monitor user feedback on profile quality (`pattern_feedback` agree/disagree
  rates) for 1 week before declaring treatment the winner.

## Deployment checklist

1. **Lovable Cloud**
   - Sync GitHub repo.
   - Add env var `OPENAI_API_KEY` (text-embedding-3-small).
   - Ensure `AMAP_WEB_API_KEY` is set for city geocoding.

2. **Supabase**
   - Run migration `20260618000001_add_profile_embeddings.sql`.
   - Run migration `20260618000002_meet_plan_geo_constraints.sql`.
   - Import `scripts/output/ai-personas-1000.sql` (if not already imported).
   - Regenerate Supabase types (`supabase gen types typescript --project-id ...`).
   - Backfill persona embeddings:
     ```bash
     node --env-file=.env.local scripts/compute-persona-embeddings.mjs
     ```

3. **Verification**
   - New user onboarding → city picker stores lat/lng.
   - Profile generation returns `ai_provider: "deepseek-3round"`.
   - Match fallback returns an AI persona and a real venue in `meet_plan`.
   - `meet-plan` endpoint returns venues with real `distance_walking_minutes`.

4. **Rollback**
   - Revert commit `11bb6e8` and redeploy if error rates or feedback scores
     regress.
