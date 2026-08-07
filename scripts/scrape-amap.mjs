#!/usr/bin/env node
/**
 * scripts/scrape-amap.mjs
 *
 * Pulls restaurant POIs from the AMap (高德) Places Web API for Shenzhen
 * and Shanghai. Writes to a JSON Lines file (one venue per line) that we
 * then import via the Supabase migration SQL or via a separate
 * `seed-venues.mjs` script.
 *
 * Why JSON Lines (not CSV / JSON array): each row is independent, the
 * file is streamable, and a partial run doesn't leave us with a broken
 * top-level array.
 *
 * Why a custom script (not the official amap SDK): the SDK is fine but
 * pulls in 1MB of dependencies; we only need a few endpoints.
 *
 * Why we DON'T scrape 大众点评 here:
 *   - 大众点评 has no public API and actively blocks scraping with
 *     aggressive anti-bot measures (slider captcha, IP rate limits,
 *     device fingerprinting).
 *   - Their ToS forbids automated access.
 *   - The legal risk is not worth the 10% incremental data.
 *   - We can add 50-100 hand-curated 必吃榜 entries later via the
 *     `notes` field or a `source = 'dianping_manual'` row, with the
 *     link stored in `source_url` for verification.
 *
 * AMap free tier: 6000 calls/day (https://lbs.amap.com/dev/id/key).
 * This script uses ~1-2 calls per keyword × ~50 keywords × 2 cities =
 * ~150-200 calls total — well under the daily cap.
 *
 * USAGE:
 *   1. Register at https://lbs.amap.com (企业账号 recommended)
 *   2. Create a Web Service API key (different from the Web/JS API key)
 *   3. Add a "Web Service" type key — it must allow the
 *      /v3/place/text and /v3/place/detail endpoints
 *   4. Set env: AMAP_WEB_API_KEY=xxxx
 *   5. Run: node scripts/scrape-amap.mjs
 *   6. Output: scripts/output/venues-2026-06-09.jsonl
 *   7. Import: see scripts/import-venues.mjs (next step)
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const AMAP_KEY = process.env.AMAP_WEB_API_KEY;
if (!AMAP_KEY) {
  console.error("AMAP_WEB_API_KEY env var not set. See scripts/scrape-amap.mjs header.");
  process.exit(1);
}

const OUTPUT = process.env.SCRAPE_OUTPUT ?? "scripts/output/venues-2026-06-09.jsonl";

// Two cities, ~200 venues each. We over-fetch per keyword and dedupe
// by amap_id, so the count fluctuates between 150-300 per city
// depending on keyword richness.
const CITIES = [
  { key: "shenzhen", adcodes: ["440300"], center: [114.0579, 22.5431] },
  { key: "hongkong", adcodes: ["810000"], center: [114.1694, 22.3193] },
];

// Keywords grouped by 菜系. Each row is searched in turn within each
// city. We bias toward date-night vocabulary: 安静 / 景观 / 浪漫 /
// 适合聊天. The 'vibe' / 'cuisine' labels on each result are derived
// from the keyword itself, so the LLM prompt has structured context.
const KEYWORDS = [
  // Japanese — 鮨 / omakase / 怀石 / 居酒屋
  { kw: "omakase", cuisine: ["日料", "omakase"], vibe: ["安静", "适合聊天", "高端"] },
  { kw: "日料", cuisine: ["日料"], vibe: ["安静", "精致"] },
  { kw: "怀石料理", cuisine: ["日料", "怀石"], vibe: ["安静", "高端"] },
  { kw: "居酒屋", cuisine: ["日料", "居酒屋"], vibe: ["轻松", "适合聊天"] },
  { kw: "鮨", cuisine: ["日料", "omakase"], vibe: ["安静", "高端"] },

  // Western — 意大利 / 法餐 / 牛排 / fine dining
  { kw: "意大利餐厅", cuisine: ["西餐", "意大利餐"], vibe: ["适合聊天", "浪漫"] },
  { kw: "法餐厅", cuisine: ["西餐", "法餐"], vibe: ["浪漫", "高端"] },
  { kw: "牛排馆", cuisine: ["西餐", "牛排"], vibe: ["适合聊天"] },
  { kw: "fine dining", cuisine: ["西餐", "fine dining"], vibe: ["高端", "浪漫"] },
  { kw: "brunch", cuisine: ["西餐", "brunch"], vibe: ["轻松", "白天适合"] },

  // Chinese — 私房菜 / 中餐高端 / 粤菜
  { kw: "私房菜", cuisine: ["中餐", "私房菜"], vibe: ["安静", "适合聊天"] },
  { kw: "粤菜", cuisine: ["中餐", "粤菜"], vibe: ["适合聊天"] },
  { kw: "米其林", cuisine: ["高端"], vibe: ["高端", "适合聊天"] },
  { kw: "黑珍珠", cuisine: ["高端"], vibe: ["高端", "适合聊天"] },

  // 氛围导向 — 景观位 / 顶层 / 露台 / 夜景
  { kw: "景观餐厅", cuisine: [], vibe: ["景观位", "浪漫"] },
  { kw: "顶层餐厅", cuisine: [], vibe: ["景观位", "浪漫", "高端"] },
  { kw: "露台餐厅", cuisine: [], vibe: ["景观位", "适合聊天"] },
  { kw: "夜景餐厅", cuisine: [], vibe: ["景观位", "浪漫"] },
  { kw: "湖景餐厅", cuisine: [], vibe: ["景观位", "浪漫"] },
  { kw: "江景餐厅", cuisine: [], vibe: ["景观位", "浪漫"] },

  // 场景导向 — 约会 / 闺蜜 / 商务
  { kw: "情侣餐厅", cuisine: [], vibe: ["适合聊天", "浪漫"] },
  { kw: "闺蜜餐厅", cuisine: [], vibe: ["适合聊天", "轻松", "适合拍照"] },
  { kw: "商务餐厅", cuisine: [], vibe: ["安静", "适合聊天", "高端"] },

  // Specific PoIs (深圳/上海各加几条)
  { kw: "必吃榜", cuisine: [], vibe: ["人气"] },
  { kw: "网红餐厅", cuisine: [], vibe: ["适合拍照", "人气"] },
  { kw: "安静餐厅", cuisine: [], vibe: ["安静", "适合聊天"] },
  { kw: "轻奢餐厅", cuisine: [], vibe: ["高端", "适合聊天"] },
];

// Per-call rate limit. AMap is OK with 100ms between calls but we
// keep it generous to stay well under the documented 3000 req/min
// enterprise cap and the 6000/day free cap.
const RATE_LIMIT_MS = 200;
const MAX_RESULTS_PER_KEYWORD = 25;

// AMap "type" prefix to filter to food-related POIs.
// '050000' = 餐饮服务. We pass it as the `types` param.
const TYPE_FOOD = "050000";

async function amapTextSearch({ keyword, city, adcode }) {
  const params = new URLSearchParams({
    key: AMAP_KEY,
    keywords: keyword,
    city: city,
    citylimit: "true",
    types: TYPE_FOOD,
    offset: String(MAX_RESULTS_PER_KEYWORD),
    page: "1",
    extensions: "all", // biz_ext for rating if available
    output: "json",
  });
  if (adcode) params.set("city", city); // we use city name; adcode is for reference

  const url = `https://restapi.amap.com/v3/place/text?${params.toString()}`;
  const res = await fetch(url, { headers: { "User-Agent": "linQ-venue-scraper/1.0" } });
  if (!res.ok) {
    console.error(`  [HTTP ${res.status}] ${keyword} in ${city}`);
    return [];
  }
  const data = await res.json();
  if (data.status !== "1") {
    // AMap returns status:"0" on quota / invalid key / etc.
    console.error(
      `  [API error ${data.status}] ${data.info ?? "(no info)"} ${data.infocode ?? ""} — ${keyword} in ${city}`,
    );
    return [];
  }
  return data.pois ?? [];
}

function adcodeToCityName(adcode) {
  // We use the city key directly; the AMap API also accepts the
  // Chinese city name (深圳 / 香港). Keep the mapping for the
  // `city` param call.
  return adcode === "440300" ? "深圳" : adcode === "810000" ? "香港" : "全国";
}

/**
 * Translate a single AMap POI to our venues schema.
 * Returns null when the POI is missing data we require (no name, no
 * location) — the caller drops these.
 */
