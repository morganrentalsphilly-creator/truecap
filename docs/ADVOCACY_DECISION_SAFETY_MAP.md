# Advocacy decision-safety implementation map

Status: verified from the repository on 2026-08-25. This document describes
code behavior, not production-state proof. Live Stripe, Supabase, provider,
Vercel, email, DNS, and analytics configuration were not mutated or assumed.

## Safety boundary for this slice

- `calculateAnalysis()` remains the financial source of truth.
- Current first-year underwriting is Methodology `1.1`; recorded `1.0`
  snapshots remain immutable. The Screening Index submodel is `1.2`, the
  InvestCalc schema is `10`, and the ten-year projection snapshot is `6`.
  Each result-producing correction has a named release note and regression
  corpus; prices, trials, grandfathered Stripe Prices, and entitlements remain
  unchanged.
- The focused advocacy contract is a presentation adapter behind two gates:
  `NEXT_PUBLIC_TRUECAP_ADVOCACY_DECISION_CONTRACT` and the private server-side
  `TRUECAP_ADVOCACY_INTERNAL_EMAILS` allowlist. Both must pass. Anonymous
  traffic is explicitly ineligible.
- Separately, the Phase 5.9 verdict and next-action safety-copy cleanup applies
  globally. It removes prescriptive offer/buy language but changes no formula,
  threshold, entitlement, price, or stored enum. The advocacy flag does not
  roll back those shared presentation labels.
- Existing save/share/report fields and legacy vocabulary remain compatible at
  storage and API boundaries. Recorded saved results and long-term projections
  are evidence, not caches: current code never fills them with newer math.
- Database changes described in migrations or runbooks are expand-only and
  must not be applied until their named production gates are reviewed.

## Route and surface map

| Workflow                  | Primary route or component                                                                 | Authority / notes                                                                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Anonymous analyzer        | `app/page.tsx` → `components/investcalc/investcalc-page.tsx`                               | Browser form; server boundaries enforce exact Offer Ceiling and paid exports. Advocacy cohort is forced off.                                                              |
| Authenticated analyzer    | `app/home-authed/page.tsx`, `app/dashboard/new/page.tsx`                                   | Server resolves user, plan capabilities, defaults, and private advocacy eligibility.                                                                                      |
| Focused decision          | `components/investcalc/analysis-dashboard.tsx` → `focused-decision-summary.tsx`            | Reads one calculation result plus the exact active target. Flagged view adapts this to rule fit, target context, evidence readiness, user decision, and safe next action. |
| Saved deal list/workspace | `app/dashboard/saved-analyses/page.tsx`, `app/dashboard/saved-analyses/[id]/page.tsx`      | Owner-filtered reads. Versioned rows use their recorded result; explicitly legacy rows alone use labeled compatibility recomputation. Full underwriting and notes use independent revision tokens. |
| Dashboard / comparison    | `app/dashboard/page.tsx`, `app/dashboard/compare/page.tsx`                                 | Server-authenticated saved-deal projections and comparison adapters.                                                                                                      |
| Public sample             | `app/sample-decision-memo/page.tsx`, `lib/sample-deal.ts`, `lib/sample-deal-analysis.ts`   | One shared synthetic fixture and target contract drive the homepage, opened calculator, result, report, copy, and deterministic cross-surface tests.                       |
| PDF generation            | `app/actions/generate-report-pdf.ts`, `lib/report-data-builder.ts`, `lib/pdf-generator.ts` | Server rebuilds financial outputs from validated inputs; browser receives base64 for unsaved/Pack export. Saved-deal PDFs use private storage and signed URLs.            |
| Opaque share              | `app/actions/public-shares.ts`, `app/s/[token]/page.tsx`, `lib/public-share.ts`            | 256-bit token, SHA-256 at rest, optional expiry, owner revocation for owned shares, private/no-store and no-referrer response policy.                                     |
| Legacy share              | `app/d/[encoded]/page.tsx`, `lib/share-link.ts`                                            | Frozen v1 decoder; payload is in URL, has no expiry/revocation, and recomputes using current compatible code. Header policy now adds noindex and private/no-store.        |
| Portal / embed            | `app/portal/[token]/d/[dealId]/page.tsx`, `app/embed/brand/[token]/page.tsx`               | Stateless HMAC scopes with no per-link revocation. Professional surfaces remain dark and are not part of this release.                                                    |
| Pricing / billing         | `app/pricing/page.tsx`, `app/actions/billing.ts`, `app/api/stripe/webhooks/route.ts`       | Stripe server state and `lib/stripe/plan-prices.ts` mappings are authoritative. No live Price or Product mutation is authorized.                                          |
| Settings                  | `app/settings/page.tsx`, `app/settings/branding/page.tsx`                                  | Owner-authenticated preferences and branding; future notifications must be labeled as preview/waitlist rather than current fulfillment.                                   |
| Legal / methodology       | `app/terms/page.tsx`, `app/privacy/page.tsx`, `app/methodology/page.tsx`                   | Current policies and v1 explanations. Policy transitions require owner-supplied effective dates.                                                                          |

