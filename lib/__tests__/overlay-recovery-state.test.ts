import { describe, expect, it } from "vitest";
import { isLiveOverlayState } from "@/components/ui/overlay-recovery";

/**
 * The freeze safety net only clears a stranded body lock when nothing is
 * actually open. Deciding that hinges on Radix's `data-state` vocabulary:
 * treating a closed layer as open disarms the net (the bug this replaced —
 * a popper wrapper stays mounted forever after it closes), and treating an
 * open layer as closed would rip the lock out from under a live dialog.
 */
describe("isLiveOverlayState", () => {
  it("counts every Radix open-ish state as live", () => {
    // Tooltips report delayed-open / instant-open, never plain "open".
    expect(isLiveOverlayState("open")).toBe(true);
    expect(isLiveOverlayState("delayed-open")).toBe(true);
    expect(isLiveOverlayState("instant-open")).toBe(true);
  });

  it("does not count a closed layer as live", () => {
    expect(isLiveOverlayState("closed")).toBe(false);
  });

  it("does not count a missing or unknown state as live", () => {
    expect(isLiveOverlayState(null)).toBe(false);
    expect(isLiveOverlayState(undefined)).toBe(false);
    expect(isLiveOverlayState("")).toBe(false);
    expect(isLiveOverlayState("checked")).toBe(false);
  });
});