function normalizePoi(poi, cityKey, keyword) {
  if (!poi.id || !poi.name || !poi.location) return null;
  const [lng, lat] = poi.location.split(",").map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  // AMap doesn't return price data, but the type field encodes
  // subcategories (e.g. "050100" = 中餐厅, "050200" = 外国餐厅,
  // "050301" = 日本料理). We extract a coarse cuisine from this.
  const cuisineFromType = (() => {
    const t = poi.type ?? "";
    if (t.startsWith("050301")) return "日料";
    if (t.startsWith("050302")) return "韩国料理";
    if (t.startsWith("050303")) return "西餐";
    if (t.startsWith("050304")) return "法国菜";
    if (t.startsWith("050305")) return "意大利菜";
    if (t.startsWith("050100")) return "中餐";
    if (t.startsWith("0504")) return "火锅";
    if (t.startsWith("0505")) return "小吃快餐";
    return null;
  })();

  return {
    amap_id: poi.id,
    name: poi.name,
    city: cityKey,
    district: poi.adname ?? null,
    address: [poi.address, poi.business_area].filter(Boolean).join(" · ") || null,
    lat,
    lng,
    cuisine_tags: Array.from(new Set([...(cuisineFromType ? [cuisineFromType] : [])])),
    vibe_tags: [],
    price_per_person: poi.biz_ext?.cost ? Number(poi.biz_ext.cost) : null, // AMap biz_ext.cost (需要 extensions=all)
    rating: poi.biz_ext?.rating ? Number(poi.biz_ext.rating) : null,
    review_count: null,
    tel: poi.tel && poi.tel.length >= 7 ? poi.tel : null,
    opening_hours: poi.business_time ?? null,
    photos: poi.photos?.map((p) => p.url).filter(Boolean) ?? [],
    source: "amap",
    source_url: null, // AMap doesn't expose a public URL; we add manually
    booking_method: "walk_in",
    commission_pct: 0,
    is_active: true,
    notes: null,
    last_verified_at: new Date().toISOString(),
    _search_keyword: keyword, // audit trail; not stored in DB
  };
}

