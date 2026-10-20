# Test re-anchor list (Phase 0 inventory, 2026-10-20)

Every test file that pins marketing or app markup, split as OVERHAUL.md §2 asks:
**visual, re-anchorable** (class strings, fonts, markup shape, bans on shadows,
motion, cards, eyebrows, arrows, radius) and **truth, must stay** (copy, prices,
links, structured data, metadata, accessibility, analytics, privacy, security).
Counts are approximate assertion templates; `describe.each` and `it.each`
multiply them.

**Mode** says how the test reads the code. **SRC** reads source as text with
`fs.readFileSync` and runs regex or `toContain` on it: these break on any
refactor, even one that changes nothing visible, so every one is re-anchored in
the same commit as the change, with a `Re-anchored:` line in the message.
**RENDER** renders with `renderToStaticMarkup` or prerender. **E2E** runs
Playwright. "Entangled" means a truth intent (44px targets, 16px iOS fields,
contrast) expressed as a literal class string: the intent stays, the anchor
moves.

## A. Marketing and shared chrome

| File | Pins | Mode | V | T | Notes |
|---|---|---|---|---|---|
| `shared-chrome-design-guards.test.tsx` | Header strip, user menu, toast, tooltip, label, ProductShot | SRC + RENDER | ~26 | ~7 | V: exact figure markup; bans on `rounded-full`, browser frame, `animate-pulse`, `text-xs`, `uppercase`, `font-bold`; toast and tooltip class strings. T: strip copy; 44px dismiss (entangled); toaster glyph per variant. |
| `shared-visual-guards.test.tsx` | PageHero, Section, Note, RuledList, StepList, CloseSection, PlanCard, FAQ, VsCompetitors, AuthorBio, nav | RENDER + SRC (blog posts, nav, footer) | ~60 | ~18 | V: `data-page-hero` rule collapse; 5/7 grid strings; `py-18 sm:py-24`; PlanCard subgrid classes; heavy-rule counts. T: heading semantics on posts; one `mailto:`; `aria-current` logic. |
| `homepage-ledger.test.tsx` | Hero is the engine-driven Verdict Ledger | RENDER + SRC | ~5 | ~22 | V: hero contains `<VerdictLedger`, no ProductShot or `priority` image; `data-hero-verdict-line … sm:hidden`; 5 `<details open>`. T: engine figures, gap copy, "Sample deal" never "synthetic", `<caption>`, no typed `$`. |
| `vs-design-pass.test.ts` | All 38+ `/vs` pages on the vs frame; 14-item retired-look ban over 75+ files | SRC, `describe.each` | ~24 (~200 cases) | ~4 (~80 cases) | **Highest risk.** Bans shadow at rest, `rounded-xl`+, `transition-all`, `tc-reveal`, `tc-rise-in`, hover translate, arrows; requires `tc-link`. T: close links `/analyze` with `prefetch={false}`; `winnerMark` truth. |
| `for-agents-design-pass.test.ts` | `/for-agents` on shared parts | SRC + RENDER | ~10 | ~10 | V: `ProductShot frame="document"`; no lucide, uppercase, `rounded-2xl`, `shadow-sm`, gradient. T: one Disclaimer; one FAQPage; verified proof only. |
| `auth-design-pass.test.ts` | Auth screens on the ledger tokens | SRC, `it.each` ×6 | ~22 (~70 cases) | ~3 | V: no photo, gradient, shadow, hex, `bg-white`; **radius capped at `rounded-md`**; exact Input and Google-button class strings. T: "$0 today · no card"; `text-destructive-text`; 48px (entangled). |
| `embed-design-pass.test.tsx` | `/embed` hub and iframe | RENDER + SRC | ~17 | ~15 | V: facts strip rules; `tc-link`; retired-chrome bans on 5 files. T: no FAQPage on hub; one H1; close href and `prefetch={false}`; iframe has no header, footer, Disclaimer; `min-h-11`. |
| `mobile-layout-guards.test.ts` | iOS 16px fields, 44px toggles, sticky bar padding, skip link | SRC + CSS | ~3 | ~20 | Mostly entangled truth. T: `data-sticky-bottom-bar` / `data-site-footer` / `data-sticky-calc-bar` CSS contract. |
| `pricing-responsive-guards.test.ts` | `/pricing` phone rows vs table | SRC | 6 | 2 | V: `border-t-2 border-foreground sm:hidden` list; **`tc-reveal` ban**. T: one list mapped twice. |
| `hero-rulings-h7-guards.test.ts` | "with Pro"; form first on audience pages; no speed claims | SRC | 1 | ~20 | V: exact `<HeroAddressForm className="mt-0 sm:mt-0" />`. |
| `homepage-lockstep.test.ts` | Both homepages render the same sections in order | SRC | 0 | 5 | Truth; relies on self-closing `<Section />` tags. |
| `homepage-faq.test.ts` | 8 FAQ questions; `audience="home"` on both | data + SRC | 0 | 6 | Truth. |
| `marketing-accessibility-guards.test.ts` | Token contrast; header strip; landmarks; 44px | SRC + CSS | ~12 | ~18 | V: header class strings; no orange on landing. T: contrast computed from token names (`brand-orange-*`, `brand-blue-*`, `destructive-text`); 44px (entangled). |
| `keyboard-and-contrast-guards.test.ts` | Verdict-pill contrast; glossary permalink; cookie focus | SRC | ~2 | ~14 | T: contrast math; Escape = reject; focus restore. |
| `accessibility-audit-followup-guards.test.ts` | Analyzer names, errors, targets, reflow | SRC | ~22 | ~45 | V: reflow intent pinned as exact grid and `min-[…]` strings; ring strings. T: `htmlFor`, `aria-*`, copy. |
| `accessibility-remediation-guards.test.ts` | Landmarks, names, live regions, token contrast | SRC + CSS | ~6 | ~40 | V: `--brand-orange` literal; `size-11` strings. T: AA contrast computed from token names (`background`, `band`, `card`, `field`, `input`, `ring`, `primary`, `primary-deep`, `metric-*`); 3px focus. |
| `ux-polish-guards.test.ts` | `#main`; calculator aria; touch targets | SRC + RENDER | ~6 | ~85 | V: pins the old uppercase eyebrow in focused-decision-summary. |
| `core-ux-conversion-guards.test.ts` | AVM labels, gating copy, share revoke | SRC | 1 | ~95 | Truth. |
| `first-screen-promises-guards.test.ts` | "address, asking price and bedroom count" | SRC sweep | 0 | ~30 | Truth. |
| `site-overhaul-performance.test.ts` | Prefetch, consent-gated GTM, Sentry lazy, LHCI budgets | SRC + JSON | ~3 | ~45 | V: no `priority` image in marketing-hero. T: **CLS ≤ 0.05 and a11y ≥ 0.95 as errors**; `prefetch={false}`. |
| `site-overhaul-product-shots.test.ts` | Real screenshots; no founder identity | SRC + file sweep | ~3 | ~25 | V: hero contains `<VerdictLedger`. T: real shots; privacy. |
| `site-overhaul-social-proof.test.ts` | No invented proof | SRC | 0 | ~25 | Truth. |
| `site-overhaul-pricing.test.ts` | No hard-coded `$`; annual default; DealCheck comparison | SRC + lib | 1 | ~25 | V: `<PageHero data-pricing-outcome="" …`. |
| `site-overhaul-seo.test.ts` | Sitemap, aggregateRating gate, robots | lib + SRC | 0 | ~20 | Truth. |
| `pricing-hero-actions.test.ts` | Pricing hero hrefs; `#pro` | SRC | 1 | 8 | V: `<PlanCard id="pro" className="…scroll-mt-28`. |
| `pricing-copy-guards.test.ts` | Plan, trial, billing copy vs catalog | SRC + catalog | ~4 | ~75 | V: PlanCard `order-*` classes ("Pro first on phones" is truth). |
| `public-funnel-trust-guards.test.ts` | Hero copy and cue order; homepage section set | SRC | ~3 | ~65 | V: exact section set mounted. T: copy, cue above form, hrefs. |
| `structured-data-f4.test.tsx` | JSON-LD mirrors the visible FAQ; `@id`s | RENDER | ~2 | ~60 | Finds visible questions via `<details><summary>` in `<main>`: an accordion built on buttons silently weakens it, so the FAQ keeps `details` or the test is re-anchored to the new markup, not loosened. |
| `internal-link-graph.test.tsx` | No orphans; hub links | RENDER | 0 | ~20 | Keep `data-related-content`, `data-blog-hub-link`, `data-market-nearby`, `data-market-group`, `data-glossary-tool-link`. |
| `not-found-page-guards.test.tsx` | 404 content; 16px search | RENDER | 0 | 6 | 16px entangled. |
| `hero-listing-expectation-line.test.ts` | Expectation line after `</form>` | SRC | 1 | 8 | V: JSX shape. T: copy, `data-hero-listing-expectation`, `data-hero-sample-link`. |
| `display-font-fallback.test.ts` | Archivo Fallback `@font-face`; `font-display` 82%/750 | SRC | ~16 | 0 | All font-specific. Intent (no CLS on swap) is truth: re-anchor to the new face's measured fallback. |
| `og-newsprint-fonts.test.ts` | OG loader returns Archivo and DM Mono; survives offline | lib | 1 | 4 | Font names V; offline robustness T. |
| `share-link-preview.test.ts` | One static share card | SRC | 1 | ~25 | Imports must equal `["@/lib/og/newsprint","next/og"]`. |
| `cn-custom-scales.test.ts` | tailwind-merge knows the type and shadow scales | lib | ~11 | 0 | Purely design-system. |
| `hud-table-phone-fit.test.ts` | HUD tables fit phones, on paper | SRC | ~10 | ~6 | V: no `bg-card`/`bg-muted`. T: no `min-w`, scroll cue, sticky column. |
| `blog-post-frame.test.tsx` | Reference post frame | RENDER + SRC | ~22 | ~18 | V: `font-display text-display-sm` H1; nothing above H1; `prose prose-ledger`; **DM Mono figures `font-mono tabular-nums`**. T: one analyze link, FAQ count, one FAQPage, one Disclaimer. |
| `article-frame.test.tsx` | Article frame; `prose-ledger` scoping | RENDER + CSS | ~15 | ~20 | V: class strings; inline FAQ heavy rule. T: CTA once; one Disclaimer and FAQPage. |
| `article-fanout-parts.test.tsx` | Under-title link, META strings, ArticleTable | RENDER | ~14 | ~10 | V: exact classes; no rounded, shadow, uppercase. T: href, order. |
| `tools-template-t2.test.tsx` | Calculator template; rehab card | RENDER + SRC | ~25 | ~35 | **SHA-256 of RehabEstimatorCard markup ×2**; card shell `bg-card rounded-2xl … shadow-sm`; ToolFrame heavy rule; bans on card, icon, shadow. T: ids, min/max, `aria-live`, hrefs, FAQPage counts. |
| `reference-content-truth-guards.test.tsx` | Methodology and playbook truth | RENDER + SRC | ~10 | ~100 | V: **`tc-reveal` and `animation-timeline: view()` banned site-wide** (P1-73: scroll-linked opacity). The a11y intent (content never hidden by scroll position) stays; the ban is rewritten to allow transform/opacity reveals whose default state is visible. |
| `audit-2026-09-auth-and-content-guards.test.ts` | ScrollX cue; widget key figures | SRC + RENDER | ~8 | ~35 | V: key figures `font-mono` with `text-key-sm sm:text-key`. |
| `intent-prefetch-landing.test.ts` | Hero prefetch rules | RENDER | 1 | ~30 | Locates hero by `<section data-page-hero="">`. |
| `email-site-palette.test.tsx` | Every email color is a Newsprint hex; no box-shadow | RENDER | ~10 | ~5 | Email templates are out of scope; the palette pin moves to the new tokens or emails keep Newsprint (decision for Phase 2). |
| `checkout-session-branding.test.ts` | Stripe Checkout `#EFECE8` / `#0066BA`; reads DESIGN.md | lib | ~5 | ~5 | Fails when DESIGN.md loses those hexes: re-anchor to the new brand hexes in Phase 2. |
| `content-hub-readiness.test.ts` | Hub link tags | SRC | ~6 | many | V: `rounded-sm` tags; `border-rule-soft` rows. T: 44px; no `outline-none`. |

