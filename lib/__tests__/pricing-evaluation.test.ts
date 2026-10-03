import { describe, expect, it } from "vitest";
import { resolveProductAccessState } from "@/lib/product-access";
import {
  applyTrialUsage,
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
      "2 Pro analyses + 1 comparison remaining",
    );
  });

  it("uses the singular for one remaining analysis", () => {
    const summary = summarizePricingEvaluation(
      evaluationAccess({ dealsUsed: 2, comparisonsUsed: 1 }),
    );
    expect(formatPricingEvaluationAllowance(summary)).toBe(
      "1 Pro analysis remaining",
    );
  });

  it("does not keep promising Pro analyses after that allowance is exhausted", () => {
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

describe("trial strip follows a metered run", () => {
  const fresh = summarizePricingEvaluation(
    evaluationAccess({ dealsUsed: 0, comparisonsUsed: 0 }),
  );

  it("counts down from the usage the metering call returned", () => {
    expect(formatPricingEvaluationAllowance(fresh)).toBe(
      "3 Pro analyses + 1 comparison remaining",
    );
    const afterOne = applyTrialUsage(fresh, { dealsUsed: 1, comparisonsUsed: 0 });
    expect(formatPricingEvaluationAllowance(afterOne)).toBe(
      "2 Pro analyses + 1 comparison remaining",
    );
    const afterThree = applyTrialUsage(afterOne, {
      dealsUsed: 3,
      comparisonsUsed: 0,
    });
    expect(formatPricingEvaluationAllowance(afterThree)).toBe(
      "1 comparison remaining",
    );
    expect(
      applyTrialUsage(afterThree, { dealsUsed: 3, comparisonsUsed: 1 }).status,
    ).toBe("exhausted");
  });

  it("never restores allowance from a stale or malformed announcement", () => {
    const afterTwo = applyTrialUsage(fresh, { dealsUsed: 2, comparisonsUsed: 0 });
    expect(applyTrialUsage(afterTwo, { dealsUsed: 1, comparisonsUsed: 0 })).toEqual(
      afterTwo,
    );
    expect(applyTrialUsage(afterTwo, { dealsUsed: null, comparisonsUsed: null })).toEqual(
      afterTwo,
    );
    expect(applyTrialUsage(afterTwo, undefined)).toEqual(afterTwo);
    expect(
      applyTrialUsage(afterTwo, { dealsUsed: Number.NaN, comparisonsUsed: 99 }),
    ).toEqual({ status: "active", dealsRemaining: 1, comparisonsRemaining: 0 });
  });

  it("leaves a summary that is not an active trial alone", () => {
    const unavailable = summarizePricingEvaluation(null);
    expect(applyTrialUsage(unavailable, { dealsUsed: 1, comparisonsUsed: 0 })).toBe(
      unavailable,
    );
  });
});
