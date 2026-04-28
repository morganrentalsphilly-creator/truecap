export const TAX_STRATEGY_SNAPSHOT_VERSION = 3;

export interface TaxStrategyYear {
  year: number;
  rentalIncomeAnnual: number;
  operatingExpensesAnnual: number;
  mortgageInterestDeductionAnnual: number;
  depreciationDeductionAnnual: number;
  totalDeductionsAnnual: number;
  taxableRentalIncomeAnnual: number;
  taxSavingsAnnual: number;
  taxLiabilityAnnual: number;
  netTaxBenefitAnnual: number;
  cumulativeTaxBenefitAnnual: number;
}

export interface TaxStrategyInput {
  monthlyRentalIncome: number;
  totalOperatingExpenses: number;
  annualDepreciation: number;
  yearlyInterestSchedule?: number[];
  rentGrowthPct: number;
  expenseGrowthPct: number;
  taxRate: number;
  includeInterestDeduction: boolean;
}

export interface TaxStrategySnapshotPayload {
  analysisId: string;
  taxStrategyYears: TaxStrategyYear[];
  inputHash: string;
  generatedAt: string;
  version: number;
}

function assertRoundedEquals(label: string, actual: number, expected: number) {
  if (actual !== expected) {
    throw new Error(`${label} mismatch: expected ${expected}, received ${actual}`);
  }
}

function assertTaxStrategyYearConsistency(
  year: number,
  raw: {
    rentalIncomeAnnual: number;
    operatingExpensesAnnual: number;
    mortgageInterestDeductionAnnual: number;
    depreciationDeductionAnnual: number;
    totalDeductionsAnnual: number;
    taxableRentalIncomeAnnual: number;
    taxSavingsAnnual: number;
    taxLiabilityAnnual: number;
    netTaxBenefitAnnual: number;
  }
) {
  const rounded = {
    rentalIncomeAnnual: Math.round(raw.rentalIncomeAnnual),
    operatingExpensesAnnual: Math.round(raw.operatingExpensesAnnual),
    mortgageInterestDeductionAnnual: Math.round(raw.mortgageInterestDeductionAnnual),
    depreciationDeductionAnnual: Math.round(raw.depreciationDeductionAnnual),
    totalDeductionsAnnual: Math.round(raw.totalDeductionsAnnual),
    taxableRentalIncomeAnnual: Math.round(raw.taxableRentalIncomeAnnual),
    taxSavingsAnnual: Math.round(raw.taxSavingsAnnual),
    taxLiabilityAnnual: Math.round(raw.taxLiabilityAnnual),
    netTaxBenefitAnnual: Math.round(raw.netTaxBenefitAnnual),
  };

  assertRoundedEquals(
    `Tax Strategy Year ${year} total deductions`,
    rounded.totalDeductionsAnnual,
    Math.round(
      raw.operatingExpensesAnnual +
        raw.mortgageInterestDeductionAnnual +
        raw.depreciationDeductionAnnual
    )
  );
  assertRoundedEquals(
    `Tax Strategy Year ${year} taxable rental income`,
    rounded.taxableRentalIncomeAnnual,
    Math.round(raw.rentalIncomeAnnual - raw.totalDeductionsAnnual)
  );
  if (raw.taxableRentalIncomeAnnual < 0) {
    assertRoundedEquals(`Tax Strategy Year ${year} tax liability`, rounded.taxLiabilityAnnual, 0);
  } else {
    assertRoundedEquals(`Tax Strategy Year ${year} tax savings`, rounded.taxSavingsAnnual, 0);
  }
  assertRoundedEquals(
    `Tax Strategy Year ${year} net tax benefit`,
    rounded.netTaxBenefitAnnual,
    Math.round(raw.taxSavingsAnnual - raw.taxLiabilityAnnual)
  );
}

