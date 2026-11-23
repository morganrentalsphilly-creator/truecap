import { describe, expect, it } from "vitest";
import {
  insuranceAnnualFromMonthly,
  insuranceMonthlyFromAnnual,
} from "@/lib/insurance-input";

describe("insurance annual input, monthly storage (audit B6)", () => {
  it("shows twelve times the stored monthly amount", () => {
    expect(insuranceAnnualFromMonthly(160)).toBe(1920);
    expect(insuranceAnnualFromMonthly(160.42)).toBe(1925.04);
  });

  it("stores a twelfth of the typed annual premium", () => {
    expect(insuranceMonthlyFromAnnual(1920)).toBe(160);
  });

  it("round-trips a premium that does not divide evenly", () => {
    for (const annual of [2000, 1234.56, 1, 999_999]) {
      expect(
        insuranceAnnualFromMonthly(insuranceMonthlyFromAnnual(annual)),
      ).toBe(annual);
    }
  });

  it("keeps the engine's annual figure exact to the cent", () => {
    const monthly = insuranceMonthlyFromAnnual(2000)!;
    expect(Math.round(monthly * 12 * 100) / 100).toBe(2000);
  });

  it("treats an empty field as empty", () => {
    expect(insuranceAnnualFromMonthly(undefined)).toBeNull();
    expect(insuranceAnnualFromMonthly(null)).toBeNull();
    expect(insuranceAnnualFromMonthly(Number.NaN)).toBeNull();
    expect(insuranceMonthlyFromAnnual(null)).toBeNull();
  });
});
