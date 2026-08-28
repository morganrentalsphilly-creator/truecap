# Property data integration and input-completeness checklist

Audit date: 2026-08-27

This is the launch-truth checklist for listing ingestion and property-data
enrichment. It records what the repository can do today, what is intentionally
gated, and what still requires an external provider or product decision. It is
not evidence that any credential, database migration, provider agreement,
worker, or production flag is configured.

## Status vocabulary

- **Implemented** — released code has an exercised path and an honest fallback.
- **Gated** — code exists, but authentication, plan access, a release boundary,
  a feature flag, deployment configuration, or quota can prevent use.
- **External** — launch depends on a vendor, credential, legal approval,
  deployment state, or scheduled infrastructure that cannot be proven by the
  repository.
- **Missing** — the current product does not capture or use the field.

## Launch-blocker decision

**P0 production-quality input completeness is implemented for the released v1
buy-and-hold path, with two deliberate fail-closed boundaries.** The canonical
engine now models recurring other income, current/stabilized rent rolls and
values, fixed and categorized recurring costs, turnover/leasing reserves, loan
points/origination, interest-only periods, separate amortization and maturity,
balloons, lender escrows/reserves, acquisition credits, fixed/percentage
closing costs, selling-cost percentage, and simplified renovation rent
downtime. These inputs use progressive disclosure and persist through
save/reopen/share/report/PDF surfaces. Generic refinance assumptions remain
unreleased and any nonempty set is rejected: trustworthy support still needs a
second loan schedule, original-loan payoff, refinance costs/proceeds and
distribution treatment, plus post-refinance cash-flow/return reconciliation.
Renovation timing is intentionally limited to start month, duration, and rent
reduction; draw/funding timing, placed-in-service and lease-up, repair-versus-
capital classification, basis/tax treatment, and financed improvements remain
excluded and are disclosed as such.

The narrow property-ingestion claim that is supportable today is: a listing
URL can fill an address, and a configured/authenticated provider lookup may
add selected facts, an explicitly active asking price, and labeled estimates.
It is not a complete listing import, parcel-record verification, rent-roll
import, or live price/status monitoring product.

## Data-truth contract

These words must remain distinct in UI, persisted evidence, tests, and support
copy:

| State | Meaning | Current handling |
| --- | --- | --- |
| User-entered | The user typed or selected the value. It is authoritative for the calculation but is not evidence by itself. | Most assumptions are labeled entered/user estimates. A non-estimated purchase price is currently property-specific/unverified and still requires asking/contract confirmation. |
| Imported | A configured provider reported a property fact or active-listing value. It is property-specific, but still not user-verified. | The active asking price is eligible only when provider status is explicitly `Active`; its value-bound Input Confidence source records `kind`, `provider`, and `fetchedAt`, and the input shows that provider/date after save/reopen. |
| Estimated / benchmark | An AVM, rent model, state rate, HUD FMR/SAFMR, FRED series, or derived screening estimate. | Labels use “estimate,” “benchmark,” or “current avg.” An AVM is never silently promoted to an asking price. |
| Verified | The user explicitly confirms value-bound evidence for the current underwrite. | Input Confidence accepts persisted verification only when its fingerprint still matches the exact current value; edits fail closed. |
| Unavailable | The provider, key, location, field, or usable response is absent. | Represented as `null`/omitted or an explicit unavailable result, never invented as zero. |
| Stale | Cached or saved data is older than the stage-aware freshness window. | The comps card uses `fetchedAt`, shows a stale warning, and provides a manual refresh action. An adopted asking price or AVM now keeps and displays its original source date; that disclosure does not make a 30-day cached listing current. |

Provider data must never become “verified” merely because it was imported.
Conversely, a user edit must never retain a provider label unless the stored
value fingerprint still matches.

## P1 property-ingestion matrix

