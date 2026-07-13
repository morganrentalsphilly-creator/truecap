import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getPostCheckoutUpsellSuppressionSnapshot,
  setPostCheckoutUpsellSuppression,
  subscribeToPostCheckoutUpsellSuppression,
} from "@/hooks/use-post-checkout-upsell-suppression";

/**
 * The post-checkout upsell suppression signal must FAIL OPEN: with no
 * window (SSR / anything throwing) every read is `false` and no call
 * throws — i.e. upsells behave exactly as they do today.
 */

// Minimal window stand-in: an EventTarget (add/remove/dispatchEvent) that
// also accepts the module's boolean flag property.
function makeFakeWindow(): Window & typeof globalThis {
  return new EventTarget() as unknown as Window & typeof globalThis;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("post-checkout upsell suppression signal", () => {
  it("fails open without a window: snapshot is false and setters don't throw", () => {
    // Node test environment — no `window` global at all.
    expect(getPostCheckoutUpsellSuppressionSnapshot()).toBe(false);
    expect(() => setPostCheckoutUpsellSuppression(true)).not.toThrow();
    // Still false — nothing to write to, so consumers stay unsuppressed.
    expect(getPostCheckoutUpsellSuppressionSnapshot()).toBe(false);
    const unsubscribe = subscribeToPostCheckoutUpsellSuppression(() => {});
    expect(() => unsubscribe()).not.toThrow();
  });

  it("defaults to false (not suppressed) before anything raises it", () => {
    vi.stubGlobal("window", makeFakeWindow());
    expect(getPostCheckoutUpsellSuppressionSnapshot()).toBe(false);
  });

  it("round-trips set(true) → true and set(false) → false", () => {
    vi.stubGlobal("window", makeFakeWindow());
    setPostCheckoutUpsellSuppression(true);
    expect(getPostCheckoutUpsellSuppressionSnapshot()).toBe(true);
    setPostCheckoutUpsellSuppression(false);
    expect(getPostCheckoutUpsellSuppressionSnapshot()).toBe(false);
  });

  it("notifies subscribers on every set, and stops after unsubscribe", () => {
    vi.stubGlobal("window", makeFakeWindow());
    const onChange = vi.fn();
    const unsubscribe = subscribeToPostCheckoutUpsellSuppression(onChange);

    setPostCheckoutUpsellSuppression(true);
    expect(onChange).toHaveBeenCalledTimes(1);
    setPostCheckoutUpsellSuppression(false);
    expect(onChange).toHaveBeenCalledTimes(2);

    unsubscribe();
    setPostCheckoutUpsellSuppression(true);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("treats a non-boolean flag value as not suppressed", () => {
    const fakeWindow = makeFakeWindow();
    vi.stubGlobal("window", fakeWindow);
    (fakeWindow as unknown as Record<string, unknown>).__tcPostCheckoutSuppressUpsells = "yes";
    expect(getPostCheckoutUpsellSuppressionSnapshot()).toBe(false);
  });
});
