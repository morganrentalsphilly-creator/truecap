#!/usr/bin/env bash
# Production build for the signed-in loopback harness. Run from the repo root:
#
#   bash docs/overhaul-2026-10/tools/signed-in-loopback/build-isolated.sh
#
# Takes the scripts/dev-isolated.sh environment (everything before its `case`:
# the loopback Supabase origin, blanked providers and mail, Sentry off, the
# live-Stripe refusal) so the NEXT_PUBLIC_* values inlined at build time point
# at 127.0.0.1:54321, never at the hosted project a checked-out `.env` names.
# Adds CI's Stripe placeholders so `next build` has a test-shaped key, and
# blanks the Sentry auth token so a local build never uploads source maps or
# creates a release.
set -euo pipefail

if [[ ! -f scripts/dev-isolated.sh ]]; then
  echo "Run from the repo root (scripts/dev-isolated.sh not found)." >&2
  exit 2
fi

eval "$(sed '/^case "\$MODE"/,$d' scripts/dev-isolated.sh)"
export STRIPE_SECRET_KEY=sk_test_ci_placeholder
export STRIPE_WEBHOOK_SECRET=whsec_ci_placeholder
export NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_ci_placeholder
export STRIPE_PRICE_PRO_MONTHLY=price_ci_placeholder_monthly
export STRIPE_PRICE_PRO_ANNUAL=price_ci_placeholder_annual
export SENTRY_AUTH_TOKEN=""

if [[ "$NEXT_PUBLIC_SUPABASE_URL" != "http://127.0.0.1:54321" ]]; then
  echo "Refusing to build: NEXT_PUBLIC_SUPABASE_URL is not the loopback origin." >&2
  exit 1
fi

exec npm run build
