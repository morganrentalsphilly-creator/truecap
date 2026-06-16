# CLAUDE.md — TrueCap codebase orientation

> Read this first. It captures the patterns and load-bearing files that aren't
> obvious from grepping. If a section is wrong, fix it — don't work around it.

---

## 1. Project at a glance

**TrueCap** (https://usetruecap.com) is a rental-property investment
analyzer for individual real-estate investors. A user enters a property
(price, rent, financing, expenses) and gets a full underwrite in
seconds: cash flow, cap rate, cash-on-cash, DSCR, 10-year projections,
tax strategy, exit scenarios, plus a plain-English verdict and a
shareable read-only link.

- **Audience**: solo / small-portfolio buy-and-hold investors and house-hackers.
- **Business model**: free tier (run analyses, no save) + Pro at **$20/mo**
  or an annual plan (saved deals, dashboard, compare, templates, tax
  strategy, exit scenarios, PDF export, Deal Score, etc.). Pricing logic
  lives in the `plans.entitlements` JSON column — see `lib/entitlements.ts`.
- **Stack**: Next.js 16 (App Router, `--webpack` for prod), React 19,
  TypeScript 5.7 (strict), Supabase (Auth + Postgres + Storage), Stripe
  (subscriptions), Resend (Broadcasts API), Sentry, Tailwind v4,
  shadcn/Radix UI, Zod, react-hook-form, Recharts, jsPDF.
- **Solo founder**: Morgan (`morganrentalsphilly@gmail.com`).
  ~6 months of intensive work, ~320 completed tasks. Conventions are
  consistent but mostly tribal — that's what this doc is for.

### Product principle: stay easy to use (Morgan's standing directive)

Every new feature must preserve the core flow: type an address →
get a verdict. Concretely:

1. **No new required inputs.** Features consume what the form already
   collects. If a feature "needs" a new field, it's optional, defaulted,
   and lives behind Show Advanced Options.
2. **No new top-level navigation.** New capabilities land as a card in
   the existing analysis dashboard (like Deal Q&A under the
   recommendation row) or inside an existing tab — not as new tabs,
   pages, or menus.
3. **Invisible until useful.** Features that need configuration
   (API keys) or data (saved deals) render nothing until their
   prerequisites exist — never an empty state that needs explaining.
4. **Upsells appear at the moment of need,** not as ambient chrome
   (e.g. the PDF dialog opens on Export click; the Q&A upsell appears
   only when the free limit hits).
5. When a feature idea can't satisfy these, propose it to Morgan with
   the trade-off spelled out instead of building it.

---

## 2. Architecture

```
final_source_code/
├── app/                          # Next.js App Router
│   ├── actions/                  # Server Actions (all "use server")
│   │   ├── auth.ts
│   │   ├── billing.ts            # Stripe checkout + portal
│   │   ├── compare.ts
│   │   ├── deal-score.ts         # Pro deal-score scoring
│   │   ├── enrich-property.ts    # FRED rate + HUD FMR + state property tax
│   │   ├── exit-scenarios.ts     # Snapshot-cached
│   │   ├── newsletter.ts
│   │   ├── profile.ts
│   │   ├── saved-analyses.ts     # Save/edit/load/PDF
│   │   ├── tax-strategy.ts       # Snapshot-cached
│   │   ├── ten-year-projections.ts # Snapshot-cached
│   │   ├── analysis-templates.ts
│   │   └── user-defaults.ts
│   ├── api/
│   │   ├── stripe/webhooks/route.ts       # Stripe webhook (nodejs runtime)
│   │   ├── cron/send-weekly-digest/route.ts  # Weekly newsletter cron
│   │   ├── dashboard/search-suggestions/route.ts
│   │   └── email/send-test/route.ts
│   ├── auth/                     # /login, /sign-up, /forgot-password,
│   │                             # /update-password, /callback, /sign-out
│   ├── d/[encoded]/              # Public read-only shared deal viewer
│   │   ├── page.tsx
│   │   └── opengraph-image.tsx   # edge runtime, dynamic OG card
│   ├── dashboard/                # Pro dashboard (entitlement-gated)
│   ├── saved-analyses/           # Pro saved deals
│   ├── compare/                  # Pro deal compare
│   ├── templates/                # Pro analysis templates
│   ├── tools/<tool>/             # Free-tier marketing calculators (cap-rate,
│   │                             # cash-on-cash, brrrr, dscr, etc.) — each
│   │                             # has its own opengraph-image.tsx
│   ├── blog/<slug>/              # Static blog posts (+ OG images for some)
│   ├── markets/<city>/           # SEO city pages
│   ├── states/                   # State landing pages
│   ├── glossary/                 # Glossary
│   ├── pricing/                  # Pricing page
│   ├── profile/                  # User profile + avatar
│   ├── settings/                 # Email prefs, defaults
│   ├── admin/email-preview/      # Internal email preview tool
│   ├── changelog/
│   ├── embed/[slug]/             # Embeddable widgets (calculators)
│   ├── feed.xml/route.ts         # RSS feed
│   ├── llms.txt/route.ts         # llms.txt index
│   ├── llms-full.txt/route.ts    # Long-form llms-full.txt
│   ├── sitemap.ts                # Dynamic sitemap
│   ├── robots.ts
│   ├── manifest.ts
│   ├── layout.tsx
│   ├── page.tsx                  # Landing — STATIC (ISR hourly), anon only
│   ├── home-authed/              # Dynamic homepage for signed-in users;
│   │                             # proxy.ts rewrites "/" here when a
│   │                             # Supabase auth cookie is present. noindex.
│   ├── error.tsx                 # Route-level error boundary
│   └── global-error.tsx          # Root error boundary (wraps html/body)
├── components/
│   ├── investcalc/               # The main calculator — feature folder
│   │   ├── investcalc-page.tsx   # Root client component (form + dashboard)
│   │   ├── property-type-section.tsx, property-details-section.tsx,
│   │   │   single-family-unit-section.tsx, multi-family-units-section.tsx,
│   │   │   financing-section.tsx, operating-expenses-section.tsx,
│   │   │   template-selector-section.tsx
│   │   ├── analysis-dashboard.tsx        # Tabbed result view
│   │   ├── analysis-error-boundary.tsx
│   │   ├── cash-flow-waterfall.tsx, sensitivity-grid.tsx,
│   │   │   loan-amortization-view.tsx, mortgage-scenario-compare.tsx,
│   │   │   max-offer-card.tsx, strategies-panel.tsx, rehab-estimator-card.tsx,
│   │   │   brrrr-card.tsx, fix-flip-card.tsx
│   │   ├── exit-scenarios/{panel,summary-cards,table,charts}.tsx
│   │   ├── tax-strategy/{panel,summary-cards,table,charts}.tsx
│   │   ├── ten-year-projections/{panel,summary-cards,table,charts}.tsx
│   │   ├── analysis-panels/shared/  # snapshot-status-card, summary-card-grid,
│   │   │                            # chart-card, formatters.ts
│   │   ├── read-only-analysis-view.tsx   # /d/[encoded] viewer
│   │   ├── saved-analyses-page-v2.tsx
│   │   ├── compare-deals-client.tsx
│   │   ├── templates-management-page.tsx
│   │   ├── template-form-dialog.tsx
│   │   ├── deal-notes-panel.tsx
│   │   ├── share-link-button.tsx
│   │   ├── pro-inline-gate.tsx        # Pro feature gate UI
│   │   ├── glossary-tip.tsx
│   │   ├── form-field-helpers.tsx
│   │   ├── address-autocomplete.tsx   # Google Places
│   │   └── header.tsx
│   ├── dashboard/                # Dashboard widgets (Sidebar, Topbar,
│   │                             # StatCard, PortfolioChart, TopDeals,
│   │                             # RiskReturn, AIInsights, DashboardHome,
│   │                             # portfolio-rollup-strip)
│   ├── marketing/                # Landing-page + SEO components
│   │                             # (marketing-hero, landing-sections,
│   │                             # pricing-toggle-plans, sticky-conversion-bar,
│   │                             # cookie-consent-banner, newsletter-signup,
│   │                             # roi-calculator-widget, onboarding-tour,
│   │                             # blog-sticky-cta, site-footer …)
│   ├── auth/                     # login-form, sign-up-form, auth-shell,
│   │                             # forgot-password-form, update-password-form,
│   │                             # google-auth-button, user-menu
│   ├── ui/                       # shadcn primitives (Radix wrappers)
│   ├── theme-provider.tsx
│   └── …
├── emails/
│   ├── weekly-digest.tsx                  # React Email template
│   ├── content/YYYY-MM-DD.json            # One file per Monday's digest
│   └── daily-campaign-content/day-NN.json # 30-day onboarding drip
├── lib/                          # Server + shared utilities (see §4)
│   ├── supabase/{admin,server,client,middleware}.ts
│   ├── stripe/{client,subscription-sync}.ts
│   ├── email/render-weekly.ts
│   ├── property-enrichment/state-property-tax.ts
│   ├── analytics/track-conversion.ts
│   ├── stats/deals-analyzed-count.ts
│   ├── calc-analysis.ts          # ★ rental math
│   ├── verdict.ts                # ★ verdict thresholds
│   ├── entitlements.ts           # ★ feature gates
│   ├── share-link.ts             # ★ share link encode/decode
│   ├── investcalc-schema.ts      # ★ Zod schema + INVESTCALC_SCHEMA_VERSION
│   ├── ten-year-projections.ts, tax-strategy.ts, exit-scenarios.ts,
│   │ deal-score.ts, sensitivity-analysis.ts, max-allowable-offer.ts,
│   │ rehab-estimator.ts, fix-flip-analysis.ts, brrrr-analysis.ts,
│   │ compare-{metrics,assumptions,result-snapshot}.ts,
│   │ dashboard-{data,deal-mapping,risk-return,saved-search-bridge}.ts,
│   │ analysis-template-schema.ts, starter-templates.ts,
│   │ pdf-generator.ts, pdf-export-constants.ts,
│   │ glossary.ts, states.ts, city-strategy-combos.ts, embed-registry.ts,
│   │ saved-analyses-count.ts, site-url.ts, admin-guard.ts, auth-schema.ts,
│   │ utils.ts
│   └── __tests__/                # Vitest unit tests
├── scripts/                      # tsx-run operational scripts
│   ├── schedule-all-broadcasts.ts        # Pre-schedule weekly digests in Resend
│   ├── schedule-daily-campaign.ts        # 30-day drip campaign scheduler
│   ├── preview-daily-campaign.ts
│   ├── count-audience-contacts.ts
│   ├── polish-emails.ts
│   └── README-daily-campaign.md
├── supabase/migrations/          # Timestamped SQL migrations
├── public/                       # Static assets (logos, placeholders, icons)
├── styles/globals.css            # Tailwind v4 entry
├── hooks/                        # use-mobile, use-toast
├── types/                        # Ambient declarations (jspdf-esm.d.ts)
├── proxy.ts                      # Next 16 request boundary (replaces middleware.ts)
├── instrumentation.ts            # Sentry server init
├── instrumentation-client.ts     # Sentry browser init + ignoreErrors
├── next.config.mjs               # Build + Sentry wrapping config
├── eslint.config.mjs
├── vitest.config.ts
├── tsconfig.json                 # strict; "@/*" → "./*"
└── package.json
```

---

## 3. Conventions that matter

### 3.1 Supabase client variants — pick the right one

Three Supabase clients live in `lib/supabase/`. Choosing wrong is a
security or bundle bug.

| Helper | Where it runs | Bypasses RLS? | Imports `server-only`? |
|--------|---------------|---------------|------------------------|
| `createServerSupabaseClient()` from `lib/supabase/server.ts` | Server Components, Server Actions, Route Handlers (any cookie-aware server code) | No — uses anon key + user session cookie | No (but uses `next/headers` so server-only by construction) |
| `createBrowserSupabaseClient()` from `lib/supabase/client.ts` | Client components / browser | No — anon key + browser session | No |
| `createAdminSupabaseClient()` from `lib/supabase/admin.ts` | Stripe webhook, admin scripts, anywhere we must write user-controlled fields | **Yes — service role** | **Yes** (`import "server-only"`) |

```ts
// lib/supabase/admin.ts
import "server-only";
// ...
export function createAdminSupabaseClient() { /* service-role */ }
```

**Rules**:

- **Never** import `lib/supabase/admin.ts` from a client component, a
  shared util that crosses the server/client boundary, or anywhere that
  doesn't strictly need to bypass RLS. The `server-only` guard will
  blow up the build if you slip — don't disable it; fix the import.
- Server Action / Route Handler → `createServerSupabaseClient()` first.
  Only escalate to admin if you need to write something the user can't
  set themselves (subscription state, plan changes, webhook bookkeeping).
- `proxy.ts` (Next 16's replacement for `middleware.ts`) calls
  `updateSession` from `lib/supabase/middleware.ts` to refresh cookies on
  every request — don't add auth logic in there. The ONE routing rule it
  carries: requests for `/` with a Supabase auth cookie are REWRITTEN to
  `/home-authed` (the dynamic homepage) so the public `/` can stay
  statically generated and edge-cached for ad traffic. That's a cache
  hint, not auth enforcement — the dynamic page re-verifies the session.
  Corollary: `app/page.tsx` must never import anything that reads
  cookies()/headers(), and any new InvestCalcPage prop must be added to
  BOTH homepages (static anon values in page.tsx, computed values in
  home-authed/page.tsx).

### 3.2 Server action return shape — discriminated union, never throw

Every server action returns a discriminated union with `ok: true/false`.
Errors are encoded as a string `code` + human `message`. Actions never
throw to the client.

```ts
// Canonical shape (see app/actions/exit-scenarios.ts and saved-analyses.ts)
export type ExitScenarioSnapshotResult =
  | { ok: true; source: "cache" | "generated"; snapshot: ExitScenarioSnapshotPayload }
  | {
      ok: false;
      code: "SIGN_IN_REQUIRED" | "ENTITLEMENT_REQUIRED" | "NOT_FOUND" | "SERVER_ERROR";
      message: string;
    };
```

**Reference panels** for this pattern (each is a "snapshot + server-action + UI" trio):
- `components/investcalc/exit-scenarios/panel.tsx` + `app/actions/exit-scenarios.ts`
- `components/investcalc/tax-strategy/panel.tsx` + `app/actions/tax-strategy.ts`
- `components/investcalc/ten-year-projections/panel.tsx` + `app/actions/ten-year-projections.ts`
- `app/actions/saved-analyses.ts` (the canonical multi-result-type action)

Common `code` values seen across actions:
`SIGN_IN_REQUIRED`, `ENTITLEMENT_REQUIRED`, `ENTITLEMENT_SAVE`,
`VALIDATION_ERROR`, `DUPLICATE_ADDRESS`, `NOT_FOUND`, `SERVER_ERROR`.

Callers branch on `result.ok` and route the `code` to a user-facing
toast / inline error. Don't change the shape without updating every
caller.

### 3.3 Entitlement gating — always via `hasPlanFeature`

Pro features check the user's entitlements bag, never the subscription
status directly.

```ts
import { getEntitlementsForUser, hasPlanFeature } from "@/lib/entitlements";

const entitlements = await getEntitlementsForUser(supabase, user.id);
if (!hasPlanFeature(entitlements, "exit_scenarios")) {
  return { ok: false, code: "ENTITLEMENT_REQUIRED", message: "Upgrade to Pro …" };
}
```

The entitlements bag has shape `{ max_saved_deals: number | null, features: string[] }`
and is stored as JSON on the `plans` row. `getEntitlementsForUser`
already handles the fallback to the `free` plan when no
`active/trialing/past_due` subscription exists.

Other helpers in `lib/entitlements.ts`:
- `hasSavedDealCapacity(entitlements, currentCount)`
- `getSavedDealLimitLabel(entitlements)`
- `hasDashboardAccess(entitlements)` / `hasDashboardInsightsAccess(entitlements)`
- `getDashboardNavAccess(entitlements)` → `{ dashboard, myDeals, compareDeals, templates }`
- `hasPaidPlanSubscription(supabase, userId)` — only for "is this a paid user at all" checks.

Known feature strings include: `cash_flow`, `save_deal`, `dashboard_access`,
`dashboard_insights`, `compare_deals`, `template_manage`, `exit_scenarios`
(check `lib/entitlements.ts` and the relevant action for the canonical list).

Never write `subscription.status === "active"` to gate a feature —
it bypasses the plan layer.

### 3.4 Calc-analysis is the single source of truth

`lib/calc-analysis.ts` exports `calculateAnalysis(values) → AnalysisResult`.
Every page that shows numbers (`investcalc-page.tsx`, `read-only-analysis-view.tsx`,
the OG image at `app/d/[encoded]/opengraph-image.tsx`, the PDF generator,
deal-score, dashboard rollups, etc.) calls this function. Do not
duplicate cash-flow / cap-rate / DSCR math in a component.

Verdict thresholds (Strong / Solid / Mixed / Marginal / Negative, and
the OG image's "Strong Buy / Buy / Neutral / Risky / Avoid" tier) live
in `lib/verdict.ts`. The OG image classifier in
`app/d/[encoded]/opengraph-image.tsx` mirrors `verdict.ts` — if you
change one, change the other (the OG file calls this out in a comment).

Cash purchases are a load-bearing edge case: `monthlyPayment <= 0`
means DSCR is undefined. `calc-analysis` returns 0 for DSCR in that
case and the verdict + OG classifiers treat it as N/A. Don't simplify
this away.

### 3.5 Stripe webhook — signature verified, idempotent via `stripe_webhook_events`

`app/api/stripe/webhooks/route.ts` (`runtime = "nodejs"`):

1. Verifies the `Stripe-Signature` header with `STRIPE_WEBHOOK_SECRET`.
   Invalid sig → 400 immediately. Don't touch this verification step.
2. Inserts the `event.id` into the `stripe_webhook_events` table to
   claim it. The unique constraint on `stripe_event_id` is the idempotency key.
3. On `23505` (unique violation), checks `processed_at`. If present →
   duplicate retry, return `{ duplicate: true }`. If `processed_at IS NULL`,
   we **retry processing** — a previous attempt failed and Stripe is
   retrying. Don't short-circuit on insert conflict alone or silent
   failures persist forever.
4. Dispatches by `event.type` to helpers in `lib/stripe/subscription-sync.ts`.
5. On success: `update set processed_at = now(), error_message = null`.
   On failure: stash `error_message` and return 500 so Stripe retries.

Stripe API version is pinned to `2026-04-22.dahlia` in `lib/stripe/client.ts`.
Bumping it requires reading the Stripe changelog.

Webhook secret rotates independently of the publishable key. Don't
co-rotate them in env-management scripts.

### 3.6 OG images — edge runtime, fail-safe to a fallback

OG images live next to the page they belong to (`opengraph-image.tsx`)
and use Next.js's built-in convention.

Constraints (see `app/d/[encoded]/opengraph-image.tsx`):
- `export const runtime = "edge"`
- Use **only** the `next/og` JSX subset (basic divs + inline styles + text). No Tailwind classes.
- **No server-only imports.** Allowed: `decodeShareLink`, `calculateAnalysis`,
  the Zod schema, pure helpers. Disallowed: anything that touches
  Supabase, fs, env-with-secrets, etc.
- Wrap the analysis in `safeParse` + `try/catch` and return the
  `Fallback({ headline })` ImageResponse on any bad input. Never let a
  malformed share link surface a 500.

Same pattern applies to the per-tool OG images under
`app/tools/<tool>/opengraph-image.tsx` and blog OG images.

### 3.7 Share links — `lib/share-link.ts`, payload format is frozen

Saved-deal share links are **stateless** — the entire analysis is
encoded in the URL (URL-safe base64 of a JSON payload). No DB, no auth.

```ts
// lib/share-link.ts
export type SharePayload = {
  v: 1;                       // version — bump only if we keep both decoders working
  values: InvestmentFormValues;
  meta?: { sharedAt?: string; title?: string };
};
```

- `encodeShareLink(payload)` and `decodeShareLink(encoded)` — the only
  two entry points. The base64 helpers handle browser + Node.
- The `/d/[encoded]` route + its OG image both call `decodeShareLink`
  then re-validate via `investmentFormSchema.safeParse`.
- **Never modify the payload format** without keeping backwards-compatible
  decoding. Existing links in the wild rely on `v: 1`. New fields go on
  `meta` (optional) or behind a new `v: 2` decoder that runs alongside
  `v: 1`.

### 3.8 Email — Resend Broadcasts API, idempotent cron, kill switch

`app/api/cron/send-weekly-digest/route.ts` runs Mondays at 13:00 UTC
(schedule lives in `vercel.json`). It:

1. **Auth-gates** on `Authorization: Bearer ${CRON_SECRET}`. No secret env var → 500 + Sentry alert. Bad bearer → 401 (silent).
2. **Kill switch**: `NEWSLETTER_PAUSED=1|true|yes` → skip with a logged no-op. Use this to pause sends without a redeploy. Does **not** cancel broadcasts already pre-scheduled in Resend (cancel those in the Resend dashboard).
3. Looks up `/emails/content/YYYY-MM-DD.json` for "this Monday". Missing file → 200 no-op (off-weeks are fine).
4. **Idempotency check** — lists Resend broadcasts; if one with name `Weekly digest · ${today}` already exists (any status), skip. Prevents duplicate sends when `npm run schedule-broadcasts` has pre-scheduled into the 28-day window.
5. Renders via `lib/email/render-weekly.ts`, then `POST /broadcasts` + `POST /broadcasts/:id/send`. Resend substitutes the per-recipient unsubscribe URL via the `{{{RESEND_UNSUBSCRIBE_URL}}}` placeholder we drop into the template.
6. Failures → `Sentry.captureMessage` with tags `feature: newsletter-cron`.

Email content is JSON in `emails/content/*.json` (weekly) and
`emails/daily-campaign-content/day-NN.json` (30-day drip).
React Email template at `emails/weekly-digest.tsx`. Don't bypass the
JSON content layer and hardcode email copy in the template.

### 3.9 Sentry filters — add to `ignoreErrors`, don't disable

`instrumentation-client.ts` carries an `ignoreErrors` list for the
expected noise we've already triaged:

- Supabase Auth multi-tab Web Locks (`Acquiring an exclusive Navigator LockManager lock`, `lock:sb-.*-auth-token`).
- Safari frozen-error instrumentation (`Cannot add property .+, object is not extensible`).
- Cross-browser network failures (`Failed to fetch`, `NetworkError when attempting to fetch resource`, `Load failed`).
- Abort errors (`AbortError`, `The user aborted a request`, `The operation was aborted`, `signal is aborted without reason`).
- `ResizeObserver loop` noise.
- `Non-Error promise rejection captured with value:` extension noise.

When new expected-noise errors show up, **append to this list with a comment explaining the source**. Don't disable Sentry, don't lower
sample rates, don't catch-and-swallow at the call site.

Also note: `enableLogs: process.env.NODE_ENV !== "production"` — dev
forwards `console.warn/info` to Sentry; prod does not. Don't rely on
`console.log` for prod debugging.

### 3.10 TypeScript — strict; `ignoreBuildErrors: false`

`next.config.mjs` has `typescript.ignoreBuildErrors: false` (flipped
back from `true` in June 2026 specifically to keep React 19 / Next 16
API regressions from shipping silently). `tsconfig.json` has `strict: true`.

- Fix type errors. Don't add `// @ts-ignore`/`@ts-expect-error` without a comment that explains why.
- Don't flip `ignoreBuildErrors` back to `true` to ship — that's exactly what bit us before.
- `npx tsc --noEmit` is the fastest local check. CI runs it via `npm run build`.

### 3.11 Server-only imports — imitate the `lib/supabase/admin.ts` pattern

Any module that must never be bundled into the client gets a top-line
`import "server-only";`:

```ts
// lib/supabase/admin.ts
import "server-only";
// lib/stripe/client.ts
import "server-only";
```

Build will fail if a client component reaches one transitively — that's
the point. Add the guard to anything else that handles service-role
keys, the Stripe secret, Resend keys, etc. Don't rely on "it's in
`lib/` so it must be server-only" as a convention; only the import
guard makes that real.

### 3.12 Component file organization — feature folders + co-located trios

Components live under feature subfolders inside `components/`:
`investcalc/`, `dashboard/`, `marketing/`, `auth/`, `ui/` (shadcn).
Pages in `app/` are thin shells that compose feature components.

The Pro snapshot features (exit scenarios, tax strategy, ten-year
projections) each follow a **trio pattern**:

```
components/investcalc/<feature>/panel.tsx       # client wrapper, calls server action
components/investcalc/<feature>/summary-cards.tsx
components/investcalc/<feature>/table.tsx
components/investcalc/<feature>/charts.tsx
app/actions/<feature>.ts                        # snapshot fetch + upsert
lib/<feature>.ts                                # pure compute (e.g. buildExitScenarios)
```

When adding a fourth such feature, replicate this layout. Shared shells
(skeletons, snapshot status badge, formatters) live in
`components/investcalc/analysis-panels/shared/`.

---

## 4. Critical files reference

### Math + domain logic
- `lib/calc-analysis.ts` — `calculateAnalysis()` is the single source of truth for cash flow, cap rate, CoC, DSCR, monthly payment, 10-year + tax strategy projection embedding. Don't duplicate this math anywhere.
- `lib/verdict.ts` — `buildAutoVerdict()` + headline classifier (Strong / Solid / Mixed / Marginal / Negative). Cash-purchase branch handled explicitly.
- `lib/investcalc-schema.ts` — Zod schema + `INVESTCALC_SCHEMA_VERSION` (currently `9`). Bump the version when the shape changes; persisted snapshots key on it.
- `lib/ten-year-projections.ts`, `lib/tax-strategy.ts`, `lib/exit-scenarios.ts` — projection engines, each with a snapshot version constant + input-hash helper used by the matching server action for cache invalidation.
- `lib/deal-score.ts` — Pro Deal Score (the deal-score server action wraps this).
- `lib/sensitivity-analysis.ts`, `lib/max-allowable-offer.ts`, `lib/rehab-estimator.ts`, `lib/brrrr-analysis.ts`, `lib/fix-flip-analysis.ts` — strategy/analysis side modules.
- `lib/compare-metrics.ts`, `lib/compare-assumptions.ts`, `lib/compare-result-snapshot.ts` — deal compare engine.

### Auth / billing / entitlements
- `lib/entitlements.ts` — `getEntitlementsForUser`, `hasPlanFeature`, capacity + dashboard helpers. Always go through these — never inspect `subscription.status` directly.
- `lib/supabase/admin.ts` — service-role client. `server-only`. For Stripe webhook + admin scripts only.
- `lib/supabase/server.ts` — cookie-aware server client for Server Components / Actions / Route Handlers.
- `lib/supabase/client.ts` — browser client.
- `lib/supabase/middleware.ts` — `updateSession()` called from `proxy.ts`.
- `proxy.ts` — Next 16 request boundary (replaces `middleware.ts`), refreshes Supabase session.
- `lib/stripe/client.ts` — `getStripe()` with API version pinned. `server-only`.
- `lib/stripe/subscription-sync.ts` — webhook → DB sync helpers (`upsertSubscriptionFromStripe`, `handleCheckoutSessionCompleted`, etc.).
- `lib/admin-guard.ts` — admin-only route guard.
- `lib/auth-schema.ts` — Zod schemas for auth forms.

### Server actions (all live in `app/actions/`)
- `auth.ts` — sign in / sign up / reset password.
- `billing.ts` — Stripe checkout session + customer portal.
- `saved-analyses.ts` — save / load / list / archive / PDF export. The canonical reference for the full `Result` union shape.
- `compare.ts` — Pro compare deals.
- `deal-score.ts` — Pro Deal Score computation.
- `exit-scenarios.ts`, `tax-strategy.ts`, `ten-year-projections.ts` — snapshot-cached projection actions (see §3.12 trio pattern).
- `analysis-templates.ts` — saved analysis templates.
- `enrich-property.ts` — calls FRED (rate), HUD (FMR), state property tax to pre-fill the form.
- `newsletter.ts` — newsletter signup.
- `profile.ts`, `user-defaults.ts` — profile + per-user defaults.

### Routes
- `app/api/stripe/webhooks/route.ts` — Stripe webhook (nodejs runtime). Idempotent via `stripe_webhook_events`.
- `app/api/cron/send-weekly-digest/route.ts` — Vercel cron. Auth + kill switch + Resend Broadcasts.
- `app/api/cron/send-rate-alerts/route.ts` — Thursday cron (18:00 UTC). Re-underwrites paid users' saved deals when the FRED 30-yr rate moves ≥0.125pp week-over-week; emails state changes (tier / DSCR band / cash-flow sign) via Resend single sends. Gated by `RATE_ALERTS_MODE` env: off (default) / dry (JSON preview, no sends) / live. Pure logic in `lib/rate-alerts.ts` (unit-tested); template `emails/rate-alert.tsx`.
- `app/api/email/send-test/route.ts` — internal "send me a preview" endpoint.
- `app/api/dashboard/search-suggestions/route.ts` — dashboard search autocomplete.
- `app/auth/callback/route.ts` — Supabase OAuth callback.
- `app/auth/sign-out/route.ts` — sign-out handler.
- `app/d/[encoded]/page.tsx` + `opengraph-image.tsx` — public share link viewer + OG card.

### Frontend entry points
- `components/investcalc/investcalc-page.tsx` — the main calculator (client component, react-hook-form + zodResolver).
- `components/investcalc/read-only-analysis-view.tsx` — `/d/[encoded]` viewer.
- `components/investcalc/analysis-dashboard.tsx` — tabbed result view that pulls the panels together.
- `components/dashboard/DashboardHome.tsx`, `Sidebar.tsx`, `Topbar.tsx` — Pro dashboard shell.
- `app/layout.tsx` — root layout + global providers.

### Build / observability config
- `next.config.mjs` — wraps Next config with `withSentryConfig`. `typescript.ignoreBuildErrors: false`. `automaticVercelMonitors: true`. `tunnelRoute: "/monitoring"`.
- `instrumentation.ts` — Sentry server init.
- `instrumentation-client.ts` — Sentry browser init + the `ignoreErrors` allow-list.
- `tsconfig.json` — strict, `"@/*"` path alias points to repo root.
- `eslint.config.mjs`, `vitest.config.ts`, `postcss.config.mjs`, `components.json` (shadcn) — tooling config.

### Operational
- `scripts/schedule-all-broadcasts.ts` — pre-schedule weekly digests into Resend's 28-day window. `npm run schedule-broadcasts[:dry]`.
- `scripts/schedule-daily-campaign.ts` — 30-day onboarding drip. `npm run schedule-daily-campaign[:dry]`.
- `scripts/preview-daily-campaign.ts`, `scripts/count-audience-contacts.ts`, `scripts/polish-emails.ts`.
- `lib/reset-passwords.mjs` — invoked by `npm run reset-passwords`.
- `emails/weekly-digest.tsx` — React Email template (rendered by `lib/email/render-weekly.ts`).

### Data + content
- `emails/content/YYYY-MM-DD.json` — one per Monday's send.
- `emails/daily-campaign-content/day-NN.json` — 30-day drip days.
- `supabase/migrations/*.sql` — timestamped, run in order. Don't edit existing migrations; add a new one.
- `lib/glossary.ts`, `lib/states.ts`, `lib/city-strategy-combos.ts`, `lib/starter-templates.ts` — static reference data.

---

## 5. Common pitfalls to avoid

1. **Importing the admin Supabase client from a client component.**
   `lib/supabase/admin.ts` has `import "server-only"` — the build will
   fail, but only after you've added a transitive client import. Track
   imports back to the page boundary; if any frontmatter has
   `"use client"`, you can't be reaching `admin.ts`.

2. **Forgetting `await` on a server action.** Server actions return
   `Promise<Result>`. A missing `await` lets the function return a
   pending Promise that TypeScript will narrow incorrectly when you
   read `.ok`. Always `const result = await someAction(...)`.

3. **Modifying `calc-analysis.ts` math without testing every property type.**
   The function handles single-family, multi-family, owner-occupant,
   and cash purchases (where `monthlyPayment <= 0` and DSCR is N/A).
   Smoke-test each path; `verdict.ts` and `app/d/[encoded]/opengraph-image.tsx`
   also branch on `isCashPurchase`. Vitest tests in `lib/__tests__/`
   cover some of this — extend them when you touch the math.

4. **Adding new properties to Sentry events without checking for PII.**
   `sendDefaultPii: true` is on. Don't `extra: { user_email, address, … }`
   without thinking about it. Use opaque IDs where possible.

5. **Changing the OG image schema without updating every social card.**
   `/d/[encoded]/opengraph-image.tsx`, the per-tool OG images under
   `app/tools/<tool>/opengraph-image.tsx`, and blog OG images all share
   visual conventions (brand bar, type tile layout). If you change the
   brand color or layout language, sweep all of them.

6. **Using `console.log` for production debugging.** Sentry log
   forwarding is dev-only (`enableLogs: process.env.NODE_ENV !== "production"`).
   In prod, use `Sentry.captureMessage` / `Sentry.captureException`
   with tags so failures show up as alerts.

7. **Hand-rolling cash-flow / cap-rate / DSCR math in a component or
   server action.** Always import `calculateAnalysis` from `lib/calc-analysis.ts`.

8. **Bypassing the Resend idempotency check** in the weekly cron, or
   sending broadcasts named anything other than `Weekly digest · ${today}`
   — the idempotency check matches on the exact name.

9. **Re-using or "fixing" a Stripe webhook event by mutating the row.**
   The idempotency contract is: `processed_at IS NULL` means "retry on
   next Stripe attempt." Don't manually flip `processed_at` to back-fill
   a state — replay through the handler.

10. **Editing an old migration in `supabase/migrations/`.** Migrations
    are timestamped and already applied to prod. Add a new migration
    with today's timestamp instead.

---

## 6. Environment variables

`.env.example` is the source of truth. Required vs optional in practice:

### Required
- `NEXT_PUBLIC_SITE_URL` — base URL for Supabase email links (no trailing slash).
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase client + server (anon).
- `SUPABASE_SERVICE_ROLE_KEY` — only the admin client uses it. Server-side only.
- `STRIPE_SECRET_KEY` — server-side Stripe SDK.
- `STRIPE_WEBHOOK_SECRET` — `stripe.webhooks.constructEvent` signature verification.
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — checkout redirect.
- `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_ANNUAL` — checkout session price IDs.
- `RESEND_API_KEY` (must be **Full Access**, not "Sending only", to use Broadcasts).
- `RESEND_AUDIENCE_ID` — newsletter audience.
- `CRON_SECRET` — bearer token for the weekly cron (`Authorization: Bearer <secret>`).

### Optional
- `STRIPE_ANNUAL_DISCOUNT_COUPON_ID` — coupon applied to annual checkout if the annual Price isn't already discounted.
- `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` — address autocomplete (restrict by HTTP referrer in GCP console).
- `FRED_API_KEY` — current 30-yr mortgage rate to pre-fill financing (free key).
- `HUD_API_KEY` — Fair Market Rent by county for single-family rent pre-fill (free key).
- `EMAIL_FROM` (default `TrueCap <hello@usetruecap.com>`), `EMAIL_REPLY_TO` (default `hello@usetruecap.com`).
- `NEWSLETTER_PAUSED` — `1` / `true` / `yes` to pause weekly cron sends without a redeploy.
- `RATE_ALERTS_MODE` — `off` (default) / `dry` / `live` for the Thursday rate-alert cron. The feature ships dormant; flip to `dry`, review the JSON preview, then `live`.

A missing required var fails closed (the relevant action / cron returns
500 + Sentry alert rather than silently doing nothing). Don't add
fallbacks that mask a missing secret.

---

## 7. Testing + verification

| Goal | Command |
|------|---------|
| TypeScript check (fast) | `npx tsc --noEmit` |
| Unit tests (Vitest) | `npm test` |
| Production build (heavy, slowest) | `npm run build` |
| Lint | `npm run lint` |
| Dev server | `npm run dev` |

- **Unit tests** live in `lib/__tests__/`. Run them when you touch
  `calc-analysis.ts`, `analysis-template-schema.ts`,
  `dashboard-deal-mapping.ts`, `dashboard-risk-return.ts`, or anything
  with a sibling `*.test.ts`.
- **Sentry dashboard** is the source of truth for production errors.
  Cron failures go through `Sentry.captureMessage(...)` tagged with
  `feature: newsletter-cron`.
- **Resend dashboard** for email delivery status (broadcasts list,
  open rates, bounces). Match broadcast names against `Weekly digest · YYYY-MM-DD`.
- **Stripe dashboard** for webhook delivery + retries. Local Stripe
  webhook signature verification can be exercised with `stripe listen`.

Operational dry-runs:
- `npm run schedule-broadcasts:dry` — list what `schedule-all-broadcasts.ts` would do.
- `npm run schedule-daily-campaign:dry` — same for the 30-day drip.
- `npm run preview-daily-campaign` — render a drip day to local HTML for visual review.

---

## 8. Out-of-scope for Claude — ask first

Don't autonomously do any of the following. Surface a proposal first
and let Morgan say yes.

1. **Change pricing** — the `$20/mo` figure, the annual discount, or
   anything that changes what a user sees on the pricing page or in
   the Stripe checkout amount.

2. **Send emails to real users.** That includes triggering the weekly
   cron from a script, calling `npm run schedule-broadcasts` against
   the real Resend audience, or running `send-test` against a real
   inbox. Use the `--dry-run` flags and `admin/email-preview` for review.

3. **Make schema changes** without writing a new migration in
   `supabase/migrations/` with today's timestamp, and surfacing the SQL
   for review before applying. Never edit an existing migration.

4. **Touch the Stripe webhook signature verification** in
   `app/api/stripe/webhooks/route.ts`. Specifically the
   `stripe.webhooks.constructEvent(body, sig, webhookSecret)` call and
   the `STRIPE_WEBHOOK_SECRET` env-var handling. If a webhook is
   misbehaving, look at `stripe_webhook_events` and the dispatch
   switch — don't relax the verification.

5. **Change calc thresholds** in `lib/verdict.ts` or
   `lib/calc-analysis.ts` (cap rate / DSCR / CoC cutoffs, "Strong" vs
   "Solid" bands) without showing the proposed deltas and explaining
   the rationale. These thresholds appear in the verdict, the OG
   image, the deal-score, and PDFs — a quiet change ripples everywhere
   users see "is this a good deal?"

6. **Flip `next.config.mjs` `typescript.ignoreBuildErrors` back to
   `true`** to ship past a type error. Fix the type error.

7. **Disable Sentry, drop sample rates to 0, or remove entries from
   `ignoreErrors`** without a clear "this stops being noise" reason.
   Adding to `ignoreErrors` is fine; removing existing patterns isn't.

8. **Modify `lib/share-link.ts` payload format** (`v: 1`, base64 URL
   encoding). Existing links in the wild break instantly. If a v2 is
   needed, keep the v1 decoder alongside it.

---
