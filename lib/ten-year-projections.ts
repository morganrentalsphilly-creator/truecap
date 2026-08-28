import {
  AUTOMATIC_PMI_TERMINATION_LTV_RATIO,
  buildLoanAmortizationSchedule,
  countMortgageInsurancePayments,
  summarizeLoanByYear,
} from "./loan-amortization";

// v3: taxSavingsAnnual is now a SIGNED net tax effect (nets rental income
// against deductions), not a one-way shield — so cached v2 snapshots, which
// overstated after-tax cash flow in tax-positive years, regenerate.
// v4: the CapEx reserve is excluded from the TAXABLE-income line (a reserve
// isn't a deductible operating expense), so v3 snapshots that over-sheltered
// rental income regenerate.
// v5: debt service stops once the loan amortizes (loan terms < 10 years no
// longer charge P&I/PMI in post-payoff years), so cached snapshots for
// short-term loans regenerate.
// v6: cancellable PMI is charged only through the month the scheduled balance
// reaches 80% LTV instead of for the entire calendar year.
// v7: P&I, payoff, interest, and mortgage-insurance timing all come from the
// shared full-precision amortization schedule. Conventional PMI now follows
// the statutory scheduled 78%-of-original-value automatic termination point;
// borrower-requested cancellation at 80% remains a distinct policy.
// v8: rental-loan mortgage insurance supplied by the user is conservatively
// carried through payoff. Scheduled 78% HPA termination remains available only
// to the owner-occupant conventional path selected by the canonical engine.
// v9: optional interest-only, separate amortization/maturity, balloon and
// renovation-downtime assumptions flow through the same scheduled timeline.
// v10: scheduled rent, recurring other income, fixed-dollar expenses, and
// rent-linked percentage expenses project separately. Contractual balloons
// are also an explicit capital outflow rather than hidden in debt service.
export const TEN_YEAR_PROJECTION_SNAPSHOT_VERSION = 10;

export interface ProjectionYear {
  year: number;
  rentalIncomeAnnual: number;
  operatingExpensesAnnual: number;
  debtServiceAnnual: number;
  netCashFlowAnnual: number;
  taxSavingsAnnual: number;
  afterTaxCashFlowAnnual: number;
  cumulativeCashFlowAnnual: number;
  /** Scheduled rent lost to an explicitly timed renovation. */
  renovationIncomeLossAnnual?: number;
  /** Contractual maturity principal included in financing outflow. */
  balloonPaymentAnnual?: number;
  /** Debt service plus any separately disclosed contractual balloon. */
  financingOutflowAnnual?: number;
}

export interface TenYearProjectionInput {
  monthlyRentalIncome: number;
  /** Current callers provide this split so vacancy and percentage expenses
   * remain linked to scheduled rent while other recurring income stays a
   * separate EGI line. Omitted only for historical cached inputs. */
  scheduledRentMonthly?: number;
  recurringOtherIncomeMonthly?: number;
  /** Property tax, insurance, HOA, utilities and other fixed monthly costs.
   * These grow with the expense-growth assumption. */
  fixedOperatingExpensesMonthly?: number;
  vacancyPct?: number;
  maintenancePct?: number;
  managementPct?: number;
  capexPct?: number;
  /** v1 historically rounds each rent-linked monthly line; v2 preserves
   * exact annual percentages. Legacy inputs omit this with no behavior change. */
  percentageExpenseRounding?: "monthly" | "annual";
  totalOperatingExpenses: number;
  /** Monthly CapEx RESERVE inside totalOperatingExpenses — a cash set-aside,
   *  not a deductible operating expense. Kept in the cash-flow line, excluded
   *  from the taxable-income line. */
  capexReserveMonthly: number;
  monthlyPayment: number;
  /** Annual note rate used to amortize the balance month-by-month for exact
   * PMI cancellation timing. Optional only for legacy cached inputs. */
  interestRate?: number;
  /** Contractual term used by the canonical amortization schedule. Optional
   * only for legacy cached inputs created before projection v7. */
  loanTermYears?: number;
  /** Optional amortization period distinct from contractual maturity. */
  amortizationTermYears?: number;
  /** Whole interest-only months from origination. */
  interestOnlyMonths?: number;
  /** Monthly PMI (0 if none). Folded into the displayed debt service and
   *  automatically terminated at scheduled 78% original-value LTV. */
  pmiMonthly?: number;
  /** Starting loan balance — used by the canonical amortization schedule. */
  loanAmount?: number;
  /** Original purchase value — the LTV basis for the PMI drop. */
  purchasePrice?: number;
  /** When true, mortgage insurance never drops (FHA MIP for the life of the
   *  loan); otherwise it terminates automatically once the scheduled balance
   *  reaches 78% of the original value. */
  pmiNoCancel?: boolean;
  taxSavingsMonthly: number;
  annualDepreciation: number;
  yearlyInterestSchedule?: number[];
  rentGrowthPct: number;
  expenseGrowthPct: number;
  taxRate: number;
  includeInterestDeduction: boolean;
  renovationStartMonth?: number;
  renovationDurationMonths?: number;
  renovationRentLossPct?: number;
}

