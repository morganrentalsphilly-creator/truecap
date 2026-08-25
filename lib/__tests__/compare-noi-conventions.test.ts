import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  buildCanonicalMonthlyNoiMetrics,
  METRIC_ROWS,
} from "@/lib/compare-metrics";

function read(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

function functionSource(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  if (startIndex < 0 || endIndex < 0) {
    throw new Error(`Could not isolate ${start}`);
  }
  return source.slice(startIndex, endIndex);
}

describe("Compare NOI conventions", () => {
  it("converts the canonical annual NOI fields without deriving NOI from the cash-outflow bridge", () => {
    expect(
      buildCanonicalMonthlyNoiMetrics({
        noiAnnual: 24_000,
        operatingExpensesAnnual: 12_000,
      })
    ).toEqual({
      noiMonthly: 2_000,
      operatingExpensesMonthly: 1_000,
    });
    expect(
      buildCanonicalMonthlyNoiMetrics({
        noiAnnual: null,
        operatingExpensesAnnual: Number.NaN,
      })
    ).toEqual({
      noiMonthly: null,
      operatingExpensesMonthly: null,
    });
  });

  it("uses canonical NOI operating expenses as the comparison metric", () => {
    expect(
      METRIC_ROWS.find((row) => row.key === "operatingExpensesMonthly")
    ).toMatchObject({
      label: "Operating Expenses / mo (NOI)",
      direction: "lower",
    });
    expect(
      METRIC_ROWS.find((row) => row.key === "totalOperatingExpenses")
    ).toBeUndefined();
  });

  it("renders DSCR from recorded NOI and labels the full cash-flow bridge honestly", () => {
    const comparison = read("../../components/investcalc/compare-deals-client.tsx");
    const dscrTooltip = functionSource(
      comparison,
      "function DscrTooltip",
      "type LongTermMetricKind"
    );
    const cashFlowTooltip = functionSource(
      comparison,
      "function NetCashFlowTooltip",
      "/**\n * Cash-purchase detection"
    );
    const page = read("../../app/dashboard/compare/page.tsx");

    expect(dscrTooltip).toContain("deal.metrics.noiMonthly");
    expect(dscrTooltip).toContain("deal.metrics.operatingExpensesMonthly");
    expect(dscrTooltip).not.toContain("deal.metrics.monthlyRentalIncome");
    expect(dscrTooltip).not.toContain("deal.metrics.totalOperatingExpenses");
    expect(dscrTooltip).not.toContain("rent - opex");
    expect(dscrTooltip).toContain("Model DSCR (debt service coverage)");

    expect(cashFlowTooltip).toContain(
      "Vacancy, operating costs &amp; CapEx reserve"
    );
    expect(page).toContain("resolvedCurrent.analysisResult.noiAnnual");
    expect(page).toContain("resolvedCurrent.analysisResult.operatingExpensesAnnual");
    expect(page).toContain("toNumber(snapshot.noiAnnual)");
    expect(page).toContain("toNumber(snapshot.operatingExpensesAnnual)");
  });
});
