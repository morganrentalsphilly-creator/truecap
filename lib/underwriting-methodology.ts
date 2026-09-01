/**
 * TrueCap Underwriting Standard
 *
 * This is the public, versioned contract for the core rental underwriting
 * engine. Keep formula definitions here and implementation arithmetic in
 * calc-analysis.ts. A formula change requires a version bump, test updates,
 * and a methodology-page release note; copy-only changes do not.
 *
 * The independently cached 10-year projection advanced to snapshot method v10
 * for explicit loan maturity/balloons and separate rent-linked versus fixed
 * operating assumptions.
 * The first-year standard advanced to v1.2 when rounded/duplicate loan
 * schedules were replaced. Standard v1.3 makes the Screening Index's projected
 * return explicitly pre-tax and contribution-aware. Recorded result snapshots
 * remain immutable across every public-version boundary.
 */

export const TRUECAP_UNDERWRITING_STANDARD_LEGACY_V1_VERSION = "1.0" as const;
export const TRUECAP_UNDERWRITING_STANDARD_V1_1_VERSION = "1.1" as const;
export const TRUECAP_UNDERWRITING_STANDARD_V1_2_VERSION = "1.2" as const;
export const TRUECAP_UNDERWRITING_STANDARD_VERSION = "1.3" as const;
/**
 * Opt-in first-year core. v1 remains the public/default contract until every
 * save/share/report surface can persist v2 snapshots without mutation.
 */
export const TRUECAP_UNDERWRITING_STANDARD_V2_VERSION = "2.0" as const;
export type TrueCapUnderwritingStandardVersion =
  | typeof TRUECAP_UNDERWRITING_STANDARD_LEGACY_V1_VERSION
  | typeof TRUECAP_UNDERWRITING_STANDARD_V1_1_VERSION
  | typeof TRUECAP_UNDERWRITING_STANDARD_V1_2_VERSION
  | typeof TRUECAP_UNDERWRITING_STANDARD_VERSION
  | typeof TRUECAP_UNDERWRITING_STANDARD_V2_VERSION;
export const TRUECAP_UNDERWRITING_STANDARD_NAME =
  "TrueCap Underwriting Standard" as const;
/** Screening Index arithmetic is versioned independently from the unchanged
 * v1 financial formulas. New saves record this submodel version while older
 * snapshots remain immutable and are never silently relabeled. */
/** v1.4 (2026-08-31, founder-approved): near-miss tiers. Each component
 *  gained one 1-point band just below its former floor (cash flow
 *  -$200..-$500, CoC -2..1%, cap 3..4%, DSCR 0.90..0.99) and the risk
 *  penalty is bounded so it cannot erase that credit — a shortlist keeps
 *  ORDERING deals that miss every band instead of tying them all at 0.
 *  All other bands, every recommendation threshold, and all penalties are
 *  unchanged; scores previously > 0 are unchanged unless the deal held a
 *  near-miss band. */
