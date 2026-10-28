/**
 * The analyzer keeps `?savedDeal=<id>` in its URL so a refresh reopens the
 * deal on screen. `savedDeal` is a sensitive parameter (lib/sensitive-url.ts):
 * a document that may have loaded a third-party telemetry script must never
 * run on a URL that carries it. So attaching a deal either rewrites this
 * document's URL in place (no such script can be present) or opens the deal in
 * a new document, which starts on the sensitive URL with every telemetry
 * provider off.
 */

export const SAVED_DEAL_PARAM = "savedDeal";

export type SavedDealUrlTransition =
  /** The URL already names this deal. */
  | { kind: "unchanged" }
  /** history.replaceState to `path`: no telemetry script can be present. */
  | { kind: "replace-state"; path: string }
  /** Load `path` as a new document; this one may be running telemetry. */
  | { kind: "new-document"; path: string };

/** `href` re-pointed at `savedDealId` (or with the deal removed when null),
 * as a same-origin path + search + hash. Other parameters are kept. */
export function savedDealPath(href: string, savedDealId: string | null): string {
  const url = new URL(href, "https://truecap.invalid");
  if (savedDealId) url.searchParams.set(SAVED_DEAL_PARAM, savedDealId);
  else url.searchParams.delete(SAVED_DEAL_PARAM);
  return `${url.pathname}${url.search}${url.hash}`;
}

/** How to put `savedDealId` into the analyzer URL at `href`. */
export function savedDealUrlTransition(
  href: string,
  savedDealId: string,
  documentMayHaveThirdPartyTelemetry: boolean,
): SavedDealUrlTransition {
  const current = new URL(href, "https://truecap.invalid");
  if (current.searchParams.get(SAVED_DEAL_PARAM) === savedDealId) {
    return { kind: "unchanged" };
  }
  const path = savedDealPath(href, savedDealId);
  return documentMayHaveThirdPartyTelemetry
    ? { kind: "new-document", path }
    : { kind: "replace-state", path };
}

/**
 * One-shot hand-off of the first-save confirmation to the document that
 * opens the saved deal. Holds only the deal id, in this tab's sessionStorage.
 */
export const SAVED_DEAL_NOTICE_KEY = "truecap_saved_deal_notice_v1";

