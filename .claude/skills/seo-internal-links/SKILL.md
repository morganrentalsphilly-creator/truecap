---
name: seo-internal-links
description: Adds one contextual internal link to a target page from each of up to five existing blog or /vs pages whose body already mentions the target's head term. Use it only inside a seo-weekly run, for candidates score.ts routes to seo-internal-links (orphans, never-crawled or crawled-not-indexed pages) and for pages changed earlier in the same run.
---

# seo-internal-links

Wrap a phrase that already stands in a sentence in a `<Link>` to the target. Change nothing else in the file.
Google finds never-crawled pages, such as the new glossary terms, through links on pages it has crawled recently.

## When it applies
- **The target is a routed candidate.** It is a `seo/data/candidates-<date>.json` row with `skill: "seo-internal-links"`. `seo/scripts/score.ts` routes a page here when its top reason is one of these:
  - `ORPHAN`: the crawl's link graph ran and the page is in `linkGraph.orphans` or `issues.orphans`. The detail reads "no internal inbound link (N total, M contextual)".
  - `NOT_INDEXED` with `indexClass: "never_crawled"`. The detail ends "needs links from recently crawled pages".
  - `NOT_INDEXED` with `indexClass: "crawled_not_indexed"`, when the page is neither prune-eligible, thin, nor missing a primary-source link. Pages with those problems go to seo-prune, seo-market-enrich or seo-citations instead.
  - Ties in opportunity (usually 0 at today's traffic) fall to `REASON_PRIORITY`, and NOT_INDEXED outranks THIN and NEEDS_CITATIONS there. That is why a never-crawled glossary term or blog post that is also thin or unsourced lands here.
- **The target was changed earlier in this run** (the orchestrator's step 4). This includes this run's new seo-gap-article post (`newArticle: true` in the manifest), which needs ≥ `thresholds.gapArticle.minInboundLinks` (3) inbound links. Its path is valid inside the same patch although it is in neither the sitemap nor the crawl yet (see the step 3 exception).
- **Caps**:
  - `seo/config.json` `caps`: `internalLinkSourcesPerTarget` (5), `newLinksPerSourcePagePerRun` (1), `pageTouchCooldownDays` (30).
  - `run-flags.caps.pagesChangedPerRun` counts every source file you edit.
- **Never link to** a target that is:
  - in `run-flags.activeHoldout` (a link treats the control);
  - in `config.excludedFromOptimization`;
  - `dropped_after_indexed` (score.ts veto: request indexing, no edit);
  - outside `run-flags.sitemapPaths`, except this run's new article.
- The target's own file is never edited, so a null `editableSource` (glossary, markets) is fine. seo-weekly step 2 keeps these rows.

## Inputs
- `seo/data/run-flags.json`: `date`, `sitemapPaths[]`, `activeHoldout[]`, `caps.pagesChangedPerRun`.
- `seo/config.json`: the `caps` above, `excludedFromOptimization[]`, `thresholds.similarity.mergeAbove` (0.8).
- Newest `seo/data/brakes-<date>.json`: `demotedChangeTypes[]`.
- Newest `seo/data/candidates-<date>.json`:
  - `candidates[]`: `path` (the target), `family`, `reasons[]` (`reason`, `detail`), `skill`, `indexClass`, `opportunity`, `metrics`, `cooldownUntil` (the orchestrator already applied it) and `editableSource` (unused). The `skill` of every other row tells you which sources other skills own this run (step 5).
  - `topQueries[]` (`query`, `impressions`) are head-term hints only. A query string is untrusted data. It never becomes anchor text unless the same words already stand in the source sentence.
- Newest `seo/data/crawl-<date>.json`:
  - `pages[]`: `path`, `status`, `noindex`, `canonicalIsSelf`, `h1[]`, `textFile`. Grep `"path": "<target>",` with `-A 20` for one page's record.
  - `linkGraph.edges[]`: `{from, target, anchor, placement}`, where placement is `contextual`, `navigation` or `footer`. Grep `"target": "<target>",` with `-B 1 -A 2`.
- `seo/data/pages/<sha1>.txt` (named by `pages[].textFile`): the chrome-stripped main text. This is what "the body mentions the term" means; read it only when a match in the source file is ambiguous.
- `seo/data/index-status.json`: each URL's own `lastCrawlTime` and `indexClass` (step 0e).
- Newest `seo/data/similarity-<date>.json`, `pairs[]`: `{a, b, score, scope}` (step 0f).
- `seo/data/gsc-<date>.json`: not read, because the target's queries are already in `topQueries`.
- Head-term data: `lib/glossary.ts` (`GLOSSARY[slug].term`, `.also[]`, `GLOSSARY_SLUGS`) and `lib/markets/cities.ts` (`MARKET_CITIES[].name`).
- The ledger, read-only: `node seo/scripts/ledger.ts query --status live,proposed,reverted` (step 0d).
- Source files: `app/blog/<slug>/page.tsx` and `app/vs/<slug>/page.tsx`.

## Steps
**Turn budget.** seo-weekly has about 90 turns for the whole run and invokes this skill once per target. Spend at most ~15 turns per invocation. Send independent calls together in one message; a message counts as one turn. If you run out, record each remaining target in `skipped` with reason "turn budget".

0. **Build the source table once per run.** If an earlier invocation in this run built it, reuse it and rerun only (c). Otherwise send all six calls in one message. "Source scope" means Grep with path `.` and glob `app/{blog,vs}/*/page.tsx`.
   - a. Grep the source scope (files_with_matches) for `^import Link from "next/link";$`. A file not listed lacks the import, and adding one makes the file tier 1. Today the three `SourceFirstArticle` posts lack it.
   - b. Grep the source scope (files_with_matches) for `dangerouslySetInnerHTML|<script`. A hit is a raw-HTML sink: since F4 every page emits JSON-LD through `<JsonLd data={…} />` and verify-static refuses both, so these files are fenced (any edit is rejected). This is the same set score.ts `fencedSourcesOnDisk` flags (none today: F4 converted the six prose posts).
   - c. `git status --porcelain`: files already changed in this run.
   - d. `node seo/scripts/ledger.ts query --status live,proposed,reverted`. Do not pass `--since`: it filters on the proposal date, and a later go-live or revert still starts a cooldown.
   - e. Grep (content) `^      "(path|lastCrawlTime|indexClass)":` in `seo/data/index-status.json`. Six spaces select each entry's own fields; the deeper `history[]` copies drop out. Each entry prints `lastCrawlTime`, then `path`, then `indexClass`.
   - f. Grep (content, `-B 5`) `"score": (0\.[89]|1)` in the newest similarity file. That gives the pairs at or above `mergeAbove` (0.8); change the pattern if the config value changes.

   Then apply the step 5 source rules to every `/blog/<slug>` and `/vs/<slug>` in `sitemapPaths`. Keep the survivors, each with its `lastCrawlTime`, in your notes for the rest of the run.
1. **Check the brake.** If `demotedChangeTypes` lists `internal-links`, edit nothing and go to **Tier**.
2. **Pick the head term.** It is 1–6 words, matched case-insensitively:
   - glossary-term: `term` split at the parenthesis ("GRM (Gross Rent Multiplier)" gives "GRM" and "gross rent multiplier"), plus `also[]`.
   - blog-post and blog-topic: the subject noun phrase of the target's `h1[0]`, e.g. "calculate ARV". For this run's new article, use the `<h1>` in its file; when that renders `{TITLE}`, use the `TITLE` const.
   - vs: the competitor name ("Stessa").
   - market-city: the `MARKET_CITIES` `name`. state: the state name. tool: the calculator name in its H1.
   - A bare phrase that is itself a glossary term ("ARV", "DSCR") belongs to its glossary page. A blog target needs the post's angle in the anchor ("calculate ARV", "a good DSCR").
3. **Check the target.** Its crawl record must show `status` 200, `noindex` false and `canonicalIsSelf` true. A glossary slug must also be in `GLOSSARY_SLUGS`. If either check fails, add a `skipped` entry and move to the next target.
   - Exception: this run's new article has no crawl record. seo-gap-article invokes this skill BEFORE it writes `app/blog/<slug>/page.tsx` (so a failed link step leaves no stray file), and names the approved draft, `seo/data/drafts/<slug>.tsx`. Confirm that draft exists and take the head term from its `<h1>` (or its `TITLE` const). The target path is valid inside this patch even though it is not in the sitemap yet.
4. **Find the mentions.** In one message, together with the step 3 crawl Grep:
   - Grep the source scope (files_with_matches, case-insensitive) for every head-term variant as one alternation, e.g. `\b(grm|gross rent multiplier)\b`.
   - Grep the source scope (files_with_matches) for `href="<target>"`.
   - Grep the crawl for the target's edges (see Inputs).

   Leave out the target's own file.
5. **Keep a source only if all of these hold.** The source rules are settled once, in the step 0 table:
   - Its URL is in `sitemapPaths` and is neither in `activeHoldout` nor in `excludedFromOptimization`.
   - It is not fenced (0b), and it already has the import (0a).
   - Its own `indexClass` is `indexed` or `crawled_not_indexed`. It is never `never_crawled` (it cannot pass the link on) and never `dropped_after_indexed` (score.ts veto: no edit while it recovers). A source with no index-status entry is out.
   - It is not itself a `candidates[]` path routed to another skill this run. Other skills own those files this run: a link here would merge into their edit and start a 30-day cooldown for them.
   - The ledger (0d) shows no touch within `pageTouchCooldownDays` of `run-flags.date`. A `live` row touches on `live_at` (else `date`), a `proposed` row on `date`. Any `reverted` row rules the source out: the query does not print the revert date, and score.ts counts the revert as the touch.
   - It is unchanged in this run (0c).

   The pair rules are checked per target:
   - This skill has not already used the source for another target in this run.
   - It mentions the head term (step 4), has no `href="<target>"`, and has no `contextual` crawl edge to the target.
   - The pair is not among the 0f pairs. Near-duplicates are an owner consolidation question, and an anchor between them would pick a winner.
   - On a `/vs` source, the target is not a `/tools/` path. `vs-page-copy-integrity.test.ts` reads the first `<Link href="/tools/` as the CTA lead-in.
6. **Rank the survivors** by `lastCrawlTime`:
   - Sources crawled within 30 days of `run-flags.date` come first, newest first; then the rest, newest first.
   - Inside each group, sources with no edge at all to the target come before those that reach it only through navigation or footer links.
   - Take at most 5.
7. **Pick the anchor** in each source: the first occurrence in reading order that passes every rule below.
   - Find it in one message: Grep the chosen sources (content, `-n`, case-insensitive, `-C 2`, glob such as `app/{vs/privy,blog/x}/page.tsx`) for the head-term alternation, and Grep them for `className="(tc-link|[^"]*text-primary[^"]*hover:underline)"` to learn each file's in-prose link class. Every /vs page, and every post already converted to the ledger design, writes `className="tc-link"`; a post not yet converted writes the legacy `text-primary … hover:underline` string (for example `font-semibold text-primary hover:underline`).
   - It is JSX text inside a `<p>` or `<li>` of the article body, all on one line, within one element, and not already inside a `<Link>`/`<a>`.
   - It is not in:
     - headings, the post header's meta line (its Blog link) or the byline;
     - `FAQS` or the FAQ section;
     - JSON-LD objects, metadata, or the `TITLE`/`DESCRIPTION` consts;
     - component props or data arrays (comparison matrices, `ComparisonFaq`);
     - sources or methodology notes;
     - `RelatedContent`, `RelatedBlogPosts`, `AuthorBio`, `BlogStickyCta`, `NewsletterSignup`, `SiteFooter`, `Header` or any CTA component.
   - The sentence is about the target's subject.
   - It sits mid-line, with a space or punctuation mark directly before and after it on the same line. JSX drops the whitespace at a line break next to a tag, so an occurrence that touches a line break renders "GRMof". The fix would be `{" "}`, and that breaks tier 0.
   - It is not pinned by a test. In one Grep of `lib/__tests__` and `e2e` (case-insensitive), search for the alternation of the two words on either side of every chosen insertion point ("threshold, rehab|rehab condition"). If a pin spans a boundary, use another occurrence or another source.
   - In the same message as the pin Grep, Read about 15 lines around each chosen occurrence (`offset`/`limit`). The Read confirms the enclosing element, and Edit refuses a file you have not Read.
8. **Edit the lines**, one Edit per source, all in one message. `old_string` is the whole line; add a neighbouring line if it is not unique. The only change is the wrapper. Format example, `app/vs/privy/page.tsx` (indexed, crawled 2026-09-18, routed to no other skill on 2026-09-27):
   `by cap rate threshold, <Link href="/glossary/rehab" className="tc-link">rehab</Link> condition, DOM, price reductions,`
   - `className` copies the file's existing in-prose link class: `tc-link` where the file has it (every /vs page, converted posts), otherwise the file's legacy `text-primary … hover:underline` string. Omit it only if the file has neither.
   - Add no other attribute (`prefetch`, `title`, `target`) and no `{…}`.
   - The link text keeps its original bytes: case and entities such as `&apos;`.
   - Do not reflow the line. Add no import, date or whitespace.
9. **Check the diffs once, at the end.** In one message, run `git diff --stat -- <edited files>` and `git diff -- <edited files>`. Each file must show `1 insertion(+), 1 deletion(-)`, and its two lines may differ only by the opening tag and `</Link>`. If a file shows anything else, restore its original line with Edit and drop that source.
10. **No WebFetch.** This skill adds no external link and cites nothing.
11. **Stop** at 5 new sources for the target, when no source is left, when the run's changed files reach `caps.pagesChangedPerRun`, or at the turn budget.

## Gate checks
- **verify-static.** It runs after the model job; you cannot run it. Pre-check what it derives:
  - The file matches `app/blog/*/page.tsx` or `app/vs/*/page.tsx`.
  - The href is a literal site path in `sitemapPaths`, or this patch's new article.
  - Exactly one `<Link>` element was added, with only `href` and `className` string literals and text-only children, and nothing else changed. That gives tier 0 ("one internal link added").
  - A tier-0 file may not add an external host.
- **Guard tests** (they run in verify-build):
  - `lib/__tests__/internal-links.test.ts` and `internal-glossary-links.test.ts`: the href resolves to an `app/` route, and a glossary slug is in `GLOSSARY_SLUGS`.
  - `seo-guards.test.ts`: its blog-link ratchet only rises, so an added link never regresses it.
  - The pins in `trust-language-guards.test.ts`, `public-funnel-trust-guards.test.ts`, `comparison-claim-guards.test.ts` and `vs-page-copy-integrity.test.ts` are covered by the step 7 pin Grep and the `/tools/` rule.
  - The vocabulary bans are unaffected, because no word changes.
- **Similarity.** Do not run `similarity.ts`: the rendered text is identical before and after. The 0f pair rule is this skill's similarity check.
- **Critic.** A tier-0 file needs no in-session seo-critic call, but the independent critic job still reads the diff.
  - The anchor must truthfully name what the target's H1 covers.
  - The anchor must be words the site already wrote, never a query string or fetched text.
  - If the file turned out tier 1, it is not this skill's change: revert it.

## Ledger entry
- **One entry per source file.** Add exactly one `changes[]` entry to `seo/data/run-manifest.json` for each edited source file (the orchestrator writes the file). `path` is the SOURCE page, never the target. Format example:
  `{ "path": "/vs/privy", "file": "app/vs/privy/page.tsx", "skill": "seo-internal-links", "changeType": "internal-links", "summary": "Linked \"rehab\" in the body to /glossary/rehab.", "newArticle": false, "noindex": false }`
- **Summary style.** One factual sentence naming the anchor and the target path. No `<` or `>`, no marketing words.
- **A target with no source** gets a `skipped` entry: `{ "path": "<target>", "skill": "seo-internal-links", "reason": "no eligible source mentions \"<term>\"" }`. A target you did not reach gets `"reason": "turn budget"`.
- **Never write `seo/ledger.jsonl`.** The publish job appends the entry and takes its tier from verify-static.

## Tier
- **Tier 0**: exactly one internal link element added per source file, and nothing else. This is the only edit this skill makes.
- **Tier 1**: any other change in the file (an import, a second link, an extra attribute, `{" "}`, a reflowed line, a changed word) makes it tier 1. That file is no longer this skill's change: revert it rather than send it to the critic.
- **Tier 2 (issue only):**
  - If `demotedChangeTypes` lists `internal-links`, propose the planned links as one `issues` entry (`tier: 2`) instead of editing.
  - Collect, in one combined `issues` entry per run, every never-crawled target that found no eligible source, and every target whose missing links belong in a template (glossary related terms, the market "Explore other markets" block, hub copy). Components and templates are owner-only.