## B. App (Operate mode)

| File | Pins | Mode | V | T |
|---|---|---|---|---|
| `workspace-ux-guards.test.ts` | Dashboard nav, copy, Pass confirm/undo, 44px | SRC | ~8 (`h-11 w-[150px] rounded-md text-xs` strings) | ~45 |
| `batch-triage-ui-guards.test.ts` | Triage labels, 44px, cards vs table | SRC | ~5 (`rounded-2xl border`, `focus-visible:ring-[3px]`) | ~6 |
| `evidence-workflow-polish-guards.test.ts` | HUD framing; due-diligence reflow | SRC | ~5 (grid strings) | ~25 |
| `input-clarity-guards.test.ts` | Property-type surfacing | SRC + lib | 0 | ~18 |
| `analyzer-interaction-p2.test.ts` | Result tables and cards | SRC | ~10 (**current app card look** `rounded-2xl border border-border bg-card`; dialog strings) | ~140 (charts animate only without reduced motion) |
| `advocacy-accessibility`, `saved-deal-durable-reopen`, `dashboard-deals-responsive`, `workspace-power-user-navigation`, `my-deals-table-reachability`, `compare-responsive`, `sidebar-label-contrast`, `passive-conversion-cta`, `pricing-streaming`, `audit-2026-10-integration-guards`, `share-page-one-cta`, `calculator-handoff-validation-guards`, `vs-shared-truth-guards`, `agent-pro-card-billing`, `global-accessibility-baseline`, `specialist-result-hierarchy`, `first-run-strategy-visibility` | 44px and reflow intent pinned as exact strings (`rounded-xl`, `sticky right-0 bg-card`, `grid-cols-*`); `passive-conversion-cta` bans `bg-primary`/`rounded-` on passive links; `pricing-streaming` pins CLS placeholder classes; `share-page-one-cta` and `calculator-handoff` ban `→`, eyebrows, sparkle icons | SRC | 1–8 each | rest |

