import { describe, expect, it } from "vitest";

import { calculateAnalysis } from "@/lib/calc-analysis";
import {
  buildDealScoreInputFromAnalysis,
  computeDealScore,
} from "@/lib/deal-score";
import { resolveSavedAnalysisResult } from "@/lib/saved-analysis-methodology";
import { normalizeReleasedInvestmentFormSnapshot } from "@/lib/underwriting-model-release";
import { SAMPLE_DEAL_VALUES } from "@/lib/sample-deal";

/**
 * A saved deal MUST survive the round trip through jsonb and reopen with its
 * decision intact.
 *
 * The bug this pins: result rows are persisted with JSON.stringify, which
 * silently DROPS every key whose value is `undefined`. The reopen completeness
 * check built its required-key set from Object.keys(recomputedResult), and
 * Object.keys DOES include undefined-valued keys. So any optional result field
 * that happens to be undefined became a key that was simultaneously required
 * and impossible — resolveSavedAnalysisResult returned null, and the analyzer
 * reopened the deal as a blank form with the assumptions restored and no
 * decision at all.
 *
 * It shipped the moment the renovation/valuation fields were added, because
 * `operatingScenario: "current"` — what resetToNewAnalysis sets on every new
 * analysis — leaves seven of them undefined. Every newly saved deal was
 * affected, and nothing but a browser test could see it.
 */

type Bag = Record<string, unknown>;

/** Save a deal the way the product does, then reopen it the way the product does. */
function saveThenReopen(raw: Bag) {
  const values = normalizeReleasedInvestmentFormSnapshot(raw);
  if (!values) throw new Error("fixture failed to normalize");

  const result = calculateAnalysis(values);
  const score = computeDealScore(buildDealScoreInputFromAnalysis(values, result));
  const extras = {
    score: score.score,
    recommendation: score.recommendation,
    riskLevel: score.riskLevel,
    breakdown: score.breakdown,
    explanation: score.explanation,
  };

  // The jsonb write. This is the step that drops undefined-valued keys.
  const persisted = JSON.parse(
    JSON.stringify({ ...result, ...extras, scoreMethodologyVersion: score.scoreMethodologyVersion }),
  ) as Bag;

  const recomputed = calculateAnalysis(values);
  const recomputedScore = computeDealScore(
    buildDealScoreInputFromAnalysis(values, recomputed),
  );

  return {
    persisted,
    droppedByJson: Object.keys(result).filter(
      (key) => !Object.prototype.hasOwnProperty.call(persisted, key),
    ),
    resolution: resolveSavedAnalysisResult({
      methodologyVersion: result.methodologyVersion,
      resultSnapshot: persisted,
      recomputedResult: recomputed,
      recomputedExtras: {
        score: recomputedScore.score,
        recommendation: recomputedScore.recommendation,
        riskLevel: recomputedScore.riskLevel,
        breakdown: recomputedScore.breakdown,
        explanation: recomputedScore.explanation,
      },
    }),
  };
}

describe("a saved deal reopens with its decision", () => {
  it("reopens a deal saved with no operatingScenario", () => {
    const { resolution } = saveThenReopen({ ...SAMPLE_DEAL_VALUES } as Bag);
    expect(resolution.result).not.toBeNull();
  });

  it("reopens a deal saved in the 'current' operating scenario", () => {
    // The regression case. resetToNewAnalysis sets this on every new analysis,
    // so this path covers essentially every deal a user saves.
    const { resolution, droppedByJson } = saveThenReopen({
      ...SAMPLE_DEAL_VALUES,
      operatingScenario: "current",
    } as Bag);

    // Guard the premise as well as the outcome: if this fixture ever stops
    // producing undefined-valued result keys, the test still passes but has
    // stopped covering the bug. Fail loudly instead of going quietly green.
    expect(
      droppedByJson.length,
      "fixture no longer exercises undefined-valued result keys — pick a scenario that does",
    ).toBeGreaterThan(0);

    expect(
      resolution.result,
      `reopen returned null; keys dropped by jsonb: ${droppedByJson.join(", ")}`,
    ).not.toBeNull();
  });

  // No 'stabilized' case: that branch of the schema demands a full v2 fixture
  // (stabilizedMonthlyRent, rentBasis, acquisitionCredits, …) which this
  // sample does not carry. The 'current' case above is the one that shipped
  // broken, and the undefined-key rule it pins is scenario-independent.

  it("still fails closed when a snapshot is genuinely missing a real value", () => {
    // The check must keep its teeth: dropping a key that DOES carry a value is
    // a real incompatibility and must still refuse to render a decision.
    const values = normalizeReleasedInvestmentFormSnapshot({
      ...SAMPLE_DEAL_VALUES,
      operatingScenario: "current",
    } as Bag);
    if (!values) throw new Error("fixture failed to normalize");

    const recomputed = calculateAnalysis(values);
    const score = computeDealScore(
      buildDealScoreInputFromAnalysis(values, recomputed),
    );
    const extras = {
      score: score.score,
      recommendation: score.recommendation,
      riskLevel: score.riskLevel,
      breakdown: score.breakdown,
      explanation: score.explanation,
    };

    const full = JSON.parse(JSON.stringify({ ...recomputed, ...extras })) as Bag;
    const realValuedKey = Object.keys(recomputed).find(
      (key) =>
        (recomputed as unknown as Bag)[key] !== undefined &&
        key !== "methodologyVersion" &&
        key !== "analysisDate" &&
        key !== "tenYearProjectionVersion",
    );
    expect(realValuedKey, "expected at least one real-valued result key").toBeDefined();
    delete full[realValuedKey as string];

    const resolution = resolveSavedAnalysisResult({
      methodologyVersion: recomputed.methodologyVersion,
      resultSnapshot: full,
      recomputedResult: recomputed,
      recomputedExtras: extras,
    });
    expect(resolution.result).toBeNull();
  });
});
