# Adversarial audit: usetruecap.com (2026-10-21)

The live site was walked as four people and broken on purpose; the repo only explains what the site did. Evidence is under `shots/audit/` and `instruments/`; the scripts in `tools/` rerun against any base (`BASE=http://127.0.0.1:3100 node tools/<script>.mjs`).

**How.** Headless Chromium 141 in a cloud container: an iPhone profile at 390×844 on slow 4G (150 ms RTT, 1.6 Mbps) with 4× CPU, a Pixel 7 profile at 412×915 on fast 4G with 4× CPU, desktop at 1440×900 and 1095×760. Lighthouse ran last, on a quiet machine.

**Left open.** Real Safari and WebKit (no WebKit here; computer use can view a browser on the Mac but not drive it); real phones (touch was emulated); VoiceOver and NVDA (the accessibility tree was read through CDP); the signed-in app, `/s/[token]` and Stripe Checkout (each needs an account; checkout was followed to the sign-up screen before it).

## Findings

Severity: P0 blocks the task or breaks trust; P1 hurts a primary flow; P2 costs quality; P3 is polish. "Pn" in the fifth column is a pattern in `benchmarks.md`. Screenshot paths are under `shots/audit/`.

| ID | Surface | Sev | What is wrong, with the evidence | What the best site does instead | Fix |
|---|---|---|---|---|---|
| A1 | Hero receipts, sample result | P0 | The showcase deal's receipts contradict each other. The hero labels its inputs "Rent $3,050/mo · HUD FMR" and "Rate 6.6% · FRED rate" (`instruments/hero-popovers.json`); the analyzer tags the same sample "Your entered rent" and "Your rate estimate" (`sheets/result-390-scroll-and-whatif.jpg`, panel 3). The rate is undated while the analyzer fills today's FRED rate at 7.40% (`break-desktop-baseline.jpg`); `lib/sample-deal.ts` calls the inputs synthetic, as of 2026-08-25. | Wise puts the rate's freshness on the calculator: the rate ticks, and "Guaranteed for 9h" sits beside it (P18) | One provenance record for the sample (source, basis, as-of date), rendered by every surface |
| A2 | `/analyze?sample=1` | P1 | Seconds of empty form, not 350 ms. Form alone, then the verdict: iPhone 1.0–3.0 s, 3.6 s; iPhone on slow 4G 1.3–6.9 s, 9.3 s; desktop 0.5–2.8 s, 3.2 s; the local build 0.6–1.5 s, 1.8 s (`instruments/sample-flash-*-quiet.json`, `sheets/sample-load-desktop-1.1s-2.3s-3.7s.jpg`). The empty form shows Austin placeholders; the verdict waits on 59 scripts and a server-action POST (`instruments/sample-network.json`). | Wise's calculator ships in the HTML with its figures (P14); Mercury's demo opens already filled in (P4) | Prerender the sample's decision card and reveal it before first paint when the query carries `sample=1` |
| A3 | Home hero | P1 | The one authored moment misfires. At 1440×900 the answer shows for 2.2 s, then the handle jumps to $266,000 and glides back (`instruments/glide-seq-1440.json`). Below 1440×900 it never plays on load, and at 375×667 it never can: the observer needs 789 px of a 1,315 px block (`instruments/glide-check.json`). On slow 4G a drag at 2.0 s does nothing and at 6.3 s the handle moves by itself (`instruments/early-drag.json`). | Wise's amount never moves on its own; changing it is the visitor's first act (P1) | Observe the track, and skip the glide when hydration is late or a pointer already touched the sheet |
| A4 | Home, `/pricing`, `/analyze` (Android inferred) | P1 | The font swap shifts the live layout: CLS 0.181 on `/`, 0.230 on `/pricing`, 0.093 on `/analyze`, failing the repo's 0.05 gate twice; every shift is "Web font loaded" (`instruments/lighthouse/summary-live.txt`, `instruments/lighthouse/assert-live.log`). The fallback face is `src: local("Arial")` only. This Linux Chromium has no Arial and neither does Android, so Android Chrome likely jumps too (inferred). Locally the font beats first paint, so CLS is 0.000. | Stripe shows no visible swap from 1 to 5 s (P19) | Add metric-matched fallback faces for Roboto and Liberation Sans beside Arial |
| A5 | Analyzer, preview to result | P1 | A figure changes under the visitor. The preview says "+$98" at the 6.75% default (`break-desktop-bare-price-rent.jpg`); add the address and the result says $10/mo, because the lookup swapped the rate to 7.40%, noted only in a corner toast (`break-desktop-baseline.jpg`). The $88 is $1,297 against $1,385 a month on a $200,000 loan. | Wise keeps the fee and discount lines inside the calculator, next to the figure they change (P2) | Explain the change at the figure it moves, with an undo |
| A6 | Analyzer input | P1 | A typed $0 rent is overwritten with "1,659" within 3 s, with nothing visible to say so (`instruments/zero-rent.json`, `break-zero-rent-toast.jpg`). The form promises "values you entered will not be replaced silently". | n/a (a correctness bug) | Treat a typed 0 as entered |
| A7 | Result, cash purchase | P1 | 100% down on a $250,000 house renting $2,400 shows an Offer Ceiling of $1,296,500 on the highlight stroke, and a what-if range of $1,000 to $1,559,000 (`instruments/break-analyzer-desktop-cases.json`, `break-desktop-cash-purchase.jpg`). The engine is right; showing that number as the answer is not. | n/a | A founder question (prompt Q4): a "no limit under these targets" state |
| A8 | Home, phone | P2 (known) | Confirmed: ten text blocks come before the instrument at 390 (`instruments/home-full.json`). On 390×844 the sheet starts at 762 px, the track at 1,285 px and the Offer Ceiling at 1,417 px (`instruments/hero-answer-position.json`). The page is 12,871 px tall, 3% shorter than the 13,273 px baseline. | Wise: the amount field at 766 px of 844 (P1) | Founder question (Q3) |
| A9 | Sample result | P2 | The address field reads "TrueCap Synthetic Sample, Philadelphia, PA 19140, USA" (the DOM value of `#address`). That is the word `PRODUCT.md` bans. | n/a | Show the sample's display label |
| A10 | Analyzer input | P2 | The placeholders read as answers: "385,000", "2,800", "3" and an Austin address, at full size. After a listing link, focus lands in a price field that appears to say $385,000 (`sheets/listing-link-memo-pricing-390.jpg`, panel 1). | Wise's field holds a real value the calculator has already answered (P1) | Hints prefixed "e.g.", in graphite-2 |
| A11 | Analyzer input | P2 | Off the system: a sparkle icon on "Look up property details" (the polish report says they were removed), "Try a sample rental" floating at a 16 px radius with a large blur, assumption rows in Geist Mono, figures included, and a card for one setting (`break-desktop-bare-price-rent.jpg`). | Linear, Clerk and Wise keep every control in one 100–160 ms family with one focus ring (P13) | Bring them onto the tokens |
| A12 | Result | P2 | The card states ceiling, gap and asking three times, then stacks three callouts under four buttons; "Deal score 86/100" sits under "Doesn't meet" with nothing reconciling them; about 4,500 px of report follow on a phone (`break-desktop-baseline.jpg`, `sheets/result-390-scroll-and-whatif.jpg`). | Mercury's demo shows fifty transactions on soft rules, with signed figures and no boxes (P9) | Say each thing once; one callout |
| A13 | `/pricing` | P2 | Pro shows as $29.99/mo in the stage list and $25/mo in the cards, which default to annual; the toggle is below the first screen; the H1 runs six lines at 1440 (`sheets/pricing-memo-404-signup-1440.jpg`, `flow-pricing-390-full.jpg`). | Raycast swaps one figure in place under a toggle that names the saving; Clerk keeps plan actions in a sticky header (P10, P11) | Founder question (Q2) |
| A14 | Home, desktop | P2 | The sticky bar floats as a card over content at every scroll position below the hero, covering plan rows and the receipts (`sheets/home-1440-screens-*.jpg`). | n/a | Dock it full width; hide it near other actions |
| A15 | Analyzer preview | P2 | The preview uses its own criteria wording: "below the $100/mo Solid bar". The run says "break-even cash flow · DSCR ≥ 1.25", and the hero says "$750/mo" (`break-desktop-bare-price-rent.jpg`). | n/a | Name the run's targets |
| A16 | Home, story | P2 (known) | Confirmed: three frames crossfade. At 1440 the section is 1,462 px tall, with frames about 360 px wide in an empty grid (`sheets/home-1440-screens-1-4.jpg`). | Ramp plays its workflow in one frame, a stage at a time, with a still frame for reduced motion (P5, P15) | One sheet that accumulates |
| A17 | Keyboard | P2 | On a first visit, the cookie banner's four controls come before "Skip to main content" in the Tab order (`instruments/keyboard-home.json`). | n/a | Banner after the skip link |
| A18 | No JavaScript | P2 | `/analyze` and the sample show an inert form with no message, and the phone header loses its links (`sheets/nojs-reduced-320-blocked-earlydrag-390.jpg`). The homepage itself is complete without JavaScript. | Raycast and Wise are complete without JavaScript (P14) | `<noscript>` line; the A2 card; server-rendered header links |
| A19 | Second deal | P2 | The next `/analyze` restores the last listing. It still says "Your first full decision is free", and the second ceiling comes back as a range, $150,000–$225,000 (`flow-second-visit-390.jpg`, `instruments/flows-b.json`). | n/a | Start blank after a run; say what the next decision includes |
| A20 | Main thread | P2 | On one host, TBT is 931 ms live against 574 ms locally on `/`, and 804 against 567 on `/analyze`. The Sentry chunk takes about 400 ms of script time on every live route (`bootup-time`, `instruments/lighthouse/live/`); the isolated build disables Sentry. | n/a | Founder question (Q6): initialise Sentry after the first input |
| A21 | `/pricing` | P3 | The page renders per request (`private, no-store`, `x-vercel-cache: MISS`); `/` and `/analyze` are cache hits. | n/a | Session read in a client island |
| A22 | `/analyze` header | P3 | "Sign in" and "Create account" only appear after hydration: absent at 2.3 s, present at 3.7 s. | n/a | Server-render the header |
| A23 | Cookie banner | P3 | On slow 4G the banner arrives at about 9 s, over the sheet's caption (`sheets/home-iphone-slow4g-0-2.3-4.1-9.0s.jpg`). | n/a | Render it with the HTML |
| A24 | Assistive tech | P3 | Live figures are exposed as `image` in Chromium's accessibility tree (`instruments/aria-snapshots.txt`). Not tested with a screen reader. | n/a | Expose them as text |
| A25 | Listing link | P3 | A Redfin link parses as "5919 Belmar Ter 19143 Philadelphia PA" (`instruments/flows-a.json`). | n/a | Street, city, state, ZIP |
| A26 | Copy | P3 | "after reserve" and "after reserves"; "Model DSCR" and "DSCR". | n/a | One term each |

