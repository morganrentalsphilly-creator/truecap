import "server-only";

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ClaimedCanonicalEvent =
  | "account_created"
  | "product_evaluation_started"
  | "subscription_started"
  | "shared_analysis_copied";

function dedupeKeyHash(dedupeKey: string): string {
  return createHash("sha256").update(dedupeKey).digest("hex");
}

/**
 * Stable, opaque PostHog event UUID for a canonical transition. PostHog uses
 * the event UUID for ingestion deduplication, so a best-effort capture made
 * while the database claim store is unavailable still cannot inflate the
 * funnel on webhook/callback replay. The raw provider or user identifier is
 * never sent.
 */
export function canonicalAnalyticsEventId(
  eventName: ClaimedCanonicalEvent,
  dedupeKey: string,
): string {
  const bytes = createHash("sha256")
    .update(eventName)
    .update("\0")
    .update(dedupeKey)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Atomically claim a durable external transition before emitting its one
 * canonical analytics event. Only a SHA-256 digest of the provider's local
 * idempotency key is stored; the raw Stripe/session identifier never becomes
 * analytics data or an operational event property.
 */
export async function claimCanonicalAnalyticsEvent(
  admin: SupabaseClient,
  input: { eventName: ClaimedCanonicalEvent; dedupeKey: string },
): Promise<boolean> {
  const hash = dedupeKeyHash(input.dedupeKey);
  const { error } = await admin
    .from("canonical_analytics_event_claims")
    .insert({
      event_name: input.eventName,
      dedupe_key_hash: hash,
    });
  if (!error) return true;
  if (error.code === "23505") return false;
  throw new Error(
    `canonical analytics event claim failed: ${error.code ?? "unknown"}`,
  );
}

/** Release a claim after a local capture failure so a later provider replay
 * can retry. This is telemetry-only cleanup and therefore always fails open. */
export async function releaseCanonicalAnalyticsEventClaim(
  admin: SupabaseClient,
  input: { eventName: ClaimedCanonicalEvent; dedupeKey: string },
): Promise<boolean> {
  try {
    const { error } = await admin
      .from("canonical_analytics_event_claims")
      .delete()
      .eq("event_name", input.eventName)
      .eq("dedupe_key_hash", dedupeKeyHash(input.dedupeKey));
    return !error;
  } catch {
    return false;
  }
}
