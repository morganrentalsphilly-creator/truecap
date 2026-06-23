# TrueCap — UX & Product Audit

**Method:** Live walkthrough of the production app (usetruecap.com) signed in as a Pro customer, June 2026. Covered the logged-in home, the full deal output (Deal Score + investor lens + Overview), all six analysis tabs (Cash Flow, 10-Year Projections, Tax Strategy, Exit Scenarios, BRRRR & Flip, Stress Test), the dashboard, Saved Analyses, and Compare. Audited against four objectives: Customer Value, Usability & UX, Packaging & Presentation, Efficiency & Adoption.

**Test deal used throughout:** 1700 W Erie Ave, Philadelphia — $300k, $2,500 rent, 20% down, 6.75% — a high-leverage, cash-flow-negative single-family that the engine classifies as an appreciation play.

> Two caveats: (1) I did **not** trigger a PDF download or open a share link (those are side-effecting actions). (2) Several recommendations touch the Deal Score thresholds in `lib/deal-score.ts` / `lib/verdict.ts`, which per your own CLAUDE.md are changes to surface to you before shipping — they are written here as proposals, not edits.

---

## Headline

The analytical engine is genuinely strong and the UI is polished and modern. The single biggest issue is **coherence of the verdict**: on this deal the boldest element on the screen says **"13/100 — Avoid — High Risk,"** while the same page shows a ~10%/yr 10-year return, +$303/mo after-tax cash flow, **+167% exit ROI / $115k profit**, and a recommendation that literally calls it **"a wealth-building hold."** The tool contradicts itself, and the contradiction sits on the most important question it answers: *should I buy this?*

If you fix one thing to make people adopt TrueCap as their go-to underwriting tool, make the **score, the colors, and the recommendation tell one consistent story.** Trust in the verdict is the product.

---

## 1. Customer Value

**What's working**

TrueCap is well past "calculator." The depth on offer — a holistic Deal Score, an investor lens that re-scores *and* re-curates the output for Cash-flow / Balanced / Appreciation buyers, six analysis tabs, a portfolio dashboard with a sortable decision list and a risk-return scatter — is genuinely institutional-grade for a solo investor. The address auto-fill (rent, rate, property tax) is a real speed advantage, and the recommendation copy is nuanced and educational rather than a canned verdict.

**Gaps**

- **[P0] The headline Deal Score contradicts the tool's own analysis.** On the test deal, "Why this score?" shows components summing to ~23 (including *Total return 14/25 — "solid total return"* and *Cap rate 9/16 — "fair"*), then a flat **−24 risk penalty** wipes all of it out to a net 13/100. The two things driving that penalty — negative cash flow and sub-1.0 DSCR — are *already* scored as 0 on their own components, so the deal is penalized **twice for the same two facts.** Worse, the penalty isn't lens-aware: under the Appreciation lens the components get re-weighted to reward total return, but the −24 penalty isn't re-weighted, so it overpowers the lens and the appreciation play still reads "Avoid." This is the root cause of the whole-page contradiction.
- **[P1] Insights are data-rich but "so-what"-light.** The tabs render beautiful charts (annual cash flow crossing into the black around year 8; front-loaded tax savings; equity growth to ~$200k) but rarely state the takeaway in words. A newer investor has to *infer* "this turns cash-flow positive in year 8" or "your tax shield shrinks as the loan amortizes." The data is present; the prescriptive insight mostly isn't, outside the Recommendation card and Deal Q&A.
- **[P2] Some numbers read as too-good-to-be-true.** The dashboard surfaces "ROI 588.8% / 992.6% / 654.0%" and an AI Insight headlines "highest ROI — 992.6%." These are 10-year cumulative returns on a small cash basis shown as raw, unlabeled percentages. The believable annual figure (CoC 26.3%) exists on the Saved Analyses page — the inflated framing is the outlier and it undercuts credibility exactly where you're trying to impress.

## 2. Usability & User Experience

**What's working**

The core flow is intact and fast: a returning user lands on a pre-filled draft, clicks one "Run analysis," and gets a verdict. Progressive disclosure is well-judged — *Show all metrics*, *Stress-test this deal*, *Why this score?*, and the cash-flow *Full breakdown* keep the first read calm while leaving the depth one tap away. The six tabs share a consistent "summary cards → charts" pattern that makes the product learnable. On mobile the verdict row stacks, the tab bar scrolls with full-size tap targets, and metrics reflow cleanly.

**Friction**

