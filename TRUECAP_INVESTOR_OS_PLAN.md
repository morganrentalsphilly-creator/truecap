# TrueCap → Investor Command Center — Product Plan & Specs

**North star:** evolve the logged-in app from "saved calculator outputs" into an investor operating system that runs the full loop: **source → underwrite → compare → decide → share → monitor.**

**How to read this:** Deliverables 1–10 below. Effort is **S** (≤1 day), **M** (2–4 days), **L** (1–2 weeks). "Risk" is blast radius on the live, multi-session codebase. Everything is grounded in the current stack (Next 16, Supabase, `lib/deal-score.ts`, `saved_analyses`, `analysis_templates`, the snapshot tables, `plans.entitlements`).

---

## 0. What's already shipped (so the backlog is honest)

These P0s from the brief landed in prior rounds — don't re-scope them:

| Brief item | Status | Where |
|---|---|---|
| #1 Metric consistency (52 vs 78) | **Done** | Compare results + picker now `recomputeSavedDealVerdict()` like Dashboard/My Deals. Root cause was Compare reading the stale stored `result_snapshot.score` while other surfaces recompute. |
| #2 Count consistency | **Done** | Dashboard header reads "Active pipeline: X of Y saved deals"; `getSavedAnalysesTotalCount` passed in. |
| #3 Recommendation language | **Done** | Display-layer `recommendationLabel()` → Excellent fit / Meets buy box / Watchlist / Needs work / Does not meet buy box, across score card, hero, dashboard, compare, My Deals, PDF, OG/share. Internal values + thresholds unchanged (33 scoring tests pass). |
| #6 "Backend recommendation" copy | **Partial** | The "Backend recommendation" string is gone (now "Recommendation"). The **Observation → Evidence → Action** rewrite of AI insights is still open (see P1). |

**Two known gaps surfaced by the consistency audit — fold into the backlog:**

- **Lens divergence (open decision).** The single-deal analyzer and the PDF apply the user's saved lens (cash-flow / balanced / appreciation) to the headline Deal Score; every list/dashboard/compare surface is hardwired to **Balanced**. Same deal, two numbers for non-Balanced users. Decide: headline score is lens-free everywhere, or lens applied everywhere. (P1)
- **Financials still come from the stored snapshot.** We now recompute *score/recommendation/risk* on read, but *cash flow / cap rate / CoC / ROI* on the list surfaces are still read verbatim from `result_snapshot`. If the calc engine changes, those drift the same way the score did. Either recompute financials on read too, or refresh the snapshot. (P1)

---

## 1. Prioritized backlog (P0 / P1 / P2)

### P0 — correctness & trust (must be airtight; mostly done)
1. ~~Cross-surface score consistency~~ ✅
2. ~~Active vs total count~~ ✅
3. ~~Criteria-based recommendation labels~~ ✅
4. **Why-this-score drawer** — surface the existing `DealScoreBreakdown` everywhere the score shows. *S, low risk, no schema.*
5. **ROI transparency** — IRR, equity multiple, cash invested, total profit, assumptions behind any 10-yr ROI. *M, low risk, compute-only.*
6. **AI insight rewrite** — Observation → Evidence → Action, each citing real metrics. *S, low risk.*
7. **Risk-vs-Return chart clarity** — threshold lines, quadrant labels, full tooltips, address de-truncation. *S–M, low risk.*
8. **Financials-on-read consistency** + **lens decision** (the two gaps in §0). *M, medium risk (touches scoring display semantics).*

### P1 — the command-center loop
9. **Decision Center** band on Dashboard (best deal / needs review / best upside / negative-CF warning / next action). *M, low risk — derived from existing data.*
10. **Dashboard KPI cards** (pipeline value, projected monthly CF, cash to close, weighted DSCR, weighted cap, avg Deal Score, deals needing review). *M.*
11. **My Deals upgrades** — clickable rows, `…` menu, sticky bulk bar, "Compare selected" (2–4), column toggles, copy fixes. *M.*
12. **Compare-from-My-Deals** (no separate empty selection page) + Compare-select search/sort/filter, selected tray, auto-select top 4, show DSCR/CoC/cash/confidence. *M.*
13. **Compare results** — decision matrix, winner-by-metric badges, buy-box threshold lines, quadrant labels, "what price/rent/rate wins?" solver. *M–L.*
14. **Buy-box settings** (per-user) + use them everywhere (My Deals flags, Decision Center, compare lines, score context). *M, additive schema.*
15. **"What makes this deal work?" solver** (max price for target CF/DSCR/CoC; required rent/down/rate). *M, compute (reuses calc engine + a bisection solver).*
16. **Data trust layer** — per-assumption source / date fetched / confidence / verified flag / override. *M–L, additive schema; populate going forward from `enrich-property` meta.*
17. **Pipeline stages + tags + market** on deals. *M, additive schema.*
18. **Templates v2** — My Saved Templates section, duplicate, set-default, apply-to-existing-deal, used-by-X, buy-box thresholds, version history, new strategy templates. *M–L, additive schema.*