| Requested capability | Repository evidence | Status | Launch truth / fallback |
| --- | --- | --- | --- |
| Paste listing URL | `lib/listing-url.ts` parses URL slugs for Zillow, Trulia, Redfin, Realtor.com, and Homes.com without fetching portal pages. `components/investcalc/listing-link-input.tsx` says the address was extracted and must be reviewed. | Implemented | This is address extraction, not listing-page scraping or verification. An unreadable link falls back to manual address entry. |
| Address and structured location | Google Places selection/typed-address recovery supplies address, state, county, and ZIP when available. | Gated + external | `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` and an enabled Google project are external. Typed input can continue without it; enrichment fields may remain unavailable. |
| Asking price | A Pro, signed-in listing handoff requests RentCast `/listings/sale`; only a positive price with explicit active status can enter the purchase-price field. | Gated + external | Requires `RENTCAST_API_KEY`, entitlement, quota, provider coverage, and an active record. The adopted price is property-specific/unverified and shows RentCast plus its original source date after save/reopen. The shared enrichment cache can still retain a listing check for up to 30 days, so do not promise a “current” asking price without a listing-specific freshness policy. Otherwise the user enters the asking price or may use a clearly labeled AVM/screening estimate. |
| AVM / value range | RentCast value AVM, range, and sale comparables are parsed and displayed. | Gated + external | Always an estimate/reference. It is not an asking, contract, appraised, or verified value. |
| Beds, baths, square feet | RentCast subject/listing facts may fill empty fields; conflicting populated fields require explicit overwrite approval. | Gated + external | Provider facts remain editable and unverified. Missing values stay missing. |
| Property type | RentCast property type is parsed and has a mapping helper. | Partial / gated | The current adoption path does not change the analyzer property type. The user-selected type remains authoritative. |
| Unit count / unit mix | The analyzer supports a user-entered small-multifamily rent roll. | Missing from ingestion | No provider response is mapped into unit count or unit rows. |
| Year built / lot size / last sale | RentCast parsing supports these fields in `PropertyFacts`. | Partial / gated | The current analyzer adoption path does not fill them. They must not be claimed as imported in the released UI. |
| Listing tax amount | Manual annual property-tax entry is supported. | Missing from ingestion | Listing paste explicitly says it does not import the actual tax bill. |
| Assessed / parcel tax | A static state effective-rate dataset can supply a planning benchmark. | Implemented estimate; parcel data missing | It is labeled a state benchmark and must not be called parcel-specific. Offer-ready review asks for the parcel bill. |
| Rent evidence | HUD FMR/SAFMR and RentCast rent AVM/comparables are available. | Gated + external | HUD is an area benchmark; RentCast is a market estimate/comp set. Neither is an in-place lease, rent roll, or verified market-rent opinion. |
| Listing status | Active status is used only as a guard for asking-price adoption. | Partial / gated | There is no durable user-facing status-history feed. Pending/sold/off-market records must not supply an asking price. |
| Price-change history | Provider-neutral contracts exist in `lib/listing-update-provider.ts`; the saved-watch migration reserves checkpoint cursor/watermark and event/outbox storage. | External / not operational | Storage shape is not an operational feed. No authorized provider adapter, credential, running poller, retry/delivery worker, or consented notification path exists. Saved Deal Watch must remain dark until those pieces are live and verified. |
| Investor financing scenarios | Manual loan assumptions and optional financing profiles exist; FRED can supply the national owner-occupied 30-year series. | Partial / gated | FRED is a planning benchmark, not an investor-property quote or rate lock. Provider ingestion does not supply lender scenarios. |
| Photos and seller claims | Explicitly excluded. | Intentionally unsupported | Do not imply they are imported. |

### Current provider boundaries

