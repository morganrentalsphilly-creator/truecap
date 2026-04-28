import type { AnalysisResult } from "@/lib/calc-analysis";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import { buildExitScenarios, resolveExitScenarioRates, type ExitScenarioYear } from "@/lib/exit-scenarios";
import type { TaxStrategyYear } from "@/lib/tax-strategy";

/** Version of `compareSnapshot` + `snapshotVersion` on `result_snapshot` (compare fast path). */
export const COMPARE_RESULT_SNAPSHOT_VERSION = 1;

export type CompareSnapshotProjectionYear = {
  year: number;
  rentalIncomeAnnual: number;
  operatingExpensesAnnual: number;
  debtServiceAnnual: number;
  netCashFlowAnnual: number;
  taxSavingsAnnual: number;
  afterTaxCashFlowAnnual: number;
  cumulativeCashFlowAnnual: number;
};

export type CompareSnapshotTaxYear = {
  year: number;
  rentalIncome: number;
  operatingExpenses: number;
  interest: number;
  depreciation: number;
  totalDeductions: number;
  taxableRentalIncome: number;
  taxSavings: number;
  taxLiability: number;
  netTaxBenefit: number;
  cumulativeTaxBenefit: number;
};

export type CompareSnapshotExitYear = {
  year: number;
  propertyValue: number;
  loanBalance: number;
  equity: number;
  sellingCost: number;
  netSaleProceeds: number;
  totalProfit: number;
};

export type CompareSnapshotExitSummary = {
  bestYearToSell: number;
  year5Profit: number;
  year10Profit: number;
  totalROI: number;
};

export type CompareSnapshotLongTerm = {
  tenYearCashFlow: number;
  tenYearAfterTax: number;
  totalTaxBenefit: number;
  year10CashFlow: number;
  year10Profit: number;
  totalROI: number;
};

export type CompareSnapshotAssumptions = {
  appreciationRate: number;
  sellingCostPct: number;
  rentGrowthPct: number;
  expenseGrowthPct: number;
  taxRate: number;
};

export type CompareSnapshotV1 = {
  projections: {
    years: CompareSnapshotProjectionYear[];
  };
  taxStrategy: {
    years: CompareSnapshotTaxYear[];
    totalTaxBenefit: number;
  };
  exitScenarios: {
    years: CompareSnapshotExitYear[];
    summary: CompareSnapshotExitSummary;
  };
  longTermSummary: CompareSnapshotLongTerm;
  assumptions: CompareSnapshotAssumptions;
};

function mapTaxYear(y: TaxStrategyYear): CompareSnapshotTaxYear {
  return {
    year: y.year,
    rentalIncome: y.rentalIncomeAnnual,
    operatingExpenses: y.operatingExpensesAnnual,
    interest: y.mortgageInterestDeductionAnnual,
    depreciation: y.depreciationDeductionAnnual,
    totalDeductions: y.totalDeductionsAnnual,
    taxableRentalIncome: y.taxableRentalIncomeAnnual,
    taxSavings: y.taxSavingsAnnual,
    taxLiability: y.taxLiabilityAnnual,
    netTaxBenefit: y.netTaxBenefitAnnual,
    cumulativeTaxBenefit: y.cumulativeTaxBenefitAnnual,
  };
}

function mapExitYear(y: ExitScenarioYear): CompareSnapshotExitYear {
  return {
    year: y.year,
    propertyValue: y.propertyValue,
    loanBalance: y.remainingLoanBalance,
    equity: y.equity,
    sellingCost: y.sellingCost,
    netSaleProceeds: y.netSaleProceeds,
    totalProfit: y.totalProfit,
  };
}

function buildExitSummaryFromYears(years: ExitScenarioYear[]): CompareSnapshotExitSummary {
  const bestYear = years.reduce<ExitScenarioYear | null>(
    (best, year) => (!best || year.totalProfit > best.totalProfit ? year : best),
    null
  );
  const year5 = years.find((y) => y.year === 5) ?? null;
  const year10 = years.find((y) => y.year === 10) ?? years[years.length - 1] ?? null;
  const initialInvestment = year10
    ? year10.netSaleProceeds + year10.cumulativeCashFlow + year10.cumulativeTaxBenefit - year10.totalProfit
    : 0;
  const totalROI =
    initialInvestment > 0 && year10 ? (year10.totalProfit / initialInvestment) * 100 : 0;

  return {
    bestYearToSell: bestYear?.year ?? 0,
    year5Profit: year5?.totalProfit ?? 0,
    year10Profit: year10?.totalProfit ?? 0,
    totalROI,
  };
}