export interface TenYearProjectionSnapshotPayload {
  analysisId: string;
  projectionYears: ProjectionYear[];
  inputHash: string;
  generatedAt: string;
  version: number;
}

export function buildTenYearProjection(
  input: TenYearProjectionInput,
): ProjectionYear[] {
  const baseAnnualRent = input.monthlyRentalIncome * 12;
  const baseAnnualExpenses = input.totalOperatingExpenses * 12;
  // Same expenses MINUS the CapEx reserve — used only for the taxable-income
  // line, since a reserve isn't a deductible operating expense.
  const baseAnnualExpensesExCapex =
    Math.max(0, input.totalOperatingExpenses - input.capexReserveMonthly) * 12;
  const expenseGrowthFactor = 1 + input.expenseGrowthPct / 100;
  const rentGrowthFactor = 1 + input.rentGrowthPct / 100;
  const hasCanonicalIncomeExpenseBreakdown =
    typeof input.scheduledRentMonthly === "number" &&
    Number.isFinite(input.scheduledRentMonthly) &&
    typeof input.fixedOperatingExpensesMonthly === "number" &&
    Number.isFinite(input.fixedOperatingExpensesMonthly) &&
    typeof input.vacancyPct === "number" &&
    typeof input.maintenancePct === "number" &&
    typeof input.managementPct === "number" &&
    typeof input.capexPct === "number";

  const hasCanonicalLoanTerms =
    (input.loanAmount ?? 0) > 0 &&
    typeof input.interestRate === "number" &&
    Number.isFinite(input.interestRate) &&
    input.interestRate >= 0 &&
    typeof input.loanTermYears === "number" &&
    Number.isFinite(input.loanTermYears) &&
    input.loanTermYears > 0;
  const loanSchedule = hasCanonicalLoanTerms
    ? buildLoanAmortizationSchedule({
        principal: input.loanAmount ?? 0,
        annualRatePct: input.interestRate ?? 0,
        termYears: input.loanTermYears ?? 0,
        maturityTermYears: input.loanTermYears ?? 0,
        amortizationTermYears:
          input.amortizationTermYears ?? input.loanTermYears ?? 0,
        interestOnlyMonths: input.interestOnlyMonths ?? 0,
      })
    : null;
  const annualLoanSchedule = loanSchedule
    ? summarizeLoanByYear(loanSchedule)
    : [];

  // PMI is folded into displayed debt service only while the shared scheduled
  // balance remains above the applicable threshold. `pmiNoCancel` preserves
  // loan-life FHA/other MIP behavior; borrower-requested 80% cancellation is
  // deliberately not inferred from this boolean or from conventional loans.
  const pmiMonthly = input.pmiMonthly ?? 0;
  const legacyAmortizedScheduleLength =
    (input.loanAmount ?? 0) > 0
      ? (input.yearlyInterestSchedule?.length ?? 0)
      : 0;
  let legacyLoanBalance = input.loanAmount ?? 0;

  let cumulativeCashFlowAnnual = 0;

  return Array.from({ length: 10 }, (_, index) => {
    const year = index + 1;
    const rentGrowth = Math.pow(rentGrowthFactor, index);
    const expenseGrowth = Math.pow(expenseGrowthFactor, index);
    const scheduledRentMonthly = hasCanonicalIncomeExpenseBreakdown
      ? (input.scheduledRentMonthly ?? 0) * rentGrowth
      : (baseAnnualRent / 12) * rentGrowth;
    const scheduledRentalIncomeAnnual = scheduledRentMonthly * 12;
    const recurringOtherIncomeAnnual = hasCanonicalIncomeExpenseBreakdown
      ? (input.recurringOtherIncomeMonthly ?? 0) * 12 * rentGrowth
      : 0;
    const renovationStart = Math.max(
      1,
      Math.floor(input.renovationStartMonth ?? 0),
    );
    const renovationDuration = Math.max(
      0,
      Math.floor(input.renovationDurationMonths ?? 0),
    );
    const renovationEndExclusive = renovationStart + renovationDuration;
    const yearStartMonth = index * 12 + 1;
    const yearEndExclusive = yearStartMonth + 12;
    const affectedMonths =
      renovationDuration > 0 && (input.renovationRentLossPct ?? 0) > 0
        ? Math.max(
            0,
            Math.min(yearEndExclusive, renovationEndExclusive) -
              Math.max(yearStartMonth, renovationStart),
          )
        : 0;
    const renovationIncomeLossAnnual =
      scheduledRentMonthly *
      affectedMonths *
      ((input.renovationRentLossPct ?? 0) / 100);
    const rentalIncomeAnnual = Math.round(
      scheduledRentalIncomeAnnual +
        recurringOtherIncomeAnnual -
        renovationIncomeLossAnnual,
    );
    // Match the year-1 engine's per-line monthly rounding, then keep each
    // percentage tied to that year's scheduled rent. Rounding only the sum
    // could drift by several dollars from the operating statement.
    const calculateRentLinkedMonthly = (pct: number | undefined) => {
      if (!hasCanonicalIncomeExpenseBreakdown) return 0;
      const exact = scheduledRentMonthly * ((pct ?? 0) / 100);
      return input.percentageExpenseRounding === "annual"
        ? exact
        : Math.round(exact);
    };
    const vacancyMonthly = calculateRentLinkedMonthly(input.vacancyPct);
    const maintenanceMonthly = calculateRentLinkedMonthly(input.maintenancePct);
    const managementMonthly = calculateRentLinkedMonthly(input.managementPct);
    const capexMonthly = calculateRentLinkedMonthly(input.capexPct);
    const rentLinkedMonthly =
      vacancyMonthly + maintenanceMonthly + managementMonthly + capexMonthly;
    const operatingExpensesAnnual = hasCanonicalIncomeExpenseBreakdown
      ? Math.round(
          (input.fixedOperatingExpensesMonthly ?? 0) * 12 * expenseGrowth +
            rentLinkedMonthly * 12,
        )
      : Math.round(baseAnnualExpenses * expenseGrowth);
    const annualLoan = annualLoanSchedule[index];
    const yearlyInterestForYear =
      annualLoan?.interest ?? input.yearlyInterestSchedule?.[index];
    const loanPaidOff = loanSchedule
      ? annualLoan == null
      : legacyAmortizedScheduleLength > 0 &&
        index >= legacyAmortizedScheduleLength;
    const principalAndInterestThisYear = loanSchedule
      ? (annualLoan?.scheduledPayment ?? 0)
      : loanPaidOff
        ? 0
        : input.monthlyPayment * 12;

    let pmiMonthsThisYear = 0;
    if (pmiMonthly > 0 && !loanPaidOff) {
      if (loanSchedule) {
        pmiMonthsThisYear = countMortgageInsurancePayments(
          loanSchedule,
          input.purchasePrice ?? 0,
          input.pmiNoCancel === true ? "loan-life" : "automatic-78",
          index * 12 + 1,
          (index + 1) * 12,
        );
      } else if (legacyLoanBalance > 0) {
        // A pre-v7 cached input may omit contractual terms. Preserve a bounded
        // compatibility path using its annual interest total; current callers
        // always supply terms and therefore use exact scheduled-month timing.
        const annualPrincipal = Math.min(
          legacyLoanBalance,
          Math.max(
            0,
            input.monthlyPayment * 12 -
              (input.yearlyInterestSchedule?.[index] ?? 0),
          ),
        );
        if (input.pmiNoCancel === true) {
          pmiMonthsThisYear =
            annualPrincipal >= legacyLoanBalance
              ? Math.min(
                  12,
                  Math.ceil(
                    legacyLoanBalance /
                      (annualPrincipal / 12 || legacyLoanBalance),
                  ),
                )
              : 12;
        } else {
          const threshold =
            (input.purchasePrice ?? 0) * AUTOMATIC_PMI_TERMINATION_LTV_RATIO;
          const principalPerMonth = annualPrincipal / 12;
          pmiMonthsThisYear =
            legacyLoanBalance > threshold && principalPerMonth > 0
              ? Math.min(
                  12,
                  Math.ceil(
                    (legacyLoanBalance - threshold) / principalPerMonth,
                  ),
                )
              : legacyLoanBalance > threshold
                ? 12
                : 0;
        }
        legacyLoanBalance = Math.max(0, legacyLoanBalance - annualPrincipal);
      }
    } else if (!loanSchedule && !loanPaidOff && legacyLoanBalance > 0) {
      const annualPrincipal = Math.min(
        legacyLoanBalance,
        Math.max(
          0,
          input.monthlyPayment * 12 -
            (input.yearlyInterestSchedule?.[index] ?? 0),
        ),
      );
      legacyLoanBalance = Math.max(0, legacyLoanBalance - annualPrincipal);
    }
    const pmiThisYear = pmiMonthly * pmiMonthsThisYear;
    const debtServiceAnnual = principalAndInterestThisYear + pmiThisYear;
    const balloonPaymentAnnual = annualLoan?.balloonPrincipal ?? 0;
    const financingOutflowAnnual = debtServiceAnnual + balloonPaymentAnnual;

    const netCashFlowAnnual =
      rentalIncomeAnnual - operatingExpensesAnnual - financingOutflowAnnual;
    // Signed tax EFFECT for the year — not a one-way "savings". Deductions
    // (operating expenses + deductible mortgage interest + depreciation) shelter
    // rental income; once they no longer cover it the deal turns tax-POSITIVE
    // and OWES tax. Net rental income against deductions — identical to the
    // tax-strategy panel's netTaxBenefitAnnual — so after-tax cash flow stays
    // honest in later years. The old formula only ever ADDED the deduction value
    // (ignoring rental income + operating expenses), which overstated after-tax
    // returns once the shelter ran out — always in the optimistic direction.
    const deductibleInterestAnnual =
      input.includeInterestDeduction &&
      typeof yearlyInterestForYear === "number"
        ? yearlyInterestForYear
        : 0;
    const operatingExpensesExCapexAnnual = hasCanonicalIncomeExpenseBreakdown
      ? operatingExpensesAnnual - capexMonthly * 12
      : Math.round(baseAnnualExpensesExCapex * expenseGrowth);
    const taxableIncomeAnnual =
      rentalIncomeAnnual -
      operatingExpensesExCapexAnnual -
      deductibleInterestAnnual -
      input.annualDepreciation;
    const taxSavingsAnnual = Math.round(-taxableIncomeAnnual * input.taxRate);
    const afterTaxCashFlowAnnual = netCashFlowAnnual + taxSavingsAnnual;
    cumulativeCashFlowAnnual += netCashFlowAnnual;

    return {
      year,
      rentalIncomeAnnual,
      operatingExpensesAnnual,
      debtServiceAnnual,
      netCashFlowAnnual,
      taxSavingsAnnual,
      afterTaxCashFlowAnnual,
      cumulativeCashFlowAnnual,
      ...(renovationIncomeLossAnnual > 0 ? { renovationIncomeLossAnnual } : {}),
      ...(balloonPaymentAnnual > 0 ? { balloonPaymentAnnual } : {}),
      ...(balloonPaymentAnnual > 0 ? { financingOutflowAnnual } : {}),
    };
  });
}