| Boundary | Configuration | Failure behavior | Data class |
| --- | --- | --- | --- |
| Google Places | `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` | Manual typed address remains available. | Address selection, not verification. |
| State property-tax table | Repository data | Omit when state is unknown/unsupported. | State benchmark. |
| FRED `MORTGAGE30US` | `FRED_API_KEY`; 24-hour process cache | Omit the refreshed rate and preserve user-owned values. | National owner-occupied mortgage benchmark. |
| HUD FMR/SAFMR | `HUD_API_KEY`; 30-minute process caches | Omit the value; local miss may use an explicitly identified statewide average. | Area/state rent benchmark. |
| RentCast enrichment | `RENTCAST_API_KEY` plus entitlement, monthly quotas, cache/counter persistence | Use a dated cache when allowed, return an explicit unavailable/cap result, or preserve manual inputs. | Property facts plus AVM/rent estimates/comps; active listing asking price when separately requested. |
| Listing-update provider | No implementation; contract only | No polling and no notification claim. | External future observation stream. |

## P0 input-completeness matrix

The released analyzer accepts missing or explicit underwriting model `1.0`.
Model `2.0` remains an internal calculation/schema contract and is rejected at
external save/share/report/analyzer boundaries by
`lib/underwriting-model-release.ts`. The input-completeness fields below are
implemented directly in the released v1 contract; they do not depend on v2.

| Requested input | Released v1 surface | Canonical behavior / limits | Status / gap |
| --- | --- | --- | --- |
| Other recurring income | Dedicated `recurringOtherIncomeMonthly` field in advanced buy-and-hold assumptions. | Added to effective gross income after rent-only vacancy. Vacancy and percentage-of-rent costs remain linked to scheduled rent rather than laundry/parking/pet/utility income. | **Implemented.** |
| Unit-by-unit rent roll | Multi-family/owner-occupant rows retain current rent and add optional per-unit stabilized rent; single-family has a stabilized-rent field. | The selected current/stabilized operating scenario drives the canonical result, projection, share, and report. No provider imports a lease or rent roll. | **Implemented for manual underwriting; ingestion/evidence remains separate.** |
| Fixed recurring expenses | Property tax, insurance, HOA, utilities, and a general `recurringOtherExpenseMonthly` field are available. | Fixed monthly dollars grow with the expense-growth assumption; rent-linked percentages grow with projected scheduled rent. | **Implemented.** |
| Turnover, leasing, landscaping, pest control, admin | Dedicated monthly fields are available in advanced buy-and-hold assumptions. | Turnover and leasing are modeled as recurring monthly reserves, not event-level tenant-turn or lease-up schedules. All five flow through NOI/cash flow/projections/reports. | **Implemented as monthly assumptions.** |
| Loan points / origination fees | Dedicated percentage points, fixed origination, and other lender-fee fields. | Points are calculated from loan principal; all items are explicit acquisition cash uses and persist into results/reports. | **Implemented.** |
| Interest-only period | `interestOnlyMonths` feeds the shared full-precision loan schedule. | Results and reports separately disclose the initial IO payment and subsequent amortizing payment. Fixed-rate schedules only; adjustable rates and draws are not modeled. | **Implemented.** |
| Balloon / maturity | Contractual `loanTermYears` is maturity; remaining scheduled principal is an explicit balloon. | The balloon has a maturity month and amount, stays out of recurring Year-1/headline cash flow, and is separately included in the due-year financing outflow, net cash flow, and cumulative cash flow. | **Implemented.** |
| Amortization period vs loan term | `amortizationTermYears` is separate from contractual maturity. | Both terms use the same canonical schedule across analysis, projections, payoff/exit consumers, shares, and reports. | **Implemented.** |
| Escrows and reserves | Dedicated lender escrow deposit, lender reserve deposit, and investor opening reserve fields. | They are acquisition cash uses, not operating expenses or deductions. | **Implemented.** |
| Acquisition credits | Dedicated `acquisitionCredits` field. | Credits reduce initial cash required and fail validation if they exceed modeled acquisition cash uses. | **Implemented.** |
| Fixed or percentage closing costs | Released toggle supports percentage of purchase price or an exact fixed amount. | The selected mode drives canonical cash required and persists across reopen/share/report. | **Implemented.** |
| Refinance assumptions | Generic refinance fields are deliberately not exposed as a released calculation. | Any nonempty generic refinance assumption set is rejected by the released schema/action boundary and direct engine. Safe support requires a second loan schedule, original-loan payoff, refinance costs/proceeds/distribution treatment, and post-refinance cash-flow/return reconciliation. Default-dark BRRRR inputs do not satisfy that contract. | **Gated / fail closed; not silently ignored.** |
| Renovation timing and rent ramp | Optional start month, duration, and rent-reduction percentage supplement the day-zero rehab budget. | This is a simplified downtime model only. Without timing, the exact fallback is: “Steady-state analysis after stabilization; renovation downtime and lease-up are excluded.” Draw/funding, placed-in-service/lease-up, repair/capital classification, basis/tax treatment, and financed improvements are excluded. | **Implemented simplified downtime; detailed lifecycle deliberately disabled.** |
| Selling costs | General selling-cost percentage remains available for the pre-tax buy-and-hold return assumption. | It does not re-enable the default-dark fix-and-flip, tax, or full exit-strategy surfaces. No fixed-dollar selling-cost mode is claimed. | **Implemented as a percentage.** |
| Current and stabilized rents/values | Released v1 provides current/stabilized operating scenarios, SFR or per-unit stabilized rent, and separate current/stabilized property-value references. | Purchase price still anchors acquisition metrics; stabilized value is not silently treated as an appraisal, ARV, or refinance valuation. | **Implemented.** |
| Source, source date, confidence, and verification | Input Confidence retains value fingerprints and provider attribution only for supported enrichment fields. New advanced inputs persist as user-entered assumptions. | No provider source, verification, or Offer-ready status is invented for advanced assumptions. The readiness denominator still needs an explicit versioned expansion before those inputs can independently qualify as verified. | **Partial by design; property-provider truth is unchanged.** |
| Progressive disclosure | Core price/rent/address remain prominent; detailed income, expenses, loan/cash, rent-roll/value, renovation, and selling-cost assumptions live inside Advanced Options. | The same fields persist into saved analyses, shares, read-only results, and reports/PDFs. | **Implemented for released v1.** |

