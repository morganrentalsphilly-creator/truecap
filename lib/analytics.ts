/**
 * Client-side analytics wrapper.
 *
 * Why a wrapper instead of importing posthog-js directly at call sites:
 *
 *   1. SAFE NO-OP — if `NEXT_PUBLIC_POSTHOG_KEY` isn't set (local dev,
 *      preview deploys without analytics, ad-blocked sessions),
 *      every capture call becomes a no-op instead of throwing.
 *   2. CONSENT-AWARE — even when PostHog is initialized, it stays
 *      opted-out until the user accepts cookies. These helpers respect
 *      that state automatically because they go through posthog-js's
 *      built-in opt-in/opt-out machinery.
 *   3. TYPED EVENT NAMES — the funnel events are an enum, not free
 *      text. Typos at call sites become TypeScript errors instead of
 *      silently fragmenting the funnel into 3 lookalike events in the
 *      PostHog dashboard.
 *   4. LAZY-LOADED — posthog-js is ~60 KB gz, so it is dynamic-imported
 *      off the critical path instead of statically bundled into every
 *      route. PostHogProvider schedules `initAnalytics()` via
 *      requestIdleCallback; every helper below buffers calls made
 *      before init resolves in a small FIFO queue and replays them once
 *      the SDK is up. Early funnel events (landing_view, the consent
 *      decision, identify, the first $pageview) arrive 1-2 s later —
 *      never lost.
 *
 * Server-side events (e.g. `pro_subscribed` from the Stripe webhook)
 * go through lib/posthog-server.ts, not this file.
 */

import type { PostHog } from "posthog-js";
import {
  SENSITIVE_PUBLIC_SHARE_ROUTE_PATTERN,
  redactSensitiveQueryValuesInText,
  sanitizeAnalyticsUrlProperties,
  sanitizeSensitiveUrl,
} from "@/lib/sensitive-url";

/**
 * Named events tracked client-side. Adding a new one? Add it here AND
 * document the expected `properties` shape in the inline JSDoc so the
 * PostHog dashboard stays parseable.
 *
 * Server-side events (pro_checkout_started, pro_subscribed,
 * newsletter_subscribed, subscription_cancelled) are captured via
 * lib/posthog-server.ts and don't need to appear here.
 */
