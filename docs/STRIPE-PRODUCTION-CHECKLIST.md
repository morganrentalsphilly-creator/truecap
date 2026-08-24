# TrueCap Stripe production checklist

This runbook covers settings that are intentionally not changed by repository
code. Complete it in Stripe Dashboard without replacing Products, Prices, live
subscriptions, or the pinned API version.

## Safety rules

- Do not edit, archive, migrate, or recreate the grandfathered $20/month Price.
- Do not change any existing Price amount or Price ID.
- Do not move a live subscriber to another Price to test presentation.
- Keep `STRIPE_PRICE_PRO_MONTHLY` ordered as
  `price_current_2999,price_grandfathered_20`. Checkout sells only the first ID;
  webhook resolution recognizes every listed ID.
- Preserve the legacy Price mapping in `plans.stripe_price_id`. The environment
  list and database mapping are complementary recovery paths.
- Use Stripe test mode for Checkout and portal verification. Do not submit a
  real payment.

## Business and public details

In Stripe Dashboard, open Business settings / Public details and confirm:

- Public business name: **TrueCap** (never “True Cap”).
- Support email: **hello@usetruecap.com**.
- Privacy policy: **https://usetruecap.com/privacy**.
- Terms of service: **https://usetruecap.com/terms**.
- Refund policy matches the live Terms: charges are non-refundable except where
  required by law; billing errors are reviewed through support.
- Do not advertise the Five-Deal Guarantee while
  `NEXT_PUBLIC_FIVE_DEAL_GUARANTEE=false` or before counsel and refund operations
  approve it.

## Checkout branding

Repository code supplies these supported hosted-Checkout settings for both
subscription and Decision Pack sessions:

- Display name: **TrueCap**
- Background: **#F7FAFC**
- Primary button: **#0B3B60**
- Font: **Inter**
- Border: **Rounded**
- Logo: `https://usetruecap.com/Logo-png-w.png`
- Icon: `https://usetruecap.com/apple-icon.png`

Stripe-hosted Checkout does not expose separate session parameters for the
requested accent/link, success, warning, or error colors. Stripe controls those
semantic colors. Keep the account-level branding compatible with:

- Accent/link: **#0B66C3**
- Success: **#117A4A**
- Warning: **#B45309**
- Error: **#B42318**

Preview one subscription Checkout in test mode. Confirm the name, wordmark,
icon, contrast, mobile layout, Terms and Privacy links, amount, cadence, trial
terms, and return links. Cancel the session before payment. New Decision Pack
checkout is intentionally disabled; do not re-enable it for this review.

## Product and Price inventory

Record the live Product ID and every Price ID for these mappings. The repository
uses Price IDs, while Product names remain Dashboard presentation:

| Product display name | Runtime slot | Expected public offer |
| --- | --- | --- |
| TrueCap Pro | `STRIPE_PRICE_PRO_MONTHLY` | Standard $29.99/month first; grandfathered $20/month appended |
| TrueCap Pro | `STRIPE_PRICE_PRO_ANNUAL` | Current annual Price |
| Agent Pro | `STRIPE_PRICE_AGENT_PRO_MONTHLY` | Current monthly Price; tier hidden when unset |
| Agent Pro | `STRIPE_PRICE_AGENT_PRO_ANNUAL` | Current annual Price |
| Decision Pack | `STRIPE_PRICE_PDF_ONE_TIME` | Historical $5 mapping; not offered for new checkout |
| Decision Pack experiment | `STRIPE_PRICE_SINGLE_DEAL_9` | Dormant; do not activate |
| Decision Pack experiment | `STRIPE_PRICE_SINGLE_DEAL_19` | Dormant; do not activate |

Renaming a Stripe Product’s display text is safe only when the existing Product
and Price relationship remains intact. Never replace a Product or Price merely
to rename “TrueCap Premium” or another legacy label.

Cross-check each recurring Price against both its Vercel environment slot and
the `plans` row. Confirm the current Price is first in each comma list. Confirm
the $20 Price remains recognized but is never first and never offered to new
checkout sessions.

## Customer Portal

Open Customer Portal configuration and confirm:

- Headline: **Underwrite rentals. Know your number.**
- Privacy and Terms URLs match the public URLs above.
- Default return URL: **https://usetruecap.com/profile**.
- Payment-method updates and invoice history are enabled.
- Cancellation is enabled at period end, not immediate.
- Cancellation reasons are enabled.
- Subscription updates use the intended proration policy.
- Every current target Price used by the in-app plan switcher is listed under
  the correct Product. The deep-linked switch flow fails when a target Price is
  absent.
- The grandfathered $20 Price is not a switch target.

For stronger grandfathering protection, create a separate portal configuration
for $20 customers with payment methods, invoices, and cancellation enabled but
subscription updates disabled. Its headline should explain that changing plans
ends the protected rate. Wiring a separate configuration ID into portal-session
creation is optional follow-up work; the in-app profile already displays the
protected-rate warning.

## Return and lifecycle verification

- Subscription success URL returns to
  `/?billing=success&session_id={CHECKOUT_SESSION_ID}`.
- Subscription cancellation returns to
  `/pricing?billing=checkout_cancelled#plans`.
- Portal returns to `/profile`; cancel/switch deep links return with their
  existing billing status query parameters.
- New Decision Pack checkout remains disabled. Verify existing paid-claim
  recovery through the automated tests or a previously paid test-mode claim;
  do not submit a new payment. Current claims return as `pdf_claim=<uuid>` and
  cancellation uses `pdf_purchase=cancelled`; legacy Session-id returns fail
  closed.
- Confirm the webhook endpoint receives its subscribed event set in test mode.
  Do not change signature verification or rotate the webhook secret as part of
  this branding review.
- Confirm a test checkout emits the canonical, PII-free funnel sequence:
  `pricing_viewed` → `checkout_started` → `checkout_returned` →
  `subscription_activated`.

`pay.usetruecap.com` is an optional later enhancement and is not required for
production Checkout or portal correctness.
