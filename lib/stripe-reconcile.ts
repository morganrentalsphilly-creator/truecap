/**
 * Stripe reconciliation — pure classification logic.
 *
 * The safety net for the "paid in Stripe, free in app" failure class:
 * webhook events Stripe gave up retrying (>72h) leave
 * stripe_webhook_events.processed_at NULL forever, and subscription
 * rows that synced while plans.stripe_price_id was misconfigured sit
 * with plan_id = null (free entitlements) until the next natural
 * Stripe event — up to 12 months for annual plans. Nothing else in the
 * codebase reads that drift; this module + the weekly cron are the pager.
 *
 * This module is pure (no IO) and unit-tested in
 * lib/__tests__/stripe-reconcile.test.ts. All IO — Supabase reads,
 * stripe.subscriptions.list/retrieve, healing via
 * upsertSubscriptionFromStripe, Sentry, the RECONCILE_MODE kill switch —
 * lives in app/api/cron/reconcile-stripe/route.ts.
 */

export type ReconcileMode = "off" | "dry" | "live";

/**
 * RECONCILE_MODE parse — mirrors resolveRateAlertsMode's contract
 * (off by default; the feature ships dormant until Morgan flips it).
 * Takes the raw env value as a parameter so this stays pure/testable;
 * only the cron route reads process.env.
 */
export function resolveReconcileMode(raw: string | undefined | null): ReconcileMode {
  const value = (raw ?? "off").trim().toLowerCase();
  if (value === "live") return "live";
  if (value === "dry" || value === "dry-run") return "dry";
  return "off";
}

/**
 * Stripe statuses that mean "this user is paying (or in grace) and must
 * resolve to a paid plan locally". Matches the paid-status set used by
 * upsertSubscriptionFromStripe's unmapped-plan alarm.
 */
export const PAID_STATUSES = ["active", "trialing", "past_due"] as const;

export function isPaidStatus(status: string): boolean {
  return (PAID_STATUSES as readonly string[]).includes(status);
}

// ---------------------------------------------------------------------------
// Pass 1 — stuck webhook events
// ---------------------------------------------------------------------------

export type StuckWebhookEventRow = {
  stripe_event_id: string;
  type: string;
  received_at: string;
  error_message: string | null;
};

export type StuckEventSummary = {
  id: string;
  type: string;
  age_hours: number;
  error_message: string | null;
};

/** Max chars of a stored error_message forwarded to Sentry. */
const ERROR_MESSAGE_SNIPPET_LENGTH = 200;

/**
 * Shape stuck stripe_webhook_events rows for a single Sentry summary.
 * IDs + event types + error snippets only — no PII (pitfall #4).
 */
export function summarizeStuckEvents(rows: StuckWebhookEventRow[], now: Date): StuckEventSummary[] {
  return rows.map((row) => {
    const receivedMs = new Date(row.received_at).getTime();
    const ageHours = Number.isFinite(receivedMs)
      ? Math.max(0, Math.round((now.getTime() - receivedMs) / 3_600_000))
      : -1; // unparseable timestamp — surface it rather than throw
    return {
      id: row.stripe_event_id,
      type: row.type,
      age_hours: ageHours,
      error_message: row.error_message ? row.error_message.slice(0, ERROR_MESSAGE_SNIPPET_LENGTH) : null,
    };
  });
}

// ---------------------------------------------------------------------------
// Pass 2 — subscription truth check (Stripe is the source of truth)
// ---------------------------------------------------------------------------

export type LocalSubscriptionRow = {
  id: string;
  user_id: string;
  plan_id: string | null;
  status: string;
  stripe_subscription_id: string | null;
};

/** The minimal slice of a Stripe subscription the classifier needs. */
export type StripeSubscriptionSnapshot = {
  id: string;
  status: string;
};

export type StatusMismatch = {
  stripe_subscription_id: string;
  local_status: string;
  stripe_status: string;
};

export type SubscriptionMismatches = {
  /** (a) Paid in Stripe, no local subscriptions row at all. */
  missingLocal: string[];
  /**
   * (b) Paid in Stripe, local row exists but plan_id is null —
   * getEntitlementsForUser silently resolves this user to FREE.
   */
  nullPlan: string[];
  /**
   * (c) Local row exists but its status disagrees with Stripe's.
   * Includes the inverse revenue-leak: Stripe canceled/non-paid while
   * the local row still grants a paid status (lost deletion webhook).
   */
  statusMismatch: StatusMismatch[];
};

