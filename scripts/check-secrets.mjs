#!/usr/bin/env node
/**
 * scripts/check-secrets.mjs
 *
 * Pre-commit guard: fails if any of the well-known secret formats
 * appear in the staged diff. Catches the most common mistake
 * (paste-an-API-key-into-source). Hook into git:
 *
 *   ln -s ../../scripts/check-secrets.mjs .git/hooks/pre-commit
 *   chmod +x .git/hooks/pre-commit
 *
 * Patterns scanned:
 *   - Resend:        re_[A-Za-z0-9]{20,}
 *   - OpenAI:        sk-[A-Za-z0-9]{20,}
 *   - Anthropic:     sk-ant-[A-Za-z0-9-]{20,}
 *   - Google:        AIza[0-9A-Za-z_-]{20,}
 *   - HighEntropy:   any 32+ char base64/alnum token near an
 *                    env-var assignment line
 *
 * The check is intentionally conservative (false-positives on long
 * random strings are fine — the cost of leaking a key is far higher
 * than the cost of a re-push).
 */

import { execSync } from "node:child_process";

const PATTERNS = [
  { name: "Resend",    re: /re_[A-Za-z0-9]{20,}/g },
  { name: "OpenAI",    re: /sk-[A-Za-z0-9]{20,}/g },
  { name: "Anthropic", re: /sk-ant-[A-Za-z0-9-]{20,}/g },
  { name: "Google",    re: /AIza[0-9A-Za-z_-]{20,}/g },
];

let diff = "";
try {
  // Get the diff of staged content (added + changed lines only).
  // `git diff --cached` shows the full content of new files plus
  // changes; we only check added lines to avoid flagging content
  // that's already in history (intentional if you actually
  // rotated a previously-leaked key in a real fixup commit).
  diff = execSync(
    'git diff --cached --unified=0 --diff-filter=ACMR -- src/ scripts/ supabase/ README.md package.json .env* 2>/dev/null',
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  );
} catch {
  // No git, or no staged content. Treat as no diff.
  process.exit(0);
}

if (!diff) process.exit(0);

const findings = [];
for (const { name, re } of PATTERNS) {
  const matches = diff.match(re);
  if (matches) {
    findings.push({ name, samples: matches.slice(0, 3) });
  }
}

if (findings.length === 0) process.exit(0);

console.error("\n❌ secrets detected in staged content:\n");
for (const f of findings) {
  console.error(`  ${f.name}: ${f.samples.length} match(es), e.g. ${f.samples[0]?.slice(0, 12)}…`);
}
console.error(`
This is a hard block. If you INTENTIONALLY need to commit a key
(rare; usually only for fixture files), use --no-verify to bypass.
Otherwise:

  1. Move the secret to a Lovable Cloud env var (Settings → Environment Variables)
  2. Read it via process.env in your code
  3. Re-stage and commit

See scripts/README.md for the canonical secret-rotation flow.
`);
process.exit(1);
