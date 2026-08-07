import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { json, preflight, requireUser, safeError } from "@/lib/api/_helpers.server";
import { llmChatEx, safeParseJSON } from "@/lib/api/_llm.server";
import { getCachedResponse, hashInputs, setCachedResponse } from "@/lib/api/_ai-cache.server";
import {
  buildDeepSys,
  buildDeepUser,
  buildMatchSys,
  buildMatchUser,
} from "@/lib/api/_match-prompts.server";
import { selectPromptVersion } from "@/lib/api/_prompt-versions.server";
import { embedText, profileToEmbeddingText } from "@/lib/api/_embeddings.server";
import { sendEmail } from "@/lib/email/send";
import {
  geocodeCity,
  getCityCentroid,
  haversineKm,
  isVenueOpenAt,
  kmToWalkingMinutes,
  midpoint,
} from "@/lib/api/_geo.server";

const VALID_SCENARIOS = new Set(["business", "dating", "partner"]);
const SCENARIO_LABEL: Record<string, string> = {
  dating: "恋爱",
  business: "事业合作",
  partner: "兴趣搭子",
};

type ParsedT = {
  best_index?: number;
  match_score?: number;
  name?: string;
  headline?: string;
  bio?: string;
  summary?: string;
  reason?: string;
  compatibility_equation?: string;
  paradox_intersection?: {
    a_paradox?: string;
    how_b_loosens?: string;
    risk?: string;
  };
  attachment_dance?: {
    a_style?: string;
    b_style?: string;
    why_it_works?: string;
    landmine?: string;
  };
  resonance?: string[];
  complementarity?: string[];
  friction?: string[];
  chemistry?: {
    first_10_minutes?: string;
    the_unspoken?: string;
  };
  growth?: {
    in_6_months?: string;
    the_third_thing?: string;
  };
  compatibility_breakdown?: {
    resonance?: number;
    complementarity?: number;
    friction_risk?: number;
    chemistry?: number;
    growth_potential?: number;
  };
  shared_interests?: string[];
  meet_plan?: {
    when?: string;
    where?: string;
    location_intro?: string;
    dress_code?: string;
    icebreakers?: string[];
    duration?: string;
    budget?: string;
    pitfalls?: string[];
    highlights?: string[];
  };
};

type DeepT = {
  paradox_resolution?: {
    a_paradox?: string;
    how_b_resolves?: string;
    why?: string;
  };
  timeline?: Array<{
    phase?: string;
    what_happens?: string;
    signals_to_watch?: string;
  }>;
  conversation_arc?: {
    opening?: string;
    warming?: string;
    depth?: string;
    closing?: string;
  };
  follow_up_strategy?: {
    day_1?: string;
    week_1?: string;
    month_1?: string;
  };
  long_term_health?: {
    a_must_adjust?: string;
    b_must_adjust?: string;
    shared_practice?: string;
  };
};

/**
 * POST /api/ai/match — strict 1:1 real-user matching.
 * - Picks the best real user (DeepSeek scored) from other users who authorized
 *   the same scenario and have a profile.
 * - If none, enqueues the requester to `waitlist` and returns waitlisted=true.
 * - On success: creates a match for both sides, generates a meet plan via
 *   DeepSeek, persists to `meet_plans`, and emails the linQ plan to both
 *   users' registered addresses.
 */
