# Production-readiness and passive-growth repair — 2026-08-30

## Outcome

The complete local repair is implemented and verified on branch
`fix/my-deals-table-reachability-2026-08-29` at base commit
`995cca4322a27990772b79a75472d4baa933cb36`. The verified patch was transferred
to the authoritative checkout at `/Users/morganpage/Desktop/truecap` without a
commit, push, deployment, provider mutation, email send, purchase, or production
data change. The pre-existing untracked `artifacts/` directory was preserved.

**Code verdict:** deployable candidate; no known regression introduced by this
repair remains.

**Launch verdict:** **NOT READY for paid acquisition or production activation.**
The migration, isolated Auth/RLS, Stripe/configuration, provider, legal, manual
accessibility, staging, and post-deploy gates below remain owner-controlled.

This report is the current completion record for the passive-growth work. The
broader historical readiness record remains in
`docs/launch-readiness-remediation.md`.

## Work completed by phase

1. **Historical URLs:** centralized release-gated permanent redirects, removed
   their sources from the sitemap, repaired canonical internal links, and added
   exact single-hop redirect coverage.
2. **Product facts:** added a typed assembly layer over executable pricing,
   entitlements, evaluation policy, feature gates, calculator/market registries,
   defaults, and source disclosures. Pricing, FAQs, structured data, marketing,
   email copy, and AI-facing routes now consume or are guarded against these
   facts. Billing behavior was not changed.
3. **Indexing:** rebuilt the sitemap around canonical, public, released routes;
   kept private/API/auth routes out; removed invented freshness signals; and
   strengthened robots, canonical, XML, redirect, duplicate, and crawl checks.
4. **Metadata:** aligned the homepage and weak hub metadata around the released
   rental-property calculator and Offer Ceiling workflow, with consistent
   canonical, Open Graph, Twitter, and structured-data URLs.
5. **Passive conversion:** introduced one accessible `SeoAnalyzerCta` contract
   using “Analyze a property free” across article, market, state, glossary,
   comparison, and calculator templates, with only coarse safe attribution.
6. **Embeds:** made the public selector registry/release driven; verified all
   nine advertised embeds and destinations; added safe responsive code,
   sandbox/referrer policy, postMessage resizing, stable UTMs, and a result CTA.
7. **Analytics:** implemented a strict, consent-aware canonical funnel; exact
   event/property allowlists; recursive payload rejection; sensitive-route and
   query suppression; best-effort delivery; and durable at-most-once claims for
   server-authoritative transitions. Raw Stripe resource identifiers were also
   removed from production logs and Sentry payloads.
8. **Customer proof:** added a default-off, permissioned testimonial workflow
   with a separate additive table/RPC, explicit publication consent, approval,
   verification, withdrawal, administrative state, forced RLS, and dedicated
   HMAC rate limiting. No testimonials or aggregate rating were fabricated.
9. **Public sharing:** added opaque-share CTAs and recipient-owned copy support
   with fresh token re-resolution, revocation/expiry checks, immutable sender
   data, auth/entitlement/capacity checks, idempotency, and identity-free
   attribution.
10. **Homepage performance:** added a repeatable production measurement tool and
    deferred nonessential interactive work without moving the address entry or
    removing crawlable content/fallbacks. Mobile layout and accessibility stayed
    within budget.
11. **Content hubs:** grouped markets and blog content with server-rendered
    anchors, linked all city-strategy pages from city pages, preserved canonical
    URLs, eliminated crawl orphans, and enlarged undersized privacy-link targets.

The final release pass also corrected stale launch-plan display metadata with a
forward-only migration and made new subscription checkout fail closed unless
the exact requested cadence has a primary deployment Price. Persisted database
Price mappings and comma-listed legacy Prices remain recovery/recognition paths
for existing sessions and subscriptions; they can no longer silently authorize
new sales.

The repair also removed stale or unsupported product, tax, rate, yield, rehab,
legal, insurance, and tenant claims from high-risk articles, comparisons,
emails, and documentation. Market pages now use a shared source-first contract
instead of local unsupported figures.

## Historical redirect map

All responses below are exact, single-hop HTTP 308 redirects when the
corresponding calculator is unreleased.

