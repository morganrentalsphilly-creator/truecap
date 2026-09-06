import "server-only";

import * as Sentry from "@sentry/nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { PAID_PLAN_SLUGS, getAllPlanPriceIds } from "@/lib/stripe/plan-prices";

/**
 * Stripe → TrueCap user binding, in one place.
 *
 * WHY THIS EXISTS. The Stripe account is SHARED with another product
 * (Philly Rental Compliance stamps `metadata.app = "philly_rental_compliance"`
 * on its Sessions/Subscriptions), and Stripe fans every event to every
 * endpoint on the account. Two failure classes followed from that:
 *
 *   1. Foreign events reached the binding code and raised error-level
 *      Sentry alarms ("cannot resolve verified user for unbound customer") —
 *      94 of them on 2026-08-31 alone, all for the other product's renewals.
 *   2. A genuinely OURS event that carried only an email (or whose
 *      client_reference_id was dropped) had no path to a user and was
 *      silently skipped: the customer paid, the entitlement never landed,
 *      and nothing durable recorded it.
 *
 * Resolution order (first match wins, later steps are never consulted):
 *   1. metadata.supabase_user_id (the key checkout now stamps) — the legacy
 *      `metadata.user_id` stamp is accepted at the same rank because it has
 *      carried the identical value since the first release.
 *   2. client_reference_id
 *   3. the existing profiles.stripe_customer_id mapping
 *   4. the Stripe customer email, matched case-insensitively against
 *      CONFIRMED auth.users emails — accepted only when exactly one matches
 *   5. subscription metadata (user_id) for subscription-level events
 *
 * A candidate that CONTRADICTS another signal (two different ids, or a
 * profile already bound to a different customer) is never auto-bound; that
 * is the pre-existing security posture and it stays.
 *
 * Nothing here sends email or logs PII: Sentry gets event ids and reasons,
 * the unresolved table gets the payload (service-role only).
 */

export const TRUECAP_APP_METADATA_VALUES = new Set(["truecap", "true_cap"]);

const SUPABASE_USER_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUserId(value: unknown): value is string {
  return typeof value === "string" && SUPABASE_USER_ID_RE.test(value);
}

/**
 * True when Stripe metadata names ANOTHER product on this shared account.
 * Absent/blank `app` is treated as ours: TrueCap never stamped one until this
 * change, so every historical TrueCap object is unstamped.
 */
export function isForeignAppMetadata(
  metadata: Stripe.Metadata | null | undefined,
): boolean {
  const app = metadata?.app;
  if (typeof app !== "string") return false;
  const normalized = app.trim().toLowerCase();
  if (normalized.length === 0) return false;
  return !TRUECAP_APP_METADATA_VALUES.has(normalized);
}

/** Every price id TrueCap sells or has ever sold, from env (comma lists). */
function configuredTrueCapPriceIds(): Set<string> {
  const ids = new Set<string>();
  for (const slug of PAID_PLAN_SLUGS) {
    for (const id of getAllPlanPriceIds(slug)) ids.add(id);
  }
  return ids;
}

/**
 * Is this price one of ours? Env first (no IO), then plans.stripe_price_id.
 * `null`/unknown price → `true` (unknown is not evidence of foreignness; the
 * downstream unmapped-price ladder handles it loudly).
 */