export const Route = createFileRoute("/api/ai/match")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const { userId, supabase } = auth;

        let body: { scenario?: unknown; lang?: unknown } = {};
        try {
          body = await request.json();
        } catch {
          /* allow empty body */
        }
        const scenario =
          typeof body.scenario === "string" && VALID_SCENARIOS.has(body.scenario)
            ? (body.scenario as "business" | "dating" | "partner")
            : "dating";
        const lang: "zh" | "en" | "yue" =
          body.lang === "en" ? "en" : body.lang === "yue" ? "yue" : "zh";
        const llmLang: "zh" | "en" | "yue" = lang;
        const promptVersion = selectPromptVersion("match", userId);

        // 1) Load my latest AI profile and registered email.
        const { data: latestProfile } = await supabase
          .from("user_profiles")
          .select("profile_data, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!latestProfile) {
          return json({ error: "Generate your profile first" }, { status: 400 }, request);
        }
        const { data: meUser } = await supabaseAdmin.auth.admin.getUserById(userId);
        const myEmail = meUser?.user?.email ?? "";

        // 2) Find authorized real candidates (admin bypasses RLS for discovery).
        const { data: authed } = await supabaseAdmin
          .from("user_authorizations")
          .select("user_id")
          .eq(scenario, true)
          .eq("discoverable" as never, true)
          .neq("user_id", userId);
        const candidateIds = (authed ?? []).map((c) => c.user_id);

        // Exclude users I'm already matched with for this scenario.
        let excluded = new Set<string>();
        if (candidateIds.length) {
          const { data: prev } = await supabaseAdmin
            .from("matches")
            .select("matched_user_id")
            .eq("user_id", userId)
            .eq("scenario", scenario)
            .in("matched_user_id", candidateIds);
          excluded = new Set((prev ?? []).map((r) => r.matched_user_id));
        }
        const availableIds = candidateIds.filter((id) => !excluded.has(id));

        // Fetch latest profile per available candidate.
        type Cand = { user_id: string; profile_data: unknown };
        const candidates: Cand[] = [];
        if (availableIds.length) {
          const { data: profs } = await supabaseAdmin
            .from("user_profiles")
            .select("user_id, profile_data, created_at")
            .in("user_id", availableIds)
            .order("created_at", { ascending: false });
          const seen = new Set<string>();
          for (const p of profs ?? []) {
            if (!seen.has(p.user_id)) {
              seen.add(p.user_id);
              candidates.push({ user_id: p.user_id, profile_data: p.profile_data });
            }
          }
        }

        // 3) No real candidate → fall back to AI personas.
        // Cold-start solution: the ai_personas table holds 200+ curated
        // profiles (100 深圳 + 100 上海) so the first user — with zero
        // other real users — still gets a complete matching experience.
        // Personas are openly tagged as 'is_real_user: false' in the UI;
        // they do NOT trigger the mutual-email flow.
        if (candidates.length === 0) {
          // Load the user's city from their latest profile, default
          // to shenzhen.
          const myCity =
            (latestProfile.profile_data as { city?: string } | null)?.city ?? "shenzhen";

          // Exclude personas this user has already matched for this scenario.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: seen } = await (supabaseAdmin.from as any)("user_persona_matches")
            .select("persona_id")
            .eq("user_id", userId)
            .eq("scenario", scenario);
          const seenIds = ((seen ?? []) as { persona_id: string }[]).map((r) => r.persona_id);

          // Phase 2: vector pre-filtering. Try to load the requester's
          // embedding; if absent, compute it on the fly (cached in the
          // table for next time).
          let userEmbedding: number[] | null = null;
          try {
            const { data: embedRow } = await supabaseAdmin
              .from("user_profiles")
              .select("embedding")
              .eq("user_id", userId)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            const existing = (embedRow as { embedding?: number[] } | null)?.embedding;
            if (Array.isArray(existing) && existing.length === 1536) {
              userEmbedding = existing;
            } else {
              const embedText_ = profileToEmbeddingText({
                headline: (latestProfile.profile_data as { ai?: { headline?: string } } | null)?.ai
                  ?.headline,
                bio: (latestProfile.profile_data as { input?: string } | null)?.input,
                scenario_tags: [scenario],
                profile_data: latestProfile.profile_data as Record<string, unknown>,
              });
              const embedResult = await embedText(embedText_);
              if (embedResult.ok) {
                userEmbedding = embedResult.embedding;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (supabaseAdmin.rpc as any)("set_user_profile_embedding", {
                  p_user_id: userId,
                  p_embedding: embedResult.embedding,
                }).catch(() => {
                  // Non-fatal: the match can still proceed.
                });
              }
            }
          } catch (e) {
            console.warn(
              JSON.stringify({ at: "match:embedding_failed", userId, scenario, error: String(e) }),
            );
          }

          let personas: Array<Record<string, unknown>> = [];
          if (userEmbedding) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: rpcPersonas, error: rpcErr } = await (supabaseAdmin.rpc as any)(
              "match_personas_by_embedding",
              {
                p_user_embedding: userEmbedding,
                p_city: myCity,
                p_scenario: scenario,
                p_seen_ids: seenIds.length ? seenIds : null,
                p_limit: 5,
              },
            );
            if (rpcErr) {
              console.warn(
                JSON.stringify({ at: "match:rpc_failed", userId, scenario, error: rpcErr.message }),
              );
            } else {
              personas = (rpcPersonas ?? []) as Array<Record<string, unknown>>;
            }
          }

          // Fallback when vector search is unavailable or returned nothing.
          if (!personas || personas.length === 0) {
            let personaQuery = supabaseAdmin
              .from("ai_personas")
              .select(
                "id, name, age, city, occupation, headline, bio, scenario_tags, profile_data, image_url, match_count",
              )
              .eq("is_active", true)
              .eq("city", myCity)
              .contains("scenario_tags", [scenario]);

            if (seenIds.length > 0) {
              personaQuery = personaQuery.not("id", "in", `(${seenIds.join(",")})`);
            }

            const { data: fallbackPersonas } = await personaQuery
              .order("display_priority", { ascending: false })
              .order("last_matched_at", { ascending: true, nullsFirst: true })
              .order("match_count", { ascending: true })
              .limit(5);
            personas = (fallbackPersonas ?? []) as Array<Record<string, unknown>>;
          }

          if (!personas || personas.length === 0) {
            // No personas in this city for this scenario — still
            // nothing to match. Drop to waitlist as before.
            if (myEmail) {
              await supabaseAdmin.from("waitlist").insert({
                email: myEmail,
                status: `waiting:${scenario}`,
              });
            }
            return json({
              data: [],
              waitlisted: true,
              scenario,
              message: "暂无匹配，已加入等待池，待有合适人选时我们将通过邮件通知您。",
            });
          }

          // We have personas. Skip the waitlist (the user has 5
          // viable AI candidates) and let the LLM scoring run on
          // them as if they were real users — the prompt doesn't
          // know the difference, and the match row gets a
          // is_real_user: false flag.
          for (const p of personas) {
            candidates.push({
              user_id: String(p.id ?? ""), // ai_personas.id is reused as the user_id slot
              profile_data: {
                ...(p.profile_data as Record<string, unknown>),
                _is_ai_persona: true,
                _ai_persona_meta: {
                  name: p.name,
                  age: p.age,
                  occupation: p.occupation,
                  headline: p.headline,
                  bio: p.bio,
                  image_url: p.image_url,
                },
              },
            });
          }
        }

        // 4) DeepSeek: pick best match + craft meeting plan + give deep
        // 5-axis analysis (resonance / complementarity / friction /
        // chemistry / growth). The previous version of this prompt only
        // asked for a single `reason` field which produced surface-level
        // "you both like X" outputs. The 5-axis split forces the model
        // to think about each layer of compatibility independently.
        //
        // v4: two-round pipeline. Round 1 = the 5-axis analysis + meet plan
        // (the same as v3 but bigger). Round 2 = timeline / conversation
        // arc / follow-up / paradox resolution. Splitting these rounds
        // forces the model to do *separate* reasoning for each rather
        // than collapsing them into one shallow paragraph.
        const sys = buildMatchSys(promptVersion);
        const prompt = buildMatchUser(
          SCENARIO_LABEL[scenario],
          latestProfile as { profile_data: unknown },
          candidates,
          promptVersion,
        );

        // P1-3: result cache. Match analysis for the same user + scenario +
        // candidate set is expensive and often repeated when users retry.
        const candidateSignature = candidates.map((c) => c.user_id).sort();
        const matchCacheKey = await hashInputs("match", userId, scenario, lang, candidateSignature);
        type CachedMatch = { parsed: ParsedT; deep: DeepT; provider?: string };
        const cachedMatch = await getCachedResponse<CachedMatch>(supabase, matchCacheKey);
        let parsed: ParsedT = cachedMatch?.response?.parsed ?? {};
        let deep: DeepT = cachedMatch?.response?.deep ?? {};
        let matchProvider = cachedMatch?.response?.provider;

        const hasCache = typeof cachedMatch?.response?.parsed?.best_index === "number";

        if (!hasCache) {
          const round1Res = await llmChatEx(
            [
              { role: "system", content: sys },
              { role: "user", content: prompt },
            ],
            {
              json: true,
              temperature: 0.9,
              max_tokens: 2400,
              label: "match:round-1",
              traceId: `${userId}:${scenario}:r1`,
              deadlineMs: 50_000,
            },
          );
          const raw = round1Res?.content ?? null;
          parsed = safeParseJSON<ParsedT>(raw) ?? {};
          matchProvider = round1Res?.provider ?? matchProvider;
        }

        // ============================================================
        // Phase 3: ground the meet-plan in a real venue.
        // Resolve coordinates for A (requester) and B (matched), then
        // pick the nearest venue that matches scenario vibes and is
        // likely open at the suggested time.
        // ============================================================
        const bestIdx = Math.max(
          0,
          Math.min(candidates.length - 1, Number(parsed.best_index ?? 0)),
        );
        const matched = candidates[bestIdx];
        const myCity = (latestProfile.profile_data as { city?: string } | null)?.city ?? "shenzhen";

        const myCoords = {
          lat:
            (latestProfile as { lat?: number }).lat ??
            (latestProfile.profile_data as { lat?: number }).lat ??
            getCityCentroid(myCity).lat,
          lng:
            (latestProfile as { lng?: number }).lng ??
            (latestProfile.profile_data as { lng?: number }).lng ??
            getCityCentroid(myCity).lng,
        };

        let theirCoords = myCoords;
        if (matched) {
          const isAIPersonaMatch = Boolean(
            (matched as { _is_ai_persona?: boolean })._is_ai_persona,
          );
          if (isAIPersonaMatch) {
            theirCoords = getCityCentroid(myCity);
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: theirProfile } = await (supabaseAdmin.from as any)("user_profiles")
              .select("lat, lng, profile_data")
              .eq("user_id", matched.user_id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            const theirProfileTyped = theirProfile as {
              lat?: number;
              lng?: number;
              profile_data?: { lat?: number; lng?: number };
            } | null;
            theirCoords = {
              lat:
                theirProfileTyped?.lat ??
                theirProfileTyped?.profile_data?.lat ??
                getCityCentroid(myCity).lat,
              lng:
                theirProfileTyped?.lng ??
                theirProfileTyped?.profile_data?.lng ??
                getCityCentroid(myCity).lng,
            };
          }
        }

        const center = midpoint(myCoords.lat, myCoords.lng, theirCoords.lat, theirCoords.lng);

        type VenueRow = {
          id: string;
          name: string;
          district: string | null;
          address: string | null;
          lat: number;
          lng: number;
          cuisine_tags: string[];
          vibe_tags: string[];
          price_per_person: number | null;
          rating: number | null;
          opening_hours: string | null;
          distance_km: number;
        };

        let bestVenue: VenueRow | null = null;
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: nearby } = await (supabaseAdmin.rpc as any)("nearby_venues", {
            p_city: myCity,
            p_lat: center.lat,
            p_lng: center.lng,
            p_max_km: 10,
            p_limit: 30,
          });
          const scenarioVibes: Record<string, string[]> = {
            dating: ["适合聊天", "浪漫"],
            business: ["安静", "适合聊天", "高端"],
            partner: ["适合拍照", "轻松", "适合聊天"],
          };
          const preferred = scenarioVibes[scenario] ?? [];
          const planTime = new Date();
          planTime.setDate(planTime.getDate() + ((6 - planTime.getDay() + 7) % 7 || 7));
          planTime.setHours(19, 0, 0, 0);

          const scored = ((nearby ?? []) as VenueRow[]).map((v) => {
            const vibeScore = preferred.some((tag) => v.vibe_tags.includes(tag)) ? 1 : 0;
            const openScore = isVenueOpenAt(v.opening_hours, planTime) ? 1 : 0;
            const priceScore = v.price_per_person && v.price_per_person <= 300 ? 1 : 0;
            return {
              ...v,
              score: vibeScore + openScore + priceScore,
            };
          });
          scored.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.distance_km - b.distance_km;
          });
          bestVenue = scored[0] ?? null;
        } catch (e) {
          console.warn(
            JSON.stringify({ at: "match:venue_lookup_failed", userId, scenario, error: String(e) }),
          );
        }

        // ============================================================
        // ROUND 2 (v4) — Deep temporal + interaction analysis
        //   - paradox_resolution: how B's presence specifically addresses
        //     A's paradoxes (drawn from the latest profile data on A)
        //   - timeline: 3-month / 6-month / 1-year projection
        //   - conversation_arc: the 30-minute first-meeting flow
        //   - follow_up_strategy: day_1 / week_1 / month_1
        // ============================================================
        const deepSys = buildDeepSys(llmLang, promptVersion);
        const deepUserPrompt = buildDeepUser(
          llmLang,
          latestProfile as { profile_data: unknown },
          bestIdx,
          candidates,
          promptVersion,
        );

        if (!hasCache) {
          const round2Res = await llmChatEx(
            [
              { role: "system", content: deepSys },
              { role: "user", content: deepUserPrompt },
            ],
            {
              json: true,
              temperature: 0.9,
              max_tokens: 2000,
              label: "match:round-2",
              traceId: `${userId}:${scenario}:r2`,
              deadlineMs: 50_000,
            },
          );
          const deepRaw = round2Res?.content ?? null;
          deep = safeParseJSON<DeepT>(deepRaw) ?? {};

          // Persist the expensive two-round analysis so retries with the
          // same candidate set don't re-call the model.
          await setCachedResponse(
            supabase,
            matchCacheKey,
            "match",
            matchCacheKey,
            matchProvider,
            { parsed, deep, provider: matchProvider },
            24,
          );
        }
        const score = typeof parsed.match_score === "number" ? parsed.match_score : 82.5;

        const plan = parsed.meet_plan ?? {
          when: "本周六下午 3:00",
          where: "市中心一家安静的精品咖啡馆",
          location_intro: "环境安静、便于深度交谈的独立精品咖啡馆。",
          dress_code: "简洁舒适的休闲风",
          icebreakers: [
            "最近让你感到兴奋的一件事是什么？",
            "如果可以教别人一小时课，你会教什么？",
            "你最近做过的最满意的事是什么？",
          ],
          duration: "60-90 分钟",
          budget: "人均 80-150 元",
          pitfalls: [
            "避免一上来就聊敏感隐私话题",
            "避免长时间单方面输出，多倾听",
            "避免过早讨论金钱与得失评价",
          ],
          highlights: [
            "节奏与生活方式高度契合",
            "兴趣与价值观存在天然交集",
            "彼此能在对方擅长领域获得启发",
          ],
        };

        // Phase 3: override the LLM's guessed venue with a real venue
        // from the database, computing the actual straight-line distance
        // between the two users.
        if (bestVenue) {
          const distanceToMid = haversineKm(center.lat, center.lng, bestVenue.lat, bestVenue.lng);
          const walkingMin = kmToWalkingMinutes(distanceToMid);
          plan.where = `${myCity === "shenzhen" ? "深圳" : "上海"} · ${bestVenue.district ?? ""} · ${bestVenue.name}`;
          plan.location_intro = `${bestVenue.address ?? "地址待补充"}。${bestVenue.vibe_tags.slice(0, 2).join("、")}，人均约 ${bestVenue.price_per_person ?? "?"} 元，距你们中点步行约 ${walkingMin} 分钟。`;
          plan.budget = `人均 ${bestVenue.price_per_person ?? "80-150"} 元`;
          (plan as Record<string, unknown>).venue_id = bestVenue.id;
          (plan as Record<string, unknown>).distance_walking_minutes = walkingMin;
        }

        const details = {
          name: parsed.name ?? "匹配对象",
          headline: parsed.headline ?? "",
          bio: parsed.bio ?? "",
          summary: parsed.summary ?? parsed.bio?.slice(0, 60) ?? "",
          shared_interests: Array.isArray(parsed.shared_interests) ? parsed.shared_interests : [],
          // v3 deep analysis
          resonance: Array.isArray(parsed.resonance) ? parsed.resonance : [],
          complementarity: Array.isArray(parsed.complementarity) ? parsed.complementarity : [],
          friction: Array.isArray(parsed.friction) ? parsed.friction : [],
          chemistry: {
            first_10_minutes: parsed.chemistry?.first_10_minutes ?? "",
            the_unspoken: parsed.chemistry?.the_unspoken ?? "",
          },
          growth: {
            in_6_months: parsed.growth?.in_6_months ?? "",
            the_third_thing: parsed.growth?.the_third_thing ?? "",
          },
          compatibility_breakdown: parsed.compatibility_breakdown ?? null,
          // v5 relationship-engine outputs
          compatibility_equation: parsed.compatibility_equation ?? "",
          paradox_intersection: parsed.paradox_intersection ?? null,
          attachment_dance: parsed.attachment_dance ?? null,
          // v4 deep analysis
          paradox_resolution: deep.paradox_resolution ?? null,
          timeline: Array.isArray(deep.timeline) ? deep.timeline : [],
          conversation_arc: deep.conversation_arc ?? null,
          follow_up_strategy: deep.follow_up_strategy ?? null,
          long_term_health: deep.long_term_health ?? null,
          // legacy (back-compat with /match detail page that may still read it)
          reason: parsed.reason ?? "",
          // P0 of the cold-start solution: the matched.user_id might
          // be an AI persona, not a real user. Surface that to the
          // UI as a flag. We detect it via the _is_ai_persona marker
          // we set on the candidate's profile_data above.
          is_real_user: true,
          matched_type: "real" as const,
          ai_provider: matchProvider ? `${matchProvider}-2round` : "fallback",
          prompt_version: promptVersion,
        };

        const isAIPersona = Boolean((matched as { _is_ai_persona?: boolean })._is_ai_persona);

        // Patch the details flags when the match is an AI persona.
        if (isAIPersona) {
          (details as Record<string, unknown>).is_real_user = false;
          (details as Record<string, unknown>).matched_type = "persona";
        }

        // 5) Persist match for requester. For AI personas, we DON'T
        //    write a reverse row on the persona side (they have no
        //    auth.users row). The persona is "matched" only from the
        //    user's perspective.
        const { data: myMatch, error: insErr } = await supabase
          .from("matches")
          .insert({
            user_id: userId,
            matched_user_id: matched.user_id,
            matched_target_id: matched.user_id,
            match_score: score,
            scenario,
            is_ai_persona: isAIPersona,
            details: details as never,
          } as never)
          .select("*")
          .single();
        if (insErr) return json({ error: safeError(insErr) }, { status: 500 }, request);

        // Only create a reverse row + email flow for REAL matches.
        // AI persona matches skip both — no other party to email.
        if (!isAIPersona) {
          await supabaseAdmin.from("matches").insert({
            user_id: matched.user_id,
            matched_user_id: userId,
            matched_target_id: userId,
            match_score: score,
            scenario,
            is_ai_persona: false,
            details: { ...details, name: "您的匹配对象" } as never,
          } as never);
        } else {
          // Record this user-persona pairing so we don't repeat it.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabaseAdmin.from as any)("user_persona_matches")
            .insert({
              user_id: userId,
              persona_id: matched.user_id,
              scenario,
            })
            .catch(() => {
              // Ignore duplicate-key races; the primary key prevents dupes.
            });

          // Bump the persona's match_count + last_matched_at for
          // analytics (which personas get picked most).
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabaseAdmin.rpc as any)("increment_persona_match_count", {
            persona_id: matched.user_id,
          });
        }

        // 6) Persist meet plan.
        const plan_content = {
          version: "v1",
          scenario,
          ai: plan,
          ai_provider: matchProvider ? matchProvider : "fallback",
          prompt_version: promptVersion,
          generated_at: new Date().toISOString(),
        };
        const { data: planRow } = await supabaseAdmin
          .from("meet_plans")
          .insert({ match_id: myMatch.id, plan_content: plan_content as never })
          .select("*")
          .single();

        // 7) Email both users via Resend — only for
        //    real matches. AI persona matches have no other party to
        //    email, so we skip the queue entirely.
        if (!isAIPersona) {
          const { data: otherUser } = await supabaseAdmin.auth.admin.getUserById(matched.user_id);
          const otherEmail = otherUser?.user?.email ?? "";
          const html = renderPlanHtml(plan);
          const text = renderPlanText(plan);

          for (const to of [myEmail, otherEmail].filter(Boolean)) {
            sendEmail({
              to,
              subject: "【linQ】您的专属见面方案已生成",
              html,
              text,
              tag: "meet_plan",
              traceId: `${userId}:${myMatch.id}`,
            }).catch((e: unknown) => {
              console.warn(
                JSON.stringify({
                  at: "match:send_meet_plan_email_failed",
                  userId,
                  matchId: myMatch.id,
                  to,
                  error: e instanceof Error ? e.message : String(e),
                }),
              );
            });
          }
        }

        const message = isAIPersona
          ? "已为你匹配一位 AI 角色，可先体验完整流程。真实用户加入后会优先匹配真人。"
          : "匹配成功，见面方案已发送至双方邮箱。";

        return json({
          data: [myMatch],
          plan: planRow,
          waitlisted: false,
          matched_type: isAIPersona ? "persona" : "real",
          scenario,
          message,
          prompt_version: promptVersion,
        });
      },
    },
  },
});

