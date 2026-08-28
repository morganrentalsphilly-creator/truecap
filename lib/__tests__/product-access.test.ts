import { describe, expect, it } from "vitest";
import {
  PRODUCT_EVALUATION_COMPARISON_LIMIT,
  PRODUCT_EVALUATION_DEAL_LIMIT,
  PRODUCT_EVALUATION_DAYS,
  resolveProductAccessState,
} from "@/lib/product-access";

const NOW = new Date("2026-08-27T12:00:00.000Z");
const ACTIVE_EVALUATION = {
  startedAt: "2026-08-20T12:00:00.000Z",
  expiresAt: "2026-09-10T12:00:00.000Z",
  dealsUsed: 0,
  comparisonsUsed: 0,
};

describe("product access transitions", () => {
  it("locks the no-card evaluation policy", () => {
    expect(PRODUCT_EVALUATION_DAYS).toBe(21);
    expect(PRODUCT_EVALUATION_DEAL_LIMIT).toBe(3);
    expect(PRODUCT_EVALUATION_COMPARISON_LIMIT).toBe(1);
  });

  it("gives an anonymous visitor one complete first decision without a card", () => {
    expect(resolveProductAccessState({ isAuthenticated: false, now: NOW })).toMatchObject({
      kind: "anonymous_first_decision",
      canAnalyzeDecision: true,
      canAnalyzeProDeal: true,
      canRunComparison: false,
      canExportDecisionPack: true,
      dealsRemaining: 1,
    });
  });

  it("starts a signed-in evaluation with three deals and one comparison", () => {
    expect(
      resolveProductAccessState({
        isAuthenticated: true,
        now: NOW,
        evaluation: ACTIVE_EVALUATION,
      })
    ).toMatchObject({
      kind: "evaluation",
      canAnalyzeProDeal: true,
      canRunComparison: true,
      canExportDecisionPack: true,
      dealsRemaining: 3,
      comparisonsRemaining: 1,
    });
  });

  it("keeps the one comparison available after all three deal runs are used", () => {
    expect(
      resolveProductAccessState({
        isAuthenticated: true,
        now: NOW,
        evaluation: { ...ACTIVE_EVALUATION, dealsUsed: 3 },
      })
    ).toMatchObject({
      kind: "evaluation",
      canAnalyzeProDeal: false,
      canRunComparison: true,
      canExportDecisionPack: true,
      dealsRemaining: 0,
    });
  });

  it("keeps metered-deal exports available after both run allowances are used", () => {
    expect(
      resolveProductAccessState({
        isAuthenticated: true,
        now: NOW,
        evaluation: {
          ...ACTIVE_EVALUATION,
          dealsUsed: 3,
          comparisonsUsed: 1,
        },
      }),
    ).toMatchObject({
      kind: "evaluation",
      canAnalyzeProDeal: false,
      canRunComparison: false,
      canExportDecisionPack: true,
    });
  });

  it("expires on time even when usage remains", () => {
    expect(
      resolveProductAccessState({
        isAuthenticated: true,
        now: NOW,
        evaluation: { ...ACTIVE_EVALUATION, expiresAt: NOW },
      })
    ).toMatchObject({
      kind: "evaluation_expired",
      canAnalyzeProDeal: false,
      canRunComparison: false,
    });
  });

  it.each([
    ["pro_monthly", "investor_pro_monthly"],
    ["pro_annual", "investor_pro_annual"],
    ["agent_pro_monthly", "agent_pro_monthly"],
    ["agent_pro_annual", "agent_pro_annual"],
  ])("resolves live %s access", (planSlug, kind) => {
    expect(
      resolveProductAccessState({
        isAuthenticated: true,
        now: NOW,
        subscription: { planSlug, status: "active" },
      })
    ).toMatchObject({
      kind,
      hasPaidAccess: true,
      hasAgentAccess: planSlug.startsWith("agent_pro"),
      canAnalyzeProDeal: true,
      canRunComparison: true,
    });
  });

  it("preserves paid access through a scheduled cancellation period", () => {
    expect(
      resolveProductAccessState({
        isAuthenticated: true,
        now: NOW,
        subscription: {
          planSlug: "pro_monthly",
          status: "active",
          cancelAtPeriodEnd: true,
          currentPeriodEnd: "2026-09-01T00:00:00.000Z",
        },
      })
    ).toMatchObject({ kind: "paid_access_ending", hasPaidAccess: true });
  });

  it("does not treat a terminated subscription as live access", () => {
    expect(
      resolveProductAccessState({
        isAuthenticated: true,
        now: NOW,
        subscription: { planSlug: "pro_monthly", status: "canceled" },
        hasSubscriptionHistory: true,
      })
    ).toMatchObject({ kind: "returning_free", hasPaidAccess: false });
  });

  it("limits a Decision Pack buyer to the purchased resource", () => {
    expect(
      resolveProductAccessState({
        isAuthenticated: true,
        now: NOW,
        decisionPack: { resourceKey: "analysis_123" },
      })
    ).toMatchObject({
      kind: "decision_pack",
      canAnalyzeProDeal: false,
      canExportDecisionPack: true,
      decisionPackResourceKey: "analysis_123",
    });
  });
});