export type FunnelEvent =
  | "organic_landing" // properties: landing_page, referrer_host, attribution_medium
  | "calculator_started" // properties: calculator, landing_page?
  | "calculator_completed" // properties: calculator, landing_page?
  | "report_viewed"
  | "signup_started"
  | "signup_completed"
  | "trial_started"
  | "paid_conversion"
  | "embed_code_copied" // properties: calculator
  | "embed_loaded" // properties: calculator, referring_domain
  | "embed_attribution_clicked" // properties: calculator, referring_domain
  | "landing_view"
  | "homepage_viewed"
  | "homepage_primary_cta" // properties: source (hero_address | sticky | final)
  | "analyzer_started"
  | "address_submitted"
  | "instant_screen_generated"
  | "assumptions_opened"
  | "assumptions_updated"
  | "analysis_completed"
  | "analyzer_completed"
  | "verdict_viewed"
  | "deal_fit_viewed" // properties: score_band, methodology_version
  | "input_confidence_viewed" // properties: score_band, stage, sensitivity_risk, method_version
  | "assumption_verified" // properties: field_key, source_class, method_version
  | "confidence_increased" // properties: from_band, to_band, method_version
  | "offer_ready_reached" // properties: method_version, confidence_band
  | "what_needs_to_be_true_viewed" // properties: lever_count, target_basis
  | "decision_threshold_applied" // properties: lever (price | rent | rate | seller_credit | rehab | opex)
  | "financing_profile_created" // properties: loan_type
  | "financing_profile_applied" // properties: loan_type, age_band
  | "deal_decision_pack_started" // properties: source, methodology_version
  | "deal_decision_pack_purchased" // server-authoritative preferred
  | "prepare_my_offer_clicked" // properties: offer_ready_stage
  | "saved_deal_watch_enabled" // properties: trigger_count
  | "deal_alert_opened" // properties: alert_type
  | "pipeline_stage_changed" // properties: from_stage, to_stage, moved_to_offer_ready
  | "agent_client_created" // properties: source
  | "client_report_shared" // properties: report_type
  | "buy_box_result_viewed"
  | "max_offer_teaser_viewed"
  | "max_offer_unlock_clicked"
  | "max_offer_unlocked"
  | "stress_test_opened"
  | "downside_viewed"
  | "deal_compared"
  | "pro_checkout_started"
  | "pro_subscribed"
  | "deal_saved"        // properties: property_type, purchase_price, cap_rate, monthly_cash_flow
  | "pdf_exported"      // properties: property_type, purchase_price, has_deal_score
  | "share_link_copied" // properties: has_address
  // ── Conversion-improvement events ──────────────────────────────
  // Fired by the 5 free-tier conversion improvements shipped after
  // the math audit. Each gives the funnel one more measurable step
  // so we can spot which improvement is actually moving the needle.
  | "email_capture_shown"     // properties: address_present
  | "email_capture_submitted" // properties: address_present, scheduled_count
  | "email_capture_dismissed"
  | "exit_intent_shown"
  | "exit_intent_clicked"     // properties: variant (always "50_off_annual" for now)
  | "exit_intent_dismissed"
  // Sample-deal Pro preview — fires when a non-Pro visitor runs the
  // sample deal and the full Pro report is unlocked for the demo.
  // Compare pro_checkout_started rates for sessions with vs without
  // this event to measure whether tasting Pro sells Pro.
  | "sample_pro_preview_viewed" // properties: property_type
  // One-time $5 lender PDF (Stripe Checkout `payment` mode).
  // started → user left for Stripe; purchased → verified paid on return.
  // The gap between the two = one-time checkout drop-off.
  | "one_time_pdf_checkout_started" // properties: property_type
  | "one_time_pdf_purchased"
  | "single_deal_checkout_started" // properties: property_type, price_variant
  | "single_deal_purchased"        // properties: price_variant
  | "single_deal_checkout_completed"
  // Deal Q&A (AI panel under the recommendation card).
  | "deal_qa_asked" // properties: question_length
  // AI deal summary (one-tap grounded summary card).
  | "deal_summary_generated"
  // ── Homepage → analyzer funnel (hero input + simplified flow) ──
  // Granular steps so we can A/B the hero input + minimal analyzer and
  // see exactly where starts drop off. No PII: we never send the typed
  // address string, only coarse signals (state, has_components).
  | "hero_address_submit"      // properties: has_components (Places state/zip captured)
  | "hero_sample_clicked"
  | "address_selected"         // properties: state (coarse; never the full address)
  | "optional_section_opened"  // properties: source ("toggle" | "edit_link")
  | "result_assumptions_edited"
  // ── Investor-OS saved-deal workflow (P1-12) ────────────────────
  // The Pro buy-box and scenario flows write to the DB but fired no
  // events, leaving that whole workflow invisible in the funnel. These
  // close the attribution gap so we can see buy-box adoption and which
  // strategies investors model as scenarios. No PII — only coarse
  // signals (source, default flag, strategy kind, counts).
  | "buy_box_saved"      // properties: source ("settings" | "template"), is_new?, is_default, has_strategy
  | "buy_box_created"    // properties: source, is_default, has_strategy
  | "scenario_added"     // properties: has_strategy, strategy_kind (kind | null)
  | "scenarios_compared" // properties: count
  // ── Upsell + pricing + share-loop attribution (T3) ─────────────
  // Closes the "saw the upsell → started checkout" gap (the biggest
  // attribution hole), measures the pricing-page funnel, and the share
  // loop's reach (a shared deal viewed = the K-factor numerator). PII-free.
  | "upsell_prompt_shown"   // properties: feature, placement
  | "upsell_prompt_clicked" // properties: feature, placement
  | "max_offer_view_attempted" // properties: placement
  | "upgrade_modal_viewed"     // properties: feature, placement
  | "pricing_view"          // properties: path
  | "pricing_viewed"
  | "shared_deal_viewed"    // properties: has_address
  // ── Agent Loop: co-branded share lead capture (T6) ─────────────
  | "lead_form_shown"       // properties: owner_present
  | "lead_captured"         // properties: has_message
  // ── Investor strategy chips ("What's your play?") ──────────────
  // Which plays investors pick — measures adoption + which strategy
  // converts to Pro. PII-free; just the strategy key.
  | "strategy_selected"     // properties: strategy (e.g. "wholesale-mao"), source ("chip" click vs "link" seed)
  | "comparison_started"    // properties: source
  | "report_generated"      // properties: report_type
  | "agent_pro_cta_clicked" // properties: placement
  | "agent_pro_checkout_started"
  | "agent_pro_page_viewed"
  | "guarantee_viewed"
  // ── 2026-08 Grand Slam Offer rollout ────────────────────────────
  | "founding_banner_clicked"   // properties: target ("methodology" | "pricing")
  | "founding_banner_dismissed"
  // ── Aug-2026 hierarchy rebuild: the decision funnel ─────────────
  // Instrumented so the rebuild's premise is measurable: does leading
  // with Max Offer change what people do next?
  | "analysis_run"              // properties: property_type, is_authenticated
  | "max_offer_viewed"          // properties: has_offer, tier ("decision")
  | "tune_targets_opened"
  | "deal_saved"                // properties: is_update
  | "deep_analysis_opened"      // properties: row
  | "shortlist_screened"        // properties: rows
  | "export_pdf"                // properties: surface
  | "upgrade_cta_click"         // properties: placement, feature
  // Region-level engagement: which QUESTION people open, now that the
  // results page is navigated by intent instead of scroll position.
  | "why_this_number_opened"
  | "the_numbers_opened"
  | "go_deeper_opened"
  | "testimonial_prompt_shown"
  | "testimonial_submitted"
  | "pack_credit_offer_shown"   // post-purchase "$5 toward Pro" toast
  | "testimonial_prompt_shown"     // properties: source
  | "testimonial_prompt_submitted" // properties: source, consented
  | "testimonial_prompt_dismissed" // properties: via
  | "onboarding_step_completed";

