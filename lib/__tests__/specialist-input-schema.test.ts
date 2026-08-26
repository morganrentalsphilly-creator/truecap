import { describe, expect, it } from "vitest";

import {
  defaultValues,
  investmentFormSchema,
  normalizeInvestmentFormSnapshot,
} from "../investcalc-schema";

const base = {
  ...defaultValues,
  propertyType: "single-family" as const,
  address: "123 Test St, Philadelphia, PA 19103",
  purchasePrice: 250_000,
  monthlyRent: 2_300,
};

describe("durable specialist input schema", () => {
  it("round-trips every BRRRR and flip field through snapshot normalization", () => {
    const input = {
      ...base,
      rehabBudget: 35_000,
      strategyArv: 390_000,
      strategyHoldMonths: 6,
      brrrrRefiLtvPct: 75,
      brrrrRefiRatePct: 7.25,
      brrrrRefiTermYears: 30,
      brrrrRefiClosingCostsPct: 2,
      fixFlipSellingCostsPct: 7,
      fixFlipDownPaymentPct: 20,
      fixFlipCarryMonthly: 1_250,
    };

    const parsed = investmentFormSchema.parse(input);
    expect(normalizeInvestmentFormSnapshot(parsed)).toMatchObject({
      rehabBudget: 35_000,
      strategyArv: 390_000,
      strategyHoldMonths: 6,
      brrrrRefiLtvPct: 75,
      brrrrRefiRatePct: 7.25,
      brrrrRefiTermYears: 30,
      brrrrRefiClosingCostsPct: 2,
      fixFlipSellingCostsPct: 7,
      fixFlipDownPaymentPct: 20,
      fixFlipCarryMonthly: 1_250,
    });
  });

  it("preserves explicit zero instead of replacing it with a display default", () => {
    const parsed = investmentFormSchema.parse({
      ...base,
      brrrrRefiRatePct: 0,
      brrrrRefiClosingCostsPct: 0,
      fixFlipSellingCostsPct: 0,
      fixFlipDownPaymentPct: 0,
      fixFlipCarryMonthly: 0,
      strategyHoldMonths: 0,
    });
    expect(parsed).toMatchObject({
      brrrrRefiRatePct: 0,
      brrrrRefiClosingCostsPct: 0,
      fixFlipSellingCostsPct: 0,
      fixFlipDownPaymentPct: 0,
      fixFlipCarryMonthly: 0,
      strategyHoldMonths: 0,
    });
  });

  it.each([
    ["brrrrRefiRatePct", 30, 30.01],
    ["brrrrRefiClosingCostsPct", 20, 20.01],
    ["fixFlipSellingCostsPct", 30, 30.01],
  ] as const)("enforces the %s boundary", (field, accepted, rejected) => {
    expect(
      investmentFormSchema.safeParse({ ...base, [field]: accepted }).success,
    ).toBe(true);
    expect(
      investmentFormSchema.safeParse({ ...base, [field]: rejected }).success,
    ).toBe(false);
  });

  it("requires whole hold months and refinance years", () => {
    expect(
      investmentFormSchema.safeParse({
        ...base,
        strategyHoldMonths: 6.5,
      }).success,
    ).toBe(false);
    expect(
      investmentFormSchema.safeParse({
        ...base,
        brrrrRefiTermYears: 30.5,
      }).success,
    ).toBe(false);
  });

  it("accepts a blank ARV but rejects an explicit zero-dollar value", () => {
    expect(
      investmentFormSchema.safeParse({ ...base, strategyArv: undefined })
        .success,
    ).toBe(true);
    const zero = investmentFormSchema.safeParse({ ...base, strategyArv: 0 });
    expect(zero.success).toBe(false);
    if (!zero.success) {
      expect(zero.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["strategyArv"],
            message: "Must be at least $1",
          }),
        ]),
      );
    }
  });
});
