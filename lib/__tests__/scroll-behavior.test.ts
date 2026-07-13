import { describe, it, expect, afterEach, vi } from "vitest";
import { scrollBehavior } from "@/lib/utils";

/**
 * Locks the reduced-motion contract for programmatic scrolls: the global CSS
 * rule (app/globals.css) can't reach an explicit `behavior: "smooth"` passed
 * to scrollTo/scrollIntoView, so every JS scroll call site routes through
 * scrollBehavior() instead. These tests pin its three branches so a refactor
 * can't silently reintroduce animated scrolls for reduced-motion users.
 */

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal("window", {
    matchMedia: vi.fn().mockReturnValue({ matches }),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("scrollBehavior", () => {
  it('returns "smooth" when the user has no reduced-motion preference', () => {
    stubMatchMedia(false);
    expect(scrollBehavior()).toBe("smooth");
  });

  it('returns "auto" when prefers-reduced-motion is set (WCAG 2.3.3)', () => {
    stubMatchMedia(true);
    expect(scrollBehavior()).toBe("auto");
  });

  it("queries the standard prefers-reduced-motion media feature", () => {
    stubMatchMedia(false);
    scrollBehavior();
    expect(window.matchMedia).toHaveBeenCalledWith(
      "(prefers-reduced-motion: reduce)"
    );
  });

  it('falls back to the non-animated "auto" without window (SSR)', () => {
    // Node test env has no window global by default.
    expect(typeof window).toBe("undefined");
    expect(scrollBehavior()).toBe("auto");
  });

  it('falls back to "auto" when matchMedia is unavailable', () => {
    vi.stubGlobal("window", {});
    expect(scrollBehavior()).toBe("auto");
  });
});
