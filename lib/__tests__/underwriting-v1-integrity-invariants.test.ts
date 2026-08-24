import { describe, expect, it } from "vitest";

import { calculateAnalysis, type AnalysisResult } from "@/lib/calc-analysis";
import {
  investmentFormSchema,
  type InvestmentFormValues,
} from "@/lib/investcalc-schema";
import {
  calculateMaxAllowableOffer,
  type MaoTarget,
} from "@/lib/max-allowable-offer";
import { buildSensitivityReport } from "@/lib/sensitivity-analysis";
import { UNDERWRITING_V1_GOLDEN_CORPUS } from "@/lib/__tests__/fixtures/underwriting-v1-golden-corpus";

/**
 * These are relational/invariant checks, not engine snapshots. Expected
 * outcomes are derived from the stated input change or from an independent
 * target predicate; no calculateAnalysis output is copied into a fixture.
 */

function withHigherModeledRent(
  values: InvestmentFormValues,
  factor = 1.1,
): InvestmentFormValues {
  if (typeof values.avgDailyRate === "number" && values.avgDailyRate > 0) {
    return { ...values, avgDailyRate: values.avgDailyRate * factor };
  }

  if (values.propertyType === "single-family") {
    return {
      ...values,
      monthlyRent: Number(values.monthlyRent) * factor,
    };
  }

  return {
    ...values,
    units: (values.units ?? []).map((unit) => ({
      ...unit,
      monthlyRent:
        typeof unit.monthlyRent === "number"
          ? unit.monthlyRent * factor
          : unit.monthlyRent,
    })),
  };
}

/** Independent predicate for the public target contract. */
function independentlyPassesTarget(
  result: AnalysisResult,
  purchasePrice: number,
  target: MaoTarget,
): boolean {
  if (target.capRate !== undefined && result.capRate < target.capRate) return false;
  if (target.cocReturn !== undefined && result.cocReturn < target.cocReturn) return false;
  if (
    target.monthlyCashFlow !== undefined &&
    result.netCashFlow < target.monthlyCashFlow
  ) {
    return false;
  }
  if (
    target.dscr !== undefined &&
    result.monthlyPayment > 0 &&
    result.dscr < target.dscr
  ) {
    return false;
  }
  if (
    target.maxPurchasePrice !== undefined &&
    purchasePrice > target.maxPurchasePrice
  ) {
    return false;
  }
  return true;
}

function corpusValues(id: string): InvestmentFormValues {
  const match = UNDERWRITING_V1_GOLDEN_CORPUS.find((entry) => entry.id === id);
  if (!match) throw new Error(`Missing v1 corpus case: ${id}`);
  return match.values;
}