// ── Lazy init + pre-init call buffering ─────────────────────────────

const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

/** Same key components/marketing/cookie-consent-banner.tsx writes. */
const CONSENT_STORAGE_KEY = "truecap_cookie_consent_v1";
const ORGANIC_ATTRIBUTION_KEY = "truecap_organic_attribution_v1";
const LEGACY_POSTHOG_INITIAL_KEYS = new Set([
  "$initial_person_info",
  "$initial_campaign_params",
  "$initial_referrer_info",
]);

function sanitizePersistedPostHogNode(value: unknown): unknown {
  if (typeof value === "string") {
    return redactSensitiveQueryValuesInText(value);
  }
  if (Array.isArray(value)) return value.map(sanitizePersistedPostHogNode);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !LEGACY_POSTHOG_INITIAL_KEYS.has(key))
      .map(([key, child]) => [key, sanitizePersistedPostHogNode(child)])
  );
}

/**
 * Older SDK defaults stored the full initial URL in PostHog persistence.
 * Preserve the anonymous id and other non-sensitive state while deleting
 * initial-person blobs and redacting any share route/query token recursively.
 */
export function sanitizeLegacyPostHogPersistenceValue(
  raw: string | null
): string | null {
  if (!raw) return raw;
  try {
    return JSON.stringify(sanitizePersistedPostHogNode(JSON.parse(raw)));
  } catch {
    // A malformed legacy blob is not worth retaining at the telemetry
    // boundary. PostHog will mint fresh anonymous state after initialization.
    return null;
  }
}

