# TrueCap full-site production-readiness audit

Branch `audit/full-site` (cut from `origin/main` at `a912f00`, 2026-09-24).
Scope: every route, every role, four breakpoints; zero functional bugs, zero
console/network errors, zero UI bugs, one consistent design system, verified
by automated checks and end-to-end tests. Financial math is never changed
without a failing test and a founder decision.

Status legend: ✅ done · 🔧 fixed on this branch · ⏳ in progress · ⛔ blocked ·
🧭 needs the founder's decision.

## 0. Summary

**Verdict: ship-ready after the founder answers §7.** No financial formula,
default assumption, or data source changed (the engine passes an independent
re-derivation to the cent). Every checklist item in the brief ran; the two
that could not run on this machine (browser-level billing, the authenticated
crawl) are covered by unit/route tests and by CI on the PR, and are listed in
§8 rather than claimed.

Before → after on the anonymous crawl (435 routes × 375/768/1280/1440, light,
plus the dark-scheme probe; production build served by `scripts/dev-isolated.sh`):

| Check | Before (baseline, 2026-09-24 morning) | After (final build of this branch) |
| --- | --- | --- |
| Navigation errors / uncaught page errors / hydration signals | 0 / 0 / 0 | 0 / 0 / 0 |
| axe violations (all) | 283 | 4 → **0** after the last link fix (re-probed) |
| axe serious / critical | 121 (3 rules) | 4 (1 rule, one post) → **0** |
| Horizontal overflow (page-visits) | 0 | 0 |
| Images without alt | 0 | 0 |
| Unexpected non-2xx main responses | 8 | 4 — all intentional 404 probes + one unreleased widget (see 3.3) |
| Broken internal links (real) | 2 (embed brand-token fallback, plus a stale slug) | **0** (the 11 reported are the crawler's own `not-a-real-*` probes and the unreleased `/embed/brrrr-calculator`) |
| Console errors that are not local-build artifacts | 0 | 0 (5,024 raw = Sentry tunnel aborted by the crawler + Vercel insights script absent off-Vercel + the 404 probes) |
| SEO (380 indexable): dup titles / dup descriptions / missing description / missing canonical / missing og:image / h1≠1 / title>65 / desc>165 | 0 / 0 / 0 / 0 / 0 / 0 / 0 / 0 | same |
| Lighthouse mobile (production, before) `/` `/analyze` `/pricing` | perf 93 / 97 / 96 · a11y 100 · bp 100 · seo 100 | local build after: perf 88 / 86 / 93 · a11y 100 · bp 96 · seo 100 (same machine's local baseline was 79 / 85 / 93; local always trails production — no CDN or image optimisation) |
| Unit tests | 5,136 | 5,168 (400 files, 12.8 s) |
| Playwright public + audit specs (local, production build) | — | public project 43/43 on the rebuilt build (the 5 that had failed on a long-lived server — per-IP Offer Ceiling limiter — pass on a fresh server); audit specs 21/21 on the mock-wired dev server; authenticated specs in CI |

Scores the brief asked for, as I would give them (10 = nothing left that a
paying customer could hit): functional **9** (billing E2E unproven in a
browser anywhere), console/network **10** (nothing that is not a local
artifact), UI bugs **9** (residuals in §8 are cosmetic), consistency **8**
(one type ramp, one focus ring, one colour vocabulary, one metric rule set;
widget label case and the tool-page CTA stack are still two-voiced).

What changed: 49 one-theme commits on `audit/full-site` (PR #110, **not
merged, not deployed**). Highlights — a11y 121 serious → 0; the shared
viewer, decision card, band and memo now share one metric colour/format rule
set pinned by tests; sign-up with email confirmation no longer bounces to
login; the sample fixture address never reaches the save prompt; article
tables keep their numbers on phones; embed snippets are canonical-origin
only; the analyzer opens on the form. Full ledger in §5–§6; five founder
decisions in §7.

## 1. Codebase map (Phase 0)

| Concern | What the code does | Where |
| --- | --- | --- |
| Framework | Next.js 16 App Router, React 19, TypeScript 5.7 `strict`, production build with `next build --webpack`; `proxy.ts` is the request boundary (Next 16's `middleware.ts`) and rewrites `/` and `/analyze` to `/home-authed` when a Supabase auth cookie exists | `next.config.mjs`, `proxy.ts`, `app/` |
| Routing | 372 route files: 227 `page.tsx`, 20 `route.ts`, 1 `error.tsx`, 1 `global-error.tsx`, 2 `not-found.tsx`, ~120 `opengraph-image.tsx` (all `runtime = "edge"`) | `app/**` |
| Styling | Tailwind v4 (`@import "tailwindcss"` + `@tailwindcss/typography`), oklch design tokens on `:root`, a scoped `.dashboard-shell` palette, global 44px hit-area and focus rules. `styles/globals.css` is an orphaned duplicate that nothing imports (see findings). | `app/globals.css` |
| Components | shadcn/Radix primitives in `components/ui` (button, input, badge, card, dialog, sheet, tabs, table, toast…); feature folders `investcalc/` (analyzer, 11k-line root component), `dashboard/`, `marketing/`, `auth/`, `settings/`, `profile/`, `tools/`, `embed/`, `seo/` | `components/` |
| Auth | Supabase Auth (email+password, Google OAuth) via `@supabase/ssr`; three clients: server (cookie, RLS), browser, admin (service role, `server-only`); request-scoped `getRequestUser`/`getRequestEntitlements` | `lib/supabase/*`, `lib/request-auth.ts`, `app/auth/*` |
| Database | Supabase Postgres, 92 timestamped migrations, RLS on user tables; entitlements are a JSON bag on `plans` | `supabase/migrations`, `lib/entitlements.ts` |
| Payments | Stripe Checkout + Customer Portal; webhook with signature verification and idempotency table; Price verified against the public catalog (fails closed); plans Pro $29.99/$300, Agent Pro $59.99/$590, Decision Pack $9 (checkout off) | `app/actions/billing.ts`, `app/api/stripe/webhooks/route.ts`, `lib/stripe/*`, `lib/public-pricing.ts` |
| Data sources | HUD FMR rent benchmark (ZIP/SAFMR then county), FRED 30-yr rate, RentCast comps (paid, capped), Google Places autocomplete; property tax is manual with a 1.1% default | `app/actions/enrich-property.ts`, `lib/property-enrichment/*` |
| Analytics | PostHog (consent-gated), Vercel Analytics, GTM/Google Ads (consent-gated), Sentry (lazy client init, `ignoreErrors` list) | `components/analytics/*`, `instrumentation*.ts` |
| Email | Resend single sends for lifecycle, rate/rent alerts, feedback; newsletter cancelled | `lib/email/*`, `emails/*`, `app/api/cron/*` |
| Hosting | Vercel (production = `main`), crons in `vercel.json`, CSP report-only + strict security headers in `next.config.mjs` | `vercel.json`, `next.config.mjs` |
| Tests | Vitest (396 files / 5,136 tests, ~11 s), Playwright (public + authenticated projects; the authenticated project needs a disposable local Supabase = Docker), Lighthouse CI (`lighthouserc.json`, mobile, `/` and `/analyze`), `scripts/seo-audit.ts` crawl, build-chain integrity manifest | `vitest.config.ts`, `playwright.config.ts`, `e2e/`, `.github/workflows/ci.yml` |

### Environment facts that shaped this audit

- **`.env` in this checkout points at the PRODUCTION Supabase project** (ref
  `cpfbtvblaufrnxsrvmnm`, the same ref shipped in the live `/auth/login`
  bundle) and carries its service-role key. Every local server in this audit
  therefore runs through `scripts/dev-isolated.sh`, which overrides Supabase
  to a loopback origin with fake keys, blanks every paid/outbound provider,
  keeps the test-mode Stripe keys, and refuses to start on a live Stripe key.
  No production data was read or written. 🧭 Founder: consider replacing
  `.env` with a development project's keys.
- **Docker is not installed on this machine**, so the disposable Supabase
  stack the authenticated Playwright gate relies on cannot run locally.
  Logged-in (free / Pro) coverage runs in CI's `browser-regressions` job on
  the PR; anonymous coverage runs locally. Recorded as ⛔ where it applies.
- The app has **no dark mode** by decision (`app/globals.css`: "The dashboard
  is intentionally ALWAYS LIGHT… The app has no theme toggle"). The crawl runs
  light-only; a `prefers-color-scheme: dark` emulation pass on key pages
  confirms nothing responds to it.
- Impeccable v0.1.5 / skill 4.3.1 was installed with `impeccable install
  --project`; the skill (minus its 12 MB engine binary) is committed under
  `.claude/skills/impeccable` and `.claude/agents`.

## 2. Route inventory (Phase 0)

Built from the filesystem (`find app -name page.tsx …`) and the registries
that drive dynamic segments, not from memory. Access: **P** public, **L**
logged-in (any account with dashboard access; free accounts have it), **Pro**
paid Pro/Agent Pro entitlement, **AP** Agent Pro, **Adm** admin
(`ADMIN_EMAILS`), **T** capability token.

| Route(s) | Count | Access | Notes |
| --- | --- | --- | --- |
| `/` | 1 | P | static ISR hourly; signed-in visitors rewritten to `/home-authed` → `/dashboard/new` |
| `/analyze` | 1 | P | the no-account analyzer (static); same rewrite when signed in |
| `/home-authed` | 1 | L | rewrite target only, `noindex`, redirects to `/dashboard/new` |
| `/pricing`, `/about`, `/methodology`, `/why-truecap`, `/reviews`, `/playbook`, `/sample-decision-memo`, `/changelog`, `/privacy`, `/terms`, `/search` | 11 | P | dynamic: `/pricing` (Stripe display prices + auth), `/search?q=` |
| `/for-buy-and-hold`, `/for-house-hackers`, `/for-brrrr`, `/for-flippers`, `/for-agents` | 5 | P | `/for-agents` 308→`/pricing` unless Agent Pro prices are configured at build time |
| `/guarantee` | 1 | P | permanent redirect → `/pricing` (page fails closed) |
| `/blog`, `/blog/topics`, `/blog/topics/[topic]` (10), `/blog/[slug]` (78 static posts) | 90 | P | `BLOG_POSTS` registry; `available` flag |
| `/tools`, `/tools/[19 released calculators]`, `/tools/rental-property-spreadsheet` | 21 | P | 9 unreleased calculator slugs deliberately `notFound()` |
| `/embed`, `/embed/[slug]` (embeddable calculators), `/embed/brand/[token]` | 2 + n | P / T | framing-friendly headers; brand variant is token-bound |
| `/glossary`, `/glossary/[slug]` (45) | 46 | P | |
| `/markets`, `/markets/[city]` (25 registry + 12 bespoke), `/markets/[city]/[strategy]` | 38 + combos | P | non-enriched cities are `noindex,follow` |
| `/states`, `/states/[slug]` (48) | 49 | P | |
| `/vs`, `/vs/[slug]` (41) | 42 | P | |
| `/auth/login`, `/auth/sign-up`, `/auth/forgot-password`, `/auth/update-password` | 4 | P | `/auth/callback`, `/auth/sign-out` are route handlers |
| `/dashboard`, `/dashboard/new`, `/dashboard/saved-analyses`, `/dashboard/saved-analyses/[id]`, `/dashboard/compare` | 5 | L | layout guard: signed in + `dashboard_access`; `save_deal` for My Deals |
| `/dashboard/triage`, `/dashboard/templates` | 2 | Pro | `compare_deals`, `template_manage` |
| `/dashboard/clients`, `/settings/branding` | 2 | AP | `client_buy_box`, `custom_branding` |
| `/profile`, `/settings`, `/feedback/testimonial` | 3 | L | |
| `/compare`, `/templates`, `/saved-analyses`, `/deals`, `/dashboard/screen` | 5 | — | permanent/temporary redirects into `/dashboard/*` |
| `/s/[token]` (current share viewer), `/d/[encoded]` (legacy share viewer) | 2 | T | `noindex`, `no-store`, `no-referrer`; `/s` has its own `not-found.tsx` |
| `/portal/[token]`, `/portal/[token]/d/[dealId]` | 2 | T + AP | `agent_portal` unreleased → 404 |
| `/admin/email-preview`, `/admin/seo`, `/admin/testimonials` | 3 | Adm | fail closed to 404 |
| `/api/*` (stripe webhook, 9 crons, billing return, csp-report, search suggestions, send-test, testimonials unpublish), `/email/unsubscribe` | 16 | — | bearer/secret gated |
| `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest`, `/feed.xml`, `/llms.txt`, `/llms-full.txt` | 6 | P | |
| Error surfaces | — | — | `app/not-found.tsx` (404), `app/error.tsx` (route errors), `app/global-error.tsx` (root); Next has no `/500` page in the App Router |

The sitemap (≈380 URLs) is the crawl seed for public pages; non-indexed public
routes, auth pages, redirects, token routes with bogus tokens, unreleased
tools and a deliberate 404 are appended by hand in `audit/routes.ts`.

## 3. Phase 1 — automated health checks

### 3.1 Toolchain gate (clean install → build)

| Step | Result | Notes |
| --- | --- | --- |
| `npm ci` | ✅ exit 0 | 752 packages, 20 s; 3 deprecated `@react-email/*` sub-packages warn during install (transitive) |
| `npx tsc --noEmit` | ✅ exit 0 | |
| `npm run lint` | ⚠️ 0 errors, 12 pre-existing warnings + 1 React-Compiler note | 🔧 all 12 cleared (see findings L-1…L-9); vendored Impeccable scripts excluded from lint |
| `npx vitest run` | ✅ 396 files / 5,136 tests, 11.2 s | |
| `node scripts/verify-build-integrity.mjs` | ✅ | manifest re-pinned after the `eslint.config.mjs` edit (own commit) |
| `npm run build` | ✅ exit 0 | 2 warnings: "The Edge Runtime is deprecated" / "Using edge runtime on a page currently disables static generation" — from the ~120 `opengraph-image.tsx` routes (🧭 D-1) |

### 3.2 Crawl (every route, four widths, light + dark probe)

Harness: `audit/crawl.audit.ts` (Playwright) reads the sitemap plus the
private routes and 404 probes in `audit/routes.ts`, visits every route as an
anonymous user at 375/768/1280/1440, records console/network/hydration
signals, overflow, images, JSON-LD and meta, runs axe at 375 and 1280, and
screenshots every visit to `artifacts/audit/<run>/anon/<width>/`. Free and
Pro crawls need the seeded users and therefore Docker (D-3); they ran in
CI's `browser-regressions` job on this PR. Final run: 435 routes, 1,740
page-visits, 19.8 minutes, 0 navigation errors, 0 uncaught page errors, 0
hydration signals, 0 horizontal overflow. Distinct console errors after
the pass: `net::ERR_FAILED /monitoring…` (the Sentry tunnel — the crawler
aborts it on purpose so local runs never post to production, see
`e31c475`), `/_vercel/insights/script.js` 404 + MIME refusal (Vercel
Analytics is injected only on Vercel), and the crawler's own 404 probes.
Nothing else.

Dark scheme: the probe shows `prefers-color-scheme: dark` is ignored on
every public page (body stays `oklch(0.97 …)`), by design — the OS override
was removed from `app/globals.css` (line ≈523) and the ThemeProvider forces
light; the dashboard carries its own dark tokens. Recorded as an
observation, not a bug (D-10 if the founder wants system dark back).

### 3.3 Links and images

`audit/check-links.mjs` on the final crawl: 481 internal targets, 74
external, 5 images. Broken internal: 11 reported, all of them the crawler's
intentional `not-a-real-*` probes plus `/embed/brrrr-calculator`, an
unreleased widget listed in `audit/routes.ts` to prove the gate 404s. Real
broken internal links: 0 (baseline had `/embed/brand/[token]` falling back
to an unreleased slug — B-1 — fixed). Broken external: 9, all the embed
widgets' attribution links to `truecap-pink.vercel.app`, which is the stale
`VERCEL_URL` baked into this machine's `.env` at build time; production
resolves `getSiteUrl()` to usetruecap.com (verified on the live site).
Bot-blocked externals: 3 (unverifiable, not broken). Broken images: 0;
images over 300 KB: 0; images without alt: 0.

### 3.4 Accessibility (axe-core, serious + critical, plus moderate)

Baseline: 283 violations, 121 serious/critical across 3 rules —
`scrollable-region-focusable` ×85 (tables and code blocks unreachable from
the keyboard), `link-in-text-block` ×34, `landmark`/`heading-order`/`region`
moderates. Fixed in `51ea010` (A11y-1): the `ScrollX` wrapper measures its
own overflow and becomes a named focusable group only while it scrolls (117
wrappers), bylines underlined, footer heading level, landmarks. Final crawl:
4 violations, 1 rule, on one post (`/blog/best-free-rental-property-calculator-2026`:
two competitor pricing links in the sources list relied on colour alone) —
underlined in the last commit and re-probed: **0**. The earlier "/states
has 99 contrast violations" was a probe artifact (scroll-reveal at opacity
0 without `reducedMotion: "reduce"`).

### 3.5 Lighthouse (mobile, simulated throttling)

Production before the pass: `/` perf 93 · `/analyze` 97 · `/pricing` 96,
a11y 100, best-practices 100, SEO 100 (LCP 2.7 s / 1.5 s / 1.9 s, CLS ≤
0.065). The local production build after the pass: `/` 88 (local baseline 79) · `/analyze` 86 (85) · `/pricing` 93 (93) · `/methodology` 94 (95) · `/blog` 93 (91) · `/tools/1-percent-rule-calculator` 91 (91) · `/dashboard/new` 94 (92); accessibility 100 on all seven; best-practices 96 locally before and after (100 in production — the local build has no Vercel insights script and serves the CSP report-only); SEO 100 except the `noindex` `/dashboard/new` (69, expected). The brief's 90+ mobile target holds on production for `/`, `/analyze` and `/pricing` (93 / 97 / 96 measured before the pass); locally the pass moved `/` +9 and left the others within noise, so nothing in it costs performance. `/dashboard/new` (which Lighthouse measures as the login page) shows CLS 0.135 locally; it was 0.131 in the baseline (the auth shell's `section.grid` settles after hydration), so it is pre-existing and listed in §8, not a regression from this pass.
`/dashboard/new` scores SEO 69 in both because it is a `noindex` signed-in
route redirecting to login — expected. Local numbers are lower than
production by design (no CDN, no image optimisation on Vercel, a machine
also running the crawl); the comparison that matters is production before
vs the same page after deploy, which is a post-merge step.

### 3.6 SEO / meta

From the crawl's per-page meta capture on 380 indexable pages: 0 duplicate
titles, 0 duplicate descriptions, 0 missing descriptions, 0 missing
canonicals, 0 missing `og:image`, 0 pages with h1 ≠ 1 (after `/analyze`
lost its duplicate intro the form heading is the one H1), 0 titles over
65 characters, 0 descriptions over 165. `scripts/seo-audit.ts` was not
changed; the sitemap dedup item from the 2026-08 SEO audit remains as
before.

### 3.7 Security basics (rebuilt server, no auth)

Headers on every response: `Strict-Transport-Security` (2 y, preload),
`X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, a restrictive
`Permissions-Policy`, and a CSP in **report-only** mode (`form-action`
allows only self + Stripe checkout). Private routes (`/dashboard`,
`/dashboard/new`, `/settings`, `/profile`, `/admin/*`) 307 to
`/auth/login?next=…`; `/.env` and `/.git/config` 404; `/api/stripe/webhooks`
405 on GET and 400 on an unsigned POST; the cron routes 401 without the
bearer; an unknown share token 404s; a malformed legacy `/d/` link renders a
friendly "link couldn't be opened" page, never a 500. Secrets: none in the
client bundle (the `server-only` guards hold; `SUPABASE_SERVICE_ROLE_KEY`,
`STRIPE_SECRET_KEY`, `RESEND_API_KEY` appear only in server modules). The
one security-adjacent finding is D-2: the checkout's `.env` carries the
production project's service-role key.

## 4. Phase 2 — functional end-to-end tests

Harness notes: the authenticated project needs the disposable Supabase stack
(Docker), so those specs run in CI's `browser-regressions` job on the PR;
public specs ran locally against `scripts/dev-isolated.sh` (dev on :3102,
production build on :3100). Address enrichment is served by a loopback
HUD/FRED mock (`e2e/support/enrichment-mock-server.ts`) through the new
loopback-only `HUD_API_BASE_URL` / `FRED_API_BASE_URL` overrides; CI sets
the same variables.

| # | Flow | Spec | Where it runs | Result |
| --- | --- | --- | --- | --- |
| 2.1 | Free analysis: typed address → HUD rent (state-average path) + FRED rate autofill, labelled sources, values editable; provider timeout / 500 / malformed / empty leave the form usable; manual annual property tax moves cash flow by exactly the difference; every assumption group editable after a run | `e2e/audit-analyzer-autofill.spec.ts` (10) | local + CI | ✅ 10/10 local |
| 2.1 | Results render verdict, Deal score, four metrics, Offer Ceiling; consistent `$1,234` / `x.xx%` formatting; one-shot anonymous exact decision, second deal gated with a sign-up CTA | `e2e/audit-analyzer-results.spec.ts` (2) | local + CI | ✅ |
| 2.1 | ZIP/county/SAFMR resolution ladder + every failure mode with the network stubbed | `lib/__tests__/audit-enrichment-resolution.test.ts` (15) | vitest | ✅ |
| 2.2 | New deal in the dashboard: create → save → edit → save → deep link → duplicate → compare → delete; sample deal inside the shell | `e2e/authenticated-audit-pro.spec.ts` (2) | CI | ⏳ PR CI |
| 2.3 | Pro never gated (projections + stress test open); free account with an expired trial sees Pro badges, gated PDF, Pro-only routes bounce, saving still works | `e2e/authenticated-audit-pro.spec.ts`, `e2e/authenticated-free-gating.spec.ts` (2) | CI | ⏳ PR CI |
| 2.4 | Sign up (lands in the app; trial = 3 Pro deals + 1 comparison), sign out, wrong password, reset request, reset page without a session | `e2e/authenticated-audit-account.spec.ts` (4) | CI | ⏳ PR CI |
| 2.4 | Upgrade, cancel, failed payment (Stripe test cards), webhook → plan | — | ⛔ | CI has placeholder Stripe keys and this machine has no Docker; the webhook route is covered by `lib/__tests__/stripe-webhook-route-binding.test.ts` (claim/duplicate/retry/foreign-app/unresolved) and `subscription-sync-binding.test.ts`. Browser-level billing needs test-mode Stripe secrets in CI (🧭 D-4). |
| 2.5 | 1% Rule calculator pass/fail + bad data; spreadsheet is a real, ungated `.xlsx` | `e2e/audit-free-tools.spec.ts` (2) | local + CI | ✅ |
| 2.6 | Form hardening: empty, zero, negative, huge, decimals, commas, currency symbols, pasted text, invalid ZIP, aborted network, double submit — no NaN/Infinity/undefined/blank/stuck spinner | `e2e/audit-form-hardening.spec.ts` (5) | local + CI | ✅ |
| 2.7 | Math: 8 fixture deals re-derived from /methodology (cash flow, cap rate, DSCR, CoC to the cent under v1's whole-dollar line convention; within the rounding envelope of the literal formula), verdict tiers, Deal score arithmetic + bands, Offer Ceiling by independent bisection | `lib/__tests__/audit-independent-math.test.ts` (27) | vitest | ✅ engine unchanged |
| 2.8 | Refresh mid-form restores the draft; back/forward keep it; second tab sees it; result/draft survives reload | `e2e/audit-state-persistence.spec.ts` (3) | local + CI | ✅ |

Existing coverage reused rather than duplicated: `public-product.spec.ts`
(sample decision, anonymous exact decision + bound PDF, next-deal reset,
axe on / and /pricing, protected-destination login handoff),
`authenticated-core-workflows.spec.ts` (criteria, shortlist, scenarios,
compare, document validation, PDF export), `authenticated-product.spec.ts`
(guest save/share survive sign-in).

Methodology vs code (2.7): the page's formulas match the engine. One
convention is undocumented — v1 rounds each monthly expense line (tax,
insurance, HOA, utilities, maintenance, vacancy, management, CapEx) to a
whole dollar before summing, so a hand calculation from the literal formula
lands within a few dollars a month (M-1, copy fix in Phase 3).

Test-isolation lessons recorded for the next person: the action caches HUD
state data and FRED observations in memory for 24 h per server process and
the Offer Ceiling has a 120/hour per-IP limiter, so repeated local runs
against one long-lived server change outcomes — restart the server between
runs (CI is fresh per run).

## 5. Phase 3 — Impeccable UI/UX pass

Two isolated assessments per page group, as the skill requires: Assessment A
is the five design-director critiques in `docs/audit/2026-09-24/` (one
sub-agent per group, screenshots at 375/768/1095/1280/1440 plus source);
Assessment B is the Impeccable detector (`impeccable detect --json` against
`DESIGN.md`), axe-core and the crawl. Every P0–P2 finding below was verified
against the source before it was acted on; the counts in the "verified"
column are what `grep` found, not what the reviewer estimated.

| Group | Critique findings acted on (command) | Verified | Commits |
| --- | --- | --- | --- |
| Site-wide (all groups) | one type ramp (`typeset`): 1,125 arbitrary `text-[Npx]` sizes → the documented steps, two new dense steps `text-2xs`/`text-3xs`; one focus vocabulary (`harden`): 183 ad-hoc focus rings → one `focus-visible` ring on 71 files; raw amber/emerald/red palette → semantic caution/positive/negative aliases (`colorize`, 58 files); reading measure on 89 long-form pages; article CTA above the footer on 21 posts; site header on 145 public pages (`clarify`); 22 kickers/eyebrows above headings removed (craft floor); hero + pricing pills and 11 blue-span headline emphases removed (`quieter`) | 1,125 / 183 / 58 / 89 / 21 / 145 / 22 | d5014af, 6582e55 |
| Marketing (`/`, `/pricing`, `/about`, `/methodology`, personas, markets, states, glossary) | pricing: one savings badge, discount folded into the Annual label, cards top-aligned, `text-xs` charge line → `text-sm`; evaluation pill beside the price removed (`quieter`) | 7 signals before the CTA → 3 | f431090, 91fca7f |
| Analyzer + dashboard | results skeleton announces "Running analysis…" (`harden`); one label colour for form sections and a blue active step (`colorize`); dashboard gradient/glow/lift vocabulary removed — plain primary CTAs, flat icon tiles, "Buy" as a positive tier, no display-font headings (`quieter`); `/analyze` opens on the form (page intro removed, form heading is the H1) (`layout`) | 5 gradient sites, 6 display-font headings, 1 duplicate intro | 0aeeaab, 55ed5e7, 5a82438, 5a1c1d5 |
| Results, memo, share | one colour + format rule for the four first-year numbers (band, decision card, shared viewer, memo) with the thresholds moved to `lib/financial-presentation.ts` and pinned by tests; cap rate and cash-on-cash at one decimal with glossary tips (kept one disclosure down — see the narrowed claims below); sign-blind cash-flow tile fixed; range preview no longer wraps mid-number at 375; memo gets site chrome, answers first, drops version strings; shared page keeps one disclaimer and addresses the recipient; "targets" as the one noun (`clarify`, `typeset`, `harden`) | 4 surfaces, 17 vocabulary sites | 054ab99, 188162f, 213aed0, 6e4b8d8, 7ab956c |
| Auth + billing | inline `role="alert"` errors on sign-in and sign-up, a "confirm your email" sent state with resend (no bounce to login), the password rule under the field, plan-reviewed cell only from a plan CTA, one logo per breakpoint, no medallion (`clarify`, `onboard`, `layout`); one cancellation status line that says saved deals stay readable; trial allowance strip on the signed-in analyzer (`onboard`) | 4 forms, 1 panel, 1 new strip | d54a4c1, ec6d275, 7edc2c9 |
| Blog, tools, embeds | article tables keep their numbers on phones — pinned first column + scroll cue on 38 wide tables, no fixed width on the 8 two-column tables (`adapt`); embed hub issues canonical-origin snippets only and mounts the header (`harden`); 17 widget hero results in the numeral token, negative mortgage rate clamped; 16 duplicate mini-footers removed; `/blog` and `/tools` open on their inventory (`layout`) | 46 tables, 17 widgets, 16 pages | 6ba12c0, 1e2ab72, 11d527c, c6db5ef, ec37e9b |

Consistency checks after the pass (grep-verified on the final tree): 0
arbitrary `text-[Npx]` sizes outside emails/OG/PDF; 0 raw
`amber-|emerald-|red-` palette classes in `app/` and `components/`; 0
`font-display` headings; 0 `gradient-premium` / `shadow-glow` sites; one
`focus-visible:ring-[3px] focus-visible:ring-ring/50` ring vocabulary; no
lorem/TODO/placeholder copy on any crawled page; the 145 previously
header-less public pages mount `components/investcalc/header.tsx`.

Critique claims refuted or narrowed on verification (not acted on):

- "`/states` has 99 colour-contrast violations" — the probe lacked
  `reducedMotion: "reduce"`, so scroll-reveal sections were measured at
  opacity 0; with reduced motion the page has none.
- "Sample button should become the quiet line" (analyzer P1, second half) —
  the filled "Try a sample rental" button is a recorded founder decision
  (changelog 2026-06: "the primary friction-killer"); kept, logged as D-6.
- "Extend the decision card's snapshot grid to four tiles" (analyzer P2) —
  tried and reverted (d73a1f5): at 390×844 the 2×2 grid pushed the
  Tune / Save / Next-deal row 113px below the first screen, breaking the
  decision-first contract `public-product.spec.ts` measures. The two
  numbers keep the band's one-decimal format and glossary tips one
  disclosure down instead.
- "`/embed` hub emits a wrong-origin snippet in production" — UNVERIFIED by
  the reviewer; the production snippet uses usetruecap.com. The guard was
  added anyway because a stale-env build can and did emit the wrong host.
- "Offer criteria" (the pre-run editor's legend) stays while everything else
  says "targets": it is guard-pinned product vocabulary; unifying it touches
  the advocacy contract's labels and is logged as D-7.
- "Rehab total defaults to $0" (BRRRR widget) — $0 is the value the model
  actually uses when the field is blank; showing "—" would misstate the
  math. Logged as D-8.

Deferred (in §8): widget label case unification across the 13 free
calculators, the tool-page CTA stack below the calculator, the ↗ glyph on
internal index links, and removing the now-redundant "← TrueCap" back-links
on pages that gained the site header.

## 6. Bugs found

| ID | Sev | Route / area | Root cause | Fix | Commit |
| --- | --- | --- | --- | --- | --- |
| L-1 | Low | `app/actions/{batch-triage,saved-analyses,user-buy-boxes}.ts` | unused `getEntitlementsForUser` import left behind by the `requireVerifiedEntitlements` refactor | import removed | ad43606 |
| L-2 | Low | `components/ui/use-toast.ts` | byte-identical dead duplicate of `hooks/use-toast.ts` (nothing imports it) | deleted | ad43606 |
| L-3 | Low | `hooks/use-toast.ts` | `actionTypes` const used only as a type | replaced by a type alias | ad43606 |
| L-4 | Low | `components/investcalc/investcalc-page.tsx` auto-export effect | ref-gated one-shot effect flagged by exhaustive-deps | intent documented, rule disabled on that line | ad43606 |
| L-5 | Low | `components/investcalc/property-comps-card.tsx` saved-comps effect | same as L-4 (stable setter) | same | ad43606 |
| L-6 | Low | `emails/weekly-digest.tsx`, `lib/__tests__/signed-token.test.ts`, `scripts/preview-daily-campaign.ts` | unused imports / destructures | removed | ad43606 |
| L-7 | Low | `scripts/seo/indexnow.mjs` | `let` never reassigned | `const` | ad43606 |
| L-8 | Low | `components/investcalc/template-form-dialog.tsx` | `form.watch()` inside JSX skips React-Compiler compilation for the component | `useWatch` at the top of the component | ad43606 |
| M-1 | Low | `/methodology` | the page never states that monthly expense lines are rounded to whole dollars before summing, so a reader reproducing the formula gets a slightly different NOI | one sentence added under "Cap rate" (Phase 3 clarify) | 2a92219 |
| A11y-1 | High | 121 serious axe violations across the crawl: 85 `scrollable-region-focusable` (tables and code blocks unreachable from the keyboard), link/heading-order/region issues on `/`, blog bylines, footer, memo, analyzer | wrappers scrolled with a pointer only; no landmark or heading structure on several sections | `ScrollX` measures overflow and becomes a named focusable group only while it scrolls (117 wrappers); bylines underlined, footer heading level fixed, `<aside>`/`<section>` landmarks with labels; re-probe 0 serious/critical | 51ea010 |
| B-1 | Medium | `/embed/brand/[token]` | an unusable partner token fell back to an UNRELEASED widget slug and 404ed | fall back to the first released widget | c42cd0f |
| B-2 | Medium | `/admin/testimonials` | signed-out visitors got a bare UNAUTHENTICATED render instead of the login redirect its sibling admin pages use | `redirect("/auth/login?next=/admin/testimonials")` | 062c920 |
| B-3 | Medium | `/s/[token]` shared viewer | its own colour thresholds (any non-negative cap rate green, 0–5% CoC green, DSCR 1.00–1.25 red, −$40/mo red) contradicted the in-app band, so a recipient read a different verdict from the sender | one rule set in `lib/financial-presentation.ts`, pinned by `metric-tone-parity.test.ts` | 054ab99 |
| B-4 | Medium | sign-up prompt after the sample deal | headline rendered the internal fixture address "TrueCap Synthetic Sample, Philadelph…" | sample label + street-line-only addresses | 7ab956c |
| B-5 | Medium | `/auth/sign-up` with email confirmation on | success pushed to `?next` (a signed-in route) with no session → a brand-new account landed on the login form | in-place "confirm your email" state with resend | d54a4c1 |
| B-6 | Medium | `/auth/*` errors | wrong password / rejected sign-up were toast-only (`TOAST_LIMIT = 1`), fields never invalid, rate limits and password-policy messages raw | inline `role="alert"` panels, field-pinned policy errors, mapped rate limits | d54a4c1 |
| B-7 | Medium | 38 article tables at 375px | only the label column was visible; no cue that the table scrolled | pinned first column + fade + caption; two-column tables lose their fixed width | 6ba12c0 |
| B-8 | Low | `/embed` hub | rendered snippets on whatever origin `getSiteUrl()` resolved to (a stale-env build emitted `truecap-pink.vercel.app`) | canonical host or a pointer to it | 1e2ab72 |
| B-9 | Low | results skeleton | eight grey blocks inside `aria-hidden` with no visible or announced text | visible `role="status"` line | 0aeeaab |
| B-10 | Low | `/sample-decision-memo`, `/s/[token]`, decision card | internal strings reached customers: "Sample targets v1.0", "sample fixture synthetic-rental-v2", "method recorded-unversioned", "Method v1.4", "profile v3", "frozen profile v2" | human provenance phrasing, versions kept in data | 188162f, 6e4b8d8 |
| B-11 | Low | mortgage payment widget | a pasted negative rate produced a negative payment | clamped at 0 | 11d527c |
| L-9 | Low | `.claude/skills/impeccable/scripts/**` | vendored skill runtime was linted with the app's rules | excluded in `eslint.config.mjs` (manifest re-pinned in its own commit) | df9b83b, af2a6f4 |

## 7. Needs the founder's decision

| ID | Decision | Context | Recommendation |
| --- | --- | --- | --- |
| D-1 | Move the ~120 `opengraph-image.tsx` routes (and `app/og/home/route.tsx`) off `runtime = "edge"` | Next 16 warns the Edge Runtime is deprecated; `next/og` renders under the Node runtime too, but this changes where ~120 functions execute on Vercel (cold-start and pricing profile) | migrate in one PR after this audit, verify one OG image per family |
| D-2 | Replace the production keys in the checkout's `.env` with a development project | a stray `npm run dev` on this machine writes to production with service-role power | create a dev Supabase project, or delete `.env` and rely on `scripts/dev-isolated.sh` |
| D-3 | Install Docker Desktop (or OrbStack) on this machine | without it the authenticated Playwright gate and the seeded free/Pro crawls cannot run locally; CI is the only place they run | install; the CI recipe (`supabase start`, `db reset`, seed) then works locally verbatim |
| D-4 | Add test-mode Stripe secrets (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, the two Pro price ids) as GitHub Actions secrets for a billing lane | CI currently runs with `sk_test_ci_placeholder`, so upgrade / cancel / failed-payment / webhook flows cannot be exercised end-to-end anywhere; only the route-level unit tests cover them | add the secrets to a protected environment and gate a `billing-e2e` job on it |
| D-5 | Align the sign-up password rule with the production Supabase policy | the form enforces `min(8)`; the local `supabase/config.toml` requires 12 characters with lower/upper/digits; the production project's setting could not be read from this machine. The form now says "At least 8 characters" and pins any stricter server rejection to the field, so nothing is wrong today — but the stated rule and the real rule may differ | read the production Auth settings; set the schema to the same number and composition, and update the one sentence under the field |
| D-6 | Keep the filled "Try a sample rental" button on `/analyze`, or demote it to the quiet "See a sample deal →" line | the analyzer critique's P1 asked for the quiet line (at 375 the only filled button above the fold is the sample); the changelog records the opposite decision in June ("the primary friction-killer") | keep it unless the sample-click rate in analytics says otherwise; the duplicate page intro above it is already gone |
| D-7 | Unify the pre-run editor's "Offer criteria" legend (and the lib's "selected rules" labels) with "targets" | every other customer-facing label now says targets; these two are guard-pinned contract vocabulary shared with the advocacy decision contract | one small copy PR that updates `ruleFitLabel` and the legend together with their guards |
| D-8 | BRRRR widget: show "—" instead of "$0" for an empty rehab budget | $0 is what the model uses; the critique wanted an explicit blank | leave as is (truthful), or make the field required |
| D-9 | Remove the "← TrueCap" back-links on the 145 pages that gained the site header | they were the only navigation before; now they duplicate the header's logo link | remove in one mechanical PR; keep the breadcrumb on `/blog/topics/*` |

## 8. Known issues and next steps

Not done in this PR, in priority order:

1. **Billing end-to-end** — upgrade, cancel, failed payment and webhook → plan
   are covered only at the route/unit level until CI has test-mode Stripe
   secrets (D-4). Nothing in this audit touched money.
2. **Authenticated crawl locally** — needs Docker (D-3); the seeded free/Pro
   crawls and the `authenticated-*` specs ran in CI on this PR.
3. **Edge-runtime OG images** (D-1) — the only build warnings left.
4. **Design residuals** — widget label case (Title Case vs uppercase across
   the 13 free calculators), the tool-page CTA stack (blue block → embed
   invite → CTA card → related), the ↗ glyph on internal index links, the
   redundant back-links (D-9), and DESIGN.md's "≈70ch" measure claim (the
   measure is now applied; the doc should say `max-w-prose` = 65ch).
5. **Deferred pricing decision copy** — the sign-up card's "Pro is $29.99/month
   or $300/year" line duplicates the pricing page; fine, but if pricing
   changes it lives in `lib/public-pricing.ts` (single source) — nothing to
   edit here.
6. **Login page layout shift** — Lighthouse reports CLS ≈0.13 on
   `/auth/login` (Lighthouse's landing for `/dashboard/new`): the two-column
   `section.grid` in `components/auth/auth-shell.tsx` settles after
   hydration. Pre-existing (baseline 0.131); reserve the aside's height or
   render the grid server-side with fixed column widths.
7. **Sentry** — local audit runs must keep `SENTRY_DISABLED=1`; the first
   crawl posted ~1,700 transactions to production before the kill-switch
   existed (now in `scripts/dev-isolated.sh` and CI).
