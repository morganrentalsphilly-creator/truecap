# Phase 8: QA and the final report (2026-10-20), ⛔ Final checkpoint

The overhaul in `OVERHAUL.md` is built: Phases 0 to 7 are the stacked pull
requests #181 to #187, and this phase's checks and fixes are on
`design/overhaul-2026-10-phase-8`. Nothing is merged. This report is the
final checkpoint's evidence; the founder decides whether the stack ships.

## What shipped, phase by phase

| Phase | PR | What it holds |
|---|---|---|
| 0 and 1 | #181 | The brief, the baseline, the re-anchor inventory, the three directions; the founder chose B, Blueprint |
| 2 | #182 | The tokens, Hanken Grotesk and Geist Mono, the motion system, the shared parts, `DESIGN.md` |
| 3 | #183 | The homepage: the hero's sheet with the price to drag, the scroll story, the receipt flow, the co-branding preview, the plans, the chrome |
| 4 | #184 | The analyzer input, the result's reveal and price track, the summary bar, the share page and the memo |
| 5 | #185 | The marketing templates: lines not heavy rules, the sheet grid, the calculator as an instrument, the 404 and error pages |
| 6 | #186 | The app: the rail, the top bar, the stat cards, the pages, the empty states, the auth screens with the live sheet |
| 7 | #187 | The assets: the social-card frame, the product shots, the PDF palette and cover, the theme colours, the emails |
| 8 | this branch | The QA passes below and the six fixes they found ("What the passes changed") |

## The budgets against the baseline

Two instruments, both from the Phase 0 baseline in `../brief.md` §2 (taken
2026-10-20 on the local production build; the same harness ran after every
phase). "Phase 8" is this branch's production build, measured on a quiet
machine (`perf-homepage.json`, `lighthouse-rows.txt`).

### Transfer and vitals (`npm run perf:homepage`, Chromium 390×844, unthrottled)

| Measure | Baseline | Phase 8 | Budget |
|---|---|---|---|
| Homepage HTML (identity encoding) | 218,654 B | 295,770 B | 350 KB |
| First-party JavaScript transferred | 406,585 B over 35 requests | 437,105 B over 40 requests | 1 MB (script) |
| LCP (lab, unthrottled) | 56 ms | 108 ms | 2,500 ms |
| CLS | 0 | 0.0001 | 0.1 |
| Long tasks | 0 | 0 | 500 ms |
| axe serious or critical | 0 | 0 | 0 |
| Hero address entry above the fold at 390×844 | yes | yes | yes |

`budgetFailures` is empty. The HTML carries 77 KB more than the baseline:
NumberFlow renders each live figure with a declarative shadow template
(about 900 B a figure) and the scroll story's frames render once per step,
as Phase 3 recorded (293,595 B then; the later phases added 2 KB). The
JavaScript is 30 KB and five requests over the baseline: Motion's lazy
features, NumberFlow and the islands (the scrubber, the receipt popovers,
the co-branding preview, the plans toggle), against the 1 MB budget.

### Lighthouse CI (mobile, 390×844, simulated throttling, medians of 3 runs)

| Route | Perf | A11y | LCP | TBT | CLS | Script KB | Total KB |
|---|---|---|---|---|---|---|---|
| `/` baseline | 0.89 | 1.00 | 3.8 s | 10 ms | 0.000 | 408 | 651 |
| `/` Phase 8 | 0.89 | 1.00 | 3.8 s | 23 ms | 0.000 | 428 | 629 |
| `/analyze` baseline | 0.86 | 1.00 | 4.1 s | 58 ms | 0.002 | 615 | 841 |
| `/analyze` Phase 8 | 0.91 | 1.00 | 3.5 s | 61 ms | 0.002 | 629 | 802 |
| `/pricing` baseline | 0.91 | 1.00 | 3.5 s | 28 ms | 0.002 | 416 | 648 |
| `/pricing` Phase 8 | 0.88 | 1.00 | 3.9 s | 23 ms | 0.002 | 444 | 618 |

