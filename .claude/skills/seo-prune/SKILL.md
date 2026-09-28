---
name: seo-prune
description: Takes one crawled-but-never-indexed, thin, unvisited sitemap URL out of the index by adding its path to content/seo/noindex.json, after first handing it to seo-citations or seo-market-enrich when they can add real substance. Use it only when the seo-weekly orchestrator passes a candidate with skill "seo-prune".
---

# seo-prune

Brief: URLs not indexed 60 days after first appearing in the sitemap, with fewer than 10 impressions in 28 days, and thin, are candidates. If seo-market-enrich or seo-citations can add real substance, do that instead. Otherwise set noindex and drop the URL from the sitemap, within the 5% per-run cap. Any page with clicks or known backlinks is kept. Deletion and redirects are tier 2: open an issue.

The only file this skill edits is `content/seo/noindex.json`. It never edits the page, so `editableSource` (null for glossary, market and state pages) does not block it.

## When it applies
score.ts routes a candidate here only when `pruneEligibility` passes. The candidate then carries a `NOT_INDEXED` reason whose detail ends `; prune-eligible`. Every condition must hold (values from `config.thresholds.prune`):
- `indexClass` is `crawled_not_indexed`, and no inspection snapshot was ever indexed (`everIndexed` false).
- The same `coverageState` appears on ≥ 2 inspections (`minConfirmingInspections`) at least 14 days apart (`minDaysBetweenInspections`).
- `lastCrawlTime` is after the crawl record's `dateModified`. A page without `dateModified` is never eligible.
- Fewer than 10 impressions in 28 days (`maxImpressions28d`).
- Thin: `wordCount` < 600 (`minWords`), or `uniqueRatio` < 0.4 (`minUniqueRatio`) against template siblings. A null ratio means word count only. Only the word-count case can be tier 1 (see Tier).
- In the sitemap ≥ 60 days (`firstSeenInSitemap` → `run-flags.date`, `minDaysInSitemap`).
- Bing `linkCounts[path]` is 0, when a Bing file exists.

Never eligible: `never_crawled`, `dropped_after_indexed` (vetoed to `requestIndexing`), `config.excludedFromOptimization` paths and `run-flags.activeHoldout` paths.

score.ts does not check the next rules (the step 3 keep rules); this skill does. Skip with the quoted reason when:
- any GSC row for the path has clicks > 0: "kept: has clicks".
- there is no `seo/data/bing-<run-flags.date>.json`: "kept: backlinks unknown (no Bing pull)". score.ts reads a missing Bing file as zero backlinks. The spec says unknown backlinks means keep.
- a `referringUrls` entry is on a host other than `usetruecap.com`: "kept: known backlink from <host>".
- `family` is `tool`: "kept: embed attribution target". Every pasted embed links `/tools/<slug>` (`lib/embed-attribution.ts`), and Bing counts only the links it has crawled.
- `family` is not `blog-post`, `vs`, `glossary-term`, `market-city` or `state`: "not a prunable content family".
- `node seo/scripts/ledger.ts query --url <path>` shows an earlier `prune-noindex` change. Only `void` changes, or none, allow a new prune:
  - status `reverted`: "kept: an earlier prune was reverted".
  - status `live`, and the path is not in `content/seo/noindex.json` now: "kept: owner re-indexed after an earlier prune". Deleting an entry by hand leaves the change `live` in ledger.ts, and the page keeps its old `firstSeenInSitemap`, so it qualifies again.
  - status `proposed`: "kept: an earlier prune is still proposed". Its PR is open; sync-prs marks it `void` if the PR closes unmerged.
- `cooldownUntil` is after `run-flags.date`: "in cooldown".

