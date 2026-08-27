/**
 * Durable dashboard-search navigation.
 *
 * The previous handoff lived only in a module variable and was consumed by a
 * mount-only effect. That meant searching while already on My Deals could be a
 * complete no-op: pushing the current pathname does not remount the list. Keep
 * the intent in the URL instead so same-route navigation, refresh, Back, and a
 * copied link all resolve to the same visible search.
 */
export const DASHBOARD_SAVED_SEARCH_PARAM = "q";
export const DASHBOARD_SAVED_SEARCH_RELEASE_EVENT =
  "truecap:dashboard-saved-search-released";

const MAX_DASHBOARD_SAVED_SEARCH_LENGTH = 100;

export function normalizeDashboardSavedSearchQuery(
  value: string | null | undefined,
): string {
  return (value ?? "").trim().slice(0, MAX_DASHBOARD_SAVED_SEARCH_LENGTH);
}

export function buildDashboardSavedSearchHref(value: string): string | null {
  const query = normalizeDashboardSavedSearchQuery(value);
  if (!query) return null;

  const params = new URLSearchParams();
  params.set(DASHBOARD_SAVED_SEARCH_PARAM, query);
  // Suggestions search every non-deleted saved deal, including completed and
  // archived rows. Land in the matching lifecycle scope so choosing an exact
  // suggestion can never produce a false empty state.
  params.set("state", "all");
  return `/dashboard/saved-analyses?${params.toString()}`;
}

/**
 * Relinquish a Topbar-provided search once the user edits the My Deals input.
 * Keep every unrelated list control (state, sort, client scope, Buy Box) and
 * the hash intact. The caller uses history.replaceState so this is a local URL
 * correction, not an App Router round-trip on every keystroke.
 */
export function removeDashboardSavedSearchParam(href: string): string {
  const url = new URL(href, "https://usetruecap.com");
  url.searchParams.delete(DASHBOARD_SAVED_SEARCH_PARAM);
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Keep the persistent Topbar search in sync with the list-level search. */
export function reportDashboardSavedSearchReleased(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(DASHBOARD_SAVED_SEARCH_RELEASE_EVENT));
}
