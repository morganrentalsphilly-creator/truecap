import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A dialog must be the authority on its own width.
 *
 * shadcn's DialogContent is `display: grid`. A grid item defaults to
 * `min-width: auto`, so any single child that cannot shrink — a list of long
 * addresses, a wide table, an unbroken URL — sizes the implicit column to ITS
 * min-content, and every sibling stretches to match.
 *
 * Measured in production on 2026-08-28: the share dialog's "Manage all share
 * links" panel had a 597px min-content width inside a 453px dialog. Result: a
 * horizontal scrollbar INSIDE the modal, the "Lender review" option clipped to
 * "Lend…", and the primary "Create secure link" button running past the edge —
 * at 390px, 1100px AND 1500px. Every other child was ≤176px; one child did all
 * the damage, and it happened on a paid feature that is also the growth loop.
 *
 * Two independent protections, pinned here because neither is self-evident to
 * someone editing a dialog later:
 *   1. the shared DialogContent caps its column at minmax(0,1fr)
 *   2. the share-links panel can shrink, so its `truncate` actually applies
 *
 * This is the same fixed-width containment family that has bitten this
 * codebase before (popover overflow, clipped header row, invalid grid comma).
 */

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("dialogs cannot be widened by a single unshrinkable child", () => {
  it("DialogContent pins its grid column so no child can size it", () => {
    const dialog = read("components/ui/dialog.tsx");

    // It is still a grid — if that changes the rationale below needs revisiting.
    expect(dialog).toMatch(/\bgrid\b/);
    expect(
      dialog,
      "DialogContent lost grid-cols-[minmax(0,1fr)] — a wide child can size the dialog again",
    ).toContain("grid-cols-[minmax(0,1fr)]");
  });

  it("the share-links panel is allowed to shrink so its truncation works", () => {
    const share = read("components/investcalc/share-link-button.tsx");
    const panel = share.slice(
      share.indexOf("Manage all share links") - 700,
      share.indexOf("Manage all share links"),
    );
    expect(
      panel,
      "the share-links panel wrapper lost min-w-0; its truncate will stop working and it will size the dialog",
    ).toContain("min-w-0");
  });

  it("the share-link rows still truncate rather than wrap forever", () => {
    const share = read("components/investcalc/share-link-button.tsx");
    // The row label chain relies on min-w-0 + truncate together.
    expect(share).toContain("min-w-0 flex-1 truncate");
  });
});