## C. E2E

| File | Pins | V | T |
|---|---|---|---|
| `e2e/site-overhaul-conversion.spec.ts` | Hero submit, handoff, sample, redirects, 375px layout, analytics | ~6 (header ≤ 64px; cue bottom ≤ 560px; `[data-hero-ledger]` has a table and no img; submit opacity 1) | ~45 (events `sample_viewed`, `analysis_started`, `analysis_completed`; no GTM without consent; hrefs; 308 redirect; no overflow; CTA above the cookie bar) |
| `e2e/public-product.spec.ts` | Overflow at 4 widths and 2× zoom; axe AA; 44px; focus-visible; analyzer flows | ~4 (`.truecap-marketing-shell` **class locator**; `[data-hero-ledger]` plus "where every figure comes from" link) | ~100+ |
| `e2e/visual-public.spec.ts`, `e2e/visual-authenticated.spec.ts` | Opt-in captures only; no pixel diffs anywhere | 1 | ~6 |
| `e2e/audit-analyzer-autofill.spec.ts` (behind `AUDIT_ENRICHMENT_MOCK=1`; CI's `browser-regressions`) | HUD and FRED autofill, manual property tax, every assumption editable | 1 (read the cash-flow figure from the summary's `innerText`; re-anchored in Phase 8 to the NumberFlow host's digits after the reveal) | ~12 (the mock paths, the fields' values, cash flow moves by exactly the tax difference) |

