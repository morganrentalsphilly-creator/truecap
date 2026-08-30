import { describe, expect, it } from "vitest";
import { isCurrentDealWorkspaceMutation } from "../deal-workspace-mutation-lifecycle";

describe("deal workspace mutation lifecycle", () => {
  it("accepts only the request that still owns the current deal", () => {
    const token = Symbol("current");
    expect(
      isCurrentDealWorkspaceMutation({
        submittedDealId: "deal-a",
        currentDealId: "deal-a",
        requestToken: token,
        currentRequestToken: token,
      }),
    ).toBe(true);
  });

  it("rejects a completion after a deal switch", () => {
    const token = Symbol("deal-a");
    expect(
      isCurrentDealWorkspaceMutation({
        submittedDealId: "deal-a",
        currentDealId: "deal-b",
        requestToken: token,
        currentRequestToken: token,
      }),
    ).toBe(false);
  });

  it("rejects A to B to A and superseded same-deal completions", () => {
    const stale = Symbol("stale-a");
    const current = Symbol("current-a");
    expect(
      isCurrentDealWorkspaceMutation({
        submittedDealId: "deal-a",
        currentDealId: "deal-a",
        requestToken: stale,
        currentRequestToken: null,
      }),
    ).toBe(false);
    expect(
      isCurrentDealWorkspaceMutation({
        submittedDealId: "deal-a",
        currentDealId: "deal-a",
        requestToken: stale,
        currentRequestToken: current,
      }),
    ).toBe(false);
  });
});
