# Saved Deal Watch activation contract

Saved Deal Watch is intentionally a dormant foundation. The repository now has:

- a provider-neutral, authorized listing-update contract in `lib/listing-update-provider.ts`;
- a pure threshold-crossing evaluator in `lib/saved-deal-watch.ts`;
- canonical re-underwriting through `calculateAnalysis`, the Buy Box evaluator,
  the Max Offer solver, and the exact/rechecked What Needs To Be True engine;
- one coalesced event at most per evaluation; and
- stable event dedupe keys plus focused tests;
- a typed `buildSavedDealWatchPersistenceCommand` update-hook mapper that
  carries the evaluator checkpoint/event envelope into the database boundary;
- an additive, owner-scoped persistence migration in
  `supabase/migrations/20260815140000_saved_deal_watch.sql`;
- a service-role-only atomic checkpoint/event/held-outbox write hook; and
- a strictly feature-flagged saved-deal workspace card that persists the
  per-deal opt-in and separate future in-app/email consent.

It does **not** poll listing sites, fetch listing updates, schedule checks, or
send notifications. The existing `saved_deal_watch` feature flag remains off.
If enabled after the migration is reviewed and applied, the workspace card
says explicitly that it is saving a preference only and that monitoring is
inactive. Both the server render and every action also require an active Pro
or Agent Pro subscription; Free users cannot opt in by calling the action
directly. The card must keep its inactive-state copy until the provider and
delivery layers are actually operational.

## What generates an event

The evaluator checkpoints the first observation without notifying. Later observations can produce only these meaningful events, in priority order:

1. A lower mortgage rate independently moves the deal from failing to passing the Buy Box.
2. The current asking price moves to or below the freshly solved Max Offer.
3. Another update moves the full Buy Box from fail to pass.
4. The signed asking-price-to-Max-Offer gap changes materially without crossing a higher-priority threshold.

The default “material gap” gate is the larger of $5,000 or 2% of the prior asking price. One update returns at most one event, so simultaneous price, Max Offer, and Buy Box crossings do not create overlapping notifications.

The evaluator never treats a missing/invalid provider price as zero. It carries forward the last known price (then falls back to the saved underwrite) and returns no alert if the canonical analysis cannot be calculated.

Each checkpoint also stores the six compact What Needs To Be True boundaries
(including recheck status) plus the smallest normalized gap id. This is a
comparison of required change size, not a feasibility promise. The full
analysis and form snapshot are not duplicated into Watch storage.

## External provider required

Automatic listing-price updates require an official or licensed property/listing data provider that can return a stable listing ID, current asking price, status, source URL, and observation timestamp. Implement the `ListingUpdateProvider` interface in a **server-only** adapter and map every response through `normalizeListingUpdateObservation`.

Do not scrape Zillow, Redfin, Realtor.com, Homes.com, or another portal to activate this feature. The existing listing-URL parser extracts an address from a user-supplied URL; it is not a price-monitoring feed.

## Persistence architecture (prepared, not applied)

The new migration prepares:

- per-user/per-deal watch opt-in and provider listing identity;
- the latest `SavedDealWatchCheckpoint` per deal;
- an append-only watch event/outbox table with a unique constraint on `dedupe_key`;
- provider cursors/watermarks and retry bookkeeping; and
- explicit, separate service-notification consent for in-app and email Watch
  alerts (never reused from rate, rent, summary, or marketing preferences).

Every relationship carries both the object id and owner id through a composite
foreign key, and RLS permits authenticated writes only to the subscription and
preference tables. Checkpoints, events, and outbox are owner-readable but
service-role-written. Opaque provider cursor/retry state is tenant-keyed and
service-role-only. Every outbox row starts `held`; the migration contains no
delivery trigger or sender.

The migration must be surfaced and reviewed before it is applied. Do not store
the full form snapshot again in the watch checkpoint. It already belongs to
`saved_analyses`; the small decision state is enough for threshold comparison
and auditability.

## Orchestrator sequence

1. Read only users/deals that have explicitly enabled Watch and are entitled.
2. Fetch updates through the authorized provider adapter and normalize them.
3. Load the saved analysis, current Buy Box/Max Offer target, and previous checkpoint.
4. Call `evaluateSavedDealWatch`.
5. Call the service-role-only `record_saved_deal_watch_evaluation` function to
   atomically advance a non-stale checkpoint, insert the event using
   `dedupeKey`, and create consent-stamped **held** outbox rows.
6. In dry mode, expose counts/event previews only; do not send.
7. A separate delivery worker applies consent, quiet-hours/frequency caps, and provider/email retry policy before sending.

Listing fetch failure, an invalid observation, an unparseable saved analysis, or an unavailable Max Offer must fail closed for that deal and must not block other deals in the run.

## Safe rollout

1. Select and contract an authorized listing-data provider; add server-only credentials.
2. Review and apply `20260815140000_saved_deal_watch.sql`.
3. Deploy with `NEXT_PUBLIC_TRUECAP_SAVED_DEAL_WATCH=false` and smoke-test the
   migration through owner-scoped service test accounts.
4. Add a cron/queue orchestrator with hard batch limits, rate limits, Sentry
   tags, and a separate operational kill switch (`off` by default, then `dry`,
   then `live`).
5. Run dry mode long enough to inspect false-positive rate, duplicate
   suppression, cost, provider coverage, stale-event rejection, and held
   outbox consent stamps.
6. Enable `NEXT_PUBLIC_TRUECAP_SAVED_DEAL_WATCH=true` only to expose the
   truthful preference UI. This flag does not authorize provider traffic or
   delivery.
7. Build and review a separate delivery worker that re-checks current consent
   immediately before delivery. Start with in-app dry previews, then a small
   explicitly opted-in cohort. Change the UI's inactive copy only after the
   actual operational state is server-derived.

The existing FRED rate-watch/rate-alert paths remain separate and unchanged. They are useful operational precedents, but the new generic watch evaluator must not imply that listing-price monitoring is live until the provider, persistence, consent, and worker layers above exist.
