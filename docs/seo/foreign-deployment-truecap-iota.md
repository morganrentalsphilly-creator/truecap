# `truecap-iota.vercel.app` — the duplicate site nothing in this repo can fix

**Status: LIVE as of 2026-08-03.** It is currently the **#1 Google result for
the brand query**, above usetruecap.com.

This file exists because the automation kept re-recommending a fix that cannot
work, and each snapshot that repeats it burns a month.

---

## What it is

A full, frozen copy of an older TrueCap build, served from a **different Vercel
project** than this one.

Measured 2026-08-03:

| Check | `truecap-iota.vercel.app` | `usetruecap.com` |
|---|---|---|
| HTTP | 200 | 200 |
| `X-Robots-Tag` | **absent** | absent (correct — it IS canonical) |
| Deployment id | `dpl_3Kf5xYs7dYqwCt45hf4fbj6Lw461` | different |
| `<title>` | `Rental Property Analysis` | current branding |
| Prices in HTML | `$1`, `$8` | $29.99/mo, $300/yr |
| `robots.txt` | `Allow: /`, `Host: https://truecap-iota.vercel.app`, own sitemap | correct |
| In this project's domains? | **NO** | yes |

The `Host:` line is the tell. `getSiteUrl()` (lib/site-url.ts) falls back to
`VERCEL_URL` when `NEXT_PUBLIC_SITE_URL` is unset, so that deployment declares
**itself** the canonical host and publishes its own sitemap. It is not a stray
alias — it is a self-canonicalising duplicate of the whole site, fully
crawlable, advertising pricing that has not existed for months.

## Why no code change can fix it

`applyHostGuard` in `proxy.ts`, `X-Robots-Tag: noindex`, a 308 redirect to
usetruecap.com — **all of these run inside our deployment.** That host never
executes this repository's code. Shipping any of them changes nothing about
what iota serves. This was verified: the host guard shipped in `437c824` on
2026-08-02, and iota still served no `X-Robots-Tag` a day later.

`docs/seo/2026-08-02-baseline.md:80` says the alias problem was "Fixed in this
PR", and `docs/seo/visibility/2026-08-02.md:176` recommends upgrading the guard
to a 308. **Both are wrong about iota specifically.** The guard is correct and
worth keeping — it covers this project's own `*.vercel.app` aliases. It simply
cannot reach a project we do not own.

Vercel confirms the ownership: this project's domains are `usetruecap.com`,
`truecap-pink.vercel.app`, `truecap-morganrentalsphilly-creators-projects.vercel.app`
and `truecap-git-main-…vercel.app`. `truecap-iota.vercel.app` is not among them,
and no project in the account produces that hostname.

## The only fix

1. Find the Vercel account that owns it. It is **not** the current one
   (`morganrentalsphilly-creator's projects`, 7 projects, none of them iota).
   Vercel accounts are per sign-in identity, so check GitHub vs Google vs email
   logins, and check **v0.dev** — v0 auto-deploys to `name-<greek>.vercel.app`
   under whatever account is linked to it, which matches both the naming and the
   old generic build.
2. Delete the project: **Project → Settings → Delete Project.** A 404/410 is
   what makes Google drop it, typically within 1-3 weeks.
3. Then request removal of the host in Search Console.

Rotating the Supabase / Stripe / Resend secrets also neuters whatever backend
that build still points at, which is a second reason to do it.

## The tripwire

`scripts/seo/healthcheck.mjs` puts a red banner at the top of the weekly report
while that URL returns anything other than 404/410. There is deliberately **no
flag in this repo that silences it** — a nag that can be muted from the codebase
would have been muted already. It stops when the deployment is gone.
