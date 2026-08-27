import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

function section(source: string, startMarker: string, endMarker: string) {
  const start = source.indexOf(startMarker);
  expect(start, `missing source marker: ${startMarker}`).toBeGreaterThanOrEqual(0);
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(end, `missing source marker after ${startMarker}: ${endMarker}`).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("analysis-flow truthfulness", () => {
  const calculator = read("components/investcalc/investcalc-page.tsx");

  it("asks for the required address before presenting a price-and-rent draft as runnable", () => {
    const label = section(
      calculator,
      "const primaryActionLabel =",
      "const commitPreRunTarget =",
    );
    const handler = section(
      calculator,
      "const handlePrimaryRunAction = async",
      "useEffect(() => {\n    if (postAnalysisMode)",
    );
    const property = read("components/investcalc/property-details-section.tsx");
    const cta = read("lib/analyzer-cta.ts");

    expect(label).toContain("needsAddressForFullAnalysis");
    expect(label).toContain("analyzerCta");
    expect(calculator).toContain("activeStrategyKey !== null");
    expect(cta).toContain('"Add address to run full analysis"');
    expect(handler).toContain("if (needsAddressForFullAnalysis)");
    expect(handler).toContain('form.trigger("address")');
    expect(handler).toContain('focusInvalidField("address")');
    expect(calculator).toContain("findEl()?.scrollIntoView");
    expect(property).toContain("Property Address");
    expect(property).toContain("Required");
    expect(property).toContain("aria-required");
  });

  it("keeps untouched starter criteria distinct until the investor edits them", () => {
    const proposal = section(
      calculator,
      "const proposedPreRunSource:",
      "const shouldUseAdoptedPreRunTarget =",
    );
    const handler = section(
      calculator,
      "const handlePrimaryRunAction = async",
      "useEffect(() => {\n    if (postAnalysisMode)",
    );

    expect(proposal.match(/"starter-criteria"/g)).toHaveLength(2);
    expect(handler).toContain("activePreRunCriteriaDraft?.dirty");
    expect(handler).toContain('"selected-targets"');
    expect(handler).toContain("proposedPreRunSource");
  });

  it("uses the result itself as ordinary completion feedback", () => {
    const completion = section(
      calculator,
      "if (autoSaveAfterAuthRef.current)",
      "} finally {\n      isCalculatingRef.current = false",
    );

    expect(completion).toContain("if (autoSavedAfterAuth)");
    expect(completion).toContain('title: "Deal saved automatically"');
    expect(completion).not.toContain('title: "Analysis Complete"');
    expect(calculator).not.toContain('title: "Sample rental loaded"');
    expect(calculator).toContain(
      "setAnalysisMaoTargetSource(SAMPLE_DEAL_FIXTURE.targetProfile.source)",
    );
  });

  it("does not treat untouched populated defaults as user engagement", () => {
    const engagement = section(
      calculator,
      "const analyzerEngaged =",
      "const liveFormValues =",
    );

    expect(engagement).toContain("hasPropertyAvailable");
    expect(engagement).toContain("analysisResult !== null");
    expect(engagement).not.toContain("form.formState.isDirty");
    expect(engagement).not.toContain("hasMeaningfulInput ||");
  });

  it("wraps long addresses in the non-focused result fallback", () => {
    const dashboard = read("components/investcalc/analysis-dashboard.tsx");
    const fallback = section(
      dashboard,
      'aria-label="Base underwriting while decision rules load"',
      "Checking the saved Buy Box rules",
    );

    expect(fallback).toContain("[overflow-wrap:anywhere]");
    expect(fallback).not.toContain("truncate text-sm");
  });
});
