# Deal Decision Pack durable fulfillment and data-safety runbook

## Status: designed, not active

New Decision Pack checkout is disabled in the application. Existing paid
browser-bound claim recovery remains authoritative until every durable
fulfillment activation gate below passes. The fulfillment and retention SQL
files are review drafts outside the executable migration queue and must not be
applied to production. The permission-only
`deal_comps` hardening migration may be reviewed and promoted independently;
it does not activate the Pack or alter Stripe.

New Pack sales are temporarily unavailable. Keep both checkout creation gates
off; this runbook preserves historical recovery and describes prerequisites for
a separately approved future reactivation.

Files covered:

- `supabase/review-drafts/decision-pack-durable-fulfillment.sql`
- `supabase/migrations/20260824121000_deal_comps_service_role_writes.sql`
- `supabase/review-drafts/public-share-retention-service-role.sql`

No email provider or message implementation is selected by this work. No live
Checkout Session, payment, refund, dispute, bucket object, webhook endpoint, or
customer record may be created while reviewing this runbook.

## Current source truth and known drift

The following statements are verified against the repository as of 2026-08-24
and supersede stale operational notes; they do not claim anything about live
environment values:

- New single-deal checkout is hidden and fails closed unless both the public
  product flag and private server checkout switch are explicitly enabled. The
  historical Price mappings remain only for existing paid claims and Stripe
  record compatibility. The `$9`, `$15`, and `$19` slots remain dormant.
- Existing paid Pack claims return and recover with `pdf_claim=<uuid>`, not
  `pdf_purchase=cs_...`. `pdf_purchase=cancelled` remains the historical
  cancellation marker. Legacy Session-id returns fail closed.
- The current Stripe webhook verifies signatures and uses the server-only
  `stripe_webhook_events` unique event ledger plus `claimed_at` lease. It
  intentionally skips `purpose=one_time_pdf`; browser verification currently
  records Pack payment facts. There is no webhook-driven durable artifact.
- Pack-to-Pro credit is active only when
  `STRIPE_PACK_CREDIT_COUPON_ID` is configured and the purchase is the `$5`
  variant. It is not safe to describe the credit as universally dormant or
  universally enabled without checking that environment gate.
- `one_time_pdf_purchase_claims` binds the browser secret, exact inputs, target
  fingerprint, optional user, payment facts, and a bounded same-tab recovery.
  It does not retain the canonical input/result/target snapshot or a PDF.
- `decision-pack-artifacts` and the three new durable tables do not exist until
  the reviewed migration is manually applied. Application code does not use
  them in this slice.

## Durable snapshot contract

### Authority and creation point

The future checkout action must construct the durable snapshot on the server
from the same validated values and target that are used to create the existing
claim. The browser may submit candidate values, but it is not allowed to write
the snapshot tables or decide their version fields.

The fulfillment insert and Stripe Checkout Session creation must be treated as
one recoverable intent:

1. Validate and normalize the form using the current authoritative schema.
2. Resolve the exact Offer Ceiling target and its source.
3. Run the authoritative calculation exactly once.
4. Build and hash the canonical snapshot below.
5. Allocate claim/fulfillment ids and the browser secret in memory; do not yet
   expose or persist an incomplete binding.
6. Create the Stripe Session with `purpose=one_time_pdf` and the non-secret
   claim/fulfillment ids in metadata.
7. In one database transaction, insert the existing claim and
   `decision_pack_fulfillments` with the exact Session/claim pair.

If Stripe Session creation succeeds but the fulfillment insert fails, expire
that still-unpaid Session where safely possible and return a generic failure.
Never send a buyer to a Session that lacks a durable binding. A reconciliation
job must detect any historical split intent before activation.

Step 7 requires a reviewed transactional database function (or an equivalent
single transaction), not two unrelated PostgREST writes. This foundation does
not invent that RPC before the final input contract exists; its implementation
and failure-injection test are activation blockers.

### Canonical content

