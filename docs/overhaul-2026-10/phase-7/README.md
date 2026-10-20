# Phase 7: the assets (2026-10-20)

The social-card frame, the product shots, the PDF cover, the theme colours
and the emails on the Blueprint, on branch `design/overhaul-2026-10-phase-7`
(stacked on Phase 6). Phase 8, the final ⛔ QA, follows.

## What was there

- The social-card frame (`lib/og/newsprint.tsx`) and its four templates
  and three route handlers drew the Newsprint paper in Archivo and DM Mono,
  with the ledger's heavy rule under the wordmark and a double rule under
  the homepage card's Offer Ceiling. `public/home.jpg`, the default
  `og:image`, was a snapshot of it.
- The six product shot pairs in `public/product/*` were captured on
  2026-09-30 on the ledger design: the `/vs` pages, the persona pages,
  pricing and the `/for-agents` card all pictured the old result card.
- The PDF cover shot was the real first page of the sample report, whose
  generator drew a slate-and-blue palette of its own.
- The theme colour and the manifest colours were the Newsprint paper.
- The four lifecycle and alert emails, the five Supabase auth templates
  and the memo email were on the Newsprint hex (the memo email on an older
  purple).

## What changed

### The social cards

- `lib/og/newsprint.tsx` keeps its module and export names (130 card files,
  the SEO loop's skills and the share-page guard import them) and draws the
  Blueprint: the sheet with its faint cobalt grid (two 1px gradients on a
  32px tile, the way `bg-sheet-grid` tiles the site), the wordmark over one
  graphite line, the label and the footer URL in Geist Mono, every token as
  a hex constant. Hanken Grotesk at 750 is the display face under its own
  family name, so a template needs no weight; 400 and 600 are the text and
  figure faces; Geist Mono 500 the metadata. Google Fonts serves static
  TrueType instances of all four to the loader, fetched once per server
  process; a card without them still renders (the loader returns
  `undefined`, never an empty list).
- The templates take `OG_TAG` (a 4px Geist Mono tag) for the blog and tool
  chips and the display tracking for headlines. The homepage card sets its
  figures in the figure voice and its Offer Ceiling in the display face on
  the highlight stroke under the one 2px rule, in place of the mono figures,
  the double rule and the banded row. The `/for-agents` card embeds the new
  memo shot, and embeds it at all again: the route had fetched the shot
  through a relative URL against `import.meta.url`, which resolved to
  nothing on the built server, so the card had been shipping on its
  headline alone (`before/for-agents.png` shows it). It now reads the shot
  from `public/` where the file system has it and otherwise over HTTP from
  the site's own static assets. `public/home.jpg` is re-rendered.
- `docs/overhaul-2026-10/tools/render-cards.tsx` renders every card type to
  PNG through `next/og` in Node without a build; `before/` and `after/`
  hold the eight types.

### The product shots and the PDF cover

- `public/product/*` (the decision card, the rent breakdown and the memo at
  desktop and phone, with `manifest.json` and
  `lib/product-shots.generated.ts`) were captured from the local production
  build by `scripts/capture-screenshots.ts`. The ten-year and comparison
  shots stay deferred, as the manifest records: they need a seeded account.
- The PDF keeps its layout and Helvetica; `lib/pdf-generator.ts` takes the
  Blueprint palette as hex (graphite ink and its muted step, the sheet and
  its lines, one cobalt, the text-safe green and the highlight-text step).
  `npm run pdf:check -- --branches` renders every deal shape. The cover shot
  is re-rendered from the sample report (`scripts/render-pdf-cover-shot.ts`).

### The theme and the emails

- `themeColor`, `theme_color` and `background_color` are the sheet.
- The lifecycle email, the rate and rent alerts, the weekly summary, the
  five Supabase auth templates and the memo email are on the Blueprint hex
  with system fonts, as the palette guard pins: the sheet, the card, the
  band, the soft line, graphite and its muted step, cobalt with white on
  it, the positive green and the negative red. The retired newsletter's
  template keeps its own palette, as before.

### Left as they are, and why

- The site's icons (`icon.svg`, the PNG icons, the apple icon) are a black
  mark with a `#2a7bbf` accent that predates the Ledger; changing the mark
  is a brand decision for the founder, not an overhaul phase.
- The retired newsletter template (`emails/weekly-digest.tsx`) and the
  Deal Pack credit emails keep their palettes: both are retired paths.
- The seventy-percent, ARV and the other calculator pages' cards use the
  tool template unchanged; their copy is the pages'.

## Verification

- `tsc`, `lint`: clean.
- Unit: 533 files, 9,000 tests, green (one 5-second file scan timed out
  while the build ran beside it and passes alone).
- `npm run pdf:check -- --branches`: every deal shape renders on the new
  palette.
- Build, then against the local production server: all eight card routes
  answer 200 `image/png` (the three route handlers and a card from each
  template); the manifest and the page carry the sheet as the theme colour;
  the public e2e project (`site-overhaul-conversion.spec.ts`,
  `public-product.spec.ts`) 35 passed.
- Re-anchored (each named in its commit): `og-newsprint-fonts` (the four
  Blueprint faces and their eight requests; the fail-safe and PNG
  assertions unchanged), `email-site-palette` (the allow-list is the
  Blueprint hex; the contrast floors and background checks unchanged). No
  truth pin changed: the share card's deal-free contract, the card files'
  alt text and sizes, the shots' sources and the cover script's inputs are
  asserted as before.
- Cards rendered to PNG in Node (`after/`): home, for-agents (with the new
  memo shot), share, blog, vs, tool, analyze, pricing.

## Captures

- `before/` and `after/`: the eight card types (`home`, `for-agents`,
  `share`, `blog`, `vs`, `tool`, `analyze`, `pricing`) at 1200×630.
- `public/product/*` and `public/home.jpg` are the regenerated assets
  themselves.
