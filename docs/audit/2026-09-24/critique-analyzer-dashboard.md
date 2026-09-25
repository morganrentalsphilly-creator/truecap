# Impeccable Assessment A — The Analyzer and the Dashboard (Operate mode)

**Coverage note.** Analyzer reviewed from screenshots (375/768/1095/1280/1440) plus source. The 1280 and 1440 "after sample" captures contain only the dynamic-import skeleton (grey blocks, no text), so the desktop results view above 1095 is UNVERIFIED from screenshots. No dashboard screenshots exist (private routes bounce to login); the dashboard is reviewed from source only.

## 1. Design-specificity verdict

The analyzer is unmistakably TrueCap: DM Mono numerals, one electric blue, tinted callouts, ledger tiles, plain-spoken verdict copy ("Doesn't meet sample criteria at asking"). Nothing in it reads as a template. The dashboard, however, reaches for a second vocabulary the analyzer never uses — gradient CTAs with glow (`Topbar.tsx:387-391, 404-408`; `DashboardHome.tsx:1959-1963`), gradient icon tiles with coloured drop shadows and hover-lift (`StatCard.tsx:25-30, 44-46, 56`) — so the two halves read as one palette applied with two attitudes. The product's real weakness is discipline, not identity: five button radii, three focus treatments, three error reds, 159 arbitrary sub-12px sizes across the in-scope files, and a first phone screen that spends its attention on two intros and a sample CTA rather than the address.

## 2. Nielsen heuristics (Operate; max 40)

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Buttons narrate ("Running analysis…", "Finishing property lookup…", `investcalc-page.tsx:9237-9249`), but the results skeleton is `aria-hidden` with no visible text (`analysis-dashboard-skeleton.tsx:17`). |
| 2 | Match with real world | 2 | "DSCR ≥ 1.25" sits under the run button with no definition (`investcalc-page.tsx:10213`); "Model DSCR", "Offer Ready", "binding rule", "Sensitivity risk". |
| 3 | User control & freedom | 3 | Done editing, Cancel criteria edits, Clear, ×, Escape, "Go to field" (`investcalc-page.tsx:10490-10512`); no undo after archive/delete (UNVERIFIED). |
| 4 | Consistency & standards | 2 | See §6: radii, focus rings, decimals, sign glyphs, "Buy" tier in action blue. |
| 5 | Error prevention | 3 | Strict currency parsing + paste recovery (`currency-input.tsx:65-93`), plain Enter never runs (`investcalc-page.tsx:9686-9692`), bulk-delete confirm (`saved-analyses-page-v2.tsx:2333-2337`). |
| 6 | Recognition over recall | 3 | Chips restate every assumption with its source (`assumptions-strip.tsx`); criteria restated on the ceiling block. GlossaryTip exists (`financing-section.tsx:110`) but not on the pre-run criteria. |
| 7 | Flexibility & efficiency | 3 | Cmd/Ctrl+Enter, "Next deal · keep assumptions", select-all/Compare/Manage bar; no list-level keyboard accelerators. |
| 8 | Aesthetic & minimalist | 2 | Double intro, primary-styled sample CTA, 10-block decision card, dashboard gradients/glow/lift, eyebrows. |
| 9 | Error recovery | 3 | Errors name the fix: listing link (`listing-link-input.tsx:199`), search (`Topbar.tsx:122`), Buy Box load (`investcalc-page.tsx:10231-10235`), rate-limited ceiling with retry (`focused-decision-summary.tsx:878-884`). |
| 10 | Help & documentation | 3 | "How this ceiling was calculated", "See all input sources and scoring rules", methodology links; nothing contextual on the pre-run criteria block. |
| | **Total** | **27/40 (68%) — Acceptable** | |

## 3. Cognitive-load checklist

**Empty analyzer (375 / 1095):** fails Single focus (page hero `analyze-page-content.tsx:44-58` + form hero `investcalc-page.tsx:9466-9477` + sample CTA + "Look up property details" + listing-link toggle + "Analysis type: Change" all precede the price field) and Visual hierarchy at 375 (the only filled button on the first screen is "Try a sample rental"). 2 failures — moderate.

