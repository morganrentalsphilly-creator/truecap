/**
 * TrueCap Underwriting Standard
 *
 * This is the public, versioned contract for the core rental underwriting
 * engine. Keep formula definitions here and implementation arithmetic in
 * calc-analysis.ts. A formula change requires a version bump, test updates,
 * and a methodology-page release note; copy-only changes do not.
 */

export const TRUECAP_UNDERWRITING_STANDARD_VERSION = "1.0" as const;
/**
 * Opt-in first-year core. v1 remains the public/default contract until every
 * save/share/report surface can persist v2 snapshots without mutation.
 */
export const TRUECAP_UNDERWRITING_STANDARD_V2_VERSION = "2.0" as const;
export type TrueCapUnderwritingStandardVersion =
  | typeof TRUECAP_UNDERWRITING_STANDARD_VERSION
  | typeof TRUECAP_UNDERWRITING_STANDARD_V2_VERSION;
export const TRUECAP_UNDERWRITING_STANDARD_NAME = "TrueCap Underwriting Standard" as const;
/** Deal Score is part of the same saved-decision contract as the financial
 * outputs. A material score-arithmetic change therefore bumps the whole
 * underwriting standard instead of drifting behind an unrelated version. */
export const TRUECAP_DEAL_SCORE_METHODOLOGY_VERSION =
  TRUECAP_UNDERWRITING_STANDARD_VERSION;

export type UnderwritingFormulaKey =
  | "grossScheduledIncome"
  | "otherIncome"
  | "vacancyAllowance"
  | "effectiveGrossIncome"
  | "propertyTaxes"
  | "insurance"
  | "repairsMaintenance"
  | "management"
  | "utilitiesAndHoa"
  | "capexReserve"
  | "operatingExpenses"
  | "noi"
  | "mortgagePayment"
  | "annualDebtService"
  | "beforeTaxCashFlow"
  | "totalCashRequired"
  | "capRate"
  | "cashOnCashReturn"
  | "dscr"
  | "dealScore"
  | "maxOffer"
  | "brrrrRefinance"
  | "fixAndFlip"
  | "illustrativeTaxImpact"
  | "appreciation"
  | "loanAmortization"
  | "saleProceeds"
  | "totalProfit"
  | "irr"
  | "equityBuildup";

export type UnderwritingFormulaDefinition = {
  label: string;
  formula: string;
  convention: string;
};

/**
 * Human-readable definitions used by trust surfaces and tests. They describe
 * the exact conventions implemented in calculateAnalysis().
 */
export const UNDERWRITING_FORMULAS: Record<
  UnderwritingFormulaKey,
  UnderwritingFormulaDefinition