Use a documented `decision-pack.snapshot.v1` canonical object with sorted keys,
UTF-8 encoding, no insignificant whitespace, and normalized finite numbers:

```text
{
  snapshotContractVersion,
  inputSchemaVersion,
  modelVersion,
  methodologyVersion,
  targetContractVersion,
  targetSource,
  inputSnapshot,
  resultSnapshot,
  targetSnapshot
}
```

Hash the exact bytes with SHA-256 and store the lowercase hex digest in
`snapshot_sha256`. The JSON columns and all six contract/version/source fields
are immutable. The target snapshot must contain the exact criteria displayed
beside the Offer Ceiling, not merely a Buy Box id that can later change.

Before the insert, require:

- the resolved input schema version;
- the calculation/model version;
- the published methodology version;
- the target contract version and normalized target source;
- the complete validated form snapshot;
- the exact result snapshot used by the report; and
- the exact normalized target snapshot used by the solver.

The renderer must read this frozen record. It must not fetch current form
values, current Buy Box settings, current defaults, or today's engine and mix
them into a purchased version. If a buyer edits inputs later, that is a new
analysis and does not mutate or silently regenerate the purchased artifact.

### Legacy claims

Do not synthesize canonical snapshots for old claims from current defaults.
For a historical paid claim, recovery may use the existing browser-bound flow
or a support-reviewed fulfillment based on the original verified draft. Mark
any support artifact as a legacy recovery in operational records. If exact
inputs, target, and methodology cannot be proven, refund or support escalation
is safer than presenting a newly calculated PDF as the original purchase.

## Webhook idempotency and event ordering

### Existing ledger is authoritative

Do not add a second webhook endpoint or independent event lock. Extend the
existing signed endpoint and its `stripe_webhook_events` contract:

- `stripe_event_id` remains the global idempotency key;
- the initial insert owns the first processing lease;
- a duplicate with `processed_at` set returns success without side effects;
- a duplicate with no `processed_at` must win the existing stale-lease compare
  and swap before retrying; and
- transient database, Stripe, storage, or render failures return non-2xx so
  Stripe retries, while a permanent verified skip is recorded with a coarse
  reason and returns 2xx.

Do not store raw event payloads, addresses, buyer emails, form values, Stripe
customer data, or report text in operational telemetry. Event ids, event type,
purpose, coarse error class, lifecycle status, and opaque fulfillment id are
sufficient.

### Events to support before activation

Subscribe in Stripe test mode first, and only after the corresponding handlers
are deployed and tested:

| Stripe event | Required Pack behavior |
| --- | --- |
| `checkout.session.completed` | For a synchronously paid Pack, verify `purpose`, claim id, fulfillment id, Session id, mode, paid status, currency, amount, and Price. Re-fetch the Session/PaymentIntent, then set payment facts once and queue rendering. |
| `checkout.session.async_payment_succeeded` | Perform the same convergence logic; duplicate completion must not render or email twice. |
| `checkout.session.async_payment_failed` | Mark payment failed without creating an artifact; retain the audit row for reconciliation. |
| `checkout.session.expired` | Mark an unpaid intent failed/expired; do not send paid-delivery email. |
| `charge.refunded` | Re-fetch the Charge/PaymentIntent and record cumulative refund amount. Any partial or full refund revokes future report access, recovery, delivery, and Pack-to-Pro credit eligibility. |
| `charge.dispute.created` | Record the dispute state, suspend report access/recovery/delivery and Pack-to-Pro credit eligibility, and alert the operations owner. |
| `charge.dispute.closed` | Re-fetch current dispute/payment state. A lost dispute revokes report access/recovery/delivery and Pack-to-Pro credit eligibility; a won dispute restores them only after a fresh paid/no-refund check. Apply the transition idempotently. |

