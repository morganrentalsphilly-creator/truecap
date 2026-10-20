# TrueCap UI overhaul: Phase 0 brief (2026-10-20)

Recon for `OVERHAUL.md`, written before any production code changes. Branch
`design/overhaul-2026-10`. Everything measured here was taken from a local
production build (`next build --webpack`, `next start` on `127.0.0.1:3100` with
the loopback env from `scripts/dev-isolated.sh`; no Stripe key, so prices fall
back to the public catalog, as they would in a Stripe outage).

Companion files in this folder:

- `before/`: first-screen and full-page captures of 20 routes at 375, 768, 1095
  and 1440, plus `facts.json`, `home-copy.txt`, `pricing-copy.txt`,
  `for-agents-copy.txt`, `perf-homepage.json`, `impeccable-detect-*.json`,
  `lighthouse-summary.md`.
- `references/`: the §3 reference sites at 1440 and 390, with `facts.json`.
- `test-reanchor-list.md`: every markup-pinning test, split visual vs truth.
- `directions/`: the three Checkpoint 1 comps (Phase 1), built from engine
  figures by `tools/comp-data.ts` and `tools/build-comps.mjs`.
- `tools/`: the capture and build scripts used here.

## 1. What is wrong with the current UI

The Underwriter's Ledger is correct and legible, and the copy pass behind it is
sound. The problem is that nothing on it moves, nothing responds, and every
section is the same material: paper, rules, text. Specific findings, each with
the capture that shows it:

1. **Nothing to touch.** The homepage's only interactive elements are the
   address field, the FAQ rows and five `details` disclosures. A visitor
   cannot change a number anywhere on the page. (`before/home-1440-first.jpg`)
2. **The hero reads as a table, not a product.** The ledger is a static HTML
   table in DM Mono; the Offer Ceiling is the one loud figure and it is a
   total line. On a phone the first screen is headline, subhead, a one-line
   verdict sentence, the cue, the form and the cookie banner: the sample deal
   itself is below the fold. (`before/home-375-first.jpg`)
3. **Too many words.** The homepage `<main>` renders 2,062 words (the FAQ
   open). The full page is 13,273px tall at 375 and 8,952px at 1440. /pricing
   and /for-agents each render 1,172 words. The walkthrough opens five ledgers
   with every line item visible by default, so the proof and the pitch share
   one weight. (`before/home-375-full.jpg`, `before/home-copy.txt`)
4. **One material everywhere.** Every section is paper with 1px rules:
   hero, walkthrough, sources, the PDF cover, plans, founder, FAQ, close. There
   is no rhythm of light and dark, no depth, no change of scale. The eye has no
   reason to stop. (`before/home-1440-full.jpg`)
5. **The beige.** Newsprint `#efece8` plus graphite reads as a spreadsheet
   printout; the Impeccable detector flags it as `cream-palette` on every
   route. The brand's blue only appears on buttons and links, so the site has
   no colour of its own. (`before/impeccable-detect-home-1440.json`)
6. **Mono figures look like code.** DM Mono at 400 with wide letter-spacing
   (`$265,000`) gives every number a terminal look, and the zero with a slash
   fights the headline face. (`before/home-1440-first.jpg`)
7. **Two products.** The marketing site is warm paper; the analyzer and the
   dashboard are cards on paper with a navy rail; the sample memo is paper
   with rules again. The analyzer's results carry 24 `tiny-text` and 4 to 6
   `undersized-ui-text` findings at both widths. (`before/analyze-1440-first.jpg`,
   `before/impeccable-detect-analyze-*.json`, `TRUECAP_UX_AUDIT.md` P1)
8. **The result is a form submission.** On /analyze the verdict appears as a
   block of text and tables under the form; nothing announces it. The
   "Live screening preview" is a dashed empty box on first load.
   (`before/analyze-1440-first.jpg`)
9. **Auth is a form on paper.** Sign-in and sign-up are a form beside a ruled
   list of three bullet claims; nothing on the page shows the product.
   (`before/auth_login-1440-first.jpg`)