/**
 * Compare Stripe subscriptions against local rows.
 *
 * Paid Stripe subscriptions are checked in full: missing local row (a),
 * null plan_id (b), status disagreement (c). Non-paid Stripe
 * subscriptions (canceled, incomplete, …) are checked ONLY for the
 * inverse drift: a local row that still grants a paid status while
 * Stripe says otherwise — the lost-`customer.subscription.deleted`
 * case where a user keeps Pro forever. (Since the listing uses
 * status:'all', canceled subs DO appear in it, so the orphan pass —
 * which only sees ids absent from the listing — would never catch
 * them.) A missing local row for a non-paid Stripe sub is NOT drift;
 * it costs no one entitlements.
 *
 * A single subscription can appear in BOTH nullPlan and statusMismatch;
 * one upsertSubscriptionFromStripe call heals both.
 */
export function classifyStripeSubscriptions(
  stripeSubs: StripeSubscriptionSnapshot[],
  localRows: LocalSubscriptionRow[]
): SubscriptionMismatches {
  const localByStripeId = new Map<string, LocalSubscriptionRow>();
  for (const row of localRows) {
    if (row.stripe_subscription_id) localByStripeId.set(row.stripe_subscription_id, row);
  }

  const mismatches: SubscriptionMismatches = {
    missingLocal: [],
    nullPlan: [],
    statusMismatch: [],
  };

  for (const sub of stripeSubs) {
    if (!isPaidStatus(sub.status)) {
      // Inverse drift inside the listing: Stripe canceled (or otherwise
      // non-paid), but the local row still claims a paid status.
      const local = localByStripeId.get(sub.id);
      if (local && isPaidStatus(local.status)) {
        mismatches.statusMismatch.push({
          stripe_subscription_id: sub.id,
          local_status: local.status,
          stripe_status: sub.status,
        });
      }
      continue;
    }
    const local = localByStripeId.get(sub.id);
    if (!local) {
      mismatches.missingLocal.push(sub.id);
      continue;
    }
    if (local.plan_id === null) mismatches.nullPlan.push(sub.id);
    if (local.status !== sub.status) {
      mismatches.statusMismatch.push({
        stripe_subscription_id: sub.id,
        local_status: local.status,
        stripe_status: sub.status,
      });
    }
  }

  return mismatches;
}

export type LocalPaidPartition = {
  /**
   * Paid locally, has a stripe_subscription_id, but that id wasn't in
   * the (possibly capped) Stripe listing. NOT proof of drift — the
   * listing is capped for safety, so each candidate must be confirmed
   * with an individual stripe.subscriptions.retrieve before reporting.
   */
  orphanCandidates: LocalSubscriptionRow[];
  /**
   * Paid locally with NO stripe_subscription_id at all — unreconcilable
   * against Stripe. Report-only anomaly.
   */
  missingStripeId: LocalSubscriptionRow[];
};

/**
 * The inverse direction: local rows claiming paid status whose Stripe
 * counterpart didn't show up in the listing.
 */
export function partitionLocalPaidRows(
  localRows: LocalSubscriptionRow[],
  listedStripeIds: ReadonlySet<string>
): LocalPaidPartition {
  const partition: LocalPaidPartition = { orphanCandidates: [], missingStripeId: [] };
  for (const row of localRows) {
    if (!isPaidStatus(row.status)) continue;
    if (!row.stripe_subscription_id) {
      partition.missingStripeId.push(row);
      continue;
    }
    if (!listedStripeIds.has(row.stripe_subscription_id)) {
      partition.orphanCandidates.push(row);
    }
  }
  return partition;
}

/**
 * After retrieving an orphan candidate's subscription from Stripe:
 * does the local row need healing? True when the statuses disagree
 * (e.g. local "active", Stripe "canceled") or the local plan mapping
 * is missing. False means the candidate was a false positive from the
 * capped listing — matching state, nothing to do.
 */
export function orphanNeedsHeal(local: LocalSubscriptionRow, stripeStatus: string): boolean {
  return local.status !== stripeStatus || local.plan_id === null;
}
