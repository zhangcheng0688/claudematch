#!/usr/bin/env node
/**
 * scripts/compute-persona-embeddings.mjs
 *
 * Backfills OpenAI text-embedding-3-small vectors for every ai_personas
 * row that is missing an embedding. Run this once after importing the
 * persona seed SQL.
 *
 * USAGE:
 *   node --env-file=.env.local scripts/compute-persona-embeddings.mjs
 *
 * Requires env vars:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !OPENAI_API_KEY) {
  console.error(
    "Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMS = 1536;
const BATCH_SIZE = 32; // OpenAI allows up to ~2048 inputs per request; keep it modest for retries.

async function embedBatch(texts) {
  const cleaned = texts.map((t) => t.trim().slice(0, 8000)).filter(Boolean);
  if (cleaned.length === 0) return [];

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      input: cleaned,
      model: EMBEDDING_MODEL,
      dimensions: EMBEDDING_DIMS,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenAI embedding error ${res.status}: ${body.slice(0, 500)}`);
  }

  const json = await res.json();
  return json.data.map((d) => d.embedding);
}

function personaToEmbeddingText(persona) {
  const parts = [];
  if (persona.name) parts.push(persona.name);
  if (persona.occupation) parts.push(persona.occupation);
  if (persona.headline) parts.push(persona.headline);
  if (persona.bio) parts.push(persona.bio);
  if (Array.isArray(persona.scenario_tags)) parts.push(persona.scenario_tags.join(" "));

  const ai = persona.profile_data?.ai || persona.profile_data;
  if (ai) {
    if (ai.headline) parts.push(ai.headline);
    if (ai.narrative) parts.push(ai.narrative);
    if (Array.isArray(ai.patterns)) {
      for (const p of ai.patterns) {
        if (p.insight) parts.push(p.insight);
      }
    }
    if (Array.isArray(ai.dimensions)) {
      for (const d of ai.dimensions) {
        if (d.key) parts.push(d.key);
        if (d.why) parts.push(d.why);
        if (Array.isArray(d.signals)) parts.push(d.signals.join(" "));
      }
    }
    if (Array.isArray(ai.paradoxes)) {
      for (const p of ai.paradoxes) {
        if (p.surface) parts.push(p.surface);
        if (p.depth) parts.push(p.depth);
      }
    }
    if (Array.isArray(ai.life_themes)) {
      for (const t of ai.life_themes) {
        if (t.name) parts.push(t.name);
      }
    }
  }
  return parts.join("\n").slice(0, 8000);
}

async function fetchUnembeddedPersonas() {
  const all = [];
  let page = 0;
  const pageSize = 100;
  while (true) {
    const { data, error } = await supabase
      .from("ai_personas")
      .select("id, name, occupation, headline, bio, scenario_tags, profile_data")
      .is("embedding", null)
      .range(page * pageSize, (page + 1) * pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    page++;
  }
  return all;
}

async function setEmbedding(personaId, embedding) {
  const { error } = await supabase.rpc("set_persona_embedding", {
    p_persona_id: personaId,
    p_embedding: embedding,
  });
  if (error) throw error;
}

async function main() {
  console.log("Fetching personas missing embeddings...");
  const personas = await fetchUnembeddedPersonas();
  console.log(`Found ${personas.length} personas without embeddings.`);
  if (personas.length === 0) return;

  let processed = 0;
  let failed = 0;

  for (let i = 0; i < personas.length; i += BATCH_SIZE) {
    const batch = personas.slice(i, i + BATCH_SIZE);
    const texts = batch.map(personaToEmbeddingText);

    try {
      const embeddings = await embedBatch(texts);
      if (embeddings.length !== batch.length) {
        throw new Error(`Embedding count mismatch: ${embeddings.length} vs ${batch.length}`);
      }
      for (let j = 0; j < batch.length; j++) {
        await setEmbedding(batch[j].id, embeddings[j]);
      }
      processed += batch.length;
      console.log(`Progress: ${processed}/${personas.length}`);
    } catch (e) {
      console.error(`Batch ${i / BATCH_SIZE + 1} failed:`, e.message);
      failed += batch.length;
    }

    // Be polite to OpenAI rate limits.
    if (i + BATCH_SIZE < personas.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log(`\nDone. Processed: ${processed}, Failed: ${failed}`);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