## Calculation and serialization path

### Authoritative calculations

- `lib/calc-analysis.ts` owns mortgage payment, gross income, operating
  expenses, NOI, monthly cash flow, cash-on-cash return, cap rate, DSCR, and
  derived acquisition values.
- `lib/max-allowable-offer.ts` owns the internal Max Allowable Offer solver.
  The customer-facing adapter calls its output **Offer Ceiling**. The solver
  searches `$10,000` through `$100,000,000`, then floors to a `$500`
  increment. The display must not treat the upper supported boundary as a
  finite economic ceiling unless the user explicitly selected that cap.
- `lib/mao-target-evaluation.ts` / `lib/mao-targets.ts` evaluate the selected
  rule conjunction. Cash acquisitions correctly omit DSCR from target
  evaluation.
- `lib/deal-score.ts` owns the secondary Deal Score implementation. In the
  advocacy presentation it is called **Screening Index** and is not allowed to
  drive an action. Current v1 gives cash acquisitions synthetic DSCR points;
  that behavior is characterized, not changed, pending a model-version
  decision.
- `lib/ten-year-projections.ts`, `lib/tax-strategy.ts`, and
  `lib/exit-scenarios.ts` own their respective advanced analyses. AI summaries
  are not calculation authorities.

### Versions

| Contract                              | Current code version                |
| ------------------------------------- | ----------------------------------- |
| First-year underwriting methodology   | `1.1` (`1.0` recorded legacy)       |
| Screening Index methodology           | `1.2`                               |
| InvestCalc form schema                | `10`                                |
| Input Confidence compatibility method | `1.0`                               |
| Ten-year projections snapshot         | `6`                                 |
| Tax strategy snapshot                 | `4`                                 |
| Exit scenarios snapshot               | `3`                                 |
| PDF snapshot                          | `9` plus encoded cache dependencies |
| Advocacy presentation contract        | `advocacy-p0-v1`                    |

### Save, restore, and historical behavior

- `app/actions/saved-analyses.ts` validates inputs, calculates on the server,
  and stores the exact form/result/methodology/target snapshots. Every new save
  records its independent Screening Index and projection method versions.
- `lib/saved-analysis-methodology.ts` returns a complete recorded result for
  every versioned save, including the current version. It never mixes missing
  historical fields with current calculations. Only explicitly
  `legacy-unversioned` rows use labeled compatibility recomputation.
- `lib/compare-result-snapshot.ts` v3 persists canonical comparison metrics;
  older snapshots remain compatible without reconstructing absent returns or
  inventing a winner.
- New v1 analyses persist an explicit UTC analysis date. Direct/legacy payloads
  without one use the fixed `2026-08-25` compatibility anchor, so identical
  serialized inputs cannot change score on January 1. An explicit re-underwrite
  records its new date.
- `underwriting_revision` and `notes_revision` are independent database-owned
  optimistic-concurrency tokens. Stale tabs preserve local work and require a
  reload or an explicit save-as-scenario/save-my-version choice.
- Rounded display values must remain presentation-only; tests compare canonical
  raw values and documented surface rounding separately.

## Decision contract and targets

### Separate authorities

1. **Rule fit** is calculated: `meets_selected_rules`,
   `does_not_meet_selected_rules`, or `cannot_determine`.
2. **Evidence readiness** is policy-derived: `screening`, `verify`, or
   `evidence-complete`.
3. **User decision** is recorded by the user: `pursue`, `negotiate`, `pass`, or
   `undecided`. Metrics never infer or write this field.

### Target resolution

The analyzer resolves target rules in this order:

1. the user-tuned target for the current result;
2. the deciding active Buy Box when available;
3. TrueCap screening defaults (`$0` minimum monthly cash flow and `1.25`
   minimum DSCR where DSCR applies).

The advocacy adapter records the exact numeric rules, source, origin, profile
identity when available, and a content-addressed rule-snapshot version. Current
Buy Boxes have an ID and name but no persisted revision. Saved/share/report
contracts historically store numeric targets plus a generic source, not a
durable Buy Box ID/name/revision. The UI therefore says “profile version
unavailable” rather than inventing a revision or relabeling an old snapshot
with a current Buy Box.

