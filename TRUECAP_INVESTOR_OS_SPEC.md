# TrueCap → Investor OS — Product Strategy & Build Spec

**Author framing:** senior PM + UX strategist + conversion copywriter + SEO lead + investor + full‑stack SaaS engineer.
**Status:** grounded plan. Every claim, contradiction, file path, and gap below was verified against the live codebase (`/final_source_code`), not assumed.
**Date:** 2026‑06‑21 · **Schema version at audit:** `INVESTCALC_SCHEMA_VERSION = 9`.

---

## 0. How to read this doc

This is the planning package for the next phase. It contains all 13 requested deliverables:

| # | Deliverable | Section |
|---|---|---|
| 1 | P0/P1/P2 backlog | §2 |
| 2 | Page‑by‑page website QA list | §4 |
| 3 | Feature entitlement source‑of‑truth proposal | §3 |
| 4 | Revised homepage wireframe | §5 |
| 5 | Revised pricing page wireframe | §6 |
| 6 | Revised analyzer workflow | §7 |
| 7 | Revised dashboard spec | §8 |
| 8 | Revised My Deals spec | §9 |
| 9 | Revised Compare Deals spec | §10 |
| 10 | Revised Templates / Strategy Profiles spec | §11 |
| 11 | Data model changes | §13 |
| 12 | Event tracking plan | §14 |
| 13 | Acceptance criteria | woven into each spec + consolidated in §15 |

Plus: Reports spec (§12), Investor‑segment coverage (§12.x), and an execution sequence (§16).

**Convention:** each item carries a stable ID (`P0‑1`, `AN‑3`, `DM‑2`, …) so the backlog, specs, acceptance criteria, and the task list all reference the same thing.

---

## 1. Vision & current state

### 1.1 The product thesis

Evolve TrueCap from a **calculator** into an **investor operating system** that owns the whole acquisition loop:

> **find deal → auto‑enrich → verify assumptions → compare → solve max offer → create report → track decision**

The free calculator is the top of funnel and the SEO moat. Pro is the operating system. The wedge that makes the OS defensible is **traceable, sourced assumptions** (HUD rent + FRED rate + state tax today; parcel/comps/listing enrichment next) plus **decision tracking** (pipeline → portfolio), neither of which a spreadsheet or a generic calculator does well.

### 1.2 What already exists (so we build on it, not over it)

- **Math core** is solid and centralized: `lib/calc-analysis.ts` is the single source of truth (cash flow, cap, CoC, DSCR; cash‑purchase edge case handled). `lib/verdict.ts` owns tiers. Don't fork this.
- **Pro feature surface is largely built**: Buy Box (`user_buy_box` + verdict card), pipeline stages + tags (`saved_analyses.pipeline_stage`, `tags`), data‑confidence provenance (`saved_analyses.data_confidence` + `lib/data-confidence.ts`), Strategy templates v2 (`analysis_templates` + `is_default`/`kind`/`buy_box` + version history), due‑diligence + documents (now in the dashboard deal workspace), RentCast comps + address autofill, report modes (lender/partner/personal), rate‑watch alerts.
- **Analytics plumbing exists** (PostHog client + server, gtag) — events are just not wired across the authed surface.

### 1.3 The load‑bearing gaps (what blocks the vision)

| Gap | Why it blocks the vision | Where |
|---|---|---|
| **One analysis per address** (duplicate‑address guard) | Can't model buy‑and‑hold vs BRRRR vs flip vs STR on the *same* property → kills "compare strategies/scenarios" | `saved_analyses_address_taken()` RPC (`20260419160000`) + `DUPLICATE_ADDRESS` code |
| **One buy box per user** (`user_buy_box` PK = `user_id`) | Can't have a Memphis‑BRRRR box and a Philly‑househack box → kills "multiple buy boxes by strategy/market" | `user_buy_box` table |
| **Entitlement truth is split** across DB JSON, runtime code, and ~25 marketing surfaces | Deal Score shows Free on pricing and Pro on persona/`/vs`/blog pages → erodes trust at the exact moment of conversion | see §3 |
| **No canonical calculator registry** | "14" vs "13" on the same page; footer lists 5; OG says 9 → looks unmaintained to SEO crawlers + users | see §3.4 |
| **Dashboard doesn't split pipeline vs owned** | Closed deals are filtered out entirely; no portfolio | `app/dashboard/page.tsx` query |
| **Authed surface fires no analytics** | Can't see which upsell converts, which step drops, which feature retains → flying blind on the OS | see §14 |
| **Advice guardrails missing on shared deals** | `/d/[encoded]` shows "Strong Buy / Avoid" to a lender/partner with zero disclaimer → legal exposure | `app/d/[encoded]/page.tsx` |

These set the priority order in §2.

---

## 2. Deliverable 1 — P0 / P1 / P2 backlog

Priority = (trust/legal risk + conversion impact) ÷ effort. **P0 = ship before any new feature work** (correctness, trust, legal, and the registries everything else depends on). **P1 = the OS core** (the features that deliver the vision). **P2 = depth & polish**.

Effort key: **S** ≤ ½ day · **M** ≈ 1–3 days · **L** ≈ 1–2 weeks · **XL** = multi‑week.

### P0 — correctness, trust, legal, foundations (do first)

| ID | Item | Why | Effort |
|---|---|---|---|
| **P0‑1** | **Entitlement source of truth** — one `lib/entitlements-catalog.ts` describing every feature × tier (Free / $5 PDF / Pro), consumed by pricing, persona, `/vs`, blog, and gates. Migration to add `deal_score` to the free plan JSON so data matches runtime. | Fixes the Deal Score Free‑vs‑Pro contradiction across ~25 surfaces; stops future drift. | M |
| **P0‑2** | **Deal Score copy sweep** — strip "(Pro)" / "Pro — 0‑100 score…" from the ~25 surfaces in §3.3; fix `pricing-toggle-plans.tsx:46` so Free reads "Save up to 5 deals" (not "Save + compare ✗"). | Direct trust bug at conversion. | M |
| **P0‑3** | **`CALCULATOR_REGISTRY`** — generalize `lib/embed-registry.ts` → `lib/calculator-registry.ts` (add non‑embeddable `rehab-cost-estimator`, `embeddable` flag, category). Drive `/tools`, `/embed`, footer, sitemap, OG image, cross‑link cards + all counts from it. | Kills 14‑vs‑13, footer‑5, OG‑9 drift; one source. | M |
| **P0‑4** | **Autofill honesty** — reword `property-details-section.tsx:52` to separate "address → rent/rate/tax defaults (always)" from the Pro "Autofill" button (beds/baths/price/sqft, when available). Add per‑value **source · confidence · last‑updated · status** chips (default/auto/edited/verified/missing/stale). | Stops over‑promising; sets up data‑confidence UX (AN‑2). | M |
| **P0‑5** | **Competitor language** — relabel `landing-sections.tsx:231` row to "Auto‑fill from public data (HUD rent + FRED rate + state tax)"; don't mark DealCheck's import `false`. Add source/date/methodology footnote to every competitor table. | Honest differentiation; matches the already‑good `/vs/dealcheck` framing. | S |
| **P0‑6** | **Polished dashboard deep links** — replace raw `/dashboard/templates|compare|saved-analyses` prose in 8 persona/blog spots (§4) with styled links + signed‑in deep links + a Pro hint; anon lands on a real explainer, not a redirect dead‑end. | Removes leaky internal‑URL look; better funnel. | S |
| **P0‑7** | **Ordered‑list a11y** — convert `app/states/[slug]/page.tsx:277‑307` `<ul>` + manual "1./2./3." to a real `<ol>`. Sweep for any others. | Screen‑reader correctness. | S |
| **P0‑8** | **Source/methodology boxes** — add a visible "Sources: HUD FMR · FRED · Tax Foundation · Updated {date}" box to `markets/[city]` and `states/[slug]`; surface `dateModified` on‑page. | Trust + SEO E‑E‑A‑T. | S |
| **P0‑9** | **Advice guardrails** — add a "not legal/tax/financial advice; verify locally" line to the read‑only shared deal view (`read-only-analysis-view.tsx` / `app/d/[encoded]`) and a tax/legal caveat near market/state landlord‑law + tax claims. | Highest legal exposure (shared verdicts) currently has none. | S |

