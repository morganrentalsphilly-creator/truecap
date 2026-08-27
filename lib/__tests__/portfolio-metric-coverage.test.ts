import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { PortfolioRollupStrip } from "@/components/dashboard/portfolio-rollup-strip";
import type { SavedAnalysisListItem } from "@/components/investcalc/saved-analyses-page-v2";
import {
  hasCompleteMetricCoverage,
  summarizeKnownMetric,
} from "@/lib/portfolio-metric-coverage";

describe("portfolio metric coverage", () => {
  it("keeps a missing deal out of the total and reports one-of-two coverage", () => {
    const summary = summarizeKnownMetric([125, null]);

    expect(summary).toEqual({
      total: 125,
      knownCount: 1,
      totalCount: 2,
    });
    expect(hasCompleteMetricCoverage(summary)).toBe(false);
  });

  it("treats zero as a known value and rejects non-finite values", () => {
    const summary = summarizeKnownMetric([0, Number.NaN, Number.POSITIVE_INFINITY]);

    expect(summary).toEqual({
      total: 0,
      knownCount: 1,
      totalCount: 3,
    });
  });

  it("labels a two-deal My Deals rollup when only one row has metrics", () => {
    const items = [
      {
        netCashFlowMonthly: 125,
        purchasePrice: 200_000,
        capRatePct: 6,
        cocReturnPct: 8,
        cashToClose: 50_000,
      },
      {
        netCashFlowMonthly: null,
        purchasePrice: null,
        capRatePct: null,
        cocReturnPct: null,
        cashToClose: null,
      },
    ] as SavedAnalysisListItem[];

    const html = renderToStaticMarkup(
      createElement(PortfolioRollupStrip, { items, scope: "active" }),
    );

    expect(html).toContain("Known across 1 of 2");
    expect(html).toContain("1 of 2 with data");
  });

  it("never calls a partially known dashboard book cash-flow positive", () => {
    const dashboard = readFileSync(
      join(process.cwd(), "components/dashboard/DashboardHome.tsx"),
      "utf8",
    );

    expect(dashboard).toContain("cashFlowCoverageComplete");
    expect(dashboard).toContain("Cash flow known for");
    expect(dashboard).toContain("Review missing data");
    expect(dashboard).toContain("with cash-flow data");
  });
});
