---
name: TrueCap
description: Blueprint. The deal drawn on a drafting sheet, with every figure sourced and every number alive.
# Decided 2026-10-20 by the founder (OVERHAUL.md, Checkpoint 1): direction B,
# Blueprint, from docs/overhaul-2026-10/directions/. It retires the
# Underwriter's Ledger (Newsprint, Archivo and DM Mono, rules instead of
# cards, no shadow, one motion). Tokens below are the @theme in
# app/globals.css; elevation, focus and motion live in .impeccable/design.json.
colors:
  cobalt: "oklch(0.48 0.19 262)"
  cobalt-deep: "oklch(0.41 0.17 262)"
  cobalt-wash: "oklch(0.95 0.025 262)"
  sheet: "oklch(0.985 0.004 90)"
  card: "oklch(1 0 0)"
  field: "oklch(1 0 0)"
  band: "oklch(0.955 0.005 90)"
  line: "oklch(0.87 0.008 90)"
  rule-soft: "oklch(0.93 0.005 90)"
  graphite: "oklch(0.28 0.01 262)"
  graphite-2: "oklch(0.47 0.01 262)"
  highlight: "oklch(0.70 0.17 55)"
  highlight-text: "oklch(0.55 0.17 50)"
  highlight-wash: "oklch(0.96 0.03 60)"
  positive: "oklch(0.50 0.15 150)"
  negative: "oklch(0.52 0.20 25)"
  destructive: "oklch(0.577 0.245 27.325)"
  destructive-text: "oklch(0.5 0.22 27)"
  warning: "oklch(0.78 0.16 75)"
  warning-foreground: "oklch(0.2 0.05 60)"
  navy: "oklch(0.21 0.035 262)"
  navy-foreground: "oklch(0.93 0.008 262)"
  navy-muted: "oklch(0.72 0.02 262)"
  grid-line: "oklch(0.48 0.19 262 / 0.09)"
  grid-line-major: "oklch(0.48 0.19 262 / 0.16)"
typography:
  display:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.375rem, -0.14rem + 4.474vw, 3.5rem)"
    fontWeight: 750
    lineHeight: 1.02
    letterSpacing: "-0.025em"
  display-sm:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.375rem"
    fontWeight: 750
    lineHeight: 1.02
    letterSpacing: "-0.025em"
  section:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.125rem"
    fontWeight: 750
    lineHeight: 1.08
    letterSpacing: "-0.025em"
  section-sm:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 750
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  h3:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 750
    lineHeight: 1.333
    letterSpacing: "-0.025em"
  h3-sm:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.3125rem"
    fontWeight: 750
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  h4:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
  key-figure:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3.375rem"
    fontWeight: 750
    lineHeight: 1
    letterSpacing: "-0.025em"
    fontVariation: "tabular-nums"
  key-figure-sm:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.375rem"
    fontWeight: 750
    lineHeight: 1
    letterSpacing: "-0.025em"
    fontVariation: "tabular-nums"
  figure:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    fontVariation: "tabular-nums"
  text:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.55
  ui:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.35
  small:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45
  meta:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  none: "0px"
  tag: "4px"
  control: "8px"
  object: "12px"
  float: "14px"
  band: "16px"
  pill: "9999px"
spacing:
  unit: "4px"
  gutter: "16px phone / 24px tablet / 48px desktop"
  section-tight: "48px phone / 64px desktop"
  section: "72px phone / 96px desktop"
  section-open: "96px phone / 128px desktop"
