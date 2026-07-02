import type { InvestmentFormValues } from "@/lib/investcalc-schema";

/**
 * Assumption fields an analysis template carries, in the shape the
 * templates action returns (AnalysisTemplateOption satisfies this
 * structurally — kept as a local subset so this pure module never
 * imports from a "use server" file at runtime and stays unit-testable).
 */
export type TemplateAssumptionSource = {
  propertyTaxPct: number;
  insuranceInputMode: "percent" | "monthly";
  insurancePct: number | null;
  insuranceMo: number | null;
  maintenancePct: number;
  vacancyPct: number;
  managementPct: number;
  capexPct: number;
  closingCostsPct: number;
  interestRatePct: number;
  downPaymentPct: number;
  expenseGrowthPct: number;
  rentGrowthPct: number;
  appreciationRatePct: number;
  sellingCostPct: number;
  buildingValuePct: number;
  depreciationYears: 27.5 | 39;
  includeInterestDeduction: boolean;
  taxRatePct: number;
};

export type TemplateFormPatchEntry = {
  field: keyof InvestmentFormValues;
  value: InvestmentFormValues[keyof InvestmentFormValues];
};

/**
 * Map a template's assumption set onto the analyzer form's field shape.
 * Single source of truth for the template → form translation (used by the
 * explicit template picker AND the default-template auto-apply), so the two
 * paths can never drift. Handles the naming mismatches (interestRatePct →
 * interestRate, insuranceMo → insuranceMonthly) and the legacy quirks:
 *
 * - The four expense %s clamp to the analyzer form's 50% ceiling. New
 *   templates are already capped at 50 (analysis-template-schema.ts), but a
 *   legacy template saved under the old 100% cap would otherwise push the
 *   form past its max and surface a "Max 50%" error on a field the user
 *   never touched.
 * - taxRatePct 24 is the DB default sentinel — the form models "use the
 *   default bracket" as undefined, so 24 maps back to undefined.
 *
 * `skipFields` lets callers protect fields that must not be overwritten
 * (user-edited values, address-enrichment fills).
 */
export function buildTemplateFormPatch(
  template: TemplateAssumptionSource,
  opts?: { skipFields?: ReadonlySet<keyof InvestmentFormValues> }
): TemplateFormPatchEntry[] {
  const entries: TemplateFormPatchEntry[] = [
    { field: "propertyTaxPct", value: template.propertyTaxPct },
    { field: "insuranceInputMode", value: template.insuranceInputMode },
    { field: "insurancePct", value: template.insurancePct ?? undefined },
    { field: "insuranceMonthly", value: template.insuranceMo ?? undefined },
    { field: "maintenancePct", value: Math.min(template.maintenancePct, 50) },
    { field: "vacancyPct", value: Math.min(template.vacancyPct, 50) },
    { field: "mgmtPct", value: Math.min(template.managementPct, 50) },
    { field: "capexPct", value: Math.min(template.capexPct, 50) },
    { field: "closingCostsPct", value: template.closingCostsPct },
    { field: "interestRate", value: template.interestRatePct },
    { field: "downPaymentPct", value: template.downPaymentPct },
    { field: "expenseGrowthPct", value: template.expenseGrowthPct },
    { field: "rentGrowthPct", value: template.rentGrowthPct },
    { field: "appreciationRatePct", value: template.appreciationRatePct },
    { field: "sellingCostPct", value: template.sellingCostPct },
    { field: "buildingValuePct", value: template.buildingValuePct },
    { field: "depreciationYears", value: template.depreciationYears },
    { field: "includeInterestDeduction", value: template.includeInterestDeduction },
    { field: "taxRatePct", value: template.taxRatePct === 24 ? undefined : template.taxRatePct },
  ];
  const skip = opts?.skipFields;
  return skip ? entries.filter((entry) => !skip.has(entry.field)) : entries;
}
