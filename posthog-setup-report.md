<wizard-report>
# PostHog post-wizard report

The wizard completed a deep integration of TrueCap's PostHog analytics. The project already had a solid foundation — `posthog-js` and `posthog-node` were installed, the `PostHogProvider` was wired into `app/layout.tsx` with full cookie-consent and Supabase user identification, and the five core funnel events (`landing_view`, `analyzer_started`, `analysis_completed`, `pro_checkout_started`, `pro_subscribed`) were in place.

This session added five missing events that complete the product story — Pro feature adoption, content sharing, newsletter growth, and churn signals — and wired up environment variables so the SDK can actually send events.

## Changes made

### Environment (`.env.local`)
- `NEXT_PUBLIC_POSTHOG_KEY` — client-side project token
- `NEXT_PUBLIC_POSTHOG_HOST` — `https://us.i.posthog.com`
- `POSTHOG_API_KEY` — server-side project token (used by `posthog-node` in `lib/posthog-server.ts`)

### Event type extension (`lib/analytics.ts`)
Extended the `FunnelEvent` union with three new client-side events: `deal_saved`, `pdf_exported`, `share_link_copied`.

## Events added

| Event | Description | File |
|---|---|---|
| `deal_saved` | Fires on first-time deal save (not updates). Tracks Pro feature adoption. Properties: `property_type`, `purchase_price`, `cap_rate`, `monthly_cash_flow`. | `components/investcalc/investcalc-page.tsx` |
| `pdf_exported` | Fires after a PDF report is successfully generated. High-intent signal. Properties: `property_type`, `purchase_price`, `has_deal_score`. | `components/investcalc/investcalc-page.tsx` |
| `share_link_copied` | Fires when a user copies a read-only share link to clipboard. Properties: `has_address`. | `components/investcalc/share-link-button.tsx` |
| `newsletter_subscribed` | Server-side event fired after a successful Resend audience add. Properties: `source` (footer / blog / homepage / other). | `app/actions/newsletter.ts` |
| `subscription_cancelled` | Server-side event fired in the Stripe webhook when a subscription is deleted. Uses `metadata.user_id` as `distinctId` when available. Properties: `stripe_subscription_id`, `stripe_customer_id`. | `app/api/stripe/webhooks/route.ts` |

## Pre-existing events (already instrumented)

| Event | File |
|---|---|
| `landing_view` | `components/analytics/track-landing-view.tsx` |
| `analyzer_started` | `components/investcalc/investcalc-page.tsx` |
| `analysis_completed` | `components/investcalc/investcalc-page.tsx` |
| `pro_checkout_started` | `app/actions/billing.ts` (server-side) |
| `pro_subscribed` | `app/api/stripe/webhooks/route.ts` (server-side) |

## Next steps

We've built a dashboard and five insights for you to monitor user behavior:

### Dashboard
- [Analytics basics](https://us.posthog.com/project/450000/dashboard/1656330)

### Insights
- [Conversion Funnel: Landing → Pro Subscriber](https://us.posthog.com/project/450000/insights/PSVMPa2U) — 5-step funnel over 90 days
- [Core Funnel Events — Daily Trend](https://us.posthog.com/project/450000/insights/61S6GdG7) — All funnel events as a daily line chart
- [Pro Feature Adoption](https://us.posthog.com/project/450000/insights/qKZ8W4Tu) — `deal_saved`, `pdf_exported`, `share_link_copied` daily trends
- [Newsletter Subscriptions](https://us.posthog.com/project/450000/insights/uF81WamT) — Weekly newsletter subscriber growth
- [Subscriptions vs Cancellations](https://us.posthog.com/project/450000/insights/s0x35SPY) — Net subscription health (new vs cancelled per week)

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-nextjs-app-router/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
