# SEO content backlog — query-mapped

Source of truth for topic selection in
`.github/workflows/seo-content.yml` (Tue + Fri). Every entry maps to a
REAL query with observed search demand from the 2026-07-15 SEO growth
audit — that audit found ~30-40% of prior posts targeted invented
phrasings with zero volume. Work TOP-DOWN; check an item off in the
same commit that ships its post.

**Keep this list stocked.** At two posts a week it drains in about six
weeks. An empty backlog is worse than a paused workflow: the run starts
inventing topics, which is precisely the failure this file exists to
prevent. Top it up from Search Console query data, not from
brainstorming.

**Skipping is allowed and encouraged.** If checking the SERP shows it is
all lender lead-gen or a proprietary-data moat a calculator site cannot
beat, check the item off with a one-line note saying why. A recorded
skip beats a post that cannot rank.

> Context from the 2026-08-02 baseline (`docs/seo/2026-08-02-baseline.md`):
> the site ranks for 0 of 10 target head terms despite 413 indexable URLs.
> More posts is not obviously the binding constraint — authority and
> off-domain corroboration are. See `docs/seo/off-domain-outreach.md`
> before assuming volume is the answer.

## Rules (from the audit — do not violate)

- **No invented phrasings.** If the exact query wouldn't be typed into
  Google by a real investor, it doesn't go on this list.
- **No software-shopper audiences.** Property-management / STR-host /
  passive-crowdfunding intent doesn't convert here — skip topics whose
  searcher wants landlord software, not deal analysis.
- **No rent-estimate-by-address plays.** That SERP is a proprietary-data
  moat (Rentometer/Zillow/RentCast) and a live tool would burn paid
  enrichment credits on anonymous traffic.
- **Brand/E-E-A-T pages are fine but don't count** as backlog items —
  they earn trust, not traffic.
- Every post: worked numbers, 3-5 internal links (use
  `lib/calculator-registry.ts` for the canonical tool list — do NOT
  hardcode), SERP title ≤50 chars pre-template, FAQ + FAQPage JSON-LD
  where natural.

## Backlog (work top-down)

- [x] "What is a good DSCR for a rental property?" — the question SERP
      is all lenders doing loan lead-gen; the investor-analysis angle
      (what 1.25 means for YOUR offer price, max-loan-at-1.25 worked
      example) is unowned. Link: /tools/dscr-calculator, dscr-loans post.
      → Shipped 2026-07-18 as /blog/what-is-a-good-dscr.
- [x] "Down payment for investment property (2026)" — 15% vs 20% vs 25%
      conventional tiers, house-hack FHA/5% exception, PMI math at each
      tier (use the engine's 0.8%/yr figure). Link: house-hacking calc,
      mortgage-payment calc.
      → NOT shipped as a new post (2026-07-20 run): the query is already
      covered by /blog/how-much-down-payment-investment-property
      (2026-06-18) — a second post would cannibalize. Follow-up: refresh
      that post with the PMI-per-tier math instead.
- [x] "2% rule vs 1% rule" — when each rule of thumb applies by price
      tier and metro type; both tools now exist to link.
      → Shipped 2026-07-20 as /blog/2-percent-rule-vs-1-percent-rule.
- [x] "What vacancy rate should I assume?" — by market tier with HUD
      context; link vacancy-rate-calculator + markets pages.
      → NOT shipped as a new post (2026-07-21 run): already covered by
      /blog/vacancy-rate-rental-property ("Vacancy rate for rentals:
      what to assume in 2026") — a second post would cannibalize.
- [x] "Closing costs on an investment property" — full line-item
      breakdown with a $300k worked example; link closing-cost-calculator.
      → NOT shipped as a new post (2026-07-21 run): already covered by
      /blog/closing-costs-investment-property — exact-query match.
- [x] "Section 8 rental analysis" — FMR-based underwriting pros/cons;
      links markets pages (real HUD data) + cash-flow calculator.
      → NOT shipped as a new post (2026-07-21 run): already covered by
      /blog/section-8-rental-property-investing.
- [x] "Cap rate vs gross yield (vs GRM)" — when to use each; links
      cap-rate + gross-rent-multiplier calculators.
      → Shipped 2026-07-21 as /blog/cap-rate-vs-gross-yield.
- [x] "How to read a Schedule E" — tax-adjacent, links tax-deductions
      post + property-tax calculator.
      → NOT shipped as a new post (2026-07-21 run): already covered by
      /blog/schedule-e-rental-property ("Schedule E for rental
      property, line by line").
- [x] "Rental yield calculator / what is a good rental yield" — SERP is
      weak (an AI-built site ranks #1); consider a tool later, post first.
      → Shipped 2026-07-22 as /blog/what-is-a-good-rental-yield (post;
      the rental-yield tool remains a follow-up).
- [x] "How much money do you need to buy a rental property?" — all-in
      cash-to-close worked examples at 3 price tiers; links spreadsheet
      + cash-flow calculator.
      → Shipped 2026-08-02 as /blog/how-much-money-to-buy-a-rental-property.
      SERP was bloggers (investfourmore), a lender (LendingTree), a
      competitor blog (Mashvisor), and a turnkey seller — all stop at
      "down payment + 2-5% closing costs". Angle: the full five-bucket
      total including prepaids/escrow setup and lender reserves, the
      1.4-1.7x-of-down-payment rule, and what the cash actually earns.
- [ ] "Is a duplex a good investment?" — owner-occupant vs pure rental
      math side by side; links house-hacking calc.
- [ ] "DSCR calculator no personal info / max loan at 1.25 DSCR" —
      refresh the EXISTING dscr post/tool copy with the max-loan angle
      (lenders monetize the query; investors want the analysis).
- [ ] Per-city question posts ONLY after GSC shows /markets pages
      indexing (audit gate): "Is Cleveland a good place to buy rental
      property?" pattern, one per top-10 city, each leaning on the city
      page's real HUD/SAFMR data.

## Done (shipped 2026-07-15, keep for de-dupe)

- [x] rental property cash flow calculator (tool)
- [x] ARV calculator + 70% rule calculator (tools, separate URLs)
- [x] house hacking calculator (tool)
- [x] 50% rule + 2% rule calculators (tools)
- [x] rental property spreadsheet — free, un-gated (tool + asset)
- [x] 7 Best DealCheck Alternatives (2026) (listicle)
- [x] Free BiggerPockets Calculator Alternatives (listicle)
