# Phase 5: the marketing rollout (2026-10-20)

The marketing pages brought onto the Blueprint grammar through the shared
templates, on branch `design/overhaul-2026-10-phase-5` (stacked on Phase 4).
Phase 5 has no checkpoint; Phase 6 (the app) follows.

## What Phase 2 had already done, and what was left

Phase 2 rewrote the tokens, the fonts, the header, the footer, `Section`,
`PlanCard`, the FAQ rows and the `prose-ledger` article body, and every
marketing page is set from those parts (`PageHero` on 36 pages, the article
frame on 70 posts, `VsHero` on 38 comparisons, the market and state data
parts, the calculator parts). So at the start of this phase the pages were
already in the Blueprint type and colour, and the rendered detector found
almost nothing on them (`detector-before/`: 17 routes at 1440 and 390, 0 to
4 findings each, 24 of 34 scans clean).

What was left was the Ledger's structural grammar inside the parts: the
2px ink rule opening every list, table and close (47 of them across 31
files), DM Mono step numerals, the ledger's double rule under every key
figure, calculators printed on a rule instead of set as an instrument, and
four page-local surfaces that had never been converted (the 404 page, the
error page, the global error page, the case-study block).

## What changed

### The shared parts

- **Lines, not heavy rules.** `RuledList`, `StepList`, `Section
  rule="heavy"`, `CloseSection`, the `/vs` TL;DR lists, prose lists and
  matrix table, `DataFaq`, `ComparisonFaq`, `FaqSection`, the related-posts
  lists, `SeoAnalyzerCta`, the testimonials, the market and state tables and
  figure strips (`DATA_TABLE_CLASS`, `DATA_FIGURES_CLASS`), the hubs
  (`/tools`, `/markets`, `/states`, `/glossary`, `/blog`, `/vs`, `/reviews`,
  `/pricing`, `/embed`), the persona pages and `prose-ledger`'s tables and
  blockquotes open on a 1px graphite line. The 2px rule survives under a key
  figure's label row only (the result card, the share view, the memo, the
  hero's sheet, `ToolResult`).
- **The sheet grid** under `PageHero`, `VsHero` and `CloseSection`, as under
  the homepage hero. `cn()` learned that `bg-sheet-grid` and `bg-navy-grid`
  are their own class group (`lib/utils.ts`), so a section keeps
  `bg-background` beside the grid.
- **Numerals in the text face.** `StepList` and the `/vs` ordered lists
  number in `font-figure`; the five posts that set tables in `font-mono`
  (155 cells) set them in `font-figure`.
- **The calculator as an instrument.** `ToolFrame` is a card (white, 1px
  line, the object radius, the rest shadow); `ToolResult`'s label sits on the
  2px rule with the key figure under it; `ToolFormula` sits between two 1px
  lines. The same frame renders chrome-free inside the `/embed` iframes (the
  embed guards are unchanged).
- **`LedgerTotal`** lost the ledger's double rule and its draw-in; `draw` now
  animates the highlight stroke's width once (`highlight-stroke-draw` in
  `globals.css`), the hero's and the memo's one motion. The `.ledger-rule`
  CSS went with it; the `ledger-bleed` band helpers stay for the homepage
  ledger's binding row.
- **`LedgerCaption`** closes on a 1px line.

### The page-local surfaces

- **404** (`app/not-found.tsx`): the sheet grid, a Geist Mono "404", the
  display heading, the 48px search field on the field tokens, one primary
  control, and the popular pages as a ruled list (no icon tiles, no cards,
  no arrow icons). The copy, the search form, the glossary count and the
  "Market guides" link are as the guards pin them.
- **Error** (`app/error.tsx`): the same grammar; "Try again" is a primary
  control and "Go home" a text link.
- **Global error** (`app/global-error.tsx`): inline styles only, as before
  (no stylesheet loads there), now in the Blueprint hex (the sheet, graphite,
  cobalt), weight 750 heading, 8px control, no uppercase.
- **Case study** (`components/marketing/case-study.tsx`, mounted on the
  homepage when a study is publishable): a ruled article block in a
  `Section` with a `SectionHeading`, labels at 12px medium, the quote on a
  line; no rounded card, no uppercase, no quote icon.

### Left as they are, and why

- The eight unreleased calculator pages (`UNRELEASED_UNDERWRITING_CALCULATORS`
  in `lib/calculator-registry.ts`) `permanentRedirect` and the BRRRR
  calculator is behind a flag, so their page-local markup is not rendered;
  they convert with the release that ships them.
