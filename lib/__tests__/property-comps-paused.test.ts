import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * getPropertyCompsAction while the shared RentCast pool is paused:
 *  - a cached row is served regardless of age,
 *  - a free user's one lookup is never claimed,
 *  - CAP_REACHED carries the day live comps are back,
 *  - a pool refusal AFTER the freebie was claimed (a race) hands it back,
 *  - the auto-pull on save is refused before any work unless switched on.
 * Every provider and database boundary is mocked; nothing here can spend.
 */

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  isPaid: vi.fn(),
  budget: vi.fn(),
  fetchEnrichment: vi.fn(),
  posthog: vi.fn(async () => true),
  sentry: vi.fn(),
  state: {
    cacheRow: null as null | { payload: Record<string, unknown>; fetched_at: string },
    compsFreeUsed: false,
    profileUpdates: [] as Array<Record<string, unknown>>,
    rpcCalls: [] as Array<{ name: string; args: Record<string, unknown> }>,
    rpcResult: { data: 1 as number | null, error: null as null | { message: string } },
    upserts: [] as Array<{ table: string; row: Record<string, unknown> }>,
  },
}));

vi.mock("@sentry/nextjs", () => ({ captureMessage: mocks.sentry, captureException: vi.fn() }));
vi.mock("@/lib/posthog-server", () => ({ captureServerEvent: mocks.posthog }));
vi.mock("@/lib/entitlements", () => ({ hasPaidPlanSubscription: mocks.isPaid }));
vi.mock("@/lib/property-enrichment/rentcast", () => ({ fetchRentCastEnrichment: mocks.fetchEnrichment }));
vi.mock("@/lib/property-enrichment/rentcast-budget", async () => {
  const period = await vi.importActual<typeof import("@/lib/property-enrichment/rentcast-billing-period")>(
    "@/lib/property-enrichment/rentcast-billing-period"
  );
  return {
    getRentCastBudgetStatus: mocks.budget,
    formatResumesOn: period.formatResumesOn,
    currentRentCastPeriod: () =>
      period.currentPeriodAt(new Date("2026-11-01T12:00:00Z"), { anchorDay: 19, overlapHours: 48 }),
  };
});
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({
    auth: { getUser: mocks.user },
    from: () => {
      const q = {
        select: () => q,
        eq: () => q,
        maybeSingle: async () => ({ data: { comps_free_used: mocks.state.compsFreeUsed }, error: null }),
      };
      return q;
    },
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: () => ({
    rpc: async (name: string, args: Record<string, unknown>) => {
      mocks.state.rpcCalls.push({ name, args });
      return mocks.state.rpcResult;
    },
    from: (table: string) => {
      const calls: Array<[string, unknown[]]> = [];
      const resolve = () => {
        const op = calls[0]?.[0];
        if (table === "property_enrichment_cache" && op === "select") {
          return { data: mocks.state.cacheRow, error: null };
        }
        if (table === "profiles" && op === "update") {
          const row = calls[0][1][0] as Record<string, unknown>;
          mocks.state.profileUpdates.push(row);
          // The conditional claim succeeds only while the freebie is unused.
          if (row.comps_free_used === true) {
            if (mocks.state.compsFreeUsed) return { data: null, error: null };
            mocks.state.compsFreeUsed = true;
            return { data: { id: "user-1" }, error: null };
          }
          mocks.state.compsFreeUsed = false;
          return { data: { id: "user-1" }, error: null };
        }
        if (op === "upsert") {
          mocks.state.upserts.push({ table, row: calls[0][1][0] as Record<string, unknown> });
          return { data: null, error: null };
        }
        return { data: null, error: null };
      };
      const q: Record<string, unknown> = new Proxy({} as Record<string, unknown>, {
        get(_t, prop) {
          if (prop === "then") {
            const p = Promise.resolve(resolve());
            return p.then.bind(p);
          }
          return (...args: unknown[]) => {
            calls.push([String(prop), args]);
            return q;
          };
        },
      });
      return q;
    },
  }),
}));

import { getCompsAvailabilityAction, getPropertyCompsAction } from "@/app/actions/property-comps";

