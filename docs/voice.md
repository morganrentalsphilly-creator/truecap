# TrueCap voice

Plain. Specific. Confident. Second person. No apology.

TrueCap is a tool a rental investor uses to decide what to offer. The copy should sound like a sharp colleague who has done the math, not like a legal notice or a research abstract.

## Rules

1. **Say the thing.** "The highest price that still clears your targets." Not "the modeled price threshold under explicit user targets."
2. **Second person, active voice.** "You can edit every assumption." Not "Assumptions are editable by the user."
3. **One disclaimer per page.** The `<Disclaimer />` component (`components/marketing/disclaimer.tsx`) says once that TrueCap is a model, not an appraisal, a lender decision, or investment advice, and links to the Methodology. Nothing else on the page repeats it. No per-element hedges.
4. **Label sources, don't apologize for them.** Inputs carry a two-or-three-word source label: `HUD FMR`, `FRED rate`, `TrueCap default`, `Your input`. A default reads "default — replace with your local number", not "preliminary fallback verify locally".
5. **Numbers are facts, not tone.** Copy changes may change tone, never facts. Prices, percentages, thresholds, dates, and claims stay exactly what they are, and they come from their config or data source, never retyped into prose.
6. **No internal vocabulary.** Words that describe how the codebase is organized are not for customers: released, unreleased, registry, hand-curated, checked-in, as-of dates, synthetic, deterministic screen, selected-rule.
7. **Name features once, then use the name.** Offer Ceiling (define once per page: "the highest price that still meets your targets"). Buy Box (your targets). Deal score (0–100, a heuristic summary of the modeled numbers).
8. **Short sentences.** One idea each. Cut "in order to", "it should be noted", "please note".
9. **Confident about the math, honest about the inputs.** "Every assumption is labeled and editable" is the promise. The disclaimer covers the rest.

## Term map

| Was | Now |
| --- | --- |
| product evaluation | free trial ("21-day free trial, no card") |
| selected-rule fit / selected rules / rule-fit | Buy Box fit / your Buy Box / your targets |
| Synthetic sample targets v1.0 / TrueCap Synthetic Sample | sample targets / Sample property |
| target-dependent ceiling / target-backed Offer Ceiling / modeled price threshold | Offer Ceiling (defined once: "the highest price that still meets your targets") |
| Deal Doctor thresholds | Buy Box |
| Screening Index (0–100) with modeled context | Deal score (0–100), one-line tooltip: a heuristic summary of the modeled numbers |
| Does not meet selected rules at asking | Doesn't meet your targets at asking |
| Asking misses the sample targets | Asking price is $X above your ceiling |
| Highest modeled price meeting these example criteria. This is not a recommended offer. | The highest price that still clears your targets. |
| preliminary fallback | default — replace with your local number |
| released / unreleased / registry / hand-curated / checked-in / as-of dates | (removed; say what is or isn't offered in plain words) |

## The disclaimer (verbatim, one per page)

> TrueCap models a deal from the assumptions you see and can edit. It is not an appraisal, a lender decision, or investment advice. The math is published in our Methodology.

## Hero (homepage)

- Headline stays: "Know your walk-away price before you make the offer."
- Subhead: "Paste a listing. TrueCap shows the cash flow, DSCR, and the highest price that still hits your targets — with every assumption labeled and editable."
- Under the CTA: "Free. No account. Your first full decision is included."

## Checks

`rg -i "synthetic sample|selected-rule|product evaluation|preliminary fallback|unreleased|hand-curated"` over `app/`, `components/`, `lib/`, `emails/` must return no customer-facing hits (identifiers and comments are not customer-facing). Every marketing page renders exactly one `<Disclaimer />`.
