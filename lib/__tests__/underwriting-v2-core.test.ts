import { describe, expect, it } from "vitest";

import { calculateAnalysis } from "@/lib/calc-analysis";
import {
  INVESTCALC_SCHEMA_VERSION,
  getUnderwritingV2StartingDefaults,
  investmentFormSchema,
  normalizeInvestmentFormSnapshot,
  type InvestmentFormValues,
} from "@/lib/investcalc-schema";
import {
  TRUECAP_UNDERWRITING_STANDARD_V2_VERSION,
  UNDERWRITING_FORMULAS_BY_VERSION,
} from "@/lib/underwriting-methodology";

type V2Values = InvestmentFormValues & { underwritingModelVersion: "2.0" };

/**
 * Independently authored first-year fixture. Expected values below are literal
 * results from the stated annual worksheet, not values copied from the engine.
 */
const FINANCED_V2: V2Values = {
  underwritingModelVersion: "2.0",
  analysisDate: "2026-08-24",
  propertyType: "single-family",
  unitCount: 1,
  address: "12 Exact Annual Way, Philadelphia, PA 19140",
  purchasePrice: 325_000,
  yearBuilt: 1998,
  bedrooms: 3,
  bathrooms: 2,
  sqft: 1_450,
  // Legacy rent stays deliberately different: v2 must not mix it with the
  // selected current/stabilized scenario.
  monthlyRent: 9_999,
  units: [],
  operatingScenario: "current",
  rentBasis: "in-place",
  currentMonthlyRent: 2_850,
  stabilizedMonthlyRent: 3_200,
  recurringOtherIncomeMonthly: 125,
  recurringOtherExpenseMonthly: 85,
  acquisitionCredits: 7_500,
  financingMode: "percent-down",
  downPaymentPct: 20,
  interestRate: 6.375,
  loanTermYears: 30,
  closingCostsInputMode: "percent",
  closingCostsPct: 2.75,
  loanFees: 1_800,
  initialReserve: 5_000,
  rehabBudget: 12_000,
  pmiAnnualRatePct: 0.8,
  pmiNoCancel: false,
  maintenancePct: 6,
  vacancyPct: 5,
  mgmtPct: 8,
  capexPct: 5,
  buildingValuePct: 80,
  depreciationYears: 27.5,
  includeInterestDeduction: true,
  taxRatePct: 24,
  expenseGrowthPct: 2.5,
  rentGrowthPct: 2.5,
  appreciationRatePct: 3,
  sellingCostPct: 6,
  propertyTaxInputMode: "annual",
  propertyTaxAnnual: 5_200,
  propertyTaxPct: undefined,
  insuranceInputMode: "monthly",
  insuranceMonthly: 190,
  insurancePct: undefined,
  hoaMonthly: 0,
  utilitiesMonthly: 125,
};

const V1_CONTROL: InvestmentFormValues = {
  propertyType: "single-family",
  address: "1 Frozen V1 St, Philadelphia, PA 19140",
  purchasePrice: 250_000,
  yearBuilt: 2005,
  bedrooms: 3,
  bathrooms: 2,
  sqft: 1_500,
  monthlyRent: 2_600,
  units: [],
  downPaymentPct: 20,
  interestRate: 6.75,
  loanTermYears: 30,
  closingCostsPct: 3,
  pmiAnnualRatePct: 0.8,
  pmiNoCancel: false,
  maintenancePct: 5,
  vacancyPct: 5,
  mgmtPct: 8,
  capexPct: 5,
  buildingValuePct: 85,
  depreciationYears: 27.5,
  includeInterestDeduction: true,
  taxRatePct: 24,
  expenseGrowthPct: 2.5,
  rentGrowthPct: 2.5,
  appreciationRatePct: 3,
  sellingCostPct: 6,
  propertyTaxPct: 1.1,
  propertyTaxInputMode: "percent",
  insuranceInputMode: "percent",
  insurancePct: 0.5,
  hoaMonthly: 0,
  utilitiesMonthly: 0,
};

function parseV2(overrides: Partial<V2Values> = {}): V2Values {
  return investmentFormSchema.parse({ ...FINANCED_V2, ...overrides }) as V2Values;
}

