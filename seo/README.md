# TrueCap SEO loop — operator's guide

A weekly, mostly-automated loop that measures the site, makes a few small,
sourced content edits, and opens **one** pull request with a digest.
- How the site itself is built: [ARCHITECTURE.md](ARCHITECTURE.md).
- Every cap, threshold and fence: [config.json](config.json).

## Your week
1. **Read the digest.** One comment lands on the "SEO weekly digest" issue each Monday (one notification). It shows clicks, impressions, indexed count, what changed, what was skipped and why, brake state and next week's candidates.
2. **Review the loop PR** (branch `seo/<run id>`, author Claude) while `SEO_MODE=review`.
   - Merge it or close it.
   - **The loop keeps at most one PR open**: while one is waiting, later runs measure and report but make no new edits.
3. **Request indexing.** The digest lists up to 45 URLs to paste into Search Console → URL Inspection → *Request indexing*. No API can do this, and it is the proven fix for pages that fell out of the index.
4. After you have merged **two** loop PRs, you may set `SEO_MODE=auto`. From then on tier 0–1 PRs merge themselves once CI is green; tier 2 always waits for you.

## Switches (GitHub → Settings → Secrets and variables → Actions → Variables)
| Variable | Effect |
|---|---|
| `SEO_MODE=review` | Open PRs, never merge. The start state. |
| `SEO_MODE=auto` | Auto-merge tier 0/1 after 2 owner-merged loop PRs. |
| `SEO_PAUSED=true` | Stop everything. Also run the **SEO pause** workflow to disarm any queued auto-merge immediately. |
| `SEO_HALT_ACK=<id>` | Clear a halt written by the site-wide brake (the id is in the digest). |

- **Regressions:** an open `seo-regression` issue also halts content edits. `seo-shepherd` opens the revert PR (once per loop PR, ever), and closing the issue resumes the loop.
- **Same-week stops:** the brakes run in the data job. When they apply the site-wide halt or ask for a revert, that same run proposes nothing and arms no auto-merge; the digest says why.

## Tiers (derived from the diff, never from the model's word)
- **Tier 0**: a title/description const or one added internal link.
- **Tier 1**: body, FAQ, citations or a dataset entry. Needs the critic's APPROVE.
- **Tier 2**: research pages, noindex while calibrating, and any change whose type the brakes demoted (loss rate above 40% over at least 10 scored outcomes). Always waits for you.

## What the loop may edit
- Blog posts (`app/blog/<slug>/page.tsx`)
- Comparison pages (`app/vs/<slug>/page.tsx`)
- The blog registry and topics
- `content/seo/*.json` datasets
- Research drafts

Everything else — pricing, terms, privacy, methodology, the analyzer, auth, billing, components, templates, the sitemap and tools — is fenced by `seo/scripts/verify-static.ts` in the workflow and by `build-chain-guard` in CI.

## Workflows
| Workflow | When | What |
|---|---|---|
| `seo-weekly.yml` | Mon 09:41 UTC + manual | The loop: gate → data → model → verify-static → verify-build → critic → publish → open PR → merge (auto mode) → report |
| `seo-deployed.yml` | each Production deploy | Checks the pages a merged loop PR changed (its page files plus the `SEO-URLs:` trailer the publish job writes, so dataset edits are checked too) and files `seo-regression` on failure. On **every** deploy (yours too) it pings IndexNow for the pages whose `content/seo/lastmod.json` date or `noindex.json` entry moved since the previous Production deploy |
| `seo-shepherd.yml` | daily | Re-runs a flaky check once, updates a behind PR, opens revert PRs, deletes old loop branches |
| `seo-pause.yml` | manual | Disarms queued auto-merges now |

## Run state
The `seo-state` branch holds the ledger (`seo/ledger.jsonl`, append-only and hash-chained), `seo/lessons.md`, `seo/reports/`, the URL Inspection cache (`seo/data/index-status.json`) and `seo/data/halt.json`.
- Each run overlays it into place and the report job pushes it back. These paths are gitignored on `main`.
- Sign-up counts never go there: the repository is public. They are on `/admin/seo`.

## Running the toolkit locally
Plain Node ≥22.18, no install needed for most scripts (`verify-static` needs `npm ci` for the TypeScript parser). `node seo/scripts/<any>.ts --help` prints a script's usage and does nothing else; a flag a script does not know (a typo like `--dryrun`) stops it before it writes anything.
```
export GSC_SERVICE_ACCOUNT_FILE=~/.config/truecap/gsc-service-account.json   # never commit it
node seo/scripts/gsc-pull.ts            # Search Analytics → seo/data/gsc-<date>.json
node seo/scripts/gsc-inspect.ts         # URL Inspection (cached, ≤1,500/day) → seo/data/index-status.json
node seo/scripts/crawl.ts               # production crawl + link graph → seo/data/crawl-<date>.json
node seo/scripts/psi.ts                 # PageSpeed per template (needs PSI_API_KEY; keyless hits quota)
node seo/scripts/similarity.ts --pairs  # near-duplicates; --draft <file> checks a draft
node seo/scripts/score.ts               # ranked candidates → seo/data/candidates-<date>.json
node seo/scripts/ledger.ts query        # the change ledger; score-outcomes, verify-chain, …
node seo/scripts/brakes.ts              # regression/brake decisions
node seo/scripts/report.ts --dry-run    # print this week's digest
node seo/scripts/verify-static.ts --working-tree --base origin/main   # fence your own branch
node seo/scripts/<any>.ts --self-test   # offline checks
```

## Secrets
| Secret | Status |
|---|---|
| `ANTHROPIC_API_KEY`, `GSC_SERVICE_ACCOUNT_JSON` | In place. |
| `PSI_API_KEY` | Optional; free from Google Cloud. |
| `BING_WEBMASTER_API_KEY` | Optional; enables backlink counts for pruning. |

The dollar cap is the Anthropic Console's monthly spend limit, plus `--max-budget-usd` per run (about $3–4 a run).

## Honest expectations
- At ~3,000 impressions a month, GSC outcomes are noise. The digest labels them *directional*, and rollback keys on deterministic checks instead.
- The GSC-driven skills (striking distance, CTR, refresh, prune, gap articles) report themselves **dormant** until traffic supports them.
- Early weeks are links, citations, market enrichment and re-inspection.