## Inputs
- **Candidates:** newest `seo/data/candidates-<date>.json`, the `candidates[]` entry for the path: `path`, `family`, `reasons[]` (`{reason, detail}`), `skill`, `opportunity`, `metrics` (`clicks28d`, `impressions28d`, `ctr28d`, `position28d`), `indexClass`, `editableSource`, `cooldownUntil` and `topQueries[]`. Also read `reportOnly[]`, which lists fenced sources.
- **Index status:** `seo/data/index-status.json` `urls`, keyed by full URL (`urls["https://usetruecap.com<path>"]`). Fields: `coverageState`, `lastCrawlTime`, `firstSeenInSitemap`, `everIndexed`, `referringUrls[]`, `wordCount`, `uniqueRatio`, `thin`, and `history[]` (`inspectedAt`, `coverageState`, `indexed`).
- **Crawl:** newest `seo/data/crawl-<date>.json`. From `pages[]`, the record with this `path`: `status`, `wordCount`, `uniqueRatio`, `thin`, `dateModified`, `inboundContextual`, `inboundTotal` and `textFile` (under `seo/data/`, the rendered main text). Also `linkGraph.edges[]` (`from`, `target`, `anchor`, `placement`). The crawl predates this run.
- **GSC:** `seo/data/gsc-<date>.json`: rows whose `page` is this path in `pages.current[]`, `pages.prior[]` and `weekly.rows[]` (16 weeks).
- **Bing:** `seo/data/bing-<date>.json` `linkCounts` (path → inbound links). It is written only when `BING_WEBMASTER_API_KEY` is set.
- **Similarity:** `seo/data/similarity-<date>.json` `pairs[]` (`a`, `b`, `score`, `scope`) that name the path, and `node seo/scripts/similarity.ts --path <path>` (`top[]`, `mergeInto`, `mergeAbove`).
- **Run flags and brakes:** `seo/data/run-flags.json` (`date`, `calibrating`, `indexed`, `sitemapPaths`, `activeHoldout`, `caps.noindexPerRun` (0 while calibrating, else floor(0.05 × `indexed`)), `caps.pagesChangedPerRun`); newest `seo/data/brakes-<date>.json` (`demotedChangeTypes[].changeType`).
- **Config:** `seo/config.json` `thresholds.prune`, `thresholds.similarity.mergeAbove`, `excludedFromOptimization`, `gates.pruneTierDuringCalibration`.
- **Repo (read only):** `content/seo/noindex.json`; the F2 reader (`grep -rln "noindex.json" app lib proxy.ts lib/__tests__`) and every file that imports it; `lib/markets/indexability.ts`; the guard tests in gate 3.