Unknown or unevaluable selected Buy Box checks return `cannot_determine`.
Skipped/no-profile results are labeled **TrueCap screening defaults**, never
“your Buy Box.”

## Evidence/readiness compatibility map

- `lib/input-confidence.ts` retains the historical 14/15-field numerical
  Input Confidence calculation, static weights/source multipliers,
  fingerprints, and `screened` / `verified` / `offer-ready` values for
  compatibility.
- A browser confirmation stores a client-computable value fingerprint and an
  `evidenceType` label. The fingerprint detects later value changes; it does
  not prove documentary provenance.
- `lib/decision-contract.ts` maps all legacy browser verification payloads,
  including impressive labels such as `third-party-verified`, to **user
  confirmed** at most.
- Only an owner-scoped server evidence resolution carrying the explicit
  authority marker can earn evidence-attached/cited or third-party-verified
  status. No current analyzer caller supplies that authority, so “Evidence
  complete” is intentionally unreachable in the cohort today.
- Missing/default provenance, stale data, geography mismatch, unit/property
  mismatch, conflicts, redistribution restrictions, and provider failure block
  evidence verification.
- Where modeled sensitivity is available, the decision card ranks unresolved
  material inputs by the actual cash-flow/DSCR scenario swing. Static legacy
  weights remain only as a fallback compatibility order and are not labeled a
  calibrated probability or confidence interval.
- Changing an input invalidates its confirmation through the existing
  fingerprint behavior.

## Next-action generation

- `lib/next-action.ts` is the shared global presentation helper. Phase 5.9
  replaces offer directives with review/verification wording for every cohort;
  this copy cleanup is intentionally outside the advocacy rollout flag.
- The flagged surface uses `buildSafeNextAction()` instead. Before evidence
  completion it can resolve target context or verify a material input. After
  evidence completion it can record the user decision or share for review.
- It never instructs the user to make/submit an offer, calls the property a
  good investment, or states a safely payable price.

## Authentication, authorization, flags, and storage

- Supabase server clients plus route/action ownership filters enforce user
  access. Client-supplied IDs are not treated as authorization.
- `saved_analyses`, subscriptions, Buy Boxes, shares, one-time claims, PDF
  metadata, and deal comps are managed by migrations under
  `supabase/migrations/`.
- Saved-analysis PDF objects use the private `analysis-pdfs` storage bucket and
  short-lived owner-scoped signed URLs.
- `public_shares` supports owner policies and service-side token resolution.
  New share creation requires authentication before the service-role write and
  attaches the row to that owner. Historical shares with `owner_id = null`
  remain publicly readable by capability token until expiry but cannot be
  listed or revoked; only new owned shares are described as revocable.
- The original `deal_comps` migration grants authenticated owners direct write
  policies despite a service-only provenance comment. Until a reviewed
  hardening migration is applied, authenticated users may be able to forge JSON
  later labeled as RentCast. This affects evidence provenance, not calculation
  math.

## Share lifecycle and privacy

