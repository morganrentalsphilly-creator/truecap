/**
 * Canonical, full-precision fixed-rate loan amortization.
 *
 * Keep every calculation in this module unrounded. Currency rounding belongs
 * at a presentation/export boundary, never inside the schedule that feeds
 * interest, payoff, equity, tax, or mortgage-insurance calculations.
 */

export const AUTOMATIC_PMI_TERMINATION_LTV_RATIO = 0.78;
export const BORROWER_REQUESTED_PMI_CANCELLATION_LTV_RATIO = 0.8;

export type MortgageInsuranceTerminationPolicy =
  | "automatic-78"
  | "borrower-requested-80"
  | "loan-life";

export interface LoanAmortizationTerms {
  principal: number;
  annualRatePct: number;
  /** Historical/default contract: when the advanced terms below are omitted,
   * this is both the amortization period and contractual maturity. */
  termYears: number;
  /** Period used to calculate the scheduled principal-and-interest payment.
   * Defaults to `termYears`. */
  amortizationTermYears?: number;
  /** Contractual maturity. A remaining balance is due as a balloon at this
   * month. Defaults to `termYears`. */
  maturityTermYears?: number;
  /** Scheduled interest-only payments from origination. Whole months only. */
  interestOnlyMonths?: number;
}

export interface LoanAmortizationPayment {
  month: number;
  openingBalance: number;
  payment: number;
  interest: number;
  principal: number;
  endingBalance: number;
  /** Recurring contractual payment for the month, excluding a balloon. */
  scheduledPayment: number;
  /** Remaining principal due at contractual maturity. Zero in other months. */
  balloonPrincipal: number;
  phase: "interest-only" | "amortizing" | "balloon";
}

export interface LoanAmortizationSchedule {
  principal: number;
  annualRatePct: number;
  termMonths: number;
  amortizationTermMonths: number;
  maturityTermMonths: number;
  interestOnlyMonths: number;
  /** Post-interest-only principal-and-interest payment. Kept under the
   * historical name for backward compatibility. */
  scheduledMonthlyPayment: number;
  /** First contractual payment, excluding any maturity balloon. */
  initialMonthlyPayment: number;
  /** Principal due at maturity after all recurring scheduled payments. */
  balloonPayment: number;
  payments: LoanAmortizationPayment[];
}

export interface AnnualLoanAmortization {
  year: number;
  payment: number;
  interest: number;
  principal: number;
  endingBalance: number;
  paymentCount: number;
  /** Recurring P&I/interest-only payments, excluding a maturity balloon. */
  scheduledPayment: number;
  /** Principal paid as a contractual balloon during the year. */
  balloonPrincipal: number;
}

function termMonths(termYears: number): number {
  if (!Number.isFinite(termYears) || termYears <= 0) return 0;
  return Math.max(1, Math.round(termYears * 12));
}

/** Scheduled monthly principal-and-interest payment for a fixed-rate loan. */
export function calculateMonthlyLoanPayment({
  principal,
  annualRatePct,
  termYears,
}: LoanAmortizationTerms): number {
  const months = termMonths(termYears);
  if (!Number.isFinite(principal) || principal <= 0 || months === 0) return 0;
  if (!Number.isFinite(annualRatePct) || annualRatePct < 0) return 0;

  const monthlyRate = annualRatePct / 100 / 12;
  if (monthlyRate === 0) return principal / months;

  // 1 - (1 + r)^-n, expressed with log1p/expm1 to retain precision for
  // very small rates and remain finite for long or high-rate loans.
  const denominator = -Math.expm1(-months * Math.log1p(monthlyRate));
  if (!Number.isFinite(denominator) || denominator <= 0) return 0;
  return (principal * monthlyRate) / denominator;
}

