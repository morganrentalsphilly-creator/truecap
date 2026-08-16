# TrueCap SEO control-plane baseline — 2026-08-15

This is the pre-implementation snapshot captured before the control-plane release. It separates measured facts from activation gaps; unknown Search Console performance is not presented as zero.

## Architecture discovered

- Next.js 16 App Router, React 19, TypeScript, server/static rendering on Vercel.
- Supabase/Postgres with versioned SQL migrations and no ORM.
- PostHog, Vercel Analytics, Google Ads conversion tracking, and Sentry.
- Generated `sitemap.xml`, generated `robots.txt`, canonical metadata, JSON-LD, Open Graph, `llms.txt`, `llms-full.txt`, and an XML feed.
- Deterministic source SEO guards in Vitest, a production crawler, a GSC/Search Analytics + URL Inspection scoreboard, IndexNow for non-Google discovery, and scheduled GitHub Actions.
- Existing content is code-backed: calculator, embed, market, state, glossary, topic, blog, and comparison registries/templates.

## Current public inventory

| Asset | Measured count | Source |
|---|---:|---|
| Live sitemap URLs | 428 | production crawl |
| Blog posts | 75 | `BLOG_POSTS` |
| Topic hubs | 8 | `BLOG_TOPICS` |
| Calculator pages | 20 | `CALCULATOR_REGISTRY` |
| Embeddable calculators | 19 | calculator/embed registries |
| State guides | 33 | `STATES` |
| City market pages | 162 | 150 programmatic + 12 bespoke |
| City/strategy pages | 26 | `CITY_STRATEGY_COMBOS` |
| Glossary terms | 44 | `GLOSSARY` |
| Comparison pages | 40 | `/vs/*` routes |
| Static indexable pages scanned by the source guard | 167 | `source-scan.ts` |

Dynamic template instances explain why the live sitemap count is much larger than the static page-file count.

## Production technical crawl

Run: `node scripts/seo/healthcheck.mjs --json docs/seo/2026-08-15-live-health.json`

- 428/428 sitemap URLs returned successfully.
- 428/428 sitemap URLs were reachable by following internal links from the crawl seeds.
- 430 HTML pages were walked and 435 distinct internal targets discovered.
- All five production cron endpoints returned the expected unauthenticated `401`.
- The obsolete `truecap-iota.vercel.app` deployment no longer resolves.
- No critical or high-severity finding.
- Two medium findings at capture time:
  - `/why-truecap` duplicated the homepage FAQPage block.
  - `/blog/topics` was misclassified by the crawler as an article and lacked the schema it expected.

Both medium findings are included in this implementation: duplicate FAQ structured data is suppressed and the topic directory has truthful `CollectionPage` + `BreadcrumbList` schema with a corrected crawler rule.

## Source-side debt snapshot

- Titles above the source ratchet: 5.
- Meta descriptions above 165 characters: 43 before this release.
- Blog posts without FAQPage: 7/75.
- Blog posts below the existing contextual-link standard: 70/75.
- No new canonical/sitemap regression was found by the hard gates.

This is improvement debt, not a license to add more. Ratchets prevent the counts from increasing; new content must meet the current standard outright.

## Factual and machine-readable findings

### Critical: bonus depreciation

The 2026 bonus-depreciation guide, its FAQ/schema, the blog registry excerpt, and a dependent depreciation guide incorrectly said the rate was 20% and that restoration had not passed. Current IRS guidance restores 100% additional first-year depreciation for eligible property acquired and placed in service after January 19, 2025. The 27.5-year residential rental building itself generally does not qualify; certain correctly classified shorter-life assets can.

The release replaces the obsolete rule, date boundary, examples, passive-activity shortcuts, and one-rate recapture claim with primary-source-backed explanations.

### High: state count contradiction

The `/states` hub said 15 while its `STATES` registry rendered 33. Page metadata, Open Graph, schema, and visible copy are now derived from `STATE_COUNT`.

The 33 state records also mix market estimates with landlord-law/property-tax claims and describe their inputs as illustrative. The control plane therefore classifies state pages as high risk and `STALE_REVIEW_REQUIRED` until state-specific official statute/agency dependencies are attached. It will not autonomously rewrite or publish those legal claims from generic summaries.

