---
name: TrueCap
description: The Underwriter's Ledger. Rental decisions set as a ledger, on paper, with every figure sourced.
# CHECKPOINT 1 (2026-09-30): the founder picks ONE type set (A, B or C) and ONE
# paper (ledger, newsprint or bond). After the pick, delete the other two sets
# from `colors` and `typography` below and from the prose. Everything else in
# this file is decided.
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
  # Paper candidate 1: Ledger
  ledger-paper: "oklch(0.946 0.024 125)"
  ledger-raised: "oklch(0.972 0.013 125)"
  ledger-band: "oklch(0.925 0.032 125)"
  ledger-rule: "oklch(0.78 0.042 128)"
  ledger-rule-soft: "oklch(0.875 0.03 126)"
  ledger-ink: "oklch(0.23 0 0)"
  ledger-ink-2: "oklch(0.43 0.008 125)"
  # Paper candidate 2: Newsprint
  newsprint-paper: "oklch(0.945 0.006 85)"
  newsprint-raised: "oklch(0.97 0.004 85)"
  newsprint-band: "oklch(0.925 0.008 85)"
  newsprint-rule: "oklch(0.78 0.01 85)"
  newsprint-rule-soft: "oklch(0.875 0.008 85)"
  newsprint-ink-2: "oklch(0.43 0.006 85)"
  # Paper candidate 3: Bond
  bond-paper: "oklch(0.945 0.011 235)"
  bond-raised: "oklch(0.972 0.007 235)"
  bond-band: "oklch(0.925 0.014 235)"
  bond-rule: "oklch(0.78 0.02 236)"
  bond-rule-soft: "oklch(0.875 0.012 236)"
  bond-ink-2: "oklch(0.43 0.012 240)"
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
    letterSpacing: "-0.02em"
    fontVariation: "tabular-nums"
  label:
    fontFamily: "inherit (the text face of the chosen set)"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.35
  small:
    fontFamily: "inherit (the text face of the chosen set)"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45
  ui:
    fontFamily: "inherit (the text face of the chosen set)"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  # Type candidate A: Archivo
  display-a:
    fontFamily: "Archivo, Arial Narrow, sans-serif"
    fontSize: "3.4375rem"
    fontWeight: 750
    fontStretch: "82%"
    lineHeight: 1.02
    letterSpacing: "-0.012em"
  text-a:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.55
  # Type candidate B: Source Serif 4 over Source Sans 3
  display-b:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "3.25rem"
    fontWeight: 600
    lineHeight: 1.04
    letterSpacing: "-0.012em"
  text-b:
    fontFamily: "Source Sans 3, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 400
    lineHeight: 1.55
  # Type candidate C: Besley over Public Sans
  display-c:
    fontFamily: "Besley, Georgia, serif"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 1.03
    letterSpacing: "-0.014em"
  text-c:
    fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
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
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    height: "48px marketing / 44px app"
    padding: "0 20px"
  button-primary-hover:
    backgroundColor: "{colors.signal-blue-deep}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    border: "1px solid ink-2"
    rounded: "{rounded.control}"
    height: "48px marketing / 44px app"
  field:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    border: "1px solid ink-2"
    rounded: "{rounded.control}"
    height: "48px"
  plan-card:
    backgroundColor: "raised paper"
    border: "1px solid rule"
    rounded: "{rounded.object}"
    padding: "22px"
  menu:
    backgroundColor: "raised paper"
    rounded: "{rounded.float}"
    shadow: "0 12px 32px -12px oklch(0.2 0 0 / 0.18), 0 2px 6px -2px oklch(0.2 0 0 / 0.08)"
---

# Design System: TrueCap

<!-- Rewritten 2026-09-30 as a set of decisions (design pass, checkpoint 1).
It replaces the 2026-09-24 audit's reading of the incumbent look, which had
turned the old defaults into rules. Two choices are open until the founder picks
them: the type set and the paper. Everything else here is decided. Specimens:
docs/design-pass/checkpoint-1/ledger-specimens.html. Baseline measurements:
docs/design-pass/baseline/README.md. .impeccable/design.json is stale until the
build's documenter pass regenerates it from the built system. -->

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
  label and small 14px, UI 16px, marketing body 18px (19px for set B), H4 20px,
  H3 24px, H2 34px, H1 per set (below). Phone sizes: H1 33–38px, H2 28px.
  Nothing below 12px anywhere; the 10px and 11px steps (`text-3xs`,
  `text-2xs`) are retired from marketing pages.
- **Measure.** Running text 60–68ch. The hero paragraph is capped at 46ch so it
  sits beside the ledger. FAQ answers are capped at 64ch.
