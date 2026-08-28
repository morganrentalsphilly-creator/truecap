import "server-only";

import { createHash } from "node:crypto";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import { isValidRentalUnit } from "@/lib/investcalc-schema";
import { releasedInvestmentFormSchema } from "@/lib/underwriting-model-release";

export type EvaluationUsageKind = "deal" | "comparison";

/**
 * Stable, non-PII identifier used for evaluation metering and exact-resource
 * authorization. Because the PDF gate compares this digest with the immutable
 * usage ledger, collision resistance is part of the authorization contract;
 * a short checksum is not sufficient here.
 */
export function buildEvaluationResourceKey(
  kind: EvaluationUsageKind,
  canonicalPayload: string
): string {
  const digest = createHash("sha256")
    .update(kind, "utf8")
    .update("\0", "utf8")
    .update(canonicalPayload, "utf8")
    .digest("hex");
  return `${kind}:${digest}`;
}

/**
 * Build the exact deal key shared by client metering and server-side report
 * authorization. Invalid/unsupported snapshots return null rather than
 * producing a key for a payload the released engine would not accept.
 */
export function buildEvaluationDealResourceKey(
  values: InvestmentFormValues,
): string | null {
  const units = (values.units ?? []).filter((unit) =>
    isValidRentalUnit(unit, {
      allowZeroRent:
        values.propertyType === "owner-occupant" && !!unit.isOwnerOccupied,
    }),
  );
  const parsed = releasedInvestmentFormSchema.safeParse({ ...values, units });
  return parsed.success
    ? buildEvaluationResourceKey("deal", JSON.stringify(parsed.data))
    : null;
}

/** Canonical key for one comparison, independent of deal order/retries. */
export function buildEvaluationComparisonResourceKey(
  dealIds: readonly string[],
): string | null {
  const ids = [...new Set(dealIds.map((id) => id.trim()).filter(Boolean))].sort();
  if (ids.length < 2) return null;
  return buildEvaluationResourceKey("comparison", JSON.stringify(ids));
}
