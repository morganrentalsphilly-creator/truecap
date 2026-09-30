# SEO architecture — how usetruecap.com is built, published and measured

Written 2026-09-27 from a read-only discovery of this repo. Eight mapping agents covered it, a skeptic re-checked every load-bearing claim, and the headline claims were spot-checked by hand. Line numbers refer to `main` at a96139a.

Read this before changing anything the SEO loop touches. The loop itself is described in [README.md](README.md). Its caps and fences live in [config.json](config.json).

---

## 1. Framework

- **Next.js 16.3** (App Router only; there is no `pages/`), React 19, TypeScript 5.7 strict. Production builds run `next build --webpack`. `proxy.ts` is Next 16's replacement for `middleware.ts`.
- **Deploys:** Vercel's Git integration deploys `main` to production and every other pushed branch to a Preview. There is no deploy step in CI.
- **Canonical host:**
  - `lib/site-url.ts` pins `CANONICAL_SITE_URL = "https://usetruecap.com"`. `proxy.ts` (`applyHostGuard`) adds `X-Robots-Tag: noindex, nofollow` to every non-canonical host.
  - Vercel's domain config handles www → apex and http → https (308).
  - A foreign, frozen deployment (`truecap-iota.vercel.app`) lives outside this project; see `docs/seo/foreign-deployment-truecap-iota.md`.
- **Metadata:** there is no central helper. Each `page.tsx` exports `metadata` or `generateMetadata` with a relative `alternates.canonical`, resolved against `metadataBase` in `app/layout.tsx`.
  - Two shared builders exist: `buildSourceFirstArticleMetadata` (3 posts) and `buildSafeMarketMetadata` (12 bespoke market pages).
  - A page that forgets `alternates` inherits the homepage canonical. `lib/__tests__/seo-guards.test.ts` catches this for indexable pages.
- **JSON-LD (F4):** one emitter, `<JsonLd data={x} />` (`components/seo/json-ld.tsx`). It serializes with `JSON.stringify` and escapes `<`, `>`, `&` and U+2028/U+2029, so no string can close the script. All 356 former inline `<script type="application/ld+json">` blocks (157 files) go through it; `lib/__tests__/json-ld-helper.test.tsx` fails on a new raw one, and verify-static accepts JSON-LD only as `<JsonLd>` imported un-aliased from that module (it refuses `<script>` and `dangerouslySetInnerHTML` in content modules).
  - `app/layout.tsx` emits the site-wide `Organization` (`/#organization`) and `WebSite` (`/#website`, SearchAction).
  - There is deliberately no Person node (founder decision, 2026-09-07; `CLAUDE.md` §1).
  - Per template:

