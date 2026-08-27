import { normalizeReleasedInvestmentFormSnapshot } from "@/lib/underwriting-model-release";
import {
  evaluateRateAlertForDeal,
  type RateAlertDeal,
} from "@/lib/rate-alerts";
import { resolveSavedAnalysisSnapshot } from "@/lib/saved-analysis-methodology";

/**
 * Dashboard "rate watch" — the on-demand twin of the weekly rate-alert email
 * (app/api/cron/send-rate-alerts). Re-underwrites the signed-in user's saved
 * deals at TODAY's 30-year rate and surfaces the ones whose signal changed
 * since they were saved, so a saved deal behaves like a living watchlist
 * rather than a frozen snapshot.
 *
 * Pure (no IO) — the current rate is fetched by the caller (the dashboard
 * server component, mirroring how the cron route owns its FRED fetch). Reuses
 * the SAME `buildRateAlertForDeal` the email cron uses, so the dashboard strip
 * and the email can never tell the user two different stories.
 */

export type RateWatchDealRow = {
  id: string;
  title?: string | null;
  address?: string | null;
  form_snapshot: unknown;
  methodology_version: unknown;
  result_snapshot: unknown;
};

export type RateWatchSummary = {
  currentRatePct: number;
  /** Deals whose tier / DSCR band / cash-flow sign flips at today's rate. */
  changedDeals: RateAlertDeal[];
  /** How many saved deals are actively re-underwritten (the watchlist size).
   *  Lets the strip show an ambient "we're monitoring N deals" state when
   *  nothing changed, so the loop is visible before the first alert fires. */
  monitoredCount: number;
  /** Valid rows excluded because their saved engine could not be reproduced. */
  excludedMethodologyCount: number;
};

/**
 * Cross-deal financial values can be combined only inside one exact output
 * cohort. Recorded and recomputed values remain separate even when their
 * public version text matches; unavailable/unknown fallbacks return null.
 */
export function resolveComparableSavedMetricCohort(input: {
  methodologyVersion: unknown;
  resultSnapshot: unknown;
  recomputedSnapshot?: unknown;
}): string | null {
  const resolution = resolveSavedAnalysisSnapshot({
    methodologyVersion: input.methodologyVersion,
    resultSnapshot: input.resultSnapshot,
    recomputedSnapshot: input.recomputedSnapshot,
  });
  if (
    resolution.mode === "current-computation" ||
    resolution.mode === "legacy-recomputed"
  ) {
    return `current-computed:${resolution.currentMethodologyVersion}`;
  }
  if (
    resolution.mode === "same-version-recorded-snapshot" ||
    resolution.mode === "frozen-version-snapshot"
  ) {
    return resolution.storedMethodologyVersion
      ? `recorded:${resolution.storedMethodologyVersion}`
      : null;
  }
  return null;
}

/**
 * Re-underwrite the given saved deals at `currentRatePct`. Returns a summary
 * whenever there's at least one watchable deal: `changedDeals` carries the ones
 * whose signal flipped (the alert), and `monitoredCount` is the full watchlist
 * size (the ambient "we're watching N deals" state). Returns null only when
 * there's genuinely nothing to monitor (no rate, or no valid saved deals), so
 * callers render the strip unconditionally and it stays invisible until useful.
 */
export function buildRateWatch(
  rows: RateWatchDealRow[],
  currentRatePct: number | null
): RateWatchSummary | null {
  if (currentRatePct == null || !Number.isFinite(currentRatePct)) return null;
  const changedDeals: RateAlertDeal[] = [];
  let monitoredCount = 0;
  let excludedMethodologyCount = 0;
  for (const row of rows) {
    const values = normalizeReleasedInvestmentFormSnapshot(row.form_snapshot);
    if (!values) continue; // pre-snapshot or partial save — skip quietly
    const evaluation = evaluateRateAlertForDeal({
      id: row.id,
      title: row.title ?? null,
      address: row.address ?? null,
      values,
      currentRatePct,
      methodologyVersion: row.methodology_version,
      recordedSnapshot: row.result_snapshot,
    });
    if (!evaluation.eligible) {
      excludedMethodologyCount += 1;
      continue;
    }
    monitoredCount += 1;
    if (evaluation.alert) changedDeals.push(evaluation.alert);
  }
  if (monitoredCount === 0) return null; // nothing watchable → strip hides
  // Improved deals (rates fell, metrics up) first — that's the opportunity the
  // user most wants to act on.
  changedDeals.sort((a, b) => Number(b.improved) - Number(a.improved));
  return {
    currentRatePct,
    changedDeals,
    monitoredCount,
    excludedMethodologyCount,
  };
}
