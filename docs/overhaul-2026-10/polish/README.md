# Polish pass (2026-10-20): after the overhaul merged

The founder's reaction to the merged overhaul: "there is some slop and a lot
of stuff that could make users not want to use the product; it is not 100%
awesome interactive and the coolest UI". An Impeccable critique (a design
review and the detector, each in its own subagent, synthesised in the
session; the snapshot `.impeccable/critique/2026-10-20T23-34-17Z__app-page-tsx.md`
stays local, the folder is gitignored) scored the homepage 21/32 and the analyzer result 22/40 and named
eight priority issues. The founder chose: everything (P0 to P2), the result
first, the "Decision confidence" block restructured, the app home left for
another pass. This branch, `design/polish-2026-10`, is that pass.

## What the critique found and what changed

| # | Finding | Fix |
|---|---|---|
| P0 | A 3px half-cobalt focus ring framed the whole report after every run | The results region keeps `outline-none`; focus goes to the verdict heading when its chunk mounts |
| P0 | The phone story rendered nine cards for three steps | One frame per step below 1024px (`StoryFrames only`) |
| P1 | The product's signature, dragging the price, existed only in the hero | The result's track is a what-if slider: the card's cash flow and DSCR roll to the engine's figures at $X, the chips flip, nothing is written to the form; "Back to asking" returns the handle |
| P1 | The hero's answer sat below the fold; the drawing never answered; the handle had no pressed state and a round focus ring; phone labels at 7–9px | The Offer Ceiling moves above the readout (its bottom at 678px on 1440×900 and 708px on 1095×760, from 1,038px); the schematic is an HTML grid with live out-flow figures and arrows that thicken above the ceiling; the thumb is the diamond itself, fills on press, settles on release; a phone stack below 640px |
| P1 | Everything under the decision card was the old product in Blueprint paint | Radius by role, rows on lines, the figure face, sentence case, no arrows or sparkles, a graphite expense bar; the confidence block as a figure on a rule and rows with source tags; the Deal score on a rule; the sign-up prompt below the numbers |
| P1 | The reveal showed chrome before the answer; the plan card's lift and the summary bar's slide snapped | The action row carries a reveal step; the reveal keys to explicit runs; the transitions name `translate` |
| P2 | "Make it yours" showed grey bars | The mock is the real memo parts with the sample ledger, recoloured through `textOnBrand` |
| P2 | Two cadence toggles, two plan vocabularies, the pricing stage list out of order | One `CadenceToggle`, one catalog-backed `plan-answers.ts`, the stage list in card order |

Also: the analyzer input's sparkle icons, trailing arrows and Title Case;
the header's tagline; the "Get Pro" pill as a link styled as the secondary
button; the two disclosures with a hint of their contents; the receipt
leaders drawn with a CSS keyframe on every engine; the cookie banner as one row at
the bottom right from 640px; the inline Pro gate and the deal-driver insight
on the system.

## Not done, and why

- The scroll story as one accumulating sheet: it needs layout animations on
  server-rendered frames and a different pinned-panel structure; the three
  frames still crossfade.
- The form flash before hydration on `/analyze?sample=1`: `/analyze` is a
  static page and cannot know the query on the server.
- The app home's four KPI tiles: left for another pass by the founder's
  choice.
- "$49.17/mo" for Agent Pro annual: a pricing-page presentation decision for
  the founder (CLAUDE.md §8).

## Verification

