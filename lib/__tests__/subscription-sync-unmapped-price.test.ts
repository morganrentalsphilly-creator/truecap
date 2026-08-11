import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

// The unmapped-price recovery ladder in upsertSubscriptionFromStripe is the
// guard against the 2026-07 incident class: a paying subscription whose price
// maps to no plan row must NOT be silently downgraded to FREE (plan_id=null).
// These tests exercise the three outcomes for an active sub with an unmapped
// price: recover-from-metadata, preserve-existing-plan, and (canceled) let-null.

vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));

import * as Sentry from "@sentry/nextjs";
import { upsertSubscriptionFromStripe } from "@/lib/stripe/subscription-sync";

type PlanRow = { id: string } | null;

type AdminMockConfig = {
  /** profiles lookup by stripe_customer_id (user-binding resolution). */
  profileByCustomer?: { id: string; stripe_customer_id: string | null } | null;
  /** profiles lookup by id. */
  profileById?: { id: string; stripe_customer_id: string | null } | null;
  /** plans lookup by stripe_price_id. */
  planByPrice?: PlanRow;
  /** plans lookup by slug (keyed by slug value). */
  plansBySlug?: Record<string, PlanRow>;
  /** existing subscriptions row (select plan_id by stripe_subscription_id). */
  existingSubscription?: { plan_id: string | null } | null;
};

type CapturedUpsert = { table: string; row: Record<string, unknown> };

/**
 * Minimal chainable stand-in for the Supabase admin client covering the exact
 * query shapes upsertSubscriptionFromStripe issues. Terminal `.maybeSingle()`
 * resolves from config by table + recorded filters; `.upsert()` records the
 * row; the builder is itself thenable so the awaited `.update().eq().neq().in()`
 * deactivate chain resolves to `{ error: null }`.
 */
function makeAdmin(config: AdminMockConfig): { admin: SupabaseClient; upserts: CapturedUpsert[] } {
  const upserts: CapturedUpsert[] = [];

  function builder(table: string) {
    const state: { table: string; op: string; filters: Record<string, unknown> } = {
      table,
      op: "select",
      filters: {},
    };

    const b = {
      select() {
        state.op = "select";
        return b;
      },
      update() {
        state.op = "update";
        return b;
      },
      upsert(row: Record<string, unknown>) {
        upserts.push({ table, row });
        return Promise.resolve({ error: null });
      },
      eq(col: string, val: unknown) {
        state.filters[col] = val;
        return b;
      },
      neq() {
        return b;
      },
      in() {
        return b;
      },
      maybeSingle() {
        return Promise.resolve(resolve(state));
      },
      // Thenable so the awaited deactivate chain resolves to { error: null }.
      then(onFulfilled: (v: { error: null }) => unknown, onRejected?: (e: unknown) => unknown) {
        return Promise.resolve({ error: null as null }).then(onFulfilled, onRejected);
      },
    };
    return b;
  }

  function resolve(state: { table: string; filters: Record<string, unknown> }) {
    const { table, filters } = state;
    if (table === "profiles") {
      if ("stripe_customer_id" in filters) return { data: config.profileByCustomer ?? null, error: null };
      if ("id" in filters) return { data: config.profileById ?? null, error: null };
    }
    if (table === "plans") {
      if ("stripe_price_id" in filters) return { data: config.planByPrice ?? null, error: null };
      if ("slug" in filters) {
        const slug = filters.slug as string;
        return { data: config.plansBySlug?.[slug] ?? null, error: null };
      }
    }
    if (table === "subscriptions") {
      return { data: config.existingSubscription ?? null, error: null };
    }
    return { data: null, error: null };
  }

  const admin = { from: (t: string) => builder(t) } as unknown as SupabaseClient;
  return { admin, upserts };
}

function makeSubscription(overrides: Partial<Stripe.Subscription> = {}): Stripe.Subscription {
  return {
    id: "sub_test",
    customer: "cus_1",
    status: "active",
    metadata: {},
    items: { data: [{ price: { id: "price_unmapped_xyz" } }] },
    cancel_at_period_end: false,
    ...overrides,
  } as unknown as Stripe.Subscription;
}

describe("upsertSubscriptionFromStripe — unmapped price on an active subscription", () => {
  beforeEach(() => {
    vi.mocked(Sentry.captureMessage).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("recovers the plan from plan_slug metadata instead of downgrading to FREE (no alarm)", async () => {
    const { admin, upserts } = makeAdmin({
      profileByCustomer: { id: "user-1", stripe_customer_id: "cus_1" },
      planByPrice: null, // price maps to no plan row
      plansBySlug: { pro_monthly: { id: "plan-pro" } },
      existingSubscription: null,
    });

    const subscription = makeSubscription({
      status: "active",
      metadata: { user_id: "user-1", plan_slug: "pro_monthly" },
    });

    const result = await upsertSubscriptionFromStripe(admin, subscription, "user-1");

    expect(result).toEqual({ synced: true });
    expect(upserts).toHaveLength(1);
    // Recovered via metadata → the paying user keeps Pro, NOT null (FREE).
    expect(upserts[0].row.plan_id).toBe("plan-pro");
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it("preserves the existing plan and pages LOUD when the price is unmapped and metadata can't recover it", async () => {
    const { admin, upserts } = makeAdmin({
      profileByCustomer: { id: "user-1", stripe_customer_id: "cus_1" },
      planByPrice: null,
      plansBySlug: {}, // metadata plan_slug won't resolve either
      existingSubscription: { plan_id: "plan-pro-existing" },
    });

    const subscription = makeSubscription({
      status: "past_due",
      metadata: { user_id: "user-1" }, // no plan_slug to recover from
    });

    const result = await upsertSubscriptionFromStripe(admin, subscription, "user-1");

    expect(result).toEqual({ synced: true });
    expect(upserts).toHaveLength(1);
    // Never strip Pro from a paying customer — keep their existing plan.
    expect(upserts[0].row.plan_id).toBe("plan-pro-existing");
    expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
    const [, rawOptions] = vi.mocked(Sentry.captureMessage).mock.calls[0];
    const options = rawOptions as { level?: string; tags?: Record<string, unknown> };
    expect(options.tags).toMatchObject({ feature: "billing", kind: "entitlement-mismatch" });
    expect(options.level).toBe("error");
  });

  it("still resolves to null (FREE) for a CANCELED sub with an unmapped price — no rescue, no alarm", async () => {
    const { admin, upserts } = makeAdmin({
      profileByCustomer: { id: "user-1", stripe_customer_id: "cus_1" },
      planByPrice: null,
      plansBySlug: { pro_monthly: { id: "plan-pro" } },
      existingSubscription: { plan_id: "plan-pro-existing" },
    });

    const subscription = makeSubscription({
      status: "canceled",
      metadata: { user_id: "user-1", plan_slug: "pro_monthly" },
    });

    const result = await upsertSubscriptionFromStripe(admin, subscription, "user-1");

    expect(result).toEqual({ synced: true });
    expect(upserts).toHaveLength(1);
    // Canceled subs legitimately resolve to FREE — the rescue is scoped to
    // the paid status set, so it must not fire here.
    expect(upserts[0].row.plan_id).toBeNull();
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });
});
