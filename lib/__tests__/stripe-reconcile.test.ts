import { describe, expect, it } from "vitest";
import {
  classifyStripeSubscriptions,
  isPaidStatus,
  orphanNeedsHeal,
  partitionLocalPaidRows,
  resolveReconcileMode,
  summarizeStuckEvents,
  type LocalSubscriptionRow,
} from "../stripe-reconcile";

function localRow(overrides: Partial<LocalSubscriptionRow> = {}): LocalSubscriptionRow {
  return {
    id: "row-1",
    user_id: "user-1",
    plan_id: "plan-pro",
    status: "active",
    stripe_subscription_id: "sub_1",
    ...overrides,
  };
}

describe("resolveReconcileMode", () => {
  it("defaults to off for unset/blank/unknown values", () => {
    expect(resolveReconcileMode(undefined)).toBe("off");
    expect(resolveReconcileMode(null)).toBe("off");
    expect(resolveReconcileMode("")).toBe("off");
    expect(resolveReconcileMode("banana")).toBe("off");
    expect(resolveReconcileMode("off")).toBe("off");
  });

  it("parses live and dry (case/whitespace tolerant, dry-run alias)", () => {
    expect(resolveReconcileMode("live")).toBe("live");
    expect(resolveReconcileMode(" LIVE ")).toBe("live");
    expect(resolveReconcileMode("dry")).toBe("dry");
    expect(resolveReconcileMode("Dry-Run")).toBe("dry");
  });
});

describe("isPaidStatus", () => {
  it("treats active/trialing/past_due as paid, everything else not", () => {
    expect(isPaidStatus("active")).toBe(true);
    expect(isPaidStatus("trialing")).toBe(true);
    expect(isPaidStatus("past_due")).toBe(true);
    expect(isPaidStatus("canceled")).toBe(false);
    expect(isPaidStatus("incomplete")).toBe(false);
    expect(isPaidStatus("unpaid")).toBe(false);
    expect(isPaidStatus("paused")).toBe(false);
  });
});

describe("summarizeStuckEvents", () => {
  const now = new Date("2026-07-12T12:00:00.000Z");

  it("computes age in hours and passes ids/types through", () => {
    const [summary] = summarizeStuckEvents(
      [
        {
          stripe_event_id: "evt_1",
          type: "invoice.paid",
          received_at: "2026-07-10T12:00:00.000Z",
          error_message: null,
        },
      ],
      now
    );
    expect(summary).toEqual({
      id: "evt_1",
      type: "invoice.paid",
      age_hours: 48,
      error_message: null,
    });
  });

  it("truncates long error messages to 200 chars", () => {
    const [summary] = summarizeStuckEvents(
      [
        {
          stripe_event_id: "evt_2",
          type: "customer.subscription.updated",
          received_at: "2026-07-11T12:00:00.000Z",
          error_message: "x".repeat(500),
        },
      ],
      now
    );
    expect(summary.error_message).toHaveLength(200);
  });

  it("flags an unparseable timestamp with age -1 instead of throwing", () => {
    const [summary] = summarizeStuckEvents(
      [
        {
          stripe_event_id: "evt_3",
          type: "invoice.paid",
          received_at: "not-a-date",
          error_message: null,
        },
      ],
      now
    );
    expect(summary.age_hours).toBe(-1);
  });
});

