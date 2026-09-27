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
- **JSON-LD:** hand-written inline `<script type="application/ld+json">` in about 156 files. There is no central emitter.
  - `app/layout.tsx` emits the site-wide `Organization` (`/#organization`) and `WebSite` (`/#website`, SearchAction).
  - There is deliberately no Person node (founder decision, 2026-09-07; `CLAUDE.md` §1).
  - Per template:

| Template | Types beyond Organization + WebSite |
|---|---|
| `/` | SoftwareApplication `/#software` + Offer, FAQPage |
| `/analyze` | none |
| blog post (75) | Article/BlogPosting (author = Organization `@id`), BreadcrumbList, FAQPage on 68 |
| market city (150) | WebPage (dateModified from the lastmod map, F2), BreadcrumbList, FAQPage **not rendered visibly** |
| bespoke market (12, noindex) | WebPage + Place, BreadcrumbList |
| state (33) | Place, WebPage, BreadcrumbList, FAQPage **not rendered visibly** |
| vs (38) | WebPage, 2-level BreadcrumbList, FAQPage (visible, via `ComparisonFaq`) |
| glossary term (44) | DefinedTerm (dateModified from the lastmod map, F2), FAQPage, BreadcrumbList |
| released tool (10) | WebApplication or WebPage **plus** a second SoftwareApplication with an inline publisher (two app entities, no `@id`), FAQPage, 3-level BreadcrumbList |
| hubs `/blog /tools /vs /markets /states /glossary` | CollectionPage / ItemList / DefinedTermSet, **no BreadcrumbList** |
| `/about` | AboutPage (mainEntity = Organization) |
| `/methodology` | TechArticle |

- **Sitemap** (`app/sitemap.ts`):
  - A single `urlset` of **381 URLs**, with no sitemap index. It includes only pages that pass the indexability helpers in `lib/markets/indexability.ts`.
  - Composition: 20 core, 11 tools, 44 glossary terms, 33 states, 150 markets, 9 blog topic pages, 75 posts, 38 comparisons and `/for-agents` (env-gated). 0 strategy pages (`STRATEGY_PAGES_INDEXABLE = false`).
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
- **Files:** `app/blog/<slug>/page.tsx` (a hand-written TSX server component) plus a sibling `opengraph-image.tsx`.
- **Authoring shapes:**
  - 72 standalone posts. Module-level consts: `SLUG`, `TITLE`/`TITLE_PLAIN`, `SERP_TITLE`, `DESCRIPTION`, `PUBLISHED_AT`, `MODIFIED_AT`, `READING_TIME`. Each has an `export const metadata`, a `FAQS` array, three inline JSON-LD blocks, and prose as JSX.
  - 3 posts use `components/marketing/source-first-article.tsx` (an `ARTICLE` object). These three are thin, at 322–404 words live.
- **Registry:** `BLOG_POSTS` in `lib/blog-posts.ts` (`slug, title, excerpt, readingTimeMinutes, publishedAt, available`), a pure data module.
  - F2 lifted it out of `app/blog/page.tsx` and dropped `modifiedAt`: a post's last-modified date is not the registry's to hold.
  - Consumers: `/blog`, the topic hubs, the sitemap, `feed.xml`, `llms.txt`, site search, related-post blocks and several tests.
  - Before F2, importing it pulled in the `/blog` page's React tree, which is why `seo-guards.test.ts` still reads `app/sitemap.ts` as text.
  - **Drift:** 13 registry titles and some excerpts no longer match their pages (e.g. the rental-yield excerpt still quotes figures the page removed). Every post's `MODIFIED_AT` now reads the lastmod map (F2), so it matches the sitemap.
- **Topic hubs:** `lib/blog-topics.ts` holds 8 hubs (`slug, title, description, intro, postSlugs, calculatorSlugs`) rendered at `/blog/topics/<slug>`.
  - Tax hub: 7 posts. Financing hub: 12.
  - Five posts are in no hub.
  - The `/blog/topics` copy says "five" hubs.
