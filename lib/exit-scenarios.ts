// Bumped to 2: totalProfit now nets out estimated exit tax (depreciation
// recapture + capital gains). Cached snapshots at v1 regenerate on read.
export const EXIT_SCENARIOS_SNAPSHOT_VERSION = 3;
export const DEFAULT_APPRECIATION_RATE = 3;
export const DEFAULT_SELLING_COST_PCT = 6;
// Exit-tax assumptions. Depreciation taken during the hold is "recaptured" at
// sale (taxed up to 25% federally); the remaining gain is long-term capital
// gains (15% for most middle-income investors). Both are ESTIMATES — a 1031
// exchange, a primary-residence exclusion (house-hack), or a different bracket
// would change them. Defaulted so the core flow needs no new inputs.
export const DEFAULT_DEPRECIATION_RECAPTURE_RATE_PCT = 25;
export const DEFAULT_CAPITAL_GAINS_RATE_PCT = 15;

export interface ExitScenarioYear {
  year: number;
  propertyValue: number;
  remainingLoanBalance: number;
  equity: number;
  sellingCost: number;
  netSaleProceeds: number;
  cumulativeCashFlow: number;
  cumulativeTaxBenefit: number;
  /** Estimated tax owed at sale: depreciation recapture + capital gains.
   *  Optional only for backward-compat with pre-v2 persisted snapshots; the
   *  engine always sets it. Read it as `exitTax ?? 0`. */
  exitTax?: number;
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
  /** Total cash actually in the deal (down payment + closing + rehab +
   *  STR furnishing) — the basis returns are measured against. Optional for
   *  backward-compatibility; falls back to downPayment + closingCosts. */
  initialCashInvested?: number;
  cumulativeCashFlowByYear: number[];
  cumulativeTaxBenefitByYear: number[];
  /** Annual straight-line depreciation deduction ($/yr). Drives recapture at
   *  sale. Optional; 0 (or omitted) ⇒ no recapture component. */
  annualDepreciation?: number;
  /** Depreciation-recapture tax rate (%). Defaults to 25. */
  recaptureTaxRatePct?: number;
  /** Long-term capital-gains tax rate (%). Defaults to 15. */
  capitalGainsTaxRatePct?: number;
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
  // Returns are measured against ALL cash in the deal — including rehab + STR
  // furnishing (calc-analysis's totalCashRequired) — not just down + closing,
  // or IRR/equity-multiple/CAGR overstate every value-add / STR deal.
  const initialInvestment =
    input.initialCashInvested ?? input.downPayment + input.closingCosts;

  // Exit-tax inputs. Cost basis ≈ purchase price + capitalized acquisition
  // (closing) costs; depreciation lowers that basis over the hold.
  const costBasis = input.purchasePrice + input.closingCosts;
  const annualDepreciation = Math.max(0, input.annualDepreciation ?? 0);
  const recaptureRate =
    (input.recaptureTaxRatePct ?? DEFAULT_DEPRECIATION_RECAPTURE_RATE_PCT) / 100;
  const capitalGainsRate =
    (input.capitalGainsTaxRatePct ?? DEFAULT_CAPITAL_GAINS_RATE_PCT) / 100;

  return Array.from({ length: 10 }, (_, index) => {
    const year = index + 1;
    const propertyValue = Math.round(input.purchasePrice * Math.pow(appreciationFactor, year));
    const remainingLoanBalance = remainingLoanBalanceByYear[index] ?? 0;
    const equity = propertyValue - remainingLoanBalance;
    const sellingCost = Math.round(propertyValue * sellingCostRate);
    const netSaleProceeds = propertyValue - remainingLoanBalance - sellingCost;
    const cumulativeCashFlow = input.cumulativeCashFlowByYear[index] ?? 0;
    const cumulativeTaxBenefit = input.cumulativeTaxBenefitByYear[index] ?? 0;

    // Estimated tax due at sale. Depreciation taken so far is recaptured
    // first (capped at the gain), then the remaining gain is long-term
    // capital gains. Gain is measured against the depreciation-adjusted
    // basis and net of selling costs (loan balance is financing, not gain).
    const cumulativeDepreciation = Math.min(annualDepreciation * year, costBasis);
    const adjustedBasis = costBasis - cumulativeDepreciation;
    const amountRealized = propertyValue - sellingCost;
    const totalGain = Math.max(0, amountRealized - adjustedBasis);
    const recaptureGain = Math.min(cumulativeDepreciation, totalGain);
    const capitalGain = Math.max(0, totalGain - recaptureGain);
    const exitTax = Math.round(recaptureGain * recaptureRate + capitalGain * capitalGainsRate);

    const totalProfit =
      netSaleProceeds + cumulativeCashFlow + cumulativeTaxBenefit - initialInvestment - exitTax;

    return {
      year,
      propertyValue,
      remainingLoanBalance,
      equity,
      sellingCost,
      netSaleProceeds,
      cumulativeCashFlow,
      cumulativeTaxBenefit,
      exitTax,
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
    initialCashInvested: input.initialCashInvested ?? input.downPayment + input.closingCosts,
    cumulativeCashFlowByYear: input.cumulativeCashFlowByYear,
    cumulativeTaxBenefitByYear: input.cumulativeTaxBenefitByYear,
    annualDepreciation: input.annualDepreciation ?? 0,
    recaptureTaxRatePct: input.recaptureTaxRatePct ?? DEFAULT_DEPRECIATION_RECAPTURE_RATE_PCT,
    capitalGainsTaxRatePct: input.capitalGainsTaxRatePct ?? DEFAULT_CAPITAL_GAINS_RATE_PCT,
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
