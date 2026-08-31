"use client";

/**
 * PostHog client bootstrap.
 *
 * The PostHog wizard set up env vars + MCP server but did not write the
 * SDK init call, so this provider exists to actually boot posthog-js
 * once on the client. Without it, every `trackEvent()` call from
 * lib/analytics.ts stays buffered forever and nothing is captured.
 *
 * Responsibilities:
 *   1. Schedule `initAnalytics()` (which dynamic-imports posthog-js —
 *      ~60 KB gz — and initializes it exactly once) via
 *      requestIdleCallback so the SDK never competes with first paint /
 *      hydration on the paid-ad landing pages. Calls made before init
 *      resolves are buffered inside lib/analytics.ts and replayed, so
 *      early events are delayed 1-2 s, never lost.
 *   2. Consent is handled by the cookie banner via
 *      `setAnalyticsConsent()` (buffered the same way); init itself
 *      re-reads the stored decision.
 *   3. Identify the user by Supabase auth.users.id once a session is
 *      known — but ONLY when a Supabase auth cookie exists. Anonymous
 *      visitors never download supabase-js (~51 KB gz) just to be told
 *      they're signed out.
 *   4. Fire $pageview on Next App Router transitions (App Router
 *      doesn't fire native pageviews between routes — only on first
 *      load — so we synthesize them here).
 *
 * Renders nothing visible.
 */

import { useEffect, useLayoutEffect, useRef, useState, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  identifyUser,
  initAnalytics,
  disableAnalyticsForDocument,
  resetAnalytics,
  setFirstTouchAttribution,
  trackEvent,
  trackPageview,
  type FirstTouchReferralSource,
} from "@/lib/analytics";
import { shouldKeepThirdPartyTelemetryDisabled } from "@/lib/sensitive-url";

const SEARCH_REFERRER_RE =
  /(^|\.)(google|bing|yahoo|duckduckgo|ecosia|brave)\./;
const AI_REFERRER_RE = /(^|\.)(perplexity|chatgpt|openai|copilot|claude)\./;
const SOCIAL_REFERRER_RE =
  /(^|\.)(facebook|instagram|linkedin|reddit|tiktok|x|twitter)\./;

function classifyFirstTouchReferralSource(input: {
  referrerHost: string;
  currentHost: string;
  campaignMedium: string;
}): FirstTouchReferralSource {
  const { referrerHost, currentHost, campaignMedium } = input;
  if (["cpc", "ppc", "paid_search", "paidsearch"].includes(campaignMedium)) {
    return "paid_search";
  }
  if (["paid_social", "paidsocial", "social_paid"].includes(campaignMedium)) {
    return "paid_social";
  }
  if (["email", "newsletter"].includes(campaignMedium)) return "email";
  if (campaignMedium === "organic") {
    return AI_REFERRER_RE.test(referrerHost) ? "organic_ai" : "organic_search";
  }
  if (campaignMedium === "social") return "organic_social";
  if (campaignMedium === "referral") return "external_referral";
  // Never forward an unrecognized campaign value. Its presence is useful,
  // but the taxonomy remains a fixed anonymous bucket.
  if (campaignMedium) return "campaign";

  if (!referrerHost || referrerHost === currentHost) return "direct";
  if (AI_REFERRER_RE.test(referrerHost)) return "organic_ai";
  if (SEARCH_REFERRER_RE.test(referrerHost)) return "organic_search";
  if (SOCIAL_REFERRER_RE.test(referrerHost)) return "organic_social";
  return "external_referral";
}

function routeCategory(pathname: string): string {
  if (pathname === "/") return "home";
  if (pathname === "/pricing") return "pricing";
  if (pathname.startsWith("/tools/")) return "tools";
  if (
    pathname.startsWith("/blog/") ||
    pathname.startsWith("/glossary/") ||
    pathname.startsWith("/vs/") ||
    pathname.startsWith("/markets/") ||
    pathname.startsWith("/states/")
  ) {
    return "content";
  }
  if (
    pathname.startsWith("/s/") ||
    pathname.startsWith("/d/") ||
    pathname.startsWith("/portal/")
  ) {
    return "shared_analysis";
  }
  if (pathname.startsWith("/auth/")) return "auth";
  return "product";
}

/**
 * Client-side twin of proxy.ts's hasSupabaseAuthCookie (same
 * `sb-*-auth-token` name pattern): a cheap "is anyone possibly signed
 * in?" gate so anonymous visitors skip the supabase-js download
 * entirely. Cookie presence is a hint, not auth — `getUser()`
 * re-verifies the session after the lazy load.
 */
function hasSupabaseAuthCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(/;\s*/).some((entry) => {
    const eqIndex = entry.indexOf("=");
    if (eqIndex <= 0) return false;
    const name = entry.slice(0, eqIndex);
    return /^sb-.*-auth-token/.test(name) && entry.length > eqIndex + 1;
  });
}

/**
 * Emit cumulative return milestones from the account's server-authored
 * creation time. The UUID is used only to scope a local dedupe key; it is not
 * attached as an event property. These are intentionally "returned on or
 * after day N" milestones, not exact-day retention windows (the dashboard
 * query plan documents both definitions).
 */
function trackRetentionMilestones(userId: string, createdAt: string): void {
  if (typeof window === "undefined") return;
  const createdAtMs = Date.parse(createdAt);
  if (!Number.isFinite(createdAtMs)) return;
  const accountAgeDays = Math.floor((Date.now() - createdAtMs) / 86_400_000);
  const milestones = [
    { days: 30, event: "retained_30d" as const },
    { days: 90, event: "retained_90d" as const },
  ];
  for (const milestone of milestones) {
    if (accountAgeDays < milestone.days) continue;
    const key = `truecap_${milestone.event}_v1_${userId}`;
    try {
      if (window.localStorage.getItem(key) === "1") continue;
      // Set first so Strict Mode, route transitions, or parallel tabs cannot
      // turn a milestone into a noisy page-view counter.
      window.localStorage.setItem(key, "1");
      trackEvent(milestone.event, { activity: "authenticated_visit" });
    } catch {
      // Storage may be unavailable in hardened browsers. Analytics must never
      // interfere with authentication or navigation.
    }
  }
}

function PostHogTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const firstTouchClassified = useRef(false);
  const location = `${pathname}${searchParams?.size ? `?${searchParams.toString()}` : ""}`;
  const [sensitiveLocationSeen, setSensitiveLocationSeen] = useState(false);
  const telemetryDisabledForDocument = shouldKeepThirdPartyTelemetryDisabled(
    location,
    sensitiveLocationSeen,
  );
  // A third-party script that was already present can observe history changes
  // before React can unmount it. Entering a sensitive URL from a clean SPA
  // document therefore becomes a hard reload. On the new document this ref is
  // false from the first render and every telemetry provider stays unmounted.
  const documentMayHaveTelemetry = useRef(!telemetryDisabledForDocument);

  useLayoutEffect(() => {
    if (!telemetryDisabledForDocument) {
      documentMayHaveTelemetry.current = true;
      return;
    }
    disableAnalyticsForDocument();
    if (!sensitiveLocationSeen) setSensitiveLocationSeen(true);
    if (documentMayHaveTelemetry.current && typeof window !== "undefined") {
      documentMayHaveTelemetry.current = false;
      window.location.reload();
    }
  }, [telemetryDisabledForDocument, sensitiveLocationSeen]);

  // ── Deferred init: idle-schedule the SDK load ──────
  useEffect(() => {
    if (telemetryDisabledForDocument) return;
    let idleId: number | null = null;
    let timeoutId: number | null = null;
    const start = () => {
      void initAnalytics();
    };
    if (typeof window.requestIdleCallback === "function") {
      // The timeout guarantees init even on pages that never go idle.
      idleId = window.requestIdleCallback(start, { timeout: 3000 });
    } else {
      // Safari has no requestIdleCallback — a short timeout is the
      // standard near-idle approximation.
      timeoutId = window.setTimeout(start, 300);
    }
    return () => {
      if (idleId !== null && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [telemetryDisabledForDocument]);

  // ── Pageview on every App Router transition ────────
  useEffect(() => {
    if (typeof window === "undefined" || telemetryDisabledForDocument) return;
    // Query strings can contain Checkout IDs, encoded shared-deal inputs, or
    // campaign-provided personal data. Funnel analysis only needs the route.
    trackPageview(`${window.location.origin}${pathname}`);
  }, [pathname, searchParams, telemetryDisabledForDocument]);

  // First-party attribution. The raw referrer host and UTM value are used only
  // for this synchronous classification; persistence and event payloads get a
  // fixed referral taxonomy plus a coarse route category.
  useEffect(() => {
    if (
      telemetryDisabledForDocument ||
      firstTouchClassified.current ||
      typeof window === "undefined"
    )
      return;
    firstTouchClassified.current = true;
    let host = "";
    try {
      host = document.referrer
        ? new URL(document.referrer).hostname.toLowerCase()
        : "";
    } catch {
      host = "";
    }
    const referralSource = classifyFirstTouchReferralSource({
      referrerHost: host,
      currentHost: window.location.hostname.toLowerCase(),
      campaignMedium: searchParams?.get("utm_medium")?.toLowerCase() ?? "",
    });
    const attribution = {
      referral_source: referralSource,
    };
    setFirstTouchAttribution(attribution);
    if (
      referralSource === "organic_search" ||
      referralSource === "organic_ai" ||
      referralSource === "organic_social"
    ) {
      trackEvent("organic_landing", {
        route_category: routeCategory(pathname),
        referral_source: referralSource,
      });
    }
  }, [pathname, searchParams, telemetryDisabledForDocument]);

  // Tool-level intent instrumentation without touching 20 independent widget
  // implementations. Start = first interaction. Completion = first form
  // submit or explicit calculate/analyze/run action.
  useEffect(() => {
    if (telemetryDisabledForDocument || !pathname.startsWith("/tools/")) return;
    const calculator = pathname.slice("/tools/".length);
    let started = false;
    let completed = false;
    const start = () => {
      if (started) return;
      started = true;
      trackEvent("calculator_started", { calculator });
    };
    const complete = (event: Event) => {
      start();
      if (completed) return;
      const target = event.target as HTMLElement | null;
      const isSubmit = event.type === "submit";
      const isExplicitAction =
        event.type === "click" &&
        /calculate|analyze|run|estimate|see result/i.test(
          target?.textContent ?? "",
        );
      if (!isSubmit && !isExplicitAction) return;
      completed = true;
      trackEvent("calculator_completed", { calculator });
    };
    document.addEventListener("input", start, true);
    document.addEventListener("change", start, true);
    document.addEventListener("submit", complete, true);
    document.addEventListener("click", complete, true);
    return () => {
      document.removeEventListener("input", start, true);
      document.removeEventListener("change", start, true);
      document.removeEventListener("submit", complete, true);
      document.removeEventListener("click", complete, true);
    };
  }, [pathname, telemetryDisabledForDocument]);

  // ── Identify on auth state change (cookie-gated) ───
  // Keyed on pathname (not mount-once) so a client-side sign-in — the
  // login form does router.push, no full reload — picks up the freshly
  // set cookie on the next navigation. The ref guard makes the actual
  // bootstrap run at most once per full page load.
  const identifyStartedRef = useRef(false);
  const identifyCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (telemetryDisabledForDocument) return;
    if (identifyStartedRef.current) return;
    if (!hasSupabaseAuthCookie()) return; // anonymous — zero supabase code
    identifyStartedRef.current = true;

    let cancelled = false;
    identifyCleanupRef.current = () => {
      cancelled = true;
    };

    void (async () => {
      try {
        const { createBrowserSupabaseClient } =
          await import("@/lib/supabase/client");
        if (cancelled) return;
        const supabase = createBrowserSupabaseClient();

        supabase.auth
          .getUser()
          .then(({ data }) => {
            if (cancelled || !data.user) return;
            identifyUser(data.user.id);
            trackRetentionMilestones(data.user.id, data.user.created_at);
          })
          .catch((err) => {
            console.warn("[posthog-provider] initial identify failed:", err);
          });

        const { data: sub } = supabase.auth.onAuthStateChange(
          (event, session) => {
            if (event === "SIGNED_IN" && session?.user) {
              identifyUser(session.user.id);
              trackRetentionMilestones(
                session.user.id,
                session.user.created_at,
              );
            } else if (event === "SIGNED_OUT") {
              resetAnalytics();
            }
          },
        );
        identifyCleanupRef.current = () => {
          cancelled = true;
          sub.subscription.unsubscribe();
        };
      } catch (err) {
        console.warn("[posthog-provider] supabase load failed:", err);
      }
    })();
  }, [pathname, telemetryDisabledForDocument]);

  // Unsubscribe only on real unmount — the identify effect above must
  // survive pathname re-runs, so it returns no cleanup of its own.
  useEffect(() => {
    return () => {
      identifyCleanupRef.current?.();
    };
  }, []);

  return null;
}

export function PostHogProvider() {
  // Suspense boundary because useSearchParams can suspend in Next 15+.
  return (
    <Suspense fallback={null}>
      <PostHogTracker />
    </Suspense>
  );
}
