# SEO loop lessons

## Outcomes by change type

Updated 2026-10-05 by `ledger.ts score-outcomes`. A change is scored 56 days after it goes live: its clicks in the complete weeks of the 28 days after going live against the 28 days before, divided by the same ratio averaged over its holdout pages. A ratio inside the ×3.9 placebo band is neutral, so at today's traffic most changes read neutral. Counts are per run, page and change type (a new article's page, image and registry entries are one change). Loss rate counts wins and losses only; brakes.ts treats a change type as tier 2 once it exceeds 40% over at least 10 of them.

| Change type | Win | Loss | Neutral | Awaiting score | Reverted | Loss rate |
|---|---:|---:|---:|---:|---:|---:|
| citations | 0 | 0 | 0 | 2 | 0 | — |
| internal-links | 0 | 0 | 0 | 7 | 0 | — |
| title-meta | 0 | 0 | 0 | 1 | 0 | — |

## Baseline 2026-09-27 (F0)

Recorded by `seo/scripts/baseline.ts` from existing artifacts (crawl 2026-09-27, index-status 2026-09-27, gsc missing, psi 2026-09-27). Per-URL rows: `seo/data/baseline-2026-09-27.json`.

- Indexed: 329 of 381 sitemap URLs (86.4%)
- Orphans: 0
- Duplicate titles: 0 groups covering 0 pages
- Thin pages: 241
- **Missing inputs:** gsc

### Indexed by family

| Family | Indexed | Total |
|---|---:|---:|
| blog-post | 47 | 75 |
| blog-topic | 8 | 8 |
| glossary-term | 33 | 44 |
| home | 1 | 1 |
| hub | 6 | 8 |
| market-city | 145 | 150 |
| other | 9 | 10 |
| persona | 3 | 3 |
| state | 31 | 33 |
| tool | 11 | 11 |
| vs | 35 | 38 |

### Not-indexed reasons

| Coverage state | URLs |
|---|---:|
| Crawled - currently not indexed | 31 |
| URL is unknown to Google | 20 |
| Excluded by ‘noindex’ tag | 1 |

### Index classes

| Class | URLs |
|---|---:|
| indexed | 329 |
| crawled_not_indexed | 1 |
| dropped_after_indexed | 30 |
| never_crawled | 20 |
| excluded | 1 |

### Orphans

None.

### Duplicate titles (top 10)

None.

### Template vitals (PSI mobile)

LCP, CLS and TBT are one lab run; INP exists only as field data, which most pages at this traffic do not have.

| Template | Page | Score | LCP | CLS | TBT | Field INP |
|---|---|---:|---:|---:|---:|---:|
| home | `/` | failed (quota) | — | — | — | — |
| blog-post | `/blog/is-a-duplex-a-good-investment` | failed (quota) | — | — | — | — |
| market-city | `/markets/columbus` | failed (quota) | — | — | — | — |
| state | `/states/texas` | failed (quota) | — | — | — | — |
| vs | `/vs/dealcheck` | failed (quota) | — | — | — | — |
| glossary-term | `/glossary/cap-rate` | failed (quota) | — | — | — | — |
| tool | `/tools/rental-property-spreadsheet` | failed (quota) | — | — | — | — |

## Baseline 2026-09-28 (F10)

Recorded by `seo/scripts/baseline.ts` from existing artifacts (crawl 2026-09-28, index-status 2026-09-28, gsc 2026-09-28, psi 2026-09-28). Per-URL rows: `seo/data/baseline-2026-09-28.json`.

- Indexed: 338 of 391 sitemap URLs (86.4%)
- Search, 28 days (2026-08-29 to 2026-09-25): 21 clicks, 2,911 impressions
- Orphans: 0
- Duplicate titles: 0 groups covering 0 pages
- Thin pages: 205

### Indexed by family

| Family | Indexed | Total |
|---|---:|---:|
| blog-post | 46 | 73 |
| blog-topic | 8 | 8 |
| glossary-term | 33 | 44 |
| home | 1 | 1 |
| hub | 6 | 8 |
| market-city | 155 | 162 |
| other | 9 | 10 |
| persona | 3 | 3 |
| state | 31 | 33 |
| tool | 11 | 11 |
| vs | 35 | 38 |

### Not-indexed reasons

| Coverage state | URLs |
|---|---:|
| Crawled - currently not indexed | 31 |
| URL is unknown to Google | 20 |
| Excluded by ‘noindex’ tag | 2 |

### Index classes

| Class | URLs |
|---|---:|
| indexed | 338 |
| crawled_not_indexed | 31 |
| never_crawled | 20 |
| excluded | 2 |

### Orphans

None.

### Duplicate titles (top 10)

None.

### Template vitals (PSI mobile)

LCP, CLS and TBT are one lab run; INP exists only as field data, which most pages at this traffic do not have.

| Template | Page | Score | LCP | CLS | TBT | Field INP |
|---|---|---:|---:|---:|---:|---:|
| home | `/` | failed (quota) | — | — | — | — |
| blog-post | `/blog/free-biggerpockets-calculator-alternatives` | failed (quota) | — | — | — | — |
| market-city | `/markets/peoria` | failed (quota) | — | — | — | — |
| state | `/states/illinois` | failed (quota) | — | — | — | — |
| vs | `/vs/zillow-rent-estimate` | failed (quota) | — | — | — | — |
| glossary-term | `/glossary/appreciation-rate` | failed (quota) | — | — | — | — |
| tool | `/tools/rental-property-spreadsheet` | failed (quota) | — | — | — | — |
