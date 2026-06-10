#!/usr/bin/env bash
# scripts/lighthouse.sh
# Run a local Lighthouse audit against claudematch.com. Outputs a
# JSON file (raw) and a Markdown summary (extracted metrics + budget
# check). Designed to be cron-able on a dev box.
#
# Requires: npx + node 18+ + chrome/chromium installed.
#
# Usage:
#   bash scripts/lighthouse.sh
#   bash scripts/lighthouse.sh https://staging.claudematch.com
#
# Exit code: 0 if all budgets pass; 1 if any fail.

set -euo pipefail

URL="${1:-https://claudematch.com}"
OUT_DIR="scripts/output"
mkdir -p "$OUT_DIR"

DATE_ISO=$(date -u +%Y-%m-%d)
RAW_JSON="$OUT_DIR/lighthouse-${DATE_ISO}.raw.json"
SUMMARY_MD="$OUT_DIR/lighthouse-${DATE_ISO}.md"

echo "🔍 Running Lighthouse against $URL …"
npx -y lighthouse "$URL" \
  --preset=desktop \
  --output=json \
  --output-path="$RAW_JSON" \
  --chrome-flags="--headless --no-sandbox" \
  --quiet 2>/dev/null || {
    echo "❌ Lighthouse run failed. Check that chrome is installed (brew install --cask chromium)."
    exit 2
  }

echo "📊 Extracting summary …"
node scripts/lighthouse.mjs "$RAW_JSON"
