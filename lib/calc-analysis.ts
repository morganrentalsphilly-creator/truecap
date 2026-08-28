import { InvestmentFormValues, isValidRentalUnit } from "./investcalc-schema";
import {
  buildTaxStrategyProjection,
  type TaxStrategyYear,
} from "./tax-strategy";
import {
  buildTenYearProjection,
  TEN_YEAR_PROJECTION_SNAPSHOT_VERSION,
  type ProjectionYear,
} from "./ten-year-projections";
import {
  TRUECAP_UNDERWRITING_STANDARD_VERSION,
  TRUECAP_UNDERWRITING_STANDARD_V2_VERSION,
  type TrueCapUnderwritingStandardVersion,
} from "./underwriting-methodology";
import { resolveV1AnalysisDate } from "./analysis-date";
import {
  buildLoanAmortizationSchedule,
  calculateMonthlyLoanPayment,
  summarizeLoanByYear,
} from "./loan-amortization";

/** Annual private mortgage insurance as a % of the loan balance, applied to
 *  financed owner-occupant conventional loans with < 20% down. Rental-loan
 *  mortgage insurance is never inferred; when a user supplies it, long-term
 *  projections conservatively keep it through payoff unless a future,
 *  loan-specific policy model can prove an earlier termination date. */
export const DEFAULT_PMI_ANNUAL_RATE_PCT = 0.8;
/** Down-payment threshold (%) below which PMI applies. */
export const PMI_DOWN_PAYMENT_THRESHOLD_PCT = 20;

/** Canonical first-month mortgage-insurance estimate shared by the analyzer
 * and public mortgage tool. PMI is modeled separately from homeowner's
 * insurance and from lender-style P&I debt service. */
export function calcInitialPmiMonthly(
  loanAmount: number,
  downPaymentPct: number,
  annualRatePct: number = DEFAULT_PMI_ANNUAL_RATE_PCT,
): number {
  if (
    !Number.isFinite(loanAmount) ||
    !Number.isFinite(downPaymentPct) ||
    !Number.isFinite(annualRatePct) ||
    loanAmount <= 0 ||
    downPaymentPct >= PMI_DOWN_PAYMENT_THRESHOLD_PCT ||
    annualRatePct <= 0
  ) {
    return 0;
  }
  return (loanAmount * (annualRatePct / 100)) / 12;
}

/** Resolve the screening mortgage-insurance rate without inventing an
 * owner-occupant product on an investment loan. A user/lender/template value
 * is authoritative for every property type (including explicit 0). Only an
 * owner-occupant analysis receives the 0.8% screening default when blank. */
export function resolvePmiAnnualRatePct(
  propertyType: InvestmentFormValues["propertyType"],
  explicitRatePct: number | null | undefined,
): number {
  if (explicitRatePct != null && Number.isFinite(explicitRatePct)) {
    return explicitRatePct;
  }
  return propertyType === "owner-occupant" ? DEFAULT_PMI_ANNUAL_RATE_PCT : 0;
}

/** Conservative mortgage-insurance duration for the rental acquisition model.
 * Scheduled 78% HPA termination is an owner-occupied conventional rule; it is
 * not a safe default for 1–4 unit investment-property loans. */
export function mortgageInsuranceRunsToPayoff(
  propertyType: InvestmentFormValues["propertyType"],
  explicitLoanLife: boolean | null | undefined,
): boolean {
  return propertyType !== "owner-occupant" || explicitLoanLife === true;
}

export interface AnalysisResult<
  TVersion extends TrueCapUnderwritingStandardVersion =
    TrueCapUnderwritingStandardVersion,
> {
  /** Version of the public formula contract used for this result. */
  methodologyVersion: TVersion;
  /** Audit date used for time-sensitive inputs such as property age. v2
   * requires it explicitly; v1 uses the persisted input or its documented
   * deterministic legacy fallback. */
  analysisDate?: string;
  operatingScenario?: "current" | "stabilized";
  rentBasis?: "in-place" | "market" | "pro-forma";
  scenarioRentMonthly?: number;
  recurringOtherIncomeMonthly?: number;
  recurringOtherIncomeAnnual?: number;
  recurringOtherExpenseMonthly?: number;
  recurringOtherExpenseAnnual?: number;
  turnoverReserveMonthly?: number;
  leasingReserveMonthly?: number;
  landscapingMonthly?: number;
  pestControlMonthly?: number;
  administrativeMonthly?: number;
  renovationIncomeLossAnnual?: number;
  renovationStartMonth?: number;
  renovationDurationMonths?: number;
  renovationRentLossPct?: number;
  currentPropertyValue?: number;
  stabilizedPropertyValue?: number;
  financingMode?: "cash" | "percent-down" | "fixed-down" | "fixed-loan";
  closingCostsInputMode?: "percent" | "fixed";
  acquisitionCredits?: number;
  loanFees?: number;
  initialReserve?: number;
  loanPointsPct?: number;
  loanPointsAmount?: number;
  originationFee?: number;
  lenderEscrowDeposit?: number;
  lenderReserveDeposit?: number;
  amortizationTermYears?: number;
  loanMaturityTermYears?: number;
  interestOnlyMonths?: number;
  initialMonthlyLoanPayment?: number;
  amortizingMonthlyLoanPayment?: number;
  balloonPayment?: number;
  balloonMonth?: number;
  cashRepairs?: number;
  /** v2 distinguishes an unknown construction year from an actual age of 0. */
  propertyAgeKnown?: boolean;
  unitCount?: number;
  // income
  monthlyRentalIncome: number;
  grossScheduledIncomeAnnual: number;
  vacancyAllowanceAnnual: number;
  effectiveGrossIncomeAnnual: number;
  // expenses
  propertyTax: number;
  /** Effective annual property-tax % of price — the % the math actually
   *  used. Annual-$ mode derives it from the typed bill (bill / price);
   *  percent mode is the input (or the 1.1 default). */
  propertyTaxPctEffective: number;
  insurance: number;
  insuranceInputMode: "percent" | "monthly";
  insurancePctInput: number | null;
  insurancePctEffective: number;
  hoa: number;
  utilities: number;
  maintenance: number;
  vacancy: number;
  management: number;
  capex: number;
  maintenancePctInput: number;
  capexPctInput: number;
  maintenancePctEffective: number;
  capexPctEffective: number;
  maintenanceAgeAdjusted: boolean;
  capexAgeAdjusted: boolean;
  totalOperatingExpenses: number;
  /** Annual recurring operating expenses after moving vacancy to the EGI
   * line and excluding the below-the-line CapEx reserve. */
  operatingExpensesAnnual: number;
  /** Lender-style annual NOI: EGI less operating expenses; excludes CapEx,
   * debt service, PMI, and income tax. */
  noiAnnual: number;
  // debt service
  loanAmount: number;
  monthlyPayment: number;
  annualDebtService: number;
  loanPrincipalAndInterest: number;
  /** Monthly private mortgage insurance (0 unless a financed conventional
   *  loan with < 20% down). Reduces cash flow; not part of the P&I used for
   *  DSCR. */
  pmiMonthly: number;
  propertyTaxMonthly: number;
  insuranceMonthly: number;
  hoaMonthly: number;
  totalMonthlyPaymentDebug: number;
  // cash flow
  netCashFlow: number;
  annualCashFlow: number;
  // metrics
  cocReturn: number;
  capRate: number;
  dscr: number;
  // tax (simplified)
  taxSavingsMonthly: number;
  afterTaxCF: number;
  annualDepreciation: number;
  yearlyInterestSchedule: number[];
  effectiveTaxRate: number;
  // cash required
  downPaymentPct: number;
  closingCostsPct: number;
  downPayment: number;
  closingCosts: number;
  totalCashRequired: number;
  propertyAge: number;
  /** Independent method version for the embedded long-term projection.
   * Optional only when reading a recorded legacy result that predates this
   * audit field; every newly calculated result stamps it. */
  tenYearProjectionVersion?: number;
  tenYearProjection: ProjectionYear[];
  /** Full 10-year tax strategy projection (same engine as the Tax Strategy panel). */
  taxStrategyYears: TaxStrategyYear[];
}

