import { describe, expect, it } from "vitest";
import { resolveBuyBoxAuthorizedDealIds } from "@/lib/buy-box-evaluation-access";
import { buildEvaluationDealResourceKey } from "@/lib/evaluation-resource-key";
import { SAMPLE_DEAL_VALUES } from "@/lib/sample-deal";

const deals = [1, 2, 3, 4].map((number) => ({
  id: `deal-${number}`,
  values: {
    ...SAMPLE_DEAL_VALUES,
    purchasePrice: SAMPLE_DEAL_VALUES.purchasePrice + number * 1_000,
  },
}));
const firstThreeKeys = new Set(
  deals.slice(0, 3).flatMap((deal) => {
    const key = buildEvaluationDealResourceKey(deal.values);
    return key ? [key] : [];
  }),
);

describe("Buy Box evaluation resource authorization", () => {
  it("allows the three exact metered deals and rejects a fourth saved core deal", () => {
    const authorized = resolveBuyBoxAuthorizedDealIds({
      hasPaidAccess: false,
      evaluationActive: true,
      meteredResourceKeys: firstThreeKeys,
      deals,
    });
    expect([...authorized]).toEqual(["deal-1", "deal-2", "deal-3"]);
    expect(authorized.has("deal-4")).toBe(false);
  });

  it("fails every evaluation resource closed after the 21-day window", () => {
    const authorized = resolveBuyBoxAuthorizedDealIds({
      hasPaidAccess: false,
      evaluationActive: false,
      meteredResourceKeys: firstThreeKeys,
      deals,
    });
    expect(authorized.size).toBe(0);
  });

  it("lets paid users evaluate all deals without consulting evaluation usage", () => {
    const authorized = resolveBuyBoxAuthorizedDealIds({
      hasPaidAccess: true,
      evaluationActive: false,
      meteredResourceKeys: new Set(),
      deals,
    });
    expect([...authorized]).toEqual(["deal-1", "deal-2", "deal-3", "deal-4"]);
  });
});
