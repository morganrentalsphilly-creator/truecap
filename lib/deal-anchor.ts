/**
 * Resolving the dashboard's "jump to this deal" anchor.
 *
 * TopDeals renders EVERY deal twice: once as a mobile `<article>` inside a
 * `md:hidden` stack and once as a desktop `<tr>` inside a `hidden … md:block`
 * table. Both copies carry the same `id="deal-<anchorId>"` and BOTH stay in
 * the DOM at every width — the breakpoint only flips `display`. So
 * `document.getElementById()` is the wrong lookup: it returns the FIRST match
 * in document order (the mobile article), which at ≥768px is `display:none`.
 * `scrollIntoView()` and `focus()` on a node with no layout box are silent
 * no-ops, which is exactly how the "Top performers" rows became dead buttons —
 * on desktop as well as in the 640–767px band the audit originally reported.
 *
 * The fix is to pick the copy that is actually LAID OUT. `getClientRects()`
 * returns zero rects for anything in a `display:none` subtree (and for a node
 * that isn't attached), and at least one rect for anything that occupies
 * space — including elements scrolled out of view, which must still be
 * scrollable targets. That makes it the right "is this the rendered copy"
 * test, and it is layout-agnostic: it keeps working if the breakpoints move
 * or a third layout is added.
 *
 * Kept in lib/ (rather than inline in DashboardHome) so the contract is
 * unit-testable without a DOM: `pickRenderedAnchor` is pure over anything
 * that can report its client rects.
 */

/** The only thing `pickRenderedAnchor` needs from a DOM node. */
export interface DealAnchorCandidate {
  getClientRects(): { length: number };
}

/**
 * Attribute selector (NOT `#id`) so ids that start with a digit or contain
 * CSS-significant characters still match. `anchorId` is always sanitised to
 * `[A-Za-z0-9_-]` by its producers (getDealAnchorId in DashboardHome,
 * getDealId in TopDeals), so it cannot break out of the quoted string.
 */
export function dealAnchorSelector(anchorId: string): string {
  return `[id="deal-${anchorId}"]`;
}

/**
 * The first candidate that has a layout box, or null when none does — which
 * is the genuine "the anchor isn't rendered anywhere" case (a deal hidden
 * behind TopDeals' collapsed top-3 mobile stack) and the signal to ask
 * TopDeals to expand.
 */
export function pickRenderedAnchor<T extends DealAnchorCandidate>(
  candidates: readonly T[],
): T | null {
  return candidates.find((node) => node.getClientRects().length > 0) ?? null;
}
