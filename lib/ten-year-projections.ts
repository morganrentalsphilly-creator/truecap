export const TEN_YEAR_PROJECTION_SNAPSHOT_VERSION = 1;

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
  const debtServiceAnnual = input.monthlyPayment * 12;
  const expenseGrowthFactor = 1 + input.expenseGrowthPct / 100;
  const rentGrowthFactor = 1 + input.rentGrowthPct / 100;

  let cumulativeCashFlowAnnual = 0;

  return Array.from({ length: 10 }, (_, index) => {
    const year = index + 1;
    const rentalIncomeAnnual = Math.round(baseAnnualRent * Math.pow(rentGrowthFactor, index));
    const operatingExpensesAnnual = Math.round(
      baseAnnualExpenses * Math.pow(expenseGrowthFactor, index)
    );
    const netCashFlowAnnual = rentalIncomeAnnual - operatingExpensesAnnual - debtServiceAnnual;
    const yearlyInterestForYear = input.yearlyInterestSchedule?.[index];
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
