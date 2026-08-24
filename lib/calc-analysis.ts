import { InvestmentFormValues, isValidRentalUnit } from "./investcalc-schema";
import { buildTaxStrategyProjection, type TaxStrategyYear } from "./tax-strategy";
import { buildTenYearProjection, ProjectionYear } from "./ten-year-projections";
import {
  TRUECAP_UNDERWRITING_STANDARD_VERSION,
  TRUECAP_UNDERWRITING_STANDARD_V2_VERSION,
  type TrueCapUnderwritingStandardVersion,
} from "./underwriting-methodology";

/** Annual private mortgage insurance as a % of the loan balance, applied to
 *  financed conventional loans with < 20% down and dropped once the loan
 *  amortizes to 80% LTV. 0.8% is a mid-range conventional estimate. */
export const DEFAULT_PMI_ANNUAL_RATE_PCT = 0.8;
/** Down-payment threshold (%) below which PMI applies. */
export const PMI_DOWN_PAYMENT_THRESHOLD_PCT = 20;

export interface AnalysisResult<
  TVersion extends TrueCapUnderwritingStandardVersion = TrueCapUnderwritingStandardVersion,
> {
  /** Version of the public formula contract used for this result. */
  methodologyVersion: TVersion;
  /** v2-only audit fields. Omitted from v1 results to preserve their exact
   * runtime shape and historical snapshot hashes. */
  analysisDate?: string;
  operatingScenario?: "current" | "stabilized";
  rentBasis?: "in-place" | "market" | "pro-forma";
  scenarioRentMonthly?: number;
  recurringOtherIncomeMonthly?: number;
  recurringOtherIncomeAnnual?: number;
  recurringOtherExpenseMonthly?: number;
  recurringOtherExpenseAnnual?: number;
  financingMode?: "cash" | "percent-down" | "fixed-down" | "fixed-loan";
  closingCostsInputMode?: "percent" | "fixed";
  acquisitionCredits?: number;
  loanFees?: number;
  initialReserve?: number;
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
  tenYearProjection: ProjectionYear[];
  /** Full 10-year tax strategy projection (same engine as the Tax Strategy panel). */
  taxStrategyYears: TaxStrategyYear[];
}

export type AnyAnalysisResult = AnalysisResult;
export type V1AnalysisResult = AnalysisResult<typeof TRUECAP_UNDERWRITING_STANDARD_VERSION>;
export type V2AnalysisResult = AnalysisResult<typeof TRUECAP_UNDERWRITING_STANDARD_V2_VERSION>;

export function calcMonthlyPayment(principal: number, annualRate: number, years: number): number {
  // Defensive guards — schema enforces years >= 1 and principal >= 0, but
  // legacy saved-deal payloads or share-link decodes could deliver garbage.
  // Returning 0 instead of NaN/Infinity keeps every downstream metric stable.
  if (!Number.isFinite(principal) || principal <= 0) return 0;
  if (!Number.isFinite(years) || years <= 0) return 0;
  if (!Number.isFinite(annualRate) || annualRate < 0) return 0;
  if (annualRate === 0) return principal / (years * 12);
  const r = annualRate / 100 / 12;
  const n = years * 12;
  return (principal * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
}

function calculateYearlyInterestSchedule(
  loanAmount: number,
  interestRate: number,
  loanTermYears: number,
  monthlyPayment: number
): number[] {
  if (loanAmount <= 0 || loanTermYears <= 0) return [];

  const monthlyRate = interestRate / 100 / 12;
  const totalMonths = loanTermYears * 12;

  let balance = loanAmount;
  let yearInterest = 0;
  const yearlyInterest: number[] = [];

  for (let month = 1; month <= totalMonths && balance > 0; month += 1) {
    const interestPortion = monthlyRate > 0 ? Math.round(balance * monthlyRate) : 0;
    const principalPortion = Math.min(Math.max(monthlyPayment - interestPortion, 0), balance);
    balance = Math.max(0, balance - principalPortion);
    yearInterest += interestPortion;

    if (month % 12 === 0) {
      yearlyInterest.push(Math.round(yearInterest));
      yearInterest = 0;
    }
  }

  if (yearInterest > 0) {
    yearlyInterest.push(Math.round(yearInterest));
  }

  return yearlyInterest;
}

function calculateYearlyInterestScheduleExact(
  loanAmount: number,
  interestRate: number,
  loanTermYears: number,
  monthlyPayment: number
): number[] {
  if (loanAmount <= 0 || loanTermYears <= 0) return [];

  const monthlyRate = interestRate / 100 / 12;
  const totalMonths = Math.round(loanTermYears * 12);
  let balance = loanAmount;
  let yearInterest = 0;
  const yearlyInterest: number[] = [];

  for (let month = 1; month <= totalMonths && balance > 0; month += 1) {
    const interestPortion = monthlyRate > 0 ? balance * monthlyRate : 0;
    const principalPortion = Math.min(Math.max(monthlyPayment - interestPortion, 0), balance);
    balance = Math.max(0, balance - principalPortion);
    yearInterest += interestPortion;

    if (month % 12 === 0) {
      yearlyInterest.push(yearInterest);
      yearInterest = 0;
    }
  }

  if (yearInterest > 0) yearlyInterest.push(yearInterest);
  return yearlyInterest;
}

function requireV2Number(values: InvestmentFormValues, key: keyof InvestmentFormValues): number {
  const value = values[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`TrueCap Underwriting Standard v2 requires an explicit ${String(key)}`);
  }
  return value;
}

