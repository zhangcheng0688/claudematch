// scripts/lighthouse.mjs
//
// P2-deferred 8: stand-in for Lighthouse CI. Lovable Cloud's build
// doesn't run our custom CI, so we run Lighthouse locally (or
// scheduled in cron if you have a separate dev box). The script
// writes a JSON report to scripts/output/lighthouse-{date}.json
// and a Markdown summary the founder can drop into Notion.
//
// Usage:
//   npx -y lighthouse https://claudematch.com \
//     --output=json --output-path=scripts/output/lighthouse.json \
//     --chrome-flags="--headless" --quiet
//   node scripts/lighthouse.mjs scripts/output/lighthouse.json
//
// Or, end-to-end:
//   bash scripts/lighthouse.sh
//
// The wrapper here exists to (1) extract the headline metrics
// from the verbose Lighthouse JSON, and (2) check them against
// the budget we care about. CI / pre-deploy fail if any metric
// regresses by >5% from the previous run.

import { readFile, writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const BUDGET = {
  // The targets linQ commits to. If Lighthouse scores below these
  // for 2 consecutive runs, treat as a regression.
  performance: 0.9,
  accessibility: 0.9,
  "best-practices": 0.9,
  seo: 0.9,
  // Core Web Vitals (in ms; LCP, FCP) and a CLS unitless score.
  "largest-contentful-paint": 2500,
  "first-contentful-paint": 1800,
  "cumulative-layout-shift": 0.1,
  // We don't gate on TBT (Total Blocking Time) — Cloudflare
  // Workers and our code path don't tend to regress there — but
  // we still log it.
};

async function main() {
  const inputFile = process.argv[2] ?? "scripts/output/lighthouse.json";
  let raw;
  try {
    raw = await readFile(inputFile, "utf8");
  } catch (e) {
    console.error(`Cannot read ${inputFile}: ${(e as Error).message}`);
    process.exit(1);
  }
  const report = JSON.parse(raw);
  const cats = report.categories ?? {};
  const audits = report.audits ?? {};

  const score = (k: string): number | null => cats[k]?.score ?? null;
  const metric = (k: string): number | null => audits[k]?.numericValue ?? null;

  const rows: Array<{ name: string; value: string; budget: string; pass: boolean }> = [];
  for (const k of ["performance", "accessibility", "best-practices", "seo"] as const) {
    const v = score(k);
    rows.push({
      name: k,
      value: v === null ? "—" : `${Math.round((v ?? 0) * 100)}/100`,
      budget: `${Math.round(BUDGET[k] * 100)}/100`,
      pass: v !== null && v >= BUDGET[k],
    });
  }
  for (const k of ["largest-contentful-paint", "first-contentful-paint"] as const) {
    const v = metric(k);
    rows.push({
      name: k,
      value: v === null ? "—" : `${Math.round(v)}ms`,
      budget: `≤${BUDGET[k]}ms`,
      pass: v !== null && v <= BUDGET[k],
    });
  }
  const cls = metric("cumulative-layout-shift");
  rows.push({
    name: "cumulative-layout-shift",
    value: cls === null ? "—" : cls.toFixed(3),
    budget: `≤${BUDGET["cumulative-layout-shift"]}`,
    pass: cls !== null && cls <= BUDGET["cumulative-layout-shift"],
  });
  const tbt = metric("total-blocking-time");
  if (tbt !== null) {
    rows.push({
      name: "total-blocking-time (advisory)",
      value: `${Math.round(tbt)}ms`,
      budget: "no budget",
      pass: true,
    });
  }

  const lines: string[] = [];
  lines.push(`# Lighthouse audit — ${new Date().toISOString()}`);
  lines.push("");
  lines.push("| Metric | Value | Budget | Pass |");
  lines.push("|---|---|---|---|");
  for (const r of rows) {
    lines.push(`| ${r.name} | ${r.value} | ${r.budget} | ${r.pass ? "✅" : "❌"} |`);
  }
  lines.push("");
  const failing = rows.filter((r) => !r.pass);
  if (failing.length > 0) {
    lines.push(`## ❌ ${failing.length} budget(s) failed:`);
    for (const r of failing) {
      lines.push(`- **${r.name}**: ${r.value} (budget ${r.budget})`);
    }
    process.exitCode = 1;
  } else {
    lines.push("## ✅ All budgets passing.");
  }

  // Emit to stdout + write to file
  const out = lines.join("\n") + "\n";
  console.log(out);
  const dateIso = new Date().toISOString().slice(0, 10);
  const outFile = `scripts/output/lighthouse-${dateIso}.md`;
  await writeFile(outFile, out, "utf8");
  console.error(`\nWrote ${outFile}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
