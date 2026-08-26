import { describe, expect, it } from "vitest";
import {
  investmentFormSchema,
  isValidRentalUnit,
  defaultValues,
  MAX_MONTHLY_RENT,
} from "@/lib/investcalc-schema";
import { calculateAnalysis } from "@/lib/calc-analysis";

/**
 * Jul 2026 (smoothness Batch B): multi-family / owner-occupant runs no longer
 * wall behind beds/baths/sqft per unit — only rent is required (the only field
 * the cash-flow math reads). Load-bearing coupling: isValidRentalUnit must
 * agree, or calc-analysis silently zeroes a rent-only unit's income.
 */
const mfBase = {
  ...defaultValues,
  propertyType: "multi-family" as const,
  address: "1700 W Erie Ave, Philadelphia, PA 19140",
  purchasePrice: 320000,
};

describe("multi-family — rent-only units are valid", () => {
  it("isValidRentalUnit accepts a unit with rent but no beds/baths/sqft", () => {
    expect(isValidRentalUnit({ monthlyRent: 1400 })).toBe(true);
    expect(isValidRentalUnit({ monthlyRent: 0 })).toBe(false); // rentals need > 0
    expect(isValidRentalUnit({ monthlyRent: 0 }, { allowZeroRent: true })).toBe(true);
    expect(isValidRentalUnit({ bedrooms: 2, bathrooms: 1, sqft: 800 })).toBe(false); // no rent
  });

  it("parses a duplex with ONLY per-unit rents (no facts)", () => {
    const res = investmentFormSchema.safeParse({
      ...mfBase,
      units: [{ monthlyRent: 1400 }, { monthlyRent: 1250 }],
    });
    expect(res.success).toBe(true);
  });

  it("still flags a unit missing its rent — and ONLY the rent field", () => {
    const res = investmentFormSchema.safeParse({
      ...mfBase,
      units: [{ monthlyRent: 1400 }, { bedrooms: 2 }],
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      const paths = res.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("units.1.monthlyRent");
      // No beds/baths/sqft "required" issues re-walling the fact fields.
      expect(paths.some((p) => p.endsWith("bedrooms") || p.endsWith("bathrooms") || p.endsWith("sqft"))).toBe(false);
    }
  });

  it("calc-analysis SUMS rent-only units' income (no silent zero)", () => {
    const parsed = investmentFormSchema.safeParse({
      ...mfBase,
      units: [{ monthlyRent: 1400 }, { monthlyRent: 1250 }],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const r = calculateAnalysis(parsed.data);
      expect(r.monthlyRentalIncome).toBe(2650); // 1400 + 1250, not 0
    }
  });

  it("still range-checks a provided fact (beds > 20 rejected by unitSchema)", () => {
    const res = investmentFormSchema.safeParse({
      ...mfBase,
      units: [{ monthlyRent: 1400, bedrooms: 99 }],
    });
    expect(res.success).toBe(false);
  });

  it("requires at least one positive-rent unit instead of underwriting an empty building", () => {
    const res = investmentFormSchema.safeParse({
      ...mfBase,
      units: [],
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues).toContainEqual(
        expect.objectContaining({
          path: ["units", 0, "monthlyRent"],
          message: "Add at least one rental unit with rent greater than 0.",
        }),
      );
    }
  });

  it("rejects unsupported rents for both single-family and per-unit inputs", () => {
    const singleFamily = investmentFormSchema.safeParse({
      ...defaultValues,
      address: mfBase.address,
      purchasePrice: mfBase.purchasePrice,
      monthlyRent: MAX_MONTHLY_RENT + 1,
    });
    const multiFamily = investmentFormSchema.safeParse({
      ...mfBase,
      units: [{ monthlyRent: MAX_MONTHLY_RENT + 1 }],
    });

    expect(singleFamily.success).toBe(false);
    expect(multiFamily.success).toBe(false);
  });
});
