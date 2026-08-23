import { z } from "zod";

export const templateTypeSchema = z.enum(["conservative", "balanced", "aggressive"]);
export const TEMPLATE_DESCRIPTION_MAX_LENGTH = 40;

export const analysisTemplateSchema = z.object({
  templateName: z
    .string()
    .trim()
    .min(2, "Template name must be at least 2 characters")
    .max(100, "Template name is too long"),
  templateDescription: z
    .string()
    .trim()
    .max(
      TEMPLATE_DESCRIPTION_MAX_LENGTH,
      `Description must be ${TEMPLATE_DESCRIPTION_MAX_LENGTH} characters or fewer`
    )
    .optional(),
  propertyTaxPct: z.number().gt(0, "Must be greater than 0").max(100, "Max 100%"),
  insuranceInputMode: z.enum(["percent", "monthly"]),
  insurancePct: z.number().gt(0, "Must be greater than 0").max(100, "Max 100%").optional(),
  insuranceMo: z.number().gt(0, "Must be greater than 0").max(1_000_000, "Amount too large").optional(),
  // Capped at 50% to match the analyzer form's expense-% ceiling
  // (lib/investcalc-schema.ts). A template above the form's max would
  // save fine but fail validation the moment it's applied to the form.
  maintenancePct: z.number().gt(0, "Must be greater than 0").max(50, "Max 50%"),
  // 0% is allowed: short-term rentals model vacancy via the occupancy input
  // (revenue = ADR × occupancy), so their operating-expense vacancy is 0.
  vacancyPct: z.number().min(0, "Must be 0% or more").max(50, "Max 50%"),
  managementPct: z.number().gt(0, "Must be greater than 0").max(50, "Max 50%"),
  capexPct: z.number().gt(0, "Must be greater than 0").max(50, "Max 50%"),
  closingCostsPct: z.number().gt(0, "Must be greater than 0").max(100, "Max 100%").optional(),
  interestRatePct: z.number().gt(0, "Must be greater than 0").max(100, "Max 100%"),
  downPaymentPct: z.number().gt(0, "Must be greater than 0").max(100, "Max 100%"),
  /** Optional PMI/MIP annual rate (% of loan). 0 disables; omitted uses the
   *  calc default on sub-20%-down deals. */
  pmiAnnualRatePct: z.number().min(0, "Must be 0 or more").max(5, "Max 5%").optional(),
  /** Optional; true = mortgage insurance never cancels (FHA MIP for life). */
  pmiNoCancel: z.boolean().optional(),
  expenseGrowthPct: z.number().gt(0, "Must be greater than 0").max(100, "Max 100%"),
  rentGrowthPct: z.number().gt(0, "Must be greater than 0").max(100, "Max 100%"),
  /** Optional; defaults to 3% annual appreciation when saving if omitted. */
  appreciationRatePct: z.number().min(0, "Must be 0 or more").max(100, "Max 100%").optional(),
  /** Optional; defaults to 6% selling cost when saving if omitted. */
  sellingCostPct: z.number().min(0, "Must be 0 or more").max(100, "Max 100%").optional(),
  buildingValuePct: z.number().gt(0, "Must be greater than 0").max(100, "Max 100%"),
  depreciationYears: z.union([z.literal(27.5), z.literal(39)]),
  includeInterestDeduction: z.boolean().optional(),
  taxRatePct: z.number().gt(0, "Must be greater than 0").max(100, "Max 100%").optional(),
  /** Optional acquisition-criteria thresholds the template targets. Each
   *  field is optional — a template can carry none, some, or all. */
  buyBox: z
    .object({
      minCapRatePct: z.number().min(0).max(100).nullish(),
      minCocPct: z.number().min(0).max(1000).nullish(),
      minDscr: z.number().min(0).max(100).nullish(),
      minCashFlowMonthly: z.number().min(-1_000_000).max(1_000_000).nullish(),
      maxPurchasePrice: z.number().min(0).max(1_000_000_000).nullish(),
    })
    .nullish(),
}).superRefine((values, ctx) => {
  if (values.insuranceInputMode === "percent" && values.insurancePct == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["insurancePct"],
      message: "Enter annual insurance percent",
    });
  }

  if (values.insuranceInputMode === "monthly" && values.insuranceMo == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["insuranceMo"],
      message: "Enter monthly insurance cost",
    });
  }

  if (values.insuranceInputMode === "percent" && values.insurancePct != null && values.insurancePct <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["insurancePct"],
      message: "Insurance percent must be greater than 0",
    });
  }

  if (values.insuranceInputMode === "monthly" && values.insuranceMo != null && values.insuranceMo <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["insuranceMo"],
      message: "Monthly insurance must be greater than 0",
    });
  }
});

export type AnalysisTemplateInput = z.infer<typeof analysisTemplateSchema>;
export type AnalysisTemplateBuyBox = NonNullable<AnalysisTemplateInput["buyBox"]>;
