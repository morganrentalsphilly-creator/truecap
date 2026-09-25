#!/usr/bin/env bash
# Mobile Lighthouse for the key pages against a running server.
#   bash audit/lighthouse.sh artifacts/audit/<run>/lighthouse [base]
set -euo pipefail
OUT="${1:-artifacts/audit/baseline/lighthouse}"
BASE="${2:-http://127.0.0.1:3100}"
mkdir -p "$OUT"
CHROME_BIN="$(ls -d "$HOME"/Library/Caches/ms-playwright/chromium-*/chrome-mac-arm64/*.app/Contents/MacOS/* 2>/dev/null | tail -1 || true)"
export CHROME_PATH="${CHROME_PATH:-$CHROME_BIN}"
for route in / /analyze /pricing /dashboard/new /methodology /blog /tools/1-percent-rule-calculator; do
  slug="$(echo "${route#/}" | tr '/' '_')"; [ -z "$slug" ] && slug="home"
  echo "→ $route"
  npx -y lighthouse@12 "$BASE$route" \
    --output=json --output=html --output-path="$OUT/$slug" \
    --form-factor=mobile --screenEmulation.mobile --throttling-method=simulate \
    --chrome-flags="--headless=new --no-sandbox --disable-gpu" --quiet >/dev/null 2>&1 || echo "   lighthouse failed for $route"
  node -e "
    const r=require('./$OUT/$slug.report.json');
    const c=r.categories; const s=(k)=>Math.round((c[k]?.score??0)*100);
    console.log('   perf '+s('performance')+' · a11y '+s('accessibility')+' · bp '+s('best-practices')+' · seo '+s('seo')+' · LCP '+Math.round(r.audits['largest-contentful-paint'].numericValue)+'ms · CLS '+r.audits['cumulative-layout-shift'].numericValue.toFixed(3)+' · TBT '+Math.round(r.audits['total-blocking-time'].numericValue)+'ms');
  " 2>/dev/null || true
done
