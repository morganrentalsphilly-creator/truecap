# Critique A — Results, Decision Memos, Shared Deals

## 1. Design-specificity verdict

The results card is the most designed surface in TrueCap and it earns the "underwriter's ledger" claim: one decision sentence, the Offer Ceiling as the largest element in DM Mono, pass/miss pills that say the word, and a "How this ceiling was calculated" trail (`components/investcalc/focused-decision-summary.tsx:807-1045`). What surrounds it is generic: the first 250px at both 375 and 1095 re-ask for an address the visitor already entered, the four metrics are split across two collapsed disclosures, and the noun for the investor's targets changes five times within one screen. The memo and shared viewer reuse the tokens but not the rules: different colour thresholds, different decimals, different chrome, internal version strings. Verdict: a specific product surface with generic-tool leakage at its edges. Refinement, not redesign.

## 2. Nielsen heuristics (23/40 — Acceptable)

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | System status | 3 | Skeletons, `aria-live` ceiling announcements (fds:844-851), "Saving…/Saved"; the 1280/1440 captures never left the skeleton — UNVERIFIED if capture timing or a real hang |
| 2 | Real-world match | 2 | "binding rule", "Offer Ready", "Model DSCR", "Method v1.4" (`analysis-dashboard.tsx:1714`), "method recorded-unversioned" (fds:969), "sample fixture synthetic-rental-v2" (`app/sample-decision-memo/page.tsx:185`) |
| 3 | User control | 3 | Cancel/revoke/dismiss everywhere; but a dirty criteria draft disables Save/Share/PDF/Edit (fds:636-642, 1099-1136) |
| 4 | Consistency | 1 | Same DSCR red on share, neutral in-app; "+9.3%" vs "9.33%"; seven names for targets; three PRO costumes |
| 5 | Error prevention | 3 | Bounds + step validation, cash-deal DSCR disabled (fds:169-203, 1177-1199) |
| 6 | Recognition | 2 | Glossary tips exist only inside collapsed "The numbers" (`metrics-band.tsx:117-122`); DSCR unexplained where it first appears |
| 7 | Flexibility | 2 | Arrow-key ledger (`drill-ledger.tsx:31-59`), "Next deal · keep assumptions"; Export PDF/Share buried under "More actions" (fds:1470-1512) |
| 8 | Minimalism | 2 | Results stack: hero, banner, card (≈9 blocks), score strip, full confidence module, 3 regions, sign-up card, ledger |
| 9 | Error recovery | 3 | Share 404 copy is exemplary (`app/s/[token]/not-found.tsx:44-52`); rate-limit copy specific (fds:880-882) |
| 10 | Help | 2 | Disclosure trail and /methodology link; no help for "Input confidence 48%" or "Offer Ready" (`input-confidence-card.tsx:424, 478`) |

## 3. Cognitive-load checklist

- **Results view fails 5/8**: Single focus (header CTA, "Get Pro" pill `analysis-dashboard.tsx:1487-1492`, "Tune criteria" primary all compete); Chunking (the card holds ≈9 groups, fds:843-1599); One thing at a time (four different "do this" blocks at once, fds:1267-1329); Minimal choices (4 buttons + 2 disclosures + banner CTA = 7); Progressive disclosure is inverted — the Decision-confidence module is fully expanded while the numbers are collapsed (`results-region.tsx:32`, no `defaultOpen` at `analysis-dashboard.tsx:2393-2400`).
- **Memo fails 1/8**: Visual hierarchy — a 5-line "What a decision memo is" paragraph sits between the headline and the number (memo:74-89); at 375 the $236,000 lands below the fold.
- **Shared viewer fails 3/8** (from code): Single focus (three TrueCap pitches: `shared-deal-shell.tsx:123-134`, `read-only-analysis-view.tsx:1107-1122`, shell:213-237); Chunking; Progressive disclosure (nothing collapsible).

