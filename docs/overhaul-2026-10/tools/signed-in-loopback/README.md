# Signed-in pages without Docker

The authenticated Playwright projects (`authenticated-chromium`,
`authenticated-free-chromium`) sign in against a disposable Supabase stack
that CI starts in Docker (`browser-regressions` in `.github/workflows/ci.yml`).
The founder's Mac has no Docker or Supabase CLI, so those specs run in CI only,
and they still do.

This folder lets a design pass look at the real signed-in pages from a local
production build anyway, at the CLAUDE.md §9 widths, in a few commands. A
read-only stand-in for Supabase Auth and PostgREST listens on
`127.0.0.1:54321`, the origin `scripts/dev-isolated.sh` points the app at, and
serves one Pro user with eight fixture deals built through the real engine.
It was first used to check the signed-in home in PR #191.

It is verification tooling only. It never touches the hosted project, and it
does not replace the CI run: writes are accepted and dropped, so save, edit
and delete flows are not exercised.

## Run it

From the repo root. Steps 2 and 4 keep running, so start them in the
background or in their own terminals.

```bash
# 1. Fixtures through the real engine → fixtures.json here (git-ignored)
npx vitest run -c docs/overhaul-2026-10/tools/signed-in-loopback/gen-fixtures.config.ts

# 2. The loopback stand-in (leave running)
node docs/overhaul-2026-10/tools/signed-in-loopback/mock-supabase.mjs

# 3. A production build against the loopback origin
bash docs/overhaul-2026-10/tools/signed-in-loopback/build-isolated.sh

# 4. Serve it on 127.0.0.1:3100 (leave running)
bash scripts/dev-isolated.sh start

# 5. Sign in and capture, one or more routes (default /dashboard)
node docs/overhaul-2026-10/tools/signed-in-loopback/capture-signed-in.mjs <outDir> --label=after /dashboard /dashboard/saved-analyses /dashboard/compare
```

If Playwright has no Chromium yet, run `npm run test:e2e:install` once.

Step 5 signs in through the real login form, then for each route and width
(375, 768, 1095, 1440; `WIDTHS=` overrides) writes
`<route>-<label>-<width>.png` and `-full.png`, and one `<label>-report.json`
with, per width: the HTTP status and any redirect, the h1, horizontal overflow,
the order of `main`'s sections, and every visible control under 44px in
either dimension (inline text links are exempt). It also lists console errors
and any browser request it blocked. The stored consent is set to denied so the
banner does not cover the page; `COOKIE_BANNER=1` leaves it up. Vercel Web
Analytics' script 404s locally on every page and is left out of the console
errors.

After a code change, repeat steps 3 and 5 (the stand-in and its fixtures can
stay up; restart step 4 after each build).

## Safety

- **Loopback only.** The stand-in binds `127.0.0.1:54321` and nothing else.
  `capture-signed-in.mjs` refuses a `BASE_URL` that is not
  `http://127.0.0.1`, refuses to run unless the stand-in answers its marker
  route (`GET /__loopback-mock`), and refuses unless the repo's `.next` build
  inlined `http://127.0.0.1:54321`. In the browser it aborts every request to
  another host.
- **No production `.env`.** `build-isolated.sh` takes the `dev-isolated.sh`
  environment (loopback Supabase origin, providers, mail and analytics
  blanked, Sentry off, refusal of a live Stripe key), adds CI's Stripe
  placeholders and blanks `SENTRY_AUTH_TOKEN`, so the build neither reads the
  hosted project nor uploads source maps. Process env beats `.env*` in Next.js.
- **Fixture data only.** The user is `internal-e2e@usetruecap.invalid`, and
  every deal's address starts with `Fixture `. The stand-in refuses a fixture
  file that breaks either rule.
- **Writes dropped.** POST, PATCH and DELETE to PostgREST answer success and
  change nothing.

## What the stand-in covers

- Auth: password and refresh-token grants, `GET /auth/v1/user`, logout,
  settings. Sessions are JWTs signed with a throwaway key; the app checks
  them by asking `/auth/v1/user`, which the stand-in answers.
- PostgREST reads: `eq`, `neq`, `is`, `not`, `in`, `gt(e)`, `lt(e)`,
  `(i)like` filters; `order`, `limit`, `offset`; `count=` through
  `Content-Range`; single-object responses; embeds such as `plans(entitlements)`
  or `saved_analyses!inner(...)` joined by the conventional `<table>_id` key;
  aliased JSON paths such as `cap_rate_raw:result_snapshot->>capRate`.
- Not covered: `or=` and `and=` filters (ignored), Storage (404), RPC (returns
  `null` unless the fixtures carry an `rpc` map).

`/dashboard`, `/dashboard/saved-analyses` and `/dashboard/compare` render with
the fixtures as generated. A page that reads another table gets an empty list
until `gen-fixtures.vitest.ts` adds rows for it under `tables`; the stand-in's
log (one line per request) shows what a route asked for.

## Files

- `gen-fixtures.vitest.ts`: builds `fixtures.json` the way a save does
  (`recomputeSavedDealVerdict`, then the Offer Ceiling from
  `resolveOfferCeilingForAccess`, at today's methodology version). Named
  `*.vitest.ts` so `npm test` never picks it up; `gen-fixtures.config.ts` runs
  it, and only it, with the repo's aliases and the server-only stub.
- `mock-supabase.mjs`: the stand-in. `MOCK_QUIET=1` silences its log.
- `build-isolated.sh`: the isolated production build.
- `capture-signed-in.mjs`: sign-in, captures and the report. It resolves
  `playwright` from the repo's `node_modules`, so it runs from any directory.
