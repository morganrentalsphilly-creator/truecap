import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import {
  isForeignSubscription,
  recordUnresolvedBillingEvent as defaultRecordUnresolved,
  resolveBillingUser,
  type BillingUserResolution,
} from "@/lib/stripe/billing-user-resolution";
import { upsertSubscriptionFromStripe as defaultUpsert } from "@/lib/stripe/subscription-sync";

/**
 * Billing reconcile — the slow path for the Stripe ↔ user binding.
 *
 * The webhook is the fast path; this pass walks every paid Stripe
 * subscription on the (shared) account, ignores the other product's, and
 * for each one WITHOUT a local subscriptions row asks the same ordered
 * resolver the webhook uses (lib/stripe/billing-user-resolution.ts) whether
 * the owner can be established: checkout metadata → existing customer
 * mapping → exactly-one confirmed auth.users email → subscription metadata.
 *
 *   dry   — count everything, write nothing (DEFAULT everywhere)
 *   apply — for each resolvable subscription run upsertSubscriptionFromStripe
 *           (the exact webhook path: binds the customer, resolves the plan,
 *           upserts the row); record every unresolvable one durably in
 *           billing_unresolved_events; re-check open unresolved rows.
 *
 * The summary carries COUNTS ONLY — no ids, no emails — so it can be logged
 * and pasted into a report verbatim.
 *
 * Runs from two hosts: the cron route (inside Vercel, real env) and
 * scripts/billing-reconcile.ts (local, needs a real env file). Both inject
 * the Stripe + admin clients; tests inject fakes.
 */

export type BillingReconcileMode = "dry" | "apply";

export function resolveBillingReconcileMode(
  raw: string | null | undefined,
): "off" | BillingReconcileMode {
  const value = (raw ?? "dry").trim().toLowerCase();
  if (value === "off") return "off";
  if (value === "apply" || value === "live") return "apply";
  return "dry";
}

const PAID_STATUSES = new Set(["active", "trialing", "past_due"]);

export type BillingReconcileSummary = {
  mode: BillingReconcileMode;
  stripe_subscriptions_scanned: number;
  stripe_listing_truncated: boolean;
  skipped_not_paid: number;
  skipped_foreign_app: number;
  already_bound: number;
  resolvable_by: Record<
    "metadata" | "client_reference_id" | "customer_mapping" | "email" | "subscription_metadata",
    number
  >;
  unresolved: number;
  unresolved_by_reason: Record<string, number>;
  applied: number;
  apply_failures: number;
  unresolved_recorded: number;
  unresolved_table_available: boolean;
  open_unresolved_rows_checked: number;
  open_unresolved_rows_resolved: number;
  errors: number;
};

export type BillingReconcileDeps = {
  stripe: Pick<Stripe, "subscriptions" | "customers">;
  admin: SupabaseClient;
  mode: BillingReconcileMode;
  /** Stripe listing ceiling; the account is small, the cap is a safety rail. */
  listCap?: number;
  /** Open billing_unresolved_events rows re-checked per run. */
  unresolvedCap?: number;
  log?: (line: string) => void;
  /** Injection points for tests — default to the real webhook code paths. */
  upsertSubscriptionFromStripe?: typeof defaultUpsert;
  recordUnresolvedBillingEvent?: typeof defaultRecordUnresolved;
};

type OpenUnresolvedRow = {
  id: string;
  stripe_event_id: string;
  stripe_customer_id: string | null;
  payload: unknown;
};

const MISSING_TABLE_CODES = new Set(["42P01", "PGRST205", "PGRST204"]);

function customerIdOf(sub: Stripe.Subscription): string | null {
  return typeof sub.customer === "string" ? sub.customer : (sub.customer?.id ?? null);
}

function bump(record: Record<string, number>, key: string): void {
  record[key] = (record[key] ?? 0) + 1;
}

/** The subscription id an unresolved payload refers to, if any. */
export function subscriptionIdFromUnresolvedPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const data = p.data as { object?: Record<string, unknown> } | undefined;
  const object = data?.object;
  if (object) {
    if (object.object === "subscription" && typeof object.id === "string") return object.id;
    if (typeof object.subscription === "string") return object.subscription;
    const nested = object.subscription as { id?: unknown } | null | undefined;
    if (nested && typeof nested.id === "string") return nested.id;
    return null;
  }
  if (p.object === "subscription" && typeof p.id === "string") return p.id;
  return null;
}

