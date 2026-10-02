# CLAUDE.md — TrueCap codebase orientation

> Read this first. It captures the patterns and load-bearing files that aren't
> obvious from grepping. If a section is wrong, fix it — don't work around it.

---

## 1. Project at a glance

**TrueCap** (https://usetruecap.com) is a rental-property analyzer for
real estate agents who work with investor clients and for investors
buying for their own portfolio. A user enters a property (price, rent,
financing, expenses) and gets a full underwrite in seconds: whether the
deal meets a Buy Box (the client's or the investor's targets), the Offer
Ceiling (the highest price that still meets them), cash flow, cap rate,
cash-on-cash, DSCR, a Deal score and 10-year projections, plus a
shareable read-only link. An agent can keep a roster of clients, assign
Buy Boxes to them (capped per account by `MAX_BUY_BOXES` in
`app/actions/user-buy-boxes.ts`) and send a co-branded report. The homepage
speaks to the agent first; `PRODUCT.md` and `docs/voice.md` carry the
approved hero.

- **Audience**: real estate agents who work with investor clients (primary)
  and solo / small-portfolio buy-and-hold investors and house hackers
  (secondary). See `PRODUCT.md`; for any UI work read §9 and `DESIGN.md`.
- **Business model**: free tier (run analyses, save up to 5 deals;
  Deal Score is FREE for every user — see `app/actions/deal-score.ts`)
  - Pro at **$29.99/mo** or **$300/yr** (editing + unlimited saved
    deals, dashboard, compare, templates, tax strategy, exit scenarios,
    PDF export, buy box, etc.). Note: plain read-only share links are
    free, but creating a new revocable link requires sign-in; only the
    co-branded variant is Pro. The canonical
    tier/gate map for every feature is `lib/entitlements-catalog.ts`;
    pricing logic lives in the `plans.entitlements` JSON column — see
    `lib/entitlements.ts`. New Deal Decision Pack sales are temporarily
    unavailable. Keep both Pack checkout gates off and retain the historical
    Price/claim paths only for existing paid-claim recovery.
- **Stack**: Next.js 16 (App Router, `--webpack` for prod), React 19,
  TypeScript 5.7 (strict), Supabase (Auth + Postgres + Storage), Stripe
  (subscriptions), Resend (Broadcasts API), Sentry, Tailwind v4,
  shadcn/Radix UI, Zod, react-hook-form, Recharts, jsPDF.
- **The investment PDF is composed on the SERVER** (`app/actions/generate-report-pdf.ts`),
  which is where its paid gate is enforced. `lib/pdf-generator.ts` is
  DOM-free — charts are drawn as jsPDF vectors by `lib/pdf/vector-charts.ts`,
  not rasterised with chart.js — so it renders under Node. Verify with
  `npm run pdf:check -- --branches`, which also exercises the cash-purchase,
  all-zero, single-row, all-negative, sparse and long-string deal shapes.
  When you add a field to `ReportData` that the report renders, DECLARE IT in
  `lib/report-payload-schema.ts`: every nested `z.object()` there strips
  undeclared keys in silence, and only the top level is `.passthrough()`.
- **Solo founder**: one person; contact `hello@usetruecap.com`. The founder is never named in the repo, the site, or emails (their request, 2026-09-07).
  ~6 months of intensive work, ~320 completed tasks. Conventions are
  consistent but mostly tribal — that's what this doc is for.

### Product principle: stay easy to use (the founder's standing directive)

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
5. When a feature idea can't satisfy these, propose it to the founder with
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
│   │   ├── deal-score.ts         # Deal Score scoring (FREE-tier feature)
│   │   ├── enrich-property.ts    # FRED rate + HUD FMR; property tax stays manual
│   │   ├── exit-scenarios.ts     # Snapshot-cached
│   │   ├── newsletter.ts         # Retired signup boundary; newsletter canceled
│   │   ├── profile.ts
│   │   ├── saved-analyses.ts     # Save/edit/load/PDF
│   │   ├── tax-strategy.ts       # Snapshot-cached
│   │   ├── ten-year-projections.ts # Snapshot-cached
│   │   ├── analysis-templates.ts
│   │   └── user-defaults.ts
│   ├── api/
│   │   ├── stripe/webhooks/route.ts       # Stripe webhook (nodejs runtime)
│   │   ├── cron/send-weekly-digest/route.ts  # Retired route; no cron registration
│   │   ├── dashboard/search-suggestions/route.ts
│   │   └── email/send-test/route.ts
│   ├── auth/                     # /login, /sign-up, /forgot-password,
│   │                             # /update-password, /callback, /sign-out
│   ├── s/[token]/                # Current opaque, revocable shared-deal viewer
│   ├── d/[encoded]/              # Legacy stateless viewer; decode compatibility only
│   │   ├── page.tsx
│   │   └── opengraph-image.tsx   # static, privacy-safe card; never decodes the link
│   ├── dashboard/                # Pro dashboard (entitlement-gated)
│   ├── saved-analyses/           # Pro saved deals
│   ├── compare/                  # Pro deal compare
│   ├── templates/                # Pro analysis templates
│   ├── tools/<tool>/             # Free-tier marketing calculators (cap-rate,
│   │                             # cash-on-cash, brrrr, dscr, etc.) — each
│   │                             # has its own opengraph-image.tsx
│   ├── blog/<slug>/              # Static blog posts, each with an opengraph-image.tsx
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
│   │   ├── analysis-dashboard.tsx        # Verdict Ledger result view (accordion rows)
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
│   ├── content/YYYY-MM-DD.json            # One file per Tuesday's digest
│   └── daily-campaign-content/day-NN.json # 30-day onboarding drip
├── lib/                          # Server + shared utilities (see §4)
│   ├── supabase/{admin,server,client,middleware}.ts
│   ├── stripe/{client,subscription-sync}.ts
│   ├── email/render-weekly.ts
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
│   ├── schedule-all-broadcasts.ts        # Archived newsletter tool; do not run
│   ├── schedule-daily-campaign.ts        # 30-day drip campaign scheduler
│   ├── preview-daily-campaign.ts
│   ├── count-audience-contacts.ts
│   ├── polish-emails.ts
│   └── README-daily-campaign.md
├── supabase/migrations/          # Timestamped SQL migrations
├── public/                       # Static assets (logos, placeholders, icons)
├── styles/globals.css            # Dead: imported by nothing. The live Tailwind v4
│                                 # entry and every design token is app/globals.css
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

| Helper                                                        | Where it runs                                                                    | Bypasses RLS?                            | Imports `server-only`?                                      |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------- |
| `createServerSupabaseClient()` from `lib/supabase/server.ts`  | Server Components, Server Actions, Route Handlers (any cookie-aware server code) | No — uses anon key + user session cookie | No (but uses `next/headers` so server-only by construction) |
| `createBrowserSupabaseClient()` from `lib/supabase/client.ts` | Client components / browser                                                      | No — anon key + browser session          | No                                                          |
| `createAdminSupabaseClient()` from `lib/supabase/admin.ts`    | Stripe webhook, admin scripts, anywhere we must write user-controlled fields     | **Yes — service role**                   | **Yes** (`import "server-only"`)                            |

```ts
// lib/supabase/admin.ts
import "server-only";
// ...
export function createAdminSupabaseClient() {
  /* service-role */
}
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
  | {
      ok: true;
      source: "cache" | "generated";
      snapshot: ExitScenarioSnapshotPayload;
    }
  | {
      ok: false;
      code:
        | "SIGN_IN_REQUIRED"
        | "ENTITLEMENT_REQUIRED"
        | "NOT_FOUND"
        | "SERVER_ERROR";
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
  return {
    ok: false,
    code: "ENTITLEMENT_REQUIRED",
    message: "Upgrade to Pro …",
  };
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
the PDF generator, deal-score, dashboard rollups, etc.) calls this
function. Do not duplicate cash-flow / cap-rate / DSCR math in a component.

Verdict thresholds (Strong / Solid / Mixed / Marginal / Negative, and
the "Strong Buy / Buy / Neutral / Risky / Avoid" tier) live in
`lib/verdict.ts`. **There is no second classifier to keep in sync.**
`app/d/[encoded]/opengraph-image.tsx` used to carry its own copy, and it
drifted on cash purchases: the share card said "Strong Buy" while the
page said otherwise. That card is now static and shows no verdict or
number at all (§3.6), so nothing outside `lib/verdict.ts` classifies a
deal. Don't reintroduce a local classifier; import `getDealTier`.

Cash purchases are a load-bearing edge case: `monthlyPayment <= 0`
means DSCR is undefined. `calc-analysis` returns 0 for DSCR in that
case and `getDealTier` treats it as N/A. Note that a FINANCED deal with
negative NOI has a NEGATIVE dscr, not zero — so `dscr > 0` is not a
test for "is this financed"; use `!== 0`. Don't simplify this away.

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

6. User ↔ customer binding goes through the ordered resolver in
   `lib/stripe/billing-user-resolution.ts` (checkout stamp →
   `client_reference_id` → `profiles.stripe_customer_id` → exactly-one
   confirmed `auth.users` email → subscription metadata). The Stripe
   account is SHARED with another product: its events are stamped
   `skipped: foreign_app` and never bound. A paid event that still can't
   be bound lands in `billing_unresolved_events` (never dropped) and pages
   Sentry with the event id. `docs/site-overhaul.md` Phase 1 has the why.

Stripe API version is pinned to `2026-04-22.dahlia` in `lib/stripe/client.ts`.
Bumping it requires reading the Stripe changelog.

Webhook secret rotates independently of the publishable key. Don't
co-rotate them in env-management scripts.

### 3.6 OG images — shared templates, fail-safe to the plain frame

OG images live next to the page they belong to (`opengraph-image.tsx`)
and use Next.js's built-in convention. There are 130 card files. All but
one are a few lines of configuration (headline, tagline, slug) handed to
a shared template in `lib/og/`: `blog-og-template.tsx` (73 posts),
`vs-og-template.tsx` (38 comparison pages), `tool-og-template.tsx`
(11 tool pages and the /tools hub) and `persona-og-template.tsx` (/analyze, /pricing and
the four persona pages). Every template draws on one frame,
`lib/og/newsprint.tsx` (Newsprint paper, Archivo, DM Mono).

The exception is `app/d/[encoded]/opengraph-image.tsx`: a static,
privacy-safe card for legacy share links. It never decodes the URL, so
no address, price, metric or verdict reaches a crawler's preview cache.
The homepage and /for-agents cards are route handlers
(`app/og/home/route.tsx`, `app/og/for-agents/route.tsx`), not file
images: a root-level file image would be inherited by every child
segment.

Constraints:

- A card file exports `alt`, `size`, `contentType` and a default
  `Image()`. None of them sets `runtime`.
- Use **only** the `next/og` JSX subset (basic divs + inline styles + text).
  No Tailwind classes. `next/og` cannot read CSS variables, so the palette
  is the `DESIGN.md` tokens as hex (`NEWSPRINT` in `lib/og/newsprint.tsx`).
- **No server-only imports.** Allowed: pure helpers (the sample-deal
  ledger, formatters, the catalog constants). Disallowed: anything that
  touches Supabase, fs, env-with-secrets, etc.
- **A card always renders.** `loadNewsprintFonts` fetches each face once
  per server process and returns `undefined`, never an empty list, when
  no face loads (an empty list makes `next/og` throw "No fonts are
  loaded", which fails a build that prerenders the card). Each template
  wraps its render in `try/catch` and returns the plain frame on error.
- **A page with a sibling card sets no `images`** in its `openGraph` or
  `twitter` metadata. Next serves the file card only when the page names
  no image of its own; `public-metadata-contract.test.ts` checks every
  page.
- **A card's text restates what its page says today.** When a page
  changes a fact, change its card line with it
  (`vs-social-card-guards.test.ts`, `blog-social-card-truth.test.ts`).

### 3.7 Share links — current `/s` links are owned; legacy `/d` is frozen

New share links are opaque `/s/[token]` records minted through
`app/actions/public-shares.ts`. Creation requires an authenticated user before
the service-role insert, and `lib/public-share.ts` requires a non-null owner.
That ownership makes current links listable and revocable. Viewing remains
public for anyone who possesses the capability token, including historical
ownerless `/s` rows.

The old `/d/[encoded]` format is stateless and remains decoder-only legacy
compatibility. Its entire analysis is URL-safe base64 JSON; never use it to
mint a new link.

```ts
// lib/share-link.ts
export type SharePayload = {
  v: 1; // version — bump only if we keep both decoders working
  values: InvestmentFormValues;
  meta?: { sharedAt?: string; title?: string };
};
```

- `decodeShareLink(encoded)` remains the legacy read entry point. Do not add a
  new caller to `encodeShareLink`; current creation must use the authenticated
  opaque mint action.
- The `/d/[encoded]` route calls `decodeShareLink`, then re-validates via
  `releasedInvestmentFormSchema.safeParse`. Its OG image never decodes the
  link (§3.6).
- **Never modify the legacy payload format** without keeping backwards-compatible
  decoding. Existing links in the wild rely on `v: 1`. New fields go on
  `meta` (optional) or behind a new `v: 2` decoder that runs alongside
  `v: 1`.

### 3.8 Archived newsletter architecture — canceled, no cron

> **⚠️ NEWSLETTER CANCELED — founder decision 2026-07-15.** The Resend
> account switch deleted the audience (subscribers unrecoverable) and
> the founder chose to kill the newsletter rather than rebuild it. The
> weekly-digest cron is REMOVED from `vercel.json`, and
> `NewsletterSignup` renders `null` (all ~70 mounts dark). Do NOT
> re-add signup surfaces, re-schedule broadcasts, or recreate the
> audience without the founder's explicit word. The machinery below is
> documented for potential revival only. Lifecycle onboarding emails,
> rate/rent alerts, and the weekly summary are SEPARATE per-user sends
> and remain active/dormant as configured.

The (retired) `app/api/cron/send-weekly-digest/route.ts` ran Tuesdays at
13:00 UTC (schedule `0 13 * * 2`, now removed from `vercel.json`). It:

1. **Auth-gates** on `Authorization: Bearer ${CRON_SECRET}`. No secret env var → 500 + Sentry alert. Bad bearer → 401 (silent).
2. **Historical kill switch**: `NEWSLETTER_PAUSED=1|true|yes` makes the retired route skip. Keep it enabled as defense in depth; it is not a scheduling control or authorization to revive sends. Any legacy Resend broadcast must remain canceled in the Resend dashboard.
3. Looks up `/emails/content/YYYY-MM-DD.json` for "this Tuesday" (files are named for their Tuesday send date). Missing file → 200 no-op (off-weeks are fine).
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
- `lib/deal-score.ts` — Deal Score, a FREE-tier feature (the deal-score server action wraps this).
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
- `deal-score.ts` — Deal Score computation (free tier).
- `exit-scenarios.ts`, `tax-strategy.ts`, `ten-year-projections.ts` — snapshot-cached projection actions (see §3.12 trio pattern).
- `analysis-templates.ts` — saved analysis templates.
- `enrich-property.ts` — calls FRED (rate) and HUD (FMR); property tax remains a manual local input with a disclosed generic fallback when blank.
- `newsletter.ts` — retired newsletter-signup boundary. The newsletter is canceled; do not restore a capture surface without explicit founder authorization.
- `profile.ts`, `user-defaults.ts` — profile + per-user defaults.

### Routes

- `app/api/stripe/webhooks/route.ts` — Stripe webhook (nodejs runtime). Idempotent via `stripe_webhook_events`.
- `app/api/cron/send-weekly-digest/route.ts` — retired code path retained for history only. It has no Vercel cron registration and must not be invoked or rescheduled.
- `app/api/cron/send-rate-alerts/route.ts` — Thursday cron (18:00 UTC). Re-underwrites paid users' saved deals when the FRED 30-yr rate moves ≥0.125pp week-over-week; emails state changes (tier / DSCR band / cash-flow sign) via Resend single sends. Gated by `RATE_ALERTS_MODE` env: off (default) / dry (JSON preview, no sends) / live. Pure logic in `lib/rate-alerts.ts` (unit-tested); template `emails/rate-alert.tsx`.
- `app/api/cron/send-rent-alerts/route.ts` — Monthly cron (1st, 17:00 UTC). Sibling rent-axis monitor: re-prices paid users' saved **single-family** deals against current market rent (RentCast, via `fetchRentCastRentEstimate`) and emails the same state changes. Gated by `RENT_ALERTS_MODE` (off default / dry / live). Each deal = one paid RentCast call, so it shares the global `RENTCAST_MONTHLY_ENRICHMENT_CAP` budget (`app_counters`) + a per-run `RENT_ALERTS_MAX_LOOKUPS_PER_RUN` ceiling; dry mode does NO lookups unless `RENT_ALERTS_DRY_FETCH=1` (truly-free scale preview). Reuses the `profiles.rate_alert_emails` consent. Pure logic in `lib/rent-alerts.ts` (unit-tested); template `emails/rent-alert.tsx`.
- `app/api/email/send-test/route.ts` — internal "send me a preview" endpoint.
- `app/api/dashboard/search-suggestions/route.ts` — dashboard search autocomplete.
- `app/auth/callback/route.ts` — Supabase OAuth callback.
- `app/auth/sign-out/route.ts` — sign-out handler.
- `app/d/[encoded]/page.tsx` + `opengraph-image.tsx` — legacy share link viewer + its static, privacy-safe card (§3.6).

### Frontend entry points

- `components/investcalc/investcalc-page.tsx` — the main calculator (client component, react-hook-form + zodResolver).
- `components/investcalc/read-only-analysis-view.tsx` — `/d/[encoded]` viewer.
- `components/investcalc/analysis-dashboard.tsx` — Verdict Ledger result view (accordion rows) that pulls the panels together.
- `components/dashboard/DashboardHome.tsx`, `Sidebar.tsx`, `Topbar.tsx` — Pro dashboard shell.
- `app/layout.tsx` — root layout + global providers.

### Build / observability config

- `next.config.mjs` — wraps Next config with `withSentryConfig`. `typescript.ignoreBuildErrors: false`. `automaticVercelMonitors: true`. `tunnelRoute: "/monitoring"`.
- `instrumentation.ts` — Sentry server init.
- `instrumentation-client.ts` — Sentry browser init + the `ignoreErrors` allow-list.
- `tsconfig.json` — strict, `"@/*"` path alias points to repo root.
- `eslint.config.mjs`, `vitest.config.ts`, `postcss.config.mjs`, `components.json` (shadcn) — tooling config.

### Operational

- `scripts/schedule-all-broadcasts.ts` — archived newsletter utility. Do not run it or use either schedule-broadcasts command while the newsletter remains canceled.
- `scripts/schedule-daily-campaign.ts` — 30-day onboarding drip. `npm run schedule-daily-campaign[:dry]`.
- `scripts/preview-daily-campaign.ts`, `scripts/count-audience-contacts.ts`, `scripts/polish-emails.ts`.
- `lib/reset-passwords.mjs` — invoked by `npm run reset-passwords`.
- `emails/weekly-digest.tsx` — React Email template (rendered by `lib/email/render-weekly.ts`).

### Data + content

- `emails/content/YYYY-MM-DD.json` — one per Tuesday's send.
- `emails/daily-campaign-content/day-NN.json` — 30-day drip days.
- `supabase/migrations/*.sql` — timestamped, run in order. Don't edit existing migrations; add a new one.
- `supabase/review-drafts/*.sql` — non-executable design artifacts. Every file
  must carry `TRUECAP_DRAFT_SQL: DO_NOT_APPLY`. Never move a draft into the
  migration queue under its old timestamp; promote approved work as a newly
  reviewed, fresh timestamp after production backup and dry-run evidence.
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
   Smoke-test each path; `verdict.ts`, `deal-score.ts`, the PDF generator
   and the report builders also branch on `isCashPurchase`. Vitest tests in
   `lib/__tests__/` cover some of this — extend them when you touch the math.

4. **Adding new properties to Sentry events without checking for PII.**
   Default PII collection is off and shared URLs are scrubbed, but explicit
   `extra` values still leave the app. Never attach email, address, financial
   inputs, or bearer links; use opaque IDs where possible.

5. **Changing the social card look in one file.** The blog, /vs, tool and
   persona cards and the two route-handler cards (`app/og/home`,
   `app/og/for-agents`) all draw on one frame, `lib/og/newsprint.tsx`,
   through the templates in `lib/og/` (§3.6): change the palette or layout
   there, not in a card file. The legacy `/d/[encoded]/opengraph-image.tsx`
   is the one card with its own inline styles; if the brand color or layout
   language changes, update it by hand.

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
- `RESEND_API_KEY` — required only for enabled transactional/per-user email flows; newsletter Broadcast access is not required while the newsletter is canceled.
- `CRON_SECRET` — bearer token for enabled per-user cron routes (`Authorization: Bearer <secret>`).

### Optional

- `STRIPE_ANNUAL_DISCOUNT_COUPON_ID` — coupon applied to annual checkout if the annual Price isn't already discounted.
- `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` — address autocomplete (restrict by HTTP referrer in GCP console).
- `FRED_API_KEY` — current 30-yr mortgage rate to pre-fill financing (free key).
- `HUD_API_KEY` — Fair Market Rent by county for single-family rent pre-fill (free key).
- `EMAIL_FROM` (default `TrueCap <hello@usetruecap.com>`), `EMAIL_REPLY_TO` (default `hello@usetruecap.com`).
- `NEWSLETTER_PAUSED` — keep `1` as defense in depth for the retired route. It does not authorize, schedule, or revive the canceled newsletter.
- `RATE_ALERTS_MODE` — `off` (default) / `dry` / `live` for the Thursday rate-alert cron. The feature ships dormant; flip to `dry`, review the JSON preview, then `live`.

A missing required var fails closed (the relevant action / cron returns
500 + Sentry alert rather than silently doing nothing). Don't add
fallbacks that mask a missing secret.

---

## 7. Testing + verification

| Goal                              | Command                                   |
| --------------------------------- | ----------------------------------------- |
| TypeScript check (fast)           | `npx tsc --noEmit`                        |
| Unit tests (Vitest)               | `npm test`                                |
| Production build (heavy, slowest) | `npm run build`                           |
| Lint                              | `npm run lint`                            |
| Build-chain integrity             | `node scripts/verify-build-integrity.mjs` |
| Dev server                        | `npm run dev`                             |

- **Build-chain integrity guard** — CI job `build-chain-guard` hashes the
  files that execute during `next build` (`next.config.mjs`,
  `package.json`, `postcss.config.mjs`, …) against
  `scripts/build-integrity-manifest.json`. It exists because a
  blockchain-C2 loader was smuggled into `postcss.config.mjs` inside a
  34-file commit and ran on every production build for six weeks
  (2026-06-01, `15eb1b5` → removed in `ab02311`).

  **If you edit any of those files, the guard fails CI and `main` goes
  red — a green local `npm run build` will not warn you.** The fix is
  not to disable it: read the diff of every listed file line by line,
  then `node scripts/verify-build-integrity.mjs --update` and commit the
  manifest bump **on its own**, with a message saying what changed in the
  build-executed file and why. If you did NOT make the change, do not
  update the manifest.

- **Unit tests** live in `lib/__tests__/`. Run them when you touch
  `calc-analysis.ts`, `analysis-template-schema.ts`,
  `dashboard-deal-mapping.ts`, `dashboard-risk-return.ts`, or anything
  with a sibling `*.test.ts`.
- **Sentry dashboard** is the source of truth for production errors. The
  `feature: newsletter-cron` tag belongs to a retired path and should not have
  scheduled production traffic.
- **Resend dashboard** remains the place to confirm that any historical weekly
  broadcasts are canceled. Do not use historical delivery metrics as current
  campaign proof.
- **Stripe dashboard** for webhook delivery + retries. Local Stripe
  webhook signature verification can be exercised with `stripe listen`.

Operational dry-runs:

- `npm run schedule-broadcasts:dry` — archived newsletter utility; do not run or use its output as a revival plan.
- `npm run schedule-daily-campaign:dry` — same for the 30-day drip.
- `npm run preview-daily-campaign` — render a drip day to local HTML for visual review.

---

## 8. Out-of-scope for Claude — ask first

Don't autonomously do any of the following. Surface a proposal first
and let the founder say yes.

1. **Change pricing** — the `$29.99/mo` / `$300/yr` figures, the annual discount, or
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

## 9. Design workflow (any UI change)

TrueCap's look is decided in `DESIGN.md`, not inferred from whatever the code
does today. Sessions that skip this section drift back to shadcn defaults.

1. **Load the Impeccable skill** (`.claude/skills/impeccable`, v4.3.1) for any
   UI work and run its setup once:
   `.claude/skills/impeccable/scripts/impeccable context`. Do not use
   ui-ux-pro-max, frontend-design, taste-skill, Hallmark or interface-design
   as standing skills; overlapping design rule sets degrade the output.
2. **Read `DESIGN.md` first.** It records decisions (paper, ink, type, radius
   by role, the chrome rules). When code and `DESIGN.md` disagree, the code is
   wrong unless the founder changed the decision. `PRODUCT.md` holds the
   audience, constraints and copy guardrails.
3. **Tokens over raw Tailwind.** Colors, fonts, radii and shadows come from the
   tokens in `app/globals.css`, the one stylesheet the marketing site and the
   app share (`styles/globals.css` is dead and imported by nothing). No raw
   palette classes, no hex, no arbitrary `shadow-[…]` or `rgba(…)` glows. A fix
   lands in a token or a shared component (header, footer, section wrapper,
   FAQ, plan card, ledger primitives, `components/ui/*`), never as a page-local
   override.
4. **Chrome rules.** No eyebrow or kicker above a heading. No "→" in link text
   and no trailing arrow icon on buttons. Sentence case everywhere, table heads
   included (acronyms stay acronyms). Cards only for objects the user compares
   (plan cards); feature lists, sources and FAQs use rules and space. Radius
   follows the role scale in `DESIGN.md`. No shadow at rest. No
   `transition-all`. At most one motion moment per page, and
   `prefers-reduced-motion` always wins.
5. **Detect before committing.**
   `.claude/skills/impeccable/scripts/impeccable detect --json <changed files>`
   must report no primary findings. For a page change, also scan the rendered
   page from a local production build at `--viewport 1440x900` and
   `--viewport 390x844`: most tells live in computed layout, and the source
   scan cannot see them.
6. **Look at the real widths.** 375, 768, 1095 (the founder's laptop window)
   and 1440: no horizontal scroll, controls at least 44px, the homepage
   investor cue visible in the first screen at 390px. The capture harness is
   `docs/design-pass/tools/capture.mjs`.
7. **Guards pin markup.** Many tests assert marketing class strings and copy
   (`lib/__tests__/*guards*`, `public-funnel-trust-guards`,
   `site-overhaul-*`, `structured-data-f4`, `internal-link-graph`,
   `e2e/site-overhaul-conversion.spec.ts`). When a design change moves them,
   re-anchor them in the same commit and say so in the message.
8. **Checkpoints of the 2026 design pass** (`docs/design-pass/`): (1) the brief,
   where `DESIGN.md` becomes decisions and the founder picks type and paper;
   (2) three homepage directions, chosen by looking; (3) the homepage before
   rollout, with before/after screenshots, scores and the app's key screens at
   the new tokens. Do not build past a checkpoint that has not been approved.

---

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
