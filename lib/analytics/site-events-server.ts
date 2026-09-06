import "server-only";

import { track as vercelServerTrack } from "@vercel/analytics/server";
import type { SiteEvent, SiteEventProps } from "@/lib/analytics/site-events";

/**
 * Server-side counterpart of `track()` for events that only the server can
 * see (checkout_completed from the Stripe webhook, OAuth sign-ups). Best
 * effort: never throws, never blocks the caller for long.
 */
export async function trackServer<E extends SiteEvent>(event: E, props: SiteEventProps[E]): Promise<void> {
  try {
    const clean: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(props as Record<string, unknown>)) {
      if (typeof value === "string") clean[key] = value.slice(0, 80);
      else if (typeof value === "number" || typeof value === "boolean") clean[key] = value;
    }
    await vercelServerTrack(event, clean);
  } catch {
    /* analytics must never affect the money path */
  }
}
