import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildMetricTiles } from "@/components/investcalc/metrics-band";
import { calculateAnalysis, type AnalysisResult } from "@/lib/calc-analysis";
import { SAMPLE_DEAL_FIXTURE } from "@/lib/sample-deal";

/**
 * The metric tiles under "The numbers" print whole dollars.
 *
 * The engine never rounds cash flow (the sample's is 554.0433...), and the
 * tile helper used a bare toLocaleString(), so the sample deal read
 * "+$554.043" one click below a decision card that says $554/mo, and a
 * comma-decimal browser read it as "+$554,043".
 */

function tileHtml(node: ReactNode): string {
  return renderToStaticMarkup(<>{node}</>);
}

function tilesFor(result: AnalysisResult) {
  return buildMetricTiles({
    displayResult: result,
    result,
    isLoading: false,
    propertyType: "single-family",
    annualizedReturnPct: null,
  });
}

function withResult(overrides: Partial<AnalysisResult>): AnalysisResult {
  return {
    ...calculateAnalysis(SAMPLE_DEAL_FIXTURE.values),
    ...overrides,
  };
}

/** The tile's figure: the one mono, tabular span in a MetricCard. */
function figure(html: string): string {
  const match = html.match(/tabular-nums[^>]*>([^<]*)</);
  if (!match) throw new Error(`no figure in ${html}`);
  return match[1];
}

describe("metric tiles print whole dollars", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the sample deal's monthly cash flow as +$554, as the decision card does", () => {
    const result = calculateAnalysis(SAMPLE_DEAL_FIXTURE.values);
    // The engine value is not whole; the test would prove nothing if it were.
    expect(Number.isInteger(result.netCashFlow)).toBe(false);
    expect(Math.round(result.netCashFlow)).toBe(554);

    const tiles = tilesFor(result);
    expect(figure(tileHtml(tiles.cashFlow))).toBe("+$554");
    expect(figure(tileHtml(tiles.annualCf))).toBe(
      `+$${Math.round(result.annualCashFlow).toLocaleString("en-US")}`,
    );

    const all = Object.values(tiles).map(tileHtml).join("");
    expect(all).not.toContain("554.04");
    // No dollar figure on any tile carries a decimal part.
    expect(all).not.toMatch(/\$[\d,]+\.\d/);
  });

  it("takes the sign from the rounded value, so a figure that rounds to zero never prints as -$0", () => {
    const tiles = tilesFor(
      withResult({
        netCashFlow: -0.4,
        afterTaxCF: -0.49,
        annualCashFlow: -0.2,
        taxSavingsMonthly: -0.3,
      }),
    );
    expect(figure(tileHtml(tiles.cashFlow))).toBe("+$0");
    expect(figure(tileHtml(tiles.afterTax))).toBe("+$0");
    expect(figure(tileHtml(tiles.annualCf))).toBe("+$0");
    expect(figure(tileHtml(tiles.taxSavings))).toBe("$0");

    const negative = tilesFor(
      withResult({
        netCashFlow: -120.6,
        afterTaxCF: -80.5,
        annualCashFlow: -1447.2,
        taxSavingsMonthly: -35.7,
      }),
    );
    expect(figure(tileHtml(negative.cashFlow))).toBe("-$121");
    // Math.round rounds a half toward positive infinity: -80.5 is -80.
    expect(figure(tileHtml(negative.afterTax))).toBe("-$80");
    expect(figure(tileHtml(negative.annualCf))).toBe("-$1,447");
    expect(figure(tileHtml(negative.taxSavings))).toBe("-$36");
  });

  it("groups thousands the same way in every browser locale", () => {
    const original = Number.prototype.toLocaleString;
    // A comma-decimal browser: stand in for de-DE when no locale is passed.
    vi.spyOn(Number.prototype, "toLocaleString").mockImplementation(function (
      this: number,
      locales?: Intl.LocalesArgument,
      options?: Intl.NumberFormatOptions,
    ) {
      return original.call(this, locales ?? "de-DE", options);
    });

    const tiles = tilesFor(
      withResult({ netCashFlow: 1554.0433, annualCashFlow: 18648.52 }),
    );
    expect(figure(tileHtml(tiles.cashFlow))).toBe("+$1,554");
    expect(figure(tileHtml(tiles.annualCf))).toBe("+$18,649");
  });
});
