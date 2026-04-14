import { InvestmentFormValues } from "./investcalc-schema";

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
  // cash required
  downPayment: number;
  closingCosts: number;
  totalCashRequired: number;
}

function calcMonthlyPayment(principal: number, annualRate: number, years: number): number {
  if (annualRate === 0) return principal / (years * 12);
  const r = annualRate / 100 / 12;
  const n = years * 12;
  return (principal * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
}

export function calculateAnalysis(values: InvestmentFormValues): AnalysisResult {
  const {
    purchasePrice,
    propertyType,
    monthlyRent,
    units,
    downPaymentPct,
    interestRate,
    loanTermYears,
    maintenancePct,
    vacancyPct,
    mgmtPct,
    capexPct,
    propertyTaxMonthly,
    insuranceMonthly,
    hoaMonthly,
    utilitiesMonthly,
  } = values;

  // Monthly income
  let monthlyRentalIncome = 0;
  if (propertyType === "single-family") {
    monthlyRentalIncome = monthlyRent ?? 0;
  } else {
    monthlyRentalIncome = (units ?? [])
      .filter((u, i) => !(propertyType === "house-hack" && i === 0))
      .reduce((sum, u) => sum + (u.monthlyRent ?? 0), 0);
  }

  const annualRent = monthlyRentalIncome * 12;

  // Operating expenses (monthly $ overrides optional; otherwise estimate from value / zero)
  const propertyTaxDefault = Math.round((purchasePrice * 0.011) / 12);
  const insuranceDefault = Math.round((purchasePrice * 0.005) / 12);
  const propertyTax = Math.round(propertyTaxMonthly ?? propertyTaxDefault);
  const insurance = Math.round(insuranceMonthly ?? insuranceDefault);
  const hoa = Math.round(hoaMonthly ?? 0);
  const utilities = Math.round(utilitiesMonthly ?? 0);
  const maintenance = Math.round((annualRent * (maintenancePct / 100)) / 12);
  const vacancy = Math.round((annualRent * (vacancyPct / 100)) / 12);
  const management = Math.round((annualRent * (mgmtPct / 100)) / 12);
  const capex = Math.round((annualRent * (capexPct / 100)) / 12);
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

  // Closing costs (3%)
  const closingCosts = Math.round(purchasePrice * 0.03);
  const totalCashRequired = downPayment + closingCosts;

  // Metrics
  const cocReturn = totalCashRequired > 0 ? (annualCashFlow / totalCashRequired) * 100 : 0;
  const noi = (monthlyRentalIncome - totalOperatingExpenses) * 12;
  const capRate = purchasePrice > 0 ? (noi / purchasePrice) * 100 : 0;
  const dscr = monthlyPayment > 0 ? (monthlyRentalIncome - totalOperatingExpenses) / monthlyPayment : 0;

  // Tax savings simplified: depreciation benefit
  const depreciation = purchasePrice * 0.85; // land ~15%
  const annualDepreciation = depreciation / 27.5;
  const taxSavingsMonthly = Math.round((annualDepreciation * 0.24) / 12);
  const afterTaxCF = netCashFlow + taxSavingsMonthly;

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
    downPayment,
    closingCosts,
    totalCashRequired,
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
