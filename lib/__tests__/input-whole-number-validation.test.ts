import { describe, expect, it } from "vitest";

import { investmentFormSchema } from "@/lib/investcalc-schema";
import { SAMPLE_DEAL_FIXTURE } from "@/lib/sample-deal";

describe("whole-number underwriting inputs", () => {
  it.each([
    ["year built", { yearBuilt: 1942.5 }, "yearBuilt", "Use a whole year"],
    ["bedrooms", { bedrooms: 2.5 }, "bedrooms", "Use a whole number"],
    ["loan term", { loanTermYears: 30.5 }, "loanTermYears", "Use whole years"],
  ])("rejects a fractional %s", (_label, patch, path, message) => {
    const parsed = investmentFormSchema.safeParse({
      ...SAMPLE_DEAL_FIXTURE.values,
      ...patch,
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues).toContainEqual(
        expect.objectContaining({ path: [path], message }),
      );
    }
  });

  it("rejects fractional unit bedrooms because the value selects HUD rent benchmarks", () => {
    const parsed = investmentFormSchema.safeParse({
      ...SAMPLE_DEAL_FIXTURE.values,
      propertyType: "multi-family",
      units: [
        { bedrooms: 1.5, monthlyRent: 1_500 },
        { bedrooms: 2, monthlyRent: 1_650 },
      ],
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues).toContainEqual(
        expect.objectContaining({
          path: ["units", 0, "bedrooms"],
          message: "Use a whole number",
        }),
      );
    }
  });

  it("continues to accept the equivalent whole-number inputs", () => {
    expect(
      investmentFormSchema.safeParse({
        ...SAMPLE_DEAL_FIXTURE.values,
        yearBuilt: 1942,
        bedrooms: 3,
        loanTermYears: 30,
      }).success,
    ).toBe(true);
  });
});
