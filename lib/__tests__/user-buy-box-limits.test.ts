import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ features: ["buy_box"] as string[], count: 0, inserts: 0 }));
vi.mock("@/lib/entitlements", () => ({
  requireVerifiedEntitlements: async () => ({ ok: true, entitlements: { features: state.features } }),
  hasPaidPlanSubscription: async () => true,
  hasPlanFeature: (e: { features: string[] }, feature: string) => e.features.includes(feature),
}));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: async () => ({
  auth: { getUser: async () => ({ data: { user: { id: "owner" } } }) },
  from: () => {
    const query: Record<string, unknown> = new Proxy({}, { get: (_, method) => {
      if (method === "insert") return () => { state.inserts++; throw new Error("insert reached"); };
      if (method === "update") return () => { throw new Error("update reached"); };
      if (method === "then") {
        const p = Promise.resolve({ data: Array.from({ length: state.count }, (_, i) => ({
          id: `box-${i}`, name: `Box ${i}`, is_default: i === 0, is_active: true,
          property_types: [], target_states: [], sort_order: i,
        })), error: null });
        return p.then.bind(p);
      }
      return () => query;
    }});
    return query;
  },
}) }));
import { upsertBuyBoxAction } from "@/app/actions/user-buy-boxes";
import { buyBoxLimitForFeatures } from "@/lib/commercial-limits";

beforeEach(() => Object.assign(state, { features: ["buy_box"], count: 12, inserts: 0 }));
describe("verified plan Buy Box allowances", () => {
  it("keeps ordinary Pro at 12 and grants Agent Pro 100", () => {
    expect(buyBoxLimitForFeatures(["buy_box"])).toBe(12);
    expect(buyBoxLimitForFeatures(["buy_box", "client_buy_box"])).toBe(100);
  });
  it("rejects a thirteenth Pro box before any write", async () => {
    expect(await upsertBuyBoxAction({ name: "Another" })).toMatchObject({ ok: false, code: "LIMIT_REACHED" });
    expect(state.inserts).toBe(0);
  });
  it.each([12, 99])("lets verified Agent Pro create above the old cap at %i existing boxes", async count => {
    state.features.push("client_buy_box"); state.count = count;
    await expect(upsertBuyBoxAction({ name: "Another" })).rejects.toThrow("insert reached");
    expect(state.inserts).toBe(1);
  });
  it("rejects box 101 before any write", async () => {
    state.features.push("client_buy_box"); state.count = 100;
    expect(await upsertBuyBoxAction({ name: "Another" })).toMatchObject({ ok: false, code: "LIMIT_REACHED" });
    expect(state.inserts).toBe(0);
  });
  it("still permits editing existing boxes when a downgraded account exceeds its limit", async () => {
    state.count = 100;
    await expect(upsertBuyBoxAction({ id: "11111111-1111-4111-8111-111111111111", name: "Updated" })).rejects.toThrow("update reached");
  });
  it("rejects caller-supplied allowance overrides", async () => {
    expect(await upsertBuyBoxAction({ name: "Another", buyBoxLimit: 100 })).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
    expect(state.inserts).toBe(0);
  });
});
