import { describe, expect, it } from "vitest";
import { analysisTemplateSchema } from "../analysis-template-schema";
import { STARTER_TEMPLATES } from "../starter-templates";

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

  it("accepts every shipped starter template", () => {
    // Guards against a starter whose description exceeds 40 chars or whose
    // expense %s exceed the form's 50% cap — both would save fine in code but
    // fail when a user clicks "Customize & save" or applies the template.
    const failures = STARTER_TEMPLATES.filter(
      (starter) => !analysisTemplateSchema.safeParse(starter.template).success
    ).map((starter) => starter.template.templateName);
    expect(failures).toEqual([]);
  });

  it("rejects expense %s above the analyzer form's 50% ceiling", () => {
    for (const field of ["maintenancePct", "vacancyPct", "managementPct", "capexPct"] as const) {
      expect(analysisTemplateSchema.safeParse({ ...validBase, [field]: 60 }).success).toBe(false);
      expect(analysisTemplateSchema.safeParse({ ...validBase, [field]: 50 }).success).toBe(true);
    }
  });

  it("rejects a template description longer than 40 characters", () => {
    expect(
      analysisTemplateSchema.safeParse({ ...validBase, templateDescription: "x".repeat(41) }).success
    ).toBe(false);
    expect(
      analysisTemplateSchema.safeParse({ ...validBase, templateDescription: "x".repeat(40) }).success
    ).toBe(true);
  });
});
