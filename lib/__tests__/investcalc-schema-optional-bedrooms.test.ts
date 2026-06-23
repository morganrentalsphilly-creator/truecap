import { describe, expect, it } from "vitest";
import { investmentFormSchema, defaultValues } from "@/lib/investcalc-schema";

/**
 * Jun 2026: bedrooms is now OPTIONAL for a single-family run (enables the
 * address-only strategy flows like Wholesale → MAO). monthlyRent stays
 * required — the cash-flow math can't proceed without it.
 */
const base = {
  ...defaultValues,
  propertyType: "single-family" as const,
  address: "123 Main St, Philadelphia, PA 19101",
  purchasePrice: 250000,
  bedrooms: 3,
  monthlyRent: 2000,
};

describe("investcalc schema — single-family bedrooms optional", () => {
  it("parses with bedrooms present", () => {
    expect(investmentFormSchema.safeParse(base).success).toBe(true);
  });

  it("parses with bedrooms omitted (now optional)", () => {
    const { bedrooms: _bedrooms, ...noBeds } = base;
    void _bedrooms;
    expect(investmentFormSchema.safeParse(noBeds).success).toBe(true);
  });

  it("still rejects an out-of-range bedrooms value when provided", () => {
    const res = investmentFormSchema.safeParse({ ...base, bedrooms: 99 });
    expect(res.success).toBe(false);
  });

  it("still requires monthly rent for single-family", () => {
    const { monthlyRent: _rent, ...noRent } = base;
    void _rent;
    const res = investmentFormSchema.safeParse(noRent);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path.includes("monthlyRent"))).toBe(true);
    }
  });
});
