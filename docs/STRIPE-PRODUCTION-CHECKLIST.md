# TrueCap Stripe production checklist

This runbook covers settings that are intentionally not changed by repository
code. Complete it in Stripe Dashboard without replacing Products, Prices, live
subscriptions, or the pinned API version.

## What this document is, and what it is not

It is a runbook for the presentation settings in Stripe Dashboard (public
details, Checkout branding, the Product and Price inventory, the Customer
Portal) and for the Decision Pack refund and dispute path. It was written for
a branding review. It is not a launch checklist, and passing it does not show
that billing is ready for paid traffic. Read against the code on 2026-10-02
(go-to-market audit, row P2-133), it leaves these out:

- **The Stripe account is shared with a second product**
  (`docs/site-overhaul.md`, Phase 1). On 2026-10-01 the daily reconcile log
  counted 35 subscriptions on the account, 31 of them the other product's.
  "Public business name", the support details and the Customer Portal
  headline below are account-wide settings, so changing them changes them
  for that product too. The code brands the hosted Checkout page per session
  and nothing else: it sets no statement descriptor, and it opens the portal
  without a configuration id, so the account's default portal applies.
- **Receipts, invoice emails and the statement descriptor are not covered.**
  The application sends no receipt or confirmation email of its own after a
  purchase (the webhook can only schedule the legacy trial onboarding
  sequence, and Checkout is created without a trial). Whether a buyer gets a
  receipt, what business details it shows, and the name on the card
  statement are Dashboard settings this document never asks anyone to check.
- **The webhook event list is partial.** "Return and lifecycle verification"
  names seven refund and dispute events. The handler
  (`app/api/stripe/webhooks/route.ts`) dispatches 31 event types, listed
  below; an endpoint subscribed only to the seven would never deliver a
  completed Checkout, a subscription change or a paid invoice.
- **There is no Stripe test mode for this project.** The steps below that say
  "in test mode" or "a test checkout" cannot be run as written: no test-mode
  keys are kept, by the founder's decision. They are left as they were
  written. What may be verified in live mode without a payment has not been
  decided, so nothing here replaces them.

Event types the webhook handler dispatches, from its `case` labels
(`lib/__tests__/stripe-checklist-doc.test.ts` fails if this list and the
handler drift apart):

- Checkout: `checkout.session.completed`,
  `checkout.session.async_payment_succeeded`, `checkout.session.expired`
- Subscriptions: `customer.subscription.created`,
  `customer.subscription.updated`, `customer.subscription.deleted`,
  `customer.subscription.paused`, `customer.subscription.resumed`,
  `customer.subscription.trial_will_end`,
  `customer.subscription.pending_update_applied`,
  `customer.subscription.pending_update_expired`
- Invoices: `invoice.paid`, `invoice.payment_succeeded`,
  `invoice.payment_failed`, `invoice.payment_action_required`,
  `invoice_payment.paid`
- Refunds: `charge.refunded`, `charge.refund.updated`, `refund.created`,
  `refund.updated`
- Disputes: `charge.dispute.created`, `charge.dispute.updated`,
  `charge.dispute.closed`, `charge.dispute.funds_withdrawn`,
  `charge.dispute.funds_reinstated`
- Catalog: `price.created`, `price.updated`, `price.deleted`,
  `plan.created`, `plan.updated`, `plan.deleted`

## Safety rules

- Do not edit, archive, migrate, or recreate the grandfathered $20/month Price.
- Do not change any existing Price amount or Price ID.
- Do not move a live subscriber to another Price to test presentation.
- Keep `STRIPE_PRICE_PRO_MONTHLY` ordered as
  `price_current_2999,price_grandfathered_20`. Checkout sells only the first ID;
  webhook resolution recognizes every listed ID.
- Preserve the legacy Price mapping in `plans.stripe_price_id` for webhook and
  completed-return recovery. It never authorizes a new checkout; only the first
  Price in the exact cadence's environment list can be sold.
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
- Do not advertise a public refund guarantee. Guarantee release is currently
  hard-disabled in `lib/marketing-offer-config.ts` pending explicit counsel and
  refund-operations approval.

## Checkout branding

Repository code supplies these supported hosted-Checkout settings for
subscription sessions. The retained historical Decision Pack constructor uses
the same settings, but its creation gates must remain off while new Pack sales
are temporarily unavailable:

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