`lhci collect` and `lhci assert` exit 0. The two assertions that fail the
build, accessibility ≥ 0.95 and CLS ≤ 0.05, pass on every route. The
warnings are the baseline's three: `/` LCP against 2.5 s, `/analyze` LCP
against 3.0 s, and `/` script weight against 256 KB, which the baseline
already exceeded at 408 KB. Total transfer is lower on all three routes;
script weight is 20 KB, 14 KB and 28 KB higher. TBT varies run to run
(`/` 45, 23 and 10 ms across the three runs); every value is under the
200 ms warning budget on `/`, the one route that asserts it. Performance
scores move with simulated LCP: `/analyze` gains 0.05, `/pricing` loses
0.03, `/` is unchanged. The LCP element is text on every route (the
reports in `.lighthouseci/`, not committed): the H1 on `/`, the intro
paragraph on `/analyze`, the hero paragraph on `/pricing`.

### Copy

| Measure | Baseline | Phase 8 |
|---|---|---|
| Words visible in `<main>` on `/` (disclosures closed) | 2,062 (every ledger row open by default) | 1,298 |
| Words with every disclosure open | 2,062 | 2,445 |

The brief's target was about 1,200 words visible. Phase 3 measured 1,213;
Phases 4 to 7 added 85 words to `<main>`. No fact left the page: the
figures the ledger's rows carried are in the disclosures, every one from
`lib/product-facts.ts` or the engine.

