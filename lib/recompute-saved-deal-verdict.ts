import { calculateAnalysis } from "@/lib/calc-analysis";
import {
  buildDealScoreInputFromAnalysis,
  computeDealScore,
  type DealRecommendation,
  type DealRiskLevel,
  type DealScoreBreakdown,
} from "@/lib/deal-score";
import { investmentFormSchema } from "@/lib/investcalc-schema";

/**
 * Re-score a saved deal with the CURRENT scoring engine from its stored form
 * snapshot.
 *
 * Saved deals persist their score/recommendation/risk at save time. When the
 * scoring engine changes (e.g. the holistic total-return upgrade), every deal
 * saved before the change carries a STALE verdict — so the dashboard and the
 * saved-deals list would show "Avoid / 0" on a deal the analyzer now scores
 * "Neutral / 40", contradicting each other. Recomputing on read keeps every
 * surface in lockstep with the live engine without a DB backfill.
 *
 * Uses the Balanced lens — these are portfolio/list views, not a single-deal
 * investor-lens view. Pure (calc + score only), so it's safe in a Server
 * Component. Returns null when the snapshot doesn't validate (legacy/garbage
 * shape), in which case the caller falls back to the stored values.
 */
export function recomputeSavedDealVerdict(formSnapshot: unknown): {
  score: number;
  recommendation: DealRecommendation;
  riskLevel: DealRiskLevel;
  breakdown: DealScoreBreakdown;
  /** Debt-service coverage ratio; 0 for a cash purchase (no debt to cover). */
  dscr: number;
  /** Cash needed to close (down payment + closing costs). */
  cashToClose: number;
} | null {
  const parsed = investmentFormSchema.safeParse(formSnapshot);
  if (!parsed.success) return null;
  try {
    const result = calculateAnalysis(parsed.data);
    const scored = computeDealScore(buildDealScoreInputFromAnalysis(parsed.data, result));
    return {
      score: scored.score,
      recommendation: scored.recommendation,
      riskLevel: scored.riskLevel,
      breakdown: scored.breakdown,
      dscr: result.dscr,
      cashToClose: result.totalCashRequired,
    };
  } catch {
    return null;
  }
}