/**
 * Builds persisted compare snapshot from an already-computed analysis (no alternate formulas).
 * Tax strategy rows come from `result.taxStrategyYears` (main analysis). Exit uses `buildExitScenarios`.
 */
export function buildCompareSnapshotPayload(
  result: AnalysisResult,
  values: InvestmentFormValues
): { snapshotVersion: number; compareSnapshot: CompareSnapshotV1 } {
  const taxYears = result.taxStrategyYears;

  const totalTaxBenefit =
    taxYears.length > 0 ? taxYears[taxYears.length - 1]!.cumulativeTaxBenefitAnnual : 0;

  const exitRates = resolveExitScenarioRates(values);
  const projection = result.tenYearProjection;
  const exitYears = buildExitScenarios({
    purchasePrice: values.purchasePrice,
    appreciationRate: exitRates.appreciationRate,
    sellingCostPct: exitRates.sellingCostPct,
    loanAmount: result.loanAmount,
    interestRate: values.interestRate,
    loanTermYears: values.loanTermYears,
    monthlyPayment: result.monthlyPayment,
    downPayment: result.downPayment,
    closingCosts: result.closingCosts,
    cumulativeCashFlowByYear: projection.map((p) => p.cumulativeCashFlowAnnual),
    cumulativeTaxBenefitByYear: taxYears.map((t) => t.cumulativeTaxBenefitAnnual),
  });

  const exitSummary = buildExitSummaryFromYears(exitYears);
  const y10p = projection[9];
  const tenYearCashFlow = y10p?.cumulativeCashFlowAnnual ?? 0;
  const tenYearAfterTax = projection.reduce((s, p) => s + p.afterTaxCashFlowAnnual, 0);
  const year10CashFlow = y10p?.netCashFlowAnnual ?? 0;
  const year10Profit = exitYears.find((y) => y.year === 10)?.totalProfit ?? 0;

  const compareSnapshot: CompareSnapshotV1 = {
    projections: {
      years: projection.map((year) => ({
        year: year.year,
        rentalIncomeAnnual: year.rentalIncomeAnnual,
        operatingExpensesAnnual: year.operatingExpensesAnnual,
        debtServiceAnnual: year.debtServiceAnnual,
        netCashFlowAnnual: year.netCashFlowAnnual,
        taxSavingsAnnual: year.taxSavingsAnnual,
        afterTaxCashFlowAnnual: year.afterTaxCashFlowAnnual,
        cumulativeCashFlowAnnual: year.cumulativeCashFlowAnnual,
      })),
    },
    taxStrategy: {
      years: taxYears.map(mapTaxYear),
      totalTaxBenefit,
    },
    exitScenarios: {
      years: exitYears.map(mapExitYear),
      summary: exitSummary,
    },
    longTermSummary: {
      tenYearCashFlow,
      tenYearAfterTax,
      totalTaxBenefit,
      year10CashFlow,
      year10Profit,
      totalROI: exitSummary.totalROI,
    },
    assumptions: {
      appreciationRate: exitRates.appreciationRate,
      sellingCostPct: exitRates.sellingCostPct,
      rentGrowthPct: values.rentGrowthPct,
      expenseGrowthPct: values.expenseGrowthPct,
      taxRate: values.taxRatePct ?? 24,
    },
  };

  return { snapshotVersion: COMPARE_RESULT_SNAPSHOT_VERSION, compareSnapshot };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/** Best-effort parse of persisted `compareSnapshot` (older saves return null). */
export function parseCompareSnapshotV1(raw: unknown): CompareSnapshotV1 | null {
  if (!isRecord(raw)) return null;
  const projections = raw.projections;
  const taxStrategy = raw.taxStrategy;
  const exitScenarios = raw.exitScenarios;
  const longTermSummary = raw.longTermSummary;
  const assumptions = raw.assumptions;
  const normalizedProjections = isRecord(projections) && Array.isArray(projections.years)
    ? projections
    : { years: [] };
  if (!isRecord(taxStrategy) || !Array.isArray(taxStrategy.years)) return null;
  if (!isRecord(exitScenarios) || !Array.isArray(exitScenarios.years)) return null;
  if (!isRecord(exitScenarios.summary)) return null;
  if (!isRecord(longTermSummary)) return null;
  if (!isRecord(assumptions)) return null;

  return {
    ...(raw as unknown as CompareSnapshotV1),
    projections: normalizedProjections as CompareSnapshotV1["projections"],
  };
}
