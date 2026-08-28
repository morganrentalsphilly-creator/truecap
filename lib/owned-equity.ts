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

import {
  buildLoanAmortizationSchedule,
  loanBalanceAfterPayments,
} from "@/lib/loan-amortization";

export type OwnedEquityInput = {
  /** What they paid. */
  purchasePrice: number;
  /** Original loan amount (0 for a cash purchase). */
  loanAmount: number;
  /** Note rate, annual %, e.g. 6.75. */
  annualRatePct: number;
  /** Contractual maturity in years (e.g. 30). */
  termYears: number;
  /** Payment-amortization period. Defaults to contractual maturity. */
  amortizationTermYears?: number;
  /** Scheduled interest-only period from origination. */
  interestOnlyMonths?: number;
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
 * Contractual remaining balance after `monthsElapsed` payments. The default
 * four-argument form preserves the historical fully-amortizing contract;
 * advanced terms use the same full-precision schedule as the analyzer,
 * projections, payoff, and reports.
 */
export function remainingLoanBalance(
  loanAmount: number,
  annualRatePct: number,
  termYears: number,
  monthsElapsed: number,
  advancedTerms?: Pick<
    OwnedEquityInput,
    "amortizationTermYears" | "interestOnlyMonths"
  >,
): number {
  const schedule = buildLoanAmortizationSchedule({
    principal: loanAmount,
    annualRatePct,
    termYears,
    maturityTermYears: termYears,
    amortizationTermYears: advancedTerms?.amortizationTermYears ?? termYears,
    interestOnlyMonths: advancedTerms?.interestOnlyMonths ?? 0,
  });
  return loanBalanceAfterPayments(
    schedule,
    Math.max(0, Math.floor(monthsElapsed)),
  );
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
  const {
    purchasePrice,
    loanAmount,
    annualRatePct,
    termYears,
    amortizationTermYears,
    interestOnlyMonths,
    appreciationRatePct,
  } = input;
  if (!(purchasePrice > 0)) return null;

  const months = Math.max(0, Math.round(monthsOwned));
  const years = months / 12;
  const appr = (Number.isFinite(appreciationRatePct) ? appreciationRatePct : 0) / 100;

  const currentValue = purchasePrice * Math.pow(1 + appr, years);
  const loan = Math.max(0, loanAmount);
  const loanBalance = remainingLoanBalance(
    loan,
    annualRatePct,
    termYears,
    months,
    { amortizationTermYears, interestOnlyMonths },
  );
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
