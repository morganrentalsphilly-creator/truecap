# TrueCap Fable 5 Run State

> Transient execution state for the autonomous overhaul run started 2026-08-12.
> Delete or mark COMPLETE at final delivery. CLAUDE.md remains senior memory.

## Verified facts (from this run + green history)
- HEAD `2787d93` on `main`, CI green, live on usetruecap.com (verified via live curls this session).
- Gates baseline: tsc 0 · vitest 2601 · lint 0 errors · build 0 · integrity 0 (re-verify at start).
- Prices: Pro $29.99/mo `price_1TlJs3…`, Pro annual $300 `price_1TlJtA…`, Agent Pro $59.99/mo
  `price_1U3MUX…`, $590/yr `price_1U3MUv…`; legacy $20 `price_1TVvTz…` grandfathers 2 subs
  (NEVER remap). $5 one-time PDF via `POST_ANALYSIS_*`. Trial = 14 days (lib/trial.ts).
- Captcha (Turnstile) LIVE + enforcing; coverage guard `lib/__tests__/captcha-coverage.test.ts`.
- SHARE_LINK_SECRET set in prod (portal links + white-label embeds + /d/ attribution live).
- Supabase project `cpfbtvblaufrnxsrvmnm` (truecap-db). MCP: read SQL fine; DDL apply BLOCKED by
  permission classifier → migrations are WRITTEN + SURFACED for Morgan (SQL-editor paste), code
  ships tolerant of the missing table (MIGRATION_PENDING pattern).
- Deploy convention: push to main → Vercel. No PR gate for this repo (standing rule: ship to main).

## Decisions locked by the brief (do not re-litigate)
- Marketing names: "TrueCap Acquisition Pro" (billing IDs unchanged), "$5 → TrueCap Deal Decision
  Pack", "Agent Pro" stays. Category: "The Rental Acquisition Decision System".
- Homepage ticker with +50k baseline: REMOVE from customer-facing pages (brief §Phase 1.5
  supersedes the earlier founder call; flag-gated honest counter may return later).
- New public shares: opaque server-backed tokens at `/s/[token]` (hash-at-rest, revocable,
  default expiry); legacy `/d/[encoded]` KEPT decoding (CLAUDE.md §8.8) as time-boxed compat,
  noindexed; portal deal links move off encoded URLs to `/portal/[token]/d/[dealId]`.
- Guarantee + founding offer + $5→Pro credit: implement flag-gated, DISABLED; Terms/Stripe steps
  documented for Morgan. Never enable autonomously.
- Analytics: PostHog is the provider (env still owed by Morgan — events must be PII-free
  regardless).

## Current objective
Phase 1 continues: listing-ingestion hardening, offer SSOT, claims sweep, proof/ticker removal.
Then phases 2–4 (offer/homepage/pricing), then 5–10.

## DONE — Phase 1.1 opaque shares (evidence: vitest 2613, build 0, prod-build smoke)
- migration 20260817150658_public_shares.sql WRITTEN + SURFACED (Morgan applies; verification
  select must show policies=4, rls_enabled=true).
- lib/share-token.ts + lib/public-share.ts + app/actions/public-shares.ts (create/list/revoke).
- /s/[token] route; /d/ refactored onto shared SharedDealShell (still decodes v:1);
  portal deal links now /portal/[token]/d/[dealId] (ids only).
- share button opaque-first with legacy fallback (auto-switches when table exists).
- Headers on /(d|s|portal): no-referrer + noindex,noarchive,nosnippet + private,no-store —
  placed AFTER the catch-all (Next merge: last key wins) with a test pinning the ordering.
- Verified on prod build: /s malformed+unknown → 404; headers exact; valid legacy /d 200.
- docs/SHARE_LINK_SECURITY_AND_MIGRATION.md written. Deprecation of /d: 2027-02-01.

## Acceptance criteria status
See brief. None marked complete yet — this file updates as evidence lands.

## Blockers
- None currently. Morgan-owed (standing): apply future surfaced migrations; PostHog env vars.

## Next executable action
Launch discovery fleet (cartography, claims crawl, security recon) + run baseline gates; begin
opaque-share build (migration + lib + routes + tests) as lead-agent workstream.
