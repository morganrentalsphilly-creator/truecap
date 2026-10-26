# TrueCap customer testing kit

Recruit 10–15 consenting participants: investor-focused agents who regularly screen rentals and rental investors with a recent acquisition search. Recruitment/sending requires explicit authorization. Do not invent participants or results.

## Session, 25–35 minutes

Explain recording/notes, voluntary participation and deletion choice. Use participant-owned or authorized real listing information. Do not collect payment cards, bank records, credit reports or unnecessary client identities. Use client aliases.

1. Before showing TrueCap, ask about the last screened deal, current tools, time spent and biggest failure. Record the baseline without pitching.
2. Start a timer on the property-entry page. Ask: “Decide whether this listing deserves more investigation.” Do not coach. Stop when they can explain cash flow, applicable criteria, offer ceiling and one verification gap. Log failures and any help.
3. Ask which inputs are facts, benchmarks and assumptions; which would change their decision; and whether a score or criteria match implies a financing approval.
4. Save, change rent/financing, reopen, compare a second scenario and inspect downside. Check the original stays understandable.
5. Agent task: add two aliased investor clients with different financing/criteria, screen one property, explain both outcomes, save matches and export/share one. Ask the recipient to find the assumptions, criteria and verification gaps.
6. Evidence task: add one genuine comparable with source/date and one justified adjustment. Ask whether this alone verifies market rent.
7. Show their current alternative and TrueCap. Ask which they would use for the next real deal and why. Ask what would cause abandonment.
8. Show current actual published pricing. Ask willingness to pay, who approves, expected monthly usage and what must improve. Record stated intention separately from actual payment. Do not offer discounts or take a payment.
9. With consent, ask them to return for another real property within seven days. No automated marketing is authorized by this kit.

## Suggested decision criteria (hypotheses, not achieved results)

- At least 80% finish a meaningful first screen without help.
- Median complete-input first-screen time near two minutes; publish no claim without enough observed sessions and a stated denominator.
- At least 80% distinguish assumptions from verified facts and understand criteria fit is preliminary.
- Agents can explain two distinct client results and deliver the correct scenario without private notes leaking.
- Record actual seven-day return separately from intention; compare by role, not an averaged vanity total.
- Defer price changes until repeated willingness-to-pay evidence and cost/support observations agree.

Capture one row per participant in the CSV; use a random participant code. Store consent and any raw recordings separately with limited access. Aggregate event counts should exclude addresses and financial values.

## Funnel review

Weekly, inspect consented unique-user conversion between existing landing/analysis/activation/save/Buy Box/evaluation/checkout/subscription events and the new client_matches_generated, client_match_saved, client_match_exported, rental_evidence_saved events. Confirm event ingestion in the existing PostHog project before reporting numbers. Use server-confirmed subscriptions for revenue conversion, not button clicks. Report opt-out/unknown coverage and failure categories alongside conversion.
