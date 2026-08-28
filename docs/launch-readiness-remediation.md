# TrueCap launch-readiness remediation

**Last updated:** 2026-08-27  
**Working branch:** `codex/launch-readiness-integrated`  
**Integrated base:** `e706c7e`  
**Decision owner:** TrueCap owner/operator  
**Document purpose:** living implementation, verification, launch, rollback, and residual-risk handoff

## Executive verdict

**NOT READY for paid ads.**

The repository is now a materially stronger, fail-closed launch candidate: the released buy-and-hold path uses canonical full-precision financing, the first real anonymous decision can produce a personal exact memo without a card, unsupported specialist models are dark, saved decisions have durable history, claims and access are catalog-driven, and public downloads no longer make unsafe tax/exit claims.

That is not the same as production readiness. Do not buy traffic until all of the following are true:

1. The four new migrations are reviewed, backed up, applied in order, and verified in an isolated Supabase/Auth environment before production.
2. Authenticated save/reopen/history/comparison, RLS, billing handoff, and entitlement transitions pass browser tests in that isolated environment.
3. Stripe contains exact matching Investor Pro and Agent Pro prices; checkout is exercised safely; Agent Pro remains unreleased.
4. Production secrets, analytics, external-provider credentials, quotas, licensing, fallbacks, monitoring, and rollback ownership are verified.
5. Unsupported proof is still absent and any customer proof added later has real consent and source records.

Until those gates close, this branch is suitable for staged verification—not ad spend.

## Current production drift — P0 external blocker

A read-only comparison on 2026-08-27 at 23:29 ET found the deployed public site materially out of sync with this candidate. Do not send paid traffic to the current production catalog:

