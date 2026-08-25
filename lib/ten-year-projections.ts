// v3: taxSavingsAnnual is now a SIGNED net tax effect (nets rental income
// against deductions), not a one-way shield — so cached v2 snapshots, which
// overstated after-tax cash flow in tax-positive years, regenerate.
// v4: the CapEx reserve is excluded from the TAXABLE-income line (a reserve
// isn't a deductible operating expense), so v3 snapshots that over-sheltered
// rental income regenerate.
// v5: debt service stops once the loan amortizes (loan terms < 10 years no
// longer charge P&I/PMI in post-payoff years), so cached snapshots for
// short-term loans regenerate.
export const TEN_YEAR_PROJECTION_SNAPSHOT_VERSION = 5;

export interface ProjectionYear {
  year: number;
  rentalIncomeAnnual: number;
  operatingExpensesAnnual: number;
  debtServiceAnnual: number;
  netCashFlowAnnual: number;
  taxSavingsAnnual: number;
  afterTaxCashFlowAnnual: number;
  cumulativeCashFlowAnnual: number;
}

export interface TenYearProjectionInput {
  monthlyRentalIncome: number;
  totalOperatingExpenses: number;
  /** Monthly CapEx RESERVE inside totalOperatingExpenses — a cash set-aside,
   *  not a deductible operating expense. Kept in the cash-flow line, excluded
   *  from the taxable-income line. */
  capexReserveMonthly: number;
  monthlyPayment: number;
  /** Monthly PMI (0 if none). Folded into the displayed debt service and
   *  dropped once the loan amortizes to 80% LTV. */
  pmiMonthly?: number;
  /** Starting loan balance — used to drop PMI at 80% LTV. */
  loanAmount?: number;
  /** Purchase price — the 80% LTV basis for the PMI drop. */
  purchasePrice?: number;
  /** When true, mortgage insurance never drops (FHA MIP for the life of the
   *  loan); otherwise it cancels once the balance reaches 80% LTV. */
  pmiNoCancel?: boolean;
  taxSavingsMonthly: number;
  annualDepreciation: number;
  yearlyInterestSchedule?: number[];
  rentGrowthPct: number;
  expenseGrowthPct: number;
  taxRate: number;
  includeInterestDeduction: boolean;
}

export interface TenYearProjectionSnapshotPayload {
  analysisId: string;
  projectionYears: ProjectionYear[];
  inputHash: string;
  generatedAt: string;
  version: number;
}