### P2 — depth & differentiation
19. **Due-diligence workspace** (notes/photos/docs/tasks/comments/dates) per deal. *L, new tables + Storage.*
20. **Property & rent enrichment** (property facts, tax/sale history, listings, rent/sale comps, market trends, ranges) — external data integrations. *L, vendor + cost decisions.*
21. **Report modes** (investor memo / lender package / agent-client / partner / wholesaler dispo / seller negotiation). *M–L, builds on existing PDF generator.*
22. **Monitoring** — extend the existing rate-watch into a saved-deal monitor (rate, rent, comp, tax changes → "signal changed" + digest). *M, reuses `buildRateWatch` + Resend.*

---

## 2. Screen-by-screen UX critique

### Dashboard Home
- **Descriptive, not directive.** It reports the book; it doesn't tell the investor *what to do next today*. Needs a Decision Center above the fold.
- **KPIs are thin** (counts + a chart). Investors want portfolio cash flow, cash-to-close, weighted DSCR/cap, avg score, and a "needs review" count.
- **No confidence signal.** A number with no provenance reads as a guess to a sophisticated user.
- **Quick actions missing** — every card should have a next step (compare, export, sensitize, adjust price, archive).

### Compare — Results
- **No explicit verdict.** It's a metric grid; the user still has to decide. Add a decision matrix + winner-by-metric badges + an overall "best fit."
- **No buy-box context.** Numbers float without the user's thresholds. Add threshold lines/markers.
- **Charts under-labeled** (truncated addresses, thin tooltips). Add nicknames + full tooltips.
- **No "make it win" path.** Add the solver (what price/rent/rate flips a loser).

### Risk vs Return + Decision list
- **Quadrant is unreadable without guides** — no axis threshold lines, no quadrant labels ("Low risk / High return = target"). Add both.
- **Truncated labels** kill scannability. Use nickname + hover full address.

### My Deals / Saved Analyses
- **Rows aren't the primary affordance.** Make the whole row clickable; collapse secondary actions into `…`.
- **No bulk workflow.** Selecting rows should raise a sticky action bar (Compare / Tag / Stage / Archive / Export).
- **Missing decision columns** (DSCR, cash needed, confidence, template, last updated, tags, market) — add as toggleable columns.
- **No lifecycle.** Add pipeline stages so this becomes a deal tracker, not a list.
- **Copy:** "Show selected" → "Only show selected"; add "Compare selected (2–4)".

### Compare — Selection screen
- **Empty and friction-heavy** (separate page, lots of whitespace, minimal data). Users should select from My Deals directly. Keep this page as a fallback, but: add search/sort/filter, show DSCR/CoC/cash/risk/confidence per row, "Auto-select top 4 by score," and a persistent selected-deals tray.

### Calculation Templates
- **No "mine vs defaults" separation**, no duplication/default, no usage signal, no version history, no buy-box thresholds, and the type vocabulary (conservative/balanced/aggressive) is too thin for the strategies TrueCap serves (MTR, Section 8, small multifamily 5+, seller finance, sub-to, hard-money flip, wholesaler MAO, portfolio refi, mixed-use, turnkey).

---

## 3. Revised Dashboard wireframe (description)

Top-to-bottom, single scroll, desktop:

1. **Topbar** (unchanged): greeting, profile.
2. **Decision Center** (new, full-width band, 4–5 compact cards):
   - **Best deal right now** — highest score that meets buy box → deal name, score, "Meets buy box" chip, [Open] [Export].
   - **Needs review** — first deal with negative CF, failed DSCR, or low data confidence → reason chip, [Open].
   - **Best upside** — highest 10-yr total return → "verify assumptions" caveat, [Open].
   - **Negative cash flow warning** — count of CF-negative active deals, [Filter to them].
   - **Next recommended action** — context-aware CTA (e.g., "Compare your top 3," "2 deals missing rehab estimates").
