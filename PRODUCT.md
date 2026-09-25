# Product

<!-- impeccable:product-schema 1 -->

<!--
Written 2026-09-24 during the full-site production-readiness audit
(branch audit/full-site). Facts marked [brief] come from the founder's audit
brief; facts marked [repo] are read from code, CLAUDE.md, docs/voice.md and
lib/product-facts.ts; facts marked [inferred] were not confirmed by the founder
and should be corrected if wrong. No interview round was possible in this
autonomous session.
-->

## Platform

web

## Users

- Primary: rental-property investors deciding what to offer on a specific
  listing — buy-and-hold investors and house hackers [brief]. Mostly solo or
  small-portfolio, non-expert, and arriving on a phone from paid ads [repo:
  CLAUDE.md §1, product principle].
- Secondary: real-estate agents who screen deals for investor clients and
  hand them a reviewable analysis (Agent Pro tier) [repo: /for-agents,
  entitlements catalog].
- Situation: a listing is in front of them and they need a defensible
  number before they call the agent or write the offer. Time to decision
  matters more than modelling depth [repo: "type an address → get a verdict"].

## Product Purpose

TrueCap turns an address or listing link into a rental decision: a Deal score
(0–100), cash flow, cap rate, cash-on-cash, DSCR, whether the deal fits the
investor's Buy Box, and the Offer Ceiling — the highest price that still meets
their targets (their walk-away price). Every assumption is labeled with its
source and editable. Pro adds saving, comparison, 10-year projections,
downside sensitivity, and a decision memo/PDF the investor can hand to a
partner or lender [brief][repo].

Success is an investor who knows their walk-away price before they make the
offer, and can show where every number came from.

## Positioning

"Know your walk-away price before you make the offer." Neighbouring tools
(DealCheck, the BiggerPockets calculator, spreadsheets) return metrics;
TrueCap solves the price from the investor's own targets and publishes the
math on /methodology. The claim a competitor cannot truthfully copy: the
Offer Ceiling is derived from the user's targets, with every input labeled
(HUD FMR, FRED rate, TrueCap default, Your input) and the formulas public
[repo: docs/voice.md, lib/product-facts.ts].

## Operating Context

- Entry: an address (Google Places autocomplete) or a supported listing link,
  on /analyze (no account) or /dashboard/new (signed in) [repo].
- Starting values: HUD Fair Market Rent benchmark by ZIP/county for rent;
  FRED 30-year owner-occupied rate benchmark for the mortgage rate; property
  tax is never auto-filled — a blank field uses a 1.1%-of-price default that
  the copy tells the user to replace [repo: lib/product-facts.ts].
- Result: decision-first summary (verdict, Deal score, metrics band, Offer
  Ceiling, what could break, what to verify), then editable assumptions.
- Access tiers [repo: lib/entitlements-catalog.ts, lib/public-pricing.ts]:
  - Anonymous: one full first decision including the exact Offer Ceiling and
    a downside check (signed browser grant); subsequent deals show a coarse
    range until sign-up.
  - Free account: Deal score, metrics, up to 5 saved deals, dashboard.
  - 21-day no-card evaluation on a new account: 3 Pro deal analyses and 1
    comparison (the DB migration that grants it is founder-owed as of
    2026-09-01; the code fails closed) [repo + memory].
  - Pro: $29.99/mo or $300/yr — unlimited saves, edit saved deals, compare
    up to 4, projections, sensitivity, PDF/decision memo, templates,
    share links, buy boxes, rate/rent alerts.
  - Agent Pro: $59.99/mo or $590/yr — Pro plus client rosters, client-scoped
    buy boxes, co-branded reports. Portal and white-label embeds exist in
    code but are unreleased.
  - Decision Pack ($9 one-time PDF) exists but its checkout is switched off.
- Billing through Stripe Checkout; auth through Supabase (email + password,
  Google OAuth); PDF composed server-side; share links are opaque revocable
  tokens (/s/[token]); legacy /d/[encoded] links still decode.