10. **The cookie banner takes 70px of every first screen** and the sticky
    conversion bar is a plain paper strip. (`before/*-first.jpg`)
11. **No motion at all.** The one allowed motion, the double rule drawing in
    under the Offer Ceiling, is 520ms of a 2px line; it reads as a glitch if
    noticed at all.

What is right and stays: the engine-driven hero (no typed figures, no image,
no client JS beyond the form), the copy, the one-field address form, the
sources table's grammar (value, source, basis, replacement), the accessibility
floor (44px targets, 3px focus ring, reduced motion), the budgets, and the
guard tests that pin facts.

## 2. Baseline numbers

Taken 2026-10-20 on the local production build; the same harness runs after
every phase.

### Transfer and vitals (`npm run perf:homepage`)

| Measure | Baseline | Budget |
|---|---|---|
| Homepage HTML (identity encoding) | 218,654 B | 350 KB |
| First-party JavaScript transferred | 406,585 B over 35 requests | 1 MB (script) |
| LCP (lab, unthrottled, 390×844) | 56 ms | 2,500 ms |
| CLS | 0 | 0.1 |
| Long tasks | 0 | 500 ms |
| axe serious or critical | 0 | 0 |
| Hero address entry above the fold at 390×844 | yes | yes |

### Lighthouse CI (`lighthouserc.json`: mobile, 390×844, simulated throttling, 3 runs)

Medians of three runs (`before/lighthouse-summary.md`; the raw reports are in `before/lighthouse/`). The assert step warned on three budgets and errored on none: `/` LCP 3.8 s against 2.5 s, `/` script 408 KB against 256 KB, `/analyze` LCP 4.1 s against 3.0 s. Accessibility and CLS, the two assertions that fail the build, pass everywhere. Script weight already exceeds its warning budget before the overhaul adds anything, so Phase 3 reports the delta against 408 KB, not against 256 KB.

| Route | Perf | A11y | LCP | TBT | CLS | Script KB | Total KB |
|---|---|---|---|---|---|---|---|
| `/` | 0.89 | 1.00 | 3.8 s | 10 ms | 0.000 | 408 | 651 |
| `/analyze` | 0.86 | 1.00 | 4.1 s | 58 ms | 0.002 | 615 | 841 |
| `/pricing` | 0.91 | 1.00 | 3.5 s | 28 ms | 0.002 | 416 | 648 |

### Copy and length

| Route | Words in `<main>` (FAQ open) | Height at 375 | Height at 1440 |
|---|---|---|---|
| `/` | 2,062 | 13,273 px | 8,952 px |
| `/pricing` | 1,172 | 9,896 px | 6,460 px |
| `/for-agents` | 1,172 | 9,896 px | 6,460 px |
| `/analyze` (form only) | n/a | 3,286 px | 2,285 px |

Target from `OVERHAUL.md` §1: the homepage word count drops by about 40%, to
roughly 1,200 words, with no fact lost.

### Impeccable rendered detector (engine from skill v4.3.1, against the current DESIGN.md)

| Route and viewport | Primary findings |
|---|---|
| `/` 1440×900 | 6: `line-length` ×2, `nested-cards` ×3, `cream-palette` |
| `/` 390×844 | 4: `nested-cards` ×3, `cream-palette` |
| `/analyze` 1440×900 | 34: `tiny-text` ×24, `undersized-ui-text` ×4, `line-length` ×2, `nested-cards` ×2, `all-caps-body`, `cream-palette` |
| `/analyze` 390×844 | 34: `tiny-text` ×24, `undersized-ui-text` ×6, `nested-cards` ×2, `all-caps-body`, `cream-palette` |
| `/pricing` 390×844 | 1: `cream-palette` |

### Capture facts (`before/facts.json`)

No horizontal overflow on any of the 20 routes at any of the four widths. No
arrow-suffixed links. No small uppercase text on marketing pages (20 instances
on /analyze, 1 on the 404 page). Exactly one Disclaimer on every marketing page;
none on /analyze (the footer there omits it by design) and none on auth.

## 3. References: what to take, what to leave

Captured with Playwright at 1440 and 390 into `references/`.

