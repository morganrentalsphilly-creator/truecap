import {
  PRODUCT_EVALUATION_COMPARISON_LIMIT,
  PRODUCT_EVALUATION_DEAL_LIMIT,
  type ProductAccessState,
} from "@/lib/product-access";

export type PricingEvaluationSummary = {
  status: "active" | "exhausted" | "expired" | "unavailable";
  dealsRemaining: number;
  comparisonsRemaining: number;
};

function remainingCount(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

/**
 * Reduce the full access policy to the small, serializable state pricing copy
 * needs. Missing/failed reads are deliberately unavailable, never "eligible":
 * a marketing surface must not promise allowances the server cannot verify.
 */
export function summarizePricingEvaluation(
  access: ProductAccessState | null,
): PricingEvaluationSummary {
  const dealsRemaining = remainingCount(access?.dealsRemaining);
  const comparisonsRemaining = remainingCount(access?.comparisonsRemaining);

  if (access?.kind === "evaluation") {
    return {
      status:
        dealsRemaining === 0 && comparisonsRemaining === 0
          ? "exhausted"
          : "active",
      dealsRemaining,
      comparisonsRemaining,
    };
  }

  return {
    status: access?.kind === "evaluation_expired" ? "expired" : "unavailable",
    dealsRemaining,
    comparisonsRemaining,
  };
}

export function formatPricingEvaluationAllowance(
  evaluation: PricingEvaluationSummary,
): string | null {
  if (evaluation.status !== "active") return null;

  const allowances: string[] = [];
  if (evaluation.dealsRemaining > 0) {
    allowances.push(
      `${evaluation.dealsRemaining} Pro ${evaluation.dealsRemaining === 1 ? "analysis" : "analyses"}`,
    );
  }
  if (evaluation.comparisonsRemaining > 0) {
    allowances.push(
      `${evaluation.comparisonsRemaining} comparison${
        evaluation.comparisonsRemaining === 1 ? "" : "s"
      }`,
    );
  }
  return allowances.length > 0 ? `${allowances.join(" + ")} remaining` : null;
}

/**
 * The analyzer announces each newly metered trial run with this browser event
 * so the trial strip can show the new count. The counts come from the result
 * of the one metering call the run already made: announcing them makes no
 * request, so the strip can never cause a second metered call.
 */
export const TRIAL_USAGE_EVENT = "truecap:trial-usage";

export type TrialUsageDetail = {
  dealsUsed: number | null;
  comparisonsUsed: number | null;
};

export function announceTrialUsage(detail: TrialUsageDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TRIAL_USAGE_EVENT, { detail }));
}

/**
 * Fold a usage announcement into the summary the strip is showing. A count
 * never goes back up: a stale or malformed announcement cannot restore
 * allowance the server already debited.
 */
export function applyTrialUsage(
  current: PricingEvaluationSummary,
  detail: Partial<TrialUsageDetail> | null | undefined,
): PricingEvaluationSummary {
  if (current.status !== "active") return current;
  const remainingAfter = (
    used: number | null | undefined,
    limit: number,
    shown: number,
  ) =>
    typeof used === "number" && Number.isFinite(used)
      ? Math.min(shown, Math.max(0, limit - Math.floor(used)))
      : shown;
  const dealsRemaining = remainingAfter(
    detail?.dealsUsed,
    PRODUCT_EVALUATION_DEAL_LIMIT,
    current.dealsRemaining,
  );
  const comparisonsRemaining = remainingAfter(
    detail?.comparisonsUsed,
    PRODUCT_EVALUATION_COMPARISON_LIMIT,
    current.comparisonsRemaining,
  );
  return {
    status:
      dealsRemaining === 0 && comparisonsRemaining === 0 ? "exhausted" : "active",
    dealsRemaining,
    comparisonsRemaining,
  };
}