Stripe can deliver events late or out of order. An event's embedded status is
not final authority. After signature verification and exact metadata binding,
retrieve the current Stripe object and converge the database to that current
state. Update `last_stripe_event_id` only through a compare-and-swap that does
not let an older `event.created` replace a newer observation. Never decrement
paid/refunded amounts or attempt counters.

The Pack branch must validate all of the following before any state change:

- `metadata.purpose === "one_time_pdf"`;
- claim and fulfillment ids are well-formed UUIDs and refer to the same row;
- the stored claim Session id equals the event Session id;
- Checkout mode is `payment` and the purchased Price is the exact configured
  Pack Price for the row's recorded variant;
- amount and currency match Stripe's current authoritative object; and
- the immutable snapshot digest still recomputes exactly.

Any mismatch is a high-severity entitlement alert, not a best-effort render.

## Fulfillment, artifact, and delivery lifecycle

Payment, rendering, delivery, access, and dispute status are orthogonal. This
prevents an email outage from erasing a valid payment or a dispute from being
misrepresented as an artifact-generation failure.

1. `payment_status=open`, `fulfillment_status=pending` after binding.
2. A verified paid event atomically records PaymentIntent, amount, currency,
   and `paid_at`, then queues one render.
3. A worker claims `pending` or retryable `failed` work with a bounded lease,
   increments `fulfillment_attempt_count`, and sets `rendering`.
4. Render from the frozen snapshot; calculate a PDF SHA-256 and byte size.
5. Upload once to the private bucket with a non-guessable object path. Do not
   overwrite an existing object.
6. In one database transaction, insert immutable artifact metadata with the
   same snapshot digest and set fulfillment/access state to available.
7. Queue delivery separately. On provider success set `delivery_status=sent`
   and `delivered_at`; on failure set `delivery_status=failed`, preserve the
   artifact, increment the bounded attempt count, and schedule recovery.

All retries must be safe after process death between any two steps. Before
rendering or uploading, check for an existing artifact row and verify its
content hash. A duplicate worker must converge to the same single artifact,
not overwrite it or send another message.

Use coarse error codes such as `render_timeout`, `storage_unavailable`,
`artifact_hash_mismatch`, `email_provider_rejected`, and `binding_mismatch`.
Never persist exception text that might contain the snapshot, email, token, or
signed URL.

## Private storage and signed retrieval

The migration creates `decision-pack-artifacts` as a private, PDF-only bucket
with a 10 MiB limit and no anon/authenticated `storage.objects` policy.

Required runtime rules:

- Only the server service-role client may upload or inspect objects. Removal is
  prohibited until a separately approved retention/deletion workflow exists.
- Object-path unpredictability is not authorization.
- Never persist or email a permanent public URL.
- After account ownership or a recovery grant is verified, mint a signed URL
  with a maximum lifetime of 300 seconds.
- Verify `content_sha256`, `byte_size`, MIME type, and the linked
  `snapshot_sha256` before signing.
- Rate-limit retrieval by recovery grant/account and IP without logging the
  raw token or address.
- Return the same generic not-found response for malformed, expired, revoked,
  exhausted, or unknown grants.
- A signed URL grants access only to that immutable object. It cannot authorize
  account claim, new calculation, Pack credit, or another purchase.

The storage verification query must show `public=false`, 10 MiB, and only
`application/pdf`. Review all `storage.objects` policies, not just policy
names, and prove none grants anon/authenticated access to this bucket.

## Email recovery and optional account claim

This work intentionally does not select or implement an email provider. Before
activation, the production owner must select the sender/provider, authenticate
the domain, approve the template, and prove bounce/failure telemetry.

The future flow must:

1. Obtain the buyer email only from Stripe's verified Checkout Session or
   customer details, never from an untrusted return query.
2. Store it only in the existing server-only claim column under the approved
   retention policy.
3. Generate at least 256 bits of randomness, email the plaintext capability
   once, and store only its SHA-256 hash in
   `decision_pack_recovery_grants`.
4. Put no address, financial value, Stripe Session id, claim secret, artifact
   path, or buyer email in the URL.
