# TrueCap SEO control plane

The control plane is a deterministic measurement and decision system around the existing SEO assets. It inventories the canonical URL universe, ingests first-party search performance, watches authoritative sources, stores crawl/link health, scores work, and exposes the result at `/admin/seo`.

It does **not** mass-publish content. Public code/content changes still require a traceable Git commit/PR and all existing CI gates. High-risk tax, legal, lending, regulatory, and competitor interpretation never auto-publishes.

## Safe default

The production default is:

```text
SEO_AUTOPILOT_ENABLED=false
SEO_AUTOPUBLISH_ENABLED=false
SEO_AUTOPILOT_MODE=observe
```

With credentials missing, each integration writes an explicit `DISABLED`/`DEGRADED` artifact rather than treating missing data as zero. The existing weekly scoreboard remains intentionally loud when its GSC credential is missing.

## Components

| Component | Responsibility |
|---|---|
| `config/seo-sources.json` | Single machine-readable authoritative source ledger |
| `lib/seo/control-plane/*` | Modes, source/freshness policies, opportunity/decay/cannibalization, internal links, quality gates, year review, private aggregation |
| `scripts/seo/gsc-ingest.mjs` | Daily GSC date/query/page/device/country ingestion and historical backfill |
| `scripts/seo/healthcheck.mjs` | Live technical crawler plus URL records and contextual link-edge graph |
| `scripts/seo/persist-health.mjs` | Stores crawl and link graph snapshots |
| `scripts/seo/source-monitor.mjs` | Checks due primary sources, compares normalized hashes, flags dependent pages |
| `scripts/seo/control-plane.mjs` | Inventories URLs, computes metrics, scores work, records job state |
| `scripts/seo/pagespeed.mjs` | Monthly mobile PageSpeed/Lighthouse template QA |
| `.github/workflows/seo-control-plane.yml` | Daily, weekly, monthly, and quarterly orchestration |
| `supabase/migrations/20260815120000_seo_control_plane.sql` | Normalized, service-role-only data model |
| `/admin/seo` | Admin-only growth, health, opportunity, source, and job dashboard |

## Database

The migration creates:

- `seo_pages` — URL registry, intent, topic, risk, freshness, and status.
- `seo_sources` and `seo_page_source_dependencies` — source ledger, checksums, extracted facts, evidence claims, affected pages.
- `seo_gsc_daily`, `seo_page_metrics`, `seo_query_metrics` — raw and derived search performance.
- `seo_opportunities`, `seo_experiments`, `seo_refresh_jobs` — prioritized work and measured changes.
- `seo_internal_links`, `seo_crawl_results` — graph and technical crawl snapshots.
- `seo_conversions_daily`, `seo_embed_referrals` — privacy-safe organic/embed outcomes.
- `seo_original_datasets` — methodology/privacy state for TrueCap research assets.
- `seo_job_runs`, `seo_mutations`, `seo_settings` — observability, audit/rollback, and controls.

Every table has RLS enabled and all `anon`/`authenticated` table access revoked. The admin page and workflows use the service role server-side. No service credential is sent to the browser.

Apply the additive migration through the normal production migration path:

```bash
npx supabase db push
```

Review the migration diff before applying it. It creates new objects and does not alter product/billing tables.

## Google Cloud and Search Console setup

1. In Google Cloud, create or select a project.
2. Enable **Google Search Console API**. URL Inspection is part of that API surface.
3. Create a service account with no broad Google Cloud role; download one JSON key.
4. In Search Console, open the `usetruecap.com` domain property.
5. Settings → Users and permissions → Add user.
6. Add the service account's `client_email` with **Full** permission. Restricted can read Search Analytics but fails URL Inspection, which can otherwise look like a deindexing incident.
7. Add the entire JSON key as the GitHub Actions repository secret `GSC_SERVICE_ACCOUNT_JSON`.
8. Never commit the JSON and never put it in a `NEXT_PUBLIC_*` variable.

The scripts use the read-only `webmasters.readonly` OAuth scope. They do not use Google's general Indexing API and do not attempt to force ordinary pages into the index.

### Backfill

After credentials and the migration are active, manually dispatch **SEO control plane** with:

```text
cadence: manual
gsc_backfill_days: 480
```

The script queries one finalized day at a time, paginates the official API, and upserts idempotently. After every complete day upsert, it removes only superseded rows from the prior ingestion run, so Google rows that disappear during a late correction do not linger. Daily runs re-read seven finalised days by default so adjustments converge without duplicates. Search Console normally lags by several days; the current partial days are deliberately excluded.

## GitHub Actions credentials

Repository secrets:

```text
GSC_SERVICE_ACCOUNT_JSON        # entire service-account JSON
SEO_SUPABASE_URL                # project URL; server/workflow only
SEO_SUPABASE_SERVICE_ROLE_KEY   # service role; server/workflow only
PAGESPEED_API_KEY               # optional; higher PageSpeed API quota
```

Repository variables (non-secret):

```text
SEO_AUTOPILOT_ENABLED=false
SEO_AUTOPUBLISH_ENABLED=false
SEO_AUTOPILOT_MODE=observe      # observe | recommend | auto
SEO_DAILY_MUTATION_CAP=3
SEO_WEEKLY_PUBLICATION_CAP=1
SEO_DAILY_LLM_USD_CAP=5
SEO_HALT_ON_SOURCE_FAILURE=true
SEO_HALT_ON_QUALITY_FAILURE=true
```

The current release does not require an LLM to measure, crawl, monitor sources, classify URLs, compute decay, or score opportunities. The spend cap exists for a future evidence-constrained drafting adapter and is not permission to invent facts.

## Cadence

### Daily

