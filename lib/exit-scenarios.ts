export const EXIT_SCENARIOS_SNAPSHOT_VERSION = 1;
export const DEFAULT_APPRECIATION_RATE = 3;
export const DEFAULT_SELLING_COST_PCT = 6;

export interface ExitScenarioYear {
  year: number;
  propertyValue: number;
  remainingLoanBalance: number;
  equity: number;
  sellingCost: number;
  netSaleProceeds: number;
  cumulativeCashFlow: number;
  cumulativeTaxBenefit: number;
  totalProfit: number;
}

export interface ExitScenarioInput {
  purchasePrice: number;
  appreciationRate: number;
  sellingCostPct: number;
  loanAmount: number;
  interestRate: number;
  loanTermYears: number;
  monthlyPayment: number;
  downPayment: number;
  closingCosts: number;
  cumulativeCashFlowByYear: number[];
  cumulativeTaxBenefitByYear: number[];
}

export interface ExitScenarioSnapshotPayload {
  analysisId: string;
  exitScenarioYears: ExitScenarioYear[];
  inputHash: string;
  generatedAt: string;
  version: number;
}

function buildYearlyRemainingLoanBalanceSchedule(input: ExitScenarioInput): number[] {
  if (input.loanAmount <= 0 || input.loanTermYears <= 0) {
    return Array.from({ length: 10 }, () => 0);
  }

  const monthlyRate = input.interestRate / 100 / 12;
  const totalMonths = input.loanTermYears * 12;
  let balance = input.loanAmount;
  const yearlyBalances: number[] = [];

  for (let month = 1; month <= totalMonths && balance > 0; month += 1) {
    const interestPortion = monthlyRate > 0 ? Math.round(balance * monthlyRate) : 0;
    const principalPortion = Math.min(Math.max(input.monthlyPayment - interestPortion, 0), balance);
    balance = Math.max(0, balance - principalPortion);

    if (month % 12 === 0) {
      yearlyBalances.push(Math.round(balance));
    }
  }

  while (yearlyBalances.length < 10) {
    yearlyBalances.push(0);
  }

  return yearlyBalances.slice(0, 10);
}

/** Canonical appreciation / selling-cost percents for exit scenarios (matches saved-analysis defaults). */
export function resolveExitScenarioRates(values: {
  appreciationRatePct?: number;
  sellingCostPct?: number;
}): Pick<ExitScenarioInput, "appreciationRate" | "sellingCostPct"> {
  return {
    appreciationRate: values.appreciationRatePct ?? DEFAULT_APPRECIATION_RATE,
    sellingCostPct: values.sellingCostPct ?? DEFAULT_SELLING_COST_PCT,
  };
}

export function buildExitScenarios(input: ExitScenarioInput): ExitScenarioYear[] {
  const appreciationFactor = 1 + input.appreciationRate / 100;
  const sellingCostRate = input.sellingCostPct / 100;
  const remainingLoanBalanceByYear = buildYearlyRemainingLoanBalanceSchedule(input);
  const initialInvestment = input.downPayment + input.closingCosts;

  return Array.from({ length: 10 }, (_, index) => {
    const year = index + 1;
    const propertyValue = Math.round(input.purchasePrice * Math.pow(appreciationFactor, year));
    const remainingLoanBalance = remainingLoanBalanceByYear[index] ?? 0;
    const equity = propertyValue - remainingLoanBalance;
    const sellingCost = Math.round(propertyValue * sellingCostRate);
    const netSaleProceeds = propertyValue - remainingLoanBalance - sellingCost;
    const cumulativeCashFlow = input.cumulativeCashFlowByYear[index] ?? 0;
    const cumulativeTaxBenefit = input.cumulativeTaxBenefitByYear[index] ?? 0;
    const totalProfit =
      netSaleProceeds + cumulativeCashFlow + cumulativeTaxBenefit - initialInvestment;

    return {
      year,
      propertyValue,
      remainingLoanBalance,
      equity,
      sellingCost,
      netSaleProceeds,
      cumulativeCashFlow,
      cumulativeTaxBenefit,
      totalProfit,
    };
  });
}

export function buildExitScenarioInputHash(input: ExitScenarioInput): string {
  const normalizedPayload = {
    purchasePrice: input.purchasePrice,
    appreciationRate: input.appreciationRate,
    sellingCostPct: input.sellingCostPct,
    loanAmount: input.loanAmount,
    interestRate: input.interestRate,
    loanTermYears: input.loanTermYears,
    monthlyPayment: input.monthlyPayment,
    downPayment: input.downPayment,
    closingCosts: input.closingCosts,
    cumulativeCashFlowByYear: input.cumulativeCashFlowByYear,
    cumulativeTaxBenefitByYear: input.cumulativeTaxBenefitByYear,
    version: EXIT_SCENARIOS_SNAPSHOT_VERSION,
  };

  const serialized = JSON.stringify(normalizedPayload);
  let hash = 2166136261;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16)}`;
}