export const TRUECAP_DEAL_SCORE_METHODOLOGY_VERSION = "1.4" as const;

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
    label: "Gross scheduled rental income",
    formula: "Selected current or stabilized monthly rent roll × 12",
    convention:
      "Uses entered unit rents, or ADR × occupancy for short-term rentals. Recurring other income is a separate effective-income line.",
  },
  otherIncome: {
    label: "Recurring other income",
    formula: "Entered recurring other monthly income × 12",
    convention:
      "Added after the rent-only vacancy allowance. Parking, laundry, pet, and utility income are not assumed to share rental occupancy unless entered as rent.",
  },
  vacancyAllowance: {
    label: "Vacancy allowance",
    formula: "Gross scheduled rental income × entered vacancy percentage",
    convention:
      "Shown as foregone income above NOI, not as a cash operating bill.",
  },
  effectiveGrossIncome: {
    label: "Effective gross income",
    formula:
      "Gross scheduled rental income − rent vacancy − simplified renovation rent loss + recurring other income",
    convention:
      "Vacancy and renovation downtime apply to scheduled rent only. The optional renovation timing is a simplified downtime model, not a construction or lease-up lifecycle.",
  },
  propertyTaxes: {
    label: "Property taxes",
    formula:
      "Entered annual parcel amount ÷ 12, otherwise purchase price × entered rate ÷ 12; a blank rate uses the disclosed generic 1.1% preliminary fallback",
    convention:
      "Current analyses do not auto-fill a state tax rate. Enter a reviewed local bill or rate before relying on the result; legacy saves may retain a retired state estimate and must be re-verified.",
  },
  insurance: {
    label: "Insurance",
    formula:
      "Entered monthly premium, otherwise purchase price × entered/default annual rate ÷ 12",
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
    convention:
      "Included even for self-management when the user elects to model it.",
  },
  utilitiesAndHoa: {
    label: "Fixed recurring operating costs",
    formula:
      "Entered HOA + utilities + other fixed expense + turnover + leasing + landscaping + pest control + administrative cost",
    convention:
      "Each is a monthly dollar assumption. Zero means no cost was modeled; it is not proof the property has no such cost.",
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
      "Property tax + insurance + fixed recurring operating costs + rent-linked maintenance + management",
    convention:
      "Excludes financing, PMI, vacancy, and the CapEx reserve. Vacancy is reflected in effective gross income; CapEx is a below-the-line reserve.",
  },
  noi: {
    label: "Net operating income (NOI)",
    formula: "Effective gross income − operating expenses",
    convention:
      "Excludes debt service, PMI, income tax, and the CapEx reserve.",
  },
  annualDebtService: {
    label: "Annual debt service",
    formula:
      "Recurring scheduled interest-only or amortizing payments during the year",
    convention:
      "Estimated PMI/MIP and any maturity balloon are excluded from lender-style DSCR. PMI/MIP is included in recurring cash flow; a contractual balloon is shown as a separate maturity outflow and included in the 10-year financing outflow.",
  },
  mortgagePayment: {
    label: "Contractual loan payment",
    formula:
      "Interest-only phase: opening principal × monthly rate; amortizing phase: L × [r(1+r)^n] ÷ [(1+r)^n − 1]",
    convention:
      "The amortization period may differ from contractual maturity. Remaining principal at maturity is an explicitly disclosed balloon; 0% interest uses principal ÷ amortization payment count.",
  },
  beforeTaxCashFlow: {
    label: "Recurring before-tax operating cash flow",
    formula:
      "Scheduled rent − vacancy − simplified renovation rent loss + other income − operating expenses − CapEx reserve − recurring loan payment − PMI/MIP",
    convention:
      "Reported monthly and annually before any illustrative income-tax effect and excluding a maturity balloon. The 10-year schedule separately discloses and deducts any balloon. A blank mortgage-insurance rate defaults only for owner-occupant analyses; investment loans require an explicit lender premium.",
  },
  totalCashRequired: {
    label: "Total initial cash required",
    formula:
      "Down payment + fixed or percentage closing costs + loan points + origination/other lender fees + escrows/reserves + entered rehab + entered STR startup − acquisition credits",
    convention:
      "Only modeled settlement uses are included. Credits cannot exceed modeled cash uses, and lender escrows/reserves remain cash at close rather than operating expenses.",
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
      "Initial cash includes every modeled acquisition cash use and nets acquisition credits. When modeled initial cash is zero, CoC is not applicable; the historical stored 0 sentinel is excluded from display, target checks, and Screening Index CoC scoring.",
  },
  dscr: {
    label: "Debt-service coverage ratio (DSCR)",
    formula: "Annual NOI ÷ annual principal-and-interest debt service",
    convention:
      "Cash purchases are displayed as not applicable and use 0 as the stored sentinel.",
  },
  dealScore: {
    label: "Screening Index (Balanced)",
    formula:
      "Round and clamp to 0–100: applicable component points (renormalized when a component is N/A) + risk penalty",
    convention:
      "Balanced investment-property maxima are 22, 20, 16, 17, and 25 points. CoC is omitted when modeled initial cash is zero and the remaining applicable components are renormalized to the 100-point scale. The projected return is pre-tax: it excludes annual personal-tax effects and modeled exit taxes, nets modeled selling costs, and treats later negative operating cash flow as additional contributed capital. Owner-occupant cash flow instead uses a 30-point maximum before the final 0–100 clamp. Missing Year Built receives a conservative age-uncertainty modifier rather than new-construction treatment. Risk penalties are capped at −30; recommendation bands are 75 / 55 / 35 / 18. Qualifying appreciation-play rules are disclosed on the methodology page. The index is secondary triage context, not selected-rule fit, evidence readiness, a probability, an appraisal, or investment advice.",
  },
  maxOffer: {
    label: "Offer Ceiling",
    formula:
      "Highest tested purchase price at which every selected target still passes",
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
    formula:
      "Purchase price × (1 + entered annual appreciation rate)^hold years",
    convention: "A user-controlled scenario assumption, not a forecast.",
  },
  loanAmortization: {
    label: "Loan amortization",
    formula:
      "Each month: interest = opening balance × monthly rate; scheduled principal = recurring payment − interest; maturity balloon = remaining principal",
    convention:
      "Full-precision fixed-rate schedule with rounding only at display boundaries and explicit interest-only months, amortization period, contractual maturity, and balloon. Extra payments, adjustable rates, and lender-specific rounding are not modeled. Owner-occupant conventional PMI terminates when scheduled principal reaches 78% of original value. Mortgage insurance explicitly entered for a rental loan is conservatively carried through payoff because owner-home termination rules cannot be assumed. Borrower-requested cancellation is not modeled.",
  },
  saleProceeds: {
    label: "Net sale proceeds",
    formula:
      "Projected property value − remaining loan balance − modeled selling costs",
    convention: "Before the separately modeled illustrative exit-tax estimate.",
  },
  totalProfit: {
    label: "Modeled total profit",
    formula:
      "Net sale proceeds + cumulative cash flow + cumulative illustrative tax effect − initial cash invested − modeled exit tax",
    convention:
      "Nominal modeled dollars over the selected hold; not annualized and not guaranteed.",
  },
  irr: {
    label: "Internal rate of return (IRR)",
    formula:
      "Rate that makes NPV of initial cash, annual cash flows, and final net sale proceeds equal zero",
    convention:
      "Returns no value when the modeled cash-flow sequence has no bracketed real solution.",
  },
  equityBuildup: {
    label: "Modeled equity",
    formula: "Projected property value − scheduled remaining loan balance",
    convention:
      "Depends on the entered appreciation scenario and scheduled amortization; it is not an appraisal.",
  },
};