- Free tools: 19 released calculators under /tools (embeddable widgets) and a
  downloadable rental-property spreadsheet; 9 further calculators are gated
  and intentionally return 404.
- Content: ~78 blog articles, 45 glossary terms, 41 comparison pages,
  market and state pages, a methodology page and a public sample decision
  memo.

## Capabilities and Constraints

- Standing founder directive [repo: CLAUDE.md]: preserve "type an address →
  get a verdict". No new required inputs, no new top-level navigation,
  features invisible until useful, upsells only at the moment of need.
- Financial math is the product: `lib/calc-analysis.ts` is the single source
  of truth; verdict thresholds live in `lib/verdict.ts`; formulas, defaults
  and data sources change only with a failing test and founder sign-off
  [brief].
- Prices, plan names ("Pro", "Agent Pro") and entitlements are locked; the
  Stripe Price is verified against the catalog and checkout fails closed on
  any mismatch [repo].
- The founder is never named anywhere — site, schema, emails, fixtures
  [repo: CLAUDE.md, 2026-09-07 decision].
- The newsletter is cancelled; do not re-add signup surfaces [repo].
- The interface is always light; there is no theme toggle. The dashboard has
  its own light palette with a dark-navy sidebar [repo: app/globals.css].
- Undecided product facts (logged for the founder): whether anonymous
  visitors keep the free exact first Offer Ceiling; whether the homepage
  title keeps "Max Offer" as an SEO target; whether the Edge-runtime OG image
  routes move to the Node runtime.

## Brand Commitments

- Name: TrueCap. Support contact hello@usetruecap.com. Logos in
  `public/high-resolution-color-logo.png`, `public/Logo-png-w.png`, icons in
  `public/icon*.png` and `public/icon.svg` [repo].
- Voice [repo: docs/voice.md]: plain, specific, confident, second person, no
  apology. Say the thing. One disclaimer per page. Label sources, don't
  apologize for them. Numbers are facts, not tone. No internal vocabulary
  (released, registry, synthetic, selected-rule).
- Tone requested by the founder for this audit: trustworthy, transparent,
  numbers-first [brief].
- Feature names, defined once per page then reused: Offer Ceiling ("the
  highest price that still meets your targets"), Buy Box (your targets), Deal
  score (0–100 heuristic summary) [repo].

## Evidence on Hand

- Real product screenshots captured from the no-account sample flow in
  `public/product/` (verdict, memo, where-the-rent-goes; desktop + mobile)
  with `manifest.json`.
- A synthetic sample deal (`lib/sample-deal.ts`) that runs through the real
  engine; its address is deliberately not a real property.
- Published methodology (/methodology) with formula versions and release
  notes (`lib/underwriting-methodology.ts`).
- A consented testimonial pipeline (`lib/testimonials/*`); /reviews shows
  only real, consented notes. No case studies, press, or customer logos
  exist — future work must not fabricate any.
- A "deals analyzed" activity ticker on marketing surfaces reads a live
  count of saved analyses [repo]; its display baseline is a founder call and
  must not be presented as a measured figure without checking it.

## Product Principles

1. Decision first, depth on demand: the verdict and Offer Ceiling lead;
   assumptions, projections and scenarios sit behind them.
2. Every number carries its source, and every source is editable.
3. Copy may change tone, never facts; prices, thresholds and limits come from
   their config, not prose.
4. Fail closed on trust: an unverifiable price, grant, or entitlement is
   withheld rather than guessed.
5. No fabricated proof, ever.

## Accessibility & Inclusion

WCAG 2.1 AA is the working standard [repo]: 44×44px minimum hit areas are
enforced globally, colour tokens are tuned for AA contrast on their intended
surfaces, focus is a visible 3px ring, reduced motion is honoured, a
skip-to-content link exists, pinch-zoom is allowed to 5×, and the Lighthouse
CI gate requires an accessibility score ≥ 0.95 on / and /analyze. Serious and
critical axe violations are release blockers [brief].
