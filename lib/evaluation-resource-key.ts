import "server-only";

import { createHash } from "node:crypto";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import { isValidRentalUnit } from "@/lib/investcalc-schema";
import { releasedInvestmentFormSchema } from "@/lib/underwriting-model-release";
import {
  DEFAULT_APPRECIATION_RATE,
  DEFAULT_SELLING_COST_PCT,
} from "@/lib/exit-scenarios";

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
  const parsed = releasedInvestmentFormSchema.safeParse({
    ...values,
    units,
    // Canonicalize the two fields that differ between the LIVE form and a
    // SAVED-then-reopened one. Both are optional and default to `undefined` in
    // the analyzer, and JSON.stringify DROPS undefined-valued keys — so
    // metering hashed a payload where they were absent. saveDealAction persists
    // them with these same defaults and normalizeInvestmentFormSnapshot
    // re-injects them on every read, so every later authorization hashed a
    // payload that CONTAINED them and matched no ledger row.
    //
    // Result before this: a no-card evaluation user who never opened Advanced
    // options silently lost their metered Pro access the moment they reopened
    // the deal, and re-running to get it back burned another of their three.
    // Measured: metered deal:1ceee9b7..., after reopen deal:2794a470....
    //
    // Injected HERE rather than at the call sites because producer and consumer
    // both route through this function, so they cannot drift apart again.
    appreciationRatePct: values.appreciationRatePct ?? DEFAULT_APPRECIATION_RATE,
    sellingCostPct: values.sellingCostPct ?? DEFAULT_SELLING_COST_PCT,
  });
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