## External integration checklist

Do not enable broader “listing import,” price monitoring, or verified-property
claims until every applicable item is complete.

### Provider and legal

- [ ] Name the production owner and backup owner for property data.
- [ ] Execute an agreement that explicitly permits each intended use:
  interactive display, calculator autofill, persistence/cache duration,
  derivative estimates, saved-deal monitoring, notifications, and exports.
- [ ] Record coverage, update frequency, latency/error SLA, attribution terms,
  retention/deletion duties, and prohibited fields.
- [ ] Confirm that “MLS-sourced” or similar vendor copy may be shown; do not
  infer licensing from an API response or marketing page.
- [ ] Approve a non-scraping fallback. Portal HTML fetching is not part of the
  current architecture and must not be introduced as an emergency workaround.

### Field contract and identity

- [ ] Produce fixture-backed mappings for asking price, address, property type,
  units, beds, baths, square feet, year built, listed tax, assessed/parcel tax,
  rent evidence, listing status, price changes, and provider timestamps.
- [ ] Define canonical provider/listing IDs. Address text alone is not a safe
  long-term identity for monitoring or cross-provider merges.
- [ ] Store `providerId`, `providerListingId`, canonical/source URL,
  provider-observed timestamp, TrueCap fetch timestamp, and normalization
  contract version separately.
- [ ] Normalize status into `active`, `pending`, `under_contract`, `sold`,
  `off_market`, or `unknown`; unknown values fail closed.
- [ ] Reject nonpositive/non-finite prices and impossible measurements as
  unavailable. Never coerce provider blanks/sentinels to zero.
- [ ] Define whether a provider fact is subject-property, listing-agent,
  public-record, AVM, comparable, or derived data. Do not merge those classes.

### Runtime configuration and persistence

- [ ] Provision production and staging credentials in server-side secret
  storage. Only the Google browser key may use a `NEXT_PUBLIC_` variable, with
  domain/API restrictions.
