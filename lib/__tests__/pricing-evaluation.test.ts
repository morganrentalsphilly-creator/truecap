import { describe, expect, it } from "vitest";
import { resolveProductAccessState } from "@/lib/product-access";
import {
  formatPricingEvaluationAllowance,
  summarizePricingEvaluation,
} from "@/lib/pricing-evaluation";

const NOW = new Date("2026-08-27T12:00:00.000Z");

function evaluationAccess(args: {
  expiresAt?: string;
  dealsUsed: number;
  comparisonsUsed: number;
}) {
  return resolveProductAccessState({
    isAuthenticated: true,
    now: NOW,
    evaluation: {
      startedAt: "2026-08-20T12:00:00.000Z",
      expiresAt: args.expiresAt ?? "2026-09-10T12:00:00.000Z",
      dealsUsed: args.dealsUsed,
      comparisonsUsed: args.comparisonsUsed,
    },
  });
}

describe("pricing evaluation truth", () => {
  it("reports exact remaining immutable-ledger allowances", () => {
    const summary = summarizePricingEvaluation(
      evaluationAccess({ dealsUsed: 1, comparisonsUsed: 0 }),
    );
    expect(summary).toEqual({
      status: "active",
      dealsRemaining: 2,
      comparisonsRemaining: 1,
    });
    expect(formatPricingEvaluationAllowance(summary)).toBe(
      "2 Pro deals + 1 comparison remaining",
    );
  });

  it("does not keep promising Pro deals after that allowance is exhausted", () => {
    const summary = summarizePricingEvaluation(
      evaluationAccess({ dealsUsed: 3, comparisonsUsed: 0 }),
    );
    expect(summary).toEqual({
      status: "active",
      dealsRemaining: 0,
      comparisonsRemaining: 1,
    });
    expect(formatPricingEvaluationAllowance(summary)).toBe(
      "1 comparison remaining",
    );
  });

  it("distinguishes fully exhausted and expired evaluations", () => {
    expect(
      summarizePricingEvaluation(
        evaluationAccess({ dealsUsed: 3, comparisonsUsed: 1 }),
      ).status,
    ).toBe("exhausted");
    expect(
      summarizePricingEvaluation(
        evaluationAccess({
          expiresAt: "2026-08-26T12:00:00.000Z",
          dealsUsed: 0,
          comparisonsUsed: 0,
        }),
      ).status,
    ).toBe("expired");
  });

  it("fails closed when the evaluation record could not be verified", () => {
    const summary = summarizePricingEvaluation(null);
    expect(summary.status).toBe("unavailable");
    expect(formatPricingEvaluationAllowance(summary)).toBeNull();
  });
});