- **Headings** use `text-wrap: balance`. Body text uses `text-wrap: pretty`.
- **Weights.** Display per set. Labels and plan names 600. Text 400. Key
  figures 500, table figures 400.

### Open: pick one set

Rendered side by side in the specimen, each with the homepage H1, the hero
paragraph, a ledger block and the Pro plan card.

**A · Archivo.** Archivo semi-condensed (width 82%) at 750 for display, Archivo
at normal width 400 for text. A grotesk from the rate-sheet and stock-table
tradition. The narrow display cut keeps the long H1 to three or four lines in
the narrow hero column, so the ledger gets the width. Reads as a tool. Risk: a
heavy condensed face can tip into tabloid if it spreads, so it stays on H1–H3
and plan names. H1 55px desktop / 38px phone. Body 18px, measure 62–66ch.

**B · Source Serif.** Source Serif 4 (optical size 60 at display sizes) at 600
for display, Source Sans 3 at 400 for text, its designed companion. The
prospectus and the loan disclosure: calm and trust-coded for an investor reader.
Risk: a serif headline is one step from the editorial look this file avoids,
so it stays roman, never italic, on tinted paper that is not cream, with no
terracotta and no tracked mono labels. H1 52px / 36px. Body 19px (Source Sans
sets small), measure 64–68ch.

**C · Besley.** Besley (a Clarendon revival) at 700 for display, Public Sans
at 400 for text. Clarendon is the face of American commercial paper: auction
bills, deed books, the ruled heads of bank ledgers. Public Sans is the civic
sans descended from Franklin Gothic. The most distinctive of the three. Risk:
Clarendon at weight turns quaint if it is overused or set too black, so it stays
at 700, sentence case, headlines only. The wider face costs a fourth H1 line on
desktop. H1 48px / 33px. Body 18px, measure 60–64ch (Public Sans runs wide).

All three are open-license Google Fonts loaded through `next/font/google` with
`display: swap` and size-adjusted fallbacks; DM Mono keeps weights 400 and 500.
None is on the avoid list or on Impeccable's overused list.

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
  memo shown as a document is the one other white object.
- **Retired:** the hero gradient and blur blob, the 70 hard-coded
  `rgba(0,112,196,…)` glows, the gold and glow shadow tokens, the navy auth-page
  hex values.

### Open: pick one paper

Each paper comes with its raised tone, band (the row that decides), rule, soft
rule and Ink 2. All pass AA for Ink 2, Signal Blue and the semantics on both
paper and band.

| | Paper | Raised | Band | Rule | Ink 2 | Character |
|---|---|---|---|---|---|---|
| **Ledger** | #e9f0df | #f4f7ee | #e1ead3 | #b0bda1 | #4f514c | The accountant's columnar pad: yellow-green paper, green rules, the green-bar band. The most on-concept; the positive green has to work harder against a green page. |
| **Newsprint** | #efece8 | #f6f5f2 | #e9e6e0 | #bab7b0 | #51504c | A warm grey stock with almost no chroma, so it reads as paper, not cream. The most neutral: every semantic color reads cleanly on it. |
| **Bond** | #e6eef3 | #f1f7fa | #dee8ee | #acbac3 | #4a5156 | A cool grey-blue bond in Signal Blue's family. Closest to today, but darker and deliberate instead of near-white; the least new. |

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
  bar. Hairline border plus a wide shadow is banned.
- **Motion: one moment.** On the homepage the double rule under the Offer
  Ceiling draws in once (520ms, ease-out) after the figures have painted, so
  there is no layout shift and no delay to the largest paint. Nothing else fades
  or slides in: the scroll-driven `tc-reveal` and the `tc-rise-in` load-in
  retire from marketing pages. `prefers-reduced-motion` shows the rule static.
  `transition-all` leaves the Button primitive; transitions name their
  properties (color, background-color, border-color, opacity) at 150ms.
- **Focus** is a 3px Signal Blue outline with a 2px offset on every control.
  Controls are at least 44×44px (marketing buttons and fields are 48px tall).
- **Browser surfaces are themed.** Text selection uses the band color, the
  caret is Signal Blue, and figures use tabular numerals.

## Components

Every fix lands in one of these, never as a page-local override.

- **Section** (new shared wrapper): paper background, a top rule, one of three
  rhythms (`tight`, default, `open`), and a max width of reading (68ch),
  standard (1200px) or wide (1280px). Replaces the hand-rolled
  `<section className="border-t …"><div className="mx-auto max-w-… px-4 py-14 sm:py-20">`
  pattern (10 uses) and the persona pages' `mb-12 sm:mb-16` stacks.
