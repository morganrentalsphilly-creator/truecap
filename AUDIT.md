# TrueCap full-site production-readiness audit

Branch `audit/full-site` (cut from `origin/main` at `a912f00`, 2026-09-24).
Scope: every route, every role, four breakpoints; zero functional bugs, zero
console/network errors, zero UI bugs, one consistent design system, verified
by automated checks and end-to-end tests. Financial math is never changed
without a failing test and a founder decision.

Status legend: ✅ done · 🔧 fixed on this branch · ⏳ in progress · ⛔ blocked ·
🧭 needs Morgan's decision.

## 0. Summary

_(filled in Phase 4)_

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
  No production data was read or written. 🧭 Morgan: consider replacing
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

_(3.2 crawl, 3.3 links/images, 3.4 axe, 3.5 Lighthouse, 3.6 SEO, 3.7 security
follow.)_

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

_(pending)_

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
| M-1 | Low | `/methodology` | the page never states that monthly expense lines are rounded to whole dollars before summing, so a reader reproducing the formula gets a slightly different NOI | one sentence added under "Cap rate" (Phase 3 clarify) | _pending_ |

## 7. Needs Morgan's decision

| ID | Decision | Context | Recommendation |
| --- | --- | --- | --- |
| D-1 | Move the ~120 `opengraph-image.tsx` routes (and `app/og/home/route.tsx`) off `runtime = "edge"` | Next 16 warns the Edge Runtime is deprecated; `next/og` renders under the Node runtime too, but this changes where ~120 functions execute on Vercel (cold-start and pricing profile) | migrate in one PR after this audit, verify one OG image per family |
| D-2 | Replace the production keys in the checkout's `.env` with a development project | a stray `npm run dev` on this machine writes to production with service-role power | create a dev Supabase project, or delete `.env` and rely on `scripts/dev-isolated.sh` |
| D-3 | Install Docker Desktop (or OrbStack) on this machine | without it the authenticated Playwright gate and the seeded free/Pro crawls cannot run locally; CI is the only place they run | install; the CI recipe (`supabase start`, `db reset`, seed) then works locally verbatim |
| D-4 | Add test-mode Stripe secrets (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, the two Pro price ids) as GitHub Actions secrets for a billing lane | CI currently runs with `sk_test_ci_placeholder`, so upgrade / cancel / failed-payment / webhook flows cannot be exercised end-to-end anywhere; only the route-level unit tests cover them | add the secrets to a protected environment and gate a `billing-e2e` job on it |

## 8. Known issues and next steps

_(pending)_
