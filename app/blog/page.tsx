/**
 * /blog — landing page for long-form content.
 *
 * Long-form articles are the highest-leverage compounding SEO asset
 * for TrueCap right now: one excellent post ranking for educational
 * queries ('how to analyze a rental property', 'rental property
 * underwriting guide') can pull thousands of organic visits monthly
 * over its lifetime. Each post links into the calculator/tools and
 * funnels into the conversion path.
 *
 * Posts are currently a hardcoded array — when the catalog grows
 * beyond ~10 posts, lift them into a content collection (MDX +
 * frontmatter, or a Supabase table). For now, the trade-off favors
 * fewer moving parts.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";
import { BLOG_TOPICS } from "@/lib/blog-topics";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Deep dives on rental property analysis, real estate math, and underwriting best practices from the team behind TrueCap.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "TrueCap Blog — rental property analysis & underwriting",
    description:
      "Deep dives on rental property analysis, real estate math, and underwriting best practices.",
    url: "/blog",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap blog" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  readingTimeMinutes: number;
  publishedAt: string; // ISO date
  /** Only set after a material, reviewed update; never a deploy timestamp. */
  modifiedAt?: string; // ISO date
  available: boolean;
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "is-a-duplex-a-good-investment",
    title:
      "Is a duplex a good investment? The same $400,000 building, underwritten as a rental and as a house hack",
    excerpt:
      "A duplex is not one investment, it is two, and the loan application decides which you get. Conventional financing wants 25% down on a 2-4 unit investment purchase and 5% owner-occupied — $138,140 of cash for a $277-a-month loss, or $44,990 to live there at $389 a month above rent while building $4,050 of equity. Includes the year-2 problem (the 5%-down duplex loses $974 a month once you move out), the head-to-head against a same-priced single-family the duplex wins on cap rate 5.31% to 4.09%, and the $1,840 a year that two units under one roof genuinely save.",
    readingTimeMinutes: 13,
    publishedAt: "2026-08-05",
    available: true,
  },
  {
    slug: "how-much-money-to-buy-a-rental-property",
    title:
      "How much money do you need to buy a rental property? Cash-to-close worked at $150K, $300K, and $500K",
    excerpt:
      "Total cash is 1.4-1.7x the down payment, not 20% plus a bit — $50,744 for a $150K rental, $89,388 for a $300K, $142,231 for a $500K, itemised down to the tax escrow cushion. Includes the two buckets everyone omits (prepaids and lender reserves), the 2% reserve escalator on other financed properties, the 5%-down duplex that costs less cash than a $150K house, and what $50,744 actually earns: $881 a year.",
    readingTimeMinutes: 12,
    publishedAt: "2026-08-02",
    available: true,
  },
  {
    slug: "what-is-a-good-rental-yield",
    title:
      "What is a good rental yield? 2026 benchmarks, the gross-vs-net trap, and the financed test that actually decides",
    excerpt:
      "In most 2026 US markets, 8-12% gross yield ($667-$1,000 of monthly rent per $100K of price) is where leveraged deals start to pencil — but the number alone can't clear a deal. Gross and net yield worked on a $220K house (10.1% gross, 5.4% net), benchmark ranges from coastal 4-6% to cash-flow-market 13%, and the financed test where that 'good' 10.1% yield loses $102/month at 25% down and 7% — with the rent it takes to hit DSCR 1.25.",
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
    title:
      "2% rule vs 1% rule: which rental screen actually applies in 2026?",
    excerpt:
      "The 1% and 2% rules are the same rent-to-price screen with the bar at two heights — and knowing that tells you when each applies. The GRM and cap-rate math underneath (1% ≈ a 6% cap at the 50% rule; 2% ≈ 12%), a same-dollar comparison where a textbook 1% duplex cash-flows $3/month while a $75K 2% house returns 16.4% cash-on-cash, why the 2% niche carries the risk the spreadsheet doesn't price, and the 0.76% break-even line that turned the 1% rule from a buy signal into a keep-looking line.",
    readingTimeMinutes: 10,
    publishedAt: "2026-07-20",
    available: true,
  },
  {
    slug: "what-is-a-good-dscr",
    title:
      "What is a good DSCR for a rental property? (And what 1.25 means for your offer)",
    excerpt:
      "Every lender's answer is 1.25 — but that's the lender's bar, not the investor's. What a good DSCR actually is band by band, a worked $250K duplex that scores a marginal 1.12 on real NOI yet sails past the lender at 1.54, and the negotiating math a 1.25 target really gives you: about $168K of max loan, ~33% down, or a $224,500 ceiling on a $250K asking price.",
    readingTimeMinutes: 10,
    publishedAt: "2026-07-18",
    available: true,
  },
  {
    slug: "best-dealcheck-alternatives",
    title: "7 Best DealCheck Alternatives for Rental Analysis (2026)",
    excerpt:
      "Seven real DealCheck alternatives with verified July 2026 pricing — TrueCap (that's us, disclosed), BiggerPockets' calculators, Stessa, Mashvisor, RentCast, Rentometer, and the spreadsheet option — plus an honest section on when sticking with DealCheck is the right call.",
    readingTimeMinutes: 11,
    publishedAt: "2026-07-14",
    modifiedAt: "2026-08-27",
    available: true,
  },
  {
    slug: "free-biggerpockets-calculator-alternatives",
    title: "Free BiggerPockets Calculator Alternatives (2026)",
    excerpt:
      "BiggerPockets' calculators stop after 5 free reports; the rest sits behind Pro at $390/yr. Six genuinely free alternatives ranked — TrueCap (that's us, disclosed), DealCheck's free Starter plan, Calculator.net, Stessa, RentCast, and spreadsheets — plus when Pro is actually worth it.",
    readingTimeMinutes: 10,
    publishedAt: "2026-07-14",
    modifiedAt: "2026-08-27",
    available: true,
  },
  {
    slug: "how-to-calculate-rental-property-depreciation",
    title:
      "How to calculate depreciation on a rental property: the 27.5-year math, step by step (2026)",
    excerpt:
      "The largest deduction on Schedule E — and the only one that costs no cash. The three-step calculation worked on a $250K duplex: depreciable basis with closing costs ($256,000), the assessor's land split (25% → $192,000 building), and the 27.5-year schedule with the mid-month convention ($6,982/yr, $5,528 in a March year one). Plus the paper-loss bridge where +$200/mo of cash flow reports a $2,682 loss, the 20%-vs-30% land ratio that swings $931 a year, and the allowed-or-allowable trap that bills you at sale for deductions you never claimed.",
    readingTimeMinutes: 11,
    publishedAt: "2026-07-14",
    available: true,
  },
  {
    slug: "buying-rental-property-with-tenants",
    title:
      "Buying a rental property with tenants in place: the lease, the estoppel, and the below-market rent math (2026)",
    excerpt:
      "Tenant-occupied listings look like day-one income — but the lease survives the sale in all fifty states, and the rent it carries is usually below market. What legally transfers with the deed, worked loss-to-lease math on a $250K duplex ($43 vs $313/mo cash flow on the same building), the 18-month turnover-payback test, the three documents that protect you (leases, ledger, estoppels), closing-day deposit mechanics, and the staged path to market rent.",
    readingTimeMinutes: 11,
    publishedAt: "2026-07-13",
    available: true,
  },
  {
    slug: "investment-property-appraisal",
    title:
      "Investment property appraisals: how they work — and what to do when the value comes in low (2026)",
    excerpt:
      "The one number in every financed deal the investor doesn't control. Which forms get ordered (1004, 1025, and the 1007 rent schedule), how the lower-of rule turns a $228K appraisal on a $240K contract into a $9,000 cash call, why a 1007 rent opinion can push a DSCR loan from 1.26 to 1.17 and across a pricing tier, and the five-step playbook when the value misses — renegotiate, gap, reconsideration of value, new lender, walk.",
    readingTimeMinutes: 11,
    publishedAt: "2026-07-11",
    available: true,
  },
  {
    slug: "how-to-calculate-arv",
    title:
      "How to calculate ARV (after-repair value): the comps method, step by step (2026)",
    excerpt:
      "The number every flip and BRRRR model is built on—and one you cannot simply look up. Learn why ARV is a forecast, how renovated comps support it, how a 70%-rule Offer Ceiling and 75% LTV refinance line key off it, and how sensitive modeled outcomes are to an ARV miss.",
    readingTimeMinutes: 11,
    publishedAt: "2026-07-10",
    available: true,
  },
  {
    slug: "exit-cap-rate-rental-property",
    title:
      "Exit cap rate: how to pick the number that sets your sale price (2026)",
    excerpt:
      "The number most investors pick in four seconds and never revisit — the cap rate you assume a future buyer pays. Why exit-year NOI ÷ exit cap sets most of the return on a multi-year hold, a worked $300K duplex where a 1.5-point swing moves the sale price $73,000 and the 5-year IRR from +11.5% to −2.6%, the exit ≥ entry rule, the residential comps caveat, and why a compressing exit cap is a bet on rates, not a rental.",
    readingTimeMinutes: 11,
    publishedAt: "2026-07-08",
    available: true,
  },
  {
    slug: "operating-expense-ratio-rental-property",
    title:
      "Operating expense ratio (OER): what's a good one for a rental? (2026)",
    excerpt:
      "The metric appraisers reach for first — operating expenses ÷ effective gross income — and the hinge that sets NOI, cap rate, and value. The formula, the four costs that aren't operating expenses (mortgage, depreciation, CapEx, income tax), a line-by-line duplex that runs 40% before reserves and 46% after, the exact reconciliation to the 50% rule (~49% of gross rent), and why a 35%-vs-46% assumption swings the building's value about $46,000.",
    readingTimeMinutes: 11,
    publishedAt: "2026-07-06",
    available: true,
  },
  {
    slug: "70-percent-rule-house-flipping",
    title:
      "The 70% rule for house flipping (and BRRRR): calculate an Offer Ceiling (2026)",
    excerpt:
      "The fastest offer screen in real estate — pay 70% of after-repair value, minus repairs — and what it&apos;s really doing under the hood. The Offer Ceiling formula worked on a $300K flip, a full P&amp;L that shows where the 30% spread actually goes ($37,800 of costs, $52,200 of profit), the price-per-sqft comp method for pinning down ARV against the neighborhood ceiling, the BRRRR twist where the same 70% cap dovetails with a 75% cash-out refinance, and the backward solve that lands within $2,000 of the rule — plus the cheap-house and long-rehab cases where 70% quietly lies.",
    readingTimeMinutes: 11,
    publishedAt: "2026-07-05",
    available: true,
  },
  {
    slug: "debt-to-income-ratio-investment-property",
    title:
      "Debt-to-income ratio for an investment property: how lenders count rental income (2026)",
    excerpt:
      "Every investor assumes the rent &quot;covers itself&quot; on a loan application. It doesn&apos;t. Lenders credit 75% of gross rent, then subtract the property&apos;s full payment — so a rental pulling $446/month over its payment reads as a −$79 debt, not income. The net-rental mechanic worked on a $250K rental, why the 25% haircut swings DTI ~3 points, the house-hack version where the same rule adds $1,275 of income and turns a 54% ratio into 45%, the Schedule E add-backs that make a paper loss net to breakeven, and the DSCR escape hatch when your ratio finally hits the wall.",
    readingTimeMinutes: 11,
    publishedAt: "2026-07-04",
    available: true,
  },
  {
    slug: "return-on-equity-rental-property",
    title:
      "Return on equity (ROE) on a rental property: the lazy-equity test (2026)",
    excerpt:
      "Cash-on-cash tracks your original down payment forever; return on equity tracks what the equity you hold today is actually earning — and on a rental you&apos;ve owned a while, only the second one drives decisions. The formula, a 10-year example where the dollar return nearly doubles while ROE slips from 16.9% to 12%, why the decay is pure leverage, the cash-on-equity figure that lands at 3.7%, and the honest cost of the refinance ROE tempts you into.",
    readingTimeMinutes: 11,
    publishedAt: "2026-07-01",
    available: true,
  },
  {
    slug: "how-to-read-a-rent-roll",
    title:
      "How to read a rent roll: verify a rental's income before you buy (2026)",
    excerpt:
      "A rent roll is where the seller&apos;s story meets the leases — and the gap is the deal. Why a fourplex that &quot;grosses $63,600&quot; is really collecting $42,900, how to split the $20,700 gap into curable vacancy ($16,800) and sticky loss-to-lease ($3,900), the five places rent rolls mislead, the GRM that reads 8.2 on potential rent and 12.1 on collected, and the estoppel-and-bank-deposit check that turns the seller&apos;s claim into proof before you wire a dime.",
    readingTimeMinutes: 11,
    publishedAt: "2026-06-30",
    available: true,
  },
  {
    slug: "mortgage-points-investment-property",
    title:
      "Are mortgage points worth it on an investment property? (2026)",
    excerpt:
      "Points trade cash at closing for a permanently lower rate. At 2026 pricing the break-even runs about five years and the implied return about 20% a year — but only while you keep the loan. The buydown-ladder steepness that actually sets the break-even, the IRS rule that makes you amortize rental points instead of deducting them up front, the two points that lift a $200K-loan deal from a 1.14 to a 1.20 DSCR, and the refinance trap where buying down a rate you abandon in three years quietly costs about $1,600.",
    readingTimeMinutes: 11,
    publishedAt: "2026-06-29",
    available: true,
  },
  {
    slug: "negative-leverage-real-estate",
    title:
      "Negative leverage in real estate: when borrowing lowers your return (2026)",
    excerpt:
      "&quot;Use leverage, returns go up&quot; is only true when the asset out-earns the debt — and in 2026 it usually doesn't. The one number that sets the sign (the loan constant, not the rate), the cap-rate-vs-loan-constant rule, the leverage identity that makes it exact, a worked $300K property across five cap rates, and the trap where a deal still cash-flows and still clears a DSCR lender while quietly dragging cash-on-cash below the all-cash return.",
    readingTimeMinutes: 11,
    publishedAt: "2026-06-28",
    available: true,
  },
  {
    slug: "property-tax-reassessment-rental-property",
    title:
      "Property tax reassessment: don't underwrite the seller's tax bill (2026)",
    excerpt:
      "The most expensive shortcut in underwriting is copying the property-tax line straight off the listing. Why the seller's bill reflects a capped, years-old assessment and an owner-occupant exemption you'll never get, how a sale resets taxes toward your purchase price (Prop 13 and the cyclical-reassessment states), the supplemental bill that lands after closing, and a worked $400K duplex where a $3,400-vs-$6,000 tax line drops the cap rate 0.65 points, pushes DSCR from 1.00 to 0.90, and swings cash flow from +$9 to −$208 a month.",
    readingTimeMinutes: 10,
    publishedAt: "2026-06-27",
    available: true,
  },
  {
    slug: "break-even-occupancy-rental-property",
    title: "Break-even occupancy: how much vacancy a rental can survive (2026)",
    excerpt:
      "Cap rate tells you what a rental earns; break-even occupancy tells you how much can go wrong before it stops paying for itself. The formula — (operating expenses + debt service) ÷ gross potential rent — a worked 2026 duplex where 86% break-even leaves a 14-point cushion, the overpaid twin where that cushion collapses below 5 points, and why break-even occupancy is just the occupancy where DSCR hits 1.0.",
    readingTimeMinutes: 10,
    publishedAt: "2026-06-26",
    available: true,
  },
  {
    slug: "how-to-estimate-rent-rental-property",
    title: "How to estimate rent on a rental property (2026)",
    excerpt:
      "Rent is the input every metric leans on — and the one investors most often guess. The appraiser's comp-adjustment method with a worked grid, the GRM and 1% cross-checks that bound the number, the haircut from market to effective rent, and why an 8% ($150/month) rent miss moves the cap rate 0.6 points, swings cash flow ~$128/month, and pushes DSCR from 1.15 to 1.24 — across the lender's line.",
    readingTimeMinutes: 11,
    publishedAt: "2026-06-25",
    available: true,
  },
  {
    slug: "rental-property-insurance",
    title: "Rental property insurance: landlord coverage and cost in 2026",
    excerpt:
      "The most-underestimated line in a 2026 underwrite. Landlord (DP-3) vs homeowners coverage, what loss-of-rent actually protects, real 2026 cost ranges (~$1,200–$1,900 and climbing), how to estimate it before you have a quote, and how a $1,500-vs-$3,500 premium swings cash flow ~$167/month and drags DSCR below the line.",
    readingTimeMinutes: 11,
    publishedAt: "2026-06-23",
    available: true,
  },
  {
    slug: "cash-out-refinance-vs-heloc-rental",
    title:
      "Cash-out refinance vs HELOC on a rental: which pulls equity better in 2026?",
    excerpt:
      "Two ways to pull equity from a rental — and in 2026 they aren't interchangeable. The investment-property LTV and rate reality, the cheap-first-mortgage trap (a refi resets your whole 3.5% loan to 7%; a HELOC doesn't), and a worked side-by-side where the higher-rate HELOC is the cheaper decision by thousands a year.",
    readingTimeMinutes: 11,
    publishedAt: "2026-06-23",
    available: true,
  },
  {
    slug: "rental-property-llc",
    title: "Should you put your rental property in an LLC? (2026)",
    excerpt:
      "An honest answer to the most-asked entity question. What an LLC does (liability) and doesn't (cut your taxes), the Garn-St. Germain due-on-sale trap when you transfer a mortgaged rental, why a conventional loan won't follow you into an LLC, the 2026 Corporate Transparency Act reversal that exempted domestic LLCs from BOI filing, and when it's actually worth the cost.",
    readingTimeMinutes: 12,
    publishedAt: "2026-06-23",
    available: true,
  },
  {
    slug: "seller-financing-subject-to",
    title:
      "Seller financing and subject-to: creative deals explained (2026)",
    excerpt:
      "When 7% bank loans kill the deal, creative financing moves it. How seller financing and subject-to work, the due-on-sale risk that defines subject-to, where Dodd-Frank does and doesn't apply to investors, and the 2026 rate arbitrage (~$650/month on a 3.5% subject-to loan) underwritten with the downside priced in.",
    readingTimeMinutes: 11,
    publishedAt: "2026-06-23",
    available: true,
  },
  {
    slug: "1-percent-rule-rental-property",
    title: "The 1% rule for rental property: does it still work in 2026?",
    excerpt:
      "The fastest screen in real estate — monthly rent ≥ 1% of price — and why 7% rates quietly moved the bar. The GRM bridge (a 1% deal is a GRM of ~8.3), the break-even ratio that climbed from ~0.57% to ~0.76%, two 1% properties whose returns sit 40% apart, and how to use the rule without letting it talk you into a bad deal.",
    readingTimeMinutes: 10,
    publishedAt: "2026-06-23",
    available: true,
  },
  {
    slug: "piti-explained-rental-property",
    title: "PITI explained: the real monthly payment on a rental (2026)",
    excerpt:
      "P&I isn't your real payment — PITI is: principal, interest, taxes, and insurance. On a $250k rental at 7% with 25% down, taxes and insurance pile $400/month on top of the loan — 32% more — before the reassessment trap and escrow surprises. How to estimate each part, and how a $1,647 payment becomes a 1.27 DSCR.",
    readingTimeMinutes: 11,
    publishedAt: "2026-06-20",
    available: true,
  },
  {
    slug: "how-much-down-payment-investment-property",
    title:
      "How much down payment do you need for an investment property? (2026)",
    excerpt:
      "15% down on a single-family rental, 25% on a 2–4 unit — but only if you don't live in it. The full 2026 down-payment menu, the no-PMI rule, and worked cash-on-cash and DSCR math on a $250k rental at 15% vs 20% vs 25% down — including why more down can mean a higher return when the loan constant (~8.2%) tops the cap rate. Plus the house-hack route in for $8,750.",
    readingTimeMinutes: 11,
    publishedAt: "2026-06-18",
    available: true,
  },
  {
    slug: "gross-rent-multiplier-explained",
    title:
      "Gross rent multiplier (GRM) explained: how to screen rentals fast (2026)",
    excerpt:
      "GRM = price ÷ annual gross rent — the fastest screen in real estate and the first number to compute on any listing. The formula, a three-listing screen, the cap-rate bridge ((1 − expense ratio) ÷ GRM), how it maps to the 1% rule, and two $250K duplexes with identical GRMs that cash flow +$365 and −$155.",
    readingTimeMinutes: 10,
    publishedAt: "2026-06-17",
    available: true,
  },
  {
    slug: "how-to-calculate-noi-rental-property",
    title:
      "How to calculate NOI (net operating income) on a rental property (2026)",
    excerpt:
      "NOI = effective gross income minus operating expenses, before the mortgage — and it's the number cap rate, DSCR, and 5+ unit valuation are all built on. The formula, a full line-by-line $250K duplex example, the CapEx classification trap that swings the cap rate a full point, and the three ways people get NOI wrong.",
    readingTimeMinutes: 10,
    publishedAt: "2026-06-16",
    available: true,
  },
  {
    slug: "depreciation-recapture-rental-property",
    title:
      "Depreciation recapture on rental property: how the tax works when you sell (2026)",
    excerpt:
      "Depreciation lowers your basis every year — and recapture taxes the gain that creates when you sell, at up to 25%. A full worked example on a $250K rental sold for $360K, why the real bill is 2.4x the naive estimate, the §1245 cost-seg trap, and five ways to defer or erase it.",
    readingTimeMinutes: 11,
    publishedAt: "2026-06-14",
    available: true,
  },
  {
    slug: "schedule-e-rental-property",
    title:
      "Schedule E for rental property: a line-by-line walkthrough (2026)",
    excerpt:
      "Every Schedule E line that matters, a full worked example on a $250K rental, and the exact bridge between +$139/month of cash flow and a $3,703 paper loss — plus the $25K passive loss allowance, its MAGI phase-out, and the four mistakes that cost real money.",
    readingTimeMinutes: 10,
    publishedAt: "2026-06-12",
    available: true,
  },
  {
    slug: "capex-maintenance-reserves-rental-property",
    title:
      "CapEx and maintenance reserves: how much to actually budget for a rental (2026)",
    excerpt:
      "Percent-of-rent defaults understate capex on exactly the properties that can least afford it. The component-lifespan method with 2026 prices, an age-weighted reserve formula, and what honest reserves do to NOI, DSCR, and cash flow on a $220K rental.",
    readingTimeMinutes: 10,
    publishedAt: "2026-06-11",
    available: true,
  },
  {
    slug: "section-8-rental-property-investing",
    title:
      "Section 8 rentals: how the math actually works in 2026 (pros, cons, underwriting)",
    excerpt:
      "How the voucher program actually pays — payment standards, FMR math, the two ceilings on your rent, NSPIRE inspection costs, and the five underwriting adjustments that decide whether Section 8 makes a deal better or worse.",
    readingTimeMinutes: 11,
    publishedAt: "2026-06-10",
    available: true,
  },
  {
    slug: "closing-costs-investment-property",
    title:
      "Closing costs on an investment property — the full breakdown (2026)",
    excerpt:
      "Every line item in investment-property closing costs, with real 2026 dollar figures on a $250k rental. Lender fees, title, transfer taxes, prepaids — what's negotiable, what isn't, and how to fold it into your cash-to-close.",
    readingTimeMinutes: 11,
    publishedAt: "2026-06-09",
    available: true,
  },
  {
    slug: "vacancy-rate-rental-property",
    title:
      "Vacancy rate for rentals: what to assume in 2026 (and why 5% is usually a guess)",
    excerpt:
      "Physical vs economic vacancy, the turnover math that derives the number instead of guessing it, what 5 points does to cash flow and DSCR, and why your DSCR lender ignores vacancy entirely.",
    readingTimeMinutes: 10,
    publishedAt: "2026-06-07",
    available: true,
  },
  {
    slug: "brrrr-method-explained",
    title: "The BRRRR method in 2026: the complete numbers walkthrough",
    excerpt:
      "Buy, rehab, rent, refinance, repeat — with real 2026 numbers. One full deal start to finish: refinance LTV limits, seasoning rules, DSCR qualification, and the two constraints on your cash-out most guides skip.",
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
    title: "How to calculate cash-on-cash return on a rental property — 2026 guide",
    excerpt:
      "Cash-on-cash return = annual cash flow ÷ total cash invested. It's the only metric that tells you the return on the dollars you actually put in. Here's the formula, what counts as 'total cash invested,' three worked examples, and the trap most calculators fall into.",
    readingTimeMinutes: 7,
    publishedAt: "2026-06-07",
    available: true,
  },
  {
    slug: "how-to-calculate-dscr",
    title: "How to calculate DSCR (debt service coverage ratio) — 2026 guide",
    excerpt:
      "DSCR = NOI ÷ annual debt service. It's the metric DSCR lenders use to qualify your loan. Here's the formula, what lenders include and exclude, three worked examples, and the difference between your DSCR and the lender's DSCR (which is usually lower).",
    readingTimeMinutes: 8,
    publishedAt: "2026-06-07",
    available: true,
  },
  {
    slug: "how-truecap-verdict-engine-works",
    title: "How TrueCap classifies selected-rule fit",
    excerpt:
      "The cash flow, DSCR, cap-rate, and cash-on-cash thresholds behind TrueCap's secondary screening bands, plus how to interpret them without treating a label as advice.",
    readingTimeMinutes: 10,
    publishedAt: "2026-06-07",
    available: true,
  },
  {
    slug: "house-hack-underwriting-guide",
    title: "House hack underwriting: how to know if a duplex, triplex, or fourplex actually beats renting",
    excerpt:
      "House hacking sounds great in a podcast and confusing in a spreadsheet. The honest math: your housing cost vs. renting the equivalent, factoring in down payment, mortgage paydown, appreciation, and the very real cost of being your tenants' landlord.",
    readingTimeMinutes: 12,
    publishedAt: "2026-06-07",
    available: true,
  },
  {
    slug: "short-term-rental-underwriting-playbook",
    title: "Short-term rental underwriting playbook: how to model an Airbnb in 2026",
    excerpt:
      "STR cash flow lives or dies on three numbers: ADR, occupancy, and operating expenses. Here's the full playbook for underwriting a short-term rental in 2026 — what data sources to use, what hidden costs everyone forgets, and how to stress-test for a bad off-season.",
    readingTimeMinutes: 14,
    publishedAt: "2026-06-07",
    available: true,
  },
  {
    slug: "hard-money-vs-dscr-loan",
    title: "Hard money vs DSCR: which loan product is right for your next deal in 2026",
    excerpt:
      "Hard money and DSCR loans solve different problems. Hard money is short-term capital for a deal you'll rehab and exit; DSCR is long-term capital for a rental you'll hold. Picking the wrong one costs you 4-6 points and 18 months of friction. Here's how to choose.",
    readingTimeMinutes: 11,
    publishedAt: "2026-06-07",
    available: true,
  },
  {
    slug: "bonus-depreciation-rental-property-2026",
    title: "Bonus depreciation on rental property in 2026: the restored 100% deduction and what qualifies",
    excerpt:
      "Current IRS guidance restored 100% bonus depreciation for eligible property acquired and placed in service after January 19, 2025. The rental building itself usually does not qualify; certain shorter-life components can.",
    readingTimeMinutes: 10,
    publishedAt: "2026-06-07",
    modifiedAt: "2026-08-15",
    available: true,
  },
  {
    slug: "best-rental-property-calculator-2026",
    title: "Best rental property calculator 2026: 7 tools compared",
    excerpt:
      "Honest 2026 ranking of the 7 most popular rental property calculators — TrueCap, DealCheck, BiggerPockets, Mashvisor, Stessa, Excel, and Roofstock — across free tier depth, pricing, mobile, and audience fit.",
    readingTimeMinutes: 12,
    publishedAt: "2026-06-07",
    modifiedAt: "2026-08-27",
    available: true,
  },
  {
    slug: "best-free-rental-property-calculator-2026",
    title: "Best free rental property calculator 2026: 5 tools that actually work for free",
    excerpt:
      "Honest 2026 ranking of the 5 best truly-free rental property calculators — TrueCap, BiggerPockets' free reports, Stessa's calculator, Excel templates, and Zillow's mortgage calculator. What each free tier covers and where the gates kick in.",
    readingTimeMinutes: 9,
    publishedAt: "2026-06-07",
    modifiedAt: "2026-08-27",
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
    title: "Best short-term rental analysis tool 2026: 6 tools STR investors compare",
    excerpt:
      "Honest 2026 ranking of the best STR analysis tools — AirDNA for revenue data, TrueCap for underwriting, Mashvisor for market discovery, plus PMS platforms STR investors evaluate.",
    readingTimeMinutes: 10,
    publishedAt: "2026-06-07",
    available: true,
  },
  {
    slug: "dealcheck-vs-biggerpockets-vs-truecap",
    title: "DealCheck vs BiggerPockets vs TrueCap: which rental calculator wins?",
    excerpt:
      "Honest 3-way comparison of DealCheck, BiggerPockets Calculator, and TrueCap. Free tier depth, pricing, projections, mobile, and which fits which investor.",
    readingTimeMinutes: 11,
    publishedAt: "2026-06-07",
    modifiedAt: "2026-08-16",
    available: true,
  },
  {
    slug: "dealcheck-vs-stessa-vs-truecap",
    title: "DealCheck vs Stessa vs TrueCap: which one do you actually need?",
    excerpt:
      "A dated 3-way comparison of DealCheck, Stessa, and TrueCap. All three support acquisition analysis; Stessa also spans listing discovery and owned-property operations.",
    readingTimeMinutes: 11,
    publishedAt: "2026-06-07",
    modifiedAt: "2026-08-27",
    available: true,
  },
  {
    slug: "roofstock-vs-mashvisor-vs-propstream",
    title: "Roofstock vs Mashvisor vs PropStream: 3-way deal discovery comparison",
    excerpt:
      "Roofstock sells turnkey rentals. Mashvisor scores neighborhoods. PropStream finds motivated sellers. Honest 3-way comparison plus where TrueCap fits after they each find you a property.",
    readingTimeMinutes: 10,
    publishedAt: "2026-06-07",
    available: true,
  },
  {
    slug: "stessa-vs-avail-vs-baselane",
    title: "Stessa vs Avail vs Baselane: 3-way landlord ops comparison",
    excerpt:
      "Stessa spans acquisition through operations; Avail emphasizes leasing and rent collection; Baselane combines banking and bookkeeping. Updated with dated official sources.",
    readingTimeMinutes: 10,
    publishedAt: "2026-06-07",
    modifiedAt: "2026-08-27",
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
    title: "Single-family vs multi-family rental property — which actually wins?",
    excerpt:
      "The honest comparison: cash flow, cap rate, financing, tenant quality, exit liquidity, capex risk, and which property type fits your specific stage. Side-by-side numbers with 2026 financing.",
    readingTimeMinutes: 11,
    publishedAt: "2026-05-27",
    available: true,
  },
  {
    slug: "how-to-estimate-rehab-costs",
    title: "How to estimate rehab costs on a rental property — the honest framework",
    excerpt:
      "The framework experienced investors use: sq-ft pricing for cosmetic, kitchen, bath, systems work. Plus the 25% contingency rule and on-site walkthrough checklist.",
    readingTimeMinutes: 12,
    publishedAt: "2026-05-27",
    available: true,
  },
  {
    slug: "how-to-refinance-a-rental-property",
    title: "How to refinance a rental property — rate-and-term, cash-out, and DSCR options",
    excerpt:
      "Step-by-step on refinancing a rental property: when refi makes sense, rate-and-term vs cash-out, LTV limits, DSCR loans, the break-even math, and the 5 mistakes most investors make.",
    readingTimeMinutes: 10,
    publishedAt: "2026-05-26",
    available: true,
  },
  {
    slug: "rental-property-pro-forma-explained",
    title: "How to read a rental property pro forma (and the 7 lies inside most of them)",
    excerpt:
      "A pro forma is a seller's projection of how a rental property will perform — and it's almost always optimistic. Here's how to translate seller pro formas into real numbers, and the 7 line items most pro formas understate.",
    readingTimeMinutes: 9,
    publishedAt: "2026-05-26",
    available: true,
  },
  {
    slug: "how-to-find-off-market-rental-properties",
    title: "How to find off-market rental properties — 8 sources that actually work",
    excerpt:
      "The 8 sources serious rental investors use to find off-market deals — driving for dollars, direct mail, wholesalers, networking, public records, and the underrated channels most investors skip.",
    readingTimeMinutes: 10,
    publishedAt: "2026-05-26",
    available: true,
  },
  {
    slug: "rental-property-tax-deductions",
    title: "Rental property tax deductions — the 14 every investor should know",
    excerpt:
      "Every deductible expense on a rental property, organized by Schedule E line. Worked examples, common-mistake callouts, and the depreciation move that often saves more than all other deductions combined.",
    readingTimeMinutes: 11,
    publishedAt: "2026-05-26",
    available: true,
  },
  {
    slug: "best-states-for-rental-investors-2026",
    title: "Best states for rental property investors in 2026",
    excerpt:
      "An honest ranking of the top 10 US states for rental investors — cap rates, property tax, income tax, landlord laws, and the trade-offs that decide which state actually fits your strategy.",
    readingTimeMinutes: 12,
    publishedAt: "2026-05-25",
    available: true,
  },
  {
    slug: "1031-exchange-basics",
    title: "1031 exchange basics for individual rental investors",
    excerpt:
      "How a 1031 exchange actually works in 2026 — the 45-day and 180-day windows, qualified intermediary requirement, like-kind rules, boot, reverse exchanges, and when it's worth the complexity.",
    readingTimeMinutes: 11,
    publishedAt: "2026-05-25",
    available: true,
  },
  {
    slug: "50-percent-rule-rentals",
    title: "The 50% rule for rentals — is it still useful in 2026?",
    excerpt:
      "The classic 50% rule says operating expenses run ~half of gross rent. Honest take on when it works as a triage tool, when it lies, and what to use instead.",
    readingTimeMinutes: 6,
    publishedAt: "2026-05-25",
    available: true,
  },
  {
    slug: "house-hacking-explained",
    title: "House hacking explained: how to (almost) live for free in a 2-4 unit",
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
      "8-10% of rent + lease-up fees + maintenance markup — does paying a PM still beat managing yourself? The honest break-even math, plus when to switch each direction.",
    readingTimeMinutes: 8,
    publishedAt: "2026-05-25",
    available: true,
  },
  {
    slug: "spot-bad-rental-in-60-seconds",
    title: "How to spot a bad rental deal in 60 seconds — 7 red flags",
    excerpt:
      "Seven red flags that tell you a rental doesn't pencil — before you waste hours running the full underwrite. The triage every experienced investor does in their head.",
    readingTimeMinutes: 8,
    publishedAt: "2026-05-24",
    available: true,
  },
  {
    slug: "cash-on-cash-vs-irr",
    title: "Cash-on-cash vs IRR: which one tells the truth?",
    excerpt:
      "Cash-on-cash and IRR are both return metrics, but they answer completely different questions. When each one is right, when each one lies, and which to trust.",
    readingTimeMinutes: 7,
    publishedAt: "2026-05-24",
    available: true,
  },
  {
    slug: "cash-flow-vs-appreciation",
    title: "Cash flow vs appreciation: which rental strategy actually wins in 2026?",
    excerpt:
      "A 10-year side-by-side across three market types with 2026 borrowing costs — and the two return components most comparisons silently forget.",
    readingTimeMinutes: 9,
    publishedAt: "2026-05-24",
    available: true,
  },
  {
    slug: "what-is-a-good-cap-rate",
    title: "What's a good cap rate for rental property in 2026?",
    excerpt:
      "Benchmarks by market type, the framework professionals actually use to evaluate cap rate, and why pre-2022 intuition is silently buying investors into negative leverage.",
    readingTimeMinutes: 9,
    publishedAt: "2026-05-24",
    available: true,
  },
  {
    slug: "dscr-loans-explained",
    title: "DSCR loans explained: what they are, when they make sense, what they cost in 2026",
    excerpt:
      "DSCR programs primarily use property coverage instead of personal DTI as the main ratio, while borrower and property checks still apply. Learn the costs and trade-offs.",
    readingTimeMinutes: 10,
    publishedAt: "2026-05-24",
    available: true,
  },
  {
    slug: "cap-rate-vs-cash-on-cash-vs-dscr",
    title: "Cap rate vs cash-on-cash vs DSCR: which one actually matters?",
    excerpt:
      "Three different metrics, three different jobs. A plain-English guide to when each one matters and the 2026 negative-leverage trap most investors miss.",
    readingTimeMinutes: 8,
    publishedAt: "2026-05-24",
    available: true,
  },
  {
    slug: "how-to-underwrite-a-rental-property-in-60-seconds",
    title: "How to underwrite a rental property in 60 seconds",
    excerpt:
      "The five numbers, four metrics, and two sanity checks every investor uses to triage a deal — without a spreadsheet.",
    readingTimeMinutes: 9,
    publishedAt: "2026-05-24",
    available: true,
  },
];