describe("classifyStripeSubscriptions", () => {
  it("detects a paid Stripe subscription with no local row (category a)", () => {
    const result = classifyStripeSubscriptions([{ id: "sub_missing", status: "active" }], []);
    expect(result.missingLocal).toEqual(["sub_missing"]);
    expect(result.nullPlan).toEqual([]);
    expect(result.statusMismatch).toEqual([]);
  });

  it("detects a local row with plan_id null (category b — paying user on free entitlements)", () => {
    const result = classifyStripeSubscriptions(
      [{ id: "sub_1", status: "active" }],
      [localRow({ plan_id: null })]
    );
    expect(result.nullPlan).toEqual(["sub_1"]);
    expect(result.missingLocal).toEqual([]);
    expect(result.statusMismatch).toEqual([]);
  });

  it("detects a status disagreement (category c)", () => {
    const result = classifyStripeSubscriptions(
      [{ id: "sub_1", status: "past_due" }],
      [localRow({ status: "active" })]
    );
    expect(result.statusMismatch).toEqual([
      { stripe_subscription_id: "sub_1", local_status: "active", stripe_status: "past_due" },
    ]);
  });

  it("reports both null plan and status mismatch for the same subscription", () => {
    const result = classifyStripeSubscriptions(
      [{ id: "sub_1", status: "trialing" }],
      [localRow({ plan_id: null, status: "active" })]
    );
    expect(result.nullPlan).toEqual(["sub_1"]);
    expect(result.statusMismatch).toHaveLength(1);
  });

  it("does not treat a missing local row for a non-paid Stripe sub as drift", () => {
    const result = classifyStripeSubscriptions(
      [{ id: "sub_canceled", status: "canceled" }],
      [] // no local row — would be missingLocal if the sub were paid
    );
    expect(result).toEqual({ missingLocal: [], nullPlan: [], statusMismatch: [] });
  });

  it("flags a canceled-in-Stripe sub whose local row still grants paid (lost deletion webhook)", () => {
    const result = classifyStripeSubscriptions(
      [{ id: "sub_1", status: "canceled" }],
      [localRow({ status: "active" })]
    );
    expect(result.statusMismatch).toEqual([
      { stripe_subscription_id: "sub_1", local_status: "active", stripe_status: "canceled" },
    ]);
    expect(result.missingLocal).toEqual([]);
    expect(result.nullPlan).toEqual([]);
  });

  it("stays quiet when both Stripe and the local row agree the sub is non-paid", () => {
    const result = classifyStripeSubscriptions(
      [{ id: "sub_1", status: "canceled" }],
      [localRow({ status: "canceled" })]
    );
    expect(result).toEqual({ missingLocal: [], nullPlan: [], statusMismatch: [] });
  });

  it("stays quiet on non-paid/non-paid status differences (no entitlement impact)", () => {
    const result = classifyStripeSubscriptions(
      [{ id: "sub_1", status: "canceled" }],
      [localRow({ status: "unpaid" })]
    );
    expect(result.statusMismatch).toEqual([]);
  });

  it("reports nothing when local state matches Stripe", () => {
    const result = classifyStripeSubscriptions(
      [{ id: "sub_1", status: "active" }],
      [localRow()]
    );
    expect(result).toEqual({ missingLocal: [], nullPlan: [], statusMismatch: [] });
  });
});

describe("partitionLocalPaidRows", () => {
  it("separates unlisted paid rows into orphan candidates and no-stripe-id anomalies", () => {
    const listed = localRow({ id: "row-listed", stripe_subscription_id: "sub_listed" });
    const orphan = localRow({ id: "row-orphan", stripe_subscription_id: "sub_gone" });
    const noId = localRow({ id: "row-no-id", stripe_subscription_id: null });
    const canceled = localRow({
      id: "row-canceled",
      status: "canceled",
      stripe_subscription_id: "sub_also_gone",
    });

    const partition = partitionLocalPaidRows(
      [listed, orphan, noId, canceled],
      new Set(["sub_listed"])
    );
    expect(partition.orphanCandidates.map((r) => r.id)).toEqual(["row-orphan"]);
    expect(partition.missingStripeId.map((r) => r.id)).toEqual(["row-no-id"]);
  });
});

describe("orphanNeedsHeal", () => {
  it("heals when Stripe says canceled but local says active", () => {
    expect(orphanNeedsHeal(localRow({ status: "active" }), "canceled")).toBe(true);
  });

  it("heals when statuses match but the local plan mapping is missing", () => {
    expect(orphanNeedsHeal(localRow({ plan_id: null, status: "active" }), "active")).toBe(true);
  });

  it("does nothing when the candidate was a listing-cap false positive", () => {
    expect(orphanNeedsHeal(localRow({ status: "active" }), "active")).toBe(false);
  });
});
