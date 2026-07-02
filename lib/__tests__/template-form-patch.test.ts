import { describe, expect, it } from "vitest";

import {
  buildTemplateFormPatch,
  type TemplateAssumptionSource,
} from "@/lib/template-form-patch";

const baseTemplate: TemplateAssumptionSource = {
  propertyTaxPct: 1.4,
  insuranceInputMode: "percent",
  insurancePct: 0.5,
  insuranceMo: null,
  maintenancePct: 8,
  vacancyPct: 5,
  managementPct: 10,
  capexPct: 6,
  closingCostsPct: 3,
  interestRatePct: 6.25,
  downPaymentPct: 25,
  expenseGrowthPct: 2.5,
  rentGrowthPct: 3,
  appreciationRatePct: 3,
  sellingCostPct: 6,
  buildingValuePct: 85,
  depreciationYears: 27.5,
  includeInterestDeduction: true,
  taxRatePct: 32,
};

function valueOf(entries: ReturnType<typeof buildTemplateFormPatch>, field: string) {
  const entry = entries.find((e) => e.field === field);
  if (!entry) throw new Error(`missing patch entry for ${field}`);
  return entry.value;
}

describe("buildTemplateFormPatch", () => {
  it("maps template fields onto the form's shape, including renames", () => {
    const patch = buildTemplateFormPatch(baseTemplate);
    // Renames: interestRatePct → interestRate, managementPct → mgmtPct,
    // insuranceMo → insuranceMonthly.
    expect(valueOf(patch, "interestRate")).toBe(6.25);
    expect(valueOf(patch, "mgmtPct")).toBe(10);
    expect(valueOf(patch, "insuranceMonthly")).toBeUndefined();
    expect(valueOf(patch, "insurancePct")).toBe(0.5);
    expect(valueOf(patch, "propertyTaxPct")).toBe(1.4);
    expect(valueOf(patch, "downPaymentPct")).toBe(25);
    expect(valueOf(patch, "depreciationYears")).toBe(27.5);
    expect(valueOf(patch, "taxRatePct")).toBe(32);
    // The patch never touches deal-identity fields.
    const fields = patch.map((e) => e.field);
    expect(fields).not.toContain("address");
    expect(fields).not.toContain("purchasePrice");
    expect(fields).not.toContain("monthlyRent");
    expect(fields).not.toContain("templateId");
  });

  it("clamps legacy expense percentages to the form's 50% ceiling", () => {
    const patch = buildTemplateFormPatch({
      ...baseTemplate,
      maintenancePct: 80,
      vacancyPct: 60,
      managementPct: 100,
      capexPct: 55,
    });
    expect(valueOf(patch, "maintenancePct")).toBe(50);
    expect(valueOf(patch, "vacancyPct")).toBe(50);
    expect(valueOf(patch, "mgmtPct")).toBe(50);
    expect(valueOf(patch, "capexPct")).toBe(50);
  });

  it("maps the 24% tax-rate DB sentinel back to undefined (use default bracket)", () => {
    const patch = buildTemplateFormPatch({ ...baseTemplate, taxRatePct: 24 });
    expect(valueOf(patch, "taxRatePct")).toBeUndefined();
  });

  it("maps monthly insurance mode with null percent to undefined values", () => {
    const patch = buildTemplateFormPatch({
      ...baseTemplate,
      insuranceInputMode: "monthly",
      insurancePct: null,
      insuranceMo: 120,
    });
    expect(valueOf(patch, "insuranceInputMode")).toBe("monthly");
    expect(valueOf(patch, "insurancePct")).toBeUndefined();
    expect(valueOf(patch, "insuranceMonthly")).toBe(120);
  });

  it("filters out skipFields so protected values are never overwritten", () => {
    const patch = buildTemplateFormPatch(baseTemplate, {
      skipFields: new Set(["interestRate", "propertyTaxPct"]),
    });
    const fields = patch.map((e) => e.field);
    expect(fields).not.toContain("interestRate");
    expect(fields).not.toContain("propertyTaxPct");
    // Everything else still applies.
    expect(fields).toContain("vacancyPct");
    expect(fields).toContain("downPaymentPct");
  });
});
