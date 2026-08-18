# Grand Slam Offer rollout — final report (2026-08-17)

Executed from the "$100M Offers audit" implementation prompt. Six commits on
`main` (`bd197b5` → review-fix commit), all build-gated (exit code captured
directly), all 2,928 tests passing, key pages browser-verified at desktop +
375px. An adversarial review workflow (4 finders → per-finding refuters) ran
over the whole diff; every confirmed finding was fixed before this report.

## What shipped, by phase

**Phase 1 — copy & risk reversal** (`bd197b5`)
- `/guarantee` — canonical Never Overpay Guarantee (Pro + conditional Agent
  variant, claim FAQ incl. the 30-day-clock question, FAQPage schema).
- Guarantee ON by default via `lib/marketing-offer-config.ts`; the published-
  terms invariant holds structurally (terms default to the in-repo route).
  Kill switch: `NEXT_PUBLIC_TRUECAP_GUARANTEE_DISABLED=1` — now silences
  every refund-promise surface (prose AND FAQPage JSON-LD).
- `GuaranteeBadge` under every paid CTA; guarantee section rewritten from the
  dark 3-Deal Fit copy on homepage + pricing.
- "if eligible" is extinct; all trial copy reads "new subscribers get a
  14-day free trial" and still mirrors the `billing.ts` repeat-trial guard
  (guard tests updated to lock the new phrasing + ban the old).