/** Build the complete contractual schedule without cent/dollar rounding. */
export function buildLoanAmortizationSchedule(
  terms: LoanAmortizationTerms,
): LoanAmortizationSchedule {
  const amortizationTermYears = terms.amortizationTermYears ?? terms.termYears;
  const maturityTermYears = terms.maturityTermYears ?? terms.termYears;
  const amortizationMonths = termMonths(amortizationTermYears);
  const maturityMonths = termMonths(maturityTermYears);
  const requestedInterestOnlyMonths = Number.isFinite(terms.interestOnlyMonths)
    ? Math.max(0, Math.floor(terms.interestOnlyMonths ?? 0))
    : 0;
  const interestOnlyMonths = Math.min(
    requestedInterestOnlyMonths,
    maturityMonths,
  );
  const scheduledMonthlyPayment = calculateMonthlyLoanPayment({
    principal: terms.principal,
    annualRatePct: terms.annualRatePct,
    termYears: amortizationTermYears,
  });
  const normalizedPrincipal =
    Number.isFinite(terms.principal) && terms.principal > 0
      ? terms.principal
      : 0;
  const normalizedRate =
    Number.isFinite(terms.annualRatePct) && terms.annualRatePct >= 0
      ? terms.annualRatePct
      : 0;

  if (
    normalizedPrincipal === 0 ||
    amortizationMonths === 0 ||
    maturityMonths === 0 ||
    scheduledMonthlyPayment <= 0
  ) {
    return {
      principal: normalizedPrincipal,
      annualRatePct: normalizedRate,
      termMonths: maturityMonths,
      amortizationTermMonths: amortizationMonths,
      maturityTermMonths: maturityMonths,
      interestOnlyMonths,
      scheduledMonthlyPayment: 0,
      initialMonthlyPayment: 0,
      balloonPayment: 0,
      payments: [],
    };
  }

  const monthlyRate = normalizedRate / 100 / 12;
  const payments: LoanAmortizationPayment[] = [];
  let balance = normalizedPrincipal;

  for (let month = 1; month <= maturityMonths && balance > 0; month += 1) {
    const openingBalance = balance;
    const interest = openingBalance * monthlyRate;
    const isInterestOnly = month <= interestOnlyMonths;
    const recurringPayment = isInterestOnly
      ? interest
      : Math.min(scheduledMonthlyPayment, openingBalance + interest);
    const scheduledPrincipal = Math.min(
      openingBalance,
      Math.max(0, recurringPayment - interest),
    );
    const balanceAfterScheduledPayment = Math.max(
      0,
      openingBalance - scheduledPrincipal,
    );
    const isMaturity = month === maturityMonths;
    // At maturity, the remaining balance is an explicit balloon rather than
    // being hidden inside a seemingly normal final installment.
    const balloonPrincipal = isMaturity ? balanceAfterScheduledPayment : 0;
    const principal = scheduledPrincipal + balloonPrincipal;
    const scheduledPayment = interest + scheduledPrincipal;
    const payment = scheduledPayment + balloonPrincipal;
    const endingBalance = isMaturity
      ? 0
      : Math.max(0, openingBalance - scheduledPrincipal);

    payments.push({
      month,
      openingBalance,
      payment,
      interest,
      principal,
      endingBalance,
      scheduledPayment,
      balloonPrincipal,
      phase:
        isMaturity && balloonPrincipal > 0
          ? "balloon"
          : isInterestOnly
            ? "interest-only"
            : "amortizing",
    });
    balance = endingBalance;
  }

  return {
    principal: normalizedPrincipal,
    annualRatePct: normalizedRate,
    termMonths: maturityMonths,
    amortizationTermMonths: amortizationMonths,
    maturityTermMonths: maturityMonths,
    interestOnlyMonths,
    scheduledMonthlyPayment,
    initialMonthlyPayment: payments[0]?.scheduledPayment ?? 0,
    balloonPayment: payments.at(-1)?.balloonPrincipal ?? 0,
    payments,
  };
}

export function summarizeLoanByYear(
  schedule: LoanAmortizationSchedule,
): AnnualLoanAmortization[] {
  const years: AnnualLoanAmortization[] = [];

  for (const row of schedule.payments) {
    const index = Math.floor((row.month - 1) / 12);
    const current = years[index] ?? {
      year: index + 1,
      payment: 0,
      interest: 0,
      principal: 0,
      endingBalance: row.openingBalance,
      paymentCount: 0,
      scheduledPayment: 0,
      balloonPrincipal: 0,
    };
    current.payment += row.payment;
    current.scheduledPayment += row.scheduledPayment;
    current.balloonPrincipal += row.balloonPrincipal;
    current.interest += row.interest;
    current.principal += row.principal;
    current.endingBalance = row.endingBalance;
    current.paymentCount += 1;
    years[index] = current;
  }

  return years;
}

/** Contractual balance after a number of completed scheduled payments. */
export function loanBalanceAfterPayments(
  schedule: LoanAmortizationSchedule,
  completedPayments: number,
): number {
  if (completedPayments <= 0) return schedule.principal;
  const row =
    schedule.payments[
      Math.min(Math.floor(completedPayments), schedule.payments.length) - 1
    ];
  return row?.endingBalance ?? 0;
}

export function shouldChargeMortgageInsurance(
  payment: LoanAmortizationPayment,
  originalPropertyValue: number,
  policy: MortgageInsuranceTerminationPolicy,
): boolean {
  if (payment.openingBalance <= 0) return false;
  if (policy === "loan-life") return true;
  if (!Number.isFinite(originalPropertyValue) || originalPropertyValue <= 0) {
    return false;
  }

  const threshold =
    policy === "borrower-requested-80"
      ? BORROWER_REQUESTED_PMI_CANCELLATION_LTV_RATIO
      : AUTOMATIC_PMI_TERMINATION_LTV_RATIO;
  return payment.openingBalance > originalPropertyValue * threshold;
}

export function countMortgageInsurancePayments(
  schedule: LoanAmortizationSchedule,
  originalPropertyValue: number,
  policy: MortgageInsuranceTerminationPolicy,
  startMonth = 1,
  endMonth = schedule.payments.length,
): number {
  return schedule.payments.filter(
    (payment) =>
      payment.month >= startMonth &&
      payment.month <= endMonth &&
      shouldChargeMortgageInsurance(payment, originalPropertyValue, policy),
  ).length;
}
