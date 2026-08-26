import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  classifyDecisionPackStripeAccess,
  retrieveDecisionPackStripeAccess,
  type DecisionPackStripeReader,
} from "@/lib/stripe/decision-pack-access";
import { reconcileDecisionPackRiskEvent } from "@/lib/stripe/decision-pack-risk-webhook";

const sentry = vi.hoisted(() => ({ captureMessage: vi.fn() }));
vi.mock("@sentry/nextjs", () => sentry);

const CLAIM_ID = "11111111-1111-4111-8111-111111111111";

function session(overrides: Partial<Stripe.Checkout.Session> = {}) {
  return {
    id: "cs_test_pack",
    object: "checkout.session",
    client_reference_id: CLAIM_ID,
    metadata: { purpose: "one_time_pdf", claim_id: CLAIM_ID },
    payment_intent: "pi_test_pack",
    payment_status: "paid",
    status: "complete",
    amount_total: 500,
    currency: "usd",
    ...overrides,
  } as unknown as Stripe.Checkout.Session;
}

function charge(overrides: Partial<Stripe.Charge> = {}) {
  return {
    id: "ch_test_pack",
    object: "charge",
    amount_captured: 500,
    amount_refunded: 0,
    captured: true,
    disputed: false,
    paid: true,
    refunded: false,
    status: "succeeded",
    payment_intent: "pi_test_pack",
    ...overrides,
  } as unknown as Stripe.Charge;
}

function dispute(status: Stripe.Dispute.Status) {
  return {
    id: `dp_test_${status}`,
    object: "dispute",
    payment_intent: "pi_test_pack",
    status,
  } as unknown as Stripe.Dispute;
}

function classify(
  input: {
    session?: Stripe.Checkout.Session;
    charges?: Stripe.Charge[];
    disputes?: Stripe.Dispute[];
    chargeHistoryComplete?: boolean;
    disputeHistoryComplete?: boolean;
  } = {},
) {
  return classifyDecisionPackStripeAccess(
    {
      session: input.session ?? session(),
      charges: input.charges ?? [charge()],
      disputes: input.disputes ?? [],
      chargeHistoryComplete: input.chargeHistoryComplete ?? true,
      disputeHistoryComplete: input.disputeHistoryComplete ?? true,
    },
    CLAIM_ID,
  );
}

function stripeReader(
  input: {
    currentSession?: Stripe.Checkout.Session;
    charges?: Stripe.Charge[];
    disputes?: Stripe.Dispute[];
    sessionHistory?: Stripe.Checkout.Session[];
  } = {},
) {
  const currentSession = input.currentSession ?? session();
  const retrieve = vi.fn(async () => currentSession);
  const listSessions = vi.fn(async () => ({
    object: "list" as const,
    data: input.sessionHistory ?? [currentSession],
    has_more: false,
    url: "/v1/checkout/sessions",
  }));
  const listCharges = vi.fn(async () => ({
    object: "list" as const,
    data: input.charges ?? [charge()],
    has_more: false,
    url: "/v1/charges",
  }));
  const listDisputes = vi.fn(async () => ({
    object: "list" as const,
    data: input.disputes ?? [],
    has_more: false,
    url: "/v1/disputes",
  }));
  return {
    reader: {
      checkout: { sessions: { retrieve, list: listSessions } },
      charges: { list: listCharges },
      disputes: { list: listDisputes },
    } as unknown as DecisionPackStripeReader,
    retrieve,
    listSessions,
    listCharges,
    listDisputes,
  };
}

