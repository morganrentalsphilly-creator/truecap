import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The RentCast request budget against a faithful in-memory copy of the
 * app_counters RPCs (increment_app_counter_if_under's guard is `count <
 * max_value`, applied atomically per call; decrement floors at 0).
 */

type Row = { key: string; count: number };

const fake = vi.hoisted(() => {
  const state = {
    counters: new Map<string, number>(),
    failRpc: false,
    failSelect: false,
    throwOnCreate: false,
    rpcCalls: [] as Array<{ name: string; args: Record<string, unknown> }>,
  };
  const rpc = async (name: string, args: Record<string, unknown>) => {
    state.rpcCalls.push({ name, args });
    if (state.failRpc) return { data: null, error: { message: "boom" } };
    const key = String(args.counter_key);
    const amount = Number(args.amount ?? 1);
    if (name === "increment_app_counter_if_under") {
      const max = Number(args.max_value);
      const cur = state.counters.get(key);
      if (cur === undefined) {
        state.counters.set(key, amount);
        return { data: amount, error: null };
      }
      if (cur < max) {
        state.counters.set(key, cur + amount);
        return { data: cur + amount, error: null };
      }
      return { data: null, error: null };
    }
    if (name === "decrement_app_counter") {
      const next = Math.max(0, (state.counters.get(key) ?? 0) - amount);
      state.counters.set(key, next);
      return { data: next, error: null };
    }
    return { data: null, error: { message: `unknown rpc ${name}` } };
  };
  const admin = {
    rpc,
    from: () => ({
      select: () => ({
        in: async (_col: string, keys: string[]) => {
          if (state.failSelect) return { data: null, error: { message: "boom" } };
          const data: Row[] = keys
            .filter((k) => state.counters.has(k))
            .map((k) => ({ key: k, count: state.counters.get(k)! }));
          return { data, error: null };
        },
      }),
    }),
  };
  return {
    state,
    admin,
    sentry: vi.fn(),
    posthog: vi.fn(async () => true),
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: () => {
    if (fake.state.throwOnCreate) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
    return fake.admin;
  },
}));
vi.mock("@sentry/nextjs", () => ({ captureMessage: fake.sentry, captureException: vi.fn() }));
vi.mock("@/lib/posthog-server", () => ({ captureServerEvent: fake.posthog }));

import {
  consumeReservedRequest,
  getRentCastBudgetStatus,
  readRentCastRequestCap,
  reserveRentCastRequests,
} from "@/lib/property-enrichment/rentcast-budget";

// Outside any overlap: one active period, key 2026-10-19.
const MID_PERIOD = new Date("2026-11-01T12:00:00Z");
// Inside the 48h overlap after the Oct 19 anchor: two active periods.
const IN_OVERLAP = new Date("2026-10-20T12:00:00Z");
const K_SEP = "rentcast_requests_2026-09-19";
const K_OCT = "rentcast_requests_2026-10-19";

beforeEach(() => {
  fake.state.counters.clear();
  fake.state.rpcCalls.length = 0;
  fake.state.failRpc = false;
  fake.state.failSelect = false;
  fake.state.throwOnCreate = false;
  fake.sentry.mockClear();
  fake.posthog.mockClear();
  vi.unstubAllEnvs();
});
afterEach(() => vi.unstubAllEnvs());

describe("the cap", () => {
  it("defaults to 50 with nothing set, and never goes negative", () => {
    expect(readRentCastRequestCap({})).toBe(50);
    expect(readRentCastRequestCap({ RENTCAST_MONTHLY_REQUEST_CAP: "oops" })).toBe(50);
    expect(readRentCastRequestCap({ RENTCAST_MONTHLY_REQUEST_CAP: "-3" })).toBe(0);
    expect(readRentCastRequestCap({ RENTCAST_MONTHLY_REQUEST_CAP: "1000" })).toBe(1000);
  });
});

describe("sequential reservations", () => {
  it("50 single reservations end at exactly 50, and the 51st is refused", async () => {
    for (let i = 0; i < 50; i += 1) {
      const r = await reserveRentCastRequests(1, { now: MID_PERIOD });
      expect(r.ok, `reservation ${i + 1}`).toBe(true);
    }
    expect(fake.state.counters.get(K_OCT)).toBe(50);
    const refused = await reserveRentCastRequests(1, { now: MID_PERIOD });
    expect(refused).toMatchObject({ ok: false, reason: "cap", resumesAt: "2026-11-21T00:00:00.000Z" });
    expect(fake.state.counters.get(K_OCT)).toBe(50);
  });

  it("only ever passes amount: 1 to the RPC", async () => {
    await reserveRentCastRequests(3, { now: MID_PERIOD });
    const increments = fake.state.rpcCalls.filter((c) => c.name === "increment_app_counter_if_under");
    expect(increments).toHaveLength(3);
    for (const c of increments) expect(c.args.amount).toBe(1);
    expect(fake.state.counters.get(K_OCT)).toBe(3);
  });

  it("a 2-request reservation at 49 is rolled back to 49 and refused (never 51)", async () => {
    fake.state.counters.set(K_OCT, 49);
    const r = await reserveRentCastRequests(2, { now: MID_PERIOD });
    expect(r).toMatchObject({ ok: false, reason: "cap" });
    expect(fake.state.counters.get(K_OCT)).toBe(49);
    const decrements = fake.state.rpcCalls.filter((c) => c.name === "decrement_app_counter");
    expect(decrements).toEqual([{ name: "decrement_app_counter", args: { counter_key: K_OCT, amount: 1 } }]);
  });

  it("a reservation of 0 or a non-integer sends nothing and touches no counter", async () => {
    expect((await reserveRentCastRequests(0, { now: MID_PERIOD })).ok).toBe(true);
    expect((await reserveRentCastRequests(1.5, { now: MID_PERIOD })).ok).toBe(true);
    expect(fake.state.rpcCalls).toHaveLength(0);
  });

  it("a zero cap is paused for the whole period without touching the database", async () => {
    vi.stubEnv("RENTCAST_MONTHLY_REQUEST_CAP", "0");
    const r = await reserveRentCastRequests(1, { now: MID_PERIOD });
    expect(r).toMatchObject({ ok: false, reason: "cap", resumesAt: "2026-11-21T00:00:00.000Z" });
    expect(fake.state.rpcCalls).toHaveLength(0);
  });
});

describe("concurrent reservations", () => {
  it("50 concurrent single reservations end at exactly 50 and the 51st is refused", async () => {
    const results = await Promise.all(
      Array.from({ length: 51 }, () => reserveRentCastRequests(1, { now: MID_PERIOD }))
    );
    expect(results.filter((r) => r.ok)).toHaveLength(50);
    expect(results.filter((r) => !r.ok)).toHaveLength(1);
    expect(fake.state.counters.get(K_OCT)).toBe(50);
  });

  it("concurrent multi-request reservations never push the counter past the cap", async () => {
    const results = await Promise.all(
      Array.from({ length: 40 }, () => reserveRentCastRequests(2, { now: MID_PERIOD }))
    );
    const granted = results.filter((r) => r.ok).length;
    expect(fake.state.counters.get(K_OCT)).toBeLessThanOrEqual(50);
    // Every unit still on the counter belongs to a granted reservation.
    expect(fake.state.counters.get(K_OCT)).toBe(granted * 2);
  });
});

describe("failing closed", () => {
  it("an RPC error returns unavailable and leaves nothing reserved", async () => {
    fake.state.failRpc = true;
    const r = await reserveRentCastRequests(2, { now: MID_PERIOD });
    expect(r).toMatchObject({ ok: false, reason: "unavailable" });
    expect(fake.state.counters.size).toBe(0);
  });

  it("a missing service role returns unavailable without any RPC", async () => {
    fake.state.throwOnCreate = true;
    const r = await reserveRentCastRequests(1, { now: MID_PERIOD });
    expect(r).toMatchObject({ ok: false, reason: "unavailable" });
    expect(fake.state.rpcCalls).toHaveLength(0);
  });

  it("an RPC error on the second request releases the first", async () => {
    let calls = 0;
    const realRpc = fake.admin.rpc;
    const spy = vi.spyOn(fake.admin, "rpc").mockImplementation(async (name, args) => {
      if (name === "increment_app_counter_if_under") {
        calls += 1;
        if (calls === 2) return { data: null, error: { message: "boom" } };
      }
      return realRpc(name, args);
    });
    const r = await reserveRentCastRequests(2, { now: MID_PERIOD });
    expect(r).toMatchObject({ ok: false, reason: "unavailable" });
    expect(fake.state.counters.get(K_OCT)).toBe(0);
    spy.mockRestore();
  });

  it("the read-only status fails closed when the counters cannot be read", async () => {
    fake.state.failSelect = true;
    const s = await getRentCastBudgetStatus(MID_PERIOD);
    expect(s).toMatchObject({ available: false, remaining: 0, reason: "unavailable", resumesOn: "Nov 21" });
  });
});

describe("the overlap window", () => {
  it("a request inside the overlap counts against both periods", async () => {
    const r = await reserveRentCastRequests(2, { now: IN_OVERLAP });
    expect(r.ok).toBe(true);
    expect(fake.state.counters.get(K_SEP)).toBe(2);
    expect(fake.state.counters.get(K_OCT)).toBe(2);
  });

  it("is all-or-nothing across both periods: a full old period refuses and releases the new one", async () => {
    fake.state.counters.set(K_SEP, 50);
    const r = await reserveRentCastRequests(2, { now: IN_OVERLAP });
    expect(r).toMatchObject({ ok: false, reason: "cap" });
    expect(fake.state.counters.get(K_SEP)).toBe(50);
    expect(fake.state.counters.get(K_OCT) ?? 0).toBe(0);
    // Only the old period is exhausted: live comps come back when its overlap ends.
    expect((r as { resumesAt: string }).resumesAt).toBe("2026-10-21T00:00:00.000Z");
  });

  it("a full new period reports the later resume date, releasing what the old period granted", async () => {
    fake.state.counters.set(K_OCT, 50);
    const r = await reserveRentCastRequests(1, { now: IN_OVERLAP });
    expect(r).toMatchObject({ ok: false, reason: "cap", resumesAt: "2026-11-21T00:00:00.000Z" });
    expect(fake.state.counters.get(K_SEP) ?? 0).toBe(0);
  });

  it("the status reports the binding period and both keys", async () => {
    fake.state.counters.set(K_SEP, 48);
    fake.state.counters.set(K_OCT, 3);
    const s = await getRentCastBudgetStatus(IN_OVERLAP);
    expect(s).toMatchObject({ used: 48, cap: 50, remaining: 2, available: true, resumesAt: null, reason: null });
    expect(s.periods.map((p) => p.key)).toEqual([K_SEP, K_OCT]);
  });

  it("the status is paused with the right date when one period is full", async () => {
    fake.state.counters.set(K_SEP, 50);
    const s = await getRentCastBudgetStatus(IN_OVERLAP);
    expect(s).toMatchObject({
      available: false,
      remaining: 0,
      reason: "cap",
      resumesAt: "2026-10-21T00:00:00.000Z",
      resumesOn: "Oct 21",
    });
  });
});

describe("visibility", () => {
  it("reports 80% once and 100% once per period, tagged rentcast-budget, with no user data", async () => {
    for (let i = 0; i < 50; i += 1) await reserveRentCastRequests(1, { now: MID_PERIOD });
    await reserveRentCastRequests(1, { now: MID_PERIOD }); // refused
    await reserveRentCastRequests(1, { now: MID_PERIOD }); // refused again
    const messages = fake.sentry.mock.calls.map((c) => [c[0], c[1]] as const);
    expect(messages).toHaveLength(2);
    expect(messages[0][0]).toMatch(/80%/);
    expect(messages[1][0]).toMatch(/100%/);
    for (const [, opts] of messages) {
      expect((opts as { tags: Record<string, string> }).tags.feature).toBe("rentcast-budget");
      expect(JSON.stringify(opts)).not.toMatch(/address|user/i);
    }
  });

  it("emits data_lookup_capped with aggregate properties when the pool refuses", async () => {
    fake.state.counters.set(K_OCT, 50);
    await reserveRentCastRequests(2, { now: MID_PERIOD, lookupType: "property_comps" });
    expect(fake.posthog).toHaveBeenCalledWith({
      distinctId: "$server",
      event: "data_lookup_capped",
      properties: { provider: "rentcast", lookup_type: "property_comps" },
    });
  });
});

describe("the reservation token", () => {
  it("cannot be spent past its count", async () => {
    const r = await reserveRentCastRequests(2, { now: MID_PERIOD });
    if (!r.ok) throw new Error("expected ok");
    consumeReservedRequest(r.reservation);
    consumeReservedRequest(r.reservation);
    expect(() => consumeReservedRequest(r.reservation)).toThrow(/without a reservation/);
  });
});
