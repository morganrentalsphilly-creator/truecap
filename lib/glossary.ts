/**
 * Single source of truth for real estate investing terms.
 *
 * Each entry powers TWO surfaces:
 *   1. In-app tooltips (uses `term`, `definition`, `benchmark` — short form)
 *   2. Dedicated SEO page at /glossary/[slug] (uses the rich fields below)
 *
 * The rich fields (formula, example, whyItMatters, related, toolUrl) are
 * optional. Entries without them still get a glossary page — just shorter.
 * The top-traffic terms (cap rate, DSCR, CoC, BRRRR, etc.) have the rich
 * version because that's where the long-tail SEO traffic compounds.
 */

export type GlossaryCategory =
  | "metric"
  | "financing"
  | "expense"
  | "projection"
  | "strategy"
  | "fundamental";

export type GlossaryEntry = {
  /** Display name shown on tooltips, page H1, breadcrumbs. */
  term: string;
  /** URL slug — used at /glossary/[slug]. Kebab-case. */
  slug: string;
  /** Grouping for the glossary index page. */
  category: GlossaryCategory;
  /** Plain-English one-sentence definition. */
  definition: string;
  /**
   * Common synonyms / aliases the definition still covers ("CoC",
   * "Debt Service Coverage Ratio"). Rendered as "Also called: …" on the
   * /glossary hub so a reader scanning for the abbreviation they know
   * lands on the right term.
   */
  also?: string[];
  /** Optional "what's a good number" benchmark. */
  benchmark?: string;
  /** Optional formula (math expression as plain text). */
  formula?: string;
  /** Optional worked example showing the formula in action. */
  example?: string;
  /** 1-2 sentences on why this metric matters for investing decisions. */
  whyItMatters?: string;
  /** Related terms — array of GLOSSARY keys. Powers internal linking. */
  related?: string[];
  /** Optional link to a related calculator on /tools/*. */
  toolUrl?: string;
  /** Optional link to the long-form blog post that covers this term. */
  postUrl?: string;
};

