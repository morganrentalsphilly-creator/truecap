#!/usr/bin/env bash
# render-build.sh <out-hashes.json> <out-jsonld-findings.json> [<baseline-findings.json>]
#
# Builds the checked-out tree with CI's placeholder env, serves it on loopback,
# hashes every sitemap page's <main> text (seo/scripts/render-diff.ts hash) and
# validates every page's JSON-LD. With a baseline (the base build's findings),
# only NEW JSON-LD errors fail — pre-existing debt must not turn every run red.
# Runs in the
# verify-build job, which holds no secrets and no write token: model-authored
# page modules execute during `next build`, so nothing real may be reachable.
set -euo pipefail

OUT="$1"
FINDINGS="$2"
BASELINE="${3:-}"
PORT=3100
HTML_DIR="$(mktemp -d)"

npm run build

npx --no-install next start -p "$PORT" -H 127.0.0.1 > "$RUNNER_TEMP/next-start.log" 2>&1 &
SERVER=$!
trap 'kill "$SERVER" 2>/dev/null || true' EXIT

for _ in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:$PORT/sitemap.xml" > /dev/null 2>&1; then break; fi
  sleep 2
done
curl -fsS "http://127.0.0.1:$PORT/sitemap.xml" > /dev/null

node seo/scripts/render-diff.ts hash --base "http://127.0.0.1:$PORT" --out "$OUT" --html-dir "$HTML_DIR"

if [ -n "$BASELINE" ]; then
  node seo/scripts/jsonld-validate.ts --html-dir "$HTML_DIR" --baseline "$BASELINE" --out "$FINDINGS"
else
  # The base build: record its findings as the baseline; never fail on them.
  node seo/scripts/jsonld-validate.ts --html-dir "$HTML_DIR" --out "$FINDINGS" || true
fi