**Results view (375):** fails Single focus (a "Get Pro" upsell banner above the verdict, `analysis-dashboard.tsx:1484`), Chunking (decision card = headline, ceiling block, 2 tiles, 4 buttons, 4 callouts, 2 disclosures), One thing at a time (five competing "next" prompts: Best next step, Verify next, Fastest paths, Two assumptions, plus Decision confidence's "11 required inputs still need confirmation"), Minimal choices (7 controls inside the decision card), and Progressive disclosure with a caveat: the capture shows "Go deeper" open with its Cash Flow row expanded, making the page 7,521px tall at 375; whether that is the default or a remembered state is UNVERIFIED (`analysis-dashboard.tsx:2748-2756`). 4–5 failures — high.

**Dashboard (source):** empty state is a single hero (`DashboardHome.tsx:1936-1975`) — passes. Populated: fails Visual hierarchy (decorative gradient tiles compete with the numbers, `StatCard.tsx:56`) and Minimal choices for a free account (8 nav rows, 4 padlocked upsells, `Sidebar.tsx:53-74`; "New Analysis" appears in both the sidebar and the topbar on desktop). 2 failures — moderate.

## 4. Priority issues

**P1 — The first phone screen has no primary path.** At 375 the address field starts ~640px down, after two intros and a filled "Try a sample rental" button; the run button is at ~1,855px (2.3 screens) until the sticky bar appears after 600px of scroll (`sticky-calculate-bar.tsx:91`). At 1095 the run button sits at ~700px, on the fold of a 13-inch laptop. Fix: keep one intro — delete the `<section>` at `analyze-page-content.tsx:44-58` (the form's own heading at `investcalc-page.tsx:9466-9477` already says it); render the anonymous sample as the existing quiet `sampleSlot` line (`investcalc-page.tsx:9935-9947`) instead of the `bg-primary … shadow-[…]` button at `9484-9500`. Command: `layout`, then `quieter`.

**P1 — The results skeleton is silent.** `analysis-dashboard-skeleton.tsx:17` wraps eight grey blocks in `aria-hidden="true"` with no visible or announced text. Fix: add a visible `role="status"` line reusing the existing copy "Running analysis…" (`investcalc-page.tsx:10389`) outside the aria-hidden wrapper. Command: `harden`.

**P2 — Five "next" instructions in one card.** Best next step, Verify next, Fastest paths, Two assumptions (`focused-decision-summary.tsx:1272-1331`) and Decision confidence all compete at 375. Fix: move "Fastest paths" and "Two assumptions" inside the existing "Decision context and key numbers" `<details>`; keep Best next step + Verify next visible. Command: `clarify`.

**P2 — Two of the four metrics are hidden, and formatted differently when shown.** The decision module shows cash flow and DSCR only (`focused-decision-summary.tsx:241-279`); cap rate and CoC live under a collapsed disclosure at two decimals (`1365, 1373`) while every other surface uses one. Fix: extend the snapshot grid at `focused-decision-summary.tsx:242` to `min-[280px]:grid-cols-2 sm:grid-cols-4` with the cap-rate and CoC tiles, one decimal. Command: `typeset`.

**P2 — Five button radii and three focus rings.** `rounded-md` primitive; `rounded-lg` (`listing-link-input.tsx:187`); `rounded-xl` (`sticky-calculate-bar.tsx:293, 305`; `focused-decision-summary.tsx:1070, 1087, 1103`); `rounded-2xl` (`investcalc-page.tsx:10367`); `rounded-full` (`saved-analyses-page-v2.tsx:4458…`; `operating-expenses-section.tsx:302`). Focus: `ring-[3px] ring-ring/50` (primitives) vs `ring-2 ring-ring offset-2` (`listing-link-input.tsx:181`, `assumptions-strip.tsx:262`) vs `ring-2 ring-primary offset-2` (`listing-link-input.tsx:118, 133, 187, 205`). Command: `harden`.

**P2 — Semantic colour used as section identity and for selection.** Financing labels in `--brand-green` (`financing-section.tsx:106, 152, 191, 227, 349, 407`), expense labels in `--brand-orange` (`operating-expenses-section.tsx:132, 778, 1016, 1304`), the active step in green (`analyzer-step-rail.tsx:108`), and the "Buy" tier in action blue (`TopDeals.tsx:55`). Command: `quieter`.

**P2 — Dashboard chrome diverges from the analyzer.** Gradient + glow CTAs (`Topbar.tsx:387-391, 404-408`; `DashboardHome.tsx:1959-1963`), gradient icon tiles with coloured shadows and hover-lift (`StatCard.tsx:25-30, 44-46, 56`), an undefined `font-display` utility (`DashboardHome.tsx:1034`). Command: `polish`. Source-only.

**P2 — The deal table scrolls sideways at the founder's width.** Sidebar 256px + `min-w-[1120px]` table (`saved-analyses-page-v2.tsx:3893`) = horizontal scroll inside an 839px content area at 1095. UNVERIFIED visually. Command: `adapt`.

## 5. Persona red flags

**Jordan (phone, paid ad):** the loudest first-screen control is the demo. "Look up property details" renders for guests who cannot use it (`property-details-section.tsx:128-161`) — a button that opens a sign-up wall. "DSCR ≥ 1.25" appears before any definition. On the results, the same $554 is amber-badged above ("Misses $750/mo target", `focused-decision-summary.tsx:221`) and green below (year tiles) — two colours for one number.

**Alex (20 saved deals):** bulk select/Compare/Archive/Delete exist and are capped; the Overview's detailed cards stop at exactly 20 (`app/dashboard/page.tsx:73`). Plain Enter moves focus instead of running and the Cmd+Enter hint is `hidden sm:flex` (`10441`).

**Sam (agent with clients):** the topbar search is address-only (`Topbar.tsx:33, 278`), so a client's deals cannot be found by name; Share sits under "More actions", two taps from the decision Sam wants to hand over.

## 6. Consistency drift against DESIGN.md

- **Buttons:** the in-form primary is `h-14 rounded-2xl text-base` (`investcalc-page.tsx:10367`) while the sticky bar's twin is `min-h-12 rounded-xl text-sm font-bold` (`sticky-calculate-bar.tsx:305`).
- **Inputs:** `Input` primitive vs raw inputs in `listing-link-input.tsx:181` and `Topbar.tsx:294`; financing adds full-opacity `focus-visible:ring-ring` (`financing-section.tsx:129`).
- **Errors:** three reds — `text-destructive` (`form-field-helpers.tsx:4`), `text-[var(--metric-negative,#dc2626)]` (`listing-link-input.tsx:197`), amber `text-amber-800` for target-draft errors (`focused-decision-summary.tsx:1148`).
- **Numbers:** cash flow renders four ways — `$554/mo` (`focused-decision-summary.tsx:252`), `+$554/mo` with a hyphen minus (`sticky-calculate-bar.tsx:277`), a true minus U+2212 (`investcalc-page.tsx:9779`), `+$554` with `/mo` on its own line (year tiles). Cap rate 1 vs 2 decimals. CoC `toFixed(2)` vs `toFixed(1)`. DSCR gains an "×" only in the dashboard KPI (`DashboardHome.tsx:1669`). The Ledger Rule holds in the decision module and StatCard but not in the year tiles (`analysis-dashboard.tsx:3296`), the TopDeals table or DashboardHome.
- **Status colours:** no verdict tier pill — the headline is plain ink; tile chips are keyed to target-fit, year tiles to sign; "Buy" is blue (`TopDeals.tsx:55`); the "Get Pro" sample pill wears the action colour above the verdict.
- **Capitalisation:** Title Case "Property Address", "Year Built (Optional)", "Square Feet" beside sentence-case "Price to analyze", "Expected gross monthly rent", "Bedrooms (optional)"; TopDeals header mixes "Deal score", "Cap Rate", "Cash Flow", "Screening result"; sidebar mixes "Compare Deals" with "Screen a shortlist".
- **Palette:** dashboard gradients/glow/lift vs the analyzer's flat Signal Blue; `dark:` variants survive despite the Always-Light Rule.

## 7. Minor observations

- Eyebrows above headings: "FREE ANALYZER" (`analyze-page-content.tsx:46-48`), "OFFER CEILING CRITERIA" (`investcalc-page.tsx:10197-10199`), "LIVE SCREENING PREVIEW" (`live-verdict-panel.tsx:149`).
- After a run, /analyze has two h1s: the visible "Analyze a rental deal" and the sr-only "First-pass underwriting" (`analysis-dashboard.tsx:1548-1550`), and the marketing hero stays stale above the decision.
- DESIGN.md prescribes `text-2xs`/`text-3xs`; neither is defined in `app/globals.css` and 159 arbitrary values are used in scope.
- One action, four names: "New Analysis", "Open the analyzer", "Analyze your first property", "Analyze deal & calculate ceiling". The empty state says "click Save on the dashboard" (`4501-4502`), but Save lives in the results card.
- "Next deal · keep assumptions" wraps to three lines at 375 (`focused-decision-summary.tsx:1143`).
- Two anchors for one destination: `/settings#buy-boxes` vs `/settings#buy-boxes-heading`.
- `role="presentation"` on a wrapper that contains buttons (`sticky-calculate-bar.tsx:193`).

## 8. Three questions for the founder

1. /analyze introduces itself twice — the SEO hero and the form hero. Which one is the door?
2. The decision card issues five "next" instructions, and Decision confidence tells a first-timer that "11 required inputs still need confirmation". Which single sentence should Jordan act on — and is that confidence module a feature or a confession?
3. The dashboard wears gradients, glows and hover-lift the analyzer never uses, and half its nav is padlocks for a free account. Is that the "premium" you want $29.99 to feel like?
