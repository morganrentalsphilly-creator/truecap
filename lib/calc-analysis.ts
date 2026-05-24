import { InvestmentFormValues, isValidRentalUnit } from "./investcalc-schema";
import { buildTaxStrategyProjection, type TaxStrategyYear } from "./tax-strategy";
import { buildTenYearProjection, ProjectionYear } from "./ten-year-projections";

export interface AnalysisResult {
  // income
  monthlyRentalIncome: number;
  // expenses
  propertyTax: number;
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
  // debt service
  loanAmount: number;
  monthlyPayment: number;
  loanPrincipalAndInterest: number;
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

function calcMonthlyPayment(principal: number, annualRate: number, years: number): number {
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

export function calculateAnalysis(values: InvestmentFormValues): AnalysisResult {
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
    insuranceInputMode,
    insurancePct,
    insuranceMonthly,
    hoaMonthly,
    utilitiesMonthly,
  } = values;
  const validUnits = (units ?? []).filter((unit) =>
    isValidRentalUnit(unit, {
      allowZeroRent: propertyType === "owner-occupant" && !!unit?.isOwnerOccupied,
    })
  );

  // Monthly income
  let monthlyRentalIncome = 0;
  if (propertyType === "single-family") {
    monthlyRentalIncome = monthlyRent ?? 0;
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
  const propertyTaxPctEffective = propertyTaxPct ?? 1.1;
  const propertyTaxDefault = Math.round((purchasePrice * (propertyTaxPctEffective / 100)) / 12);
  const insurancePctEffective = insurancePct ?? 0.5;
  const insuranceDefault = Math.round((purchasePrice * (insurancePctEffective / 100)) / 12);
  const propertyTax = propertyTaxDefault;
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

  // Financing
  const downPayment = Math.round((purchasePrice * downPaymentPct) / 100);
  const loanAmount = purchasePrice - downPayment;
  const monthlyPayment = Math.round(calcMonthlyPayment(loanAmount, interestRate, loanTermYears));

  // Cash flow
  const netCashFlow = monthlyRentalIncome - totalOperatingExpenses - monthlyPayment;
  const annualCashFlow = netCashFlow * 12;

  const closingCostsPctEffective = closingCostsPct ?? 3;
  const closingCosts = Math.round(purchasePrice * (closingCostsPctEffective / 100));
  const totalCashRequired = downPayment + closingCosts;

  // Metrics
  const cocReturn = totalCashRequired > 0 ? (annualCashFlow / totalCashRequired) * 100 : 0;
  const noi = (monthlyRentalIncome - totalOperatingExpenses) * 12;
  const capRate = purchasePrice > 0 ? (noi / purchasePrice) * 100 : 0;
  const dscr = monthlyPayment > 0 ? (monthlyRentalIncome - totalOperatingExpenses) / monthlyPayment : 0;

  // Estimated tax savings:
  // If includeInterestDeduction => (Depreciation + Interest) * Tax Rate
  // Else => Depreciation * Tax Rate
  const yearlyInterestSchedule = calculateYearlyInterestSchedule(
    loanAmount,
    interestRate,
    loanTermYears,
    monthlyPayment
  );
  const annualDepreciation = (purchasePrice * (buildingValuePct / 100)) / depreciationYears;
  const annualInterestDeduction = yearlyInterestSchedule[0] ?? 0;
  const effectiveTaxRate = (taxRatePct ?? 24) / 100;
  const taxableShieldBase =
    includeInterestDeduction === false
      ? annualDepreciation
      : annualDepreciation + annualInterestDeduction;
  const annualTaxSavings = taxableShieldBase * effectiveTaxRate;
  const taxSavingsMonthly = Math.round(annualTaxSavings / 12);
  const afterTaxCF = netCashFlow + taxSavingsMonthly;

  const tenYearProjection = buildTenYearProjection({
    monthlyRentalIncome,
    totalOperatingExpenses,
    monthlyPayment,
    taxSavingsMonthly,
    annualDepreciation,
    yearlyInterestSchedule,
    rentGrowthPct,
    expenseGrowthPct,
    taxRate: effectiveTaxRate,
    includeInterestDeduction: includeInterestDeduction !== false,
  });

  const annualDepreciationRounded = Math.round(annualDepreciation);
  const taxStrategyYears = buildTaxStrategyProjection({
    monthlyRentalIncome,
    totalOperatingExpenses,
    annualDepreciation: annualDepreciationRounded,
    yearlyInterestSchedule,
    rentGrowthPct,
    expenseGrowthPct,
    taxRate: effectiveTaxRate,
    includeInterestDeduction: includeInterestDeduction !== false,
  });

  return {
    monthlyRentalIncome,
    propertyTax,
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
    loanAmount,
    monthlyPayment,
    loanPrincipalAndInterest: monthlyPayment,
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

