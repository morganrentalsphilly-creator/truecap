import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("personal analyzer Buy Box resolution", () => {
  const card = read("components/investcalc/buy-box-verdict-card.tsx");
  const dashboard = read("components/investcalc/analysis-dashboard.tsx");

  it("passes the active strategy through the shared fail-closed scope helper", () => {
    expect(card).toContain("boxesForPersonalAnalyzerStrategy(");
    expect(card).toContain("analyzerStrategyKey");
    expect(dashboard).toContain(
      'analyzerStrategyKey={activeStrategy?.key ?? "buy-hold"}',
    );
    expect(dashboard).toContain(
      'key={activeStrategy?.key ?? "buy-hold"}',
    );
  });

  it("shows loading before an unresolved lookup can look like missing targets", () => {
    expect(card).toContain('lookupState === "loading"');
    expect(card).toContain("Loading strategy-matched Buy Box rules");
    expect(dashboard).toContain(
      'effectiveBuyBoxTargetResolutionState === "loading"',
    );
  });

  it("retries inline without refreshing or navigating away", () => {
    expect(card).toContain("Retry Buy Box");
    expect(card).toContain("onClick={onRetry}");
    expect(card).toContain("lastDeliveryKeyRef.current = undefined");
    expect(dashboard).toContain("retryBuyBoxResolution");
    expect(dashboard).not.toContain("window.location.reload()");
  });

  it("fails Buy Box claims closed while preserving base-underwriting actions", () => {
    expect(card).toContain(
      "No Buy Box fit or target-backed Offer Ceiling is being claimed.",
    );
    expect(dashboard).toContain(
      'buyBoxTargetResolutionState === "error"',
    );
    expect(dashboard).toContain(
      "Save, share, and export remain available, but no Buy Box fit or Buy Box-backed Offer Ceiling is being claimed.",
    );
    expect(dashboard).toContain(
      'const targetActionsBlocked =\n    effectiveBuyBoxTargetResolutionState === "loading";',
    );
  });
});
