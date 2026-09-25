import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  capRateContextLabel,
  capRateTone,
  cashFlowTone,
  cocBenchmarkLabel,
  cocTone,
  dscrBandLabel,
  dscrTone,
  formatRatioPct,
  formatSignedPct,
} from "@/lib/financial-presentation";

/**
 * 2026-09 audit: the shared viewer coloured any non-negative cap rate green,
 * a 0–5% cash-on-cash green, a 1.00–1.25 DSCR red and a -$40/mo cash flow
 * red, while the in-app band kept every one of those neutral. The recipient
 * of a share saw a different verdict from the sender. One rule set now lives
 * in lib/financial-presentation and both surfaces route through it.
 */
describe("one colour rule per first-year metric", () => {
  it("keeps cap rate neutral unless modeled NOI is negative", () => {
    expect(capRateTone(0)).toBe("neutral");
    expect(capRateTone(7.2)).toBe("neutral");
    expect(capRateTone(-0.4)).toBe("negative");
    expect(capRateContextLabel(-0.4)).toMatch(/Negative modeled NOI/);
  });

  it("greens cash-on-cash only above the 5% reference", () => {
    expect(cocTone(5.0, 60_000)).toBe("neutral");
    expect(cocTone(5.1, 60_000)).toBe("positive");
    expect(cocTone(0, 60_000)).toBe("neutral");
    expect(cocTone(-1, 60_000)).toBe("negative");
    // No modeled cash invested: nothing to colour.
    expect(cocTone(40, 0)).toBe("neutral");
    expect(cocBenchmarkLabel(4)).toBe("Between 3% and 5%");
  });

  it("keeps the 1.00–1.25 DSCR band neutral and house-hacks below 1.00 neutral", () => {
    expect(dscrTone(1.25, true)).toBe("positive");
    expect(dscrTone(1.1, true)).toBe("neutral");
    expect(dscrTone(0.9, true)).toBe("negative");
    expect(dscrTone(0.9, true, true)).toBe("neutral");
    expect(dscrTone(0, false)).toBe("neutral");
    expect(dscrBandLabel(1.1, true)).toBe("Between 1.00 and 1.25");
    expect(dscrBandLabel(0.9, true, true)).toMatch(/exceeds modeled NOI/);
    expect(dscrBandLabel(0, false)).toBeUndefined();
  });

  it("treats a small negative cash flow as break-even, not alarm-red", () => {
    expect(cashFlowTone(1)).toBe("positive");
    expect(cashFlowTone(0)).toBe("neutral");
    expect(cashFlowTone(-40)).toBe("neutral");
    expect(cashFlowTone(-100)).toBe("negative");
  });

  it("formats ratios without a sign and returns with one", () => {
    expect(formatRatioPct(7.25)).toBe("7.3%");
    expect(formatRatioPct(-0.44)).toBe("-0.4%");
    expect(formatSignedPct(9.33)).toBe("+9.3%");
    expect(formatSignedPct(-2)).toBe("-2.0%");
  });
});

const read = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");

describe("every first-year surface routes through the shared rules", () => {
  const band = read("components/investcalc/metrics-band.tsx");
  const viewer = read("components/investcalc/read-only-analysis-view.tsx");
  const card = read("components/investcalc/focused-decision-summary.tsx");

  it("the metrics band defines no local threshold ternaries", () => {
    for (const helper of ["cashFlowTone(", "cocTone(", "capRateTone(", "dscrTone("]) {
      expect(band, helper).toContain(helper);
    }
    expect(band).not.toMatch(/dscr >= 1\.25\s*\?/);
    expect(band).not.toMatch(/cocReturn > 5\s*\?/);
    expect(band).not.toMatch(/netCashFlow > -100\s*\?/);
    expect(band).not.toContain("function capRateOutputColor");
  });

  it("the shared viewer no longer carries its own sign rules or sub-labels", () => {
    for (const helper of ["cashFlowTone(", "cocTone(", "capRateTone(", "dscrTone(", "dscrBandLabel("]) {
      expect(viewer, helper).toContain(helper);
    }
    expect(viewer).not.toContain("positive={result.capRate >= 0}");
    expect(viewer).not.toContain("positive={result.netCashFlow >= 0}");
    expect(viewer).not.toContain("result.dscr < 1.25");
    expect(viewer).not.toMatch(/Underwater|Tight \(≥1\.0\)|Common screening threshold/);
    // Cap rate is a ratio: the viewer must not prefix it with "+".
    expect(viewer).toContain("value={formatRatioPct(result.capRate)}");
    // The recipient gets the same definitions the sender had.
    for (const term of ['glossaryTerm="cashFlow"', 'glossaryTerm="coc"', 'glossaryTerm="capRate"', 'glossaryTerm="dscr"']) {
      expect(viewer, term).toContain(term);
    }
  });

  it("the decision card shows all four numbers at one decimal with definitions", () => {
    expect(card).toContain('sm:grid-cols-4"\n      aria-label="First-year investment snapshot"');
    for (const term of ['term="cashFlow"', 'term="dscr"', 'term="capRate"', 'term="coc"']) {
      expect(card, term).toContain(term);
    }
    expect(card).toContain("formatRatioPct(result.capRate)");
    expect(card).toContain("formatSignedPct(result.cocReturn)");
    expect(card).not.toContain("result.capRate.toFixed(2)");
    expect(card).not.toContain("result.cocReturn.toFixed(2)");
    // The hero cash-flow tile is no longer sign-blind.
    expect(card).toContain("METRIC_TONE_TEXT_CLASS[cashFlowTone(result.netCashFlow)]");
  });
});
