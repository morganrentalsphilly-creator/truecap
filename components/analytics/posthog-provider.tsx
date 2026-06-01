"use client";

/**
 * PostHog client initialization.
 *
 * The PostHog wizard set up env vars + MCP server but did not write the
 * SDK init call, so this provider exists to actually boot posthog-js
 * once on the client. Without it, every `trackEvent()` call from
 * lib/analytics.ts no-ops silently because `posthog.__loaded` never
 * becomes true.
 *
 * Responsibilities:
 *   1. Initialize posthog-js exactly once (the SDK warns on re-init).
 *   2. Respect the existing cookie-consent banner — start opted-out by
 *      default; opt in only after the user accepts cookies. The banner
 *      handler in components/marketing/cookie-consent-banner.tsx calls
 *      `setAnalyticsConsent(true|false)` from lib/analytics.ts which
 *      drives the actual opt-in/out.
 *   3. Identify the user by Supabase auth.users.id once a session is
 *      known. Captures the link between anonymous + authenticated
 *      sessions so the funnel can attribute pre-signup events to the
 *      user who eventually converts.
 *   4. Fire $pageview on Next App Router transitions (App Router
 *      doesn't fire native pageviews between routes — only on first
 *      load — so we synthesize them here).
 *
 * Renders nothing visible.
 */

import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

const CONSENT_STORAGE_KEY = "truecap_cookie_consent_v1";

function readStoredConsent(): "granted" | "denied" | null {
  try {
    if (typeof window === "undefined") return null;
    const v = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

function initPostHog(): boolean {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return false;
  if (typeof window === "undefined") return false;
  if (posthog.__loaded) return true;
  posthog.init(key, {
    api_host: POSTHOG_HOST,
    person_profiles: "identified_only",
    autocapture: true,
    // We synthesize pageviews manually below on App Router transitions.
    capture_pageview: false,
    capture_pageleave: true,
    // Honor consent — banner flips this via lib/analytics.ts.
    opt_out_capturing_by_default: true,
    loaded: (ph) => {
      if (readStoredConsent() === "granted") {
        ph.opt_in_capturing();
      }
    },
    // Session recording is heavy and not currently needed for funnel
    // analysis. Toggle on later from the PostHog dashboard if you want
    // to debug a specific drop-off.
    disable_session_recording: true,
  });
  return true;
}

function PostHogTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── Init once on mount ─────────────────────────────
  useEffect(() => {
    initPostHog();
  }, []);

  // ── Pageview on every App Router transition ────────
  useEffect(() => {
    if (typeof window === "undefined" || !posthog.__loaded) return;
    const search = searchParams?.toString();
    const url = `${pathname}${search ? `?${search}` : ""}`;
    posthog.capture("$pageview", {
      $current_url: `${window.location.origin}${url}`,
    });
  }, [pathname, searchParams]);

  // ── Identify on auth state change ──────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const supabase = createBrowserSupabaseClient();

    let cancelled = false;
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (cancelled || !posthog.__loaded || !data.user) return;
        posthog.identify(data.user.id, {
          email: data.user.email ?? undefined,
        });
      })
      .catch((err) => {
        console.warn("[posthog-provider] initial identify failed:", err);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!posthog.__loaded) return;
      if (event === "SIGNED_IN" && session?.user) {
        posthog.identify(session.user.id, {
          email: session.user.email ?? undefined,
        });
      } else if (event === "SIGNED_OUT") {
        posthog.reset();
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
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
