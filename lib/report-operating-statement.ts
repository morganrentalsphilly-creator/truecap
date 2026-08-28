import type { AnalysisResult } from "@/lib/calc-analysis";

/**
 * The Year-1 operating statement, shaped for the PDF.
 *
 * WHY: the report is prepared for lender review and has a dedicated `mode:
 * "lender"` variant, yet it never printed NOI, the loan amount, the monthly
 * payment, PMI, or cash to close — the first five numbers a lender asks for.
 * Worse, they were not recoverable from what WAS printed: the 10-year table's
 * "Op. Expenses" column includes CapEx and vacancy while NOI excludes both, so
 * rent minus that column is not NOI; and its "Debt Service" column includes
 * PMI while the DSCR denominator does not. Same words, different quantities.
 *
 * NO NEW MATH. Every figure here already exists on AnalysisResult. The only
 * transformation is ×12 on the per-month line items, which is the same
 * annualisation lib/calc-analysis.ts already applies to build its own annual
 * aggregates — and the totals below are taken from the engine directly rather
 * than re-summed here, so a rounding difference cannot creep in between the
 * statement and the metrics it explains.
 *
 * Kept out of the PDF layer on purpose: lib/pdf-generator.ts must never be
 * where a financial figure is computed.
 */

export type OperatingStatementLine = {
  label: string;
  /** Annual dollars. Positive = money out, for the expense lines. */
  amount: number;
};

export type ReportOperatingStatement = {
  grossScheduledIncome: number;
  recurringOtherIncome?: number;
  vacancyAllowance: number;
  renovationIncomeLoss?: number;
  effectiveGrossIncome: number;
  operatingExpenses: OperatingStatementLine[];
  operatingExpensesTotal: number;
  /** Lender-standard NOI: EGI less operating expenses. Excludes CapEx, debt
   *  service, PMI and income tax. Taken straight from the engine. */
  noi: number;
  annualDebtService: number;
  pmiAnnual: number;
  capexReserve: number;
  netCashFlowAnnual: number;
  /** Financing facts a lender or partner asks for before anything else. */
  loanAmount: number;
  monthlyPayment: number;
  initialMonthlyLoanPayment?: number;
  amortizingMonthlyLoanPayment?: number;
  interestOnlyMonths?: number;
  amortizationTermYears?: number;
  loanMaturityTermYears?: number;
  balloonPayment?: number;
  balloonMonth?: number;
  downPayment?: number;
  closingCosts?: number;
  loanPointsAmount?: number;
  originationFee?: number;
  loanFees?: number;
  initialReserve?: number;
  lenderEscrowDeposit?: number;
  lenderReserveDeposit?: number;
  acquisitionCredits?: number;
  totalCashRequired: number;
  /** True when there is no loan — the debt lines are then meaningless. */
  isCashPurchase: boolean;
};

const annualize = (monthly: number) => Math.round(monthly * 12);

export function buildReportOperatingStatement(
  result: AnalysisResult,
): ReportOperatingStatement {
  // Vacancy is deliberately ABSENT from this list: the engine reclassifies it
  // above the NOI line as an income allowance (see calc-analysis.ts), and
  // listing it again here would double-count it against EGI.
  //
  // CapEx is also absent, and for the opposite reason: it is a below-the-line
  // return-of-capital reserve excluded from NOI, so it belongs under the NOI
  // line with debt service, not above it.
  const operatingExpenses: OperatingStatementLine[] = [
    { label: "Property tax", amount: annualize(result.propertyTax) },
    { label: "Insurance", amount: annualize(result.insurance) },
    { label: "Maintenance", amount: annualize(result.maintenance) },
    { label: "Management", amount: annualize(result.management) },
    { label: "HOA", amount: annualize(result.hoa) },
    { label: "Utilities", amount: annualize(result.utilities) },
    {
      label: "Other recurring expense",
      amount: annualize(result.recurringOtherExpenseMonthly ?? 0),
    },
    {
      label: "Turnover reserve",
      amount: annualize(result.turnoverReserveMonthly ?? 0),
    },
    {
      label: "Leasing reserve",
      amount: annualize(result.leasingReserveMonthly ?? 0),
    },
    {
      label: "Landscaping",
      amount: annualize(result.landscapingMonthly ?? 0),
    },
    {
      label: "Pest control",
      amount: annualize(result.pestControlMonthly ?? 0),
    },
    {
      label: "Administrative",
      amount: annualize(result.administrativeMonthly ?? 0),
    },
  ].filter((line) => line.amount > 0);

  return {
    grossScheduledIncome: result.grossScheduledIncomeAnnual,
    recurringOtherIncome: result.recurringOtherIncomeAnnual ?? 0,
    vacancyAllowance: result.vacancyAllowanceAnnual,
    renovationIncomeLoss: result.renovationIncomeLossAnnual ?? 0,
    effectiveGrossIncome: result.effectiveGrossIncomeAnnual,
    operatingExpenses,
    // From the engine, NOT the sum of the lines above — a zero-valued line is
    // filtered out for display and rounding is per-line, so re-summing could
    // disagree with the NOI printed beside it.
    operatingExpensesTotal: result.operatingExpensesAnnual,
    noi: result.noiAnnual,
    annualDebtService: result.annualDebtService,
    pmiAnnual: annualize(result.pmiMonthly),
    capexReserve: annualize(result.capex),
    netCashFlowAnnual: annualize(result.netCashFlow),
    loanAmount: result.loanAmount,
    monthlyPayment: result.monthlyPayment,
    initialMonthlyLoanPayment: result.initialMonthlyLoanPayment,
    amortizingMonthlyLoanPayment: result.amortizingMonthlyLoanPayment,
    interestOnlyMonths: result.interestOnlyMonths,
    amortizationTermYears: result.amortizationTermYears,
    loanMaturityTermYears: result.loanMaturityTermYears,
    balloonPayment: result.balloonPayment,
    balloonMonth: result.balloonMonth,
    downPayment: result.downPayment,
    closingCosts: result.closingCosts,
    loanPointsAmount: result.loanPointsAmount,
    originationFee: result.originationFee,
    loanFees: result.loanFees,
    initialReserve: result.initialReserve,
    lenderEscrowDeposit: result.lenderEscrowDeposit,
    lenderReserveDeposit: result.lenderReserveDeposit,
    acquisitionCredits: result.acquisitionCredits,
    totalCashRequired: result.totalCashRequired,
    isCashPurchase: result.monthlyPayment <= 0,
  };
}