function adminLedger(
  initialStatus: string,
  options?: { raceFirstUpdateTo?: string },
) {
  const updates: Array<Record<string, unknown>> = [];
  const adjustments: Array<Record<string, unknown>> = [];
  const adjustmentUpserts: Array<{
    value: Record<string, unknown>;
    options: Record<string, unknown>;
  }> = [];
  let currentStatus = initialStatus;
  let updateAttempts = 0;

  const from = vi.fn((table: string) => {
    if (table === "decision_pack_credit_adjustments") {
      let pending: Record<string, unknown> | null = null;
      let inserted: Record<string, unknown> | null = null;
      const adjustmentBuilder = {
        upsert: vi.fn(
          (
            value: Record<string, unknown>,
            options: Record<string, unknown>,
          ) => {
            pending = value;
            adjustmentUpserts.push({ value, options });
            return adjustmentBuilder;
          },
        ),
        select: vi.fn(() => adjustmentBuilder),
        maybeSingle: vi.fn(async () => {
          if (!pending)
            return { data: null, error: new Error("missing upsert") };
          const duplicate = adjustments.some(
            (row) => row.claim_id === pending?.claim_id,
          );
          if (duplicate) return { data: null, error: null };
          inserted = { id: `adjustment-${adjustments.length + 1}`, ...pending };
          adjustments.push(inserted);
          return { data: { id: inserted.id }, error: null };
        }),
      };
      return adjustmentBuilder;
    }

    if (table !== "one_time_pdf_purchase_claims") {
      throw new Error(`Unexpected table ${table}`);
    }

    let operation: "select" | "update" = "select";
    let nextStatus: string | null = null;
    const claimBuilder = {
      select: vi.fn(() => claimBuilder),
      update: vi.fn((value: Record<string, unknown>) => {
        operation = "update";
        updates.push(value);
        nextStatus = String(value.pro_credit_status);
        return claimBuilder;
      }),
      eq: vi.fn(() => claimBuilder),
      maybeSingle: vi.fn(async () => {
        if (operation === "update") {
          updateAttempts += 1;
          if (updateAttempts === 1 && options?.raceFirstUpdateTo) {
            // Simulate a competing forward-only ledger transition winning the
            // compare-and-swap between this handler's read and update.
            currentStatus = options.raceFirstUpdateTo;
            return { data: null, error: null };
          }
          if (nextStatus) currentStatus = nextStatus;
          return { data: { id: CLAIM_ID }, error: null };
        }
        return {
          data: { id: CLAIM_ID, pro_credit_status: currentStatus },
          error: null,
        };
      }),
    };
    return claimBuilder;
  });
  return {
    admin: { from } as unknown as SupabaseClient,
    from,
    updates,
    adjustments,
    adjustmentUpserts,
    get currentStatus() {
      return currentStatus;
    },
  };
}

describe("historical Decision Pack current-payment policy", () => {
  it("allows a complete paid charge with no refund or dispute", () => {
    expect(classify()).toMatchObject({ state: "allowed" });
  });

  it.each([
    ["partial", { amount_refunded: 100, refunded: false }],
    ["full", { amount_refunded: 500, refunded: true }],
  ])("revokes access after a %s refund", (_label, refund) => {
    expect(classify({ charges: [charge(refund)] })).toEqual({
      state: "revoked",
      reason: "refund_recorded",
    });
  });

  it("revokes access after a lost dispute", () => {
    expect(classify({ disputes: [dispute("lost")] })).toEqual({
      state: "revoked",
      reason: "dispute_lost",
    });
  });

  it.each([
    "warning_needs_response",
    "warning_under_review",
    "needs_response",
    "under_review",
  ] as const)("suspends access while dispute status is %s", (status) => {
    expect(classify({ disputes: [dispute(status)] })).toEqual({
      state: "suspended",
      reason: "dispute_open",
    });
  });

  it("restores a won dispute only after current paid/no-refund checks pass", () => {
    expect(classify({ disputes: [dispute("won")] })).toMatchObject({
      state: "allowed",
    });
    expect(
      classify({
        charges: [charge({ amount_refunded: 100 })],
        disputes: [dispute("won")],
      }),
    ).toEqual({ state: "revoked", reason: "refund_recorded" });
  });

  it.each(["warning_closed", "prevented"] as const)(
    "fails closed for non-won terminal dispute status %s",
    (status) => {
      expect(classify({ disputes: [dispute(status)] })).toEqual({
        state: "suspended",
        reason: "dispute_state_unresolved",
      });
    },
  );

  it("fails closed when Stripe history is truncated or lacks a successful charge", () => {
    expect(classify({ chargeHistoryComplete: false })).toEqual({
      state: "unavailable",
      reason: "stripe_history_incomplete",
    });
    expect(classify({ charges: [] })).toEqual({
      state: "unavailable",
      reason: "successful_charge_missing",
    });
  });

  it("retrieves current Session, Charge, and Dispute state without creating anything", async () => {
    const stripe = stripeReader({ disputes: [dispute("under_review")] });
    await expect(
      retrieveDecisionPackStripeAccess(stripe.reader, "cs_test_pack", CLAIM_ID),
    ).resolves.toEqual({ state: "suspended", reason: "dispute_open" });
    expect(stripe.retrieve).toHaveBeenCalledWith("cs_test_pack");
    expect(stripe.listCharges).toHaveBeenCalledWith({
      payment_intent: "pi_test_pack",
      limit: 100,
    });
    expect(stripe.listDisputes).toHaveBeenCalledWith({
      payment_intent: "pi_test_pack",
      limit: 100,
    });
  });
});