- **Authorship (F1):** the author is the TrueCap Organization and the founder is never named. Article author = Organization `@id` on every post; there is no Person node. The copy lives in `seo/author.md` (human-editable) and `lib/author.ts`, which must say the same thing (`lib/__tests__/author-byline-bio.test.tsx`).
  - The unnamed `BlogByline` ("By TrueCap · built by a Philadelphia rental investor", linking `/about`) sits directly under the date line of all 75 posts (through `SourceFirstArticle` for its 3) and under the H1 of every `/vs/<slug>` page.
  - The name-free bio (`AuthorBio`, the /about "Who builds this" paragraph, linking `/about` and `/methodology`) closes every post through `RelatedBlogPosts`, inside `<main>`, and every `/vs/<slug>` page directly.
  - Both are boilerplate: adding or editing them moves no post's or /vs page's date. /about renders the same `AUTHOR_BIO`, so a Bio edit is /about content (`lastmod.ts` counts `lib/author.ts` for /about).
- **Sources:** there is no sources component. Only 8 of 75 posts link any external page, and 3 link a government source.
- **Disclaimer:** one sitewide `Disclaimer` (in `SiteFooter`). It says "not … investment advice" but not tax or legal.
- **Links:**
  - The internal-link standard is ≥3 glossary, ≥1 market, ≥1 tool and ≥2 blog links. New posts must meet it outright; existing posts are ratcheted by `docs/seo/guard-baseline.json` and `seo-guards.test.ts`. 9 of 75 posts meet it today.
  - `RelatedBlogPosts` links every post to the same 3 newest posts.
- **Pinned by tests:**
  - title ≤50 characters as a plain const, with og:title equal to title (`blog-title-length.test.ts`);
  - ≥75 available posts (`content-hub-readiness.test.ts`, so deleting a post fails CI);
  - vocabulary bans (`customer-facing-decision-vocabulary.test.ts`, `public-underwriting-claims-guard.test.ts`);
  - per-post must-contain strings (see `lib/__tests__/trust-language-guards.test.ts`, `comparison-claim-guards.test.ts`, `public-funnel-trust-guards.test.ts`).

### Markets — 150 programmatic + 12 bespoke city guides
- **Routes:**
  - `app/markets/[city]/page.tsx`: the programmatic template, 150 cities, all indexable.
  - `app/markets/{philadelphia,atlanta,charlotte,cleveland,dallas,detroit,houston,indianapolis,kansas-city,memphis,phoenix,tampa}/page.tsx`: bespoke wrappers around `components/marketing/safe-market-page.tsx`. They are **noindex** because they have no HUD row, and they have no site Header.
  - `app/markets/[city]/[strategy]`: 26 combos, all noindex.
- **Datasets** (checked-in TS; nothing is fetched at render time):
  - `lib/markets/cities.ts` `MARKET_CITIES`: 150 records. Only `slug/name/stateCode/stateName/relatedPosts` render; hand-authored ranges and blurbs are deliberately suppressed.
  - `lib/markets/city-geo.ts` `CITY_GEO`: county and ZIP bridge. There are no coordinates, so "nearby" can only mean same state or same county.
  - `lib/markets/hud-rents.ts` `HUD_RENTS`: **GENERATED** by `npm run build-market-rents` from the HUD FMR API (`HUD_API_KEY` in `.env.local`). It holds `{rent2br, rent3br, year}`, 150 rows at FY2026, with no rows for the 12 bespoke cities.
  - `lib/markets/safmr-rents.ts` `SAFMR_RENTS`: GENERATED by `npm run build-market-safmr`, 48 metros, at most 12 ZIP rows each.
  - None of them carries a `sources` array or a retrieval date. The generators fall back to the current calendar year if HUD omits `year`, which is a latent vintage bug.
- **What a page says:**
  - Title "Is {City} Good for Rental Property? (2026)"; H1 "Is {City} a good place to buy rental property in 2026?".
  - HUD FMR table; a sample underwrite using one synthetic fixture for every city ($265k, 20% down, 6.6%, 1.49% tax — `lib/sample-deal.ts`); a generic "three things to verify locally" block; a state-guide link (132 of 150 cities have a state guide); "Explore other markets" (the same 6 cities plus 4 noindex bespoke pages on every page); "Data as of {year}".
- **Pinned by tests:** `markets-data-bar.test.ts` (titles ≤50 characters containing "2026"; every `HUD_RENTS` key must be a `MARKET_CITIES` slug), `markets-indexability.test.ts`, `public-stale-registry-render-guards.test.tsx` (the "Data as of" format).

