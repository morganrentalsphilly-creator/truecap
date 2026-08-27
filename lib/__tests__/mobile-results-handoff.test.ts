import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

function section(source: string, startMarker: string, endMarker: string) {
  const start = source.indexOf(startMarker);
  expect(start, `missing source marker: ${startMarker}`).toBeGreaterThanOrEqual(0);
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(
    end,
    `missing source marker after ${startMarker}: ${endMarker}`,
  ).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("mobile analysis action truthfulness", () => {
  const stickyBar = read("components/investcalc/sticky-calculate-bar.tsx");
  const calculator = read("components/investcalc/investcalc-page.tsx");

  it("uses the shared role- and target-aware label in both sticky layouts", () => {
    expect(stickyBar.match(/\{ctaLabel\}/g)).toHaveLength(2);
    expect(stickyBar).not.toContain('{onTrySample ? "Try sample" : "Run"}');
    expect(calculator).toContain("ctaLabel={primaryActionLabel}");
  });

  it("disables both sticky actions while decision criteria are resolving", () => {
    expect(
      stickyBar.match(/disabled=\{isCalculating \|\| isActionDisabled\}/g),
    ).toHaveLength(2);
    expect(calculator).toContain(
      'needsPreRunTargetChoice && preRunBuyBoxState === "loading"',
    );
    expect(calculator).toContain("isActionDisabled={");
  });
});

describe("completed-result focus handoff", () => {
  const calculator = read("components/investcalc/investcalc-page.tsx");

  it("focuses the semantic results region after it mounts", () => {
    const resultRegion = section(
      calculator,
      'data-analysis-results="true"',
      "{/* Stale-results signal",
    );
    const handoff = section(
      calculator,
      "const hasResultsForFocusHandoff =",
      "// Restore the user's remembered advanced-options preference.",
    );

    expect(resultRegion).toContain('role="region"');
    expect(resultRegion).toContain("tabIndex={-1}");
    expect(resultRegion).toContain('aria-label="Analysis results"');
    expect(calculator).toContain(
      "scroll-mt-24 focus-visible:outline-none focus-visible:ring-2",
    );
    expect(handoff).toContain("requestAnimationFrame");
    expect(handoff).toContain("resultsSection.scrollIntoView");
    expect(handoff).toContain("resultsSection.focus({ preventScroll: true })");
  });

  it("consumes the pending handoff before scheduling focus", () => {
    const handoff = section(
      calculator,
      "const hasResultsForFocusHandoff =",
      "// Restore the user's remembered advanced-options preference.",
    );
    const consume = handoff.indexOf("pendingResultsScrollRef.current = false");
    const schedule = handoff.indexOf("requestAnimationFrame");

    expect(consume).toBeGreaterThanOrEqual(0);
    expect(schedule).toBeGreaterThan(consume);
    expect(handoff).toContain(
      "[hasResultsForFocusHandoff, isCalculating]",
    );
    expect(handoff).not.toContain("[analysisResult, isCalculating]");
  });
});
