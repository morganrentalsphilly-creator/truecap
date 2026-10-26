# TrueCap launch readiness — 2026-10-26

**Technical verification is in progress. The business is not market-validated.** See TRUECAP_QA.md for exact release evidence and TRUECAP_IMPLEMENTATION.md for rollback.

## Positioning and offer

Lead with agents screening one rental for multiple clients, transparent assumptions and target-dependent Offer Ceilings. Keep a meaningful free first decision and paid continuity through saved deals, comparisons and reports. Existing agent-first homepage, sample and methodology already demonstrate this. No unsupported speed, verified-data or superiority claim should be added.

Keep Pro $29.99/month or $300/year; Agent Pro $59.99/month or $590/year. Keep 21 days, three property analyses and one comparison, with same-property revisions no longer using another slot. No discount, subscription entitlement or live Stripe Price change is approved here.

**Owner decision:** 100 clients currently share 12 Buy Boxes. Recommend testing 100 Agent Pro boxes (one per client), retaining 12 Pro boxes, after bulk-screen performance checks and explicit allowance approval. Limits are centralized but unchanged. Do not advertise unlimited client criteria.

## Data economics

Existing HUD/FRED results are benchmarks, not verified property rents or investor loan quotes. Failures retain manual input. Optional RentCast paths use durable reservation budgets; repository default is 50 requests per billing period, existing user caps and a 30-day property cache. Account contract, active credentials, caching/display rights and invoices need owner/provider verification before increasing traffic or advertising coverage.

This release adds no paid API calls. Manual evidence costs zero provider requests, plus existing hosting/storage costs. Automated marginal cost is uncached requests × contracted rate plus hosting/storage; the actual contract rate is unavailable and must not be invented.

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

Guided sample: https://usetruecap.com/sample-deal. Methodology: https://usetruecap.com/methodology. Agent journey: https://usetruecap.com/for-agents. Smoke-test after deployment. Synthetic QA reports are demonstrations, never customer results or verified property evidence.