| Historical URL                          | Canonical destination                        |
| --------------------------------------- | -------------------------------------------- |
| `/tools/rental-cash-flow-calculator`    | `/`                                          |
| `/tools/cap-rate-calculator`            | `/blog/how-to-calculate-cap-rate`            |
| `/tools/cash-on-cash-calculator`        | `/blog/how-to-calculate-cash-on-cash-return` |
| `/tools/dscr-calculator`                | `/blog/how-to-calculate-dscr`                |
| `/tools/noi-calculator`                 | `/blog/how-to-calculate-noi-rental-property` |
| `/tools/roi-calculator`                 | `/`                                          |
| `/tools/brrrr-calculator`               | `/blog/brrrr-method-explained`               |
| `/tools/house-hacking-calculator`       | `/for-house-hackers`                         |
| `/tools/rental-property-tax-calculator` | `/blog/rental-property-tax-deductions`       |
| `/tools/50-percent-rule-calculator`     | `/blog/50-percent-rule-rentals`              |

## Product facts and authorities

The assembly contract is `lib/product-facts.ts`. It derives rather than
overrides these executable authorities:

- `lib/public-pricing.ts`: Investor Pro $29.99/month or $300/year; Agent Pro
  $59.99/month or $590/year; optional Decision Pack catalog price $9.
- `lib/stripe/plan-prices.ts` and checkout code: exact-cadence deployment
  availability and fail-closed catalog verification. Only the first Price in
  the requested cadence's environment list is sellable; database and appended
  legacy mappings are recovery-only. Agent Pro is shown only when configured;
  new Decision Pack checkout remains dark.
- `lib/entitlements-catalog.ts`: released features and tier limits. Free saved
  deals remain “up to 5.”
- `lib/product-access.ts`: no-card evaluation is 21 days, three new deals, and
  one comparison, with no automatic renewal.
- `lib/calculator-registry.ts`, `lib/markets/cities.ts`, and `lib/states.ts`: 10
  released calculators, nine advertised embeds, 162 markets, and 33 states.
- `lib/investcalc-schema.ts` and the analyzer: tax is a user-entered annual bill
  or reviewed local rate; blank uses a disclosed preliminary 1.1% of entered
  purchase price. Released underwriting does not auto-fill a state tax average.
- `lib/feature-flags.ts` and `lib/investor-strategies.ts`: only released
  strategies and workflows may be claimed; incomplete specialist workflows
  remain dark.

The anonymous first exact decision/PDF remains limited to one deal. All public
financial claims remain preliminary, editable, and explicitly not appraisal,
lending, tax, legal, offer, or investment advice.

## Sitemap and internal links

- Baseline: **409 sitemap URLs**, 56,247 bytes.
- Final: **410 sitemap URLs**, 32,995 bytes.
- Final local production-mode crawl: **410/410 sitemap URLs returned 200**,
  **410/410 were reachable from `/`**, 411 pages and 414 total targets walked,
  with no final findings.
- All ten historical redirect sources are absent from the sitemap.
- The crawl found and repaired a footer link that unnecessarily traversed the
  `/for-agents` redirect, six orphaned city-strategy pages, and a stale
  `truecap-iota.vercel.app` reference. Public cron endpoints correctly returned
  healthy unauthorized responses under the local smoke configuration.
- Robots continues to protect API, auth, dashboard, profile, settings, private
  deal/share/portal, and authenticated-home surfaces while advertising the
  canonical sitemap.

## Analytics and privacy contract

The runtime has **89 dictionary-native/documented event names plus 77 active
compatibility aliases** in disjoint, exact allowlists. Ten of the documented
events form the canonical passive-growth funnel below. Unknown events fail
closed; nested objects/arrays and sensitive keys are rejected.

Canonical funnel order and allowed properties:

| Event                        | Allowed properties                                     |
| ---------------------------- | ------------------------------------------------------ |
| `analysis_started`           | `route_category`, `calculator_slug`, `referral_source` |
| `analysis_completed`         | `route_category`, `calculator_slug`, `referral_source` |
| `account_created`            | `referral_source`                                      |
| `product_evaluation_started` | `referral_source`                                      |
| `upgrade_started`            | `plan_identifier`, `referral_source`                   |
| `subscription_started`       | `plan_identifier`, `referral_source`                   |
| `content_cta_clicked`        | `route_category`, `content_type`, `referral_source`    |
| `embed_cta_clicked`          | `calculator_slug`, `referral_source`                   |
| `shared_analysis_opened`     | `referral_source`                                      |
| `shared_analysis_copied`     | `referral_source`                                      |