export type AnyAnalysisResult = AnalysisResult;
export type V1AnalysisResult = AnalysisResult<
  typeof TRUECAP_UNDERWRITING_STANDARD_VERSION
>;
export type V2AnalysisResult = AnalysisResult<
  typeof TRUECAP_UNDERWRITING_STANDARD_V2_VERSION
>;

/** Last-resort integrity boundary for direct engine callers that bypass the
 * form schema (legacy snapshots, share payloads, tests, and future server
 * integrations). A result containing Infinity/NaN must never reach save,
 * share, comparison, or report surfaces. */
function assertFiniteAnalysisResult<T extends AnyAnalysisResult>(result: T): T {
  const visit = (value: unknown, path: string): void => {
    if (typeof value === "number") {
      if (!Number.isFinite(value)) {
        throw new Error(
          `Analysis produced a non-finite numeric result at ${path}`,
        );
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }
    if (value && typeof value === "object") {
      Object.entries(value).forEach(([key, item]) =>
        visit(item, `${path}.${key}`),
      );
    }
  };

  visit(result, "analysis");
  return result;
}

export function calcMonthlyPayment(
  principal: number,
  annualRate: number,
  years: number,
): number {
  return calculateMonthlyLoanPayment({
    principal,
    annualRatePct: annualRate,
    termYears: years,
  });
}

function requireV2Number(
  values: InvestmentFormValues,
  key: keyof InvestmentFormValues,
): number {
  const value = values[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(
      `TrueCap Underwriting Standard v2 requires an explicit ${String(key)}`,
    );
  }
  return value;
}

/**
 * Exact-annual first-year core. This function is reachable only through an
 * explicit v2 discriminator; calculateAnalysis's historical v1 body remains
 * below, unchanged apart from the one-line dispatch.
 */
function calculateAnalysisV2(values: InvestmentFormValues): V2AnalysisResult {
  const {
    purchasePrice,
    yearBuilt,
    propertyType,
    downPaymentPct,
    interestRate,
    loanTermYears,
    pmiAnnualRatePct,
    pmiNoCancel,
    maintenancePct,
    vacancyPct,
    mgmtPct,
    capexPct,
    buildingValuePct,
    depreciationYears,
    includeInterestDeduction,
    taxRatePct,
    expenseGrowthPct,
    rentGrowthPct,
    propertyTaxPct,
    propertyTaxInputMode,
    propertyTaxAnnual,
    insuranceInputMode,
    insurancePct,
    amortizationTermYears,
    interestOnlyMonths,
    turnoverReserveMonthly,
    leasingReserveMonthly,
    landscapingMonthly,
    pestControlMonthly,
    administrativeMonthly,
    loanPointsPct,
    originationFee,
    lenderEscrowDeposit,
    lenderReserveDeposit,
    renovationStartMonth,
    renovationDurationMonths,
    renovationRentLossPct,
  } = values;

  const analysisDate = values.analysisDate;
  if (!analysisDate || !/^\d{4}-\d{2}-\d{2}$/.test(analysisDate)) {
    throw new Error(
      "TrueCap Underwriting Standard v2 requires an explicit analysisDate",
    );
  }
  const analysisDateValue = new Date(`${analysisDate}T00:00:00.000Z`);
  if (
    !Number.isFinite(analysisDateValue.getTime()) ||
    analysisDateValue.toISOString().slice(0, 10) !== analysisDate
  ) {
    throw new Error(
      "TrueCap Underwriting Standard v2 requires a valid analysisDate",
    );
  }

  const operatingScenario = values.operatingScenario;
  if (operatingScenario !== "current" && operatingScenario !== "stabilized") {
    throw new Error(
      "TrueCap Underwriting Standard v2 requires an operatingScenario",
    );
  }
  const rentBasis = values.rentBasis;
  if (
    rentBasis !== "in-place" &&
    rentBasis !== "market" &&
    rentBasis !== "pro-forma"
  ) {
    throw new Error("TrueCap Underwriting Standard v2 requires a rentBasis");
  }
  const unitCount = requireV2Number(values, "unitCount");
  if (!Number.isInteger(unitCount) || unitCount < 1 || unitCount > 50) {
    throw new Error(
      "TrueCap Underwriting Standard v2 requires a valid unitCount",
    );
  }
  const scenarioRentMonthly = requireV2Number(
    values,
    operatingScenario === "current"
      ? "currentMonthlyRent"
      : "stabilizedMonthlyRent",
  );
  if (scenarioRentMonthly <= 0) {
    throw new Error(
      "TrueCap Underwriting Standard v2 requires scheduled rent above 0",
    );
  }

  // These may be starting defaults in a new v2 editor, but the engine never
  // turns a missing value into zero. It receives an explicit reviewed/default
  // amount or fails closed.
  const recurringOtherIncomeMonthly = requireV2Number(
    values,
    "recurringOtherIncomeMonthly",
  );
  const recurringOtherExpenseMonthly = requireV2Number(
    values,
    "recurringOtherExpenseMonthly",
  );
  const acquisitionCredits = requireV2Number(values, "acquisitionCredits");
  const loanFees = requireV2Number(values, "loanFees");
  const initialReserve = requireV2Number(values, "initialReserve");
  const hoa = requireV2Number(values, "hoaMonthly");
  const utilities = requireV2Number(values, "utilitiesMonthly");
  const cashRepairs = requireV2Number(values, "rehabBudget");

  const grossScheduledIncomeAnnual =
    (scenarioRentMonthly + recurringOtherIncomeMonthly) * 12;
  const recurringOtherIncomeAnnual = recurringOtherIncomeMonthly * 12;
  const recurringOtherExpenseAnnual = recurringOtherExpenseMonthly * 12;
  const vacancyAllowanceAnnual =
    grossScheduledIncomeAnnual * (vacancyPct / 100);
  const renovationStart = Math.max(1, Math.floor(renovationStartMonth ?? 0));
  const renovationDuration = Math.max(
    0,
    Math.floor(renovationDurationMonths ?? 0),
  );
  const renovationMonthsInYearOne =
    renovationDuration > 0
      ? Math.max(
          0,
          Math.min(13, renovationStart + renovationDuration) -
            Math.max(1, renovationStart),
        )
      : 0;
  const renovationIncomeLossAnnual =
    scenarioRentMonthly *
    renovationMonthsInYearOne *
    ((renovationRentLossPct ?? 0) / 100);
  const effectiveGrossIncomeAnnual =
    grossScheduledIncomeAnnual -
    vacancyAllowanceAnnual -
    renovationIncomeLossAnnual;

  const propertyTaxPctEffective =
    propertyTaxInputMode === "annual" &&
    propertyTaxAnnual != null &&
    purchasePrice > 0
      ? (propertyTaxAnnual / purchasePrice) * 100
      : (propertyTaxPct ?? 1.1);
  const propertyTaxAnnualExact =
    propertyTaxInputMode === "annual"
      ? requireV2Number(values, "propertyTaxAnnual")
      : purchasePrice * (propertyTaxPctEffective / 100);
  const propertyTax = propertyTaxAnnualExact / 12;

  const insurancePctInput = insurancePct ?? null;
  const insuranceAnnualExact =
    insuranceInputMode === "monthly"
      ? requireV2Number(values, "insuranceMonthly") * 12
      : purchasePrice * ((insurancePct ?? 0.5) / 100);
  const insurance = insuranceAnnualExact / 12;
  const insurancePctEffective =
    purchasePrice > 0 ? (insuranceAnnualExact / purchasePrice) * 100 : 0;

  const maintenanceAnnual = grossScheduledIncomeAnnual * (maintenancePct / 100);
  const managementAnnual = grossScheduledIncomeAnnual * (mgmtPct / 100);
  const capexAnnual = grossScheduledIncomeAnnual * (capexPct / 100);
  const turnoverReserve = turnoverReserveMonthly ?? 0;
  const leasingReserve = leasingReserveMonthly ?? 0;
  const landscaping = landscapingMonthly ?? 0;
  const pestControl = pestControlMonthly ?? 0;
  const administrative = administrativeMonthly ?? 0;
  const operatingExpensesAnnual =
    propertyTaxAnnualExact +
    insuranceAnnualExact +
    hoa * 12 +
    utilities * 12 +
    turnoverReserve * 12 +
    leasingReserve * 12 +
    landscaping * 12 +
    pestControl * 12 +
    administrative * 12 +
    maintenanceAnnual +
    managementAnnual +
    recurringOtherExpenseAnnual;
  const noiAnnual = effectiveGrossIncomeAnnual - operatingExpensesAnnual;

  const financingMode = values.financingMode;
  let downPayment: number;
  let loanAmount: number;
  if (financingMode === "cash") {
    if (
      loanFees !== 0 ||
      (loanPointsPct ?? 0) !== 0 ||
      (originationFee ?? 0) !== 0 ||
      (interestOnlyMonths ?? 0) !== 0 ||
      amortizationTermYears !== undefined ||
      (lenderEscrowDeposit ?? 0) !== 0 ||
      (lenderReserveDeposit ?? 0) !== 0
    ) {
      throw new Error("Cash acquisitions cannot include loan-only terms");
    }
    downPayment = purchasePrice;
    loanAmount = 0;
  } else if (financingMode === "percent-down") {
    downPayment = purchasePrice * (downPaymentPct / 100);
    loanAmount = purchasePrice - downPayment;
  } else if (financingMode === "fixed-down") {
    downPayment = requireV2Number(values, "fixedDownPaymentAmount");
    if (downPayment > purchasePrice) {
      throw new Error("Fixed down payment cannot exceed purchase price");
    }
    loanAmount = purchasePrice - downPayment;
  } else if (financingMode === "fixed-loan") {
    loanAmount = requireV2Number(values, "fixedLoanAmount");
    if (loanAmount > purchasePrice) {
      throw new Error("Fixed loan amount cannot exceed purchase price");
    }
    downPayment = purchasePrice - loanAmount;
  } else {
    throw new Error(
      "TrueCap Underwriting Standard v2 requires a financingMode",
    );
  }

  const downPaymentPctEffective =
    purchasePrice > 0 ? (downPayment / purchasePrice) * 100 : 0;
  const loanSchedule = buildLoanAmortizationSchedule({
    principal: loanAmount,
    annualRatePct: interestRate,
    termYears: loanTermYears,
    maturityTermYears: loanTermYears,
    amortizationTermYears: amortizationTermYears ?? loanTermYears,
    interestOnlyMonths: interestOnlyMonths ?? 0,
  });
  const firstYearLoan = summarizeLoanByYear(loanSchedule)[0];
  // DSCR and the headline cash-flow metric use recurring scheduled debt
  // service. A contractual balloon is a separately disclosed capital outflow,
  // not disguised as one giant monthly mortgage payment.
  const hasAdvancedLoanSchedule =
    amortizationTermYears !== undefined || (interestOnlyMonths ?? 0) > 0;
  const monthlyPayment = hasAdvancedLoanSchedule
    ? (firstYearLoan?.scheduledPayment ?? 0) / 12
    : loanSchedule.scheduledMonthlyPayment;
  const annualDebtService = hasAdvancedLoanSchedule
    ? (firstYearLoan?.scheduledPayment ?? 0)
    : monthlyPayment * 12;
  const pmiAnnualRate = resolvePmiAnnualRatePct(
    values.propertyType,
    pmiAnnualRatePct,
  );
  const pmiMonthly = calcInitialPmiMonthly(
    loanAmount,
    downPaymentPctEffective,
    pmiAnnualRate,
  );

  const closingCostsInputMode = values.closingCostsInputMode;
  let closingCosts: number;
  let closingCostsPctEffective: number;
  if (closingCostsInputMode === "percent") {
    closingCostsPctEffective = requireV2Number(values, "closingCostsPct");
    closingCosts = purchasePrice * (closingCostsPctEffective / 100);
  } else if (closingCostsInputMode === "fixed") {
    closingCosts = requireV2Number(values, "closingCostsFixed");
    closingCostsPctEffective =
      purchasePrice > 0 ? (closingCosts / purchasePrice) * 100 : 0;
  } else {
    throw new Error(
      "TrueCap Underwriting Standard v2 requires a closingCostsInputMode",
    );
  }

  const loanPointsAmount = loanAmount * ((loanPointsPct ?? 0) / 100);
  const totalCashRequired =
    downPayment +
    closingCosts +
    loanPointsAmount +
    loanFees +
    (originationFee ?? 0) +
    (lenderEscrowDeposit ?? 0) +
    (lenderReserveDeposit ?? 0) +
    cashRepairs +
    (values.strFurnishingCost ?? 0) +
    initialReserve -
    acquisitionCredits;
  if (totalCashRequired < 0) {
    throw new Error(
      "Acquisition credits cannot exceed modeled acquisition cash uses",
    );
  }

  const annualCashFlow =
    noiAnnual - annualDebtService - capexAnnual - pmiMonthly * 12;
  const netCashFlow = annualCashFlow / 12;
  const cocReturn =
    totalCashRequired > 0 ? (annualCashFlow / totalCashRequired) * 100 : 0;
  const capRate = purchasePrice > 0 ? (noiAnnual / purchasePrice) * 100 : 0;
  const dscr = annualDebtService > 0 ? noiAnnual / annualDebtService : 0;

  const yearlyInterestSchedule = summarizeLoanByYear(loanSchedule).map(
    (year) => year.interest,
  );
  const annualDepreciation =
    (purchasePrice * (buildingValuePct / 100)) / depreciationYears;
  const effectiveTaxRate = (taxRatePct ?? 24) / 100;
  const totalOperatingExpenses =
    (vacancyAllowanceAnnual + operatingExpensesAnnual + capexAnnual) / 12;
  const capex = capexAnnual / 12;

  const taxStrategyYears = buildTaxStrategyProjection({
    monthlyRentalIncome:
      grossScheduledIncomeAnnual / 12 - renovationIncomeLossAnnual / 12,
    totalOperatingExpenses,
    capexReserveMonthly: capex,
    annualDepreciation,
    yearlyInterestSchedule,
    rentGrowthPct,
    expenseGrowthPct,
    taxRate: effectiveTaxRate,
    includeInterestDeduction: includeInterestDeduction !== false,
  });
  const taxSavingsMonthly =
    (taxStrategyYears[0]?.netTaxBenefitAnnual ?? 0) / 12;
  const afterTaxCF = netCashFlow + taxSavingsMonthly;
  const tenYearProjection = buildTenYearProjection({
    monthlyRentalIncome: grossScheduledIncomeAnnual / 12,
    totalOperatingExpenses,
    capexReserveMonthly: capex,
    monthlyPayment,
    interestRate,
    loanTermYears,
    amortizationTermYears: amortizationTermYears ?? loanTermYears,
    interestOnlyMonths: interestOnlyMonths ?? 0,
    pmiMonthly,
    pmiNoCancel: mortgageInsuranceRunsToPayoff(propertyType, pmiNoCancel),
    loanAmount,
    purchasePrice,
    taxSavingsMonthly,
    annualDepreciation,
    yearlyInterestSchedule,
    rentGrowthPct,
    expenseGrowthPct,
    taxRate: effectiveTaxRate,
    includeInterestDeduction: includeInterestDeduction !== false,
    renovationStartMonth,
    renovationDurationMonths,
    renovationRentLossPct,
  });

  const currentYear = analysisDateValue.getUTCFullYear();
  const propertyAgeKnown = Number.isFinite(yearBuilt);
  const propertyAge = propertyAgeKnown
    ? Math.max(currentYear - (yearBuilt ?? currentYear), 0)
    : 0;

  return assertFiniteAnalysisResult({
    methodologyVersion: TRUECAP_UNDERWRITING_STANDARD_V2_VERSION,
    analysisDate,
    operatingScenario,
    rentBasis,
    scenarioRentMonthly,
    recurringOtherIncomeMonthly,
    recurringOtherIncomeAnnual,
    recurringOtherExpenseMonthly,
    recurringOtherExpenseAnnual,
    turnoverReserveMonthly: turnoverReserve,
    leasingReserveMonthly: leasingReserve,
    landscapingMonthly: landscaping,
    pestControlMonthly: pestControl,
    administrativeMonthly: administrative,
    renovationIncomeLossAnnual,
    renovationStartMonth,
    renovationDurationMonths,
    renovationRentLossPct,
    currentPropertyValue: values.currentPropertyValue,
    stabilizedPropertyValue: values.stabilizedPropertyValue,
    financingMode,
    closingCostsInputMode,
    acquisitionCredits,
    loanFees,
    initialReserve,
    loanPointsPct: loanPointsPct ?? 0,
    loanPointsAmount,
    originationFee: originationFee ?? 0,
    lenderEscrowDeposit: lenderEscrowDeposit ?? 0,
    lenderReserveDeposit: lenderReserveDeposit ?? 0,
    amortizationTermYears: amortizationTermYears ?? loanTermYears,
    loanMaturityTermYears: loanTermYears,
    interestOnlyMonths: interestOnlyMonths ?? 0,
    initialMonthlyLoanPayment: loanSchedule.initialMonthlyPayment,
    amortizingMonthlyLoanPayment: loanSchedule.scheduledMonthlyPayment,
    balloonPayment: loanSchedule.balloonPayment,
    balloonMonth:
      loanSchedule.balloonPayment > 0
        ? loanSchedule.maturityTermMonths
        : undefined,
    cashRepairs,
    propertyAgeKnown,
    unitCount,
    monthlyRentalIncome: scenarioRentMonthly,
    grossScheduledIncomeAnnual,
    vacancyAllowanceAnnual,
    effectiveGrossIncomeAnnual,
    propertyTax,
    propertyTaxPctEffective,
    insurance,
    insuranceInputMode,
    insurancePctInput,
    insurancePctEffective,
    hoa,
    utilities,
    maintenance: maintenanceAnnual / 12,
    vacancy: vacancyAllowanceAnnual / 12,
    management: managementAnnual / 12,
    capex,
    maintenancePctInput: maintenancePct,
    capexPctInput: capexPct,
    maintenancePctEffective: maintenancePct,
    capexPctEffective: capexPct,
    maintenanceAgeAdjusted: false,
    capexAgeAdjusted: false,
    totalOperatingExpenses,
    operatingExpensesAnnual,
    noiAnnual,
    loanAmount,
    monthlyPayment,
    annualDebtService,
    loanPrincipalAndInterest: monthlyPayment,
    pmiMonthly,
    propertyTaxMonthly: propertyTax,
    insuranceMonthly: insurance,
    hoaMonthly: hoa,
    totalMonthlyPaymentDebug: monthlyPayment + propertyTax + insurance + hoa,
    netCashFlow,
    annualCashFlow,
    cocReturn,
    capRate,
    dscr,
    taxSavingsMonthly,
    afterTaxCF,
    annualDepreciation,
    yearlyInterestSchedule,
    effectiveTaxRate,
    downPaymentPct: downPaymentPctEffective,
    closingCostsPct: closingCostsPctEffective,
    downPayment,
    closingCosts,
    totalCashRequired,
    propertyAge,
    tenYearProjectionVersion: TEN_YEAR_PROJECTION_SNAPSHOT_VERSION,
    tenYearProjection,
    taxStrategyYears,
  });
}

export function calculateAnalysis(
  values: InvestmentFormValues & { underwritingModelVersion: "2.0" },
): V2AnalysisResult;
export function calculateAnalysis(
  values: InvestmentFormValues,
): AnyAnalysisResult;
export function calculateAnalysis(
  values: InvestmentFormValues,
): AnyAnalysisResult {
  if (
    [
      values.refinanceMonth,
      values.refinanceLtvPct,
      values.refinanceInterestRatePct,
      values.refinanceAmortizationTermYears,
      values.refinanceLoanTermYears,
      values.refinanceClosingCostsPct,
    ].some((value) => value !== undefined)
  ) {
    throw new Error(
      "Refinance lifecycle modeling is not released; remove these assumptions to run the buy-and-hold analysis",
    );
  }
  if (values.underwritingModelVersion === "2.0")
    return calculateAnalysisV2(values);

  const {
    purchasePrice,
    yearBuilt,
    propertyType,
    monthlyRent,
    units,
    downPaymentPct,
    interestRate,
    loanTermYears,
    closingCostsPct,
    pmiAnnualRatePct,
    pmiNoCancel,
    maintenancePct,
    vacancyPct,
    mgmtPct,
    capexPct,
    buildingValuePct,
    depreciationYears,
    includeInterestDeduction,
    taxRatePct,
    expenseGrowthPct,
    rentGrowthPct,
    propertyTaxPct,
    propertyTaxInputMode,
    propertyTaxAnnual,
    insuranceInputMode,
    insurancePct,
    insuranceMonthly,
    hoaMonthly,
    utilitiesMonthly,
    avgDailyRate,
    occupancyPct,
    strFurnishingCost,
    rehabBudget,
    stabilizedMonthlyRent,
    recurringOtherIncomeMonthly,
    recurringOtherExpenseMonthly,
    turnoverReserveMonthly,
    leasingReserveMonthly,
    landscapingMonthly,
    pestControlMonthly,
    administrativeMonthly,
    acquisitionCredits,
    closingCostsInputMode,
    closingCostsFixed,
    loanFees,
    initialReserve,
    loanPointsPct,
    originationFee,
    lenderEscrowDeposit,
    lenderReserveDeposit,
    amortizationTermYears,
    interestOnlyMonths,
    currentPropertyValue,
    stabilizedPropertyValue,
    renovationStartMonth,
    renovationDurationMonths,
    renovationRentLossPct,
  } = values;
  const validUnits = (units ?? []).filter((unit) =>
    isValidRentalUnit(unit, {
      allowZeroRent:
        propertyType === "owner-occupant" && !!unit?.isOwnerOccupied,
    }),
  );

  if (values.operatingScenario === "stabilized") {
    if (
      propertyType === "single-family" &&
      (typeof stabilizedMonthlyRent !== "number" ||
        !Number.isFinite(stabilizedMonthlyRent) ||
        stabilizedMonthlyRent <= 0)
    ) {
      throw new Error(
        "A stabilized single-family scenario requires stabilized monthly rent",
      );
    }
    if (
      propertyType !== "single-family" &&
      validUnits.some(
        (unit) =>
          !(propertyType === "owner-occupant" && unit.isOwnerOccupied) &&
          (typeof unit.stabilizedMonthlyRent !== "number" ||
            !Number.isFinite(unit.stabilizedMonthlyRent) ||
            unit.stabilizedMonthlyRent <= 0),
      )
    ) {
      throw new Error(
        "A stabilized unit scenario requires stabilized rent for every rental unit",
      );
    }
  }

  // Monthly scheduled rent. The historical v1 field/roll remains the current
  // scenario. A user can optionally select a stabilized scenario; every unit
  // without a stabilized override safely falls back to its current rent.
  let currentRentalIncome = 0;
  if (propertyType === "single-family") {
    // Short-term rental income model: when a nightly rate is set, gross income
    // is ADR × occupancy × 365 / 12 (not a hand-typed monthly rent). The
    // STR strategy's higher vacancy/management defaults still apply on top.
    if (typeof avgDailyRate === "number" && avgDailyRate > 0) {
      currentRentalIncome =
        (avgDailyRate * 365 * ((occupancyPct ?? 0) / 100)) / 12;
    } else {
      currentRentalIncome = monthlyRent ?? 0;
    }
  } else {
    currentRentalIncome = validUnits
      .filter((u) => !(propertyType === "owner-occupant" && u.isOwnerOccupied))
      .reduce((sum, u) => sum + (u.monthlyRent ?? 0), 0);
  }

  const stabilizedRentalIncome =
    propertyType === "single-family"
      ? (stabilizedMonthlyRent ?? currentRentalIncome)
      : validUnits
          .filter(
            (unit) =>
              !(propertyType === "owner-occupant" && unit.isOwnerOccupied),
          )
          .reduce(
            (sum, unit) =>
              sum + (unit.stabilizedMonthlyRent ?? unit.monthlyRent ?? 0),
            0,
          );
  const operatingScenario =
    values.operatingScenario === "stabilized" ? "stabilized" : "current";
  const monthlyRentalIncome =
    operatingScenario === "stabilized"
      ? stabilizedRentalIncome
      : currentRentalIncome;
  const otherIncomeMonthly = recurringOtherIncomeMonthly ?? 0;
  // Other recurring income is a separate EGI line. Vacancy and rent-linked
  // percentage expenses apply to scheduled RENT only; treating parking or
  // laundry income as vacant rent would silently impose an unsupported
  // occupancy relationship.
  const grossScheduledIncomeMonthly = monthlyRentalIncome;
  const annualRent = monthlyRentalIncome * 12;

  const renovationStart = Math.max(1, Math.floor(renovationStartMonth ?? 0));
  const renovationDuration = Math.max(
    0,
    Math.floor(renovationDurationMonths ?? 0),
  );
  const renovationMonthsInYearOne =
    renovationDuration > 0
      ? Math.max(
          0,
          Math.min(13, renovationStart + renovationDuration) -
            Math.max(1, renovationStart),
        )
      : 0;
  const renovationIncomeLossAnnual =
    monthlyRentalIncome *
    renovationMonthsInYearOne *
    ((renovationRentLossPct ?? 0) / 100);

  const analysisDate = resolveV1AnalysisDate(values.analysisDate);
  const currentYear = Number(analysisDate.slice(0, 4));
  const hasValidYearBuilt = Number.isFinite(yearBuilt);
  const propertyAge = hasValidYearBuilt
    ? Math.max(currentYear - (yearBuilt ?? currentYear), 0)
    : 0;
  const maintenancePctEffective = maintenancePct;
  const capexPctEffective = capexPct;
  const maintenanceAgeAdjusted = false;
  const capexAgeAdjusted = false;

  // Operating expenses (property tax is percentage based; insurance/others remain monthly overrides)
  // Effective annual property-tax % of price — what the math actually used.
  // Annual-$ mode derives it from the typed bill so display surfaces (PDF
  // assumptions, Compare, the persisted property_tax_pct column) never print
  // the unused percent default (mirrors insurancePctEffective below).
  const propertyTaxPctEffective =
    propertyTaxInputMode === "annual" &&
    propertyTaxAnnual != null &&
    purchasePrice > 0
      ? (propertyTaxAnnual / purchasePrice) * 100
      : (propertyTaxPct ?? 1.1);
  const propertyTaxDefault = Math.round(
    (purchasePrice * (propertyTaxPctEffective / 100)) / 12,
  );
  const insurancePctForEstimate = insurancePct ?? 0.5;
  const insuranceDefault = Math.round(
    (purchasePrice * (insurancePctForEstimate / 100)) / 12,
  );
  // Annual-$ mode: the actual bill off the listing, /12. Blank falls back
  // to the percent estimate; percent mode is byte-identical to before
  // (mirrors the insurance dual-mode branch below).
  const propertyTax =
    propertyTaxInputMode === "annual" && propertyTaxAnnual != null
      ? Math.round(propertyTaxAnnual / 12)
      : propertyTaxDefault;
  const insurance =
    insuranceInputMode === "monthly"
      ? Math.round(insuranceMonthly ?? insuranceDefault)
      : insuranceDefault;
  const insurancePctEffective =
    insuranceInputMode === "monthly" && purchasePrice > 0
      ? ((insurance * 12) / purchasePrice) * 100
      : insurancePctForEstimate;
  const hoa = Math.round(hoaMonthly ?? 0);
  const utilities = Math.round(utilitiesMonthly ?? 0);
  const recurringOtherExpense = Math.round(recurringOtherExpenseMonthly ?? 0);
  const turnoverReserve = Math.round(turnoverReserveMonthly ?? 0);
  const leasingReserve = Math.round(leasingReserveMonthly ?? 0);
  const landscaping = Math.round(landscapingMonthly ?? 0);
  const pestControl = Math.round(pestControlMonthly ?? 0);
  const administrative = Math.round(administrativeMonthly ?? 0);
  const maintenance = Math.round(
    (annualRent * (maintenancePctEffective / 100)) / 12,
  );
  const vacancy = Math.round((annualRent * (vacancyPct / 100)) / 12);
  const management = Math.round((annualRent * (mgmtPct / 100)) / 12);
  const capex = Math.round((annualRent * (capexPctEffective / 100)) / 12);
  const totalOperatingExpenses =
    propertyTax +
    insurance +
    hoa +
    utilities +
    recurringOtherExpense +
    turnoverReserve +
    leasingReserve +
    landscaping +
    pestControl +
    administrative +
    maintenance +
    vacancy +
    management +
    capex;
  // NOI / cap rate / DSCR use operating expenses EXCLUDING the CapEx reserve.
  // CapEx is a below-the-line return-of-capital reserve, not an operating
  // expense — this matches the app's own glossary and the lender-standard
  // definition of NOI and DSCR. (CapEx still reduces cash flow / CoC below.)
  const operatingExpensesExCapex = totalOperatingExpenses - capex;
  // Present vacancy above the NOI line as an income allowance so the public
  // statement reads like a conventional underwriting worksheet. This is an
  // exact reclassification of the existing math, not a formula change.
  const grossScheduledIncomeAnnual = annualRent;
  const vacancyAllowanceAnnual = vacancy * 12;
  const effectiveGrossIncomeAnnual =
    grossScheduledIncomeAnnual -
    vacancyAllowanceAnnual -
    renovationIncomeLossAnnual +
    otherIncomeMonthly * 12;
  const operatingExpensesAnnual = (operatingExpensesExCapex - vacancy) * 12;
  const noiAnnual = effectiveGrossIncomeAnnual - operatingExpensesAnnual;

  // Financing
  const downPayment = (purchasePrice * downPaymentPct) / 100;
  const loanAmount = purchasePrice - downPayment;
  if (
    loanAmount <= 0 &&
    ((loanPointsPct ?? 0) !== 0 ||
      (originationFee ?? 0) !== 0 ||
      (loanFees ?? 0) !== 0 ||
      (interestOnlyMonths ?? 0) !== 0 ||
      amortizationTermYears !== undefined ||
      (lenderEscrowDeposit ?? 0) !== 0 ||
      (lenderReserveDeposit ?? 0) !== 0)
  ) {
    throw new Error("All-cash acquisitions cannot include loan-only terms");
  }
  const loanSchedule = buildLoanAmortizationSchedule({
    principal: loanAmount,
    annualRatePct: interestRate,
    termYears: loanTermYears,
    maturityTermYears: loanTermYears,
    amortizationTermYears: amortizationTermYears ?? loanTermYears,
    interestOnlyMonths: interestOnlyMonths ?? 0,
  });
  const firstYearLoan = summarizeLoanByYear(loanSchedule)[0];
  const hasAdvancedLoanSchedule =
    amortizationTermYears !== undefined || (interestOnlyMonths ?? 0) > 0;
  const monthlyPayment = hasAdvancedLoanSchedule
    ? (firstYearLoan?.scheduledPayment ?? 0) / 12
    : loanSchedule.scheduledMonthlyPayment;
  const annualDebtService = hasAdvancedLoanSchedule
    ? (firstYearLoan?.scheduledPayment ?? 0)
    : monthlyPayment * 12;

  // Mortgage insurance is an owner-occupant screening default, not a generic
  // sub-20%-down investor-loan fee. Any explicit lender/template rate remains
  // authoritative for every property type; explicit 0 disables it. When it is
  // modeled for an investment property, it runs through payoff: owner-occupied
  // HPA termination rules are not a safe rental-loan default. Owner-occupant
  // conventional PMI uses scheduled 78% unless loan-life MIP is selected.
  // Borrower-requested cancellation is never inferred. PMI stays outside
  // lender-style DSCR.
  const pmiAnnualRate = resolvePmiAnnualRatePct(
    values.propertyType,
    pmiAnnualRatePct,
  );
  const pmiMonthly = calcInitialPmiMonthly(
    loanAmount,
    downPaymentPct,
    pmiAnnualRate,
  );

  // Cash flow (CapEx reserve + PMI both reduce real cash flow). Renovation
  // downtime is modeled above EGI, so it cannot be mistaken for a recurring
  // operating bill.
  const hasAdvancedCashFlowInputs =
    otherIncomeMonthly !== 0 ||
    recurringOtherExpense !== 0 ||
    turnoverReserve !== 0 ||
    leasingReserve !== 0 ||
    landscaping !== 0 ||
    pestControl !== 0 ||
    administrative !== 0 ||
    renovationIncomeLossAnnual !== 0 ||
    hasAdvancedLoanSchedule;
  const netCashFlow = hasAdvancedCashFlowInputs
    ? (effectiveGrossIncomeAnnual -
        operatingExpensesAnnual -
        capex * 12 -
        annualDebtService -
        pmiMonthly * 12) /
      12
    : monthlyRentalIncome -
      totalOperatingExpenses -
      monthlyPayment -
      pmiMonthly;
  const annualCashFlow = netCashFlow * 12;

  const effectiveClosingCostsMode =
    closingCostsInputMode === "fixed" ? "fixed" : "percent";
  if (
    effectiveClosingCostsMode === "fixed" &&
    (typeof closingCostsFixed !== "number" ||
      !Number.isFinite(closingCostsFixed))
  ) {
    throw new Error("Fixed closing-cost mode requires a fixed amount");
  }
  const closingCostsPctEffective =
    effectiveClosingCostsMode === "fixed"
      ? purchasePrice > 0
        ? ((closingCostsFixed ?? 0) / purchasePrice) * 100
        : 0
      : (closingCostsPct ?? 3);
  const closingCosts =
    effectiveClosingCostsMode === "fixed"
      ? (closingCostsFixed ?? 0)
      : Math.round(purchasePrice * (closingCostsPctEffective / 100));
  const loanPointsAmount = loanAmount * ((loanPointsPct ?? 0) / 100);
  const modeledLoanFees = loanFees ?? 0;
  const modeledOriginationFee = originationFee ?? 0;
  const modeledInitialReserve = initialReserve ?? 0;
  const modeledEscrowDeposit = lenderEscrowDeposit ?? 0;
  const modeledLenderReserve = lenderReserveDeposit ?? 0;
  const modeledAcquisitionCredits = acquisitionCredits ?? 0;
  // One-time cash outlays — STR furnishing/startup and up-front rehab/initial
  // repairs — raise the cash invested (and lower cash-on-cash). v1 keeps these
  // honest as cash-only: they do NOT change the depreciation basis or
  // appreciation (purchasePrice still anchors those).
  const totalCashRequired =
    downPayment +
    closingCosts +
    loanPointsAmount +
    modeledLoanFees +
    modeledOriginationFee +
    modeledInitialReserve +
    modeledEscrowDeposit +
    modeledLenderReserve +
    (strFurnishingCost ?? 0) +
    (rehabBudget ?? 0) -
    modeledAcquisitionCredits;
  if (totalCashRequired < 0) {
    throw new Error(
      "Acquisition credits cannot exceed modeled acquisition cash uses",
    );
  }

  // Metrics
  const cocReturn =
    totalCashRequired > 0 ? (annualCashFlow / totalCashRequired) * 100 : 0;
  const capRate = purchasePrice > 0 ? (noiAnnual / purchasePrice) * 100 : 0;
  const dscr = annualDebtService > 0 ? noiAnnual / annualDebtService : 0;

  const yearlyInterestSchedule = summarizeLoanByYear(loanSchedule).map(
    (year) => year.interest,
  );
  const annualDepreciation =
    (purchasePrice * (buildingValuePct / 100)) / depreciationYears;
  const effectiveTaxRate = (taxRatePct ?? 24) / 100;

  // Year-1 tax effect — SIGNED, taken from the same engine as the Tax
  // Strategy panel (netTaxBenefitAnnual nets rental income against the
  // deductions). Replaces the legacy one-way shield ((depreciation +
  // interest) × rate, always ADDED) that ten-year-projections v3 was
  // explicitly corrected away from: the shield ignored rental income
  // entirely, overstating after-tax returns — always in the optimistic
  // direction — and could present a money-losing deal as "covers itself
  // after tax" while the 10-year table on the same screen disagreed.
  // Signed means a healthy deal can OWE tax (negative value): consumers
  // must not assume this figure is a bonus. [Founder-approved 2026-07-14.]
  const annualDepreciationRounded = Math.round(annualDepreciation);
  const taxStrategyYears = buildTaxStrategyProjection({
    monthlyRentalIncome:
      grossScheduledIncomeMonthly +
      otherIncomeMonthly -
      renovationIncomeLossAnnual / 12,
    totalOperatingExpenses,
    capexReserveMonthly: capex,
    annualDepreciation: annualDepreciationRounded,
    yearlyInterestSchedule,
    rentGrowthPct,
    expenseGrowthPct,
    taxRate: effectiveTaxRate,
    includeInterestDeduction: includeInterestDeduction !== false,
  });
  const taxSavingsMonthly = Math.round(
    (taxStrategyYears[0]?.netTaxBenefitAnnual ?? 0) / 12,
  );
  const afterTaxCF = netCashFlow + taxSavingsMonthly;

  const tenYearProjection = buildTenYearProjection({
    monthlyRentalIncome: grossScheduledIncomeMonthly + otherIncomeMonthly,
    scheduledRentMonthly: grossScheduledIncomeMonthly,
    recurringOtherIncomeMonthly: otherIncomeMonthly,
    fixedOperatingExpensesMonthly:
      propertyTax +
      insurance +
      hoa +
      utilities +
      recurringOtherExpense +
      turnoverReserve +
      leasingReserve +
      landscaping +
      pestControl +
      administrative,
    vacancyPct,
    maintenancePct: maintenancePctEffective,
    managementPct: mgmtPct,
    capexPct: capexPctEffective,
    totalOperatingExpenses,
    capexReserveMonthly: capex,
    monthlyPayment,
    interestRate,
    loanTermYears,
    amortizationTermYears: amortizationTermYears ?? loanTermYears,
    interestOnlyMonths: interestOnlyMonths ?? 0,
    pmiMonthly,
    pmiNoCancel: mortgageInsuranceRunsToPayoff(propertyType, pmiNoCancel),
    loanAmount,
    purchasePrice,
    taxSavingsMonthly,
    annualDepreciation,
    yearlyInterestSchedule,
    rentGrowthPct,
    expenseGrowthPct,
    taxRate: effectiveTaxRate,
    includeInterestDeduction: includeInterestDeduction !== false,
    renovationStartMonth,
    renovationDurationMonths,
    renovationRentLossPct,
  });

  const usesAdvancedBuyAndHoldInputs =
    [
      values.operatingScenario,
      stabilizedMonthlyRent,
      currentPropertyValue,
      stabilizedPropertyValue,
      recurringOtherIncomeMonthly,
      recurringOtherExpenseMonthly,
      turnoverReserveMonthly,
      leasingReserveMonthly,
      landscapingMonthly,
      pestControlMonthly,
      administrativeMonthly,
      acquisitionCredits,
      closingCostsInputMode,
      closingCostsFixed,
      loanFees,
      initialReserve,
      loanPointsPct,
      originationFee,
      lenderEscrowDeposit,
      lenderReserveDeposit,
      amortizationTermYears,
      interestOnlyMonths,
      renovationStartMonth,
      renovationDurationMonths,
      renovationRentLossPct,
    ].some((value) => value !== undefined) ||
    validUnits.some((unit) => unit.stabilizedMonthlyRent !== undefined);

  return assertFiniteAnalysisResult({
    methodologyVersion: TRUECAP_UNDERWRITING_STANDARD_VERSION,
    analysisDate,
    ...(usesAdvancedBuyAndHoldInputs
      ? {
          operatingScenario,
          rentBasis: values.rentBasis,
          scenarioRentMonthly: monthlyRentalIncome,
          recurringOtherIncomeMonthly: otherIncomeMonthly,
          recurringOtherIncomeAnnual: otherIncomeMonthly * 12,
          recurringOtherExpenseMonthly: recurringOtherExpense,
          recurringOtherExpenseAnnual: recurringOtherExpense * 12,
          turnoverReserveMonthly: turnoverReserve,
          leasingReserveMonthly: leasingReserve,
          landscapingMonthly: landscaping,
          pestControlMonthly: pestControl,
          administrativeMonthly: administrative,
          renovationIncomeLossAnnual,
          renovationStartMonth,
          renovationDurationMonths,
          renovationRentLossPct,
          currentPropertyValue,
          stabilizedPropertyValue,
          closingCostsInputMode: effectiveClosingCostsMode,
          acquisitionCredits: modeledAcquisitionCredits,
          loanFees: modeledLoanFees,
          initialReserve: modeledInitialReserve,
          loanPointsPct: loanPointsPct ?? 0,
          loanPointsAmount,
          originationFee: modeledOriginationFee,
          lenderEscrowDeposit: modeledEscrowDeposit,
          lenderReserveDeposit: modeledLenderReserve,
          amortizationTermYears: amortizationTermYears ?? loanTermYears,
          loanMaturityTermYears: loanTermYears,
          interestOnlyMonths: interestOnlyMonths ?? 0,
          initialMonthlyLoanPayment: loanSchedule.initialMonthlyPayment,
          amortizingMonthlyLoanPayment: loanSchedule.scheduledMonthlyPayment,
          balloonPayment: loanSchedule.balloonPayment,
          balloonMonth:
            loanSchedule.balloonPayment > 0
              ? loanSchedule.maturityTermMonths
              : undefined,
          cashRepairs: rehabBudget ?? 0,
          unitCount: propertyType === "single-family" ? 1 : validUnits.length,
        }
      : {}),
    monthlyRentalIncome,
    grossScheduledIncomeAnnual,
    vacancyAllowanceAnnual,
    effectiveGrossIncomeAnnual,
    propertyTax,
    propertyTaxPctEffective,
    insurance,
    insuranceInputMode,
    insurancePctInput: insurancePct ?? null,
    insurancePctEffective,
    hoa,
    utilities,
    maintenance,
    vacancy,
    management,
    capex,
    maintenancePctInput: maintenancePct,
    capexPctInput: capexPct,
    maintenancePctEffective,
    capexPctEffective,
    maintenanceAgeAdjusted,
    capexAgeAdjusted,
    totalOperatingExpenses,
    operatingExpensesAnnual,
    noiAnnual,
    loanAmount,
    monthlyPayment,
    annualDebtService,
    loanPrincipalAndInterest: monthlyPayment,
    pmiMonthly,
    propertyTaxMonthly: propertyTax,
    insuranceMonthly: insurance,
    hoaMonthly: hoa,
    totalMonthlyPaymentDebug: monthlyPayment + propertyTax + insurance + hoa,
    netCashFlow,
    annualCashFlow,
    cocReturn,
    capRate,
    dscr,
    taxSavingsMonthly,
    afterTaxCF,
    annualDepreciation: annualDepreciationRounded,
    yearlyInterestSchedule,
    effectiveTaxRate,
    downPaymentPct,
    closingCostsPct: closingCostsPctEffective,
    downPayment,
    closingCosts,
    totalCashRequired,
    propertyAge,
    tenYearProjectionVersion: TEN_YEAR_PROJECTION_SNAPSHOT_VERSION,
    tenYearProjection,
    taxStrategyYears,
  });
}