export const GLOSSARY: Record<string, GlossaryEntry> = {
  // ─── METRICS ───
  capRate: {
    term: "Cap Rate",
    slug: "cap-rate",
    also: ["Capitalization rate"],
    category: "metric",
    definition:
      "Net Operating Income ÷ property value. The unleveraged return a property generates, independent of financing.",
    benchmark:
      "No universal range is a property fact or investment threshold. Compare consistently calculated cap rates using dated, local evidence and the same expense conventions.",
    formula: "Cap Rate = NOI ÷ Property Value",
    example:
      "A property with $36,000 of NOI ($60k gross rent minus $24k expenses) and a $450,000 purchase price has a cap rate of $36,000 ÷ $450,000 = 8.0%.",
    whyItMatters:
      "Cap rate lets you compare properties on an apples-to-apples basis regardless of financing. It's also how commercial properties (5+ units) are valued — buyers price them on NOI ÷ market cap rate.",
    related: ["noi", "coc", "dscr", "onePercentRule"],
    postUrl: "/blog/what-is-a-good-cap-rate",
  },
  coc: {
    term: "Cash-on-Cash Return",
    slug: "cash-on-cash-return",
    also: ["CoC", "Cash on cash"],
    category: "metric",
    definition:
      "Annual cash flow ÷ total cash invested (down payment + closing + rehab). Tells you how hard your money is working.",
    benchmark:
      "There is no universal target. Set a criterion that fits the strategy, financing, liquidity, and risk constraints, then verify every cash-flow and cash-invested input.",
    formula: "CoC = Annual Cash Flow ÷ Total Cash Invested",
    example:
      "If you put $80,000 down on a $400,000 property and collect $8,800/yr in cash flow, your CoC is $8,800 ÷ $80,000 = 11.0%.",
    whyItMatters:
      "Cash-on-cash incorporates modeled financing and cash invested, while cap rate excludes financing. Review it alongside cash flow, DSCR, risk, and the evidence behind the inputs rather than optimizing one metric in isolation.",
    related: ["capRate", "cashFlow", "irr", "dscr"],
    postUrl: "/blog/cap-rate-vs-cash-on-cash-vs-dscr",
  },
  cashFlow: {
    term: "Monthly Cash Flow",
    slug: "monthly-cash-flow",
    category: "metric",
    definition:
      "Rent minus operating expenses minus mortgage payment. The cash that lands in your account each month.",
    formula: "Cash Flow = Rent − Operating Expenses − Mortgage Payment",
    example:
      "$2,000 rent − $400 expenses − $1,200 mortgage = $400/mo cash flow = $4,800/yr.",
    whyItMatters:
      "Monthly cash flow is what funds your life. Wealth-building investors weight IRR; income investors weight monthly cash flow.",
    related: ["coc", "noi", "afterTaxCF"],
  },
  dscr: {
    term: "DSCR (Debt Service Coverage Ratio)",
    slug: "dscr",
    also: ["Debt Service Coverage Ratio"],
    category: "metric",
    definition:
      "Net Operating Income ÷ mortgage payment. Measures whether the property's income comfortably covers debt service.",
    benchmark:
      "Under this formula, 1.0 means modeled NOI equals modeled debt service. Lender definitions, qualifying inputs, thresholds, and approval rules vary by product, borrower, and property.",
    formula: "DSCR = NOI ÷ Annual Debt Service",
    example:
      "A property with $36,000 NOI and $24,000 of annual mortgage payments has DSCR = $36,000 ÷ $24,000 = 1.50.",
    whyItMatters:
      "DSCR shows the modeled relationship between NOI and debt service under the stated convention. It can prompt questions for a lender, but TrueCap does not reproduce every lender's calculation or predict approval.",
    related: ["noi", "capRate", "ltv"],
    postUrl: "/blog/dscr-loans-explained",
  },
  noi: {
    term: "NOI (Net Operating Income)",
    slug: "noi",
    also: ["Net Operating Income"],
    category: "metric",
    definition:
      "Gross annual rent minus all operating expenses, before debt service and income tax.",
    formula:
      "NOI = Gross Rent − (Property Tax + Insurance + Maintenance + Vacancy + Management + Other Op Ex)",
    example:
      "$60,000 gross rent − ($6,000 tax + $2,400 insurance + $3,600 maintenance + $3,000 vacancy + $5,400 management) = $39,600 NOI.",
    whyItMatters:
      "NOI is the numerator in cap rate, DSCR, and most commercial valuation formulas. It also excludes debt service intentionally — so two investors with different financing on the same property have the same NOI.",
    related: ["capRate", "dscr", "cashFlow"],
  },
  irr: {
    term: "IRR (Internal Rate of Return)",
    slug: "irr",
    category: "metric",
    definition:
      "Annualized return over the full hold period, including cash flow, principal paydown, appreciation, and exit proceeds.",
    formula:
      "IRR solves for the rate where the sum of discounted cash flows (including exit) equals zero.",
    example:
      "Invest $80k. Collect $7k/yr cash flow for 10 years. Sell for $480k (paying off $260k mortgage = $220k proceeds). IRR ≈ 14.5%.",
    whyItMatters:
      "IRR captures the FULL return story: monthly cash flow + principal paydown + appreciation + exit value, all rolled into one annualized number. It's the right metric for wealth-builders.",
    related: ["coc", "cashFlow", "appreciation"],
  },
  equityMultiple: {
    term: "Equity Multiple",
    slug: "equity-multiple",
    category: "metric",
    definition:
      "Total cash returned (cash flow + net sale proceeds) ÷ total cash invested. 2.0× means you doubled your money over the hold.",
    benchmark:
      "There is no universal target or hold period. The result depends on the full modeled cash-flow and sale assumptions and should be reviewed with IRR and downside scenarios.",
    formula: "Equity Multiple = Total Cash Returned ÷ Total Cash Invested",
    example:
      "Invest $80k, collect $70k of cash flow over 10 years, then net $120k at sale → ($70k + $120k) ÷ $80k = 2.4×.",
    whyItMatters:
      "Unlike IRR, the equity multiple ignores timing and answers the blunt question: how many times did I get my money back? Read the two together — IRR is the speed of the return, the multiple is its size.",
    related: ["irr", "coc", "cashFlow"],
  },
  tenYearReturn: {
    term: "10-Year Total Return",
    slug: "ten-year-total-return",
    category: "projection",
    definition:
      "Your estimated average return per year over a 10-year hold, blending cash flow, loan paydown, and appreciation — not just the rent you pocket today.",
    benchmark:
      "There is no universal long-run target. The result is highly sensitive to rent, expense, financing, value, and sale assumptions, so treat it as a scenario rather than a forecast.",
    whyItMatters:
      "Cash flow alone undersells a rental: a deal that's near break-even today can still build real wealth through equity paydown and appreciation. This number is the closest single figure to 'what will this actually earn me long-term.'",
    related: ["irr", "coc", "appreciation"],
  },
  mao: {
    term: "Offer Ceiling",
    slug: "max-allowable-offer",
    also: ["Highest price that meets your targets"],
    category: "metric",
    definition:
      "The highest purchase price that still meets your targets under the assumptions shown.",
    formula:
      "Offer Ceiling = work backward from your selected target metrics using the property's modeled NOI and your financing assumptions.",
    example:
      "With $32,000 of modeled NOI and a selected 7.5% cap-rate floor, the cap-rate-only Offer Ceiling is $32,000 ÷ 0.075 = $426,666; other selected targets may produce a lower boundary.",
    whyItMatters:
      "The Offer Ceiling shows where the model stops meeting your targets. Verify rent, financing, taxes, insurance, property condition, and material costs before using it in a negotiation or purchase decision.",
    related: ["capRate", "coc", "dealScore"],
  },
  dealScore: {
    term: "Deal score",
    slug: "deal-score",
    category: "metric",
    definition:
      "A 0–100 heuristic summary of the modeled cap rate, cash-on-cash, monthly cash flow, DSCR, and projected return, for consistent triage.",
    whyItMatters:
      "The Deal score helps you sort analyses for deeper review. It is not your Buy Box fit; read it after your targets and the underlying metrics.",
    related: ["capRate", "coc", "dscr", "cashFlow"],
  },
  taxSavings: {
    term: "Illustrative Tax Effect",
    slug: "tax-savings",
    category: "metric",
    definition:
      "An educational scenario that applies an assumed marginal rate to modeled taxable rental income or loss. It is not a determination of liability, eligibility, or whether a loss is currently usable.",
    whyItMatters:
      "Tax treatment can materially affect an investor's outcome, but it depends on the taxpayer, ownership, property use, basis, activity rules, and jurisdiction. TrueCap does not currently expose a tax-specific analysis module; use a qualified professional and taxpayer-specific model.",
    related: ["afterTaxCF", "depreciationYears", "buildingValue"],
  },
  afterTaxCF: {
    term: "After-Tax Cash Flow",
    slug: "after-tax-cash-flow",
    category: "metric",
    definition:
      "Pre-tax cash flow adjusted by a taxpayer-specific estimate of income taxes attributable to the rental. TrueCap does not currently expose an after-tax cash-flow module.",
    whyItMatters:
      "Tax treatment can shift an investor's realized result in either direction, but eligibility and timing depend on facts that a general rental screen cannot determine. Use a qualified professional and taxpayer-specific model.",
    related: ["cashFlow", "taxSavings", "depreciationYears"],
  },

  grm: {
    term: "GRM (Gross Rent Multiplier)",
    slug: "grm",
    also: ["Gross Rent Multiplier"],
    category: "metric",
    definition:
      "Property price ÷ annual gross rent. The simplest screening ratio in real estate — no expense data required.",
    benchmark:
      "6–10 is healthy in cash-flow markets. 10–14 is balanced. 14–20 is appreciation territory. 20+ is luxury / ultra-coastal.",
    formula: "GRM = Property Price ÷ Annual Gross Rent",
    example:
      "A $300,000 property renting for $2,500/mo ($30,000/yr) has a GRM of $300,000 ÷ $30,000 = 10.0.",
    whyItMatters:
      "GRM is the fastest triage filter there is — you can compute it from a listing price and a rent estimate alone, with zero expense data. Lower is better. Use it to shrink a 200-listing search down to the 20 worth underwriting properly.",
    related: ["capRate", "onePercentRule", "noi"],
    toolUrl: "/tools/gross-rent-multiplier-calculator",
  },
  oer: {
    term: "Operating Expense Ratio",
    slug: "operating-expense-ratio",
    also: ["OER"],
    category: "metric",
    definition:
      "Operating expenses ÷ effective gross income. The inverse of NOI margin.",
    benchmark:
      "35–50% is typical for residential rentals. Newer and professionally managed runs lower; older, self-managed with deferred maintenance runs higher.",
    formula: "OER = Operating Expenses ÷ Effective Gross Income",
    example:
      "A property collecting $60,000 of effective gross income against $24,000 of operating expenses has an OER of 40% — 40 cents of every rent dollar goes to running the property.",
    whyItMatters:
      "OER is the fastest sanity check on someone else's pro forma. A seller claiming a 20% OER on a 1960s duplex is not counting CapEx, management, or realistic vacancy — recompute NOI yourself before believing the cap rate.",
    related: ["noi", "capex", "maintenance", "management"],
  },
  // ─── STRATEGY ───
  brrrr: {
    term: "BRRRR",
    slug: "brrrr",
    also: ["Buy Rehab Rent Refinance Repeat"],
    category: "strategy",
    definition:
      "Buy, Rehab, Rent, Refinance, Repeat. A strategy that seeks to reuse capital through new financing after renovation and lease-up; the result depends on appraisal, lender terms, payoff, costs, timing, and stabilized operations.",
    example:
      "Map acquisition uses, renovation funding and downtime, stabilized operations, the original-loan payoff, refinance fees and proceeds, and the new loan schedule before estimating capital remaining in the deal.",
    whyItMatters:
      "A simple ARV-times-LTV shortcut can overstate refinance proceeds and understate capital at risk. TrueCap doesn't offer an integrated BRRRR model right now.",
    related: ["arv", "ltv", "capRate"],
    postUrl: "/blog/brrrr-method-explained",
  },
  onePercentRule: {
    term: "1% Rule",
    slug: "1-percent-rule",
    also: ["The one percent rule"],
    category: "strategy",
    definition:
      "Rule of thumb: monthly rent should equal at least 1% of purchase price. A 5-second screening filter, not a verdict.",
    example:
      "A $200,000 property should rent for at least $2,000/mo to clear the 1% rule.",
    whyItMatters:
      "The 1% rule is a back-of-napkin filter for triage. It's gotten harder to hit in most markets since 2020 — many strong cash-flow markets are 0.6–0.8% now. Use it to sort listings, not to make decisions.",
    related: ["capRate", "cashFlow"],
    toolUrl: "/tools/1-percent-rule-calculator",
  },

  houseHack: {
    term: "House Hack",
    slug: "house-hack",
    category: "strategy",
    definition:
      "Buying a 2–4 unit property, living in one unit, and renting out the others.",
    whyItMatters:
      "Eligible owner-occupants may have lower-down-payment financing options than investors. Down payment, occupancy certification, unit-count eligibility, reserves, mortgage insurance, and any later change in use depend on the specific loan documents and program; a 12-month scenario does not itself authorize conversion to a rental.",
    related: ["downPayment", "cashFlow", "brrrr"],
    postUrl: "/blog/house-hacking-explained",
  },
  exchange1031: {
    term: "1031 Exchange",
    slug: "1031-exchange",
    category: "strategy",
    definition:
      "A qualifying exchange of eligible real property that may postpone recognition of gain by carrying basis into like-kind replacement real property.",
    whyItMatters:
      "A qualifying 1031 exchange may postpone recognition of gain by carrying basis into eligible replacement real property. It does not erase tax. Identification is generally due within 45 days, and receipt is generally due by the earlier of day 180 or the applicable return due date, subject to detailed rules and limited relief.",
    related: ["taxSavings", "sellingCost", "appreciation"],
    postUrl: "/blog/1031-exchange-basics",
  },
  // ─── FINANCING ───
  ltv: {
    term: "LTV (Loan-to-Value)",
    slug: "ltv",
    also: ["Loan to Value"],
    category: "financing",
    definition:
      "Loan amount divided by the lender's eligible value basis. Investment-property cash-out limits vary by lender, program, property, borrower, seasoning, and appraisal.",
    formula: "LTV = Loan Amount ÷ Property Value",
    example: "A $300,000 loan on a $400,000 property = 75% LTV.",
    whyItMatters:
      "LTV is one lender risk input. Lower leverage generally creates more equity buffer, but rate, approval, eligible value, and maximum LTV remain program- and borrower-specific.",
    related: ["downPayment", "dscr", "brrrr"],
  },
  downPayment: {
    term: "Down Payment %",
    slug: "down-payment",
    category: "financing",
    definition:
      "Share of the purchase price you pay in cash. Required investment-property down payment varies by occupancy, borrower, property, lender, and loan program.",
    example:
      "On a $400,000 property at 25% down, you bring $100,000 to closing (before closing costs).",
    whyItMatters:
      "Down payment is the inverse of LTV and a major driver of leverage and liquidity. Compare written loan quotes and stress-test reserves instead of treating a percentage range as a universal sweet spot.",
    related: ["ltv", "coc", "closingCosts"],
  },
  interestRate: {
    term: "Interest Rate",
    slug: "interest-rate",
    category: "financing",
    definition:
      "Annual mortgage rate. Pricing varies by occupancy, program, borrower, property, leverage, points, lender, and lock date.",
    whyItMatters:
      "Rate materially changes payment and modeled cash flow. Compare current written quotes on the same terms and stress a higher-rate case; a generic market spread is not a quote or approval.",
    related: ["loanTerm", "dscr", "cashFlow"],
    toolUrl: "/tools/mortgage-payment-calculator",
  },
  loanTerm: {
    term: "Loan Term",
    slug: "loan-term",
    category: "financing",
    definition:
      "Years over which the loan amortizes. 30-year fixed is the default; 15-year fixed reduces total interest paid but spikes the monthly payment.",
    example:
      "On a $300k loan at 7%, 30-year = ~$2,000/mo payment ($718k total paid). 15-year = ~$2,700/mo ($486k total). 30-year keeps cash flow strong; 15-year builds equity faster.",
    whyItMatters:
      "30-year vs 15-year is the classic trade. 30-year wins on cash-on-cash return; 15-year wins on total wealth accumulated. Most investors pick 30-year for flexibility, then make extra principal payments when cash flow is strong.",
    related: ["interestRate", "cashFlow"],
  },
  closingCosts: {
    term: "Closing Costs",
    slug: "closing-costs",
    category: "financing",
    definition:
      "Lender fees, title, escrow, insurance prepay, etc. Typically 2-4% of purchase price for investment properties.",
    example:
      "On a $400,000 purchase, expect $8,000-$16,000 in closing costs. Larger of: origination fee + title insurance + recording + property tax escrow + insurance prepay.",
    whyItMatters:
      "Closing costs eat into your cash-on-cash return immediately. They're often forgotten in the initial back-of-napkin underwrite. Always include them in your total cash invested when calculating CoC.",
    related: ["coc", "downPayment"],
  },

  dti: {
    term: "DTI (Debt-to-Income)",
    slug: "debt-to-income",
    also: ["Debt to Income"],
    category: "financing",
    definition:
      "Personal monthly debt obligations ÷ personal gross monthly income.",
    benchmark:
      "Conventional residential lenders cap DTI around 43–50% to approve a loan.",
    whyItMatters:
      "DTI can constrain conventional financing as a portfolio grows. Some DSCR programs use property coverage instead of personal DTI as the primary ratio, but they still apply borrower, credit, reserve, property, and program-specific requirements.",
    related: ["dscr", "ltv", "interestRate"],
  },
  negativeLeverage: {
    term: "Negative Leverage",
    slug: "negative-leverage",
    category: "financing",
    definition:
      "When your borrowing rate exceeds the property's cap rate, so every borrowed dollar costs more than the property earns.",
    whyItMatters:
      "This is 2026's dominant trap: a 6% cap rate financed at 7% loses 1% on every borrowed dollar, which is why adding leverage can push cash-on-cash BELOW cap rate. Deals can still pencil on appreciation, tax savings, and principal paydown — but you should know that's what you're signing up for.",
    related: ["capRate", "interestRate", "coc", "ltv"],
    postUrl: "/blog/cap-rate-vs-cash-on-cash-vs-dscr",
  },
  // ─── EXPENSES ───
  propertyTax: {
    term: "Property Tax",
    slug: "property-tax",
    category: "expense",
    definition:
      "Annual property tax as a percent of value. Enter a local annual bill or a reviewed local effective rate; a blank field uses a TrueCap default of 1.1% — replace it with your local number.",
    whyItMatters:
      "Property tax is the second-largest expense after mortgage on most deals. State rates vary wildly: 0.3% in Hawaii vs 2.5%+ in some Texas MUD zones. Always pull the ACTUAL current tax bill from the county appraisal district — don't trust Zillow's estimate.",
    related: ["noi", "capRate"],
  },
  insurance: {
    term: "Insurance",
    slug: "insurance",
    category: "expense",
    definition:
      "Annual landlord insurance. Typically 0.3-0.7% of property value for SFR; higher in coastal/storm zones.",
    whyItMatters:
      "Insurance has been the most-moved-against expense in rental investing since 2020. FL/LA/coastal TX up 25-40% in 5 years. Always quote insurance YOURSELF before signing a contract — don't trust the seller's last-year number.",
    related: ["noi", "capRate"],
  },
  maintenance: {
    term: "Maintenance Reserve",
    slug: "maintenance-reserve",
    category: "expense",
    definition:
      "A planning reserve for routine repairs; the appropriate amount depends on the property's systems, condition, service history, and operating plan.",
    whyItMatters:
      "Building age is only a screening signal, not a reserve multiplier. Size maintenance and capital reserves from the inspection, remaining useful life of major systems, service history, quotes, warranties, and an explicit contingency for unknowns.",
    related: ["capex", "noi"],
  },
  management: {
    term: "Management Fee",
    slug: "management-fee",
    category: "expense",
    definition:
      "Property management cost as % of collected rent. Typical PM fees: 8-10%. Set to 0 if you self-manage.",
    whyItMatters:
      "Always include 8-10% management in your underwrite even if you plan to self-manage. Why? Your time has cost. AND if you ever sell or hand off the property, the next owner will need PM in the model. A deal that only works at 0% management is a fragile deal.",
    related: ["noi", "capRate"],
  },
  capex: {
    term: "CapEx (Capital Expenditures)",
    slug: "capex",
    also: ["Capital expenditures"],
    category: "expense",
    definition:
      "Reserves for large infrequent repairs — roof, HVAC, water heater. Typically 5–10% of rent set aside each month.",
    whyItMatters:
      "Capex differs from maintenance — these are the BIG fixes (roof = $10-20k, HVAC = $5-10k). Even at 5% of rent, you're only saving $100/mo on a $2k rental, which doesn't cover a roof replacement in 10 years. Adjust upward for older buildings.",
    related: ["maintenance", "noi"],
  },
  vacancy: {
    term: "Vacancy Reserve",
    slug: "vacancy",
    also: ["Vacancy rate"],
    category: "expense",
    definition:
      "Reserve for months without a paying tenant. Typically 5–8% of gross rent, depending on the market.",
    whyItMatters:
      "Vacancy is the most-under-budgeted line item in new-investor underwrites. Real vacancy is 6-10% in most markets, NOT the 3% the listing pro-forma shows. Even a single 30-day turnover = 8.3% vacancy for that year.",
    related: ["noi", "maintenance"],
    postUrl: "/blog/vacancy-rate-rental-property",
  },
  hoa: {
    term: "HOA Fees",
    slug: "hoa-fees",
    category: "expense",
    definition:
      "Monthly homeowners association dues, if applicable. Often covers exterior maintenance, common-area landscaping, and shared amenities.",
    whyItMatters:
      "HOAs are an expense killer in many condo/townhome deals. They go UP, never down, and special assessments can hit $5-20k. Always pull the HOA's last 2 years of financials + reserve study before buying a condo as an investment.",
    related: ["noi", "capRate"],
  },
  utilities: {
    term: "Owner-Paid Utilities",
    slug: "owner-paid-utilities",
    category: "expense",
    definition:
      "Monthly utilities the owner covers — water/sewer, trash, sometimes gas. Most SFRs put utilities on the tenant; multi-family deals often split them.",
    whyItMatters:
      "On multi-family without separate meters, utilities can be $200-500/mo of NOI killer. Sub-metering or RUBS (Ratio Utility Billing) is one of the highest-ROI improvements you can make to a small multi-family.",
    related: ["noi"],
  },

  // ─── FUNDAMENTALS ───
  arv: {
    term: "ARV (After-Repair Value)",
    slug: "arv",
    also: ["After Repair Value"],
    category: "fundamental",
    definition:
      "What the property would sell for once rehab is complete. The most important — and most-mis-estimated — input in any BRRRR or flip.",
    example:
      "A $80,000 distressed property with $30,000 of rehab and an ARV of $150,000 has equity creation of $40,000 ($150k − $80k − $30k).",
    whyItMatters:
      "ARV is a high-sensitivity assumption in BRRRR and flip plans. Build it from relevant closed comps and test multiple downside values; there is no reliable market-wide appraisal haircut that substitutes for property-specific evidence.",
    related: ["brrrr", "ltv"],
  },
  buildingValue: {
    term: "Building Value %",
    slug: "building-value",
    category: "fundamental",
    definition:
      "Portion of purchase price allocated to depreciable building (not land). Defaults to 80% for SFR; land value varies by market.",
    whyItMatters:
      "A supported allocation to depreciable building affects the modeled depreciation deduction. The allocation must be grounded in the property's facts; a default percentage is only an input assumption, and passive-loss and other limits determine the actual tax effect.",
    related: ["depreciationYears", "taxSavings"],
  },
  depreciationYears: {
    term: "Depreciation Period",
    slug: "depreciation-period",
    category: "fundamental",
    definition:
      "27.5 years for residential rentals (IRS standard); 39 years for commercial. Determines annual non-cash depreciation deduction.",
    whyItMatters:
      "Depreciation is a non-cash deduction, not a promised current tax saving. Basis allocation, placed-in-service conventions, personal use, passive-activity, basis, at-risk, and sale rules can change when or whether the modeled deduction reduces tax.",
    related: ["taxSavings", "buildingValue"],
  },

  proForma: {
    term: "Pro Forma",
    slug: "pro-forma",
    category: "fundamental",
    definition:
      "A projection of a property's future operating performance, as opposed to the seller's trailing actuals.",
    whyItMatters:
      "Brokers always pitch pro-forma cap rates built on optimistic rent bumps and thin expense assumptions. Use pro forma for triage; for the actual offer, recompute with trailing actuals plus your own conservative growth assumptions.",
    related: ["noi", "capRate", "rentGrowth", "expenseGrowth"],
    postUrl: "/blog/rental-property-pro-forma-explained",
  },
  rehab: {
    term: "Rehab",
    slug: "rehab",
    also: ["Renovation"],
    category: "fundamental",
    definition:
      "Repairs and updates to a property — cosmetic (paint, flooring, fixtures), systems (HVAC, electrical, plumbing), or structural.",
    whyItMatters:
      "BRRRR investors deliberately buy properties that need rehab so the post-renovation appraisal supports pulling most of their cash back out. Underestimating rehab is the single most common way a BRRRR deal fails.",
    related: ["brrrr", "arv", "capex", "mao"],
    toolUrl: "/tools/rehab-cost-estimator",
    postUrl: "/blog/how-to-estimate-rehab-costs",
  },
  fairMarketRent: {
    term: "Fair Market Rent",
    slug: "fair-market-rent",
    also: ["FMR"],
    category: "fundamental",
    definition:
      "HUD's annual estimate of 40th-percentile gross rent for a standard-quality unit in an FMR area and bedroom count. FMRs are used in several housing programs, including as an input to Housing Choice Voucher payment standards.",
    whyItMatters:
      "FMR is an area benchmark, not an address-level market comp, rent floor, payment standard, approved contract rent, or collection promise. TrueCap can prefill it from HUD, but you should replace it with current comparable leases and property-specific program figures where applicable.",
    related: ["vacancy", "rentGrowth"],
  },
  principalPaydown: {
    term: "Principal Paydown",
    slug: "principal-paydown",
    category: "fundamental",
    definition:
      "The portion of each mortgage payment that reduces the loan balance rather than paying interest.",
    whyItMatters:
      "Principal paydown is real wealth building — your tenant retires your loan — but it never shows up in cash flow. On a typical 30-year mortgage, year 1 is ~80% interest / 20% principal; year 25 is the inverse.",
    related: ["loanTerm", "interestRate", "ltv", "equityMultiple"],
  },
  // ─── PROJECTION ASSUMPTIONS ───
  rentGrowth: {
    term: "Rent Growth %",
    slug: "rent-growth",
    category: "projection",
    definition:
      "Editable annual rent-change assumption used in the 10-year projection; it is not a forecast or permitted increase.",
    whyItMatters:
      "Different assumptions compound into materially different year-10 results. Use current property and submarket evidence, verify applicable rent rules, and run flat and downside cases.",
    related: ["irr", "appreciation"],
  },
  expenseGrowth: {
    term: "Expense Growth %",
    slug: "expense-growth",
    category: "projection",
    definition:
      "Editable annual operating-expense change assumption used in the projection.",
    whyItMatters:
      "Taxes, insurance, utilities, labor, repairs, and other expenses can move differently from rent and from one another. Use current evidence and model expense growth that equals or exceeds rent growth as a downside case.",
    related: ["rentGrowth", "noi"],
  },
  appreciation: {
    term: "Appreciation Rate",
    slug: "appreciation-rate",
    category: "projection",
    definition:
      "Your editable assumption for annual property-value change.",
    whyItMatters:
      "Small assumed rates compound into large modeled exit differences. Build the base case from current local evidence and include flat and declining-value scenarios; no market tier guarantees appreciation.",
    related: ["irr", "rentGrowth"],
  },
  sellingCost: {
    term: "Selling Cost %",
    slug: "selling-cost",
    category: "projection",
    definition:
      "An editable sale-cost assumption that can include brokerage compensation, transfer taxes, title or legal fees, concessions, and other transaction-specific costs.",
    whyItMatters:
      "Selling costs reduce modeled net sale proceeds and can materially change IRR. For illustration, an entered 8% cost on a $500,000 modeled sale is $40,000; obtain transaction- and jurisdiction-specific estimates rather than treating that example as typical or as a reason to choose a holding strategy.",
    related: ["irr"],
  },
};

/** Convenience: list of all slugs, sorted alphabetically. */
export const GLOSSARY_SLUGS: string[] = Object.values(GLOSSARY)
  .map((e) => e.slug)
  .sort();

/** Get an entry by slug (for /glossary/[slug] lookups). */
export function getGlossaryEntryBySlug(slug: string): GlossaryEntry | null {
  return Object.values(GLOSSARY).find((e) => e.slug === slug) ?? null;
}

/** Get all entries in a category. */
export function getGlossaryEntriesByCategory(
  category: GlossaryCategory,
): GlossaryEntry[] {
  return Object.values(GLOSSARY)
    .filter((e) => e.category === category)
    .sort((a, b) => a.term.localeCompare(b.term));
}

/** Human-readable category labels for the index page. */
export const GLOSSARY_CATEGORY_LABELS: Record<GlossaryCategory, string> = {
  metric: "Metrics",
  strategy: "Strategies",
  financing: "Financing",
  expense: "Operating expenses",
  fundamental: "Property fundamentals",
  projection: "Projection assumptions",
};