export function buildTenYearProjection(input: TenYearProjectionInput): ProjectionYear[] {
  const baseAnnualRent = input.monthlyRentalIncome * 12;
  const baseAnnualExpenses = input.totalOperatingExpenses * 12;
  // Same expenses MINUS the CapEx reserve — used only for the taxable-income
  // line, since a reserve isn't a deductible operating expense.
  const baseAnnualExpensesExCapex =
    Math.max(0, input.totalOperatingExpenses - input.capexReserveMonthly) * 12;
  const principalAndInterestAnnual = input.monthlyPayment * 12;
  const expenseGrowthFactor = 1 + input.expenseGrowthPct / 100;
  const rentGrowthFactor = 1 + input.rentGrowthPct / 100;

  // PMI is folded into the displayed debt service for the years it applies and
  // drops once scheduled paydown brings the loan to 80% LTV (purchase basis).
  const pmiAnnual = (input.pmiMonthly ?? 0) * 12;
  const pmiDropBalance = 0.8 * (input.purchasePrice ?? 0);
  let loanBalance = input.loanAmount ?? 0;

  // The interest schedule runs exactly as long as the loan does, so a year at
  // or past its end is a year after payoff: P&I stops, and mortgage insurance
  // (even never-canceling FHA MIP) dies with the loan. Termless/legacy inputs
  // (no schedule) keep the historical flat charge for all 10 years.
  const amortizedScheduleLength =
    (input.loanAmount ?? 0) > 0 ? (input.yearlyInterestSchedule?.length ?? 0) : 0;

  let cumulativeCashFlowAnnual = 0;

  return Array.from({ length: 10 }, (_, index) => {
    const year = index + 1;
    const rentalIncomeAnnual = Math.round(baseAnnualRent * Math.pow(rentGrowthFactor, index));
    const operatingExpensesAnnual = Math.round(
      baseAnnualExpenses * Math.pow(expenseGrowthFactor, index)
    );
    const yearlyInterestForYear = input.yearlyInterestSchedule?.[index];

    // PMI applies while the loan balance at the start of the year is above the
    // 80% LTV threshold (or always, for FHA MIP that never cancels); then pay
    // down the balance for next year's check.
    const loanPaidOff = amortizedScheduleLength > 0 && index >= amortizedScheduleLength;
    const pmiThisYear =
      !loanPaidOff &&
      pmiAnnual > 0 &&
      (input.pmiNoCancel === true || loanBalance > pmiDropBalance)
        ? pmiAnnual
        : 0;
    const debtServiceAnnual = loanPaidOff ? 0 : principalAndInterestAnnual + pmiThisYear;
    if (typeof yearlyInterestForYear === "number") {
      loanBalance = Math.max(0, loanBalance - Math.max(0, principalAndInterestAnnual - yearlyInterestForYear));
    }

    const netCashFlowAnnual = rentalIncomeAnnual - operatingExpensesAnnual - debtServiceAnnual;
    // Signed tax EFFECT for the year — not a one-way "savings". Deductions
    // (operating expenses + deductible mortgage interest + depreciation) shelter
    // rental income; once they no longer cover it the deal turns tax-POSITIVE
    // and OWES tax. Net rental income against deductions — identical to the
    // tax-strategy panel's netTaxBenefitAnnual — so after-tax cash flow stays
    // honest in later years. The old formula only ever ADDED the deduction value
    // (ignoring rental income + operating expenses), which overstated after-tax
    // returns once the shelter ran out — always in the optimistic direction.
    const deductibleInterestAnnual =
      input.includeInterestDeduction && typeof yearlyInterestForYear === "number"
        ? yearlyInterestForYear
        : 0;
    const operatingExpensesExCapexAnnual = Math.round(
      baseAnnualExpensesExCapex * Math.pow(expenseGrowthFactor, index)
    );
    const taxableIncomeAnnual =
      rentalIncomeAnnual - operatingExpensesExCapexAnnual - deductibleInterestAnnual - input.annualDepreciation;
    const taxSavingsAnnual = Math.round(-taxableIncomeAnnual * input.taxRate);
    const afterTaxCashFlowAnnual = netCashFlowAnnual + taxSavingsAnnual;
    cumulativeCashFlowAnnual += netCashFlowAnnual;

    return {
      year,
      rentalIncomeAnnual,
      operatingExpensesAnnual,
      debtServiceAnnual,
      netCashFlowAnnual,
      taxSavingsAnnual,
      afterTaxCashFlowAnnual,
      cumulativeCashFlowAnnual,
    };
  });
}

export function buildTenYearProjectionInputHash(input: TenYearProjectionInput): string {
  const normalizedPayload = {
    monthlyRentalIncome: input.monthlyRentalIncome,
    totalOperatingExpenses: input.totalOperatingExpenses,
    // v4 subtracts the CapEx reserve from the taxable-income line, so an
    // offsetting maintenance/CapEx edit (total opex unchanged) must still
    // produce a new hash — omitting it served stale cached tax lines.
    capexReserveMonthly: input.capexReserveMonthly,
    monthlyPayment: input.monthlyPayment,
    pmiMonthly: input.pmiMonthly ?? 0,
    pmiNoCancel: input.pmiNoCancel === true,
    loanAmount: input.loanAmount ?? 0,
    purchasePrice: input.purchasePrice ?? 0,
    taxSavingsMonthly: input.taxSavingsMonthly,
    annualDepreciation: input.annualDepreciation,
    yearlyInterestSchedule: input.yearlyInterestSchedule ?? [],
    rentGrowthPct: input.rentGrowthPct,
    expenseGrowthPct: input.expenseGrowthPct,
    taxRate: input.taxRate,
    includeInterestDeduction: input.includeInterestDeduction,
    version: TEN_YEAR_PROJECTION_SNAPSHOT_VERSION,
  };

  const serialized = JSON.stringify(normalizedPayload);
  let hash = 2166136261;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16)}`;
}