const PAUSED = {
  used: 50,
  cap: 50,
  remaining: 0,
  available: false,
  resumesAt: "2026-11-21T00:00:00.000Z",
  resumesOn: "Nov 21",
  reason: "cap" as const,
  periods: [],
};
const OPEN = { ...PAUSED, used: 10, remaining: 40, available: true, resumesAt: null, resumesOn: null, reason: null };
const INPUT = { address: "1 Main St, Philadelphia, PA 19103", propertyType: "single-family" as const };
const OLD_PAYLOAD = {
  facts: null,
  valueEstimate: 250000,
  valueRange: null,
  saleComps: [],
  rentEstimate: 1800,
  rentRange: null,
  rentComps: [],
  fetchedAt: "2026-06-03T10:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue({ data: { user: { id: "user-1" } } });
  mocks.isPaid.mockResolvedValue(false);
  mocks.budget.mockResolvedValue(PAUSED);
  mocks.state.cacheRow = null;
  mocks.state.compsFreeUsed = false;
  mocks.state.profileUpdates = [];
  mocks.state.rpcCalls = [];
  mocks.state.rpcResult = { data: 1, error: null };
  mocks.state.upserts = [];
  vi.stubEnv("RENTCAST_API_KEY", "test-key");
  vi.stubEnv("RENTCAST_AUTOPULL_ON_SAVE", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("when the pool is paused", () => {
  it("serves a cached row regardless of age and exposes when it was pulled", async () => {
    mocks.state.cacheRow = { payload: OLD_PAYLOAD, fetched_at: "2026-06-03T10:00:00.000Z" };
    const r = await getPropertyCompsAction(INPUT);
    expect(r).toMatchObject({ ok: true, source: "cache", fetchedAt: "2026-06-03T10:00:00.000Z" });
    expect(mocks.fetchEnrichment).not.toHaveBeenCalled();
    expect(mocks.state.compsFreeUsed).toBe(false);
  });

  it("a free user's one lookup is untouched and the result says when comps are back", async () => {
    const r = await getPropertyCompsAction(INPUT);
    expect(r).toEqual({
      ok: false,
      code: "CAP_REACHED",
      message:
        "Your analysis still runs. Enter beds, baths and price yourself, or use comps already pulled for this address.",
      resumesOn: "Nov 21",
      resumesAt: "2026-11-21T00:00:00.000Z",
    });
    expect(mocks.state.profileUpdates).toEqual([]);
    expect(mocks.state.compsFreeUsed).toBe(false);
    expect(mocks.fetchEnrichment).not.toHaveBeenCalled();
    expect(mocks.state.rpcCalls).toEqual([]);
  });

  it("a Pro user's per-period unit is never reserved", async () => {
    mocks.isPaid.mockResolvedValue(true);
    const r = await getPropertyCompsAction(INPUT);
    expect(r).toMatchObject({ ok: false, code: "CAP_REACHED", resumesOn: "Nov 21" });
    expect(mocks.state.rpcCalls).toEqual([]);
  });

  it("the paused copy never says error, failed, quota, API or RentCast limit", async () => {
    const r = await getPropertyCompsAction(INPUT);
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r)).not.toMatch(/error|failed|quota|\bAPI\b|RentCast limit/i);
  });

  it("an unreadable counter with no cache is a plain retry, not a paused date", async () => {
    mocks.budget.mockResolvedValue({ ...PAUSED, reason: "unavailable" });
    const r = await getPropertyCompsAction(INPUT);
    expect(r).toMatchObject({ ok: false, code: "SERVER_ERROR" });
    expect(mocks.fetchEnrichment).not.toHaveBeenCalled();
    expect(mocks.state.compsFreeUsed).toBe(false);
  });
});

describe("the capped race", () => {
  it("gives a free user's freebie back when the pool refuses after it was claimed", async () => {
    mocks.budget.mockResolvedValue(OPEN);
    mocks.fetchEnrichment.mockResolvedValue({
      status: "capped",
      reason: "cap",
      resumesAt: "2026-11-21T00:00:00.000Z",
    });
    const r = await getPropertyCompsAction(INPUT);
    expect(r).toMatchObject({ ok: false, code: "CAP_REACHED", resumesOn: "Nov 21" });
    // Claimed, then returned unconditionally (no miss-allowance RPC involved).
    expect(mocks.state.profileUpdates).toEqual([{ comps_free_used: true }, { comps_free_used: false }]);
    expect(mocks.state.compsFreeUsed).toBe(false);
    expect(mocks.state.rpcCalls.filter((c) => String(c.args.counter_key).startsWith("comps_miss_"))).toEqual([]);
  });

  it("releases a Pro user's per-period unit when the pool refuses", async () => {
    mocks.isPaid.mockResolvedValue(true);
    mocks.budget.mockResolvedValue(OPEN);
    mocks.fetchEnrichment.mockResolvedValue({
      status: "capped",
      reason: "cap",
      resumesAt: "2026-11-21T00:00:00.000Z",
    });
    const r = await getPropertyCompsAction(INPUT);
    expect(r).toMatchObject({ ok: false, code: "CAP_REACHED" });
    expect(mocks.state.rpcCalls.map((c) => c.name)).toEqual([
      "increment_app_counter_if_under",
      "decrement_app_counter",
    ]);
    expect(mocks.state.rpcCalls[0].args).toMatchObject({
      counter_key: "comps_user_user-1_2026-10-19",
      max_value: 10,
      amount: 1,
    });
  });
});

