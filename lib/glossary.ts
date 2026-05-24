/**
 * Single source of truth for in-app financial-term tooltips.
 *
 * Keep entries short — a one-sentence definition and (optional) a quick
 * "what's a good number" benchmark. Anything longer belongs in a /tools
 * page where readers can dig in.
 */

export type GlossaryEntry = {
  term: string;
  /** Plain-English one-sentence definition. */
  definition: string;
  /** Optional second sentence: a "what's a good number" benchmark. */
  benchmark?: string;
};

export const GLOSSARY: Record<string, GlossaryEntry> = {
  capRate: {
    term: "Cap Rate",
    definition:
      "Net Operating Income ÷ property value. The unleveraged return a property generates, independent of financing.",
    benchmark:
      "Typical: 5–6% in Tier-1 coastal, 6–8% Midwest / Sun Belt, 8–10% cash-flow markets.",
  },
  coc: {
    term: "Cash-on-Cash Return",
    definition:
      "Annual cash flow ÷ total cash invested (down payment + closing + rehab). Tells you how hard your money is working.",
    benchmark: "Most buy-and-hold investors target 8–12%.",
  },
  cashFlow: {
    term: "Monthly Cash Flow",
    definition:
      "Rent minus operating expenses minus mortgage payment. The cash that lands in your account each month.",
  },
  dscr: {
    term: "DSCR (Debt Service Coverage Ratio)",
    definition:
      "Net Operating Income ÷ mortgage payment. Measures whether the property's income comfortably covers debt service.",
    benchmark:
      "Lenders typically want ≥1.25 for investment loans; 1.0 means exactly break-even on debt service.",
  },
  noi: {
    term: "NOI (Net Operating Income)",
    definition:
      "Gross annual rent minus all operating expenses, before debt service and income tax.",
  },
  arv: {
    term: "ARV (After-Repair Value)",
    definition:
      "What the property would sell for once rehab is complete. The most important — and most-mis-estimated — input in any BRRRR or flip.",
  },
  irr: {
    term: "IRR (Internal Rate of Return)",
    definition:
      "Annualized return over the full hold period, including cash flow, principal paydown, appreciation, and exit proceeds.",
  },
  ltv: {
    term: "LTV (Loan-to-Value)",
    definition:
      "Loan amount divided by property value. Most cash-out refi lenders cap LTV at 75% for investment properties.",
  },
  capex: {
    term: "CapEx (Capital Expenditures)",
    definition:
      "Reserves for large infrequent repairs — roof, HVAC, water heater. Typically 5–10% of rent set aside each month.",
  },
  vacancy: {
    term: "Vacancy Reserve",
    definition:
      "Reserve for months without a paying tenant. Typically 5–8% of gross rent, depending on the market.",
  },
  mao: {
    term: "Maximum Allowable Offer",
    definition:
      "The highest price you should pay to still hit your target cap rate, cash-on-cash, and cash flow thresholds.",
  },
  dealScore: {
    term: "Deal Score",
    definition:
      "A 0–100 composite of cap rate, cash-on-cash, monthly cash flow, and DSCR. Use it to triage deals in seconds.",
  },
  taxSavings: {
    term: "Tax Savings",
    definition:
      "Estimated monthly federal income tax saved by depreciation and (optionally) mortgage interest deduction at your marginal rate.",
  },
  afterTaxCF: {
    term: "After-Tax Cash Flow",
    definition:
      "Monthly cash flow plus estimated monthly tax savings from depreciation. The real number that hits your pocket post-tax.",
  },
  brrrr: {
    term: "BRRRR",
    definition:
      "Buy, Rehab, Rent, Refinance, Repeat. A strategy that recycles capital across deals by refinancing based on the post-rehab value.",
  },
  onePercentRule: {
    term: "1% Rule",
    definition:
      "Rule of thumb: monthly rent should equal at least 1% of purchase price. A 5-second screening filter, not a verdict.",
  },
};
