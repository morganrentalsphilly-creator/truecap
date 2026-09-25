#!/usr/bin/env bash
# scripts/dev-isolated.sh — run the app against a LOOPBACK Supabase origin so a
# local audit/dev session can never read or write the hosted project that the
# checked-out `.env` points at (verified 2026-09-24: `.env` carries the
# PRODUCTION project ref and its service-role key).
#
#   bash scripts/dev-isolated.sh dev     # next dev   on 127.0.0.1:3100
#   bash scripts/dev-isolated.sh start   # next start on 127.0.0.1:3100 (needs `npm run build` first)
#
# Every value below is the same shape playwright.config.ts injects for the
# authenticated browser gate, so a page that renders here renders in CI.
# Process env beats `.env*` in Next.js, so these overrides win even when the
# file is present. Paid data providers, mail, and analytics are all blanked:
# nothing a local crawl does can spend money or send a message.
set -euo pipefail

MODE="${1:-dev}"
PORT="${PORT:-3100}"
HOST="${HOST:-127.0.0.1}"

export NEXT_PUBLIC_SITE_URL="http://${HOST}:${PORT}"
export NEXT_PUBLIC_SUPABASE_URL="${E2E_SUPABASE_URL:-http://127.0.0.1:54321}"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="${E2E_SUPABASE_ANON_KEY:-truecap-e2e-anon-key}"
export SUPABASE_SERVICE_ROLE_KEY="${E2E_SUPABASE_SERVICE_ROLE_KEY:-truecap-e2e-service-role-key}"
export SHARE_LINK_SECRET="${SHARE_LINK_SECRET:-truecap-e2e-anonymous-decision-signing-secret}"
# Local spec runs hammer every anonymous action from one IP (lib/ip-rate-limit.ts).
export IP_RATE_LIMIT_MAX_OVERRIDE="${IP_RATE_LIMIT_MAX_OVERRIDE:-100000}"
export CRON_SECRET="${CRON_SECRET:-truecap-local-audit-cron-secret}"

# Paid / external providers and outbound channels: off.
export RENTCAST_API_KEY=""
export FRED_API_KEY="${AUDIT_FRED_API_KEY:-}"
export HUD_API_KEY="${AUDIT_HUD_API_KEY:-}"
# Loopback-only provider mocks for the enrichment browser tests (see
# e2e/support/enrichment-mock-server.ts); the action ignores non-loopback values.
export FRED_API_BASE_URL="${FRED_API_BASE_URL:-}"
export HUD_API_BASE_URL="${HUD_API_BASE_URL:-}"
export RESEND_API_KEY=""
export RESEND_AUDIENCE_ID=""
export NEXT_PUBLIC_POSTHOG_KEY=""
export POSTHOG_API_KEY=""
export ANTHROPIC_API_KEY=""
export NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=""
export RATE_ALERTS_MODE="off"
export RENT_ALERTS_MODE="off"
export LIFECYCLE_EMAILS_MODE="off"
export FEEDBACK_EMAIL_MODE="off"
export BILLING_RECONCILE_MODE="dry"
# Never report a local run to the production Sentry project (client value is
# inlined at build time, so it only takes effect for builds made with it set).
export SENTRY_DISABLED="1"
export NEXT_PUBLIC_SENTRY_DISABLED="1"

# Stripe stays on the TEST-mode keys from .env (sk_test_/pk_test_) so /pricing
# can resolve display prices; refuse to start on a live key.
if [[ "${STRIPE_SECRET_KEY:-}" == sk_live_* ]]; then
  echo "Refusing to start: STRIPE_SECRET_KEY is a live key." >&2
  exit 1
fi
if grep -qE '^STRIPE_SECRET_KEY=sk_live_' .env 2>/dev/null; then
  echo "Refusing to start: .env carries a live Stripe key." >&2
  exit 1
fi

case "$MODE" in
  dev)   exec npx next dev --hostname "$HOST" --port "$PORT" ;;
  start) exec npx next start --hostname "$HOST" --port "$PORT" ;;
  *) echo "usage: $0 [dev|start]" >&2; exit 2 ;;
esac
