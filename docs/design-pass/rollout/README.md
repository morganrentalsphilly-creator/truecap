# Rollout: every marketing page on the ledger design (2026-09-30)

The homepage direction approved at checkpoint 3 ("the expandable ledger")
carried to every page in the brief's rollout order, then step 4 (product
screenshots and OG images). Branch `design/ledger-pass`. Measured on local
production builds with the isolated env (fake Supabase, paid providers
blanked), the same harness as the baseline and checkpoint 3. "Before" is the
baseline at `de81b02` unless a row says otherwise.

The founder delegated the open calls on 2026-09-30 ("do what is best for the
business and website", "prioritize converting agents"); the decisions made
under that are listed at the end, with everything held back.

## What changed, page by page

Each page landed as its own commit, then a visual-review fix commit from a
design director who read the rendered page at 375, 1095 and 1440, then the
intent-prefetch pass. Every conversion, review and sweep commit carries `Lastmod-Sweep: true`, so
the SEO loop's lastmod does not re-date a page for a presentation change.

| Page | Conversion | Visual review | Notes |
|---|---|---|---|
| `/for-agents` | e4e5bf3 | adfc289 | Two Disclaimers → one; memo shown as a document; primary CTA "Analyze a deal free" |
| `/pricing` | 4677e6a | 3f81c4e | Plan cards on a subgrid; billing toggle above the row; Pro carries the filled button; phone comparison as a ruled list |
| `/for-investors` | 761b6d3 | 7ca5e06 | Investor hub on PageHero, the source table, split FAQ |
| `/for-buy-and-hold` | 3161437 | cf097fe | Persona family grammar |
| `/for-house-hackers` | aa091da | 09e1cba, e2c85e5 | Hero column sized to its phone capture |
| `/for-brrrr` | 2d6bc2e | dacf40c | Identical structure to /for-flippers |
| `/for-flippers` | 7fdfa6d | 8023b57 | |
| `/why-truecap` | 7fffe70 | 8e870ab | Visible H1 (was screen-reader only); comparison on rules |
| `/vs` (hub) | 5ea5e98 | a25620c | 38 rows as a ruled directory, all server links |
| `/vs/*` (38 pages) | 805ecd5 (template), 6537c35 (37) | — | `vs-page.tsx`; analyzer first and filled in every close; 246-test guard |
| `/sample-decision-memo` | e9932b8 | 58d066b | A printed memo on the ledger; source of the regenerated memo shot |
| `/embed` family | 2b9f8e8 | 6bb4fec, 6741e34 | Hub on PageHero; iframe footer as plain links; structured data unchanged |
| `/about` | 91488ed | 6a946cc | 5/7 split; the founder still unnamed |
| `/reviews` | 82cd973 | af58c5c | "Proof, not praise"; renders nothing it cannot substantiate |
| `/tools` | 709bcd6 | f3be6bd | Empty "Returns" group no longer renders |
| `/tools/1-percent-rule-calculator` | b834581 | 67cb158 | The calculator template (cap-rate is unreleased and redirects) |
| `/blog` | 8b145d4 | 13d45ae, 9644279 | Ruled topic sections, sticky group headings |
| `/blog/1-percent-rule-rental-property` | d6eaf4a | d8f369c | The post template on the article frame; OG card on the Newsprint template |
| `/blog/what-is-a-good-cap-rate` (and the 2 other SourceFirstArticle posts) | d0f653d | 17e2392 | Gained the site header they never had |

Shared parts: fcc7854 (page parts, plan card, testimonials), 8586b1a (header
states, user menu, toast, tooltip, label weight, ProductShot's frame),
d0f653d and ff43223 (article frame and content chrome), 6df66fc (comparison
FAQ), fe252eb (tools and embed furniture), a76f551 (fixes from the 15-page
visual review), f0408ab (`cn()` and the type ramp). Prefetch: 85acb4a,
ec732fb, 3c347f5, ddf60a8, ffdf7d5. Step 4: 37d1f71.

Copy changed only where the design rules force it (arrow suffixes,
eyebrows, pills, sentence-cased chrome labels) or where it was untrue or
broken (df87742, 5d56623). Each commit message lists its copy changes and
the guards it re-anchored.

## The agent journey (commit "Agent journey: conversion fixes")

Two reviewers walked the agent path on the final build (homepage → /for-agents
→ /pricing#agent-pro → sign-up, at 390×844 and 1095×760, banner up and
answered). Navigation held: every CTA goes where its label says, every anchor
lands visibly, and the Agent Pro price is in the first screen of /for-agents
at both widths. What they found were claims an agent who checks would catch,
all verified against the code and fixed (these are content changes, so the
commit deliberately has no `Lastmod-Sweep` trailer):

- "A Buy Box per client, up to 100 clients" (homepage, /pricing) against the
  real cap of 12 Buy Boxes per account (`MAX_BUY_BOXES`): now "up to 100
  clients on your roster; up to 12 Buy Boxes per account".
- Co-branding sold as part of the free first decision and as Agent Pro-only:
  `custom_branding` is Pro and Agent Pro and not in the trial; the copy now
  says so wherever the trial is described.
- /for-agents' Agent Pro table had a "$0 to start" column; it is labelled
  "Free trial: 21 days, 3 Pro deals, no card. The roster starts with Agent Pro."
- /pricing's Agent Pro card showed a monthly price under a pressed "Annual"
  toggle whenever the Stripe annual display price was unavailable; it now
  falls back to the catalog annual amount like the Pro card (no price change).
- Back from sign-up dropped the agent thousands of pixels from the pricing
  they were reading; the sign-up CTAs are now full-page navigations, so Back
  restores the place (analytics unchanged).
- /for-agents gained a mid-page "See Agent Pro pricing" action after the
  roster section.

## Numbers

### Rendered checks, final build (25 pages × 375 / 1095 / 1440)

`tools/rendered-checks.mjs`: axe WCAG 2.1 A/AA, plus the DESIGN.md rules a
source scan cannot see.

| | Result |
|---|---|
| axe violations | **0** on all 75 page × width runs |
| Horizontal scroll | none |
| H1 per page | 1 |
| Disclaimers per page | 1 (the partner iframe `/embed/<slug>`: 0, chrome-free by design) |
| Text under 12px, uppercase labels, arrow links, gradients | none |
| Controls under 44px | none (one inline link inside a sentence, exempt under WCAG 2.5.8) |

Before → after at 375px across the 19 paired pages (`before/facts.json`,
`after/facts.json`): arrow links 33 → 0, small uppercase labels 353 → 0
(/pricing alone had 81), Disclaimers on /for-agents 2 → 1, typeface Plus
Jakarta Sans → Archivo everywhere.

### Scroll-time prefetch at 390×844 (`tools/prefetch-scroll.mjs`)

JS chunks and RSC payloads requested while scrolling top to bottom.

| | this branch before merging #151/#152 and the sweep | after |
|---|---|---|
| Most pages | 34–41 JS / ~1.07 MB, 48–59 RSC / ~1.1–1.3 MB | **0 / 0** |
| `/vs` | 35 JS, 120 RSC / 3.5 MB | **0 / 0** |
| `/blog` | 59 JS, 194 RSC / 5.2 MB | **0 / 0** |
| `/for-agents`, `/pricing` | ~38 JS, ~50–59 RSC | **0 / 0** (their sign-up CTAs are full-page navigations since the agent-journey fixes, so `/auth/sign-up` is no longer prefetched either) |

This matches `main` after PR #151/#152 (the footer and landing-page fixes),
which the branch merged; the sweep applied the same rule to every rebuilt
page and shared part, and `AnalyzerHandoffLink` now never prefetches
`/analyze` (its 20 callers had prefetched the analyzer bundle as soon as the link came into view, in the first screen of every calculator page).

### Lighthouse 12.8.2

Desktop preset, medians of 3 runs each on the final build. "Before" is the
baseline at `de81b02` (`../baseline/`), which kept desktop runs for `/`
only.

| Page | Perf | A11y | Best practices | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| `/` desktop, before | 1.00 | 1.00 | 0.96 | 1.00 | 0.80 s | 0.002 | 0 ms |
| **`/` desktop, after** | **1.00** | **1.00** | 0.96 | 1.00 | **0.74 s** | **0.000** | 0 ms |
| **`/for-agents` desktop, after** | **1.00** | **1.00** | 0.96 | 1.00 | **0.80 s** | 0.001 | 0 ms |
| **`/pricing` desktop, after** | **0.90** | **1.00** | 0.96 | 1.00 | **0.72 s** | 0.001 | 0 ms |

- The mobile runs on the same build scored accessibility 1.00, best
  practices 0.96 and SEO 1.00 on `/`, `/for-agents` and `/pricing`.
  Accessibility on `/for-agents` was 0.97 at the baseline (the PR #147
  labels at 4.2:1 on blue, now gone).
- Best practices is 0.96 everywhere for one local-only reason: the
  `/_vercel/insights` script 404s outside Vercel.

#### Mobile performance, with the throttle applied

This table replaces the mobile performance figures this README first
carried: LCP 3.61 s on `/`, 3.76 s on `/for-agents` and 3.61 s on
`/pricing`, against a baseline of 4.1, 3.5 and 3.6 s. Those came from
Lighthouse's simulated throttling, which on this site reports anything from
1.8 to 4.4 s for the same page: the simulated LCP follows how much
JavaScript happened to finish before the paint in the unthrottled load, not
when the page paints. The go-to-market audit re-measured with the throttle
applied (`--throttling-method=devtools`: Slow 4G, 4x CPU).

Lighthouse 12.8.2, mobile 412x823, cold cache, consent unset, medians of 3
runs each against production on 2026-10-02 (`main` at `ed1890d`, this pass
merged):

| Page | Perf | LCP | CLS | TBT |
|---|---|---|---|---|
| `/` | 0.94 | 1.93 s | 0.033 | 219 ms |
| `/for-agents` | 0.95 | 1.91 s | 0.002 | 183 ms |
| `/pricing` | 0.87 | 1.90 s | 0.199 | 152 ms |

- There is no "before" row: the baseline build was only run with simulated
  throttling, so what this pass did to mobile LCP was not measured.
- The LCP element is text on all three pages (the hero paragraph on `/` and
  `/for-agents`, the H1 on `/pricing`). It paints less than 0.4 s after the
  stylesheet lands.
- The 0.199 on `/pricing` is the H1 losing a line when Archivo arrives
  after first paint on a slow connection: the fallback face was matched to
  normal-width Archivo, and headings use the 82% display cut. A fallback
  face for the display cut was added to `app/globals.css` afterwards; it is
  not in these figures.
- TBT was measured on a machine shared with other jobs, so it is noisier
  than LCP.
- PageSpeed Insights uses the simulated method and showed 3.2 to 4.6 s for
  these pages on the same day.
- Locally `/pricing` has a TTFB of about 7 s in every run, before and
  after: it is the one dynamic page (it reads the session and Stripe display
  prices, which the isolated env points at nothing and waits out). That is
  why its mobile figures are read from production.

### Slop scores

| Page | slop-detect 0.5.2 design, before (live) | after | design-slop-cop before | after |
|---|---|---|---|---|
| `/` | 25/100, C | **16/100, B** | 7/100 | 7/100 |
| `/for-agents` | 32/100, D+ | **15/100, B** | 14/100 (headline badge, FAQ) | 14/100 (numbered steps, FAQ) |
| `/pricing` | 27/100, C | **12/100, B+** | 7/100 | 7/100 |

The "before" for `/for-agents` and `/pricing` is the live site (no baseline
build was kept); at the baseline the live and local homepage scored the same
on the design axis, because #149 changed copy and order, not styling.
design-slop-cop's /for-agents score is the same number for a different
reason: the headline badge (the pill above the H1) is gone, and it now counts
the agent workflow's numbered steps, which DESIGN.md allows for a real
sequence (paste the listing, screen it against the client's Buy Box, send
the memo). Its FAQ flag is having an FAQ.

### Impeccable detector, rendered, final build

25 pages: 39 findings at 1440×900 and 38 at 390×844. 25 of each are
`cream-palette`, one per page: the Newsprint paper decided at checkpoint 1.
The rest: the homepage's known 4 `nested-cards` (the ledger band and the plan
row, no nested card) and the cookie banner's one line; `heading-rhythm` on
/for-investors' strategy rows (ruled rows, not section headings);
`em-dash-overuse` on three pages' frozen copy; `tight-leading` on the analyzer
CTA's display-face question (display type, set tight by design); `/blog`'s
long post lists beside a sticky group heading; `/pricing`'s table flush under
its rule. The source scan of all 106 `.tsx` files the rollout changed reports 0 findings.

## Step 4: screenshots and OG images

- `public/product/*` regenerated from this branch with
  `scripts/capture-screenshots.ts` (1280×800 and 390×844, DPR 2). The memo
  shot is the converted `/sample-decision-memo`. The verdict and "where the
  rent goes" shots are the analyzer as it is today, at the new tokens; its
  decision summary still uses the app's own panels (see TODO).
- OG images: `/og/home`, `/og/for-agents`, the persona cards, and the
  vs/tool/blog templates on the Newsprint frame (ed4e63c); the post template's
  bespoke card now uses the blog template.

## App screens affected

- Every app form label is 600 (DESIGN.md: labels at 600).
- Toasts: one float shadow, opaque raised paper, 44px action and close.
- Tooltips: raised paper with a matching arrow (the dark arrow under a light
  tooltip was a bug), 14px text.
- Signed-in header: the upgrade strip is a paper strip with a link, not a
  Signal Blue band; the orange Pro pill is gone; the user menu's orange badge
  is gone; the auth placeholder no longer pulses.
- The analyzer, dashboard and share viewer are otherwise unchanged by this
  pass (they took the checkpoint-1 tokens earlier).

## TODO(verify)

- Production: after merge, check the live `/`, `/for-agents`, `/pricing` and
  one `/vs` page at 390 and 1095, and re-run `tools/prefetch-scroll.mjs`
  against production (the local numbers above use the isolated env).
- The Stripe display price: locally Agent Pro renders from the catalog
  fallback (no Stripe price id in the isolated env); confirm the live cards
  show the Stripe amounts.
- `/embed/<slug>` inside a real partner page (height reporting after the
  footer went from 12px to 14px text; `lib/embed-registry.ts` defaultHeight).
- The SEO loop's next weekly run: its skills now write `tc-link` and
  `IntentPrefetchLink` on /vs pages and the converted post; watch the first
  run's tier assignments.

## Held back and follow-ups

- **The analyzer's decision summary onto the ledger primitives.** DESIGN.md
  plans it; it is app work on the paying product, outside this brief's page
  list. The verdict screenshots will show the ledger once it lands.
- **The other 72 blog posts and 19 calculator pages** have the new shared
  chrome (byline, related links, sources, the analyzer CTA, prose colours)
  but keep their own page markup until a template fan-out pass, which the
  templates here make mechanical.
- **The partner iframe's secondary link** ("Underwrite a full property in
  TrueCap") goes to the calculator's tool page, not the analyzer; the
  widget's filled button already hands off to the analyzer, and the
  destination is pinned by unit and e2e tests, so it is left for a product
  call.
- **The blog's First Offer Playbook capture** stays as it shipped
  (restyled, not enlarged): an existing lead source, not a new capture.
- **Title Case in SEO data** (blog topic names, calculator registry titles,
  some metadata titles) is left to the SEO loop; sentence-casing it is a
  content decision.
- **/why-truecap** repeats the full agent and investor FAQ sets; trimming
  them removes copy.

## Decisions made under the founder's delegation (2026-09-30)

- The analyzer is the primary action everywhere, including the 38 /vs
  closes (analyzer filled and first, pricing outline).
- /pricing's Pro card carries the row's filled button (there the paid cards
  are the checkout); the homepage keeps Free as the filled button.
- /for-agents' primary reads "Analyze a deal free".
- The calculator template is the 1% rule page; the cap-rate calculator is
  unreleased and redirects.
- /embed keeps its structured data as it was (no new FAQPage claim).
- Copy fixed because it was untrue or broken: /blog's "the team behind
  TrueCap" (one person builds it), two /vs typos, the Pro card's duplicated
  "One address. Four answers." note, the signed-in upgrade line's title case.
- The SEO loop's single-link check accepts `IntentPrefetchLink`, so the
  autopilot keeps publishing one-link additions to /vs pages without review.

## Files

- `before/`, `after/`: first screens (full size) and full pages (half width)
  at 375, 768, 1095 and 1440, plus `facts.json` each.
- `tools/` (in `../tools/`): `capture.mjs`, `rendered-checks.mjs`,
  `prefetch-scroll.mjs`, `vitals.mjs`.
- `summary.json`: the numbers above, machine-readable.
