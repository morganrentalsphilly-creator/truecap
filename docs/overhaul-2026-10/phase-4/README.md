# Phase 4: the analyzer, the result, the share page, the memo (2026-10-20)

The product surfaces built to `OVERHAUL.md` §7 on the Blueprint tokens, on
branch `design/overhaul-2026-10-phase-4` (stacked on Phase 3). Phase 4 has
no checkpoint; Phase 5 (the marketing rollout) follows.

## What changed

### The result (`components/investcalc/focused-decision-summary.tsx`)

1. **The reveal.** `components/motion/result-reveal.tsx` wraps the decision
   card in `analysis-dashboard.tsx` with the run's fingerprint as its key
   (purchase price, net cash flow, DSCR). After mount, and again only when
   that fingerprint changes, the root carries `data-result-reveal="play"` for
   1.4s and `globals.css` eases each `data-reveal-step` in 150ms apart: the
   verdict (1), the Offer Ceiling (2), the price track (3), the first-year
   figures (4), the best next step (5). Reduced motion: the attribute is
   never set and every step is simply there; the server renders every step
   at rest.
2. **The Offer Ceiling rolls in.** `AnimatedNumber` gained `rollIn`: the
   figure mounts at zero and rolls to its value after a beat, once, never
   under reduced motion. The ceiling (300ms), the cash-flow and DSCR figures
   (600ms) use it. The exact-solve branch is detected from the headline
   itself (`offerCeilingHeadline === money(offerCeiling.ceiling)`), so the
   loading, range, error and no-criteria sentences stay text and nothing
   rolls to a number the engine did not produce.
3. **The price track** (`components/investcalc/price-track.tsx`): the
   hero's dimension line, static, in the result (compact), the share page
   and the memo: asking against the ceiling, the meets-range in the
   highlight, the gap. Pure markup from the same two numbers.
4. **Blueprint grammar.** One white card at the object radius with the rest
   shadow (no cobalt border, no blue wash); the verdict in the display face;
   the ceiling under the 2px graphite rule on the highlight stroke at the
   key-figure size; the first-year figures on soft rules with the target
   state as a dot and a label; the next step on a 2px cobalt left rule; the
   "Base analysis" tag in Geist Mono. No uppercase, no monospaced figures.
5. **The summary bar** (`components/investcalc/result-summary-bar.tsx`): a
   zero-height sticky slot under the header; once the decision card scrolls
   above the header (IntersectionObserver), it shows the card's own h2 text,
   the exact ceiling and the asking price, and a "Decision" button that
   scrolls back (reduced-motion aware via `scrollBehavior()`). Hidden, it is
   `inert`.
6. **Charts draw once.** `useChartDrawAnimation()` (next to
   `usePrefersReducedMotion`) returns true for the first 1.6s after mount and
   never under reduced motion; all seven Recharts files use it, so a scenario
   toggle redraws without an entrance.
7. **The report under the card.** The eyebrow pattern (10/11px bold
   uppercase tracked labels) was swept across `components/investcalc`
   (59 files, 203 class strings): 12px medium labels in the text face, the
   display face for section titles, Geist Mono for tags. The `--text-2xs`
   and `--text-3xs` tokens are 12px and 11px (were 11 and 10), so no
   functional text sits under the detector's 11px floor. The rent bar's
   segments no longer transition their width. "Total ROI" is labelled "Total
   ROI (cumulative)" on the exit summary card and the compare list, the
   label the compare table already used for the same figure (audit item
   "anchor the big ROI numbers"; pure labelling). Skeletons share the card
   radius.

### The input (`components/investcalc/investcalc-page.tsx`)

- The address field is hero-sized (48px, 56px from `sm:`, 18px text from
  `md:`), the page heading is the display face, the form cards are the
  object radius with the rest shadow, the Run button is a control (8px, the
  medium shadow), the decision-criteria panel and the sticky criteria panel
  are plain cards.
- Source chips on defaults (`assumptions-strip.tsx`) are Geist Mono tags at
  the 4px radius; the advanced block eases in when opened (`tc-disclosure`,
  the same keyframe as the reveal, display-toggled and kept mounted as
  before).
