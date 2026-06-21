// src/lib/api/migrate-profile.ts
//
// Normalize an AiProfile across v1/v2/v3/v4 schemas so the SPA never
// has to defend-read every field with `?? chains`. Single migration
// point — when v5 lands, this is the only place to update.
//
// Version history (committed before the migrate step existed):
//   v1: { summary, traits, interests, communication_style, looking_for, ideal_match }
//   v2: + headline, narrative, patterns, dimensions
//   v3: + paradoxes, archetypes, match_signals, dimensions.signals
//   v4: + life_themes, scene_predictions, growth_stage, aesthetic_signature,
//         defense_mechanisms, communication_recipes

import type {
  AiProfile,
  AiPattern,
  AiDimension,
  AiParadox,
  AiArchetype,
  AiLifeTheme,
  AiScenePrediction,
  AiGrowthStage,
  AiAestheticSignature,
  AiDefenseMechanism,
  AiCommunicationRecipe,
  AiMatchSignals,
} from "@/types/match";

/** Coerce unknown JSON to AiProfile with safe defaults. The input is
 *  whatever Supabase returned for `profile_data.ai` (which may be
 *  null, an empty object, an old v1 shape, or a v4 shape). The output
 *  is always a fully-typed v4 AiProfile. */
export function migrateAiProfile(raw: unknown): AiProfile {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;

  const out: AiProfile = {
    // v1 fields, normalized
    summary:
      typeof r.summary === "string" ? r.summary : typeof r.bio === "string" ? r.bio : undefined,
    traits: isRecord(r.traits) ? (r.traits as Record<string, number>) : undefined,
    interests: Array.isArray(r.interests) ? (r.interests as string[]) : undefined,
    communication_style:
      typeof r.communication_style === "string" ? r.communication_style : undefined,
    looking_for: typeof r.looking_for === "string" ? r.looking_for : undefined,
    ideal_match: typeof r.ideal_match === "string" ? r.ideal_match : undefined,

    // v2 fields
    headline: typeof r.headline === "string" ? r.headline : undefined,
    narrative: typeof r.narrative === "string" ? r.narrative : undefined,
    patterns: Array.isArray(r.patterns) ? (r.patterns as AiPattern[]) : undefined,
    dimensions: Array.isArray(r.dimensions) ? (r.dimensions as AiDimension[]) : undefined,

    // v3 fields
    paradoxes: Array.isArray(r.paradoxes) ? (r.paradoxes as AiParadox[]) : undefined,
    archetypes: Array.isArray(r.archetypes) ? (r.archetypes as AiArchetype[]) : undefined,
    match_signals: isRecord(r.match_signals) ? (r.match_signals as AiMatchSignals) : undefined,

    // v4 fields
    life_themes: Array.isArray(r.life_themes) ? (r.life_themes as AiLifeTheme[]) : undefined,
    scene_predictions: Array.isArray(r.scene_predictions)
      ? (r.scene_predictions as AiScenePrediction[])
      : undefined,
    growth_stage: isRecord(r.growth_stage) ? (r.growth_stage as AiGrowthStage) : undefined,
    aesthetic_signature: isRecord(r.aesthetic_signature)
      ? (r.aesthetic_signature as AiAestheticSignature)
      : undefined,
    defense_mechanisms: Array.isArray(r.defense_mechanisms)
      ? (r.defense_mechanisms as AiDefenseMechanism[])
      : undefined,
    communication_recipes: Array.isArray(r.communication_recipes)
      ? (r.communication_recipes as AiCommunicationRecipe[])
      : undefined,
  };

  // Drop undefined keys so the JSON we serialize is small.
  for (const k of Object.keys(out) as Array<keyof AiProfile>) {
    if (out[k] === undefined) delete out[k];
  }
  return out;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