describe("TrueCap Underwriting Standard v2 compatibility boundary", () => {
  it("bumps the persisted editor schema while leaving missing and explicit v1 on identical math", () => {
    expect(INVESTCALC_SCHEMA_VERSION).toBe(10);

    const absent = calculateAnalysis(V1_CONTROL);
    const explicit = calculateAnalysis({
      ...V1_CONTROL,
      underwritingModelVersion: "1.0",
    });

    expect(absent.methodologyVersion).toBe("1.1");
    expect(explicit).toEqual(absent);
    // Characterize v1's intentional intermediate rounding so a future cleanup
    // cannot accidentally route old analyses through exact-annual v2.
    expect(absent.propertyTax).toBe(229);
    expect(absent.insurance).toBe(104);
    expect(absent.monthlyPayment).toBe(1_297);
  });

  it("does not invent v2 fields while normalizing a legacy snapshot", () => {
    const normalized = normalizeInvestmentFormSnapshot(V1_CONTROL);
    expect(normalized).not.toBeNull();
    expect(normalized).not.toHaveProperty("underwritingModelVersion");
    expect(normalized).not.toHaveProperty("analysisDate");
    expect(normalized).not.toHaveProperty("acquisitionCredits");
  });

  it("preserves a complete v2 snapshot and stamps the v2 methodology", () => {
    const normalized = normalizeInvestmentFormSnapshot({
      ...FINANCED_V2,
      unitCount: "1",
      recurringOtherIncomeMonthly: "125",
    });
    expect(normalized?.underwritingModelVersion).toBe("2.0");
    expect(normalized?.unitCount).toBe(1);
    expect(normalized?.recurringOtherIncomeMonthly).toBe(125);
    expect(calculateAnalysis(normalized as V2Values).methodologyVersion).toBe(
      TRUECAP_UNDERWRITING_STANDARD_V2_VERSION
    );
  });

  it("defaults mortgage insurance by occupancy while preserving explicit lender inputs", () => {
    const investor = calculateAnalysis(
      parseV2({ downPaymentPct: 15, pmiAnnualRatePct: undefined })
    );
    const ownerOccupant = calculateAnalysis(
      parseV2({
        propertyType: "owner-occupant",
        unitCount: 2,
        downPaymentPct: 5,
        pmiAnnualRatePct: undefined,
      })
    );
    const explicitInvestor = calculateAnalysis(
      parseV2({ downPaymentPct: 15, pmiAnnualRatePct: 1.1 })
    );

    expect(investor.pmiMonthly).toBe(0);
    expect(ownerOccupant.pmiMonthly).toBeGreaterThan(0);
    expect(explicitInvestor.pmiMonthly).toBeGreaterThan(0);
  });

  it("publishes a separate reviewed v2 formula registry without relabeling v1", () => {
    expect(UNDERWRITING_FORMULAS_BY_VERSION["1.0"].otherIncome.formula).toContain(
      "Not modeled"
    );
    expect(UNDERWRITING_FORMULAS_BY_VERSION["2.0"].otherIncome.formula).toContain(
      "recurring other monthly income"
    );
    expect(UNDERWRITING_FORMULAS_BY_VERSION["2.0"].dscr.label).toBe("Model DSCR");
  });
});

