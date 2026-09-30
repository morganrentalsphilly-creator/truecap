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
| `/for-agents` | 8176ef7 | b15afc9 | Two Disclaimers → one; memo shown as a document; primary CTA "Analyze a deal free" |
| `/pricing` | a571293 | 547d1d6 | Plan cards on a subgrid; billing toggle above the row; Pro carries the filled button; phone comparison as a ruled list |
| `/for-investors` | 6c36cec | 2995815 | Investor hub on PageHero, the source table, split FAQ |
| `/for-buy-and-hold` | a2a7f83 | 467d3dc | Persona family grammar |
| `/for-house-hackers` | e1e75b5 | 339dce2, 2f773c9 | Hero column sized to its phone capture |
| `/for-brrrr` | 08911d6 | 43666ed | Identical structure to /for-flippers |
| `/for-flippers` | 106c802 | d909cd4 | |
| `/why-truecap` | 2c64320 | 39e4dd4 | Visible H1 (was screen-reader only); comparison on rules |
| `/vs` (hub) | abd3489 | fef5ed8 | 38 rows as a ruled directory, all server links |
| `/vs/*` (38 pages) | b91b749 (template), da6c0de (37) | — | `vs-page.tsx`; analyzer first and filled in every close; 246-test guard |
| `/sample-decision-memo` | 19db1b5 | 1aa1024 | A printed memo on the ledger; source of the regenerated memo shot |
| `/embed` family | 3725d6f | d2bb907, 06b0cd8 | Hub on PageHero; iframe footer as plain links; structured data unchanged |
| `/about` | 29eb507 | 0352e75 | 5/7 split; the founder still unnamed |
| `/reviews` | 4cc9959 | 7e6d7ee | "Proof, not praise"; renders nothing it cannot substantiate |
| `/tools` | fbdd8a6 | 2578aec | Empty "Returns" group no longer renders |
| `/tools/1-percent-rule-calculator` | 701ee22 | 2597f2f | The calculator template (cap-rate is unreleased and redirects) |
| `/blog` | 140e559 | 5d2aef2, fda95ec | Ruled topic sections, sticky group headings |
| `/blog/1-percent-rule-rental-property` | 4281293 | b0c84cc | The post template on the article frame; OG card on the Newsprint template |
| `/blog/what-is-a-good-cap-rate` (and the 2 other SourceFirstArticle posts) | 3f49231 | dea41b6 | Gained the site header they never had |

Shared parts: 4254f53 (page parts, plan card, testimonials), 46f0519 (header
states, user menu, toast, tooltip, label weight, ProductShot's frame),
3f49231 and effb646 (article frame and content chrome), e08f126 (comparison
FAQ), 4769bc6 (tools and embed furniture), afd736b (fixes from the 15-page
visual review), 074453b (`cn()` and the type ramp). Prefetch: b453806,
c27f1cf, d20c9b9, 1fb0de3, b9e7af7. Step 4: ced3f8d.

Copy changed only where the design rules force it (arrow suffixes,
eyebrows, pills, sentence-cased chrome labels) or where it was untrue or
broken (f09c3c7, 05c803c). Each commit message lists its copy changes and
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
| `/for-agents`, `/pricing` | ~38 JS, ~50–59 RSC | **6 JS / 331 KB, 3 RSC / 16 KB: `/auth/sign-up` only, the primary CTA** |

This matches `main` after PR #151/#152 (the footer and landing-page fixes),
which the branch merged; the sweep applied the same rule to every rebuilt
page and shared part, and `AnalyzerHandoffLink` now never prefetches
`/analyze` (its 20 callers had prefetched the analyzer bundle as soon as the link came into view, in the first screen of every calculator page).

### Lighthouse 12.8.2 (mobile preset unless marked)

Medians of 3 runs each on the final build. "Before" is the baseline at
`de81b02` (`../baseline/`): medians of 3 for `/`, a single run for
`/for-agents` and `/pricing` (the only runs the baseline kept).

| Page | Perf | A11y | Best practices | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| `/` mobile, before | 0.86 | 1.00 | 0.96 | 1.00 | 4.1 s | 0.003 | 40 ms |
| **`/` mobile, after** | **0.90** | **1.00** | 0.96 | 1.00 | **3.61 s** | **0.000** | 24 ms |
| `/` desktop, before | 1.00 | 1.00 | 0.96 | 1.00 | 0.80 s | 0.002 | 0 ms |
| **`/` desktop, after** | **1.00** | **1.00** | 0.96 | 1.00 | **0.74 s** | **0.000** | 0 ms |
| `/for-agents` mobile, before | 0.91 | 0.97 | 0.96 | 1.00 | 3.5 s | 0.003 | 38 ms |
| **`/for-agents` mobile, after** | **0.89** | **1.00** | 0.96 | 1.00 | **3.76 s** | **0.002** | 17 ms |
| **`/for-agents` desktop, after** | **1.00** | **1.00** | 0.96 | 1.00 | **0.80 s** | 0.001 | 0 ms |
| `/pricing` mobile, before | 0.80 | 1.00 | 0.96 | 1.00 | 3.6 s | 0.003 | 37 ms |
| **`/pricing` mobile, after** | **0.81** | **1.00** | 0.96 | 1.00 | **3.61 s** | **0.002** | 27 ms |
| **`/pricing` desktop, after** | **0.90** | **1.00** | 0.96 | 1.00 | **0.72 s** | 0.001 | 0 ms |

- Accessibility is 1.00 on every page; `/for-agents` was 0.97 (the PR #147
  labels at 4.2:1 on blue, now gone).
- Best practices is 0.96 everywhere for one local-only reason: the
  `/_vercel/insights` script 404s outside Vercel.
- `/for-agents` mobile LCP is 3.76 s against the baseline's single run of
  3.5 s. The LCP element is the same in both (the hero paragraph: text, no
  image), all of it render delay after a 0.45 s TTFB; the after runs spread
  3.76 to 4.15 s and checkpoint 3 measured the homepage's own spread at
  3.8 to 5.5 s, so this sits inside run-to-run noise. It is on the
  TODO(verify) list for production with more runs.
- `/pricing` mobile TTFB is ~7 s locally in every run, before and after: it
  is the one dynamic page (it reads the session and Stripe display prices,
  which the isolated env points at nothing and waits out). The page's own
  render is fast; production TTFB is the number that matters there.

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
  vs/tool/blog templates on the Newsprint frame (c2313d1); the post template's
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