5. Set an explicit expiry and bounded repeat-use count. The product/legal owner
   must approve both values before code supplies them; the migration chooses no
   default.
6. On each retrieval, hash and compare server-side, atomically increment the
   use count, reject expired/revoked/exhausted grants, then mint a short-lived
   object URL.
7. Let a signed-in buyer optionally claim the purchase once. Account claim is
   one-way, must not replace the immutable snapshot, and must not make an
   anonymous link discoverable by another account.

Email failure does not revoke payment or delete the artifact. It enters the
delivery recovery queue and provides support a way to resend a newly rotated
grant after verifying the buyer. Never resend an old plaintext token because
the server does not retain it.

## Reconciliation and support recovery

Run reconciliation from a server-only scheduled job and a read-only dry-run
command before enabling repair mode. It must page immediately on an
unrecoverable paid artifact or entitlement divergence.

Reconcile at least:

- paid Stripe Pack Sessions with no fulfillment row;
- paid fulfillment rows with no artifact after the render SLO;
- artifact metadata with a missing object or hash/size mismatch;
- fulfilled purchases with failed or never-attempted delivery;
- open/failed rows whose current Stripe payment later succeeded;
- refund totals and dispute states that differ from current Stripe state;
- stale rendering/delivery leases; and
- account claims or Pack-credit references that point to a different buyer.

Dry run outputs counts and opaque ids only. Repair mode requires a bounded batch
size, per-row idempotency, a recorded operator, and a stop threshold. It may
create a missing fulfillment only when exact claim, Session, input, target,
model, and methodology binding can be proven. Otherwise route to support for
refund or manual resolution; do not fabricate a snapshot.

Support recovery must verify Stripe payment and buyer control using an approved
procedure, rotate the recovery grant, and leave an audit record. Support must
never ask for or accept a Checkout Session id as the sole authorization factor.

## Refund, dispute, chargeback, and Pack-credit blocker — business policy decided

**Business policy approved by Morgan on 2026-08-24.** This approval decides the
state policy below. The retained historical browser-bound claim path now
enforces current Stripe refund/dispute state at verification and export, and
the signed webhook durably revokes existing credit-ledger states after refunds
or lost disputes. That narrow safety slice does not activate the durable Pack
design in this document: new Pack sales remain disabled, and durable artifact,
delivery, recovery-grant, reconciliation, and credit-suspension/restoration
work remains blocked until implemented and tested against current Stripe state.

| Current payment state | Report access and delivery | Pack-to-Pro credit |
| --- | --- | --- |
| Paid, with no refund or dispute | May remain available, subject to the normal fulfillment and identity checks. | May remain available under the existing eligibility rules. |
| Partial refund | Revoke future report access, recovery, and delivery. | Revoke the credit and prevent any new application. |
| Full refund | Revoke future report access, recovery, and delivery. | Revoke the credit and prevent any new application. |
| Dispute open or pending | Suspend report access, recovery, and delivery while the dispute is unresolved. | Suspend the credit; do not apply or restore it while the dispute is unresolved. |
| Dispute lost | Revoke future report access, recovery, and delivery. | Revoke the credit and prevent any new application. |
| Dispute won | Restore only after a fresh server-side Stripe lookup confirms the purchase is currently paid and there is no unreconciled refund. Otherwise access remains suspended or revoked. | Restore only after the same current-state check confirms paid status and no unreconciled refund. |

Revocation governs all future server-controlled retrieval, recovery links, and
delivery attempts. A PDF already downloaded to a buyer-controlled device cannot
be technically recalled; the system must still record the revocation and must
not re-deliver it. Enforcement must be driven by a current Stripe object plus
the idempotent event ledger, never by event arrival order alone. Any credit
reversal must preserve existing Stripe Price ids and subscriptions.
For the retained historical path, an already-applied Pack credit is marked
`reversed` in the audit ledger only. The webhook does not remove a live coupon,
reprice a subscription, or mutate any Stripe Price/Subscription object.