## 4. Priority issues

**P1 · First screen doesn't deliver verdict + ceiling + four metrics — `layout`.** At 1095 the ceiling sits at ≈y535 and the two tiles at ≈y740; cap rate and CoC are inside the collapsed "Decision context and key numbers" (fds:1331-1376) and the band is inside collapsed "The numbers" (`analysis-dashboard.tsx:2413`) — and that band has three tiles (`metrics-band.tsx:157 CORE_METRIC_KEYS`), not four. Fix: add `"coc"` to `CORE_METRIC_KEYS`, mount `<MetricsBand>` directly under the decision card, keep "The numbers" for the ratios.

**P1 · Shared viewer colours and formats contradict the app — `harden`.** DSCR 1.00–1.25 is red on a share (`read-only-analysis-view.tsx:949`) but neutral in-app (`metrics-band.tsx:342-345`); cap rate is green at ≥0 (ro:930) vs neutral in-app; CoC green at ≥0 (ro:924) vs >5% in-app; cap rate prints "+9.3%" (ro:91, 929) after metrics-band removed the "+" because it reads like a delta. Fix: extract the four colour/format rules into `lib/financial-presentation.ts` and consume them in both files.

**P1 · One concept, seven names — `clarify`.** "Tune criteria" (fds:1076), "Criteria:" (fds:869), "Fastest paths to meet your criteria" (fds:1300), "Review the binding rule" (fds:562), "Review the active target rules" (fds:579-590), "Doesn't meet sample criteria" (fds:508) vs the memo's "Doesn't meet your targets" (memo:67) vs "Sample targets v1.0" (memo:100,186) vs "example criteria profile" (fds:468). Fix: standardise on targets and drop version suffixes from labels.

**P1 · No definition where DSCR/CoC/cap rate first appear — `onboard`.** The card tiles (fds:245-278), the context tiles (fds:1360-1375), the memo's "Base economics" (memo:136-148) and the shared `MetricTile` (ro:93-124) have no `GlossaryTip`; only the hidden band does (mb:117-122).

**P1 · Memo explains itself before it answers — `layout`.** Move `section#memo-what` (memo:74-89) below the two decision cards; delete the "Sample Decision Memo" eyebrow (memo:63-65).

**P2 · Status colours off-token, eyebrow fails AA — `colorize`.** TargetFit uses raw `bg-emerald-100 text-emerald-900 / bg-amber-100 text-amber-900` (fds:218); sensitivity block `amber-500` (fds:1314); `NextActionBanner` amber-500/600; stress card `rose-600`; memo `text-amber-700` (memo:159). "OFFER CEILING" eyebrow uses `text-primary` at 11-12px (memo:93; ro:771) — `decision-tier.tsx:228-230` documents 4.34:1; use `--brand-blue-text` as fds:852 does.

**P2 · Chrome and disclaimer drift — `harden`.** Memo has no site header, footer, nav or `<Disclaimer />` (memo:55-203); the shared page has two disclaimers (shell:240-247 bespoke + `<Disclaimer />` ro:1126). The share strip "Want to edit, save, or run your own?" (shell:123-134) addresses the sender, not the client.

**P2 · Edge states — `adapt`.** Range preview renders `"$250,000–$350,000"` at `font-mono text-3xl` (fds:799, 859): ≈306px inside a ≈271px block at 375 → wraps mid-number (UNVERIFIED visually); fix `text-2xl sm:text-3xl` + `break-words`. Negative cash flow: the hero tile prints `-$120/mo` in `text-foreground` (fds:251-253) while the band beside it goes red below −$100 — sign-blind hero.

## 5. Persona red flags

**Jordan (phone).** Sees a prompt to "Enter an address" above a result she already has; "DSCR ≥ 1.25" and "Cash flow after reserve" undefined; the only blue button, "Tune criteria", opens a seven-field jargon form; "Review the binding rule" reads as lender-speak; two scores side by side — "86/100" under a "Doesn't meet" verdict and "Input confidence 48%".

