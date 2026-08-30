# Privacy-safe passive-growth funnel

The canonical runtime contract is `lib/analytics-event-dictionary.ts`.
Still-active non-funnel callers have exact transitional allowlists in
`lib/analytics-active-event-definitions.ts`; an event absent from both fails
closed. Browser events use `trackEvent`; durable account and billing
transitions use `captureServerEvent`. Analytics failures are best-effort and must never change
product, checkout, webhook, sharing, or report behavior.

## Canonical events

| Product transition                                                   | Event                        | Allowed properties                                     |
| -------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------ |
| Valid analysis begins                                                | `analysis_started`           | `route_category`, `calculator_slug`, `referral_source` |
| Analysis result succeeds and is committed to the UI                  | `analysis_completed`         | `route_category`, `calculator_slug`, `referral_source` |
| Account creation succeeds                                            | `account_created`            | `referral_source`                                      |
| Product evaluation begins                                            | `product_evaluation_started` | `referral_source`                                      |
| A new hosted upgrade checkout is created                             | `upgrade_started`            | `plan_identifier`, `referral_source`                   |
| Stripe checkout is successfully synchronized                         | `subscription_started`       | `plan_identifier`, `referral_source`                   |
| A CTA on editorial/tool content is clicked                           | `content_cta_clicked`        | `route_category`, `content_type`, `referral_source`    |
| An embedded result CTA is clicked                                    | `embed_cta_clicked`          | `calculator_slug`, `referral_source`                   |
| A public analysis is rendered                                        | `shared_analysis_opened`     | `referral_source`                                      |
| A revocable public analysis is saved as a new recipient-owned record | `shared_analysis_copied`     | `referral_source`                                      |

Do not emit historical aliases beside these events. Compatibility event names
may remain in the TypeScript vocabulary while dashboards migrate, but unknown
events receive no caller-supplied properties.

## Privacy and consent

- Never attach addresses, listing URLs, property values, financing inputs,
  calculation outputs, report/document contents, names, email addresses,
  share tokens, database IDs, or Stripe IDs.
- Funnel dimensions are anonymous taxonomy values only. PostHog's opaque
  account UUID remains the authenticated `distinct_id`, never an event field.
- Browser first-touch attribution stores only `referral_source`, using the
  fixed taxonomy `direct`, `organic_search`, `organic_ai`, `organic_social`,
  `paid_search`, `paid_social`, `email`, `external_referral`, or `campaign`.
  Raw UTM values, referrer hosts, landing paths, and queries are neither stored
  nor merged into later events. An explicit in-product source such as
  `opaque_share` or `embed` overrides first touch on that event only.
- Browser events remain subject to the existing PostHog opt-in consent state.
  GTM/Google Consent Mode and Vercel route suppression remain separate.
- Server-authoritative account/billing lifecycle events do not read browser
  localStorage. They are limited to coarse account-aggregate fields and must be
  documented separately from consented browser behavior.
- Stripe/customer IDs may be used locally for idempotency but are never sent
  in PostHog, Google, or dataLayer event properties.

## Success and deduplication boundaries

- Analysis completion follows validated calculation and visible result state.
- Upgrade start follows creation and durable recording of a new Stripe-hosted
  session; resuming an existing checkout emits nothing.
- Subscription start follows successful webhook synchronization and inherits
  a hashed per-Checkout-session database claim. Existing billing and intent
  synchronization still runs for an unpaid `checkout.session.completed`; only
  the analytics success event waits for `async_payment_succeeded`. The first
  paid/no-payment-required delivery can claim and emit the event. Apply
  migration `20260829113000_canonical_analytics_event_claims.sql` before the
  application release for the database at-most-once boundary. If the telemetry
  claim store is unavailable, billing still succeeds and capture falls back to
  a deterministic opaque PostHog event UUID so delivery replay cannot inflate
  the funnel. A won claim is released after a local capture failure so a later
  provider replay can retry telemetry.
- New Google OAuth account/evaluation events use the same hashed claim table,
  keyed by event plus the opaque user UUID. The base claim-table migration
  includes the complete canonical event allowlist; parallel or replayed
  callbacks then emit each transition at most once.
- Shared copy follows a successful insert owned by the authenticated recipient
  and re-resolves the share at write time so revoked links cannot copy.