export async function isTrueCapPriceId(
  admin: SupabaseClient,
  priceId: string | null,
): Promise<boolean> {
  if (!priceId) return true;
  if (configuredTrueCapPriceIds().has(priceId)) return true;
  const { data, error } = await admin
    .from("plans")
    .select("id")
    .eq("stripe_price_id", priceId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export function primaryPriceIdOf(
  subscription: Pick<Stripe.Subscription, "items">,
): string | null {
  const item = subscription.items?.data?.[0];
  const price = item?.price;
  if (!price) return null;
  return typeof price === "string" ? price : price.id ?? null;
}

/** Metadata keys TrueCap's own checkout has always stamped on subscriptions. */
const TRUECAP_SUBSCRIPTION_MARKERS = ["user_id", "supabase_user_id", "plan_slug"] as const;

function hasTrueCapMarker(metadata: Stripe.Metadata | null | undefined): boolean {
  if (!metadata) return false;
  return TRUECAP_SUBSCRIPTION_MARKERS.some(
    (key) => typeof metadata[key] === "string" && metadata[key].trim().length > 0,
  );
}

/**
 * Foreign-product guard for subscription objects. Such events are SKIPPED
 * quietly — they are not our revenue and must never bind to our users by
 * email. Decision order:
 *   1. `metadata.app` names another product → foreign (definitive).
 *   2. The price is one TrueCap sells (env or plans row) → ours.
 *   3. Unknown price: ours if the subscription carries any TrueCap marker
 *      (checkout metadata) or its customer is already bound to a profile —
 *      that is precisely the unmapped-price incident class, which the
 *      recovery ladder in upsertSubscriptionFromStripe exists to rescue.
 *      No marker, no binding, unknown price → foreign.
 */
export async function isForeignSubscription(
  admin: SupabaseClient,
  subscription: Pick<Stripe.Subscription, "items" | "metadata" | "customer">,
): Promise<boolean> {
  if (isForeignAppMetadata(subscription.metadata)) return true;
  const priceId = primaryPriceIdOf(subscription);
  if (!priceId) return false;
  if (await isTrueCapPriceId(admin, priceId)) return false;
  if (hasTrueCapMarker(subscription.metadata)) return false;
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : (subscription.customer?.id ?? null);
  if (customerId && (await profileByCustomer(admin, customerId))) return false;
  return true;
}

type ProfileRow = { id: string; stripe_customer_id: string | null };

async function profileById(
  admin: SupabaseClient,
  id: string,
): Promise<ProfileRow | null> {
  const { data, error } = await admin
    .from("profiles")
    .select("id, stripe_customer_id")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as ProfileRow | null) ?? null;
}

async function profileByCustomer(
  admin: SupabaseClient,
  customerId: string,
): Promise<ProfileRow | null> {
  const { data, error } = await admin
    .from("profiles")
    .select("id, stripe_customer_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (error) throw error;
  return (data as ProfileRow | null) ?? null;
}

const LIST_USERS_PAGE = 200;
const LIST_USERS_MAX_PAGES = 25;

/**
 * Confirmed auth.users ids whose email equals `email` (case-insensitive).
 * Paginates the Admin API; a hard page ceiling keeps it bounded at a scale
 * far above the current one. Unconfirmed accounts are excluded on purpose —
 * an unverified signup must not be able to claim a paid customer by typing
 * their email.
 */
export async function findConfirmedUserIdsByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<string[]> {
  const needle = email.trim().toLowerCase();
  if (!needle) return [];
  const matches: string[] = [];
  for (let page = 1; page <= LIST_USERS_MAX_PAGES; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: LIST_USERS_PAGE,
    });
    if (error) throw error;
    const users = data?.users ?? [];
    for (const user of users) {
      if (!user.email || !user.email_confirmed_at) continue;
      if (user.email.trim().toLowerCase() === needle) matches.push(user.id);
    }
    if (users.length < LIST_USERS_PAGE) break;
  }
  return matches;
}

export type BillingUserCandidates = {
  /** metadata.supabase_user_id (or the legacy metadata.user_id). */
  metadataUserId?: string | null;
  clientReferenceId?: string | null;
  /** A user id already verified by an earlier step in this same event (checkout → subscription). */
  trustedUserId?: string | null;
  customerId?: string | null;
  /** Provided eagerly when the object carries it (Checkout Session). */
  customerEmail?: string | null;
  /** Lazily fetched when the email step is reached (Subscription → Customer). */
  loadCustomerEmail?: () => Promise<string | null>;
  /** subscription.metadata.user_id — last resort for subscription events. */
  subscriptionMetadataUserId?: string | null;
};

export type BillingUserResolution =
  | {
      userId: string;
      via:
        | "metadata"
        | "client_reference_id"
        | "customer_mapping"
        | "email"
        | "subscription_metadata";
      /** True when the profile↔customer mapping should be persisted now. */
      bindCustomer: boolean;
    }
  | { userId: null; reason: string };