3. **KPI strip** (cards, full-portfolio aggregates — reuse the unbounded aggregate query): Active pipeline value · Projected monthly cash flow · Cash needed to close · Weighted DSCR · Weighted cap rate · Average Deal Score · Deals needing review. Each card: value + one-line context + optional spark.
4. **Rate watch strip** (existing) — keep.
5. **Charts row:** Portfolio composition + Risk vs Return (with new threshold lines + quadrant labels).
6. **Top deals** (existing, with criteria labels + Why-this-score affordance + data-confidence badge + per-row quick actions).
7. **AI Insights** (rewritten Observation → Evidence → Action).

**Data confidence badge (reusable component):** High / Medium / Low pill; hover/expand shows per-input source (HUD FMR / FRED 30-yr / state effective rate / manual), last-fetched date, and verified status. Confidence rule of thumb: High = all key inputs verified or live-sourced; Medium = defaults unedited; Low = stale/missing key inputs (e.g., no rent, no beds).

---

## 4. My Deals table — specification

**Row interaction:** entire row navigates to the deal (open analyzer with that deal loaded). Secondary actions live in a right-aligned `…` menu: Open, Duplicate, Add to compare, Set stage, Tag, Export PDF, Archive, Delete.

**Selection + bulk bar:** checkbox column; selecting ≥1 row raises a **sticky bottom action bar**: "{n} selected" · Compare selected (enabled 2–4) · Set stage · Add tag · Export · Archive · Clear. Rename the existing filter toggle "Show selected" → **"Only show selected."**

**Columns (default + toggleable via a "Columns" menu, persisted to `localStorage`):**

| Column | Default | Source |
|---|---|---|
| Select | ✓ | — |
| Deal (nickname / address) | ✓ | `address`/`title`/`nickname` |
| Stage | ✓ | `pipeline_stage` (new) |
| Score (criteria label) | ✓ | recompute on read |
| Cash flow /mo | ✓ | snapshot |
| Cap rate | ✓ | snapshot |
| CoC | optional | snapshot |
| **DSCR** | optional | snapshot |
| **Cash needed** | optional | snapshot `totalCashRequired` |
| Rent estimate | optional | snapshot/`monthly_rent` |
| **Data confidence** | optional | `data_confidence` (new) |
| Template used | optional | `template_id` join |
| Last updated | ✓ | `last_activity_at` |
| Tags | optional | `tags` (new) |
| Market / neighborhood | optional | `market` (new) |
| Actions `…` | ✓ | — |

**Pipeline stages:** Researching → Underwriting → Offer made → Under contract → Due diligence → Closed · Passed · Archived. Stage is a quick inline control (chip dropdown) and a bulk action. Default new deals to "Underwriting" (they were just analyzed). "Passed"/"Archived" hide from active views but stay in "saved total."

**Acceptance:** rows clickable; bulk bar appears on selection; "Compare selected" only enabled at 2–4; columns toggle + persist; stage changes write through optimistic UI; archived/passed excluded from active counts but included in saved total.

---

## 5. Compare Deals — specification

### Compare from anywhere
Primary path: select 2–4 in **My Deals** → "Compare selected" → straight to results (no empty selection page). The current selection page becomes a fallback for deep links / empty compare-cookie.

### Selection screen (fallback) upgrades
- Search (address/nickname/tag), sort (score, CF, cap, DSCR, cash needed, updated), filter (stage, type, market, meets-buy-box).
- Each row shows: criteria label + score, CF, cap, **DSCR, CoC, cash needed, risk, data confidence.**
- **"Auto-select top 4 by score"** button.
- Persistent **selected-deals tray** (chips with remove) docked at the bottom; "Compare (n)" CTA.
- Tighten spacing (it currently reads empty).

### Results upgrades
- **Decision matrix:** metrics × deals grid with per-row **winner badge** (best CF, best cap, best DSCR, lowest cash, best score), plus an overall **"Best fit"** ribbon (best score that meets buy box; tie-break by cash flow).
- **Buy-box threshold lines/markers** on each metric (from user buy box): pass/fail coloring.
- **Risk-vs-Return quadrant**: axis threshold lines + labels (Target / Cash-flow play / Appreciation play / Avoid), full address/nickname in tooltips.
- **"What would make this deal win?" solver** per losing deal: smallest change to price / rent / rate that beats the current winner on the chosen metric (or meets buy box).
- Tooltips show every underlying number; never truncate without a hover-full.

**Acceptance:** matrix renders winner badges + one clear overall winner; threshold lines reflect the user's buy box; quadrant labeled; solver returns a concrete number ("Win on cash flow at ≤ $312,000 purchase"); all charts have full tooltips.

