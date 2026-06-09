#!/usr/bin/env node
/**
 * scripts/optimize-images.mjs
 *
 * Generates AVIF + WebP variants of every moment-*.jpg in src/assets.
 * Each source produces:
 *   moment-N.jpg          (untouched, for legacy fallback)
 *   moment-N.webp         (q=75)
 *   moment-N.avif         (q=55)
 *
 * Usage:
 *   node scripts/optimize-images.mjs
 *
 * Requires sharp (devDependency). If sharp isn't installed the script
 * exits with a friendly error — it's not a build blocker, just a perf
 * optimization. CI / local dev can run it once and commit the result.
 *
 * Why we don't use a third-party SaaS (Cloudinary / imgix):
 *   - ¥150/mo recurring cost
 *   - Adds an external network round-trip per image render
 *   - We have 6 images today; build-time sharp is the right scale
 */

import { readdir, stat, mkdir, writeFile } from "node:fs/promises";
import { join, basename, extname } from "node:path";

const SRC_DIR = "src/assets";
const SIZES = [1024]; // single 1x is enough — we don't have retina-specific art

let sharp;
try {
  sharp = (await import("sharp")).default;
} catch (e) {
  console.error(
    "ERROR: 'sharp' is not installed.\n" +
      "Run: bun add -d sharp\n" +
      "Then re-run: node scripts/optimize-images.mjs",
  );
  process.exit(1);
}

const files = (await readdir(SRC_DIR)).filter(
  (f) => extname(f).toLowerCase() === ".jpg" && f.startsWith("moment-"),
);

if (files.length === 0) {
  console.log("No moment-*.jpg files in src/assets/ — nothing to do.");
  process.exit(0);
}

console.log(`Processing ${files.length} images…`);

const summary = [];

for (const f of files) {
  const srcPath = join(SRC_DIR, f);
  const base = basename(f, ".jpg");
  const srcStat = await stat(srcPath);
  const srcSizeKB = Math.round(srcStat.size / 1024);

  // WebP
  const webpPath = join(SRC_DIR, `${base}.webp`);
  await sharp(srcPath)
    .resize(SIZES[0], SIZES[0], { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 75 })
    .toFile(webpPath);
  const webpSizeKB = Math.round((await stat(webpPath)).size / 1024);

  // AVIF
  const avifPath = join(SRC_DIR, `${base}.avif`);
  await sharp(srcPath)
    .resize(SIZES[0], SIZES[0], { fit: "inside", withoutEnlargement: true })
    .avif({ quality: 55 })
    .toFile(avifPath);
  const avifSizeKB = Math.round((await stat(avifPath)).size / 1024);

  summary.push({
    file: f,
    jpg: srcSizeKB,
    webp: webpSizeKB,
    avif: avifSizeKB,
    saving_pct_vs_jpg: Math.round(((srcSizeKB - avifSizeKB) / srcSizeKB) * 100),
  });
}

console.log("\n────────── results ──────────");
console.table(summary);

const totalJpg = summary.reduce((s, r) => s + r.jpg, 0);
const totalAvif = summary.reduce((s, r) => s + r.avif, 0);
console.log(
  `\nTotal: ${totalJpg}KB (jpg) → ${totalAvif}KB (avif) — ${Math.round(((totalJpg - totalAvif) / totalJpg) * 100)}% smaller`,
);

// Generate a build-time assertion file. If an expected moment-N.jpg
// exists but the .avif or .webp doesn't, we want the dev server /
// build to fail loudly rather than silently fall back to jpg. This
// avoids the "we forgot to re-run optimize-images" regression.
const expectedPairs = files.map((f) => basename(f, ".jpg"));
const manifest = expectedPairs.map((base) => ({
  base,
  jpg: `${base}.jpg`,
  webp: `${base}.webp`,
  avif: `${base}.avif`,
}));
await writeFile(
  join(SRC_DIR, "moments-manifest.json"),
  JSON.stringify(manifest, null, 2),
);
console.log(`\nWrote src/assets/moments-manifest.json (${manifest.length} entries).`);