- The live preview (`live-verdict-panel.tsx`) is a dashed white card whose
  cash flow, cap rate and DSCR roll through `AnimatedNumber` on every
  keystroke (`usdSigned` keeps the "+$0" rule for a figure that rounds to
  zero); the pulsing dot is a still dot. The phone dock
  (`sticky-calculate-bar.tsx`) uses the same figures.
- The step rail (`analyzer-step-rail.tsx`) is restyled and keeps its
  post-run-only rule (its code comment: the hero and the chips carry
  input-phase wayfinding).

### The share page and the memo

- `shared-deal-shell.tsx`: the agent's band picks white or graphite text by
  contrast (`lib/brand-contrast.ts`, shared with the homepage's co-branding
  preview); the band, the TrueCap strip and the footer carry
  `data-print-hide`. `lead-capture-form.tsx`'s submit button does the same
  on the accent colour (it was white text on any colour).
- `read-only-analysis-view.tsx`: the same card and figure grammar as the
  result, the ceiling on the highlight stroke with the price track, the
  four status tiles on rules, the metric tiles in the figure face.
- `app/sample-decision-memo/page.tsx`: the Offer Ceiling on the highlight
  stroke with the price track under it.
- `globals.css` `@media print`: chrome hidden, white paper, no shadows.

### Skipped, and why

- **The address morph (`<ViewTransition>`).** React 19.2.6, the installed
  stable copy, does not export `ViewTransition`; only Next's vendored canary
  does, and the unit tests render against the stable copy. OVERHAUL.md §4
  says to skip rather than upgrade or shim.
- **The phone bottom sheet for assumptions** is a proposal: the assumptions
  live in the form's DOM under react-hook-form registration, and moving them
  into a sheet changes the field order and the `#step-*` anchors the chips
  and the e2e specs rely on.
- **`rehab-estimator-card.tsx`** keeps its labels: `tools-template-t2`
  byte-pins the analyzer's default rendering to the signed-in checkpoint.

## Measurements

Lighthouse CI, mobile 390×844, simulated throttling, medians of 3 on a
quiet machine (`lighthouse-summary.md`):

| Route | Perf | A11y | LCP | TBT | CLS | Script KB | Total KB |
|---|---|---|---|---|---|---|---|
| `/analyze` Phase 3 | 0.84 | 1.00 | 4.5 s | 43 ms | 0.002 | 639 | 794 |
| `/analyze` Phase 4 | 0.87 | 1.00 | 4.0 s | 48 ms | 0.002 | 624 | 798 |
| `/` Phase 4 | 0.89 | 1.00 | 3.8 s | 10 ms | 0.000 | 424 | 625 |
| `/pricing` Phase 4 | 0.88 | 1.00 | 3.9 s | 19 ms | 0.002 | 432 | 587 |

The analyzer's script fell 15 KB (the eyebrow sweep and the flattened
chrome) while NumberFlow joined its chunk for the live preview. The
build-failing assertions (accessibility ≥ 0.95, CLS ≤ 0.05) pass; the
warnings are the baseline's (LCP over 3 s, script over 256 KB on
`/analyze`). A run taken right after the e2e suite, with the load average
near 6, read `/analyze` at 200 to 451 ms TBT; it is not reported (the quiet
runs read 46 to 51 ms).

`after/facts.json`: no horizontal overflow on `/analyze`, the sample result
or the memo at 375, 768, 1095 or 1440; Hanken Grotesk and Geist Mono are the
only faces; one Disclaimer on each marketing page.

## Tests

- Unit: 533 files, 8,909 tests, green.
- E2E, public project against the local production server:
  `site-overhaul-conversion.spec.ts`, `public-product.spec.ts` and
  `audit-analyzer-results.spec.ts`, 37 passed (the sample result's action
  row inside the first phone screen at 390×844, the first real decision with
  its exact ceiling and the second deal failing closed, axe AA on the
  homepage and pricing, the analytics events, the 2× zoom reflow). The first
  run had three failures: the phone card had grown 15px past the first
  screen (the ceiling figure, the price track and the figure tiles are one
  step smaller below `sm:` now), the hero field in the navy close band
  inherited the band's light text on its white background (`text-foreground`
  on the field; axe had not caught it before because the band's form was
  not in the audited viewport until the sample flow scrolled), and the
  second-deal run raced the address-switch dialog while captures and the
  detector shared the CPU (green alone).
