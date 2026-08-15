# TrueCap offer configuration

The repositioned offer is configured independently from Stripe billing so a
copy test cannot silently reprice a customer.

## Marketing experiments

- `NEXT_PUBLIC_TRUECAP_HOMEPAGE_HEADLINE=a|b`
  - `a` (default): “Screen any rental in 60 seconds. Know your max offer before you make one.”
  - `b`: “Know exactly what a rental is worth to you.”
- `NEXT_PUBLIC_TRUECAP_PRO_NAME=pro|offer_engine`
  - `pro` (default): “TrueCap Pro”
  - `offer_engine`: “TrueCap Offer Engine”
- `NEXT_PUBLIC_SINGLE_DEAL_PRICE_VARIANT=current|p9|p19`
  - `current` (default) keeps the production $5 Stripe Price.
  - `p9` requires `STRIPE_PRICE_SINGLE_DEAL_9`.
  - `p19` requires `STRIPE_PRICE_SINGLE_DEAL_19`.
- `NEXT_PUBLIC_FIVE_DEAL_GUARANTEE=true|false`
  - Off by default. Enable only after the refund policy and support workflow
    have been approved. It never guarantees investment performance.

## Safe pricing activation

Create the matching one-time Stripe Price first, add its server-only Price id,
then set the public variant in the same deployment. The checkout action returns
a configuration error instead of falling back to a differently priced product
when an experimental Price id is missing.

Subscription prices and product ids are unchanged. They continue to come from
`STRIPE_PRICE_PRO_MONTHLY` and `STRIPE_PRICE_PRO_ANNUAL`; changing the Pro name
only changes marketing copy.
