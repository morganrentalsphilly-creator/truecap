/**
 * Dashboard-shell contract for starting a genuinely fresh analysis.
 *
 * Navigating to /dashboard/new while that route is already mounted is a
 * same-route no-op in the App Router. Dispatching this event lets the mounted
 * calculator run its own guarded reset instead of leaving the previous deal on
 * screen behind a button labelled "New Analysis".
 */
export const NEW_ANALYSIS_REQUEST_EVENT = "truecap:new-analysis-request";

export function requestMountedNewAnalysis(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(NEW_ANALYSIS_REQUEST_EVENT));
}

export type FreshAnalysisInitialization = {
  requested: boolean;
  hasInitialSavedDeal: boolean;
  hasEditHandoff: boolean;
  hasDuplicateHandoff: boolean;
  hasAnalyzerHandoff: boolean;
  hasBillingReturn: boolean;
};

/**
 * Resolve the one-time `?fresh=1` instruction without overriding a more
 * specific continuity request. Kept pure so the precedence contract remains
 * regression-testable without mounting the full calculator.
 */
export function shouldStartFreshAnalysis({
  requested,
  hasInitialSavedDeal,
  hasEditHandoff,
  hasDuplicateHandoff,
  hasAnalyzerHandoff,
  hasBillingReturn,
}: FreshAnalysisInitialization): boolean {
  return (
    requested &&
    !hasInitialSavedDeal &&
    !hasEditHandoff &&
    !hasDuplicateHandoff &&
    !hasAnalyzerHandoff &&
    !hasBillingReturn
  );
}
