/**
 * Fix-and-flip analysis.
 *
 * Models the buy → rehab → sell cycle. Returns net profit, ROI on cash
 * invested, annualized ROI, profit per day, and the break-even ARV that
 * still yields a profit after all costs.
 */

import type { AnalysisResult } from "./calc-analysis";
import type { InvestmentFormValues } from "./investcalc-schema";

export type FixFlipInputs = {
  purchasePrice: number;
  rehabBudget: number;
  arv: number;
  closingCostsPctAcq: number; // closing on the purchase, % of price
  sellingCostsPct: number; // realtor + transfer + warranty, % of ARV. Typical 6-9.
  holdMonths: number;
  monthlyCarryingCost: number; // taxes + insurance + utilities + interest during rehab
  downPaymentPct: number; // 100 if cash; otherwise the % financed
  /** If down payment is < 100, we're using financing. Loan interest is
   * folded into monthlyCarryingCost — caller should compute that. */
};

export type FixFlipResult = {
  // Cash going in (excludes financed portion)
  cashAtClose: number;
  acquisitionClosingCosts: number;
  rehabBudget: number;
  carryingCostsTotal: number;
  sellingCosts: number;
  totalCashInvested: number;

  // Sale side
  grossProfit: number; // ARV - (purchase + acquisition closing + rehab + carrying + selling)
  netProfit: number; // same as gross here; broken out for future tax-aware accounting
  roiOnCashPct: number;
  /** Simple hold-period annualization; null when holdMonths is zero. */
  annualizedRoiPct: number | null;
  profitPerDay: number;

  // Sensitivity
  breakEvenArv: number; // ARV that yields exactly $0 net profit
};

/**
 * Canonical screening carry shared by the flip UI and tests. It reuses the
 * base underwrite's modeled tax/insurance/utilities when available, so annual
 * tax bills and monthly insurance inputs cannot silently fall back to an
 * unrelated percentage. Acquisition interest remains intentionally
 * interest-only because this is a short hold-period screen, not a lender
 * amortization schedule.
 */
export function estimateFixFlipCarryingCost(
  values: InvestmentFormValues | null,
  result: AnalysisResult | null | undefined,
  downPaymentPct: number,
): number {
  if (!values) return 0;
  const price = Number(values.purchasePrice) || 0;
  const ratePct = Number(values.interestRate ?? 7);
  const loan = price * (1 - downPaymentPct / 100);
  const monthlyInterest = (loan * (ratePct / 100)) / 12;
  const monthlyTax =
    result?.propertyTax ??
    (values.propertyTaxInputMode === "annual" &&
    values.propertyTaxAnnual != null
      ? values.propertyTaxAnnual / 12
      : (price * ((values.propertyTaxPct ?? 1.1) / 100)) / 12);
  const monthlyInsurance =
    result?.insurance ??
    (values.insuranceInputMode === "monthly"
      ? (values.insuranceMonthly ??
        (price * ((values.insurancePct ?? 0.5) / 100)) / 12)
      : (price * ((values.insurancePct ?? 0.5) / 100)) / 12);
  const monthlyUtilities =
    result?.utilities ?? (Number(values.utilitiesMonthly) || 0);

  return Math.round(
    monthlyInterest + monthlyTax + monthlyInsurance + monthlyUtilities,
  );
}

export function analyzeFixFlip(inputs: FixFlipInputs): FixFlipResult {
  const {
    purchasePrice,
    rehabBudget,
    arv,
    closingCostsPctAcq,
    sellingCostsPct,
    holdMonths,
    monthlyCarryingCost,
    downPaymentPct,
  } = inputs;

  const closingAcq = (purchasePrice * closingCostsPctAcq) / 100;
  const cashDown = (purchasePrice * downPaymentPct) / 100;
  const cashAtClose = cashDown + closingAcq;
  const carryingTotal = monthlyCarryingCost * Math.max(0, holdMonths);
  const sellingCosts = (arv * sellingCostsPct) / 100;

  const totalCost =
    purchasePrice + closingAcq + rehabBudget + carryingTotal + sellingCosts;
  const grossProfit = arv - totalCost;
  const netProfit = grossProfit;
  const totalCashInvested = cashAtClose + rehabBudget + carryingTotal;

  const roiOnCashPct =
    totalCashInvested > 0 ? (netProfit / totalCashInvested) * 100 : 0;
  const annualizedRoiPct =
    holdMonths > 0 ? roiOnCashPct / (holdMonths / 12) : null;
  const holdDays = Math.max(1, Math.round(holdMonths * 30.42));
  const profitPerDay = netProfit / holdDays;

  // Break-even ARV: net profit = 0 → ARV − (totalCostExclSelling) − ARV*sellPct/100 = 0
  // → ARV * (1 − sellPct/100) = totalCostExclSelling
  const totalCostExclSelling =
    purchasePrice + closingAcq + rehabBudget + carryingTotal;
  const breakEvenArv =
    sellingCostsPct < 100
      ? totalCostExclSelling / (1 - sellingCostsPct / 100)
      : Infinity;

  return {
    cashAtClose: Math.round(cashAtClose),
    acquisitionClosingCosts: Math.round(closingAcq),
    rehabBudget: Math.round(rehabBudget),
    carryingCostsTotal: Math.round(carryingTotal),
    sellingCosts: Math.round(sellingCosts),
    totalCashInvested: Math.round(totalCashInvested),

    grossProfit: Math.round(grossProfit),
    netProfit: Math.round(netProfit),
    roiOnCashPct: Math.round(roiOnCashPct * 10) / 10,
    annualizedRoiPct:
      annualizedRoiPct == null
        ? null
        : Math.round(annualizedRoiPct * 10) / 10,
    profitPerDay: Math.round(profitPerDay),

    breakEvenArv: Math.round(breakEvenArv),
  };
}
