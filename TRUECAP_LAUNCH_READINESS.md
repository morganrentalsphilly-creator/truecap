# TrueCap launch readiness — 2026-10-26

**Technical verification is in progress. The business is not market-validated.** See TRUECAP_QA.md for exact release evidence and TRUECAP_IMPLEMENTATION.md for rollback.

## Positioning and offer

Lead with agents screening one rental for multiple clients, transparent assumptions and target-dependent Offer Ceilings. Keep a meaningful free first decision and paid continuity through saved deals, comparisons and reports. Existing agent-first homepage, sample and methodology already demonstrate this. No unsupported speed, verified-data or superiority claim should be added.

Keep Pro $29.99/month or $300/year; Agent Pro $59.99/month or $590/year. Keep 21 days, three property analyses and one comparison, with same-property revisions no longer using another slot. No discount, subscription entitlement or live Stripe Price change is approved here.

**Owner decision:** 100 clients currently share 12 Buy Boxes. Recommend testing 100 Agent Pro boxes (one per client), retaining 12 Pro boxes, after production capacity review and explicit allowance approval. Limits are centralized but unchanged. Do not advertise unlimited client criteria.

## Data economics

Existing HUD/FRED results are benchmarks, not verified property rents or investor loan quotes. Failures retain manual input. Optional RentCast paths use durable reservation budgets; repository default is 50 requests per billing period, existing user caps and a 30-day property cache. Account contract, active credentials, caching/display rights and invoices need owner/provider verification before increasing traffic or advertising coverage.

This release adds no paid API calls. Manual evidence costs zero provider requests, plus existing hosting/storage costs. Automated marginal cost is uncached requests × contracted rate plus hosting/storage; the actual contract rate is unavailable and must not be invented.

Public provider prices checked October 26: Developer $0/50 requests, $0.20 overage; Foundation $74/1,000, $0.06 overage; Growth $199/5,000, $0.03 overage; Scale $449/25,000, $0.015 overage. These are advertised API rates, not this account's invoice. Two uncached requests beyond Developer quota would cost $0.40; cache hits make no provider request. [RentCast API pricing](https://www.rentcast.io/api). The provider does not enforce hard caps, which makes TrueCap's durable application budget important. [Billing documentation](https://developers.rentcast.io/reference/billing-and-pricing).

Published API terms permit storage and third-party display/distribution subject to restrictions and underlying third-party rights. This supports continued evaluation of the existing integration; it does not establish this account's subscription or compliance with every applicable use restriction. No new agreement was accepted. [RentCast API terms](https://www.rentcast.io/terms-api).

Search Console, PostHog dashboard, Sentry project, provider billing and a live Stripe purchase were not inspected. Instrumentation is retained with new workflow events; actual production ingestion and commercial delivery require separate evidence.

## Customer validation

Use `docs/readiness-2026-10/customer-testing.md` and `tester-scorecard.csv` for 10–15 consenting testers: roughly 7–9 investor-focused agents and 3–6 rental investors. Use real listings with permission. Keep addresses and financial details out of aggregate scorecards. These files do not authorize outreach.

Measure first-screen time, unassisted success, assumption comprehension, repeat analysis, client-match/report completion, preference and willingness to pay. Report medians, ranges, sample size and failures. Do not advertise the two-minute target until observed.

Use existing consent-aware PostHog events for landing → start → activation → save → Buy Box → client match → report → evaluation → checkout → server-confirmed subscription → repeat property. Segment by role/source; consent opt-outs and blockers make the observed funnel incomplete. Do not transmit addresses, rents, client names, notes or documents.

## Remaining gates

- Final CI, migration replay, authenticated flows, additive production SQL, deployment and live smoke.
- Final responsive/Lighthouse measurement. Performance 90+ and LCP <2.5s are targets until observed; lab checks do not establish field CWV.
- Actual tester evidence and provider contracts/costs before demand, pricing or coverage claims.
- Owner decision on Agent Pro Buy Box allowance.
- Professional review of privacy/terms/disclaimers; no legal assurance or compliance certification implied.
- Manual references remain private worksheet evidence. PDFs carry complete client criteria and existing source disclosures; public links carry frozen financial targets without private client identity.

## Demonstration

Guided sample: https://usetruecap.com/analyze?sample=1. Representative report: https://usetruecap.com/sample-decision-memo. Methodology: https://usetruecap.com/methodology. Agent journey: https://usetruecap.com/for-agents. Smoke-test after deployment. Synthetic QA reports are demonstrations, never customer results or verified property evidence.

Synthetic local compute benchmark (three runs, 100 clients): 12 boxes 25–39ms; proposed 100 boxes 157–189ms, including an IRR-target variant. No allowances changed. This excludes database/network/rendering and does not establish production latency.
