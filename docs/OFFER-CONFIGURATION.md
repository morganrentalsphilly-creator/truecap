# TrueCap offer configuration

The repositioned offer is configured independently from Stripe billing so a
copy test cannot silently reprice a customer.

## Marketing experiments

- `NEXT_PUBLIC_TRUECAP_HOMEPAGE_HEADLINE=a|b`
  - `a` (default): “Screen any rental in 60 seconds. Know the highest price that still works.”
  - `b`: “Know exactly what a rental is worth to you.”
- `NEXT_PUBLIC_TRUECAP_PRO_NAME=pro|offer_engine`
  - `pro` (default): “TrueCap Pro”
  - `offer_engine`: “TrueCap Offer Engine”
- `NEXT_PUBLIC_SINGLE_DEAL_PRICE_VARIANT=current|p9|p15|p19`
  - `current` (default) keeps the production $5 Stripe Price.
  - `p9` requires `STRIPE_PRICE_SINGLE_DEAL_9`.
  - `p15` requires `STRIPE_PRICE_SINGLE_DEAL_15`.
  - `p19` requires `STRIPE_PRICE_SINGLE_DEAL_19`.
- `NEXT_PUBLIC_TRUECAP_THREE_DEAL_GUARANTEE=true|false`
  - Off by default and still renders nothing unless
    `NEXT_PUBLIC_TRUECAP_GUARANTEE_TERMS_URL` is a valid HTTPS or local URL.
  - Enable only after the refund policy and support workflow have been
    approved. It never guarantees investment performance.
- `NEXT_PUBLIC_FIVE_DEAL_GUARANTEE` remains a disabled legacy compatibility
  switch; do not activate both offers.

### Guarantee activation gate

All of the following require business/operations approval before the flag can
be enabled:

1. Terms and refund-policy language matching the visible guarantee copy.
2. A support owner and a documented way to verify three/five real analyses
   during the first 30 paid days without asking for sensitive property data.
3. A Stripe first-month refund runbook, including partial/annual-plan handling.
4. Fraud/abuse rules and an escalation path for edge cases.
5. Monitoring for `guarantee_viewed`, claims, approvals, denials, and churn.

Until all five are in place, the component renders nothing and the existing
non-refundable Terms remain controlling.

## Safe pricing activation

Create the matching one-time Stripe Price first, add its server-only Price id,
then set the public variant in the same deployment. The checkout action returns
a configuration error instead of falling back to a differently priced product
when an experimental Price id is missing.

Subscription prices and product ids are unchanged. They continue to come from
`STRIPE_PRICE_PRO_MONTHLY` and `STRIPE_PRICE_PRO_ANNUAL`; changing the Pro name
only changes marketing copy.

## Public deal counter

The homepage all-time run counter displays the measured
`app_counters.analysis_runs` value plus the owner-attested 50,000 historical
analysis-run baseline. The baseline is presentation-only; it does not modify
the stored counter. Rolling 7-day and 30-day saved-deal counters continue to
display their raw measured values. One run is one analyzer invocation, not a
unique property, user, customer, offer, or transaction. The display rule and
regression guard live in `lib/stats/analysis-runs-display.ts`.
