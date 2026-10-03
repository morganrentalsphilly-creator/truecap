---
name: TrueCap
description: The Underwriter's Ledger. Rental decisions set as a ledger, on paper, with every figure sourced.
# Checkpoint 1 decided 2026-09-30 by the founder: type set A (Archivo), paper
# Newsprint, the ledger hero and the homepage structure approved, the navy
# dashboard rail kept. Checkpoint 2 (2026-09-30): the expandable ledger. The
# type ramp and components below are reconciled with the homepage build
# (app/globals.css). Shadows, focus and motion live in .impeccable/design.json.
colors:
  signal-blue: "oklch(0.49 0.18 240)"
  signal-blue-deep: "oklch(0.42 0.16 242)"
  field: "oklch(1 0 0)"
  ink: "oklch(0.22 0 0)"
  positive: "oklch(0.46 0.14 155)"
  negative: "oklch(0.5 0.2 15)"
  caution: "oklch(0.5 0.16 42)"
  destructive: "oklch(0.577 0.245 27.325)"
  destructive-text: "oklch(0.5 0.22 27)"
  warning: "oklch(0.78 0.16 75)"
  warning-foreground: "oklch(0.2 0.05 60)"
  paper: "oklch(0.945 0.006 85)"
  raised: "oklch(0.97 0.004 85)"
  band: "oklch(0.925 0.008 85)"
  rule: "oklch(0.78 0.01 85)"
  rule-soft: "oklch(0.875 0.008 85)"
  ink-2: "oklch(0.43 0.006 85)"
  sidebar-navy: "oklch(0.18 0.04 260)"
  sidebar-foreground: "oklch(0.85 0.02 250)"
typography:
  numeral:
    fontFamily: "DM Mono, ui-monospace, monospace"
    fontSize: "1rem"
    fontWeight: 400
    fontVariation: "tabular-nums"
  numeral-key:
    fontFamily: "DM Mono, ui-monospace, monospace"
    fontSize: "3.375rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontVariation: "tabular-nums"
  numeral-key-sm:
    fontFamily: "DM Mono, ui-monospace, monospace"
    fontSize: "2.375rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontVariation: "tabular-nums"
  label:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.35
  small:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45
  ui:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  display:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.375rem, -0.14rem + 4.474vw, 3.4375rem)"
    fontWeight: 750
    fontStretch: "82%"
    lineHeight: 1.02
    letterSpacing: "-0.012em"
  display-sm:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.375rem"
    fontWeight: 750
    fontStretch: "82%"
    lineHeight: 1.02
    letterSpacing: "-0.012em"
  section:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.125rem"
    fontWeight: 750
    fontStretch: "82%"
    lineHeight: 1.08
    letterSpacing: "-0.012em"
  section-sm:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 750
    fontStretch: "82%"
    lineHeight: 1.1
    letterSpacing: "-0.012em"
  h3:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 750
    fontStretch: "82%"
    lineHeight: 1.333
    letterSpacing: "-0.012em"
  h3-sm:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.3125rem"
    fontWeight: 750
    fontStretch: "82%"
    lineHeight: 1.2
    letterSpacing: "-0.012em"
  h4:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
  text:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.55
rounded:
  none: "0px"
  tag: "2px"
  control: "4px"
  object: "6px"
  float: "10px"
  pill: "9999px"
spacing:
  unit: "4px"
  gutter: "16px phone / 24px tablet / 48px desktop"
  section-tight: "48px phone / 64px desktop"
  section: "72px phone / 96px desktop"
  section-open: "96px phone / 128px desktop"
components:
  button-primary:
    backgroundColor: "{colors.signal-blue}"
    textColor: "oklch(0.99 0 0)"
    rounded: "{rounded.control}"
    height: "48px marketing / 44px app"
    padding: "0 20px"
  button-primary-hover:
    backgroundColor: "{colors.signal-blue-deep}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    border: "1px solid {colors.ink-2}"
    rounded: "{rounded.control}"
    height: "48px marketing / 44px app"
    padding: "0 20px"
  button-secondary-hover:
    backgroundColor: "{colors.band}"
  field:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    border: "1px solid {colors.ink-2}"
    typography: "{typography.ui}"
    rounded: "{rounded.control}"
    height: "48px"
    padding: "0 16px"
  plan-card:
    backgroundColor: "{colors.raised}"
    border: "1px solid {colors.rule}"
    rounded: "{rounded.object}"
    padding: "20px phone / 22px from 640px"
  ledger-row-binding:
    backgroundColor: "{colors.band}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "12px 0 / 14px from 640px"
  ledger-total:
    textColor: "{colors.ink}"
    typography: "{typography.numeral-key}"
    rounded: "{rounded.none}"
  menu:
    backgroundColor: "{colors.raised}"
    rounded: "{rounded.float}"
    padding: "4px"