- `rehab-estimator-card.tsx`'s default rendering is byte-pinned to the
  signed-in checkpoint (`tools-template-t2`); its `variant="tool"` rendering
  takes the new `ToolFrame`.
- The product shots in `public/product/*` (the `/vs` pages, the persona
  pages, `/pricing`) still picture the ledger-era analyzer; Phase 7
  regenerates them.
- `/for-agents` redirects to `/pricing` until Agent Pro's Stripe price is
  configured, so the local measurement build sets a placeholder
  `STRIPE_PRICE_AGENT_PRO_MONTHLY`; production has the real one.
- "→" inside a `<strong>` in two `/vs` prose lists and in 13 posts is copy
  the SEO loop owns; the chrome rule bans it in link text, which no page
  does.

## Measurements

Lighthouse CI, mobile 390×844, simulated throttling, medians of 3 on a
quiet machine (`lighthouse-summary.md`):

| Route | Perf | A11y | LCP | TBT | CLS | Script KB | Total KB |
|---|---|---|---|---|---|---|---|
| `/` Phase 5 | 0.89 | 1.00 | 3.8 s | 17 ms | 0.000 | 424 | 625 |
| `/analyze` Phase 5 | 0.86 | 1.00 | 4.2 s | 44 ms | 0.002 | 624 | 797 |
| `/pricing` Phase 5 | 0.88 | 1.00 | 3.9 s | 21 ms | 0.002 | 437 | 611 |

Within noise of Phase 4 on every figure; the build-failing assertions
(accessibility ≥ 0.95, CLS ≤ 0.05) pass; the warnings are the baseline's.

`after/facts.json`: no horizontal overflow on any of the twelve captured
routes at 375, 768, 1095 or 1440; Hanken Grotesk and Geist Mono are the only
faces; one Disclaimer on each marketing page.

## Tests

- Unit: 533 files, 8,984 tests, green.
- E2E, public project against the local production build:
  `site-overhaul-conversion.spec.ts` and `public-product.spec.ts`,
  35 passed (the homepage hero and its sheet, the cue above the form
  at 390 and 375, the sample flow, the pricing page, the calculators' hand-off
  to the analyzer, axe AA on the homepage and pricing).
- `tsc`, `lint`: clean.
- Re-anchored (each named in its commit): `shared-visual-guards` (the close
  on a 1px line over the grid; the /why-truecap blocks on 1px lines),
  `tools-template-t2` (ToolFrame as the card; the key figure without the
  double rule), `vs-design-pass` (the prose lists on 1px lines, the step
  numbers in the figure face), `article-frame` (the inline FAQ rows),
  `pricing-responsive-guards` (the pricing rows and table). No truth
  assertion changed: the copy, links, prefetch rules, structured data,
  Disclaimer counts, the 44px and 16px floors and the embed's chrome-free
  contract are asserted as before. `rehab-estimator-card`'s byte pin to the
  signed-in checkpoint holds (its tool rendering takes the new frame; its
  default rendering is untouched).

## Impeccable detector

Rendered scans of the local production build, 18 routes at 1440×900 and
390×844 (`detector-before/`, `detector-after/`):

| | Before this phase | Phase 5 |
|---|---|---|
| Scans with no finding | 24 of 34 | 14 of 36 |
| Findings in all | 19 | 42 |
| Of which `low contrast text` at 390 | 0 | 26 |

The rise is one artifact: at phone width the detector samples the sheet
grid behind a hero's H1 or a close's heading from a canvas
("canvas-background-image+alpha, 1.4:1") while reporting the real median at
14:1; at 1440 it reads the same elements correctly, and axe (the e2e AA
audit on the homepage and pricing) reports no violation. Phase 3 recorded
the same artifact on the navy band. Without it, Phase 5 reads 16 findings
across 36 scans against 19 across 34: the baseline's em-dashes, the market
page's long lines and cramped data cells, `/for-investors`' three crowded
headings and the playbook's tight line height, all page copy or data-table
layout, none introduced here; the 404 page's eyebrow finding is gone.

## Captures

`before/` and `after/`: `/for-agents`, `/for-investors`, `/pricing`,
`/about`, `/tools/cap-rate-calculator` (which resolves to its guide post),
`/vs/avail`, `/markets/atlanta`, `/glossary`, `/playbook`,
`/blog/1-percent-rule-rental-property` and `/states` at 375, 768, 1095 and
1440, first screen and full page, as JPEG; `after/` adds the 404 page.