function preparePostHogPersistence(projectKey: string): void {
  if (typeof window === "undefined") return;
  const storageKey = `ph_${projectKey}_posthog`;

  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      const current = storage.getItem(storageKey);
      const sanitized = sanitizeLegacyPostHogPersistenceValue(current);
      if (sanitized == null) {
        if (current != null) storage.removeItem(storageKey);
      } else if (sanitized !== current) {
        storage.setItem(storageKey, sanitized);
      }
    } catch {
      /* storage unavailable — SDK remains opted out by default */
    }
  }

  // Previous `localStorage+cookie` persistence may have mirrored the raw
  // initial URL into a cookie. The new configuration is localStorage-only;
  // expire both host and registrable-domain variants before importing the SDK.
  try {
    const host = window.location.hostname;
    const labels = host.split(".").filter(Boolean);
    const rootDomain = labels.length >= 2 ? labels.slice(-2).join(".") : host;
    const domains = new Set(["", host, rootDomain]);
    for (const domain of domains) {
      document.cookie = `${storageKey}=; Max-Age=0; Path=/${
        domain ? `; Domain=${domain}` : ""
      }; SameSite=Lax`;
    }
  } catch {
    /* cookie access unavailable */
  }
}

export type OrganicAttribution = {
  landing_page: string;
  referrer_host: string;
  attribution_medium: "organic_search" | "organic_ai";
};

export function setOrganicAttribution(attribution: OrganicAttribution): void {
  if (typeof window === "undefined") return;
  try {
    if (!window.sessionStorage.getItem(ORGANIC_ATTRIBUTION_KEY)) {
      window.sessionStorage.setItem(
        ORGANIC_ATTRIBUTION_KEY,
        JSON.stringify({
          ...attribution,
          landing_page: sanitizeSensitiveUrl(attribution.landing_page),
        })
      );
    }
  } catch {
    /* storage unavailable — the event still records without session attribution */
  }
}

function organicAttribution(): OrganicAttribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(ORGANIC_ATTRIBUTION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OrganicAttribution;
    return {
      ...parsed,
      landing_page: sanitizeSensitiveUrl(parsed.landing_page),
    };
  } catch {
    return null;
  }
}

type QueuedCall =
  | { kind: "capture"; event: string; properties?: Record<string, unknown> }
  | { kind: "identify"; userId: string; properties?: Record<string, unknown> }
  | { kind: "reset" }
  | { kind: "consent"; granted: boolean };

/** The initialized SDK once `initAnalytics()` resolves; null until then. */
let client: PostHog | null = null;
/** Init ran and analytics is off for this session (no key / SDK load failed). */
let disabled = false;
let initPromise: Promise<PostHog | null> | null = null;

/**
 * Pre-init call buffer, replayed FIFO on init so ordering semantics
 * (e.g. consent-before-capture, identify-before-capture) are preserved.
 * Bounded so a session where init never resolves can't grow it forever.
 */
const MAX_QUEUED_CALLS = 100;
let queue: QueuedCall[] = [];

