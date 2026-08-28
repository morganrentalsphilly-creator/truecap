# Historical one-time paid-claim recovery security

New one-time Decision Pack checkout is disabled. This document records the
security contract needed to recover reports for customers who paid while the
product was offered; it is not an activation or marketing runbook.

## Recovery design

The one-time PDF flow no longer treats a Stripe Checkout Session id as a
reusable bearer token.

1. Checkout validates and HMAC-fingerprints the exact deal server-side. The
   digest is keyed by the separate 256-bit browser secret, so a ledger leak
   cannot be dictionary-attacked with guessed addresses or prices.
2. The server creates a ledger entry with a one-way hash of a random 256-bit
   browser secret. Plaintext property and financial inputs are not stored.
3. Stripe returns to `/?pdf_claim=<uuid>`. The UUID is only a public lookup id;
   the separately held secret stays in same-tab `sessionStorage`.
4. A synchronous head bootstrap removes both `pdf_claim` and the retired
   `pdf_purchase` parameter before GTM, gtag, PostHog, Vercel Analytics, or
   client error reporting can observe the page URL.
   Server, edge, and browser Sentry hooks independently scrub request URLs,
   parsed query strings, navigation/fetch/xhr breadcrumbs, performance
   transactions/spans, and exception text because the initial HTTP request
   necessarily arrives before browser code can run.
5. Redemption checks the browser secret, exact deal fingerprint, initiating
   user when present, claim expiry, Stripe purpose/claim metadata, session
   completion, and paid status. A conditional database update consumes the
   claim once. Only the same bound browser/deal may recover for 24 hours after
   consumption so a failed local PDF generation can retry safely.

Legacy `pdf_purchase=cs_...` returns fail closed. They cannot be bound to the
original deal retroactively, so a "first claimant wins" compatibility path
would preserve the takeover vulnerability. Support can verify Stripe payment
records and fulfill/refund the small number of in-flight legacy purchases.

## Current verification

1. Confirm the historical claim-ledger migration
   `supabase/migrations/20260815150000_one_time_pdf_purchase_claims.sql` is
   present in the target environment. Recovery intentionally fails closed when
   the ledger is unavailable.
2. Keep both Decision Pack checkout gates disabled while validating recovery.
3. Use automated fixtures or an existing Stripe test-mode claim to verify:
   - the success URL contains `pdf_claim`, never `cs_...`;
   - the address bar is clean before analytics initialize;
   - the exact checked-out deal exports automatically;
   - copying the return URL to another tab/browser cannot redeem;
   - a failed PDF generation can retry from the original tab;
   - after the 24-hour recovery window, the ledger rejects replay.
4. Review PostHog/Sentry/Vercel telemetry for historical sensitive query
   values and delete them under the providers' retention tooling if required.

If new sales are ever reconsidered, use the durable-fulfillment runbook and a
separately approved test-mode activation. Do not reactivate either checkout
gate from this historical recovery document.

No live Stripe price, coupon, checkout amount, subscription entitlement, or
webhook configuration is changed by repository code.

## Pack-to-Pro credit and approved refund/dispute policy

The ledger records immutable purchase amount/currency and credit audit fields
(`status`, policy version, amount, eligibility expiry, applied timestamp,
external reference, credited user). The credit mechanism remains fail-closed:
only a configured `STRIPE_PACK_CREDIT_900_COUPON_ID` can make an eligible paid
$9 claim available for the 30-day first-Pro-invoice credit. Historical $5
claims retain paid-report recovery but do not consume a mismatched coupon.
Without that server-only configuration, claims remain `not_configured` and no
credit is promised or applied.

Morgan approved the refund/dispute policy on 2026-08-24. The retained
historical flow enforces it as follows:

- every report verification, recovery, and export re-reads the current Stripe
  Session, Charges, and Disputes;
- a partial or full refund or lost dispute revokes future server-controlled
  report access and prevents a new Pack-to-Pro credit;
- an open dispute suspends report access and blocks credit use at checkout;
- a won dispute restores report access only after a fresh check confirms the
  payment remains paid, captured, and unrefunded;
- refund/dispute webhooks use current Stripe truth, not event order, and
  idempotently move an eligible credit to `denied` or an applied credit to the
  audit-only `reversed` state.

The database row is only a credit candidate. Pro checkout revalidates Stripe
before attaching the configured coupon, so stale eligibility cannot spend
through an unprocessed refund or dispute. A downloaded PDF cannot be recalled,
and the webhook does not remove a coupon from, reprice, cancel, or recreate a
live subscription. The canonical state table and remaining durable-fulfillment
limitations are in `docs/DECISION-PACK-DURABLE-FULFILLMENT-RUNBOOK.md`.

These controls protect historical buyers and billing integrity; they do not
activate new Pack sales or provide durable artifact storage, cross-device
recovery, or email delivery. Both checkout gates must remain disabled until the
durable-fulfillment runbook is implemented and separately approved in test
mode. No eligibility may be inferred from browser storage or client analytics.
