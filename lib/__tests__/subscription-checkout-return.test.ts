import { describe, expect, it } from "vitest";
import {
  consumeSubscriptionCheckoutReturn,
  SUBSCRIPTION_CHECKOUT_RETURN_KEY,
  subscriptionCheckoutReturnBootstrapScript,
} from "@/lib/subscription-checkout-return";

function storage(initial: string | null = null): Storage {
  let value = initial;
  return {
    getItem: () => value,
    setItem: (_key, next) => {
      value = next;
    },
    removeItem: () => {
      value = null;
    },
    clear: () => {
      value = null;
    },
    key: () => null,
    get length() {
      return value == null ? 0 : 1;
    },
  };
}

describe("subscription checkout return", () => {
  it("strips the Checkout Session before measurement scripts run", () => {
    const script = subscriptionCheckoutReturnBootstrapScript();
    expect(script).toContain("u.searchParams.delete('session_id')");
    expect(script).toContain("window.history.replaceState");
    expect(script).toContain(SUBSCRIPTION_CHECKOUT_RETURN_KEY);
    expect(script).toContain("u.pathname!=='/'");
  });

  it("consumes the captured return once", () => {
    const state = {
      v: 1 as const,
      billing: "success" as const,
      sessionId: "cs_test_private",
      capturedAt: 1_000,
    };
    const target = {
      sessionStorage: storage(),
      __truecapSubscriptionCheckoutReturn: state,
    };
    expect(consumeSubscriptionCheckoutReturn(target, 1_001)).toEqual(state);
    expect(consumeSubscriptionCheckoutReturn(target, 1_001)).toBeNull();
  });

  it("rejects a stale stored return", () => {
    const target = {
      sessionStorage: storage(
        JSON.stringify({
          v: 1,
          billing: "success",
          sessionId: "cs_test_stale",
          capturedAt: 1,
        })
      ),
    };
    expect(consumeSubscriptionCheckoutReturn(target, 31 * 60 * 1000)).toBeNull();
  });
});