## D. Rules that contradict the new look head-on

Rewritten to enforce the new DESIGN.md, never deleted:

- **Shadow bans:** vs, auth, for-agents, embed, tools-template-t2, article-fanout-parts, email.
- **Card and radius bans:** vs (`rounded-xl`+), auth (`rounded-lg`+), embed, for-agents, tools-template-t2, reference-content, hud-table (`bg-card`).
- **Motion bans:** `tc-reveal` (pricing-responsive, reference-content, vs), `transition-all` / `tc-rise-in` (vs, toast), `animate-pulse` (header). The new rule: motion is transform and opacity from a visible default; `transition-all` stays banned.
- **Fonts:** Archivo (display-font-fallback, og-newsprint-fonts), DM Mono via `font-mono` (blog-post-frame, audit-2026-09, VS_PROSE counter), `font-display` stretch 82% / weight 750.
- **Eyebrow and arrow bans:** stay as rules in the new system (the brief keeps "no eyebrows, no arrow suffixes" out of the generic-AI look), so these tests keep their intent.
- **"Ledger as hero" architecture:** homepage-ledger, product-shots, performance, conversion e2e and public-product e2e assume an HTML ledger hero with no hero image. The new hero is still HTML rendered from the engine with no image, so most of these re-anchor to the new instrument's hooks (`data-hero-ledger` can stay as the instrument's root attribute).