export function buildTaxStrategyProjection(input: TaxStrategyInput): TaxStrategyYear[] {
  const baseAnnualRent = input.monthlyRentalIncome * 12;
  const baseAnnualExpenses = input.totalOperatingExpenses * 12;
  const expenseGrowthFactor = 1 + input.expenseGrowthPct / 100;
  const rentGrowthFactor = 1 + input.rentGrowthPct / 100;

  let cumulativeTaxBenefitAnnual = 0;

  return Array.from({ length: 10 }, (_, index) => {
    const year = index + 1;
    const rentalIncomeAnnualRaw = baseAnnualRent * Math.pow(rentGrowthFactor, index);
    const operatingExpensesAnnualRaw = baseAnnualExpenses * Math.pow(expenseGrowthFactor, index);
    const yearlyInterestForYear = input.yearlyInterestSchedule?.[index];
    const mortgageInterestDeductionAnnualRaw =
      input.includeInterestDeduction && typeof yearlyInterestForYear === "number"
        ? yearlyInterestForYear
        : 0;
    const depreciationDeductionAnnualRaw = input.annualDepreciation;
    const totalDeductionsAnnualRaw =
      operatingExpensesAnnualRaw +
      mortgageInterestDeductionAnnualRaw +
      depreciationDeductionAnnualRaw;
    const taxableRentalIncomeAnnualRaw = rentalIncomeAnnualRaw - totalDeductionsAnnualRaw;
    const taxSavingsAnnualRaw =
      taxableRentalIncomeAnnualRaw < 0
        ? Math.abs(taxableRentalIncomeAnnualRaw) * input.taxRate
        : 0;
    const taxLiabilityAnnualRaw =
      taxableRentalIncomeAnnualRaw >= 0
        ? taxableRentalIncomeAnnualRaw * input.taxRate
        : 0;
    const netTaxBenefitAnnualRaw = taxSavingsAnnualRaw - taxLiabilityAnnualRaw;

    const rentalIncomeAnnual = Math.round(rentalIncomeAnnualRaw);
    const operatingExpensesAnnual = Math.round(operatingExpensesAnnualRaw);
    const mortgageInterestDeductionAnnual = Math.round(mortgageInterestDeductionAnnualRaw);
    const depreciationDeductionAnnual = Math.round(depreciationDeductionAnnualRaw);
    const totalDeductionsAnnual = Math.round(totalDeductionsAnnualRaw);
    const taxableRentalIncomeAnnual = Math.round(taxableRentalIncomeAnnualRaw);
    const taxSavingsAnnual = Math.round(taxSavingsAnnualRaw);
    const taxLiabilityAnnual = Math.round(taxLiabilityAnnualRaw);
    const netTaxBenefitAnnual = Math.round(netTaxBenefitAnnualRaw);

    if (year === 1 || year === 10) {
      assertTaxStrategyYearConsistency(year, {
        rentalIncomeAnnual: rentalIncomeAnnualRaw,
        operatingExpensesAnnual: operatingExpensesAnnualRaw,
        mortgageInterestDeductionAnnual: mortgageInterestDeductionAnnualRaw,
        depreciationDeductionAnnual: depreciationDeductionAnnualRaw,
        totalDeductionsAnnual: totalDeductionsAnnualRaw,
        taxableRentalIncomeAnnual: taxableRentalIncomeAnnualRaw,
        taxSavingsAnnual: taxSavingsAnnualRaw,
        taxLiabilityAnnual: taxLiabilityAnnualRaw,
        netTaxBenefitAnnual: netTaxBenefitAnnualRaw,
      });
    }
    cumulativeTaxBenefitAnnual += netTaxBenefitAnnual;

    return {
      year,
      rentalIncomeAnnual,
      operatingExpensesAnnual,
      mortgageInterestDeductionAnnual,
      depreciationDeductionAnnual,
      totalDeductionsAnnual,
      taxableRentalIncomeAnnual,
      taxSavingsAnnual,
      taxLiabilityAnnual,
      netTaxBenefitAnnual,
      cumulativeTaxBenefitAnnual,
    };
  });
}

export function buildTaxStrategyInputHash(input: TaxStrategyInput): string {
  const normalizedPayload = {
    monthlyRentalIncome: input.monthlyRentalIncome,
    totalOperatingExpenses: input.totalOperatingExpenses,
    annualDepreciation: input.annualDepreciation,
    yearlyInterestSchedule: input.yearlyInterestSchedule ?? [],
    rentGrowthPct: input.rentGrowthPct,
    expenseGrowthPct: input.expenseGrowthPct,
    taxRate: input.taxRate,
    includeInterestDeduction: input.includeInterestDeduction,
    version: TAX_STRATEGY_SNAPSHOT_VERSION,
  };

  const serialized = JSON.stringify(normalizedPayload);
  let hash = 2166136261;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16)}`;
}
