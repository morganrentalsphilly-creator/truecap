import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getUser: vi.fn(),
  rpc: vi.fn(),
  getEntitlementsForUser: vi.fn(),
  getSavedDealLimitLabel: vi.fn(),
  hasPlanFeature: vi.fn(),
  hasSavedDealCapacity: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: mocks.getUser },
    from: mocks.from,
    rpc: mocks.rpc,
  })),
}));
vi.mock("@/lib/entitlements", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/entitlements")>()),
  getEntitlementsForUser: mocks.getEntitlementsForUser,
  getSavedDealLimitLabel: mocks.getSavedDealLimitLabel,
  hasPlanFeature: mocks.hasPlanFeature,
  hasSavedDealCapacity: mocks.hasSavedDealCapacity,
}));

import { saveDealAction } from "@/app/actions/saved-analyses";
import {
  defaultValues,
  type InvestmentFormValues,
} from "@/lib/investcalc-schema";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_USER_ID = "22222222-2222-4222-8222-222222222222";
const WINNER_ID = "22222222-2222-4222-8222-222222222222";
const COPY_KEY = "a".repeat(64);

function lookupQuery(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    maybeSingle: vi.fn(async () => result),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.is.mockReturnValue(query);
  return query;
}

function countQuery(result: { count: number | null; error: unknown }) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(async () => result),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return query;
}

function insertQuery(result: { data: unknown; error: unknown }) {
  const query = {
    insert: vi.fn(),
    select: vi.fn(),
    single: vi.fn(async () => result),
  };
  query.insert.mockReturnValue(query);
  query.select.mockReturnValue(query);
  return query;
}

function validDeal(): InvestmentFormValues {
  return {
    ...defaultValues,
    propertyType: "single-family",
    address: "123 Capacity Race St, Philadelphia, PA",
    purchasePrice: 250_000,
    monthlyRent: 2_500,
    units: [],
  } as InvestmentFormValues;
}

function arrangeInsertRace(replayedRow: unknown) {
  const capacityError = {
    code: "23514",
    message:
      'new row violates check constraint "saved_analyses_plan_capacity"',
  };
  mocks.from
    .mockReturnValueOnce(lookupQuery({ data: null, error: null }))
    .mockReturnValueOnce(countQuery({ count: 2, error: null }))
    .mockReturnValueOnce(insertQuery({ data: null, error: capacityError }))
    .mockReturnValueOnce(lookupQuery({ data: replayedRow, error: null }));
}

describe("public-share copy insert races", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    });
    mocks.getEntitlementsForUser.mockResolvedValue({});
    mocks.getSavedDealLimitLabel.mockReturnValue("3 saved deals");
    mocks.hasPlanFeature.mockReturnValue(true);
    mocks.hasSavedDealCapacity.mockReturnValue(true);
    mocks.rpc.mockResolvedValue({ data: false, error: null });
  });

  it("rejects a stale account-A save after the server session changes to B before any database read or write", async () => {
    await expect(
      saveDealAction(validDeal(), null, undefined, {
        publicShareCopyKey: COPY_KEY,
        expectedUserId: OTHER_USER_ID,
      }),
    ).resolves.toEqual({
      ok: false,
      code: "SESSION_CHANGED",
      message:
        "Your signed-in account changed. Reload this page and try again.",
    });

    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("returns the winner's exact row when the same key loses the last slot through the capacity trigger", async () => {
    arrangeInsertRace({ id: WINNER_ID, underwriting_revision: 1 });

    await expect(
      saveDealAction(validDeal(), null, undefined, {
        publicShareCopyKey: COPY_KEY,
        expectedUserId: USER_ID,
      }),
    ).resolves.toEqual({
      ok: true,
      id: WINNER_ID,
      mode: "inserted",
      underwritingRevision: 1,
      idempotentReplay: true,
    });

    expect(mocks.from).toHaveBeenCalledTimes(4);
  });

  it("preserves the entitlement result when a capacity error has no committed same-key copy", async () => {
    arrangeInsertRace(null);

    await expect(
      saveDealAction(validDeal(), null, undefined, {
        publicShareCopyKey: COPY_KEY,
        expectedUserId: USER_ID,
      }),
    ).resolves.toEqual({
      ok: false,
      code: "ENTITLEMENT_SAVE",
      message: "Saved deal limit reached for your plan (3 saved deals).",
    });
  });
});