### Product facts

Calculator and embed counts were already registry-backed. This release extends the central product/catalog facts to calculators, embeddable calculators, states, markets, plans, trial duration, underwriting defaults, and the canonical pricing route. Current recurring price values remain owned by Stripe and `/pricing` rather than copied into static SEO prose.

## Existing structured data and crawl controls

- Site-wide `Organization` and `WebSite`.
- `Article`/`BlogPosting`, `BreadcrumbList`, `DefinedTerm`, `ItemList`, `CollectionPage`, and applicable application/product entities.
- Public content is allowed; auth, API, dashboard, private deal/share, profile, and settings surfaces are excluded.
- Preview Vercel aliases are protected with noindex behavior.
- Sitemaps contain canonical, indexable HTML only; `llms.txt`, feeds, previews, and private routes are excluded.
- `lastmod` is emitted only from a publication date or an explicitly recorded material modification date.

## Topic graph

The current explicit blog hubs cover underwriting, financing, tax, strategy, markets, deal analysis, due diligence, and comparisons. Product/entity coverage also includes expenses, acquisition, calculators, glossary definitions, investor personas, markets/states, methodology, and competitors.

## Search Console status

The official, read-only GSC implementation already existed, but the only observed workflow run failed before measurement because `GSC_SERVICE_ACCOUNT_JSON` is not configured in GitHub Actions. Therefore:

- Current rankings, impressions, clicks, CTR, index coverage, decay, and query gaps are **unknown**, not zero.
- No evidence-based “top keyword opportunity” is asserted in this baseline.
- The first 90-day backlog prioritizes activation and measured winner refreshes before speculative content.

## Broken/source health status

Public internal-link health was clean in the crawl. The initial forced source-ledger check reached all 12 authoritative entries successfully: IRS Publications 544/925/946/527, current IRS bonus-depreciation guidance, FRED, HUD data, FHA, VA, Fannie Mae, Freddie Mac, and TrueCap product/pricing. HUD returned a successful asynchronous `202`; the others returned `200`. The first persisted comparison still requires the database migration and service-role workflow credentials. Its first fetch establishes the checksum baseline and does not falsely label every source “changed.”

## Initial 90-day opportunity backlog

### Days 0–14 — activate measurement and truth

1. Apply the SEO control-plane migration.
2. Add the GSC service account with Full Search Console property permission and run the 480-day backfill once.
3. Add narrowly scoped Supabase workflow secrets and run daily ingestion.
4. Review the first source-ledger baseline and resolve any failed official URL.
5. Validate organic landing → analyzer → signup → trial/paid events in PostHog.

### Days 15–45 — improve measured winners

1. Take the highest-scoring position 4–15 page with qualified intent and close its content/link/evidence gap.
2. Run one title experiment on a high-impression, top-10, low-CTR page.
3. Diagnose the top meaningful 28-day decay; refresh only after identifying cause.
4. Strengthen contextual links into the best calculator and analyzer-adjacent pages.
5. Review exact-query multi-page collisions for task-level cannibalization.

### Days 46–90 — build authority assets

1. Publish no new URL unless GSC or a strategic cluster gap proves distinct intent.
2. Select one privacy-safe original dataset only after its cohort clears the minimum threshold.
3. Produce one deterministic chart/table/report with public methodology and “Cite this data.”
4. Improve embed distribution on the calculators already earning referrals.
5. Review low-equity pages for improve/merge/redirect recommendations; do not mass-delete.

## First five experiments after GSC activation

1. Existing striking-distance calculator/guide: add the missing worked scenario plus two relevant incoming contextual links.
2. High-impression/low-CTR page: test a clearer benefit-led title without clickbait.
3. Organic article with traffic but weak analyzer starts: test a context-matched analyzer handoff.
4. Highest-use embeddable calculator: test a clearer, still quiet embed invitation below the result.
5. One market or benchmark asset: test an original sourced comparison table with downloadable CSV and citation module, only if privacy/data-quality gates pass.