describe("when the pool is open", () => {
  it("a live lookup is cached, counted once per user, and reports when it was pulled", async () => {
    mocks.isPaid.mockResolvedValue(true);
    mocks.budget.mockResolvedValue(OPEN);
    mocks.fetchEnrichment.mockResolvedValue({
      status: "ok",
      enrichment: { ...OLD_PAYLOAD, fetchedAt: "2026-11-01T12:00:00.000Z" },
    });
    const r = await getPropertyCompsAction(INPUT);
    expect(r).toMatchObject({ ok: true, source: "live", fetchedAt: "2026-11-01T12:00:00.000Z" });
    expect(mocks.state.rpcCalls.map((c) => c.name)).toEqual(["increment_app_counter_if_under"]);
    expect(mocks.state.upserts.map((u) => u.table)).toEqual(["property_enrichment_cache"]);
  });

  it("the per-user cap is CAP_REACHED with the next anchor as the date, and serves stale cache first", async () => {
    mocks.isPaid.mockResolvedValue(true);
    mocks.budget.mockResolvedValue(OPEN);
    mocks.state.rpcResult = { data: null, error: null };
    const capped = await getPropertyCompsAction(INPUT);
    expect(capped).toMatchObject({ ok: false, code: "CAP_REACHED", resumesOn: "Nov 19" });
    expect(mocks.fetchEnrichment).not.toHaveBeenCalled();
    mocks.state.cacheRow = { payload: OLD_PAYLOAD, fetched_at: "2026-06-03T10:00:00.000Z" };
    expect(await getPropertyCompsAction(INPUT)).toMatchObject({ ok: true, source: "cache" });
  });

  it("a per-user counter error fails closed instead of falling back to a read gate", async () => {
    mocks.isPaid.mockResolvedValue(true);
    mocks.budget.mockResolvedValue(OPEN);
    mocks.state.rpcResult = { data: null, error: { message: "boom" } };
    expect(await getPropertyCompsAction(INPUT)).toMatchObject({ ok: false, code: "SERVER_ERROR" });
    expect(mocks.fetchEnrichment).not.toHaveBeenCalled();
  });
});

describe("the auto-pull on save", () => {
  it("is refused before any auth or database work unless RENTCAST_AUTOPULL_ON_SAVE=on", async () => {
    const r = await getPropertyCompsAction({ ...INPUT, autoPull: true, dealId: "6f1e2c3a-1111-4222-8333-444455556666" });
    expect(r).toMatchObject({ ok: false, code: "AUTOPULL_OFF" });
    expect(mocks.user).not.toHaveBeenCalled();
    expect(mocks.budget).not.toHaveBeenCalled();
  });

  it("runs like any other lookup when switched on", async () => {
    vi.stubEnv("RENTCAST_AUTOPULL_ON_SAVE", "on");
    mocks.budget.mockResolvedValue(PAUSED);
    const r = await getPropertyCompsAction({ ...INPUT, autoPull: true });
    expect(r).toMatchObject({ ok: false, code: "CAP_REACHED" });
    expect(mocks.user).toHaveBeenCalled();
  });
});

describe("getCompsAvailabilityAction", () => {
  it("is for signed-in users only", async () => {
    mocks.user.mockResolvedValue({ data: { user: null } });
    expect(await getCompsAvailabilityAction()).toEqual({ ok: false, code: "SIGN_IN_REQUIRED" });
    expect(mocks.budget).not.toHaveBeenCalled();
  });

  it("reports the paused state with its date from one read, and makes no reservation", async () => {
    expect(await getCompsAvailabilityAction()).toEqual({
      ok: true,
      configured: true,
      available: false,
      resumesOn: "Nov 21",
      resumesAt: "2026-11-21T00:00:00.000Z",
    });
    expect(mocks.budget).toHaveBeenCalledTimes(1);
    expect(mocks.state.rpcCalls).toEqual([]);
  });

  it("reports open, not configured, and unknown-date pauses honestly", async () => {
    mocks.budget.mockResolvedValue(OPEN);
    expect(await getCompsAvailabilityAction()).toMatchObject({ ok: true, configured: true, available: true });
    mocks.budget.mockResolvedValue({ ...PAUSED, reason: "unavailable" });
    expect(await getCompsAvailabilityAction()).toMatchObject({ ok: true, available: false, resumesOn: null });
    vi.stubEnv("RENTCAST_API_KEY", "");
    expect(await getCompsAvailabilityAction()).toMatchObject({ ok: true, configured: false, available: false });
  });
});