Addresses, URLs, queries, financial inputs/results, reports, names, email,
phone, Stripe IDs, database IDs, document IDs, and tokens are prohibited.
`/embed`, `/s`, `/d`, `/portal`, and sensitive query keys suppress third-party
telemetry. A dashboard search query can still exist in first-party request logs
and browser history; third-party telemetry and referrer transmission are
blocked. The durable claim migration covers `account_created`,
`product_evaluation_started`, `subscription_started`, and
`shared_analysis_copied`.

## Testimonial activation state

- Published proof records: `VERIFIED_TESTIMONIALS=[]` and
  `VERIFIED_AGENT_PROOF=[]`; published count is 0 and aggregate rating metadata
  is absent.
- Intake flag: `NEXT_PUBLIC_TRUECAP_TESTIMONIAL_COLLECTION=false` by default.
- Activation requires migration `20260829110000`, a dedicated random
  `TESTIMONIAL_RATE_LIMIT_SECRET` of at least 32 characters, verification of the
  SECURITY INVOKER RPC's service-role-only grants and forced RLS in staging,
  then an explicit flag release. The service-role key is never used as the
  rate-limit secret.
- Every new record defaults private, unapproved, unpublished, and unverified.

## Homepage performance

These are repeatable local production-mode measurements, not field Core Web
Vitals.

| Metric                    |                Baseline |                   Final |             Change |
| ------------------------- | ----------------------: | ----------------------: | -----------------: |
| Raw HTML                  |               307,099 B |               308,841 B |  +1,742 B (+0.57%) |
| First-party JavaScript    | 798,197 B / 48 requests | 784,255 B / 48 requests | -13,942 B (-1.75%) |
| Analyzer ready            |                  370 ms |                  271 ms |             -99 ms |
| Main-thread task duration |                  342 ms |                  289 ms |             -53 ms |
| Script duration           |                  138 ms |                  138 ms |          unchanged |
| FCP                       |                  152 ms |                   72 ms |             -80 ms |
| LCP                       |                  320 ms |                  124 ms |            -196 ms |
| CLS                       |                0.005228 |                0.005228 |          unchanged |
| Long tasks                |                       0 |                       0 |          unchanged |

The raw-HTML values above are the performance script's exact response-body
measurements. A separate saved direct-fetch artifact from the final server was
308,873 B—a 32-byte request-level variance that does not change the budget or
performance conclusion.

At 390×844 the final page had zero horizontal overflow; the hero was visible,
above the fold, and accepted text. Axe reported zero serious/critical findings,
the calculator reached ready state, GTM remained blocked without consent, and
all scripted budgets passed.

## Verification record

| Command/check                          | Baseline                       | Final                                      |
| -------------------------------------- | ------------------------------ | ------------------------------------------ |
| `npm test`                             | 343 files / 4,479 tests passed | 364 files / **4,594 tests passed**         |
| `npx tsc --noEmit --incremental false` | passed                         | **passed**                                 |
| `npm run lint`                         | passed, 0 errors / 11 warnings | **passed, 0 errors / 10 warnings**         |
| changed-file formatting checks         | not separately recorded        | **passed for formatter-supported files**   |
| `git diff --check`                     | clean                          | **clean**                                  |
| `npm run build`                        | 475 pages built                | **475/475 pages built**                    |
| `npm run pdf:check -- --branches`      | not baseline-measured          | **7/7 shapes passed, 110.8 KB**            |
| public Playwright suite                | 21/21 passed                   | **25/25 passed**                           |
| authenticated Playwright discovery     | environment unavailable        | **5 discovered / 5 conditionally skipped** |
| local production-mode SEO healthcheck  | baseline inventory only        | **exit 0, no findings**                    |
| redirect probes                        | inventoried                    | **10/10 exact 308 destinations passed**    |
| sitemap/canonical/internal crawl       | 409 URLs                       | **410/410 passed; no orphans**             |
| desktop/mobile/200% zoom smoke         | passed                         | **passed**                                 |
| Axe serious/critical                   | 0                              | **0**                                      |
| homepage performance budgets           | passed                         | **passed**                                 |