### P1 — the OS core (delivers the vision)

| ID | Item | Why | Effort |
|---|---|---|---|
| **P1‑1** | **Guided analyzer steps** — Property → Income → Financing → Expenses → Strategy → Decision (progressive, no new required inputs). | Reduces drop, sets up data‑confidence + scenarios. | L |
| **P1‑2** | **Data confidence on every key input** (source, last‑updated, confidence, status). | Core differentiator; "verify assumptions" step. | L |
| **P1‑3** | **Property enrichment panel** — facts, tax history, sale history, rent range, rental comps, sale comps, active listing, DOM, trend (RentCast + cache; cost‑capped). | "auto‑enrich" + "verify". | L |
| **P1‑4** | **MAO / max‑offer central** — max price for target CF / DSCR / CoC / cap; required rent/rate/down to make current price work. Promote from a Stress‑Test sub‑card to a first‑class "What price makes this work?" surface. | Headline hook; #1 investor job. | M |
| **P1‑5** | **Scenarios per property** — parent `properties` entity, 1:many `saved_analyses`; relax duplicate‑address guard to duplicate‑scenario‑name. Strategy presets: buy‑hold / house‑hack / BRRRR / flip / Section 8 / MTR / STR. | Unlocks compare‑strategies + segment coverage. | XL |
| **P1‑6** | **Multiple buy boxes** — `user_buy_boxes` (1:many) by strategy/market; every deal shows pass/fail per box + max offer to meet box. | "find deal" fit; first‑class Buy Box. | L |
| **P1‑7** | **Dashboard: pipeline vs owned portfolio split** + Decision Center with persisted state + investor‑native stages. | "track decision"; owned portfolio. | L |
| **P1‑8** | **Stale‑assumption alerts** — generalize RateWatch to rent age, tax not parcel‑verified, insurance default, template changed, rate moved. | Retention engine. | M |
| **P1‑9** | **My Deals view modes + columns + bulk actions + tags.** | Operating the pipeline. | L |
| **P1‑10** | **Compare modes** (properties / strategies / scenarios / offers) + decision matrix + "what would make this win?" solver. | Decision support. | L |
| **P1‑11** | **Report modes** (investor memo, lender, agent/client, partner, wholesaler dispo, seller negotiation, DD packet). | Output value; share loop. | L |
| **P1‑12** | **Event tracking** across public, analyzer, dashboard, compare, templates, reports, share, buy‑box, upgrade prompts. | Measure everything above. | M |
| **P1‑13** | **Assumption impact panel** — which variables most move CF / DSCR / score / recommendation. | Teaches + builds trust. | M |

### P2 — depth & polish

| ID | Item | Effort |
|---|---|---|
| **P2‑1** | Strategy Profiles rename + full schema (scoring weights, risk tolerance, verification checklist, report mode, "show affected deals before applying", share with team). | L |
| **P2‑2** | Tools: calculator → analyzer handoff w/ input persistence; group by job (screen/finance/expenses/returns/offer); free lightweight saved calculator results. | M |
| **P2‑3** | Markets/states: standardized snapshot cards + strategy‑fit badges + surface market warnings inside the analyzer when a deal is in that city/state. | M |
| **P2‑4** | Blog: embed relevant calculators in articles; author/reviewer/methodology bylines; topic hubs (underwriting, financing, tax, strategy, markets). | M |
| **P2‑5** | Pricing: ROI calculator with editable assumptions + investor/agent/flipper presets; downgrade reassurance near CTA. | S |
| **P2‑6** | Compare risk‑return chart upgrades (quadrant labels, buy‑box + DSCR threshold lines, dot size = cash needed, color = confidence, full tooltips). | M |
| **P2‑7** | Segment‑specific onboarding/workflows for the 13 investor types (§12.x). | L |

---

## 3. Deliverable 3 — Feature entitlement source of truth

### 3.1 The problem (verified)

Entitlement truth lives in **three places that disagree**:

1. **Runtime code** — `app/actions/deal-score.ts` returns the full score + breakdown to everyone; homepages hardcode `canUseDealScore = true`. **Deal Score is effectively FREE.**
2. **DB plan JSON** — `plans.entitlements` for `free` = `["cash_flow","save_deal","dashboard_access"]` (no `deal_score`); `pro` includes `deal_score`. **The data layer says Deal Score is Pro.**
3. **Marketing copy** — pricing + landing say Free; ~25 persona/`/vs`/blog/changelog surfaces say Pro.

### 3.2 Canonical entitlement table (the intended truth)

This becomes the single source `lib/entitlements-catalog.ts`. Tiers: **Free**, **$5 one‑time PDF** (no account), **Pro**.

| Feature (key) | Free | $5 PDF | Pro | Gate today |
|---|---|---|---|---|
| Core math: cap, CoC, DSCR, cash flow (`cash_flow`) | ✅ | ✅ | ✅ | feature flag |
| Address auto‑fill defaults (HUD rent · FRED rate · state tax) | ✅ | ✅ | ✅ | always |
| **Deal Score 0–100 + subscore breakdown** (`deal_score`) | ✅ **(make canonical)** | ✅ | ✅ | runtime free; **JSON stale** |
| Plain‑English verdict | ✅ | ✅ | ✅ | always |
| 1 free RentCast comps lookup | ✅ (1 lifetime) | — | ✅ (50/mo) | `comps_free_used` + cap |
| Save deals (`save_deal`) | ✅ **up to 5** | — | ✅ unlimited | `max_saved_deals` |
| Dashboard access (`dashboard_access`) | ✅ | — | ✅ | feature flag |
| Dashboard insights (`dashboard_insights`) | ❌ | — | ✅ | feature flag |
| Compare deals (`compare_deals`) | ❌ | — | ✅ (up to 4) | feature flag |
| MAO solver · sensitivity grid | ❌ | — | ✅ | `isPaidPlan` (no key) |
| BRRRR · fix‑flip · rehab estimator | ❌ | — | ✅ | `isPaidPlan` (no key) |
| 10‑yr projections (`projections`) | ❌ | one‑deal in PDF | ✅ | feature flag |
| Tax strategy (`tax_strategy`) | ❌ | one‑deal in PDF | ✅ | feature flag |
| Exit scenarios (`exit_scenarios`) | ❌ | one‑deal in PDF | ✅ | feature flag |
| PDF export (`pdf_export`) | ❌ | ✅ (1 deal, unbranded) | ✅ unlimited | feature flag + Stripe one‑time |
| Custom PDF branding (`custom_branding`) | ❌ | ❌ | ✅ | feature flag |
| Shareable read‑only links | ❌ | — | ✅ | `isPaidPlan` (no key) |
| Template / Strategy Profiles (`template_manage`) | ❌ | — | ✅ | feature flag |
| Buy Box (`buy_box`) | ❌ | — | ✅ | feature flag |
| Pipeline + tags (`pipeline`) | ❌ | — | ✅ | feature flag |