describe("v1 monotonic underwriting invariants", () => {
  it.each(UNDERWRITING_V1_GOLDEN_CORPUS.map((entry) => [entry.id, entry.values] as const))(
    "increasing modeled rent cannot lower NOI: %s",
    (_id, values) => {
      const base = calculateAnalysis(values);
      const higherRent = calculateAnalysis(withHigherModeledRent(values));

      expect(higherRent.monthlyRentalIncome).toBeGreaterThan(base.monthlyRentalIncome);
      expect(higherRent.noiAnnual).toBeGreaterThanOrEqual(base.noiAnnual);
    },
  );

  it.each(UNDERWRITING_V1_GOLDEN_CORPUS.map((entry) => [entry.id, entry.values] as const))(
    "increasing a recurring operating expense cannot improve target fit: %s",
    (_id, values) => {
      const base = calculateAnalysis(values);
      const monthlyIncrease = 250;
      const higherExpenseValues = {
        ...values,
        hoaMonthly: Number(values.hoaMonthly ?? 0) + monthlyIncrease,
      };
      const higherExpense = calculateAnalysis(higherExpenseValues);

      // The independent house convention: recurring HOA is an operating
      // expense, so a $250/mo increase lowers annual NOI by $3,000 and cash
      // flow by $250/mo while financing and initial cash stay frozen.
      expect(higherExpense.totalOperatingExpenses - base.totalOperatingExpenses).toBe(
        monthlyIncrease,
      );
      expect(base.noiAnnual - higherExpense.noiAnnual).toBe(monthlyIncrease * 12);
      expect(base.netCashFlow - higherExpense.netCashFlow).toBe(monthlyIncrease);
      expect(higherExpense.capRate).toBeLessThanOrEqual(base.capRate);
      expect(higherExpense.cocReturn).toBeLessThanOrEqual(base.cocReturn);
      if (base.monthlyPayment > 0) {
        expect(higherExpense.dscr).toBeLessThanOrEqual(base.dscr);
      }

      const baseFit: MaoTarget = {
        capRate: base.capRate,
        cocReturn: base.cocReturn,
        monthlyCashFlow: base.netCashFlow,
        ...(base.monthlyPayment > 0 ? { dscr: base.dscr } : {}),
      };
      expect(independentlyPassesTarget(base, values.purchasePrice, baseFit)).toBe(true);
      expect(
        independentlyPassesTarget(
          higherExpense,
          higherExpenseValues.purchasePrice,
          baseFit,
        ),
      ).toBe(false);
    },
  );

  it.each(
    UNDERWRITING_V1_GOLDEN_CORPUS.filter(
      (entry) => entry.values.downPaymentPct < 100,
    ).map((entry) => [entry.id, entry.values] as const),
  )(
    "increasing price cannot improve financed cash flow under frozen assumptions: %s",
    (_id, values) => {
      const base = calculateAnalysis(values);
      const higherPrice = calculateAnalysis({
        ...values,
        purchasePrice: values.purchasePrice + 50_000,
      });

      expect(higherPrice.loanAmount).toBeGreaterThan(base.loanAmount);
      expect(higherPrice.monthlyPayment).toBeGreaterThanOrEqual(base.monthlyPayment);
      expect(higherPrice.netCashFlow).toBeLessThanOrEqual(base.netCashFlow);
    },
  );
});

describe("v1 blank versus deliberate-zero boundary", () => {
  const values = corpusValues("financed_sfr_standard");

  it.each(["maintenancePct", "vacancyPct", "mgmtPct", "capexPct"] as const)(
    "rejects blank %s but accepts and preserves an explicit zero",
    (field) => {
      const blank = investmentFormSchema.safeParse({ ...values, [field]: "" });
      const zero = investmentFormSchema.safeParse({ ...values, [field]: 0 });

      expect(blank.success).toBe(false);
      if (blank.success) return;
      expect(blank.error.issues.some((issue) => issue.path[0] === field)).toBe(true);
      expect(zero.success).toBe(true);
      if (!zero.success) return;
      expect(zero.data[field]).toBe(0);
    },
  );

  it("keeps a blank annual tax bill distinct from a deliberate $0 bill", () => {
    const blank = investmentFormSchema.parse({
      ...values,
      propertyTaxInputMode: "annual",
      propertyTaxAnnual: "",
    });
    const zero = investmentFormSchema.parse({
      ...values,
      propertyTaxInputMode: "annual",
      propertyTaxAnnual: 0,
    });

    expect(blank.propertyTaxAnnual).toBeUndefined();
    expect(zero.propertyTaxAnnual).toBe(0);
    expect(calculateAnalysis(blank).propertyTax).toBeGreaterThan(0);
    expect(calculateAnalysis(zero).propertyTax).toBe(0);
  });

  it("keeps a blank monthly insurance bill distinct from a deliberate $0 bill", () => {
    const blank = investmentFormSchema.parse({
      ...values,
      insuranceInputMode: "monthly",
      insuranceMonthly: "",
    });
    const zero = investmentFormSchema.parse({
      ...values,
      insuranceInputMode: "monthly",
      insuranceMonthly: 0,
    });

    expect(blank.insuranceMonthly).toBeUndefined();
    expect(zero.insuranceMonthly).toBe(0);
    expect(calculateAnalysis(blank).insurance).toBeGreaterThan(0);
    expect(calculateAnalysis(zero).insurance).toBe(0);
  });
});