describe("v2 independently authored golden outputs", () => {
  it("matches the exact-annual standard-financing worksheet within $1 and one basis point", () => {
    const result = calculateAnalysis(parseV2());

    // Independent worksheet:
    // GSI = ($2,850 + $125) × 12 = $35,700
    // Vacancy = $35,700 × 5% = $1,785; EGI = $33,915
    // Opex = 5,200 + 2,280 + 1,500 + 2,142 + 2,856 + 1,020 = $14,998
    // NOI = $18,917; CapEx = $1,785
    // $260,000 @ 6.375%, 30y = $1,622.0617369557644/mo
    expect(result.grossScheduledIncomeAnnual).toBeCloseTo(35_700, 10);
    expect(result.vacancyAllowanceAnnual).toBeCloseTo(1_785, 10);
    expect(result.effectiveGrossIncomeAnnual).toBeCloseTo(33_915, 10);
    expect(result.operatingExpensesAnnual).toBeCloseTo(14_998, 10);
    expect(Math.abs(result.noiAnnual - 18_917)).toBeLessThanOrEqual(1);
    expect(result.loanAmount).toBeCloseTo(260_000, 10);
    expect(result.monthlyPayment).toBeCloseTo(1_622.0617369557644, 10);
    expect(Math.abs(result.annualDebtService - 19_464.740843469175)).toBeLessThanOrEqual(1);
    expect(Math.abs(result.annualCashFlow - -2_332.740843469175)).toBeLessThanOrEqual(1);
    expect(Math.abs(result.totalCashRequired - 85_237.5)).toBeLessThanOrEqual(1);

    // Percentage metrics use percentage points; 0.01pp is one basis point.
    expect(Math.abs(result.capRate - 5.820615384615384)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(result.cocReturn - -2.7367541791689987)).toBeLessThanOrEqual(0.01);
    // A ratio basis point is 0.0001.
    expect(Math.abs(result.dscr - 0.9718598440187837)).toBeLessThanOrEqual(0.0001);
  });

  it("matches a cash, stabilized, fixed-closing-cost worksheet", () => {
    const result = calculateAnalysis(
      parseV2({
        operatingScenario: "stabilized",
        rentBasis: "market",
        recurringOtherIncomeMonthly: 200,
        recurringOtherExpenseMonthly: 50,
        acquisitionCredits: 2_500,
        financingMode: "cash",
        closingCostsInputMode: "fixed",
        closingCostsFixed: 6_500,
        loanFees: 0,
        initialReserve: 4_000,
        rehabBudget: 7_000,
        propertyTaxInputMode: "percent",
        propertyTaxPct: 1.2,
        propertyTaxAnnual: undefined,
        insuranceInputMode: "percent",
        insurancePct: 0.6,
        insuranceMonthly: undefined,
        hoaMonthly: 100,
        utilitiesMonthly: 0,
        maintenancePct: 5,
      })
    );

    // GSI 40,800; vacancy 2,040; EGI 38,760; opex 12,954; NOI 25,806;
    // reserve 2,040; initial cash 325,000+6,500+7,000+4,000−2,500=340,000.
    expect(result.monthlyRentalIncome).toBe(3_200);
    expect(result.grossScheduledIncomeAnnual).toBe(40_800);
    expect(result.operatingExpensesAnnual).toBe(12_954);
    expect(result.noiAnnual).toBe(25_806);
    expect(result.loanAmount).toBe(0);
    expect(result.annualDebtService).toBe(0);
    expect(result.dscr).toBe(0);
    expect(result.annualCashFlow).toBe(23_766);
    expect(result.totalCashRequired).toBe(340_000);
    expect(result.capRate).toBeCloseTo(7.940307692307692, 10);
    expect(result.cocReturn).toBeCloseTo(6.99, 10);
  });
});

