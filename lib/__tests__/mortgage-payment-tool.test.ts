import { describe, expect, it } from "vitest";

import { calculateMortgagePaymentEstimate } from "@/components/tools/mortgage-payment-widget";
import { DEFAULT_PMI_ANNUAL_RATE_PCT } from "@/lib/calc-analysis";

describe("public mortgage payment tool", () => {
  it("includes canonical mortgage insurance below 20% down", () => {
    const estimate = calculateMortgagePaymentEstimate({
      price: 250_000,
      downPaymentPct: 5,
      interestRate: 6,
      loanTermYears: 30,
      propertyTaxPct: 1.2,
      homeownerInsurancePct: 0.5,
    });

    const expectedPmi =
      (estimate.loan * (DEFAULT_PMI_ANNUAL_RATE_PCT / 100)) / 12;
    expect(estimate.monthlyPmi).toBeCloseTo(expectedPmi, 10);
    expect(estimate.monthlyPmi).toBeCloseTo(158.33, 2);
    expect(estimate.monthlyTotal).toBeCloseTo(
      estimate.monthlyPI +
        estimate.monthlyTax +
        estimate.monthlyInsurance +
        estimate.monthlyPmi,
      10,
    );
  });

  it("does not add mortgage insurance at 20% or more down", () => {
    const estimate = calculateMortgagePaymentEstimate({
      price: 250_000,
      downPaymentPct: 20,
      interestRate: 6,
      loanTermYears: 30,
      propertyTaxPct: 1.2,
      homeownerInsurancePct: 0.5,
    });

    expect(estimate.monthlyPmi).toBe(0);
  });
});
