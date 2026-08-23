import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const dashboard = readFileSync(
  join(process.cwd(), "components/investcalc/analysis-dashboard.tsx"),
  "utf8"
);
const focusedSummary = readFileSync(
  join(process.cwd(), "components/investcalc/focused-decision-summary.tsx"),
  "utf8"
);
const metricsBand = readFileSync(
  join(process.cwd(), "components/investcalc/metrics-band.tsx"),
  "utf8"
);

describe("what-if scenario safety", () => {
  it("keeps temporary numbers explicitly labeled and resets on base edits", () => {
    expect(dashboard).toContain(
      "These numbers are temporary. Your saved base assumptions have not changed."
    );
    expect(dashboard).toContain(
      "Scenario values below are labeled Scenario; the Decision card and price ceiling remain labeled Base."
    );
    expect(dashboard).toContain("previousBaseAssumptionsRef");
    expect(dashboard).toContain("setWhatIfState(null)");
    expect(dashboard).toContain("Scenario reset because the base assumptions changed.");
    expect(focusedSummary).toContain('"Base price ceiling"');
    expect(dashboard).toContain('"Scenario numbers"');
    expect(metricsBand).toContain(
      'source === "scenario" ? "Scenario" : "Base"'
    );
    expect(metricsBand).toContain(
      'sourcedLabel("Monthly Cash Flow", "scenario")'
    );
    expect(metricsBand).toContain('sourcedLabel("After-Tax CF", "base")');
    expect(dashboard).toContain('"Base risks and verification"');
    expect(dashboard).toContain('"Base long-term analysis"');
    expect(dashboard).toContain(
      "deferredWhatIfState?.isAdjusted ? null : returnSummary"
    );
  });
});