**Alex (numbers fast).** Gets 2 of 4 metrics; needs three disclosures for cap rate, CoC, cash to close, NOI; editing a target silently disables Save/Share/PDF until Apply/Cancel; Export PDF and Share are two clicks deep.

**Sam's client (shared viewer, from code).** Reads, in order: a TrueCap sales strip; "TrueCap Underwriting Standard v1.3 · 10-year projection method recorded-unversioned"; an amber process paragraph; a hard-coded "Decision readiness: Screening only" tile on every share (ro:846-851); metric tiles with wrong colour rules; then "Copy this analysis to your account →" as the primary, a full-width "Try TrueCap free" block and a third pitch mentioning "the secondary Screening Index" (a retired term). The page converts the agent's client, not the agent's offer.

## 6. Consistency drift vs DESIGN.md

| Axis | Results view | Public memo | Shared viewer |
|---|---|---|---|
| Decision heading | H2 "Doesn't meet sample criteria at asking" | H1 "…your targets at asking." with period | H1 = address; decision demoted to H2 |
| Cap rate / CoC | 1 dp in band; 2 dp in context tiles | 2 dp | 1 dp with "+" |
| Cash flow sign | "+$554" band vs "$554/mo" hero | "$554" | "$554" |
| Numeral face | mono in card/band | ceiling mono but Base-economics values sans `tabular-nums` (memo:145) | comp prices/est. value sans |
| Status colour | tokens + raw emerald/amber | amber-700 icon | DSCR<1.25 red |
| Primary buttons | 3 filled blue on first screen; "Total cash to close" is a blue filled block that is not a control (ad:3598) | 1 primary ✓ | 2 filled blocks |
| PRO marker | orange pill (`drill-row.tsx:105`); blue lock pill (`pro-inline-gate.tsx:68-71`); plain blue text "PRO" (`mortgage-scenario-compare.tsx:99`) | — | — |
| Header/footer | marketing header + hero + footer; disclaimer inside Cash Flow row | none | blue strip + bespoke footer |

## 7. Minor observations / stray text

- Sign-up card title: "Create an account to save TrueCap Synthetic Sample, Philadelph…" (`signup-prompt-card.tsx:66-71, 93`) — leaks the banned term and truncates; use the "Philadelphia rental example" label fds:461-463 already derives.
- Internal vocabulary reaching customers: "Method v1.4", "recorded-unversioned", "sample fixture synthetic-rental-v2", "Sample targets v1.0", "Screening Index".
- Share 404: "See what TrueCap does" links to /pricing. Generic 404: "Run a free analysis" appears twice; "definitions for 33 metrics" vs 43 entries in `lib/glossary.ts` — UNVERIFIED. Neither 404 has a nav.
- `money()` helpers (fds:129-132; memo:41-42; ro:89-90) lack the non-finite guard `formatters.ts:2` has → "$NaN" possible; UNVERIFIED reachable.
- Raw `<img>` in the co-branded strip (shell:113-118).
- PDF (from `lib/pdf-generator.ts:4447-4491`): section order Cover → Inputs → Specialist → Decision readiness → Downside → Projection → Tax → Exit → Comps → Disclosures; "Downside" precedes "Projection" while the app orders projections first.

## 8. Three questions for the founder

1. The one filled button on the results screen is "Tune criteria" — editing the question — and the screen shows two scores (86/100, 48%) beside a "doesn't meet" verdict. Which single signal and single action should a first-timer trust?
2. The memo is "what you hand a partner, a lender, or a client" — yet it has no TrueCap header, footer or disclaimer, explains itself before it answers, and shares zero code with the shared viewer. Is the memo marketing or the product?
3. On a shared link the agent's client meets three TrueCap sign-up pitches and one line for the agent. Who is that page meant to convert?