Until durable-fulfillment runtime enforcement and the required duplicate/
reorder/reconciliation tests exist, future durable-artifact handlers may record
and alert only. They must not silently restore, re-credit, or promise a refund,
and the durable Pack runtime gate must remain off. This restriction does not
weaken the current fail-closed historical verification/export gate above.

## Share and provider boundaries preserved by this slice

This work does not alter share tokens or provider APIs. The current variants
must remain distinct during any future Pack recovery work:

- `/s/<token>` is the current opaque 256-bit share. Only its SHA-256 is stored;
  it defaults to 180-day expiry, supports owner revocation, resolves through a
  service-role server path, and returns a generic 404 for invalid/expired/
  revoked tokens.
- Legacy `/d/<encoded>` links contain the analysis payload and cannot be
  remotely expired or revoked. They remain readable for compatibility and
  must retain no-referrer, noindex, and private/no-store controls. Never reuse
  their payload or HMAC attribution as Pack recovery authorization.
- Portal/embed HMAC tokens are scope-bound but currently have no intrinsic
  expiry/revocation. They authorize only their existing portal/embed scope.
- A Pack recovery grant is a separate hashed capability. It cannot be accepted
  by `/s`, `/d`, portal, or embed routes, and share tokens cannot retrieve a
  purchased artifact.

Keep the existing privacy-minimized `share_created`, `share_viewed`, and
owner-driven `share_revoked` product events. Automated retention deletion is
not an owner revocation and must not emit `share_revoked` once per row. Record
only an operational aggregate for the purge invocation (grace policy version,
batch size, deleted-count band, outcome/error class); never send a share token,
token hash, snapshot, address, owner/deal id, or object path to analytics.

### Expired/revoked share retention

The share-retention draft adds no scheduled job and chooses no retention
duration. It adds only cleanup indexes and
`purge_expired_or_revoked_public_shares(grace, batch_limit)`, which:

- is executable only by `service_role`;
- requires an explicit non-negative grace interval on every invocation;
- caps one transaction at 1–1,000 rows;
- uses the database clock, so callers cannot pass a future artificial `now`;
- locks candidates with `skip locked` for retry/concurrency safety; and
- can select only a row whose `expires_at` or `revoked_at` is at/before
  `clock_timestamp() - grace`.

The current share expiry remains unchanged. Morgan/privacy owner must approve
the grace interval, backup retention, purge cadence, and audit destination
before a scheduler is implemented. The grace must be configuration owned by
the server job; it must not be a browser parameter or silent code default.

Before enabling deletion, run a read-only preview with the exact approved
grace and record only aggregate counts:

```sql
-- Replace the placeholder only with the approved explicit interval.
select count(*) as eligible_share_rows
from public.public_shares
where (expires_at is not null and expires_at <= clock_timestamp() - interval '<APPROVED_GRACE>')
   or (revoked_at is not null and revoked_at <= clock_timestamp() - interval '<APPROVED_GRACE>');
```

Do not call the purge function from this review. Future scheduled execution
must use a bounded loop with an overall row/time ceiling, record invocation
time/grace/deleted count/operator or job id, alert on failures, and stop on an
unexpected count spike. Never log a raw token, token hash, snapshot, address,
owner id, or deal id. Deletion is irreversible outside backup recovery.

`deal_comps` and `property_enrichment_cache` contain RentCast-derived provider
data. The hardening migration removes authenticated browser writes to
`deal_comps`; server code still checks saved-deal ownership before persistence.
Provider data remains reference evidence and never calculation authority.

No provider contract or approved retention/redisplay matrix is present in the
repository. Morgan plus counsel/provider-contract owner must confirm before a
durable Pack includes or redistributes provider payloads:

- fields allowed to be stored and shown in a paid PDF;
- retention duration and deletion requirements;
- whether comparable addresses/values may be emailed, shared, or repeatedly
  downloaded; and
