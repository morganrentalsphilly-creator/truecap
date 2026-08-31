import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  bindPropertyCompsPayload,
  propertyCompsQueryFingerprint,
  propertyCompsUnderwritingFingerprint,
  readBoundPropertyCompsPayload,
} from "@/lib/property-comps-query";
import type { PropertyEnrichment } from "@/lib/property-enrichment/rentcast";

const mocks = vi.hoisted(() => ({
  serverClient: null as unknown,
  adminClient: null as unknown,
  hasPaidPlanSubscription: vi.fn(),
  fetchRentCastEnrichment: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => mocks.serverClient),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: vi.fn(() => mocks.adminClient),
}));
vi.mock("@/lib/entitlements", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/entitlements")>()),
  hasPaidPlanSubscription: mocks.hasPaidPlanSubscription,
}));
vi.mock("@/lib/property-enrichment/rentcast", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/property-enrichment/rentcast")>()),
  fetchRentCastEnrichment: mocks.fetchRentCastEnrichment,
}));
vi.mock("@/lib/posthog-server", () => ({ captureServerEvent: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureMessage: vi.fn() }));

import {
  getPropertyCompsAction,
  getSavedDealCompsAction,
} from "@/app/actions/property-comps";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const DEAL_ID = "22222222-2222-4222-8222-222222222222";
const fetchedAt = "2026-08-30T12:00:00.000Z";
const enrichment: PropertyEnrichment = {
  facts: null,
  valueEstimate: 300_000,
  valueRange: null,
  saleComps: [],
  rentEstimate: 2_500,
  rentRange: null,
  rentComps: [],
  listingChecked: true,
  fetchedAt,
};
const query = {
  address: "123 Main St, Philadelphia, PA",
  propertyType: "single-family" as const,
  bedrooms: 3,
  bathrooms: 2,
  squareFootage: 1_500,
};
const savedProfile = {
  id: DEAL_ID,
  address: query.address,
  property_type: query.propertyType,
  bedrooms: query.bedrooms,
  bathrooms: query.bathrooms,
  sqft: query.squareFootage,
};

function chainMaybeSingle(result: () => unknown) {
  const builder: Record<string, unknown> = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.maybeSingle = vi.fn(async () => result());
  return builder;
}

function createHarness(options?: {
  savedDeal?: typeof savedProfile;
  storedPayload?: unknown;
}) {
  const cacheKeys: string[] = [];
  const upserts: Array<Record<string, unknown>> = [];
  const profile = options?.savedDeal ?? savedProfile;
  const storedPayload = options?.storedPayload ?? null;

  const adminFrom = vi.fn((table: string) => {
    if (table === "property_enrichment_cache") {
      const builder = chainMaybeSingle(() => ({
        data: { payload: enrichment, fetched_at: fetchedAt },
        error: null,
      }));
      builder.eq = vi.fn((column: string, value: string) => {
        if (column === "address_key") cacheKeys.push(value);
        return builder;
      });
      return builder;
    }
    if (table === "saved_analyses") {
      return chainMaybeSingle(() => ({ data: profile, error: null }));
    }
    if (table === "deal_comps") {
      return {
        upsert: vi.fn(async (row: Record<string, unknown>) => {
          upserts.push(row);
          return { error: null };
        }),
      };
    }
    throw new Error(`Unexpected admin table: ${table}`);
  });

  const serverFrom = vi.fn((table: string) => {
    if (table === "saved_analyses") {
      return chainMaybeSingle(() => ({ data: profile, error: null }));
    }
    if (table === "deal_comps") {
      return chainMaybeSingle(() => ({
        data: storedPayload
          ? { payload: storedPayload, fetched_at: fetchedAt }
          : null,
        error: null,
      }));
    }
    throw new Error(`Unexpected session table: ${table}`);
  });

  return {
    cacheKeys,
    upserts,
    adminClient: { from: adminFrom },
    serverClient: {
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: USER_ID } },
          error: null,
        })),
      },
      from: serverFrom,
    },
  };
}

describe("property comps action query binding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RENTCAST_API_KEY = "test-key";
    mocks.hasPaidPlanSubscription.mockResolvedValue(true);
    mocks.fetchRentCastEnrichment.mockRejectedValue(
      new Error("a fresh cache hit must not call RentCast"),
    );
  });

  it("persists a cache hit only when the saved deal still matches the full submitted query", async () => {
    const harness = createHarness();
    mocks.adminClient = harness.adminClient;
    mocks.serverClient = harness.serverClient;

    await expect(
      getPropertyCompsAction({
        ...query,
        dealId: DEAL_ID,
        expectedUserId: USER_ID,
      }),
    ).resolves.toMatchObject({ ok: true, source: "cache" });

    expect(harness.upserts).toHaveLength(1);
    expect(
      readBoundPropertyCompsPayload(
        harness.upserts[0]?.payload,
        propertyCompsUnderwritingFingerprint(query),
      ),
    ).toEqual(enrichment);
  });

  it("does not persist an old pull after the deal's beds changed at the same address", async () => {
    const harness = createHarness({
      savedDeal: { ...savedProfile, bedrooms: 4 },
    });
    mocks.adminClient = harness.adminClient;
    mocks.serverClient = harness.serverClient;

    await expect(
      getPropertyCompsAction({
        ...query,
        dealId: DEAL_ID,
        expectedUserId: USER_ID,
      }),
    ).resolves.toMatchObject({ ok: true, source: "cache" });
    expect(harness.upserts).toHaveLength(0);
  });

  it("uses the full provider subject as the global cache key", async () => {
    const harness = createHarness();
    mocks.adminClient = harness.adminClient;
    mocks.serverClient = harness.serverClient;

    await getPropertyCompsAction({ ...query, expectedUserId: USER_ID });
    await getPropertyCompsAction({
      ...query,
      bedrooms: 4,
      expectedUserId: USER_ID,
    });

    expect(harness.cacheKeys).toEqual([
      propertyCompsQueryFingerprint(query),
      propertyCompsQueryFingerprint({ ...query, bedrooms: 4 }),
    ]);
    expect(harness.cacheKeys[0]).not.toBe(harness.cacheKeys[1]);
  });

  it("hides a previously saved set after the saved underwriting profile changes", async () => {
    const originalFingerprint = propertyCompsUnderwritingFingerprint(query);
    const harness = createHarness({
      savedDeal: { ...savedProfile, bedrooms: 4 },
      storedPayload: bindPropertyCompsPayload(enrichment, originalFingerprint),
    });
    mocks.adminClient = harness.adminClient;
    mocks.serverClient = harness.serverClient;

    await expect(
      getSavedDealCompsAction({
        ...query,
        bedrooms: 4,
        dealId: DEAL_ID,
      }),
    ).resolves.toEqual({ ok: true, enrichment: null, fetchedAt: null });
  });

  it("persists listing-enriched results under the same underwriting binding", async () => {
    const harness = createHarness();
    mocks.adminClient = harness.adminClient;
    mocks.serverClient = harness.serverClient;

    await expect(
      getPropertyCompsAction({
        ...query,
        includeListing: true,
        dealId: DEAL_ID,
        expectedUserId: USER_ID,
      }),
    ).resolves.toMatchObject({ ok: true, source: "cache" });

    expect(harness.upserts).toHaveLength(1);
    expect(
      readBoundPropertyCompsPayload(
        harness.upserts[0]?.payload,
        propertyCompsUnderwritingFingerprint(query),
      ),
    ).toEqual(enrichment);
  });
});