/** Historical v1.2 registry. Recorded v1.2 results retain the former projected-
 * return convention, including default federal exit-tax assumptions. New
 * underwriting must never silently relabel or recompute those snapshots. */
export const UNDERWRITING_V1_2_FORMULAS: Record<
  UnderwritingFormulaKey,
  UnderwritingFormulaDefinition
> = {
  ...UNDERWRITING_FORMULAS,
  grossScheduledIncome: {
    label: "Gross scheduled income",
    formula: "Monthly rental income × 12",
    convention:
      "Uses entered unit rents, or ADR × occupancy for short-term rentals.",
  },
  otherIncome: {
    label: "Other income",
    formula: "Not modeled as a separate income line in Standard v1.0–v1.2",
    convention:
      "Historical results did not include a dedicated recurring-other-income input.",
  },
  effectiveGrossIncome: {
    label: "Effective gross income",
    formula: "Gross scheduled income − vacancy allowance",
    convention:
      "Vacancy is modeled as a percentage of scheduled rental income.",
  },
  utilitiesAndHoa: {
    label: "Owner-paid utilities and HOA",
    formula: "Entered monthly utilities + entered monthly HOA",
    convention:
      "Zero means no cost was modeled; it is not proof the property has no such cost.",
  },
  operatingExpenses: {
    label: "Operating expenses",
    formula:
      "Property tax + insurance + HOA + utilities + maintenance + management",
    convention:
      "Excludes financing, PMI, vacancy, and the CapEx reserve. Vacancy is reflected in effective gross income; CapEx is a below-the-line reserve.",
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
    convention:
      "Fully amortizing fixed-rate payment; 0% interest uses principal ÷ payment count.",
  },
  beforeTaxCashFlow: {
    label: "Before-tax cash flow",
    formula:
      "Scheduled rent − vacancy − operating expenses − CapEx reserve − principal and interest − PMI/MIP",
    convention:
      "Reported monthly and annually before any illustrative income-tax effect. A blank mortgage-insurance rate defaults only for owner-occupant analyses; investment loans require an explicit lender premium.",
  },
  totalCashRequired: {
    label: "Total initial cash required",
    formula:
      "Down payment + closing costs + entered rehab + entered STR startup/furnishing cost",
    convention:
      "Does not claim to include lender reserves or every settlement adjustment.",
  },
  cashOnCashReturn: {
    label: "Cash-on-cash return",
    formula: "Annual before-tax cash flow ÷ total initial cash required",
    convention:
      "Initial cash includes down payment, closing costs, entered rehab, and entered STR furnishing/startup costs. When modeled initial cash is zero, CoC is not applicable; the historical stored 0 sentinel is excluded from display, target checks, and Screening Index CoC scoring.",
  },
  loanAmortization: {
    label: "Loan amortization",
    formula:
      "Each month: interest = opening balance × monthly rate; principal = payment − interest",
    convention:
      "Full-precision scheduled fixed-rate amortization with rounding only at display boundaries; extra payments, adjustable rates, and lender-specific rounding are not modeled. Owner-occupant conventional PMI terminates when scheduled principal reaches 78% of original value. Mortgage insurance explicitly entered for a rental loan is conservatively carried through payoff because owner-home termination rules cannot be assumed. Borrower-requested cancellation is not modeled.",
  },
  dealScore: {
    ...UNDERWRITING_FORMULAS.dealScore,
    convention:
      "Historical v1.2 projected return excluded annual personal-tax benefits but netted modeled selling costs and federal exit-tax defaults. Recorded v1.2 results remain frozen; new underwriting uses the pre-tax, contribution-aware v1.3 convention.",
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
    formula:
      "Entered annual parcel amount, otherwise purchase price × entered/default annual rate",
    convention: "Calculated annually without intermediate monthly rounding.",
  },
  insurance: {
    label: "Insurance",
    formula:
      "Entered monthly premium × 12, otherwise purchase price × entered/default annual rate",
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
    convention:
      "Included in NOI; an explicit 0 remains distinct from a missing value.",
  },
  utilitiesAndHoa: {
    label: "Owner-paid utilities, HOA, and other recurring expense",
    formula: "(Entered monthly utilities + HOA + recurring other expense) × 12",
    convention:
      "Each category requires an explicit amount in v2; zero is allowed.",
  },
  capexReserve: {
    label: "Replacement/CapEx reserve",
    formula: "Gross scheduled income × entered replacement-reserve percentage",
    convention:
      "Excluded from lender-style NOI but deducted from investor cash flow.",
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
    convention:
      "Uses exact annual values and excludes financing and the replacement reserve.",
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
    convention:
      "PMI/MIP remains outside model DSCR and inside investor cash flow.",
  },
  beforeTaxCashFlow: {
    label: "Pre-tax cash flow after replacement reserve",
    formula: "NOI − annual debt service − replacement reserve − PMI/MIP",
    convention:
      "Reported monthly as the exact annual result ÷ 12 before display rounding.",
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
    formula:
      "Annual pre-tax cash flow after replacement reserve ÷ total initial cash invested",
    convention:
      "Credits reduce the denominator; all acquisition cash uses remain explicit.",
  },
  dscr: {
    label: "Model DSCR",
    formula:
      "Exact annual NOI ÷ exact annual principal-and-interest debt service",
    convention: "Cash purchases use 0 as the stored not-applicable sentinel.",
  },
};