components:
  button-primary:
    backgroundColor: "{colors.cobalt}"
    textColor: "oklch(0.995 0 0)"
    rounded: "{rounded.control}"
    height: "48px marketing / 44px app"
    padding: "0 20px"
  button-primary-hover:
    backgroundColor: "{colors.cobalt-deep}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.graphite}"
    border: "1px solid {colors.graphite-2}"
    rounded: "{rounded.control}"
    height: "48px marketing / 44px app"
    padding: "0 20px"
  button-secondary-hover:
    backgroundColor: "{colors.band}"
  field:
    backgroundColor: "{colors.field}"
    textColor: "{colors.graphite}"
    border: "1px solid {colors.graphite-2}"
    typography: "{typography.ui}"
    rounded: "{rounded.control}"
    height: "48px"
    padding: "0 16px"
  card:
    backgroundColor: "{colors.card}"
    border: "1px solid {colors.line}"
    rounded: "{rounded.object}"
    padding: "20px phone / 24px from 640px"
  plan-card:
    backgroundColor: "{colors.card}"
    border: "1px solid {colors.line}"
    rounded: "{rounded.object}"
    padding: "20px phone / 22px from 640px"
  sheet:
    backgroundColor: "{colors.card}"
    border: "1px solid {colors.line}"
    rounded: "{rounded.object}"
    padding: "20px phone / 26px from 640px"
  band:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.navy-foreground}"
    rounded: "{rounded.none}"
    padding: "72px 0"
  chip:
    rounded: "{rounded.tag}"
    typography: "{typography.label}"
    padding: "5px 8px"
  menu:
    backgroundColor: "{colors.card}"
    border: "1px solid {colors.line}"
    rounded: "{rounded.float}"
    padding: "4px"
---

# Design System: TrueCap

<!-- Rewritten 2026-10-20 at Phase 2 of the UI overhaul (OVERHAUL.md), from
the founder's Checkpoint 1 choice, direction B Blueprint
(docs/overhaul-2026-10/directions/b-blueprint.html, README.md "Decision").
It replaces the 2026-09-30 Underwriter's Ledger decisions. The Phase 0 brief
(docs/overhaul-2026-10/brief.md) records why the old look was retired. The
as-built notes under each section are written as the phases land; where a
section says "Phase 3" or later, the decision is made and the build has not
reached it yet. -->

## North star: Blueprint

A rental deal is a drawing before it is a decision: rent flows in, the mortgage
and the taxes flow out, and what lands at the bottom is the cash flow. TrueCap
draws that on a drafting sheet, annotates every line with where its number
came from, and lets the visitor move the price and watch the drawing answer.
That object, the deal drawn and alive, is the site's signature, on the
homepage, in the analyzer's result and on the memo a client opens.

**The sheet, not the spreadsheet.** The world is the architect's sheet and the
engineer's annotated drawing: a fine grid, graphite lines, leaders and
dimension lines, one highlighter stroke on the number that matters. It is not
the ledger (no columnar pad, no double rule, no mono figures) and not the
generic SaaS page (no icon tiles, no gradient text, no glass).

**Scene, and why light.** An agent reads it on a phone at a showing, in
daylight; the client reads the memo at a desk. So the sheet is light by
default, and dark appears as bands and instrument panels, the sheet inverted,
never as a theme. The tokens are built so a full dark theme is possible later;
no toggle ships in this overhaul.

**Alive, not decorated.** Engagement comes from the product doing something in
front of the visitor: a price that drags, figures that roll to their new
value, a line that draws to show where a number came from. The test for every
effect: does it make a number, a source or a decision easier to understand or
more satisfying to explore? If not, it is cut.

## References

Studied in the browser on 2026-10-20 (docs/overhaul-2026-10/references/).

| Site | Take | Leave |
|---|---|---|
| wise.com | The instrument is the hero: it answers with exact figures at display size before any paragraph; on a phone it is the second thing on screen. | The all-caps condensed display, the lime, speed claims. |
| stripe.com | Product UI drawn in code, layered on soft shadows, with believable numbers; a long page that alternates light product sections and a dark band. | The gradient, the logo strip, sales language. |
| mercury.com | A dark product panel with real-looking figures as the second section; restraint in copy. | The photograph hero, the proof strip, dark-first. |
| ramp.com | The math shown as objects (receipts, cards, matching lines); a dot-grid ground. | Counters, celebrity, chartreuse. |
| plaid.com | Sources on one side, the product in the middle, the result on the other, drawn with lines that mean something. | Gradient text, the banknote engraving, the chat widget. |
| linear.app | A two-line headline, one quiet sentence, the product frame large at the fold; 150 to 250 ms interactions. | Dark-only, the developer register. |
| Architectural drawings, Plaid's flow diagrams | The grid, the dimension line, the leader with its label, the single highlighter stroke. | Blueprint-blue paper (white lines on blue): contrast fails for text. |

## Avoid list

In addition to Impeccable's catalogue (impeccable.style/slop):