| Site | Take | Leave |
|---|---|---|
| wise.com | The calculator is the first thing under the headline and it answers with exact figures at display size (`1,000.00` → `885.44`); on a phone the hero is headline, one button, then the instrument. The whole page is one saturated brand colour used as a field, not an accent. (`references/wise-390-first.jpg`) | The all-caps condensed display face, the lime, "under 20 seconds" style speed claims. |
| stripe.com | Product UI drawn in code, layered on soft shadows, with real-looking figures; one gradient object used once at the top, then a long page that alternates white product sections, a dark band and photography, so it stays scannable at 9,000px. (`references/stripe-1440-full.jpg`) | The gradient itself, the logo strip, the chat bubble, sales language. |
| mercury.com | A dark product panel with believable numbers ("$5,144,707.98") as the second section; a premium light-and-dark pairing; restraint in copy. (`references/mercury-1440-full.jpg`) | The landscape hero photograph, the "Loved by 300K+" proof strip, the dark-first page. |
| ramp.com | Shows the math as objects: receipts, cards and matching lines rendered as small documents; the dot-grid ground; a live counter strip of real activity at the bottom of the hero. (`references/ramp-1440-first.jpg`) | The counters (TrueCap has no usage proof to show), the celebrity banner, the chartreuse. |
| plaid.com | The data-flow idea: sources on one side, the product in the middle, the result on the other, drawn with lines that carry meaning. (`references/plaid-1440-first.jpg`) | Gradient text, the engraved-banknote hero, the chat widget, the cookie bar that covers the fold. |
| linear.app | Crisp hierarchy: a two-line headline, one quiet sentence, then the product frame rendered large and dark at the fold; 150 to 250ms interactions; Inter plus a mono for metadata only. (`references/linear-1440-first.jpg`) | The dark-only theme (agents read in daylight), the developer register. |
| dealcheck.io | The bar to clear: a 2016-era blue hero with a device mockup, Open Sans, a pie chart. TrueCap must look a generation newer and more trustworthy than this. (`references/dealcheck-1440-first.jpg`) | Everything. |
| BiggerPockets calculator | Four coloured tiles with screenshots, a "PRO" pill eyebrow, a trial banner over the content. Proof that cards-with-icons is what the category already looks like. (`references/biggerpockets-calc-1440-first.jpg`) | Everything. |

Patterns to borrow from the catalogues named in §3 of the brief (saasframe,
mobbin, refero): the stepped input flow with a progress rail, the sticky
summary bar on a results page, the bottom-sheet assumptions editor on phones.

## 4. Inventory

### Routes that render UI (page files)

- **Marketing, static or ISR:** `/`, `/analyze`, `/for-agents`, `/for-investors`,
  `/for-brrrr`, `/for-buy-and-hold`, `/for-flippers`, `/for-house-hackers`,
  `/pricing`, `/about`, `/methodology`, `/reviews`, `/why-truecap`,
  `/guarantee`, `/playbook`, `/sample-decision-memo`, `/changelog`, `/privacy`,
  `/terms`, `/search`, `/feedback/testimonial`, the 404 (`not-found.tsx`) and
  the error boundaries (`error.tsx`, `global-error.tsx`).
- **Templated content:** `/blog` plus 76 posts, `/vs` plus 41 pages,
  `/tools` plus 22 calculators, `/markets` plus 15 cities, `/states` (2),
  `/glossary` (2), `/embed` and `/embed/[slug]`, `/embed/brand/[token]`.
- **App (signed in):** `/home-authed`, `/dashboard`, `/dashboard/new`,
  `/dashboard/saved-analyses`, `/dashboard/saved-analyses/[id]`,
  `/dashboard/compare`, `/dashboard/templates`, `/dashboard/clients`,
  `/dashboard/triage`, `/saved-analyses`, `/compare`, `/templates`, `/profile`,
  `/settings`, `/settings/branding`; layouts for dashboard, profile, settings.
- **Auth:** `/auth/login`, `/auth/sign-up`, `/auth/forgot-password`,
  `/auth/update-password`.
