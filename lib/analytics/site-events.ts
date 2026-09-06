/**
 * Typed funnel events for the site overhaul (docs/analytics.md).
 *
 * `track()` fans one event out to:
 *   1. Vercel Web Analytics — cookieless, always (the SDK no-ops outside
 *      production and on sensitive routes where the provider is not mounted);
 *   2. GTM / GA4 via `window.dataLayer` — ONLY after the visitor granted
 *      cookie consent (the banner stores the decision; GTM itself loads only
 *      after consent as well);
 *   3. `window.__tcEvents` — an in-page buffer so browser tests can assert
 *      that an event fired without any network transport.
 *
 * Properties are minimal and never PII: no addresses, no emails, no money
 * amounts beyond plan/interval names.
 */

export type SiteEventProps = {
  analysis_started: { source: "hero" | "analyze_page" | "dashboard" | "sample"; input_type: "address" | "listing_url" | "sample" | "manual" };
  analysis_completed: { verdict: string; has_ceiling: boolean };
  sample_viewed: { source: "hero" | "analyzer" | "link" };
  signup_started: { method: "email" | "google" };
  signup_completed: { method: "email" | "google" };
  trial_started: { method?: "email" | "google" };
  checkout_started: { plan: string; interval: "monthly" | "annual" };
  checkout_completed: { plan: string; interval?: "monthly" | "annual" | "unknown" };
  report_exported: { report_type: string };
  deal_saved: { property_type?: string };
  compare_used: { count_bucket: string };
  testimonial_prompt_shown: { source: string };
  testimonial_submitted: { consent: boolean };
};

export type SiteEvent = keyof SiteEventProps;

export const SITE_EVENTS: readonly SiteEvent[] = [
  "analysis_started",
  "analysis_completed",
  "sample_viewed",
  "signup_started",
  "signup_completed",
  "trial_started",
  "checkout_started",
  "checkout_completed",
  "report_exported",
  "deal_saved",
  "compare_used",
  "testimonial_prompt_shown",
  "testimonial_submitted",
];

export const CONSENT_STORAGE_KEY = "truecap_cookie_consent_v1";

type Primitive = string | number | boolean | null | undefined;
type EventRecord = { event: SiteEvent; props: Record<string, Primitive>; at: number };

declare global {
  interface Window {
    dataLayer?: unknown[];
    __tcEvents?: EventRecord[];
  }
}

/** The banner's stored decision; `null` until the visitor decides. */
export function readStoredAnalyticsConsent(): "granted" | "denied" | null {
  try {
    if (typeof window === "undefined") return null;
    const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

function sanitizeProps(props: Record<string, unknown> | undefined): Record<string, Primitive> {
  const out: Record<string, Primitive> = {};
  if (!props) return out;
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string") out[key] = value.slice(0, 80);
    else if (typeof value === "number" || typeof value === "boolean") out[key] = value;
  }
  return out;
}

let vercelTrackPromise: Promise<((name: string, props?: Record<string, Primitive>) => void) | null> | null = null;

function loadVercelTrack() {
  if (!vercelTrackPromise) {
    vercelTrackPromise = import("@vercel/analytics")
      .then((mod) => (typeof mod.track === "function" ? mod.track : null))
      .catch(() => null);
  }
  return vercelTrackPromise;
}

/**
 * Fire a typed site event from the browser. Never throws; safe to call
 * during SSR (no-op).
 */
export function track<E extends SiteEvent>(event: E, props: SiteEventProps[E]): void {
  if (typeof window === "undefined") return;
  const clean = sanitizeProps(props as Record<string, unknown>);
  try {
    (window.__tcEvents ??= []).push({ event, props: clean, at: Date.now() });
  } catch {
    /* ignore */
  }
  if (readStoredAnalyticsConsent() === "granted") {
    try {
      (window.dataLayer ??= []).push({ event, ...clean });
    } catch {
      /* ignore */
    }
  }
  void loadVercelTrack().then((vercelTrack) => {
    try {
      vercelTrack?.(event, clean);
    } catch {
      /* ignore */
    }
  });
}