**What held.** No overflow at 320 px or 200% zoom; reduced motion rests at the end state; emulated touch drags both tracks without scrolling (`instruments/touch-drag.json`); the hero form submits without JavaScript; blocking every third-party domain leaves the analyzer working; emoji, a pasted `$250,000.00` with a line break, $20,000 and $5,000,000 all run; refresh and back mid-run keep the form; the settled focus ring is the 3 px cobalt outline.

## The five biggest opportunities

**1. Make "Every number has a receipt" literally true (A1, A5, A15).** One click on the sample's rate shows two labels and no date. Wise earns trust on the calculator itself: the rate ticks and "Guaranteed for 9h" sits beside it (P18), with the fee's arithmetic one line away (P2). TrueCap's version is cheaper: a dated source tag on every input, the same on every surface, and a change explained at the figure it moves, not in a toast.

**2. Let the answer arrive with the page (A2, A18).** The hero's second action opens on seconds of an empty form. Wise's calculator is in the HTML with its figures (P14); Mercury's demo opens already filled in (P4) and sits as a button beside the primary action (P3). The sample's decision is public and computable at build time: paint it with the HTML and let the analyzer hydrate under it.

**3. Let the visitor drive the instrument (A3, A8).** Wise's amount field is in the phone's first screen and never moves by itself (P1). TrueCap's handle replays after the answer has shown, and on phones it sits 1.5 screens down. The glide's trigger is engineering; moving the track under the form on phones moves pinned copy and is the founder's call, and it is the largest single gain for the agent at a showing.