- **Client-facing:** `/s/[token]`, `/d/[encoded]` (legacy), `/memo/[token]`,
  `/portal/[token]`, `/portal/[token]/d/[dealId]`.
- **Admin:** `/admin/email-preview`, `/admin/seo`, `/admin/testimonials`
  (restyled only through shared primitives; not a phase target).

### Shared components that carry the look

- **Tokens and type:** `app/globals.css` (`@theme`, the type ramp, the
  `font-display` utility, the Archivo fallback face, the ledger rules, the one
  motion, the `.dashboard-shell` scope with its own shadow and glow tokens),
  `app/layout.tsx` (fonts), `lib/utils.ts` (`cn` with the custom scales).
- **Marketing chrome:** `components/investcalc/header.tsx` (the site header),
  `components/marketing/marketing-nav.tsx`, `site-footer.tsx`, `section.tsx`
  (`Section`, `SectionHeading`, `PAGE_CONTAINER`), `page-parts.tsx`
  (`PageHero`, `ActionRow`, `RuledList`, `StepList`, `Note`, `CloseSection`),
  `plan-card.tsx`, `faq-section.tsx`, `disclaimer.tsx`, `product-shot.tsx`,
  `sticky-conversion-bar.tsx`, `cookie-consent-banner.tsx`,
  `hero-address-form.tsx`, `marketing-hero.tsx`, `landing-sections.tsx`
  (walkthrough, sources, client-receives, plans, founder, FAQ, close),
  `article.tsx`, `vs-page.tsx`, `client-pdf-cover.tsx`, `pricing-toggle-plans.tsx`.
- **Ledger primitives:** `components/ledger/ledger-parts.tsx`,
  `verdict-ledger.tsx`, `open-ledger.tsx`; `lib/sample-deal-ledger.ts`.
- **Calculators:** `components/tools/tool-parts.tsx` (`ToolFrame`,
  `ToolResult`, `ToolFormula`), `tool-number-field.tsx`, 18 widgets.
- **UI primitives (shadcn on Radix):** `components/ui/*` (29 files: button,
  input, card, dialog, sheet, popover, tooltip, tabs, accordion, select,
  slider, switch, toast, table, skeleton, chart, command, scroll-x, …).
- **Analyzer:** `components/investcalc/investcalc-page.tsx` (11,493 lines; the
  form and results root), `analysis-dashboard.tsx` (3,683 lines; the Verdict
  Ledger results), `max-offer-card.tsx`, the chart cards under
  `analysis-panels/shared/`, `cash-flow-waterfall.tsx`, `sensitivity-grid.tsx`,
  `what-if-sliders.tsx`, `read-only-analysis-view.tsx`.
- **App shell:** `components/dashboard/dashboard-shell.tsx`, `Sidebar.tsx`,
  `Topbar.tsx`, `dashboard-sheet.tsx`, `StatCard.tsx`, `your-deals-table.tsx`,
  and the rest of `components/dashboard/` (23 files).
- **Auth:** `components/auth/auth-shell.tsx` and the four forms.
- **Social cards:** `lib/og/newsprint.tsx` and the four templates in `lib/og/`.
- **Email templates:** `emails/*` (out of scope; their palette test pins
  Newsprint and is addressed in Phase 2).

### Tests that pin markup

`test-reanchor-list.md` lists every file with counts. The twelve highest-risk
files, most coupled to the retired aesthetic first: `vs-design-pass`,
`shared-visual-guards`, `auth-design-pass`, `tools-template-t2` (SHA-256 of
rendered markup), `shared-chrome-design-guards`, `blog-post-frame`,
`embed-design-pass` and `for-agents-design-pass`, `article-frame` and
`article-fanout-parts`, `display-font-fallback`, `cn-custom-scales` and
`og-newsprint-fonts`, the palette pins (`email-site-palette`,
`checkout-session-branding`, the token-name contrast math in the two
accessibility guards), the motion bans (`pricing-responsive-guards`,
`reference-content-truth-guards`), and the "ledger as hero" set
(`homepage-ledger`, `site-overhaul-product-shots`, `site-overhaul-performance`,
the two e2e specs).

Two rules in that list need a decision rather than a re-anchor:

