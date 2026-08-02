# SEO automation — what runs, when, and what it can't do

Four moving parts. Two are deterministic scripts with no model in the loop;
two are scheduled Claude runs that open PRs. Nothing publishes without a human
merge.

| # | What | Trigger | Output | Model? |
|---|------|---------|--------|--------|
| 1 | `lib/__tests__/seo-guards.test.ts` | every push + PR (inside `npm test`) | CI pass/fail | no |
| 2 | `.github/workflows/seo-healthcheck.yml` | Mondays 13:00 UTC | one GitHub issue, updated in place | no |
| 3 | `.github/workflows/seo-content.yml` | Tuesdays + Fridays 14:00 UTC | a draft blog post as a PR | yes |
| 4 | `.github/workflows/seo-visibility.yml` | 1st of the month, 15:00 UTC | a dated snapshot in `docs/seo/visibility/` as a PR | yes |

## Cost

The two model-backed jobs are the only things here that cost money. First
measured runs came in around **$3.50 each on the action's default model**, which
at the original cadence (2 content + 1 visibility per week) extrapolated to
roughly $45/month.

What changed on 2026-08-02, after that first bill:

| Lever | Before | After | Why |
|---|---|---|---|
| Content model | action default (Opus-class, $5/$25 per MTok) | `claude-sonnet-5` ($2/$10 intro, $3/$15 after) | ~2.5x cheaper for prose the guards already gate |
| Content max-turns | 60 | 40 | The first successful run finished well inside 40 |
| Visibility model | action default | `claude-haiku-4-5` ($1/$5) | Ten fixed searches and a templated diff — mechanical work |
| Visibility max-turns | 50 | 30 | Same reason |
| Visibility cadence | weekly | monthly | See the schedule comment in the workflow — its own first report argued weekly snapshots of a slow signal record noise |

Expected after: roughly **$10-15/month**, dominated by the two weekly content
runs. Treat that as an estimate with wide error bars — it comes from a
two-run sample.

**Set a hard spend limit.** Estimates are not a control. Anthropic Console →
Settings → Limits → set a monthly cap. That is the only thing that actually
stops a runaway bill; everything in the table above just makes a runaway less
likely.

If content quality drops noticeably on Sonnet, put `--model claude-opus-5`
back in `seo-content.yml` and drop to one post a week instead — same spend,
and one good post beats two thin ones. If the monthly visibility report gets
noticeably worse on Haiku, move that one to `claude-sonnet-5`; it is a cheap
change because the job runs twelve times a year.

---

## Setup (one secret, one time)

Workflows 3 and 4 need an Anthropic API key:

```
Repo → Settings → Secrets and variables → Actions → New repository secret
Name:  ANTHROPIC_API_KEY
Value: sk-ant-…
```

Until that secret exists those two workflows fail on their first step and the
other two keep working. That's deliberate — the deterministic guards should
never depend on an API key.

Rough cost: 8–10 content runs plus 4 visibility runs a month. Each content run
is a long agentic session (research, write, run the test suite, iterate).

---

## 1. Source guards — `lib/__tests__/seo-guards.test.ts`

Runs inside `npm test`, so it's already wired into CI. Covers everything
decidable by reading source, which is where you want these checks: cheaper
than a crawl, and it *blocks* the regression instead of reporting it next
Monday.

**Hard gates** (fail on any violation — each was fully fixed in the PR that
introduced its gate, so they start green):

- no HTML entities in `metadata.title` / `metadata.description`
- `llms-full.txt` declares a formula for every `CALCULATOR_REGISTRY` slug, and
  none for a tool that no longer exists
- every indexable page declares `alternates.canonical`
- every indexable route is referenced by `app/sitemap.ts`
- legacy stubs use `permanentRedirect` (308), not `redirect` (307)

**Ratchets** (compare against `docs/seo/guard-baseline.json`, fail only when
debt grows):

- SERP title length (≤50 chars pre-template)
- meta description length (≤165 chars)
- blog internal linking — ≥3 glossary, ≥1 market, ≥1 tool, ≥2 sibling posts
- FAQPage JSON-LD coverage

### Why ratchets and not gates

The 2026-08-02 baseline found 68 of 69 posts under the internal-linking
standard and 45 descriptions over length. A hard assertion on that is red
forever, and a permanently red test gets skipped or deleted within a month —
at which point it protects nothing. So the baseline records today's debt and
CI only asserts it doesn't grow.

**A new blog post is held to the standard outright.** The baseline covers
posts that predate the guard; it is not a free pass for new content.

### Paying debt down

Fix some posts, then bank it:

```bash
node scripts/seo/guard-baseline.mjs            # report only
node scripts/seo/guard-baseline.mjs --write    # bank the improvement
```

`--write` **refuses to record a regression.** The numbers only move the right
way. Do not hand-edit `guard-baseline.json` to silence a failing test — if a
guard fails on new content, the content is what's wrong.

---

## 2. Live health check — `scripts/seo/healthcheck.mjs`

Crawls production for the things that only exist after render or deploy.
Dependency-free, so the workflow skips `npm ci` and finishes in well under a
minute.

