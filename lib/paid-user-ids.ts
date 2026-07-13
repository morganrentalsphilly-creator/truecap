import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Subscription statuses the entitlement layer treats as "still entitled".
 * Must stay in lockstep with getEntitlementsForUser / hasPaidPlanSubscription
 * (lib/entitlements.ts) — including past_due (Stripe is still dunning; the
 * user keeps Pro in-app, so they stay in Pro email audiences too).
 */
const PAID_SUBSCRIPTION_STATUSES = ["active", "trialing", "past_due"];

/**
 * User ids the entitlement layer considers PAID — the shared audience
 * source for the Pro-only crons (rate alerts, rent alerts, weekly summary,
 * lifecycle emails). Replaces the four crons' raw
 * `.in("status", ["active","trialing"])` queries, which bypassed the plan
 * layer (CLAUDE.md §3.3) and dropped past_due users.
 *
 * Mirrors lib/entitlements.ts exactly:
 *  - status in active/trialing/past_due;
 *  - per user, the row with the LATEST updated_at wins — the same tiebreak
 *    as getEntitlementsForUser's `.order("updated_at", desc).limit(1)`;
 *  - that row must join to a plan whose slug != "free" — the same test as
 *    hasPaidPlanSubscription. A row with plan_id null (unmapped Stripe
 *    price — the incident shape) therefore does NOT count as paid, so cron
 *    emails match what the product actually shows the user.
 *
 * Throws on query error — callers are crons whose top-level catch already
 * Sentry-tags and returns 500 (fail loud, never a silently-empty audience).
 */
export async function getPaidUserIds(admin: SupabaseClient): Promise<string[]> {
  const { data, error } = await admin
    .from("subscriptions")
    .select("user_id, updated_at, plans(slug)")
    .in("status", PAID_SUBSCRIPTION_STATUSES);
  if (error) throw error;

  const latestByUser = new Map<string, { updatedAt: string; slug: string | null }>();
  for (const row of data ?? []) {
    const userId = row.user_id as string;
    const updatedAt = (row.updated_at as string | null) ?? "";
    const plansRow = row.plans as { slug?: unknown } | null | undefined;
    const slug = typeof plansRow?.slug === "string" ? plansRow.slug : null;
    const prev = latestByUser.get(userId);
    if (!prev || updatedAt > prev.updatedAt) {
      latestByUser.set(userId, { updatedAt, slug });
    }
  }

  const paid: string[] = [];
  for (const [userId, { slug }] of latestByUser) {
    if (slug && slug !== "free") paid.push(userId);
  }
  return paid;
}