function readStoredConsent(): "granted" | "denied" | null {
  try {
    if (typeof window === "undefined") return null;
    const v = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

function enqueue(call: QueuedCall): void {
  if (disabled) return;
  if (queue.length >= MAX_QUEUED_CALLS) return;
  queue.push(call);
}

function applyCall(ph: PostHog, call: QueuedCall): void {
  switch (call.kind) {
    case "capture":
      ph.capture(call.event, call.properties);
      break;
    case "identify":
      ph.identify(call.userId, call.properties);
      break;
    case "reset":
      ph.reset();
      break;
    case "consent":
      if (call.granted) {
        ph.opt_in_capturing();
      } else {
        ph.opt_out_capturing();
      }
      break;
  }
}

function flushQueue(ph: PostHog): void {
  const pending = queue;
  queue = [];
  for (const call of pending) {
    try {
      applyCall(ph, call);
    } catch (err) {
      console.warn("[analytics] buffered call failed:", err);
    }
  }
}

/**
 * Dynamic-import and initialize posthog-js exactly once (the SDK warns
 * on re-init), then replay buffered calls. PostHogProvider schedules
 * this from requestIdleCallback so the SDK stays off the critical path.
 * Safe to call more than once — subsequent calls return the same promise.
 */
export function initAnalytics(): Promise<PostHog | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) {
      disabled = true;
      queue = [];
      // The safe-no-op design let a fully-instrumented funnel run BLIND in
      // prod for months (the key was never added to Vercel env) with zero
      // symptoms — same silent-config-drift class as the Resend-audience
      // and Stripe-price incidents. In production this is a config bug,
      // not a valid state: page once per session via Sentry (identical
      // messages dedupe into one issue with a counter).
      if (process.env.NODE_ENV === "production") {
        try {
          const Sentry = await import("@sentry/nextjs");
          Sentry.captureMessage(
            "[analytics] NEXT_PUBLIC_POSTHOG_KEY missing from the production build — funnel is blind",
            { level: "warning", tags: { feature: "analytics" } }
          );
        } catch {
          /* Sentry unavailable — nothing more we can do quietly */
        }
      }
      return null;
    }
    try {
      preparePostHogPersistence(key);
      const { default: posthog } = await import("posthog-js");
      if (!posthog.__loaded) {
        posthog.init(key, {
          api_host: POSTHOG_HOST,
          person_profiles: "identified_only",
          // Explicit typed funnel events cover the decisions we need. DOM
          // autocapture stays available for coarse interaction analysis, but
          // never on a URL-encoded report/bearer-link route. Text and element
          // attributes are masked globally so addresses, client details, and
          // deal values rendered elsewhere cannot become event properties.
          autocapture: {
            url_ignorelist: [SENSITIVE_PUBLIC_SHARE_ROUTE_PATTERN],
          },
          mask_all_text: true,
          mask_all_element_attributes: true,
          // The app owns attribution explicitly (landing path + coarse host)
          // and sanitizes it before sessionStorage. SDK defaults otherwise
          // persist the full initial URL outside before_send.
          save_campaign_params: false,
          save_referrer: false,
          persistence: "localStorage",
          property_denylist: ["title"],
          ip: false,
          // We synthesize pageviews manually (trackPageview) on App
          // Router transitions — Next doesn't fire native pageviews
          // between routes, only on first load.
          capture_pageview: false,
          capture_pageleave: true,
          // Autocapture adds the browser's raw $current_url to every event.
          // Scrub credentials/checkout capabilities at the final SDK boundary
          // as defense in depth, including events not routed through our
          // trackEvent wrapper.
          before_send: (event) => {
            if (!event) return null;
            const sanitized = {
              ...event,
              properties:
                sanitizeAnalyticsUrlProperties(event.properties) ?? event.properties,
            };
            if (sanitized.properties) delete sanitized.properties.title;
            if (event.$set) {
              sanitized.$set = sanitizeAnalyticsUrlProperties(event.$set);
              if (sanitized.$set) delete sanitized.$set.title;
            }
            if (event.$set_once) {
              sanitized.$set_once = sanitizeAnalyticsUrlProperties(event.$set_once);
              if (sanitized.$set_once) delete sanitized.$set_once.title;
            }
            return sanitized;
          },
          // Honor consent — the cookie banner flips this via
          // setAnalyticsConsent.
          opt_out_capturing_by_default: true,
          loaded: (ph) => {
            if (readStoredConsent() === "granted") {
              ph.opt_in_capturing();
            }
          },
          // Session recording is heavy and not currently needed for
          // funnel analysis. Toggle on later from the PostHog dashboard
          // if you want to debug a specific drop-off.
          disable_session_recording: true,
          disable_external_dependency_loading: true,
          disable_surveys: true,
          advanced_disable_flags: true,
          advanced_disable_feature_flags: true,
        });
      }
      for (const legacyKey of LEGACY_POSTHOG_INITIAL_KEYS) {
        posthog.unregister(legacyKey);
      }
      client = posthog;
      flushQueue(posthog);
      return posthog;
    } catch (err) {
      // Chunk load failed (ad-blocker, offline) — analytics stays off
      // for this session. Must never break user-facing flows.
      console.warn("[analytics] init failed:", err);
      disabled = true;
      queue = [];
      return null;
    }
  })();
  return initPromise;
}