- `reference-content-truth-guards` bans `animation-timeline: view()` site-wide
  (audit item P1-73: scroll-linked opacity hid content). The overhaul uses
  scroll-driven animation with the visible state as the default. The test is
  rewritten to ban opacity-from-zero reveals, not the timeline.
- `structured-data-f4` finds the visible FAQ through `<details><summary>`. The
  animated accordion keeps native `details` (animated with
  `interpolate-size`/grid rows), so the test and the FAQPage node stay exact.

## 5. Tooling decisions verified in this repo

- **Next 16.3.1, React 19.2.6.** `import { ViewTransition } from "react"`
  resolves (the symbol is present in the installed React build), and
  `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md` documents
  `<ViewTransition name>` for shared-element morphs, `enter`/`exit` with
  Suspense, and `transitionTypes` on `<Link>`. Route transitions are in scope;
  no React upgrade is needed.
- **Fonts in `next/font/google` for this Next:** Geist (variable, wght
  100–900), Geist Mono (variable), Hanken Grotesk (variable, 100–900),
  Schibsted Grotesk (variable, 400–900), Bricolage Grotesque (variable, with
  `opsz` 12–96 and `wdth` 75–100). All four candidates ship tabular figures
  (`tnum`); Geist, Hanken Grotesk and Bricolage were checked in the comps.
- **Playwright 1.62.1** needed its matching Chromium (`npm run
  test:e2e:install`, done). The capture harness
  `docs/design-pass/tools/capture.mjs` runs unchanged. `sips` cannot write
  WebP on this machine; captures are kept as PNG for now and compressed to
  JPEG before the Phase 0 PR so the repository does not grow by 100 MB.
- **Lighthouse CI** cannot start its own server while one is running on 3100;
  `tools/lhci-running-server.json` is the same config pointed at the running
  server (used for the baseline above).
- **Build-chain guard:** the four new runtime dependencies for Phase 2
  (`motion`, `@number-flow/react`; nothing else is planned) go in their own
  commit with the manifest bump on its own, per `OVERHAUL.md` §2.
- **Impeccable:** `impeccable context` loaded PRODUCT.md, DESIGN.md and the
  homepage surface brief; the project is code-led (`buildPath: comp` is
  recorded but no image generation is configured, so the comp path is not
  available and the directions are drawn in code). The direction seed roll is
  recorded in §8.

## 6. Page-by-page plan

**Phase 2, foundation.** New tokens in `app/globals.css` (base, panel, brand,
semantic, radius 6/10/12/16, elevation 1–3, motion durations 150/200/250/400 and
two easings), the new type ramp and fonts in `app/layout.tsx`, the motion
module (`lib/motion.ts`, `components/motion/`), restyled `components/ui/*`,
header, footer, `Section`, `page-parts`, `PlanCard`, FAQ, the ledger
primitives reborn as result primitives (`ResultPanel`, `Figure`, `TargetChip`,
`SourceChip`, `PriceTrack`), `DESIGN.md`, `.impeccable/design.json`,
`CLAUDE.md` §9. Tests re-anchored in the same commits: `cn-custom-scales`,
`display-font-fallback`, `shared-chrome-design-guards`, `shared-visual-guards`,
`accessibility-remediation-guards` (token names kept), `checkout-session-branding`.

**Phase 3, homepage (Checkpoint 2).** Sections in order, all server
components with client islands:

1. Hero: left column unchanged in copy; right column the "drag the price"
   instrument (`PriceScrubber` island on a server-rendered panel at the ceiling
   state; precomputed sweep from `calculateAnalysis` in $1,000 steps; Radix
   Slider; NumberFlow figures; source popovers; plays once from asking to the
   ceiling, static under reduced motion). New unit test: the sweep's points at
   asking and at the ceiling equal `calculateSampleDealOutcome()`, and "Meets"
   flips exactly at the engine's ceiling ($236,000 meets, $237,000 misses).
2. "From listing to offer": a pinned product frame with three scroll steps
   (listing pasted with source chips; Buy Box check with the binding target
   lit; the Offer Ceiling resolves and the send-to-client card slides in);
   stacked on phones; the five open ledgers move behind one "See every line"
   disclosure (the proof stays, the default weight drops).