---

## 6. Templates — specification

**Layout:** "My Saved Templates" section above "Default Templates." Each card: name, kind, **used by X deals**, default badge, actions (Apply to new, **Apply to existing deal**, Duplicate, Set default, Edit, **Version history**, Delete).

**Template object adds:** `is_default` (one per user), `kind` (expanded enum, below), `buy_box` (jsonb thresholds: min CF / CoC / DSCR / cap, max price, max rehab), `used_count` (denormalized; or derived count), and a `analysis_template_versions` history (immutable snapshots on each edit, restore-able).

**Apply-to-existing:** opens a confirm that re-runs the deal's `form_snapshot` with the template's assumptions overlaid (price/beds/rent kept), updates the saved deal + snapshots. Apply-to-new pre-fills the analyzer.

**New template kinds (starter set):** Medium-term rental · Section 8 / voucher · Small multifamily (5+) · Seller finance · Subject-to / creative · Hard-money flip · Wholesaler MAO · Portfolio refinance · Mixed-use · Turnkey rental. Each ships with sane default assumptions + a starter buy box. (Keep the existing conservative/balanced/aggressive as "presets.")

**Acceptance:** user can duplicate, edit, set default, view/restore versions, see usage count, attach a buy box, and apply a template to an existing saved deal (which recomputes it). New kinds appear in defaults with documented assumptions.

---

## 7. Data model changes (Supabase, additive, one new timestamped migration per change)

> Pattern to honor (from CLAUDE.md): new timestamped migration files only (never edit old ones); ship features dormant/gated; RLS on; recompute-on-read for verdicts.