| Share        | Token/storage                                                            | Expiry/revoke                                                      | Known limitations                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/s` opaque  | Random capability; hash at rest; immutable input/target/version metadata | Default expiry; new links require a signed-in owner who can revoke | Historical ownerless shares remain viewable until expiry but cannot be managed; audience is metadata, not authorization; derived values recompute. The viewer now has a best-effort per-process read brake; distributed enforcement still requires an approved shared rate-limit service. An unapplied service-role-only migration provides bounded purging of already expired/revoked rows, but no retention duration or scheduler has been approved. |
| `/d` legacy  | Full v1 payload base64url-encoded in URL; optional attribution HMAC      | None                                                               | Irrevocable; methodology/target snapshot absent; must retain byte-compatible decoder. Headers now prevent referrer propagation, indexing, and storage by compliant clients.                                                                                                                                                                                                                                                                            |
| Portal/embed | Deterministic stateless HMAC                                             | Global-secret or owning-record state only                          | No per-link lifecycle; professional surfaces remain dark.                                                                                                                                                                                                                                                                                                                                                                                              |

Tokens, claim secrets, addresses, prices, rents, report contents, notes,
documents, and customer identifiers are blocked from product analytics. Raw
hosting/access-log configuration is outside this repository and remains a
production privacy check.

## Billing, entitlements, and the $5 Decision Pack

### Recurring subscriptions

- `lib/stripe/plan-prices.ts` maps Pro and Agent Pro monthly/annual environment
  slots. Comma-separated Price IDs preserve recognition of grandfathered IDs;
  the first configured ID is the sale candidate.
- `app/actions/billing.ts` owns Checkout creation, local and Stripe duplicate
  subscription checks, trial guards, checkout intents, return verification,
  and idempotency keys.
- `app/api/stripe/webhooks/route.ts` verifies signatures and uses a unique event
  ledger with a claim lease. Subscription sync re-fetches current Stripe state
  to tolerate reordering. `app/api/cron/reconcile-stripe/route.ts` is the
  recurring reconciliation path when enabled.
- Actual production Price ordering, DB plan metadata, webhook subscriptions,
  migration state, reconcile mode, grandfathered subscriber state, and refund
  state cannot be proven from source. A missing current-Price environment slot
  may fall back to legacy DB metadata; production must verify this before any
  billing release.

### One-time $5 purchase

- New checkout is disabled behind independent public and server-only gates.
  `app/actions/one-time-pdf.ts` retains the payment-mode Checkout construction
  only for a separately reviewed future activation; existing paid claims bind
  secret/input/target fingerprints but not a durable purchased artifact.
- Pack completion still is not durable webhook fulfillment. Browser return must
  possess the claim secret and exact draft; the generated PDF is returned as
  base64 and not stored.
- Historical verification and export re-read the current Stripe Session,
  Charges, and Disputes. Partial or full refunds and lost disputes revoke future
  server-controlled report access; open disputes suspend it; a won dispute is
  accepted only after a fresh paid/no-refund check.
- Signed refund/dispute webhooks are wake-up signals for a fresh Stripe read and
  durably mark an eligible credit denied or an applied credit reversed. An
  applied reversal also creates one server-only pending adjustment obligation,
  which requires a documented completed action or explicit waiver. They do not
  recall a downloaded PDF, automatically charge a customer, remove an
  already-applied coupon, reprice a subscription, or mutate a Stripe Price.
- Tab/session loss can therefore leave a paid buyer without retrieval. There is
  no complete Pack webhook fulfillment, private artifact, email recovery,
  account claim, delivery retry, or Pack reconciliation loop. The narrow
  historical refund/dispute access and credit controls do not make fulfillment
  durable or cross-device.
- Production activation is blocked until the reviewed expand-only fulfillment
  schema, private storage, webhook/reconciliation implementation, delivery
  owner, and rollback runbook are complete and applied. The current price and
  existing claims must remain unchanged.

## Provider map

| Provider/source        | Used for                                    | Current fallback / risk                                                                                                                        |
| ---------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Google Places          | Typed address and selected place components | Plain-input fallback. No address may enter analytics or provider error logs.                                                                   |
| Static state tax table | Screening property-tax benchmark            | Source year/URL are not carried through every returned value.                                                                                  |
| FRED `MORTGAGE30US`    | Screening mortgage-rate observation         | 24-hour process cache; failures omit the value. API-key URL logging has been removed.                                                          |
| HUD FMR/SAFMR          | Rent benchmark                              | 30-minute process cache; 5+ bedrooms clamp to 4BR and local lookup can fall to state average without a complete structured mismatch contract.  |
| RentCast               | Facts, AVMs, comps, optional active listing | Timeout, HTTP error, malformed response, no-data, and stale fallback are not yet fully discriminated; stale maximum age is not policy-defined. |

No provider result may upgrade evidence readiness merely because it exists.
RentCast caching, retention, share/PDF redisplay, active-listing display, and
derived-use rights require an owner-verified provider contract register.

## Representative state traces

- **Anonymous analysis:** local/browser form → server exact-ceiling boundary
  where entitled → no save until authentication. Advocacy contract is off.
- **Free account:** server capabilities and database entitlements control save,
  comparison, solver, report, and strategy access. Query failure falls back
  conservatively; exact legacy Free/new Free behavior needs production data
  confirmation.
- **$5 guest/account buyer:** Checkout claim → Stripe return → exact draft and
  claim verification → browser PDF. Same-tab can work; lost-tab/delayed recovery
  is not durable and blocks activation.
- **Pro trial/paid/canceled/past-due:** Stripe webhook/current-state sync →
  `subscriptions` → `hasPlanFeature` capability checks. Production fixtures
  must confirm every state and grandfathered amount.
- **Agent Pro:** same subscription authority plus professional entitlements;
  recipient approvals/team roles remain outside this slice.
- **Cash acquisition:** monthly payment is zero and DSCR displays N/A; DSCR is
  ignored by target evaluation. Historical Screening Index synthetic DSCR
  credit is unchanged and explicitly secondary.
- **Financed acquisition:** DSCR and debt service use `calculateAnalysis()`;
  Offer Ceiling tests must cross the permitted price grid independently.
- **One- and multi-unit:** same canonical engine with unit-specific input
  assumptions. HUD whole-property/unit mismatches must not count as evidence.
- **Shared recipient:** `/s` resolves the token server-side and renders a
  no-login view; no secure challenge/request/fork workflow ships in P0.
- **Legacy snapshot/share:** versioned saved rows use their recorded results;
  explicitly unversioned saved rows and the frozen `/d` legacy share decoder
  retain labeled compatibility recomputation. No current-version result is
  presented as the historical output of an unversioned payload.

## Environment and deployment topology

Verified from code:

- Next.js App Router application with server actions/routes and Vercel-oriented
  headers/build behavior.
- Supabase Auth/Postgres/Storage clients for identity, persistence, RLS, and
  private artifacts.
- Stripe Checkout, webhooks, and customer state for billing.
- PostHog/Vercel/Google telemetry integrations with code-level sanitizers and
  sensitive-route controls.
- Provider credentials are server-only except explicitly public browser keys.

Not provable from the repository and required before limited external rollout:

- deployed commit/build and feature-flag values;
- private cohort membership;
- applied migration ledger and effective RLS grants;
- Stripe Price order, webhook event list, customer state, and reconcile mode;
- Supabase bucket policies and retention jobs as deployed;
- provider contract/redistribution rights and quota limits;
- email sender/templates and durable Pack delivery path;
- host/CDN/access-log redaction and retention;
- analytics dashboards, alert paging, and data retention;
- rollback owner availability and tested prior deployment artifact.

## Resolved code risks and remaining production gates

The following audit blockers are resolved in the current code and regression
suite: same-version saved-result drift, projection drift, wall-clock Property
Age, PDF insurance mismatch, investor-PMI defaults, fabricated comparison
winners, stale underwriting overwrites, stale note overwrites, hidden active
strategy, and non-durable saved-deal reopen. They are not called “live” until
the migration/deployment checks below pass.

| Open gate / decision                                                                                 | Required owner              | Gate                                                                                                                                                                                                                                                               |
| ---------------------------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Four forward-only migrations are not yet proven live                                                | Release + Data              | The exact batch has replayed twice on PostgreSQL 17. Apply and verify Decision Pack credit adjustments, saved-analysis concurrency, service-only public-share creation, and the `deal_comps` owner binding **before** application deployment. The earlier `20260824121000` permission repair is already recorded in production and must not be edited or replayed. |
| Authenticated browser proof has not yet run on the disposable CI stack                              | Release                     | The local Supabase job must pass guest→auth auto-save, share continuity, shortlist, dashboard, workspace, scenarios, notes, comparison, document validation, and PDF export without production writes.                                                               |
| Buy Boxes lack durable revisions                                                                     | Product + Data              | Do not claim historical profile-version identity until an expand-only Buy Box revision contract ships. Exact recorded numeric criteria remain authoritative.                                                                                                       |
| $5 artifact is not durably retrievable                                                               | Billing + Data + Operations | Keep new Decision Pack sales disabled. Historical paid access follows the approved revoke-on-refund/lost-dispute policy; reactivation still requires immutable storage, webhook fulfillment, reconciliation, and recovery proof.                                      |
| Historical ownerless share revocation and distributed share lifecycle enforcement remain incomplete | Security + Privacy          | Treat historical ownerless links as non-revocable until expiry; approve retention/scheduler and shared rate limiting before claiming distributed enforcement. New share creation already requires sign-in and owner binding.                                         |
| Provider redisplay/retention rights and production stale-age policy                                  | Legal + Data Partnerships   | Keep provider values labeled as editable screening evidence; complete the contract register before expanding provider retention/redisplay claims.                                                                                                                  |
| Production configuration and rollback proof                                                          | Release                     | Verify deployed commit, feature flags, cohort allowlist, Price mappings, webhook events, buckets/RLS, telemetry, DNS, and the prior known-good rollback artifact. No real payment is required or permitted for the smoke test.                                          |

Pricing urgency and the public refund guarantee are disabled in code. The
Decision Pack is disabled, and the approved Terms record the current one-time
purchase/refund treatment; no unapproved promise is shown as an active offer.

This map must be updated when a gate is actually proven. A feature flag does
not make DDL, billing mutations, sent messages, or historical rewrites
reversible.