describe("Decision Pack risk webhook reconciliation", () => {
  beforeEach(() => sentry.captureMessage.mockClear());

  it("durably denies an eligible credit after current Stripe shows a refund", async () => {
    const stripe = stripeReader({
      charges: [charge({ amount_refunded: 100 })],
    });
    const ledger = adminLedger("eligible");
    const result = await reconcileDecisionPackRiskEvent(
      ledger.admin,
      stripe.reader,
      charge({ amount_refunded: 100 }),
    );

    expect(result).toEqual({
      matchedSessions: 1,
      suspendedSessions: 0,
      revokedSessions: 1,
      creditRowsRevoked: 1,
      creditAdjustmentsCreated: 0,
    });
    expect(ledger.updates).toEqual([{ pro_credit_status: "denied" }]);
    expect(ledger.adjustments).toEqual([]);
    expect(sentry.captureMessage).not.toHaveBeenCalled();
  });

  it("reverses an applied credit and creates one pending operational adjustment", async () => {
    const stripe = stripeReader({ disputes: [dispute("lost")] });
    const ledger = adminLedger("applied");
    const result = await reconcileDecisionPackRiskEvent(
      ledger.admin,
      stripe.reader,
      dispute("lost"),
    );

    expect(result).toEqual({
      matchedSessions: 1,
      suspendedSessions: 0,
      revokedSessions: 1,
      creditRowsRevoked: 1,
      creditAdjustmentsCreated: 1,
    });
    expect(ledger.updates).toEqual([{ pro_credit_status: "reversed" }]);
    expect(ledger.adjustments).toEqual([
      expect.objectContaining({
        claim_id: CLAIM_ID,
        checkout_session_id: "cs_test_pack",
        reason: "dispute_lost",
        status: "pending",
      }),
    ]);
    expect(ledger.adjustmentUpserts[0]?.options).toEqual({
      onConflict: "claim_id",
      ignoreDuplicates: true,
    });
    expect(sentry.captureMessage).toHaveBeenCalledTimes(1);
    expect(sentry.captureMessage).toHaveBeenCalledWith(
      "Decision Pack reversed credit requires operational adjustment",
      expect.objectContaining({
        level: "warning",
        tags: expect.objectContaining({
          feature: "decision-pack-credit-adjustment",
          reason: "dispute_lost",
        }),
      }),
    );
  });

  it("re-reads after an eligible credit is concurrently applied and then reverses it", async () => {
    const stripe = stripeReader({
      charges: [charge({ amount_refunded: 100 })],
    });
    const ledger = adminLedger("eligible", {
      raceFirstUpdateTo: "applied",
    });

    const result = await reconcileDecisionPackRiskEvent(
      ledger.admin,
      stripe.reader,
      charge({ amount_refunded: 100 }),
    );

    expect(result).toEqual({
      matchedSessions: 1,
      suspendedSessions: 0,
      revokedSessions: 1,
      creditRowsRevoked: 1,
      creditAdjustmentsCreated: 1,
    });
    expect(ledger.updates).toEqual([
      { pro_credit_status: "denied" },
      { pro_credit_status: "reversed" },
    ]);
    expect(ledger.currentStatus).toBe("reversed");
    expect(ledger.adjustments).toEqual([
      expect.objectContaining({
        claim_id: CLAIM_ID,
        checkout_session_id: "cs_test_pack",
        reason: "refund_recorded",
        status: "pending",
      }),
    ]);
  });

  it("is idempotent across repeated refund events and alerts only once", async () => {
    const stripe = stripeReader({
      charges: [charge({ amount_refunded: 100 })],
    });
    const ledger = adminLedger("applied");

    const first = await reconcileDecisionPackRiskEvent(
      ledger.admin,
      stripe.reader,
      charge({ amount_refunded: 100 }),
    );
    const retry = await reconcileDecisionPackRiskEvent(
      ledger.admin,
      stripe.reader,
      charge({ amount_refunded: 100 }),
    );

    expect(first.creditRowsRevoked).toBe(1);
    expect(first.creditAdjustmentsCreated).toBe(1);
    expect(retry.creditRowsRevoked).toBe(0);
    expect(retry.creditAdjustmentsCreated).toBe(0);
    expect(ledger.adjustments).toHaveLength(1);
    expect(sentry.captureMessage).toHaveBeenCalledTimes(1);
  });

  it("heals a historical reversed row that predates the adjustment queue", async () => {
    const stripe = stripeReader({ disputes: [dispute("lost")] });
    const ledger = adminLedger("reversed");

    const result = await reconcileDecisionPackRiskEvent(
      ledger.admin,
      stripe.reader,
      dispute("lost"),
    );

    expect(result.creditRowsRevoked).toBe(0);
    expect(result.creditAdjustmentsCreated).toBe(1);
    expect(ledger.updates).toEqual([]);
    expect(ledger.adjustments).toHaveLength(1);
    expect(sentry.captureMessage).toHaveBeenCalledTimes(1);
  });

  it("records suspension without mutating terminal credit state", async () => {
    const stripe = stripeReader({ disputes: [dispute("under_review")] });
    const ledger = adminLedger("eligible");
    const result = await reconcileDecisionPackRiskEvent(
      ledger.admin,
      stripe.reader,
      dispute("under_review"),
    );

    expect(result.suspendedSessions).toBe(1);
    expect(ledger.from).not.toHaveBeenCalled();
    expect(ledger.updates).toEqual([]);
  });
});