- [ ] Confirm the required Supabase cache, comp, counter, and free-entitlement
  migrations are applied in each target environment before enabling RentCast.
- [ ] Validate the configured global/per-user/miss-refund quotas against the
  purchased provider plan and expected call multiplication.
- [ ] Add an authorized server-only adapter for listing updates; keep provider
  credentials and raw payloads out of browser bundles and logs.
- [x] Reserve provider cursor/watermark checkpoints and event/outbox storage in
  `20260815140000_saved_deal_watch.sql`; this is schema readiness only.
- [ ] Wire that storage to an authorized adapter, idempotent scheduled poller,
  retry policy, dead-letter/alerting behavior, and delivery consent before
  enabling Saved Deal Watch.
- [ ] Define cache TTL and stale-on-error policy per field. Any stale fallback
  must expose its original `fetchedAt`, not the fallback time.

### Product truth and fallbacks

- [x] Show source/provider and source date adjacent to an adopted RentCast
  active-listing price or AVM, including after save/reopen.
- [ ] Extend that adjacent source/date contract to every other imported or
  estimated decision input and to exports.
- [x] Persist first-class, value-fingerprinted purchase-price origin (`kind`,
  `provider`, `fetchedAt`) so active-listing versus AVM lineage survives reopen
  and fails closed on a price or address edit.
- [ ] Keep AVM, asking price, contract price, appraised value, current value,
  stabilized value, and ARV as distinct concepts.
- [ ] Preserve user-owned populated values. Conflicts require an explicit
  review/overwrite action; equal values must not be relabeled as provider-owned.
- [ ] Make missing-key, unsupported-address, no-match, cap, timeout, and stale
  cache outcomes distinguishable for support and monitoring without exposing
  a property address in logs.
- [ ] Provide a manual path for every required calculation input. Optional
  enrichment may not block analysis.
- [ ] Ensure imported values enter readiness as property-specific/unverified;
  only value-bound user evidence may reach Verified/Offer Ready.

### Test, security, and launch evidence

- [ ] Check in licensed/synthetic fixtures for every provider status and field
  shape, including empty, malformed, zero, negative, stale, partial, duplicate,
  and conflicting responses.
- [x] Test inactive-status suppression, AVM/asking separation, user-value
  ownership, purchase-price provenance invalidation after edits, stale-address
  response drops, and save/reopen lineage.
- [ ] Add export-lineage coverage and the remaining provider fixture/security
  matrix before enabling broader listing-import claims.
- [ ] Test authorization and RLS for caches/deal comps, quota races, provider
  outage behavior, retry idempotency, and notification consent/unsubscribe.
- [ ] Confirm logs contain only controlled provider/endpoint/error classes—no
  address query strings, URLs with addresses, raw payloads, or provider keys.
- [ ] Run a controlled staging smoke test with approved test addresses and
  capture dated evidence. Do not use production customer addresses for setup.
- [ ] Product, Legal, Security, Data/Model Risk, and Support sign off on the
  field matrix and exact UI language before public claims expand.

## Offline verification commands

These commands use fixtures/source only and make no live provider request:

```sh
npx vitest run \
  lib/__tests__/listing-url.test.ts \
  lib/__tests__/rentcast.test.ts \
  lib/__tests__/underwriting-enrichment-adoption.test.ts \
  lib/__tests__/property-ingestion-truth.test.ts \
  lib/__tests__/listing-price-provenance-regressions.test.ts \
  lib/__tests__/listing-import-workflow.test.ts \
  lib/__tests__/input-confidence.test.ts \
  lib/__tests__/input-confidence-persistence-contract.test.ts \
  lib/__tests__/data-confidence.test.ts \
  lib/__tests__/provider-log-privacy.test.ts \
  lib/__tests__/underwriting-model-release.test.ts

npx tsc --noEmit
```

No live-provider smoke test, migration, deployment, or production readiness
claim is performed by this checklist.
