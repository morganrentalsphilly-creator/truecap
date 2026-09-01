import { describe, expect, it } from "vitest";
import { computeDealScore } from "@/lib/deal-score";
import { TRUECAP_DEAL_SCORE_METHODOLOGY_VERSION } from "@/lib/underwriting-methodology";

const input = {
  propertyType: "single-family" as const,
  monthlyCashFlow: 250,
  cashOnCashReturn: 7,
  cashOnCashApplicable: true,
  capRate: 6.5,
  dscr: 1.3,
  vacancyRate: 5,
  propertyAge: 25,
  propertyAgeKnown: true,
  capexPct: 5,
  maintenancePct: 5,
  monthlyPropertyTax: 300,
  monthlyRentIncome: 2_500,
  isCashPurchase: false,
  tenYearAnnualizedReturnPct: 10,
};

describe("Screening Index methodology version", () => {
  it("versions score arithmetic independently from unchanged core financial math", () => {
    expect(TRUECAP_DEAL_SCORE_METHODOLOGY_VERSION).toBe("1.4");
    expect(computeDealScore(input).scoreMethodologyVersion).toBe("1.4");
  });
});
