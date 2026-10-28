# TrueCap customer testing kit

Recruit 10–15 consenting participants: investor-focused agents who regularly screen rentals and rental investors with a recent acquisition search. Recruitment/sending requires explicit authorization. Do not invent participants or results.

## October 28 release study

Start with five investor-focused agents, then five more agents or rental investors after the first round's blocking issues are corrected. The current study tests the shorter mobile entry, the two-client example, the released saved-client workflow, and Agent Pro's 100-client / 100-Buy-Box allowance. Pro retains 12 Buy Boxes.

Run scripted or artificial scenarios in an isolated research environment. Do not create fake production subscriptions or generate production analytics events just to populate dashboards. A participant using TrueCap for genuine work may use their real account and their own authorized property information.

Before showing the example, give the participant five seconds on the homepage, then ask: “Who is this for, what does it help you do, and what would you do next?” Record their words. After the session, show the two-client example and ask them to explain why its Offer Ceilings differ. Count explanation failures separately from UI failures.

For the agent task, time these stages separately: first useful analysis, client setup, correct client match, and correct report delivery. Record when help was required. Do not describe completion as “unassisted” after any coaching.

### Invitation draft — not sent

Hi [first name], I’m testing TrueCap, a tool for screening rental listings against investor clients’ criteria and preparing a report. Would you be willing to spend 30 minutes trying it with a listing you’re allowed to use? I’m looking for candid feedback, including anything confusing or unnecessary. No purchase, testimonial, or preparation is required. You can stop at any time. [Scheduling details]

### Decision after the first five agents

- Fix any inability to complete analysis, save the correct client match, or send the correct report before inviting the next round.
- If two or more agents misunderstand the audience or next action, revise the first screen and repeat that check.
- If two or more confuse assumptions with verified facts, revise the result labels before promotion.
- Treat willingness to pay as a stated preference. Require observed repeat use and actual purchase evidence before claiming demand.
- Record participant count, role, failures, assistance, and seven-day returns. An empty scorecard is an untested hypothesis, not a positive result.

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
