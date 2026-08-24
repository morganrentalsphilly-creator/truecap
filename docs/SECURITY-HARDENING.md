# Security hardening — settings Morgan has to change by hand

Everything in this file is a GitHub, Vercel or Supabase *settings* change.
Code cannot do them.

**Status as of 2026-08-03:**

| # | Step | Status |
|---|------|--------|
| 1 | Branch protection on `main` requiring `build-chain-guard` + `check` | ✅ **DONE 2026-08-03.** Classic protection, `enforce_admins: false` (owner direct pushes to `main` still work, which is how this repo deploys), force-push and deletion blocked. Verified: `contexts` = `["build-chain-guard","check"]`. It is demonstrably binding — Dependabot PRs #10 and #18 sit unmergeable with `build-chain-guard` red. |
| 2 | `SEO_AUTOMERGE` | ⛔️ **DECLINED — automerge stays ON by founder decision.** See §2, rewritten. |
| 3 | Review the `esaleci` account | ⏳ **OWED.** |
| 4 | Narrow the agent's tool scope | ⏳ **OWED** (4a/4c); 4b shipped. |
| 5 | Vercel | ⏳ **OWED**, and the important part changed — see §5. The control that matters is **scoping secret env vars to Production only**, not the Ignored Build Step. |
| 6 | Pin `claude-code-action` to a SHA | ⏳ **OWED.** |
| — | **Rotate every secret** | 🚨 **OWED, still the top item.** Verified 2026-08-03: the old `SUPABASE_SERVICE_ROLE_KEY` still authenticates. |
| — | Apply `docs/apply-pending-migrations-2026-08-03.sql` | 🚨 **OWED.** Verified 2026-08-03: anon can still LIST the `analysis-pdfs` bucket. (The bucket itself is private — downloads and signed URLs are denied.) |

Step 1 being done is what makes the code half mean anything: an unrequired
status check blocks nothing, and until 2026-08-03 that is what these were.

Owner: `morganrentalsphilly-creator` · Repo: `morganrentalsphilly-creator/truecap` (public)

---

## Why — the two facts that make this urgent

**2026-06-01.** Commit `15eb1b5`, "Distribution batch: 13 blog OG images +
SoftwareApplication schema + /search route + 404 recovery + font hints",
touched 34 files. Thirty-three were what the message said. The thirty-fourth
was `postcss.config.mjs`, carrying a blockchain-C2 loader. `postcss.config.mjs`
is loaded by `next build`, so it ran on **every Vercel production build** with
`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`RESEND_API_KEY`, `CRON_SECRET` and `SENTRY_AUTH_TOKEN` in the environment.
It survived six weeks and every CI gate — `tsc`, `vitest` and `next build` all
pass on a malicious build config, by construction. Removed 2026-07-14 in
`ab02311`.

**2026-08-02.** The same write surface is now automated:

- `.github/workflows/seo-content.yml:67` grants the agent
  `Read,Write,Edit,…,Bash(git:*),Bash(gh pr:*)` with **no path allowlist**
  (there is no `.claude/settings.json` in the repo, no `--add-dir`,
  no `--permission-mode`), and `permissions: contents: write` at lines 34-37.
- The prompt at lines 86-93 tells the run to WebSearch its target query and
  read the pages that currently rank. `seo-visibility.yml` searches Reddit and
  listicles. Those pages are written by strangers. That is untrusted input
  arriving in the same context window as the instruction to write files.
- `main` had **no branch protection and no rulesets** —
  `GET /branches/main/protection` returned 404, `GET /rulesets` returned `[]`.
- Actions variable `SEO_AUTOMERGE=true`, `allow_auto_merge=true`. PR #17
  (author `app/claude`) merged **19 seconds** after its CI run started — a run
  that does `npm ci` + tsc + vitest + `next build`. The auto-merge comment in
  `seo-content.yml:151-154` and `docs/seo/AUTOMATION.md:4` both claim merges
  wait for required checks. With zero required checks, they wait for nothing.

So: a Reddit comment → the agent's context → `postcss.config.mjs` → production
secrets, with no human in the loop. That is the June incident with the manual
step automated away.

**CLAUDE.md §8 is not a control.** It is a paragraph of English inside the same
context window the injection lands in, and it does not even name the build
config files. The steps below are the actual controls.

---

## 1. Branch protection on `main`, with the guard as a required check

This is the load-bearing step. Do it first.

### Option A — UI (recommended: repository ruleset)

1. Go to **https://github.com/morganrentalsphilly-creator/truecap/settings/rules**
2. **New ruleset → New branch ruleset**
3. **Ruleset Name:** `main protection`
4. **Enforcement status:** `Active`
5. **Bypass list:** click **+ Add bypass** → **Repository admin** → set the mode
   to **Allow for pull requests only**.
   (Keeping yourself on the bypass list means a solo founder never gets locked
   out. `app/claude` and `github-actions` are *not* admins and get no bypass.)
6. **Target branches:** **+ Add target** → **Include default branch**
7. Tick these rules, and only these:
   - ☑ **Restrict deletions**
   - ☑ **Block force pushes**
   - ☑ **Require linear history**
   - ☑ **Require a pull request before merging**
     - Required approvals: **0**
       (GitHub will not let you approve your own PR; on a solo repo any
       non-zero number means you can never merge your own work. The gate here
       is the status checks, not a rubber-stamp review.)
     - ☑ **Dismiss stale pull request approvals when new commits are pushed**
   - ☑ **Require status checks to pass**
     - ☑ **Require branches to be up to date before merging**
     - **+ Add checks** → type each of these exactly and select it:
       - `build-chain-guard`
       - `check`
8. **Create**

Both names must match exactly — they are the *job ids* in
`.github/workflows/ci.yml`. If the search box shows nothing, open any PR first
so GitHub has seen the check names once, then come back.

### Option B — CLI (classic branch protection)

Equivalent, if you would rather not use the UI. `restrictions` must be `null`
because the repo is owned by a user account, not an org.

```bash
gh api -X PUT repos/morganrentalsphilly-creator/truecap/branches/main/protection \
  -H "Accept: application/vnd.github+json" \
  --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["build-chain-guard", "check"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_linear_history": true,
  "required_conversation_resolution": true,
  "block_creations": false
}
JSON
```

### Verify it took

```bash
# should print the two contexts, not a 404
gh api repos/morganrentalsphilly-creator/truecap/branches/main/protection \
  --jq '.required_status_checks.contexts'

