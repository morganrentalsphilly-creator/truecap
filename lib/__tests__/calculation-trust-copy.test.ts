import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { METRIC_ROWS, getBestValue } from "@/lib/compare-metrics";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("calculation trust copy and applicability guards", () => {
  it("uses signed illustrative-tax language on every analysis surface", () => {
    const main = read("components/investcalc/metrics-band.tsx");
    const shared = read("components/investcalc/read-only-analysis-view.tsx");
    const compare = read("components/investcalc/compare-deals-client.tsx");
    const projection = read(
      "components/investcalc/ten-year-projections/summary-cards.tsx"
    );

    expect(main).toContain('sourcedLabel("Illustrative Tax Effect", "base")');
    expect(main).toContain("estimated benefit");
    expect(main).toContain("estimated liability");
    expect(shared).toContain('label="Illustrative Tax Effect"');
    expect(shared).toContain("Estimated liability / month");
    expect(compare).toContain("signed illustrative tax effect");
    expect(compare).toContain("benefit or liability");
    expect(projection).toContain("signed illustrative tax effect");
    expect(projection).toContain("Actual treatment and loss usability vary");
  });

  it("does not claim cash-flow growth comes from rent outpacing expenses", () => {
    const dashboard = read("components/investcalc/analysis-dashboard.tsx");
    expect(dashboard).toContain(
      "under your entered rent, expense, and financing assumptions"
    );
    expect(dashboard).not.toContain("as rent grows faster than expenses");
  });

  it("labels projection financing outflow to include modeled mortgage insurance", () => {
    const projectionTable = read(
      "components/investcalc/ten-year-projections/table.tsx"
    );
    const projectionCharts = read(
      "components/investcalc/ten-year-projections/charts.tsx"
    );
    const pdf = read("lib/pdf-generator.ts");

    expect(projectionTable).toContain(
      "Annual Financing Outflow (P&I + Mortgage Insurance)"
    );
    expect(projectionTable).not.toContain(
      "Annual Debt Service (Principal & Interest)"
    );
    expect(projectionCharts).toContain("Financing Outflow (P&I + MI)");
    expect(pdf).toContain('label: "P&I + MI"');
    expect(pdf).toContain('"Op. Expenses", "P&I + MI", "Net CF"');
  });

  it("keeps Screening Index cash-flow language pre-tax and never promises a tax rescue", () => {
    const engine = read("lib/deal-score.ts");
    const hero = read("components/investcalc/answer-hero-card.tsx");
    const breakdown = read("components/investcalc/score-breakdown.tsx");

    expect(engine).toContain("illustrative tax estimate can never rescue a score");
    expect(hero).toContain("non-negative pre-tax operating cash flow");
    expect(breakdown).toContain("non-negative");
    expect(breakdown).toContain("pre-tax operating cash flow");
    expect(hero).toContain("requires monthly owner funding");
    expect(hero).not.toContain("relies on appreciation + tax");
    expect(hero).not.toContain("non-negative after-tax cash flow");
    expect(breakdown).not.toContain("non-negative after-tax cash flow");
  });

  it("does not rank a zero-denominator CoC sentinel as a real return", () => {
    const cocRow = METRIC_ROWS.find((row) => row.key === "cocReturn");
    expect(cocRow).toBeDefined();
    if (!cocRow) return;

    const best = getBestValue(cocRow, [
      { metrics: { cocReturn: 0, totalCashRequired: 0 } },
      { metrics: { cocReturn: -2, totalCashRequired: 50_000 } },
    ]);
    expect(best).toBe(-2);
  });
});