/**
 * Exact-annual first-year core. This function is reachable only through an
 * explicit v2 discriminator; calculateAnalysis's historical v1 body remains
 * below, unchanged apart from the one-line dispatch.
 */
function calculateAnalysisV2(
  values: InvestmentFormValues
): V2AnalysisResult {
  const {
    purchasePrice,
    yearBuilt,
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
  } = values;

  const analysisDate = values.analysisDate;
  if (!analysisDate || !/^\d{4}-\d{2}-\d{2}$/.test(analysisDate)) {
    throw new Error("TrueCap Underwriting Standard v2 requires an explicit analysisDate");
  }
  const analysisDateValue = new Date(`${analysisDate}T00:00:00.000Z`);
  if (
    !Number.isFinite(analysisDateValue.getTime()) ||
    analysisDateValue.toISOString().slice(0, 10) !== analysisDate
  ) {
    throw new Error("TrueCap Underwriting Standard v2 requires a valid analysisDate");
  }

  const operatingScenario = values.operatingScenario;
  if (operatingScenario !== "current" && operatingScenario !== "stabilized") {
    throw new Error("TrueCap Underwriting Standard v2 requires an operatingScenario");
  }
  const rentBasis = values.rentBasis;
  if (rentBasis !== "in-place" && rentBasis !== "market" && rentBasis !== "pro-forma") {
    throw new Error("TrueCap Underwriting Standard v2 requires a rentBasis");
  }
  const unitCount = requireV2Number(values, "unitCount");
  if (!Number.isInteger(unitCount) || unitCount < 1 || unitCount > 50) {
    throw new Error("TrueCap Underwriting Standard v2 requires a valid unitCount");
  }
  const scenarioRentMonthly = requireV2Number(
    values,
    operatingScenario === "current" ? "currentMonthlyRent" : "stabilizedMonthlyRent"
  );
  if (scenarioRentMonthly <= 0) {
    throw new Error("TrueCap Underwriting Standard v2 requires scheduled rent above 0");
  }

  // These may be starting defaults in a new v2 editor, but the engine never
  // turns a missing value into zero. It receives an explicit reviewed/default
  // amount or fails closed.
  const recurringOtherIncomeMonthly = requireV2Number(values, "recurringOtherIncomeMonthly");
  const recurringOtherExpenseMonthly = requireV2Number(values, "recurringOtherExpenseMonthly");
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
  const vacancyAllowanceAnnual = grossScheduledIncomeAnnual * (vacancyPct / 100);
  const effectiveGrossIncomeAnnual = grossScheduledIncomeAnnual - vacancyAllowanceAnnual;

  const propertyTaxPctEffective =
    propertyTaxInputMode === "annual" && propertyTaxAnnual != null && purchasePrice > 0
      ? (propertyTaxAnnual / purchasePrice) * 100
      : propertyTaxPct ?? 1.1;
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
  const operatingExpensesAnnual =
    propertyTaxAnnualExact +
    insuranceAnnualExact +
    hoa * 12 +
    utilities * 12 +
    maintenanceAnnual +
    managementAnnual +
    recurringOtherExpenseAnnual;
  const noiAnnual = effectiveGrossIncomeAnnual - operatingExpensesAnnual;

  const financingMode = values.financingMode;
  let downPayment: number;
  let loanAmount: number;
  if (financingMode === "cash") {
    if (loanFees !== 0) {
      throw new Error("Cash acquisitions must use zero loanFees");
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
    throw new Error("TrueCap Underwriting Standard v2 requires a financingMode");
  }

  const downPaymentPctEffective = purchasePrice > 0 ? (downPayment / purchasePrice) * 100 : 0;
  const monthlyPayment = calcMonthlyPayment(loanAmount, interestRate, loanTermYears);
  const annualDebtService = monthlyPayment * 12;
  const pmiAnnualRate =
    pmiAnnualRatePct != null && Number.isFinite(pmiAnnualRatePct)
      ? pmiAnnualRatePct
      : DEFAULT_PMI_ANNUAL_RATE_PCT;
  const pmiMonthly =
    loanAmount > 0 &&
    downPaymentPctEffective < PMI_DOWN_PAYMENT_THRESHOLD_PCT &&
    pmiAnnualRate > 0
      ? (loanAmount * (pmiAnnualRate / 100)) / 12
      : 0;

  const closingCostsInputMode = values.closingCostsInputMode;
  let closingCosts: number;
  let closingCostsPctEffective: number;
  if (closingCostsInputMode === "percent") {
    closingCostsPctEffective = requireV2Number(values, "closingCostsPct");
    closingCosts = purchasePrice * (closingCostsPctEffective / 100);
  } else if (closingCostsInputMode === "fixed") {
    closingCosts = requireV2Number(values, "closingCostsFixed");
    closingCostsPctEffective = purchasePrice > 0 ? (closingCosts / purchasePrice) * 100 : 0;
  } else {
    throw new Error("TrueCap Underwriting Standard v2 requires a closingCostsInputMode");
  }

  const totalCashRequired =
    downPayment + closingCosts + loanFees + cashRepairs + initialReserve - acquisitionCredits;
  if (totalCashRequired < 0) {
    throw new Error("Acquisition credits cannot exceed modeled acquisition cash uses");
  }

  const annualCashFlow =
    noiAnnual - annualDebtService - capexAnnual - pmiMonthly * 12;
  const netCashFlow = annualCashFlow / 12;
  const cocReturn = totalCashRequired > 0 ? (annualCashFlow / totalCashRequired) * 100 : 0;
  const capRate = purchasePrice > 0 ? (noiAnnual / purchasePrice) * 100 : 0;
  const dscr = annualDebtService > 0 ? noiAnnual / annualDebtService : 0;

  const yearlyInterestSchedule = calculateYearlyInterestScheduleExact(
    loanAmount,
    interestRate,
    loanTermYears,
    monthlyPayment
  );
  const annualDepreciation = (purchasePrice * (buildingValuePct / 100)) / depreciationYears;
  const effectiveTaxRate = (taxRatePct ?? 24) / 100;
  const totalOperatingExpenses =
    (vacancyAllowanceAnnual + operatingExpensesAnnual + capexAnnual) / 12;
  const capex = capexAnnual / 12;

  const taxStrategyYears = buildTaxStrategyProjection({
    monthlyRentalIncome: grossScheduledIncomeAnnual / 12,
    totalOperatingExpenses,
    capexReserveMonthly: capex,
    annualDepreciation,
    yearlyInterestSchedule,
    rentGrowthPct,
    expenseGrowthPct,
    taxRate: effectiveTaxRate,
    includeInterestDeduction: includeInterestDeduction !== false,
  });
  const taxSavingsMonthly = (taxStrategyYears[0]?.netTaxBenefitAnnual ?? 0) / 12;
  const afterTaxCF = netCashFlow + taxSavingsMonthly;
  const tenYearProjection = buildTenYearProjection({
    monthlyRentalIncome: grossScheduledIncomeAnnual / 12,
    totalOperatingExpenses,
    capexReserveMonthly: capex,
    monthlyPayment,
    pmiMonthly,
    pmiNoCancel: pmiNoCancel === true,
    loanAmount,
    purchasePrice,
    taxSavingsMonthly,
    annualDepreciation,
    yearlyInterestSchedule,
    rentGrowthPct,
    expenseGrowthPct,
    taxRate: effectiveTaxRate,
    includeInterestDeduction: includeInterestDeduction !== false,
  });

  const currentYear = analysisDateValue.getUTCFullYear();
  const propertyAgeKnown = Number.isFinite(yearBuilt);
  const propertyAge = propertyAgeKnown
    ? Math.max(currentYear - (yearBuilt ?? currentYear), 0)
    : 0;

  return {
    methodologyVersion: TRUECAP_UNDERWRITING_STANDARD_V2_VERSION,
    analysisDate,
    operatingScenario,
    rentBasis,
    scenarioRentMonthly,
    recurringOtherIncomeMonthly,
    recurringOtherIncomeAnnual,
    recurringOtherExpenseMonthly,
    recurringOtherExpenseAnnual,
    financingMode,
    closingCostsInputMode,
    acquisitionCredits,
    loanFees,
    initialReserve,
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
    tenYearProjection,
    taxStrategyYears,
  };
}

export function calculateAnalysis(
  values: InvestmentFormValues & { underwritingModelVersion: "2.0" }
): V2AnalysisResult;
export function calculateAnalysis(values: InvestmentFormValues): AnyAnalysisResult;
export function calculateAnalysis(values: InvestmentFormValues): AnyAnalysisResult {
  if (values.underwritingModelVersion === "2.0") return calculateAnalysisV2(values);

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
  } = values;
  const validUnits = (units ?? []).filter((unit) =>
    isValidRentalUnit(unit, {
      allowZeroRent: propertyType === "owner-occupant" && !!unit?.isOwnerOccupied,
    })
  );

  // Monthly income
  let monthlyRentalIncome = 0;
  if (propertyType === "single-family") {
    // Short-term rental income model: when a nightly rate is set, gross income
    // is ADR × occupancy × 365 / 12 (not a hand-typed monthly rent). The
    // STR strategy's higher vacancy/management defaults still apply on top.
    if (typeof avgDailyRate === "number" && avgDailyRate > 0) {
      monthlyRentalIncome = (avgDailyRate * 365 * ((occupancyPct ?? 0) / 100)) / 12;
    } else {
      monthlyRentalIncome = monthlyRent ?? 0;
    }
  } else {
    monthlyRentalIncome = validUnits
      .filter((u) => !(propertyType === "owner-occupant" && u.isOwnerOccupied))
      .reduce((sum, u) => sum + (u.monthlyRent ?? 0), 0);
  }

  const annualRent = monthlyRentalIncome * 12;

  const currentYear = new Date().getFullYear();
  const hasValidYearBuilt = Number.isFinite(yearBuilt);
  const propertyAge = hasValidYearBuilt ? Math.max(currentYear - (yearBuilt ?? currentYear), 0) : 0;
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
    propertyTaxInputMode === "annual" && propertyTaxAnnual != null && purchasePrice > 0
      ? (propertyTaxAnnual / purchasePrice) * 100
      : propertyTaxPct ?? 1.1;
  const propertyTaxDefault = Math.round((purchasePrice * (propertyTaxPctEffective / 100)) / 12);
  const insurancePctEffective = insurancePct ?? 0.5;
  const insuranceDefault = Math.round((purchasePrice * (insurancePctEffective / 100)) / 12);
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
  const hoa = Math.round(hoaMonthly ?? 0);
  const utilities = Math.round(utilitiesMonthly ?? 0);
  const maintenance = Math.round((annualRent * (maintenancePctEffective / 100)) / 12);
  const vacancy = Math.round((annualRent * (vacancyPct / 100)) / 12);
  const management = Math.round((annualRent * (mgmtPct / 100)) / 12);
  const capex = Math.round((annualRent * (capexPctEffective / 100)) / 12);
  const totalOperatingExpenses =
    propertyTax +
    insurance +
    hoa +
    utilities +
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
  const effectiveGrossIncomeAnnual = grossScheduledIncomeAnnual - vacancyAllowanceAnnual;
  const operatingExpensesAnnual = (operatingExpensesExCapex - vacancy) * 12;
  const noiAnnual = effectiveGrossIncomeAnnual - operatingExpensesAnnual;

  // Financing
  const downPayment = Math.round((purchasePrice * downPaymentPct) / 100);
  const loanAmount = purchasePrice - downPayment;
  const monthlyPayment = Math.round(calcMonthlyPayment(loanAmount, interestRate, loanTermYears));
  const annualDebtService = monthlyPayment * 12;

  // Mortgage insurance: financed loans with < 20% down carry PMI/MIP until the
  // loan amortizes to ~80% LTV (unless pmiNoCancel — FHA MIP runs for the life
  // of the loan). It's a real monthly outlay that reduces cash flow (and was
  // previously ignored, overstating cash flow on low-down / house-hack deals).
  // Not part of the P&I used for DSCR. The rate is user-overridable
  // (pmiAnnualRatePct); 0 disables it (lender-paid MI, gift of equity). Model
  // mortgage insurance ONCE here — never also fold it into the insurance %.
  const pmiAnnualRate =
    pmiAnnualRatePct != null && Number.isFinite(pmiAnnualRatePct)
      ? pmiAnnualRatePct
      : DEFAULT_PMI_ANNUAL_RATE_PCT;
  const pmiMonthly =
    loanAmount > 0 && downPaymentPct < PMI_DOWN_PAYMENT_THRESHOLD_PCT && pmiAnnualRate > 0
      ? Math.round((loanAmount * (pmiAnnualRate / 100)) / 12)
      : 0;

  // Cash flow (CapEx reserve + PMI both reduce real cash flow)
  const netCashFlow = monthlyRentalIncome - totalOperatingExpenses - monthlyPayment - pmiMonthly;
  const annualCashFlow = netCashFlow * 12;

  const closingCostsPctEffective = closingCostsPct ?? 3;
  const closingCosts = Math.round(purchasePrice * (closingCostsPctEffective / 100));
  // One-time cash outlays — STR furnishing/startup and up-front rehab/initial
  // repairs — raise the cash invested (and lower cash-on-cash). v1 keeps these
  // honest as cash-only: they do NOT change the depreciation basis or
  // appreciation (purchasePrice still anchors those).
  const totalCashRequired =
    downPayment + closingCosts + (strFurnishingCost ?? 0) + (rehabBudget ?? 0);

  // Metrics
  const cocReturn = totalCashRequired > 0 ? (annualCashFlow / totalCashRequired) * 100 : 0;
  const capRate = purchasePrice > 0 ? (noiAnnual / purchasePrice) * 100 : 0;
  const dscr =
    annualDebtService > 0 ? noiAnnual / annualDebtService : 0;

  const yearlyInterestSchedule = calculateYearlyInterestSchedule(
    loanAmount,
    interestRate,
    loanTermYears,
    monthlyPayment
  );
  const annualDepreciation = (purchasePrice * (buildingValuePct / 100)) / depreciationYears;
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
    monthlyRentalIncome,
    totalOperatingExpenses,
    capexReserveMonthly: capex,
    annualDepreciation: annualDepreciationRounded,
    yearlyInterestSchedule,
    rentGrowthPct,
    expenseGrowthPct,
    taxRate: effectiveTaxRate,
    includeInterestDeduction: includeInterestDeduction !== false,
  });
  const taxSavingsMonthly = Math.round((taxStrategyYears[0]?.netTaxBenefitAnnual ?? 0) / 12);
  const afterTaxCF = netCashFlow + taxSavingsMonthly;

  const tenYearProjection = buildTenYearProjection({
    monthlyRentalIncome,
    totalOperatingExpenses,
    capexReserveMonthly: capex,
    monthlyPayment,
    pmiMonthly,
    pmiNoCancel: pmiNoCancel === true,
    loanAmount,
    purchasePrice,
    taxSavingsMonthly,
    annualDepreciation,
    yearlyInterestSchedule,
    rentGrowthPct,
    expenseGrowthPct,
    taxRate: effectiveTaxRate,
    includeInterestDeduction: includeInterestDeduction !== false,
  });

  return {
    methodologyVersion: TRUECAP_UNDERWRITING_STANDARD_VERSION,
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
    tenYearProjection,
    taxStrategyYears,
  };
}