> = {
  grossScheduledIncome: {
    label: "Gross scheduled income",
    formula: "Monthly rental income × 12",
    convention: "Uses entered unit rents, or ADR × occupancy for short-term rentals.",
  },
  otherIncome: {
    label: "Other income",
    formula: "Not modeled as a separate income line in Standard v1.0",
    convention:
      "Do not silently add laundry, parking, pet, or utility income to the rent field; model it outside TrueCap unless a future version adds a dedicated input.",
  },
  vacancyAllowance: {
    label: "Vacancy allowance",
    formula: "Gross scheduled rental income × entered vacancy percentage",
    convention: "Shown as foregone income above NOI, not as a cash operating bill.",
  },
  effectiveGrossIncome: {
    label: "Effective gross income",
    formula: "Gross scheduled income − vacancy allowance",
    convention: "Vacancy is modeled as a percentage of scheduled rental income.",
  },
  propertyTaxes: {
    label: "Property taxes",
    formula: "Entered annual parcel amount ÷ 12, otherwise purchase price × entered/benchmark rate ÷ 12",
    convention: "The state benchmark is editable and is not a parcel tax bill.",
  },
  insurance: {
    label: "Insurance",
    formula: "Entered monthly premium, otherwise purchase price × entered/default annual rate ÷ 12",
    convention: "A default is an estimate, not a carrier quote.",
  },
  repairsMaintenance: {
    label: "Repairs and maintenance reserve",
    formula: "Gross scheduled rental income × entered maintenance percentage",
    convention: "Included in operating expenses and NOI.",
  },
  management: {
    label: "Property management",
    formula: "Gross scheduled rental income × entered management percentage",
    convention: "Included even for self-management when the user elects to model it.",
  },
  utilitiesAndHoa: {
    label: "Owner-paid utilities and HOA",
    formula: "Entered monthly utilities + entered monthly HOA",
    convention: "Zero means no cost was modeled; it is not proof the property has no such cost.",
  },
  capexReserve: {
    label: "Capital-expenditure reserve",
    formula: "Gross scheduled rental income × entered CapEx percentage",
    convention:
      "A below-NOI cash reserve. It reduces cash flow and CoC, but is not treated as a current tax deduction.",
  },
  operatingExpenses: {
    label: "Operating expenses",
    formula:
      "Property tax + insurance + HOA + utilities + maintenance + management",
    convention:
      "Excludes financing, PMI, vacancy, and the CapEx reserve. Vacancy is reflected in effective gross income; CapEx is a below-the-line reserve.",
  },
  noi: {
    label: "Net operating income (NOI)",
    formula: "Effective gross income − operating expenses",
    convention: "Excludes debt service, PMI, income tax, and the CapEx reserve.",
  },
  annualDebtService: {
    label: "Annual debt service",
    formula: "Monthly principal and interest × 12",
    convention:
      "Uses scheduled mortgage principal and interest. Estimated PMI/MIP is excluded from lender-style DSCR but included in cash flow.",
  },
  mortgagePayment: {
    label: "Mortgage principal and interest",
    formula: "L × [r(1+r)^n] ÷ [(1+r)^n − 1]",
    convention: "Fully amortizing fixed-rate payment; 0% interest uses principal ÷ payment count.",
  },
  beforeTaxCashFlow: {
    label: "Before-tax cash flow",
    formula:
      "Scheduled rent − vacancy − operating expenses − CapEx reserve − principal and interest − PMI/MIP",
    convention: "Reported monthly and annually before any illustrative income-tax effect.",
  },
  totalCashRequired: {
    label: "Total initial cash required",
    formula: "Down payment + closing costs + entered rehab + entered STR startup/furnishing cost",
    convention: "Does not claim to include lender reserves or every settlement adjustment.",
  },
  capRate: {
    label: "Capitalization rate",
    formula: "Annual NOI ÷ purchase price",
    convention: "Independent of financing and expressed as a percentage.",
  },
  cashOnCashReturn: {
    label: "Cash-on-cash return",
    formula: "Annual before-tax cash flow ÷ total initial cash required",
    convention:
      "Initial cash includes down payment, closing costs, entered rehab, and entered STR furnishing/startup costs.",
  },
  dscr: {
    label: "Debt-service coverage ratio (DSCR)",
    formula: "Annual NOI ÷ annual principal-and-interest debt service",
    convention: "Cash purchases are displayed as not applicable and use 0 as the stored sentinel.",
  },
  dealScore: {
    label: "Screening Index (Balanced)",
    formula:
      "Round and clamp to 0–100: cash-flow points + CoC points + cap-rate points + DSCR points + projected-return points + risk penalty",
    convention:
      "Balanced investment-property maxima are 22, 20, 16, 17, and 25 points. The projected return excludes annual personal-tax benefits but nets modeled selling costs and federal exit-tax defaults. Owner-occupant cash flow instead uses a 30-point maximum before the final 0–100 clamp. Risk penalties are capped at −30; recommendation bands are 75 / 55 / 35 / 18. Qualifying appreciation-play rules are disclosed on the methodology page. The index is secondary triage context, not selected-rule fit, evidence readiness, a probability, an appraisal, or investment advice.",
  },
  maxOffer: {
    label: "Offer Ceiling",
    formula: "Highest tested purchase price at which every selected target still passes",
    convention:
      "Solved through the canonical engine and rounded down to a $500 step; returns null when the targets cannot be met inside the tested range. It is a target-dependent modeled boundary, not a recommended offer.",
  },
  brrrrRefinance: {
    label: "BRRRR refinance",
    formula:
      "New loan = ARV × refi LTV; net refi cash = new loan − original loan payoff − refi costs",
    convention:
      "Cash left in the deal includes acquisition cash, rehab, carrying costs, and any refi shortfall. ARV and refi terms are user assumptions.",
  },
  fixAndFlip: {
    label: "Fix-and-flip profit",
    formula:
      "ARV − purchase price − acquisition closing costs − rehab − carrying costs − selling costs",
    convention:
      "Excludes income tax and assumes financing interest is included in the entered monthly carrying cost.",
  },
  illustrativeTaxImpact: {
    label: "Illustrative tax impact",
    formula:
      "−(scheduled rent − modeled vacancy/opex − eligible mortgage interest − straight-line depreciation) × entered marginal rate",
    convention:
      "A signed planning illustration, not tax advice. It does not establish placed-in-service timing, basis, passive-loss usability, eligibility, or the user's actual tax liability.",
  },
  appreciation: {
    label: "Projected property value",
    formula: "Purchase price × (1 + entered annual appreciation rate)^hold years",
    convention: "A user-controlled scenario assumption, not a forecast.",
  },
  loanAmortization: {
    label: "Loan amortization",
    formula: "Each month: interest = opening balance × monthly rate; principal = payment − interest",
    convention: "Scheduled fixed-rate amortization; extra payments, adjustable rates, and lender-specific rounding are not modeled.",
  },
  saleProceeds: {
    label: "Net sale proceeds",
    formula: "Projected property value − remaining loan balance − modeled selling costs",
    convention: "Before the separately modeled illustrative exit-tax estimate.",
  },
  totalProfit: {
    label: "Modeled total profit",
    formula:
      "Net sale proceeds + cumulative cash flow + cumulative illustrative tax effect − initial cash invested − modeled exit tax",
    convention: "Nominal modeled dollars over the selected hold; not annualized and not guaranteed.",
  },
  irr: {
    label: "Internal rate of return (IRR)",
    formula: "Rate that makes NPV of initial cash, annual cash flows, and final net sale proceeds equal zero",
    convention: "Returns no value when the modeled cash-flow sequence has no bracketed real solution.",
  },
  equityBuildup: {
    label: "Modeled equity",
    formula: "Projected property value − scheduled remaining loan balance",
    convention: "Depends on the entered appreciation scenario and scheduled amortization; it is not an appraisal.",
  },
};

