# Product

<!-- impeccable:product-schema 1 -->

<!--
Written 2026-09-24 during the full-site audit; rewritten 2026-09-30 for the
agent-first positioning, at the start of the design pass (branch
design/ledger-pass, stacked on the copy pass). Sources: [brief] = the founder's
design-pass brief (2026-09-30); [copy pass] = docs/agent-first/summary-2026-09-29.md
and its commits (PRs #147, #148); [repo] = code, CLAUDE.md, docs/voice.md,
lib/product-facts.ts, lib/public-pricing.ts. Visual decisions live in DESIGN.md,
not here.
-->

## Platform

web

## Users

- Primary: real estate agents who work with investor clients [brief]. They
  screen listings against each client's criteria, present the deals that fit,
  and hand over a number the client can check. Their scene is the showing, on
  a phone, and the desk afterwards, where the deal gets sent [copy pass].
- Secondary: rental investors deciding what to offer on a specific listing,
  mostly buy-and-hold investors and house hackers with a small portfolio, often
  arriving on a phone from paid ads [brief][repo].
- The stance toward both: screen, present, set the ceiling; don't advise
  [brief]. TrueCap applies published formulas to labeled inputs; the client or
  investor makes the decision.

### Jobs to be done

1. Save time at the showing: paste the listing and know within about a minute
   whether it fits the client [brief].
2. Send only deals that already fit the client's Buy Box, and say why a deal
   does not: the criterion it misses and by how much [brief][copy pass].
3. Defend the numbers: every figure carries a visible source and every
   assumption can be edited and rerun by the client [brief].
4. Send co-branded output: a share page and PDF memo that carry the agent's
   logo, color and contact details, with TrueCap named as the method behind
   the numbers [brief][copy pass].

## Product Purpose

TrueCap turns an address or listing link into a rental decision: whether the
deal meets a Buy Box (the client's or the investor's targets), the Offer
Ceiling (the highest price that still meets those targets), cash flow, cap
rate, cash-on-cash, DSCR, a 0–100 Deal score, what could break the deal and
what to verify. Every assumption is labeled with its source and editable. An
agent can keep a roster of clients, each with their own Buy Box, and send each
client a co-branded report that opens without an account [repo][copy pass].

Success is an agent who forwards fewer listings and sends deals that already
pencil, and an investor who knows their ceiling before making the offer. In
both cases the reader can see where every number came from.

## Positioning

Homepage promise (copy pass, live on the homepage): "Stop forwarding listings. Start
sending deals that already pencil." Investor line: "Buying for your own
portfolio? Same analyzer, your own Buy Box." Neighbouring tools (DealCheck,
the BiggerPockets calculator, spreadsheets, brokerage stacks) return metrics
or manage transactions. TrueCap solves the price from the client's own targets,
screens each listing against a specific client's Buy Box, and publishes the
math on /methodology. A competitor cannot truthfully copy the Offer Ceiling
derived from the targets, the per-client screening with the reason for a miss,
and the labeled sources (HUD FMR, FRED rate, TrueCap default, Your input)
[repo][copy pass].

## Operating Context

- Entry: an address (Google Places autocomplete) or a supported listing link,
  on /analyze (no account) or /dashboard/new (signed in) [repo].
- Starting values: HUD Fair Market Rent by ZIP or county for rent; the FRED
  30-year owner-occupied rate for the mortgage rate; property tax is never
  auto-filled, and a blank field uses a 1.1%-of-price default the copy tells
  the user to replace [repo: lib/product-facts.ts].
- Result: decision first (Buy Box fit at asking, Offer Ceiling, the binding
  target, what could break, what to verify), then editable assumptions.
- Agent workflow [copy pass]: a roster of up to 100 clients; a Buy Box can be
  assigned to one client (12 Buy Boxes per account in total); one client per
  saved deal; a miss names the criterion and the gap. Share links open without
  sign-in, are read-only, expire, can be revoked, and hide the address unless
  the agent includes it. Co-branding (Pro and Agent Pro) puts the agent's logo,
  color and "Shared by" on the share page and a "Prepared by" block in the PDF;
  it is co-branded, not white-label.
- Access tiers [repo: lib/entitlements-catalog.ts, lib/public-pricing.ts]:
  - Anonymous: one full first decision including the exact Offer Ceiling and a
    downside check; later deals show a coarse range until sign-up.
  - Free account: Deal score, metrics, up to 5 saved deals, dashboard.
  - 21-day no-card trial on every new account: 3 Pro deal analyses and 1
    comparison. It never includes the client roster or client Buy Boxes.
  - Pro: $29.99/mo or $300/yr. Agent Pro: $59.99/mo or $590/yr. Prices render
    from the catalog and Stripe; copy never hard-codes them.
  - Decision Pack ($9 one-time PDF) exists; its checkout is switched off.
- Billing through Stripe Checkout; auth through Supabase; PDF composed on the
  server; share links are opaque revocable tokens (/s/[token]).