**4. One sheet that accumulates (A16).** Ramp plays its workflow in one frame, a stage at a time, with a still frame for reduced motion (P5, P15). TrueCap can do it with scroll instead of autoplay: inputs and sources, then the Buy Box rows, then the Offer Ceiling and the send card, on one sheet that ends complete, filling the 1,462 px section at 1440.

**5. A result that says each thing once (A12).** Mercury's demo carries fifty transactions on soft rules with signed figures and no boxes (P9). One statement of the gap, one next step and rows on lines would let the decision card read at a glance; the same grammar answers the signed-in home's tiles (prompt, Q1).

## The known open items, checked

| Open item from the polish pass | Verdict | Evidence |
|---|---|---|
| The signed-in home opens with KPI tiles, not the deal list with a gap-to-asking column | Not verifiable here (needs an account). The repo's `components/dashboard/DashboardHome.tsx` renders a "Portfolio overview" of two stat cards and a strip, labelled in Title Case ("Pipeline Value", "Monthly Cash Flow"), and no gap-to-asking column; an inference from code, not a rendered page | repo read |
| The scroll story crossfades three cards instead of one sheet that accumulates | Confirmed | A16 |
| `/analyze?sample=1` shows the form for about 350 ms | Refuted on live: 2.0 to 5.5 s of form, verdict at 3.2 to 9.3 s (0.9 s locally) | A2 |
| Blocking time 152 ms on `/`, 181 ms on `/analyze` | Not comparable across machines. On one host: 574 and 567 ms for the local build, 931 and 804 ms live | the instruments section, A20 |
| Safari never exercised by automation | Still true: no WebKit here, and computer use can only look at a browser on the Mac | method note |
| "$49.17/mo" for Agent Pro annual | Confirmed on the homepage plans ("$49.17/mo, billed annually ($590)") | `sheets/home-390-screens-10-17.jpg` |
| Eight text blocks before the instrument on a phone | Confirmed, ten by element count; the track is 1.5 screens down | A8 |