- `tsc`, `lint`: clean.
- Re-anchored (each named in its commit): `ux-polish-guards` (the Offer
  Ceiling label and the next step's eyebrow), `advocacy-accessibility-guards`
  (control radius; the DSCR figure through `AnimatedNumber`),
  `analyzer-interaction-p2` (the chart hook), `marketing-accessibility-guards`
  (the live preview's eyebrow), `metric-tile-rounding` (the figure utility),
  `share-page-one-cta` (the band's text colour). No truth assertion changed:
  the rounding, the no-debt DSCR label, the one-CTA share page, the
  reduced-motion contract and the AA colours are asserted as before.

## Impeccable detector

Rendered scans of the local production build
(`impeccable-detect-*.json`):

| Page | Viewport | Before this phase | Phase 4 |
|---|---|---|---|
| `/analyze?sample=1` (the result) | 1440×900 | 167 (`undersized functional text` ×74, `tiny body text` ×46, `nested cards` ×23, `line length` ×12, `layout animation` ×9, `all-caps` ×2, `cramped` ×1) | 43 (`nested cards` ×23, `line length` ×12, `tiny body text` ×7, `cramped` ×1) |
| `/analyze?sample=1` | 390×844 | 176 (`undersized` ×84, `tiny` ×46, `nested` ×23, `layout animation` ×9, `all-caps` ×2, `occluded` ×1) | 35 (`nested cards` ×23, `tiny body text` ×11, `occluded` ×1) |
| `/analyze` | 1440×900 | — | 4 (`line length` ×2, `nested cards` ×2) |
| `/analyze` | 390×844 | — | 2 (`nested cards` ×2) |
| `/sample-decision-memo` | both | — | 0 |

"Before this phase" is the first scan of this branch before the eyebrow
sweep and the token change, on the same build chain. What remains and why:

- `nested cards` ×23: the report's drill rows are cards that hold cards
  (the metric tiles, the breakdown table, the ledger's buttons); the
  deeper report keeps its row-and-panel structure in this phase. Phase 6
  (the app) is where the rows become the sheet's rules.
- `tiny body text` ×7/×11: the 11px `text-3xs` captions in the deeper
  panels (input-confidence, the ledger's footnotes). The token is 11px now,
  on the detector's functional floor; a second pass to 12px is a Phase 6
  decision because the dense tables set their line heights on it.
- `line length` ×12 at 1440: the report's explanatory paragraphs run the
  card's full width (up to 215 characters); the cards are the layout's
  width and a measure cap on each paragraph is a Phase 6 change to the
  shared panel primitives.
- `occluded` ×1 at 390: the detector reads the fixed bottom Run bar as
  covering the paragraph under it at the viewport's foot; the bar is the
  phone's dock and scrolls clear.
- `cramped` ×1: the `details` summary row of the ceiling disclosure
  measures 0px vertical padding on its 44px flex box.

Source scan of the changed files: no primary findings.

## Captures and video

- `after/`: `/analyze`, `/analyze?sample=1` (as `analyze-sample-*`) and
  `/sample-decision-memo` at 375, 768, 1095 and 1440, first screen and full
  page, as JPEG.
- `result-reveal-1440.webm`, `result-reveal-390.webm`: the sample result's
  reveal, a scroll into the report so the summary bar shows, and the bar's
  way back (`../tools/result-reveal-video.mjs`).

## Proposals for the founder

1. The phone bottom sheet for assumptions (above).
2. The address morph once the project's React exports `ViewTransition`.
3. The step rail during input (today it shows after a run).
4. A "what if I offer $X" slider in the result (OVERHAUL.md §7 names it as a
   proposal): the hero's scrubber could move into the decision card.