- required attribution and source-date language.

If rights are not proven, the durable artifact must omit restricted provider
payloads and label the input as user-entered, benchmark, unavailable, or stale
as appropriate. RentCast failure currently degrades to cache/null-safe paths;
FRED/HUD keys are optional and their failures return no refreshed value or an
explicit fallback. A provider outage must never upgrade a value to verified or
silently replace a purchased frozen snapshot.

### Independent `deal_comps` security hardening

`20260824121000_deal_comps_service_role_writes.sql` is a permission-only
security repair, not a durable Pack or share-retention dependency. It may be
reviewed, clone-tested, and applied independently while the Decision Pack
durable-fulfillment review draft remains outside the executable migration queue,
the durable Pack runtime gate remains off, and the public-share retention review
draft remains outside the executable migration queue with no purge scheduler.

Before that independent promotion, verify the ownership-checking service-role
upsert and authenticated owner read against a production-shaped clone. Its safe
rollback is an application server adapter; do not restore authenticated browser
INSERT, UPDATE, or DELETE policies.

## Activation gates and accountable owners

Accountability labels below do not imply the action is complete.

| Gate | Accountable owner | Evidence required | Current state |
| --- | --- | --- | --- |
| Snapshot/model/target contract | TrueCap engineering owner (Morgan until delegated) | Golden parity tests and canonical hash vectors | Blocked |
| Transactional checkout binding and worker leases/outbox | TrueCap engineering owner (Morgan until delegated) | Atomic RPC plus process-death/duplicate-delivery tests | Not implemented — blocking |
| Expand-only migration review/apply | Supabase production owner (Morgan) | Clone restore, migration dry run twice, backup id, schema verification | Not applied; `deal_comps` hardening may be promoted independently |
| Stripe event subscription/handler | Stripe production owner (Morgan) | Test-mode duplicate/reorder/replay suite; exact subscribed event list | Not configured |
| Artifact storage/retrieval | Supabase production owner (Morgan) | Cross-role access tests and 300-second signed URL test | Not configured |
| Email recovery | Morgan must name a delivery owner/provider | Authenticated sender, approved copy, bounce/retry evidence | Owner/provider not selected — blocking |
| Refund/dispute/credit policy | Morgan (business policy); engineering owner for enforcement | Approved state table above, customer/support copy, and webhook/reconciliation/access/credit tests | Historical verification/export enforcement implemented 2026-08-24; durable fulfillment and full credit suspension/restoration remain blocking |
| Provider retention/redisplay rights | Morgan + counsel/provider-contract owner | Contract-backed field/retention matrix | Not supplied — blocking |
| Expired/revoked share purge | Morgan/privacy owner | Approved explicit grace, backup restore test, aggregate dry run, scheduler audit/stop limits | Not scheduled — blocking |
| Reconciliation/on-call | Morgan until delegated | Dry run, bounded repair rehearsal, alert destination | Not configured |

Activation is prohibited while any row is blocked or unassigned. In this
runbook, "activation" means durable Pack runtime activation. That prohibition
does not prevent the independent review and promotion of the `deal_comps`
permission repair described above; it does keep the Pack and share-retention
runtimes off.

## Safe rollout sequence

1. Keep the runtime gate off. Record current database backup/restore evidence,
   Stripe event subscription list, Pack Price id, and row counts without
   exposing customer data.
2. In a disposable Supabase clone restored from a recent production-shaped
   backup, execute the permission migration and both review drafts separately.
   Execute each twice; the second run must be a no-op. Run the schema/source
   contract tests. Clone execution does not promote either draft into the
   production migration queue.
3. Implement the tolerant runtime behind a server-only activation gate. It must
   work when the new tables are absent and must not create a new Pack Session
   unless it can persist the durable binding.
4. Add unit/integration tests for canonical snapshot parity, duplicate and
   reordered events, process death at every fulfillment boundary, tab/session
   loss, delayed return, repeat retrieval, account claim, delivery failure,
   refund/dispute recording, and reconciliation.
