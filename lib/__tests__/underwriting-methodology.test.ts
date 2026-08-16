import { describe, expect, it } from "vitest";

import { calcMonthlyPayment, calculateAnalysis } from "../calc-analysis";
import type { InvestmentFormValues } from "../investcalc-schema";
import {
  TRUECAP_UNDERWRITING_STANDARD_VERSION,
  UNDERWRITING_FORMULAS,
} from "../underwriting-methodology";

function deal(overrides: Partial<InvestmentFormValues> = {}): InvestmentFormValues {
  return {
    propertyType: "single-family",
    address: "123 Test St, Philadelphia, PA 19103, USA",
    purchasePrice: 300_000,
    yearBuilt: 1995,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1_500,
    monthlyRent: 2_800,
    units: [],
    downPaymentPct: 20,
    interestRate: 6.5,
    loanTermYears: 30,
    closingCostsPct: 3,
    propertyTaxPct: 1.2,
    insuranceInputMode: "percent",
    insurancePct: 0.5,
    hoaMonthly: 0,
    utilitiesMonthly: 0,
    maintenancePct: 5,
    vacancyPct: 5,
    mgmtPct: 8,
    capexPct: 5,
    buildingValuePct: 80,
    depreciationYears: 27.5,
    includeInterestDeduction: true,
    taxRatePct: 24,
    expenseGrowthPct: 2,
    rentGrowthPct: 3,
    appreciationRatePct: 3,
    sellingCostPct: 6,
    ...overrides,
  } as InvestmentFormValues;
}

describe("TrueCap Underwriting Standard 1.0", () => {
  it("stamps every result with the methodology version", () => {
    expect(calculateAnalysis(deal()).methodologyVersion).toBe(
      TRUECAP_UNDERWRITING_STANDARD_VERSION
    );
  });

  it("publishes the complete canonical formula and limitation registry", () => {
    expect(Object.keys(UNDERWRITING_FORMULAS)).toEqual([
      "grossScheduledIncome",
      "otherIncome",
      "vacancyAllowance",
      "effectiveGrossIncome",
      "propertyTaxes",
      "insurance",
      "repairsMaintenance",
      "management",
      "utilitiesAndHoa",
      "capexReserve",
      "operatingExpenses",
      "noi",
      "annualDebtService",
      "mortgagePayment",
      "beforeTaxCashFlow",
      "totalCashRequired",
      "capRate",
      "cashOnCashReturn",
      "dscr",
      "dealScore",
      "maxOffer",
      "brrrrRefinance",
      "fixAndFlip",
      "illustrativeTaxImpact",
      "appreciation",
      "loanAmortization",
      "saleProceeds",
      "totalProfit",
      "irr",
      "equityBuildup",
    ]);
  });

  it("reconciles the income statement to NOI without hidden categories", () => {
    const result = calculateAnalysis(deal());

    expect(result.grossScheduledIncomeAnnual).toBe(result.monthlyRentalIncome * 12);
    expect(result.vacancyAllowanceAnnual).toBe(result.vacancy * 12);
    expect(result.effectiveGrossIncomeAnnual).toBe(
      result.grossScheduledIncomeAnnual - result.vacancyAllowanceAnnual
    );
    expect(result.noiAnnual).toBe(
      result.effectiveGrossIncomeAnnual - result.operatingExpensesAnnual
    );
    expect(result.noiAnnual).toBe(
      (result.monthlyRentalIncome - (result.totalOperatingExpenses - result.capex)) * 12
    );
  });

  it("reconciles cap rate, DSCR, and cash-on-cash to their displayed bases", () => {
    const values = deal({ rehabBudget: 12_500, strFurnishingCost: 7_500 });
    const result = calculateAnalysis(values);

    expect(result.capRate).toBeCloseTo((result.noiAnnual / values.purchasePrice) * 100, 10);
    expect(result.annualDebtService).toBe(result.monthlyPayment * 12);
    expect(result.dscr).toBeCloseTo(result.noiAnnual / result.annualDebtService, 10);
    expect(result.cocReturn).toBeCloseTo(
      (result.annualCashFlow / result.totalCashRequired) * 100,
      10
    );
    expect(result.totalCashRequired).toBe(
      result.downPayment + result.closingCosts + 12_500 + 7_500
    );
  });

  it("keeps CapEx below NOI while including it in cash flow", () => {
    const withoutReserve = calculateAnalysis(deal({ capexPct: 0 }));
    const withReserve = calculateAnalysis(deal({ capexPct: 10 }));

    expect(withReserve.noiAnnual).toBe(withoutReserve.noiAnnual);
    expect(withReserve.capRate).toBe(withoutReserve.capRate);
    expect(withReserve.netCashFlow).toBeLessThan(withoutReserve.netCashFlow);
  });

  it("keeps PMI out of lender-style DSCR while including it in cash flow", () => {
    const withPmi = calculateAnalysis(deal({ downPaymentPct: 5 }));
    const withoutPmi = calculateAnalysis(
      deal({ downPaymentPct: 5, pmiAnnualRatePct: 0 })
    );

    expect(withPmi.pmiMonthly).toBeGreaterThan(0);
    expect(withPmi.noiAnnual).toBe(withoutPmi.noiAnnual);
    expect(withPmi.dscr).toBe(withoutPmi.dscr);
    expect(withPmi.netCashFlow).toBe(withoutPmi.netCashFlow - withPmi.pmiMonthly);
  });

  it("uses a cash-purchase sentinel without producing NaN or Infinity", () => {
    const result = calculateAnalysis(deal({ downPaymentPct: 100 }));

    expect(result.loanAmount).toBe(0);
    expect(result.annualDebtService).toBe(0);
    expect(result.dscr).toBe(0);
    for (const value of [result.capRate, result.cocReturn, result.netCashFlow]) {
      expect(Number.isFinite(value)).toBe(true);
    }
  });

  it("uses the textbook payment formula and handles a zero rate", () => {
    expect(calcMonthlyPayment(100_000, 6, 30)).toBeCloseTo(599.55, 2);
    expect(calcMonthlyPayment(120_000, 0, 30)).toBeCloseTo(333.33, 2);
    expect(calcMonthlyPayment(0, 7, 30)).toBe(0);
  });

  it("honors annual tax and monthly insurance inputs in the statement", () => {
    const result = calculateAnalysis(
      deal({
        propertyTaxInputMode: "annual",
        propertyTaxAnnual: 6_000,
        propertyTaxPct: undefined,
        insuranceInputMode: "monthly",
        insuranceMonthly: 225,
        insurancePct: undefined,
      })
    );

    expect(result.propertyTax).toBe(500);
    expect(result.insurance).toBe(225);
    expect(result.propertyTaxPctEffective).toBeCloseTo(2, 8);
    expect(result.operatingExpensesAnnual).toBe(
      (result.propertyTax +
        result.insurance +
        result.hoa +
        result.utilities +
        result.maintenance +
        result.management) *
        12
    );
  });

  it("models owner-occupied units as zero income without dropping rented units", () => {
    const result = calculateAnalysis(
      deal({
        propertyType: "owner-occupant",
        monthlyRent: undefined,
        units: [
          { bedrooms: 2, monthlyRent: 0, isOwnerOccupied: true },
          { bedrooms: 2, monthlyRent: 1_650, isOwnerOccupied: false },
        ],
      })
    );

    expect(result.monthlyRentalIncome).toBe(1_650);
    expect(result.grossScheduledIncomeAnnual).toBe(19_800);
  });
});