- Free tools: released calculators under /tools (embeddable), a rental
  spreadsheet download. Content: ~78 blog posts, glossary, /vs comparison
  pages, market and state pages, /methodology, a public sample decision memo.

## Capabilities and Constraints

- Preserve "type an address → get a verdict": no new required inputs,
  features invisible until useful, upsells only at the moment of need
  [repo: CLAUDE.md].
- Navigation: the header is Analyze · For agents · For investors · Pricing ·
  Learn, as approved in the agent-first copy pass (2026-09-29). This replaces
  the older "no new top-level navigation" line for the marketing header. Do not
  add header items beyond these. Inside the analyzer the older rule still holds:
  new capabilities land in the existing dashboard, not as new tabs or pages
  [brief][copy pass].
- Financial math is the product: `lib/calc-analysis.ts` is the single source
  of truth, verdict thresholds live in `lib/verdict.ts`. A design or copy change
  never touches calculation, pricing amounts, entitlements, auth or analyzer
  logic [brief].
- Prices and plans render from the catalog; never hard-code them [brief].
- The founder is never named or pictured publicly: site, schema, emails,
  fixtures, screenshots [brief][repo].
- No fabricated proof: no invented testimonials, counts, logos, badges or
  press strips. /reviews is "Proof, not praise" and stays that way [brief].
- No newsletter or email-capture surfaces; the newsletter is cancelled
  [brief][repo].
- Exactly one `<Disclaimer />` per marketing page, with unchanged text
  [brief][docs/voice.md rule 3].
- Always light: no dark theme and no toggle [brief].
- Copy-pass guardrails that design work must keep [brief][copy pass]: the
  primary CTA reads "Analyze a deal free" everywhere; the investor cue is
  visible in the homepage hero's first screen at desktop and at 390px; "For
  investors" stays in the header; the homepage URL, the title-tag core phrase
  ("Rental Property Calculator & Max Offer | TrueCap") and the topical nouns
  (rental listing, Buy Box, Offer Ceiling, cash flow, cap rate, CoC, DSCR) do
  not change; the investor pages are not thinned.
- Undecided product facts: whether anonymous visitors keep the free exact first
  Offer Ceiling long term; the agent follow-ups the copy pass listed (trial
  excludes the roster, 12 Buy Boxes vs 100 clients, multi-client screening
  behind a flag, no onboarding role question) [copy pass §7].

## Brand Commitments

- Name: TrueCap. Support contact hello@usetruecap.com. Logos in
  `public/high-resolution-color-logo.png`, `public/Logo-png-w.png`, icons in
  `public/icon*.png` and `public/icon.svg` [repo].
- Voice [repo: docs/voice.md]: plain, specific, confident, second person, no
  apology. Say the thing. Label sources, don't apologize for them. Numbers are
  facts, not tone. No internal vocabulary (released, registry, synthetic,
  selected-rule).
- Feature names, defined once per page and then reused: Offer Ceiling ("the
  highest price that still meets your targets"), Buy Box (the client's or your
  targets), Deal score (0–100 summary) [repo].
- Tone requested by the founder: trustworthy, transparent, numbers-first.

## Evidence on Hand

- Real product screenshots from the no-account sample flow in `public/product/`
  (verdict, memo, where-the-rent-goes; desktop and mobile) with `manifest.json`,
  captured by `scripts/capture-screenshots.ts` [repo].
- A synthetic sample deal (`lib/sample-deal.ts`) that runs through the real
  engine: asking $265,000, Offer Ceiling $236,000, targets cash flow ≥ $750/mo
  and DSCR ≥ 1.25, binding target cash flow. Its address is deliberately not a
  real property [repo].
- Published methodology (/methodology) with formula versions and release notes
  (`lib/underwriting-methodology.ts`).
- A consented testimonial pipeline (`lib/testimonials/*`). Today there are no
  verified testimonials or case studies (`VERIFIED_TESTIMONIALS` and
  `VERIFIED_CASE_STUDIES` are empty), no press and no customer logos; the proof
  sections render nothing, and future work must not fabricate any.
- The "deals analyzed" ticker was removed and must not return
  (`public-funnel-trust-guards.test.ts`); the only live counter is the saved-deals
  count on /reviews, hidden below 100 [repo].

## Product Principles

1. Decision first, depth on demand: the Buy Box answer and the Offer Ceiling
   lead; assumptions, projections and scenarios sit behind them.
2. Every number carries its source, and every source is editable.
3. Screen, present, set the ceiling; don't advise. The reader decides.
4. Copy may change tone, never facts; prices, thresholds and limits come from
   their config, not prose.
5. Fail closed on trust, and never fabricate proof.

## Accessibility & Inclusion

WCAG 2.1 AA is the standard [brief][repo]: 44×44px minimum hit areas enforced
globally, color tokens tuned for AA on their intended surfaces, a visible 3px
focus ring, `prefers-reduced-motion` respected, a skip-to-content link, pinch
zoom to 5×, and a Lighthouse CI gate requiring accessibility ≥ 0.95 on / and
/analyze. Serious and critical axe violations block a release.