function escapeHtml(s: string): string {
  return String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

type PlanForEmail = {
  when?: string;
  where?: string;
  location_intro?: string;
  dress_code?: string;
  icebreakers?: string[];
  duration?: string;
  budget?: string;
  pitfalls?: string[];
  highlights?: string[];
};

function liList(items?: string[]): string {
  return (items ?? []).map((s) => `<li style="margin:4px 0">${escapeHtml(s)}</li>`).join("");
}

function renderPlanHtml(p: PlanForEmail): string {
  return `<!doctype html><html lang="zh"><body style="margin:0;padding:24px;background:#f7f7f8;font-family:-apple-system,Helvetica,Arial,sans-serif;color:#111">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e5e7;border-radius:10px;padding:32px">
    <h2 style="margin:0 0 12px;font-size:20px">【linQ】您的专属见面方案已生成</h2>
    <p style="margin:0 0 16px;line-height:1.7">恭喜您匹配成功！根据双方画像，linQ 为您定制完整赴约计划：</p>
    <ol style="line-height:1.9;padding-left:20px;margin:0 0 16px">
      <li><b>推荐会面时间：</b>${escapeHtml(p.when ?? "")}</li>
      <li><b>精准碰面地点：</b>${escapeHtml(p.where ?? "")}${p.location_intro ? `<div style="color:#666;font-size:13px;margin-top:2px">${escapeHtml(p.location_intro)}</div>` : ""}</li>
      <li><b>着装 Dress Code：</b>${escapeHtml(p.dress_code ?? "")}</li>
      <li><b>破冰开场话术：</b><ul style="padding-left:18px;margin:6px 0">${liList(p.icebreakers)}</ul></li>
      <li><b>建议会面时长：</b>${escapeHtml(p.duration ?? "")}</li>
      <li><b>人均消费参考：</b>${escapeHtml(p.budget ?? "")}</li>
      <li><b>沟通避坑提醒：</b><ul style="padding-left:18px;margin:6px 0">${liList(p.pitfalls)}</ul></li>
      <li><b>双方适配亮点：</b><ul style="padding-left:18px;margin:6px 0">${liList(p.highlights)}</ul></li>
    </ol>
    <p style="margin:0 0 16px;line-height:1.7">可依托方案轻松线下见面，开启事业 / 恋爱 / 兴趣新联结。</p>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
    <p style="margin:0;color:#888;font-size:12px">来自：linQ | claudematch.com</p>
  </div></body></html>`;
}

function numList(items?: string[]): string {
  return (items ?? []).map((s, i) => `   ${i + 1}) ${s}`).join("\n");
}

function renderPlanText(p: PlanForEmail): string {
  return `【linQ】您的专属见面方案已生成

恭喜您匹配成功！根据双方画像，linQ 为您定制完整赴约计划：
1. 推荐会面时间：${p.when ?? ""}
2. 精准碰面地点：${p.where ?? ""}${p.location_intro ? `（${p.location_intro}）` : ""}
3. 着装 Dress Code：${p.dress_code ?? ""}
4. 破冰开场话术：
${numList(p.icebreakers)}
5. 建议会面时长：${p.duration ?? ""}
6. 人均消费参考：${p.budget ?? ""}
7. 沟通避坑提醒：
${numList(p.pitfalls)}
8. 双方适配亮点：
${numList(p.highlights)}

可依托方案轻松线下见面，开启事业 / 恋爱 / 兴趣新联结。
来自：linQ | claudematch.com`;
}
