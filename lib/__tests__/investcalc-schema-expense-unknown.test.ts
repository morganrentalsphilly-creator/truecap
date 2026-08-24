import { describe, expect, it } from "vitest";

import {
  defaultValues,
  investmentFormSchema,
} from "@/lib/investcalc-schema";

const completeDeal = {
  ...defaultValues,
  propertyType: "single-family" as const,
  address: "1700 W Erie Ave, Philadelphia, PA 19140",
  purchasePrice: 265_000,
  monthlyRent: 3_050,
  insuranceInputMode: "percent" as const,
};

describe("material expense unknown-vs-zero contract", () => {
  it.each(["maintenancePct", "vacancyPct", "mgmtPct", "capexPct"] as const)(
    "rejects a cleared %s instead of silently modeling 0%%",
    (field) => {
      const parsed = investmentFormSchema.safeParse({
        ...completeDeal,
        [field]: Number.NaN,
      });

      expect(parsed.success).toBe(false);
      if (parsed.success) return;
      expect(parsed.error.issues.some((issue) => issue.path[0] === field)).toBe(true);
    }
  );

  it.each(["maintenancePct", "vacancyPct", "mgmtPct", "capexPct"] as const)(
    "accepts an explicit 0 for %s",
    (field) => {
      expect(
        investmentFormSchema.safeParse({ ...completeDeal, [field]: 0 }).success
      ).toBe(true);
    }
  );

  it("keeps non-zero compatibility defaults for genuinely missing legacy keys", () => {
    const parsed = investmentFormSchema.parse({
      ...completeDeal,
      maintenancePct: undefined,
      vacancyPct: undefined,
      mgmtPct: undefined,
      capexPct: undefined,
    });

    expect(parsed).toMatchObject({
      maintenancePct: 10,
      vacancyPct: 5,
      mgmtPct: 8,
      capexPct: 5,
    });
  });
});
