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
    fontFamily: "Hanken Grotesk, TrueCap Text Fallback Roboto, TrueCap Text Fallback Liberation Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.375rem, -0.14rem + 4.474vw, 3.5rem)"
    fontWeight: 750
    lineHeight: 1.02
    letterSpacing: "-0.025em"
  display-sm:
    fontFamily: "Hanken Grotesk, TrueCap Text Fallback Roboto, TrueCap Text Fallback Liberation Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.375rem"
    fontWeight: 750
    lineHeight: 1.02
    letterSpacing: "-0.025em"
  section:
    fontFamily: "Hanken Grotesk, TrueCap Text Fallback Roboto, TrueCap Text Fallback Liberation Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.125rem"
    fontWeight: 750
    lineHeight: 1.08
    letterSpacing: "-0.025em"
  section-sm:
    fontFamily: "Hanken Grotesk, TrueCap Text Fallback Roboto, TrueCap Text Fallback Liberation Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 750
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  h3:
    fontFamily: "Hanken Grotesk, TrueCap Text Fallback Roboto, TrueCap Text Fallback Liberation Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 750
    lineHeight: 1.333
    letterSpacing: "-0.025em"
  h3-sm:
    fontFamily: "Hanken Grotesk, TrueCap Text Fallback Roboto, TrueCap Text Fallback Liberation Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.3125rem"
    fontWeight: 750
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  h4:
    fontFamily: "Hanken Grotesk, TrueCap Text Fallback Roboto, TrueCap Text Fallback Liberation Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
  key-figure:
    fontFamily: "Hanken Grotesk, TrueCap Text Fallback Roboto, TrueCap Text Fallback Liberation Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3.375rem"
    fontWeight: 750
    lineHeight: 1
    letterSpacing: "-0.025em"
    fontVariation: "tabular-nums"
  key-figure-sm:
    fontFamily: "Hanken Grotesk, TrueCap Text Fallback Roboto, TrueCap Text Fallback Liberation Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.375rem"
    fontWeight: 750
    lineHeight: 1
    letterSpacing: "-0.025em"
    fontVariation: "tabular-nums"
  figure:
    fontFamily: "Hanken Grotesk, TrueCap Text Fallback Roboto, TrueCap Text Fallback Liberation Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    fontVariation: "tabular-nums"
  text:
    fontFamily: "Hanken Grotesk, TrueCap Text Fallback Roboto, TrueCap Text Fallback Liberation Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.55
  ui:
    fontFamily: "Hanken Grotesk, TrueCap Text Fallback Roboto, TrueCap Text Fallback Liberation Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Hanken Grotesk, TrueCap Text Fallback Roboto, TrueCap Text Fallback Liberation Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.35
  small:
    fontFamily: "Hanken Grotesk, TrueCap Text Fallback Roboto, TrueCap Text Fallback Liberation Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45
  meta:
    fontFamily: "Geist Mono, TrueCap Mono Fallback Roboto, TrueCap Mono Fallback Liberation Sans, ui-monospace, monospace"
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
  line. next/font's fallback is `local("Arial")`, which Android and most
  Linux machines lack; four generated faces (Hanken Grotesk and Geist Mono
  against Roboto and Liberation Sans, `scripts/font-fallback-metrics.mjs`,
  next/font's own formula) follow it in the family stacks (trust pass,
  2026-10-21). No other `@font-face`.
- **The Figure rule.** A number that will be compared with another, or that
  can change, is set in the text face with tabular numerals (`font-figure`:
  `font-variant-numeric: tabular-nums`). Ledger cells, prices, metric values,
  the Offer Ceiling. A changing figure animates through `AnimatedNumber`
  (NumberFlow), which keeps the same face and the same width.
