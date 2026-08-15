# Grand Slam acquisition funnel

The canonical PostHog funnel is deliberately based on named, PII-free events.
Do not attach an address, listing URL, customer name, or email to these events.

| Step | Event | Success question |
| --- | --- | --- |
| Homepage | `homepage_viewed` | Did a visitor reach the address-first offer? |
| Start | `analyzer_started` / `address_submitted` | Did they begin a real screen? |
| Screen | `analyzer_completed` | Did the deterministic first-pass analysis finish? |
| Decision | `verdict_viewed` | Did the decision-first result render? |
| Trust | `optional_section_opened` / `result_assumptions_edited` | Did they review or replace assumptions? |
| Monetization moment | `max_offer_teaser_viewed` | Did a Free user see the locked acquisition question? |
| Intent | `max_offer_unlock_clicked` / `single_deal_checkout_started` / `pro_checkout_started` | Which paid path did they choose? |
| Purchase | `single_deal_checkout_completed` / `pro_trial_started` / `pro_subscription_started` | Did checkout create paid access? |
| Value realization | `max_offer_unlocked` / `stress_test_opened` / `report_generated` | Did the buyer use the promised decision output? |
| Activation | `buy_box_created` / `deal_saved` / `comparison_started` / `onboarding_step_completed` | Did the workflow become reusable? |

Recommended retention cohorts:

1. second `analyzer_completed` within 7 days;
2. a saved deal plus Max Offer or stress test within 7 days;
3. two or more completed screens in the next billing period.

## Public analysis counter

An **analysis run** is a successful recorded invocation of the analyzer run
counter—not a unique address, property, user, save, report, or closed deal.
The public all-time display is the live `app_counters.analysis_runs` value plus
the approved 50,000 historical baseline. The baseline is presentation-only;
rolling 7-day and 30-day values remain raw. Never describe this number as
customers, properties purchased, offers, or transactions.
