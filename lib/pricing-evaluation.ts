import type { ProductAccessState } from "@/lib/product-access";

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
      `${evaluation.dealsRemaining} Pro deal${evaluation.dealsRemaining === 1 ? "" : "s"}`,
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
