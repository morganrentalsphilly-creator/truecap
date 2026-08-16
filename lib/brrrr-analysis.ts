/**
 * BRRRR (Buy, Rehab, Rent, Refinance, Repeat) analysis.
 *
 * Models the cash-out refinance side of a BRRRR. Inputs combine the
 * user's already-entered acquisition assumptions (purchase price,
 * financing, rent, operating expenses) with three BRRRR-specific
 * inputs (rehab budget, ARV, refi terms).
 *
 * Outputs the cash trapped in the deal after the refi, the new monthly
 * cash flow, and the infinite-return scenario (cash left ≤ 0). When the
 * new loan can't cover the original payoff + refi costs (low appraisal),
 * the shortfall surfaces as cashNeededAtRefi and INCREASES cashLeftInDeal
 * — it never silently disappears.
 */

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
  /** Cash OUT to the investor at the refi table (floored at 0 for display). */
  cashReturnedAtRefi: number;
  /** Cash the investor must BRING to the refi table when the new loan can't
   *  cover the original payoff + refi closing costs (low appraisal). 0 on a
   *  normal cash-out. Already included in cashLeftInDeal. */
  cashNeededAtRefi: number;
  cashLeftInDeal: number;

  // Post-refi cash flow
  newMonthlyPayment: number;
  postRefiMonthlyCashFlow: number;
  postRefiAnnualCashFlow: number;
  /** Finite numeric percentage. When all cash is returned, use
   *  isInfiniteReturn for display and this remains 0. */
  postRefiCashOnCashPct: number;
  isInfiniteReturn: boolean;

  // Sanity / value-add
  equityCreated: number; // ARV − (purchase + rehab)
  valueAddRatio: number; // equityCreated / (purchase + rehab)
};

export type BrrrrValidationIssue = {
  field: keyof BrrrrInputs;
  message: string;
};

const MAX_PROPERTY_VALUE = 100_000_000;
const MAX_MONTHLY_VALUE = 1_000_000;

const INPUT_RULES: ReadonlyArray<{
  field: keyof BrrrrInputs;
  label: string;
  min: number;
  max: number;
  integer?: boolean;
}> = [
  { field: "purchasePrice", label: "Purchase price", min: 1, max: MAX_PROPERTY_VALUE },
  { field: "rehabBudget", label: "Rehab budget", min: 0, max: MAX_PROPERTY_VALUE },
  { field: "arv", label: "ARV", min: 1, max: MAX_PROPERTY_VALUE },
  { field: "refiLtvPct", label: "Refi LTV", min: 0.1, max: 100 },
  { field: "refiRatePct", label: "Refi rate", min: 0, max: 50 },
  { field: "refiTermYears", label: "Refi term", min: 1, max: 50, integer: true },
  { field: "closingCostsPctAcq", label: "Acquisition closing costs", min: 0, max: 25 },
  { field: "closingCostsRefiPct", label: "Refi closing costs", min: 0, max: 25 },
  { field: "downPaymentPct", label: "Down payment", min: 0, max: 100 },
  { field: "holdMonths", label: "Hold months", min: 0, max: 120, integer: true },
  { field: "monthlyCarryingCost", label: "Monthly carrying cost", min: 0, max: MAX_MONTHLY_VALUE },
  { field: "postRefiMonthlyOpEx", label: "Monthly operating expenses", min: 0, max: MAX_MONTHLY_VALUE },
  { field: "postRefiMonthlyRent", label: "Monthly rent", min: 1, max: MAX_MONTHLY_VALUE },
];

/** Public-tool validation: callers can stop before showing misleading output. */
export function validateBrrrrInputs(inputs: BrrrrInputs): BrrrrValidationIssue[] {
  const issues: BrrrrValidationIssue[] = [];
  for (const rule of INPUT_RULES) {
    const value = inputs[rule.field];
    if (!Number.isFinite(value)) {
      issues.push({ field: rule.field, message: `${rule.label} is required.` });
      continue;
    }
    if (rule.integer && !Number.isInteger(value)) {
      issues.push({ field: rule.field, message: `${rule.label} must be a whole number.` });
      continue;
    }
    if (value < rule.min) {
      issues.push({
        field: rule.field,
        message: `${rule.label} must be at least ${rule.min}.`,
      });
      continue;
    }
    if (value > rule.max) {
      issues.push({ field: rule.field, message: `${rule.label} must be ${rule.max} or less.` });
    }
  }
  return issues;
}

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function bounded(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, finiteOrZero(value)));
}

function roundedFinite(value: number): number {
  return Number.isFinite(value) ? Math.round(value) : 0;
}

/** Defense in depth for non-widget callers. The public widget validates and
 *  explains bad fields; the engine still bounds everything so it never emits
 *  NaN/Infinity if another caller supplies malformed numbers. */
