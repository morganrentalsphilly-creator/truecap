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

import { useEffect, useRef, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  identifyUser,
  initAnalytics,
  resetAnalytics,
  setOrganicAttribution,
  trackEvent,
  trackPageview,
} from "@/lib/analytics";

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

function PostHogTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const organicLandingFired = useRef(false);

  // ── Deferred init: idle-schedule the SDK load ──────
  useEffect(() => {
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
  }, []);

  // ── Pageview on every App Router transition ────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const search = searchParams?.toString();
    const url = `${pathname}${search ? `?${search}` : ""}`;
    // Buffered pre-init, so the landing pageview is delayed, not lost.
    trackPageview(`${window.location.origin}${url}`);
  }, [pathname, searchParams]);

  // First-party organic attribution. Store only the landing path and referrer
  // hostname; never retain the search query or full referrer URL.
  useEffect(() => {
    if (organicLandingFired.current || typeof window === "undefined") return;
    organicLandingFired.current = true;
    let host = "";
    try {
      host = document.referrer ? new URL(document.referrer).hostname.toLowerCase() : "";
    } catch {
      host = "";
    }
    const medium = searchParams?.get("utm_medium")?.toLowerCase();
    const searchReferrer = /(^|\.)(google|bing|yahoo|duckduckgo|ecosia|brave)\./.test(host);
    const aiReferrer = /(^|\.)(perplexity|chatgpt|openai|copilot|claude)\./.test(host);
    if (!searchReferrer && !aiReferrer && medium !== "organic") return;
    const attribution = {
      landing_page: pathname,
      referrer_host: host || "utm",
      attribution_medium: aiReferrer ? "organic_ai" as const : "organic_search" as const,
    };
    setOrganicAttribution(attribution);
    trackEvent("organic_landing", attribution);
  }, [pathname, searchParams]);

  // Tool-level intent instrumentation without touching 20 independent widget
  // implementations. Start = first interaction. Completion = first form
  // submit or explicit calculate/analyze/run action.
  useEffect(() => {
    if (!pathname.startsWith("/tools/")) return;
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
      const isExplicitAction = event.type === "click" && /calculate|analyze|run|estimate|see result/i.test(target?.textContent ?? "");
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
  }, [pathname]);

  // ── Identify on auth state change (cookie-gated) ───
  // Keyed on pathname (not mount-once) so a client-side sign-in — the
  // login form does router.push, no full reload — picks up the freshly
  // set cookie on the next navigation. The ref guard makes the actual
  // bootstrap run at most once per full page load.
  const identifyStartedRef = useRef(false);
  const identifyCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (identifyStartedRef.current) return;
    if (!hasSupabaseAuthCookie()) return; // anonymous — zero supabase code
    identifyStartedRef.current = true;

    let cancelled = false;
    identifyCleanupRef.current = () => {
      cancelled = true;
    };

    void (async () => {
      try {
        const { createBrowserSupabaseClient } = await import(
          "@/lib/supabase/client"
        );
        if (cancelled) return;
        const supabase = createBrowserSupabaseClient();

        supabase.auth
          .getUser()
          .then(({ data }) => {
            if (cancelled || !data.user) return;
            identifyUser(data.user.id, {
              email: data.user.email ?? undefined,
            });
          })
          .catch((err) => {
            console.warn("[posthog-provider] initial identify failed:", err);
          });

        const { data: sub } = supabase.auth.onAuthStateChange(
          (event, session) => {
            if (event === "SIGNED_IN" && session?.user) {
              identifyUser(session.user.id, {
                email: session.user.email ?? undefined,
              });
            } else if (event === "SIGNED_OUT") {
              resetAnalytics();
            }
          }
        );
        identifyCleanupRef.current = () => {
          cancelled = true;
          sub.subscription.unsubscribe();
        };
      } catch (err) {
        console.warn("[posthog-provider] supabase load failed:", err);
      }
    })();
  }, [pathname]);

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
