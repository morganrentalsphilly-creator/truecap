import "server-only";

import { headers } from "next/headers";
import type { SiteEventProps } from "@/lib/analytics/site-events";

const SERVER_EVENTS = {
  signup_completed: { path: "/auth/callback", keys: ["method"] },
  trial_started: { path: "/auth/callback", keys: ["method"] },
  checkout_completed: { path: "/api/stripe/webhooks", keys: ["plan", "interval"] },
  trial_offer_redeemed: { path: "/api/stripe/webhooks", keys: ["plan"] },
  memo_sent: { path: "/analyze", keys: ["has_ceiling"] },
  sequence_email_sent: { path: "/api/cron/send-lifecycle-emails", keys: ["sequence", "step", "variant"] },
} as const;

function httpsOrigin(value: string | undefined, allowBareHost = false): string | null {
  if (!value?.trim()) return null;
  try {
    const raw = value.trim();
    const url = new URL(allowBareHost && !raw.includes("://") ? `https://${raw}` : raw);
    if (
      url.protocol !== "https:" || url.username || url.password ||
      url.search || url.hash || url.pathname !== "/"
    ) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function deploymentOrigin(): string | null {
  // Never send local/CI events, and never send a preview's events to production.
  const environment = process.env.VERCEL_ENV;
  if (process.env.VERCEL !== "1" || (environment !== "production" && environment !== "preview")) return null;
  const deployment = httpsOrigin(process.env.VERCEL_URL, true);
  if (!deployment) return null;
  return environment === "production"
    ? httpsOrigin(process.env.NEXT_PUBLIC_SITE_URL) ?? deployment
    : deployment;
}

/**
 * Server-side counterpart of `track()` for events that only the server can
 * see (checkout_completed from the Stripe webhook, OAuth sign-ups). Best
 * effort: true means the ingestion endpoint accepted the request, not that a
 * dashboard has processed it. Disabled, rejected and failed requests return false.
 *
 * Maintained adapter for the installed @vercel/analytics/server wire protocol.
 * The SDK serializes its request-context URL (including OAuth codes) and has no
 * server beforeSend/URL override. Keep these fixed paths and compare the payload
 * contract test when upgrading the SDK. Never forward cookies or request URLs.
 */
export async function trackServer<E extends keyof typeof SERVER_EVENTS>(event: E, props: SiteEventProps[E]): Promise<boolean> {
  try {
    const origin = deploymentOrigin();
    const definition = SERVER_EVENTS[event];
    if (!origin || !definition) return false;
    const clean: Record<string, string | number | boolean> = {};
    for (const key of definition.keys) {
      const value = (props as Record<string, unknown>)[key];
      if (typeof value === "string") clean[key] = value.slice(0, 80);
      else if (typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) clean[key] = value;
    }
    const requestHeaders = await headers();
    const outgoingHeaders: Record<string, string> = {
      "content-type": "application/json",
      "x-va-server": "1",
    };
    const userAgent = requestHeaders.get("user-agent");
    const forwardedFor = requestHeaders.get("x-forwarded-for");
    // Unusually large client headers should not prevent the event being sent.
    // Omit them rather than truncating an IP chain into an invalid address.
    if (userAgent && userAgent.length <= 1_024) outgoingHeaders["user-agent"] = userAgent;
    if (forwardedFor && forwardedFor.length <= 512) outgoingHeaders["x-vercel-ip"] = forwardedFor;
    const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    if (bypass) outgoingHeaders["x-vercel-protection-bypass"] = bypass;
    const response = await fetch(`${origin}/_vercel/insights/event`, {
      method: "POST",
      headers: outgoingHeaders,
      body: JSON.stringify({ o: `${origin}${definition.path}`, ts: Date.now(), r: "", en: event, ed: clean }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(2_000),
    });
    return response.ok;
  } catch {
    /* analytics must never affect the money path */
    return false;
  }
}