3. "Every number has a receipt": the sources table as an animated flow (HUD →
   rent, FRED → rate, you → property tax → result); each node opens the
   existing source copy. The table markup stays for no-JS and for the guards.
4. "Make it yours": the co-branding preview island (name and colour inputs with
   `ph-no-capture`, contrast-safe text colour, nothing stored or sent), ending
   on the Pro and Agent Pro line.
5. Plans: monthly/annual toggle with NumberFlow prices from the catalog, hover
   depth on cards, sticky-header comparison table.
6. Built by a rental investor (condensed, unnamed), FAQ as an animated native
   `details` accordion (eight questions, one FAQPage node), close on the brand
   band with the address form.
7. Chrome: condensing sticky header, compact cookie banner below the fold's
   content, restyled sticky conversion bar.

Word budget: 1,200 ± 100 in `<main>` with every fact kept (moved into
disclosures and popovers). Tests re-anchored: `homepage-ledger`,
`public-funnel-trust-guards` (section set), `site-overhaul-product-shots`,
`site-overhaul-performance`, `hero-listing-expectation-line`,
`intent-prefetch-landing`, `structured-data-f4` (FAQ markup), both e2e specs.

**Phase 4, analyzer and client pages.** `/analyze` and `/dashboard/new`: the
hero-sized address field morphing from the homepage (ViewTransition), the
stepped flow with a progress rail (Property → Price and rent → Financing →
Assumptions), source chips on defaults, advanced options in a smooth
disclosure, a bottom sheet for assumptions on phones. Results: the one-second
choreographed reveal (verdict → Offer Ceiling rolls in → price track → metric
tiles → target chips → next step), a sticky summary bar, charts animating the
first draw only, skeletons matching layout. Pure relabels from the audit ("10-yr
ROI", pre-tax vs after-tax). `/s/[token]`, `/portal/[token]`,
`/sample-decision-memo`: document feel, contrast-safe agent colour, figures
revealed once, print stylesheet. Tests: `accessibility-audit-followup-guards`,
`analyzer-interaction-p2`, `ux-polish-guards` (the eyebrow pin goes),
`share-page-one-cta`, `public-share-copy-contract` (unchanged).

**Phase 5, marketing rollout through templates.** `PageHero`, `Section`,
`CloseSection`, `RuledList`, `StepList`, `PlanCard`, `FaqSection`,
`ArticleBody`, `ToolFrame`, `VsHero`/`VsMatrixTable`, the market and state
data pages, glossary, playbook, 404 and error pages. Calculators keep the
container-query layout so `/embed` iframes stay chrome-free. Tests:
`vs-design-pass` (rewritten to the new rules), `for-agents-design-pass`,
`embed-design-pass`, `tools-template-t2` (new SHA after the restyle),
`blog-post-frame`, `article-frame`, `article-fanout-parts`,
`reference-content-truth-guards`, `hud-table-phone-fit`, `content-hub-readiness`.

**Phase 6, app.** `dashboard-shell`, `Sidebar` (the navy rail becomes the
marketing dark band's surface), `Topbar`, `StatCard`, the deals table, compare,
Buy Boxes, clients, settings, profile; empty states pointing at the sample
deal; toasts; the `cmdk` palette; auth screens as a split layout with a live
mini instrument. Tests: `workspace-ux-guards`, `batch-triage-ui-guards`,
`evidence-workflow-polish-guards`, `auth-design-pass`, `sidebar-label-contrast`,
`dashboard-deals-responsive`, `compare-responsive`.

**Phase 7, assets.** `lib/og/newsprint.tsx` redrawn as the new frame (hex
constants, fonts loaded, fail-safe kept), `public/product/*` regenerated with
`scripts/capture-screenshots.ts`, the PDF cover shot, `theme-color` and the
manifest colours. Tests: `og-newsprint-fonts`, `share-link-preview`,
`public-metadata-contract`.

**Phase 8, QA.** As listed in `OVERHAUL.md`, plus the detector on rendered
pages at 1440×900 and 390×844 against the new DESIGN.md.

## 7. Risks

1. **Budget pressure on `/`.** The homepage ships no analyzer JS today
   (406 KB of first-party JS is the framework and the small islands). Motion
   (`domAnimation` ≈ 29 KB gzipped), NumberFlow (≈ 10 KB) and four islands must
   stay under the 256 KB script warning and the 200 ms TBT warning on a
   throttled phone. Mitigation: the hero island hydrates onto server HTML at
   the ceiling state; `domMax` loads only when a drag starts; the scroll story
   and sources flow use CSS scroll timelines with no JS; measure after Phase 3
   before touching Phase 4.
2. **LCP element.** The H1 stays the LCP candidate and never animates;
   the hero panel's figures are server-rendered so they paint with the HTML.
3. **CLS from fonts.** The Archivo fallback face was tuned to 0 CLS. The new
   display face needs the same measured `size-adjust` fallback
   (`display-font-fallback.test.ts` is re-anchored, not dropped).
4. **Guard breadth.** About 60 test files assert class strings; roughly 20 of
   them are source-text pins that break on any refactor. Each phase lists its
   re-anchors in advance (above), and every re-anchor lands in the same commit
   with a `Re-anchored:` line.
5. **The scroll-timeline ban** (`reference-content-truth-guards`) encodes a
   real accessibility finding. The new rule keeps the intent: visible by
   default, animation only under `@supports` and `no-preference`.
6. **Firefox.** No scroll-driven animations yet; every scroll effect must read
   complete without them (the default state is the final state).
7. **Analyzer size.** `investcalc-page.tsx` is 11,493 lines and
   `analysis-dashboard.tsx` 3,683; restyling them is the largest single job.
   Phase 4 restyles through the shared result primitives and the UI
   primitives first, and touches those files only for structure (the stepped
   flow, the reveal), never for logic or validation.
8. **No-JS and reduced motion.** Every signature moment has a static state that
   is the complete page; e2e adds a reduced-motion pass.
9. **Email palette test** pins Newsprint hexes for templates that are out of
   scope. Decision for Phase 2: keep emails on the old palette and scope the
   test to `emails/`, or move them to the new brand hexes in Phase 7.
10. **Stripe Checkout branding** (`checkout-session-branding`) reads the brand
    hex from DESIGN.md; the new file keeps a `colors.brand` entry in the same
    front-matter format.

## 8. Impeccable direction seed (recorded, not applied)

`impeccable concept-seed --scope direction --mode persuade` ran once: key
`b4bde2cc`, assigned index 4, six catalogue challengers dealt (a Breton
ornament plate book, a star atlas, hand-bent neon, a multiplane cel dawn, a
cathode numeral stack, a VU-meter bridge). `OVERHAUL.md` §5 pins the three
directions and names the founder's checkpoint as the selection, and a pinned
direction beats the roll. Verdicts, decided before borrowing: all six declined
on audience identification (an agent at a showing does not read any of them as
their world) and on product clarity. Disciplines kept from the declined hand,
written into the directions as raises:

- From the VU-meter bridge: the handle and the figures have ballistics (mass
  and damping on a spring), never instant jumps; the "red past zero" rule
  becomes "orange only past the target".
- From the cathode numeral stack: every state of a target chip exists in the
  DOM at once and the active one is struck forward, so a state change is a
  swap of weight, not a mount.
- From the star atlas: hierarchy is carried by figure size on a fixed ramp,
  so the Offer Ceiling is always the largest number on any surface, and type
  weight declines to compete with it.

Telemetry for the roll runs after the founder's choice, with
`--kind assigned --from b4bde2cc`.

## 9. Open for the founder at Checkpoint 1

1. Which direction, or which mix (`directions/README.md` has one paragraph
   each and `directions/side-by-side.png`).
2. Whether emails keep the Newsprint palette (risk 9).
3. Whether the "Make it yours" co-branding preview may show a sample agent
   name typed by the visitor only (never a stored one), as planned.
4. The in-app "what if I offer $X" slider and written chart takeaways stay
   proposals; confirm they are out of this build.