/** Historical v1.1 registry. Result snapshots carrying v1.1 stay frozen; this
 * entry preserves the former internally rounded amortization and modeled 80%
 * cancellable-PMI convention without routing new calculations through it. */
export const UNDERWRITING_V1_1_FORMULAS: Record<
  UnderwritingFormulaKey,
  UnderwritingFormulaDefinition
> = {
  ...UNDERWRITING_V1_2_FORMULAS,
  loanAmortization: {
    ...UNDERWRITING_V1_2_FORMULAS.loanAmortization,
    convention:
      "Historical v1.1 rounded scheduled payment and amortization amounts internally. Its cancellable mortgage-insurance projection used a modeled 80% LTV threshold. Recorded v1.1 results remain frozen; new underwriting uses full-precision schedules and scheduled 78% automatic termination.",
  },
};

/** Historical v1.0 registry. Result snapshots carrying v1.0 stay frozen; this
 * entry keeps their former blank-PMI convention auditable without routing new
 * calculations through it. */
export const UNDERWRITING_V1_0_FORMULAS: Record<
  UnderwritingFormulaKey,
  UnderwritingFormulaDefinition
> = {
  ...UNDERWRITING_V1_1_FORMULAS,
  beforeTaxCashFlow: {
    ...UNDERWRITING_V1_1_FORMULAS.beforeTaxCashFlow,
    convention:
      "Historical v1.0 defaulted a blank mortgage-insurance rate to 0.8% on every financed sub-20%-down analysis. Recorded v1.0 results remain frozen; new underwriting uses the occupancy-aware v1.1 convention.",
  },
};

