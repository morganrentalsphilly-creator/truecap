/**
 * Owned-deal equity — once a deal closes, the question flips from "should I
 * buy?" to "how is it doing?". Given when the user bought (close date) and the
 * deal's own financing + appreciation assumptions, this derives today's
 * estimated equity = the original down payment + appreciation since purchase +
 * principal paid down (i.e. current value − remaining loan balance).
 *
 * Pure + dependency-free (no IO, client-safe, unit-tested). Appreciation uses
 * the DEAL's own appreciationRatePct so this can't tell a different story than
 * the 10-year projection. Estimate only — the user can refine the assumption.
 */

export type OwnedEquityInput = {
  /** What they paid. */
  purchasePrice: number;
  /** Original loan amount (0 for a cash purchase). */
  loanAmount: number;
  /** Note rate, annual %, e.g. 6.75. */
  annualRatePct: number;
  /** Amortization term in years (e.g. 30). */
  termYears: number;
  /** Annual appreciation assumption, % (the deal's own assumption). */
  appreciationRatePct: number;
};

export type OwnedEquitySummary = {
  monthsOwned: number;
  yearsOwned: number;
  /** purchasePrice grown at the appreciation rate for yearsOwned. */
  currentValue: number;
  /** Outstanding loan balance after monthsOwned of amortization. */
  loanBalance: number;
  /** currentValue − loanBalance. */
  equity: number;
  /** currentValue − purchasePrice (value created by the market). */
  appreciationGain: number;
  /** loanAmount − loanBalance (equity created by paying the note down). */
  principalPaid: number;
  /** purchasePrice − loanAmount (the cash that went in at close). */
  downPayment: number;
  /** equity − downPayment (total equity gained since close). */
  totalEquityGain: number;
};

/**
 * Standard amortizing-loan remaining balance after `monthsElapsed` payments.
 * Handles the 0%-rate edge (linear paydown) and clamps to [0, loanAmount].
 */
export function remainingLoanBalance(
  loanAmount: number,
  annualRatePct: number,
  termYears: number,
  monthsElapsed: number,
): number {
  if (!(loanAmount > 0)) return 0;
  const n = Math.round(termYears * 12);
  if (!(n > 0)) return 0;
  const m = Math.min(Math.max(monthsElapsed, 0), n);
  if (m >= n) return 0; // fully amortized

  const r = annualRatePct / 100 / 12;
  if (r === 0) {
    // No interest → principal pays down linearly.
    return Math.max(0, loanAmount * (1 - m / n));
  }
  // Balance_m = P · [ (1+r)^n − (1+r)^m ] / [ (1+r)^n − 1 ]
  const pow_n = Math.pow(1 + r, n);
  const pow_m = Math.pow(1 + r, m);
  const balance = (loanAmount * (pow_n - pow_m)) / (pow_n - 1);
  return Math.max(0, balance);
}

/** Whole months between two dates (asOf − close), floored at 0. */
export function monthsOwnedBetween(closeDate: Date, asOf: Date): number {
  let months =
    (asOf.getUTCFullYear() - closeDate.getUTCFullYear()) * 12 +
    (asOf.getUTCMonth() - closeDate.getUTCMonth());
  // Don't count the final month until its day-of-month is reached.
  if (asOf.getUTCDate() < closeDate.getUTCDate()) months -= 1;
  return Math.max(0, months);
}

/**
 * Estimate today's equity for an owned deal. `monthsOwned` is whole months
 * since close (use monthsOwnedBetween). Returns null when there's no usable
 * purchase price (nothing to compute).
 */
export function computeOwnedEquity(
  input: OwnedEquityInput,
  monthsOwned: number,
): OwnedEquitySummary | null {
  const { purchasePrice, loanAmount, annualRatePct, termYears, appreciationRatePct } = input;
  if (!(purchasePrice > 0)) return null;

  const months = Math.max(0, Math.round(monthsOwned));
  const years = months / 12;
  const appr = (Number.isFinite(appreciationRatePct) ? appreciationRatePct : 0) / 100;

  const currentValue = purchasePrice * Math.pow(1 + appr, years);
  const loan = Math.max(0, loanAmount);
  const loanBalance = remainingLoanBalance(loan, annualRatePct, termYears, months);
  const equity = currentValue - loanBalance;
  const downPayment = Math.max(0, purchasePrice - loan);

  return {
    monthsOwned: months,
    yearsOwned: years,
    currentValue,
    loanBalance,
    equity,
    appreciationGain: currentValue - purchasePrice,
    principalPaid: Math.max(0, loan - loanBalance),
    downPayment,
    totalEquityGain: equity - downPayment,
  };
}
