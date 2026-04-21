import { defaultValues, InvestmentFormValues, isValidRentalUnit } from "./investcalc-schema";

export interface ProjectionYear {
  year: number;
  rentalIncomeAnnual: number;
  operatingExpensesAnnual: number;
  debtServiceAnnual: number;
  netCashFlowAnnual: number;
  taxSavingsAnnual: number;
  afterTaxCashFlowAnnual: number;
}

export interface AnalysisResult {
  // income
  monthlyRentalIncome: number;
  // expenses
  propertyTax: number;
  insurance: number;
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
  // cash required
  downPaymentPct: number;
  closingCostsPct: number;
  downPayment: number;
  closingCosts: number;
  totalCashRequired: number;
  propertyAge: number;
  tenYearProjection: ProjectionYear[];
}

function calcMonthlyPayment(principal: number, annualRate: number, years: number): number {
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

function getAgeAdjustments(age: number): {
  maintenanceMultiplier: number;
  capexMultiplier: number;
  riskPenalty: number;
} {
  if (age <= 5) {
    return { maintenanceMultiplier: 0.8, capexMultiplier: 0.8, riskPenalty: 0 };
  }
  if (age <= 15) {
    return { maintenanceMultiplier: 1, capexMultiplier: 1, riskPenalty: 2 };
  }
  if (age <= 30) {
    return { maintenanceMultiplier: 1.2, capexMultiplier: 1.3, riskPenalty: 5 };
  }
  return { maintenanceMultiplier: 1.5, capexMultiplier: 1.6, riskPenalty: 10 };
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
    insuranceMonthly,
    hoaMonthly,
    utilitiesMonthly,
  } = values;
  const validUnits = (units ?? []).filter((unit) => isValidRentalUnit(unit));

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
  const ageAdjustments = hasValidYearBuilt ? getAgeAdjustments(propertyAge) : null;
  const isDefaultMaintenance = maintenancePct === defaultValues.maintenancePct;
  const isDefaultCapex = capexPct === defaultValues.capexPct;
  const maintenancePctEffective =
    ageAdjustments && isDefaultMaintenance ? maintenancePct * ageAdjustments.maintenanceMultiplier : maintenancePct;
  const capexPctEffective = ageAdjustments && isDefaultCapex ? capexPct * ageAdjustments.capexMultiplier : capexPct;
  const maintenanceAgeAdjusted = isDefaultMaintenance && maintenancePctEffective !== maintenancePct;
  const capexAgeAdjusted = isDefaultCapex && capexPctEffective !== capexPct;

  // Operating expenses (property tax is percentage based; insurance/others remain monthly overrides)
  const propertyTaxPctEffective = propertyTaxPct ?? 1.1;
  const propertyTaxDefault = Math.round((purchasePrice * (propertyTaxPctEffective / 100)) / 12);
  const insuranceDefault = Math.round((purchasePrice * 0.005) / 12);
  const propertyTax = propertyTaxDefault;
  const insurance = Math.round(insuranceMonthly ?? insuranceDefault);
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

  // 10-year projection with separate rent and expense growth assumptions.
  const annualDebtService = monthlyPayment * 12;
  const expenseGrowthFactor = 1 + expenseGrowthPct / 100;
  const rentGrowthFactor = 1 + rentGrowthPct / 100;
  const tenYearProjection: ProjectionYear[] = Array.from({ length: 10 }, (_, i) => {
    const year = i + 1;
    const rentGrowth = Math.pow(rentGrowthFactor, i);
    const expenseGrowth = Math.pow(expenseGrowthFactor, i);
    const rentalIncomeAnnual = Math.round(annualRent * rentGrowth);
    const operatingExpensesAnnual = Math.round(totalOperatingExpenses * 12 * expenseGrowth);
    const netCashFlowAnnual = rentalIncomeAnnual - operatingExpensesAnnual - annualDebtService;
    const annualInterestForYear = yearlyInterestSchedule[i] ?? 0;
    const taxableShieldBaseForYear =
      includeInterestDeduction === false
        ? annualDepreciation
        : annualDepreciation + annualInterestForYear;
    const taxSavingsAnnual = Math.round(taxableShieldBaseForYear * effectiveTaxRate);
    const afterTaxCashFlowAnnual = netCashFlowAnnual + taxSavingsAnnual;

    return {
      year,
      rentalIncomeAnnual,
      operatingExpensesAnnual,
      debtServiceAnnual: annualDebtService,
      netCashFlowAnnual,
      taxSavingsAnnual,
      afterTaxCashFlowAnnual,
    };
  });

  return {
    monthlyRentalIncome,
    propertyTax,
    insurance,
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
    netCashFlow,
    annualCashFlow,
    cocReturn,
    capRate,
    dscr,
    taxSavingsMonthly,
    afterTaxCF,
    annualDepreciation: Math.round(annualDepreciation),
    downPaymentPct,
    closingCostsPct: closingCostsPctEffective,
    downPayment,
    closingCosts,
    totalCashRequired,
    propertyAge,
    tenYearProjection,
  };
}

export function getRecommendation(result: AnalysisResult): {
  label: string;
  description: string;
  tips: string[];
  variant: "strong-buy" | "buy" | "neutral" | "avoid";
} {
  const { cocReturn, netCashFlow, dscr } = result;

  if (cocReturn >= 10 && netCashFlow > 0 && dscr >= 1.25) {
    return {
      label: "Strong Buy",
      description: `Excellent cash flow of $${netCashFlow.toLocaleString()}/month with ${cocReturn.toFixed(1)}% cash-on-cash return.`,
      tips: [
        "Maximize tax benefits through cost segregation study",
        "Build 6-month reserve fund for emergencies",
        "Consider value-add improvements to increase rents",
      ],
      variant: "strong-buy",
    };
  }
  if (cocReturn >= 6 && netCashFlow > 0) {
    return {
      label: "Buy",
      description: `Solid ${cocReturn.toFixed(1)}% cash-on-cash return with positive monthly cash flow.`,
      tips: [
        "Negotiate lower purchase price for better returns",
        "Review management fee options to reduce costs",
        "Consider short-term rental strategy for higher income",
      ],
      variant: "buy",
    };
  }
  if (netCashFlow >= 0) {
    return {
      label: "Neutral",
      description: `This deal breaks even with ${cocReturn.toFixed(1)}% CoC return. Consider negotiating.`,
      tips: [
        "Negotiate purchase price down 5-10%",
        "Explore higher rent potential in the area",
        "Review all expense assumptions carefully",
      ],
      variant: "neutral",
    };
  }
  return {
    label: "Avoid",
    description: `Negative cash flow of $${Math.abs(netCashFlow).toLocaleString()}/month. This deal needs renegotiation.`,
    tips: [
      "Seek significant price reduction",
      "Explore alternative financing options",
      "Reconsider market timing",
    ],
    variant: "avoid",
  };
}