/** The ordered resolver. Pure orchestration over the lookups above. */
export async function resolveBillingUser(
  admin: SupabaseClient,
  c: BillingUserCandidates,
): Promise<BillingUserResolution> {
  const metadataUserId = isValidUserId(c.metadataUserId) ? c.metadataUserId : null;
  const clientReferenceId = isValidUserId(c.clientReferenceId)
    ? c.clientReferenceId
    : null;
  const trustedUserId = isValidUserId(c.trustedUserId) ? c.trustedUserId : null;
  const subscriptionMetadataUserId = isValidUserId(c.subscriptionMetadataUserId)
    ? c.subscriptionMetadataUserId
    : null;
  const customerId = c.customerId?.trim() || null;

  // Contradicting explicit ids are a hard stop — never guess between them.
  const explicit = [trustedUserId, metadataUserId, clientReferenceId].filter(
    (v): v is string => Boolean(v),
  );
  if (new Set(explicit).size > 1) {
    return { userId: null, reason: "conflicting_user_ids" };
  }

  const boundByCustomer = customerId
    ? await profileByCustomer(admin, customerId)
    : null;

  const acceptExplicit = async (
    userId: string,
    via: "metadata" | "client_reference_id" | "subscription_metadata",
  ): Promise<BillingUserResolution> => {
    const profile = await profileById(admin, userId);
    if (!profile) return { userId: null, reason: "candidate_profile_missing" };
    if (boundByCustomer && boundByCustomer.id !== userId) {
      return { userId: null, reason: "customer_bound_to_other_user" };
    }
    if (
      customerId &&
      profile.stripe_customer_id &&
      profile.stripe_customer_id !== customerId
    ) {
      return { userId: null, reason: "profile_bound_to_other_customer" };
    }
    return {
      userId,
      via,
      bindCustomer: Boolean(customerId) && profile.stripe_customer_id !== customerId,
    };
  };

  // 1 + 2. Explicit ids stamped at checkout (trusted id ranks with them).
  if (trustedUserId) return acceptExplicit(trustedUserId, "client_reference_id");
  if (metadataUserId) return acceptExplicit(metadataUserId, "metadata");
  if (clientReferenceId) return acceptExplicit(clientReferenceId, "client_reference_id");

  // 3. Existing mapping. A subscription stamp naming a DIFFERENT user than
  // the one this customer is bound to is a contradiction, not a tiebreak.
  if (boundByCustomer) {
    if (subscriptionMetadataUserId && subscriptionMetadataUserId !== boundByCustomer.id) {
      return { userId: null, reason: "customer_bound_to_other_user" };
    }
    return { userId: boundByCustomer.id, via: "customer_mapping", bindCustomer: false };
  }

  // 4. Confirmed-email match — exactly one.
  const email =
    c.customerEmail?.trim() ||
    (c.loadCustomerEmail ? (await c.loadCustomerEmail())?.trim() : null) ||
    null;
  if (email) {
    const ids = await findConfirmedUserIdsByEmail(admin, email);
    if (ids.length === 1) {
      const profile = await profileById(admin, ids[0]);
      if (!profile) return { userId: null, reason: "email_match_profile_missing" };
      if (
        customerId &&
        profile.stripe_customer_id &&
        profile.stripe_customer_id !== customerId
      ) {
        return { userId: null, reason: "email_match_bound_to_other_customer" };
      }
      return {
        userId: ids[0],
        via: "email",
        bindCustomer: Boolean(customerId) && profile.stripe_customer_id !== customerId,
      };
    }
    if (ids.length > 1) return { userId: null, reason: "email_ambiguous" };
  }

  // 5. Subscription metadata (last resort).
  if (subscriptionMetadataUserId) {
    return acceptExplicit(subscriptionMetadataUserId, "subscription_metadata");
  }

  return { userId: null, reason: email ? "email_no_confirmed_match" : "no_identity_signal" };
}

export type BillingEventContext = {
  eventId: string;
  eventType: string;
  /** The full Stripe event (stored verbatim; service-role only). */
  payload: unknown;
};

export type UnresolvedBillingEventInput = BillingEventContext & {
  customerId?: string | null;
  customerEmail?: string | null;
  amountCents?: number | null;
  currency?: string | null;
  reason: string;
};

const MISSING_TABLE_CODES = new Set(["42P01", "PGRST205", "PGRST204"]);

/**
 * Durably record a paid event we could not bind. Returns where it landed.
 *
 * `table` — the billing_unresolved_events row exists.
 * `fallback` — the migration is not applied yet (relation missing), so the
 *   reason is stamped on the existing stripe_webhook_events row instead; the
 *   Sentry error carries the event id either way. The webhook returns 200
 *   only after one of the two rows is written.
 */
export async function recordUnresolvedBillingEvent(
  admin: SupabaseClient,
  input: UnresolvedBillingEventInput,
): Promise<"table" | "fallback"> {
  const { error } = await admin.from("billing_unresolved_events").upsert(
    {
      stripe_event_id: input.eventId,
      event_type: input.eventType,
      stripe_customer_id: input.customerId ?? null,
      customer_email: input.customerEmail ?? null,
      amount_cents: input.amountCents ?? null,
      currency: input.currency ?? null,
      reason: input.reason,
      payload: input.payload as Record<string, unknown>,
    },
    { onConflict: "stripe_event_id", ignoreDuplicates: true },
  );

  let stored: "table" | "fallback" = "table";
  if (error) {
    if (!MISSING_TABLE_CODES.has(error.code ?? "")) throw error;
    stored = "fallback";
    const { error: stampError } = await admin
      .from("stripe_webhook_events")
      .update({ error_message: `unresolved: ${input.reason}` })
      .eq("stripe_event_id", input.eventId);
    if (stampError) throw stampError;
  }

  Sentry.captureMessage("Stripe paid event could not be bound to a user", {
    level: "error",
    tags: { feature: "stripe-webhook", failure: "unresolved_binding", stored },
    extra: {
      stripe_event_id: input.eventId,
      stripe_event_type: input.eventType,
      reason: input.reason,
      has_customer_id: Boolean(input.customerId),
      has_email: Boolean(input.customerEmail),
      amount_cents: input.amountCents ?? null,
      hint:
        stored === "fallback"
          ? "billing_unresolved_events is not applied yet — apply supabase/migrations/20260906170000_billing_unresolved_events.sql; the reason is on stripe_webhook_events.error_message meanwhile."
          : "Inspect billing_unresolved_events, repair the mapping, then set resolved_at.",
    },
  });
  return stored;
}
