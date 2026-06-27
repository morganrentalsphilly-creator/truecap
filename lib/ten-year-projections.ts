export const TEN_YEAR_PROJECTION_SNAPSHOT_VERSION = 2;

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
  monthlyPayment: number;
  /** Monthly PMI (0 if none). Folded into the displayed debt service and
   *  dropped once the loan amortizes to 80% LTV. */
  pmiMonthly?: number;
  /** Starting loan balance — used to drop PMI at 80% LTV. */
  loanAmount?: number;
  /** Purchase price — the 80% LTV basis for the PMI drop. */
  purchasePrice?: number;
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
  const principalAndInterestAnnual = input.monthlyPayment * 12;
  const expenseGrowthFactor = 1 + input.expenseGrowthPct / 100;
  const rentGrowthFactor = 1 + input.rentGrowthPct / 100;

  // PMI is folded into the displayed debt service for the years it applies and
  // drops once scheduled paydown brings the loan to 80% LTV (purchase basis).
  const pmiAnnual = (input.pmiMonthly ?? 0) * 12;
  const pmiDropBalance = 0.8 * (input.purchasePrice ?? 0);
  let loanBalance = input.loanAmount ?? 0;

  let cumulativeCashFlowAnnual = 0;

  return Array.from({ length: 10 }, (_, index) => {
    const year = index + 1;
    const rentalIncomeAnnual = Math.round(baseAnnualRent * Math.pow(rentGrowthFactor, index));
    const operatingExpensesAnnual = Math.round(
      baseAnnualExpenses * Math.pow(expenseGrowthFactor, index)
    );
    const yearlyInterestForYear = input.yearlyInterestSchedule?.[index];

    // PMI applies while the loan balance at the start of the year is above the
    // 80% LTV threshold; then pay down the balance for next year's check.
    const pmiThisYear = pmiAnnual > 0 && loanBalance > pmiDropBalance ? pmiAnnual : 0;
    const debtServiceAnnual = principalAndInterestAnnual + pmiThisYear;
    if (typeof yearlyInterestForYear === "number") {
      loanBalance = Math.max(0, loanBalance - Math.max(0, principalAndInterestAnnual - yearlyInterestForYear));
    }

    const netCashFlowAnnual = rentalIncomeAnnual - operatingExpensesAnnual - debtServiceAnnual;
    const taxSavingsAnnual =
      typeof yearlyInterestForYear === "number"
        ? Math.round(
            (input.annualDepreciation +
              (input.includeInterestDeduction ? yearlyInterestForYear : 0)) *
              input.taxRate
          )
        : Math.round(input.taxSavingsMonthly * 12);
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
    monthlyPayment: input.monthlyPayment,
    pmiMonthly: input.pmiMonthly ?? 0,
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