## The gates

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npm run lint` | clean |
| `npm test` | 533 files, 9,041 tests, green on the final tree (one file and two cases skipped: the render harness, which needs `HARNESS_OUT`) |
| `npm run build` (production, webpack, the dev-isolated env) | exit 0 |
| `node scripts/verify-build-integrity.mjs` | passes; the manifest matches the two dependency commits of Phase 2 |
| `npm run pdf:check -- --branches` (Phase 7) | every deal shape renders on the new palette |
| Playwright, `public-chromium`, against this build | 44 passed in 47 s (the passes section) |
| Lighthouse CI (`lhci collect` + `assert`, `tools/lhci-running-server.json`) | exit 0; the baseline's three warnings, no error |
| `impeccable detect --json` on the 184 `.tsx` files the overhaul changed | 0 findings (`detector-source.json`) |

The authenticated browser specs (`e2e/authenticated-*.spec.ts`, three
projects) need the disposable Supabase stack that CI starts
(`browser-regressions` in `ci.yml`); this machine has no Docker or Supabase
CLI. `ci.yml` runs on pull requests whose base is `main`, so #181 has the
full run (check, build-chain-guard, browser-regressions, lighthouse: all
green after the `comp-data.ts` type fix pushed to its branch); #182 to #187
show the check skipped because each is based on the previous phase branch.
Each gets the full run as the stack merges upward and GitHub retargets it to
`main`. Merging bottom-up, one PR at a time after its checks pass, is the
safe order.

## The passes

Each pass is a script in `../tools/` that drives the local production build
with Playwright and writes its evidence here.

### Reduced motion (`qa-reduced-motion.mjs`, Chromium 1440×900, `prefers-reduced-motion: reduce`)

- The hero's scrubber rests at the ceiling, `aria-valuenow` 236,000, at load
  and after 2.5 s: no settle animation plays.
- The three `.tc-leader` strokes have no animation and a dash offset of 0:
  the scroll timelines are behind `no-preference` and the leaders are drawn.
- The hero's highlight stroke has no animation.
- On the result, no `data-result-reveal` attribute is set (the reveal does
  not play) and all six `data-reveal-step` elements sit at opacity 1 with no
  animation: the decision card is complete at once.
- `reduced-motion/results.json`, `home-1440.png`, `result-1440.png`.

### Keyboard only (`qa-keyboard.mjs`, Chromium 1440×900)

Twelve checks, all passing on this branch's build, each with a visible
focus ring (the 3px cobalt outline, or the popover's own frame when it
takes focus):

- the hero's scrubber: ArrowRight steps the price ($236,000 to $238,000,
  with the `aria-valuetext` "misses the $750 target by $14"); Home jumps to
  the low end;
- a source receipt: Enter opens the popover, Escape closes it and returns
  focus to the receipt;
- the receipt flow: Space opens a source;
- the plans toggle: Space selects annual;
- the FAQ: Enter opens a row;
- the co-branding preview: a typed name appears in the mock;
- the close band's address field takes focus;
- the result: Enter opens the ceiling disclosure; the sticky summary bar's
  "Decision" button is reachable and returns focus to the verdict heading;
- the login screen's sheet: ArrowLeft steps the price.

The summary bar's check failed on the Phase 7 build: the button scrolled to
the heading but could not focus it; `a3e4684f` gives the heading
`tabIndex={-1}` and the check passes. `keyboard/results.json`,
`hero-scrubber-focus.png`.

### Without JavaScript (`qa-no-js.mjs`, Chromium 1440×900 and 390×844, scripts off)

Scripts off, the page is complete at both widths: the hero sheet is
server-rendered at the ceiling (the thumb carries `aria-valuenow` 236,000
and the full `aria-valuetext`; its 12 figures are in the HTML); the
receipt flow's three source nodes are visible; the co-branding form and
its preview render with their two inputs; the plan cards show the annual
prices and the two toggle buttons (the monthly price is reached through
the toggle, which needs scripting); the ten FAQ rows are native
`<details>`; nothing in `<main>` sits at opacity 0; no horizontal
overflow; 1,298 words at 1440 and 1,502 at 390, where the story's three
sheets print in flow. The first run of this check found two things, fixed
below: the story's second and third frames hidden at 1440, and the thumb
without `aria-valuenow`. `no-js/results.json`, `home-1440-no-js.png`,
`home-390-no-js.png`.

### Engines (`qa-engines.mjs`)

- **Firefox** (no CSS scroll timelines): `/` and the sample result at 1440
  and 390 render on the tokens, the leaders are drawn at rest, the hero's
  scrubber steps on ArrowRight (`engines/*-firefox-*.png`).
- **WebKit**: Playwright's WebKit build hangs at launch on the founder's
  machine (two attempts, each killed after several minutes), so Safari was
  not exercised here. Open proposal 7 asks for a manual Safari pass on the
  Vercel preview before the stack ships: the first screen at 390, the
  scrubber by touch, the receipt popovers, the result's reveal.

### Slow 4G (`qa-slow-4g.mjs`, Chromium 390×844, CDP "slow 4G" profile, 4× CPU slowdown, 3 runs)

| Run | Address field visible | Hero sheet visible | FCP = LCP | `load` |
|---|---|---|---|---|
| 1 | 1,119 ms | 1,122 ms | 956 ms | 2,801 ms |
| 2 | 888 ms | 892 ms | 860 ms | 2,794 ms |
| 3 | 894 ms | 897 ms | 864 ms | 2,793 ms |

The sheet and the address field are server-rendered, so the first screen
is complete before the scripts arrive; the scrubber hydrates onto the sheet
at the ceiling (`slow-4g/home-390-slow-4g.png`, `results.json`).

### The blog's inline source links

An inline source link at 16px Hanken Grotesk has a 21px content box; with
the 14px vertical padding (`tc-link py-3.5`) a single-line target is 49px
tall and a two-line title 75px, over the 44px floor. The comment in
`components/blog/post-sources.tsx` carried the Archivo measurement (17.5px,
45.5px) and now carries this one.

## What the passes changed

1. **The verdict heading takes the summary bar's focus** (`a3e4684f`): the
   sticky bar's "Decision" button scrolls to the decision card and moves
   focus to its heading, which now has `tabIndex={-1}`.
2. **The sign-up prompt on the Blueprint grammar** (`a3e4684f`): the card at
   the object radius with the rest shadow, the "Free plan" tag in Geist
   Mono at the tag radius, rows on 1px lines, no trailing arrow.
3. **The story's frames sit in flow without scripting**: from 1024px the
   pinned panel's second and third frames waited at opacity 0 for the
   observer to pick a step, so a visitor without JavaScript saw the first
   frame only. `@media (scripting: none)` in `app/globals.css` puts the
   three in flow; Chromium with scripts off reports no element at opacity 0
   in `<main>` (eight before). With scripting the behaviour is unchanged,
   and a browser without the `scripting` feature keeps the first frame.
4. **The hero's thumb carries `aria-valuenow` before hydration**
   (`components/home/price-scrubber.tsx`): Radix derives it from the
   thumb's collection index, which the server does not have, so the
   attribute was missing until the island hydrated, and absent without
   JavaScript. The thumb sets it from the value beside its
   `aria-valuetext`.
5. **The autofill spec reads the cash-flow figure from its NumberFlow host
   after the reveal** (`e2e/audit-analyzer-autofill.spec.ts`, re-anchored):
   the result's figures roll in through NumberFlow since Phase 4, whose
   digits live in the host's shadow root, outside `innerText`, and the
   reveal rolls them in from zero. The spec runs only behind
   `AUDIT_ENRICHMENT_MOCK=1` with the loopback HUD and FRED mock, which the
   earlier phases' local runs did not set and CI does not run on the
   stacked PRs, so this was its first run on the overhaul: it read `$0/mo`
   and failed. It now waits for `data-result-reveal` to clear and reads the
   figure's current digits through `[data-decision-metric="cash-flow"]`,
   the hook the summary's figure now carries. The truth assertion, cash
   flow moves by exactly the tax difference, is unchanged; 44 of 44 pass.
6. **The comments name the current faces** (`711c3f8a`): 17 files still
   described figures as "DM Mono over the double rule".

## The detector

`impeccable detect --json` (skill v4.3.1, against `DESIGN.md`), rendered
from the local production build at 1440×900 and 390×844 (`detector/`). The
source scan of every `.tsx` file the overhaul changed reports nothing
(`detector-source.json`). Every rendered finding is a warning; none is an
error. The baseline (`../brief.md`) had `cream-palette`, `line-length` and
`nested-cards` on the homepage; the palette finding is gone, and what
remains is listed with its reason.

| Route | 1440×900 | 390×844 |
|---|---|---|
| `/` | 13 (`nested-cards` ×12, `line-length` ×1) | 22 (`nested-cards` ×18, `low-contrast` ×4) |
| `/analyze` | 4 (`line-length` ×2, `nested-cards` ×2) | 2 (`nested-cards` ×2) |
| `/analyze?sample=1` (the result) | 43 (`nested-cards` ×23, `line-length` ×12, `tiny-text` ×7, `cramped-padding` ×1) | 35 (`nested-cards` ×23, `tiny-text` ×11, `text-occlusion` ×1) |
| `/pricing` | 1 (`cramped-padding`) | 1 (`low-contrast`) |
| `/for-agents` | 1 (`line-length`) | 2 (`low-contrast` ×2) |
| `/for-investors` | 3 (`heading-rhythm` ×3) | 2 (`low-contrast` ×2) |
| `/vs/avail` | 1 (`em-dash-overuse`) | 4 (`em-dash-overuse`, `tight-leading`, `low-contrast` ×2) |
| `/tools/1-percent-rule-calculator` | 1 (`nested-cards`) | 4 (`nested-cards`, `tight-leading`, `low-contrast` ×2) |
| `/blog/1-percent-rule-rental-property` | 1 (`em-dash-overuse`) | 1 (`em-dash-overuse`) |
| `/markets/atlanta` | 4 (`line-length` ×3, `cramped-padding`) | 2 (`cramped-padding`, `low-contrast`) |
| `/sample-decision-memo` | 0 | 1 (`low-contrast`) |
| `/auth/login` | 1 (`first-viewport-column-overflow`) | 0 |
| 404 | 0 | 1 (`low-contrast`) |

What remains and why:

- `nested-cards` on `/`: the homepage's cards are the hero sheet, the
  story's frames and the plan cards, each one object holding 4px tags and
  1px rows, which the rule reads as cards inside a card; the Blueprint's
  grammar puts the rows and tags on the object rather than beside it. On
  the result (×23) the deeper report's drill rows hold the metric tiles and
  the breakdown table; Phase 4 left the report's row-and-panel structure,
  and open proposal 6 names a pass on its panel primitives if wanted.
- `low-contrast` at 390, two kinds, both the detector's background
  resolution and neither a colour on the page. On the sheet it samples the
  grid tile behind a heading (`canvas-background-image+alpha`, 1.4:1 at the
  worst pixel, 14:1 at the median). On the navy band it resolves the
  background to the sheet (2.4:1 is the band's muted text on the sheet; 1.0:1
  the white heading on itself). Measured in the browser at 390
  (`tools/`-style Playwright evaluation, canvas-resolved sRGB): the H1 is
  14.0:1 on the sheet, the band's heading 17.8:1 and its muted text 7.2:1 on
  the navy, all AA; axe reports nothing on `/` at 390.
- `tiny-text` on the result: the 11px `text-3xs` captions in the deeper
  panels (input confidence, the ledger's footnotes), at the detector's floor.
- `line-length` on the result and `/markets/atlanta`: the methodology
  paragraphs and the market pages' prose run past 75 characters at 1440; copy
  decisions, not tokens (open proposal 6).
- `em-dash-overuse` on the blog post and the `/vs` page: the posts' own
  prose, outside the overhaul's scope.
- `first-viewport-column-overflow` on `/auth/login` at 1440: the aside with
  the live sheet runs taller than the first viewport beside the short form
  column; the sheet is the point of the aside (Phase 6 accepted it).
- `cramped-padding`, `tight-leading`, `heading-rhythm`, `text-occlusion`:
  one each, on a data table's cell padding, a tag's line height, three
  stacked headings on `/for-investors`, and the result's sticky summary bar
  over a row as it docks; none is a token value.

## Before and after

Captures at 375, 768, 1095 and 1440, first screen and full page. "Before"
is the Phase 0 baseline in `../before/`; "after" is this branch's
production build in `after/`.

| Route | Before | After |
|---|---|---|
| `/` | `../before/home-*` | `after/home-*` |
| `/analyze` | `../before/analyze-*` | `after/analyze-*` |
| `/analyze?sample=1` (the result) | no Phase 0 capture of the result; `../phase-4/after/analyze-sample-*` is the first | `after/analyze-sample-*` |
| `/pricing` | `../before/pricing-*` | `after/pricing-*` |
| `/for-agents` | `../before/for-agents-*` | `after/for-agents-*` |
| `/for-investors` | `../before/for-investors-*` | `after/for-investors-*` |
| `/vs/avail` | `../before/vs_avail-*` | `after/vs_avail-*` |
| `/tools/1-percent-rule-calculator` | `../before/tools_1-percent-rule-calculator-*` | `after/tools_1-percent-rule-calculator-*` |
| `/blog/1-percent-rule-rental-property` | `../before/blog_1-percent-rule-rental-property-*` | `after/blog_1-percent-rule-rental-property-*` |
| `/markets/atlanta` | `../before/markets_atlanta-*` | `after/markets_atlanta-*` |
| `/sample-decision-memo` | `../before/sample-decision-memo-*` | `after/sample-decision-memo-*` |
| `/auth/login` | `../before/auth_login-*` | `after/auth_login-*` |
| 404 | `../before/this-page-does-not-exist-*` | `after/this-page-does-not-exist-*` |

The per-phase reports hold the intermediate states and the videos: the
hero drag (`../phase-3/hero-drag-*.webm`), the result reveal
(`../phase-4/result-reveal-*.webm`), the cards (`../phase-7/before/`,
`../phase-7/after/`), the app shell and the login through the render
harness (`../phase-6/harness/`).

## Dependencies added

Two, in Phase 2, through the build-chain procedure (their own commit, the
manifest bump its own):

- `motion` 14.4.0 (Motion for React, through `MotionProvider`, LazyMotion and
  `MotionConfig reducedMotion="user"`)
- `@number-flow/react` 0.6.2 (the figures that roll)

`node scripts/verify-build-integrity.mjs` passes on this branch. Nothing from
the brief's "do not add" list (GSAP, Lenis, Three, Lottie, particles, cursor
followers, autoplay video) is in the tree.

## Tests re-anchored

Twenty-seven test files across the overhaul (26 unit files and one e2e
spec), each named in the commit that moved it with a `Re-anchored: <file>
— <reason>` line, and each a visual pin in `../test-reanchor-list.md`. No truth pin changed: the engine figures,
the pinned copy, the 44px targets, the 16px fields, the one-CTA share page,
the AA colours, the reduced-motion contract, the share card's deal-free
contract and the schema versions are asserted as before. Never skipped,
never `.only`.

| Phase | Files |
|---|---|
| 2 | `display-font-fallback` (the new faces), `accessibility-remediation-guards` and `checkout-session-branding` (the brand hexes are the sheet, cobalt and the highlight; the contrast assertions unchanged), `shared-visual-guards` (FAQ rows on lines; the close band) |
| 3 | `homepage-ledger` (renders `HeroSheet`), `sample-deal-consistency` (reads the gap copy from `hero-sheet.tsx`), `site-overhaul-product-shots` (the hero), `reference-content-truth-guards` (a scroll timeline may draw a stroke, never animate opacity), `pricing-responsive-guards` (rows on 1px lines), `audit-2026-09-auth-and-content-guards`, `advocacy-accessibility-guards` |
| 4 | `ux-polish-guards` (the Offer Ceiling), `analyzer-interaction-p2` (the chart hook), `marketing-accessibility-guards` (the live preview's eyebrow is Geist Mono metadata), `metric-tile-rounding` (the figure utility), `share-page-one-cta` (the band's text colour) |
| 5 | `vs-design-pass` (the open prose list), `tools-template-t2` (`ToolFrame` is the card), `article-frame` and `blog-post-frame` (inline FAQ rows; figures in the figure face) |
| 6 | `dashboard-methodology-cohorts` (the 12px pill), `batch-triage-ui-guards` (the table frame's radius), `saved-deal-durable-reopen` (the 8px control radius; the 44px floor unchanged), `saved-deal-selection` ("Review deal" without the arrow) |
| 7 | `og-newsprint-fonts` (the four Blueprint faces and their eight requests), `email-site-palette` (the allow-list is the Blueprint hex) |
| 8 | `e2e/audit-analyzer-autofill.spec.ts` (the cash-flow figure is read from its NumberFlow host after the reveal; the tax-difference assertion unchanged) |

## Definition of done (OVERHAUL.md §9)

| Requirement | Evidence |
|---|---|
| Every page in Phases 3 to 6 on the new tokens and shared components; no page-local overrides; no leftover Newsprint, Archivo or DM Mono styling | `app/layout.tsx` loads Hanken Grotesk and Geist Mono only; `display-font-fallback` pins that the built CSS names neither Archivo nor DM Mono; the source detector reports nothing on the 184 changed files; this branch rewrote the comments in 17 files that still described figures as "DM Mono over the double rule" (the code under them had moved in Phase 5). `lib/og/newsprint.tsx` keeps its historical module name over Blueprint values (CLAUDE.md §3.6). |
| The four homepage moments work by mouse, touch and keyboard, and degrade to a complete static page without JavaScript and under reduced motion | Mouse: the Phase 3 videos (`../phase-3/hero-drag-*.webm`, a pointer drag past asking and back) and the Phase 8 captures (`after/`, `engines/`). Touch: Radix Slider's pointer events, exercised by the same drag; no touch-emulated run was made here, so the manual Safari pass (open proposal 7) should include a thumb drag on a phone. Keyboard: the pass above, 12 checks. Without JavaScript and under reduced motion: the passes above. |
| Every figure shown traces to the engine or the catalog; the scrubber test passes | `homepage-ledger`, `sample-deal-consistency` and `public-product-facts-guards` pin the hero's figures to the engine's sample-deal ledger and `lib/product-facts.ts`; the scrubber's sweep is precomputed from the engine on the server (`components/home/hero-sheet.tsx`), and the keyboard, reduced-motion, Firefox and no-JS passes above drive it. |
| All §2 budgets met or beaten on `/`, `/analyze` and `/pricing` | The budgets section: `perf:homepage` has no budget failure; Lighthouse's build-failing assertions pass on all three routes, with the baseline's three warnings and no new one. |
| The whole test suite green, every re-anchor in a commit message | The gates and the re-anchored list above; the authenticated browser specs run in CI on each PR as it reaches `main`. |
| `DESIGN.md`, `.impeccable/design.json` and `CLAUDE.md` §9 describe the new system | `DESIGN.md` (Blueprint, 2026-10-20, with the assets section from Phase 7), `.impeccable/design.json` (the tokens and the component CSS), `CLAUDE.md` §9 (the design workflow, the detector, the widths, the re-anchor rule). |

## Open proposals for the founder

1. **The phone bottom sheet for the analyzer's assumptions** (Phase 4): the
   assumptions live in the form's DOM under react-hook-form registration;
   a sheet moves the field order and the anchors the chips and the e2e
   specs rely on.
2. **The address morph** from the homepage to the analyzer (Phase 4): React
   19.2.6 stable does not export `ViewTransition`; the morph can land when
   the project's React does.
3. **The step rail during input** (Phase 4): today it shows after a run, by
   its own rule.
4. **A "what if I offer $X" slider in the result** (Phase 4, named by the
   brief as a proposal): the hero's scrubber could move into the decision
   card.
5. **The site icons** (Phase 7): the black mark with its `#2a7bbf` accent
   predates the Ledger; a brand decision, not an overhaul phase.
6. **The residual detector findings** that are page copy or data-table
   layout (long paragraphs on the market pages, the deeper report's
   nested rows and 11px captions): a Phase 6-style pass on the report's
   panel primitives, if wanted.
7. **A manual Safari check** on the Vercel preview, since WebKit could not
   be exercised on the founder's machine (the engines pass above): the first
   screen at 390, a thumb drag on the scrubber, the receipt popovers, the
   result's reveal.
