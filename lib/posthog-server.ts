import "server-only";

/**
 * Server-side PostHog client.
 *
 * Why a separate file from lib/analytics.ts:
 *   The browser SDK (posthog-js) batches + auto-flushes events in the
 *   background. The Node SDK (posthog-node) needs explicit lifecycle
 *   management — events are buffered until `flush()` or `shutdown()`
 *   is called. In a serverless / Vercel function context, the function
 *   can exit before the buffer flushes, dropping events silently.
 *
 *   This module exposes one helper — `captureServerEvent` — that
 *   captures + flushes in a single call, so callers in API routes /
 *   server actions / webhooks don't have to worry about lifecycle.
 *
 * Use this for events that fire from the server, never from the
 * browser (the browser uses lib/analytics.ts instead).
 *
 * Required env var: POSTHOG_API_KEY — the PROJECT API token (starts
 * with phc_..., same value as NEXT_PUBLIC_POSTHOG_KEY). posthog-node's
 * capture API authenticates with the project token, NOT a personal key.
 * (A phx_ personal key is only for the PostHog Query API — keep one
 * locally for analysis if needed, but never deploy it and never put it
 * in this variable: capture would silently stop working.)
 *
 * Optional env var: NEXT_PUBLIC_POSTHOG_HOST (defaults to
 * https://us.i.posthog.com — US Cloud).
 */

import { PostHog } from "posthog-node";
import { sanitizeAnalyticsEventProperties } from "@/lib/analytics-event-dictionary";

const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

// Cached singleton — posthog-node maintains its own connection pool
// and event buffer, so we want exactly one instance per serverless
// container. Lazy-init inside getClient() so missing env doesn't crash
// modules that import this file but never actually use it.
let client: PostHog | null = null;

function getClient(): PostHog | null {
  const apiKey = process.env.POSTHOG_API_KEY;
  if (!apiKey) return null;
  if (!client) {
    client = new PostHog(apiKey, {
      host: HOST,
      // flushAt + flushInterval govern batching. Default flushAt is 20
      // and flushInterval is 10s. For serverless we explicitly flush
      // after each capture so events don't get stranded in the buffer
      // when the function exits — but keeping the defaults here is
      // fine because we call .flush() explicitly in captureServerEvent.
    });
  }
  return client;
}

/**
 * Capture a server-side event and flush immediately.
 *
 * `distinctId` should be the Supabase auth.users.id (UUID) when the
 * event is attributable to a known user. For anonymous server events
 * (rare), pass a stable per-request identifier or fall back to "$server".
 */
export async function captureServerEvent(opts: {
  distinctId: string;
  event: "pro_subscribed" | string;
  properties?: Record<string, unknown>;
}): Promise<void> {
  const ph = getClient();
  if (!ph) {
    // Env not configured — analytics off. Don't throw.
    return;
  }
  try {
    ph.capture({
      distinctId: opts.distinctId,
      event: opts.event,
      properties: sanitizeAnalyticsEventProperties(opts.event, opts.properties),
    });
    // Critical for serverless: drain the buffer before the function
    // can exit. Without this, Vercel function termination can drop
    // the event silently.
    await ph.flush();
  } catch (err) {
    // Analytics must never break the webhook / server action path.
    console.warn("[posthog-server] captureServerEvent failed:", err);
  }
}
