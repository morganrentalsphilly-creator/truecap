import { describe, expect, it } from "vitest";
import type { DashboardDeal } from "../dashboard-deal-mapping";
import { getChartInclusionReason, getTaggedDealRiskLabel, mapRiskLevelToRisk, resolveRiskMetric } from "../dashboard-risk-return";

function makeDeal(overrides: Partial<DashboardDeal> = {}): DashboardDeal {
  return {
    id: "deal-x",
    address: "Test Property",
    propertyType: "single-family",
    propertyTypeLabel: "Single Family",
    purchasePrice: 400000,
    cashFlowMonthly: 1000,
    annualCashFlow: null,
    cocReturnPct: 9,
    capRatePct: 6,
    dscr: null,
    roiPct: null,
    monthlyPayment: null,
    score: 80,
    recommendation: "Buy",
    riskLevel: null,
    riskScore: null,
    tags: [],
    ...overrides,
  };
}

describe("dashboard risk return selection", () => {
  it("includes tagged deal in chart when it has risk and return", () => {
    const deal = makeDeal({
      tags: ["backend-tagged"],
      roiPct: 225.4,
      riskLevel: "High Risk",
    });
    const status = getChartInclusionReason(deal);
    expect(status.include).toBe(true);
    expect(status.returnMetric.value).toBe(225.4);
    expect(status.riskMetric.value).toBe(1.2);
  });

  it("maps riskLevel-only deal to risk axis", () => {
    const deal = makeDeal({
      tags: ["backend-tagged"],
      riskLevel: "Moderate",
    });
    expect(resolveRiskMetric(deal).value).toBe(1);
    expect(mapRiskLevelToRisk("Moderate")).toBe(1);
  });

  it("excludes tagged deal with no risk and no return", () => {
    const deal = makeDeal({
      tags: ["backend-tagged"],
      annualCashFlow: null,
      roiPct: null,
      dscr: null,
      riskLevel: null,
      riskScore: null,
    });
    const status = getChartInclusionReason(deal);
    expect(status.include).toBe(false);
    expect(status.reason).toBe("missing_both_axes");
    expect(getTaggedDealRiskLabel(deal)).toBe("No backend risk metric");
  });
});
