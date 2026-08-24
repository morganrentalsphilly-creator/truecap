import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

describe("comparison neutrality guards", () => {
  const comparison = read("../../components/investcalc/compare-deals-client.tsx");
  const chart = read("../../components/dashboard/RiskReturn.tsx");
  const metrics = read("../compare-metrics.ts");

  it("frames relative metric positions as modeled comparisons, not investment directives", () => {
    expect(comparison).toContain("Highest metric-lead count");
    expect(comparison).toContain("Relative modeled comparison only");
    expect(comparison).toContain("does not establish safety or make an investment recommendation");
    expect(comparison).toContain("Highest modeled 10-yr ROI");
    expect(comparison).toContain("row-leading value in this set");

    expect(comparison).not.toMatch(/Most metric wins|Relative leader|Metric leader|Strongest DSCR/);
    expect(comparison).not.toContain("{SIGNAL_LABELS[deal.signal]}");
    expect(comparison).not.toContain("getBadgeClasses(deal.signal)");
  });

  it("describes the chart axes without calling model DSCR a safety verdict or target", () => {
    expect(chart).toContain("Return vs model DSCR");
    expect(chart).toContain("Neither direction establishes safety or recommends a deal");
    expect(chart).toContain("Above both references");
    expect(chart).toContain("Below both references");
    expect(chart).toContain("fixed comparison references, not your adopted targets");
    expect(metrics).toContain('label: "Model DSCR"');

    expect(chart).not.toMatch(/safe \+ strong return|Target ✓|Higher risk|DSCR \(safer/);
  });

  it("makes extreme modeled returns a visible sensitivity warning, not an endorsement", () => {
    expect(comparison).toContain("Extreme modeled 10-year ROI");
    expect(comparison).toContain("highly sensitive to saved rent growth");
    expect(comparison).toContain("a higher projection is not a recommendation");
  });
});