- **[P1] Theme whiplash between the two core surfaces.** The analyzer is light-themed; the dashboard / Saved Analyses / Compare area is dark-themed. Moving between "run a deal" and "manage my book" feels like crossing into a different product. Worth confirming this is intentional; if so, a shared accent system or a softer transition would make it feel like one tool.
- **[P2] Projections summary cards don't reconcile.** "Year 10 Cumulative CF −$5,074" sits directly beside "10-Year After-Tax Cash Flow +$53,539." That ~$58k swing is the depreciation/interest shield, but nothing bridges the two and the first card never says "pre-tax." A reader can't reconcile a negative and a positive number that are supposedly about the same thing.
- **[P2] The "Income vs Expenses" projection chart excludes debt service.** It plots rental income against *operating* expenses only, so it shows a big healthy gap — next to a deal that is actually cash-flow negative because the mortgage isn't in the "expenses" line. A novice can misread that gap as cash flow. Add a debt-service line, or relabel it "Operating Income vs Operating Expenses."
- **[P2] Compare is an indirect flow.** Compare Deals has no inline deal picker; its empty state bounces you to Saved Analyses to select 2–4, then back. A picker on the Compare page itself would remove a round trip.
- **Minor copy:** the Tax Strategy tab has a card labeled "10-Year Tax Benefit **(Tax Strategy)**" — the parenthetical is redundant on that tab.

## 3. Packaging & Presentation

**What's working**

The visualizations are clean, branded, and readable — the Deal Score ring with verdict chips and the lens toggle is a strong hero, and the dashboard's Top Performers + risk-return scatter + Deal Decision List is a genuinely useful way to package a portfolio. The voice is good ("Your book at a glance — 5 saved deals").

**Opportunities**

- **[P0, same root as §1] One reconciled headline.** The score, the metric colors, and the recommendation should never point in opposite directions. When year-1 is negative but the long-term is strong, say *that* in the headline ("Cash-flow negative now — builds wealth long-term") instead of letting a bold "Avoid" fight a "+167% ROI" three scrolls down.
- **[P1] Anchor the big ROI numbers.** Label them "10-yr ROI," annualize them, or show a multiple (e.g. "5.9×") so they read as credible rather than gimmicky.
- **[P2] Surface the appreciation reframe earlier.** The appreciation banner and recommendation already do the bridging work — but the "Avoid 13" score anchors the user negatively *before* they reach the positive long-term tabs. Pull that reframe up next to the score.

## 4. Efficiency & Adoption

**What's working**

Time-to-value is excellent: pre-filled draft, one-click run, instant verdict, no signup required to try. Auto-fill removes the most painful data entry. Upsells appear at the moment of need rather than as ambient chrome. For returning users, the dashboard delivers an immediate "what matters across my book" view.

**Barriers**

- **[P0] Trust is the adoption gate.** A first-time user whose headline verdict contradicts the evidence reacts with confusion or doubt — and confidence in the verdict is precisely what converts a trial into a daily tool. This is the highest-leverage adoption fix.
- **[P1] The insight gap raises the skill floor.** Without "so what" takeaways, a less-experienced investor may not know what to *do* with a screen full of correct charts, blunting the "aha" that drives recurring use.
- **[P2] Recurring-use hooks are invisible.** You already have server-side rate alerts / re-underwriting of saved deals — but nothing in the journey advertises it. A visible "we re-checked your 5 saved deals this week — 2 changed" is a strong reason to come back.

---

## Prioritized recommendations

| # | Priority | Finding | Recommended change | Guardrail |
|---|----------|---------|--------------------|-----------|
| 1 | **P0** | Score (13/Avoid) contradicts the evidence (+167% ROI, "wealth-building hold") | Stop double-counting negative CF / sub-1 DSCR in both the component score *and* the risk penalty; make the risk penalty lens-aware so the Appreciation lens can actually reward total return; or lower/soften the appreciation-floor cliff (currently ~12%/yr — this 10%/yr deal just misses it) | Touches `lib/deal-score.ts` thresholds → propose to Morgan before shipping |
| 2 | **P0** | Verdict, colors, and recommendation tell different stories | Reconcile into one headline; when year-1 is negative but long-term strong, say so at the score, not three scrolls down | `lib/verdict.ts` + dashboard copy |
| 3 | **P1** | ROI figures (588–992%) look implausible | Relabel "10-yr ROI," annualize, or show a multiple (5.9×) everywhere they appear (dashboard, AI Insight, decision list) | Display-only, low risk |
| 4 | **P1** | Charts show data, not takeaways | Add a one-line "so what" under each tab's chart cluster (e.g. "Turns cash-flow positive in year 8") | Additive, low risk |
| 5 | **P1** | Light analyzer vs dark dashboard feels like two products | Confirm intent; unify accent/transition | Design decision |
| 6 | **P2** | Projections cards don't reconcile (−$5,074 vs +$53,539) | Label pre-tax vs after-tax; add a one-line bridge ("difference = depreciation shield") | Display-only |
| 7 | **P2** | "Income vs Expenses" omits debt service | Add a debt-service line or relabel "Operating" | `ten-year-projections` charts |
| 8 | **P2** | Compare requires a select-then-navigate detour | Add an inline deal picker on the Compare page | New UI |
| 9 | **P2** | Recurring-use hooks invisible | Surface saved-deal re-underwriting / rate alerts in the dashboard | Feature already exists server-side |

**The one-sentence version:** TrueCap already does the hard analytical work better than most tools on the market — the job now is to make the *verdict* as trustworthy and coherent as the analysis behind it, starting with the Deal Score that currently argues against the tool's own conclusion.
