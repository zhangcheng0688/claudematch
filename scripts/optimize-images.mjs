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
 *   bun add -d sharp
 *   node scripts/optimize-images.mjs
 *
 * Run once after cloning, commit the generated .webp / .avif files.
 * The <picture> tag in components/shared/MomentsImg.tsx picks them up
 * automatically; if they're missing, the browser falls through to .jpg.
 *
 * Why build-time (vs SaaS like Cloudinary / imgix):
 *   - ¥150/mo recurring cost avoided
 *   - No external network round-trip per image render
 *   - 6 images today; build-time sharp is the right scale
 *
 * Why AVIF (vs WebP only):
 *   - ~30% smaller than WebP at similar quality
 *   - Modern Safari/Chrome/Firefox all support it
 *   - The only "modern" format we can ship without polyfills
 *
 * Output:
 *   src/assets/moment-*.{webp,avif}      — the variants
 *   src/assets/moments-manifest.json     — a build-time sanity check
 *                                          (records which variants exist)
 */

import { readdir, stat, mkdir, writeFile } from "node:fs/promises";
import { join, basename, extname } from "node:path";

const SRC_DIR = "src/assets";
const SIZES = [1024]; // single 1x is enough for our 220-280px rendered boxes
const AVIF_QUALITY = 55;
const WEBP_QUALITY = 75;

let sharp;
try {
  sharp = (await import("sharp")).default;
} catch (e) {
  console.error(
    [
      "ERROR: 'sharp' is not installed.",
      "",
      "Run one of:",
      "  bun add -d sharp",
      "  npm install --save-dev sharp",
      "  yarn add -D sharp",
      "",
      "Then re-run: node scripts/optimize-images.mjs",
    ].join("\n"),
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

console.log(`Processing ${files.length} images (q=avif:${AVIF_QUALITY}, q=webp:${WEBP_QUALITY})…`);

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
    .webp({ quality: WEBP_QUALITY })
    .toFile(webpPath);
  const webpSizeKB = Math.round((await stat(webpPath)).size / 1024);

  // AVIF
  const avifPath = join(SRC_DIR, `${base}.avif`);
  await sharp(srcPath)
    .resize(SIZES[0], SIZES[0], { fit: "inside", withoutEnlargement: true })
    .avif({ quality: AVIF_QUALITY })
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

// Build-time sanity check. If a future edit adds moment-7.jpg
// without re-running this script, MomentsImg.tsx will silently
// fall back to .jpg for that one. The manifest is a record of
// what variants currently exist on disk; you can grep for it
// from a build script to assert "every moment-N.jpg has a .avif".
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
console.log("\nNext: git add src/assets/moment-*.{webp,avif} src/assets/moments-manifest.json");
console.log("       git commit -m 'chore(assets): generate AVIF + WebP variants'");