| Gate | Result |
|---|---|
| `npx tsc --noEmit`, `npm run lint` | clean |
| `npm test` | 534 files, 9,061 tests, green (the JSON-LD file scan timed out once beside a build and passes alone) |
| `npm run build` | exit 0 (an earlier build failed prerendering `/` on a client-module import from a server component; fixed in `69354812`) |
| Playwright `public-chromium` (conversion, product, autofill with the mock) | 44 passed |
| Keyboard (`tools/qa-keyboard.mjs`) | 12 of 12, every control with its ring; the summary bar's button lands on the verdict |
| Reduced motion (`tools/qa-reduced-motion.mjs`) | the hero rests at the ceiling, the three leaders are drawn, no reveal plays, every step at opacity 1 |
| Without JavaScript (`tools/qa-no-js.mjs`) | complete at 1440 and 390: the thumb carries `aria-valuenow` 236,000, three receipt nodes, two plan radios, nothing at opacity 0, no overflow; 1,330 and 1,332 words (Phase 8: 1,298 and 1,502, the phone's extra being the nine story cards) |
| Detector, source (`impeccable detect --json` on every changed file) | no primary findings |
| Post-run focus | the verdict heading at 390 and 1440 (`#decision-summary-title`) |
| The 390×844 fold | the decision's actions end at 838px (Phase 8: 835; the limit the spec pins is 844) |
| The hero's answer | the Offer Ceiling's bottom at 678px on 1440×900 and 708px on 1095×760 (Phase 8: 1,038 on 900) |

### Detector, rendered (`detector/`, 1440×900 and 390×844)

| Route | Phase 8 | Polish |
|---|---|---|
| `/` | 13 / 22 | 17 / 17 (`nested-cards` 12 / 12, the sheet's rows and tags on one object; `line-length` 1 / 0; `layout-transition` 1 / 1, the schematic's `stroke-width` transition read as width; `low-contrast` 3 / 4, the detector's background resolution on the grid and the navy band, measured AA) |
| `/analyze` | 4 / 2 | 4 / 2 (unchanged) |
| `/analyze?sample=1` | 43 / 35 | 26 / 13 (`nested-cards` 23 → 12; `tiny-text` 7 / 11 → 0; `line-length` 12 / 0 → 13 / 0; `cramped-padding` 1 / 0; `text-occlusion` 0 / 1, the sticky summary bar as it docks) |
| `/pricing` | 1 / 1 | 1 / 1 (unchanged) |

### Lighthouse CI (mobile, 390×844, simulated throttling, medians of 3 runs)

| Route | Perf | A11y | LCP | TBT | CLS | Script KB | Total KB |
|---|---|---|---|---|---|---|---|
| `/` Phase 8 | 0.89 | 1.00 | 3.8 s | 23 ms | 0.000 | 428 | 629 |
| `/` polish | 0.87 | 1.00 | 3.7 s | 152 ms | 0.000 | 430 | 631 |
| `/analyze` Phase 8 | 0.91 | 1.00 | 3.5 s | 61 ms | 0.002 | 629 | 802 |
| `/analyze` polish | 0.88 | 1.00 | 3.5 s | 181 ms | 0.002 | 631 | 804 |
| `/pricing` Phase 8 | 0.88 | 1.00 | 3.9 s | 23 ms | 0.002 | 444 | 618 |
| `/pricing` polish | 0.94 | 1.00 | 3.0 s | 42 ms | 0.002 | 445 | 619 |

`lhci assert` exits 0 with the baseline's three warnings (`/` LCP, `/analyze`
LCP, `/` script weight) and no error. Script weight is within 2 KB of Phase
8 on every route. Total blocking time rose on `/` and `/analyze`: the added
islands (the what-if track with the engine in the result's chunk, the hero's
two extra live figures, the memo mock) cost hydration, 153 ms of script on
the homepage unthrottled against 81 ms in Phase 8 (`perf-homepage.json`),
under the 200 ms warning budget. An earlier polish build measured 217 and
292 ms with 75 KB more script on every route: a static Motion import in the
receipt leaders had put the library's whole runtime into a shared chunk;
the leaders now draw with a CSS keyframe (`5e5d7cd3`) and the chunk is gone.

### Homepage transfer and vitals (`npm run perf:homepage`)

| Measure | Phase 8 | Polish | Budget |
|---|---|---|---|
| HTML (identity encoding) | 295,770 B | 282,435 B | 350 KB |
| First-party JavaScript | 437,105 B over 40 | 438,620 B over 40 | 1 MB |
| LCP (lab, unthrottled) | 108 ms | 164 ms | 2,500 ms |
| CLS | 0.0001 | 0.0001 | 0.1 |
| Long tasks | 0 | 0 | 500 ms |
| axe serious or critical | 0 | 0 | 0 |
| Words in `<main>`, closed / open | 1,298 / 2,445 | 1,330 / 2,477 | about 1,200 closed |

`budgetFailures` is empty. The phone page no longer prints the story three
times (1,502 words before, 1,332 after, with the same facts).

## Captures

`after/`: `/`, `/analyze`, `/analyze?sample=1` and `/pricing` at 375, 768,
1095 and 1440, first screen and full page. `keyboard/`, `reduced-motion/`,
`no-js/`, `detector/`, `lighthouse-rows.txt`, `perf-homepage.json`: each
pass's results, as in Phase 8.