## E. Truth that must survive

- **Targets and fields:** 44px (`min-h-11`, `size-11`), 48px (`min-h-12`, `h-12`), iOS 16px (`text-base lg:text-base`).
- **Contrast:** computed from CSS token names, so token renames break it. Phase 2 keeps the token names or updates these tests in the same commit.
- **Focus and Lighthouse:** 3px focus outline; LHCI CLS ≤ 0.05 and a11y ≥ 0.95 as errors; charts animate only without reduced motion.
- **Content and data:** one Disclaimer per page; FAQPage equals the visible FAQ; no FAQPage on `/embed`; `prefetch={false}` on `/analyze` links; consent-gated GTM; analytics event names; no fake proof; founder privacy; pricing from config.
- **Data-attribute hooks to keep:**
  - Hero: `data-page-hero`, `data-hero-ledger`, `data-hero-verdict-line`, `data-hero-address-form`, `data-hero-form-ready`, `data-hero-investor-cue`, `data-hero-listing-expectation`, `data-hero-sample-link`
  - Chrome: `data-analyzer-announcement-bar`, `data-site-footer`, `data-sticky-bottom-bar`, `data-sticky-calc-bar`, `data-cookie-consent-banner`, `data-marketing-mobile-nav`, `data-faq-section`, `data-author-bio`, `data-close-layout`, `data-disclaimer`
  - Pricing: `data-pricing-outcome`, `data-pricing-comparison`, `data-pricing-trust-row`, `data-pricing-trial-terms`
  - Links: `data-related-content`, `data-blog-hub-link`, `data-market-nearby`, `data-market-group`, `data-glossary-tool-link`
  - Analyzer and dashboard: `data-calc-form`, `data-calculator-ready`, `data-result-next-action`, `data-proof-strip`, `data-deal-layout`, `data-conversion-bar-root`
  - Class used as a Playwright locator: `.truecap-marketing-shell`

## F. Highest-risk files, in order

1. `vs-design-pass.test.ts` (about 200 cases; shadow, radius, motion, arrow bans; `tc-link` everywhere)
2. `shared-visual-guards.test.tsx` (about 60 exact class strings for every shared part)
3. `auth-design-pass.test.ts` (about 70 cases; radius cap; full button strings)
4. `tools-template-t2.test.tsx` (SHA-256 byte pins on rendered markup)
5. `shared-chrome-design-guards.test.tsx` (toast, tooltip, header, menu strings)
6. `blog-post-frame.test.tsx` (DM Mono figures, `font-display` H1, `prose-ledger`)
7. `embed-design-pass.test.tsx`, `for-agents-design-pass.test.ts`
8. `article-frame.test.tsx`, `article-fanout-parts.test.tsx`
9. `display-font-fallback.test.ts`, `cn-custom-scales.test.ts`, `og-newsprint-fonts.test.ts`
10. Palette pins: `email-site-palette.test.tsx`, `checkout-session-branding.test.ts`, token-name contrast in the two accessibility guards
11. Motion bans: `pricing-responsive-guards.test.ts`, `reference-content-truth-guards.test.tsx`
12. "Ledger as hero": `homepage-ledger.test.tsx`, `site-overhaul-product-shots.test.ts`, `site-overhaul-performance.test.ts`, the two e2e specs
