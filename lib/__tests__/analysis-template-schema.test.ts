import { describe, expect, it } from "vitest";
import { analysisTemplateSchema } from "../analysis-template-schema";

const validBase = {
  templateName: "My template",
  templateDescription: "desc",
  propertyTaxPct: 1.1,
  insuranceInputMode: "percent" as const,
  insurancePct: 0.5,
  insuranceMo: undefined,
  maintenancePct: 10,
  vacancyPct: 5,
  managementPct: 8,
  capexPct: 5,
  closingCostsPct: 3,
  interestRatePct: 6.5,
  downPaymentPct: 20,
  expenseGrowthPct: 2.5,
  rentGrowthPct: 2.5,
  appreciationRatePct: 3,
  sellingCostPct: 6,
  buildingValuePct: 85,
  depreciationYears: 27.5 as const,
  includeInterestDeduction: true,
  taxRatePct: 24,
};

describe("analysisTemplateSchema", () => {
  it("rejects zero for required numeric fields", () => {
    const parsed = analysisTemplateSchema.safeParse({
      ...validBase,
      propertyTaxPct: 0,
      maintenancePct: 0,
      interestRatePct: 0,
      downPaymentPct: 0,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects zero insurance values for active insurance mode", () => {
    const percentParsed = analysisTemplateSchema.safeParse({
      ...validBase,
      insuranceInputMode: "percent",
      insurancePct: 0,
      insuranceMo: undefined,
    });
    expect(percentParsed.success).toBe(false);

    const monthlyParsed = analysisTemplateSchema.safeParse({
      ...validBase,
      insuranceInputMode: "monthly",
      insurancePct: undefined,
      insuranceMo: 0,
    });
    expect(monthlyParsed.success).toBe(false);
  });
});
