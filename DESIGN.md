---
name: TrueCap
description: Rental deal decision engine — the walk-away price, with every assumption labeled.
colors:
  ink: "oklch(0.15 0.02 250)"
  paper: "oklch(0.97 0.005 240)"
  card: "oklch(1 0 0)"
  signal-blue: "oklch(0.49 0.18 240)"
  signal-blue-light: "oklch(0.93 0.05 235)"
  signal-blue-text: "oklch(0.49 0.18 240)"
  ledger-green: "oklch(0.5 0.15 155)"
  ledger-green-light: "oklch(0.95 0.04 155)"
  caution-orange: "oklch(0.58 0.18 42)"
  caution-orange-light: "oklch(0.96 0.04 42)"
  caution-orange-text: "oklch(0.54 0.18 42)"
  metric-positive: "oklch(0.5 0.16 155)"
  metric-negative: "oklch(0.55 0.22 15)"
  success: "oklch(0.5 0.16 158)"
  warning: "oklch(0.78 0.16 75)"
  warning-foreground: "oklch(0.2 0.05 60)"
  gold: "oklch(0.56 0.13 85)"
  destructive: "oklch(0.577 0.245 27.325)"
  destructive-text: "oklch(0.5 0.22 27)"
  muted: "oklch(0.94 0.01 240)"
  muted-foreground: "oklch(0.51 0.03 250)"
  hairline: "oklch(0.65 0.02 240)"
  ring: "oklch(0.52 0.18 240)"
  dashboard-paper: "oklch(0.985 0.005 240)"
  dashboard-blue: "oklch(0.54 0.18 240)"
  dashboard-hairline: "oklch(0.92 0.012 255)"
  sidebar-navy: "oklch(0.18 0.04 260)"
  sidebar-foreground: "oklch(0.85 0.02 250)"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 800
    lineHeight: 1.04
    letterSpacing: "-0.025em"
  display-lg:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.4rem"
    fontWeight: 800
    lineHeight: 1.04
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  headline-sm:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title-lg:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
  title:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.35
  title-sm:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.35
  body:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.04em"
  label-xs:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.35
  label-2xs:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.04em"
  numeral:
    fontFamily: "DM Mono, ui-monospace, monospace"
    fontSize: "1rem"
    fontWeight: 500
    fontVariation: "tabular-nums"
rounded:
  sm: "0.5rem"
  md: "0.625rem"
  lg: "0.75rem"
  xl: "1rem"
  dashboard: "0.875rem"
  pill: "9999px"
spacing:
  hairline: "1px"
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  section: "56px (py-14) / 80px (py-20)"
  gutter: "16px phone / 24px tablet / 32px desktop"
components:
  button-primary:
    backgroundColor: "{colors.signal-blue}"
    textColor: "{colors.card}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "44px phone / 36px ≥md"
  button-primary-hover:
    backgroundColor: "oklch(0.49 0.18 240 / 0.9)"
  button-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "44px phone / 36px ≥md"
  button-secondary:
    backgroundColor: "{colors.muted}"
    textColor: "oklch(0.3 0.04 255)"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
    height: "44px"
  badge:
    backgroundColor: "{colors.signal-blue}"
    textColor: "{colors.card}"
    rounded: "{rounded.md}"
    padding: "2px 8px"
  badge-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "2px 8px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "24px"
---

# Design System: TrueCap