- Purple-to-blue gradients, glassmorphism as decoration, sparkle icons,
  identical icon-tile bento grids, gradient text, Inter on white cards.
- A kicker, eyebrow or pill above a heading; "→" in link text; a trailing
  arrow icon on a button; a sideways nudge on hover.
- Uppercase tracked micro-labels. Sentence case everywhere, table heads
  included; acronyms stay acronyms.
- Monospace as a costume: Geist Mono is for metadata (source chips, sheet
  captions, code), never for figures or headings.
- A fade-and-slide-up on every section; `transition: all`; an entrance that
  hides the LCP element or anything above the fold; opacity tied to scroll
  position (audit P1-73).
- A screenshot inside a fake browser frame; a colored halo shadow with no
  offset; a hard offset block shadow.
- Auto-playing video, particle or aurora backgrounds, cursor followers,
  scroll-jacking, a second animation library.
- Fabricated proof of any kind, and the founder's name or face.

## Typography

- **One face.** Hanken Grotesk, the variable font, for display and text:
  750 for H1 to H3, plan names and key figures (the `font-display` utility,
  letter-spacing −0.025em); 600 for labels, terms and figures in a row; 400
  for text. Loaded through `next/font/google` in `app/layout.tsx` with
  `display: swap`, `adjustFontFallback` and `preload`, so the swap moves no
  line. No hand-written `@font-face`.
- **The Figure rule.** A number that will be compared with another, or that
  can change, is set in the text face with tabular numerals (`font-figure`:
  `font-variant-numeric: tabular-nums`). Ledger cells, prices, metric values,
  the Offer Ceiling. A changing figure animates through `AnimatedNumber`
  (NumberFlow), which keeps the same face and the same width.
