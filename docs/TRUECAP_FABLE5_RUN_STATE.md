# TrueCap Fable 5 Run State — COMPLETE / SUPERSEDED

> Historical execution state for the autonomous overhaul run started
> 2026-08-12. It is retained only as an audit record and is not a current
> deployment/configuration source. CLAUDE.md and executable catalogs remain
> authoritative.

## Verified facts (from this run + green history)

- HEAD `2787d93` on `main`, CI green, live on usetruecap.com (verified via live curls this session).
- Gates baseline: tsc 0 · vitest 2601 · lint 0 errors · build 0 · integrity 0 (re-verify at start).
- Prices: Pro $29.99/mo `price_1TlJs3…`, Pro annual $300 `price_1TlJtA…`, Agent Pro $59.99/mo
  `price_1U3MUX…`, $590/yr `price_1U3MUv…`; legacy $20 `price_1TVvTz…` grandfathers 2 subs
  (NEVER remap). Historical one-time PDF Price mappings remain only for paid-claim
  recovery; new one-time checkout is disabled. The former 14-day Stripe-trial
  note is superseded: current checkout uses no Stripe trial, while eligible new
  accounts receive a separate 21-day no-card evaluation that does not renew.
- Captcha (Turnstile) LIVE + enforcing; coverage guard `lib/__tests__/captcha-coverage.test.ts`.
- SHARE_LINK_SECRET set in prod (portal links + white-label embeds + /d/ attribution live).
- Supabase project `cpfbtvblaufrnxsrvmnm` (truecap-db). MCP: read SQL fine; DDL apply BLOCKED by
  permission classifier → migrations are WRITTEN + SURFACED for Morgan (SQL-editor paste), code
  ships tolerant of the missing table (MIGRATION_PENDING pattern).
- Deploy convention: push to main → Vercel. No PR gate for this repo (standing rule: ship to main).

## Decisions locked by the brief (do not re-litigate)

- Superseded public positioning (2026-08-24): TrueCap performs rental-property
  underwriting; the user makes the investment decision. Do not market a new
  one-time Decision Pack while checkout remains disabled. Billing IDs stay unchanged.
- Homepage ticker with +50k baseline: REMOVE from customer-facing pages (brief §Phase 1.5
  supersedes the earlier founder call; flag-gated honest counter may return later).
- New public shares: opaque server-backed tokens at `/s/[token]` (hash-at-rest, revocable,
  default expiry); legacy `/d/[encoded]` KEPT decoding (CLAUDE.md §8.8) as time-boxed compat,
  noindexed; portal deal links move off encoded URLs to `/portal/[token]/d/[dealId]`.
- Guarantee + founding offer + $5→Pro credit: implement flag-gated, DISABLED; Terms/Stripe steps
  documented for Morgan. Never enable autonomously.
- Analytics: PostHog is the provider (env still owed by Morgan — events must be PII-free
  regardless).

## RECONCILED 2026-08-17: a parallel session shipped 17 commits on origin/main

(39fbc87..41dbbc0, 403 files) covering large parts of this brief BEFORE this run's
first push: "Illustrative Tax Impact" rename sitewide, marketing-offer-config
(offer SSOT), trust-language-guards test, saved-analysis methodology versioning
(freeze/re-underwrite), telemetry privacy (route-gated Google, sanitized Vercel,
PostHog persistence), FiveDealGuarantee component, DealsAnalyzedTicker rework.
DO NOT REDO those phases — verify against origin's guards instead. This run's
opaque-share work was rebased onto 41dbbc0; conflicts resolved by keeping
origin's trust copy + release-flag/freeze semantics and this run's URL shapes.
Header hardening converged on origin's per-route no-referrer family, extended
with /s/ (+ X-Robots-Tag + no-store); origin's telemetry contract test updated
to count 4 routes.

## CLOSED — storage uploads dead sitewide (found via Morgan's report, fixed + applied 2026-08-17)

truecap_storage_metadata_allowed() returned false on NULL metadata, but Supabase storage
inserts the objects row BEFORE metadata exists → EVERY upload on deal-documents (0 objects
ever), analysis-pdfs (dead since 2026-06-22), and branding-logos was RLS-rejected since the
2026-08-03 hardening. Fixed live via migration 20260817210000 (applied through MCP with
Morgan's explicit request): NULL metadata passes at insert (bucket-level allowed_mime_types +
file_size_limit now enforce at the API layer on all three buckets — allowlists added to
analysis-pdfs + branding-logos), full check still applies when metadata is present
(verified: null=pass, oversized=reject, wrong-mime=reject, good=pass). profile-avatars never
used the helper (unaffected). LESSON for policies: never gate storage INSERT on
objects.metadata — it is not populated yet at policy time.

## Current objective

Phase 1 continues: listing-ingestion hardening, offer SSOT, claims sweep, proof/ticker removal.
Then phases 2–4 (offer/homepage/pricing), then 5–10.

## CLOSED — Phase 1.1 opaque shares (migration APPLIED by Morgan 2026-08-17; live E2E passed)

Live production E2E evidence: minted row → GET /s/<token> 200 with full analysis render,
headers no-referrer + noindex/noarchive/nosnippet + no-store; last_viewed_at bookkeeping
fired; revoked_at set → immediate 404 (no CDN afterlife); test row deleted. Downstream
sweep healthy: / , /pricing, /auth/login, /d/<valid> 200; /d/garbage graceful; /portal/forged
404; /embed/brand/garbage → standard-embed redirect; /dashboard 307; sitemap 200.
Original implementation evidence below:

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
