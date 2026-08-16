import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const analyzer = readFileSync(
  join(ROOT, "components/investcalc/investcalc-page.tsx"),
  "utf8"
);
const savedAnalysesAction = readFileSync(
  join(ROOT, "app/actions/saved-analyses.ts"),
  "utf8"
);

describe("Input Confidence analyzer persistence contract", () => {
  it("restores and merges value-bound context for every live consumer", () => {
    expect(analyzer).toContain("restoreInputConfidenceSourceContext(");
    expect(analyzer).toContain("mergeInputConfidenceSourceContext({");
    expect(analyzer).toContain("confidenceContext.provenance");
    expect(analyzer).toContain("touchedInputFields: confidenceContext.touchedInputFields");
    expect(analyzer).toContain("provenance={liveResultSourceContext.provenance}");
    expect(analyzer).toContain("buildDataConfidence(liveResultSourceContext.provenance");
  });

  it("binds restored source context to the saved address and clears it on forks", () => {
    expect(analyzer).toContain("persistedInputConfidenceAddressRef");
    expect(analyzer).toContain("persistedAddress === currentAddress");
    expect(analyzer.match(/persistedInputConfidenceSourceContextRef\.current = null/g)?.length)
      .toBeGreaterThanOrEqual(6);
  });

  it("marks context-aware saves so an intentional empty context clears stale legacy sources", () => {
    expect(analyzer).toContain("inputSourceContextProvided: true");
    expect(savedAnalysesAction).toContain(
      "sourceContextProvided: options?.inputSourceContextProvided === true"
    );
    expect(savedAnalysesAction).toContain("shouldPreserveStoredDataConfidence({");
  });
});
