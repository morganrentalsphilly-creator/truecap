# Benchmarks: the UI-first sites TrueCap is measured against

Part 1 of the adversarial pass (2026-10-21). Eight sites kept, nine rejected, twenty patterns with a verdict for TrueCap. Every claim below points at a capture or a measurement in `shots/bench/<site>/` (screenshots, and `quick.json`, `deep.json`, `moment.json`, `toggle2.json` with the raw numbers). Where a line is an inference rather than something seen or measured, it says so.

## Method

- **When and how.** 2026-10-21, 13:10 to 14:30 UTC. Playwright 1.62 driving headless Chromium 141 from a cloud container (a datacenter IP, 2 CPUs). Desktop at 1440×900 (scale 1); phone at 390×844 (scale 2, touch, an iPhone user agent on the Chromium engine). Cookie banners answered with the reject option where one appeared.
- **First five seconds.** A screenshot at about 0.5, 1, 2, 3 and 5 s from the start of navigation, unthrottled, at both widths (`home-<w>-t<s>.jpg`, combined in `first-five-seconds-<w>.jpg`; the sixth tile of each strip is the page with JavaScript off). "Nothing painted" means the capture failed or came back blank at that moment.
- **Micro-interactions.** Computed `transition-*`, `background-color`, `transform`, `box-shadow` and `outline` at rest, after a 450 ms hover, 150 ms into a press, and after a keyboard-modality focus (`micro-*` and `micro2-*` clips, values in `deep.json` and `shots/bench/_final/final.json`).
- **Reduced motion and no JavaScript.** `reducedMotion: "reduce"`: the count of running animations 2.5 s after load and the playing videos. `javaScriptEnabled: false`: words in the body and the number of first-screen elements taller than 30 px sitting at an effective opacity below 0.05.
- **Script weight.** Bytes Chrome's network log typed as script during load and a slow scroll (transfer size, compressed). A rough number; Lighthouse's numbers are in the last section.
- **Not available, so not checked.** No Safari or WebKit (Playwright's WebKit is not installed and was not downloaded), no real phones, no Firefox, no throttled runs of the benchmark sites, no signed-in surfaces, no form typed into or submitted except Wise's public amount field. A datacenter IP and a headless browser can change what a site serves; one oddity is called out under Linear.

## Sites kept and rejected

| Site | Kept? | Why (one line) | Evidence |
|---|---|---|---|
| Wise | Kept | The hero is a working calculator that answers with exact figures; pricing is the same calculator with the fee broken out | `shots/bench/wise/first-five-seconds-390.jpg`, `shots/bench/wise/pricing-1440-first.jpg` |
| Stripe | Kept | Product UI drawn in code with believable figures; a live figure in the first screen | `shots/bench/stripe/home-1440-full.jpg`, `shots/bench/stripe/moment-gdp-0.jpg` |
| Ramp | Kept | The hero plays the product's workflow; figures roll through NumberFlow, the library TrueCap uses | `shots/bench/ramp/moment-hero-demo-00.jpg` to `-09.jpg` |
| Mercury | Kept | "Launch demo" beside the primary action opens a full demo app with no account | `shots/bench/mercury/moment-launch-demo-1440.jpg` |
| Raycast | Kept | The page is a set of live miniature tools; pricing toggles and swaps figures in place | `shots/bench/raycast/home-390-full.jpg`, `shots/bench/raycast/pricing-1440-toggled.jpg` |
| Clerk | Kept | The hero is the real sign-up component, typing its own demo | `shots/bench/clerk/moment-component-rest.jpg` |
| Family | Kept | Small UI loops that show each state change ("Details that matter") | `shots/bench/family/moment-details-0.jpg` |
| Linear | Kept, with a caveat | Plan columns on rules, rolling prices, the crispest press feedback in the set; its hero captured unreliably here | `shots/bench/linear/pricing-1440-first.jpg`, `shots/bench/linear/micro2-get-started-press.jpg` |
| Vercel | Rejected | A heading, a still triangle, a logo strip and framed customer sites; 127 words without JavaScript | `shots/bench/vercel/first-five-seconds-1440.jpg` |
| Loom | Rejected | The hero is an autoplay video (4 autoplay videos); the heaviest page in the set (Chrome typed 28 MB of the load as script; not broken down) | `shots/bench/loom/first-five-seconds-1440.jpg` |
| Framer | Rejected | A glowing prompt box over autoplay video; 16 animations still run under reduced motion; 40 elements at opacity 0 without JavaScript | `shots/bench/framer/first-five-seconds-1440.jpg` |
| Arc | Rejected | Now a pointer to Dia; the one demo is a scripted chat in a video; 251 words without JavaScript | `shots/bench/arc/first-five-seconds-1440.jpg` |
| Pitch | Rejected | A prompt box over a gradient; 74 first-screen elements at opacity 0 without JavaScript; no heading painted in the first 5 s at 1440 | `shots/bench/pitch/first-five-seconds-1440.jpg` |
| Plaid | Rejected | An engraving hero with a chat widget and a cookie bar over it; the product is described in cards, not touched; 6.7 MB of script | `shots/bench/plaid/home-1440-full.jpg` |
| Attio | Rejected | Hero blank until about 5 s; without JavaScript the H1 sits at opacity 0 with `blur(1.5px)`; the product frame is a still | `shots/bench/attio/first-five-seconds-1440.jpg` |
| Resend | Rejected | The first screen is a heading fading in over 2 s and a rendered cube; nothing to touch | `shots/bench/resend/first-five-seconds-1440.jpg` |
| Lemon Squeezy | Rejected | A purple field for the first 3 s at 1440; without JavaScript the H1 is at opacity 0 and 64 px low; the one instrument (a subscriber slider on /pricing) fits metered pricing, not flat plans | `shots/bench/lemonsqueezy/first-five-seconds-1440.jpg`, `shots/bench/lemonsqueezy/pricing-1440-full.jpg` |

## The eight kept sites

### Wise (wise.com/us)

- **First five seconds.** The headline paints at 0.5 s in a fallback face and swaps to the condensed display face by 1 s (a visible reflow); the calculator is complete by 1 s and its rate ticks (0.8903 to 0.8904 EUR, the recipient figure 885.44 to 885.52) inside the 5 s (`shots/bench/wise/first-five-seconds-1440.jpg`). First touch: the amount field at 639 px on 1440×900 and at 766 px on 390×844, inside the first screen on both (`shots/bench/wise/moment.json`, `inputs1440`, `inputs390`). On the phone the order is a four-line headline, one paragraph, one button, then the calculator.
- **Memorable moment.** Typing 2,500 into "You send exactly": the recipient figure stays at 885.52 for about 1.1 s, then becomes 2,213.33 (a debounced server quote, sampled every 150 ms in `shots/bench/wise/moment.json`, `typing1440`); `shots/bench/wise/moment-1440-typed-2500.jpg`. The figure swaps; it does not roll.
- **Pricing.** The pricing page is the calculator again, for 30,000 USD: "Total fees 88.83 USD, included in USD amount", "4.91 USD volume discount", "Arrives by Thursday", "Paying with wire transfer · Change", "Guaranteed for 9h" (`shots/bench/wise/pricing-1440-first.jpg`). No plans, no toggle, no table.
- **Density.** One card, two 40 px figures, everything else 14 to 16 px with a chip for the guarantee; the fee line opens its breakdown. The amount field is not tabular (`font-variant-numeric: normal`, `fieldStyle1440`).
- **Micro-interactions.** Primary button: colour and background over 0 s and 150 ms, darker on hover and darker again on press, a 2 px outline at a 2 px offset on keyboard focus (`micro-primary-*.jpg`). Tab from the amount field lands on "We'll discount our fee" (`shots/bench/wise/moment-1440-tab-after-amount.jpg`).
- **States.** 404: "Sorry, looks like we lost this page." with an illustration and Log in / Sign up (`shots/bench/wise/404-1440.jpg`).
- **Reduced motion, no JavaScript.** Two animations still running under reduced motion. Without JavaScript the calculator renders with figures (941 words at 1440; `shots/bench/wise/home-390-no-js.jpg`).
- **Weight.** About 2.6 MB of script over 64 requests.

### Stripe (stripe.com)

- **First five seconds.** Nothing painted at 0.5 s at 1440; at 1 s the headline, two buttons and the WebGL gradient (7 canvases) are complete. "Global GDP running on Stripe:" appears empty until 2 to 3 s, then shows 1.73605035% and keeps counting (1.73605037% two seconds later; `shots/bench/stripe/moment-gdp-0.jpg`, `shots/bench/stripe/moment-gdp-2.jpg`). The logo strip scrolls sideways. First touch: "Get started" at 519 px (1440) and 301 px (390).
- **Memorable moment.** The bento of product UI drawn in code: a terminal receipt ("$5.46", line items, loyalty −$0.55, tax $0.51), a checkout, a usage meter, a bar chart of 1,723,562,413 tokens (`shots/bench/stripe/moment-bento-rest.jpg`). Hover turns the card's expand control cobalt; 52 animations run while the bento is in view (`shots/bench/stripe/moment.json`). Inference: the figures are hand-set sample data, not live.
- **Pricing.** No plans or toggle: one figure, "2.9% + 30¢ per successful transaction for domestic cards", a "Custom" panel beside it, and a sub-navigation (Standard pricing · Custom pricing · FAQs); a sales chat pops in at the bottom right (`shots/bench/stripe/pricing-1440-first.jpg`).
- **Density.** The bento's mock UIs run 9 to 12 px figures inside 14 px card titles; legibility comes from one card per idea and generous white around each.
- **Micro-interactions.** Primary: background, colour, outline and border over 300 ms; hover darkens; no press transform; focus is a 3 px outline at 75% indigo with a 1 px offset (`shots/bench/stripe/micro-primary-focus.jpg`).
- **States.** 404 "Page not found" with six destination cards: Pricing, Careers, Documentation, API reference, System status, Support (`shots/bench/stripe/404-1440.jpg`).
- **Reduced motion, no JavaScript.** Three animations still running (a scroll detector and two scripted ones). Without JavaScript 1,676 words render; 20 large elements stay at opacity 0.
- **Weight.** About 2.2 MB of script over 137 requests.

### Ramp (ramp.com)

- **First five seconds.** The headline, the email field and "Get started for free" (360 px at 1440, 399 px at 390) are there at 0.5 s; the demo panel under them fills in from 1 s (a card, then "Capture invoice", then receipts being analysed by 5 s). "US corporate payments processed by Ramp: 0.9420190%" ticks in the first line. On the phone the first screen ends on a celebrity photograph; the demo is below it (`shots/bench/ramp/first-five-seconds-390.jpg`).
- **Memorable moment.** The hero plays the workflow in a loop, about 1.5 s a stage: capture an invoice, a reporting dashboard, an approval with "$14.05 USD at Juice Press", receipts matched to a card, a PO matched to an invoice and flagged, auto-coding (`shots/bench/ramp/moment-hero-demo-00.jpg` to `-09.jpg`). Nine `number-flow-react` elements tick the "Agents at work today" strip (receipts processed 6,560,232 to 6,560,506 over 13.5 s; `shots/bench/ramp/moment.json`). Under reduced motion the panel is a still invoice (`shots/bench/ramp/moment-hero-demo-reduced-motion.jpg`).
- **Pricing.** Three cards (Free $0/mo/user, Plus $15/mo/user, Enterprise custom), an email field inside each card, "Save 20% with annual billing" as a line rather than a toggle. On the phone the comparison table is 540 px inside a 342 px column and scrolls sideways under a sticky header (`shots/bench/ramp/pricing-390-table.jpg`, `shots/bench/ramp/deep.json`).
- **Density.** The demo's frames are real product screens at small scale on a dotted ground; the ticker strip sets eight figures in tabular numerals on one line.
- **Micro-interactions.** Primary: colour transitions over 300 ms; press adds a 3.7 px translucent ring; the keyboard focus ring is a 4 px white ring at 20% opacity with no outline, on a white page: the focused button looks the same as at rest (`shots/bench/ramp/micro-primary-rest.jpg` against `shots/bench/ramp/micro-primary-focus.jpg`). The email field's focus is a border shift to 20% grey.
- **States.** 404 "Something doesn't feel right." with an interactive demo link and free tools (`shots/bench/ramp/404-1440.jpg`).
- **Reduced motion, no JavaScript.** Zero CSS animations running, but two videos still play. Without JavaScript 1,297 words render.
- **Weight.** About 4.3 MB of script over 120 requests; a `halfpipe-game` custom element ships on the homepage.

### Mercury (mercury.com)

- **First five seconds.** The hero picture (a `<mux-video>` element filling 1440×900) arrives as a blurred placeholder at 0.5 s and is sharp at 1 s; then nothing moves. The email field (308 px), "Open account" and "Launch demo" are in the first screen at both widths (`shots/bench/mercury/first-five-seconds-390.jpg`). On the phone the display face had not loaded by 5 s and the copy sat in a serif fallback; the no-JavaScript capture shows the right face.
- **Memorable moment.** "Launch demo" opens demo.mercury.com/dashboard: the whole banking app with sample data, "Viewing as Admin", a "Try out Mercury for yourself" checklist with Startup / Ecommerce / Agency tabs, and a tooltip on the transactions page ("We categorized past transactions for you") (`shots/bench/mercury/moment-launch-demo-1440.jpg`, `shots/bench/mercury/moment-launch-demo-transactions-1440.jpg`). It took about 20 s to show its first 60 words from a cold start here (`shots/bench/_final/final.json`).
- **Pricing.** One "Compare plans" frame holding three plans on vertical rules, an "Annual pricing (15% off)" switch; switching to monthly changes Plus from $29.90 to $35 in under 40 ms while the switch's thumb and label animate (`shots/bench/mercury/toggle2.json`). The table below has "Expand all", 15 collapsible groups and a sticky plan header, and reflows to 342 px on the phone with no sideways scroll (`shots/bench/mercury/deep.json`).
- **Density.** The demo's transactions table: signed amounts with the cents set smaller, green only for money in, a soft line per row, small grey chips for categories (`shots/bench/mercury/moment-launch-demo-transactions-1440.jpg`).
- **Micro-interactions.** Primary: 300 ms colour; hover and press each darken a step; focus adds a 2 px light outline. The email field shows no computed change on focus.
- **States.** 404 "Sorry, we can't find that page." with Go home and Visit help center.
- **Reduced motion, no JavaScript.** Zero animations and no video playing. Without JavaScript 922 words render.
- **Weight.** About 3.1 MB of script over 96 requests.

### Raycast (raycast.com)

- **First five seconds.** At 1440 the headline fades in at 1 s, the subhead at 3 s and "Download for Mac" only at 5 s; the WebGL stripes rendered in some runs and stayed black in others (`shots/bench/raycast/first-five-seconds-1440.jpg`). A full-page capture at 1440 crashed the headless browser twice.
- **Memorable moment.** The page is built from working miniatures of the product: an emoji picker, a calculator, a dock to switch between them with a tooltip, keycaps for a hotkey (option, command, L), an extensions carousel by category (`shots/bench/raycast/home-390-full.jpg`). Our scripted clicks did not find the dock's buttons, so their behaviour is described from the captures, not exercised.
- **Pricing.** A Monthly / Yearly segmented control with a "−20%" tag; switching to monthly swaps Pro from $8 to $10 and Teams from $12 to $15 within 40 ms (a swap, not a roll) and drops the "$120 $96 billed annually" line; the segment's pill slides (3 animations) (`shots/bench/raycast/pricing-1440-toggled.jpg`, `shots/bench/raycast/toggle2.json`). Each paid card has its own tier switch (Pro, Plus, Max).
- **Density.** Dark cards, 12 px rows, one red accent; figures large, conditions small and grey.
- **Reduced motion, no JavaScript.** 19 animations still running at 1440 under reduced motion. Without JavaScript 1,394 words render and nothing in the first screen is hidden (`shots/bench/raycast/rm-nojs.json`).
- **Weight.** About 1 MB of script over 42 requests at 1440.

### Clerk (clerk.com)

- **First five seconds.** Complete at 0.5 s: headline, a "Copy prompt" pill (the first touch, 310 px), four tabs and the sign-up component. Then a cursor moves into the email field and types "chris.walker@exam…" (`shots/bench/clerk/first-five-seconds-1440.jpg`, `shots/bench/clerk/moment-component-rest.jpg`).
- **Memorable moment.** The product is the hero: the actual "Create your account" component, typing its own demo, with "Sign in to your account" ghosted beside it. Our clicks on the four tab labels did not change the panel (`shots/bench/clerk/moment-hero-multi-tenancy.jpg`).
- **Pricing.** Four plan cards with a Monthly / Annual chip on each paid card; two `number-flow-react` figures; our click on "Monthly" did not change Pro's $20. The comparison table has a sticky header carrying each plan's action, three tables in all, two collapsible groups, and reflows to 342 px on the phone (`shots/bench/clerk/pricing-1440-table.jpg`).
- **Density.** Figures are set in a dedicated numerals face (`geistNumbers`, `shots/bench/clerk/quick.json`).
- **Micro-interactions.** Header "Sign up": colour, background, border and shadow over 100 ms in and 150 ms out on `cubic-bezier(0.33, 1, 0.68, 1)`; a 2 px outline on focus; no press transform (`micro2-signup-*.jpg`).
- **States.** 404: a large "404" and "Go to homepage".
- **Reduced motion, no JavaScript.** Seven animations running under reduced motion; 1,369 words without JavaScript, 30 large elements at opacity 0.
- **Weight.** About 1.8 MB of script over 61 requests.

### Family (family.co)

- **First five seconds.** The headline fades in word by word: partial at 1 s, complete at 2 s on desktop and nearer 5 s on the phone (`shots/bench/family/first-five-seconds-390.jpg`). "Download on iOS" is the first touch (467 px, 407 px).
- **Memorable moment.** "Details that matter": small cards that each show one state change, "Sending to … DAI" becoming "Swapping ETH to USDC ~1000 USDC", a "Transaction safe" pill, balances settling (`shots/bench/family/moment-details-0.jpg`, `-3.jpg`); 46 animations run while it is in view; the nine product videos stay paused until reached.
- **Pricing.** None (a free app).
- **Density.** One idea per card, one coloured word ("Monitor in real-time") above each, 13 px body.
- **Micro-interactions.** Primary: background over 100 ms; no press transform; a 1 px focus offset.
- **States.** A missing path returns 404 but renders the homepage.
- **Reduced motion, no JavaScript.** 59 transform animations still running at 1440 under reduced motion; 1,740 words without JavaScript.
- **Weight.** About 1.4 MB of script over 27 requests.

### Linear (linear.app)

- **Caveat.** The hero captured inconsistently: blank from 0.5 to 5 s in the first run, painted at 2 and 4 s and blank again from 7 s in a later one, while the DOM reported the H1 at opacity 1 throughout (`shots/bench/linear/visprobe-1440.json`, `visprobe-1440-*.jpg`). We read that as a capture problem as much as a site problem and do not rate Linear's first five seconds. What is measured: without JavaScript 33 first-screen elements sit at opacity 0, and under reduced motion 76 animations keep running.
- **Memorable moment.** The product frame (the issue view) as the hero, then section frames for each area. It is a still; nothing in it responds.
- **Pricing.** Four plans as columns divided by 1px rules, not boxed cards; the two paid prices are `number-flow-react` figures; each has a "Billed yearly" switch built on a read-only checkbox, and clicking it, its label or pressing Space did not change $10 or $16 here (`shots/bench/linear/pricing-1440-first.jpg`).
- **Micro-interactions.** "Get started" on pricing: border, background, colour, shadow, opacity, filter and transform over 160 ms on `cubic-bezier(0.25, 0.46, 0.45, 0.94)`; press scales to 0.97; focus is a 1 px indigo outline at 2 px. A testimonial card brightens by 3% on hover over 160 ms.
- **States.** An unknown path answers 200 with the app's loading spinner, not a 404.
- **Weight.** About 1.5 MB of script over 270 requests.

## Pattern library

| ID | Pattern | Best (evidence) | Why it works for the visitor | Cost | Verdict for TrueCap |
|---|---|---|---|---|---|
| P1 | The instrument is the hero, in the first screen on a phone | Wise (`shots/bench/wise/first-five-seconds-390.jpg`; amount field at 766 px of 844) | The answer arrives before any paragraph; the visitor's first act is to change a number | A server quote per change (about 1.1 s at Wise) or a precomputed sweep; layout pressure on phones | **Fits with a change.** TrueCap has the instrument; at 390 the sheet's key figure and price track sit below ten text blocks, 1.5 screens down (audit A8). Put the Offer Ceiling and the track directly under the address form on phones. It reorders pinned copy, so it is the founder's call |
| P2 | The answer computed for your input, with its arithmetic one tap away | Wise pricing (`shots/bench/wise/pricing-1440-first.jpg`) | "Total fees 88.83 USD" with the discount and the arrival date beside it: the figure and its receipt arrive together | One more disclosure per figure | **Fits with a change.** On the result card each key figure (the ceiling, cash flow, DSCR) opens its line items in place, the same grammar as the source popovers |
| P3 | A second action that opens the product without an account, as a button in the first screen | Mercury "Launch demo" beside "Open account" (`shots/bench/mercury/first-five-seconds-390.jpg`) | A sceptic can try before giving anything; the button weighs the same as the primary | None on the homepage; the demo itself is heavy (about 20 s to usable here) | **Fits with a change.** "See the sample deal" is a text link under the form; make it the secondary button beside "Analyze a deal free" at every width. The CTA's words stay |
| P4 | A demo state with guided first steps | Mercury demo (`shots/bench/mercury/moment-launch-demo-1440.jpg`) | Sample data plus a short checklist ("Send money to contractors") tells the visitor what to try | A maintained fixture; tooltips that must stay true | **Fits with a change.** The sample result opens already run, says once that it is a sample, and names three things to try (drag the price, open a source, open the memo) |
| P5 | The workflow played in the hero | Ramp (`shots/bench/ramp/moment-hero-demo-00.jpg` to `-09.jpg`); Clerk's self-typing component | Shows the product working end to end without a click | An autoplay loop; needs a still for reduced motion (Ramp has one) | **Does not fit as a loop** (autoplay motion is banned). **Fits with a change** as the known open item: the story's one sheet accumulating the three steps as the visitor scrolls, resting on the last |
| P6 | Product UI drawn in code with believable figures | Stripe bento (`shots/bench/stripe/moment-bento-rest.jpg`) | Real-looking line items read as proof of a real product | Every figure must stay true; mock UI ages | **Fits** (the Blueprint sheet and the memo mock already do it, with engine figures) |
| P7 | A live aggregate ticking in the first screen | Stripe GDP counter, Ramp's percentage (`shots/bench/stripe/moment-gdp-0.jpg`) | A moving number reads as scale | Needs a real, defensible aggregate | **Does not fit.** TrueCap has no real aggregate it may show, and the deals-analyzed ticker is banned by a truth guard |
| P8 | Celebrity, logo walls and quotes as hero proof | Ramp, Stripe, Vercel | Borrowed trust | Nothing TrueCap may show | **Does not fit.** No fabricated or unconsented proof |
| P9 | Density by sign, not by boxes | Mercury demo transactions (`shots/bench/mercury/moment-launch-demo-transactions-1440.jpg`) | Signed figures, smaller cents, green only for money in, rows on soft lines: fifty rows read at a glance | Table discipline in every list | **Fits with a change.** The signed-in home opens on the deal list with the gap to asking as a signed column, under the Sign rule, instead of four KPI tiles (a founder decision already open) |
| P10 | A cadence control that names the saving and swaps the figure in place | Raycast "Yearly −20%" with "$120 $96 billed annually"; Mercury "Annual pricing (15% off)" (`shots/bench/raycast/pricing-1440-toggled.jpg`) | The visitor sees what annual costs before deciding | The saving must be exact | **Fits with a change, the founder's call** (CLAUDE.md §8): keep "Annual costs less" figure-free, or show the annual total from the catalog as a second line under the rolling monthly figure |
| P11 | A comparison table with a sticky plan header, collapsible groups and a phone reflow | Mercury pricing (85 rows, 15 groups, "Expand all", 342 px on the phone); Clerk (sticky header carrying each plan's action) | The plan names and their actions stay in view while the visitor reads row 40 | Sticky headers need care with the site header and focus | **Fits with a change** on /pricing: a sticky row of plan names with their action; groups collapsed on phones; no sideways scroll (Ramp's 540 px table in 342 px is the counter-example) |
| P12 | Changing prices in a numerals face, rolling | Linear and Clerk (`number-flow-react`); Clerk's `geistNumbers` face | Figures keep their width as they change | One library | **Fits** (NumberFlow and `font-figure` already). Check the analyzer's money fields are tabular too: Wise's 40 px amount field is not |
| P13 | Press, hover and focus in the 100 to 160 ms band, a small press scale, a visible ring | Linear: 160 ms, press to 0.97; Clerk: 100/150 ms; Wise: 150 ms, 2 px ring at 2 px (`shots/bench/linear/micro2-get-started-press.jpg`) | Instant enough to feel physical, visible enough to steer by keyboard | None | **Fits** (TrueCap's 150 ms transitions and 3 px ring, measured in the audit, sit in this band; its 0.98 press scale is `DESIGN.md`'s, not measured here). Stripe, Ramp and Mercury at 300 ms feel slower; Ramp's focus ring is invisible on white |
| P14 | The page is complete without JavaScript | Raycast (0 hidden first-screen elements, 1,394 words); Wise (calculator with figures) | The first paint is the page; slow phones and blocked scripts lose nothing | Server-render the instrument's resting state | **Fits** (TrueCap renders the sheet at the ceiling). Counter-examples to cite in review: Attio (H1 at opacity 0 and blurred), Lemon Squeezy (opacity 0, 64 px low), Linear (33 hidden), Pitch (74 hidden) |
| P15 | Reduced motion shows a still frame of the moment | Ramp (`shots/bench/ramp/moment-hero-demo-reduced-motion.jpg`), Mercury (0 running) | The information survives; the motion goes | A designed end state for every moment | **Fits** (TrueCap rests at the ceiling). Counter-examples: Linear 76 running, Family 59, Raycast 19, Ramp's two videos still playing |
| P16 | Small detail loops that each show one state change | Family "Details that matter" (`shots/bench/family/moment-details-0.jpg`) | Shows the craft of a transition without a tour | Loops are autoplay motion | **Fits with a change:** once on view, never looped, for TrueCap's own details (a target chip flipping from "Misses by $196" to "Meets", a source leader going solid) |
| P17 | A 404 that keeps the visitor in the product | Ramp (a demo and free tools); Stripe (six destinations) (`shots/bench/ramp/404-1440.jpg`) | A dead end becomes a next step | None | **Fits with a change:** add the sample deal as the first destination on TrueCap's 404 |
| P18 | Inputs that show their freshness | Wise: the rate ticks and "Guaranteed for 9h" sits on the calculator | The visitor trusts a number that says how old it is | The as-of date must be real | **Fits with a change:** each source chip carries its as-of date (the FRED week, the HUD FMR year) |
| P19 | No visible font swap | Stripe (frames at 1 to 5 s stable); counter-examples Wise and Vercel (swap between 0.5 and 1 s), Mercury (fallback still showing at 5 s on the phone) | Nothing jumps under the visitor's eye | Metric-matched fallbacks | **Fits** (`next/font` with `adjustFontFallback`); verify it on throttled phones |
| P20 | A prompt box as the hero | Framer, Pitch, Stripe's and Ramp's "recommendations" boxes | Signals AI | The box is decoration unless it is the product's real input | **Does not fit.** TrueCap's real input is the address field, already the hero's one field |

## Speed (Lighthouse mobile)

One mobile run per page (Lighthouse 12.8, simulated throttling) on the same 2-CPU host as the audit's TrueCap runs, whose live medians were 0.66 to 0.78. Single runs vary; read the column, not the decimals. Raycast's homepage and Clerk's homepage did not complete (`PROTOCOL_TIMEOUT` and a missing report). TBT on pages that animate without pause is not meaningful here (Stripe's homepage, Ramp's homepage).

| Site | Page | Perf | LCP | TBT | CLS | Script KB | Total KB |
|---|---|---|---|---|---|---|---|
| Wise | home | 0.45 | 3.7 s | 5,130 ms | 0 | 2,617 | 5,190 |
| Wise | pricing | 0.45 | 4.2 s | 3,266 ms | 0 | 2,176 | 3,097 |
| Stripe | home | 0.44 | 3.9 s | 110,943 ms | 0 | 2,122 | 2,712 |
| Stripe | pricing | 0.75 | 2.1 s | 1,005 ms | 0 | 1,088 | 1,357 |
| Ramp | home | 0.36 | 6.3 s | 46,562 ms | 0.001 | 4,262 | 13,588 |
| Ramp | pricing | 0.44 | 4.8 s | 6,932 ms | 0 | 4,043 | 4,754 |
| Mercury | home | 0.28 | 11.2 s | 4,887 ms | 0 | 2,602 | 4,217 |
| Mercury | pricing | 0.56 | 3.1 s | 5,998 ms | 0 | 2,539 | 3,505 |
| Raycast | pricing | 0.66 | 6.3 s | 392 ms | 0 | 474 | 1,120 |
| Clerk | pricing | 0.41 | 6.7 s | 2,425 ms | 0 | 1,725 | 5,696 |
| Family | home | 0.31 | 27.4 s | 1,415 ms | 0 | 1,386 | 13,482 |
| Linear | home | 0.31 | 17.2 s | 2,079 ms | 0 | 1,291 | 2,655 |
| Linear | pricing | 0.50 | 8.2 s | 404 ms | 0 | 1,051 | 1,884 |
| TrueCap (live, median of 3) | home / pricing | 0.66 / 0.75 | 2.6 / 2.0 s | 931 / 493 ms | 0.181 / 0.230 | 389 / 402 | 598 / 583 |

Raw reports: `instruments/lighthouse/bench/`.