export default function BlogIndexPage() {
  const siteUrl = getSiteUrl();
  const blogLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${siteUrl}/blog#blog`,
    name: "TrueCap Blog",
    url: `${siteUrl}/blog`,
    publisher: { "@id": `${siteUrl}/#organization` },
    blogPost: BLOG_POSTS.filter((p) => p.available).map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: `${siteUrl}/blog/${p.slug}`,
      datePublished: p.publishedAt,
      dateModified: p.modifiedAt ?? p.publishedAt,
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogLd) }}
      />
      <main id="main" className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="mb-8">
          <Link
            href="/"
            className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground"
          >
            ← TrueCap
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-2 leading-tight">
            Blog
          </h1>
          <p className="text-base text-muted-foreground mt-2 leading-relaxed">
            Deep dives on rental property analysis, real estate math, and
            underwriting best practices from the team behind TrueCap.
          </p>
        </header>

        {/* Browse by topic — hubs that group the posts by investor journey
            (P2-4) and pair each with the relevant calculators. */}
        <nav aria-label="Browse by topic" className="mb-8">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Browse by topic
          </p>
          <div className="flex flex-wrap gap-2">
            {BLOG_TOPICS.map((t) => (
              <Link
                key={t.slug}
                href={`/blog/topics/${t.slug}`}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {t.title}
              </Link>
            ))}
            <Link
              href="/blog/topics"
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-primary hover:underline"
            >
              All topics →
            </Link>
          </div>
        </nav>

        <ul className="space-y-4">
          {BLOG_POSTS.filter((p) => p.available).map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="group block bg-card border border-border rounded-2xl p-5 sm:p-6 hover:border-primary transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <BookOpen className="size-5 text-primary" />
                  <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-foreground leading-tight">
                  {post.title}
                </h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {post.excerpt}
                </p>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold mt-3">
                  {post.modifiedAt ? "Updated " : ""}
                  {new Date(post.modifiedAt ?? post.publishedAt).toLocaleDateString("en-US", {
                    timeZone: "UTC",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  · {post.readingTimeMinutes} min read
                </p>
              </Link>
            </li>
          ))}
        </ul>

        {/* NOTE: /vs hub card removed at user request. The individual
            /vs/<competitor> pages still exist as SEO landing surfaces
            (visitors arrive direct from Google) but the hub is hidden
            from internal navigation. */}

        <section className="mt-10 rounded-2xl bg-primary text-primary-foreground p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold mb-2">
            Want the calculator that powers these guides?
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-4">
            TrueCap turns every concept in these posts into a fully-functional
            analyzer — cap rate, cash flow, DSCR, projections, tax modeling.
            Free to start.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity"
          >
            Open TrueCap
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </section>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