| Product display name     | Runtime slot                     | Expected public offer                                         |
| ------------------------ | -------------------------------- | ------------------------------------------------------------- |
| TrueCap Pro              | `STRIPE_PRICE_PRO_MONTHLY`       | Standard $29.99/month first; grandfathered $20/month appended |
| TrueCap Pro              | `STRIPE_PRICE_PRO_ANNUAL`        | Current annual Price                                          |
| Agent Pro                | `STRIPE_PRICE_AGENT_PRO_MONTHLY` | Current monthly Price; tier hidden when unset                 |
| Agent Pro                | `STRIPE_PRICE_AGENT_PRO_ANNUAL`  | Current annual Price                                          |
| Decision Pack            | `STRIPE_PRICE_PDF_ONE_TIME`      | Historical $5 mapping; not offered for new checkout           |
| Decision Pack experiment | `STRIPE_PRICE_SINGLE_DEAL_9`     | Dormant; do not activate                                      |
| Decision Pack experiment | `STRIPE_PRICE_SINGLE_DEAL_15`    | Dormant; do not activate                                      |
| Decision Pack experiment | `STRIPE_PRICE_SINGLE_DEAL_19`    | Dormant; do not activate                                      |

Renaming a Stripe Product’s display text is safe only when the existing Product
and Price relationship remains intact. Never replace a Product or Price merely
to rename “TrueCap Premium” or another legacy label.

Cross-check each recurring Price against both its Vercel environment slot and
the `plans` row. Treat the database value as recovery metadata, never as new-
checkout authority. Confirm the current Price is first in each comma list.
Confirm the $20 Price remains recognized but is never first and never offered
to new checkout sessions.

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

- Subscription success URL is
  `/api/billing/return?session_id={CHECKOUT_SESSION_ID}`
  (`app/actions/billing.ts`). That route handler stores the Session id in a
  short-lived httpOnly cookie and redirects (303) to
  `/dashboard/new?billing=success`, so the id is never in the URL of the page
  the buyer lands on (`lib/stripe/checkout-return-cookie.ts`).
- Subscription cancellation returns to
  `/pricing?billing=checkout_cancelled#plans`.
- Portal returns to `/profile`; cancel/switch deep links return with their
  existing billing status query parameters.
- New Decision Pack checkout remains disabled. Verify existing paid-claim
  recovery through the automated tests or a previously paid test-mode claim;
  do not submit a new payment. Current claims return as `pdf_claim=<uuid>` and
  cancellation uses `pdf_purchase=cancelled`; legacy Session-id returns fail
  closed.
- A partial refund, full refund, or lost dispute revokes future report access,
  recovery, delivery, and Pack-to-Pro credit eligibility. Suspend those rights
  while a dispute is open. Historical browser-bound verification and PDF export
  now re-read the current Checkout Session, Charge refund total, and Dispute
  status on every request and fail closed if Stripe cannot confirm safe access.
  New Pack sales remain disabled; do not re-enable them to test this path.
- Confirm the webhook endpoint receives `charge.refunded`,
  `charge.refund.updated`, `refund.created`, `refund.updated`,
  `charge.dispute.created`, `charge.dispute.updated`, and
  `charge.dispute.closed` in test mode. Funds-withdrawn/reinstated dispute
  events are also handled defensively. These events wake idempotent current-
  state reconciliation; event arrival order is never used as authority.
  A refund or lost dispute changes an already-applied Pack credit's audit state
  to `reversed` and creates one pending row in the server-only
  `decision_pack_credit_adjustments` queue; this does **not** remove a coupon
  from, charge a customer, reprice, or otherwise mutate an existing live
  subscription. Any financial adjustment is a separate support/accounting
  action and must preserve all live Price IDs.
- Before deploying the matching webhook code, clone-test and apply
  `20260825120000_decision_pack_credit_adjustments.sql`. Run it twice in the
  clone, then verify production has zero reversed claims without an adjustment
  row. Record the migration's pending backfill count without customer data.
- Route the exact Sentry warning `Decision Pack reversed credit requires
operational adjustment` to the billing-operations owner. One warning is
  emitted only when a unique pending row is first created; webhook retries do
  not duplicate it.
- Review every pending adjustment. Mark it `completed` only after the approved
  external adjustment is verified, or `waived` only with an explicit approval
  reference. Both terminal states require a non-PII resolution reference, note,
  and timestamp and cannot be reopened or deleted. See the durable-fulfillment
  runbook for the verification and resolution SQL.
  Do not change signature verification or rotate the webhook secret as part of
  this branding review.
- Confirm a test checkout emits the current PII-free lifecycle sequence:
  `upgrade_started` after a new hosted Checkout is durably created,
  `checkout_returned` after the verified return, and `subscription_started`
  after successful Stripe synchronization. Legacy compatibility events may
  remain independently allowlisted but must not duplicate the canonical
  transition.

`pay.usetruecap.com` is an optional later enhancement and is not required for
production Checkout or portal correctness.