describe("Offer Ceiling fixed and scaling input semantics", () => {
  const baseValues = corpusValues("financed_sfr_standard");

  it("recalculates percentage-based costs at each candidate price", () => {
    const lowPrice = 200_000;
    const highPrice = 300_000;
    const low = calculateAnalysis({ ...baseValues, purchasePrice: lowPrice });
    const high = calculateAnalysis({ ...baseValues, purchasePrice: highPrice });

    expect(low.downPayment).toBe(Math.round(lowPrice * (baseValues.downPaymentPct / 100)));
    expect(high.downPayment).toBe(
      Math.round(highPrice * (baseValues.downPaymentPct / 100)),
    );
    expect(low.closingCosts).toBe(
      Math.round(lowPrice * (Number(baseValues.closingCostsPct) / 100)),
    );
    expect(high.closingCosts).toBe(
      Math.round(highPrice * (Number(baseValues.closingCostsPct) / 100)),
    );
    expect(low.propertyTax).toBe(
      Math.round((lowPrice * (Number(baseValues.propertyTaxPct) / 100)) / 12),
    );
    expect(high.propertyTax).toBe(
      Math.round((highPrice * (Number(baseValues.propertyTaxPct) / 100)) / 12),
    );
    expect(low.insurance).toBe(
      Math.round((lowPrice * (Number(baseValues.insurancePct) / 100)) / 12),
    );
    expect(high.insurance).toBe(
      Math.round((highPrice * (Number(baseValues.insurancePct) / 100)) / 12),
    );

    // Rent-based reserves and explicitly fixed monthly costs do not scale
    // merely because the candidate purchase price changes.
    expect(high.monthlyRentalIncome).toBe(low.monthlyRentalIncome);
    expect(high.maintenance).toBe(low.maintenance);
    expect(high.vacancy).toBe(low.vacancy);
    expect(high.management).toBe(low.management);
    expect(high.capex).toBe(low.capex);
    expect(high.hoa).toBe(low.hoa);
    expect(high.utilities).toBe(low.utilities);
  });

  it("keeps exact-dollar operating costs fixed while fully rerunning the displayed ceiling", () => {
    const values: InvestmentFormValues = {
      ...baseValues,
      propertyTaxInputMode: "annual",
      propertyTaxAnnual: 4_800,
      insuranceInputMode: "monthly",
      insuranceMonthly: 175,
      hoaMonthly: 125,
      utilitiesMonthly: 80,
    };
    const target: MaoTarget = {
      monthlyCashFlow: 250,
      dscr: 1.25,
      capRate: 7,
    };
    const solved = calculateMaxAllowableOffer(values, target, {
      maxPrice: 650_000,
    });

    expect(solved).not.toBeNull();
    if (!solved) return;

    const directRerun = calculateAnalysis({
      ...values,
      purchasePrice: solved.maxPrice,
    });
    expect(solved.maxPrice % 500).toBe(0);
    expect(solved.achieved).toEqual(directRerun);
    expect(
      independentlyPassesTarget(solved.achieved, solved.maxPrice, target),
    ).toBe(true);
    expect(solved.achieved.propertyTax).toBe(400);
    expect(solved.achieved.insurance).toBe(175);
    expect(solved.achieved.hoa).toBe(125);
    expect(solved.achieved.utilities).toBe(80);
    expect(solved.achieved.downPayment).toBe(
      Math.round(solved.maxPrice * (values.downPaymentPct / 100)),
    );
    expect(solved.achieved.closingCosts).toBe(
      Math.round(solved.maxPrice * (Number(values.closingCostsPct) / 100)),
    );
    expect(solved.achieved.loanAmount).toBe(
      solved.maxPrice - solved.achieved.downPayment,
    );

    // Unless an explicit search cap is binding, the next displayed increment
    // must fail at least one active target.
    const nextPrice = solved.maxPrice + 500;
    expect(nextPrice).toBeLessThanOrEqual(650_000);
    const next = calculateAnalysis({ ...values, purchasePrice: nextPrice });
    expect(independentlyPassesTarget(next, nextPrice, target)).toBe(false);
  });
});

