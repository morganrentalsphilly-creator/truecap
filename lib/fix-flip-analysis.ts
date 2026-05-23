/**
 * Fix-and-flip analysis.
 *
 * Models the buy → rehab → sell cycle. Returns net profit, ROI on cash
 * invested, annualized ROI, profit per day, and the break-even ARV that
 * still yields a profit after all costs.
 */

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
  rehabBudget: number;
  carryingCostsTotal: number;
  sellingCosts: number;
  totalCashInvested: number;

  // Sale side
  grossProfit: number; // ARV - (purchase + rehab + carrying + selling)
  netProfit: number; // same as gross here; broken out for future tax-aware accounting
  roiOnCashPct: number;
  annualizedRoiPct: number;
  profitPerDay: number;

  // Sensitivity
  breakEvenArv: number; // ARV that yields exactly $0 net profit
};

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
    purchasePrice + rehabBudget + carryingTotal + sellingCosts;
  const grossProfit = arv - totalCost;
  const netProfit = grossProfit;
  const totalCashInvested = cashAtClose + rehabBudget + carryingTotal;

  const roiOnCashPct =
    totalCashInvested > 0 ? (netProfit / totalCashInvested) * 100 : 0;
  const holdYears = Math.max(0.001, holdMonths / 12);
  const annualizedRoiPct = roiOnCashPct / holdYears;
  const holdDays = Math.max(1, Math.round(holdMonths * 30.42));
  const profitPerDay = netProfit / holdDays;

  // Break-even ARV: net profit = 0 → ARV − (totalCostExclSelling) − ARV*sellPct/100 = 0
  // → ARV * (1 − sellPct/100) = totalCostExclSelling
  const totalCostExclSelling =
    purchasePrice + rehabBudget + carryingTotal;
  const breakEvenArv =
    sellingCostsPct < 100
      ? totalCostExclSelling / (1 - sellingCostsPct / 100)
      : Infinity;

  return {
    cashAtClose: Math.round(cashAtClose),
    rehabBudget: Math.round(rehabBudget),
    carryingCostsTotal: Math.round(carryingTotal),
    sellingCosts: Math.round(sellingCosts),
    totalCashInvested: Math.round(totalCashInvested),

    grossProfit: Math.round(grossProfit),
    netProfit: Math.round(netProfit),
    roiOnCashPct: Math.round(roiOnCashPct * 10) / 10,
    annualizedRoiPct: Math.round(annualizedRoiPct * 10) / 10,
    profitPerDay: Math.round(profitPerDay),

    breakEvenArv: Math.round(breakEvenArv),
  };
}
