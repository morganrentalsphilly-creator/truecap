import { describe, expect, it } from "vitest";
import { screenDealForClients } from "@/lib/client-deal-screening";
import { EMPTY_BUY_BOX, type NamedBuyBox } from "@/lib/buy-box";
import { SAMPLE_DEAL_VALUES } from "@/lib/sample-deal";
import { calculateAnalysis } from "@/lib/calc-analysis";
import { evaluateBuyBox, deriveStateFromAddress } from "@/lib/buy-box";

const clients = [{ id: "a", name: "Buyer A", isArchived: false }, { id: "b", name: "Buyer B", isArchived: false }];
const box = (clientId: string, overrides: Partial<NamedBuyBox> = {}): NamedBuyBox => ({
  ...EMPTY_BUY_BOX, id: `box-${clientId}`, clientId, name: `Criteria ${clientId}`,
  strategyKind: null, isDefault: false, sortOrder: 0, minCashFlowMonthly: 200, ...overrides,
});

describe("one property screened for investor clients", () => {
  it("returns independent target-dependent ceilings using canonical financial math", () => {
    const boxes = [box("a", { minCashFlowMonthly: 200 }), box("b", { minCashFlowMonthly: 800 })];
    const rows = screenDealForClients(SAMPLE_DEAL_VALUES, clients, boxes);
    expect(rows).toHaveLength(2);
    expect(rows[0].offerCeiling).toBeGreaterThan(rows[1].offerCeiling!);
    rows.forEach((row, i) => {
      expect(row.offerCeiling).not.toBeNull();
      const values = { ...SAMPLE_DEAL_VALUES, purchasePrice: row.offerCeiling! };
      const a = calculateAnalysis(values);
      const fit = evaluateBuyBox(boxes[i], {
        purchasePrice: values.purchasePrice, propertyType: values.propertyType,
        state: deriveStateFromAddress(values.address), isCashPurchase: false,
        capRatePct: a.capRate, cocPct: a.cocReturn, dscr: a.dscr, cashFlowMonthly: a.netCashFlow,
      });
      expect(fit.passes).toBe(true);
    });
  });
  it("does not offer a price for the wrong market or missing selected market", () => {
    const boxes = [box("a", { targetStates: ["TX"] })];
    const [wrong] = screenDealForClients(SAMPLE_DEAL_VALUES, clients.slice(0, 1), boxes);
    expect(wrong.status).toBe("misses");
    expect(wrong.offerCeiling).toBeNull();
    const [unknown] = screenDealForClients({ ...SAMPLE_DEAL_VALUES, address: "Unknown market" }, clients.slice(0, 1), boxes);
    expect(unknown.offerCeiling).toBeNull();
    expect(unknown.ceilingExplanation).toContain("Verify market");
  });
  it("keeps conflicting boxes visible and ignores agent-owned and other-client boxes", () => {
    const rows = screenDealForClients(SAMPLE_DEAL_VALUES, clients, [
      box("a"), box("a", { id: "strict", minCashFlowMonthly: 999999 }),
      box("other"), box("a", { id: "personal", clientId: null }),
    ]);
    expect(rows.filter((row) => row.clientId === "a")).toHaveLength(2);
    expect(rows.find((row) => row.buyBoxId === "strict")?.offerCeiling).toBeNull();
    expect(rows.find((row) => row.clientId === "b")?.status).toBe("no-criteria");
    expect(rows.some((row) => row.buyBoxId === "personal")).toBe(false);
  });
  it("excludes archived clients and does not mutate snapshots or boxes", () => {
    const boxes = [box("a")];
    const before = JSON.stringify({ values: SAMPLE_DEAL_VALUES, boxes });
    expect(screenDealForClients(SAMPLE_DEAL_VALUES, [{ ...clients[0], isArchived: true }], boxes)).toEqual([]);
    screenDealForClients(SAMPLE_DEAL_VALUES, clients, boxes);
    expect(JSON.stringify({ values: SAMPLE_DEAL_VALUES, boxes })).toBe(before);
  });
});