## The instruments

All rows from one 2-CPU container (Lighthouse `benchmarkIndex` 1,900 to 2,300); the polish report's rows are from the founder's Mac, so compare within a source. Local is `main` at `1ef1f3a`, built with the dev-isolated environment and served on 127.0.0.1:3100.

**Lighthouse** (`docs/overhaul-2026-10/tools/lhci-running-server.json`: mobile, 390×844, simulated throttling, medians of three runs; `instruments/lighthouse/summary-*.txt` and `assert-*.log`)

| Route | Source | Perf | A11y | LCP | TBT | CLS | Script KB |
|---|---|---|---|---|---|---|---|
| `/` | polish report (Mac, local) | 0.87 | 1.00 | 3.7 s | 152 ms | 0.000 | 430 |
| `/` | this audit, local build | 0.76 | 1.00 | 3.5 s | 574 ms | 0.000 | 430 |
| `/` | this audit, live | 0.66 | 1.00 | 2.6 s | 931 ms | **0.181** | 389 |
| `/analyze` | polish report | 0.88 | 1.00 | 3.5 s | 181 ms | 0.002 | 631 |
| `/analyze` | local build | 0.75 | 1.00 | 3.7 s | 567 ms | 0.000 | 631 |
| `/analyze` | live | 0.78 | 1.00 | 1.8 s | 804 ms | 0.093 | 578 |
| `/pricing` | polish report | 0.94 | 1.00 | 3.0 s | 42 ms | 0.002 | 445 |
| `/pricing` | local build | 0.89 | 1.00 | 2.5 s | 244 ms | 0.002 | 439 |
| `/pricing` | live | 0.75 | 1.00 | 2.0 s | 493 ms | **0.230** | 402 |

- `lhci assert` exits 0 on the local build and 1 on live, where CLS fails on `/` and `/pricing` (A4).
- Local script weight matches the polish report to the kilobyte.
- TBT on this slower host is three to six times the Mac's figure locally, and live adds 230 to 360 ms more (A20).

**`npm run perf:homepage`** (local build, `instruments/perf-homepage-local.json`)
- HTML 276,886 B (polish 282,435), first-party JavaScript 438,617 B over 40 requests (polish 438,620).
- LCP 284 ms, CLS 0, axe serious or critical 0, `budgetFailures` empty.
- Main-thread task time 1,020 ms against the polish run's 470, with three long tasks totalling 308 ms against none.
- The script's analyzer-ready probe waits its full 15 s timeout in both this run and the polish run. It looks for `data-calculator-ready`, which the homepage no longer renders, so `analyzerReadyMs` is a timeout, not a measurement.

**The repo's QA scripts** (`instruments/qa/{local,live}/`)
- Keyboard: 12 of 12 on both (live needed `load` for `/auth/login`, which never goes network-idle; `tools/qa-keyboard-live.mjs`).
- Reduced motion: passes on both.
- Without JavaScript: complete on both; 1,244 words locally and 1,332 live; the isolated build has no Stripe price IDs, which likely accounts for the difference.
- Slow 4G at 390: the address field is visible at 1.3 to 1.9 s and first paint lands at 0.9 to 1.7 s, on both.

These scripts pass while A1 to A7 stand: they test the happy path on the homepage, not the analyzer's inputs or the sample's timing.

**The detector** (`impeccable detect --json`, rendered; `instruments/detector/`). The counts at 1440×900 and 390×844 are the polish report's, on both local and live: `/` 17 and 17 (16 and 16 locally), `/analyze` 4 and 2, `/analyze?sample=1` 26 and 13, `/pricing` 1 and 1. No rule fired that the polish report had not already explained.

**The benchmarks' Lighthouse** (`benchmarks.md`): the kept sites score 0.28 to 0.75 in single runs on the same host, against TrueCap's live 0.66 to 0.78.