# effective rules from every source (classic + rulesets + org)
gh api repos/morganrentalsphilly-creator/truecap/rules/branches/main
```

If the first command prints `["build-chain-guard","check"]`, the guard can
finally *block*: a PR that changes `postcss.config.mjs`, `next.config.mjs`,
`package.json`, `.github/**`, `.claude/**`, `scripts/**`,
`supabase/**`, `app/api/**` or the other guarded paths, and was not
authored by you, cannot be merged — short of your own admin bypass, which the
ruleset in step 1 keeps deliberately. If it 404s, nothing has changed and you
should not move on.

Say that precisely, because the imprecise version of this sentence has been
wrong twice. **Required checks do not close the build-config route on their
own.** They make one job's exit code binding. Whether that job is *right* is a
separate question with its own history: as shipped on 2026-08-02 it computed the
changed-file list with `git diff --name-only`, which C-quotes non-ASCII paths,
so a PR adding `.github/workflows/évil.yml` passed it. That is fixed
(2026-08-03, see "What the code half already does"), but the shape of the bug is
the point — a path rule is only as good as its parsing, and it sits alongside
the integrity manifest and your own reading of the diff rather than replacing
either.

That is **one route, not the attack surface**. Read the next section before you
tick anything off.

---

## ⚠ What step 1 does *not* close: `app/blog/**` and `lib/blog-topics.ts` are build-executed

Blog posts in this repo are not markdown. `app/blog/<slug>/page.tsx` is a **TSX
server component module** — it `import`s from `@/lib` and `@/components`,
exports a `metadata` object and a default component (see
`app/blog/1-percent-rule-rental-property/page.tsx`). `next build` statically
renders every one of them, which means **two** things execute on the Vercel
builder:

1. the module's top-level code, and
2. the body of the exported server component.

Both run with `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `CRON_SECRET` and
`SENTRY_AUTH_TOKEN` in the environment. **That is the same terminus as
`postcss.config.mjs`** — the June 2026 file. A `fetch()` in a blog post's
component body reaches production secrets exactly as well as a `require()` in a
PostCSS config did.

**`lib/blog-topics.ts` is the same file class**, and it is easy to miss because
it is not under `app/`. It is imported by `app/blog/page.tsx`,
`app/blog/topics/page.tsx`, `app/blog/topics/[topic]/page.tsx` and
`app/sitemap.ts` — all statically rendered — so it executes on the builder with
the same environment. Step 4a's allowlist grants the agent `Write`/`Edit` on it,
and the SEO prompt in `seo-content.yml` tells every run to register its new post
there, so it is written on essentially every content PR. Until 2026-08-03 it was
in no guarded glob, no integrity manifest entry and no content scan: a
`claude[bot]` PR whose only change was `lib/blog-topics.ts` carrying a
`process.env` exfiltration exited 0. It is in gate 1b's scan set now.

Two consequences, both of which contradict what an earlier version of this
document said:

- **`build-chain-guard` deliberately lets `app/blog/**` and
  `lib/blog-topics.ts` through.** It has to — that is the SEO agent's legitimate
  output. So the path rule is not, and cannot be, what stops a malicious blog
  post.
- **Step 4a's allowlist does not close this either.** Confining the agent to
  `app/blog/**` plus `lib/blog-topics.ts` changes which file the payload lives
  in. It does not stop the payload from running during a production build.

What actually stands between an injected blog post and the build environment,
in descending order of how much it is worth:

| | Control | What it actually buys |
| --- | --- | --- |
| 1 | **You read the diff before it merges** | The only control that does not depend on predicting the payload's shape. Load-bearing — and *deliberately not in force*: automerge stays on (§2), so nothing below is backed by a human read. |
| 2 | **Required checks** (step 1) | Makes CI able to block at all. Necessary, not sufficient — `tsc`, `vitest` and `next build` all pass on a malicious blog post, by construction, exactly as they did for six weeks on `postcss.config.mjs`. |
| 3a | **Gate 1a allow-list** (shipped, `.github/workflows/ci.yml`) | A non-owner change may touch ONLY `app/blog/**`, `lib/blog-topics.ts` and `docs/**`; anything else fails the job. This is the layer that stopped being a guess. The deny-list it replaced enumerated the paths we had thought of, and a 2026-08-03 review walked past it four ways — `proxy.tsx`/`instrumentation.tsx` shadowing the hash-pinned `.ts` files, `app/actions/**`, `lib/entitlements.ts`, `app/sitemap.ts`. Adding a new file type to the repo can no longer silently widen an automated writer's reach. |
| 3b | **Gate 1b content check** (shipped, `scripts/check-agent-blog-content.mjs`) | Fails CI when any executable module a non-owner touched contains `process.env`, `child_process`, `eval`, `require(`, `fetch(`, a dynamic `import()`, `globalThis`, a node builtin import, base64/charcode obfuscation — or **rebinds** one of those globals (`const { env } = process`, `const send = fetch`), which defeated every other rule here until 2026-08-03. Selection is by extension over whatever gate 1a allowed, so a helper imported by a post is scanned too; naming `app/blog/**` explicitly used to leave exactly that gap. Still a raw-text deny-list: **not a parse and not a proof.** Computed property access or string concatenation can express the same payload without a listed token. || 4 | **The integrity manifest** (`scripts/verify-build-integrity.mjs`) | Runs unconditionally, needs no diff, so it is the layer that survives a guard that could not work out what changed. It pins the 16 hash-pinned build-chain files, **derives** the forbidden shadow filenames from those root conventions crossed with the extensions Next resolves them over (so a `proxy.tsx` twin cannot pass by being absent from a hand-written list), and asserts that `lib/blog-topics.ts` — deliberately *not* pinned, because the agent writes it — has not silently dropped out of gate 1b's scan. It says nothing about the contents of a blog post. |

There is no configuration in this repo that makes an *unread* agent-authored
blog post safe. Plan accordingly.

---

## 2. `SEO_AUTOMERGE` stays ON — accepted risk, and what carries it

**Founder decision, 2026-08-03.** The autonomous SEO pipeline is the point of
the system; a merge gate that needs Morgan every time makes it not autonomous.
This section used to say "turn it off". It now records the decision that was
actually made, and what has to be true for that decision to be survivable.

Auto-merge is only ever as strong as the required checks — and until step 1 was
applied there were none, which is how PR #17 merged **19 seconds** after CI
started. Step 1 is now done, so `gh pr merge --auto` genuinely waits. But
"waits" means "waits for `tsc`, `vitest`, `next build` and `build-chain-guard`",
and the first three pass on a malicious blog post. Only the guard is looking.

**What carries the risk (all shipped):**

- **Gate 1a — an allow-list, not a deny-list.** A non-owner change may touch
  only `app/blog/**`, `lib/blog-topics.ts` and `docs/**`. Everything else fails
  the job. This replaced a deny-list of paths-we-thought-of, which a fresh
  review walked past four different ways on 2026-08-03: `proxy.tsx` /
  `instrumentation.tsx` (Next resolves root conventions over `pageExtensions`
  and the **last** match wins, so a `.tsx` twin silently shadows the hash-pinned
  `.ts` and becomes the request interceptor for every production request);
  `app/actions/**` (Server Actions are POST endpoints); `lib/entitlements.ts`
  (one line returning `true` hands every anonymous visitor the Pro feature set);
  and `app/sitemap.ts`. All four now fail.
- **Gate 1b — content scan over every executable module in the diff**, selected
  by extension rather than by a second hardcoded path list. The old form named
  `app/blog/**` and `lib/blog-topics.ts` explicitly, so a post could import a
  helper written in the same PR: the post scanned clean, the helper was never
  scanned, and the helper is what ran on the builder.
- **The manifest derives its own shadow filenames** from the pinned root
  conventions × the extensions Next resolves them over, so the `.tsx`-twin hole
  cannot be reopened by an omission in a hand-written list.

**What still is not covered, and you should hold this in mind:** gate 1b is a
heuristic token scan over raw text, not a parse. It now catches aliasing
(`const { env } = process`, `const send = fetch` — both of which defeated every
rule until 2026-08-03), but a determined payload built from tokens it does not
list still passes. **A pass means "no obvious payload", never "reviewed".**
With automerge on, no human reads an SEO PR before it is in production.

If you ever want the stricter posture, this is the switch:

1. **https://github.com/morganrentalsphilly-creator/truecap/settings/variables/actions**
2. **Variables** tab → find `SEO_AUTOMERGE` → **Edit** (pencil icon)
3. Set the value to `false` → **Save**
   (Or **Remove** it outright — `seo-content.yml:161` is
   `if: vars.SEO_AUTOMERGE == 'true'`, so an absent variable is off.)

```bash
gh variable set SEO_AUTOMERGE --body false \
  --repo morganrentalsphilly-creator/truecap
```

### The preconditions this decision assumes

Keeping automerge on is defensible only while all of these hold. They are worth
re-checking after any change to the workflows:

- [ ] Step 1 done and verified (required checks actually required).
- [ ] Step 4a done (`Bash(git:*)` gone, `Write`/`Edit` path-scoped) — so the
      files an injected run can produce are `app/blog/**` modules,
      `lib/blog-topics.ts` and `docs/seo/**`. The first two are **build-executed**
      and are the reason gate 1b exists; step 4a removes routes, it does not
      remove the destination.
- [ ] The `build-chain-guard` job on `main` is the version that contains **gate
      1b**, the content check over agent-touched `app/blog/**` modules *and*
      `lib/blog-topics.ts`, in its post-2026-08-03 fail-closed form. Confirm all
      four:

      ```bash
      grep -n 'check-agent-blog-content' .github/workflows/ci.yml
      test -f scripts/check-agent-blog-content.mjs && echo present
      # the diff must be read NUL-separated with quoting off, or a non-ASCII
      # filename walks past every glob:
      grep -n 'core.quotePath=false' .github/workflows/ci.yml
      # and lib/blog-topics.ts must be inside gate 1b's marked selection:
      node scripts/verify-build-integrity.mjs | grep 'still covered by gate 1b'
      ```

- [ ] You have read the header of `scripts/check-agent-blog-content.mjs` and
      accept, in writing to yourself, that it is a **token deny-list over raw
      text, not a parse** — it catches a naive payload and nothing more. A pass
      means "no obvious payload", never "reviewed".

Sanity-check the check itself before trusting it, using a throwaway branch you
delete afterwards:

```bash
# 1. a normal prose post must PASS
node scripts/check-agent-blog-content.mjs app/blog/what-is-a-good-cap-rate/page.tsx
echo "exit=$?"   # expect 0

# 2. a post with module-scope process.env must FAIL
mkdir -p /tmp/bc/app/blog/x && cd /tmp/bc
printf 'const k = process.env.STRIPE_SECRET_KEY;\nexport default function P(){return <main/>}\n' \
  > app/blog/x/page.tsx
node "$OLDPWD/scripts/check-agent-blog-content.mjs" app/blog/x/page.tsx
echo "exit=$?"   # expect 1
cd "$OLDPWD" && rm -rf /tmp/bc

# 3. a path it cannot read must FAIL, not be skipped. This is the direction
#    that was wrong until 2026-08-03: it skipped what it could not read, so a
#    quoting bug in the caller reported a clean pass on a payload post.
node scripts/check-agent-blog-content.mjs app/blog/does-not-exist/page.tsx
echo "exit=$?"   # expect 1

# 4. and lib/blog-topics.ts must be scannable by the same call
node scripts/check-agent-blog-content.mjs lib/blog-topics.ts
echo "exit=$?"   # expect 0
```

If any of the four does not behave as written, do not re-enable auto-merge.

---

## 3. Review the second write-access account (`esaleci`)

```bash
gh api repos/morganrentalsphilly-creator/truecap/collaborators \
  --jq '.[] | {login, role: .role_name, push: .permissions.push, admin: .permissions.admin}'
```

Current state: `esaleci` — `role: write`, `push: true`, `admin: false`.

Who that is: `esaleci` authored 20 commits between 2026-04-14 and 2026-05-11
("demo Version 0.1 truecap" through "icons apply fix") — the contractor who
scaffolded TrueCap v0.1–v0.4.6. This is not an unknown account. It is
**stale contractor access**: dormant ~3 months, still holding standing push
rights to a branch that auto-deploys production.

Why it matters right now: **no commit in this repo is signed**
(`git log --format='%G?'` returns `N` for every commit, including `15eb1b5`).
Git authorship is metadata, not authentication — "Author: Morgan Page" on the
June injection proves nothing about who pushed it. The set of principals that
could have made that push is exactly {your machine/token, `esaleci`}. The June
incident was never attributed to a principal, and the June secrets are still
unrotated. That makes this an open persistence path, not a tidiness issue.

**Do this:**

1. **https://github.com/morganrentalsphilly-creator/truecap/settings/access**
2. Next to `esaleci` → **Remove**.
   If you still need them occasionally, re-add on demand, or downgrade to
   **Read** (the dropdown next to their name → **Read**).

   ```bash
   # remove
   gh api -X DELETE repos/morganrentalsphilly-creator/truecap/collaborators/esaleci
   # or downgrade to read-only
   gh api -X PUT repos/morganrentalsphilly-creator/truecap/collaborators/esaleci -f permission=pull
   ```

3. Check they hold nothing else: **Settings → Deploy keys**, **Settings →
   Webhooks**, and your Vercel project's **Settings → Members**.

4. Turn on signed commits going forward, so authorship becomes evidence:
   in the ruleset from step 1, tick **Require signed commits**. Do this only
   after you have signing set up locally (`git config --global commit.gpgsign
   true` with an SSH or GPG key registered on your GitHub account) — otherwise
   you will block yourself.

> Rotating the June-era secrets is tracked separately and is **not** covered by
> this document. Removing `esaleci` does not un-leak anything already taken.

---

## 4. Narrow the SEO agent's tool scope

Two edits — 4a in `.github/workflows/`, 4b in `.claude/`. These are code
changes, but they were deliberately left for you: both live under paths
(`.github/**`, `.claude/**`) that `build-chain-guard` now refuses from anyone but
you, and they change what an autonomous system is allowed to do. An agent
editing its own tool grant or its own deny list is exactly the change that
should require a human.

**Read the section "What step 1 does *not* close" before doing this step.**
Narrowing the agent to `app/blog/**` is worth doing, but `app/blog/**` is
build-executed — this step removes routes to the production build environment,
it does not remove the destination.

### 4a. Remove `Bash(git:*)` and add a write path allowlist

`Bash(git:*)` lets an injected run do `git push origin HEAD:main` directly —
the checkout step writes a write-scoped `AUTHORIZATION` header into
`.git/config` (`persist-credentials: true` is the default), so that push
authenticates. It also bypasses the PR entirely, and a push made with
`GITHUB_TOKEN` does not re-trigger CI — while Vercel's Git integration deploys
it anyway.

In **`.github/workflows/seo-content.yml`, line 67**, replace:

```yaml
            --allowedTools "Read,Write,Edit,Glob,Grep,WebSearch,WebFetch,Bash(npm test),Bash(npx tsc:*),Bash(npx vitest:*),Bash(node scripts/seo/*),Bash(git:*),Bash(gh pr:*)"
```

with:

```yaml
            --allowedTools "Read,Glob,Grep,WebSearch,WebFetch,Write(app/blog/**),Write(docs/seo/**),Write(docs/seo-content-backlog.md),Write(lib/blog-topics.ts),Edit(app/blog/**),Edit(docs/seo/**),Edit(docs/seo-content-backlog.md),Edit(lib/blog-topics.ts),Bash(npm test),Bash(npx tsc:*),Bash(npx vitest:*),Bash(git add:*),Bash(git commit:*),Bash(git status:*),Bash(git diff:*),Bash(git checkout -b:*),Bash(git push origin HEAD:refs/heads/seo/*),Bash(gh pr create:*),Bash(gh pr view:*)"
```

What changed and why:

| Removed | Reason |
| --- | --- |
| `Write` / `Edit` unscoped | Could write `postcss.config.mjs`. Now confined to the four paths the job legitimately produces. |
| `Bash(git:*)` | Expressed `git push origin HEAD:main`. Replaced with the specific verbs the job needs; the push pattern can only target `refs/heads/seo/*`. |
| `Bash(node scripts/seo/*)` | `node <path>` where the agent can also *write* files under a matching path is arbitrary code execution on the runner, which holds `ANTHROPIC_API_KEY` and a `contents:write` `GITHUB_TOKEN`. If a specific script is genuinely needed, allow it by exact name (`Bash(node scripts/seo/check-links.mjs)`) and make sure `scripts/**` is not writable. |
| `Bash(gh pr:*)` | Narrowed to `create`/`view`. `gh pr merge` was reachable under the old pattern. |

> **What this does and does not buy.** It removes the direct route to
> `postcss.config.mjs` and the direct `git push origin HEAD:main`. It does
> **not** make the remaining write scope inert: **both** `app/blog/**` and
> `lib/blog-topics.ts` are build-executed (see "What step 1 does not close"
> above), so after this edit an injected run can still produce a file that runs
> on the Vercel builder with production secrets — it just has to put it in a
> blog post or in the topic registry. Those two are exactly what gate 1b scans,
> and gate 1b is a heuristic. Do this step because it removes routes, not
> because it ends the problem. It is **not** grounds to re-enable auto-merge.
>
> `Write(lib/blog-topics.ts)` is granted on purpose rather than by oversight:
> the prompt in `seo-content.yml` requires every new post to be registered in
> the right topic hub, so revoking it would break the pipeline on every run and
> the grant would come back. The trade is that the file is treated as what it
> is — a build-executed module the agent writes — and scanned by gate 1b like a
> blog post, and recorded in `scripts/build-integrity-manifest.json` under
> `contentScanned` so the next person can see which mechanism covers it and why
> it is not hash-pinned.

Do the same at **`.github/workflows/seo-visibility.yml`, line 60**
(`Read,Write,Glob,Grep,WebSearch,WebFetch,Bash(git:*),Bash(gh pr:*)`), scoped
to whatever that job actually writes — it is a reporting job, so it may not
need `Write` at all.

### 4b. Belt and braces — a repo-level deny list

Tool patterns are a per-invocation allowlist. A committed
`.claude/settings.json` applies to *every* Claude Code run in this repo,
including any future workflow someone adds without reading this file. Deny
rules take precedence over allow rules.

> **`.gitignore` had to be fixed first, and it has been.** Until this change,
> `.gitignore` line 69 was a blanket `.claude/`, so `git add -A` skipped
> `.claude/settings.json` **silently** (empty `git status --porcelain`) and
> `git add .claude/settings.json` exited 1 with "paths are ignored". You would
> have ticked 4b below with the file untracked — absent from every CI checkout,
> protecting none of the agent runs it was written for. The rule is now:
>
> ```
> .claude/*
> !.claude/settings.json
> ```
>
> It has to be written that way round. Git never descends into an ignored
> *directory*, so a `!` negation under a bare `.claude/` does nothing; the
> exclusion must apply to the directory's *contents*. Everything else under
> `.claude/` (`launch.json`, `skills/`) stays ignored. Do not collapse it back.

Create **`.claude/settings.json`**:

```json
{
  "permissions": {
    "deny": [
      "Write(./postcss.config.*)",
      "Edit(./postcss.config.*)",
      "Write(./next.config.*)",
      "Edit(./next.config.*)",
      "Write(./package.json)",
      "Edit(./package.json)",
      "Write(./package-lock.json)",
      "Edit(./package-lock.json)",
      "Write(./vercel.json)",
      "Edit(./vercel.json)",
      "Write(./instrumentation*.ts)",
      "Edit(./instrumentation*.ts)",
      "Write(./sentry.*.config.ts)",
      "Edit(./sentry.*.config.ts)",
      "Write(./proxy.ts)",
      "Edit(./proxy.ts)",
      "Write(./vitest.config.ts)",
      "Edit(./vitest.config.ts)",
      "Write(./eslint.config.mjs)",
      "Edit(./eslint.config.mjs)",
      "Write(./tsconfig*.json)",
      "Edit(./tsconfig*.json)",
      "Write(./.github/**)",
      "Edit(./.github/**)",
      "Write(./scripts/**)",
      "Edit(./scripts/**)",
      "Write(./supabase/**)",
      "Edit(./supabase/**)",
      "Write(./lib/supabase/**)",
      "Edit(./lib/supabase/**)",
      "Write(./app/api/**)",
      "Edit(./app/api/**)"
    ]
  }
}
```

Then commit it and **verify it is actually tracked** — this is the step that
silently failed before:

```bash
git add .claude/settings.json     # must NOT print "The following paths are ignored"
git ls-files .claude/             # must print: .claude/settings.json
git commit -m "security: repo-wide Claude Code deny list for build-executed paths"
```

`git ls-files` is the check that matters — it asks the index, not the rules.
If it prints nothing, the file is not in the repo and this layer does not
exist, whatever the checklist says.

If you want to interrogate the ignore rules directly, mind the exit codes —
they are inverted from the intuition, and `-v` changes behaviour once the file
is tracked:

```bash
git check-ignore .claude/settings.json ; echo "exit=$?"
#   no output, exit=1  ->  NOT ignored. This is the state you want, and it reads
#   the same whether the file is tracked, untracked, or not yet created.

git check-ignore --no-index -v .claude/settings.json ; echo "exit=$?"
#   .gitignore:<n>:!.claude/settings.json   .claude/settings.json
#   exit=0  ->  do NOT read this as "still ignored". `-v` reports the matching
#   RULE and exits 0 whenever one matched; the leading `!` is a negation, i.e.
#   the path is re-included.
#   `--no-index` is required: without it, -v goes silent and exits 1 as soon as
#   the file is tracked, because git stops applying ignore rules to tracked paths.
```

Confirm the pattern syntax against the Claude Code settings docs for the version
you are running before relying on it — treat it as the third layer, not the
first. `build-chain-guard` is the layer that does not depend on the agent's own
configuration being correct, and it now guards `.claude/*` itself, so an agent
run cannot quietly edit its own deny list: a `claude[bot]` PR touching only
`.claude/settings.json` fails the guard. (Before this change it exited 0.)

### 4c. While you are in there

`seo-content.yml:151-154` and `docs/seo/AUTOMATION.md:4` both state that
nothing merges without required checks / a human. That was false on 2026-08-02.
Once step 1 is done it becomes true — but fix the wording either way, because
a comment that asserts a guarantee you have not verified is how PR #17 got
merged in 19 seconds without anyone noticing.

---

## 5. Vercel

> **Read this first — the ordering here changed on 2026-08-03.** Everything
> else in this document gates what lands on `main`. Vercel also builds **PR
> preview branches**, and that happens *before* any gate's verdict matters. A
> preview build runs `npm ci` — including every install-time lifecycle script
> in the PR author's own lockfile — on Vercel's builder. If the secret env vars
> are scoped "All Environments" (the dashboard default when you add a variable),
> that untrusted code runs with `SUPABASE_SERVICE_ROLE_KEY`, both Stripe
> secrets, `RESEND_API_KEY` and `CRON_SECRET` in the environment, with no human
> action at all — just a PR being opened.
>
> Step 2 below (Ignored Build Step) **does not** close this. On a PR branch that
> script runs from the PR's own checkout, so a tampered branch simply ships a
> tampered verifier. Guarding `scripts/**` blocks the *merge*, not the branch.
>
> **The control that actually closes it is step 0.** Do that one even if you do
> nothing else on this page.

0. **Scope the secrets to Production only.** ← the important one
   Vercel → project → **Settings → Environment Variables**. For each of
   `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
   `RESEND_API_KEY`, `CRON_SECRET`, `SENTRY_AUTH_TOKEN`: untick **Preview** and
   **Development**, leave **Production** ticked, save.

   Preview builds do not need real keys, and CI already proves the build works
   without them — the `check` job builds the whole app against
   `ci-placeholder-*` values. After this, a hostile preview build has nothing
   worth stealing.

   Optionally also **Settings → Git → Deployment Protection** → limit preview
   deployments from bot / non-member branches.

1. **Confirm the production branch.**
   Vercel → project → **Settings → Git → Production Branch** = `main`.
   Everything above assumes production only ever builds from `main`.

2. **Refuse to build a tampered build chain** (production path only — see the
   note above about why this does not protect previews).
   Vercel → **Settings → Git → Ignored Build Step** → choose **Custom** and
   enter exactly:

   ```
   ! node scripts/verify-build-integrity.mjs
   ```

   Vercel's convention is inverted and worth reading twice: **exit code `1` =
   continue building, exit code `0` = skip the build.** The leading `!` flips
   the verifier's exit code, so a *failed* integrity check produces `0` and
   Vercel skips the deploy; a *passing* check produces `1` and the build
   proceeds. The script uses only Node builtins, so it runs before `npm ci`.

   Test it once after saving: push a branch with a one-character change to
   `postcss.config.mjs` and confirm the deployment is skipped, then delete the
   branch.

3. **Check who has access.**
   Vercel → **Settings → Members** (and the team's member list). Same question
   as step 3: is everyone on that list someone who should be able to read
   `SUPABASE_SERVICE_ROLE_KEY`?

4. **Optional:** mark the highest-value variables as **Sensitive** under
   **Settings → Environment Variables** so they become write-only in the
   dashboard. This does not stop build-time code from reading them — it only
   stops a person or a token from reading them back out of the dashboard.

---

## 6. Optional but cheap, while you are in settings

- **Pin actions to SHAs.**
  **Settings → Actions → General → "Require actions to be pinned to a full-length commit SHA"**.
  There are 11 unpinned `uses:` on mutable tags. Only one is genuinely
  third-party — `anthropics/claude-code-action@v1` in `seo-content.yml:61` and
  `seo-visibility.yml:54` — and it is also the only one handed
  `${{ secrets.ANTHROPIC_API_KEY }}` with `contents: write`. Pin that one at
  minimum:

  ```bash
  gh api repos/anthropics/claude-code-action/commits/v1 --jq .sha
  # then:  uses: anthropics/claude-code-action@<sha>  # v1
  ```

  (`tj-actions/changed-files`, March 2025, was exactly a mutable-tag repoint
  that dumped runner secrets at scale.)

- **Default workflow permissions.**
  **Settings → Actions → General → Workflow permissions** → **Read repository
  contents and packages permissions**, and untick **Allow GitHub Actions to
  create and approve pull requests**. Per-workflow `permissions:` blocks still
  override this, which is why step 4 matters more — but the default should be
  read.

---

## What the code half already does

Shipped in this change, no settings required:

- **`.github/workflows/ci.yml` → job `build-chain-guard`.** Computes the changed
  files from the base ref (`pull_request.base.sha`, or `push.before`, with
  fallbacks to the merge-base with `origin/main` and then `HEAD^`), and hard-fails
  if any of them match a build-executed or security-sensitive path —
  `postcss.config.*`, `next.config.*`, `vercel.json`, `package.json`,
  `package-lock.json`, `pnpm-lock.yaml`, `.npmrc`, `instrumentation*`,
  `sentry.*.config.ts`, `proxy.*`, `middleware.*`, `vitest.config.*`,
  `eslint.config.*`, `tsconfig*.json`, `.github/**`, `.claude/**`,
  `.gitmodules`, `.gitattributes`, `supabase/**`, `lib/supabase/**`,
  `app/api/**`, and all of `scripts/**` (which contains the three files of this
  control itself) — unless the actor is `morganrentalsphilly-creator`. On
  a PR, *both* the pusher and the PR author must be you, so an agent-opened PR
  cannot be laundered by a later push from your account. If the diff cannot be
  computed at all and the actor is not you, it fails closed. A change touching
  only `app/blog/**`, `docs/**` and `lib/blog-topics.ts` — the entire legitimate
  SEO output — passes the path rule, and the build-executed part of it
  (`app/blog/**` modules and `lib/blog-topics.ts`) is then subject to the
  content check below.

  `.claude/**` is in that list on purpose: without it, an agent run could edit
  the deny list that is supposed to bind it and this job would still pass.

  **How it reads the diff matters as much as the list** (fixed 2026-08-03, after
  review found the opposite shipped):

  - `git -c core.quotePath=false diff --raw --no-renames -z`, read into bash
    **arrays**, and every path compared as a whole array element. Git's default
    `core.quotePath=true` renders a non-ASCII path C-quoted —
    `"app/api/exf\303\255l/route.ts"`, leading double-quote included — which
    matched no glob and no `app/blog/` test, so `.github/workflows/évil.yml`
    passed both gates while the ASCII spelling failed them. `-z` also stops a
    newline, space, tab or quote in a filename from splitting one path into two.
  - `--no-renames` on purpose: with rename detection on, moving a guarded file
    out of its guarded path reports only the destination and the guard sees
    nothing.
  - `--raw` carries the file mode, so a **symlink** or a **submodule gitlink**
    from a non-owner is refused outright — a symlink decouples the path this job
    matched from the bytes the build executes.
  - Path matching is case-insensitive, because a case-insensitive checkout makes
    `.GitHub/workflows/x.yml` the same file to the toolchain.
  - Anything it cannot do, it fails: a `git diff` that errors, a `--raw` record
    it cannot parse, a truncated record, a missing checker.

- **Gate 1b — `scripts/check-agent-blog-content.mjs`.** Runs inside
  `build-chain-guard`, only for changes **not** authored by you, over the
  `app/blog/**` `.ts`/`.tsx`/`.js`/`.jsx`/`.mjs`/`.cjs` files in the diff **and
  `lib/blog-topics.ts`** — the two build-executed things step 4a lets the agent
  write. Fails CI if any of them contain `process.env`, `process[`,
  `child_process` / `execSync`, a node-builtin import (`node:*`, `"fs"`,
  `"child_process"`, …), `eval(` / `new Function`, `require(` / dynamic
  `import(`, `fetch(` / `XMLHttpRequest` / `WebSocket`, `globalThis` /
  `__dirname`, or `Buffer.from` / `atob` / `String.fromCharCode` — **anywhere in
  the file**, not just at module scope, because a server component's *body* runs
  at build time too. It also scans a whitespace-stripped copy so a token cannot
  be smuggled by splitting it across lines.

  The module list is built as a bash array and passed **quoted**, and only paths
  that still exist in HEAD are sent. Before 2026-08-03 it was a `grep` over a
  joined string expanded unquoted, so `app/blog/best rental tool/page.tsx`
  word-split into three fragments that were not files, all three were skipped,
  and a post exfiltrating `process.env` came back clean. The checker itself now
  **fails closed**: a path it cannot read, a path that is a symlink, or an
  invocation where nothing at all got scanned is an error and exit 1, never a
  skip. If the same non-owner diff also touches `scripts/**`, the checker is not
  run at all — running it would mean executing the diff's own copy of the check
  meant to judge it — and `scripts/**` is guarded anyway.

  Calibrated against the existing corpus: all **153** blog modules and
  `lib/blog-topics.ts` pass, including the prose forms that would trip a lazier
  regex — "lenders require (at minimum)", "properties that fetch (on average)",
  "listing import (multifamily mode)". Only `name(` with no space, or `name (`
  immediately followed by a string literal, counts as a hit.

  **This is a heuristic, not a proof.** It is a raw-text scan; it does not parse.
  It stops a naive payload and raises the cost of a careful one. It is not a
  substitute for reading the diff, and it is not grounds to re-enable
  auto-merge — see "What step 1 does not close".

- **`scripts/verify-build-integrity.mjs` + `scripts/build-integrity-manifest.json`.**
  Pinned sha256 of 16 files — the build-executed ones plus the two CI controls
  themselves (`ci.yml`, `check-agent-blog-content.mjs`) — checked on every CI run
  regardless of who the actor is and regardless of whether a diff was available.
  That last part is why the checker is pinned as well as guarded: the path rule
  needs a computable diff, and this does not. Also
  fails if a shadow build config appears (`next.config.ts`, `postcss.config.js`,
  `.npmrc`, `.gitmodules`, `middleware.ts`, …) or if `package.json` grows an
  install-time lifecycle hook (`postinstall` and friends run automatically on
  `npm ci`, on the runner and on the Vercel builder). No dependencies — Node
  builtins only.

  It also carries a `contentScanned` registry — today just `lib/blog-topics.ts`.
  Those are build-executed files the agent is *allowed* to write, so hash-pinning
  them would put CI red on every content PR and make `--update` a reflex, which
  is the one habit that would empty this control of meaning. What the verifier
  enforces for them instead is that they have not lost their coverage: the file
  must exist, and it must still appear inside the marked
  `# gate-1b-selection-start`/`-end` region of `ci.yml`. A comment mentioning the
  path elsewhere in the file does not satisfy it. So the manifest is a complete
  list of the build-executed files in this repo, annotated with which mechanism
  covers each and why — not a claim that one mechanism covers them all.

### When you legitimately change a build-executed file

CI will be red until you re-pin it. That is the design.

```bash
node scripts/verify-build-integrity.mjs --update
git add scripts/build-integrity-manifest.json
git commit -m "chore(security): re-pin build-chain manifest — <what changed and why>"
```

Commit the manifest bump **on its own**, not folded into a large diff. The
whole point is that the hash line is conspicuous. `--update` deliberately will
not allow-list a new `postinstall` for you; that needs a hand edit to
`allowedLifecycleScripts` in the manifest.

`--update` also will not fix an `UNCOVERED` or `MISSING` finding against a
`contentScanned` path — those are not hashes. `UNCOVERED lib/blog-topics.ts`
means gate 1b stopped scanning a build-executed file the agent can write.
Restore it to the marked selection region in `ci.yml`, or move it into `files`
and hash-pin it; do not delete it from the manifest to make CI green.

### When Dependabot opens a PR

Dependabot touches `package.json` / `package-lock.json` / `.github/workflows/**`,
so `build-chain-guard` will be red on its PRs. That is intended — a dependency
bump is a build-chain change. To merge one:

1. Read the diff. For a lockfile bump, at minimum check the changed package
   versions and that no new `scripts` block appeared.
2. Check the branch out locally, run `node scripts/verify-build-integrity.mjs
   --update`, commit the manifest, and push to the Dependabot branch. That
   makes you the actor — but the PR *author* is still Dependabot, so the guard
   still fails by design.
3. So: merge it with your admin bypass (the ruleset from step 1 allows admin
   bypass for pull requests), or cherry-pick the commits onto a branch you open
   yourself.

Do **not** solve this by adding `dependabot[bot]` to `OWNER_LOGINS` in
`ci.yml`. That list is "accounts allowed to change what runs during a
production build". Bots do not belong on it.

---

## Checklist

- [x] 1. Ruleset (or classic protection) on `main`, requiring `build-chain-guard` + `check` — **done 2026-08-03**
- [x] 1b. Verified with `gh api .../branches/main/protection --jq '.required_status_checks.contexts'` → `["build-chain-guard","check"]`
- [ ] 0. **Vercel: scope the secret env vars to Production only** (§5 step 0) — the
      one that stops an untrusted PR's preview build from running with production
      secrets. Not optional, and not covered by anything in the repo.
- [ ] 🚨 Rotate every secret exposed to the June build environment (verified
      2026-08-03: the old service-role key still works)
- [ ] 🚨 Apply `docs/apply-pending-migrations-2026-08-03.sql` (verified
      2026-08-03: anon can still LIST the `analysis-pdfs` bucket)
- [ ] 🚨 Delete the `truecap-iota` project in the OLD Vercel account — it is a
      frozen pre-security-fix copy of the whole app, serving 200 with no
      `X-Robots-Tag`, outranking usetruecap.com on brand queries. No redeploy of
      this project can reach it.
- [~] 2. `SEO_AUTOMERGE` — **declined, stays ON by founder decision.** See §2 for
      what carries the risk and what it does not cover.
- [ ] 2b. Read "What step 1 does *not* close" — you know that `app/blog/**` **and
      `lib/blog-topics.ts`** run during `next build` with production secrets,
      that gate 1b over them is a heuristic, and that finishing step 4 is
      **not** a reason to turn auto-merge back on
- [ ] 3. `esaleci` removed or downgraded to Read; deploy keys / webhooks / Vercel members checked
- [ ] 4a. `Bash(git:*)` and unscoped `Write`/`Edit` removed from `seo-content.yml` and `seo-visibility.yml`
- [ ] 4b. `.claude/settings.json` deny list committed **and verified tracked**
      with `git ls-files .claude/` (the `.gitignore` fix that makes this
      possible is already shipped; before it, `git add` skipped the file silently)
- [ ] 4c. False "nothing merges without a human" claims corrected in `seo-content.yml` and `docs/seo/AUTOMATION.md`
- [ ] 5. Vercel production branch confirmed; Ignored Build Step set to `! node scripts/verify-build-integrity.mjs`
      (production path only — it cannot refuse a tampered *preview* build, which
      is what §5 step 0 is for)
- [ ] 6. `anthropics/claude-code-action` pinned to a SHA; default workflow permissions set to read