### States — 33 guides
- `app/states/[slug]/page.tsx` renders from `lib/states.ts` (`pitch, tier, landlord, propertyTaxRatePct, …`).
- A page is indexable when its facts are present, it has at least one HUD city and it has ≥300 estimated words.
- **Known truth defects:**
  - Some pitches carry verdicts and contradictory, unsourced claims: IL and NJ are each called the "highest" property tax.
  - Rendered tax rates disagree with the repo's only cited table, `lib/property-enrichment/state-property-tax.ts` (Tax Foundation 2023, unused).
  - The `/states` hub copy says the guides don't publish statewide tax rates, but every guide does.

### Comparisons — 38 `/vs/<competitor>` pages
- **Files:** `app/vs/<competitor>/page.tsx`, each a standalone page with its own matrix, TL;DR, FAQ (`ComparisonFaq`, visible) and a "Sources & methodology … last reviewed" note.
- **Registry and sitemap:** the hub list is `app/vs/page.tsx`; the sitemap lists the 38 paths in `app/sitemap.ts` and takes their `lastmod` from the map.
- **Sourcing:** only 3 pages (dealcheck, biggerpockets-calculator, stessa) carry exact review dates and primary-source links. Competitor prices on the rest lack a dated source.
- **Pinned by tests:** heavily, in `comparison-claim-guards.test.ts` and `vs-page-copy-integrity.test.ts`. The union of all pages must say "see live pricing", and there must be more than 40 files, so deleting one fails CI.

### Glossary — 44 terms
- **Data:** `lib/glossary.ts` `GLOSSARY` (`term, slug, category, definition, also?, benchmark?, formula?, example?, howToCheck?, whyItMatters?, related?, toolUrl?, postUrl?`).
- **Pages:** the term page `app/glossary/[slug]/page.tsx` never renders `toolUrl`/`postUrl`. Calculator links come from a token-overlap heuristic that mislinks: `/glossary/interest-rate` links to the vacancy calculator.
- **Hub:** `app/glossary/page.tsx` overrides 23 definitions with a `CURATED` block, some with unsourced statistics.
- **Client bundle:** `lib/glossary.ts` is imported by `use client` analyzer components (`components/investcalc/glossary-tip.tsx`), so an edit to it ships into the analyzer's client bundle. That is why the loop may not edit it directly.

### Tools — 10 released calculators + the spreadsheet
- **Registry:** `lib/calculator-registry.ts` (`ALL_CALCULATORS`, `UNRELEASED_UNDERWRITING_CALCULATORS`, `CALCULATOR_REGISTRY`, `EMBEDDABLE_CALCULATORS`). Releasing a slug requires a reviewed code change and parity tests.
- **Pages:** `app/tools/<slug>/page.tsx` mixes SEO copy with release-gate lines (`permanentRedirect`). This is why `app/tools/**` is outside the loop's allow-list.
- **Redirects:** `/tools/dscr-calculator` 308-redirects to `/blog/how-to-calculate-dscr`, yet DSCR-calculator queries carry about 36% of query-level impressions.

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
- **Seed:** `node seo/scripts/lastmod.ts seed` takes, for each sitemap URL, the committer date of the newest commit that changed that URL's *content signature*, skipping the listed sweep commits (`config.json` → `sweepCommits`). The signature (`seo/scripts/lib/content-signature.ts`) is the page's visible text and data from the TypeScript AST — never classNames, imports, whitespace, social/robots metadata or the dates themselves — so a corpus-wide sweep only counts where it changed content. Sources: a post's, `/vs` page's or tool's own `page.tsx`; core pages add their content components (and /about its `AUTHOR_BIO`); glossary terms, states, markets and topic hubs use their one data entry (rendered fields only). Re-running the seed reproduces the committed map, with two known exceptions since F1: `/about` (its bio text moved into `lib/author.ts`) and `/blog/bonus-depreciation-rental-property-2026` (its hand-rolled "By TrueCap" line became `BlogByline`). Neither page's rendered main content changed, so a re-seed that moves them to the F1 commit is wrong; keep their committed dates.
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
