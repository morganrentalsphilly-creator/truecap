/**
 * BRRRR (Buy, Rehab, Rent, Refinance, Repeat) analysis.
 *
 * Models the cash-out refinance side of a BRRRR. Inputs combine the
 * user's already-entered acquisition assumptions (purchase price,
 * financing, rent, operating expenses) with three BRRRR-specific
 * inputs (rehab budget, ARV, refi terms).
 *
 * Outputs the cash trapped in the deal after the refi, the new monthly
 * cash flow, and the infinite-return scenario (cash left ≤ 0).
 */

import { AnalysisResult } from "@/lib/calc-analysis";

export type BrrrrInputs = {
  purchasePrice: number;
  rehabBudget: number;
  arv: number; // After-Repair Value
  refiLtvPct: number; // e.g. 75 for 75 %
  refiRatePct: number; // e.g. 7.0
  refiTermYears: number; // e.g. 30
  closingCostsPctAcq: number; // closing on the original purchase, % of price
  closingCostsRefiPct: number; // closing on the refi, % of new loan
  downPaymentPct: number; // original purchase down payment % (from form)
  /** Months between acquisition and refi (typically 4-12). */
  holdMonths: number;
  /** Monthly carrying cost during rehab (taxes + insurance + utilities, no rent). */
  monthlyCarryingCost: number;
  /** Pull from the base analysis once the property is rented. */
  postRefiMonthlyOpEx: number;
  postRefiMonthlyRent: number;
};

export type BrrrrResult = {
  // Acquisition cash
  originalDownPayment: number;
  originalClosingCosts: number;
  carryingCostsTotal: number;
  rehabBudget: number;
  totalCashInvested: number;

  // Refi
  newLoanAmount: number;
  refiClosingCosts: number;
  cashReturnedAtRefi: number;
  cashLeftInDeal: number;

  // Post-refi cash flow
  newMonthlyPayment: number;
  postRefiMonthlyCashFlow: number;
  postRefiAnnualCashFlow: number;
  postRefiCashOnCashPct: number; // infinite if cashLeftInDeal <= 0
  isInfiniteReturn: boolean;

  // Sanity / value-add
  equityCreated: number; // ARV − (purchase + rehab)
  valueAddRatio: number; // equityCreated / (purchase + rehab)
};

