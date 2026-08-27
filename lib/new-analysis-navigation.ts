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
