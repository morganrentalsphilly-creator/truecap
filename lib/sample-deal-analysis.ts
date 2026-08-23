import { calculateAnalysis } from "@/lib/calc-analysis";
import {
  buildDealScoreInputFromAnalysis,
  computeDealScore,
} from "@/lib/deal-score";
import { calculateMaxAllowableOffer } from "@/lib/max-allowable-offer";
import { SAMPLE_DEAL_FIXTURE } from "@/lib/sample-deal";

/**
 * Deterministic output used by every 1700 W Erie preview. This is deliberately
 * a thin composition of the production engines—not a second formula layer.
 */
export function calculateSampleDealOutcome() {
  const analysis = calculateAnalysis(SAMPLE_DEAL_FIXTURE.values);
  const dealScore = computeDealScore(
    buildDealScoreInputFromAnalysis(SAMPLE_DEAL_FIXTURE.values, analysis)
  );
  const maxOffer = calculateMaxAllowableOffer(
    SAMPLE_DEAL_FIXTURE.values,
    SAMPLE_DEAL_FIXTURE.maoTarget
  );

  return { analysis, dealScore, maxOffer };
}
