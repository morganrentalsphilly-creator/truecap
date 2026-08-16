import { describe, expect, it } from "vitest";
import { evaluateAgentClientMatches } from "@/lib/agent-client-matching";
import {
  EMPTY_BUY_BOX,
  type BuyBoxDealMetrics,
  type NamedBuyBox,
} from "@/lib/buy-box";
import { resolveFeatureFlags } from "@/lib/feature-flags";

const deal: BuyBoxDealMetrics = {
  capRatePct: 7,
  cocPct: 9,
  dscr: 1.35,
  cashFlowMonthly: 300,
  purchasePrice: 250_000,
  propertyType: "single-family",
  state: "PA",
  isCashPurchase: false,
};

const enabled = resolveFeatureFlags({ agent_client_matching: true });

function clientBox(
  id: string,
  clientId: string | null,
  criteria: Partial<NamedBuyBox>
): NamedBuyBox {
  return {
    ...EMPTY_BUY_BOX,
    id,
    name: id,
    strategyKind: null,
    isDefault: false,
    sortOrder: 0,
    clientId,
    ...criteria,
  };
}

describe("evaluateAgentClientMatches", () => {
  it("fails closed while the rollout flag is off", () => {
    const boxes = [clientBox("box-a", "client-a", { minCapRatePct: 6 })];

    expect(evaluateAgentClientMatches(deal, boxes)).toEqual([]);
    expect(
      evaluateAgentClientMatches(
        deal,
        boxes,
        resolveFeatureFlags({ agent_client_matching: false })
      )
    ).toEqual([]);
  });

  it("ranks exact matches ahead of transparent partial matches", () => {
    const results = evaluateAgentClientMatches(
      deal,
      [
        clientBox("partial-box", "client-partial", {
          minCapRatePct: 8,
          minCashFlowMonthly: 200,
        }),
        clientBox("match-box", "client-match", {
          minCapRatePct: 6,
          minDscr: 1.25,
        }),
      ],
      enabled
    );

    expect(results.map((result) => result.clientId)).toEqual([
      "client-match",
      "client-partial",
    ]);
    expect(results[0]).toMatchObject({
      status: "match",
      matchedCheckCount: 2,
      failedCheckCount: 0,
    });
    expect(results[1]).toMatchObject({
      status: "partial",
      matchedCheckCount: 1,
      failedCheckCount: 1,
      failedLabels: ["Cap rate"],
    });
  });

  it("returns only the best Buy Box for each client", () => {
    const results = evaluateAgentClientMatches(
      deal,
      [
        clientBox("miss", "client-a", { targetStates: ["TX"] }),
        clientBox("pass", "client-a", { targetStates: ["PA"] }),
      ],
      enabled
    );

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      clientId: "client-a",
      buyBoxId: "pass",
      status: "match",
    });
  });

  it("ignores agent-owned boxes because they cannot distinguish clients", () => {
    const results = evaluateAgentClientMatches(
      deal,
      [
        clientBox("agent-box", null, { minCapRatePct: 6 }),
        clientBox("client-box", "client-a", { minCapRatePct: 6 }),
      ],
      enabled
    );

    expect(results.map((result) => result.buyBoxId)).toEqual(["client-box"]);
  });

  it("does not turn unreadable metrics into a false pass", () => {
    const results = evaluateAgentClientMatches(
      { ...deal, capRatePct: null },
      [clientBox("unknown", "client-a", { minCapRatePct: 6 })],
      enabled
    );

    expect(results[0]).toMatchObject({
      status: "insufficient-data",
      matchedCheckCount: 0,
      failedCheckCount: 0,
      skippedCheckCount: 1,
    });
  });

  it("is deterministic when results have identical check counts", () => {
    const results = evaluateAgentClientMatches(
      deal,
      [
        clientBox("box-z", "client-z", { minCapRatePct: 6 }),
        clientBox("box-a", "client-a", { minCapRatePct: 6 }),
      ],
      enabled
    );

    expect(results.map((result) => result.clientId)).toEqual(["client-a", "client-z"]);
  });
});