function captureRaw(
  event: string,
  properties?: Record<string, unknown>
): boolean {
  if (typeof window === "undefined") return false;
  try {
    const attribution = organicAttribution();
    const safeProperties = sanitizeAnalyticsUrlProperties(properties);
    const attributedProperties = attribution
      ? { ...attribution, ...safeProperties }
      : safeProperties;
    if (client) {
      client.capture(event, attributedProperties);
      return true;
    }
    enqueue({ kind: "capture", event, properties: attributedProperties });
    return false;
  } catch (err) {
    // Analytics must never break user-facing flows. Console-warn only.
    console.warn("[analytics] trackEvent failed:", err);
    return false;
  }
}

/**
 * Safe capture. Use this everywhere instead of `posthog.capture(...)`
 * directly. Returns a boolean for the rare caller that wants to know
 * whether the event was actually dispatched (e.g. for debugging) —
 * `false` also covers "buffered until the SDK finishes loading".
 */
export function trackEvent(
  event: FunnelEvent,
  properties?: Record<string, unknown>
): boolean {
  return captureRaw(event, properties);
}

/**
 * Synthesized `$pageview` for App Router transitions. Called by
 * PostHogProvider on every route change; buffered pre-init like every
 * other call so the landing pageview survives the deferred SDK load.
 */
export function trackPageview(currentUrl: string): void {
  captureRaw("$pageview", { $current_url: sanitizeSensitiveUrl(currentUrl) });
}

/**
 * Identify the current user. Called from the PostHogProvider once the
 * Supabase session is known. PostHog associates all subsequent events
 * with this distinct_id, and back-fills earlier anonymous events from
 * the same browser session (anonymous → identified merge).
 *
 * The user-id is the Supabase auth.users.id (UUID). Email goes in
 * properties so PostHog can render it in the dashboard, but PII
 * propagation respects PostHog's account-level privacy settings.
 */
export function identifyUser(userId: string, properties?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    if (client) {
      client.identify(userId, properties);
    } else {
      enqueue({ kind: "identify", userId, properties });
    }
  } catch (err) {
    console.warn("[analytics] identifyUser failed:", err);
  }
}

/**
 * Reset the PostHog session — call on sign-out so subsequent events
 * from this browser aren't attributed to the previous user. Generates
 * a new anonymous distinct_id under the hood.
 */
export function resetAnalytics(): void {
  if (typeof window === "undefined") return;
  try {
    if (client) {
      client.reset();
    } else {
      enqueue({ kind: "reset" });
    }
  } catch (err) {
    console.warn("[analytics] resetAnalytics failed:", err);
  }
}

/**
 * Sync cookie-consent state with PostHog. Called by the cookie banner
 * when the user makes a decision. Until consent is granted, PostHog
 * stays opted out (init defaults to opt_out_by_default). Buffered if
 * the SDK isn't up yet — the banner also persists the decision to
 * localStorage, which init's `loaded` callback reads, so the two paths
 * agree either way.
 */
export function setAnalyticsConsent(granted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (client) {
      if (granted) {
        client.opt_in_capturing();
      } else {
        client.opt_out_capturing();
      }
    } else {
      enqueue({ kind: "consent", granted });
    }
  } catch (err) {
    console.warn("[analytics] setAnalyticsConsent failed:", err);
  }
}