- every sitemap URL returns 200
- canonicals point at `https://usetruecap.com`, not a preview hostname
- `*.vercel.app` aliases serve `X-Robots-Tag: noindex`
- exactly one `<h1>` per URL
- required JSON-LD `@type`s per route family
- no two URLs ship an identical FAQPage block
- legacy stubs answer 308
- no entity leakage in the rendered meta description

Run it yourself any time:

```bash
node scripts/seo/healthcheck.mjs                    # full crawl of prod
node scripts/seo/healthcheck.mjs --limit 40         # fast sample
node scripts/seo/healthcheck.mjs --base https://…   # a preview deploy
```

Only **high**-severity findings fail the run. Medium and low become issue
content — a job that goes red for a missing `og:image` is a job you learn to
ignore.

Findings land in a single issue titled *"SEO health check — live site
findings"*, updated in place each week and closed automatically on a clean
run.

---

## 3. Content — `.github/workflows/seo-content.yml`

Two posts a week, Tuesday and Friday, each as a PR.

### On the cadence

Google does not penalise publishing frequency. It penalises thin, templated,
low-value pages — and the fastest way to produce those is to demand more posts
per week than a site can write properly. Two is a rate that sustains worked
numbers, resolving internal links, and a real FAQ per post.

If you want more volume, add **breadth** — new `/tools`, `/vs`, or
market+strategy pages — rather than more blog posts per week. Note that
`/markets/*` is already 39% of the sitemap at a median 43 words of unique
prose per city, so that particular lane wants depth before it wants more URLs.

### Topic selection

Strictly top-down through `docs/seo-content-backlog.md`. That file exists
because the 2026-07-15 audit found roughly a third of earlier posts targeted
invented phrasings with no search demand. The run checks the item off in the
same commit that ships the post.

The run is allowed to **skip** an item — if the SERP turns out to be all
lender lead-gen or a proprietary-data moat, it records why and moves on. A
recorded skip beats a post that can't rank.

At two a week the backlog runs about six weeks. Top it up before it empties,
or the run starts inventing topics — exactly the failure the backlog was
written to prevent.

### What gates it

The run must pass `npx tsc --noEmit` and `npm test` before opening the PR, and
CI runs them again. The internal-linking and title-length guards apply to new
posts with no ratchet relief.

### Hands-off mode (auto-merge)

Off by default. To enable, both of:

1. Settings → General → Pull Requests → tick **Allow auto-merge**
2. Settings → Secrets and variables → Actions → **Variables** tab → New
   repository variable → `SEO_AUTOMERGE` = `true`

Each content PR is then queued to merge **once every required check passes** —
tsc, the full test suite including the SEO guards, and the production build.
It is not an immediate merge; a post that trips a guard sits as an open PR
until someone deals with it. Draft PRs are skipped, because the prompt tells
the run to open a draft when it isn't confident, and that signal shouldn't be
merged past you.

**Read the first two or three PRs before turning this on.** CI can prove a post
compiles, links to pages that exist, and fits the SERP window. It cannot tell
you whether the worked example is arithmetically right, whether a claim about
lender behaviour is true, or whether it sounds like you. Those are the failure
modes that matter on a site whose whole pitch is that the numbers are honest,
and no test catches them.

Off again in one click: delete the `SEO_AUTOMERGE` variable, or set it to
anything other than `true`.

---

## 4. Visibility — `.github/workflows/seo-visibility.yml`

Wednesdays. A fixed ten-query panel plus an off-domain mention sweep, written
to `docs/seo/visibility/<date>.md` as a diff against last week.

**Keep the query panel fixed.** Swapping queries week to week makes the trend
meaningless, which is the only thing this file is for.

The off-domain half is not decoration. The baseline found **zero** third-party
mentions of TrueCap anywhere, while smaller and newer competitors were already
listed on the AlternativeTo DealCheck page. AI assistants recommend what
independent sources corroborate, so mention count is a tracked metric.

---

## What this does not cover

Be clear-eyed about the gaps:

- **Google Search Console data.** Impressions, clicks, average position, and
  the "Crawled – currently not indexed" ratio are the real scoreboard, and none
  of it is reachable without wiring up the GSC API. The visibility job's
  WebSearch panel is a proxy, not a rank tracker — it can tell you "not in the
  first page of results", never "position 14".
- **Whether 150 programmatic `/markets` pages trip scaled-content policy.**
  That's a judgment call. The mechanical proxy is the GSC indexed ratio for
  `/markets/*`, which needs the API above.
- **Backlinks and off-domain placement.** The visibility job counts mentions;
  it does not go get them. Submitting TrueCap to AlternativeTo, G2, and the
  "best rental calculator" roundups is manual work, and on current evidence
  it's the single highest-leverage SEO task available.
- **Core Web Vitals.** Not measured here. Use PageSpeed Insights or Vercel
  Analytics.
- **Editorial judgment.** Two posts a week land as PRs because a model writing
  unreviewed content on your domain is how a site accumulates plausible,
  wrong, and slightly-off-brand pages. Read them.

---

## Turning things off

Each workflow is independent. To pause one, either disable it in the Actions
tab or comment out its `schedule:` block — leaving `workflow_dispatch` so it
can still be run by hand.