**`saved_analyses` — add columns:**
- `pipeline_stage text not null default 'underwriting'` (check constraint over the 8 stages).
- `tags text[] not null default '{}'` (or `jsonb`).
- `nickname text`, `market text`, `neighborhood text`.
- `data_confidence jsonb` — per-input provenance: `{ "monthlyRent": {"source":"HUD_FMR","fetchedAt":"…","confidence":"high","verified":false}, "interestRate": {...}, "propertyTaxPct": {...} }`. Populate going forward from `enrich-property` meta; backfill optional.
- (Optional) `result_snapshot_engine_version int` so we can detect staleness and refresh financials (addresses §0 gap #2).

**New table `buy_boxes`** (per user; allow one default + named): `id, user_id, name, is_default, min_cash_flow, min_coc_pct, min_dscr, min_cap_pct, max_price, max_rehab, markets text[], property_types text[], strategy text, created_at, updated_at`. RLS: owner-only. (Alternatively store the default buy box on `user_analysis_defaults` to avoid a table; a table is cleaner for named/multiple.)

**`analysis_templates` — add:** `is_default boolean default false`, `kind text` (expanded enum), `buy_box jsonb`, `used_count int default 0` (or compute), plus **new table `analysis_template_versions`** (`id, template_id, version int, snapshot jsonb, created_at, created_by`).

**Due-diligence (P2) — new tables:** `deal_documents` (Supabase Storage refs), `deal_tasks` (`title, done, due_date, assignee`), `deal_comments` (`body, author, created_at`). `notes` already exists on `saved_analyses`.

**No schema needed for:** Why-this-score (compute from `form_snapshot` via `computeDealScore` → `DealScoreBreakdown`), ROI/IRR/equity-multiple (compute via `lib/exit-scenarios.ts`), the solver (compute), report modes (generation-time), Decision Center + KPIs (derived/aggregate queries).

---

## 8. Acceptance criteria (per feature)

- **Why-this-score:** every score surface (card, dashboard, compare, My Deals) opens a drawer showing the six components (cash flow, CoC, cap rate, DSCR, total-return, risk penalty) with points; numbers sum to the displayed score; identical breakdown for the same deal on every surface.
- **ROI transparency:** any 10-yr ROI shows cash invested, total projected profit, equity multiple, and **IRR**; assumptions (appreciation %, rent growth, hold period, selling cost) listed; recomputes live with edits.
- **AI insights:** each insight = Observation → Evidence (cites exact metrics, e.g., "DSCR 1.41, cap 8.6%") → Action (a button/next step); zero internal/jargon words.
- **Charts:** Risk-vs-Return has both axis threshold lines, four labeled quadrants, buy-box markers, and full address/nickname tooltips; no truncation without hover-full.
- **Counts:** active vs saved-total never contradict across dashboard, sidebar, My Deals.
- **Metric consistency:** score, risk, recommendation, CF, cap, CoC, DSCR, ROI identical across Dashboard, My Deals, Compare-select, Compare-results, PDF, share.
- **Compare:** 2–4 deals selectable from My Deals → results without an empty page; matrix shows winner badges + one overall winner; buy-box lines present; solver returns a concrete threshold.
- **Templates:** duplicate, customize, set-default, version-restore, usage count, buy-box attach, and apply-to-existing (which recomputes the deal) all work.
- **Reports:** investor memo / lender / agent-client / partner / seller-negotiation each generate with mode-appropriate sections.
- **Buy box:** thresholds drive My Deals "meets buy box" flags, Decision Center selection, and compare lines consistently.

---

## 9. Suggested UI copy changes

- Recommendation labels: ✅ already Excellent fit / Meets buy box / Watchlist / Needs work / Does not meet buy box.
- Dashboard header: ✅ "Active pipeline: X of Y saved deals."
- AI insight example (new): **Observation** "64 Union St is your strongest deal." **Evidence** "Score 84, cash flow +$540/mo, DSCR 1.38, cap 7.9% — meets your buy box." **Action** "[Compare with your top 3]".
- ROI tooltip: "10-yr ROI = (cash flow + principal paydown + appreciation + tax benefit + net sale proceeds) ÷ cash invested. Cash invested $X · Projected profit $Y · Equity multiple X.Xx · IRR Z%. Assumptions: 3% appreciation, 2.5% rent growth, 10-yr hold, 6% selling cost — all editable."
- My Deals: "Show selected" → **"Only show selected"**; add **"Compare selected"** (2–4).
- Compare select: **"Auto-select top 4 by score."**
- Templates: section headers **"My templates"** / **"Starter templates"**; actions **"Apply to a new deal"**, **"Apply to an existing deal."**
- Negative-CF chip: **"Negative cash flow — review before offering."**
- Confidence chip: **"Data confidence: High · rent from HUD FMR, rate from FRED, verified 2026-06-20."**

---

## 10. Implementation sequence (safest order)

**Guiding rules:** ship UI-only items first (no migration, instantly reversible); make every schema change a new additive migration applied **before** the code that needs it; ship new write-features dormant/gated; keep recompute-on-read so no backfill is required for verdicts; one concern per deploy.

**Phase 0 — done.** P0 #1/#2/#3 (consistency, counts, labels).

**Phase 1 — UI-only, no schema, low risk (ship now, independently):**
1. Why-this-score drawer (data already exists).
2. ROI explainer + IRR/equity multiple (compute from exit-scenarios).
3. AI insights → Observation/Evidence/Action.
4. Risk-vs-Return thresholds + quadrant labels + tooltips + de-truncation.
5. My Deals: clickable rows, `…` menu, "Compare selected", bulk bar, "Only show selected", column toggles (localStorage).
6. Compare-from-My-Deals + Compare-select search/sort + selected tray + auto-select top 4 + show DSCR/CoC/cash/confidence-placeholder.
7. Compare results: decision matrix + winner badges + overall winner.
8. Resolve the **lens decision** + financials-on-read consistency (§0 gaps).
9. "What makes this deal work?" solver (pure math).

**Phase 2 — additive schema, ship gated/dormant (migration first, then UI):**
10. Buy-box settings (`buy_boxes`) → then wire into My Deals flags, Decision Center, compare lines, solver targets.
11. Pipeline stages + tags + market columns on `saved_analyses` (default 'underwriting'/empty) → My Deals controls.
12. Data-confidence provenance (`data_confidence`) → populate from `enrich-property` going forward → confidence badges.
13. Decision Center + KPI cards (read-only aggregates; can ship in Phase 1 if buy box not required, richer in Phase 2).
14. Templates v2 (`is_default`, `kind`, `buy_box`, versions table, usage) → Templates UI + apply-to-existing.

**Phase 3 — bigger bets:**
15. Due-diligence workspace (tables + Supabase Storage).
16. Report modes (extend `lib/pdf-generator.ts` + a mode selector in the export dialog).
17. Monitoring (extend `buildRateWatch` → saved-deal monitor + Resend digest, gated like the existing rate-alerts cron).
18. External data enrichment (property facts / comps / listings) — vendor, cost, and compliance decisions first; this is the only set with real external dependencies.

**Deploy hygiene:** each item is its own commit + fast-forward to `main` (matches current flow); migrations reviewed before `apply`; new modes/flags default off; `npx tsc --noEmit` + `npm test` green before every push.