## Steps
1. **Dataset preconditions.** Skip every prune candidate this run (same reason each) if one of these holds:
   - `content/seo/noindex.json` does not exist: "noindex list not ready (F2)".
   - The grep finds no reader in the sitemap code or in `proxy.ts`: "noindex list not wired (F2)". A list nothing reads removes nothing.
   - The reader feeds the body of a page other than the listed path (a related-links block, hub list or state guide that drops listed paths). Since F9 it does, on purpose: `lib/seo/link-policy.ts` (imported by `RelatedBlogPosts`, `RelatedContent`, the topic hubs, the /blog, /markets, /states and /glossary hubs, and the city pages' state-guide and nearby-market links via `lib/markets/nearby.ts`) drops every listed path, so a noindex addition re-renders each page that linked the path through one of those blocks, and verify-build's render diff fails a loop patch on those undeclared pages. So every prune is tier 2 ("noindex list renders on other pages"): run steps 2–5, then file the path in the prune issue (step 6) and edit nothing. Robots metadata on the listed page itself would be fine: that page is declared.
   - An existing entry is NOT expected in `run-flags.sitemapPaths`: `app/sitemap.ts` drops every listed path, and verify-static's `checkContentJson` checks sitemap membership only for the paths a run adds.

   **Guard pins by family.** The model job cannot run vitest, so check these by reading. A match sends that family's prunes to the tier-2 issue only:
   - Grep `lib/markets/indexability.ts` for an import of the F2 reader or for `noindex.json` (`NOINDEX_FOLLOW` is already there and does not count). If it reads the list, and `lib/__tests__/markets-indexability.test.ts` references neither, the test still asserts `isMarketIndexable` true for every `MARKET_CITIES` slug and pins `getIndexableMarketSlugs()` to every slug with a HUD row. Every `market-city` prune gets "guard pins markets-indexability.test.ts".
   - Grep `lib/__tests__/seo-guards.test.ts` and `lib/__tests__/sitemap-uniqueness.test.ts` for an assertion that every `BLOG_POSTS` slug (or every `app/blog/<slug>`) appears in the sitemap. If one exists and its file references neither the F2 reader nor `noindex.json`, every `blog-post` prune gets "guard pins <test>".
2. **Substance first.** A hand-off applies when:
   - **seo-citations**, for `blog-post` and `vs`: the crawl `textFile` states at least one tax or legal rule, form, external number or dataset with no primary-source link.
   - **seo-market-enrich**, for `market-city`: `content/seo/market-facts.json` has no entry for the slug, a null field, or an empty `faq`.

   If `brakes.demotedChangeTypes` lists that skill's change type (`citations`, `market-enrich`), don't invoke it: that is a deferral. Otherwise invoke it with the Skill tool, passing the path, and sort the outcome:
   - **Edited:** this candidate ends. That skill records its own `changes[]` entry.
   - **No substance, go on to step 3:** no hand-off applies (no unsourced claim in `textFile`; the market-facts entry is complete); `family` is `state` or `glossary-term`, which have no hand-off; or the skill ran its fetches and found nothing new that a primary source supports.
   - **Deferred, keep:** skip with "enrichment first: deferred (<the skill's reason>)". This covers a missing F8 file, a pending primary-source domain, a fenced source, a demoted change type, the per-run cap ("market-enrich cap for this run (5)"), `caps.pagesChangedPerRun` reached, cooldown, holdout, a fetch failure and a similarity failure. Every hand-off skip not listed under "no substance" counts as deferred. A deferral does not show that no substance exists.
3. **Keep rules.** Apply the skip list under "When it applies". Sum clicks over every GSC row for the path; any click keeps the page.
4. **Similarity.** Run `node seo/scripts/similarity.ts --path <path>`.
   - A non-zero exit whose error says the page "has no scoreable text after template-chrome removal" means the page is all template text and has no merge target. Continue, and record "no unique text" as the similarity evidence.
   - Any other non-zero exit means nothing was compared. Skip with "similarity check failed".
   - A non-null `mergeInto` means the page duplicates another. That is a redirect or merge, which is tier 2. Add an `issues` entry naming both paths and the score, then skip with "near-duplicate of <mergeInto>: consolidation issue filed". Do not noindex it too.
5. **Inbound links.** List the `linkGraph.edges` whose `target` is the path. These are the links that existed before the run; step 9 finds the ones added during it.
   - If any `from` page's source file is changed in this run (`git status --short`), skip with "linked from a page edited this run". post-deploy.ts `checkPage` checks every internal link on a changed page and reports "links to paths not in the sitemap" as a regression, which reverts the deploy.
   - Every path you add to `content/seo/noindex.json` is a manifest entry with `noindex: true`. seo-weekly step 4 must exclude those entries from its seo-internal-links targets. If it does not, the step 9 grep is the backstop.
6. **Choose the tier** (see Tier). Tier 2 means no edit: add the path to this run's single prune issue with its evidence (step 8 fields) and why it is tier 2, then stop.
7. **Cap.** Count the paths already added to `content/seo/noindex.json` this run (`git diff -- content/seo/noindex.json`). At `caps.noindexPerRun`, skip with "noindex cap for this run (<n>)". Each path also counts toward `caps.pagesChangedPerRun`.
8. **Edit** `content/seo/noindex.json` with Edit.
   - Insert the site path, e.g. `/glossary/x`: leading slash, no host, no trailing slash, query or fragment.
   - The file is `{ "paths": [ … ] }` (lib/seo/noindex.ts refuses any other shape, and the build fails). Keep the `paths` array sorted in plain code-unit order (the order JavaScript's `<` gives) and unique, since verify-static requires `list[i-1] < list[i]`.
   - Keep the file's indentation and trailing newline. Never remove or reorder an existing entry: re-indexing is an owner edit.
   - Record the evidence for the critic and the summary: coverage state with the first and last matching inspection dates; `wordCount` and `uniqueRatio`; impressions and clicks (28 days); the Bing `linkCounts` value; the similarity top score.
9. **Re-check before the manifest.** When the run's other edits are done (after seo-weekly steps 4 and 5), check every pruned path again:
   - Repeat step 5's `linkGraph` check.
   - Grep every file `git status --short --untracked-files=all` lists (page files, `lib/blog-posts.ts`, `lib/blog-topics.ts`, other `content/seo/*.json`), except `content/seo/noindex.json` itself, for the path as a quoted string: the regex ``["'`]/glossary/x["'`#?]`` matches `"/glossary/x"`, `href="/glossary/x"` and `href="/glossary/x#faq"`. The crawl has not seen links added this run, and verify-static accepts them because `run-flags.sitemapPaths` still lists the path.
   - On any hit, remove the path from `content/seo/noindex.json` again and skip it with "linked from a page edited this run".

Never edit the page, its robots metadata, a redirect, `lib/blog-posts.ts` (`available`), `app/sitemap.ts` or `proxy.ts`, and never delete a file. verify-static rejects robots and next/navigation changes ("a noindex goes through content/seo/noindex.json") and deletions ("the loop never deletes a file"). `content-hub-readiness.test.ts` needs ≥ 75 available posts. This skill makes no WebFetch: every fact comes from the data files, and hand-off skills do their own fetches.

## Gate checks
1. **Diff self-check.** Read `git diff -- content/seo/noindex.json` and confirm:
   - the file parses as `{ "paths": [ … ] }`, an array of strings, sorted and unique;
   - only this run's paths were added and nothing was removed;
   - each added path is in `run-flags.sitemapPaths`, and in neither `excludedFromOptimization` nor `activeHoldout`;
   - each added path's crawl `wordCount` is < 600;
   - no string contains `<` or `>`.
2. **verify-static** runs after the model job (a local rehearsal: `node seo/scripts/verify-static.ts --working-tree --base origin/main`). It checks JSON shape, sort order, sitemap membership and exclusions; `cap-noindex` (additions ≤ floor(0.05 × `indexed`)); holdout overlap on the declared URLs; and that the file is declared in the manifest. The added paths become declared URLs and count toward `cap-pages`.
3. **Repo guards.** verify-build runs vitest and a loopback render: only the declared URLs may change, and the sitemap only by declared noindexes. Keep these green:
   - `lib/__tests__/sitemap-uniqueness.test.ts`;
   - `lib/__tests__/seo-guards.test.ts` (sitemap coverage of indexable routes; step 1 pins);
   - `lib/__tests__/markets-indexability.test.ts` (every `MARKET_CITIES` slug indexable, ≥ 150 indexable slugs; step 1 pins);
   - `lib/__tests__/content-hub-readiness.test.ts`;
   - `lib/__tests__/internal-links.test.ts`, `lib/__tests__/internal-glossary-links.test.ts`, `lib/__tests__/internal-link-graph.test.tsx` (no page may link a listed path);
   - the F2 loader's own test.

   If one pins a count or list that the new entry would change, restore the file and skip with "guard pins <test>", plus an issue.
4. **Similarity** (step 4): `mergeInto` is null.
5. **Critic** (tier 1 only). seo-weekly sends `seo-critic` the diff. Give it the step 8 evidence per path and the hand-off outcome, so it can confirm that no substance was available and no click or backlink exists. The critic job has no `seo/data/`: it sees only the manifest `summary` and the page source, and its noindex rule requires a source under ~600 words. On a second REJECT, restore the file and skip each path with the critic's reasons.

## Ledger entry
Add one `changes[]` entry per pruned path, all naming the same file. ledger.ts records a shared dataset one entry per declared path.
```json
{ "path": "/glossary/x", "file": "content/seo/noindex.json", "skill": "seo-prune", "changeType": "prune-noindex", "summary": "…", "newArticle": false, "noindex": true }
```
- `summary` is one factual sentence of evidence and always states the word count and the unique ratio ("ratio n/a" when null), e.g. "Added to noindex.json: crawled, not indexed on 3 inspections 2026-08-10 to 2026-09-21; 412 words, unique ratio 0.31; 4 impressions, 0 clicks in 28 days; 0 Bing backlinks."
- Keeps and skips go in `skipped[]` with their reason. Tier-2 proposals go in `issues[]`.
- The publish job writes the ledger. This skill never does.

## Tier
- **Tier 1:** an addition to `content/seo/noindex.json` while `run-flags.calibrating` is false, within `caps.noindexPerRun`, and only when the crawl `wordCount` is < 600.
  - verify-static tiers it 1 ("dataset or non-module file"). It publishes only with the critic job's APPROVE, and one REJECT drops the whole file, valid entries included.
  - This skill takes the word-count route. The alternative is amending seo-critic's noindex rule to accept `uniqueRatio` < 0.4 from the crawl record and giving the critic job the crawl file. That is an owner change to `.claude/agents/seo-critic.md` and the workflow, and it has not been made.
- **Tier 2, issue only, no edit:**
  - `run-flags.calibrating` is true. verify-static would tier the file `gates.pruneTierDuringCalibration` (2), and `caps.noindexPerRun` is 0.
  - `brakes.demotedChangeTypes` lists `prune-noindex`.
  - Thin only on `uniqueRatio` (`wordCount` ≥ 600): list it with its word count and ratio.
  - A family pinned by a guard (step 1), or a noindex.json fence or guard mismatch (step 1, gate 3).
  - The noindex list renders on other pages (step 1; always true since F9). List, from `linkGraph.edges` whose `target` is the path, the pages that link it: the owner's PR removes every hand-written body link among them, because `lib/__tests__/internal-link-graph.test.tsx` fails on any internal link to a listed path; the registry-driven blocks drop it by themselves.
  - Any deletion, redirect or consolidation (a non-null `mergeInto`).
- **Issue format:** file ONE prune issue per run, `{ "title": "seo-prune: <n> noindex proposals for owner review", "body": "…", "tier": 2 }`. The body lists each path, its step 8 evidence, why it is tier 2, and the line to add to `content/seo/noindex.json`. Consolidation and fence issues are filed separately. Write every issue as plain facts: no pasted query strings and no markup.
