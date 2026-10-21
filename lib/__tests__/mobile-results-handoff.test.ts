import { readFileSync } from "node:fs";
import { join } from "node:path";

// 2026-09 audit: the product uses one focus vocabulary — the primitives'
// 3px ring at 50% (focus-visible:ring-[3px] focus-visible:ring-ring/50).
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
    // The region takes programmatic focus but draws no ring (polish pass,
    // 2026-10-20: the 3px frame around the whole report was the first thing
    // a visitor saw); the verdict heading receives the focus when present.
    expect(calculator).toContain("scroll-mt-20 outline-none");
    expect(calculator).toContain("sm:scroll-mt-24");
    expect(handoff).toContain("requestAnimationFrame");
    expect(handoff).toContain("resultsSection.scrollIntoView");
    expect(handoff).toContain("focusAnalysisResults();");
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
