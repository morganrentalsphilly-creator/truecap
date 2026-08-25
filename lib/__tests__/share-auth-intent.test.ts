import { describe, expect, it } from "vitest";

import {
  parseShareAuthIntent,
  serializeShareAuthIntent,
} from "@/lib/share-auth-intent";

describe("share authentication intent", () => {
  it("restores a recent same-route intent without storing deal data", () => {
    const raw = serializeShareAuthIntent({
      returnPath: "/dashboard/new",
      context: "analysis",
      now: 1_000,
    });

    expect(raw).not.toMatch(/address|purchasePrice|rent|email/i);
    expect(
      parseShareAuthIntent(raw, {
        currentPath: "/dashboard/new",
        now: 2_000,
      })
    ).toEqual({ context: "analysis" });
  });

  it("fails closed for another route, an expired intent, or malformed data", () => {
    const raw = serializeShareAuthIntent({
      returnPath: "/",
      context: "analysis",
      now: 1_000,
    });

    expect(parseShareAuthIntent(raw, { currentPath: "/dashboard", now: 2_000 })).toBeNull();
    expect(parseShareAuthIntent(raw, { currentPath: "/", now: 1_000 + 30 * 60_000 + 1 })).toBeNull();
    expect(parseShareAuthIntent("not-json", { currentPath: "/", now: 2_000 })).toBeNull();
  });

  it("rejects unsafe return paths", () => {
    expect(() =>
      serializeShareAuthIntent({
        returnPath: "//attacker.example",
        context: "analysis",
        now: 1_000,
      })
    ).toThrow("safe local path");
  });
});
