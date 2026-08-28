import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { METRIC_ROWS, getBestValue } from "@/lib/compare-metrics";
import {
  cashFlowSubLabel,
  getSecondaryMetricKeys,
} from "@/components/investcalc/metrics-band";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const normalizeSource = (source: string) =>
  source.replace(/\s+/g, "").replace(/,([)}\]])/g, "$1");

describe("calculation trust copy and applicability guards", () => {
  it("keeps unreleased tax metrics out of default analysis and projection presentation", () => {
    expect(getSecondaryMetricKeys()).not.toEqual(
      expect.arrayContaining(["afterTax", "taxSavings"]),
    );
    expect(
      getSecondaryMetricKeys({ includeTaxMetrics: true }),
    ).toEqual(expect.arrayContaining(["afterTax", "taxSavings"]));

    const dashboard = read("components/investcalc/analysis-dashboard.tsx");
    const projectionPanel = read(
      "components/investcalc/ten-year-projections/panel.tsx",
    );
    const projectionSummary = read(
      "components/investcalc/ten-year-projections/summary-cards.tsx",
    );
    const projectionTable = read(
      "components/investcalc/ten-year-projections/table.tsx",
    );

    expect(dashboard).toContain(
      'includeTaxMetrics: isFeatureReleased("tax_strategy")',
    );
    expect(projectionPanel).toContain(
      'const showTaxMetrics = isFeatureReleased("tax_strategy")',
    );
    expect(projectionSummary).toContain("showTaxMetrics = false");
    expect(projectionTable).toContain("showTaxMetrics = false");
    expect(
      cashFlowSubLabel({
        netCashFlow: -50,
      }),
    ).toBe("Near break-even before tax");
  });

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

  it("labels recurring projection debt service to include mortgage insurance and separates balloon payoff", () => {
    const projectionTable = read(
      "components/investcalc/ten-year-projections/table.tsx"
    );
    const projectionCharts = read(
      "components/investcalc/ten-year-projections/charts.tsx"
    );
    const pdf = read("lib/pdf-generator.ts");

    expect(projectionTable).toContain(
      "Annual Debt Service (P&I + Mortgage Insurance)"
    );
    expect(projectionTable).not.toContain(
      "Annual Debt Service (Principal & Interest)"
    );
    expect(projectionTable).toContain("Balloon due at maturity");
    expect(projectionTable).toContain("Total financing outflow");
    expect(projectionCharts).toContain("Financing Outflow (P&I + MI)");
    expect(pdf).toContain('label: "P&I + MI"');
    expect(normalizeSource(pdf)).toContain(
      normalizeSource(
        '"Op. Expenses", "P&I + MI", ...(projectionHasBalloon ? ["Balloon"] : []), "Net CF"',
      ),
    );
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
      { metrics: { cocReturn: -4, totalCashRequired: 40_000 } },
    ]);
    expect(best).toBe(-2);
  });

  it("sizes PDF assumption cards from their actual row counts", () => {
    const pdf = read("lib/pdf-generator.ts");
    expect(pdf).toContain("const topRowH = inputBlockHeight(propertyRows, financingRows)");
    expect(pdf).toContain(
      "const financingBoxH = Math.max(boxH, 36 + facts.length * 14)",
    );
    expect(pdf).not.toContain("Math.min(boxH, 92 + facts.length * 4)");
    expect(pdf).toContain("financingFallback?.loanTerm");
    expect(pdf).toContain("d.operatingStatement?.monthlyPayment");
  });
});
