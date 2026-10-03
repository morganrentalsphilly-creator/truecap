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
  /**
   * What this counts, by method:
   *  - "email": the sign-up form was SUBMITTED and accepted
   *    (components/auth/sign-up-form.tsx fires it when signUpAction returns
   *    ok). With email confirmation on, that is before the confirmation link
   *    is clicked, so it includes accounts that are never confirmed. It is
   *    sent from the browser, so it is also missing wherever analytics is
   *    not mounted (sign-up URLs carrying `next=`, see lib/sensitive-url.ts).
   *  - "google": a new Google account was created (app/auth/callback/route.ts,
   *    server-side, once per account). Google accounts are confirmed.
   *
   * It is NOT the same number as the `signup_completed` rows in
   * seo_conversions (seo/scripts/signups.ts, read by the SEO dashboard):
   * those are built from auth.users and count CONFIRMED accounts whose
   * first-touch record has an organic source only. Expect this event to read higher for email
   * sign-ups. The name is kept because the dashboards, the SEO control
   * plane's event_name check and docs/analytics.md all read it.
   */
  signup_completed: { method: "email" | "google" };
  /** Fires together with `signup_completed`, so it counts the same thing. */
  trial_started: { method?: "email" | "google" };
  checkout_started: { plan: string; interval: "monthly" | "annual" };
  checkout_completed: { plan: string; interval?: "monthly" | "annual" | "unknown" };
  report_exported: { report_type: string };
  deal_saved: { property_type?: string };
  compare_used: { count_bucket: string };
  testimonial_prompt_shown: { source: string };
  testimonial_submitted: { consent: boolean };
  /**
   * The cookie banner's decision: Accept is "granted"; Reject, the X and
   * Escape are "denied". It is the only way to learn what share of visitors
   * the consent-gated Google tags can see at all.
   */
  cookie_consent_choice: { choice: "granted" | "denied" };
  /**
   * A click on a primary call to action. `source` names the control, never
   * the visitor or the deal. PostHog has no key in production, so without
   * this the funnel jumped from page view to `analysis_started`.
   */
  primary_cta_clicked: { source: string };
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
  "cookie_consent_choice",
  "primary_cta_clicked",
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

/**
 * Count the banner's decision, read back from storage after the banner wrote
 * it. Cookieless: Vercel always, `dataLayer` only when the decision is
 * "granted" (the rule every `track()` call follows). Returns the choice it
 * recorded, or null when no decision is stored (storage blocked), in which
 * case nothing is sent.
 */
export function recordCookieConsentChoice(): "granted" | "denied" | null {
  const choice = readStoredAnalyticsConsent();
  if (choice) track("cookie_consent_choice", { choice });
  return choice;
}
