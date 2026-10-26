import { z } from "zod";
const optionalNumber = (max: number) => z.number().finite().min(0).max(max).nullable();
export const rentEvidenceInputSchema = z.object({
  savedDealId: z.string().uuid(), address: z.string().trim().min(1).max(300),
  sourceLabel: z.string().trim().min(1).max(200),
  sourceUrl: z.string().url().max(2000).refine(value => /^https?:\/\//.test(value), "Use an HTTP or HTTPS source link").nullable(),
  observedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0,10) === value && timestamp <= Date.now();
  }, "Use a valid observation date that is not in the future"),
  monthlyRent: z.number().finite().positive().max(1000000), bedrooms: optionalNumber(100), bathrooms: optionalNumber(100), sqft: z.number().positive().max(1000000).nullable(),
  monthlyAdjustment: z.number().finite().min(-1000000).max(1000000), adjustmentNotes: z.string().trim().max(2000),
}).strict().superRefine((value, context) => {
  if (value.monthlyRent + value.monthlyAdjustment <= 0) context.addIssue({ code: "custom", path: ["monthlyAdjustment"], message: "Adjusted rent must remain positive" });
  if (value.monthlyAdjustment !== 0 && !value.adjustmentNotes) context.addIssue({ code: "custom", path: ["adjustmentNotes"], message: "Explain the adjustment" });
});
export type RentEvidenceInput = z.infer<typeof rentEvidenceInputSchema>;
export type RentEvidence = RentEvidenceInput & { id: string; isArchived: boolean };
