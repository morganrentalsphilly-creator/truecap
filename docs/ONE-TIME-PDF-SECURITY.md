# One-time Deal Decision Pack security and rollout

## What changed

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

## Required rollout order

1. Review and apply
   `supabase/migrations/20260815150000_one_time_pdf_purchase_claims.sql`.
2. Deploy the matching application code. Do not deploy the action first: it
   intentionally fails closed when the ledger is unavailable.
3. Run one Stripe test-mode purchase in the same tab and verify:
   - the success URL contains `pdf_claim`, never `cs_...`;
   - the address bar is clean before analytics initialize;
   - the exact checked-out deal exports automatically;
   - copying the return URL to another tab/browser cannot redeem;
   - a failed PDF generation can retry from the original tab;
   - after the 24-hour recovery window, the ledger rejects replay.
4. Review PostHog/Sentry/Vercel telemetry for historical sensitive query
   values and delete them under the providers' retention tooling if required.

No Stripe price, coupon, checkout amount, subscription entitlement, or webhook
signature/dispatch logic changed.

## Dormant 100% purchase-credit hook

The ledger records immutable purchase amount/currency and includes dormant
credit audit fields (`status`, policy version, amount, eligibility expiry,
applied timestamp, external reference, credited user). The pure
`evaluateOneTimePdfProCredit` helper only returns eligibility when a caller
supplies an explicit enabled policy; the current product always writes
`not_configured` and applies nothing.

Before activation, the founder must approve:

- eligibility window and whether it runs from payment or redemption;
- whether anonymous buyers must sign in and explicitly claim the purchase;
- monthly vs annual Pro eligibility, currency/tax treatment, and stacking;
- Stripe mechanism (single-use promotion code, invoice/customer balance, or
  application-managed discount) and idempotency reference;
- refund, dispute, chargeback, expiration, and already-subscribed handling;
- customer-facing terms and support override/audit procedure.

Activation must add server-authoritative billing integration and tests. It
must not infer eligibility from browser storage or client analytics.