- **Metadata** (source chips, the sheet's caption, dimension labels, code) is
  Geist Mono, 12 to 14px, never synthesized bold. The `tc-meta` utility sets
  it at 500 and 12px, and 500 renders only where a call site takes it: the
  hero sheet's caption, track labels and source chips, the story's captions,
  the receipts' tags, and on the result's track the labels on their ticks
  and the gap label. Every other call site still sets `font-mono` alone and
  renders at 400: the analyzer's and the result's source tags, the "Base
  analysis" and "Pro" tags, the result track's labels when they keep to the
  row's ends, the static track on the sample memo and the share page, the
  sample memo's source lines (14px), the co-branding preview's captions, a
  source popover's source line, the 404 and error codes, a case study's
  kind and the app's tags.
- **Scale.** Label and small 14px, UI 16px, marketing text 18px, H4 20px, H3
  24px (21px on phones), H2 34px (28px on phones), H1 56px easing from 38px
  below 1024px; the key figure 54px, its smaller step 38px. Nothing below 12px.
  The two dense product steps (`text-2xs`, `text-3xs`) are both 12px.
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
  panels and fields are white (#ffffff). The band (#f1f0ec) is the hover row,
  the quiet surface under a list and the Pro column of /pricing's comparison.
  Lines: #d6d4ce around objects and under heads, #e9e8e4 between rows.
- **The highlight is one warm stroke.** `oklch(0.70 0.17 55)`, #ec7c0e, is a
  fill under the Offer Ceiling (the `highlight-stroke` utility) and the
  meets-range on the price track. It never carries small text (2.8:1); the
  text step is #bb4900 (5.2:1 on white, 4.5:1 on the band), used for a miss
  (a miss chip, the headline's "above your ceiling" clause, the hero's cash
  flow above the ceiling) and for the ceiling's side of a price track (its
  "Ceiling $X" label and tick, the dashed gap and the gap label under it,
  the what-if line), with the wash #ffeede behind a miss chip.
- **The Sign rule holds.** Green (#00792f, 5.5:1) and red (#c21725, 6.1:1)
  are earned by the direction of a flow (rent in, costs out) or by a pass
  against a target, never for emphasis. On the navy band they lighten to
  stay above 4.5:1: inside `[data-tone="navy"]` green is
  oklch(0.72 0.15 150), red is oklch(0.70 0.17 25) and the highlight text is
  the highlight itself, oklch(0.70 0.17 55).
- **Navy is the sheet inverted**: `oklch(0.21 0.035 262)`, #0f1828, for the
  dark bands on marketing pages and the app's rail, with #e5e8ed text and
  #9ea5b2 secondary text (7.2:1). The grid shows through at 5% white. A band
  is where the product itself sits inverted: one mid-page band, on the
  homepage only (the receipts), and a close. No other section is tinted.
  Inside a band the tokens are remapped by the `[data-tone="navy"]` scope
  (white primary with cobalt text, light lines, a lighter cobalt focus ring
  at 4.8:1), and `data-tone="sheet"` restores the light tokens for a white
  card set in it. The homepage close is the exception: it draws its navy by
  class (`bg-navy-grid`, the `navy-*` colours), outside the scope.
- **The grid**: cobalt at 9% every 16px and 16% every 80px (`bg-sheet-grid`),
  on the hero and on a close that stays on the sheet; a band draws the same
  grid in white at 5% (`bg-navy-grid`). The grid is where the deal is drawn:
  the address form sits on it in a hero and in the homepage close, and the
  auth form does not.
- **Retired:** Newsprint, Signal Blue #0066ba, the warm greys, the glows and
  gradients. Legacy token names (`--brand-*`, `--metric-*`) resolve to the
  values above so older call sites cannot drift.

## Elevation

Three steps, named by what sits on them, each with an offset and a soft blur;
no colored halo, no hard offset.

| Step | Token | For |
|---|---|---|
| Rest | `shadow-rest` (`shadow-sm`), `shadow-xs` | A card, a plan card, a result card at rest: a hairline and a soft cobalt-tinted shadow 12px below. |
| Float | `shadow-float` (`shadow-md`) | Menus, popovers, tooltips, dialogs, the sticky bars (`shadow-float-up` for bars on the bottom edge). |
| Panel | `shadow-panel` (`shadow-lg`) | The hero sheet, the receipts' white result sheet in the navy band, the product frame of the scroll story. |

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
- **The homepage's moments** (Phase 3; the first revised in the trust pass,
  2026-10-21): when the price track is first seen, its meets-range reaches
  out to the asking marker and draws back to the ceiling (scale only); the
  handle never moves by itself, and the moment is skipped when hydration
  lands more than a second after first paint or a pointer touched the sheet
  first; the scroll story's one sheet
  accumulates a step's rows as the step is reached; the sources draw their leaders into the
  result; the co-branding preview recolors as you type.

## Chrome

- **Focus** is a 3px cobalt outline with a 2px offset on every control
  (`!important`, a floor over the primitives' rings). Menu items and listbox
  options show the band plus an inset 2px cobalt ring. Controls are at least
  44×44px; marketing buttons and fields are 48px tall.
- **Radius by role.** 4px tags and chips (`rounded-tag`); 8px controls
  (buttons, fields; `rounded-control`); 12px objects (cards, panels, the
  sheet; `rounded-object`); 14 to 16px floats (`rounded-float`); full round
  for switch tracks, avatars, the price handle and status dots. Rules and
  tables have none.
- **Lines carry structure inside an object**; objects carry it on the page.
  A sheet or a card opens with a 1px line, not a heavy rule; rows inside sit
  on soft lines; a caption row is Geist Mono. The 2px graphite rule is the
  key figure's rule: over the Offer Ceiling's label row in a result card,
  under a calculator result's label. It remains in a few other places too;
  "The marketing pages", Lines, lists every one.
- **Header:** the sheet at 90% with a blur, one bottom line, no shadow;
  Analyze · For agents · For investors · Pricing · Learn; "Analyze a deal
  free" is the one primary button at the control radius, with "Sign in" and
  "Create account" as text links (2026-11-23; it was "Create account"). It
  condenses on scroll (Phase 3).
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
  white on the grid, a 1px line, 12px, the panel shadow, a Geist Mono caption
  row, the schematic, the price track, the key figure on the highlight stroke,
  then the readout and the source chips; below 1024px the key figure leads the
  sheet, above the price track (the order since the 2026-10 polish: the answer
  sits inside the first screen at 1440×900 and 1095×760, and the rows the drag
  animates stay fully visible under it). The schematic is HTML on a grid, not
  text in a scaled SVG: rent in on the left in green, the house and the arrows
  as fixed-size SVG, the mortgage and the operating costs out on the right in
  red, each a live figure from the sweep, the cash flow landing under the
  house on a dashed leader, in green while it meets the cash-flow target and
  in the miss colour above the ceiling; the out-arrows take a heavier stroke
  while the price sits above the ceiling. No label falls below 12px at any
  width; below 640px it stacks: the rent row, the house, the two cost rows,
  the landing figure.
- **Price track** (Phase 3): a Radix Slider in the sheet's grammar, the rail a
  1.5px graphite line with end ticks, the meets-range a highlight fill, the
  handle a cobalt-bordered diamond, markers for asking and the ceiling as
  dimension labels in Geist Mono. The thumb is the 20px diamond itself (a
  square turned 45°), so the 3px focus ring follows its edges instead of
  circling it; it grows a little on hover, fills cobalt and grows more on
  press, and settles back on release at the fast duration; the slider's root
  is the 44px-tall pointer target (Radix takes the pointer there).
  `aria-valuetext` reads the price, the cash flow and the target; it
  announces on release, not per tick. The thumb sets its own
  `aria-valuenow`, since Radix's comes from a collection index the server
  does not have (Phase 8).
- **Target chip:** 4px, label weight; meets on the positive wash in green,
  misses on the highlight wash in the highlight text color, with the gap in
  dollars ("Misses by $196"). Every state exists in the DOM; the active one is
  struck forward.
- **Source chip:** Geist Mono at 12px on a 1px line, fully rounded, the
  value then its source: "Rent $3,050/mo · Sample input, 25 Aug 2026". A
  chip wider than the sheet breaks once, between its value and its source,
  so on a phone a long chip is a two-line capsule whose first line ends on
  the separator dot (two of the hero's four at 390px), not a pill; the 3px
  focus ring follows the same round shape. Opens a `SourcePopover`: the
  source, its date or basis, what to replace it with.
- **Figure** (`LedgerFigure`): `font-figure`. **Key figure** (`LedgerTotal`):
  the display voice with tabular numerals; on the homepage it carries the
  highlight stroke (Phase 3).
- **Section:** the sheet, a 1px line on top (or none after a hero), one of
  three rhythms, the shared 1280px container with 16/24/48px gutters. A hero
  adds `bg-sheet-grid`; `tone="navy"` makes a band (`bg-navy-grid` under the
  `[data-tone="navy"]` scope, no top rule, and the section after it drops its
  own).
- **FAQ:** native `details` rows on lines, the question at 18px/600, a
  plus-minus mark, answers capped at 64ch; a row opens at once and its
  answer eases in with transform and opacity (never height); the plus-minus
  mark turns with a scale; still one FAQPage node mirroring the visible
  text.
- **Menu, popover, tooltip, dialog, sheet:** white, 1px line, 14 to 16px, the
  float shadow; open and close transitions at the base duration.
- **Motion parts** (`components/motion/`): `MotionProvider`, `Reveal`,
  `Stagger` and `StaggerItem`, `AnimatedNumber`, `SourcePopover`.

### Page parts

`PageHero` (the hero's 5/7 grid and display voice, with an aside in the wide
column; `asideOrder="after-actions"` sets the aside directly under the
actions below 1024px and, from 1024px, pins the text column beside it in a
window at least 880px tall; `titleSpan="full"` runs a long H1 across both
columns from 1024px and stretches the text column to the aside's height, so
its last line can sit level with the aside's foot),
`ActionRow`, `RuledList`, `StepList`, `Note`, `CloseSection` (`tone="navy"`
opts a commercial page's close into the band)
(`components/marketing/page-parts.tsx`); `ToolFrame`, `ToolResult`,
`ToolFormula` for calculators; `VsHero` and `VsMatrixTable` for comparison
pages; `ArticleBody` with `prose-ledger` for articles. Each takes the tokens;
Phase 5 restyles their internals and the pages follow.

## The homepage (Phase 3)

1. **Hero:** left, the copy (H1, subhead, the metrics line from 640px, the
   agent cue above the form while Agent Pro is sold, the address form with its
   secondary "See the sample deal" button from 640px (below it, a text link
   ending the risk line), the risk line), pinned beside the sheet from
   1024px in a window at least 680px tall; right, the sheet: the schematic
   (rent in on the left in green, the mortgage and the operating costs out on
   the right in red, both live with
   the price, cash flow landing under the house on a dashed leader, with the
   price it is read at beside it as a 16px note in Ink 2), the price track
   with its help line, the Offer Ceiling on the highlight stroke with the gap
   in dollars, then the three-figure readout with target chips and the source
   chips. Below 1024px the Offer Ceiling leads the sheet, then the price
   track, the schematic, the readout and the chips. The sheet is
   server-rendered at the ceiling state from a precomputed sweep
   (`calculateAnalysis` in $1,000 steps, with the two out-flows per point);
   the island hydrates onto it. On phones the schematic stacks and the
   readout stacks.
2. **From listing to offer:** from 1024px ONE sheet, sticky under the header
   beside the three steps (it is about as tall as the steps column, so it
   has only a few pixels of travel and does not visibly hold), that
   accumulates as the steps scroll past (trust pass, audit A16): the
   listing's inputs with their sources, then the Buy Box rows with the
   binding target, then the Offer Ceiling and the send card; a step's rows
   enter once (opacity and translate at the base duration) when the step is
   reached, only if the story was below the fold at hydration and never
   under reduced motion, and the sheet rests complete. Below 1024px each
   step carries its own frame only; without JavaScript the sheet is
   complete. The full line items stay behind "See every line".
3. **Every number has a receipt:** the page's one mid-page navy band. The
   sources are rows on navy lines with their figures at 24px, drawn as a flow
   into the result, a white sheet set in the band (the object radius, a 1px
   line, the panel shadow) with the Offer Ceiling at the smaller key-figure
   step and no highlight stroke. Each source row is a button that opens its
   receipt: its source tag keeps the dotted underline, and the row takes the
   band's lighter navy on hover, while pressed and while open. A keyframe on
   each mask's stroke draws the three leaders once as they enter, on every
   engine, from a drawn default (no-JavaScript and reduced motion see them
   complete); while a source's popover is open its leader goes solid and the
   result figure it feeds darkens to the sheet's graphite (the sheet is
   white, so the figure cannot brighten).
4. **Make it yours:** the live co-branding preview, composed from the memo's
   real parts with the sample deal's figures (the "Shared by" band, the
   verdict, the Offer Ceiling on the stroke with its label as a brand-colored
   tag, the target chips; the cover's bar, first lines and "Prepared by").
5. **Plans:** the one cadence toggle (`CadenceToggle`, shared with /pricing:
   a radiogroup in graphite ink, "Annual save 16%+": the whole percent every
   paid plan meets, from the catalog, founder decision 2026-10-21), cards
   with hover depth (the lift and the float shadow, no colored edge), their
   rows from one catalog-derived source (`plan-answers.ts`, shared with
   /pricing), the price rolling through `AnimatedNumber` (always per month:
   on annual it is the monthly equivalent to the cent with the annual total
   beside it, so Agent Pro reads "$49.17/mo, billed annually ($590)";
   `paidPriceDisplay`, founder decision 2026-11-23), the comparison table.
   /pricing's stage list in the hero shows each price at the toggle's cadence.
6. **Built by a rental investor, the eight questions, the close on a navy band
   with the address form.**

## The marketing pages (Phase 5)

Every marketing page is set from the shared parts, so the rollout changed
the parts and the pages followed:

- **Lines, not heavy rules.** The 2px graphite rule is the key figure's
  rule, and it remains in these places. Under the label: a calculator's
  result (`TOOL_RESULT_LABEL_CLASS`) and the Offer Ceiling in the flat (not
  decision-first) result layout; in the analyzer's live sample panel it runs
  under the whole Offer Ceiling row. Over the label row: the Offer Ceiling
  in the result card, the sample's prerendered card and the share page, in
  the hero sheet (below 1024px the rule is the caption's bottom line, since
  the figure leads there), in the story's third step, in the co-branding
  preview and in the sample memo's decision. With no key figure under it:
  over the Deal score breakdown's total, over the four steps of the sample
  client workflow on /for-agents, and over the sample memo's lists and
  base-economics rows. The Full breakdown's "Loan amount" and "Total cash to
  close" rules are 1px (2026-11-23). Every other list, table, FAQ and figure
  strip, and a close that stays on the sheet, opens on a 1px graphite line
  (`border-t border-foreground`); rows sit on soft lines. A navy close has no
  top rule. `RuledList`, `StepList`, the `/vs` lists and matrix, the market
  and state tables, the FAQ rows, the related-posts lists and `prose-ledger`'s
  tables and blockquotes all moved together.
- **The sheet under the hero and the close.** `PageHero` and `VsHero` carry
  `bg-sheet-grid`, and so does `CloseSection` by default. A commercial page's
  close may opt into the navy band (`tone="navy"`; since 2026-11:
  /for-investors, /for-buy-and-hold, /for-house-hackers, /why-truecap), one
  band per page, with the footer starting flush under it. Reading and
  reference templates keep the ruled close. The sections between hero and
  close are the plain sheet, except the homepage's receipts band. `cn()`
  treats the two grid tiles as their own group, so a section keeps its paper
  under the grid.
- **Figures and numerals in the text face.** Step numbers (`StepList`, the
  `/vs` ordered lists) and the posts' tables are `font-figure`; Geist Mono
  stays for metadata (a 404's code, a case study's kind).
- **The calculator is an instrument.** `ToolFrame` is a card (white, 1px
  line, 12px, the rest shadow); `ToolResult`'s label sits on the 2px rule
  with the key figure under it in the display face, and a widget that sets
  its own result block takes the same label from `TOOL_RESULT_LABEL_CLASS`,
  so all ten released calculators carry it; `ToolFormula` sits between two
  lines. The same frame renders chrome-free in the `/embed` iframes. Five of
  the ten lead with their result. Mortgage payment, break-even, vacancy and
  ARV lead while the frame's inside is narrower than 32rem (`ToolResult`'s
  `lead`, or `TOOL_RESULT_LEAD_CLASS` on a widget's own block): a phone, a
  narrow iframe, and also the 1095px desktop window, where the frame is
  about 505px; from 32rem the result goes back to its place beside or under
  the fields. Closing cost leads at every width, because its frame is one
  column whatever its width. A block that leads should keep one height
  while the visitor types, so no field moves under the thumb: ARV and
  break-even hold only the label and the figure there, mortgage and closing
  cost reserve their tallest state, and vacancy's note line is not
  reserved. The fields still lead on the 1%, 2% and 70% rules, GRM and the
  rehab estimator.
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
  instrument: from 1024px the homepage's sample-deal sheet (`HeroSheet`)
  sits in the wide column beside the form, and the three trust rows and the
  access line sit under the form in the narrow one (2026-11-23; they used to
  run on under the sheet). Below 1024px the screen is the form alone.
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
  Offer Ceiling sits under the 2px graphite rule, which is drawn over its
  label row, on the highlight stroke at the key-figure size (54px from
  1024px, 38px below it). From 1024px, and only when asking is above the
  ceiling, the ceiling shares its row with a readout: the labels "Offer
  Ceiling" and "Gap" in one row, and under them on one baseline the ceiling
  at 54px on its stroke, the gap at 38px in graphite (the stroke is the
  row's one warm mark) and "Asking $X" at row size, 14px. A deal at or under
  its ceiling has no readout and keeps the one column. Then the price track:
  asking and the ceiling as dimension labels on their ticks when the two
  are at least half the track apart (a gap of about $10,000 or more); closer
  than that the labels keep to the row's two ends, and a seven-figure pair
  does so below 360px. Below 1024px the gap is a dimension label, stated
  once: beside the "Offer Ceiling" label below 640px, and on the track from
  640px (under its dashed segment, or between the two end labels). Then the
  first-year figures on soft rules, the target state as a dot and a label,
  and the best next step on a 2px cobalt left rule. Nothing on the card is
  uppercase, and its only monospace is metadata: the "Base analysis" and
  "Pro" tags, the track's dimension labels and the phone's "Gap" label.
- **The reveal.** `ResultReveal` plays once per run (the inputs' fingerprint
  is the key): the verdict, the ceiling rolling in through `AnimatedNumber`
  as its highlight stroke draws, the price track with its meets-range drawing
  out to the ceiling, the figures, the chips, the next step, 150ms apart,
  inside the same window; nothing under reduced motion, and never again
  until the inputs change. After that, figures animate between values (the live
  preview's cash flow, cap rate and DSCR roll on every keystroke).
- **The summary bar.** Once the decision card scrolls under the header, a
  zero-height sticky slot docked flush under the condensed header shows the
  ceiling at every width (never on the highlight stroke), the asking price
  and the card's own headline from 480px (read from its h2), and a 44px
  "Decision" button back; hidden, it is inert.
- **Charts** animate their first draw only (`useChartDrawAnimation`): a
  scenario toggle redraws without an entrance. Skeletons share the card
  radius.
- **The share page and the memo** are documents: the same card and figure
  grammar, the brand colour's text picked by contrast (`textOnBrand`), the
  chrome hidden in print (`data-print-hide`).


**Polish pass (2026-10-20, after the final checkpoint).** The result's
price track is an instrument: the hero's diamond handle on the same 2px line,
a what-if that previews the deal at $X through the engine (the card's cash
flow and DSCR roll, the target chips flip) without writing the form; asking
and the Offer Ceiling stay fixed as the dimension labels, "Back to asking"
returns the handle, and the slider announces on release. The results region
takes programmatic focus after a run but draws no ring (the verdict heading
receives the focus when it is on the page); the reveal plays once per
explicit run (`revealKey`), never on a live recompute or a what-if; the
action row arrives with the next step, after the verdict and the ceiling.
Below the decision card the report is on the system: radius by role, rows on
lines instead of cards in cards (since 2026-11-23, in the decision-first
report, the Stress test opens on a 1px graphite line, a projection's summary
cells sit between two lines and the one disclaimer is a muted sentence on a
1px line; the comps card, the notes panel and a Pro gate still keep their
own boxes inside a "Deeper analysis" row), every figure in the figure face,
sentence case, no arrows or sparkle icons, the expense bar in graphite steps
with the net in green; the confidence block is one figure directly under its
label on a 1px graphite rule and the inputs as rows with a source tag and a
"Mark verified" control; the Deal score is a figure directly under its label
on a 1px graphite rule; the sign-up prompt sits below the numbers it asks
the visitor to trust; the two disclosures carry a hint of their contents.

### The home (2026-10-21, audit Q1)

The signed-in home opens on the deal list (founder's answer to the
adversarial audit's Q1; benchmarks P9, density by sign). Only the notices
that render when something waits on the user (a lead, a deadline, a rate
change) sit above it.

- **The list** is on the sheet, not in a card: an H4 "Your deals", one 1px
  graphite line, then one row per deal on soft lines with the band on hover.
  From 1280px a sortable table at fixed column widths (property, screening
  result, Deal score, Offer Ceiling, price, gap; the address truncates);
  below it, where the rail leaves about 775px at 1024, each row carries the
  address and the gap on its first line and the verdict, the ceiling, the
  price and the score under it. The exact criteria open from the ⓘ beside
  every ceiling.
- **The gap is signed**: the price minus the Offer Ceiling, Compare's
  convention, "+$12,400" above the ceiling and "−$8,000" (a true minus) under
  it, in the figure face; green when the price passes (at or under the
  ceiling), red when it misses, by the Sign rule. It is set beside the solved
  ceiling on the server (`offerCeilingGap`), never in the component. The list
  opens with the most room first. The price column says "Price", not
  "Asking": the home cannot tell an asking price from an estimate.
- **Aggregates sit under the list, quieter**: the Decision center as ruled
  rows (a label, the deal, its evidence, one action; no tiles, icons or
  washes), shown from two active deals, and the screening record as two ruled
  figures; side by side from 1280px. No KPI tile renders above the list.
- The kill-switch layout (`focused_dashboard` off) keeps its stat cards,
  with sentence-case labels.

## Token strategy

- One stylesheet, `app/globals.css`: `:root` holds the palette, the radius
  base, the navy, the grid and the motion tokens; `@theme` maps them to
  Tailwind (`--color-*`, `--radius-*`, `--shadow-*`, the `--text-*` ramp);
  utilities add `font-display`, `font-figure`, `tc-meta`, `bg-sheet-grid`,
  `bg-navy-grid`, `highlight-stroke`, `tc-link`, `prose-ledger`; `@theme`
  also names radius and elevation by role (`rounded-object`, `shadow-rest`
  and their siblings) as literal values, since the block is inline.
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
  the rent breakdown and the memo, and are re-captured whenever the result
  card changes. /for-investors shows the live sheet in its hero instead of a
  capture (2026-11). The PDF cover shot is the real first
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

- 2026-10-20, polish pass (founder: "everything, result then homepage"): the
  critique found the signature only in the demo, a cobalt ring around every
  report, nine story cards on phones, and the old product under the decision
  card. Decisions: the result's track drags as a what-if and never writes the
  form (asking stays asking); the focus ring on the handle is the diamond
  itself, since the site's 3px ring is `!important` in `@layer base` and no
  utility moves it to a pseudo-element, so the thumb is the 20px diamond and
  the 44px slider root is the pointer target; the plans' "2 months free" was
  retired for the figure-free "Annual costs less" (the saving was not exactly
  two months and "months free" is banned on /pricing); one `CadenceToggle`
  and one catalog-backed answers source serve `/` and `/pricing`; the hero's
  key figure moves above the readout so the answer is in the first screen;
  the schematic is an HTML grid with live out-flows; the co-branding mock is
  built from the real memo parts; the cookie banner is one row and sits
  bottom-right from 640px; the sticky conversion bar stays suppressed while
  the banner is pending (by design). Not done: the accumulating story sheet
  (needs layout animations on server-rendered frames), the form flash before
  hydration on `/analyze?sample=1` (a static page cannot know the query), the
  app home's tiles (out of this pass by the founder's choice).

- 2026-10-21, trust pass (the adversarial audit, `docs/overhaul-2026-10/
  adversarial-audit/`; the founder answered its six questions with the
  recommended options): the sample carries one provenance record on every
  surface; `/analyze?sample=1` paints the sample's decision from the HTML and
  swaps to the live card in one paint; the hero's handle never moves by
  itself (the moment is the meets-range draw); fallback faces for Roboto and
  Liberation Sans; on phones the price track and the Offer Ceiling sit under
  the form and "See the sample deal" is the secondary button; past 2x asking
  the result says "No price limit under these targets"; the cadence toggle
  names the saving every plan meets ("save 16%+") and an annual price with
  cents shows as the annual charge ("$590/yr"); the stage list follows the
  toggle; Sentry's browser SDK starts after the first input. The record is
  `docs/overhaul-2026-10/trust-pass/README.md`.
- 2026-11-23, ads-readiness pass (founder brief, before paid traffic). These
  replace earlier lines in this file where they differ:
  - **Positioning.** The homepage leads with the investor: the H1 is "Know
    your max offer on any rental.", the three steps are first person, the FAQ
    is the investor set and the close is the /for-investors close. Agents get
    one cue above the hero form ("Working with investor clients? For
    agents"), one compact band, and /for-agents, which now holds "Make it
    yours." The hero carries no listing-paste fine print.
  - **Header.** The one primary button is "Analyze a deal free" at every
    width; "Sign in" and "Create account" are text links on desktop.
  - **The result, logged out.** The save prompt and the memo email sit
    directly under the decision card, above the Deal score (this replaces
    "the sign-up prompt sits below the numbers"). The card's primary action is
    "Save this deal free" and "Tune targets" is secondary; signed-in users keep
    "Tune targets" primary. Phones get a sticky "Save this deal free" bar that
    stands down while a Save is on screen and stacks on the cookie banner.
    Back, Forward and reload on `?view=result` reopen the stored result.
  - **Sign-up.** Headline, one line, the Google button, the email form, fine
    print; the trial's terms in a "What the trial includes" disclosure; one
    password field with the policy as a live checklist; the submit button is
    never disabled for a missing field or token; Turnstile is
    `interaction-only`.
  - **Pricing.** One unit: on annual every paid price is the monthly
    equivalent to the cent with the annual total beside it ("$49.17/mo,
    billed annually ($590)"; this replaces the "$590/yr" rule above). The Pro
    trial has one name, "Start free trial, no card". /pricing quotes no
    competitor prices.
  - **Proof.** `QuoteStrip` under the hero of /, /for-investors, /for-agents
    and under the sign-up form: published, consented quotes only, and
    nothing at all when there are none.
- 2026-11-23, site elevation (an amplification pass on Blueprint: three
  review panels pruned a full-site critique to a budgeted set of moves; no
  new colour, face, primitive or copy). It was built, checked on the rendered
  site and fixed; the lines below record the build as it stands. These
  replace earlier lines in this file where they differ:
  - **Budgets.** Navy is the sheet inverted where the product itself sits:
    one mid-page band, on the homepage only (the receipts), plus a close; no
    other section is tinted. One highlight stroke at display size per page
    (the homepage keeps the story's 38px one), and the stroke never goes into
    chrome (the summary bar, a sticky bar). The marketing hero's key figure
    stays 54px. The grid means where the deal is drawn: the hero and a close
    that stays on the sheet, not the auth form.
  - **Pinning** (Page parts; The homepage, items 1 and 2). Three places, each
    from 1024px, by position only (nothing animates). The homepage hero's
    copy column holds beside the sheet in a window at least 680px tall.
    /for-investors' copy column holds the same way (`PageHero` with
    `asideOrder="after-actions"`), from a window 880px tall, because that
    column is taller: at 1095×760 and 1024×768 it stays in normal flow, and
    the paper beside the lower sheet stays blank there until the H1 is
    shorter (held, below). Its risk line is set inside the actions, so on a
    phone it stays above the sheet. The story's one sheet is sticky under
    the header, but it is about as tall as its steps column and barely
    travels.
  - **Tokens** (Typography: Metadata and Scale; Elevation; Chrome: Radius by
    role; Token strategy). Radius and elevation are named by role in `@theme`
    (`rounded-tag`, `rounded-control`, `rounded-object`, `rounded-float`;
    `shadow-rest`, `shadow-float`, `shadow-panel`) as literal values, because
    the block is inline, and registered with `cn()`; no value was retuned.
    `tc-meta` is the metadata style (Geist Mono 500, 12px). It is adopted on
    the homepage's sheet, story and receipts and on the result track's
    anchored labels and gap labels; every other Geist Mono call site still
    renders at 400 (Typography: Metadata names them). `text-3xs` is 12px, as
    `text-2xs` is. A link thickens its underline and takes the deep colour
    while pressed; a button eases to its pressed scale, and so do the hero
    form's submit button and its "See the sample deal" link.
  - **The band** (Color: the Sign rule, Navy, the grid; Components: Section;
    Page parts; The marketing pages: Lines, the sheet under the hero and the
    close). One `[data-tone="navy"]` scope remaps the tokens for a band, with
    lightened Sign colours and a lighter focus ring, and `data-tone="sheet"`
    restores them for a white card inside it. `Section` takes `tone="navy"`;
    `CloseSection` takes it for a commercial page's close (/for-investors,
    /for-buy-and-hold, /for-house-hackers, /why-truecap this round), where
    the footer starts flush under the band. Every other close stays on the
    sheet grid. The homepage close keeps its navy by class, outside the
    scope. In print every navy surface, by the scope or by `bg-navy-grid`,
    takes the light tokens on white, without the grid.
  - **The homepage** (Components: Sheet, Source chip; The homepage, items 1
    and 3). The hero sheet carries its 1px line; below 1024px the Offer
    Ceiling leads the sheet; the cash flow under the house turns from green
    to the miss colour above the ceiling, and only it keeps the display
    size (the price it is read at is a 16px note in Ink 2). The help line
    under the track reserves its longest form, so nothing moves during a
    drag. A source chip is fully rounded and breaks once, between its value
    and its source: at 390px two of the four are two-line capsules. The
    receipts are the page's one mid-page band: the sources are rows on navy
    lines, each a button with the dotted source cue that takes the band's
    lighter navy on hover, press and open; the result is a white sheet on
    the band (the object radius, a 1px line, the panel shadow) with the
    ceiling at 38px and no stroke. While a source's popover is open its
    leader goes solid and the figure it feeds darkens to graphite; it does
    not brighten, since the sheet is white.
  - **The sticky conversion bar.** Below 768px it is the button alone, full
    width beside the dismiss control; the sentence shows from 768px. From
    1024px it docks and stands down while the hero or a block marked
    `data-sticky-suppress` is on screen: the story's action row, the plans,
    "Built by a rental investor", the homepage close and a navy
    `CloseSection`. Below 1024px it does not read the marker (held, below).
  - **The result** (The analyzer and the result: Result card, The reveal, The
    summary bar; Polish pass). The ceiling is 38px below 1024px and 54px
    from it. From 1024px, only when asking is above the ceiling, the row is
    a readout: the labels "Offer Ceiling" and "Gap" in one row, and under
    them on one baseline the ceiling at 54px on its stroke, the gap at 38px
    in graphite and "Asking $X" at row size. A deal at or under its ceiling
    keeps the one column. Below 1024px the gap is a dimension label: beside
    the "Offer Ceiling" label below 640px, on the track from 640px. The
    track's labels sit on their ticks when the prices are at least half the
    track apart, and keep to the row's ends when they are closer. "Back to
    asking" returns focus to the handle. The stroke and the meets-range draw
    inside the reveal's window; the summary bar docks flush under the
    condensed header (`--header-condensed-h`) and carries the ceiling at
    every width; the Deal score and the confidence figure sit directly under
    their labels on a 1px rule. The analyzer's H1 is 30px from 640px and
    34px from 768px. In the decision-first report the Stress test, a
    projection's summary cells and the disclaimer lost their boxes; the
    comps card and the notes panel did not (not built this round), and a
    Pro gate keeps its card.
  - **2px rules** (Chrome: Lines; The marketing pages: Lines). The Full
    breakdown's "Loan amount" and "Total cash to close" rules went to 1px.
    The 2px graphite rule remains under a calculator result's label; over
    or under the Offer Ceiling in the result card and its copies, the hero
    sheet, the story's third step, the co-branding preview and the sample
    memo; and, with no key figure, on the Deal score breakdown's total,
    /for-agents' sample client workflow and the sample memo's lists. The
    marketing pages, Lines, lists each one.
  - **Other parts** (Components: FAQ; Page parts; The marketing pages: the
    calculator; The assets: Product shots). The FAQ mark turns with a scale
    and nothing animates height. `PageHero` takes `asideOrder` and
    `titleSpan`. Five of the ten released calculators lead with their
    result: mortgage payment, break-even, vacancy and ARV while the frame's
    inside is under 32rem (which includes the 1095px desktop window), and
    closing cost at every width; the fields still lead on the 1%, 2% and
    70% rules, GRM and the rehab estimator. Every released calculator's
    result label sits on the 2px rule. /for-investors shows the live sheet
    in its hero instead of a capture. A glossary term's related terms show
    each definition's first sentence whole, with no clamp.
  - **/pricing** (Color: the sheet and the band; The homepage, item 5). The
    stage list in the hero is set on a white sheet (the object radius, a 1px
    line, the rest shadow) under an H1 that runs across both columns from
    1024px; a paid row keeps two lines at either cadence, so the sheet does
    not move with the toggle, and the agent line sits at the foot of the
    text column, level with the sheet's foot. In the comparison the Pro
    column sits on the band from its head to its last row, and the plan
    heads are in the display voice at 20px. Below 640px the comparison is a
    legend of the plan names over mark columns, the Pro name and its marks
    on the band: a yes-or-no feature is one line with a mark per plan, and
    a feature with a text value lists the plans under its label, one per
    line with the name beside its value. The trial terms are set as the
    offer under the plan cards: a 1px graphite line the width of the card
    row, a lead in the display voice (21px, 24px from 640px) and the
    sentences at 16px, capped at 72ch.
  - **The auth screens** (The app: What Phase 6 set). From 1024px the trust
    rows and the access line sit under the form in the narrow column, and
    the sheet has the wide one. The columns end near each other on sign-up;
    the shorter login and password forms still end well above the sheet's
    foot. From 1024px to 1279px the access line stacks as three phrases
    without bullets. Phones are unchanged, and no grid sits under the form.
  - **Held for the founder**, not built: the homepage H1 on /for-investors (its copy column
    cannot pin in a laptop window until the H1 is shorter); the engine's
    decision card in place of the product shots on the persona and /vs
    pages, and /pricing's "Real output" row; the homepage close (with its
    address form) on /for-investors, and a closing band on /pricing and the
    sample memo; navy closes on the /vs pages and /for-agents; a larger
    result step (about 72px; the gap beside the ceiling is built, at 54px
    and 38px); on phones the sticky conversion bar still shows while a
    section's own primary button is on screen (the story's, the Free
    plan's, the close's), since it reads `data-sticky-suppress` from 1024px
    only; H2 at 40px from 1280px; removing the hero's metrics line on
    desktop; the phone story reduced to
    step 3's frame; trust rows and a focus-revealed password checklist on the
    phone sign-up; "Property address" casing and the listing-link toggle on
    the lookup line; /why-truecap with the investor questions only;
    calculator figures rolling through `AnimatedNumber`; the next round's
    list (the sample memo as one document, the /for-agents hero as one track,
    the changelog on ruled rows, market and state heroes on a sheet, no
    auto-hyphenation in display headlines); the visitor's own deal drawn at
    the head of "Where the rent goes"; seven punctuation-only strings; a live
    row under the hero's handle; a second engine sample; the copy for the
    four-answers band, the article rail, the hub heroes and the 404 page; the
    analyzer's "Free account required" line; the favicon in the Blueprint
    cobalt. Also left as they are: the panel shadow's values, `::selection`,
    the unused `.dark` block, `interpolate-size`, band and grid section
    tones, a `SplitSection` or `Sheet` part.
- 2026-11-24, the phone hero's sample link (founder, answering the first held
  question; this reverses the 2026-10-21 line that "See the sample deal" is
  the secondary button on phones). On the homepage below 640px "See the
  sample deal" is a text link ending the risk line (`HeroSampleLink`
  `variant="inline"`, its 44px tap box taken back out of the line, the agent
  cue's pattern); from 640px it stays the secondary button. The sheet's key
  row sits 16px under its 2px caption rule on phones (it was 28px). Together
  they lift the Offer Ceiling about 50px: at 390x664 on a first visit it ends
  9px above the cookie banner, where it sat 41px under it. At 375x629 and
  360x640 the banner still covers it, by about 30px; the H1 and the lede set
  that. /for-investors and /for-agents keep the button at every width.

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
