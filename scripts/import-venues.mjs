#!/usr/bin/env node
/**
 * scripts/import-venues.mjs
 *
 * Reads scripts/output/venues-*.jsonl and emits a single SQL file
 * (scripts/output/import-venues.sql) that the user can paste into
 * Lovable's SQL editor to seed the venues table.
 *
 * Why emit SQL (not insert via supabase-js):
 *   - The user is the only human. Running a 400-row INSERT in their
 *     SQL editor is a 5-second task; configuring the service-role key
 *     for a one-shot import is a 30-minute task.
 *   - The generated SQL is human-readable, so they can spot-check
 *     3-5 random rows before running.
 *   - Lovable's SQL editor handles 400 rows in one transaction easily.
 *
 * USAGE:
 *   1. Run scripts/scrape-amap.mjs → produces venues-*.jsonl
 *   2. node scripts/import-venues.mjs → produces import-venues.sql
 *   3. Open Lovable → SQL Editor → paste the .sql → Run
 *   4. (idempotent: if a row with the same amap_id exists, we ON
 *      CONFLICT update the address/photos/tel/rating — the data
 *      we just scraped. We do NOT overwrite commission_pct or
 *      booking_method or notes — those are hand-edited and must
 *      be preserved across re-scrape runs.)
 */

import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

const INPUT_DIR = "scripts/output";
const OUTPUT = "scripts/output/import-venues.sql";

function pickJsonl() {
  // Most recent venues-*.jsonl in the output dir.
  return readdir(INPUT_DIR)
    .then((files) =>
      files
        .filter((f) => /^venues-\d{4}-\d{2}-\d{2}\.jsonl$/.test(f))
        .sort()
        .pop(),
    )
    .then((latest) => {
      if (!latest) throw new Error(`No venues-*.jsonl found in ${INPUT_DIR}/`);
      return join(INPUT_DIR, latest);
    });
}

function escapeSqlString(s) {
  if (s == null) return "NULL";
  return `'${String(s).replace(/'/g, "''")}'`;
}

function toSqlArray(arr) {
  if (!arr || arr.length === 0) return "ARRAY[]::text[]";
  return `ARRAY[${arr.map((s) => escapeSqlString(s)).join(", ")}]`;
}

function toSqlNumberOrNull(n) {
  return n == null || !Number.isFinite(Number(n)) ? "NULL" : String(Number(n));
}

function venueToInsert(v) {
  // ON CONFLICT (amap_id) DO UPDATE — but only the fields AMap can
  // give us. We intentionally do NOT touch commission_pct /
  // booking_method / notes / is_active — those are operator-managed
  // and must survive re-scrapes.
  const cols = [
    "amap_id", "name", "city", "district", "address",
    "lat", "lng", "cuisine_tags", "vibe_tags",
    "price_per_person", "rating", "review_count",
    "tel", "opening_hours", "photos", "source",
    "source_url", "last_verified_at",
  ];
  const vals = [
    escapeSqlString(v.amap_id),
    escapeSqlString(v.name),
    escapeSqlString(v.city),
    escapeSqlString(v.district),
    escapeSqlString(v.address),
    toSqlNumberOrNull(v.lat),
    toSqlNumberOrNull(v.lng),
    toSqlArray(v.cuisine_tags),
    toSqlArray(v.vibe_tags),
    toSqlNumberOrNull(v.price_per_person),
    toSqlNumberOrNull(v.rating),
    toSqlNumberOrNull(v.review_count),
    escapeSqlString(v.tel),
    escapeSqlString(v.opening_hours),
    toSqlArray(v.photos),
    escapeSqlString(v.source),
    escapeSqlString(v.source_url),
    escapeSqlString(v.last_verified_at),
  ];
  const updates = [
    "name = EXCLUDED.name",
    "city = EXCLUDED.city",
    "district = EXCLUDED.district",
    "address = EXCLUDED.address",
    "lat = EXCLUDED.lat",
    "lng = EXCLUDED.lng",
    "cuisine_tags = EXCLUDED.cuisine_tags",
    "vibe_tags = EXCLUDED.vibe_tags",
    "rating = EXCLUDED.rating",
    "tel = EXCLUDED.tel",
    "opening_hours = EXCLUDED.opening_hours",
    "photos = EXCLUDED.photos",
    "last_verified_at = EXCLUDED.last_verified_at",
  ];
  return `INSERT INTO public.venues (${cols.join(", ")}) VALUES (${vals.join(", ")})
  ON CONFLICT (amap_id) DO UPDATE SET ${updates.join(", ")};`;
}

async function main() {
  await mkdir(dirname(OUTPUT), { recursive: true });
  const input = await pickJsonl();
  console.log(`Reading: ${input}`);

  const text = await readFile(input, "utf8");
  const venues = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l));

  console.log(`Venues: ${venues.length}`);

  // Header
  const header = [
    "-- AUTO-GENERATED. Do not edit by hand. Re-run import-venues.mjs to refresh.",
    `-- Source: ${input}`,
    `-- Generated: ${new Date().toISOString()}`,
    `-- Count: ${venues.length}`,
    "",
    "BEGIN;",
    "",
  ].join("\n");

  // Body — one INSERT per venue
  const body = venues.map(venueToInsert).join("\n\n");

  // Footer
  const footer = [
    "",
    "COMMIT;",
    "",
    `-- SELECT city, count(*) FROM public.venues GROUP BY city;`,
  ].join("\n");

  await writeFile(OUTPUT, header + body + footer, "utf8");
  console.log(`Wrote: ${OUTPUT}`);
  console.log(`Open Lovable → SQL Editor → paste the file → Run.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