- [Live pricing](https://usetruecap.com/pricing) showed Pro at $29.99/month and Agent Pro at $59.99/month, while the candidate catalog is Investor Pro $24/month or $240/year and Agent Pro $49/month or $490/year. The [live Agent page](https://usetruecap.com/for-agents) also showed $590/year.
- Production advertised BRRRR, fix-and-flip, tax, exit, Agent roster/co-branding, and lender/partner report capabilities that this candidate intentionally keeps dark. Dedicated [BRRRR](https://usetruecap.com/for-brrrr) and [flipper](https://usetruecap.com/for-flippers) sales pages remained public.
- Production offered a $5 Decision Pack that described tax and exit content. Candidate Pack checkout and those unsafe outputs are disabled; the unreleased optional configuration is $9 and must not be exposed without a separate release.
- The [live homepage](https://usetruecap.com/) still displayed “52,003+ property analyses run,” while this candidate removes seeded proof. Live authentication copy also retained broad security/data claims that the candidate narrows.
- The indexed [sample memo](https://usetruecap.com/sample-decision-memo) identified methodology v1.1, versus released candidate methodology v1.3 with v1.2 frozen for history. Direct sample/checkout continuation fetches were not reliable in the read-only research client and require real browser smoke tests.

The live homepage's core preliminary-screen, editable-assumption, benchmark-provenance, target-dependent-ceiling, and non-recommendation framing was directionally aligned. Everything else above requires catalog/copy reconciliation, cache/index review, deployment, and smoke testing before acquisition can start.

## Scope and hard constraints

This remediation covered the public funnel, underwriting math, anonymous first decision, no-card evaluation, pricing and entitlements, report/PDF/share parity, saved decision history, offer-target provenance, public downloads, analytics privacy, accessibility guards, and release boundaries for incomplete products.

The work deliberately did **not**:

- deploy an application or change production configuration;
- push a branch or open/merge a pull request;
- apply a Supabase migration or mutate production data;
- create, update, or activate a live Stripe product, Price, coupon, or subscription;
- invent reviews, analysis counts, case studies, provider facts, or compliance claims;
- mutate the source checkout or the user-supplied artifact directory.

Existing user work was preserved. Implementation occurred only in the writable remediation clone. The original source checkout remained unchanged, including its untracked `artifacts/` directory.

## Release decision rules

- **Enabled** means implemented and covered by code-level verification, but it may still depend on an external launch gate listed below.
- **Fail closed** means missing release flags, secrets, prices, entitlements, verification, or provenance hide or deny the capability rather than substituting a stronger claim.
- **Dark** means absent from public marketing, navigation, calculations, shares, exports, and new snapshots. Historic records may retain a sanitized label or payload so existing data is not silently rewritten.
- **External** means code cannot close the gate without owner-controlled credentials, infrastructure, billing, migration, legal, or customer action.
- A passing build is necessary but is not evidence that billing, providers, authentication, or production migrations work.

## Launch-safe capability matrix

| Capability | Current disposition | Launch contract and guard |
|---|---|---|
| Standard buy-and-hold analysis | **ENABLED IN CODE** | Canonical full-precision schedule and calculation engine feed calculation, projection, compare, report, PDF, and share consumers. Released methodology is v1.3. |
| Released input set | **ENABLED IN CODE** | Includes recurring other income; current/stabilized or unit rents; fixed and categorized recurring costs; turnover/leasing reserves; points/origination; interest-only period; amortization and maturity; balloon; lender escrows/reserves; acquisition credits; fixed/percent closing costs; selling-cost percent; and simple rent downtime. |
| Anonymous first real decision | **ENABLED IN CODE / EXTERNAL SECRET** | One exact memo for one canonical browser/deal fingerprint, valid for 21 days. A same-deal replay is allowed. A changed address or material input revokes the displayed exact grant synchronously. Requires a strong signing secret. |
| Anonymous Offer Ceiling | **ENABLED IN CODE** | Exact financing-aware target is required for an exact ceiling. Unverified or noncanonical target data is downgraded. A coarse range may be shown, but it cannot masquerade as an exact ceiling. |
| Anonymous PDF | **ENABLED IN CODE / PERSONAL MODE ONLY** | Exact grant permits a personal decision memo. Lender, partner, and agent modes require their own released paid entitlement and cannot inherit anonymous access. |
| No-card evaluation | **ENABLED IN CODE / MIGRATION REQUIRED** | Three new evaluation deals, one comparison, and 21 days. The anonymous first exact deal is preserved after signup and does not consume one of the three evaluation deals. |
| Investor Pro | **ENABLED IN CATALOG / STRIPE REQUIRED** | Display targets are $24 monthly and $240 annual. Checkout must fail closed until configured Stripe Prices match those exact amounts and cadence. |
| Saved decision history | **ENABLED IN CODE / MIGRATION REQUIRED** | Durable decision, pass reason, status timeline, diligence, and offer-target persistence with RPC/RLS protections. |
| Focused decision comparison | **ENABLED IN CODE / AUTH VERIFY** | Uses normalized canonical analysis rather than a lead-count winner. Authenticated browser verification is still external. |
| Listing-price provenance | **ENABLED IN CODE / PROVIDER EXTERNAL** | Stores provider, observed date, and input fingerprint. Address or material-input changes invalidate stale exact presentation. Honest manual-entry fallback remains available. |
| DSCR | **ENABLED IN CODE** | Exact financed-deal calculation. All-cash deals display `N/A — no debt service`; they are not assigned an artificial infinite or winning ratio. |
| Simple renovation | **ENABLED WITH LIMITED CLAIM** | May adjust released inputs and is labeled steady-state. It does not claim a detailed draw, construction, lease-up, basis, or refinance timeline. |
| Decision-first result hierarchy | **ENABLED IN CODE** | Pursue/watch/pass, target fit, ceiling/binding constraint, required change, sensitivity, verification, and next action are ordered as one decision flow. |
| Agent Pro sales/checkout | **DARK / RELEASE FLAG OFF** | Catalog target is $49 monthly and $490 annual, but release remains false until complete auth, workflow, permission, billing, and browser evidence exists. |
| Optional Decision Pack checkout | **DARK** | Optional $9 Pack and any 30-day credit/coupon remain off. Historic `$5` and unsupported checkout language must not return. |
| BRRRR | **DARK** | Incomplete acquisition/refinance ledger, loan transition, and timing make the model unsafe to sell. |
| Fix-and-flip | **DARK** | Not released; zero-month annualization is `N/A`, not an invented return. |
| Tax strategy and after-tax returns | **DARK** | No assumption that losses produce immediately usable tax savings. No tax-advice positioning. |
| Exit scenarios | **DARK** | Not released until payoff, selling costs, basis, taxes, timing, and contribution reconciliation are complete. |
| Financing profiles | **DARK** | No public promise of reusable financing presets until persistence and calculation parity are fully verified. |
| Detailed rehab/refinance | **DARK** | Draw schedules, funding, placed-in-service/lease-up, repair-versus-capital treatment, basis/tax effects, financed improvements, and the second loan schedule are not modeled safely. |
| Saved watch automation | **DARK** | No public automation promise without durable job execution, notification, opt-out, and monitoring evidence. |
| Batch underwriting | **DARK** | No public bulk-analysis promise without complete canonical parity, limits, failure handling, and export evidence. |
| Agent matching/referrals | **DARK** | No matching, lead routing, return, or engagement claims without permission and workflow evidence. |
| Owned-property actuals | **DARK** | No portfolio-performance claim until actual and pro forma data are explicitly separated and reconciled. |
| Advocacy contract | **DARK** | No unsupported negotiation, representation, lender, brokerage, or legal-service promise. |
| Agent portal/white-label | **DARK** | Hidden until client permissions, tenancy, branding, revocation, reports, and audit behavior are complete. |

## P0 closure summary

| P0 area | Disposition | What changed | Remaining launch gate |
|---|---|---|---|
| Canonical financial engine | **CLOSED IN CODE** | Full-precision loan schedule is canonical across calculation, projection, exit internals, and mortgage comparison; PMI supports explicit modes; consumers rerun the engine instead of reconstructing partial math. | Production canary comparison. |
| Contributions, IRR, and edge cases | **CLOSED IN CODE** | Returns include later capital contributions; multiple IRR roots are detected rather than silently selecting one; zero-month flip annualization returns `N/A`; all-cash DSCR is exact `N/A — no debt service`. | Monitor boundary fixtures after future model edits. |
| Incomplete specialist models | **CLOSED BY DISABLING** | BRRRR, flip, tax, exit, detailed rehab/refi, and other unsafe identities are gated out of new analysis, marketing, navigation, reports, shares, and specialist workflows. Historic state is preserved without making it newly actionable. | Reopen only through a separately reviewed model release. |
| Methodology and snapshots | **CLOSED IN CODE** | v1.3 is current; v1.2 remains frozen. Unsupported old shares fail closed instead of being reinterpreted under new math. | Production compatibility check after migration/deploy. |
| Offer Ceiling and target provenance | **CLOSED IN CODE** | Exact targets require canonical, financing-aware persisted inputs. Unverified buy-box data is downgraded; report/share/PDF callers use the same target and values. Optional unique contribution-aware 10-year IRR and max-cash targets are persisted. | Migration application and provider verification. |
| Released input completeness | **CLOSED FOR V1 SCOPE** | Added the released income, rent, expense, financing, acquisition, selling, reserve, credit, balloon, and simple-downtime fields with save/reopen/share/report/PDF parity. Generic refinance fails closed. | Authenticated browser verification and staged data migration. |
| First free decision | **CLOSED IN CODE** | Signed 21-day browser/deal grant, one exact personal memo, same-deal replay, input/address invalidation, server-side claim and CPU limits, and post-signup continuity without consuming an evaluation deal. | Strong production secret, trusted proxy policy, and shared abuse controls. |
| Evaluation, pricing, and entitlements | **CLOSED IN CODE / EXTERNAL** | Three-deal/one-comparison/21-day no-card evaluation; configuration-driven claims and prices; fail-closed feature gates; plan-aware signup handoff. | Migrations, isolated Auth E2E, and exact Stripe configuration. |
| Public funnel and claims | **CLOSED IN CODE** | Homepage follows the requested decision positioning and seven-block flow; mobile reassurance, sample memo, async map loading, popup removal, and unsupported proof removal are implemented. | Production visual smoke test after deployment. |
| PDF/report access | **CLOSED IN CODE** | Server decides report mode; anonymous/evaluation access is personal only; lender/partner/agent modes require released paid entitlements. | Authenticated entitlement E2E. |
| Accessibility defects found in remediation | **CLOSED IN CODE** | Distinct password-confirmation visibility labels, focus/validation guards, responsive coverage, and axe checks are present. Automated production-build browser coverage passed, including keyboard focus behavior, touch targets, axe, and effective 200% zoom. | Manual screen-reader spot check and independent contrast sign-off. |

## P1 closure summary

| P1 area | Disposition | What changed | Remaining launch gate |
|---|---|---|---|
| Property-data ingestion | **CLOSED IN CODE / EXTERNAL** | Provider responses carry provenance; stale exact listing data is invalidated; manual entry and honest unavailable states replace fabricated facts. | Credentials, terms/license review, quota and timeout alarms, and live fallback smoke tests. |
| Decision-first results | **CLOSED IN CODE** | Results emphasize the decision, target fit, binding constraint, required change, sensitivity, verification, and next step. | Production smoke after deployment. |
| Comparison | **CLOSED IN CODE / AUTH VERIFY** | Canonical normalized assumptions replace simplified financing reconstruction. | Authenticated comparison E2E. |
| Acquisition decision log | **CLOSED IN CODE / MIGRATION REQUIRED** | Decision history, pass reasons, status timeline, diligence, scenario sanitation, offer-target provenance, and RLS-backed persistence were added. | Apply migration and test multiple users/roles. |
| Public downloads | **CLOSED IN ARTIFACTS** | Spreadsheet uses exact all-cash DSCR wording and omits unsafe after-tax/exit claims; PDF gives neutral buy-and-hold guidance and no BRRRR recommendation. | Recheck deployed asset hashes after release. |
| Agent product | **CLOSED BY DISABLING** | Agent identities and unsupported specialist actions are hidden; Agent Pro release defaults false. | Separate product acceptance plan before release. |
| Analytics privacy and taxonomy | **CLOSED IN CODE / EXTERNAL** | Allow-list and event documentation exclude PII and raw property/financial inputs; funnel taxonomy is configuration-aware. | Configure PostHog, retention, dashboards, access, and deletion policy; verify events in staging. |
| Trust copy | **CLOSED IN CODE** | Seeded analysis counters, review implications, customer-review link, tax/exit certainty, and specialist overclaims were removed or guarded. | Add only approved, attributable real proof. |

## P2 closure summary

| P2 area | Disposition | What changed | Remaining launch gate |
|---|---|---|---|
| Focused finalist comparison | **CLOSED IN CODE / AUTH VERIFY** | Two-to-four-deal comparison uses canonical normalized assumptions, separates near-term and long-term evidence, discloses differing inputs, and no longer declares a winner from a raw metric-lead count. | Isolated authenticated comparison E2E. |
| Full acquisition pipeline | **PARTIAL / HONESTLY SCOPED** | Existing stages, notes, tasks, duplication, diligence, and saved-deal workflow remain; decision/pass history and target provenance are now durable. No claim is made that TrueCap replaces property-management accounting. | Apply the history migration and verify save/reopen/edit/delete across users. |
| Scenario and decision history | **CLOSED IN CODE / MIGRATION REQUIRED** | Saved history records decision changes, pass reasons, timeline events, and diligence state. New scenarios are sanitized against unreleased specialist identities. | Migration and RLS verification. |
| Reusable assumptions | **PARTIAL** | Buy Boxes and repeat-deal assumptions are supported in the released path. Detailed financing profiles remain dark because persistence and cross-surface parity are not yet complete. | Authenticated acceptance for released reuse; separate release review for financing profiles. |
| Watches, alerts, and actual-versus-pro-forma | **DARK** | Public promises were removed. No projected value is presented as actual portfolio performance. | Durable jobs, notification controls, provider permission, actual-data provenance, and operational monitoring. |
| Agent workflow and external handoff | **DARK / LIMITED EXPORT ONLY** | Agent portal, assignment, engagement analytics, lead return, and white-label claims remain off. Reviewed spreadsheet/PDF outputs are available; no unsupported direct Stessa/accounting integration is claimed. | Separate Agent acceptance plan and any partner-approved integration work. |

## Important implementation files

The integrated change spans 408 files because financial outputs, access claims, marketing, saved snapshots, tests, and generated public assets had duplicated contracts. The highest-signal files are:

- Canonical finance: `lib/calc-analysis.ts`, `lib/loan-amortization.ts`, `lib/ten-year-projections.ts`, `lib/returns.ts`, `lib/mortgage-scenario-compare.ts`, `lib/underwriting-methodology.ts`, and `components/investcalc/mortgage-scenario-compare.tsx`.
- Released analyzer and decision UI: `components/investcalc/investcalc-page.tsx`, `components/investcalc/analysis-dashboard.tsx`, `components/investcalc/focused-decision-summary.tsx`, `components/investcalc/buy-and-hold-assumptions-section.tsx`, `components/investcalc/input-confidence-card.tsx`, and `components/investcalc/pdf-purchase-dialog.tsx`.
- Offer targets and provenance: `lib/mao-targets.ts`, `lib/offer-ceiling-server.ts`, `lib/external-offer-ceiling-provenance.ts`, `lib/recorded-offer-ceiling.ts`, and `lib/recorded-price-provenance.ts`.
- Anonymous/evaluation/report access: `app/actions/anonymous-decision.ts`, `app/actions/product-evaluation.ts`, `app/actions/offer-ceiling.ts`, `app/actions/generate-report-pdf.ts`, `lib/anonymous-decision-grant.ts`, `lib/anonymous-decision-presentation.ts`, `lib/product-access.ts`, and `lib/pdf-report-mode-access.ts`.
- Persistence: `lib/deal-history.ts`, `components/investcalc/deal-history-timeline.tsx`, the saved-analysis server actions/pages, and the four ordered `supabase/migrations/20260827*.sql` files listed below.
- Pricing and release truth: `lib/entitlements-catalog.ts`, `lib/public-pricing.ts`, `lib/stripe/plan-prices.ts`, `lib/feature-flags.ts`, `app/pricing/page.tsx`, and `.env.example`.
- Public funnel and proof controls: `app/page.tsx`, `components/marketing/marketing-hero.tsx`, `components/marketing/landing-sections.tsx`, `components/marketing/pricing-toggle-plans.tsx`, `app/reviews/page.tsx`, and `docs/BETA-CASE-STUDY-INTAKE-TEMPLATE.md`.
- Reports and downloads: `lib/pdf-generator.ts`, `lib/report-data-builder.ts`, `scripts/pdf-visual-check.ts`, `scripts/build-market-intelligence-pack.ts`, and both files under `public/downloads/`.
- Verification and operations: `e2e/public-product.spec.ts`, `e2e/authenticated-core-workflows.spec.ts`, `e2e/authenticated-product.spec.ts`, `e2e/visual-public.spec.ts`, the golden/contract suites under `lib/__tests__/`, `docs/PROPERTY-DATA-INTEGRATION-CHECKLIST.md`, and `docs/launch-analytics-query-plan.md`.

## Verification and evidence record

These results describe the remediation clone, not production.

| Check | Result | Evidence and interpretation |
|---|---|---|
| Unit/integration/contract suite | **PASS** | 324 files; 4,379 tests passed (final rerun 2026-08-28). Includes canonical financial parity, released-input completeness, release boundaries, anonymous grant security, evaluation accounting, access control, snapshots, reports/shares, and public-asset contracts. |
| TypeScript | **PASS** | `npx tsc --noEmit --incremental false` completed with no diagnostics. |
| Lint | **PASS WITH WARNINGS** | Exit 0; 0 errors and 11 warnings. Remaining warnings are known unused values, React Compiler exclusions, and hook dependency advisories; they are not treated as proof of runtime behavior. |
| Production build | **PASS** | Next.js compiled, typechecked, and generated 475/475 pages. The count fell from 483 because eight `opengraph-image` routes belonging to gated calculators were removed (see the continuation log). Known framework warnings: Edge Runtime deprecation and an edge page that disables static generation. |
| PDF branch renderer | **PASS** | All 7 required shapes passed: standard, cash purchase, all-zero, single-row, all-negative, sparse, and long-string branches. |
| PDF visual inspection | **PASS** | Standard report and all eight pages of the long-string report were rendered and inspected after fixing dynamic financing-block height and operating-statement card height. No overlap or clipping remained; long-address truncation is intentional inside the bounded hero. |
| Public download artifact guards | **PASS** | 4/4 artifact tests passed. Spreadsheet sheets/formulas/errors were checked; the PDF was regenerated and rendered. |
| Golden financial parity | **PASS** | All 9 reviewed v1.3 cases passed exact literal-output checks. The parity suite also confirmed canonical agreement across the analyzer engine, saved snapshots, normalized Compare payloads, public shares, sample decision, Offer Ceiling, and report/PDF adapters. Focused rerun: 2 files and 5 tests passed. |
| Public browser suite | **PASS** | 21/21 passed against the final production build (rerun 2026-08-28 with `PLAYWRIGHT_USE_PRODUCTION_SERVER=true`; the dev-server path cannot run in this clone because `node_modules` is a symlink outside the filesystem root, which Turbopack rejects). Coverage includes 390/768/1024/1280 widths, effective 195px/200% zoom, keyboard/focus/modal behavior, touch targets, serious/critical WCAG 2.1 A/AA axe scans, dark release gates, sample continuity, an actual `%PDF-` download, exact first-deal binding, edit revocation, and second-deal denial. |
| Public visual capture | **PASS** | 1/1 visual suite passed (rerun 2026-08-28) and regenerated 13 desktop/mobile artifacts for homepage, sample, form, result, pricing, signup, and the blocked checkout. Manual review caught a mobile long-label collision; the button was fixed, a content-overflow assertion was added, and the visual suite was rerun successfully. |
| Before/after screenshot set | **PUBLIC SET COMPLETE / AUTH SET BLOCKED** | Ten public baseline captures and 13 final public captures are retained for homepage, pricing, signup, initial analysis, results, sample, and blocked checkout states. Saved-deal and comparison captures require the missing isolated authenticated environment; they were not fabricated or substituted with privileged production data. Capture them with the authenticated acceptance run. |
| Authenticated browser suite | **SKIPPED — EXTERNAL ENVIRONMENT ABSENT** | The command discovered 5 authenticated workflows and skipped all 5 because no isolated Supabase/Auth project and disposable users were configured. This is not a pass for RLS, persistence, billing handoff, or entitlement transitions. |
| Production smoke test | **NOT AUTHORIZED / NOT RUN** | No deploy occurred. Run only after owner-approved staging and launch procedure. |

### Completed public browser acceptance

The final production-build browser run demonstrated:

- 390, 768, 1024, and 1280 viewport behavior with no unintended horizontal overflow;
- usable content at 200% zoom, including the effective 195px-width case;
- keyboard operation, visible focus, focus restoration, modal semantics, form errors, and 44px touch targets;
- axe WCAG 2.1 A/AA serious and critical scans on public homepage, analyzer, results, sample, pricing, and relevant dialogs;
- one anonymous real decision, exact Offer Ceiling grant, personal PDF download with a valid `%PDF-` header, edit-in-place revocation, honest coarse preview, and denial for the next new deal;
- anonymous sample behavior that does not consume or replace the real-deal grant;
- disabled specialist, tax, exit, and unreleased Agent identities remaining absent;
- signup continuity, selected-plan/cadence copy, and protected-destination behavior.

The nine reviewed golden cases cover a financed single-family rental, an all-cash purchase with exact-dollar tax and insurance, zero-interest financing, low-down permanent PMI, a three-unit property, an owner-occupant duplex, a short-term rental, severe negative carry, and a rehab cash requirement. Expected values remain literal and require an explicit methodology review to change; they are not regenerated from the implementation under test.

### Required authenticated browser acceptance

Use an isolated, disposable environment to prove:

- signup/login/logout and callback continuity;
- the anonymous exact memo survives signup and consumes zero of the three evaluation deals;
- deal one through three are accepted, deal four is denied, and one comparison is enforced for 21 days;
- save, reopen, duplicate, decision change, pass reason, history timeline, diligence, and deletion behavior;
- two-user RLS isolation for saved analyses, history, targets, and evaluation usage;
- personal versus lender/partner/agent PDF access under anonymous, evaluation, Investor Pro, unreleased Agent Pro, cancelled, expired, and admin states;
- displayed price, Stripe Price, cadence, trial/evaluation language, renewal, cancellation, legal terms, webhook transitions, and entitlement state agree;
- deep-link restoration and stale/legacy share failure behavior.

## Database migration runbook

Do not edit prior migrations and do not apply these from an ad hoc developer session. Back up the target database, record the schema version, review SQL and RLS with the owner, and apply the following files in this exact order:

1. `20260827090000_no_card_product_evaluations.sql`  
   Adds the no-card product-evaluation usage model and its server-side enforcement primitives.
2. `20260827100000_launch_plan_catalog_metadata.sql`  
   Adds launch plan/catalog metadata required by configuration-driven entitlements and exact price/cadence presentation.
3. `20260827230000_saved_deal_history.sql`  
   Adds durable saved-deal decision history, pass reasons, timeline/diligence state, RPC behavior, and RLS boundaries.
4. `20260827233000_buy_box_irr_cash_targets.sql`  
   Adds persisted optional contribution-aware 10-year IRR and maximum-cash offer targets.

For each migration:

1. Apply it first to the isolated test/staging project.
2. Capture migration output and schema diff.
3. Run migration-specific unit/contract tests, then the authenticated browser matrix.
4. Verify RLS as at least two normal users plus the expected service role; never rely only on a privileged SQL session.
5. Confirm old rows and old snapshots remain readable and fail closed where their methodology is unsupported.
6. Record row counts and query health before and after.
7. Only then schedule a reviewed production application with a backup and named rollback owner.

The migrations are part of the launch dependency chain. A code deploy without them, or migrations without the matching code and verification, is not an acceptable partial launch.

## External launch actions

### Supabase and authentication

- Provision an isolated Supabase/Auth project and disposable test users; never point destructive or multi-user E2E at production.
- Apply the four migrations in the stated order.
- Configure callback URLs, email behavior, service/server credentials, and row-level security exactly as staging will use them.
- Run the full authenticated acceptance matrix and retain traces/screenshots for failures and final passes.
- Confirm backups, point-in-time recovery expectations, migration ownership, and data-retention/deletion behavior.

### Stripe and plan configuration

- Create or identify exact test-mode and production-mode Prices for **Investor Pro: $24/month and $240/year**.
- Create or identify exact test-mode and production-mode Prices for **Agent Pro: $49/month and $490/year**, but keep the Agent release flag false and all Agent checkout entry points dark.
- Keep the optional **$9 Decision Pack** and any **30-day credit/coupon** off unless the owner separately releases and tests that product.
- Map Price IDs through configuration; do not hard-code live identifiers or allow a mismatched Price to proceed.
- Exercise checkout, cancellation, renewal, failed payment, webhook replay/idempotency, evaluation-to-paid transition, and entitlement removal in Stripe test mode.
- Have the owner confirm customer-facing terms, refund/cancellation language, tax handling, receipts, support channel, and descriptor before production activation.

### Secrets and anonymous abuse controls

- Set `SHARE_LINK_SECRET` to at least 32 cryptographically random bytes in every deployed environment; do not reuse a human password or check it into the repository.
- Confirm the trusted-proxy chain and the exact header from which client IP is derived.
- Move anonymous claim/CPU limits to a shared durable limiter before meaningful paid volume, or explicitly accept the weaker per-instance boundary and monitor it.
- Add alarms for claim denial, rate limiting, invalid signatures, late/stale grants, PDF failures, and unusual per-IP/per-fingerprint volume without logging raw addresses or financial inputs.

### Analytics and privacy

- Configure PostHog only after confirming the event/property allow-list in staging.
- Build owner-visible acquisition, first-decision activation, evaluation utilization, checkout, paid conversion, cancellation, and 30-/90-day retention dashboards.
- Verify that addresses, rent, price, loan details, email, tokens, report contents, and raw underwriting inputs never enter analytics payloads.
- Configure consent, access control, retention, deletion, environment separation, and alert ownership.
- Reconcile browser counts with server-side entitlement and Stripe records before trusting conversion metrics.

### Property and market-data providers

- Configure only providers for which credentials, terms, geographic coverage, storage rights, attribution, and production use are approved.
- Verify quota, timeout, retry, cache, provenance date, source labeling, and stale-data invalidation for each enabled adapter.
- Review and smoke-test Google address/maps services, RentCast property/rent/comps, FRED series, and HUD data independently. Disable any adapter that lacks credentials, legal approval, sufficient quota, or a tested fallback.
- Confirm manual entry remains usable and clearly labeled whenever a provider is unavailable or a fact is unverified.
- Alert on provider error rate, latency, quota exhaustion, stale observation dates, and unexpected fallback frequency.

### Production catalog and copy reconciliation

- Deploy only the reviewed candidate artifact after staging acceptance; do not patch isolated production copy while leaving entitlement and calculation behavior on a different version.
- Verify the displayed catalog, configured Stripe Price IDs, checkout totals, and billed cadence agree at $24/$240 for Investor Pro and $49/$490 for still-unreleased Agent Pro.
- Keep Agent Pro, Decision Pack, BRRRR, flip, tax, exit, detailed rehab/refinance, lender/partner modes without entitlement, and every other dark capability absent from navigation, SEO routes, sales pages, signup, reports, and checkout.
- Verify the anonymous first decision and three-deal/one-comparison evaluation contract on the deployed artifact.
- Verify the sample and methodology pages identify released v1.3 behavior and preserve v1.2 only as frozen historical compatibility.
- Remove seeded volume proof and unsupported security/data guarantees, invalidate application/CDN caches, and audit canonical metadata plus search-visible copy.
- Browser-smoke the canonical `/auth/sign-up`, `/sample-decision-memo`, pricing anchors, plan/cadence handoff URLs, and protected deep links after deployment.

### Proof, support, and operations

- Obtain explicit consent and source records before publishing a customer quote, review, case study, logo, or outcome.
- Define what an “analysis” means before publishing any count; do not restore seeded counters.
- Assign owners for billing support, incorrect-data reports, deletion/privacy requests, failed PDFs, and calculation escalations.
- Run a small internal/staged cohort before any paid campaign and review decisions manually for unsafe or misleading output.

## Rollout and rollback plan

### Recommended rollout

1. Merge only after the final public browser suite is green and evidence is archived.
2. Deploy to an isolated staging environment with the four migrations, Auth, Stripe test mode, PostHog test project, and approved provider credentials.
3. Complete authenticated, billing, RLS, accessibility, PDF, provider-failure, and legacy-snapshot acceptance.
4. Apply reviewed production migrations during a controlled window with backups and a named rollback owner.
5. Deploy production code with Agent Pro, Pack, and every dark specialist capability still off.
6. Run production smoke tests using internal accounts and non-sensitive test deals.
7. Admit a small controlled cohort, observe at least one full anonymous → evaluation → paid lifecycle, and reconcile app/Stripe/database state.
8. Approve paid traffic only after the owner signs off on the evidence and residual risks.

### Rollback triggers

Immediately stop acquisition traffic and disable the affected entry point if any of these occur:

- a cross-surface difference in payment, cash-to-close, DSCR, Offer Ceiling, or report values;
- an exact anonymous memo surviving a material deal edit or being granted to a second new deal;
- cross-user data access, history leakage, or an entitlement escalation;
- a Stripe/display-price mismatch, missing webhook transition, duplicate charge, or access retained after cancellation beyond the defined policy;
- a PDF mode bypass or lender/partner/agent report exposed without its entitlement;
- provider facts presented as verified without current provenance;
- serious/critical accessibility regression on the primary decision path;
- elevated calculation, PDF, provider, Auth, or migration errors.

Prefer a feature-flag or route-level shutdown for the smallest affected surface. Roll back the application to the last verified artifact when compatibility permits. Database changes require a migration-specific reviewed plan: do not improvise destructive down-migrations under live traffic. Preserve logs and affected identifiers without retaining raw financial inputs, notify the owner, reconcile impacted decisions, and ship a forward fix only after reproducing the issue in staging.

## Monitoring checklist

At launch, the named owner should monitor:

- analyzer start → first complete decision → signup → evaluation use → checkout → paid activation;
- anonymous grant success, denial reason, replay, invalidation, signature failures, and per-IP/fingerprint abuse indicators;
- evaluation deal and comparison counts, expiry, and anonymous-to-account carryover;
- calculation/report/share parity sampling for the same immutable snapshot;
- PDF generation latency, error rate, mode, and download validity;
- Auth failures, callback failures, RLS denials, unexpected privileged access, and saved-history write failures;
- Stripe checkout/webhook success, replay, lag, mismatch, cancellation, and entitlement reconciliation;
- provider availability, latency, quotas, freshness, fallback rate, and provenance completeness;
- Web Vitals, JavaScript exceptions, accessibility regressions, and funnel drop-off by viewport;
- support reports about incorrect inputs, unclear assumptions, misleading recommendations, or inaccessible controls.

Monitoring must use the approved analytics allow-list. Property addresses, email, raw financial inputs, report contents, tokens, and secrets are never acceptable diagnostic properties.

## Residual risks and accepted limitations

| Risk | Current control | Required owner decision or mitigation |
|---|---|---|
| Cookie deletion/private browsing/device changes can reset the anonymous identity | HMAC-signed browser/deal grant, canonical fingerprint, same-deal replay only | Accept as a low-volume product limit or add privacy-reviewed durable identity. Do not advertise it as Sybil-proof. |
| One user can distribute attempts across IPs/devices | Per-browser grant plus IP claim and CPU rate limits | Shared durable abuse limiter, anomaly monitoring, and a documented response threshold before paid scale. |
| Rate limiting is per instance | Best-effort local limiter | Use a shared production store before horizontal scale. |
| Client IP depends on proxy headers | Trusted header assumption | Document and test the proxy chain; reject untrusted forwarding headers. |
| Auth/RLS lifecycle lacks final browser evidence | Unit/contract coverage and fail-closed server gates | Isolated multi-user authenticated E2E is mandatory. |
| New schema is not deployed | Ordered additive migrations exist | Backup, staged apply, RLS verification, production review. |
| Billing configuration is external | Exact price/cadence validation and fail-closed checkout | Configure Stripe test/live Prices and verify the lifecycle; keep Agent/Pack dark. |
| Provider truth is environment-dependent | Provenance, invalidation, and manual fallback | Verify licensing, credentials, quota, freshness, and failure behavior per provider. |
| Current production catalog contradicts the candidate | Read-only comparison captured exact live drift; no production mutation was made | Reconcile through a reviewed deployment, exact Stripe/config verification, cache/index review, and post-deploy browser smoke before ads. |
| Automated accessibility is incomplete evidence | Axe, responsive, focus, and touch-target tests | Manual keyboard, screen-reader spot checks, contrast review, and 200% zoom sign-off. |
| Specialist strategies remain commercially unavailable | Release gates and marketing/navigation guards | Do not count them in launch scope or pricing value. Use a new model-release review to reopen. |
| Deployed production behavior is not verified | The local production build, 21-test public suite, and visual capture are green | Run the same smoke checks after an owner-approved staging and production deployment. |
| Eleven lint warnings remain | Lint exits zero; warnings are known | Triage separately; never use lint status as a substitute for behavioral evidence. |
| Real customer proof is absent | Seeded proof and review implications removed | Gather consented evidence after real usage; do not delay honesty for conversion copy. |

## Source and artifact preservation record

- Original source checkout: `/Users/morganpage/Desktop/truecap` — preserved; no implementation edits were made there.
- Writable remediation clone: `/Users/morganpage/Documents/Codex/2026-08-27/files-pasted-by-the-user-you/work/truecap-remediation`.
- Source artifact bundle reference SHA-256 (previously recorded): `fee0f16a6f783704f17caf2ef541a18f508957f828c97aed678b5da133908cc4`.
- Baseline screenshot-set reference SHA-256 (previously recorded): `b03a5dd5ecb121274e7751f99a2391f00c58352ac02a897633f720820fd48fb4`.
- **These two prior digests could not be reproduced, because the record never stated how they were computed.** A set digest is sensitive to the working directory, the path prefix, the traversal order, and whether filenames are hashed alongside contents; four plausible reconstructions were tried and none matched. This is a defect in the earlier record, not evidence of drift — see the recomputation below, which uses a stated, repeatable method. Treat the two values above as historical only.
- Final spreadsheet SHA-256: `0ad72a80954fd5962b217cf6a985ddac4bd078173b483ec7adab313bab1fa1d2` — **reproduced exactly** (plain per-file `shasum -a 256`).
- Final market-intelligence PDF SHA-256: `4ed078a08c9a6592dc99774ed729fc0a0896aea6cfb74c77c961e67d9e9d6dd8` — **reproduced exactly**. The two copies under `public/downloads/` and `outputs/truecap-launch-evidence/` are byte-identical.
- Public binary assets are marked binary through `.gitattributes`.
- No deployment, push, production migration, live Stripe mutation, production data change, or privileged production account access occurred during this work.

### Reproducible set-digest method (use this from now on)

Run from the stated working directory; the relative path prefix is part of the hashed text:

```
find <relative-dir> -type f | LC_ALL=C sort | xargs shasum -a 256 | shasum -a 256
```

| Set | Working directory | Files | SHA-256 |
|---|---|---|---|
| `artifacts/` in the original checkout | `/Users/morganpage/Desktop/truecap` | 25 | `a839acc0955180782f2211731b5f9be1746154a365d0e60c6b6e6f51cd4d8089` |
| `truecap-launch-evidence/before` | `…/files-pasted-by-the-user-you/outputs` | 10 | `593f19c9c7bfa14218137dfd42ce4b7cf8865f70e8c73564cbcddf193337b631` |
| `truecap-launch-evidence/after` | `…/files-pasted-by-the-user-you/outputs` | 27 | `9c394286a03aefcc205592d12d13f155e419464e5543355200a19ef47f974a43` |
| `truecap-launch-evidence` (all) | `…/files-pasted-by-the-user-you/outputs` | 42 | `fd7c2670b9b92bc7dd9ed8f903e82f9775f70a7408be9c22cb04f095f7e853ed` |

Per-file digests for every one of these files are recorded in `outputs/truecap-launch-evidence/manifest.txt` and `outputs/source-artifact-integrity.txt`, so a future check does not depend on reproducing an aggregate at all.

### Source preservation — the stronger evidence

The original checkout is preserved, and the proof does not rest on a set digest:

```
$ git -C /Users/morganpage/Desktop/truecap status -sb
## main...origin/main [ahead 1, behind 8]
?? artifacts/
```

No tracked file is modified, staged, or deleted; `HEAD` is `9281379` (the commit merged into this branch's base `e706c7e`); the only untracked entry is `artifacts/`, which was never touched, staged, or committed. All 25 artifact files are present with per-file digests recorded.

Recompute and record these hashes at final handoff. Any unexplained change in the source references is a stop-ship condition. A changed final asset hash is acceptable only when the regenerated artifact, tests, and visual review are repeated and the new hash is documented.

## Final launch checklist

The paid-ad verdict may change from **NOT READY** only when every item below has an owner, timestamp, and retained evidence:

- [x] Final public production-build browser suite passes in full (21/21).
- [ ] Manual keyboard, focus, contrast, screen-reader spot check, responsive, and 200% zoom review passes.
- [ ] Isolated Supabase/Auth environment is configured.
- [ ] Four migrations are backed up, applied in order, and verified in staging.
- [ ] Multi-user RLS and authenticated lifecycle browser suites pass.
- [ ] Stripe test-mode lifecycle passes with exact $24/$240 and $49/$490 Prices.
- [ ] Deployed pricing, feature claims, pack state, methodology, proof, signup, and indexed/cached copy match the reviewed candidate.
- [ ] Agent Pro release remains false; Pack and all specialist products remain dark.
- [ ] `SHARE_LINK_SECRET` is at least 32 random bytes and proxy/rate-limit behavior is verified.
- [ ] PostHog allow-list, environment, dashboards, retention, and deletion settings are verified.
- [ ] Google/FRED/HUD/RentCast credentials, legal use, quota, provenance, and fallbacks are signed off—or the corresponding adapter remains disabled.
- [ ] Public asset hashes match the reviewed spreadsheet and PDF.
- [ ] Production backup, rollout, rollback, monitoring, support, and incident owners are named.
- [ ] Production smoke test and small controlled cohort complete without a stop condition.
- [ ] Any public review, case study, logo, counter, or result has real approved evidence.

**Current recommendation:** keep paid acquisition off. The public code candidate is green, but the authenticated/RLS, migration, Stripe, provider, secret, analytics, staging, and production lifecycle gates are still open. Close those external gates, then make a fresh go/no-go decision from retained evidence rather than from the code diff alone.

---

## Continuation log — 2026-08-28 (Claude)

Picked up the uncommitted remediation at integrated base `e706c7e` with roughly 460 files changed. Every existing edit was preserved; nothing was reset, stashed, or rewritten. All work below is additive to Codex's diff.

### Blocking TypeScript failure — fixed without weakening validation

`app/actions/saved-analyses.ts(3316)` could not read `.message` off `parsedContext.result` because `validateSavedDealHistoryContext` typed its failure arm as the whole `UpdateSavedDealLifecycleResult` union, which still admits `{ ok: true }`. Introduced the named `UpdateSavedDealLifecycleFailure` type and narrowed the validator's failure arm to it. This **tightens** typing — no validation, branch, or message was relaxed, and the other caller (`return parsedContext.result`) still type-checks because a failure remains assignable to the union.

### Release boundary — leaks found and closed

1. **Eight gated calculators still served a public OG card.** `/tools/<slug>/opengraph-image` is an independent route: the page's `notFound()` does not disable it, so each gated tool still had a crawlable, shareable, branded social image implying the tool exists. Removed all eight (git retains them for a future reviewed release). This is the only reason the build page count moved 483 → 475.
2. **Every market city page linked to four gated tools.** `app/markets/[city]/page.tsx` rendered a hardcoded `RELATED_TOOLS` list in which only `mortgage-payment-calculator` was released; the other four (cap-rate, cash-on-cash, DSCR, rental-property-tax) now fail closed. Replaced with released candidates filtered through `isCalculatorReleased`, and the section hides itself if the gate ever empties it.
3. **`lib/blog-topics.ts` routed readers to gated calculators** in all seven topics; two topics (`markets`, `deal-analysis`) referenced *only* gated slugs. Removed the gated slugs and substituted released equivalents so no topic is empty.
4. **The public catalog count was stale.** `PUBLIC_CATALOG_FACTS` derives correctly from the registry (10 calculators / 9 embeddable), but `seo-control-plane.test.ts` pinned the literal `18` / `17`. Rewrote the assertion to derive from `CALCULATOR_COUNT`/`EMBEDDABLE_COUNT` so gating a tool can never again leave a public "18 free calculators" claim standing.

Verified afterwards that no released `.ts`/`.tsx` surface outside `app/tools/` and the test suite references any gated slug, and that `app/sitemap.ts` derives tool URLs from the released-only `CALCULATOR_REGISTRY`.

Deliberate, correct treatments left as Codex built them: `rental-property-tax-calculator` `permanentRedirect`s to educational content and its OG card was rewritten to state that no property-level tax calculator is released; `rental-property-spreadsheet` is a genuine ungated public download with no registry entry.

### "Offer Ceiling" terminology collision — resolved

The heuristic `ARV × multiplier − repairs` was named "Offer Ceiling" across the ARV and 70%-rule pages, their OG cards, two blogs, and the registry descriptions — colliding with the canonical target-backed solver. Renamed the heuristic to **"70%-rule price screen"** on all six surfaces plus `lib/calculator-registry.ts`.

Two pieces of collateral damage from the bulk rename were found and repaired: four references reading "target-dependent Offer Ceiling" genuinely meant the **canonical** solver and were restored, and the one FAQ that deliberately *contrasted* the two concepts had become circular ("Is the 70% rule the same as an 70%-rule price screen?"). That FAQ is now an explicit contrast stating that this page does not compute an Offer Ceiling.

The heuristic → analyzer handoff was already neutralized by Codex (`buildAnalyzerHandoffUrl({}, …)` with "separately verified purchase price" copy); confirmed and pinned by test.

### Rehab-estimator overclaims — removed

Removed "contractor pricing surveys", the uncited "2024-25" market-pricing claim, and both "defensible budget" assertions from `app/tools/rehab-cost-estimator/page.tsx` and `components/investcalc/rehab-estimator-card.tsx`. The card also claimed its total "flows into the BRRRR & Fix-and-Flip cards below" — those models are dark, so the copy described a handoff that does not exist. Replaced with editable directional-planning language that names the limitation and directs the reader to local contractor bids. A stale code comment naming the BRRRR/Flip consumers was corrected.

### Methodology / source integrity — verified and finished

`app/actions/enrich-property.ts` no longer imports `lib/property-enrichment/state-property-tax.ts`; the only remaining consumer is the markets SEO page, where the figure is market context, not underwriting. Its file header still claimed the value came from "the same sources the analyzer uses" — corrected to state it is a statewide benchmark the released analyzer does not consume. A stale validation comment still naming a "state-tax lookup" was corrected. Confirmed `/methodology` states property tax is manual, that percentages are TrueCap planning defaults rather than government facts, and that the HUD/FRED/CFPB/IRS links are direct primary sources. Confirmed `brrrr_strategy_model` and `fix_flip_strategy_model` default to `false`.

### Database boundary review (reviewed, NOT applied)

`supabase/migrations/20260827230000_saved_deal_history.sql` reviewed line by line. Findings:

- `SECURITY DEFINER` functions correctly pin `set search_path = public, pg_temp`.
- The `guard_saved_deal_lifecycle_columns` trigger keys on `current_user in ('authenticated','anon')`. Inside a `SECURITY DEFINER` function `current_user` becomes the function owner, so the transition RPCs pass while direct authenticated writes are blocked — the intended design. **Verify at apply time that the functions are owned by the expected role**; ownership by `authenticated` would invert the guard.
- The INSERT branch rejects a non-null `pipeline_stage`/`is_completed`/`is_archived`. Confirmed the normal save payload in `app/actions/saved-analyses.ts` sets none of the three, so ordinary saving is unaffected.
- `bulk_archive_saved_deals_with_history` locks candidates with `FOR UPDATE` ordered by `deal.id` (deadlock-safe), re-checks terminal state under lock, performs exactly one history insert per affected row inside the same transaction, and returns affected/skipped counts without disclosing why a row was excluded. Reason is required and length-bounded; cardinality is bounded 1–100. Grants are `revoke … from public, anon` + `grant execute … to authenticated`.
- The entitlement check requires a live `active`/`trialing`/`past_due` subscription whose plan carries the `pipeline` feature. `pipeline` is a real feature key (`lib/entitlements-catalog.ts`, tiers pro + agent_pro). **Verify at apply time that seeded `plans.entitlements->'features'` actually contains `pipeline`** for the paid plans, or bulk archive will fail closed with `42501` for every user.

No migration was applied. Isolated migration/RLS verification remains an external launch gate.

### Final verification (2026-08-28)

| Gate | Result |
|---|---|
| `npx tsc --noEmit --incremental false` | **PASS** — 0 diagnostics |
| `npm run lint` | **PASS** — exit 0, 0 errors, 11 warnings (unchanged) |
| `npm test` | **PASS** — 324 files, 4,379 tests (was 4,368; +11 new guard assertions) |
| `npm run build` | **PASS** — 475/475 pages |
| `npm run pdf:check -- --branches` | **PASS** — all 7 shapes |
| Public download artifact tests | **PASS** — 3 files / 8 tests incl. artifact attestation |
| Golden parity | **PASS** — v1.3 golden corpus green inside the full suite |
| Public Playwright (production build) | **PASS** — 21/21 |
| Visual Playwright | **PASS** — 1/1; 13 public captures refreshed and inspected at 1280 and 390 |
| Authenticated Playwright | **SKIPPED — EXTERNAL** — 5 workflows discovered, 5 skipped; no isolated Supabase/Auth project or disposable users. **Not a pass.** |
| `git diff --check` | **PASS** |

Six suite failures surfaced on the first full rerun and were all resolved. Two were mine: the terminology rename pushed a blog SERP title to 51 characters (limit 50), failing `blog-title-length` and `seo-guards`; the title was shortened to 46. Four came from Codex's late-stage changes that had never been re-verified — `blog-topics` (gated slugs), `seo-control-plane` (stale 18/17 counts), `offer-copy-guards` and `assumption-chips` (both pinning copy that had legitimately been made *more* honest: "HUD rent and FRED rate benchmarks … property tax stays a manual, locally verified input", and the tax chip now reading "Taxes 1.1% preliminary fallback" with a "verify locally" badge). A seventh failure appeared in the public browser suite for the same chip-copy reason and was fixed in `e2e/public-product.spec.ts`. In every case the assertion was re-aimed at the contract rather than the fixed string, so the guard survives future wording changes.

### Notes and residual risks from this continuation

- The public Playwright suite cannot run through `next dev` in this clone: `node_modules` is a symlink to the original checkout, and Turbopack refuses a symlink pointing outside the filesystem root. Use `PLAYWRIGHT_USE_PRODUCTION_SERVER=true` (and `PLAYWRIGHT_CAPTURE_VISUALS=true` for the visual project). This is an environment property, not a product defect.
- Removing the eight gated OG routes is reversible via git when a calculator is released through canonical adapters and exact parity tests.
- The verdict is unchanged: **NOT READY for paid ads**. Every external gate in this document — authenticated/RLS verification, the four migrations, Stripe prices, provider credentials and licensing, secrets, analytics, staging, and production lifecycle — remains open. A green local candidate is not production proof.

---

## Final state of this remediation (2026-08-28)

### Where the work lives

| | |
|---|---|
| Branch | `codex/launch-readiness-integrated` |
| Commit | the single commit on this branch — `feat: harden TrueCap launch readiness`. Its id is recorded in `outputs/source-artifact-integrity.txt`, which is written after the commit; quoting it here would go stale the moment this document is included in that same commit. Read it with `git log -1 --format=%H`. |
| Base | `e706c7e` (merge of `9281379` from the original checkout) |
| Diff | 526 files changed, 24,077 insertions, 9,466 deletions |
| Working tree | clean (`artifacts/` is gitignored and was never staged) |
| Pushed? | **No.** The branch exists only in this local clone and in `outputs/truecap-launch-readiness.bundle`. |
| Deployed? | **No.** No deploy, no migration apply, no production data change, no live Stripe mutation, no privileged production account access. |

### Final verification counts

`tsc --noEmit --incremental false` 0 diagnostics · `lint` exit 0 with 0 errors and **11 warnings** · `vitest` **324 files / 4,379 tests** passed · `next build` **475/475 pages** · `pdf:check --branches` all **7** deal shapes · public download artifact tests **3 files / 8 tests** · Playwright public **21/21** · Playwright visual **1/1** (13 captures at 1280 and 390, plus the 8-page PDF and 4 workbook renders) · Playwright authenticated **5 discovered, 5 skipped**.

The 11 lint warnings are pre-existing and unchanged by this round; they are not a gate and were not used as one.

### Skips, and what they mean

**Authenticated end-to-end coverage is the one gate that did not run.** Five workflows are written and discovered by Playwright, and all five skipped for want of an isolated Supabase/Auth project with disposable users. They are recorded as **external**, not as passes. Running them against production was available and was not done — that is the instruction and it is also the right call, since these workflows create, mutate, and archive deals.

Everything auth-adjacent therefore rests on server-side fail-closed gates and source-pinned contract tests, which is weaker evidence than a browser session. Do not read the green suite as "auth is verified."

### Features deliberately dark

Off by default in `lib/feature-flags.ts`: `what_needs_to_be_true_v2`, `financing_profiles`, `deal_decision_pack`, `three_deal_guarantee`, `saved_deal_watch`, `batch_underwriting`, `agent_client_matching`, `brrrr_strategy_model`, `fix_flip_strategy_model`, `owned_portfolio_actuals`, `advocacy_decision_contract`. On by default: `input_confidence`, `offer_ready_status`, `new_homepage_positioning`, `decision_first_results`, `focused_dashboard` — the last two are shipped behavior with a kill switch, not new dark behavior.

New Decision Pack checkout stays shut off at both gates; the historical claim path is retained solely so an existing paid claim can still be recovered. Eight gated calculators now fail closed on the page, the OG card, the sitemap, the markets pages, and the blog topic lists.

### Migrations — written, reviewed, NOT applied

Four additive migrations ship on this branch and must be applied in filename order, after a backup, in a staged environment first:

1. `20260827090000_no_card_product_evaluations.sql`
2. `20260827100000_launch_plan_catalog_metadata.sql`
3. `20260827230000_saved_deal_history.sql`
4. `20260827233000_buy_box_irr_cash_targets.sql`

Two apply-time checks are load-bearing for #3 and are easy to miss:

- **Function ownership.** The lifecycle guard trigger keys on `current_user in ('authenticated','anon')`. Inside a `SECURITY DEFINER` function `current_user` is the *owner*, which is what lets the transition RPCs through while blocking direct writes. If the functions end up owned by `authenticated`, the guard inverts and blocks the RPCs instead. Verify ownership after apply.
- **Seeded entitlements.** Bulk archive requires `plans.entitlements->'features'` to contain `pipeline` for the paid plans. If the seeded catalog lacks it, every bulk archive fails closed with `42501`.

### What only the owner can close

Nothing below is a code problem, and none of it can be solved by more local work:

1. Isolated Supabase/Auth environment, then the five authenticated workflows and RLS verification.
2. Backup, staged apply, and production review of the four migrations.
3. Stripe test and live Price configuration and a full subscription-lifecycle verification; Agent and Pack stay dark.
4. Provider licensing, credentials, quota, freshness, and failure behavior — per provider.
5. Secrets provisioning (`SHARE_LINK_SECRET` and the rest of `.env.example`).
6. Analytics verification in production, where the conversion code is gated.
7. Manual accessibility sign-off: keyboard, focus order, screen reader, contrast, 200% zoom.
8. Staging deploy, production deploy, and a post-deploy smoke pass repeating the 21-test public suite against the deployed origin.
9. Reconciling the live catalog drift the read-only comparison captured.

### Verdict

**NOT READY for paid ads.**

The local candidate is green across every gate that can be run without touching production, and the release boundary, methodology honesty, and public-claim defects found this round are fixed. That is a necessary condition, not a sufficient one. Until the authenticated workflows run somewhere isolated, the migrations are applied and verified, Stripe is configured and exercised, and the deployed site is smoke-tested, sending paid traffic would be buying clicks against unverified auth, unapplied schema, and unconfigured billing.