export const UNDERWRITING_FORMULAS_BY_VERSION = {
  [TRUECAP_UNDERWRITING_STANDARD_LEGACY_V1_VERSION]: UNDERWRITING_V1_0_FORMULAS,
  [TRUECAP_UNDERWRITING_STANDARD_V1_1_VERSION]: UNDERWRITING_V1_1_FORMULAS,
  [TRUECAP_UNDERWRITING_STANDARD_V1_2_VERSION]: UNDERWRITING_V1_2_FORMULAS,
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
    revision: "projection-v10-buy-and-hold-contract-2026-08-27",
    version: TRUECAP_UNDERWRITING_STANDARD_VERSION,
    effectiveDate: "2026-08-27",
    summary:
      "Long-term projection method v10 separates scheduled rent, recurring other income, fixed-dollar operating costs, and rent-linked percentage costs. Percentage-of-rent costs now move with projected rent while fixed-dollar costs alone use expense growth; the reviewed financed baseline changes from $68,718.45682362831 to $68,738.45682362831 at Year 10. Method v10 also carries explicit interest-only, amortization, maturity, balloon, and simplified renovation-downtime terms through the canonical schedule. Recorded result snapshots remain immutable; regenerated projections use v10.",
  },
  {
    revision: "v1.3-pre-tax-contribution-aware-return-2026-08-27",
    version: TRUECAP_UNDERWRITING_STANDARD_VERSION,
    effectiveDate: "2026-08-27",
    summary:
      "Standard v1.3 and Screening Index v1.3 make the projected-return input explicitly pre-tax: annual personal-tax effects and default exit taxes are excluded, modeled selling costs remain included, and later negative operating cash flow counts as additional contributed capital. Recorded v1.0–v1.2 results remain immutable and require explicit re-underwriting before a new share or PDF can use v1.3 math.",
  },
  {
    revision: "projection-v8-rental-mi-policy-2026-08-27",
    version: TRUECAP_UNDERWRITING_STANDARD_V1_2_VERSION,
    effectiveDate: "2026-08-27",
    summary:
      "Long-term projection method v8 stops applying the owner-occupied scheduled-78% PMI rule to investment-property loans. User-entered rental-loan mortgage insurance now remains through payoff unless a future loan-specific policy model supports a verified earlier date. Owner-occupant conventional PMI and explicit loan-life MIP remain distinct.",
  },
  {
    revision: "v1.2-full-precision-amortization-2026-08-27",
    version: TRUECAP_UNDERWRITING_STANDARD_V1_2_VERSION,
    effectiveDate: "2026-08-27",
    summary:
      "First-year Standard v1.2 and long-term projection method v7 introduced one full-precision contractual amortization schedule for payment, interest, payoff, equity, and mortgage-insurance timing. Method v8 subsequently narrowed scheduled-78% termination to the owner-occupant conventional path. Recorded v1.0/v1.1 results remain immutable.",
  },
  {
    revision: "screening-index-v1.2-analysis-date-2026-08-25",
    version: TRUECAP_UNDERWRITING_STANDARD_V1_2_VERSION,
    effectiveDate: "2026-08-25",
    summary:
      "Screening Index reproducibility correction: new v1 analyses persist an explicit UTC analysis date for Property Age, while legacy and direct-engine payloads without a valid date use the fixed 2026-08-25 compatibility anchor. Identical serialized inputs no longer change score at a calendar-year boundary; recorded scores remain immutable.",
  },
  {
    revision: "v1.1-occupancy-aware-pmi-2026-08-25",
    version: TRUECAP_UNDERWRITING_STANDARD_V1_1_VERSION,
    effectiveDate: "2026-08-25",
    summary:
      "First-year v1.1 model-risk correction: a blank PMI/MIP rate now receives the 0.8% screening default only for owner-occupant analyses. Investment-property analyses model no mortgage insurance unless the user, lender profile, or template supplies a rate; explicit 0 still disables it. Recorded v1.0 results remain immutable.",
  },
  {
    revision: "projection-v6-2026-08-25",
    version: TRUECAP_UNDERWRITING_STANDARD_V1_1_VERSION,
    effectiveDate: "2026-08-25",
    summary:
      "Long-term projection snapshot method v6: cancellable PMI/MIP now stops in the exact scheduled month the loan reaches the modeled 80% LTV threshold, while loan-life MIP continues through payoff. Live and cache-backed projections regenerate under v6; previously recorded result snapshots remain unchanged.",
  },
  {
    revision: "screening-index-v1.1-2026-08-25",
    version: TRUECAP_UNDERWRITING_STANDARD_V1_1_VERSION,
    effectiveDate: "2026-08-25",
    summary:
      "Screening Index correctness errata for new and explicitly re-underwritten analyses: zero modeled initial cash now makes CoC inapplicable and renormalizes the remaining score factors; missing Year Built receives an uncertainty modifier instead of new-construction treatment. The score correction is independent of the first-year financial formulas, and previously recorded result snapshots remain immutable.",
  },
  {
    revision: "v1-initial-2026-08-15",
    version: TRUECAP_UNDERWRITING_STANDARD_LEGACY_V1_VERSION,
    effectiveDate: "2026-08-15",
    summary:
      "Initial published standard: lender-style NOI and DSCR, below-the-line CapEx reserve, PMI in cash flow, and signed illustrative tax impact.",
  },
] as const;