export function buildTenYearProjectionInputHash(
  input: TenYearProjectionInput,
): string {
  const normalizedPayload = {
    monthlyRentalIncome: input.monthlyRentalIncome,
    scheduledRentMonthly: input.scheduledRentMonthly ?? null,
    recurringOtherIncomeMonthly: input.recurringOtherIncomeMonthly ?? 0,
    fixedOperatingExpensesMonthly: input.fixedOperatingExpensesMonthly ?? null,
    vacancyPct: input.vacancyPct ?? null,
    maintenancePct: input.maintenancePct ?? null,
    managementPct: input.managementPct ?? null,
    capexPct: input.capexPct ?? null,
    percentageExpenseRounding: input.percentageExpenseRounding ?? null,
    totalOperatingExpenses: input.totalOperatingExpenses,
    // v4 subtracts the CapEx reserve from the taxable-income line, so an
    // offsetting maintenance/CapEx edit (total opex unchanged) must still
    // produce a new hash — omitting it served stale cached tax lines.
    capexReserveMonthly: input.capexReserveMonthly,
    monthlyPayment: input.monthlyPayment,
    interestRate: input.interestRate ?? null,
    loanTermYears: input.loanTermYears ?? null,
    amortizationTermYears: input.amortizationTermYears ?? null,
    interestOnlyMonths: input.interestOnlyMonths ?? 0,
    pmiMonthly: input.pmiMonthly ?? 0,
    pmiNoCancel: input.pmiNoCancel === true,
    loanAmount: input.loanAmount ?? 0,
    purchasePrice: input.purchasePrice ?? 0,
    taxSavingsMonthly: input.taxSavingsMonthly,
    annualDepreciation: input.annualDepreciation,
    yearlyInterestSchedule: input.yearlyInterestSchedule ?? [],
    rentGrowthPct: input.rentGrowthPct,
    expenseGrowthPct: input.expenseGrowthPct,
    taxRate: input.taxRate,
    includeInterestDeduction: input.includeInterestDeduction,
    renovationStartMonth: input.renovationStartMonth ?? null,
    renovationDurationMonths: input.renovationDurationMonths ?? 0,
    renovationRentLossPct: input.renovationRentLossPct ?? 0,
    version: TEN_YEAR_PROJECTION_SNAPSHOT_VERSION,
  };

  const serialized = JSON.stringify(normalizedPayload);
  let hash = 2166136261;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16)}`;
}
