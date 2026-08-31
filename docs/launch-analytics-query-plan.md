# TrueCap launch analytics query plan

**Owner:** Growth + Product  
**Contract:** `lib/analytics-event-dictionary.ts`  
**Collection:** PostHog browser events are consent-gated; billing and durable
account events use the server wrapper. Documented events use the dictionary's
exact property allowlist. Deprecated funnel names remain only as typed
dashboard-migration vocabulary and are not emitted beside canonical events.
Any other unknown event still fails closed to no caller-supplied properties.

This is the launch dashboard specification. It can be implemented in PostHog
without changing event names or inspecting underwriting inputs.

## Metric definitions

| Metric                    | Numerator event                                            | Denominator / predecessor    | Required breakdown                             |
| ------------------------- | ---------------------------------------------------------- | ---------------------------- | ---------------------------------------------- |
| Landing visits            | `landing_view`                                             | unique sessions              | coarse route only                              |
| Hero submit rate          | `hero_address_submit`                                      | `landing_view`               | device class                                   |
| Analysis completion       | `analysis_completed`                                       | `analysis_started`           | route category, calculator slug                |
| Offer Ceiling engagement  | `offer_ceiling_viewed`                                     | `analysis_completed`         | access level, readiness, feasible/not feasible |
| Verification engagement   | `material_input_verified` or `verification_task_completed` | `offer_ceiling_viewed`       | source class / evidence level                  |
| Meaningful edit rate      | `material_assumption_overridden`                           | `analysis_completed`         | field group and source only                    |
| Save rate                 | `deal_saved`                                               | `analysis_completed`         | new versus update                              |
| Account creation          | `account_created`                                          | `save_prompt_shown`          | referral source                                |
| Second-deal activation    | `second_deal_completed`                                    | `account_created`            | completion within the 21-day evaluation        |
| Comparison activation     | `comparison_completed`                                     | `second_deal_completed`      | two, three, or four deals                      |
| Evaluation comparison use | `evaluation_comparison_used`                               | `product_evaluation_started` | count bucket                                   |
| Report use                | `report_viewed` / `pdf_exported`                           | `analysis_completed`         | report type only                               |
| Upgrade exposure          | `paywall_viewed` or `upgrade_modal_viewed`                 | `analysis_completed`         | trigger / placement                            |
| Checkout start            | `upgrade_started`                                          | upgrade exposure             | plan identifier, referral source               |
| Evaluation start          | `product_evaluation_started`                               | `account_created`            | source                                         |
| Subscription start        | `subscription_started`                                     | `upgrade_started`            | plan identifier, referral source               |
| Cancellation              | `subscription_cancelled`                                   | `subscription_started`       | plan and effective timing                      |

The no-card 21-day product evaluation is not a Stripe trial. Legacy
`trial_started` events may remain for grandfathered Stripe subscriptions and
must be excluded from the launch-offer funnel.

## Saved PostHog insights

1. **Paid-ad acquisition funnel (14-day conversion window):**
   `landing_view` → `hero_address_submit` → `analysis_started` →
   `analysis_completed` → `offer_ceiling_viewed` → `account_created` →
   `second_deal_completed` → `comparison_completed` →
   `upgrade_started` → `subscription_started`.
   Use unique users, ordered steps, and split only by the allowlisted
   `referral_source` taxonomy. Raw UTM values, campaign names, referrer hosts,
   landing paths, and query strings are not retained.
2. **First-value speed:** median and p75 time from `account_created` to
   `first_value_within_24h`; report the share completed within 24 hours.
3. **Evaluation utilization:** unique accounts with one, two, and three
   `evaluation_deal_completed` events; comparison use; and conversion before
   versus after the evaluation expires.
4. **Decision quality:** Offer Ceiling view → verified material input → saved
   decision → memo export. Break down only by readiness stage and coarse
   property type; never by price, rent, address, or loan terms.
5. **Commercial health:** checkout-start rate, checkout-to-activation rate,
   monthly versus annual mix, cancellation rate, and involuntary-failure rate.
   Stripe webhooks remain the authority for paid state.

## Retention definitions

Create two retention insights using `account_created` as the cohort event and
any of these authenticated value events as the return event:
`evaluation_deal_completed`, `deal_saved`, `comparison_completed`,
`material_input_verified`, or `decision_memo_generated`.

- **30-day product retention:** return event during days 30–59 after account
  creation.
- **90-day product retention:** return event during days 90–119 after account
  creation.

Also chart `retained_30d` and `retained_90d`. Those are cumulative, once-per-
browser milestones emitted on the first authenticated visit on or after the
threshold. They are an operational cross-check, not the canonical cohort
metric, because cleared storage and another device can affect deduplication.

## Privacy and data-quality checks

- Alert if an event property is rejected by the runtime sanitizer in test or
  if a new event lacks a dictionary definition.
- Never send exact address, email, phone, price, rent, tax, loan amount,
  document text, share token, customer/Stripe IDs, URL query values, nested
  payloads, or raw calculation inputs.
- Use the opaque Supabase user UUID only as PostHog `distinct_id`; do not add it
  as an event property.
- Exclude internal/staging traffic through PostHog cohorts, not a customer-data
  property.
- Review event volume, unknown-event share, duplicate billing events, and the
  gap between server-authoritative `subscription_started` and client return
  events weekly for the first month.

## Go-live checklist

- Set `NEXT_PUBLIC_POSTHOG_KEY`, `POSTHOG_API_KEY`, and the correct host in the
  deployment environment; the project token is not a personal Query API key.
- Confirm consent granted/denied behavior in a production-like environment.
- Trigger one synthetic, non-financial test path and verify each funnel event
  and its allowed properties.
- Build the five saved insights above, add owner alerts, and record the dashboard
  URL in the launch runbook. No live PostHog mutation is performed by this
  remediation branch.