describe("v2 scenario and income-statement boundaries", () => {
  it("keeps current and stabilized rents separate and ignores the legacy rent field", () => {
    const current = calculateAnalysis(parseV2({ operatingScenario: "current" }));
    const stabilized = calculateAnalysis(parseV2({ operatingScenario: "stabilized" }));

    expect(current.monthlyRentalIncome).toBe(2_850);
    expect(stabilized.monthlyRentalIncome).toBe(3_200);
    expect(current.monthlyRentalIncome).not.toBe(FINANCED_V2.monthlyRent);
    expect(stabilized.noiAnnual).toBeGreaterThan(current.noiAnnual);
  });

  it("distinguishes an unknown construction year from a zero-year-old property", () => {
    const unknown = calculateAnalysis(parseV2({ yearBuilt: undefined }));
    const newBuild = calculateAnalysis(parseV2({ yearBuilt: 2026 }));

    expect(unknown.propertyAge).toBe(0);
    expect(unknown.propertyAgeKnown).toBe(false);
    expect(newBuild.propertyAge).toBe(0);
    expect(newBuild.propertyAgeKnown).toBe(true);
  });

  it("treats scheduled rent as a property-total amount rather than multiplying by units", () => {
    const result = calculateAnalysis(
      parseV2({
        propertyType: "multi-family",
        unitCount: 2,
        currentMonthlyRent: 5_000,
        units: [
          { monthlyRent: 1_000 },
          { monthlyRent: 2_000 },
        ],
      })
    );

    expect(result.monthlyRentalIncome).toBe(5_000);
    expect(result.unitCount).toBe(2);
    expect(result.grossScheduledIncomeAnnual).toBe((5_000 + 125) * 12);
  });

  it("flows other income through GSI/EGI and recurring other expense through NOI", () => {
    const base = calculateAnalysis(parseV2());
    const moreIncome = calculateAnalysis(
      parseV2({ recurringOtherIncomeMonthly: 225 })
    );
    const moreExpense = calculateAnalysis(
      parseV2({ recurringOtherExpenseMonthly: 185 })
    );

    expect(moreIncome.grossScheduledIncomeAnnual - base.grossScheduledIncomeAnnual).toBe(1_200);
    expect(moreIncome.effectiveGrossIncomeAnnual - base.effectiveGrossIncomeAnnual).toBe(1_140);
    // $1,140 EGI gain less 6% maintenance and 8% management on $1,200 GSI.
    expect(moreIncome.noiAnnual - base.noiAnnual).toBe(972);
    expect(base.noiAnnual - moreExpense.noiAnnual).toBe(1_200);
  });

  it("keeps replacement reserve below NOI but in investor cash flow", () => {
    const withoutReserve = calculateAnalysis(parseV2({ capexPct: 0 }));
    const withReserve = calculateAnalysis(parseV2({ capexPct: 10 }));

    expect(withReserve.noiAnnual).toBe(withoutReserve.noiAnnual);
    expect(withReserve.capRate).toBe(withoutReserve.capRate);
    expect(withReserve.annualCashFlow).toBe(
      withoutReserve.annualCashFlow - withReserve.grossScheduledIncomeAnnual * 0.1
    );
  });

  it("preserves deliberate zero management and zero vacancy assumptions", () => {
    const base = calculateAnalysis(parseV2());
    const zeroManagement = calculateAnalysis(parseV2({ mgmtPct: 0 }));
    const zeroVacancy = calculateAnalysis(parseV2({ vacancyPct: 0 }));

    expect(zeroManagement.management).toBe(0);
    expect(zeroManagement.noiAnnual - base.noiAnnual).toBe(
      base.grossScheduledIncomeAnnual * 0.08
    );
    expect(zeroVacancy.vacancyAllowanceAnnual).toBe(0);
    expect(zeroVacancy.noiAnnual - base.noiAnnual).toBe(
      base.grossScheduledIncomeAnnual * 0.05
    );
  });
});

