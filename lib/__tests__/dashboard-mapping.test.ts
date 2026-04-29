import { describe, expect, it } from "vitest";
import { buildDashboardDeal } from "../dashboard-deal-mapping";

describe("buildDashboardDeal", () => {
  it("parses numeric strings and risk_level alias", () => {
    const deal = buildDashboardDeal({
      id: "deal-1",
      address: "123 Main St",
      title: null,
      property_type: "single-family",
      purchase_price: "500000",
      net_cash_flow_monthly: "1100",
      coc_return_pct: "8.4",
      created_at: "2026-04-01T00:00:00.000Z",
      result_snapshot: {
        netCashFlow: "1200",
        annual_cash_flow: "14400",
        capRate: "6.8",
        dscr: "1.32",
        score: "84",
        risk_level: "High Risk",
        risk_score: "73",
        compareSnapshot: {
          longTermSummary: {
            totalROI: "287.5",
          },
        },
        tags: ["backend-tagged"],
      },
    });

    expect(deal.purchasePrice).toBe(500000);
    expect(deal.cashFlowMonthly).toBe(1200);
    expect(deal.annualCashFlow).toBe(14400);
    expect(deal.roiPct).toBe(287.5);
    expect(deal.riskLevel).toBe("High Risk");
    expect(deal.riskScore).toBe(73);
  });

  it("supports compare_snapshot snake_case fallback", () => {
    const deal = buildDashboardDeal({
      id: "deal-2",
      address: null,
      title: "Fallback Address",
      property_type: "multi-family",
      purchase_price: 350000,
      net_cash_flow_monthly: 900,
      coc_return_pct: 7.3,
      created_at: "2026-04-01T00:00:00.000Z",
      result_snapshot: {
        compare_snapshot: {
          long_term_summary: {
            total_roi: "199.1",
          },
        },
        tags: ["risky"],
      },
    });

    expect(deal.address).toBe("Fallback Address");
    expect(deal.roiPct).toBe(199.1);
  });
});
