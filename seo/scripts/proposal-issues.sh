#!/usr/bin/env bash
# proposal-issues.sh — file the model's tier-2 proposals (run-manifest
# `issues[]`) as GitHub issues labelled `seo-proposal`. manifest-issues.ts has
# already capped, sanitized and secret-checked each one; this only files them,
# skipping any title that already has an open seo-proposal issue.
set -euo pipefail

MANIFEST="${1:-$RUNNER_TEMP/proposal/run-manifest.json}"
OUT="$(mktemp -d)"
COUNT="$(node seo/scripts/manifest-issues.ts --manifest "$MANIFEST" --out-dir "$OUT")"
[ "$COUNT" != "0" ] || { echo "no proposals to file"; exit 0; }

gh label create seo-proposal --color C5DEF5 --description "SEO loop tier-2 proposal (the founder decides)" 2>/dev/null || true
OPEN_TITLES="$(gh issue list --label seo-proposal --state open --limit 100 --json title --jq '.[].title')"

for title_file in "$OUT"/*.title; do
  TITLE="$(cat "$title_file")"
  if printf '%s\n' "$OPEN_TITLES" | grep -Fxq -- "$TITLE"; then echo "already open: $TITLE"; continue; fi
  gh issue create --title "$TITLE" --label seo-proposal --body-file "${title_file%.title}.md"
done