describe("v2 acquisition and financing semantics", () => {
  it("reduces initial cash by credits without changing NOI or cash flow", () => {
    const noCredit = calculateAnalysis(parseV2({ acquisitionCredits: 0 }));
    const withCredit = calculateAnalysis(parseV2({ acquisitionCredits: 10_000 }));

    expect(noCredit.totalCashRequired - withCredit.totalCashRequired).toBe(10_000);
    expect(withCredit.noiAnnual).toBe(noCredit.noiAnnual);
    expect(withCredit.annualCashFlow).toBe(noCredit.annualCashFlow);
  });

  it("keeps immediate repairs cash-funded under percent-down and fixed-loan financing", () => {
    for (const financing of [
      { financingMode: "cash" as const, loanFees: 0 },
      { financingMode: "percent-down" as const },
      { financingMode: "fixed-loan" as const, fixedLoanAmount: 240_000 },
    ]) {
      const withoutRepairs = calculateAnalysis(
        parseV2({ ...financing, rehabBudget: 0 })
      );
      const withRepairs = calculateAnalysis(
        parseV2({ ...financing, rehabBudget: 25_000 })
      );

      expect(withRepairs.loanAmount).toBe(withoutRepairs.loanAmount);
      expect(withRepairs.monthlyPayment).toBe(withoutRepairs.monthlyPayment);
      expect(withRepairs.noiAnnual).toBe(withoutRepairs.noiAnnual);
      expect(withRepairs.totalCashRequired - withoutRepairs.totalCashRequired).toBe(25_000);
    }
  });

  it("preserves cash, percentage-down, fixed-down, and fixed-loan price semantics", () => {
    const cash = calculateAnalysis(parseV2({ financingMode: "cash", loanFees: 0 }));
    const percent = calculateAnalysis(parseV2({ financingMode: "percent-down" }));
    const fixedDown = calculateAnalysis(
      parseV2({ financingMode: "fixed-down", fixedDownPaymentAmount: 75_000 })
    );
    const fixedLoan = calculateAnalysis(
      parseV2({ financingMode: "fixed-loan", fixedLoanAmount: 240_000 })
    );

    expect([cash.downPayment, cash.loanAmount]).toEqual([325_000, 0]);
    expect([percent.downPayment, percent.loanAmount]).toEqual([65_000, 260_000]);
    expect([fixedDown.downPayment, fixedDown.loanAmount]).toEqual([75_000, 250_000]);
    expect([fixedLoan.downPayment, fixedLoan.loanAmount]).toEqual([85_000, 240_000]);

    const higherFixedDown = calculateAnalysis(
      parseV2({
        purchasePrice: 350_000,
        financingMode: "fixed-down",
        fixedDownPaymentAmount: 75_000,
      })
    );
    const higherFixedLoan = calculateAnalysis(
      parseV2({
        purchasePrice: 350_000,
        financingMode: "fixed-loan",
        fixedLoanAmount: 240_000,
      })
    );
    expect([higherFixedDown.downPayment, higherFixedDown.loanAmount]).toEqual([75_000, 275_000]);
    expect([higherFixedLoan.downPayment, higherFixedLoan.loanAmount]).toEqual([110_000, 240_000]);
  });

  it("keeps fixed closing costs fixed and percentage closing costs scaling with price", () => {
    const fixed = calculateAnalysis(
      parseV2({ closingCostsInputMode: "fixed", closingCostsFixed: 8_250 })
    );
    const higherFixed = calculateAnalysis(
      parseV2({
        purchasePrice: 400_000,
        closingCostsInputMode: "fixed",
        closingCostsFixed: 8_250,
      })
    );
    const percent = calculateAnalysis(parseV2({ closingCostsPct: 2.75 }));
    const higherPercent = calculateAnalysis(
      parseV2({ purchasePrice: 400_000, closingCostsPct: 2.75 })
    );

    expect(fixed.closingCosts).toBe(8_250);
    expect(higherFixed.closingCosts).toBe(8_250);
    expect(percent.closingCosts).toBe(8_937.5);
    expect(higherPercent.closingCosts).toBe(11_000);
  });
});

