/**
 * The blog post registry: one row per published post under app/blog/<slug>/.
 *
 * Every blog surface reads this list: the /blog index, the topic hubs
 * (/blog/topics/<slug>), the related-post blocks, the sitemap, feed.xml,
 * llms.txt and site search. A post folder with no row here is live at its
 * URL and invisible everywhere else (seo-guards.test.ts fails on that).
 *
 * Lifted out of app/blog/page.tsx in F2 so that the list can be imported and
 * edited on its own: importing it no longer drags the /blog page's React tree
 * along, and the SEO loop's fence (seo/config.json paths.agentAllow) can let
 * an agent write a row here without opening up the page template.
 *
 * Keep this a PURE DATA module: no React, no "server-only", no runtime
 * imports (a type-only import is the most it may ever carry). It is imported
 * by statically rendered routes, so `next build` executes it on the Vercel
 * builder with production secrets in the environment. Because agents may
 * write it, it is not hash-pinned; gate 1b in .github/workflows/ci.yml scans
 * it with scripts/check-agent-blog-content.mjs instead.
 *
 * Dates: `publishedAt` is history and never changes. There is deliberately no
 * modified date here. A page's last-modified date has one source, the lastmod
 * map (content/seo/lastmod.json, F2), never this registry.
 *
 * Order matters. The existing rows run newest first, and RelatedBlogPosts
 * shows the first three available rows on every post, so the SEO loop appends
 * a new row at the end rather than the top.
 */

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  readingTimeMinutes: number;
  publishedAt: string; // ISO date (YYYY-MM-DD); history, never rewritten
  available: boolean;
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "is-a-duplex-a-good-investment",
    title:
      "Is a duplex a good investment? The same $400,000 building, underwritten as a rental and as a house hack",
    excerpt:
      "The same $400,000 duplex underwritten two ways. As a pure rental with 25% down it needs $138,140 of cash and loses $277 a month; owner-occupied with 5% down it needs $58,129. Both paths worked line by line, plus the year-2 move-out math and a head-to-head against a same-priced single-family.",
    readingTimeMinutes: 13,
    publishedAt: "2026-08-05",
    available: true,
  },
  {
    slug: "how-much-money-to-buy-a-rental-property",
    title:
      "How much money do you need to buy a rental property? Cash-to-close worked at $150K, $300K, and $500K",
    excerpt:
      "Total cash to buy a rental runs about 1.4 to 1.7x the down payment: about $50,700 for a $150K rental, $89,400 for a $300K and $142,200 for a $500K. Full line-item math for each tier, including the two buckets most estimates omit: prepaids and lender reserves.",
    readingTimeMinutes: 12,
    publishedAt: "2026-08-02",
    available: true,
  },
  {
    slug: "what-is-a-good-rental-yield",
    title:
      "What is a good rental yield? A consistent comparison method",
    excerpt:
      "Rental yield depends on the formula and the evidence behind it. How gross and net yield differ, what to verify before you compare two properties, and why consistent, property-specific inputs matter more than a market threshold.",
    readingTimeMinutes: 10,
    publishedAt: "2026-07-22",
    available: true,
  },
  {
    slug: "cap-rate-vs-gross-yield",
    title:
      "Cap rate vs gross yield vs GRM: three quotes for the same building — and when each one lies",
    excerpt:
      "Gross yield, GRM, and cap rate measure the same income at different depths — two are literally the same fraction flipped. All three worked on a $250K duplex (11.5% gross, 8.7 GRM, 6.4% cap), the bridge formula that converts any quote into any other, a conversion table from 6% to 24% gross, and the identical-twin trap where two properties with the same gross yield sit $54,000 apart on income value.",
    readingTimeMinutes: 10,
    publishedAt: "2026-07-21",
    available: true,
  },
  {
    slug: "2-percent-rule-vs-1-percent-rule",
    title: "2% rule vs 1% rule: which rental screen actually applies in 2026?",
    excerpt:
      "The 1% and 2% rules are the same rent-to-price screen with the bar at two heights. The GRM and cap-rate math underneath (1% ≈ a 6% cap at the 50% rule; 2% ≈ 12%), a same-dollar comparison where a 1% duplex cash-flows $3 a month while a $75K 2% house returns 16.4% cash-on-cash, and the risk the 2% niche carries that the spreadsheet doesn't price.",
    readingTimeMinutes: 10,
    publishedAt: "2026-07-20",
    available: true,
  },
  {
    slug: "best-dealcheck-alternatives",
    title: "7 Best DealCheck Alternatives for Rental Analysis (2026)",
    excerpt:
      "Seven DealCheck alternatives — TrueCap (that's us, disclosed), BiggerPockets' calculators, Stessa, Mashvisor, RentCast, Rentometer and a spreadsheet — with what each costs and covers, plus when sticking with DealCheck is the right call.",
    readingTimeMinutes: 11,
    publishedAt: "2026-07-14",
    available: true,
  },
  {
    slug: "free-biggerpockets-calculator-alternatives",
    title: "Free BiggerPockets Calculator Alternatives (2026)",
    excerpt:
      "Six free alternatives to BiggerPockets' calculators — TrueCap (that's us, disclosed), DealCheck's free Starter plan, Calculator.net, Stessa, RentCast and spreadsheets — what each free tier covers, and when BiggerPockets Pro is worth paying for.",
    readingTimeMinutes: 10,
    publishedAt: "2026-07-14",
    available: true,
  },
  {
    slug: "how-to-calculate-rental-property-depreciation",
    title:
      "How to calculate depreciation on a rental property: the 27.5-year math, step by step (2026)",
    excerpt:
      "Rental property depreciation worked end to end on a $250K duplex: depreciable basis with closing costs ($256,000), the land-vs-building split (25% land leaves a $192,000 building), and the 27.5-year schedule with the mid-month convention ($6,982 a full year, $5,528 in a March first year). Plus the allowed-or-allowable rule that reduces your basis at sale even for depreciation you never claimed.",
    readingTimeMinutes: 11,
    publishedAt: "2026-07-14",
    available: true,
  },
  {
    slug: "buying-rental-property-with-tenants",
    title:
      "Buying a rental property with tenants in place: documents, obligations, and below-market rent math",
    excerpt:
      "A due-diligence framework for a tenant-occupied purchase: verify the leases, payment history, deposits and local successor obligations, then run the in-place rent math. A hypothetical duplex makes $43 a month at the in-place rent against about $313 in the market-rent scenario.",
    readingTimeMinutes: 11,
    publishedAt: "2026-07-13",
    available: true,
  },
  {
    slug: "investment-property-appraisal",
    title:
      "Investment property appraisals: how they work — and what to do when the value comes in low (2026)",
    excerpt:
      "How investment-property appraisals work: the forms and the rent schedule, the lower-of rule that turns a $228K appraisal on a $240K contract into a $9,000 cash call, worked low-appraisal gap math, and the playbook when the value comes in short.",
    readingTimeMinutes: 11,
    publishedAt: "2026-07-11",
    available: true,
  },
  {
    slug: "how-to-calculate-arv",
    title:
      "How to calculate ARV (after-repair value): the comps method, step by step (2026)",
    excerpt:
      "The number every flip and BRRRR model is built on, and one you cannot simply look up. How to calculate ARV from renovated comps, adjustments and price per square foot, with a worked example, a 70%-rule price screen, BRRRR refinance math and what an ARV miss does to the result.",
    readingTimeMinutes: 11,
    publishedAt: "2026-07-10",
    available: true,
  },
  {
    slug: "exit-cap-rate-rental-property",
    title:
      "Exit cap rate: how to pick the number that sets your sale price (2026)",
    excerpt:
      "The cap rate you assume a future buyer pays sets your projected sale price: exit-year NOI ÷ exit cap rate. A worked $300K duplex where a 1.5-point swing moves the sale price $73,000 and the 5-year IRR from +11.5% to −2.6%, the exit-at-or-above-entry rule of thumb, and the residential comps caveat.",
    readingTimeMinutes: 11,
    publishedAt: "2026-07-08",
    available: true,
  },
  {
    slug: "operating-expense-ratio-rental-property",
    title:
      "Operating expense ratio (OER): what's a good one for a rental? (2026)",
    excerpt:
      "OER = operating expenses ÷ effective gross income, the ratio behind NOI and cap rate. The formula, the four costs that aren't operating expenses (mortgage, depreciation, CapEx, income tax), and a line-by-line duplex that runs 40% before reserves and 46% after, reconciled to the 50% rule.",
    readingTimeMinutes: 11,
    publishedAt: "2026-07-06",
    available: true,
  },
  {
    slug: "70-percent-rule-house-flipping",
    title:
      "The 70% rule for house flipping (and BRRRR): calculate a 70%-rule price screen (2026)",
    excerpt:
      "The 70% rule — 70% of after-repair value, minus repairs — as a quick price screen, and what it does under the hood. Worked on a $300K flip with a full P&L showing where the 30% spread goes ($37,800 of costs, $52,200 of profit), the BRRRR version, and the cheap-house and long-rehab cases where 70% is the wrong number.",
    readingTimeMinutes: 11,
    publishedAt: "2026-07-05",
    available: true,
  },
  {
    slug: "debt-to-income-ratio-investment-property",
    title:
      "Debt-to-income ratio for an investment property: how lenders count rental income (2026)",
    excerpt:
      "An illustrative debt-to-income calculation for a rental. Under the common 75%-of-gross-rent method, a $250K rental earning $446 a month over its payment still adds a −$79 monthly debt. Plus a house-hack example and the DSCR-loan alternative. Actual lender methods and approval requirements vary.",
    readingTimeMinutes: 11,
    publishedAt: "2026-07-04",
    available: true,
  },
  {
    slug: "return-on-equity-rental-property",
    title:
      "Return on equity (ROE) on a rental property: the lazy-equity test (2026)",
    excerpt:
      "Cash-on-cash tracks your original down payment forever; return on equity tracks what the equity you hold today is actually earning — and on a rental you've owned a while, only the second one drives decisions. The formula, a 10-year example where the dollar return nearly doubles while ROE slips from 16.9% to 12%, why the decay is pure leverage, the cash-on-equity figure that lands at 3.7%, and the honest cost of the refinance ROE tempts you into.",
    readingTimeMinutes: 11,
    publishedAt: "2026-07-01",
    available: true,
  },
  {
    slug: "how-to-read-a-rent-roll",
    title:
      "How to read a rent roll: verify a rental's income before you buy (2026)",
    excerpt:
      "A rent roll is where the seller's story meets the leases — and the gap is the deal. Why a fourplex that \"grosses $63,600\" is really collecting $42,900, how to split the $20,700 gap into curable vacancy ($16,800) and sticky loss-to-lease ($3,900), the five places rent rolls mislead, the GRM that reads 8.2 on potential rent and 12.1 on collected, and the estoppel-and-bank-deposit check that turns the seller's claim into proof before you wire a dime.",
    readingTimeMinutes: 11,
    publishedAt: "2026-06-30",
    available: true,
  },
  {
    slug: "mortgage-points-investment-property",
    title: "Mortgage points on an investment property: compare the actual quotes",
    excerpt:
      "Points trade cash at closing for a lower rate. How to use a lender's written rate-and-fee ladder to compare point cost, payment savings, break-even, DSCR and cash-on-cash, and why the tax treatment depends on your own facts.",
    readingTimeMinutes: 11,
    publishedAt: "2026-06-29",
    available: true,
  },
  {
    slug: "negative-leverage-real-estate",
    title:
      "Negative leverage in real estate: when borrowing lowers your return (2026)",
    excerpt:
      "Leverage raises your return only when the asset out-earns the debt. The number that sets the sign (the loan constant, not the rate), the cap-rate-vs-loan-constant rule, a worked $300K property across five cap rates, and the deal that still cash-flows while leverage drags cash-on-cash below the all-cash return.",
    readingTimeMinutes: 11,
    publishedAt: "2026-06-28",
    available: true,
  },
  {
    slug: "property-tax-reassessment-rental-property",
    title:
      "Property tax reassessment: don't underwrite the seller's tax bill (2026)",
    excerpt:
      "Copying the property-tax line off the listing can understate your bill: the seller's figure may reflect a capped assessment or an owner-occupant exemption you won't get, and some states reset the assessment when a property sells. The supplemental bill after closing, and a worked $400K duplex where a $3,400-vs-$6,000 tax line pushes DSCR from 1.00 to 0.90 and cash flow from +$9 to −$208 a month.",
    readingTimeMinutes: 10,
    publishedAt: "2026-06-27",
    available: true,
  },
  {
    slug: "break-even-occupancy-rental-property",
    title: "Break-even occupancy: how much vacancy a rental can survive (2026)",
    excerpt:
      "Cap rate tells you what a rental earns; break-even occupancy tells you how much can go wrong before it stops covering its bills. The formula — (operating expenses + debt service) ÷ gross potential rent — a worked duplex where an 86% break-even leaves a 14-point cushion, an overpaid twin that leaves far less, and why break-even occupancy is the occupancy where DSCR hits 1.0.",
    readingTimeMinutes: 10,
    publishedAt: "2026-06-26",
    available: true,
  },
  {
    slug: "how-to-estimate-rent-rental-property",
    title: "How to estimate rent on a rental property (2026)",
    excerpt:
      "Rent is the input every metric leans on. The appraiser's comp-adjustment method with a worked grid, the GRM and 1% cross-checks that bound the number, the haircut from market to effective rent, and what a $150-a-month rent miss does to cap rate, cash flow and DSCR.",
    readingTimeMinutes: 11,
    publishedAt: "2026-06-25",
    available: true,
  },
  {
    slug: "rental-property-insurance",
    title: "Rental property insurance: coverage, quotes, and underwriting",
    excerpt:
      "How to collect property-specific landlord-insurance evidence: landlord (DP-3) versus homeowners coverage, what loss-of-rent coverage protects, the exclusions to compare, and how a $1,500-versus-$3,500 premium cuts cash flow by about $167 a month and moves DSCR.",
    readingTimeMinutes: 11,
    publishedAt: "2026-06-23",
    available: true,
  },
  {
    slug: "cash-out-refinance-vs-heloc-rental",
    title:
      "Cash-out refinance vs HELOC on a rental: which pulls equity better in 2026?",
    excerpt:
      "Two ways to pull equity from a rental, with different eligibility and terms. How a cash-out refinance and a HELOC work on an investment property, why replacing a low-rate first mortgage changes the math, and an illustrative side-by-side of the cost.",
    readingTimeMinutes: 11,
    publishedAt: "2026-06-23",
    available: true,
  },
  {
    slug: "rental-property-llc",
    title: "Should you put your rental property in an LLC? (2026)",
    excerpt:
      "What an LLC does for a rental (liability protection) and doesn't do (cut your taxes), the due-on-sale risk when you transfer a mortgaged rental, how financing changes when an LLC owns the property, FinCEN's removal of beneficial-ownership reporting for domestic LLCs, and when the cost is worth it.",
    readingTimeMinutes: 12,
    publishedAt: "2026-06-23",
    available: true,
  },
  {
    slug: "seller-financing-subject-to",
    title: "Seller financing and subject-to: creative deals explained (2026)",
    excerpt:
      "How seller financing and subject-to deals work, the due-on-sale risk that defines subject-to, where Dodd-Frank does and doesn't apply to investors, and how to underwrite the gap between a seller's older low-rate loan and today's rates with the downside priced in.",
    readingTimeMinutes: 11,
    publishedAt: "2026-06-23",
    available: true,
  },
  {
    slug: "1-percent-rule-rental-property",
    title: "The 1% rule for rental property: does it still work in 2026?",
    excerpt:
      "The 1% rule says monthly rent should be at least 1% of the price. The GRM bridge (a 1% deal is a GRM of about 8.3), how higher mortgage rates raise the break-even rent-to-price in this article's example (about 0.57% at a 3.5% loan, 0.76% at 7%), two 1% properties whose returns sit 40% apart, and what the rule hides.",
    readingTimeMinutes: 10,
    publishedAt: "2026-06-23",
    available: true,
  },
  {
    slug: "piti-explained-rental-property",
    title: "PITI explained: the real monthly payment on a rental (2026)",
    excerpt:
      "PITI (principal, interest, taxes and insurance) is a rental's real monthly payment. On a $250k rental at 7% with 25% down, taxes and insurance add about $400 a month on top of the loan. How to estimate each part, handle escrow, and turn the payment into DSCR.",
    readingTimeMinutes: 11,
    publishedAt: "2026-06-20",
    available: true,
  },
  {
    slug: "how-much-down-payment-investment-property",
    title:
      "How much down payment do you need for an investment property? (2026)",
    excerpt:
      "Conventional investment loans start at 15% down on a single-family rental and 25% on a 2–4 unit. Worked cash-on-cash and DSCR math on a $250k rental at 15%, 20% and 25% down, why more down can raise the return when the loan constant tops the cap rate, and the owner-occupied house-hack route in for $8,750.",
    readingTimeMinutes: 11,
    publishedAt: "2026-06-18",
    available: true,
  },
  {
    slug: "gross-rent-multiplier-explained",
    title:
      "Gross rent multiplier (GRM) explained: how to screen rentals fast (2026)",
    excerpt:
      "GRM = price ÷ annual gross rent, a quick rental screen. The formula, a three-listing screen, the cap-rate bridge ((1 − expense ratio) ÷ GRM), how it maps to the 1% rule, and two $250K duplexes with identical GRMs that cash-flow +$365 and −$155 a month.",
    readingTimeMinutes: 10,
    publishedAt: "2026-06-17",
    available: true,
  },
  {
    slug: "how-to-calculate-noi-rental-property",
    title:
      "How to calculate NOI (net operating income) on a rental property — 2026 guide",
    excerpt:
      "NOI = effective gross income minus operating expenses, before the mortgage — and it's the number cap rate, DSCR, and 5+ unit valuation are all built on. The formula, a full line-by-line $250K duplex example, the CapEx classification trap that swings the cap rate a full point, and the three ways people get NOI wrong.",
    readingTimeMinutes: 10,
    publishedAt: "2026-06-16",
    available: true,
  },
  {
    slug: "depreciation-recapture-rental-property",
    title:
      "Depreciation recapture on rental property: what to review before a sale",
    excerpt:
      "Depreciation lowers your basis every year, and that shapes the tax when you sell. A hypothetical rental sale shows how adjusted basis, gain character, transaction structure and taxpayer facts can change depreciation-related tax, and what to review with a tax professional first.",
    readingTimeMinutes: 11,
    publishedAt: "2026-06-14",
    available: true,
  },
  {
    slug: "schedule-e-rental-property",
    title: "Schedule E for rental property: a line-by-line walkthrough",
    excerpt:
      "A line-by-line Schedule E walkthrough with a hypothetical rental: how positive monthly cash flow can still show a loss on paper, recordkeeping prompts for each line, and the questions to check against current IRS guidance and your own return.",
    readingTimeMinutes: 10,
    publishedAt: "2026-06-12",
    available: true,
  },
  {
    slug: "capex-maintenance-reserves-rental-property",
    title:
      "CapEx and maintenance reserves: how much to actually budget for a rental (2026)",
    excerpt:
      "Percent-of-rent defaults can understate capex on cheaper properties. The component-lifespan method with illustrative replacement costs, an age-weighted reserve formula, and what realistic reserves do to NOI, DSCR and cash flow on a $220K rental.",
    readingTimeMinutes: 10,
    publishedAt: "2026-06-11",
    available: true,
  },
  {
    slug: "section-8-rental-property-investing",
    title:
      "Section 8 rentals: how the math actually works in 2026 (pros, cons, underwriting)",
    excerpt:
      "How the Housing Choice Voucher program pays: how to verify payment standards, approved rent and the tenant's share, what inspections involve, payment timing, and the property-level assumptions to adjust when you underwrite a voucher rental.",
    readingTimeMinutes: 11,
    publishedAt: "2026-06-10",
    available: true,
  },
  {
    slug: "closing-costs-investment-property",
    title:
      "Closing costs on an investment property: build the property-specific stack",
    excerpt:
      "Estimate cash to close on an investment property from the lender, title, government, insurer, tax and contract documents. A hypothetical $250k example walks through lender fees, title, transfer taxes and prepaids, and how they fold into cash to close.",
    readingTimeMinutes: 11,
    publishedAt: "2026-06-09",
    available: true,
  },
  {
    slug: "vacancy-rate-rental-property",
    title:
      "Vacancy rate for rentals: what to assume in 2026 (and why 5% is usually a guess)",
    excerpt:
      "Physical vs economic vacancy, the turnover math that derives the number instead of guessing it, what 5 points of vacancy does to cash flow and DSCR, and why a DSCR lender's formula may treat vacancy differently from your underwrite.",
    readingTimeMinutes: 10,
    publishedAt: "2026-06-07",
    available: true,
  },
  {
    slug: "brrrr-method-explained",
    title: "The BRRRR method in 2026: the complete numbers walkthrough",
    excerpt:
      "Buy, rehab, rent, refinance, repeat: one full deal walked start to finish on stated financing assumptions. Refinance LTV limits, seasoning, DSCR qualification and the limits on your cash-out, all of which vary by program and lender.",
    readingTimeMinutes: 11,
    publishedAt: "2026-06-07",
    available: true,
  },
  {
    slug: "how-to-calculate-cap-rate",
    title: "How to calculate cap rate (with worked examples) — 2026 guide",
    excerpt:
      "Cap rate = NOI ÷ purchase price. Learn the lender-style NOI convention, how vacancy and operating costs work, where CapEx belongs, and see three worked examples.",
    readingTimeMinutes: 7,
    publishedAt: "2026-06-07",
    available: true,
  },
  {
    slug: "how-to-calculate-cash-on-cash-return",
    title:
      "How to calculate cash-on-cash return on a rental property — 2026 guide",
    excerpt:
      "Cash-on-cash return = annual cash flow ÷ total cash invested: the return on the dollars you actually put in. The formula, what counts as total cash invested, three worked examples, and the shortcuts that inflate the number.",
    readingTimeMinutes: 7,
    publishedAt: "2026-06-07",
    available: true,
  },
  {
    slug: "how-to-calculate-dscr",
    title:
      "How to calculate DSCR: the formula, a worked example, what counts as good, and DSCR loans",
    excerpt:
      "DSCR = NOI ÷ annual debt service. The four steps, a sample rental worked through, what counts as a good ratio, why a lender's DSCR can come out higher or lower than yours, and how DSCR loans use it.",
    readingTimeMinutes: 14,
    publishedAt: "2026-06-07",
    available: true,
  },
  {
    slug: "how-truecap-verdict-engine-works",
    title: "How TrueCap's screening bands classify a deal",
    excerpt:
      "The cash flow, DSCR, cash-on-cash and (for all-cash deals) cap-rate thresholds behind TrueCap's five screening bands, and how to read them.",
    readingTimeMinutes: 10,
    publishedAt: "2026-06-07",
    available: true,
  },
  {
    slug: "house-hack-underwriting-guide",
    title:
      "House hack underwriting: how to know if a duplex, triplex, or fourplex actually beats renting",
    excerpt:
      "House hacking sounds great in a podcast and confusing in a spreadsheet. The honest math: your housing cost vs. renting the equivalent, factoring in down payment, mortgage paydown, appreciation, and the very real cost of being your tenants' landlord.",
    readingTimeMinutes: 12,
    publishedAt: "2026-06-07",
    available: true,
  },
  {
    slug: "short-term-rental-underwriting-playbook",
    title:
      "Short-term rental underwriting playbook: how to model an Airbnb in 2026",
    excerpt:
      "STR cash flow lives or dies on three numbers: ADR, occupancy, and operating expenses. Here's the full playbook for underwriting a short-term rental in 2026 — what data sources to use, what hidden costs everyone forgets, and how to stress-test for a bad off-season.",
    readingTimeMinutes: 14,
    publishedAt: "2026-06-07",
    available: true,
  },
  {
    slug: "hard-money-vs-dscr-loan",
    title:
      "Hard money vs DSCR: which loan product is right for your next deal in 2026",
    excerpt:
      "Hard money and DSCR loans solve different problems: hard money is short-term capital for a deal you'll rehab and exit; DSCR is long-term capital for a rental you'll hold. How each is structured, compared through an illustrative BRRRR sequence.",
    readingTimeMinutes: 11,
    publishedAt: "2026-06-07",
    available: true,
  },
  {
    slug: "bonus-depreciation-rental-property-2026",
    title:
      "Bonus depreciation on rental property in 2026: the restored 100% deduction and what qualifies",
    excerpt:
      "Current IRS guidance restored 100% bonus depreciation for eligible property acquired and placed in service after January 19, 2025. The rental building itself usually does not qualify; certain shorter-life components can.",
    readingTimeMinutes: 10,
    publishedAt: "2026-06-07",
    available: true,
  },
  {
    slug: "best-rental-property-calculator-2026",
    title: "Best rental property calculator 2026: 7 tools compared",
    excerpt:
      "A 2026 comparison of 7 rental property calculators and tools — TrueCap (that's us, disclosed), DealCheck, BiggerPockets, Mashvisor, Stessa, Excel and Roofstock — on free-tier depth, pricing, mobile and audience fit.",
    readingTimeMinutes: 12,
    publishedAt: "2026-06-07",
    available: true,
  },
  {
    slug: "best-free-rental-property-calculator-2026",
    title:
      "Best free rental property calculator 2026: 5 tools that actually work for free",
    excerpt:
      "A 2026 ranking of five free rental-analysis tools — TrueCap (that's us, disclosed), DealCheck Starter, Stessa, spreadsheet templates and Zillow's mortgage calculator — what each free tier covers and where the paid gates start.",
    readingTimeMinutes: 9,
    publishedAt: "2026-06-07",
    available: true,
  },
  {
    slug: "best-rental-property-calculator-for-brrrr",
    title: "Best rental property calculator for BRRRR investors (2026)",
    excerpt:
      "Honest 2026 ranking of the best calculators for BRRRR — TrueCap, DealCheck, BiggerPockets, and what makes a BRRRR-specific calculator different from a standard rental analyzer.",
    readingTimeMinutes: 9,
    publishedAt: "2026-06-07",
    available: true,
  },
  {
    slug: "best-rental-analysis-tool-for-house-hackers",
    title: "Best rental analysis tool for house hackers (2026)",
    excerpt:
      "Honest 2026 ranking of the best calculators for house hackers — TrueCap, DealCheck, BiggerPockets, and what owner-occupant underwriting requires that standard rental calculators miss.",
    readingTimeMinutes: 8,
    publishedAt: "2026-06-07",
    available: true,
  },
  {
    slug: "best-short-term-rental-analysis-tool-2026",
    title:
      "Best short-term rental analysis tool 2026: 6 tools STR investors compare",
    excerpt:
      "Honest 2026 ranking of the best STR analysis tools — AirDNA for revenue data, TrueCap for underwriting, Mashvisor for market discovery, plus PMS platforms STR investors evaluate.",
    readingTimeMinutes: 10,
    publishedAt: "2026-06-07",
    available: true,
  },
  {
    slug: "dealcheck-vs-biggerpockets-vs-truecap",
    title:
      "DealCheck vs BiggerPockets vs TrueCap: which rental calculator wins?",
    excerpt:
      "Honest 3-way comparison of DealCheck, BiggerPockets Calculator, and TrueCap. Free tier depth, pricing, projections, mobile, and which fits which investor.",
    readingTimeMinutes: 11,
    publishedAt: "2026-06-07",
    available: true,
  },
  {
    slug: "dealcheck-vs-stessa-vs-truecap",
    title: "DealCheck vs Stessa vs TrueCap: which one do you actually need?",
    excerpt:
      "A dated 3-way comparison of DealCheck, Stessa and TrueCap. All three analyze acquisitions; Stessa also covers owned-property accounting and operations.",
    readingTimeMinutes: 11,
    publishedAt: "2026-06-07",
    available: true,
  },
  {
    slug: "roofstock-vs-mashvisor-vs-propstream",
    title:
      "Roofstock vs Mashvisor vs PropStream: 3-way deal discovery comparison",
    excerpt:
      "Roofstock, Mashvisor and PropStream help you find rental deals in three different ways. How they compare, and where TrueCap fits once you have a property to underwrite.",
    readingTimeMinutes: 10,
    publishedAt: "2026-06-07",
    available: true,
  },
  {
    slug: "stessa-vs-avail-vs-baselane",
    title: "Stessa vs Avail vs Baselane: 3-way landlord ops comparison",
    excerpt:
      "Stessa spans acquisition through accounting and operations; Avail emphasizes leasing and rent collection; Baselane combines banking and bookkeeping. How the three compare for landlords.",
    readingTimeMinutes: 10,
    publishedAt: "2026-06-07",
    available: true,
  },
  {
    slug: "hostfully-vs-hostaway-vs-guesty",
    title: "Hostfully vs Hostaway vs Guesty: which STR PMS wins in 2026?",
    excerpt:
      "Honest 3-way comparison of Hostfully, Hostaway, and Guesty — channel managers, automation, pricing tiers, and which fits 1, 10, or 100 short-term rentals.",
    readingTimeMinutes: 11,
    publishedAt: "2026-06-07",
    available: true,
  },
  {
    slug: "single-family-vs-multi-family-rental",
    title:
      "Single-family vs multi-family rental property — which actually wins?",
    excerpt:
      "Single-family vs multi-family compared on cash flow, cap rate, financing, tenants, exit liquidity and capex risk, with an illustrative side-by-side example.",
    readingTimeMinutes: 11,
    publishedAt: "2026-05-27",
    available: true,
  },
  {
    slug: "how-to-estimate-rehab-costs",
    title:
      "How to estimate rehab costs without relying on generic price bands",
    excerpt:
      "A rehab-budget framework: document the scope and condition, get local written bids, add permits and carrying costs, and set a disclosed reserve for what you can't see yet.",
    readingTimeMinutes: 12,
    publishedAt: "2026-05-27",
    available: true,
  },
  {
    slug: "how-to-refinance-a-rental-property",
    title:
      "How to refinance a rental property — rate-and-term, cash-out, and DSCR options",
    excerpt:
      "How to refinance a rental property: rate-and-term vs cash-out, LTV and DSCR considerations, the break-even math, and five mistakes to avoid.",
    readingTimeMinutes: 10,
    publishedAt: "2026-05-26",
    available: true,
  },
  {
    slug: "rental-property-pro-forma-explained",
    title:
      "How to read a rental property pro forma (and verify its assumptions)",
    excerpt:
      "A pro forma is a seller's projection, not a result. How to turn one into numbers you can verify: rent, vacancy, insurance, taxes, maintenance, reserves, management and bad debt.",
    readingTimeMinutes: 9,
    publishedAt: "2026-05-26",
    available: true,
  },
  {
    slug: "how-to-find-off-market-rental-properties",
    title:
      "How to find off-market rental properties — 8 sources that actually work",
    excerpt:
      "The 8 sources investors use to find off-market rental deals: driving for dollars, direct mail, wholesalers, networking, public records and more.",
    readingTimeMinutes: 10,
    publishedAt: "2026-05-26",
    available: true,
  },
  {
    slug: "rental-property-tax-deductions",
    title: "Rental property tax deductions — the 14 every investor should know",
    excerpt:
      "A Schedule E checklist for rental-property expenses, organized by form line, with worked deduction examples, eligibility limits and links to current IRS guidance.",
    readingTimeMinutes: 11,
    publishedAt: "2026-05-26",
    available: true,
  },
  {
    slug: "best-states-for-rental-investors-2026",
    title: "Best states for rental property investors in 2026",
    excerpt:
      "Ten US states compared for rental investing on property tax, income tax and landlord-tenant rules, and the trade-offs between cash-flow and appreciation markets.",
    readingTimeMinutes: 12,
    publishedAt: "2026-05-25",
    available: true,
  },
  {
    slug: "1031-exchange-basics",
    title: "1031 exchange basics for individual rental investors",
    excerpt:
      "How a 1031 exchange works: the 45-day identification and 180-day exchange periods, the qualified-intermediary safe harbor, like-kind rules, boot, reverse exchanges, and when it's worth the complexity.",
    readingTimeMinutes: 11,
    publishedAt: "2026-05-25",
    available: true,
  },
  {
    slug: "50-percent-rule-rentals",
    title: "The 50% rule for rentals — is it still useful in 2026?",
    excerpt:
      "The classic 50% rule says operating expenses run about half of gross rent. When it works as a triage tool, when it misleads, and what to use instead.",
    readingTimeMinutes: 6,
    publishedAt: "2026-05-25",
    available: true,
  },
  {
    slug: "house-hacking-explained",
    title:
      "House hacking explained: how to (almost) live for free in a 2-4 unit",
    excerpt:
      "The actual math behind house hacking — FHA 3.5% down, owner-occupant rules, year-2 transition planning, and the deal types that make this strategy work in 2026.",
    readingTimeMinutes: 9,
    publishedAt: "2026-05-25",
    available: true,
  },
  {
    slug: "property-management-yes-or-no",
    title: "Should I use a property management company? The actual math.",
    excerpt:
      "Percent-of-rent fees, lease-up fees and maintenance markups: does paying a property manager still beat managing yourself? The break-even math, plus when to switch either way.",
    readingTimeMinutes: 8,
    publishedAt: "2026-05-25",
    available: true,
  },
  {
    slug: "spot-bad-rental-in-60-seconds",
    title: "How to spot a bad rental deal in 60 seconds — 7 red flags",
    excerpt:
      "Seven red flags that tell you a rental may not pencil, checked before you spend hours on a full underwrite.",
    readingTimeMinutes: 8,
    publishedAt: "2026-05-24",
    available: true,
  },
  {
    slug: "cash-on-cash-vs-irr",
    title: "Cash-on-cash vs IRR: which one tells the truth?",
    excerpt:
      "Cash-on-cash and IRR are both return metrics, but they answer different questions: when each one is the right lens, when each one misleads, and how to use them together.",
    readingTimeMinutes: 7,
    publishedAt: "2026-05-24",
    available: true,
  },
  {
    slug: "cash-flow-vs-appreciation",
    title:
      "Cash flow vs appreciation: which rental strategy actually wins in 2026?",
    excerpt:
      "A 10-year side-by-side of cash-flow and appreciation strategies across three market types, the four sources of rental return, and how borrowing costs change the math.",
    readingTimeMinutes: 9,
    publishedAt: "2026-05-24",
    available: true,
  },
  {
    slug: "what-is-a-good-cap-rate",
    title: "What is a good cap rate? A property-specific framework",
    excerpt:
      "There is no universal good cap rate. What the ratio measures, how to compare consistent inputs, and which property-specific evidence to check first.",
    readingTimeMinutes: 9,
    publishedAt: "2026-05-24",
    available: true,
  },
  {
    slug: "cap-rate-vs-cash-on-cash-vs-dscr",
    title: "Cap rate vs cash-on-cash vs DSCR: which one actually matters?",
    excerpt:
      "Three metrics, three different jobs: a plain-English guide to what cap rate, cash-on-cash and DSCR each measure, when each one matters, and how negative leverage shows up when you compare them.",
    readingTimeMinutes: 8,
    publishedAt: "2026-05-24",
    available: true,
  },
  {
    slug: "how-to-underwrite-a-rental-property-in-60-seconds",
    title: "How to screen a rental property in 60 seconds",
    excerpt:
      "A fast rental screen: organize five inputs, review four modeled metrics, and see what still needs checking before a full underwrite.",
    readingTimeMinutes: 9,
    publishedAt: "2026-05-24",
    available: true,
  },
];