/**
 * Formula registry for the opt-in v2 first-year core. Unchanged secondary
 * formulas are inherited deliberately; the entries below are the reviewed
 * differences from v1. Keeping a separate registry prevents documentation or
 * a UI label from silently changing the meaning of a historical v1 result.
 */
export const UNDERWRITING_V2_FORMULAS: Record<
  UnderwritingFormulaKey,
  UnderwritingFormulaDefinition
> = {
  ...UNDERWRITING_FORMULAS,
  grossScheduledIncome: {
    label: "Gross scheduled income",
    formula: "Selected scenario scheduled rent + recurring other income",
    convention:
      "Current and stabilized rents remain separate; only the explicitly selected scenario enters the result.",
  },
  otherIncome: {
    label: "Recurring other income",
    formula: "Entered recurring other monthly income × 12",
    convention:
      "Included in gross scheduled income and therefore in the vacancy allowance; acquisition credits are not income.",
  },
  vacancyAllowance: {
    label: "Vacancy and credit-loss allowance",
    formula: "Gross scheduled income × entered vacancy percentage",
    convention:
      "Applied to scheduled rent plus recurring other income and shown above NOI.",
  },
  effectiveGrossIncome: {
    label: "Effective gross income",
    formula: "Gross scheduled income − vacancy and credit-loss allowance",
    convention: "Uses exact annual values before display rounding.",
  },
  propertyTaxes: {
    label: "Property taxes",
    formula: "Entered annual parcel amount, otherwise purchase price × entered/default annual rate",
    convention: "Calculated annually without intermediate monthly rounding.",
  },
  insurance: {
    label: "Insurance",
    formula: "Entered monthly premium × 12, otherwise purchase price × entered/default annual rate",
    convention: "Calculated annually without intermediate monthly rounding.",
  },
  repairsMaintenance: {
    label: "Repairs and maintenance reserve",
    formula: "Gross scheduled income × entered maintenance percentage",
    convention:
      "A recurring operating expense in NOI; entered immediate repairs are a separate cash acquisition use.",
  },
  management: {
    label: "Property management",
    formula: "Gross scheduled income × entered management percentage",
    convention: "Included in NOI; an explicit 0 remains distinct from a missing value.",
  },
  utilitiesAndHoa: {
    label: "Owner-paid utilities, HOA, and other recurring expense",
    formula:
      "(Entered monthly utilities + HOA + recurring other expense) × 12",
    convention: "Each category requires an explicit amount in v2; zero is allowed.",
  },
  capexReserve: {
    label: "Replacement/CapEx reserve",
    formula: "Gross scheduled income × entered replacement-reserve percentage",
    convention: "Excluded from lender-style NOI but deducted from investor cash flow.",
  },
  operatingExpenses: {
    label: "Operating expenses",
    formula:
      "Property tax + insurance + HOA + utilities + maintenance + management + recurring other expense",
    convention:
      "Excludes vacancy, debt service, PMI, income tax, immediate repairs, and the replacement reserve.",
  },
  noi: {
    label: "Net operating income (NOI)",
    formula: "Effective gross income − operating expenses",
    convention: "Uses exact annual values and excludes financing and the replacement reserve.",
  },
  mortgagePayment: {
    label: "Mortgage principal and interest",
    formula: "L × [r(1+r)^n] ÷ [(1+r)^n − 1]",
    convention:
      "L follows the selected cash, percent-down, fixed-down, or fixed-loan semantics; no intermediate payment rounding.",
  },
  annualDebtService: {
    label: "Annual debt service",
    formula: "Exact monthly principal and interest × 12",
    convention: "PMI/MIP remains outside model DSCR and inside investor cash flow.",
  },
  beforeTaxCashFlow: {
    label: "Pre-tax cash flow after replacement reserve",
    formula: "NOI − annual debt service − replacement reserve − PMI/MIP",
    convention: "Reported monthly as the exact annual result ÷ 12 before display rounding.",
  },
  totalCashRequired: {
    label: "Total initial cash invested",
    formula:
      "Equity + closing costs + loan fees + cash repairs + initial reserve − acquisition credits",
    convention:
      "Immediate repairs remain cash-funded and are never silently added to the acquisition loan.",
  },
  capRate: {
    label: "Capitalization rate",
    formula: "Annual NOI ÷ purchase price",
    convention: "Independent of financing and based on exact annual NOI.",
  },
  cashOnCashReturn: {
    label: "Cash-on-cash return",
    formula: "Annual pre-tax cash flow after replacement reserve ÷ total initial cash invested",
    convention: "Credits reduce the denominator; all acquisition cash uses remain explicit.",
  },
  dscr: {
    label: "Model DSCR",
    formula: "Exact annual NOI ÷ exact annual principal-and-interest debt service",
    convention: "Cash purchases use 0 as the stored not-applicable sentinel.",
  },
};

export const UNDERWRITING_FORMULAS_BY_VERSION = {
  [TRUECAP_UNDERWRITING_STANDARD_VERSION]: UNDERWRITING_FORMULAS,
  [TRUECAP_UNDERWRITING_STANDARD_V2_VERSION]: UNDERWRITING_V2_FORMULAS,
} as const;

export const UNDERWRITING_V2_CORE_RELEASE = {
  version: TRUECAP_UNDERWRITING_STANDARD_V2_VERSION,
  effectiveDate: "2026-08-24",
  status: "opt-in",
  summary:
    "Exact annual first-year core with explicit scenarios, financing semantics, acquisition cash uses, other income/expense, and unknown-value gates.",
} as const;

export const UNDERWRITING_STANDARD_RELEASE_NOTES = [
  {
    version: TRUECAP_UNDERWRITING_STANDARD_VERSION,
    effectiveDate: "2026-08-15",
    summary:
      "Initial published standard: lender-style NOI and DSCR, below-the-line CapEx reserve, PMI in cash flow, and signed illustrative tax impact.",
  },
] as const;