| Template | Types beyond Organization + WebSite |
|---|---|
| `/` | SoftwareApplication `/#software` + Offer, FAQPage |
| `/pricing` | SoftwareApplication with the same `@id` `/#software` (name and url as the homepage's) carrying the Free and paid Offers, FAQPage. Outside `/tools/<slug>`, any application entity must be `/#software` (F4 review) |
| `/analyze` | WebPage whose `mainEntity` is `/#software` (by @id, F4) |
| blog post (73 since the DSCR consolidation) | Article/BlogPosting (author = Organization `@id`), BreadcrumbList, FAQPage on the 61 posts that show a FAQ (F4 removed it from 5 whose FAQ was never rendered; the two merged DSCR posts took theirs with them). No HowTo: the 5 posts that had one described steps the page never showed (F4 review); jsonld-validate fails a HowTo step whose text is not visible |
| market city (150) | WebPage (dateModified from the lastmod map, F2; author = Organization `@id`), BreadcrumbList, FAQPage built from the same list as the visible FAQ (F8, `components/marketing/data-faq.tsx`) |
| bespoke market (12, indexable since F8) | WebPage + Place (author = Organization), 4-level BreadcrumbList, FAQPage (visible, F8) |
| state (33) | Place, WebPage (author = Organization), BreadcrumbList, FAQPage (visible, F8) |
| vs (38) | WebPage, 3-level BreadcrumbList (TrueCap › Comparisons › page, F4), FAQPage whose answers are the visible answers' own text (`ComparisonFaq` + `plainTextOf`, F4; it throws on a `<br>` or block element, whose break the joined text would lose) |
| glossary term (44) | DefinedTerm (dateModified from the lastmod map, F2; `inDefinedTermSet` = `/glossary#terms`, F4), BreadcrumbList. No FAQPage (F4: its questions were never shown) |
| released tool (10) | ONE WebApplication, @id `/tools/<slug>#app`, publisher = Organization @id (`lib/seo/tool-app-ld.ts`, F4; a WebPage on the page points at it), FAQPage where the page shows it, 3-level BreadcrumbList. The 8 unreleased (redirected) tool pages carry the same shape, rendered past their redirect by `structured-data-f4.test.tsx`, so a release cannot bring the old markup back |
| hubs `/blog /tools /vs /markets /states /glossary` | Blog / CollectionPage / ItemList / DefinedTermSet (`/glossary#terms`), plus BreadcrumbList TrueCap › Hub (F4) |
| `/about` | AboutPage (mainEntity = Organization) |
| `/methodology` | TechArticle |

- **Sitemap** (`app/sitemap.ts`):
  - A single `urlset` of **381 URLs**, with no sitemap index. It includes only pages that pass the indexability helpers in `lib/markets/indexability.ts`.
  - Composition: 20 core, 11 tools, 44 glossary terms, 33 states, 150 markets, 9 blog topic pages, 75 posts, 38 comparisons and `/for-agents` (env-gated). 0 strategy pages (`STRATEGY_PAGES_INDEXABLE = false`).
  - F8 added the 12 bespoke metros (HUD rows from HUD's FY2026 FMR documentation pages), so the market family is 162 URLs and the sitemap 393; `lib/__tests__/markets-states-data-first.test.tsx` pins 162 markets, 33 states and 0 strategy pages.
  - **`lastmod` has one source (F2):** `content/seo/lastmod.json` through `lib/seo/lastmod.ts` (`lastmodFor(path)`); a URL with no entry gets no `lastmod`. The same map feeds `feed.xml`, `/blog`, every post's `MODIFIED_AT` and the templates' JSON-LD `dateModified`. `lib/__tests__/lastmod-contract.test.ts` pins it (see §4).
  - Paths on `content/seo/noindex.json` leave the sitemap (and `llms.txt`), and `proxy.ts` serves them with `X-Robots-Tag: noindex`; published pages in `content/seo/research.json` join it. The noindex loader fails the build above `NOINDEX_MAX_PATHS` (38, about a tenth of the sitemap): CI's structural fence for non-owner PRs skips the per-run caps.
  - Five scripts parse the live sitemap as a flat urlset, so do not introduce a sitemap index without updating them: `scripts/seo/{control-plane,indexnow,healthcheck,gsc-scoreboard}.mjs`, `scripts/seo-audit.ts`.
- **robots** (`app/robots.ts`): allows `/`; disallows `/api/ /admin/ /auth/ /dashboard/ /profile/ /settings/ /d/ /s/ /portal/ /embed/brand/ /home-authed`. AI crawlers are explicitly allowed. There is one `Sitemap:` line, pinned by `robots-policy.test.ts`.
- **llms.txt** (`app/llms.txt/route.ts`): built from the registries.
  - Its lists use the sitemap's indexability helpers and the noindex list (F2): indexable states, all 150 indexable market pages, no strategy page.
  - `llms-full.txt` holds glossary and tool formulas, pinned by `seo-guards.test.ts`.
- **OG images:**
  - 133 per-route `opengraph-image.tsx` files, but page metadata sets `openGraph.images: /home.jpg`, so production serves `/home.jpg` almost everywhere. Out of scope for the loop; tracked separately.
  - OG and share-card conventions: `CLAUDE.md` §3.6.

## 2. Where each content type lives

Everything the loop can edit is **git-tracked source**. There is no CMS, and no content lives only in a database. Supabase holds user data and the SEO control plane's measurement tables, never page content. The loop's properties the brief asks for (a diff, a revert path and an audit trail) therefore come from pull requests with no migration.

### Blog — 75 posts, 8 topic hubs
- **DSCR consolidation (founder decision Q5, 2026-09-28): 73 posts since.** `/blog/what-is-a-good-dscr` and `/blog/dscr-loans-explained` were merged into `/blog/how-to-calculate-dscr` (formula → worked example → what counts as good → DSCR loans → FAQ) and deleted with their OG images. Both 308 there from `next.config.mjs` `redirects()`, `scripts/seo/healthcheck.mjs` asserts the single hop, and `lib/__tests__/dscr-guide-consolidation.test.ts` pins the redirects, the registries, the merged FAQ and the worked example against the calculator. The counts below are the 2026-09-27 snapshot.
- **Files:** `app/blog/<slug>/page.tsx` (a hand-written TSX server component) plus a sibling `opengraph-image.tsx`.
- **Authoring shapes:**
  - 72 standalone posts. Module-level consts: `SLUG`, `TITLE`/`TITLE_PLAIN`, `SERP_TITLE`, `DESCRIPTION`, `PUBLISHED_AT`, `MODIFIED_AT`, `READING_TIME`. Each has an `export const metadata`, Article and BreadcrumbList JSON-LD through `<JsonLd>`, a `FAQS` array feeding both the visible FAQ and FAQPage where the post has a FAQ, and prose as JSX (F4 converted the last six posts that injected HTML strings).
  - 3 posts use `components/marketing/source-first-article.tsx` (an `ARTICLE` object). These three are thin, at 322–404 words live.
- **Page frame (design pass, 2026-09-30):** `components/marketing/article.tsx` is the one article frame: `ArticlePage` (the root), `ArticleMain` (`<main id="main">` in the page container, with a left-aligned 68ch reading column), `ArticleBody` (`prose prose-ledger`, the token-mapped typography in `app/globals.css`), `ArticleEnd` (the analyzer CTA's column after `</main>`) and the `ARTICLE_HEADER`/`TITLE`/`META`/`META_LINK`/`LEDE` classes. The 3 `SourceFirstArticle` posts render through it, and `/blog/1-percent-rule-rental-property` is the reference standalone post: seo-gap-article writes new posts in its shape. The other standalone posts keep the old hand-rolled `max-w-3xl` shell until the rollout converts them. On the frame:
  - the post header holds the H1, then the meta line (`Blog · <date> · N min read`; its Blog link replaced the `← Blog` link above the H1), the byline and the lede. `mainTextOf` drops `<header>`, so that link is no longer main text;
  - the page file still mounts, literally, everything the guards and skills read: the `<header>` with `<h1>{TITLE}</h1>`, the date line with `<BlogByline />` directly after it, one `<RelatedBlogPosts />`, one `<BlogStickyCta inArticleColumn />` (inside `<ArticleEnd>`, outside `<main>`, so the CTA is not main text), and its own Article/BlogPosting, BreadcrumbList and FAQPage objects;
  - the body's H2s carry no classes, in-prose links are `tc-link` (seo-citations and seo-internal-links add links in the file's own class), and the FAQ is `FaqSection variant="inline"` (ruled `<details>` rows under the page's own FAQPage, `structuredData={false}`; `renderAnswer` keeps an answer's source links);
  - there is no `NewsletterSignup` mount (it rendered nothing after the newsletter was canceled) and no page-level Disclaimer (`SiteFooter` renders the one).
  - A conversion is presentation-only and its commit carries `Lastmod-Sweep: true`, so no date moves, but it does change the post's main hash (the hub link leaves main text and the FAQ markup changes), and `gsc-inspect` re-queues the post once.
- **Registry:** `BLOG_POSTS` in `lib/blog-posts.ts` (`slug, title, excerpt, readingTimeMinutes, publishedAt, available`), a pure data module.
  - F2 lifted it out of `app/blog/page.tsx` and dropped `modifiedAt`: a post's last-modified date is not the registry's to hold.
  - Consumers: `/blog`, the topic hubs, the sitemap, `feed.xml`, `llms.txt`, site search, related-post blocks and several tests.
  - Before F2, importing it pulled in the `/blog` page's React tree, which is why `seo-guards.test.ts` still reads `app/sitemap.ts` as text.
  - **Drift:** 13 registry titles and some excerpts no longer match their pages (e.g. the rental-yield excerpt still quotes figures the page removed). Every post's `MODIFIED_AT` now reads the lastmod map (F2), so it matches the sitemap.
- **Topic hubs:** `lib/blog-topics.ts` holds 8 hubs (`slug, title, description, intro, postSlugs, calculatorSlugs`) rendered at `/blog/topics/<slug>`.
  - Underwriting hub: 19 posts. Tax hub: 8. Financing hub: 11 (12 before the DSCR consolidation removed `dscr-loans-explained`).
  - Every published post is in exactly one hub. Five were in none: F9 filed four, and the fifth, `what-is-a-good-dscr`, was merged into `/blog/how-to-calculate-dscr` by the DSCR consolidation. Each post links back once through a registry-driven "Part of: <Hub>" line (`components/marketing/blog-hub-link.tsx`, rendered by `RelatedBlogPosts`), so filing a post under a hub is the only edit it needs.
  - A hub may name a few glossary terms (`glossarySlugs`, the tax and strategy hubs today); its page renders them as a "Terms these guides use" line with a link to the full glossary.
  - The `/blog/topics` copy derives the hub count from `BLOG_TOPICS` (it said "five" while there were eight).
- **Authorship (F1):** the author is the TrueCap Organization and the founder is never named. Article author = Organization `@id` on every post; there is no Person node. The copy lives in `seo/author.md` (human-editable) and `lib/author.ts`, which must say the same thing (`lib/__tests__/author-byline-bio.test.tsx`).
  - The unnamed `BlogByline` ("By TrueCap · built by a Philadelphia rental investor", linking `/about`) sits directly under the date line of all 75 posts (through `SourceFirstArticle` for its 3) and under the H1 of every `/vs/<slug>` page.
  - The name-free bio (`AuthorBio`, the /about "Who builds this" paragraph, linking `/about` and `/methodology`) closes every post through `RelatedBlogPosts` and every `/vs/<slug>` page directly, inside `<main>` on all of them.
  - Both are boilerplate: adding or editing them moves no post's or /vs page's date. /about renders the same `AUTHOR_BIO`, so a Bio edit is /about content (`lastmod.ts` counts `lib/author.ts` for /about).
  - **What the loop measures.** On posts the end block is more than the bio: `RelatedBlogPosts` renders the bio (58 words, 2 links), then the "Keep reading" aside (3 other posts' titles and full excerpts, with `LeadMagnetInline`; since F9 it opens with the "Part of: <Hub>" line and shows hub-mates, so its length depends on the post). Before F1, 37 posts rendered that block inside `<main>` and 38 after `</main>`; F1 moved those 38 inside, so on all 75 posts the block is main content (F1 measured the built `/blog/1-percent-rule-rental-property` at 2,446 words with the block and 2,033 without; after F9 the same page measures 2,245 with it, a 212-word block with 6 links). On /vs pages only the bio (58 words, 2 links) is added.
    - It counts in the crawl's `wordCount` and `outboundInternal` (`crawl.ts` reads `<main>`), in the main hash that `render-diff` and `gsc-inspect` compare, and in the text `jsonld-validate` searches. In `uniqueRatio` its shingles are template chrome (on more than 30% of the family's pages), so it lowers the ratio; `similarity.ts` drops chrome before scoring, so its scores do not move.
    - It keeps the three thin `SourceFirstArticle` posts off the thin flag, as it did before F1 (they always rendered the block inside `<main>`): measured at 721–805 words with `uniqueRatio` 0.46–0.55, over `prune.minWords` 600 and `minUniqueRatio` 0.4. Their article text alone is 317–392 words, which the flag would catch.
    - So a change to that shared text changes the main hash of every page that carries it. Since F9 each post shows its hub-mates first, in the hub's `postSlugs` order, then the registry's first available rows (`lib/seo/link-policy.ts` `relatedBlogPosts`): an edit to a row's title, excerpt or reading time changes every post that shows it (its hub-mates near the front of the hub, plus the posts whose hub runs out before three picks), and `render-diff` fails such a patch as undeclared. A post appended to the end of the registry and of a hub reaches another post's list only when that hub lists 3 or fewer posts. The loop avoids both: gap-article appends rows last and checks the hub size (its Gate 3), and no other skill edits registry titles or excerpts. A Bio edit changes all 75 posts, every /vs page and /about. It is an owner PR that moves only /about's date, but `gsc-inspect` queues every one of those pages for re-inspection as changed content. F1's own deploy is the first such change.
    - Pinned by `author-byline-bio.test.tsx`, which checks the block's place and the loop's own `mainTextOf`. To keep the block out of the measured main instead, render `RelatedBlogPosts` after `</main>` in a `max-w-3xl` container and move `AuthorBio` into each post. That is the founder's call.
- **Sources:** there is no sources component. Only 8 of 75 posts link any external page, and 3 link a government source.
- **Disclaimer:** one sitewide `Disclaimer` (in `SiteFooter`). It says "not … investment advice" but not tax or legal.
- **Links:**
  - The internal-link standard is ≥3 glossary, ≥1 market, ≥1 tool and ≥2 blog links. New posts must meet it outright; existing posts are ratcheted by `docs/seo/guard-baseline.json` and `seo-guards.test.ts`. 9 of 75 posts meet it today.
  - `RelatedBlogPosts` links every post to 3 other posts, hub-mates first, inside `<main>` (see Authorship). Before F9 every post linked the same 3 newest posts.
  - **Internal-link policy (F9).** Every registry-driven block (related posts, `RelatedContent`, the topic hubs, the /blog, /markets, /states and /glossary hubs, the city pages' state guide and other-market links, the glossary tool line, `CityStrategyGuides`) asks `lib/seo/link-policy.ts` before it links: never a path on `content/seo/noindex.json`, an unpublished post, an unreleased calculator, or a market, state or strategy page its indexability rule keeps out of the index. `lib/__tests__/internal-link-graph.test.tsx` renders every sitemap page (all but `/`, `/analyze`, `/pricing` and `/reviews`, which need the mounted app router, request state or live services; the literal hrefs of their route files and of every component module those import are checked from source) and fails on an orphan (a sitemap URL no other sitemap page links), on any internal link to a redirect, a noindex path, an unreleased tool or another URL outside the sitemap, and on a link glued to the text around it (a lost `{" "}`). Its per-family checks walk the sitemap's pages, and one check holds the sitemap and the link policy to the same registry pages.
    - Consequence for pruning: a noindex addition now also drops the path from those blocks on other pages, so it re-renders the pages that linked it, and hand-written body links to it fail the graph test. seo-prune therefore files every prune as a tier-2 proposal that lists the linking pages (`.claude/skills/seo-prune/SKILL.md`, step 1). The graph test and `e2e/content-hubs.spec.ts` need no edit for a prune: they take their pages from the sitemap and the link policy (checked 2026-09-28 by listing `/glossary/grm`, then a post and a market). A market prune still trips the market family's own counts (`markets-states-data-first.test.tsx` pins 162 market pages; `markets-indexability.test.ts` expects each state page to link every market in its state).
- **Pinned by tests:**
  - title ≤50 characters as a plain const, with og:title equal to title (`blog-title-length.test.ts`);
  - ≥73 available posts (`content-hub-readiness.test.ts`, so deleting a post fails CI; lowered from 75 by the DSCR consolidation);
  - vocabulary bans (`customer-facing-decision-vocabulary.test.ts`, `public-underwriting-claims-guard.test.ts`);
  - per-post must-contain strings (see `lib/__tests__/trust-language-guards.test.ts`, `comparison-claim-guards.test.ts`, `public-funnel-trust-guards.test.ts`).

### Markets — 150 programmatic + 12 bespoke city guides
- **Routes:**
  - `app/markets/[city]/page.tsx`: the programmatic template, 150 cities, all indexable.
  - `app/markets/{philadelphia,atlanta,charlotte,cleveland,dallas,detroit,houston,indianapolis,kansas-city,memphis,phoenix,tampa}/page.tsx`: bespoke wrappers around `components/marketing/safe-market-page.tsx`. Since F8 they have HUD rows, the site Header and the same sections and data builder (`lib/markets/market-page-data.ts`) as the programmatic template, so they are indexable by the same HUD-row rule.
  - `app/markets/[city]/[strategy]`: 26 combos, all noindex.
- **Datasets** (checked-in TS; nothing is fetched at render time):
  - `lib/markets/cities.ts` `MARKET_CITIES`: 150 records. Only `slug/name/stateCode/stateName/relatedPosts` render; hand-authored ranges and blurbs are deliberately suppressed.
  - `lib/markets/city-geo.ts` `CITY_GEO`: county and ZIP bridge. There are no coordinates, so "nearby" can only mean same state or same county.
  - `lib/markets/hud-rents.ts` `HUD_RENTS`: **GENERATED** by `npm run build-market-rents` from the HUD FMR API (`HUD_API_KEY` in `.env.local`). It holds `{rent2br, rent3br, year, retrievedAt}`, 162 rows at FY2026 (F8 added the 12 bespoke metros and corrected Worcester, Lowell and Manchester, whose county match had picked a neighbouring New England town's area; the script now matches New England cities by town and refuses a response without HUD's year).
  - `lib/markets/hud-fmr-areas.ts` `HUD_FMR_AREAS` (F8): **GENERATED** by `node scripts/build-market-fmr-areas.ts` from HUD's public FY FMR documentation pages (no key). Per slug: HUD's area name, the county page's URL, the FY and prior-FY figures, what HUD's own area page says about vouchers and ZIP-level Small Area FMRs (`voucherSmallAreaFmr`: "required" on 56 areas, "majority-opted" on 4, re-read 2026-09-28) with that page's URL, and the ZIP-table URL for SAFMR slugs. `markets-data-bar.test.ts` fails unless it agrees with `HUD_RENTS` row for row, so both refresh together.
  - `lib/markets/safmr-rents.ts` `SAFMR_RENTS`: GENERATED by `npm run build-market-safmr`, 48 metros, at most 12 ZIP rows each, fetched 2026-07-14 (`SAFMR_RENTS_RETRIEVED_AT`).
  - `content/seo/market-facts.json` (F8, `lib/seo/market-facts.ts`): sourced local facts written by the seo-market-enrich skill; empty at launch. `content/seo/state-facts.json` (`lib/seo/state-facts.ts`): Census ACS 2024 figures for all 33 states, owner-maintained. Both loaders throw on an unsourced or malformed fact.
- **What a page says:**
  - Since F8 (founder decision 2026-09-27, "reframe to data"): title and H1 "{City}, {ST} Rental Market Data ({HUD FY})"; the byline; HUD Fair Market Rent (FY) for the named FMR area with one sentence on what FMR is (HUD's 40th-percentile definition and its passive "used to determine payment standard amounts" wording, linked), HUD's own Small Area FMR statement for the area where its page makes one, and the prior FY; ZIP-level SAFMR rows where HUD has them; a sample underwrite using one synthetic fixture for every city ($265k, 20% down, 6.6%, 1.49% tax — `lib/sample-deal.ts`); a "Local data" section only when market-facts has the slug; a visible data-only FAQ; a sources box with "Data as of HUD FY2026 (retrieved …)"; a "three things to verify locally" checklist written as instructions (it asserts nothing about other cities, premiums or deals); a state-guide link, only while that state page is indexable; up to five other markets (F9, `lib/markets/nearby.ts`: the same state first, markets sharing the county or HUD FMR area leading, then the state's next markets alphabetically, wrapping; then a market across a state line that shares the HUD FMR area). With no coordinates most picks are not neighbours (Fort Worth lists Houston, not Dallas), so the block never says "nearby": it is labelled "More {State} markets" and, for the shared-HUD-area market in another state, "Across the state line" (`nearbyMarketGroups`). Strategy-guide links (`CityStrategyGuides`) render nothing while `STRATEGY_PAGES_INDEXABLE` is false. Before F9 every city page linked the same first six cities plus four bespoke pages.
  - `<main data-market-data="thin|enriched">` (`lib/markets/thin.ts`): thin = no SAFMR rows and no market facts. crawl.ts records it and score.ts tags MARKET_ENRICH `market-data-thin`. It never noindexes.
- **Pinned by tests:** `markets-data-bar.test.ts` (data titles ≤50 characters with the HUD FY; `HUD_RENTS` equals `HUD_FMR_AREAS`), `markets-indexability.test.ts`, `public-stale-registry-render-guards.test.tsx` (the "Data as of HUD FY…" format), `markets-states-data-first.test.tsx` (FMR vocabulary, FAQ mirror, bespoke indexability), `seo-market-state-facts.test.tsx` (the loaders).

### States — 33 guides
- Since F8: title and H1 "{State} Rental Market Data"; a data-only summary, three facts (median home value, median real estate taxes paid, renter share) and a visible FAQ, all from `content/seo/state-facts.json` (Census ACS 2024 1-year, each with its data.census.gov table and retrieval day); HUD FMR for every market page in the state (bespoke included); the sources box.
- Nothing hand-authored in `lib/states.ts` renders (pitch, tier, landlord lean, tax rate, medians, timelines). The unused Tax Foundation table (`lib/property-enrichment/state-property-tax.ts`) was deleted; `lib/states.ts` still holds its own unsourced values, but nothing reads them: `scripts/build-market-intelligence-pack.ts` rebuilds `public/downloads/truecap-market-intelligence-pack.pdf` from `state-facts.json` and HUD FMR only (`public-download-artifacts.test.ts` pins it).
- A page is indexable when its sourced facts are present, it has at least one HUD city and it has ≥300 estimated words; all 33 are.

### Comparisons — 38 `/vs/<competitor>` pages
- **Files:** `app/vs/<competitor>/page.tsx`, each a standalone page with its own matrix, TL;DR, FAQ (`ComparisonFaq`, visible) and a "Sources & methodology … last reviewed" note.
- **Registry and sitemap:** the hub list is `app/vs/page.tsx`; the sitemap lists the 38 paths in `app/sitemap.ts` and takes their `lastmod` from the map.
- **Sourcing:** only 3 pages (dealcheck, biggerpockets-calculator, stessa) carry exact review dates and primary-source links. Competitor prices on the rest lack a dated source.
- **Pinned by tests:** heavily, in `comparison-claim-guards.test.ts` and `vs-page-copy-integrity.test.ts`. The union of all pages must say "see live pricing", and there must be more than 40 files, so deleting one fails CI.

### Glossary — 44 terms
- **Data:** `lib/glossary.ts` `GLOSSARY` (`term, slug, category, definition, also?, benchmark?, formula?, example?, howToCheck?, whyItMatters?, related?, toolUrl?, postUrl?`).
- **Pages:** the term page `app/glossary/[slug]/page.tsx` renders `toolUrl` as "Run the numbers with the <Calculator>" only while that calculator is released (F9; `linkableToolFor` in `lib/seo/link-policy.ts`), and never renders `postUrl`. `toolUrl` stays out of the lastmod content signature: b0509fb removed seven unreleased `toolUrl`s when nothing rendered them, and counting the field would re-date those pages. `RelatedContent`'s calculator links still come from a token-overlap heuristic that mislinks: `/glossary/interest-rate` links to the vacancy calculator. On a post it offers a calculator only when one shares a word with the post; a post that shares none (the comparisons hub's software posts, for one) gets no calculator rather than its hub's first one (`link-policy.test.ts`, `internal-link-graph.test.tsx`).
- **Hub:** `app/glossary/page.tsx` overrides 23 definitions with a `CURATED` block, some with unsourced statistics.
- **Client bundle:** `lib/glossary.ts` is imported by `use client` analyzer components (`components/investcalc/glossary-tip.tsx`), so an edit to it ships into the analyzer's client bundle. That is why the loop may not edit it directly.

### Tools — 10 released calculators + the spreadsheet
- **Registry:** `lib/calculator-registry.ts` (`ALL_CALCULATORS`, `UNRELEASED_UNDERWRITING_CALCULATORS`, `CALCULATOR_REGISTRY`, `EMBEDDABLE_CALCULATORS`). Releasing a slug requires a reviewed code change and parity tests.
- **Pages:** `app/tools/<slug>/page.tsx` mixes SEO copy with release-gate lines (`permanentRedirect`). This is why `app/tools/**` is outside the loop's allow-list.
- **Redirects:** `/tools/dscr-calculator` 308-redirects to `/blog/how-to-calculate-dscr`, yet DSCR-calculator queries carry about 36% of query-level impressions. Since the DSCR consolidation (2026-09-28) that page is the one DSCR guide, so the redirect, the two merged posts' 308s and the internal links all land on it.

### Embeds
- `/embed/[slug]` hosts 9 released embeddable widgets. They are noindex/nofollow and framed with `frame-ancestors *` (`next.config.mjs`).
- **Partner snippet:** the copy-paste snippet (`components/embed/embed-code-block.tsx`) puts a caption link "Calculator by TrueCap" in the partner's DOM. That link is the only one that can earn a backlink. Snippets are permanent once pasted.
- **Copy control:** `ToolEmbedInvite` renders it on 9 of 10 released calculators, and only on the canonical host.
- **Mismatch:** the `/embed` hub promises a "Powered by TrueCap" footer the widget does not render.
- `/embed/brand/[token]` is the white-label Agent Pro feature: entitlement-gated, billing code, off limits.

### Persona and trust pages
- `/about`, `/methodology`, `/reviews`, `/playbook`, `/why-truecap`, `/sample-decision-memo`, `/for-buy-and-hold`, `/for-house-hackers` and `/for-agents` (Stripe display prices; billing-adjacent) are all indexable and linked from the footer.
- `/for-brrrr` and `/for-flippers` are noindex.
- The founder is described on `/about` but never named.

### How any content change reaches production
1. Open a PR to `main`. Branch protection requires `build-chain-guard`, `check` (lint, tsc, the full vitest suite, `next build`) and `browser-regressions` (Playwright against a disposable Supabase), strict and up to date. `enforce_admins` is on, history is linear, and 0 reviews are required.
2. On merge, Vercel builds `main` and deploys it.
3. **Non-owner PRs, including every bot PR, are fenced by `build-chain-guard`** (`.github/workflows/ci.yml`):
   - gate 1a: a path allow-list;
   - gate 1b: `scripts/check-agent-blog-content.mjs` token-scans agent-touched modules;
   - GUARDED paths: `.github/ .claude/ scripts/ supabase/ app/api/ lib/supabase/`, configs, `package.json`, and after A2 also `seo/`;
   - gate 2: `scripts/verify-build-integrity.mjs` hash-pins every build-executed file.
   - Why these exist: `docs/SECURITY-HARDENING.md` and the 2026-06 incident recorded in `CLAUDE.md` §7.

## 3. Identity and first-touch attribution

- **Two ways to create an account**, both Supabase Auth:
  - email + password via `signUpAction` (`app/actions/auth.ts`). It passes no `options.data`; it saves the first touch to app_metadata (below).
  - Google OAuth (`components/auth/google-auth-button.tsx`), which cannot carry user metadata.
- **Callback:** both land on `app/auth/callback/route.ts`. It detects a genuinely new Google user and emits `signup_completed`; its `referral_source` is the first-touch cookie's source (`direct` without one). It used to send `"google_oauth"`, the sign-up method mislabelled as the acquisition channel.
- **Where user data lives:**
  - `auth.users` has `raw_user_meta_data` (user-editable) and `raw_app_meta_data` (service role only).
  - `public.profiles` has no jsonb column, and its update policy covers the whole row, so a new column would be user-writable.
  - `public.demo_accounts` lists accounts to exclude from counts.
- **Attribution before F5:**
  - `components/analytics/posthog-provider.tsx` classifies the first page load into a fixed taxonomy (`direct, organic_search, organic_ai, organic_social, paid_search, paid_social, email, external_referral, campaign`). It stores it in **sessionStorage** only, with no consent check.
  - `docs/privacy-safe-passive-growth-funnel.md` forbids storing raw UTM values, referrer hosts or landing paths, a rule reinstated on 2026-08-30 (`f7183dd`) and guarded by `analytics-privacy-guards.test.ts`.
- **Consent:** the banner (`components/marketing/cookie-consent-banner.tsx`) is one all-or-nothing choice stored in localStorage. It promises "only essential session cookies" on reject. Production sets no cookie for anonymous visitors.
- **Decision (founder, 2026-09-27):** coarse attribution only.
  - A first-party cookie holding the source category and the landing *section*, set **only after consent**.
  - Written to `app_metadata.tc_first_touch` at sign-up: in `signUpAction`, and in the callback's new-Google-user branch via the service role.
  - Weekly organic counts are written to the private `seo_conversions_daily` table and shown only on `/admin/seo`, never in the public repo.
  - No migration is needed.
- **Built (F5):**
  - `lib/first-touch.ts` holds the taxonomy, the classifier (sign-in round trips record nothing; webmail is `email`, not search; an auto-tagged ad click such as `gclid` or `msclkid` is `paid_search`, never organic), the landing sections and the `tc_ft` cookie rules; `lib/first-touch-server.ts` validates the cookie with zod and writes app_metadata (in `after()`, off the sign-up response).
  - `seo/scripts/signups.ts` runs daily in `seo-control-plane.yml` (`--days 35`, non-fatal) and prints no count on the public runner.

## 4. Can git supply honest last-modified dates?

**No, not by itself.**
- 72 of 75 posts were last committed on 2026-09-25 by one audit squash (`b9ebd44`) that changed markup, not content. Other corpus-wide sweeps: `6b4ddb2`, `70cf985`, `da4ef24`, `ef62efe`, `b0509fb`, `f7183dd`.
- First-commit dates also disagree with `publishedAt` for several posts.
- Hand-typed JSON-LD dates disagree with the sitemap on most templates.

**The honest source (F2, built):** `content/seo/lastmod.json`, loaded and validated by `lib/seo/lastmod.ts`.
- **Seed:** `node seo/scripts/lastmod.ts seed` takes, for each sitemap URL, the committer date of the newest commit that changed that URL's *content signature*, skipping the listed sweep commits (`config.json` → `sweepCommits`). The signature (`seo/scripts/lib/content-signature.ts`) is the page's visible text and data from the TypeScript AST — never classNames, imports, whitespace, social/robots metadata or the dates themselves — so a corpus-wide sweep only counts where it changed content. Sources: a post's, `/vs` page's or tool's own `page.tsx`; core pages add their content components (and /about its `AUTHOR_BIO`); glossary terms, states, markets and topic hubs use their one data entry (rendered fields only). Re-running the seed reproduces the committed map exactly (checked 2026-09-27 over its 381 keys).
  - **F1 is a listed sweep.** It moved /about's bio into `lib/author.ts` and turned the bonus-depreciation post's hand-rolled "By TrueCap" line into `BlogByline`. Both pages' signatures changed, but neither page's main content did: /about renders the same paragraph, and the bonus post only gained the boilerplate byline every post now carries. Without the listing, a re-seed dates `/about` and `/blog/bonus-depreciation-rental-property-2026` to the F1 commit.
  - **F4 is five sweeps** (hubs' breadcrumbs, tool entities and /analyze, the glossary set, FAQPage only where visible, the six prose posts as JSX) **plus three from its review** (registry excerpts with real characters, /pricing's offers on `/#software`, no HowTo whose steps are not shown). None changes a page's main content, so none may move a date.
  - **How a sweep is marked.** The older sweeps that were already on main are listed by SHA in `seo/config.json` `sweepCommits` (`lastmod.ts seed` refuses a listed SHA that is not in history). Every newer sweep — F1 and the eight F4 commits — carries a `Lastmod-Sweep: true` trailer in its commit message instead, because the stacked PRs land by rebase-merge, which rewrites every SHA; the trailer survives it. Mark any future corpus-wide presentation change the same way.
  - **Enforced, not remembered:** `seed` refuses to run in a shallow clone or while a listed sweep is not in HEAD's history, and names the landed copy (same author date and subject) when it finds one. `lastmod-contract.test.ts` reports the same in any full clone; CI's unit job is shallow and skips it.
- **Afterwards:** the loop's publish step bumps a URL's date only when the hash of its rendered `<main>` text changed. Header and footer chrome don't count, and the model never writes dates: verify-static refuses any change to a page's date slots (whatever they hold, the map wiring included), a new post's `MODIFIED_AT` must be exactly `lastmodFor("/blog/<slug>") ?? PUBLISHED_AT`, and a `lib/blog-posts.ts` edit declares `/blog` so its date moves as a re-seed would.
- **Market pages:** the HUD vintage belongs in the visible "data as of" line, not in `lastmod`; a changed rent value is a data change.

## 5. The SEO automation that already exists (before this loop)

| Workflow | Schedule | What it does | State |
|---|---|---|---|
| `seo-control-plane.yml` | daily (+weekly/monthly/quarterly) | GSC Search Analytics → Supabase `seo_gsc_daily`; source-change monitor over `config/seo-sources.json`; crawl → `seo_crawl_results`; opportunity scoring → `seo_opportunities`; `/admin/seo` dashboard | **Broken since ~2026-08-30.** Its GSC read stops at Supabase's 1,000-row response cap and reads the oldest rows, so the current 28-day window is empty while the run reports SUCCEEDED. Fix: PR "Z". |
| `seo-scoreboard.yml` | Mon | GSC by page, by query and totals, plus **URL Inspection of every sitemap URL**. IndexNow ping. Telemetry force-pushed to branch `seo/telemetry` (6 snapshots, 2026-08-17 → 09-21) | Its PR to `main` never opens, because `GITHUB_TOKEN` may not create PRs. It is retired once seo-weekly has run green twice; its history seeds the inspection cache. |
| `seo-healthcheck.yml` | Mon | Production crawl, link-graph orphans, depth, schema requirements, ops tripwires (foreign deployment, cron liveness) | Kept. `crawl.ts` reuses it. |
| `seo-content.yml` | Tue/Fri | Claude edits one blog post per run and **auto-merges** `seo-maintenance:` PRs | **Disabled 2026-09-27**; retired by A2. Two of its last four runs failed, and a blog `page.tsx` importing `@/lib/supabase/admin` would have passed every gate. |
| `seo-visibility.yml` | monthly | Claude writes submission drafts; its model could run `gh pr merge` | **Disabled 2026-09-27**; retired by A2. |

- **IndexNow:** the key is a static file in `public/` (a 32-hex name), live; the submitter is `scripts/seo/indexnow.mjs`. IndexNow reaches Bing and Yandex. Google ignores it, and the Google Indexing API is deliberately never used.

### What the measurement says (2026-09-21 inspection, 28-day window to 2026-09-18)
- **Index:**
  - 381 sitemap URLs, **329 indexed**. The count is falling: 376 on 08-31.
  - 25 URLs dropped to "Crawled – currently not indexed". 24 of them had last been crawled in June or July; they are not thin. Every dropped page that Google recrawled came back.
  - **20 URLs have never been crawled**, 12 of them glossary terms added after June. No newly listed URL has been crawled since 2026-08-31.
- **Traffic:** 24 clicks, 3,033 impressions, average position 30.7. Every query-level click is on the brand term.
- **Noise:** a placebo split of the striking-distance pages shows ~4× differences with no treatment at all. GSC outcomes at this volume are directional, which is why rollback keys on deterministic signals (see `config.json` → `outcomes`, `brakes`).

## 6. The decision the brief asked for

- **Git and PRs everywhere.** Every content type the loop edits is git-tracked (TSX pages and TS/JSON datasets), so the loop works through pull requests with no database migration.
- **Two small structural moves**, both owner PRs, make the content data-driven where the loop needs it:
  - Lift `BLOG_POSTS` into `lib/blog-posts.ts` (F2).
  - Add JSON datasets under `content/seo/` for sourced market/state facts, the honest lastmod map and the noindex list (F2/F8). Owner-written loaders validate them.
- Components, templates, the sitemap and the layout change only in owner-reviewed PRs.

## 7. Claims checked during discovery and thrown out

Recorded so nobody re-raises them:
- "The control plane enforces caps and a kill switch." False. `SEO_AUTOPILOT_*`, `SEO_DAILY_MUTATION_CAP`, `SEO_WEEKLY_PUBLICATION_CAP` and `SEO_DAILY_LLM_USD_CAP` only label output or feed the dashboard. Nothing enforces them.
- "Indexation is the bottleneck." Outdated: 86% of URLs are indexed. The problems are a stale-crawl decline, 20 never-crawled URLs, rankings (average position 31) and zero links.
- "The Google Indexing API can speed this up." It is only for job postings and live events, so it is never used.
- "`seo/telemetry` data reaches the content agent." It never reached `main`.
- "Dropped pages were dropped for thinness." Their median length is 1,609 words, longer than kept pages. The cause is stale crawls.
- "A `deployment_status` workflow can open a revert PR." `claude-code-action` rejects that event type, so reverts are opened by a scheduled job.
- "`GITHUB_TOKEN` can open the loop's PRs." It can't: repo setting, and its events trigger no CI. PRs are opened by a scoped Claude GitHub App step.
