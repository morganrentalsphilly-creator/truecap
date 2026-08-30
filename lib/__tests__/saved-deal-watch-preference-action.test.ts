import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  client: null as unknown,
  getEntitlementsForUser: vi.fn(),
  hasPaidPlanSubscription: vi.fn(),
  hasPlanFeature: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => mocks.client),
}));
vi.mock("@/lib/feature-flags", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/feature-flags")>()),
  isFeatureEnabled: vi.fn(() => true),
}));
vi.mock("@/lib/entitlements", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/entitlements")>()),
  getEntitlementsForUser: mocks.getEntitlementsForUser,
  hasPaidPlanSubscription: mocks.hasPaidPlanSubscription,
  hasPlanFeature: mocks.hasPlanFeature,
}));

import { setSavedDealWatchPreferencesAction } from "@/app/actions/saved-deal-watch";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const DEAL_ID = "22222222-2222-4222-8222-222222222222";

type PreferenceRow = {
  in_app_notifications_enabled: boolean;
  email_notifications_enabled: boolean;
};

function createConcurrentPreferenceHarness() {
  const state: PreferenceRow = {
    in_app_notifications_enabled: true,
    email_notifications_enabled: true,
  };
  const updates: Array<Record<string, boolean>> = [];
  let initialPreferenceReads = 0;
  let releaseInitialReads: (() => void) | null = null;
  const bothInitialReads = new Promise<void>((resolve) => {
    releaseInitialReads = resolve;
  });

  async function readPreferences() {
    if (initialPreferenceReads < 2) {
      initialPreferenceReads += 1;
      const retainedSnapshot = { ...state };
      if (initialPreferenceReads === 2) releaseInitialReads?.();
      await bothInitialReads;
      return { data: retainedSnapshot, error: null };
    }
    return { data: { ...state }, error: null };
  }

  const from = vi.fn((table: string) => {
    const query: Record<string, unknown> = {};
    query.select = vi.fn(() => query);
    query.eq = vi.fn(() => query);
    query.is = vi.fn(() => query);
    query.maybeSingle = vi.fn(async () => {
      if (table === "saved_deal_watch_preferences") {
        return readPreferences();
      }
      if (table === "saved_analyses") {
        return { data: { id: DEAL_ID }, error: null };
      }
      if (table === "saved_deal_watch_subscriptions") {
        return { data: null, error: null };
      }
      throw new Error(`Unexpected table read: ${table}`);
    });
    query.update = vi.fn((patch: Record<string, boolean>) => ({
      eq: vi.fn(async () => {
        updates.push({ ...patch });
        Object.assign(state, patch);
        return { error: null };
      }),
    }));
    return query;
  });

  return {
    state,
    updates,
    client: {
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: USER_ID } },
          error: null,
        })),
      },
      from,
    },
  };
}

function createConcurrentFirstPreferenceHarness() {
  let state: PreferenceRow | null = null;
  const inserts: Array<Record<string, boolean>> = [];
  const updates: Array<Record<string, boolean>> = [];
  let initialPreferenceReads = 0;
  let releaseInitialReads: (() => void) | null = null;
  const bothInitialReads = new Promise<void>((resolve) => {
    releaseInitialReads = resolve;
  });

  async function readPreferences() {
    if (initialPreferenceReads < 2) {
      initialPreferenceReads += 1;
      if (initialPreferenceReads === 2) releaseInitialReads?.();
      await bothInitialReads;
      return { data: null, error: null };
    }
    return { data: state ? { ...state } : null, error: null };
  }

  const from = vi.fn((table: string) => {
    const query: Record<string, unknown> = {};
    query.select = vi.fn(() => query);
    query.eq = vi.fn(() => query);
    query.is = vi.fn(() => query);
    query.maybeSingle = vi.fn(async () => {
      if (table === "saved_deal_watch_preferences") {
        return readPreferences();
      }
      if (table === "saved_analyses") {
        return { data: { id: DEAL_ID }, error: null };
      }
      if (table === "saved_deal_watch_subscriptions") {
        return { data: null, error: null };
      }
      throw new Error(`Unexpected table read: ${table}`);
    });
    query.insert = vi.fn(
      async (row: Record<string, boolean | string>) => {
        const patch = Object.fromEntries(
          Object.entries(row).filter(([key]) => key !== "user_id"),
        ) as Record<string, boolean>;
        inserts.push(patch);
        if (state) {
          return {
            error: {
              code: "23505",
              message: "duplicate key value violates unique constraint",
            },
          };
        }
        state = {
          in_app_notifications_enabled: false,
          email_notifications_enabled: false,
          ...patch,
        };
        return { error: null };
      },
    );
    query.update = vi.fn((patch: Record<string, boolean>) => ({
      eq: vi.fn(async () => {
        updates.push({ ...patch });
        if (state) Object.assign(state, patch);
        return { error: null };
      }),
    }));
    return query;
  });

  return {
    get state() {
      return state;
    },
    inserts,
    updates,
    client: {
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: USER_ID } },
          error: null,
        })),
      },
      from,
    },
  };
}

describe("Saved Deal Watch single-channel action patches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getEntitlementsForUser.mockResolvedValue({});
    mocks.hasPaidPlanSubscription.mockResolvedValue(false);
    mocks.hasPlanFeature.mockReturnValue(false);
  });

  it("converges concurrent disjoint revocations without re-enabling either channel", async () => {
    const harness = createConcurrentPreferenceHarness();
    mocks.client = harness.client;

    const [inAppResult, emailResult] = await Promise.all([
      setSavedDealWatchPreferencesAction({
        savedAnalysisId: DEAL_ID,
        preference: "inAppNotificationsEnabled",
        enabled: false,
      }),
      setSavedDealWatchPreferencesAction({
        savedAnalysisId: DEAL_ID,
        preference: "emailNotificationsEnabled",
        enabled: false,
      }),
    ]);

    expect(inAppResult.ok).toBe(true);
    expect(emailResult.ok).toBe(true);
    expect(harness.state).toEqual({
      in_app_notifications_enabled: false,
      email_notifications_enabled: false,
    });
    expect(harness.updates).toHaveLength(2);
    expect(harness.updates).toEqual(
      expect.arrayContaining([
        { in_app_notifications_enabled: false },
        { email_notifications_enabled: false },
      ]),
    );
    expect(harness.updates.every((patch) => Object.keys(patch).length === 1)).toBe(
      true,
    );
  });

  it("merges concurrent disjoint first-time opt-ins after the unique-key race", async () => {
    mocks.hasPaidPlanSubscription.mockResolvedValue(true);
    mocks.hasPlanFeature.mockReturnValue(true);
    const harness = createConcurrentFirstPreferenceHarness();
    mocks.client = harness.client;

    const [inAppResult, emailResult] = await Promise.all([
      setSavedDealWatchPreferencesAction({
        savedAnalysisId: DEAL_ID,
        preference: "inAppNotificationsEnabled",
        enabled: true,
      }),
      setSavedDealWatchPreferencesAction({
        savedAnalysisId: DEAL_ID,
        preference: "emailNotificationsEnabled",
        enabled: true,
      }),
    ]);

    expect(inAppResult.ok).toBe(true);
    expect(emailResult.ok).toBe(true);
    expect(harness.state).toEqual({
      in_app_notifications_enabled: true,
      email_notifications_enabled: true,
    });
    expect(harness.inserts).toHaveLength(2);
    expect(harness.updates).toHaveLength(1);
    expect(Object.keys(harness.updates[0] ?? {})).toHaveLength(1);
  });
});