- **Metadata** (source chips, the sheet's caption, dimension labels, code) is
  Geist Mono at 400 or 500, 12 to 14px, never synthesized bold.
- **Scale.** Label and small 14px, UI 16px, marketing text 18px, H4 20px, H3
  24px (21px on phones), H2 34px (28px on phones), H1 56px easing from 38px
  below 1024px; the key figure 54px, its smaller step 38px. Nothing below 12px.
- **Measure.** Running text 60 to 68ch; the hero paragraph 46ch; FAQ answers
  64ch. Headings `text-wrap: balance`, body `text-wrap: pretty`.

## Color

- **Cobalt is the one action color**: `oklch(0.48 0.19 262)`, #1853c6,
  6.8:1 with white text, 6.5:1 as text on the sheet. Buttons, links, focus
  rings, the active nav item, the grid lines, the dimension line, the
  handle's border. Hover and pressed use cobalt deep (#0d40a4).
- **Graphite ink** `oklch(0.28 0.01 262)`, #26292e, 14:1 on the sheet;
  graphite 2 (#585b61, 6.5:1) carries secondary text and field borders.
  There is no third grey.
- **The sheet** `oklch(0.985 0.004 90)`, #fbfaf7, is the page: off-white with
  the faintest warmth, so the cobalt grid reads as drawn on paper. Cards,
  panels and fields are white (#ffffff). The band (#f1f0ec) is the hover row
  and the quiet surface under a list. Lines: #d6d4ce around objects and under
  heads, #e9e8e4 between rows.
- **The highlight is one warm stroke.** `oklch(0.70 0.17 55)`, #ec7c0e, is a
  fill under the Offer Ceiling (the `highlight-stroke` utility) and the
  meets-range on the price track. It never carries small text (2.8:1); the
  text step is #bb4900 (5.2:1 on white, 4.5:1 on the band), used for a miss
  chip and the headline's "above your ceiling" clause, with the wash #ffeede
  behind a miss chip.
- **The Sign rule holds.** Green (#00792f, 5.5:1) and red (#c21725, 6.1:1)
  are earned by the direction of a flow (rent in, costs out) or by a pass
  against a target, never for emphasis. On the navy band they lighten to
  stay above 4.5:1.
- **Navy is the sheet inverted**: `oklch(0.21 0.035 262)`, #0f1828, for the
  dark bands on marketing pages and the app's rail, with #e5e8ed text and
  #9ea5b2 secondary text (7.2:1). The grid shows through at 5% white.
- **The grid**: cobalt at 9% every 16px and 16% every 80px (`bg-sheet-grid`),
  on the hero and the close; the band draws the same grid in white at 5%
  (`bg-navy-grid`).
- **Retired:** Newsprint, Signal Blue #0066ba, the warm greys, the glows and
  gradients. Legacy token names (`--brand-*`, `--metric-*`) resolve to the
  values above so older call sites cannot drift.

## Elevation

Three steps, named by what sits on them, each with an offset and a soft blur;
no colored halo, no hard offset.

| Step | Token | For |
|---|---|---|
| Rest | `shadow-xs`, `shadow-sm` | A card, a plan card, a result card at rest: a hairline and a soft cobalt-tinted shadow 12px below. |
| Float | `shadow-md` | Menus, popovers, tooltips, dialogs, the sticky bars (`shadow-float-up` for bars on the bottom edge). |
| Panel | `shadow-lg` | The hero sheet, the dark instrument panel, the pinned product frame of the scroll story. |

Every float keeps a 1px line under its shadow. A hovered plan card lifts 2px
and takes the float shadow; reduced motion keeps it still.

## Motion

- **Tokens.** `--duration-fast` 150ms (state), `--duration-base` 220ms
  (reveal, chip flip), `--duration-slow` 420ms (a section's reveal),
  `--duration-draw` 700ms (a line drawing); `--ease-out`
  cubic-bezier(0.2, 0.8, 0.2, 1) and `--ease-in-out`. `lib/motion.ts` mirrors
  them for Motion for React, with one spring (`settleSpring`) for figures and
  the price handle.
- **One library.** Motion for React through `MotionProvider` (LazyMotion with
  `domAnimation`, `strict`, `MotionConfig reducedMotion="user"`); `domMax`
  loads lazily on the one island that drags. NumberFlow for every changing
  figure. CSS scroll-driven animation (`animation-timeline: view()`) for
  simple reveals and progress, inside `@supports` and
  `prefers-reduced-motion: no-preference`, with the visible state as the
  default. Nothing else.
- **Rules.** Transform and opacity only; the default state is the complete
  page (nothing above the fold starts hidden, the H1 never animates); one
  authored moment per surface, not an entrance on every section; a figure
  announces its change politely and only when a drag ends; reduced motion
  shows the end state everywhere.
- **The homepage's moments** (Phase 3): the price handle glides once from
  asking to the ceiling and the verdict flips; the scroll story's frame
  changes as three steps pass; the sources draw their leaders into the
  result; the co-branding preview recolors as you type.

## Chrome

- **Focus** is a 3px cobalt outline with a 2px offset on every control
  (`!important`, a floor over the primitives' rings). Menu items and listbox
  options show the band plus an inset 2px cobalt ring. Controls are at least
  44×44px; marketing buttons and fields are 48px tall.
- **Radius by role.** 4px tags and chips; 8px controls (buttons, fields);
  12px objects (cards, panels, the sheet); 14 to 16px floats; full round for
  switch tracks, avatars, the price handle and status dots. Rules and tables
  have none.
- **Lines carry structure inside an object**; objects carry it on the page.
  A sheet or a card opens with a 1px line, not a heavy rule; rows inside sit
  on soft lines; a caption row is Geist Mono. The 2px graphite rule survives
  in one place: under a key figure's label row in a result card.
- **Header:** the sheet at 90% with a blur, one bottom line, no shadow;
  Analyze · For agents · For investors · Pricing · Learn; "Create account" is
  a primary button at the control radius. It condenses on scroll (Phase 3).
- **Footer:** the sheet, lines between column groups, sentence-case heads,
  one Disclaimer with unchanged text.
- **Sticky chrome never hides focus:** scroll padding clears the header and
  whatever is fixed to the bottom edge (the sticky conversion bar, the cookie
  banner, which is compact and never covers the hero's first screen from
  Phase 3).
- **Browser surfaces are themed:** selection is the band, the caret is cobalt,
  figures are tabular, the theme color is the sheet (Phase 7).

## Components

Every fix lands in one of these, never as a page-local override.

- **Buttons:** primary (cobalt, white text, 8px), secondary (graphite text,
  graphite-2 border, the band on hover), link (cobalt, underlined 1px at a
  3px offset). No trailing icon. Transitions name their properties at 150ms;
  press scales to 0.98.
- **Field:** white, 1px graphite-2 border, 8px radius, 48px tall, 16px text
  on phones. The address field is the one field a marketing page shows.
- **Card** (`components/ui/card.tsx`): white, 1px line, 12px, the rest
  shadow. Used for objects the visitor compares or acts on: plan cards, the
  result card, a saved deal; not for lists, sources or FAQs.
- **Plan card:** white, 1px line, 12px, the rest shadow, lifting on hover; the
  name in the display voice, the price as a display figure from the catalog,
  the answers as a ruled definition list, one action; a CSS subgrid of five
  bands so prices and actions line up across a row.
- **Sheet** (Phase 3): the instrument panel the hero sets the sample deal in:
  white on the grid, 12px, the panel shadow, a Geist Mono caption row, the
  schematic, the price track, the readout and the key figure on the
  highlight stroke.
- **Price track** (Phase 3): a Radix Slider in the sheet's grammar, the rail a
  1.5px graphite line with end ticks, the meets-range a highlight fill, the
  handle a cobalt-bordered diamond, markers for asking and the ceiling as
  dimension labels in Geist Mono. `aria-valuetext` reads the price, the cash
  flow and the target; it announces on release, not per tick.
- **Target chip:** 4px, label weight; meets on the positive wash in green,
  misses on the highlight wash in the highlight text color, with the gap in
  dollars ("Misses by $196"). Every state exists in the DOM; the active one is
  struck forward.
- **Source chip:** Geist Mono at 12px on a 1px line, pill-shaped, "Rent
  $3,050 · HUD FMR". Opens a `SourcePopover`: the source, its date or basis,
  what to replace it with.
- **Figure** (`LedgerFigure`): `font-figure`. **Key figure** (`LedgerTotal`):
  the display voice with tabular numerals; on the homepage it carries the
  highlight stroke (Phase 3).
- **Section:** the sheet, a 1px line on top (or none after a hero), one of
  three rhythms, the shared 1280px container with 16/24/48px gutters. A hero
  adds `bg-sheet-grid`; a band is `bg-navy-grid`.
- **FAQ:** native `details` rows on lines, the question at 18px/600, a
  plus-minus mark, answers capped at 64ch; animated open and close from Phase
  3 (`interpolate-size`, grid rows), still one FAQPage node mirroring the
  visible text.
- **Menu, popover, tooltip, dialog, sheet:** white, 1px line, 14 to 16px, the
  float shadow; open and close transitions at the base duration.
- **Motion parts** (`components/motion/`): `MotionProvider`, `Reveal`,
  `Stagger` and `StaggerItem`, `AnimatedNumber`, `SourcePopover`.

### Page parts

`PageHero` (the hero's 5/7 grid and display voice, with an aside in the wide
column), `ActionRow`, `RuledList`, `StepList`, `Note`, `CloseSection`
(`components/marketing/page-parts.tsx`); `ToolFrame`, `ToolResult`,
`ToolFormula` for calculators; `VsHero` and `VsMatrixTable` for comparison
pages; `ArticleBody` with `prose-ledger` for articles. Each takes the tokens;
Phase 5 restyles their internals and the pages follow.

## The homepage (Phase 3)

1. **Hero:** left, the pinned copy (H1, subhead, the investor cue above the
   form, the address form, the listing-link line, the risk line); right, the
   sheet: the schematic (rent in on the left in green, mortgage and taxes out
   on the right in red, cash flow landing under the house on a dashed
   leader), the price track, the three-figure readout with target chips, the
   Offer Ceiling on the highlight stroke. The sheet is server-rendered at the
   ceiling state from a precomputed sweep (`calculateAnalysis` in $1,000
   steps); the island hydrates onto it. On phones the schematic gets its own
   layout and the readout stacks.
2. **From listing to offer:** a pinned sheet that changes as three steps
   scroll past; the full line items behind "See every line".
3. **Every number has a receipt:** the sources as a drawn flow into the result.
4. **Make it yours:** the live co-branding preview.
5. **Plans:** the toggle, cards with hover depth, the comparison table.
6. **Built by a rental investor, the eight questions, the close on a navy band
   with the address form.**

## The marketing pages (Phase 5)

Every marketing page is set from the shared parts, so the rollout changed
the parts and the pages followed:

- **Lines, not heavy rules.** The 2px graphite rule survives only under a
  key figure's label row (the Offer Ceiling in a result card, a
  calculator's result). Every list, table, FAQ, figure strip and close opens
  on a 1px graphite line (`border-t border-foreground`); rows sit on soft
  lines. `RuledList`, `StepList`, the `/vs` lists and matrix, the market
  and state tables, the FAQ rows, the related-posts lists and `prose-ledger`'s
  tables and blockquotes all moved together.
- **The sheet under the hero and the close.** `PageHero`, `VsHero` and
  `CloseSection` carry `bg-sheet-grid`; the sections between them are the
  plain sheet. `cn()` treats the two grid tiles as their own group, so a
  section keeps its paper under the grid.
- **Figures and numerals in the text face.** Step numbers (`StepList`, the
  `/vs` ordered lists) and the posts' tables are `font-figure`; Geist Mono
  stays for metadata (a 404's code, a case study's kind).
- **The calculator is an instrument.** `ToolFrame` is a card (white, 1px
  line, 12px, the rest shadow); `ToolResult`'s label sits on the 2px rule
  with the key figure under it in the display face; `ToolFormula` sits
  between two lines. The same frame renders chrome-free in the `/embed`
  iframes.
- **The key figure's stroke draws in.** `LedgerTotal` lost the ledger's
  double rule; `draw` now animates the highlight stroke's width once
  (`highlight-stroke-draw`), the hero's and the memo's one motion.
- **404 and error pages** are the sheet grid, a Geist Mono code, the display
  heading, the 48px search field, a primary control and a ruled list of
  places to go. `global-error` keeps inline styles (no stylesheet loads
  there) in the Blueprint hex.
- **Case studies** (when one is publishable) are a ruled article block, not
  a rounded card with uppercase labels.

## The app (Operate mode)

### What Phase 6 set

- **The shell.** The rail is the navy band's navy (`--sidebar` is the band's
  token); its links are 8px controls with the cobalt focus ring, the active
  link on the accent surface, the deal count and the "Pro" tag as 4px tags
  (figure face for the count, Geist Mono for the tag). The top bar is the
  sheet at 90% with a blur and one bottom line; its search is the field
  (white, 1px line, 8px); its action is a primary control. The mobile drawer
  carries the same navy tokens.
- **Stat cards** are white cards at the object radius with the rest shadow:
  a 12px medium label, the figure in the display face, a signed change in
  the direction's colour, no icon tile and no trend pill.
- **Page headings** are the display face at the section sizes (the deal
  workspace and the shortlist at the H3 step). Route-error cards use the
  same face.
- **Panels and tables.** Every card is the object radius; inner blocks and
  fields are 8px; pills are 4px tags; figures are `font-figure`; the only
  monospace left is metadata (a share URL, a file name). Table rows take a
  soft hover (`hover:bg-muted/40`) and keep the 3px focus ring.
- **Status chips** follow the Sign Rule: meets on the positive wash in green,
  misses on the highlight wash in the highlight text colour; nothing is
  white-on-green or white-on-orange.
- **Empty states** name the next action and offer the sample deal
  (`/dashboard/new?sample=1`) beside it: the dashboard home, My Deals and
  Compare. No illustration, no icon tile.
- **The auth screens** keep the paper split layout and gain the live mini
  instrument: the homepage's sample-deal sheet (`HeroSheet`) beside the
  form, above the three trust rows.
- **Link text** carries no arrow; the arrows that remain are data (a stage
  change, an axis label).

The app reads the same tokens: the sheet, graphite, cobalt, white cards with
the rest shadow, tabular figures, the radius scale. It is denser (14 to 16px
text, 44px controls) and quieter. The navy rail is the marketing band's navy,
so marketing and app are one product.

### The analyzer and the result (Phase 4)

- **Input.** The address field is hero-sized (48px, 56px from `sm:`), the
  first and largest field on the page; the page heading is the display face.
  Cards on the form are the 12px object radius with the rest shadow; the Run
  button is a control (8px). Source chips on defaults are Geist Mono tags
  (4px radius) with a dot-free badge; the advanced block eases in when it
  opens (`tc-disclosure`). The step rail is the existing jump-nav, restyled;
  it shows after a run.
- **Result card.** One white card at the object radius with the rest shadow
  (no coloured border, no blue wash). The verdict is the display face; the
  Offer Ceiling sits under the 2px graphite rule on the highlight stroke at
  the key-figure size, then the price track (asking against the ceiling and
  the gap), then the first-year figures on soft rules, the target state as a
  dot and a label, and the best next step on a 2px cobalt left rule. Nothing
  on the card is uppercase or monospaced except the "Base analysis" tag.
- **The reveal.** `ResultReveal` plays once per run (the inputs' fingerprint
  is the key): the verdict, the ceiling rolling in through `AnimatedNumber`,
  the price track, the figures, the chips, the next step, 150ms apart, about
  a second in all; nothing under reduced motion, and never again until the
  inputs change. After that, figures animate between values (the live
  preview's cash flow, cap rate and DSCR roll on every keystroke).
- **The summary bar.** Once the decision card scrolls under the header, a
  zero-height sticky slot shows the card's own headline (read from its h2),
  the ceiling and the asking price, and a "Decision" button back; hidden, it
  is inert.
- **Charts** animate their first draw only (`useChartDrawAnimation`): a
  scenario toggle redraws without an entrance. Skeletons share the card
  radius.
- **The share page and the memo** are documents: the same card and figure
  grammar, the brand colour's text picked by contrast (`textOnBrand`), the
  chrome hidden in print (`data-print-hide`).

## Token strategy

- One stylesheet, `app/globals.css`: `:root` holds the palette, the radius
  base, the navy, the grid and the motion tokens; `@theme` maps them to
  Tailwind (`--color-*`, `--radius-*`, `--shadow-*`, the `--text-*` ramp);
  utilities add `font-display`, `font-figure`, `bg-sheet-grid`,
  `bg-navy-grid`, `highlight-stroke`, `tc-link`, `prose-ledger`.
- Fonts in `app/layout.tsx` and the three family declarations in
  `app/globals.css` (root, `.dashboard-shell`, `.dashboard-mobile-sheet`).
- `lib/motion.ts` and `components/motion/` are the motion system; no
  component defines a duration or an easing of its own.
- Converted since: the analyzer's class strings (Phase 4), the dashboard's
  gradients and the `.dashboard-shell` scope (Phase 6), the OG frame
  (`lib/og/newsprint.tsx`, the tokens as hex constants for `next/og`),
  `public/product/*`, the PDF palette and the email templates (Phase 7).

## The assets (Phase 7)

- **Social cards.** One frame (`lib/og/newsprint.tsx`, its historical name)
  draws every card: the sheet with its faint cobalt grid (two 1px
  gradients on a 32px tile, as `bg-sheet-grid`), the wordmark over one
  graphite line, the label in Geist Mono, the content, a soft line over the
  footer with the URL in cobalt Geist Mono. Hanken Grotesk at 750 is the
  display face, 400 and 600 the text and figures, Geist Mono the metadata;
  the faces are fetched from Google Fonts once per server process, and a
  card without them still renders. Tags are 4px Geist Mono tags; a key
  figure (the homepage card's Offer Ceiling) sits on the highlight stroke
  under the one 2px rule. `public/home.jpg` is a snapshot of `/og/home`.
- **Product shots** (`public/product/*`) are captured from the local
  production build of the sample flow and the memo by
  `scripts/capture-screenshots.ts`; they picture the Blueprint result card,
  the rent breakdown and the memo. The PDF cover shot is the real first
  page of the sample report (`scripts/render-pdf-cover-shot.ts`).
- **The PDF** keeps its layout and Helvetica; its palette is the Blueprint
  hex (graphite ink and its muted step, the sheet and its lines, one
  cobalt, the text-safe green and highlight-text), so the cover shot and the
  site agree.
- **Theme colour** and the manifest's colours are the sheet (`#fbfaf7`).
- **Emails** (the lifecycle, rate and rent alerts, the weekly summary, the
  five Supabase auth templates, the memo email) are on the Blueprint hex
  with system fonts: the sheet, the card, the band, the soft line, graphite,
  cobalt with white on it, the positive green and the negative red. The
  retired newsletter's template keeps its own palette.

## Decisions log

- 2026-09-30, checkpoint 1 and 2 (founder): the Underwriter's Ledger
  (Archivo, Newsprint, the ledger hero, the navy rail kept). Retired
  2026-10-20; the record is in git history and `docs/design-pass/`.
- 2026-10-20 (founder, OVERHAUL.md §0): the Ledger look is retired as "a
  beige spreadsheet"; the replacement is a modern, premium, engaging fintech
  interface that still answers at a glance. Product truth, trust, SEO,
  accessibility, performance, security and engineering rules do not move.
- 2026-10-20, Checkpoint 1 (founder): direction B, Blueprint, over A Deal
  Desk and C Big Numbers (`docs/overhaul-2026-10/directions/`). Phase 2 built
  the tokens from the comp: the sheet and its cobalt grid, graphite, Hanken
  Grotesk for display and text, Geist Mono for metadata, cobalt for actions,
  the warm highlight reserved for the Offer Ceiling, green and red only as
  the direction of a flow or a pass and a miss, dark bands as the inverted
  sheet. The Impeccable seed roll (`b4bde2cc`) dealt six catalogue
  challengers, all declined; three disciplines were kept (ballistics on the
  handle and figures, every chip state present in the DOM, hierarchy by
  figure size).
- 2026-10-20, Phase 2 build notes: the display and figure voices are
  utilities on one face, so `cn()` treats `font-display` and `font-figure` as
  their own groups; the legacy `--brand-*` and `--metric-*` names stay as
  literal values for the contrast guards; Stripe Checkout branding sends the
  sheet and cobalt; emails keep Newsprint until Phase 7.
- 2026-10-20, Phase 4 build notes: React 19.2.6 (stable) does not export
  `ViewTransition` (only Next's vendored canary does, and the unit tests run
  against the stable copy), so the hero-to-analyzer address morph is skipped
  per OVERHAUL.md §4 rather than shimmed; the phone bottom sheet for
  assumptions is a proposal (the form's DOM and react-hook-form registration
  would have to move); the step rail keeps its post-run-only rule (the hero
  and the source chips carry input-phase wayfinding, per its code comment).
- 2026-10-20, Phase 5 build notes: the eight unreleased calculator pages
  (`UNRELEASED_UNDERWRITING_CALCULATORS`) and the flagged BRRRR calculator
  redirect or stay dark, so their page-local markup is left for the release
  that ships them; `/for-agents` redirects to `/pricing` until Agent Pro's
  price is configured, so a local build needs
  `STRIPE_PRICE_AGENT_PRO_MONTHLY` to render it; the product shots in
  `public/product/*` still show the ledger-era analyzer until Phase 7
  regenerates them.
- 2026-10-20, Phase 7 build notes: the card frame keeps its module and
  export names (`lib/og/newsprint.tsx`, `NEWSPRINT`, `NewsprintFrame`,
  `loadNewsprintFonts`) because 130 card files, the SEO loop's skills and
  a share-page guard import them; the values are the Blueprint tokens. The
  ten-year and comparison shots stay deferred (they need a seeded account).
  The site's icons (black mark, `#2a7bbf` accent) predate the Ledger and
  were left for a separate brand decision.
- 2026-10-20, Phase 6 build notes: no local Supabase or Docker on the
  founder's machine, so the signed-in e2e specs run in CI only; the shell
  and the auth screens were checked through a render harness (a vitest file
  renders a surface with mock data to HTML beside the built stylesheet;
  `docs/overhaul-2026-10/tools/static-shot.mjs` screenshots it). The
  `rehab-estimator-card` default rendering stays byte-pinned; the agent
  branding form's default colour is the brand's data, not a token.

## Do and don't

**Do:** take every color, radius, shadow, duration and font from tokens; set
every figure in `font-figure` and every changing figure through
`AnimatedNumber`; give every interactive demo a keyboard path and a static
end state; keep one Disclaimer per marketing page; keep controls at 44px with
the 3px ring; keep `text-base` on inputs below `md`; use `next/image` with
intrinsic sizes.

**Don't:** add a theme toggle, a second accent, gradient text, a glow, an
eyebrow, an arrow suffix, an uppercase label, a mono figure, a card around a
list, a colored halo, `transition-all`, an entrance on the LCP element, or a
second animation library; put text below 12px; fabricate proof.
