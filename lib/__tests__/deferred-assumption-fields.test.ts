import { describe, expect, it } from "vitest";
import { isDeferredAssumptionField } from "@/lib/detailed-assumption-fields";

describe("validation before the optional editor has mounted", () => {
  it.each(["interestRate", "closingCostsFixed", "rehabBudget", "stabilizedMonthlyRent", "units.2.stabilizedMonthlyRent"])("opens the editor for %s", path => {
    expect(isDeferredAssumptionField(path)).toBe(true);
  });

  it.each(["address", "purchasePrice", "monthlyRent", "units.2.monthlyRent", "units.invalid.stabilizedMonthlyRent"])("does not misroute %s", path => {
    expect(isDeferredAssumptionField(path)).toBe(false);
  });
});