- **Ledger primitives** (new, server components, shared by marketing and the
  app): `LedgerTable` (caption row on a heavy rule, sentence-case column heads,
  right-aligned DM Mono cells), `LedgerRow` (label, optional target line,
  figures, optional `binding` state on the band), `LedgerTotal` (display-face
  label, key figure, double rule). The app's decision summary, the share viewer
  and the sample memo move onto them during rollout.
- **Header:** paper, a single bottom rule, no blur and no shadow. Nav: Analyze ·
  For agents · For investors · Pricing · Learn. "Create account" is a primary
  button at 4px radius, not a pill.
- **Footer:** paper, rules between column groups, sentence-case column heads,
  one Disclaimer with unchanged text.
- **Plan card:** raised paper, 1px rule border, 6px radius, no shadow. The plan
  name is the heading, an audience line under it, the price in DM Mono from the
  catalog, the answers as a ruled definition list, one primary button.
- **FAQ:** a ruled list of `details` rows (question in the text face at 600, a
  plus/minus drawn in SVG), answers capped at 64ch. One FAQPage node mirrors
  exactly what is visible.
- **Source table:** FRED's grammar. Each row gives the value's name, its
  source, its date or basis, and how to replace it.
- **Buttons:** primary (Signal Blue), secondary (ink text, Ink 2 border on
  paper), link. No icon-only decoration.
- **Field:** white, 1px Ink 2 border (8.1:1 against white), 4px radius, 48px
  tall, 16px text on phones so iOS does not zoom.

## The ledger as the hero

The homepage hero shows the Verdict Ledger for the sample deal as HTML, not as
a screenshot:

```
1280px ─────────────────────────────────────────────────────────────────────
 TrueCap   Analyze  For agents  For investors  Pricing  Learn   Sign in [Create account]
─────────────────────────────────────────────────────────────────────────────
 Stop forwarding listings.       │ Philadelphia rental example    Synthetic sample
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
- **Copy:** the copy pass's H1, subhead, CTA, sample link, risk line and
  investor cue, unchanged. The arrow suffixes go ("See the sample deal", "For
  investors").
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
3. **Where the numbers come from:** a source table (HUD rent, FRED rate,
   property tax as your input with its 1.1% fallback flagged). Dense rhythm.
4. **What the client receives:** the real memo screenshot shown as a document,
   no browser frame, with the co-branding facts beside it. (Held: see below.)
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
8. **Close:** the address form again, not a button that scrolls back up.

The proof blocks stay mounted and keep rendering nothing until real, consented
proof exists.

## The app (Operate mode)

The app reads the same tokens: paper, graphite ink, rules, Signal Blue, the
radius scale, DM Mono figures. It is denser (14–16px text, 44px controls) and
quieter. Fields are white, panels sit on raised paper, and the decision summary
moves onto the ledger primitives. The `.dashboard-shell` scope stops overriding
paper, rules and radius. Whether its navy rail becomes graphite is held for the
founder (below).

## Token strategy

- One stylesheet: `app/globals.css` serves the marketing site and the app
  (`styles/globals.css` is dead). The change is global: `--background` becomes
  the paper, `--card` becomes the raised paper, `--foreground` the graphite ink,
  `--border` the rule, and a new `--field` token carries white. Radius tokens
  follow the role scale.
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
  the chosen faces loaded and the chosen paper.

## Held for the founder

1. Type set: A, B or C.
2. Paper: Ledger, Newsprint or Bond.
3. Approve the ledger hero and the homepage structure, including the FAQ trim.
4. Dashboard rail: keep navy, or move it to graphite ink to join the neutral
   system.
5. Section 4 of the homepage ("What the client receives") adds a section the
   copy pass did not have. Keep it, or fold its facts into the walkthrough.
6. Comp-first directions (checkpoint 2) need image generation. Impeccable's
   `generate-image` reads `OPENAI_API_KEY` (billed to that account; page
   screenshots are uploaded when used as references). Without it, the three
   directions are drawn in code as artboards, which is the other route the brief
   allows.

## Do and don't

**Do:** take every color, radius and font from tokens; set compared figures in
DM Mono tabular; keep one Disclaimer per marketing page; keep controls at 44px
or more with the 3px focus ring; keep `text-base` on inputs below `md`; use
`next/image` with intrinsic sizes.

**Don't:** add a dark theme, a second accent, gradient text, colored glows, an
eyebrow, an arrow suffix, an uppercase label, a card around a list, a shadow at
rest, `transition-all`, or a second motion; put text below 12px; fabricate proof.