---

# Design System: TrueCap

<!-- Rewritten 2026-09-30 as a set of decisions (design pass, checkpoint 1).
It replaces the 2026-09-24 audit's reading of the incumbent look, which had
turned the old defaults into rules. The founder settled the open choices on
2026-09-30: type set A (Archivo), Newsprint paper, the ledger hero and the
homepage structure, the navy dashboard rail kept. Specimens:
docs/design-pass/checkpoint-1/ledger-specimens.html. Baseline measurements:
docs/design-pass/baseline/README.md. Reconciled with the homepage build on
2026-09-30 by the documenter pass, which also regenerated .impeccable/design.json
from the built system. -->

## North star: the Underwriter's Ledger, owned

TrueCap is a ledger: a column of labels, two columns of figures, rules between
them, and one number at the bottom with a double rule under it. That object is
the product's decision, so it is also the site's signature. The marketing pages
stop showing a screenshot of the ledger inside a SaaS layout and show the
ledger itself, set in type, with the sample deal's real numbers.

**Ledger, not broadsheet.** The world is the accountant's columnar pad, the
loan estimate and the rate sheet: ruled columns, right-aligned figures, a total
rule, a source line. It is not the newspaper: no italic display serif, no dense
multi-column editorial grid, no tracked mono labels. That keeps it out of the
"broadsheet hairlines" look that generated sites now default to.

**Scene, and why light.** An agent at a showing reads it on a phone in a lit
room or outdoors; the client reads the memo at a desk. Daylight reading on
paper, so the system is light-only by decision: there is no dark theme and no
toggle, and the `.dark` block in `app/globals.css` stays unwired.

**Spend boldness in one place.** The hero ledger is the loud element: the
largest figure on the page, the one double rule, the one motion. Everything
around it is quiet: plain paper, rules, sentence case, one blue.

## References

Studied in the browser on 2026-09-30 (computed styles and screenshots).