**Two decisions you (Morgan) must confirm before P0‑1 ships** (both are reversible copy/flag flips, not architecture):
- **D1 — Deal Score policy.** Code currently gives Deal Score *and its breakdown* to everyone. Intended? (Recommended: **yes, free** — it's the headline SEO/conversion hook. Then add `deal_score` to the free JSON and strip "Pro" from the 25 surfaces.) Alternative: re‑gate the breakdown to Pro and fix pricing instead.
- **D2 — MAO/sensitivity/strategies/share** have **no entitlement key** (gated by paid status). Recommend giving them real keys (`mao`, `sensitivity`, `strategies`, `share_links`) so the catalog is complete and gating is uniform.

### 3.3 Proposed `lib/entitlements-catalog.ts` (shape)

```ts
// Single source of truth for feature × tier, consumed by gates AND marketing.
export type Tier = "free" | "one_time_pdf" | "pro";
export type FeatureKey =
  | "cash_flow" | "deal_score" | "save_deal" | "dashboard_access"
  | "dashboard_insights" | "compare_deals" | "mao" | "sensitivity"
  | "strategies" | "projections" | "tax_strategy" | "exit_scenarios"
  | "pdf_export" | "custom_branding" | "share_links" | "template_manage"
  | "buy_box" | "pipeline";

export interface FeatureSpec {
  key: FeatureKey;
  label: string;                 // marketing label — ONE place to edit
  tiers: Tier[];                 // who gets it
  freeLimit?: string;            // e.g. "up to 5", "1 lifetime"
  proLimit?: string;             // e.g. "unlimited", "50/mo"
  category: "core" | "analysis" | "reporting" | "pipeline" | "data";
  marketingBlurb?: string;
}

export const FEATURE_CATALOG: Record<FeatureKey, FeatureSpec> = { /* … */ };

// Derived helpers the WHOLE app (and marketing) import:
export const tierHas = (tier: Tier, key: FeatureKey) => FEATURE_CATALOG[key].tiers.includes(tier);
export const featureLabel = (key: FeatureKey) => FEATURE_CATALOG[key].label;
export const featuresForTier = (tier: Tier) => /* sorted FeatureSpec[] */;
```

Pricing tables, the plan cards, persona "what Pro unlocks" lists, and `/vs` rows all render from `featuresForTier` / `featureLabel` instead of hand‑typed strings. Runtime gates keep using `hasPlanFeature(entitlements, key)` but the **key list and labels** come from the catalog, so copy and code can never drift again.

### 3.4 Migration + acceptance

- **Migration** `…_free_deal_score.sql`: idempotent update of `plans.entitlements` for `free` to include `deal_score` (per D1). New migration, never edit old.
- **Acceptance (P0‑1/P0‑2):**
  - Grep for `"Pro — 0-100"`, `"Deal Score (Pro)"`, `deal score` near "Pro unlocks" → **zero** results outside the catalog.
  - `featuresForTier("free")` includes `deal_score` and `save_deal` (limit "up to 5").
  - Pricing table, plan cards, all 3 persona pages, all `/vs/*`, and the named blog posts render Deal Score as **Free**.
  - `pricing-toggle-plans.tsx` Free list shows "Save up to 5 deals"; never "Save + compare ✗".
  - A unit test asserts: for each surface‑rendered feature label, the tier shown == `FEATURE_CATALOG[key].tiers`.

---

## 4. Deliverable 2 — Page‑by‑page website QA list

Grounded findings, grouped by page, each with the fix and the backlog ID. ☐ = open.

### `/` homepage (`app/page.tsx`, `marketing-hero.tsx`, `landing-sections.tsx`)
- ☐ **Hero is honest but undersells the loop** — add the 4‑step workflow strip + source‑confidence preview + "What price makes this deal work?" hook (P1‑4, see §5). [HOME]
- ☐ `landing-sections.tsx:231` competitor row "Address auto‑fill (HUD + FRED)" marks DealCheck `false` — overclaim. Relabel "Auto‑fill from public data…" and don't mark competitor import false. **(P0‑5)**
- ☐ `landing-sections.tsx:364` / `app/page.tsx:368,384` "Pro adds save deals" implies saving is Pro‑only — Free saves up to 5. **(P0‑2)**
- ☐ FAQ Deal Score = free here ✅ (keep as canonical reference).
- ☐ Sample report preview is small — make it a prominent, labeled artifact (P1, §5).

### `/pricing` (`app/pricing/page.tsx`, `pricing-toggle-plans.tsx`)
- ☐ Deal Score correctly Free here ✅ — keep, and make catalog‑driven. **(P0‑1)**
- ☐ `pricing-toggle-plans.tsx:46` Free shows "Save + compare deals ✗" → should be "Save up to 5 deals ✓". **(P0‑2)**
- ☐ Save row says "Limited" without the number — state "Up to 5". **(P0‑2)**
- ☐ Reframe tier headlines + downgrade reassurance + ROI presets (P2‑5, §6).

### Persona pages `/for-house-hackers`, `/for-buy-and-hold`, `/for-agents`, `/for-brrrr`, `/for-flippers`
- ☐ `for-house-hackers:228`, `for-buy-and-hold:234`, `for-agents:222` say "Pro unlocks … deal score" → **wrong** (free). **(P0‑2)**
- ☐ Raw dashboard URLs as prose: `for-buy-and-hold:166` (`/dashboard/saved-analyses`), `for-brrrr:70,161` (`/dashboard/templates`, `/dashboard/compare`), `for-house-hackers:60,157` (`/dashboard/templates`). Replace with styled links. **(P0‑6)**

### Competitor pages `/vs/*` (≈40 pages)
- ☐ ~20+ files render Deal Score row as `"Pro — 0-100 score + subscore breakdown"` → **wrong on two counts** (score is free; breakdown is free). Catalog‑drive the row. **(P0‑1/P0‑2)**
- ☐ `/vs/dealcheck` FAQ + matrix are the **honest model** — replicate its "auto‑fill is a tie; our edge is sourced defaults" framing across the set. **(P0‑5)**
- ☐ Add a "Sources · methodology · last reviewed {date}" footnote to each comparison table. **(P0‑5)**

### `/changelog`
- ☐ `:572` "Deal Score + AI verdict (Pro)" → wrong. **(P0‑2)** ☐ `:299` raw `/dashboard/templates` prose. **(P0‑6)** (Dated historical count `:518` "Nine free calculators" — leave; it's a log entry.)

### Blog
- ☐ Deal Score = "Pro" in `best-free-rental-property-calculator-2026:63`, `how-truecap-verdict-engine-works:81‑82`, `dealcheck-vs-biggerpockets-vs-truecap:275,413`, `best-rental-property-calculator-2026:69`, `dealcheck-vs-stessa-vs-truecap`. **(P0‑2)**
- ☐ Raw dashboard URLs: `house-hacking-explained:174`, `1031-exchange-basics:204`. **(P0‑6)**
- ☐ Add author/reviewer/methodology bylines on tax/financing/market posts; embed relevant calculators; build topic hubs. **(P2‑4)**

### `/tools` + `/tools/[slug]` (14 pages) + `/embed`
- ☐ `tools/page.tsx:23,146` "Fourteen…", `embed/page.tsx:27,32,62,69` "14" vs `:137` derived "13" (**self‑contradiction on one page**), `tools/opengraph-image.tsx:16‑19` stale "9". All → `CALCULATOR_REGISTRY`. **(P0‑3)**
- ☐ `site-footer.tsx:59‑63` hardcoded 5 calculators; `sitemap.ts:88‑171` 14 literal blocks → registry‑drive. **(P0‑3)**
- ☐ `tools/1-percent-rule-calculator:227` etc. `<ol>` are clean ✅.
- ☐ Add calculator→analyzer handoff + job grouping + free saved results. **(P2‑2)**

### `/markets/[city]`, `/markets/philadelphia`, `/states/[slug]`
- ☐ No visible "Sources · methodology · Updated {date}" box; `dateModified` only in JSON‑LD (`markets/[city]:148`, `states/[slug]:89`). Add it. **(P0‑8)**
- ☐ `states/[slug]:277‑307` `<ul>` with manual "1./2./3." → `<ol>`. **(P0‑7)**
- ☐ No tax/legal caveat near landlord‑law/eviction/tax claims. **(P0‑9)**
- ☐ Add strategy‑fit badges + standardized snapshot cards + surface warnings in analyzer. **(P2‑3)**

### `/d/[encoded]` shared read‑only deal
- ☐ **No SiteFooter, no disclaimer** while showing "Strong Buy / Avoid" to lenders/partners → highest legal exposure. Add a not‑advice line. **(P0‑9)**

### Analyzer (`investcalc-page.tsx`, `property-details-section.tsx`)
- ☐ `property-details-section.tsx:52` "tap Autofill to pull beds, baths, price & rent" shown to everyone (button only for signed‑in+configured); rent actually comes from HUD on select, not the button. Reword + add source/status chips. **(P0‑4)**

---

## 5. Deliverable 4 — Revised homepage wireframe

**Goal:** show the *loop*, not just the calculator; lead with the "what price makes this work?" hook; prove sourcing in the hero.

```
┌──────────────────────────────────────────────────────────────────────┐
│ NAV  TrueCap   Tools  Markets  Why TrueCap  Pricing      [Sign in]      │
├──────────────────────────────────────────────────────────────────────┤
│ HERO                                                                   │
│  H1: Know if a rental works — and the price that makes it work — in 60s│
│  Sub: Paste an address. We auto-fill rent, rate & tax from HUD, FRED & │
│       state data, score the deal 0–100, and solve your max offer. Free.│
│                                                                        │
│  [ 123 Main St, City, ST ___________________ ]  ( Analyze free → )      │
│  trust chips:  ✓ No card  ✓ No signup  ✓ 60 seconds                     │
│                                                                        │
│  ── SAMPLE CARD (live, prominent) ──────────────────────────────────┐ │
│  │ 123 Main St · SFR        DEAL SCORE  78 / 100   "Solid buy"       │ │
│  │ Cash flow $284/mo · Cap 6.4% · CoC 9.1% · DSCR 1.28               │ │
│  │ ┌ Assumptions (sourced) ───────────────────────────────────────┐ │ │
│  │ │ Rent $1,850  HUD FMR · 2026  ✓verified-source                 │ │ │
│  │ │ Rate 6.9%    FRED 30yr · today  ✓live                         │ │ │
│  │ │ Tax 1.1%     PA state avg     ⚑ default — verify parcel       │ │ │
│  │ └───────────────────────────────────────────────────────────────┘ │ │
│  │ ► What price makes this work?  $312k for $300/mo  →               │ │
│  └───────────────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────────┤
│ 4-STEP WORKFLOW STRIP (the OS loop, visual)                            │
│  ① Paste address      ② Verify assumptions   ③ See verdict & score     │
│     auto-enrich          source/confidence       0–100 + plain English │
│  ④ Solve offer & export  → "what price works" + lender PDF             │
├──────────────────────────────────────────────────────────────────────┤
│ "FROM CALCULATOR TO PIPELINE"  (Pro teaser, honest)                    │
│  Save & compare deals · buy boxes · max-offer · scenarios · reports    │
│  [ See sample lender report ]   [ See the dashboard ]                  │
├──────────────────────────────────────────────────────────────────────┤
│ WHY TRUECAP  — sourced defaults vs spreadsheets/closed tools          │
│   (honest competitor row: "Auto-fill from public data: HUD+FRED+state")│
│   Sources · methodology · last reviewed 2026-06                        │
├──────────────────────────────────────────────────────────────────────┤
│ SEGMENTS  (cards → persona pages): House hack · BRRRR · Flip · Agent · │
│   Section 8 · STR/MTR · Small multifamily · Out-of-state               │
├──────────────────────────────────────────────────────────────────────┤
│ FREE CALCULATORS (registry-driven, grouped by job)                     │
├──────────────────────────────────────────────────────────────────────┤
│ FAQ (Deal Score = free) · not financial advice · FOOTER                │
└──────────────────────────────────────────────────────────────────────┘
```

**New/changed components:** `HeroSampleCard` (gets the sourced‑assumptions mini‑panel + "what price works" line), `WorkflowStrip` (4 steps), prominent `SampleReportPreview`. **Acceptance:** hero shows ≥3 sourced assumption chips with status; the 4 steps are visible above the fold on desktop; "what price makes this work?" appears in hero and links into the analyzer's MAO surface; competitor row no longer marks a competitor's import `false`.

---

## 6. Deliverable 5 — Revised pricing page wireframe

**Reframe tiers around the job, not the feature list:**

| | **Free** | **$5 one‑time PDF** | **Pro** |
|---|---|---|---|
| **Job** | *Is this worth underwriting?* | *Send one polished deal.* | *Run your acquisition pipeline.* |
| Headline | Score any deal, free | One lender‑ready PDF, no account | The investor operating system |
| For | Screening, learning | Occasional / one‑off | Active buyers, agents, BRRRR/flip |

```
┌──────────────────────────────────────────────────────────────────────┐
│  Pricing that pays for itself on the first deal.   ◦ Free to start     │
│                                                                        │
│  ┌── FREE ──────────┐  ┌── $5 PDF ─────────┐  ┌── PRO  [Mo|Yr] ──────┐ │
│  │ Is this worth     │  │ Send one polished │  │ Run your acquisition │ │
│  │ underwriting?     │  │ deal.             │  │ pipeline.            │ │
│  │ $0                │  │ $5 once           │  │ $X/mo                │ │
│  │ • Score 0–100     │  │ • Full lender PDF │  │ • Everything in Free │ │
│  │ • Cap/CoC/DSCR/CF │  │ • 10yr+tax+exit   │  │ • Save unlimited     │ │
│  │ • Auto-fill HUD…  │  │   in the report   │  │ • Buy boxes + MAO    │ │
│  │ • Save up to 5    │  │ • No account      │  │ • Compare + scenarios│ │
│  │ • 1 comps lookup  │  │ • Unbranded       │  │ • 7 report modes     │ │
│  │ [ Start free ]    │  │ [ Run a deal ]    │  │ [ Start Pro ]        │ │
│  │                   │  │                   │  │ ↳ Keep read-only     │ │
│  │                   │  │                   │  │   access to saved    │ │
│  │                   │  │                   │  │   deals & PDFs if you│ │
│  │                   │  │                   │  │   ever downgrade.    │ │
│  └───────────────────┘  └───────────────────┘  └──────────────────────┘ │
│                                                                        │
│  ROI CALCULATOR  [ Investor | Agent | Flipper ] presets                │
│   Editable: deals/mo, avg price, hours saved, close rate → $ value/mo  │
│                                                                        │
│  FEATURE TABLE (catalog-driven; Free / $5 / Pro columns)               │
│  FAQ (downgrade, accuracy, who it's for) · not financial advice        │
└──────────────────────────────────────────────────────────────────────┘
```

**Changes:** add the **$5 column as a first‑class tier** (today it's only a strip lower down); **downgrade reassurance** ("Keep read‑only access to saved deals and exported PDFs") next to the Pro CTA; **ROI presets** (investor/agent/flipper) with editable inputs; feature table renders from `FEATURE_CATALOG` (D‑3). **Acceptance:** three tiers visible; downgrade line within one viewport of the Pro CTA; ROI calc recomputes on input change and switches presets; every table cell traces to `FEATURE_CATALOG`.

---

## 7. Deliverable 6 — Revised analyzer workflow

**Today:** one long scrolling `react-hook-form` (sections: property‑type, property‑details, unit(s), financing, operating‑expenses), manual calculate, results render inline as a 6‑tab dashboard. **No new required inputs** are introduced below — `bedrooms` + `monthlyRent` remain the only hard requirements for SFR.

### 7.1 Guided steps (progressive, not a rigid wizard)

A sticky step rail; each step is the existing section(s) re‑grouped. Users can jump; the rail shows completion + confidence.

| Step | Contains (existing → new) | Confidence surface |
|---|---|---|
| **① Property** | type + address + facts (beds/baths/sqft/year). Adds the Pro **Autofill** (RentCast facts) here. | facts: source/status chips |
| **② Income** | rent (SFR) or per‑unit rents (MF) + other income; **rent‑comp range** inline. | rent: HUD/RentCast source + range |
| **③ Financing** | down %, rate, term, closing, points. | rate: FRED source + last‑updated |
| **④ Expenses** | tax, insurance, HOA, utilities, + advanced (maint/vac/mgmt/capex/growth/depreciation/tax rate). | tax: state vs parcel‑verified flag |
| **⑤ Strategy** | choose lens/strategy (buy‑hold / house‑hack / BRRRR / flip / Section 8 / MTR / STR) → preset assumptions + scenario save (AN‑5). | template/strategy provenance |
| **⑥ Decision** | verdict + Deal Score + Buy‑Box pass/fail + **MAO ("what price works")** + assumption‑impact + export/save/track. | overall data‑confidence rollup |

**AN‑1 acceptance:** step rail shows ⬤ complete / ◐ partial / ◯ empty + a per‑step confidence dot; deep‑link `?step=financing`; no new required fields; existing localStorage draft + manual‑calc behavior preserved; results still reachable as today (tabs) but Decision step links to them.

### 7.2 Data confidence on every important input (AN‑2)

Each enriched/important input renders a chip: **source** (HUD FMR / FRED / state / RentCast / user) · **last‑updated** · **confidence** (High/Med/Low) · **status** ∈ {default, auto‑filled, user‑edited, verified, missing, stale}. Backed by `saved_analyses.data_confidence` (exists) + `lib/data-confidence.ts` (extend with `status` + `ageDays`). **Acceptance:** every value in `data_confidence` renders a chip; editing a value flips status→`user_edited`; a value older than its threshold (rent > 90d, rate > 7d, tax never parcel‑verified) flips →`stale`/`missing` and shows a "verify" affordance.

### 7.3 Property enrichment panel (AN‑3)

On the Property/Income steps + a dedicated "Property data" card, surface (from RentCast + cache, cost‑capped exactly like comps today): **facts, tax history, sale history, rent estimate + range, rental comps, sale comps, active listing + days‑on‑market, market trend.** Reuse `property_enrichment_cache`, the per‑user/global caps, and the `deal_comps` persistence. **Acceptance:** one pull populates facts + both comp sets + listing/DOM + trend; every field is reference‑only (never silently mutates the underwrite — user clicks "use this"); respects the 50/mo Pro + global cap; degrades silently without the key.

### 7.4 Assumption impact panel (AN‑13)

A tornado/sensitivity readout: for the current deal, rank the inputs by how much a ±10% (or ±0.5pp for rate/DSCR) move shifts **cash flow, DSCR, Deal Score, recommendation tier.** Computed from `calc-analysis` deltas (no new math source). **Acceptance:** top‑5 drivers shown with direction + magnitude; clicking a driver focuses that input; recomputes when inputs change.

### 7.5 Buy Box first‑class in the analyzer (AN‑6)

The Decision step shows **pass/fail per buy‑box rule** (cap/CoC/DSCR/CF/price) for **each** of the user's buy boxes (multiple — DM‑2), and the **max offer needed to pass** each failing box. Reuse `buy-box-verdict-card.tsx`, extended for N boxes. **Acceptance:** with ≥1 box, every rule shows ✓/✗ + actual vs threshold; failing price rules show "offer ≤ $X to pass"; with multiple boxes, a box selector.

### 7.6 MAO / max‑offer central (AN‑4) — the headline hook

Promote from a Stress‑Test sub‑card to a Decision‑step hero, "**What price makes this deal work?**":
- max price for **target cash flow**
- max price for **target DSCR**
- max price for **target CoC**
- max price for **target cap rate**
- and the inverse: **required rent / rate / down payment** to make the *current* price work.

Reuse `lib/max-allowable-offer.ts`. **Acceptance:** four target‑price solvers + three required‑input solvers; each updates live; "set as my offer" writes the price back into the deal as a scenario (AN‑5); shown on the homepage hero sample (HOME).

### 7.7 Scenario comparison for the same property (AN‑5)

Strategy presets create **scenarios** under one property (DM‑1): buy‑and‑hold · house‑hack · BRRRR · flip · Section 8 · MTR · STR. Each scenario is a `saved_analyses` row tied to a parent `properties` row; compare them in Compare's "scenarios" mode (§10). **Acceptance:** from a deal, "Add scenario → BRRRR" clones the property facts, swaps the strategy preset, saves as a named scenario without tripping duplicate‑address; the property shows its scenario set; switching strategy never loses property facts.

---

## 8. Deliverable 7 — Revised dashboard spec

**Today:** `DashboardHome` = Decision Center band (derived, no persistence) + RateWatchStrip + portfolio stats + pipeline‑summary strip; query pulls **active deals only** (`closed`/`passed` filtered out) so there's **no owned portfolio**.

### 8.1 Split Acquisition Pipeline vs Owned Portfolio (DASH‑1)

Two top‑level views (tabs or sidebar entries), driven by `pipeline_stage`:
- **Acquisition Pipeline** = active stages (researching → … → under_contract). Kanban or table by stage; value + count per stage (extend the existing pipeline‑summary strip).
- **Owned Portfolio** = `closed` deals. Portfolio rollup (equity, monthly CF, weighted cap/DSCR, total cash invested), per‑property performance, refinance/exit candidates. *(New read path — `closed` deals are currently discarded.)*

**Acceptance:** stage drives which view a deal appears in; closed deals appear in Portfolio (not lost); each view has its own rollup; counts reconcile with My Deals filters.

### 8.2 Decision Center with persisted state (DASH‑2)

Four lanes: **Best fit today · Needs action · Highest upside · Ready to send.** Cards derived from buy‑box fit + staleness + score + report‑readiness, with **persisted** "snooze/done/reviewed" (new small table or `saved_analyses` columns). **Acceptance:** each lane lists ranked deals with a one‑click next action; "mark reviewed/snooze" persists and removes from the lane; empty lanes self‑hide.

### 8.3 Investor‑native stages (DASH‑3)

Extend `pipeline_stage` CHECK from the current 6 to: **Researching · Underwriting · Needs assumptions · Ready to offer · Offer made · Under contract · Due diligence · Passed · Closed · Archived.** Update `lib/pipeline.ts` (`PIPELINE_STAGES`, `flagsForStage`, `isActiveStage`) + a migration that maps old→new. **Acceptance:** all 10 stages selectable; legacy rows migrate deterministically; `closed`→Portfolio, `passed`/`archived`→archived; stage transitions tracked (event STAGE_CHANGED).

### 8.4 Stale‑assumption alerts (DASH‑4, generalize RateWatch)

Beyond the existing FRED‑rate flip: **rent estimate older than N days · tax not parcel‑verified · insurance still default · template changed since last analysis · rate moved ≥0.125pp.** Each alert → a Decision‑Center "Needs action" card + (optional) the rate‑alert email path. Backed by `data_confidence` ages + a nightly job. **Acceptance:** each alert type detectable from stored provenance without re‑pulling paid data where possible; dismiss/resolve persists; a deal with all‑fresh, verified assumptions shows none.

### 8.5 Data‑confidence rollup + next‑best‑action (DASH‑5/‑6)

- **Rollup:** portfolio‑/pipeline‑level "X% of deals have verified rent, Y% parcel‑verified tax" gauge from `data_confidence`.
- **Next‑best‑action cards:** per deal, the single highest‑leverage action (verify tax · refresh rent · make offer · send report · move stage). **Acceptance:** rollup matches per‑deal confidence; each active deal yields exactly one primary next action; clicking routes to the action.

---

## 9. Deliverable 8 — Revised My Deals spec

**Today:** `saved-analyses-page-v2.tsx` — responsive table/cards, stage dropdown + tags + filters, Open/PDF/(new) Checklist actions, compare picker (≤4), portfolio rollup strip.

### 9.1 View modes (MD‑1)

Toggle the same dataset into: **Underwriting** (metrics: score, CF, cap, CoC, DSCR), **Pipeline** (stage, next action, due date), **Offer** (price, MAO, gap‑to‑target, offer status), **Portfolio** (owned: equity, CF, cash invested, return). Persist last‑used mode (profile pref or localStorage). **Acceptance:** switching mode swaps columns without refetch; mode persists across sessions; each mode has a sensible default sort.

### 9.2 Columns / toggles (MD‑2)

Column chooser exposing: DSCR · cash needed · max offer · **gap to target** (price − MAO) · rent confidence · tax verified · template/strategy · **buy‑box fit** · last updated · next action · due date. Most exist on `saved_analyses` or derive cheaply; `max offer`/`gap` compute from `lib/max-allowable-offer.ts`; `buy‑box fit` from DM‑2. **Acceptance:** each column sortable; buy‑box fit shows pass/fail/▲offer; gap‑to‑target colored (green ≤0); choices persist.

### 9.3 Bulk actions (MD‑3)

Multi‑select → **Compare · Export · Apply template/Strategy Profile · Move stage · Archive · Create report package** (zip/merged PDF of selected, per report mode). **Acceptance:** select N; each action confirms count + is undoable where reversible (stage/archive); "report package" produces one artifact per selected deal or a merged packet; entitlement‑gated (Pro).

### 9.4 Tags (MD‑4)

Seed quick tags: **Section 8 · Seller finance · Needs rehab · Tax risk · Flood risk · Strong comps · Partner review · Agent sent.** Reuse `saved_analyses.tags` (exists, GIN‑indexed) + the tag UI. **Acceptance:** tag add/remove persists; filter by tag; tag chips appear in all view modes; suggested tags offered but free‑form allowed.

---

## 10. Deliverable 9 — Revised Compare Deals spec

**Today:** up to 4 **saved deals**, single mode (as‑saved snapshots), already has a "best deal" winner + 3 libs (`compare-metrics`, `compare-assumptions`, `compare-result-snapshot`) + a risk‑return chart.

### 10.1 Comparison modes (CMP‑1)

| Mode | Compares | Source |
|---|---|---|
| **Properties** | different addresses (today's behavior) | saved deals |
| **Strategies** | same property, different strategy presets | scenarios (DM‑1) |
| **Scenarios** | saved scenario variants of one property | scenarios (DM‑1) |
| **Offers** | same deal at different price/terms | on‑the‑fly re‑solve via MAO |

**Acceptance:** mode selector; Strategies/Scenarios modes require a property with ≥2 scenarios; Offers mode lets you set 2–4 price/term points and recomputes; an **apples‑to‑apples toggle** re‑underwrites all columns with one shared assumption set (new — today it's as‑saved only).

### 10.2 Decision matrix (CMP‑2)

A metric × deal grid with **per‑metric winners** highlighted and an overall recommendation (extend the existing winner logic to show *why* each won). **Acceptance:** every metric row marks the winning column; overall winner explained ("wins 7/11 metrics incl. DSCR, CoC"); ties handled.

### 10.3 Risk‑return chart upgrades (CMP‑3)

Add: quadrant labels (e.g. "low‑risk / high‑return = target"), **buy‑box threshold lines** + **DSCR threshold line**, dot **size = cash needed**, **color = confidence/risk**, full tooltips (all metrics + assumptions on hover). Build on `RiskReturn.tsx` + `lib/dashboard-risk-return.ts`. **Acceptance:** thresholds render as reference lines; dot size/color encode cash/confidence with a legend; tooltip shows the full metric set; keyboard/SR accessible.

### 10.4 "What would make this deal win?" solver (CMP‑4)

For a losing deal, solve the minimal change (price ↓, rent ↑, rate ↓, down ↑) to beat the current winner on the chosen metric. Reuse MAO solvers. **Acceptance:** pick a metric + a target deal → returns the smallest single‑lever change (and a combined option) that flips the winner; "apply as offer scenario" writes it back.

---

## 11. Deliverable 10 — Templates → Strategy Profiles spec

**Rename** "Templates" → **Strategy Profiles** in UI/product language (keep table name `analysis_templates` to avoid a destructive migration; rename labels + routes alias). Today a profile stores assumptions + `template_type` + `is_default` (wired) + `kind` (schema‑only, no UI) + `buy_box` (wired) + version history (wired).

### 11.1 A Strategy Profile should fully describe a way of investing (SP‑1)

Extend the schema (`lib/analysis-template-schema.ts` + columns/JSON) to include:

| Field | Status today | Action |
|---|---|---|
| Financing assumptions | ✅ | keep |
| Expense assumptions | ✅ | keep |
| Growth assumptions | ✅ | keep |
| Tax assumptions | ✅ | keep |
| **Buy‑box thresholds** | ✅ (`buy_box`) | surface in editor |
| **Strategy kind** (BRRRR/STR/Section 8…) | ⚠️ schema‑only | add selector + show on cards |
| **Scoring weights** | ❌ | add (feeds Deal Score weighting per strategy) |
| **Risk tolerance** | ❌ | add (conservative/balanced/aggressive already exists as `template_type` → reuse) |
| **Required verification checklist** | ❌ | add (seeds the DD checklist for deals using this profile) |
| **Report mode** | ❌ | add (default report when exporting a deal on this profile) |

**Acceptance:** editor exposes all fields; `kind` is selectable + shown on cards; scoring weights validate to sum‑to‑1 (or normalized); applying a profile seeds its verification checklist onto the deal's DD; report mode preselects on export.

### 11.2 Operations (SP‑2)

Set default ✅ · duplicate ✅ · apply to existing deals ✅ · version history ✅ — **plus add:** **show affected deals before applying** (preview count + list + metric deltas), and **share with team** (export/import a profile; or a shareable read‑only profile link). **Acceptance:** "apply to existing" first shows N affected deals + before/after score/CF deltas and requires confirm; profiles export to a portable JSON and import with name‑collision handling; shared profiles are read‑only for the recipient.

---

## 12. Reports spec (P1‑11)

Build on the existing report‑mode infra (`lib/pdf-export-constants.ts` `ReportMode`, `pdf-generator.ts` section gating). Seven modes, each = a section set + tone + audience framing:

| Report mode | Audience | Sections (on top of core verdict + metrics) |
|---|---|---|
| **Investor memo** | self / partner | thesis, assumptions w/ sources, MAO, risks, decision |
| **Lender package** | bank / DSCR lender | DSCR detail, debt service, rent roll, 10‑yr, sources, **no verdict tier** |
| **Agent / client report** | buyer client | plain‑English verdict, comps, "what price works", next steps |
| **Partner report** | JV / money partner | equity split scenarios, returns (IRR/EM/CoC), risk, exit |
| **Wholesaler dispo report** | cash buyer list | ARV, rehab, MAO, spread, comps, "buy at $X" |
| **Seller negotiation report** | seller / agent | comp‑supported offer rationale, condition adjustments, terms |
| **Due‑diligence packet** | self / closing | DD checklist status, documents index, verified assumptions, contingencies |

**Acceptance:** each mode renders only its section set + correct tone; **lender/agent/client/seller modes omit internal "Strong Buy/Avoid" tier language** (replace with neutral framing) to avoid steering/advice issues; branding applies on Pro; `$5` one‑time PDF maps to the Investor‑memo/lender set, unbranded; report‑mode chosen is tracked (EVT).

### 12.x Investor‑segment coverage matrix

Each segment = an entry point (persona page + a default Strategy Profile + a default report mode + relevant calculators). Most are **assumption/preset differences**, not new math — `form_snapshot` already supports them.

| Segment | Default Strategy Profile | Key surfaces | Notes |
|---|---|---|---|
| New investors | Balanced LTR | guided steps + glossary tips | lean on data‑confidence + "what price works" |
| Buy‑and‑hold | LTR | projections, exit | core path |
| House hackers | FHA owner‑occupant | owner‑occupied unit math (exists), house‑hack scenario | |
| BRRRR | BRRRR | rehab → refi → ARV; BRRRR scenario; cash‑out | exists; add stale‑refi alert |
| Flippers | Hard‑money flip | rehab + ARV + MAO + holding costs | de‑emphasize cap/CoC; emphasize spread |
| Wholesalers | Wholesaler MAO | MAO‑central + dispo report + comps | "buy at $X" hook |
| Agents | Client report | shareable links + client report + comps | downgrade‑safe sharing |
| Private lenders | Lender package | DSCR + debt‑service report | |
| Section 8 | Section 8 LTR | HUD FMR rent (already the source) + payment standard | tag + report note |
| MTR | MTR preset | higher rent + furnished/utility expenses | scenario preset |
| STR | STR preset | ADR×occupancy income + STR expenses + reg warnings | scenario preset; market warning |
| Small multifamily 5+ | Multifamily | per‑unit rents (exists) + commercial DSCR | |
| Out‑of‑state | LTR + market warnings | market‑fit badges + source boxes + remote DD checklist | leans on enrichment |

**Acceptance:** each segment reachable from a persona page; each has a default Strategy Profile that seeds the right assumptions + report mode; STR/Section 8/MTR are scenario presets on a property; no segment requires a new required input.

---

## 13. Deliverable 11 — Data model changes

All changes are **new, idempotent, owner‑RLS migrations** (never edit applied ones). Ordered by the features that need them.

| ID | Change | For | Detail |
|---|---|---|---|
| **DM‑1** | **`properties` parent table** + `saved_analyses.property_id` FK (nullable, backfill 1:1) | scenarios (AN‑5), Compare strategies/scenarios (CMP‑1) | `properties(id, user_id, address, lat/lng?, facts jsonb, created_at)`. `saved_analyses` becomes 1:many children = scenarios. **Relax** `saved_analyses_address_taken()` from "one analysis per address" → "unique **scenario name** per property". Add `saved_analyses.scenario_name`, `strategy_kind`. |
| **DM‑2** | **`user_buy_boxes` (1:many)** replacing the 1:1 `user_buy_box` | multiple buy boxes (P1‑6, AN‑6) | `(id, user_id, name, strategy_kind, target_states text[], property_types text[], min_* thresholds, is_active, sort_order)`. Migrate the existing single row → one named box. Keep `user_buy_box` readable during transition or view‑alias. |
| **DM‑3** | **`pipeline_stage` CHECK expansion** 6 → 10 stages | investor stages (DASH‑3) | add `underwriting, needs_assumptions, ready_to_offer, offer_made, due_diligence`; map legacy; update `lib/pipeline.ts`. |
| **DM‑4** | **Decision/alert state** — `deal_alerts` or columns on `saved_analyses` | Decision Center persistence + stale alerts (DASH‑2/‑4) | `(analysis_id, alert_type, status[open/snoozed/resolved], created_at, resolved_at)`; or `decision_state jsonb`. |
| **DM‑5** | **`data_confidence` extension** — add `status` + `ageDays`/`asOf` per field | data confidence (AN‑2), stale alerts | extend `lib/data-confidence.ts` shape; back‑compatible (normalize on read). |
| **DM‑6** | **Strategy Profile fields** — `scoring_weights jsonb`, `verification_checklist jsonb`, `report_mode text` on `analysis_templates` | Strategy Profiles (SP‑1) | additive columns; `kind` already exists. |
| **DM‑7** | **Enrichment columns** on `deal_comps`/cache — tax history, sale history, listing, DOM, trend | enrichment (AN‑3) | extend `payload` shape (jsonb — no DDL) + cache TTLs per data type. |
| **DM‑8** | **View‑mode / column prefs** — `profiles.deal_view_prefs jsonb` | My Deals view modes (MD‑1/‑2) | persists last mode + column choices. |
| **DM‑9** | **Owned‑portfolio fields** — `purchase_close_date`, `actual_purchase_price`, `current_value?` on closed deals | portfolio view (DASH‑1) | optional; only for `closed` stage. |
| **DM‑10** | **Entitlement JSON** — add `deal_score` to `free`; (optional) add keys `mao/sensitivity/strategies/share_links` to `pro` | entitlement SoT (P0‑1) | makes DB match runtime + catalog. |

**Migration safety:** every change ships behind the existing MIGRATION_PENDING tolerance pattern (actions detect `42P01`/`42703` and degrade). `properties` + `user_buy_boxes` are the only structural ones; both backfill 1:1 so nothing breaks pre‑cutover.

---

## 14. Deliverable 12 — Event tracking plan

PostHog plumbing exists (`lib/analytics.ts` client, `lib/posthog-server.ts` server) — this is **additive `trackEvent` calls**, no new infra. Naming: `area.object_action`. Each event lists key props.

### Public funnel (partly done)
- `public.landing_view` ✅ · `public.hero_address_submit` ✅ · `public.hero_sample_clicked` ✅
- **add:** `public.cta_clicked {location}`, `public.pricing_view`, `public.pricing_cta_clicked {tier}`, `public.persona_view {segment}`, `public.vs_view {competitor}`, `public.tool_used {slug}` (the SEO calculators fire **nothing** today), `public.tool_to_analyzer {slug}` (P2‑2 handoff).

### Analyzer funnel (thin today)
- `analyzer.started` ✅ · `analyzer.calc_completed` ✅
- **add:** `analyzer.step_viewed {step}` + `analyzer.step_completed {step}` (instruments the new guided steps directly), `analyzer.autofill_used {fields, source}`, `analyzer.enrichment_pulled {types}`, `analyzer.confidence_chip_clicked {field,status}`, `analyzer.mao_solved {target_type}`, `analyzer.scenario_added {strategy}`, `analyzer.buybox_evaluated {boxes, pass}`.

### Dashboard (dark today)
- **add:** `dashboard.view {mode: pipeline|portfolio}`, `dashboard.decision_card_action {lane, action}`, `dashboard.alert_shown/resolved {type}`, `dashboard.stage_changed {from,to}`, `dashboard.nba_clicked {action}`.

### Compare / Templates / Buy box (dark today)
- `compare.started {mode, count}`, `compare.winner_viewed`, `compare.solver_used {metric}`
- `strategy_profile.created/applied/version_restored {kind}`, `strategy_profile.apply_previewed {affected_count}`
- `buybox.created/edited {strategy}`, `buybox.adopted_from_template`

### Reports / share (partial)
- `report.exported {mode, branded}` (today `pdf_exported` doesn't carry the mode), `report.package_created {count}`
- `share.link_created` (missing) + `share.link_copied` ✅ + `share.public_view` (on `/d/[encoded]`)

### Upgrade prompts (dark today — the biggest attribution gap)
- `upsell.prompt_shown {placement, feature}`, `upsell.prompt_clicked {placement, feature}` on `pro-inline-gate.tsx` + moment‑of‑value upsell → closes the blind spot between `calc_completed` and `pro_checkout_started`.

### Conversions (keep gtag + PostHog dual‑fire)
- `calc_completed` ✅ · `deal_saved` ✅ · `pdf_exported` ✅ · `pro_checkout_started` ✅ · `pro_subscribed` ✅. **Action:** populate the **null Google Ads labels** in `lib/analytics/track-conversion.ts` so paid‑search conversions actually register.

**Acceptance:** every funnel stage above emits at least one event; a PostHog funnel `landing_view → analyzer.started → calc_completed → upsell.prompt_shown → pro_checkout_started → pro_subscribed` is fully connected; report exports distinguish mode; no PII in props (addresses → coarse state only, per existing convention).

---

## 15. Deliverable 13 — Acceptance criteria (consolidated)

Per‑feature acceptance lives inline above. The cross‑cutting **"definition of done"** every item must also meet (matches house rules in `CLAUDE.md`):

1. `npx tsc --noEmit` clean; `npm run lint` no new errors; `npm test` green; production build passes.
2. Server actions return discriminated unions, never throw to client; new gates go through `hasPlanFeature` / the catalog — never `subscription.status`.
3. Any new table: owner‑only RLS (or service‑role‑only w/ rationale); admin writes verify ownership; new migration (today's timestamp), never edits an applied one; action tolerates the pending migration (`42P01`/`42703`).
4. No secret in a client component; no admin client imported across the client boundary.
5. Cost‑bearing data (RentCast) stays behind caps + cache + entitlement; degrades silently without the key.
6. New copy traces to `FEATURE_CATALOG`; advice surfaces carry a not‑advice line; sourced data shows source + date.
7. Instrumented (the relevant §14 events) before "done".
8. A verification step (test / screenshot / diff review) per task; subagent review for high‑stakes changes.

**Suggested entry‑exit gates:** P0 must be 100% before P1 features ship (correctness/trust foundations). DM‑1 (`properties`) and DM‑2 (`user_buy_boxes`) are the two structural migrations — land + backfill them early in P1 since AN‑5/AN‑6/CMP‑1 all depend on them.

---

## 16. Execution sequence (recommended)

1. **Sprint 0 — P0 trust pack (1 wk):** P0‑1…P0‑9. Mostly copy + the two registries + guardrails. High trust ROI, low risk, no schema churn except DM‑10 (free `deal_score`) and the catalog.
2. **Sprint 1 — analyzer spine (1–2 wk):** AN‑1 guided steps + AN‑2 data confidence + AN‑4 MAO‑central (the homepage hook) + AN‑13 impact panel. Mostly read/UX over existing math.
3. **Sprint 2 — structural unlock (2–3 wk):** DM‑1 `properties` + AN‑5 scenarios; DM‑2 `user_buy_boxes` + AN‑6 multi buy‑box; AN‑3 enrichment panel.
4. **Sprint 3 — pipeline OS (2 wk):** DASH‑1 split + DASH‑3 stages + DASH‑2 Decision Center + DASH‑4 stale alerts; MD‑1…MD‑4.
5. **Sprint 4 — decision & output (2 wk):** CMP‑1…CMP‑4; P1‑11 report modes; SP‑1/SP‑2 Strategy Profiles.
6. **Continuous:** P1‑12 instrumentation lands *with each* surface above (never after).
7. **P2** backfills polish (tools handoff, market badges, blog hubs, ROI presets, chart upgrades, segment onboarding).

**Two confirmations needed to start Sprint 0:** D1 (Deal Score stays fully free → recommended) and D2 (give MAO/sensitivity/strategies/share real entitlement keys → recommended). Both are reversible.

---

*End of spec. IDs (P0‑x, AN‑x, DASH‑x, MD‑x, CMP‑x, SP‑x, DM‑x) are stable references for the backlog, the task list, and PRs.*

