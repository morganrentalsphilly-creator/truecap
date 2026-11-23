/**
 * The analyzer's result view in the URL (2026-11 audit A8).
 *
 * The analyzer renders its result in place: same route, same document. With
 * nothing in the URL or the history, the browser's Back button left the page
 * from a result instead of returning to the form, and a result had no title
 * of its own. `?view=result` marks the entry the result is shown under, so
 * Back and Forward move between the form and the result.
 *
 * The parameter carries no deal data. It is a view flag only, safe in any
 * document (compare `?savedDeal=`, which lib/saved-deal-url.ts keeps out of
 * documents that may run third-party telemetry).
 */

export const RESULT_VIEW_PARAM = "view";
export const RESULT_VIEW_VALUE = "result";

/** True when `href` is the result-view URL. */
export function hasResultView(href: string): boolean {
  const url = new URL(href, "https://truecap.invalid");
  return url.searchParams.get(RESULT_VIEW_PARAM) === RESULT_VIEW_VALUE;
}

/** `href` as a path with the result-view flag set or removed. Every other
 *  parameter (and the hash) is kept. */
export function resultViewPath(href: string, showResult: boolean): string {
  const url = new URL(href, "https://truecap.invalid");
  if (showResult) url.searchParams.set(RESULT_VIEW_PARAM, RESULT_VIEW_VALUE);
  else if (url.searchParams.get(RESULT_VIEW_PARAM) === RESULT_VIEW_VALUE) {
    url.searchParams.delete(RESULT_VIEW_PARAM);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * The document title while a result is on screen.
 *
 * The address is included only when the caller says the document is free of
 * third-party telemetry: Google's tags send the page title with every hit,
 * and a property address must never leave the app that way (CLAUDE.md §5.4,
 * lib/analytics/telemetry-document.ts). Otherwise the title names the view
 * without naming the property.
 */
export function resultViewTitle(
  address: string | null | undefined,
  addressMayAppear: boolean,
): string {
  const trimmed = typeof address === "string" ? address.trim() : "";
  return trimmed && addressMayAppear
    ? `${trimmed} analysis | TrueCap`
    : "Analysis result | TrueCap";
}
