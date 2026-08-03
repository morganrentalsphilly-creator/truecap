import { describe, it, expect } from "vitest";
import { dealAnchorSelector, pickRenderedAnchor } from "@/lib/deal-anchor";

/**
 * The "Top performers" rows in DashboardHome deep-link into TopDeals, which
 * renders EVERY deal twice under the SAME id — a mobile <article> in a
 * `md:hidden` stack and a desktop <tr> in a `hidden … md:block` table. Both
 * copies stay in the DOM at every width; only one is laid out. The contract
 * these tests pin: resolve the copy that HAS a layout box, and report null
 * (→ ask TopDeals to expand) only when none does.
 *
 * No DOM here (vitest runs in the node environment and jsdom isn't a
 * dependency), so candidates are modelled by what pickRenderedAnchor actually
 * consumes: getClientRects().length. That mirrors the browser exactly —
 * display:none subtrees and detached nodes report zero rects; everything that
 * occupies space reports at least one, including elements scrolled offscreen.
 */
function node(name: string, rectCount: number) {
  return { name, getClientRects: () => ({ length: rectCount }) };
}

describe("deal anchor resolution", () => {
  it("picks the anchor with a layout box, not the first in document order", () => {
    // ≥768px: the mobile <article> comes first in the DOM but is display:none.
    const mobileCard = node("article", 0);
    const desktopRow = node("tr", 1);
    expect(pickRenderedAnchor([mobileCard, desktopRow])).toBe(desktopRow);
  });

  it("picks the mobile card below md, where the table row is the hidden one", () => {
    const mobileCard = node("article", 1);
    const desktopRow = node("tr", 0);
    expect(pickRenderedAnchor([mobileCard, desktopRow])).toBe(mobileCard);
  });

  it("returns null when every copy is hidden — the 640-767px collapsed stack", () => {
    // A deal ranked 4th-6th: no mobile card rendered at all, and the desktop
    // <tr> exists but is display:none. This null is the signal that makes
    // DashboardHome dispatch REVEAL_DEAL_EVENT; a truthy result here is
    // exactly the round-1 bug (the hidden <tr> swallowed the fallback).
    expect(pickRenderedAnchor([node("tr", 0)])).toBeNull();
  });

  it("returns null for no candidates at all", () => {
    expect(pickRenderedAnchor([])).toBeNull();
  });

  it("keeps a laid-out but scrolled-offscreen anchor — it is still scrollable", () => {
    const offscreen = node("tr", 1);
    expect(pickRenderedAnchor([offscreen])).toBe(offscreen);
  });

  it("selects by attribute so numeric/uuid ids can't break the selector", () => {
    // `#123e4567…` is an invalid CSS id selector; the attribute form is not.
    expect(dealAnchorSelector("123e4567-e89b-12d3-a456-426614174000")).toBe(
      '[id="deal-123e4567-e89b-12d3-a456-426614174000"]'
    );
    // Producers sanitise to [A-Za-z0-9_-], so the quoted string is closed.
    expect(dealAnchorSelector("a-b_C9")).toBe('[id="deal-a-b_C9"]');
  });
});