5. In Stripe test mode only, add the exact event types listed above and run
   fixture/CLI events plus a non-chargeable test Checkout. Do not submit a real
   payment.
6. Verify the private bucket with anon, authenticated-other-user, rightful
   account, valid recovery grant, expired/revoked grant, and service-role
   cases. Only the rightful account, valid recovery grant, and service-role
   internal paths may result in a signed URL; no client role may list objects.
7. Rehearse dry-run reconciliation against test-mode Stripe. Introduce missing,
   duplicate, delayed, reordered, failed-render, failed-email, refunded, and
   disputed fixtures.
8. After the relevant owner approval, take a fresh backup and manually apply
   only the migration approved for that release. The `deal_comps` permission
   repair may be applied alone. Do not promote or execute either review draft
   merely because the comps repair is approved. Re-run the read-only
   verification queries before deploying a writer.
9. Deploy code with creation still off. Enable webhook observation/recording,
   then a tiny internal cohort. Compare Stripe, claim, fulfillment, artifact,
   delivery, and credit state after every test purchase.
10. Expand only after the error budget is clean and a rollback rehearsal proves
    already-paid buyers retain retrieval.

## Read-only post-migration verification

Run against the reviewed target and save redacted results:

```sql
select to_regclass('public.decision_pack_fulfillments'),
       to_regclass('public.decision_pack_artifacts'),
       to_regclass('public.decision_pack_recovery_grants');

select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'decision-pack-artifacts';

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where (schemaname = 'public' and tablename like 'decision_pack_%')
   or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'decision_pack_fulfillments',
    'decision_pack_artifacts',
    'decision_pack_recovery_grants',
    'deal_comps'
  )
order by table_name, grantee, privilege_type;

select grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name = 'purge_expired_or_revoked_public_shares'
order by grantee, privilege_type;
```

Expected:

- no anon/authenticated grants or policies on any `decision_pack_*` table;
- service role has no DELETE on the immutable ledgers;
- the artifact bucket is private, 10 MiB, PDF-only, and has no applicable
  anon/authenticated object policy;
- `deal_comps` grants authenticated users only SELECT and has only the
  authenticated owner SELECT policy; and
- service role has SELECT/INSERT/UPDATE on `deal_comps`, not DELETE; and
- only the function owner and service role can execute the bounded share purge;
  the migration itself has not deleted or scheduled anything.

## Rollback and disablement

### Before activation and while empty

If clone review fails, do not apply production. If the production migration was
applied but all new tables and the bucket are provably empty, a separately
reviewed rollback migration may drop the new objects in dependency order. Do
not paste ad hoc DROP statements into the production dashboard.

The `deal_comps` permission change should normally remain: runtime writes
already use the service role. If an application rollback unexpectedly depended
on browser writes, keep the UI write disabled and deploy a reviewed server
adapter; do not restore the permissive policies under incident pressure.

The share cleanup function and its indexes may be dropped before first use in a
reviewed rollback migration. After the first purge, disabling/dropping the
caller or function does not restore rows; use the tested backup if recovery is
approved, and never synthesize replacement share tokens.

### After any bound purchase or artifact

Never drop the tables or bucket. Roll back by:

1. Stop creating new durable Pack Sessions with the server-side gate.
2. Keep webhook, reconciliation, retrieval, and delivery available for buyers
   who already paid.
3. Roll the UI/runtime reader back to a compatible version while retaining the
   additive schema.
4. Remove newly subscribed Stripe event types only after the deployed endpoint
   no longer requires them and all pending events/reconciliation are complete.
5. Preserve immutable snapshots/artifacts and event audit rows under the
   approved retention policy.
6. Page the accountable owner for any paid purchase that cannot be retrieved;
   resolve via support/refund policy, never silent deletion.

Feature flags are a creation kill switch, not a substitute for preserving
already-paid entitlements or for a database rollback plan.
