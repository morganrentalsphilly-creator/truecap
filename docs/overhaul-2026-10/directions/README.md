# Checkpoint 1: three directions (2026-10-20)

Static comps, not production code. Each is one self-contained HTML file
(`a-deal-desk.html`, `b-blueprint.html`, `c-big-numbers.html`) built from
`src/` by `../tools/build-comps.mjs`, with every figure injected from
`comp-data.json`, which `../tools/comp-data.ts` writes from
`calculateSampleDealOutcome()` and a `calculateAnalysis()` sweep in $1,000
steps. No number in a comp is typed by hand; the plan prices come from
`PLAN_CATALOG`. Each page shows the homepage hero (captured at 1440 and 390),
one analyzer result card (Offer Ceiling plus three metrics), one plan card and
one dark band. The hero's price handle drags (mouse, touch, arrow keys) along
the engine's sweep so the signature moment can be felt, not only read.

Open `index.html` for the side-by-side, or `side-by-side.png`. Individual
captures are in `shots/`.

Every direction keeps: the pinned copy (H1, subhead, investor cue above the
form, "Analyze a deal free", the listing-link line, the risk line), the header
nav, white-on-brand text at 4.5:1 or better (A cobalt 6.3:1, B cobalt 6.8:1,
C cobalt 6.3:1), light as the default surface with dark as bands and panels,
tabular figures everywhere, and sentence case with no eyebrows, no arrows and
no gradient text.

## A. Deal Desk (recommended)

The product is an instrument on a desk. A bright cool-white base with a faint
dot grid; the sample deal lives in a deep navy panel that floats on layered
shadows, which is the same surface the app's navy rail becomes, so marketing
and app stop being two products. One cobalt (`#1957d2`) carries every action
and the Offer Ceiling; green, amber and red appear only as pass, miss and the
sign of a number. Geist at 700 for display with tabular figures for every
number, Geist Mono only on the source chips. The hero is the "drag the price"
track: the handle rests at the ceiling, the meets-range shades green, and the
three tiles, the chips and the verdict follow the handle. Motion is quick and
precise (150–250 ms), figures settle on a spring. Risk: this is the Mercury
and Linear family, so execution has to be exact or it reads as a template;
the dot grid and the navy panel are the two things that keep it TrueCap's.

## B. Blueprint

The deal as a drawing on a drafting sheet. Off-white paper with a fine cobalt
grid, graphite text, Hanken Grotesk at 750 for display. The hero is the
property drawn as a line schematic: rent flows in on the left in green,
mortgage and taxes flow out on the right in red, and cash flow lands under the
house on a dashed leader; the price is an architectural dimension line with a
diamond handle. The Offer Ceiling is the only warm thing on the page, a
highlighter stroke under the figure (`#ec7c0e` as a fill, `#bb4900` as text).
Dark bands invert the sheet. Motion is lines drawing and annotations
appearing as you scroll, which maps well to the "every number has a receipt"
flow. Risk: the schematic needs its own phone layout (the 720-unit drawing
scales to 5px labels at 390), and a drawing can read as decoration unless
every line carries a figure.

## C. Big Numbers

Editorial and loud. The figures are the graphic: $236,000 set at up to 168px
in Bricolage Grotesque (optical size 96, width 85) on a full-bleed cobalt
block, with the price track and three stats inside the block; the result page
sets the ceiling at 120px in cobalt on paper; the dark band ends on the cash
flow at 96px in green. Geist for text. Sections alternate paper, cobalt and
ink blocks, so the page has rhythm without shadows. Motion is figures rolling
and blocks wiping in. Risk: it is the Wise and Ramp register, which can feel
louder than "this is money" wants, and the blocks eat vertical space on phones;
it is the strongest at 1440 and the least calm at 390.

## What the founder decides here

One direction, or a mix (for example A's panel and motion with C's figure
scale on the result page). The choice sets Phase 2's tokens and fonts; nothing
in Phase 2 starts before it.

## Decision

**2026-10-20, founder: B, Blueprint.** Phase 2 builds its tokens, type and
motion from this comp: the drafting-sheet ground with the fine cobalt grid on
marketing surfaces, graphite text, Hanken Grotesk for display and text, Geist
Mono for metadata, cobalt for actions, the warm highlighter reserved for the
Offer Ceiling, green and red only as the direction of a flow or a pass and a
miss, and dark bands as the inverted sheet. The schematic gets its own phone
layout in Phase 3.