<!-- Generated 2026-09-24 by the audit/full-site pass (scan mode over
app/globals.css, components/ui/*, components/marketing/* and the dashboard
shell). Descriptive names and the North Star are the auditor's reading of the
incumbent system, not founder-confirmed language; everything else is measured
from code. Update this file when tokens change. -->

## Overview

**Creative North Star: "The Underwriter's Ledger"**

TrueCap looks like a clean sheet of underwriting paper: a cool, slightly blue
off-white page, dark ink, one electric-blue signal colour, and numbers set in
a monospace face so a column of dollars reads like a ledger. Nothing on the
page decorates; every colour that is not ink or paper carries a meaning
(positive, negative, caution, action). The product surface (analyzer,
dashboard) is denser and quieter than the marketing surface, but they share
the same ink, the same blue, the same radii and the same font, so a visitor
who arrives from an ad and ends up in the dashboard never feels they changed
products.

The system is light-only by decision. A `.dark` token set exists in
`app/globals.css` but nothing toggles it; the dashboard explicitly removed
its OS-dark override so the analyzer and the dashboard read as one product.
The dashboard keeps a dark-navy sidebar rail as its one dark surface.

**Key Characteristics:**
- One accent (electric blue, hue 240) for actions, links, focus and charts;
  green/orange/red are reserved for the sign of a number or a status.
- Numbers first: `font-mono` + `tabular-nums` on every metric, table and
  ledger row (71 files use the mono face, 73 use tabular numerals).
- Generous, calm rhythm on marketing pages (56–80px sections, 3xl/5xl
  containers); compact 14px/12px type in product UI.
- Borders, not shadows, do most of the work; `shadow-sm` is the resting
  elevation for a card.
- Every interactive element is at least 44×44px, enforced globally.

## Colors

A near-neutral cool paper with dark ink and a single saturated blue; the other
hues are semantic, not decorative.

### Primary
- **Signal Blue** (`oklch(0.49 0.18 240)`, ≈ #0070c4): primary buttons, links,
  focus rings, the active nav item, chart series 1, `themeColor`. Dark enough
  that white text on it clears AA.
- **Signal Blue Light** (`oklch(0.93 0.05 235)`): tinted callouts, selected
  rows, info surfaces. Small text on it uses **Signal Blue Text** (4.73:1).

### Semantic
- **Ledger Green** (`oklch(0.5 0.15 155)`) / **Metric Positive**
  (`oklch(0.5 0.16 155)`): positive cash flow, "Buy" tiers, success states.
  Light tint `oklch(0.95 0.04 155)` for pills.
- **Metric Negative** (`oklch(0.55 0.22 15)`): negative cash flow and losses
  only.
- **Caution Orange** (`oklch(0.58 0.18 42)`): mixed/marginal verdicts and
  warnings; text variant `oklch(0.54 0.18 42)` on the light tint (4.69:1).
- **Warning** (`oklch(0.78 0.16 75)` with dark foreground) and **Gold**
  (`oklch(0.56 0.13 85)`): tips and highlight badges in the dashboard.
- **Destructive** (`oklch(0.577 0.245 27.325)`) for fills and invalid
  borders; **Destructive Text** (`oklch(0.5 0.22 27)`) for inline error copy
  so it clears 5:1 on tinted surfaces.

### Neutral
- **Ink** (`oklch(0.15 0.02 250)`): body and heading text.
- **Paper** (`oklch(0.97 0.005 240)`): page background (marketing); the
  dashboard uses a lighter `oklch(0.985 0.005 240)`.
- **Card** (`oklch(1 0 0)`): every card, input and popover surface.
- **Muted** (`oklch(0.94 0.01 240)`) / **Muted Foreground**
  (`oklch(0.51 0.03 250)`): secondary surfaces and secondary copy (AA on
  paper and on Signal Blue Light).
- **Hairline** (`oklch(0.65 0.02 240)`): borders and input strokes, 3.22:1
  on white so field boundaries stay perceivable. The dashboard uses a
  softer `oklch(0.92 0.012 255)` hairline inside its shell.
- **Sidebar Navy** (`oklch(0.18 0.04 260)`) with `oklch(0.85 0.02 250)`
  text: the dashboard rail and its mobile sheet.

### Named Rules
**The One Signal Rule.** Blue is the only colour that means "act here". If
something is blue it is a link, a button, a focus ring or the active item.
**The Sign Rule.** Green and red are earned only by the sign of a number or a
verdict tier; never use them for emphasis.
**The Always-Light Rule.** There is no dark theme. Do not wire the `.dark`
tokens to a toggle or to `prefers-color-scheme`.

## Typography

**Display Font:** Plus Jakarta Sans (weights 300–800; 900 is not available and
must not be requested)
**Body Font:** Plus Jakarta Sans
**Numeral/Mono Font:** DM Mono (400, 500), not preloaded, used only for
numeric output

**Character:** a geometric humanist sans at heavy weight for headlines, the
same face at regular weight for reading, and a monospace strictly for
figures. Tight tracking (`tracking-tight`, −0.025em) on every heading;
`text-balance` on headlines.

### Hierarchy
- **Display** (800, `text-4xl sm:text-5xl lg:text-[2.4rem]`, 1.04): the
  homepage hero headline only.
- **Headline** (800, `text-2xl sm:text-3xl`, ~1.2): page titles on /analyze,
  /pricing, articles and dashboard pages.
- **Title** (700, `text-lg`–`text-xl`): card and section titles; `text-2xl`
  for section headings on marketing pages.
- **Body** (400, `text-base`, 1.6; `text-sm` inside product UI): article
  copy runs in `prose` inside `max-w-3xl`, with block-level children capped at 68ch (`[&>p]:max-w-[68ch]` and siblings), so no line runs past the measure at any width.
- **Label** (600, `text-xs`, uppercase with `tracking-wide` where used):
  metric labels, source chips ("HUD FMR", "Your input"), table headers.
- **Label-xs / Label-2xs** (600, 11px / 10px): the two dense product-UI
  steps below `text-xs` — ledger sub-labels, chip captions, table footnotes.
  10px is the floor. Use the named `text-2xs` / `text-3xs` utilities, not
  arbitrary `text-[11px]` / `text-[10px]` values.
- **Numeral** (DM Mono 500, `tabular-nums`): every currency, percent and
  ratio in cards, tables and the metrics band.

### Named Rules
**The Ledger Rule.** A number that a user will compare with another number is
set in DM Mono with tabular figures. Prose numbers stay in the sans.
**The 10px Floor.** No text below 10px (the 9px sizes were removed in the
2026-09-18 sweep).

## Layout

Single-column, centered containers: `max-w-3xl` for reading, `max-w-5xl` /
`max-w-6xl` for product and marketing sections, `max-w-2xl` for forms and
FAQs. Gutters are 16px on phones, 24px on tablets, 32px on desktop. Marketing
sections use `py-14` (phone) to `py-20` (desktop); cards use 24px internal
padding (`p-6`), compact product cards 16px.

Breakpoints are Tailwind's: 640 (sm), 768 (md), 1024 (lg), 1280 (xl). The
analyzer is a single column below `lg` with a fixed bottom "Run" bar; from
`lg` it becomes a two-pane cockpit (form left, live preview right). The
dashboard is a fixed dark sidebar from `lg` and a top bar with a sheet menu
below it. Below `lg` the marketing site collapses to one row (logo, primary
CTA, menu).

The document must never scroll horizontally: `html { overflow-x: clip }` and
scroll containers are made `position: relative` so screen-reader-only labels
cannot widen the page.

## Elevation & Depth

Depth is mostly tonal and border-based. Cards rest on `shadow-sm`
(`0 1px 2px rgb(0 0 0 / 0.05)`) over a 1px hairline; popovers, dialogs and
sticky bars use `shadow-lg`; the dashboard defines soft, offset, tinted
shadows for its hero cards. There are no hard offset shadows and no
glassmorphism.

### Shadow Vocabulary
- **Resting card** (`shadow-sm` + 1px border): every `Card`.
- **Floating** (`shadow-lg`): popovers, dropdowns, sticky bottom bars,
  dialogs.
- **Dashboard hero** (`--shadow-lg: 0 12px 32px -8px oklch(0.2 0.04 260 /
  0.12), 0 4px 8px -4px oklch(0.2 0.04 260 / 0.06)`): stat cards and the
  portfolio chart.
- **Glow** (`--shadow-glow`, `--shadow-gold-glow`): premium/highlight badges
  only.

### Named Rules
**The Border-First Rule.** If a hairline separates it, it does not also need
a shadow. Shadows appear on things that float.

## Shapes

Rounded, not pill-shaped. `--radius: 0.75rem` (dashboard 0.875rem) drives
`rounded-lg`; buttons, inputs and badges use `rounded-md` (0.625rem); cards
use `rounded-xl` (1rem); avatars, status dots and chips are `rounded-full`.
Borders are 1px hairlines; there are no thick coloured side borders on cards
or callouts. Icons are Lucide at 16px (`size-4`) inside controls, 20–24px in
headings, one stroke weight.

## Components

### Buttons
- **Shape:** `rounded-md`; `min-h-11 min-w-11`, `h-11` on phones and `h-9`
  from `md`; `text-sm font-medium`; `active:scale-[0.98]`.
- **Primary:** Signal Blue fill, white text, `hover:bg-primary/90`.
- **Outline:** paper fill, hairline border, `hover:bg-accent`.
- **Secondary:** muted fill, dark-blue-grey text.
- **Ghost / Link:** transparent; link variant underlines on hover.
- **Destructive:** destructive fill, white text.
- **Focus:** 3px `ring-ring/50` plus `border-ring`. The global rule adds a
  3px solid ring with 2px offset on `:focus-visible` for every control.
- **Sizes:** `sm` (h-8), `default`, `lg` (h-11/h-10 ≥md), `icon` (36px),
  `icon-sm` (32px), `icon-lg` (40px).

### Badges / Chips
- **Style:** `rounded-md`, `px-2 py-0.5`, `text-xs font-medium`, 1px border
  (transparent on filled variants). Variants: default (blue), secondary
  (muted), destructive, outline. Source chips ("HUD FMR", "Your input") and
  verdict pills reuse the semantic tints.

### Cards / Containers
- **Corner Style:** `rounded-xl`.
- **Background:** Card white on Paper.
- **Shadow Strategy:** `shadow-sm` at rest (see Elevation).
- **Border:** 1px hairline.
- **Internal Padding:** 24px (`py-6 px-6`), `gap-6` between header, content
  and footer slots; `CardTitle` is `font-semibold leading-none`,
  `CardDescription` is `text-sm text-muted-foreground`.

### Inputs / Fields
- **Style:** transparent fill, 1px hairline (`border-input`), `rounded-md`,
  `h-9` but never under 44px (`min-h-11`), `text-base` on phones (prevents
  iOS zoom) and `text-sm` from `md`; number inputs hide native spinners;
  currency inputs (`components/ui/currency-input.tsx`) format on blur.
- **Focus:** `border-ring` + 3px `ring-ring/50`.
- **Error:** `aria-invalid` turns the border destructive and the ring
  `destructive/20`; messages use Destructive Text in `text-xs`.
- **Disabled:** 50% opacity, `cursor-not-allowed`.

### Navigation
- **Marketing header** (`components/investcalc/header.tsx`,
  `marketing-nav.tsx`): sticky white bar; Analyze, Pricing, a "Learn"
  dropdown (Methodology, Free calculators, Compare tools, Guides, Glossary),
  then Sign in / Create account. Below `lg` a sheet menu with 44px rows.
- **Dashboard sidebar** (`components/dashboard/Sidebar.tsx`): dark-navy
  rail, Lucide icon + label rows, active row in `sidebar-accent`, deal-count
  badge on "My Deals"; the same list in a `dashboard-mobile-sheet` below `lg`.
- **Footer** (`site-footer.tsx`): grouped link columns, legal row (About,
  Privacy, Terms, hello@usetruecap.com), the one-per-page disclaimer.

### Signature: the Verdict Ledger
The results view (`analysis-dashboard.tsx`) is an accordion of ledger rows:
a decision summary (verdict tier pill, Deal score, Offer Ceiling in large
mono numerals), a metrics band of four tiles (cash flow, cap rate, CoC,
DSCR) with signed colour, then drill rows for assumptions, sensitivity,
projections and scenarios. Each row keeps its number in DM Mono, its label in
the sans, and its source chip beside the input it came from.

## Do's and Don'ts

### Do:
- **Do** use the semantic tokens (`text-success`, `text-metric-negative`,
  `bg-brand-blue-light`) rather than raw Tailwind palette colours.
- **Do** set every comparable number in `font-mono tabular-nums`.
- **Do** keep controls at ≥44×44px and rely on the global `:focus-visible`
  ring; never remove an outline without replacing it.
- **Do** render exactly one `<Disclaimer />` per marketing page and define
  each feature name once per page.
- **Do** keep `text-base` on inputs below `md` so iOS does not zoom.

### Don't:
- **Don't** introduce a second accent colour or use green/red for emphasis.
- **Don't** add a dark theme, a kicker/eyebrow above headings, gradient
  text, or thick coloured side borders.
- **Don't** request Plus Jakarta Sans at weight 900.
- **Don't** use raw `<img>`; use `next/image` with intrinsic sizes to avoid
  layout shift.
- **Don't** put text below 10px or reduce tap targets below 44px.