- Hero: default headline variant `never_overpay` ("Never overpay for a
  rental again."); homepage title/OG → "TrueCap — Know Your Max Offer on Any
  Rental in 60 Seconds". Old variants remain selectable for rollback.
- `FoundingPricingBanner` (Methodology v1.0 price-lock, no countdowns)
  replaced the AnnualPromoBanner mount; `/methodology#version-history` anchor.

**Phase 2 — pricing & credit ladder** (`627995b`)
- Cards anchored Agent Pro → Pro (highlighted, center) → Free; Pro-first on
  phones; degrades to Pro → Free while Agent Pro is unconfigured.
- `PricingValueStack` (outcome-framed) above the comparison table; $/hr ROI
  widget replaced by the avoided-mistake block (3% × $250k = $7,500).
- **Pack credit toward Pro** on the dormant `pro_credit_*` state machine:
  verify-action grants `not_configured→eligible` (best-effort, never blocks
  the PDF), checkout attaches the coupon (outranks campaign/annual coupons,
  Pro tiers only), webhook marks `eligible→applied`. Everything fails closed
  on `STRIPE_PACK_CREDIT_COUPON_ID`.
- Buyer email captured from Stripe checkout into `buyer_email`
  (migration `20260817180000`, graceful degradation until applied).

**Phase 3 — social proof engine** (`af51567`)
- `testimonial_submissions` intake table (migration `20260817190000`,
  service-role only) + one-question non-modal prompt after a PDF export or
  third saved deal (once per browser, ever).
- Publication stays gated by `lib/proof-records.ts` (verified + customer-
  approved); `/admin/testimonials` review queue renders copy-ready promotion
  skeletons. Display components self-hide at zero records; `/reviews` ships
  with zero fabricated content and deliberately NO AggregateRating schema.

**Phase 4 — lead capture & email funnel** (`5d383ad`)
- Market Intelligence Pack: 8-page PDF generated from the live /states +
  /markets data (`npm run build-intelligence-pack`).
- Capture surfaces once per family: glossary/states/markets templates,
  tools (via `tools-conversion-cta`), blog (via `related-blog-posts`),
  playbook — inline card + desktop exit-intent (non-modal, a11y-pattern).
- New guard namespace: `mip` email caps are independent of the post-analysis
  `pae` caps; IP + sitewide hourly budget stay shared.
- 3-email lead-magnet drip (day 0 pack / day 3 playbook / day 5 case-for-Pro),
  pack-credit countdown emails (day 0 + honest day-5 expiry), trial emails
  (day-1 activation, day-10 pre-billing) — trial flow rides
  `LIFECYCLE_EMAILS_MODE` + `lifecycle_email_log` idempotency.
- `/playbook` — the First Offer Playbook, written in full, public.
- `SeoAnalyzerCta` with geo prefill (`?address=` on 150 market pages,
  `+strategy` on 29 combo pages).

**Phase 5 — homepage & agents** (`f705eb5`)
- Homepage (both lockstep variants): hero → analyzer → problem block →
  how-it-works → proof → sources → offer stack → ladder → guarantee →
  segmented paths → objection-ordered FAQ → final CTA.
- `/for-agents`: "Become the agent every investor calls first." + commission-
  math block (live-loaded price only), attributed-embed bonus (white-label
  stays unmarketed — legally gated), 3 investor-client scripts, agent
  guarantee line (double-gated).
- `/vs` (all 40): "On price, plainly" objection block with guarantee closer.
- `lib/product-facts.ts` no longer markets "portals" via llms.txt.

**Review fixes** (final commit)
13 confirmed findings (2 refuted) from the adversarial workflow, deduped to 7 fixes:
1. Anonymous pack buyers were promised an auto-credit redemption can't find —
   credit now grants only to signed-in buyers; pricing copy says "buy while
   signed in"; emails/toast follow the grant.
2. Price-experiment variants ($9/$15/$19) could grant unredeemable credits —
   grant now requires the exact $5 amount; pricing promise gated on the
   `current` variant.
3. Lead-magnet guard slot was refunded even when follow-ups were scheduled —
   release now only at zero sends, Sentry warning on partial failure.
4. Lead-magnet day-0 email claimed Max Offer is free — reworded.
5. Guarantee kill switch was bypassed by pricing FAQ (+schema), /vs block,
   homepage price answer, for-agents, reviews, playbook, and two emails —
   all now read `guaranteeEnabled`. (`/guarantee` itself stays up when
   disabled, deliberately: it documents terms for people who bought under them.)
6. Guarantee clock was ambiguous — canonical anchor everywhere is now "first
   30 days as a **paying** subscriber", with an explicit clock FAQ on
   /guarantee (trial deals count toward the 10).
7. Exit-intent card collided with bottom bars / cookie banner — now defers to
   the consent banner and lifts above a mounted sticky bar.

## Analytics events (all typed in `lib/analytics.ts` unless noted)

New: `founding_banner_clicked` `founding_banner_dismissed`
`pack_credit_offer_shown` `pack_credit_applied` (PostHog server)
`testimonial_prompt_shown/submitted/dismissed`; `guarantee_viewed` gained a
`placement` property; `email_capture_shown/submitted/dismissed` gained
`mip_*` sources; `dispatchProofMoment` feeds the testimonial prompt.
Already covered by existing events: hero submissions (`hero_address_submit`),
analysis completions, CTA clicks (`homepage_primary_cta` by source), pack
purchases (`deal_decision_pack_purchased` et al.), trial starts
(`pro_trial_started`), trial→paid (`pro_subscribed`/`paid_conversion`),
pricing views. NOT instrumentable: refund requests (claims arrive by email —
track in the inbox or add a form later).

## Morgan's activation queue (nothing sends/charges until these)

1. **Stripe coupon**: create $5.00-off, duration "once", USD → set
   `STRIPE_PACK_CREDIT_COUPON_ID` in Vercel. Until then the credit system is
   fully dark.
2. **Apply migrations** (SURFACED FOR REVIEW): `20260817180000_pack_buyer_email.sql`,
   `20260817190000_testimonial_submissions.sql` (+ the pre-existing pending
   bundle incl. `20260811120000_agent_pro_tier.sql`).
3. **`LIFECYCLE_EMAILS_MODE=live`** to activate welcome/drip AND the new
   trial day-1/day-10 emails (one flip for the whole lifecycle estate).
4. Agent Pro purchasability is unchanged: still needs
   `STRIPE_PRICE_AGENT_PRO_MONTHLY/ANNUAL` + the agent-pro migration.
5. Regenerate the pack after data updates: `npm run build-intelligence-pack`.

## Copy decisions that are yours (implemented as directed, flagged honestly)

- **"Get My Max Offer" on free-entry CTAs**: your prompt mandates it; the
  review flagged that the free run shows the verdict, not the Max Offer
  (that's Pro/$5-pack). Mitigations shipped: hero subhead attributes the max
  offer to Pro; the how-it-works step keeps its "part of Pro" note. If you
  ever want to soften it, it's ~8 strings.
- **Homepage title** traded the keyword-led "Free Rental Property Calculator…"
  for the brand/outcome title your prompt specified — watch GSC for movement
  on "free rental property calculator"; /tools titles were left untouched.
- **Founding banner** shows "$29.99/mo" hard-coded (banner is client-side;
  the figure mirrors the Stripe price). Remove the banner in the same change
  as any future price change — that event ends the founding window anyway.
- **/playbook is public**, not email-gated (spec said gated): a gated page
  fights the sitemap/SEO requirement and the public-methodology positioning.
  The email course + Market Intelligence Pack remain the gated assets.
- **Agent scripts** published inline on /for-agents rather than as a gated
  download, same reasoning.
- **Pack pre-purchase dialog** doesn't mention the credit (it can't read the
  server-only env); the credit is promised on /pricing (signed-in wording)
  and delivered post-purchase via toast + email.
- **Value-stack "bonuses"**: the audit's bonus list (Playbook, Pack,
  spreadsheet) is delivered as free public/email assets, not listed as Pro
  bonuses on the pricing card — listing free things as paid-tier bonuses
  contradicted the truth-guard ethos. Revisit once you want them repackaged.
- **Trial CTA for anonymous visitors** stays "Continue to Pro" (test-locked):
  an anonymous visitor may be an ineligible ex-subscriber, so "Start the
  14-day trial" appears only for verified-eligible signed-in users.
- The 30 day-NN drip JSONs still describe plan facts accurately (nothing in
  this rollout changed entitlements), but they don't yet mention the
  guarantee or credit — worth a content pass when you next touch the drip.

## Files changed

64 files in phases 1–5 (see `git diff --name-status 3baa024..f705eb5`),
plus the review-fix commit touching: `app/actions/one-time-pdf.ts`,
`app/actions/lead-magnet-capture.ts`, `app/pricing/page.tsx`,
`app/guarantee/page.tsx`, `app/reviews/page.tsx`, `app/playbook/page.tsx`,
`app/for-agents/page.tsx`, `components/marketing/{comparison-faq,
landing-sections,lead-magnet-capture,seo-analyzer-cta}.tsx`,
`lib/email/pack-credit-emails.ts`, `emails/lifecycle-content/trial-day1.json`,
and this report.
