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
  propertyTaxPct: z.number().min(0, "Must be 0 or more").max(100, "Max 100%"),
  insuranceInputMode: z.enum(["percent", "monthly"]),
  insurancePct: z.number().min(0, "Must be 0 or more").max(100, "Max 100%").optional(),
  insuranceMo: z.number().min(0, "Must be 0 or more").max(1_000_000, "Amount too large").optional(),
  maintenancePct: z.number().min(0, "Must be 0 or more").max(100, "Max 100%"),
  vacancyPct: z.number().min(0, "Must be 0 or more").max(100, "Max 100%"),
  managementPct: z.number().min(0, "Must be 0 or more").max(100, "Max 100%"),
  capexPct: z.number().min(0, "Must be 0 or more").max(100, "Max 100%"),
  closingCostsPct: z.number().min(0, "Must be 0 or more").max(100, "Max 100%").optional(),
  interestRatePct: z.number().min(0, "Must be 0 or more").max(100, "Max 100%"),
  downPaymentPct: z.number().min(0, "Must be 0 or more").max(100, "Max 100%"),
  expenseGrowthPct: z.number().min(0, "Must be 0 or more").max(100, "Max 100%"),
  rentGrowthPct: z.number().min(0, "Must be 0 or more").max(100, "Max 100%"),
  /** Optional; defaults to 3% annual appreciation when saving if omitted. */
  appreciationRatePct: z.number().min(0, "Must be 0 or more").max(100, "Max 100%").optional(),
  /** Optional; defaults to 6% selling cost when saving if omitted. */
  sellingCostPct: z.number().min(0, "Must be 0 or more").max(100, "Max 100%").optional(),
  buildingValuePct: z.number().min(0, "Must be 0 or more").max(100, "Max 100%"),
  depreciationYears: z.union([z.literal(27.5), z.literal(39)]),
  includeInterestDeduction: z.boolean().optional(),
  taxRatePct: z.number().min(0, "Must be 0 or more").max(100, "Max 100%").optional(),
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
});

export type AnalysisTemplateInput = z.infer<typeof analysisTemplateSchema>;

export const TEMPLATE_TYPE_META: Record<
  z.infer<typeof templateTypeSchema>,
  { label: string; description: string }
> = {
  conservative: { label: "Conservative", description: "Lower risk profile" },
  balanced: { label: "Balanced", description: "Normal profile" },
  aggressive: { label: "Aggressive", description: "Higher risk and return profile" },
};