async function main() {
  await mkdir(dirname(OUTPUT), { recursive: true });

  // Dedupe by amap_id (re-running the script with new keywords shouldn't
  // re-add the same POI). We append to the file in the end, after dedupe.
  const seen = new Map(); // amap_id -> venue
  let totalApiCalls = 0;
  let totalRowsKept = 0;

  for (const city of CITIES) {
    const cityName = adcodeToCityName(city.adcodes[0]);
    console.log(`\n[${city.key}] ${cityName} — ${KEYWORDS.length} keywords`);

    for (const { kw, cuisine, vibe } of KEYWORDS) {
      const pois = await amapTextSearch({ keyword: kw, city: cityName, adcode: city.adcodes[0] });
      totalApiCalls += 1;
      let addedThisRun = 0;

      for (const poi of pois) {
        const v = normalizePoi(poi, city.key, kw);
        if (!v) continue;
        if (seen.has(v.amap_id)) continue;
        // Merge cuisine / vibe tags from the search keyword into the venue
        v.cuisine_tags = Array.from(new Set([...v.cuisine_tags, ...cuisine]));
        v.vibe_tags = Array.from(new Set([...v.vibe_tags, ...vibe]));
        seen.set(v.amap_id, v);
        addedThisRun += 1;
      }

      console.log(
        `  ${kw.padEnd(16)}  ${pois.length.toString().padStart(3)} POIs  +${addedThisRun} new`,
      );
      totalRowsKept = seen.size;
      await sleep(RATE_LIMIT_MS);
    }
  }

  // Write JSON Lines (one venue per line)
  const lines = Array.from(seen.values())
    .map((v) => JSON.stringify(v))
    .join("\n");
  await writeFile(OUTPUT, lines + "\n", "utf8");

  console.log("\n────────── done ──────────");
  console.log(`API calls:  ${totalApiCalls}`);
  console.log(`Unique POIs: ${totalRowsKept}`);
  console.log(`Output:     ${OUTPUT}`);

  // Per-city breakdown
  const byCity = {};
  for (const v of seen.values()) {
    byCity[v.city] = (byCity[v.city] ?? 0) + 1;
  }
  console.log("By city:    ", byCity);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