| Site | Take | Leave |
|---|---|---|
| CFPB Loan Estimate (consumerfinance.gov/owning-a-home/loan-estimate) | A section head is a bold sentence-case label set on a heavy black rule, never a small label above a heading. A question works as a column head, "Can this amount increase after closing?", answered in bold. The ledger's "Meets the Buy Box: No / Yes" row comes from here. | The form's density, the all-caps label block in its header, the fine print. |
| FRED, MORTGAGE30US (fred.stlouisfed.org) | Every figure has a metadata strip: the value in bold, then units, frequency, updated date and next release, divided by hairline column rules. The source table follows this grammar. | The Bootstrap chrome, the chart toolbar, the button clutter. |
| FT markets data (markets.ft.com/data/bonds) | The whole page is a tinted paper (#FFF1E5) with dark-grey heads (#333) and almost no white. A module opens on an 8px black bar over a faint full-width band. Section heads are regular weight at 26px; weight is not how the FT signals a section. | The salmon itself, which belongs to the FT, and the broadsheet density. |
| Federal Reserve H.15 (federalreserve.gov/releases/h15) | Grouped rows shown by indentation, footnote numerals that point to a series' source, "n.a." instead of a blank, right-aligned figures in fixed columns. The assumption rows of the ledger follow this. | The navy header band, the blue zebra striping, 12px Arial. |
| Our World in Data grapher (ourworldindata.org/grapher/life-expectancy) | Labels sit on the data at the line's end, never in a legend. One "Data source:" line under every figure. A defined term has a dotted underline with a 2px offset and opens its definition. The homepage walkthrough annotates the ledger this way. | Playfair Display headings and the chart-tool tabs. |

## Avoid list

In addition to Impeccable's catalog (impeccable.style/slop):

- A geometric-humanist Google sans as the whole voice: Plus Jakarta Sans,
  Manrope, DM Sans, Sora, Space Grotesk, Inter, Geist (also Mona Sans,
  Instrument Sans, Outfit).
- A blue-600-adjacent accent on white cards; white as the default surface.
- Eyebrow labels, kickers, and pills above a heading or an H1.
- "→" appended to link text; arrow icons trailing a button label; arrow nudges
  on hover.
- Identical-radius card grids with one soft shadow; icon tiles above headings;
  bento grids; Lucide Sparkles, Zap or Shield as decoration.
- Cream + serif + terracotta; near-black + acid green; Instrument Serif italic;
  any italic display serif.
- Gradient text; hero gradients and blurred color blobs; colored glow shadows.
- Fade-and-slide-up on every section; `transition: all`.
- Uppercase tracked micro-labels (the baseline found 15 on the homepage and 81
  on /pricing).
- Numbered 1·2·3 steps presented as a process when the order carries nothing.
- A screenshot inside a fake browser frame.

## Typography

### Decided for every set

- **The Ledger Rule stays.** A figure that will be compared with another figure
  is set in DM Mono with tabular numerals: ledger cells, prices on plan cards,
  metric values, the Offer Ceiling. Prose numbers stay in the text face.
- **Sentence case everywhere**, table heads included. Acronyms stay acronyms
  (DSCR, NOI, CoC, HUD, FRED). No `uppercase` utility outside a real acronym.
  The specimen puts a sentence-case ledger head next to an uppercase, tracked
  one. The uppercase head does not scan faster: the figures already differ from
  the labels by face and alignment. It is also what slop-detect flags as
  `all_caps_labels`.
- **Scale.** Text sizes step by 1.25 up to H3, then display sizes jump:
  label and small 14px, UI 16px, marketing body 18px, H4 20px, H3 24px,
  H2 34px, H1 55px. Phone sizes: H1 38px, H2 28px, H3 21px.
  As built: H1 holds 38px below 1024px, then eases to 55px at 1280px, so the
  hero column keeps the headline to four lines between 1024 and 1279px. The
  key figure is 54px; its smaller step is 38px (the hero total on phones, the
  walkthrough's second total, plan prices, which drop to 28px under 380px).
  Nothing below 12px anywhere; the 10px and 11px steps (`text-3xs`,
  `text-2xs`) are retired from marketing pages.
- **Measure.** Running text 60–68ch. The hero paragraph is capped at 46ch so it
  sits beside the ledger. FAQ answers are capped at 64ch.
- **Headings** use `text-wrap: balance`. Body text uses `text-wrap: pretty`.
- **Weights.** Display 750. Labels and plan names 600. Text 400. Key
  figures 500, table figures 400. As built, a plan name is its card's H3 and
  takes the display voice whole (750 at 82% width), like the other headings.

### Decided: Archivo

Archivo semi-condensed (width 82%) at 750 for display; Archivo at normal width,
400, for text; DM Mono for figures. A grotesk from the rate-sheet and
stock-table tradition. The narrow display cut keeps the long H1 to three or
four lines in the narrow hero column, so the ledger gets the width, and it keeps
a ten-letter word inside a 195px column (the zoom check in
`e2e/public-product.spec.ts`).

- **Sizes:** H1 55px desktop, 38px phone; H2 34px, 28px phone; H3 24px, 21px
  phone; body 18px; label and small 14px.
- **Measure:** 62–66ch.
- **Weights:** 750 display, 600 labels and plan names, 400 text, DM Mono 500
  for key figures and 400 for table figures.
- **Guardrail:** a heavy condensed face tips into tabloid if it spreads, so the
  condensed cut stays on H1–H3 and plan names. Everything else uses Archivo at
  normal width.
- **Loading:** `next/font/google` with `display: swap`, the variable `wdth` and
  `wght` axes, and a size-adjusted fallback. DM Mono keeps weights 400 and 500
  and never synthesizes a bold: a figure inside a semibold row takes the 500
  face (`font-synthesis-weight: none` on the mono face), not a smeared 600.

Considered and not chosen (see the specimens): B, Source Serif 4 over Source
Sans 3; C, Besley over Public Sans.

## Color

### Decided

- **Signal Blue stays exactly as it is**: `oklch(0.49 0.18 240)`, #0066ba. It is
  the only color that means "act here": buttons, links, focus rings, the active
  nav item. White text on it is 5.8:1; as text it clears AA on every paper and
  band below (4.6–5.0:1). Hover and pressed use Signal Blue Deep.
- **Semantics keep their meaning and hue; each is a little deeper** so it clears
  5:1 on the table band. Today's values fall to 4.3–4.4:1 on a tinted band.
  - Positive (Ledger Green): `oklch(0.46 0.14 155)`, was `0.5 0.16 155`.
  - Negative: `oklch(0.5 0.2 15)`, was `0.55 0.22 15`.
  - Caution (Caution Orange): `oklch(0.5 0.16 42)`, was `0.54 0.18 42`.
  - The Sign Rule holds: green and red are earned only by the sign of a number
    or by a pass/fail against a target, never for emphasis.
- **Ink is graphite, not tinted near-black.** `oklch(0.22 0 0)` (#1b1b1b)
  replaces today's blue-tinted `oklch(0.15 0.02 250)`. A second ink (Ink 2,
  about 6.9:1 on paper) carries secondary text; there is no third grey.
- **White means write.** White (`field`) is used only where a person types: the
  address field, form inputs, editable cells in the analyzer. Everything else
  sits on paper. Plan cards, menus and dialogs use the raised paper; an exported
  memo shown as a document is the one other white object. As built, a field
  that asks for the page background (`bg-background`, from when the page was
  white) gets the field white instead, so no call site turns a field grey; a
  caller's other background choice still wins.
- **Retired:** the hero gradient and blur blob, the 70 hard-coded
  `rgba(0,112,196,…)` glows, the gold and glow shadow tokens, the navy auth-page
  hex values.
- **The blue wash is quiet.** `--brand-blue-light` stays only for surfaces not
  yet on the ledger primitives (the app's Offer Ceiling card, the older
  marketing heroes). It was a pale cyan that fought the warm paper; as built it
  is toned to a wash close to the paper, `oklch(0.935 0.02 240)`, and Ink 2
  reads 5.9:1 on it. Blue stays for actions: new surfaces do not reach for the
  wash.

### Decided: Newsprint

A warm grey stock with almost no chroma, so it reads as paper and not as cream.
Every semantic color reads cleanly on it.

| Token | Value | Use |
|---|---|---|
| Paper | `oklch(0.945 0.006 85)` #efece8 | The page |
| Raised | `oklch(0.97 0.004 85)` #f6f5f2 | Plan cards, menus, dialogs, app panels |
| Band | `oklch(0.925 0.008 85)` #e9e6e0 | The row that decides; text selection |
| Rule | `oklch(0.78 0.01 85)` #bab7b0 | Rules under table heads and between sections |
| Soft rule | `oklch(0.875 0.008 85)` #d8d5d0 | Rules between rows |
| Ink | `oklch(0.22 0 0)` #1b1b1b | Text (14.7:1 on paper) |
| Ink 2 | `oklch(0.43 0.006 85)` #51504c | Secondary text, field borders (6.9:1 on paper, 6.5:1 on band) |
| Field | white | Fields only |

Signal Blue is 4.9:1 on paper and 4.6:1 on the band. The deepened semantics are
5.5–5.7:1 on paper and at least 5.2:1 on the band. Considered and not chosen:
Ledger (green columnar pad) and Bond (cool grey-blue).

## Chrome

- **No eyebrows.** No label, kicker or pill above a heading anywhere. "For
  agents", "Common questions", "What Pro actually buys", "Honest comparison" and
  the persona pills all go. A plan's name is its card's heading.
- **No arrow suffixes.** Link text never ends in "→"; buttons carry no trailing
  arrow icon; nothing nudges sideways on hover. Links are Signal Blue,
  underlined (1px, 3px offset), and that is enough.
- **Labels are sentence case**, as set out under Typography.
- **Cards only for discrete objects the user compares.** Plan cards are the one
  card on marketing pages. Feature lists, the sources block, the FAQ, the founder
  block and proof use rules, columns and space. No nested containers.
- **Radius by role.** 0 for printed things: rules, tables, the ledger, sections,
  FAQ rows. 2px for tags and chips. 4px for controls: buttons and fields.
  6px for plan cards. 10px for things that float: menus, popovers, dialogs,
  sheets. Full round only for switch tracks, avatars and status dots.
- **Rules carry the structure.** Soft rule (1px) between rows. Rule (1px)
  under table heads and between sections. Heavy rule (2px, ink) opens a ledger
  or a major section, the way the Loan Estimate and the FT open a module. The
  double rule (two 1px ink lines 3px apart) marks a final total and nothing else.
- **No shadow at rest.** One float shadow, for menus, dialogs and the sticky
  bar. Hairline border plus a wide shadow is banned. As built, `shadow-md` and
  `shadow-lg` are both that float shadow, the resting steps (`shadow-2xs`
  through `shadow-sm`) render nothing, and bars fixed to the bottom edge (the
  sticky conversion bar, the cookie banner) cast the same shadow upward
  (`shadow-float-up`). Every float keeps a 1px rule edge under that shadow
  (menus, the address suggestions, the mobile sheet, the bottom bars), where
  raised paper meets paper; the ban reads on objects at rest. The binding
  row's band bleeding past the ledger is a flat offset fill, not an elevation.
- **Motion: one moment.** On the homepage the double rule under the Offer
  Ceiling draws in once (520ms, ease-out) after the figures have painted, so
  there is no layout shift and no delay to the largest paint. Nothing else fades
  or slides in: the scroll-driven `tc-reveal` and the `tc-rise-in` load-in
  retire from marketing pages. `prefers-reduced-motion` shows the rule static.
  `transition-all` leaves the Button primitive; transitions name their
  properties (color, background-color, border-color, opacity) at 150ms.
  As built, the draw runs `cubic-bezier(0.2, 0.8, 0.2, 1)` from the right,
  200ms after paint. The rule is about page content: floats (menus, popovers,
  dialogs, the mobile sheet) keep their open and close transitions, and
  reduced motion collapses those too.
- **Focus** is a 3px Signal Blue outline with a 2px offset on every control.
  Controls are at least 44×44px (marketing buttons and fields are 48px tall).
  As built, the outline is a floor (`!important`) over the primitives' own
  half-transparent rings, which measured about 2.1:1 on paper. Menu items and
  listbox options (the address suggestions) show focus as the band plus an
  inset 2px Signal Blue ring instead, since an outline would sit outside the
  menu. A `tabindex="-1"` target (the skip link's `main`, a dialog panel) is
  not a control and takes no ring.
- **Sticky chrome never hides focus.** Scroll padding keeps focus and fragment
  targets clear of the sticky header (72px; the header is one row, 57px on
  phones and 65px from 640px) and of whatever is fixed to the bottom edge
  (72px under a sticky bar, 112px while the cookie banner is up, plus the
  safe-area inset). The footer takes the same bottom padding while a bar is
  mounted, so its legal row stays tappable.
- **Browser surfaces are themed.** Text selection uses the band color, the
  caret is Signal Blue, and figures use tabular numerals. The browser's theme
  color is the paper (#efece8), not Signal Blue.

## Components

Every fix lands in one of these, never as a page-local override.

- **Section** (new shared wrapper): paper background, a top rule, one of three
  rhythms (`tight`, default, `open`), and a max width of reading (68ch),
  standard (1200px) or wide (1280px). Replaces the hand-rolled
  `<section className="border-t …"><div className="mx-auto max-w-… px-4 py-14 sm:py-20">`
  pattern (10 uses) and the persona pages' `mb-12 sm:mb-16` stacks.
  As built, the widths collapsed to one: every section, the header and the
  footer share one page container (1280px, 16/24/48px gutters), and a reading
  column (62–68ch) is set inside it. The top rule is the section rule, the
  2px ink rule that opens the close, or none (a list stacked under another).
  Section headings take the display voice (H2).
- **Ledger primitives** (new, server components, shared by marketing and the
  app): `LedgerTable` (caption row on a heavy rule, sentence-case column heads,
  right-aligned DM Mono cells), `LedgerRow` (label, optional target line,
  figures, optional `binding` state on the band), `LedgerTotal` (display-face
  label, key figure, double rule). The app's decision summary, the share viewer
  and the sample memo move onto them during rollout.
  As built, the parts are `LedgerCaption` (the caption on the heavy rule),
  `LedgerFigure` (DM Mono, tabular), `LedgerVerdict` (Yes/Meets in Ledger
  Green, No/Misses in Caution Orange, at 600), `LedgerTotal` (the key figure
  over the double rule; `draw` gives the page its one motion) and
  `DisclosureMark` (the SVG plus/minus, shared with the FAQ), with shared
  figure-column widths so every ledger's figures line up. `VerdictLedger` sets
  them closed (the hero); `OpenLedger` sets them open, each row a native
  `details` open by default, no client JavaScript. The binding row's band runs
  0.5rem past the rules on both sides (the `ledger-bleed` utilities), so its
  text keeps the left edge of the rows around it; the ledger's scroll region
  is 0.5rem wider on each side so the band is never clipped.
- **Header:** paper, a single bottom rule, no blur and no shadow. Nav: Analyze ·
  For agents · For investors · Pricing · Learn. "Create account" is a primary
  button at 4px radius, not a pill.
- **Footer:** paper, rules between column groups, sentence-case column heads,
  one Disclaimer with unchanged text.
- **Plan card:** raised paper, 1px rule border, 6px radius, no shadow. The plan
  name is the heading, an audience line under it, the price in DM Mono from the
  catalog, the answers as a ruled definition list, one primary button.
  As built, each card has one action and the row has one filled button: the
  Free card's (the page's primary action); the paid plans link out with the
  secondary button. Padding is 20px on phones, 22px from 640px.
- **FAQ:** a ruled list of `details` rows (question in the text face at 600, a
  plus/minus drawn in SVG), answers capped at 64ch. One FAQPage node mirrors
  exactly what is visible. As built, the list opens on the 2px ink rule, and
  on the homepage the heading sits beside it from 1024px on the hero's 5/7
  grid.
- **Source table:** FRED's grammar. Each row gives the value's name, its
  source, its date or basis, and how to replace it.
- **Buttons:** primary (Signal Blue), secondary (ink text, Ink 2 border on
  paper), link. No icon-only decoration. As built, the secondary's hover is
  the band, and marketing buttons are 16px at 600.
- **Field:** white, 1px Ink 2 border (8.1:1 against white), 4px radius, 48px
  tall, 16px text on phones so iOS does not zoom.

### As built in the rollout (2026-09-30)

The pages after the homepage are composed from a small set of parts. Reach for
these before writing page markup; a page that hand-rolls a hero, a feature grid
or a close is the drift this pass removed.

- **Page parts** (`components/marketing/page-parts.tsx`): `PageHero` (the
  homepage hero's 5/7 grid and display voice; `aside` for an artifact in the
  wide column, `asideWidth="shot"` when the artifact is a narrow phone
  capture), `ActionRow`, `RuledList` (term and detail rows on rules, one or two
  columns), `StepList` (DM Mono numerals, only for a real sequence), `Note` (a
  caveat on the 1px Rule, never the heavy rule) and `CloseSection` (the page's
  ask on the heavy rule: `stack` for a close whose actions are buttons, `split`
  for a close that carries a block, such as /for-agents' price table).
- **One rule under a hero.** Heroes carry `data-page-hero`; a `Section` that
  follows one drops its own top rule, so pages never stack two 1px rules.
- **Plan cards line up.** `PlanCard` is a CSS subgrid of five bands (name,
  audience, price, answers, action), so prices, list rules and actions sit
  level across a row with any parent grid. On /pricing the Pro card carries the
  row's filled button, because there the paid cards are the checkout; on the
  homepage the Free card does.
- **Articles** (`components/marketing/article.tsx`): the `prose-ledger` utility
  maps the typography plugin to the tokens (opt-in; `.prose` itself is not
  redefined), the lede is a stand-first in ink at 20px, and the FAQ uses
  `FaqSection variant="inline"`. The blog post template is
  `/blog/1-percent-rule-rental-property`; the other posts get the frame in a
  follow-up pass.
- **Calculator pages**: the template is `/tools/1-percent-rule-calculator`
  with `components/tools/tool-parts.tsx` (`ToolFrame`, `ToolResult`,
  `ToolFormula`). The widget lays itself out by its own width (container
  queries), so the same widget works in a partner's `/embed` iframe.
- **Comparison pages**: `components/marketing/vs-page.tsx` (`VsHero`,
  `VsMatrixTable`, the `VS_*` class strings). Every string stays in the page
  files, where the SEO loop and the claim guards read it.
  `lib/__tests__/vs-design-pass.test.ts` pins the grammar on all 38 pages so
  the autopilot loop cannot bring the old look back.
- **Screenshots**: `ProductShot` defaults to `frame="document"` (a rule, no
  browser chrome); the fake browser frame is gone.
- **Links below the fold prefetch on intent.** Content links, directory rows,
  cross-links and secondary actions use `IntentPrefetchLink` (hover or
  keyboard focus, never on scroll); a page's first-screen primary action stays
  a plain `next/link`; `/analyze` is never prefetched.
- **`cn()` knows the type ramp.** `lib/utils.ts` extends tailwind-merge with
  the custom `--text-*` sizes and shadows, so a color class next to
  `text-key-sm` no longer drops the size.

## The ledger as the hero

The homepage hero shows the Verdict Ledger for the sample deal as HTML, not as
a screenshot:

```
1280px ─────────────────────────────────────────────────────────────────────
 TrueCap   Analyze  For agents  For investors  Pricing  Learn   Sign in [Create account]
─────────────────────────────────────────────────────────────────────────────
 Stop forwarding listings.       │ Philadelphia rental example         Sample deal
 Start sending deals that        │═════════════════════════════════════════════════
 already pencil.                 │                        At asking  At the Offer Ceiling
                                 │ Price                  $265,000        $236,000
 Paste the rental listing. In    │─────────────────────────────────────────────────
 about 60 seconds, see whether   │▒Cash flow after reserves  $554/mo       $750/mo▒
 it clears your client's Buy Box,│▒ Target ≥ $750/mo                binding target▒
 the highest price that still    │ DSCR  Target ≥ 1.25           1.52           1.75
 does (the Offer Ceiling), and   │ Meets the Buy Box               No            Yes
 what could break the deal. …    │─────────────────────────────────────────────────
                                 │ Offer Ceiling                        $236,000
 [ Address or listing link ][Analyze a deal free]                    ════════
 See the sample deal             │ $29,000 below asking. Binding target: cash flow ≥ $750/mo.
 Free. No account. Your first full decision is included.
 ──────────────────────────────
 Buying for your own portfolio? Same analyzer, your own Buy Box. For investors
```

- **Grid:** 5/7 columns from 1024px, headline and form left, the ledger in the
  wider column. Below 1024px the ledger follows the investor cue; at 375×812
  and 390×844 the cue sits above the fold and the ledger's head starts at it.
  As built, the display size eases from 1024px (see Typography) so the
  investor cue clears the one-line cookie banner in a 1095×760 window, and the
  ledger's figure columns step down to 9rem between 1024 and 1279px. In that
  band the hero's address field and button each give up 4px of inline padding
  a side (12px and 16px), so the placeholder fits a field that is 187px wide
  at 1024px. The form is not stacked there: 58px more height puts the cue
  under the banner at 1095×760.
- **Copy:** the copy pass's H1, subhead, CTA, sample link, risk line and
  investor cue, unchanged. The arrow suffixes go ("See the sample deal", "For
  investors"). The ledger's caption calls it the sample deal, never
  "synthetic" (`docs/voice.md` bans that word as internal vocabulary).
- **Implementation:** a server render of the real sample-deal calculation at
  build time. The page calls `calculateSampleDealOutcome()` (the same
  `calculateAnalysis` and `calculateMaxAllowableOffer` the app uses) and renders
  through the ledger primitives. The column "at the Offer Ceiling" is the
  engine's own `maxOffer.achieved` result. No figure is typed by hand, no image
  ships, and no client JavaScript is added. `sample-deal-consistency.test.ts`
  already pins $236,000 and the asking-price figures.
- **Motion:** the double rule under $236,000 draws in once. That is the page's
  only motion.
- **Numbers today (engine output):** asking $265,000; Offer Ceiling $236,000;
  cash flow after reserves $554/mo at asking and $750/mo at the ceiling
  (binding, target ≥ $750/mo); DSCR 1.52 and 1.75 (target ≥ 1.25); $29,000
  below asking. Rent $3,050 and rate 6.6% are sample inputs.

## Homepage structure

The waterfall (hero → problem → steps → table → proof → FAQ → CTA) breaks at the
top: the artifact leads and the explanation happens on the artifact.

1. **Hero:** as above. Tight rhythm.
2. **How the ledger is built:** the same ledger at full width, with notes set
   against the rows they explain, in the OWID manner: the listing you pasted
   (price, rent and where each came from), the client's Buy Box (the targets),
   the price solved from it (the Offer Ceiling and its binding target), and
   what the client receives (the share link and the co-branded memo). It
   replaces both the three question cards and the three steps. Open rhythm.
   As built, the three step notes sit on the Price, Meets the Buy Box and
   Offer Ceiling rows; what the client receives is section 4's.
3. **Where the numbers come from:** a source table (HUD rent, FRED rate,
   property tax as your input with its 1.1% fallback flagged). Dense rhythm.
4. **What the client receives:** page 1 of the real PDF report for the sample
   deal, shown as a document, no browser frame, with the co-branding facts
   beside it (`scripts/render-pdf-cover-shot.ts`).
5. **Plans:** Free, Pro and Agent Pro as the page's only cards, prices from the
   catalog, the comparison table under them.
6. **Built by a rental investor:** kept, in a narrow column between rules. The
   founder stays unnamed and unpictured.
7. **Questions:** eight, as a ruled list under one FAQPage node. Kept: "My
   investor clients run their own numbers…", "Am I giving investment advice?",
   "Do my clients need a TrueCap account…", "What does the client see?…", "Can
   I keep different criteria for different investor clients?", "Does it work on
   my phone at a showing?", "My brokerage already gives me tools.", "Is TrueCap
   really free?". Dropped from the homepage because each paraphrases a section
   above; all remain on /for-agents or /for-investors: starting numbers, trusting
   software numbers, one listing against several clients, few clients a year,
   the Agent Pro trial, cancelling, and the rest of the investor set.
8. **Close:** the address form again, not a button that scrolls back up. As
   built, it opens on the 2px ink rule and sits on the hero's grid: the case
   on the left, the field on the right where the ledger stood.

The proof blocks stay mounted and keep rendering nothing until real, consented
proof exists.

## The app (Operate mode)

The app reads the same tokens: paper, graphite ink, rules, Signal Blue, the
radius scale, DM Mono figures. It is denser (14–16px text, 44px controls) and
quieter. Fields are white, panels sit on raised paper, and the decision summary
moves onto the ledger primitives. The `.dashboard-shell` scope stops overriding
paper, rules and radius. The navy rail (`sidebar-navy`) stays, by the founder's
decision: it is the app's one dark surface, and it frames the paper rather than
competing with it.

## Token strategy

- One stylesheet: `app/globals.css` serves the marketing site and the app
  (`styles/globals.css` is dead). The change is global: `--background` becomes
  the paper, `--card` becomes the raised paper, `--foreground` the graphite ink,
  `--border` the rule, and a new `--field` token carries white. Radius tokens
  follow the role scale. The dashboard's navy rail tokens stay.
- Fonts change in `app/layout.tsx` and in the three family declarations in
  `app/globals.css` (root, `.dashboard-shell`, `.dashboard-mobile-sheet`).
- App screens this touches, reviewed at checkpoint 3: the analyzer (/analyze and
  /dashboard/new: address input, form, the Verdict Ledger results), dashboard
  home, saved deals and the deal workspace, compare, templates, clients, triage,
  settings and profile, the sign-in, sign-up and password screens, the share
  viewer and client portal, and /sample-decision-memo.
- Out of token reach today, converted during rollout: 70 hard-coded blue glows,
  88 arbitrary shadows, the auth screen's hex colors, and the OG images, which
  load no font at all and hard-code hex colors.
- At the end: regenerate `public/product/*` with `scripts/capture-screenshots.ts`
  (1280×800 and 390×844, DPR 2), then redraw `/og/*` and the OG templates with
  Archivo and DM Mono loaded and the Newsprint paper.

## Decisions log

- 2026-09-30, checkpoint 1 (founder): type set A (Archivo); paper Newsprint;
  the ledger hero and the homepage structure approved, including the FAQ trim
  to eight questions and the "What the client receives" section; the navy
  dashboard rail kept.
- `buildPath` is recorded as `comp` in `.impeccable/config.json`, per the
  brief. No image generation is configured here (`OPENAI_API_KEY` unset), so
  Impeccable runs code-led until one is; checkpoint 2's directions are drawn in
  code as artboards.
- 2026-09-30, checkpoint 2 (founder): the expandable ledger (structure 5 in
  `docs/design-pass/checkpoint-2/structures.md`, seed `d7607ac2`). Build
  notes, recorded above where they land: the hero is 5/7 from 1024px with the
  display size easing, so the investor cue clears the one-line cookie banner
  at 1095×760; the three step notes are set on the Price, Meets the Buy Box
  and Offer Ceiling rows; the close sits on the hero's grid; orange is
  reserved for a miss, so the source table's tax-fallback flag is set in ink
  at 600. The run stays code-led: no image generation is configured.

- 2026-09-30, rollout (the founder delegated the open calls: "do what is best
  for the business and website", "prioritize converting agents"): the primary
  action on every page is the analyzer, including the /vs closes (analyzer
  filled and first, pricing outline); /pricing's Pro card carries the row's
  filled button; the calculator template is the 1% rule page because the cap
  rate calculator is unreleased; /embed keeps its structured data as it was
  (no new FAQPage claim); partner iframes stay chrome-free on the paper; the
  blog's First Offer Playbook capture is kept as it shipped (restyled, not
  enlarged); copy changed only where it was untrue or broken ("the team
  behind TrueCap", two /vs typos, the Pro card's duplicated four-answers note,
  the signed-in upgrade line's title case).

## Do and don't

**Do:** take every color, radius and font from tokens; set compared figures in
DM Mono tabular; keep one Disclaimer per marketing page; keep controls at 44px
or more with the 3px focus ring; keep `text-base` on inputs below `md`; use
`next/image` with intrinsic sizes.

**Don't:** add a dark theme, a second accent, gradient text, colored glows, an
eyebrow, an arrow suffix, an uppercase label, a card around a list, a shadow at
rest, `transition-all`, or a second motion; put text below 12px; fabricate proof.
