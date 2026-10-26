import { z } from "zod";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";

/** Explicit user assumptions, never a lender approval or a quoted offer. */
export const clientFinancingSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("deal") }).strict(),
  z.object({ kind: z.literal("cash") }).strict(),
  z.object({
    kind: z.literal("amortizing"),
    downPaymentPct: z.number().finite().min(0).max(99.99),
    interestRate: z.number().finite().min(0).max(30),
    loanTermYears: z.number().int().min(1).max(50),
    pmiAnnualRatePct: z.number().finite().min(0).max(5),
  }).strict(),
]);
export type ClientFinancing = z.infer<typeof clientFinancingSchema>;
export function readClientFinancing(value: unknown): ClientFinancing | null {
  if (value == null) return { kind: "deal" };
  const parsed = clientFinancingSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
export function applyClientFinancing(values: InvestmentFormValues, preference: ClientFinancing): InvestmentFormValues {
  if (preference.kind === "deal") return { ...values };
  return {
    ...values,
    financingMode: preference.kind === "cash" ? "cash" : "percent-down",
    fixedDownPaymentAmount: undefined, fixedLoanAmount: undefined,
    downPaymentPct: preference.kind === "cash" ? 100 : preference.downPaymentPct,
    interestRate: preference.kind === "cash" ? 0 : preference.interestRate,
    loanTermYears: preference.kind === "cash" ? values.loanTermYears : preference.loanTermYears,
    amortizationTermYears: preference.kind === "cash" ? undefined : preference.loanTermYears,
    ...(preference.kind === "cash" ? { loanFees: 0, loanPointsPct: 0, originationFee: 0, lenderEscrowDeposit: 0, lenderReserveDeposit: 0 } : {}),
    interestOnlyMonths: 0,
    pmiAnnualRatePct: preference.kind === "cash" ? 0 : preference.pmiAnnualRatePct,
    pmiNoCancel: false,
  };
}
export function describeClientFinancing(preference: ClientFinancing): string {
  if (preference.kind === "deal") return "Saved deal financing";
  if (preference.kind === "cash") return "Client assumption: cash purchase";
  return `Client assumptions: ${preference.downPaymentPct}% down, ${preference.interestRate}% interest, ${preference.loanTermYears}-year amortization, ${preference.pmiAnnualRatePct}% annual mortgage insurance`;
}