describe("v2 unknown-value and validation boundary", () => {
  it.each(["hoaMonthly", "utilitiesMonthly", "rehabBudget"] as const)(
    "rejects blank %s while accepting an explicit zero",
    (field) => {
      const blank = investmentFormSchema.safeParse({ ...FINANCED_V2, [field]: "" });
      const zero = investmentFormSchema.safeParse({ ...FINANCED_V2, [field]: 0 });

      expect(blank.success).toBe(false);
      if (!blank.success) {
        expect(blank.error.issues.some((issue) => issue.path[0] === field)).toBe(true);
      }
      expect(zero.success).toBe(true);
    }
  );

  it("provides explicit zero starting assumptions only for a new v2 editor", () => {
    const starting = getUnderwritingV2StartingDefaults("2026-08-24");

    expect(starting).toMatchObject({
      underwritingModelVersion: "2.0",
      acquisitionCredits: 0,
      recurringOtherIncomeMonthly: 0,
      recurringOtherExpenseMonthly: 0,
      loanFees: 0,
      initialReserve: 0,
    });
    expect(starting).not.toHaveProperty("hoaMonthly");
    expect(starting).not.toHaveProperty("utilitiesMonthly");
    expect(starting).not.toHaveProperty("rehabBudget");
    expect(V1_CONTROL).not.toHaveProperty("acquisitionCredits");
  });

  it.each([
    "acquisitionCredits",
    "recurringOtherIncomeMonthly",
    "recurringOtherExpenseMonthly",
    "loanFees",
    "initialReserve",
  ] as const)("rejects a blank %s when new-form starting defaults were not applied", (field) => {
    const parsed = investmentFormSchema.safeParse({ ...FINANCED_V2, [field]: "" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.path[0] === field)).toBe(true);
    }
  });

  it("rejects a blank monthly insurance bill and annual tax bill on their own paths", () => {
    const insurance = investmentFormSchema.safeParse({
      ...FINANCED_V2,
      insuranceInputMode: "monthly",
      insuranceMonthly: "",
    });
    const tax = investmentFormSchema.safeParse({
      ...FINANCED_V2,
      propertyTaxInputMode: "annual",
      propertyTaxAnnual: "",
    });

    expect(insurance.success).toBe(false);
    expect(tax.success).toBe(false);
    if (!insurance.success) {
      expect(insurance.error.issues.some((issue) => issue.path[0] === "insuranceMonthly")).toBe(true);
    }
    if (!tax.success) {
      expect(tax.error.issues.some((issue) => issue.path[0] === "propertyTaxAnnual")).toBe(true);
    }
  });

  it("rejects missing scenario, financing, closing-cost, date, and selected-rent inputs", () => {
    const cases: Array<[keyof V2Values, unknown]> = [
      ["analysisDate", ""],
      ["unitCount", ""],
      ["operatingScenario", undefined],
      ["rentBasis", undefined],
      ["financingMode", undefined],
      ["closingCostsInputMode", undefined],
      ["currentMonthlyRent", ""],
    ];

    for (const [field, value] of cases) {
      const parsed = investmentFormSchema.safeParse({ ...FINANCED_V2, [field]: value });
      expect(parsed.success, String(field)).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues.some((issue) => issue.path[0] === field), String(field)).toBe(true);
      }
    }
  });

  it("requires the amount selected by each fixed financing or closing-cost mode", () => {
    const cases: Array<[Partial<V2Values>, keyof V2Values]> = [
      [{ financingMode: "fixed-down", fixedDownPaymentAmount: undefined }, "fixedDownPaymentAmount"],
      [{ financingMode: "fixed-loan", fixedLoanAmount: undefined }, "fixedLoanAmount"],
      [{ closingCostsInputMode: "fixed", closingCostsFixed: undefined }, "closingCostsFixed"],
    ];

    for (const [override, field] of cases) {
      const parsed = investmentFormSchema.safeParse({ ...FINANCED_V2, ...override });
      expect(parsed.success, String(field)).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues.some((issue) => issue.path[0] === field), String(field)).toBe(true);
      }
    }
  });

  it("fails closed when an unparsed caller bypasses the schema with a missing value", () => {
    const invalid = { ...FINANCED_V2, utilitiesMonthly: undefined } as V2Values;
    expect(() => calculateAnalysis(invalid)).toThrow(/explicit utilitiesMonthly/);
  });

  it("rejects credits that exceed every modeled acquisition cash use", () => {
    const parsed = investmentFormSchema.safeParse({
      ...FINANCED_V2,
      acquisitionCredits: 1_000_000,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.path[0] === "acquisitionCredits")).toBe(true);
    }
  });

  it("rejects stale loan fees after switching to a cash acquisition", () => {
    const parsed = investmentFormSchema.safeParse({
      ...FINANCED_V2,
      financingMode: "cash",
      loanFees: 1_800,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.path[0] === "loanFees")).toBe(true);
    }
  });
});

describe("v2 monotonic invariants", () => {
  it("increasing rent cannot lower NOI", () => {
    const base = calculateAnalysis(parseV2());
    const higher = calculateAnalysis(parseV2({ currentMonthlyRent: 3_000 }));
    expect(higher.noiAnnual).toBeGreaterThan(base.noiAnnual);
  });

  it("increasing a recurring expense cannot improve NOI, cash flow, or target metrics", () => {
    const base = calculateAnalysis(parseV2());
    const higher = calculateAnalysis(
      parseV2({ recurringOtherExpenseMonthly: 335 })
    );
    expect(higher.noiAnnual).toBeLessThan(base.noiAnnual);
    expect(higher.netCashFlow).toBeLessThan(base.netCashFlow);
    expect(higher.capRate).toBeLessThan(base.capRate);
    expect(higher.cocReturn).toBeLessThan(base.cocReturn);
    expect(higher.dscr).toBeLessThan(base.dscr);
  });

  it("increasing price cannot improve financed cash flow under frozen exact-dollar assumptions", () => {
    const base = calculateAnalysis(parseV2());
    const higher = calculateAnalysis(parseV2({ purchasePrice: 350_000 }));
    expect(higher.loanAmount).toBeGreaterThan(base.loanAmount);
    expect(higher.annualDebtService).toBeGreaterThan(base.annualDebtService);
    expect(higher.netCashFlow).toBeLessThan(base.netCashFlow);
  });
});