describe("sensitivity scenarios equal full engine reruns", () => {
  it("matches direct SFR reruns for rent, vacancy, and interest-rate axes", () => {
    const values = corpusValues("financed_sfr_standard");
    const report = buildSensitivityReport(values);

    expect(report).not.toBeNull();
    if (!report) return;

    const rent = report.find((row) => row.axis === "rent");
    const vacancy = report.find((row) => row.axis === "vacancy");
    const rate = report.find((row) => row.axis === "interestRate");
    expect(rent?.scenarios[0].result).toEqual(
      calculateAnalysis({
        ...values,
        monthlyRent: Math.round(Number(values.monthlyRent) * 0.9),
      }),
    );
    expect(rent?.scenarios[2].result).toEqual(
      calculateAnalysis({
        ...values,
        monthlyRent: Math.round(Number(values.monthlyRent) * 1.1),
      }),
    );
    expect(vacancy?.scenarios[0].result).toEqual(
      calculateAnalysis({ ...values, vacancyPct: values.vacancyPct + 5 }),
    );
    expect(vacancy?.scenarios[2].result).toEqual(
      calculateAnalysis({ ...values, vacancyPct: Math.max(0, values.vacancyPct - 5) }),
    );
    expect(rate?.scenarios[0].result).toEqual(
      calculateAnalysis({ ...values, interestRate: values.interestRate + 1 }),
    );
    expect(rate?.scenarios[2].result).toEqual(
      calculateAnalysis({ ...values, interestRate: Math.max(0, values.interestRate - 1) }),
    );
  });

  it("matches direct per-unit reruns for multifamily rent sensitivity", () => {
    const values = corpusValues("three_unit_multifamily");
    const report = buildSensitivityReport(values);
    const rent = report?.find((row) => row.axis === "rent");

    const rerunAt = (factor: number) =>
      calculateAnalysis({
        ...values,
        monthlyRent: Math.round(
          (values.units ?? []).reduce(
            (sum, unit) => sum + Number(unit.monthlyRent ?? 0),
            0,
          ) * factor,
        ),
        units: (values.units ?? []).map((unit) => ({
          ...unit,
          monthlyRent:
            unit.monthlyRent == null
              ? unit.monthlyRent
              : Math.round(Number(unit.monthlyRent) * factor),
        })),
      });

    expect(rent?.scenarios[0].result).toEqual(rerunAt(0.9));
    expect(rent?.scenarios[2].result).toEqual(rerunAt(1.1));
  });

  it("reruns ADR for STR sensitivity and omits the irrelevant rate axis for cash", () => {
    const strValues = corpusValues("short_term_rental");
    const strReport = buildSensitivityReport(strValues);
    const strRent = strReport?.find((row) => row.axis === "rent");
    expect(strRent?.scenarios[0].result).toEqual(
      calculateAnalysis({
        ...strValues,
        avgDailyRate:
          Math.round(Number(strValues.avgDailyRate) * 0.9 * 100) / 100,
      }),
    );
    expect(strRent?.scenarios[2].result).toEqual(
      calculateAnalysis({
        ...strValues,
        avgDailyRate:
          Math.round(Number(strValues.avgDailyRate) * 1.1 * 100) / 100,
      }),
    );

    const cashReport = buildSensitivityReport(
      corpusValues("cash_annual_tax_monthly_insurance"),
    );
    expect(cashReport?.some((row) => row.axis === "interestRate")).toBe(false);
  });
});
