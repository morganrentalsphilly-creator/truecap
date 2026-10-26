import { beforeEach, describe, expect, it, vi } from "vitest";
import { UNDERWRITING_V1_GOLDEN_CORPUS } from "./fixtures/underwriting-v1-golden-corpus";
import { buildEvaluationDealResourceKey, buildEvaluationPropertyResourceKey } from "@/lib/evaluation-resource-key";

const state = vi.hoisted(() => ({
  user: "owner", paid: false, active: true, readError: false, writeError: false,
  keys: new Set<string>(), saved: [] as unknown[], updates: [] as unknown[], rpcCalls: 0,
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/entitlements", () => ({ hasPaidPlanSubscription: async () => state.paid }));
vi.mock("@/lib/posthog-server", () => ({ captureServerEvent: vi.fn() }));
vi.mock("@/lib/anonymous-decision-grant", () => ({ activeAnonymousDecisionGrantMatches: async () => false }));
vi.mock("@/lib/funnel-flags", () => ({ isFunnelFlagOn: () => false }));

function database(admin = false) {
  return {
    auth: { getUser: async () => ({ data: { user: state.user ? { id: state.user } : null } }) },
    from(table: string) {
      const filters = new Map<string, unknown>();
      let update: { resource_key: string } | null = null;
      const result = () => {
        if (filters.get("user_id") !== "owner") return { data: null, error: null };
        if (update) {
          expect(admin).toBe(true);
          expect(filters.get("kind")).toBe("deal");
          state.updates.push([...filters]);
          if (state.writeError) return { data: null, error: { code: "XX000" } };
          const previous = filters.get("resource_key") as string;
          if (state.keys.delete(previous)) state.keys.add(update.resource_key);
          return { data: [], error: null };
        }
        if (state.readError) return { data: null, error: { message: "unavailable" } };
        if (table === "product_evaluations") return { data: state.active ? { expires_at: "2099-01-01" } : null, error: null };
        if (table === "product_evaluation_usage") return { data: [...state.keys].map(resource_key => ({ resource_key })), error: null };
        if (table === "saved_analyses") return { data: state.saved, error: null };
        throw new Error(table);
      };
      const query: Record<string, unknown> = new Proxy({}, {
        get: (_, method) => {
          if (method === "then") { const promise = Promise.resolve(result()); return promise.then.bind(promise); }
          return (...args: unknown[]) => {
            if (method === "eq") filters.set(args[0] as string, args[1]);
            if (method === "update") update = args[0] as { resource_key: string };
            return query;
          };
        },
      });
      return query;
    },
    async rpc(_name: string, args: { p_resource_key: string }) {
      state.rpcCalls++;
      const key = args.p_resource_key;
      const existing = state.keys.has(key);
      if (!existing && state.keys.size >= 3) return { data: { accepted: false, reason: "deal_limit_reached" }, error: null };
      state.keys.add(key);
      return { data: { accepted: true, deals_used: state.keys.size, was_new_usage: !existing }, error: null };
    },
  };
}
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: async () => database() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabaseClient: () => database(true) }));
import { consumeProductEvaluationUsageAction } from "@/app/actions/product-evaluation";
import { activeMeteredEvaluationDealGrantsAccess } from "@/lib/evaluation-access-server";
import type { SupabaseClient } from "@supabase/supabase-js";
const base = { ...UNDERWRITING_V1_GOLDEN_CORPUS[0]!.values, address: "100 Main St, Philadelphia, PA 19103" };
const consume = (values = base) => consumeProductEvaluationUsageAction({ kind: "deal", values });
const canRead = (values = base) => activeMeteredEvaluationDealGrantsAccess(database() as unknown as SupabaseClient, "owner", values);
beforeEach(() => { Object.assign(state, { user: "owner", paid: false, active: true, readError: false, writeError: false, saved: [], updates: [], rpcCalls: 0 }); state.keys.clear(); });
describe("property trial metering and artifact authorization", () => {
  it("counts revisions once, retains access at the limit, and rejects a fourth property", async () => {
    expect(await consume()).toMatchObject({ ok: true, dealsUsed: 1, wasNewUsage: true });
    await consume({ ...base, address: "200 Main St, Philadelphia, PA 19103" });
    await consume({ ...base, address: "300 Main St, Philadelphia, PA 19103" });
    const revised = { ...base, purchasePrice: base.purchasePrice + 1000, monthlyRent: 2200 };
    expect(await consume(revised)).toMatchObject({ ok: true, dealsUsed: 3, wasNewUsage: false });
    expect(await canRead(revised)).toBe(true);
    const fourth = { ...base, address: "400 Main St, Philadelphia, PA 19103" };
    expect(await canRead(fourth)).toBe(false);
    expect(await consume(fourth)).toMatchObject({ ok: false, code: "LIMIT_REACHED" });
  });
  it("promotes an owned legacy snapshot without inserting a credit or losing access after its saved inputs change", async () => {
    const exact = buildEvaluationDealResourceKey(base)!;
    state.keys.add(exact); state.saved = [{ form_snapshot: base }];
    const revised = { ...base, purchasePrice: base.purchasePrice + 1000 };
    expect(await canRead(revised)).toBe(false);
    expect(await consume(revised)).toMatchObject({ ok: true, dealsUsed: 1, wasNewUsage: false });
    state.saved = [{ form_snapshot: revised }];
    expect(state.keys).toEqual(new Set([buildEvaluationPropertyResourceKey(base)]));
    expect(await canRead(revised)).toBe(true);
    expect(await canRead(base)).toBe(true);
  });
  it("keeps an unsaved legacy exact result valid and promotes only that verified property", async () => {
    state.keys.add(buildEvaluationDealResourceKey(base)!);
    expect(await canRead()).toBe(true);
    expect(await consume()).toMatchObject({ ok: true, dealsUsed: 1, wasNewUsage: false });
    expect(state.updates.length).toBeGreaterThan(0);
  });
  it("does not debit when a ledger read or legacy promotion fails", async () => {
    state.readError = true;
    expect(await consume()).toMatchObject({ ok: false });
    expect(state.rpcCalls).toBe(0);
    state.readError = false; state.writeError = true;
    state.keys.add(buildEvaluationDealResourceKey(base)!);
    expect(await consume()).toMatchObject({ ok: false });
    expect(state.rpcCalls).toBe(0); expect(state.keys.size).toBe(1);
  });
  it("fails closed on expiry and unauthenticated calls; paid users bypass trial metering", async () => {
    state.keys.add(buildEvaluationPropertyResourceKey(base)!); state.active = false;
    expect(await canRead()).toBe(false); expect(await consume()).toMatchObject({ ok: false });
    state.user = ""; expect(await consume()).toMatchObject({ ok: false, code: "SIGN_IN_REQUIRED" });
    state.user = "owner"; state.paid = true;
    expect(await consume()).toMatchObject({ ok: true, access: "paid" });
    expect(state.rpcCalls).toBe(0);
  });
});
