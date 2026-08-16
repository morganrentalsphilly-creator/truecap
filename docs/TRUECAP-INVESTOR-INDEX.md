# TrueCap Investor Index foundation

Status: internal contract only. There is no public route, UI, scheduled job,
database migration, or external data call in this phase.

The pure aggregation contract lives in `lib/investor-index.ts`. It is designed
so a future scheduled, server-only provider can produce editorial statistics
without handing private deal rows to a page or API route.

## Current data audit

### Analysis runs

`app_counters.analysis_runs` is a single global counter incremented by
`trackAnalysisRunAction`. It has no event rows, dates, geography, inputs, result
metrics, actor identity, or consent state. It can support the existing global
ticker, but it cannot truthfully support an Investor Index cohort or trend.

PostHog event names exist in the application, but this repository does not
contain an approved warehouse/export contract for those events. The Index must
not assume they are complete, consented, or available.

### Saved analyses

`saved_analyses` is owner-private under RLS and currently contains:

- raw `user_id` and property `address` (never publish);
- `created_at`/`updated_at`, `form_snapshot`, and `result_snapshot`;
- cached purchase price, cash flow, and cash-on-cash fields;
- pipeline/client associations and `data_confidence` metadata;
- methodology version and Input Confidence only on newly generated snapshots.

Those rows are useful source material only after the privacy policy and consent
basis explicitly permit aggregate use. The provider must default to exclusion.
The global analysis-run count and saved-deal count are different populations and
must never be silently combined or labeled as the same statistic.

Max Offer and the most limiting decision threshold are not reliable historical
columns today. A future provider must either recompute them with a frozen,
versioned target definition or ingest a versioned derived event. It must not
invent them from the fields that happen to be present.

## Public aggregation contract

The contract emits only:

- a calendar quarter, never an exact timestamp;
- national, two-letter state, or five-digit Census CBSA codes, never address,
  ZIP, city text, coordinates, or user-authored geography labels;
- a banded analysis volume rather than an exact count;
- versioned pass rate, median cap rate, median cash-on-cash return, and median
  monthly cash flow;
- a rounded median asking-price versus Max-Offer gap;
- the modal limiting assumption from a closed taxonomy;
- an Input Confidence quarter-over-quarter trend only when both quarters have
  enough observations and contributors under the same method version.

Every cohort needs at least 25 observations from at least 10 distinct
contributors after capping each contributor at five observations per cohort.
The same thresholds apply to every individual metric's eligible subset. Small
cohorts are omitted; thin metrics are present only as `suppressed`. Sample sizes
are returned as bands. Mixed calculation/definition versions are suppressed
rather than blended.

The input keys used for deduplication and contributor limiting should be HMACs
created by the provider with a server-held key. The aggregator never returns
them. Passing a wider object at runtime does not widen the output because every
published field is constructed explicitly.

## Required scheduled provider

Before enabling an Index, add a server-only provider/job with these steps:

1. Confirm the privacy-policy and consent basis with counsel/product ownership.
   Filter to an explicit `approved` eligibility state; absence is not consent.
2. Read source rows with a service role inside the job only. Never expose raw
   saved rows to an editorial route.
3. Convert source IDs to stable HMAC record/contributor keys. Keep the HMAC key
   out of the aggregate table and application bundle.
4. Resolve addresses to a trusted Census geography catalog, then discard the
   address, ZIP, coordinates, and any free-form location before aggregation.
5. Recompute result metrics only through a pinned TrueCap underwriting version.
   Stamp screen, Max Offer, and limiting-assumption definitions independently.
6. Call `aggregateInvestorIndex`, persist only its release shape, and record a
   closed source cutoff and release version for auditability.
7. Run privacy/quality checks, then approve a static release for editorial use.

The job should run after a calendar quarter closes. Immutable quarterly releases
avoid live differencing attacks and make editorial citations reproducible.
Corrections should create a new release revision with an audit note rather than
mutating silently.

## Future materialized aggregate

No migration is included now. A future aggregate table or materialized view
should contain only release-safe fields such as:

- contract/privacy-policy/release revision;
- source cutoff and published timestamp;
- quarter key and approved geography level/code;
- banded volume and the already-suppressed metric JSON;
- underwriting, screen, Max Offer, decision-threshold, and Input Confidence
  method versions.

It must not contain raw `user_id`, analysis ID, address, ZIP, coordinates,
free-form title/notes/tags, client ID, or raw snapshots. The public/editorial
reader should have `SELECT` only on this aggregate, never on the source rows.

If PostgreSQL materialized views are used, refresh into a staging relation,
validate the staged release, then atomically promote it. A provider-owned table
is preferable when immutable revisions and approval state are required.

## Guardrails before any public consumer

- No arbitrary interactive filters. Publish only reviewed geography/quarter
  combinations from a whitelist.
- No daily/live counts or overlapping fine-grained windows; they enable
  subtraction attacks even when each result passes a minimum size.
- Do not add strategy, property type, client, or user attributes as dimensions
  without a new privacy review and higher thresholds.
- Rebuild affected unpublished releases when consent is withdrawn or source
  records are deleted. Define the legal retention policy before launch.
- Keep public copy precise: "eligible underwrites in the Index cohort," not all
  TrueCap analyses, listings, users, purchases, or closed deals.
- Never infer investment performance or transaction outcomes from an underwrite.
- Consider formal differential privacy before offering user-selected queries or
  frequently refreshed public dashboards.

## Metric definitions required from the provider

- **Pass rate:** outcome of one frozen, disclosed standard screen. The version
  travels with every observation and the aggregate refuses to mix versions.
- **Return medians:** canonical TrueCap underwriting results, not independently
  reimplemented SQL formulas.
- **Asking vs Max Offer:** `(asking - Max Offer) / asking`, with Max Offer
  calculated from a frozen target set. Positive means asking is above Max Offer.
- **Most limiting assumption:** the modal result of a frozen decision-threshold
  evaluator mapped to the closed taxonomy in the module.
- **Input Confidence trend:** difference in median score from the immediately
  prior quarter, only for snapshots that actually contain a valid score and the
  same Input Confidence method version.

Until the provider, consent decision, scheduled release process, and aggregate
store exist, editorial pages must not display Investor Index statistics.
