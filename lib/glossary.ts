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
};

export const GLOSSARY: Record<string, GlossaryEntry> = {
  // ─── METRICS ───
  capRate: {
    term: "Cap Rate",
    slug: "cap-rate",
    category: "metric",
    definition:
      "Net Operating Income ÷ property value. The unleveraged return a property generates, independent of financing.",
    benchmark:
      "Typical: 5–6% in Tier-1 coastal, 6–8% Midwest / Sun Belt, 8–10% cash-flow markets.",
    formula: "Cap Rate = NOI ÷ Property Value",
    example:
      "A property with $36,000 of NOI ($60k gross rent minus $24k expenses) and a $450,000 purchase price has a cap rate of $36,000 ÷ $450,000 = 8.0%.",
    whyItMatters:
      "Cap rate lets you compare properties on an apples-to-apples basis regardless of financing. It's also how commercial properties (5+ units) are valued — buyers price them on NOI ÷ market cap rate.",
    related: ["noi", "coc", "dscr", "onePercentRule"],
    toolUrl: "/tools/cap-rate-calculator",
  },
  coc: {
    term: "Cash-on-Cash Return",
    slug: "cash-on-cash-return",
    category: "metric",
    definition:
      "Annual cash flow ÷ total cash invested (down payment + closing + rehab). Tells you how hard your money is working.",
    benchmark: "Most buy-and-hold investors target 8–12%.",
    formula: "CoC = Annual Cash Flow ÷ Total Cash Invested",
    example:
      "If you put $80,000 down on a $400,000 property and collect $8,800/yr in cash flow, your CoC is $8,800 ÷ $80,000 = 11.0%.",
    whyItMatters:
      "Cash-on-cash is the metric leveraged investors should optimize for. It captures the actual return on YOUR money — cap rate doesn't, because it ignores financing.",
    related: ["capRate", "cashFlow", "irr", "dscr"],
    toolUrl: "/tools/cash-on-cash-calculator",
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
    category: "metric",
    definition:
      "Net Operating Income ÷ mortgage payment. Measures whether the property's income comfortably covers debt service.",
    benchmark:
      "Lenders typically want ≥1.25 for investment loans; 1.0 means exactly break-even on debt service.",
    formula: "DSCR = NOI ÷ Annual Debt Service",
    example:
      "A property with $36,000 NOI and $24,000 of annual mortgage payments has DSCR = $36,000 ÷ $24,000 = 1.50.",
    whyItMatters:
      "DSCR is the constraint metric on every investment-property loan. Below 1.20–1.25, most lenders won't fund the deal at all. DSCR also tells you how much safety margin the property has.",
    related: ["noi", "capRate", "ltv"],
    toolUrl: "/tools/dscr-calculator",
  },
  noi: {
    term: "NOI (Net Operating Income)",
    slug: "noi",
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
    toolUrl: "/tools/noi-calculator",
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
  mao: {
    term: "Maximum Allowable Offer (MAO)",
    slug: "max-allowable-offer",
    category: "metric",
    definition:
      "The highest price you should pay to still hit your target cap rate, cash-on-cash, and cash flow thresholds.",
    formula:
      "MAO = work backward from your target metrics (target cap rate, target CoC) given the property's NOI and your financing assumptions.",
    example:
      "A property with $32,000 NOI at your target 7.5% cap rate has MAO = $32,000 ÷ 0.075 = $426,666.",
    whyItMatters:
      "MAO gives you a hard ceiling for negotiation. You go into the offer conversation knowing 'anything above $X breaks my model' — way more powerful than haggling without a number.",
    related: ["capRate", "coc", "dealScore"],
  },
  dealScore: {
    term: "Deal Score",
    slug: "deal-score",
    category: "metric",
    definition:
      "A 0–100 composite of cap rate, cash-on-cash, monthly cash flow, and DSCR. Use it to triage deals in seconds.",
    whyItMatters:
      "Deal Score gives you a single number to compare deals across markets quickly. It's a triage tool — not a substitute for the full underwrite. But it's powerful for sorting 20 deals into 'open the analyzer' vs 'walk.'",
    related: ["capRate", "coc", "dscr", "cashFlow"],
  },
  taxSavings: {
    term: "Tax Savings",
    slug: "tax-savings",
    category: "metric",
    definition:
      "Estimated monthly federal income tax saved by depreciation and (optionally) mortgage interest deduction at your marginal rate.",
    whyItMatters:
      "Depreciation is the secret weapon of rental investing. A $400k property with 80% building value depreciates ~$11,600/yr (over 27.5 years), saving a 32% bracket investor ~$3,700/yr in tax — which is real after-tax cash flow you don't see in the basic numbers.",
    related: ["afterTaxCF", "depreciationYears", "buildingValue"],
  },
  afterTaxCF: {
    term: "After-Tax Cash Flow",
    slug: "after-tax-cash-flow",
    category: "metric",
    definition:
      "Monthly cash flow plus estimated monthly tax savings from depreciation. The real number that hits your pocket post-tax.",
    whyItMatters:
      "Most investors compare deals on pre-tax cash flow, but the post-tax number can shift the verdict. A deal that looks marginal pre-tax often pencils strongly after depreciation savings, especially for high-bracket investors.",
    related: ["cashFlow", "taxSavings", "depreciationYears"],
  },

  // ─── STRATEGY ───
  brrrr: {
    term: "BRRRR",
    slug: "brrrr",
    category: "strategy",
    definition:
      "Buy, Rehab, Rent, Refinance, Repeat. A strategy that recycles capital across deals by refinancing based on the post-rehab value.",
    example:
      "Buy $80k. Rehab $30k. ARV $150k. Refi at 75% LTV → pull out $112.5k. Net capital in deal after refi: ~$0. Repeat.",
    whyItMatters:
      "BRRRR is the highest-leverage strategy in real estate when conditions are right (cheap distressed properties + appraisable rehab gains + capital-friendly refi rates). The trap: most deals fail at the refi step because the appraised ARV doesn't support the planned cash-out.",
    related: ["arv", "ltv", "capRate"],
    toolUrl: "/tools/brrrr-calculator",
  },
  onePercentRule: {
    term: "1% Rule",
    slug: "1-percent-rule",
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

  // ─── FINANCING ───
  ltv: {
    term: "LTV (Loan-to-Value)",
    slug: "ltv",
    category: "financing",
    definition:
      "Loan amount divided by property value. Most cash-out refi lenders cap LTV at 75% for investment properties.",
    formula: "LTV = Loan Amount ÷ Property Value",
    example:
      "A $300,000 loan on a $400,000 property = 75% LTV.",
    whyItMatters:
      "LTV is the lender's risk gauge. Lower LTV = more equity buffer = lower lender risk = better rate for you. Above 75% LTV on investment properties, your options narrow to higher-rate non-QM lenders.",
    related: ["downPayment", "dscr", "brrrr"],
  },
  downPayment: {
    term: "Down Payment %",
    slug: "down-payment",
    category: "financing",
    definition:
      "Share of the purchase price you pay in cash. Investment-property lenders typically require 20-25% down for conventional loans.",
    example:
      "On a $400,000 property at 25% down, you bring $100,000 to closing (before closing costs).",
    whyItMatters:
      "Down payment is the inverse of LTV and the biggest driver of capital efficiency. Lower down = higher leverage = more deals = more risk. The sweet spot for most investors is 20-25% down on stable markets, 25-30% on higher-risk plays.",
    related: ["ltv", "coc", "closingCosts"],
  },
  interestRate: {
    term: "Interest Rate",
    slug: "interest-rate",
    category: "financing",
    definition:
      "Annual mortgage rate. Investment-property rates run ~0.5-1% above primary-residence rates because lenders price the higher default risk.",
    whyItMatters:
      "Interest rate has more impact on monthly cash flow than almost any other variable. A 1% rate change on a $300k loan = ~$170/mo of cash flow difference. Shop 3+ lenders on every deal — the spread between best and worst quote is usually 30-50bp.",
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

  // ─── EXPENSES ───
  propertyTax: {
    term: "Property Tax",
    slug: "property-tax",
    category: "expense",
    definition:
      "Annual property tax as a percent of value. Defaults to your state's effective rate (1.49% PA, 1.68% TX, etc.) — adjust for your county.",
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
      "Monthly reserve for routine repairs. Typical: 5-8% of rent for newer properties, 10-15% for older.",
    whyItMatters:
      "Under-reserving maintenance is the #1 reason new investors get blindsided by year-1 capex surprises. A 1925 building needs 3-5x more reserve than a 2018 build. Don't use 'national average' assumptions — adjust for your specific property's age.",
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
    category: "expense",
    definition:
      "Reserve for months without a paying tenant. Typically 5–8% of gross rent, depending on the market.",
    whyItMatters:
      "Vacancy is the most-under-budgeted line item in new-investor underwrites. Real vacancy is 6-10% in most markets, NOT the 3% the listing pro-forma shows. Even a single 30-day turnover = 8.3% vacancy for that year.",
    related: ["noi", "maintenance"],
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
    category: "fundamental",
    definition:
      "What the property would sell for once rehab is complete. The most important — and most-mis-estimated — input in any BRRRR or flip.",
    example:
      "A $80,000 distressed property with $30,000 of rehab and an ARV of $150,000 has equity creation of $40,000 ($150k − $80k − $30k).",
    whyItMatters:
      "ARV is where most BRRRR plans fall apart. Investors plan for the optimistic ARV; appraisers often come in 3-7% lower. Build a 5% ARV haircut into your underwrite for safety.",
    related: ["brrrr", "ltv"],
  },
  buildingValue: {
    term: "Building Value %",
    slug: "building-value",
    category: "fundamental",
    definition:
      "Portion of purchase price allocated to depreciable building (not land). Defaults to 80% for SFR; land value varies by market.",
    whyItMatters:
      "Higher building % = more annual depreciation = more tax savings. In land-cheap markets (Cleveland, Memphis), building can be 85-90% of value. In land-expensive coastal markets (LA, SF), it can be 50-60%. The tax outcome differs meaningfully.",
    related: ["depreciationYears", "taxSavings"],
  },
  depreciationYears: {
    term: "Depreciation Period",
    slug: "depreciation-period",
    category: "fundamental",
    definition:
      "27.5 years for residential rentals (IRS standard); 39 years for commercial. Determines annual non-cash depreciation deduction.",
    whyItMatters:
      "Depreciation is the 'phantom expense' that creates tax savings without affecting cash. A $400k property at 80% building = $11,636/yr depreciation deduction, every year for 27.5 years. For a 32%-bracket investor, that's ~$3,700/yr of tax savings = real money.",
    related: ["taxSavings", "buildingValue"],
  },

  // ─── PROJECTION ASSUMPTIONS ───
  rentGrowth: {
    term: "Rent Growth %",
    slug: "rent-growth",
    category: "projection",
    definition:
      "Annual rent increase assumption. National average ~3%; high-growth markets 4-6%. Used in 10-year projection.",
    whyItMatters:
      "Rent growth compounds powerfully in long-hold strategies. A property with 4% rent growth vs 2% over 10 years has 22% higher year-10 rent. This is where the appreciation-tier markets win on IRR even with weaker initial cash flow.",
    related: ["irr", "appreciation"],
  },
  expenseGrowth: {
    term: "Expense Growth %",
    slug: "expense-growth",
    category: "projection",
    definition:
      "Annual operating-expense inflation. National average ~2-3%; tracks CPI more closely than rent.",
    whyItMatters:
      "Expense growth almost always lags rent growth in healthy markets — that's how NOI compounds. But in inflation-shock periods (2021-2023), expenses (especially insurance + property tax) outpaced rent, eating NOI. Don't assume expense growth < rent growth blindly.",
    related: ["rentGrowth", "noi"],
  },
  appreciation: {
    term: "Appreciation Rate",
    slug: "appreciation-rate",
    category: "projection",
    definition:
      "Annual property value increase. Historical US average ~3.5%; varies dramatically by market.",
    whyItMatters:
      "Appreciation compounds enormously over 10+ years and is the lever wealth-builders pull. A 5% appreciation property over 10 years builds 63% more equity than a 2% one. The trade-off: appreciation markets usually have weaker current cash flow.",
    related: ["irr", "rentGrowth"],
  },
  sellingCost: {
    term: "Selling Cost %",
    slug: "selling-cost",
    category: "projection",
    definition:
      "Realtor commissions + transfer tax + title fees on sale. Typically 6-9% of sale price.",
    whyItMatters:
      "Selling costs eat into your IRR on the exit. A $500k sale at 8% selling cost = $40k of exit friction. This is one of the reasons long-hold strategies win — you avoid the friction by simply not selling.",
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
  category: GlossaryCategory
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
