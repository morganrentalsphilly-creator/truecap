import { z } from "zod";
import { boundedArray } from "@/lib/bounded-array";
import { releasedInvestmentFormSchema } from "@/lib/underwriting-model-release";
const number = z.number().finite().nullable();
export const clientDealScreenSchema = z.object({
  clientId: z.string(), clientName: z.string().max(120), buyBoxId: z.string().nullable(), buyBoxName: z.string().max(80).nullable(),
  status: z.enum(["meets", "misses", "needs-verification", "no-criteria"]),
  checks: boundedArray(z.array(z.object({ id: z.enum(["capRate", "coc", "dscr", "cashFlow", "irr", "cashRequired", "price", "propertyType", "state"]), label: z.string(), target: z.string(), actual: z.string(), pass: z.boolean().nullable(), gapText: z.string().optional() })), 20),
  offerCeiling: number, ceilingExplanation: z.string(), financingDescription: z.string(),
});
export const clientReportContextSchema = z.object({ screen: clientDealScreenSchema, methodologyVersion: z.string(), screenedAt: z.string().datetime() });
export type ClientReportContext = z.infer<typeof clientReportContextSchema>;
export const clientMatchSnapshotSchema = clientReportContextSchema.extend({
  version: z.literal(1), values: releasedInvestmentFormSchema,
  criteria: z.object({
    minCapRatePct: number, minCocPct: number, minDscr: number, minCashFlowMonthly: number,
    minIrrPct: number.optional(), maxCashRequired: number.optional(), maxPurchasePrice: number,
    propertyTypes: z.array(z.enum(["single-family", "multi-family", "owner-occupant"])),
    targetStates: z.array(z.string()), isActive: z.boolean(),
  }),
});
