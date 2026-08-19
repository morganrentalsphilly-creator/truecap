import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { APPRECIATION_PLAY_MIN_ANNUAL_RETURN_PCT } from "@/lib/deal-score";
import { buildStrategyLensOutcome } from "@/lib/strategy-lens-outcome";

/**
 * Semantic colour must be THRESHOLD-driven, never sign-driven.
 *
 * The defect this pins: the 10-Yr Return tile painted green whenever the
 * value was >= 0, so a ~1%/yr return rendered as a win — while the lens card
 * inches away described the very same number as "limited". Green has to mean
 * "clears a defined bar", and the bar already existed in two places
 * (strategy-lens-outcome's >11/8/5 bands and
 * APPRECIATION_PLAY_MIN_ANNUAL_RETURN_PCT).
 */

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

describe("metric tone thresholds", () => {
  it("10-Yr Return goes green only at the published 'solid' bar", () => {
    const source = read("components/investcalc/metrics-band.tsx");
    // The tile must compare against the shared constant, not >= 0.
    expect(source).toContain("annualizedReturnPct >= APPRECIATION_PLAY_MIN_ANNUAL_RETURN_PCT");
    expect(source).not.toMatch(/annualizedReturnPct >= 0\s*&&\s*\n?\s*!isExtremeAnnualizedRoi/);
  });

  it("the tile and the lens card agree about what counts as good", () => {
    // Both must flip at the same number — a tile that celebrates what the
    // card calls "limited" is the bug.
    const belowBar = APPRECIATION_PLAY_MIN_ANNUAL_RETURN_PCT - 1;
    const atBar = APPRECIATION_PLAY_MIN_ANNUAL_RETURN_PCT;

    const base = {
      netCashFlow: 200,
      cocReturn: 6,
      dscr: 1.3,
      capRate: 7,
      afterTaxCF: 150,
      monthlyPayment: 1200,
      isOwnerOccupant: false,
    };
    const lensBelow = buildStrategyLensOutcome("appreciation", {
      ...base,
      annualizedReturnPct: belowBar,
    });
    const lensAt = buildStrategyLensOutcome("appreciation", {
      ...base,
      annualizedReturnPct: atBar,
    });

    const toneFor = (outcome: ReturnType<typeof buildStrategyLensOutcome>) =>
      outcome?.metrics.find((m) => m.label === "10-yr return")?.tone ?? null;

    expect(toneFor(lensBelow)).not.toBe("good");
    expect(toneFor(lensAt)).toBe("good");
  });

  it("no metric tile paints green on a bare non-negative check", () => {
    // Cash-flow tiles legitimately use >= 0 — "does it cash flow?" IS the
    // bar. Percentage RETURN tiles may not: 1% is not a win.
    const source = read("components/investcalc/metrics-band.tsx");
    expect(source).not.toMatch(/annualizedReturnPct >= 0 \? "text-\[var\(--metric-positive\)\]"/);
  });
});