Focused Vitest runs were also executed after each repair area for product facts,
redirects, sitemap/robots/metadata, CTA/template reachability, embeds, analytics
privacy and deduplication, testimonials, public-share authorization/idempotency,
product claims, and content-hub crawlability. No test was weakened or disabled.

## Pre-existing and environment-only findings

- ESLint retains 10 pre-existing non-blocking warnings: two React hook
  dependency warnings, two React Hook Form compiler warnings, several
  unused-symbol warnings, and one `prefer-const` warning. The unused import in
  the touched plan-price test was removed.
- The clean build reports Next.js's existing Edge Runtime deprecation warning.
- The sandbox could not resolve Google Fonts during one build or the npm
  registry during one PDF invocation; the same commands passed with approved
  network access. These were environment failures, not source failures.
- Heavy local crawling could trigger a Node `MaxListenersExceededWarning`, and
  local placeholder flows noted missing optional FRED/HUD keys. Neither caused
  a failed product check.
- Isolated authenticated Supabase/Auth/RLS browser verification was safely
  skipped because no isolated environment or disposable users were available.
  No production account or record was used as a substitute.

## Changed-file scope

The final patch contains **336 modified tracked files and 43 new files (379
total)**. The complete inventory is reproducible with:

```sh
{
  git diff --name-only --diff-filter=ACMRTUXB HEAD
  git ls-files --others --exclude-standard
} | sort -u
```

Primary groups are:

- public routes and metadata under `app/`;
- shared marketing, analyzer, embed, analytics, and admin components under
  `components/`;
- product-fact, pricing/entitlement consumption, analytics/privacy, sharing,
  market, embed, and redirect contracts under `lib/`;
- unit/integration guards under `lib/__tests__/` and browser checks under
  `e2e/`;
- SEO and performance tooling under `scripts/seo/` and `scripts/performance/`;
- current emails and launch documentation under `emails/` and `docs/`;
- `.env.example`, `next.config.mjs`, `playwright.config.ts`, and `package.json`;
- the four new additive/forward-correction migrations listed below.

## Required migration and deployment sequence

No migration was applied during the local repair. Inspect the target Supabase
migration ledger, back up first, then apply **only pending** migrations in
filename order in an isolated staging environment before production. In
addition to any earlier pending ledger entries, these launch-critical
migrations must be present:

1. `20260713120000_webhook_claim_lock.sql`
2. `20260817190000_testimonial_submissions.sql` (legacy branch migration)
3. `20260823190000_subscription_checkout_intents.sql`
4. `20260825120000_decision_pack_credit_adjustments.sql`
5. `20260827090000_no_card_product_evaluations.sql`
6. `20260827100000_launch_plan_catalog_metadata.sql`
7. `20260827230000_saved_deal_history.sql`
8. `20260827233000_buy_box_irr_cash_targets.sql`
9. `20260829110000_testimonial_workflow_hardening.sql`
10. `20260829113000_canonical_analytics_event_claims.sql`
11. `20260829140000_public_share_copy_idempotency.sql`
12. `20260830120000_reconcile_launch_plan_catalog_metadata.sql`

This repair adds the last four migrations. The final one preserves immutable
migration history while correcting the earlier display metadata to the
executable $29.99/$300 and $59.99/$590 catalog; it does not touch Stripe Price
IDs, entitlements, active state, or subscriptions. Migrations alone do not
prove that deployed Stripe Prices match that catalog. Verify exact active USD
amount/cadence configuration separately without editing existing Prices.

After migration, verify function ownership where applicable, grants, forced
RLS, the testimonial SECURITY INVOKER boundary, paid-plan `pipeline` metadata,
evaluation limits, history/target persistence, analytics claim constraints,
testimonial consent/approval/withdrawal gates, and the active-share unique
index/idempotency behavior. Then run isolated authenticated
save/reopen/history/comparison, OAuth, share-copy/revocation, evaluation,
checkout/webhook, and entitlement-transition tests.

Before launch, also set the build-time
`NEXT_PUBLIC_SITE_URL=https://usetruecap.com`, verify production secrets,
third-party data licenses and quotas, monitoring/rollback ownership, analytics
consent in the deployed environment, legal review, manual assistive-technology
checks, staging smoke, and post-deploy canonical/redirect/sitemap/embed checks.
Only the owner may then enable testimonial intake or authorize paid traffic.
