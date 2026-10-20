# Phase 3: the homepage (2026-10-20), ⛔ Checkpoint 2

The homepage built to `OVERHAUL.md` §6 on the Blueprint tokens, on branch
`design/overhaul-2026-10-phase-3` (stacked on Phase 2). This is the
checkpoint before the rollout: nothing in Phase 4 or 5 starts until the
founder approves.

## The signature moments

1. **Hero, "drag the price"** (`components/home/hero-sheet.tsx`,
   `price-scrubber.tsx`, `schematic.tsx`). The sample deal on a drafting
   sheet: the property drawn as a schematic (rent in, mortgage and costs out,
   cash flow landing), a price track from about $20,000 below the Offer
   Ceiling to about $20,000 above asking with the meets-range highlighted, a
   readout table (the engine's figures at asking beside the figures at the
   handle's price, with a dot-and-label state for each target), source
   receipts that open a popover, and the Offer Ceiling on the highlight
   stroke. The server renders the sheet at the ceiling from a precomputed
   sweep (`lib/sample-deal-sweep.ts`, `calculateAnalysis()` in $1,000
   steps); the island glides the handle once from asking to the ceiling on
   first view, rolls the figures through NumberFlow, announces the price when
   a drag ends, and rests at the ceiling under reduced motion. Keyboard: the
   arrow keys step the price. No engine code reaches the browser. The new
   unit test pins the sweep to `calculateSampleDealOutcome()` at asking and
   at the ceiling, and that "meets" flips exactly at the ceiling.
2. **From listing to offer** (`HowTrueCapWorks`). One pinned sheet from
   1024px that changes as three steps scroll past (an IntersectionObserver
   sets the active step; CSS crossfades the frame); on phones and without
   JavaScript each step keeps its own sheet in flow. The full line-item
   ledger stays behind "See every line".
3. **Every number has a receipt** (`components/home/receipt-flow.tsx`). HUD,
   FRED and your input flowing into the result; each node opens its source,
   its basis and what to replace it with, in `lib/product-facts.ts`'s words;
   the leaders draw in on a scroll timeline behind `@supports` and
   `prefers-reduced-motion: no-preference`, fully drawn by default.
4. **Make it yours** (`components/home/cobrand-preview.tsx`). Name and brand
   color inputs recolor a mock share page and a mock PDF cover live, with the
   text color on the brand chosen for contrast. Nothing stored or sent; the
   inputs carry `ph-no-capture` (and session recording is off site-wide); it
   ends on "Co-branding comes with Pro and Agent Pro." The exact
   client-receives facts and the real PDF cover sit behind one disclosure.
5. **Plans** (`components/home/plans-toggle.tsx`). Monthly / annual toggle
   with NumberFlow prices from the catalog (the Stripe display price when it
   resolves), plan cards that lift on hover, the comparison table with a
   sticky head.
6. **Built by a rental investor** condensed; the **FAQ** rows ease open (the
   same eight questions, one FAQPage node); the **close** on the navy band
   with the address form.
7. **Chrome:** the header condenses on scroll; the cookie banner is a
   floating card from 640px and never covers the hero's first screen at 390;
   the sticky conversion bar floats the same way.

## Copy

| Measure | Baseline | Phase 3 |
|---|---|---|
| Words visible in `<main>` (disclosures closed) | 2,062 (every ledger row open by default) | 1,213 |
| Words with every disclosure open | 2,062 | 2,360 |

The visible page is 41% shorter. No fact left the page: the five opened
ledgers, the exact client-receives list and the PDF cover moved into
disclosures, the sources' basis and replacement into popovers and receipts,
and the plans' footnote and the FAQ answers are unchanged. The pinned copy
(H1, subhead, investor cue above the form, "Analyze a deal free", the
listing-link line, the risk line) is unchanged.

## Measurements against the baseline

Lighthouse CI, mobile 390×844, simulated throttling, medians of 3
(`lighthouse-summary.md`):

| Route | Perf | A11y | LCP | TBT | CLS | Script KB | Total KB |
|---|---|---|---|---|---|---|---|
| `/` baseline | 0.89 | 1.00 | 3.8 s | 10 ms | 0.000 | 408 | 651 |
| `/` Phase 3 | 0.89 | 1.00 | 3.8 s | 9 ms | 0.000 | 430 | 637 |
| `/analyze` baseline | 0.86 | 1.00 | 4.1 s | 58 ms | 0.002 | 615 | 841 |
| `/analyze` Phase 3 | 0.84 | 1.00 | 4.5 s | 43 ms | 0.002 | 639 | 794 |
| `/pricing` baseline | 0.91 | 1.00 | 3.5 s | 28 ms | 0.002 | 416 | 648 |
| `/pricing` Phase 3 | 0.92 | 1.00 | 3.3 s | 9 ms | 0.002 | 437 | 598 |

The two islands add 22 KB of script to the homepage (Radix Slider, Radix
Popover and NumberFlow; Motion for React is not on the homepage, the reveals
are CSS). The script budget's warning threshold (256 KB) was already
exceeded at the baseline (408 KB); the overhaul reports against 408. The
build-failing assertions, accessibility ≥ 0.95 and CLS ≤ 0.05, pass.

`npm run perf:homepage` (`perf-homepage.json`): HTML 293,595 B (was 218,654;
NumberFlow renders each figure with a declarative shadow template, about
900 B per figure, and the story's frames render once per step), first-party
JS 427,954 B over 38 requests, LCP 64 ms (lab, unthrottled), CLS 0.00007, no
long tasks, no serious or critical axe violation, the hero's address entry
above the fold at 390×844, no horizontal overflow (`after/facts.json`: none
at 375, 768, 1095 or 1440 on the four captured routes).

## Tests

- Unit: 533 files, 8,894 tests, green (one new file, `sample-deal-sweep`).
- E2E, public project against the local production server:
  `site-overhaul-conversion.spec.ts` and `public-product.spec.ts`, 35 passed
  (the header at ≤ 64px, the cue above the form and clear of the cookie bar
  at 390×664 and 375×629, the hero as an HTML sheet with no preloaded image,
  the analytics events, the 2× zoom reflow, axe AA).
- `tsc`, `lint`: clean.
- Re-anchored (each named in its commit): `homepage-ledger`,
  `site-overhaul-product-shots`, `sample-deal-consistency`,
  `shared-visual-guards` (FAQ rows carry `tc-accordion`),
  `reference-content-truth-guards` (a scroll timeline may draw a stroke,
  never animate opacity, and must sit behind `@supports` and
  `no-preference`). No truth assertion changed; the homepage section names
  are unchanged, so the lockstep and section-set guards pass as they were.

## Impeccable detector

Source scan of the changed files: no primary findings. Rendered scan of `/`:

| Viewport | Before (Phase 0) | Phase 3 |
|---|---|---|
| 1440×900 | 6 (`line-length` ×2, `nested-cards` ×3, `cream-palette`) | 12 (`nested-cards` ×11, `line-length` ×1) |
| 390×844 | 4 (`nested-cards` ×3, `cream-palette`) | 21 (`nested-cards` ×17, `low-contrast` ×4) |

What remains and why it is left (`impeccable-detect-home-*.json`):

- `nested-cards`: the detector counts a rounded, filled or bordered element
  inside another: the plan cards' action buttons, the selected toggle
  button inside its group, and the mock share page's button block. A card
  with a button is the plan card's grammar (DESIGN.md "Plan card"); the
  chips, frames and receipts were flattened to text and rules in this phase
  (45 findings at 1440 at the first scan, 12 now).
- `low-contrast` ×4 at 390 only: the navy band's heading and text, which the
  detector reads against the body background ("solid-background 1.0:1") at
  phone width; at 1440 it reads them correctly, and axe reports no
  violation. Computed from the tokens: white on navy 17.7:1, navy-muted on
  navy 7.2:1.
- `line-length` ×1: the hero's listing-link line at 14px reaches 88
  characters at 1440; it carries pinned copy and now a 62ch cap.

## Captures and video

- `after/`: `/`, `/pricing`, `/analyze`, `/for-agents` at 375, 768, 1095
  and 1440, first screen (hero at rest) and full page, as JPEG; the Phase 0
  equivalents are in `../before/`.
- `hero-drag-1440.webm`, `hero-drag-390.webm`: the first-view glide, a
  pointer drag past asking and back, and the arrow keys.

## Open for the founder at Checkpoint 2

1. Approve the homepage as built, or name the changes, before Phase 4
   (analyzer, results, share page, memo) and Phase 5 (marketing rollout).
2. The hero's sheet starts under the first phone screen (the pinned order
   keeps the cue and the form first); the one-line verdict above the form
   stays. If the founder wants the instrument first on phones, that moves
   the form below it and changes the P1-01 ruling.
3. The two residual detector findings above: accept as documented, or ask
   for buttons without a radius inside cards.