function normalizeBrrrrInputs(inputs: BrrrrInputs): BrrrrInputs {
  return {
    purchasePrice: bounded(inputs.purchasePrice, 0, MAX_PROPERTY_VALUE),
    rehabBudget: bounded(inputs.rehabBudget, 0, MAX_PROPERTY_VALUE),
    arv: bounded(inputs.arv, 0, MAX_PROPERTY_VALUE),
    refiLtvPct: bounded(inputs.refiLtvPct, 0, 100),
    refiRatePct: bounded(inputs.refiRatePct, 0, 50),
    refiTermYears: Math.max(1, Math.round(bounded(inputs.refiTermYears, 1, 50))),
    closingCostsPctAcq: bounded(inputs.closingCostsPctAcq, 0, 25),
    closingCostsRefiPct: bounded(inputs.closingCostsRefiPct, 0, 25),
    downPaymentPct: bounded(inputs.downPaymentPct, 0, 100),
    holdMonths: Math.round(bounded(inputs.holdMonths, 0, 120)),
    monthlyCarryingCost: bounded(inputs.monthlyCarryingCost, 0, MAX_MONTHLY_VALUE),
    postRefiMonthlyOpEx: bounded(inputs.postRefiMonthlyOpEx, 0, MAX_MONTHLY_VALUE),
    postRefiMonthlyRent: bounded(inputs.postRefiMonthlyRent, 0, MAX_MONTHLY_VALUE),
  };
}

function monthlyPayment(principal: number, annualRatePct: number, years: number): number {
  if (!Number.isFinite(principal) || !Number.isFinite(annualRatePct) || !Number.isFinite(years)) return 0;
  if (principal <= 0 || annualRatePct < 0 || years <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  const payment = (principal * r) / (1 - Math.pow(1 + r, -n));
  return Number.isFinite(payment) ? payment : 0;
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
  } = normalizeBrrrrInputs(inputs);

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
  // Net cash at the refi table: positive = cash out to the investor,
  // negative = a shortfall the investor must bring when the new loan can't
  // cover the payoff + refi costs (low appraisal). The displayed
  // "cash returned" stays floored at 0, but the shortfall must NOT vanish —
  // it's more cash in the deal, so it flows through to cashLeftInDeal.
  const netCashAtRefi = newLoanAmount - originalLoanRemaining - refiClosingCosts;
  const cashReturnedAtRefi = Math.max(0, netCashAtRefi);
  const cashNeededAtRefi = Math.max(0, -netCashAtRefi);
  const cashLeftInDeal = Math.max(0, totalCashInvested - netCashAtRefi);

  // Post-refi monthly economics
  const newMonthlyPayment = monthlyPayment(newLoanAmount, refiRatePct, refiTermYears);
  const postRefiMonthlyCashFlow =
    postRefiMonthlyRent - postRefiMonthlyOpEx - newMonthlyPayment;
  const postRefiAnnualCashFlow = postRefiMonthlyCashFlow * 12;
  const isInfiniteReturn = cashLeftInDeal <= 0 && postRefiAnnualCashFlow > 0;
  const postRefiCashOnCashPct = isInfiniteReturn
    ? 0
    : cashLeftInDeal > 0
    ? (postRefiAnnualCashFlow / cashLeftInDeal) * 100
    : 0;

  const equityCreated = arv - purchasePrice - rehabBudget;
  const allInBasis = purchasePrice + rehabBudget;
  const valueAddRatio = allInBasis > 0 ? equityCreated / allInBasis : 0;

  return {
    originalDownPayment: roundedFinite(originalDownPayment),
    originalClosingCosts: roundedFinite(originalClosingCosts),
    carryingCostsTotal: roundedFinite(carryingCostsTotal),
    rehabBudget: roundedFinite(rehabBudget),
    totalCashInvested: roundedFinite(totalCashInvested),

    newLoanAmount: roundedFinite(newLoanAmount),
    refiClosingCosts: roundedFinite(refiClosingCosts),
    cashReturnedAtRefi: roundedFinite(cashReturnedAtRefi),
    cashNeededAtRefi: roundedFinite(cashNeededAtRefi),
    cashLeftInDeal: roundedFinite(cashLeftInDeal),

    newMonthlyPayment: roundedFinite(newMonthlyPayment),
    postRefiMonthlyCashFlow: roundedFinite(postRefiMonthlyCashFlow),
    postRefiAnnualCashFlow: roundedFinite(postRefiAnnualCashFlow),
    postRefiCashOnCashPct: Number.isFinite(postRefiCashOnCashPct)
      ? Math.round(postRefiCashOnCashPct * 10) / 10
      : 0,
    isInfiniteReturn,

    equityCreated: roundedFinite(equityCreated),
    valueAddRatio: finiteOrZero(valueAddRatio),
  };
}