describe("Decision Pack credit adjustment migration contract", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/20260825120000_decision_pack_credit_adjustments.sql",
    ),
    "utf8",
  );

  it("backfills every historical reversed credit into a unique pending queue", () => {
    expect(migration).toContain(
      "create table if not exists public.decision_pack_credit_adjustments",
    );
    expect(migration).toContain("claim_id uuid not null unique");
    expect(migration).toContain("checkout_session_id text not null unique");
    expect(migration).toContain("where pro_credit_status = 'reversed'");
    expect(migration).toContain("on conflict (claim_id) do nothing");
  });

  it("requires an explicit completed adjustment or approved waiver", () => {
    expect(migration).toContain("status in ('pending', 'completed', 'waived')");
    expect(migration).toContain("status in ('completed', 'waived')");
    expect(migration).toContain("resolved_at is not null");
    expect(migration).toContain(
      "old.status = 'pending' and new.status in ('completed', 'waived')",
    );
  });

  it("keeps the queue server-only and non-deletable", () => {
    expect(migration).toContain(
      "revoke all on table public.decision_pack_credit_adjustments from public, anon, authenticated",
    );
    expect(migration).toContain(
      "grant select, insert, update on table public.decision_pack_credit_adjustments to service_role",
    );
    expect(migration).not.toContain(
      "grant delete on table public.decision_pack_credit_adjustments",
    );
  });

  it("atomically binds every adjustment to the exact reversed claim and Session", () => {
    expect(migration).toContain("begin;");
    expect(migration).toContain("claim.id = new.claim_id");
    expect(migration).toContain(
      "claim.checkout_session_id = new.checkout_session_id",
    );
    expect(migration).toContain("claim.pro_credit_status = 'reversed'");
    expect(migration).toContain("if tg_op = 'INSERT' then");
    expect(migration).toContain(
      "before insert or update on public.decision_pack_credit_adjustments",
    );
    expect(migration.trimEnd()).toMatch(/commit;$/);
  });
});

describe("refund/dispute enforcement stays wired to every release gate", () => {
  const root = process.cwd();
  const verifyAction = readFileSync(
    join(root, "app/actions/one-time-pdf.ts"),
    "utf8",
  );
  const exportAction = readFileSync(
    join(root, "app/actions/generate-report-pdf.ts"),
    "utf8",
  );
  const webhook = readFileSync(
    join(root, "app/api/stripe/webhooks/route.ts"),
    "utf8",
  );
  const billing = readFileSync(join(root, "app/actions/billing.ts"), "utf8");

  it("checks current Stripe state before both verification and export", () => {
    expect(verifyAction).toContain("retrieveDecisionPackStripeAccess(");
    expect(exportAction).toContain("retrieveDecisionPackStripeAccess(");
    expect(
      verifyAction.indexOf(
        "const stripeAccess = await retrieveDecisionPackStripeAccess(",
      ),
    ).toBeLessThan(
      verifyAction.indexOf('firstDecision.mode === "bound-recovery"'),
    );
    expect(
      exportAction.indexOf(
        "const stripeAccess = await retrieveDecisionPackStripeAccess(",
      ),
    ).toBeLessThan(
      exportAction.indexOf(
        "const reportFingerprint = fingerprintOneTimePdfReportBinding(",
      ),
    );
  });

  it("handles refund and dispute lifecycle events in the signed webhook", () => {
    for (const event of [
      'case "charge.refunded"',
      'case "refund.updated"',
      'case "charge.dispute.created"',
      'case "charge.dispute.updated"',
      'case "charge.dispute.closed"',
    ]) {
      expect(webhook).toContain(event);
    }
    expect(webhook).toContain("reconcileDecisionPackRiskEvent(");
  });

  it("revalidates credit at checkout and falls back to the normal coupon path", () => {
    expect(billing).toContain(
      "findEligiblePackCredit(admin, user.id, new Date(), stripe)",
    );
    const lookupStart = billing.indexOf("let packCredit = null");
    const lookupEnd = billing.indexOf("const creditCoupon", lookupStart);
    const lookup = billing.slice(lookupStart, lookupEnd);
    expect(lookup).toContain("try {");
    expect(lookup).toContain("catch (error)");
    expect(billing).toContain(
      "const appliedCoupon = creditCoupon ?? offerCoupon ?? annualCoupon",
    );
  });
});