export async function runBillingReconcile(
  deps: BillingReconcileDeps,
): Promise<BillingReconcileSummary> {
  const {
    stripe,
    admin,
    mode,
    listCap = 500,
    unresolvedCap = 100,
    log = () => {},
    upsertSubscriptionFromStripe = defaultUpsert,
    recordUnresolvedBillingEvent = defaultRecordUnresolved,
  } = deps;

  const summary: BillingReconcileSummary = {
    mode,
    stripe_subscriptions_scanned: 0,
    stripe_listing_truncated: false,
    skipped_not_paid: 0,
    skipped_foreign_app: 0,
    already_bound: 0,
    resolvable_by: {
      metadata: 0,
      client_reference_id: 0,
      customer_mapping: 0,
      email: 0,
      subscription_metadata: 0,
    },
    unresolved: 0,
    unresolved_by_reason: {},
    applied: 0,
    apply_failures: 0,
    unresolved_recorded: 0,
    unresolved_table_available: true,
    open_unresolved_rows_checked: 0,
    open_unresolved_rows_resolved: 0,
    errors: 0,
  };

  const loadCustomerEmail = async (customerId: string): Promise<string | null> => {
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer || customer.deleted) return null;
    return customer.email ?? null;
  };

  const resolveFor = (sub: Stripe.Subscription): Promise<BillingUserResolution> => {
    const customerId = customerIdOf(sub);
    return resolveBillingUser(admin, {
      metadataUserId: sub.metadata?.supabase_user_id ?? null,
      customerId,
      loadCustomerEmail: customerId ? () => loadCustomerEmail(customerId) : undefined,
      subscriptionMetadataUserId: sub.metadata?.user_id ?? null,
    });
  };

  // ── Pass 1: every paid Stripe subscription must have a bound local row.
  const subs: Stripe.Subscription[] = [];
  for await (const sub of stripe.subscriptions.list({ status: "all", limit: 100 })) {
    subs.push(sub);
    if (subs.length >= listCap) {
      summary.stripe_listing_truncated = true;
      break;
    }
  }
  summary.stripe_subscriptions_scanned = subs.length;

  for (const sub of subs) {
    try {
      if (!PAID_STATUSES.has(sub.status)) {
        summary.skipped_not_paid += 1;
        continue;
      }
      if (await isForeignSubscription(admin, sub)) {
        summary.skipped_foreign_app += 1;
        continue;
      }
      const { data: local, error: localError } = await admin
        .from("subscriptions")
        .select("id, user_id")
        .eq("stripe_subscription_id", sub.id)
        .maybeSingle();
      if (localError) throw localError;
      if (local && (local as { user_id: string | null }).user_id) {
        summary.already_bound += 1;
        continue;
      }

      const resolution = await resolveFor(sub);
      if (resolution.userId === null) {
        summary.unresolved += 1;
        bump(summary.unresolved_by_reason, resolution.reason);
        if (mode === "apply") {
          const stored = await recordUnresolvedBillingEvent(admin, {
            eventId: `reconcile:${sub.id}`,
            eventType: "reconcile.subscription",
            payload: sub,
            customerId: customerIdOf(sub),
            customerEmail: null,
            amountCents: null,
            currency: sub.currency ?? null,
            reason: resolution.reason,
          });
          if (stored === "fallback") summary.unresolved_table_available = false;
          else summary.unresolved_recorded += 1;
        }
        continue;
      }

      summary.resolvable_by[resolution.via] += 1;
      if (mode === "apply") {
        const result = await upsertSubscriptionFromStripe(admin, sub, null, {
          eventId: `reconcile:${sub.id}`,
          eventType: "reconcile.subscription",
          payload: sub,
        });
        if (result.synced) summary.applied += 1;
        else summary.apply_failures += 1;
      }
    } catch (error) {
      summary.errors += 1;
      log(`[billing-reconcile] subscription pass error: ${error instanceof Error ? error.message.slice(0, 200) : "unknown"}`);
    }
  }

  // ── Pass 2: open unresolved rows — has the owner become resolvable since?
  const { data: openRows, error: openError } = await admin
    .from("billing_unresolved_events")
    .select("id, stripe_event_id, stripe_customer_id, payload")
    .is("resolved_at", null)
    .order("created_at", { ascending: true })
    .limit(unresolvedCap);
  if (openError) {
    if (MISSING_TABLE_CODES.has(openError.code ?? "")) {
      summary.unresolved_table_available = false;
    } else {
      summary.errors += 1;
      log(`[billing-reconcile] unresolved read error: ${openError.message.slice(0, 200)}`);
    }
  } else {
    const rows = (openRows ?? []) as OpenUnresolvedRow[];
    summary.open_unresolved_rows_checked = rows.length;
    for (const row of rows) {
      try {
        const subscriptionId = subscriptionIdFromUnresolvedPayload(row.payload);
        if (!subscriptionId) continue;
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        if (await isForeignSubscription(admin, sub)) continue;
        const resolution = await resolveFor(sub);
        if (resolution.userId === null) continue;
        if (mode !== "apply") {
          summary.open_unresolved_rows_resolved += 1; // would resolve
          continue;
        }
        const result = await upsertSubscriptionFromStripe(admin, sub, null, {
          eventId: row.stripe_event_id,
          eventType: "reconcile.replay",
          payload: row.payload,
        });
        if (!result.synced) {
          summary.apply_failures += 1;
          continue;
        }
        const { error: markError } = await admin
          .from("billing_unresolved_events")
          .update({
            resolved_at: new Date().toISOString(),
            resolved_user_id: resolution.userId,
            resolution_note: `billing-reconcile via ${resolution.via}`,
          })
          .eq("id", row.id);
        if (markError) throw markError;
        summary.open_unresolved_rows_resolved += 1;
      } catch (error) {
        summary.errors += 1;
        log(`[billing-reconcile] unresolved pass error: ${error instanceof Error ? error.message.slice(0, 200) : "unknown"}`);
      }
    }
  }

  return summary;
}
