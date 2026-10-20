import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The RentCast fetchers reserve their exact request count BEFORE anything
 * leaves, through the real budget module against an in-memory counter. `fetch`
 * is mocked: no test here can reach RentCast.
 */

const fake = vi.hoisted(() => {
  const state = { counters: new Map<string, number>(), failRpc: false };
  const admin = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      if (state.failRpc) return { data: null, error: { message: "boom" } };
      const key = String(args.counter_key);
      const amount = Number(args.amount ?? 1);
      if (name === "increment_app_counter_if_under") {
        const cur = state.counters.get(key);
        if (cur === undefined) {
          state.counters.set(key, amount);
          return { data: amount, error: null };
        }
        if (cur < Number(args.max_value)) {
          state.counters.set(key, cur + amount);
          return { data: cur + amount, error: null };
        }
        return { data: null, error: null };
      }
      const next = Math.max(0, (state.counters.get(key) ?? 0) - amount);
      state.counters.set(key, next);
      return { data: next, error: null };
    },
    from: () => ({
      select: () => ({
        in: async (_c: string, keys: string[]) => ({
          data: keys.filter((k) => state.counters.has(k)).map((k) => ({ key: k, count: state.counters.get(k) })),
          error: null,
        }),
      }),
    }),
  };
  return { state, admin };
});

vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabaseClient: () => fake.admin }));
vi.mock("@sentry/nextjs", () => ({ captureMessage: vi.fn(), captureException: vi.fn() }));
vi.mock("@/lib/posthog-server", () => ({ captureServerEvent: vi.fn(async () => true) }));

import { fetchRentCastEnrichment, fetchRentCastRentEstimate } from "@/lib/property-enrichment/rentcast";

const AVM_VALUE = { price: 300000, priceRangeLow: 280000, priceRangeHigh: 320000, comparables: [] };
const AVM_RENT = { rent: 2100, rentRangeLow: 1900, rentRangeHigh: 2300, comparables: [] };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const fetchSpy = vi.fn();
const now = new Date("2026-11-01T12:00:00Z");
const K_OCT = "rentcast_requests_2026-10-19";

beforeEach(() => {
  fake.state.counters.clear();
  fake.state.failRpc = false;
  fetchSpy.mockReset();
  fetchSpy.mockImplementation(async (url: string) => {
    if (String(url).includes("/avm/value")) return jsonResponse(AVM_VALUE);
    if (String(url).includes("/avm/rent/long-term")) return jsonResponse(AVM_RENT);
    if (String(url).includes("/listings/sale")) return jsonResponse([{ status: "Active", price: 310000 }]);
    return jsonResponse({}, 404);
  });
  vi.stubGlobal("fetch", fetchSpy);
  vi.useFakeTimers({ now, toFake: ["Date"] });
  vi.stubEnv("RENTCAST_API_KEY", "test-key");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const QUERY = { address: "1 Main St, Philadelphia, PA 19103, USA" };

describe("fetchRentCastEnrichment", () => {
  it("reserves 2 requests, sends exactly 2, and reports ok", async () => {
    const r = await fetchRentCastEnrichment(QUERY);
    expect(r.status).toBe("ok");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fake.state.counters.get(K_OCT)).toBe(2);
    for (const call of fetchSpy.mock.calls) expect(String(call[0])).toMatch(/^https:\/\/api\.rentcast\.io\/v1\//);
  });

  it("reserves 3 with includeListing and sends exactly 3", async () => {
    const r = await fetchRentCastEnrichment(QUERY, { includeListing: true });
    expect(r.status).toBe("ok");
    if (r.status !== "ok") throw new Error();
    expect(r.enrichment.listPrice).toBe(310000);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(fake.state.counters.get(K_OCT)).toBe(3);
  });

  it("returns capped and sends NOTHING when the pool is empty", async () => {
    fake.state.counters.set(K_OCT, 50);
    const r = await fetchRentCastEnrichment(QUERY);
    expect(r).toMatchObject({ status: "capped", reason: "cap", resumesAt: "2026-11-21T00:00:00.000Z" });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(fake.state.counters.get(K_OCT)).toBe(50);
  });

  it("at 49 a 2-request enrichment is refused, nothing is sent, and the counter stays 49", async () => {
    fake.state.counters.set(K_OCT, 49);
    const r = await fetchRentCastEnrichment(QUERY);
    expect(r.status).toBe("capped");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(fake.state.counters.get(K_OCT)).toBe(49);
  });

  it("an RPC error means no fetch", async () => {
    fake.state.failRpc = true;
    const r = await fetchRentCastEnrichment(QUERY);
    expect(r).toMatchObject({ status: "capped", reason: "unavailable" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("never refunds after a send: non-200s and empty 200s stay counted", async () => {
    fetchSpy.mockImplementation(async (url: string) =>
      String(url).includes("/avm/value") ? jsonResponse({}, 500) : jsonResponse({})
    );
    const r = await fetchRentCastEnrichment(QUERY);
    expect(r.status).toBe("not_found");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fake.state.counters.get(K_OCT)).toBe(2);
  });

  it("a timeout stays counted too", async () => {
    fetchSpy.mockImplementation(async () => {
      throw Object.assign(new Error("aborted"), { name: "AbortError" });
    });
    const r = await fetchRentCastEnrichment(QUERY);
    expect(r.status).toBe("not_found");
    expect(fake.state.counters.get(K_OCT)).toBe(2);
  });

  it("is dormant without a key and reserves nothing", async () => {
    vi.stubEnv("RENTCAST_API_KEY", "");
    const r = await fetchRentCastEnrichment(QUERY);
    expect(r).toEqual({ status: "not_configured" });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(fake.state.counters.size).toBe(0);
  });
});

describe("fetchRentCastRentEstimate", () => {
  it("reserves and sends exactly 1", async () => {
    const r = await fetchRentCastRentEstimate(QUERY);
    expect(r).toEqual({ status: "ok", rent: 2100 });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fake.state.counters.get(K_OCT)).toBe(1);
  });

  it("returns capped and sends nothing when the pool is empty", async () => {
    fake.state.counters.set(K_OCT, 50);
    const r = await fetchRentCastRentEstimate(QUERY);
    expect(r.status).toBe("capped");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("an empty result is not_found and stays counted", async () => {
    fetchSpy.mockImplementation(async () => jsonResponse({ rent: 0 }));
    const r = await fetchRentCastRentEstimate(QUERY);
    expect(r).toEqual({ status: "not_found" });
    expect(fake.state.counters.get(K_OCT)).toBe(1);
  });
});