1. Upsert final GSC rows.
2. Check due sources and propagate `STALE_REVIEW_REQUIRED` on checksum change.
3. Crawl the live sitemap and record URL/schema/canonical/link state.
4. Persist daily URL health. The full contextual edge snapshot is retained on
   non-daily cycles to avoid writing roughly 22,000 repetitive rows every day.
5. Refresh metrics and critical contradiction evidence.

### Weekly

1. Aggregate current vs previous 28-day windows.
2. Score striking distance, low CTR, decay, query gap, and same-intent cannibalization.
3. Prefer an existing almost-winner over speculative content.
4. Review weak/orphan internal authority and URL Inspection signals.
5. Record a human-readable status issue and job audit.

### Monthly

1. Full crawl and template performance QA.
2. Topic/programmatic coverage review.
3. Market/competitor/source freshness review.
4. Organic conversion and embed referral review.
5. Recommend improve/merge/redirect candidates; never mass-delete.

### Quarterly

1. Review topic and funnel performance.
2. Test whether a privacy-safe original dataset clears its cohort gate.
3. Select at most one defensible report/calculator/data asset.
4. Publish only with methodology, source window, accessible table/chart, and citation module.

## Opportunity rules

- **Striking distance:** positions 4–15 with meaningful impressions.
- **Low CTR:** meaningful impressions, top-10 position, and CTR below the conservative threshold.
- **Decay:** at least a 30% impression decline or a 3+ position loss across comparable windows.
- **Query gap:** measured query demand with poor token coverage by an intentional current URL. An existing URL is considered before a new one.
- **Cannibalization:** exact query + same task/intent on more than one URL. Glossary, calculator, guide, and benchmark pages are not considered collisions merely because the entity overlaps.
- **Conversion:** qualified organic traffic without the expected analyzer/signup progression.

Scores combine relevance, authority, search evidence, business value, conversion potential, probability, effort, content risk, and cannibalization risk. The formula is a prioritization aid, not a claim of certainty.

## Quality and programmatic safety

`runPageQualityGates()` fails closed on missing canonical/title/H1/description, absent distinct intent, no information gain, placeholders, high template similarity, unsupported claims, no parent/incoming link plan, weak accessibility/mobile state, and high-risk claims without primary sources.

`canAutopublishProposal()` returns true only for low-risk proposals that pass every gate. High-risk content cannot auto-publish. New market pages require independent data utility; swapped city names are insufficient.

## Freshness and year rollover

Default review intervals:

- competitor/product features: 7–10 days;
- mortgage rates: 7 days;
- tax/law/lending: 30 days plus source-change triggers;
- market data: 90 days;
- annual HUD data: 365 days or dataset release;
- evergreen formulas: 180 days.

Beginning in November, year-bearing content is queued for evidence review. `findYearReferences()` identifies the claims and context; no code performs `2026 → 2027` replacement. `dateModified` and sitemap `lastmod` move only with a material reviewed update.

## Source changes and YMYL

The first successful source fetch establishes a checksum baseline and does not mark content changed. Later normalized checksum changes:

1. store current and previous hash;
2. mark the source `CHANGED`;
3. mark dependent registered pages `STALE_REVIEW_REQUIRED`;
4. create a visible source alert;
5. require evidence reconciliation and QA before public copy changes.

For tax/law/lending, the monitor is an alert—not an autonomous interpreter. Primary-source evidence is mandatory, and lack of evidence blocks publication.

## Organic and embed attribution

PostHog now receives privacy-minimized events for `organic_landing`, calculator start/completion, analyzer start/completion, signup start/completion, trial start, and paid conversion. Organic attribution stores only the landing path, referrer hostname, and search/AI medium in session storage and attaches them to subsequent funnel events. It does not retain search queries, property addresses, or full referrer URLs.

Embeds record code copy, referring hostname, load, and attribution click. The visible, useful “Powered by TrueCap” attribution remains; the ineffective hidden iframe link was removed. No automated outreach or link scheme exists.

## Original data privacy

The default publication cohort is 50 observations. `privacySafeObservations()` suppresses smaller groups. A dataset cannot publish until methodology and privacy review are recorded. No user address, deal, or financial record is exposed. Report pages can use `CiteTrueCap` to provide title, publisher, real update date, canonical URL, copyable citation, and copy-link controls.

## Kill switches and rollback

Fastest stop:

```text
SEO_AUTOPILOT_ENABLED=false
SEO_AUTOPUBLISH_ENABLED=false
SEO_AUTOPILOT_MODE=observe
```

The scheduled measurement jobs can remain active in observe mode. To stop all scheduled cycles, disable the **SEO control plane** workflow in GitHub Actions. To stop only source-failure hard stops while diagnosing an upstream outage, temporarily set `SEO_HALT_ON_SOURCE_FAILURE=false`; do not treat the failed source as verified.

Every future autonomous mutation must record before/after state, reason, opportunity, source IDs, tests, Git commit, and rollback instructions in `seo_mutations`. Code/content rollback is a normal Git revert. Database telemetry tables are additive and do not control the product runtime.

## Known limitations

- No current GSC baseline exists until the external credential is added.
- Search Console hides/anonymizes some low-volume queries; totals will not always equal the sum of query rows.
- PageSpeed is variable lab data and report-only; it does not replace field Core Web Vitals.
- Referring-domain/embed rollups require enough PostHog data or a future privacy-safe export into `seo_embed_referrals`.
- Source hashes identify potential change; a person or evidence-constrained review decides material meaning.
- Existing state pages are deliberately high-risk/stale until each landlord-law and property-tax claim has an official state/county dependency; the current registry's illustrative values are not eligible for autonomous refresh.
- The initial URL classifier is deterministic and path-based. Admin corrections can enrich intent/topic/risk metadata over time.
- No new original-data report is published until the cohort, methodology, privacy, and information-gain gates are satisfied.