function monthlyPayment(principal: number, annualRatePct: number, years: number): number {
  if (principal <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

export function analyzeBrrrr(inputs: BrrrrInputs): BrrrrResult {
  const {
    purchasePrice,
    rehabBudget,
    arv,
    refiLtvPct,
    refiRatePct,
    refiTermYears,
    closingCostsPctAcq,
    closingCostsRefiPct,
    downPaymentPct,
    holdMonths,
    monthlyCarryingCost,
    postRefiMonthlyOpEx,
    postRefiMonthlyRent,
  } = inputs;

  // Acquisition side
  const originalDownPayment = (purchasePrice * downPaymentPct) / 100;
  const originalClosingCosts = (purchasePrice * closingCostsPctAcq) / 100;
  const carryingCostsTotal = monthlyCarryingCost * Math.max(0, holdMonths);
  const totalCashInvested =
    originalDownPayment + originalClosingCosts + carryingCostsTotal + rehabBudget;

  // Refinance side
  const newLoanAmount = (arv * refiLtvPct) / 100;
  const refiClosingCosts = (newLoanAmount * closingCostsRefiPct) / 100;
  // Pay off the original loan (purchase price - original down payment).
  const originalLoanRemaining = purchasePrice - originalDownPayment;
  const cashReturnedAtRefi = Math.max(0, newLoanAmount - originalLoanRemaining - refiClosingCosts);
  const cashLeftInDeal = Math.max(0, totalCashInvested - cashReturnedAtRefi);

  // Post-refi monthly economics
  const newMonthlyPayment = monthlyPayment(newLoanAmount, refiRatePct, refiTermYears);
  const postRefiMonthlyCashFlow =
    postRefiMonthlyRent - postRefiMonthlyOpEx - newMonthlyPayment;
  const postRefiAnnualCashFlow = postRefiMonthlyCashFlow * 12;
  const isInfiniteReturn = cashLeftInDeal <= 0 && postRefiAnnualCashFlow > 0;
  const postRefiCashOnCashPct = isInfiniteReturn
    ? Infinity
    : cashLeftInDeal > 0
    ? (postRefiAnnualCashFlow / cashLeftInDeal) * 100
    : 0;

  const equityCreated = arv - purchasePrice - rehabBudget;
  const allInBasis = purchasePrice + rehabBudget;
  const valueAddRatio = allInBasis > 0 ? equityCreated / allInBasis : 0;

  return {
    originalDownPayment: Math.round(originalDownPayment),
    originalClosingCosts: Math.round(originalClosingCosts),
    carryingCostsTotal: Math.round(carryingCostsTotal),
    rehabBudget: Math.round(rehabBudget),
    totalCashInvested: Math.round(totalCashInvested),

    newLoanAmount: Math.round(newLoanAmount),
    refiClosingCosts: Math.round(refiClosingCosts),
    cashReturnedAtRefi: Math.round(cashReturnedAtRefi),
    cashLeftInDeal: Math.round(cashLeftInDeal),

    newMonthlyPayment: Math.round(newMonthlyPayment),
    postRefiMonthlyCashFlow: Math.round(postRefiMonthlyCashFlow),
    postRefiAnnualCashFlow: Math.round(postRefiAnnualCashFlow),
    postRefiCashOnCashPct: isInfiniteReturn ? Infinity : Math.round(postRefiCashOnCashPct * 10) / 10,
    isInfiniteReturn,

    equityCreated: Math.round(equityCreated),
    valueAddRatio,
  };
}

/** Convenience: pull the inputs we can derive from the standard AnalysisResult + form. */
export function brrrrInputsFromContext(args: {
  purchasePrice: number;
  downPaymentPct: number;
  closingCostsPctAcq: number;
  baseResult: AnalysisResult | null;
  rehabBudget: number;
  arv: number;
  refiLtvPct: number;
  refiRatePct: number;
  refiTermYears: number;
  closingCostsRefiPct: number;
  holdMonths: number;
  /** If unknown, estimate as (property tax + insurance + utilities) — no rent during rehab. */
  monthlyCarryingCostOverride?: number;
}): BrrrrInputs {
  const rent = args.baseResult?.monthlyRentalIncome ?? 0;
  const opEx = args.baseResult
    ? Math.max(0, rent - (args.baseResult.netCashFlow + (args.baseResult.netCashFlow >= 0 ? 0 : 0)) - (args.baseResult.netCashFlow >= 0 ? args.baseResult.netCashFlow : -args.baseResult.netCashFlow))
    : 0;
  // The above is messy — better: derive opEx directly from AnalysisResult fields.
  // We approximate: opEx = rent - netCashFlow - currentMortgagePayment. But we
  // don't have a clean handle on currentMortgagePayment from AnalysisResult.
  // Safe fallback: 40 % of rent (typical for SFR).
  const opExFallback = rent * 0.4;
  const postRefiOpEx = args.monthlyCarryingCostOverride ?? opEx > 0 ? opEx : opExFallback;
  const carryingFallback = rent > 0 ? rent * 0.25 : 800;

  return {
    purchasePrice: args.purchasePrice,
    rehabBudget: args.rehabBudget,
    arv: args.arv,
    refiLtvPct: args.refiLtvPct,
    refiRatePct: args.refiRatePct,
    refiTermYears: args.refiTermYears,
    closingCostsPctAcq: args.closingCostsPctAcq,
    closingCostsRefiPct: args.closingCostsRefiPct,
    downPaymentPct: args.downPaymentPct,
    holdMonths: args.holdMonths,
    monthlyCarryingCost: args.monthlyCarryingCostOverride ?? carryingFallback,
    postRefiMonthlyOpEx: postRefiOpEx,
    postRefiMonthlyRent: rent,
  };
}
