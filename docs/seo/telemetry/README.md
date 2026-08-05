# `docs/seo/telemetry/` — the Search Console record

Written weekly by `.github/workflows/seo-scoreboard.yml`
(`scripts/seo/gsc-scoreboard.mjs`). One file per run, named for the UTC date,
plus `latest.json` — a byte-identical copy of the newest run at a stable path
so consumers never have to guess a date.

These files are **committed on purpose**. Week-over-week deltas need last
week's numbers to still exist, and a CI artifact expires. The file is the
trend.

They arrive as one long-lived PR from the `seo/telemetry` branch — `main`
requires status checks, so a bot cannot push to it directly. Unmerged weeks are
carried forward on that branch, so the deltas survive merge latency; nothing
reading `main` sees them until the PR lands.

Nothing here is executed by `next build`, imported by the app, or read at
request time. It is a record.

## Rules

- **Do not hand-edit.** The next run diffs against the newest dated file. An
  edited number becomes a fake delta and then a fake trend.
- **A missing week is a signal, not a gap to backfill.** The script writes
  nothing when it could not measure — a failed auth, a Restricted service
  account, a dead sitemap. An absent file means "no measurement was taken",
  which is exactly what it should mean.
- **`ratio` is over inspected URLs only.** Never fold `uninspected` into the
  denominator; a quota shortfall would read as a de-indexing event.
- **No credentials.** The serialised output is scanned for the private key and
  the access token before it is written (`assertNoSecrets`). Keep it that way —
  this directory is in git history forever.

## Shape

```jsonc
{
  "generatedAt": "2026-08-10T14:03:11.522Z",
  "site": "sc-domain:usetruecap.com",
  "range": { "startDate": "…", "endDate": "…", "days": 28 },  // ends 3 days back: GSC finalises on a lag
  "previousTelemetry": "2026-08-03.json",                     // what the deltas were computed against
  "sitemap": { "url": "…", "urlCount": 429, "previousUrlCount": 429 },
  "searchAnalytics": {
    "totals":  { "clicks": 0, "impressions": 0, "ctr": 0, "position": null },
    "pages":   [ { "url": "…", "path": "…", "family": "/blog", "clicks": 0, "impressions": 0, "ctr": 0, "position": 0 } ],
    "queries": [ { "query": "…", "clicks": 0, "impressions": 0, "ctr": 0, "position": 0 } ],
    "pagesTruncated": false, "pageCount": 0,                  // *Count is the true total; the array is capped
    "queriesTruncated": false, "queryCount": 0
  },
  "inspection": {
    "planned": 429,        // URLs the sweep set out to cover — NOT how many were tried
    "inspected": 429,
    "uninspected": 0,
    "errors": 0,
    "quotaExhausted": false,
    "skipped": false,
    "uninspectedReason": null,   // non-null whenever uninspected > 0; read it before reading any ratio
    "byFamily": {
      "/blog": { "total": 0, "indexed": 0, "notIndexed": 0, "uninspected": 0, "ratio": null }
      // …/markets, /tools, /vs, /glossary, /states, other. `ratio: null` means
      // "nothing inspected", which is NOT the same as 0.
    },
    "urls": [
      {
        "url": "…", "family": "/blog", "inspected": true, "indexed": false,
        "verdict": "NEUTRAL",                                 // PASS = on Google; classify on this, not on prose
        "coverageState": "Crawled – currently not indexed",   // localised prose, wording has changed before
        "robotsTxtState": "ALLOWED", "indexingState": "INDEXING_ALLOWED",
        "pageFetchState": "SUCCESSFUL", "lastCrawlTime": "…",
        "googleCanonical": "…", "userCanonical": "…",         // a mismatch is Google overriding our canonical
        "error": null
      }
    ]
  },
  "queriesWithoutPage": [
    { "query": "…", "impressions": 0, "clicks": 0, "position": 0,
      "nearestPage": "/tools/dscr-calculator", "nearestCoverage": 0.33 }
  ],
  "queriesWithoutPageCount": 0
}
```

## `queriesWithoutPage` — the field the content pipeline consumes

Queries with real impressions that no sitemap slug appears to target. This is
measured demand: the 2026-07-15 audit found roughly a third of earlier posts
targeted invented phrasings with no search volume at all, and this list exists
to replace that guessing.

It is a **token-overlap heuristic against URL slugs**, not a reading of the
page — a page can target a query without saying it in the URL. `nearestPage`
and `nearestCoverage` are carried on every row precisely so a wrong call is
visible. Check the nearest page before writing anything against a row.
