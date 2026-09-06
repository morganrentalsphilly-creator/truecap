"use client";

/**
 * Cookie consent banner — Google Consent Mode v2 compatible.
 *
 * Why this matters: TrueCap runs paid ads and ships Google Analytics
 * + Google Ads gtag.js. Under GDPR (EU) and CCPA (California), loading
 * tracking cookies before the user consents is a real legal risk.
 * Even outside the EU, users increasingly expect a consent banner —
 * its absence reads as sketchy.
 *
 * How it works:
 *
 *   1. <head> in app/layout.tsx now sets the gtag consent defaults to
 *      'denied' BEFORE gtag.js loads. So gtag boots in a privacy-safe
 *      mode that doesn't set tracking cookies.
 *   2. This banner shows on first visit (no decision stored).
 *   3. User picks Accept (all consent granted) or Reject (consent
 *      stays denied — gtag still runs but only sends anonymous pings).
 *   4. We call gtag('consent', 'update', ...) to flip the consent state
 *      live, and persist the choice to localStorage so subsequent visits
 *      skip the banner.
 *
 * Conservatively dismissible (X button) — that counts as "reject" for
 * compliance purposes, since not actively granting = denied.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cookie, X } from "lucide-react";
import { setAnalyticsConsent } from "@/lib/analytics";
import { notifyCookieConsentChanged } from "@/lib/use-cookie-banner";

/**
 * Paths where the cookie banner must be suppressed entirely. These
 * are surfaces where the banner would either be inappropriate
 * (embedded iframe on a third-party site — the partner owns their
 * own consent UX) or visually disruptive.
 */
const HIDE_ON_PATHS = ["/embed"];

const STORAGE_KEY = "truecap_cookie_consent_v1";

type ConsentValue = "granted" | "denied";

function readStoredConsent(): ConsentValue | null {
  try {
    if (typeof window === "undefined") return null;
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

function writeStoredConsent(value: ConsentValue): void {
  try {
    if (typeof window !== "undefined")
      window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* private mode / disabled storage — choice won't persist but UX still works for this session */
  }
}

/**
 * Push the consent update to gtag. Safe no-op if gtag hasn't loaded
 * (dev mode, ad blockers).
 */
function pushGtagConsent(value: ConsentValue): void {
  try {
    if (typeof window === "undefined") return;
    const gtag = window.gtag;
    if (typeof gtag !== "function") return;
    gtag("consent", "update", {
      ad_storage: value,
      analytics_storage: value,
      ad_user_data: value,
      ad_personalization: value,
    });
  } catch {
    /* never let analytics break the UI */
  }
}

export function CookieConsentBanner() {
  const pathname = usePathname() ?? "/";

  // Render nothing until we've checked storage — prevents banner flash
  // for users who already decided previously.
  const [decision, setDecision] = useState<ConsentValue | "pending" | null>(
    null,
  );

  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDecision(readStoredConsent() ?? "pending");
  }, []);

  // Focus the banner the moment it becomes visible. It's a role="dialog"
  // appended at the END of the DOM (it renders after the footer), so without
  // this a keyboard/screen-reader user had to tab through the entire page —
  // footer legal links and all — before ever reaching Reject/Accept: the
  // consent control was the LAST stop in tab order. Focusing the container
  // (tabIndex={-1}) makes it the first stop instead, so the next Tab lands on
  // Reject. preventScroll keeps the fixed bar from yanking the viewport.
  useEffect(() => {
    if (decision === "pending") {
      bannerRef.current?.focus({ preventScroll: true });
    }
  }, [decision]);

  // The banner auto-focuses itself on load, so it is the FIRST thing every
  // keyboard visitor lands in on every page. That is deliberate (see above) and
  // it makes the exit path load-bearing: on dismiss the banner unmounts and
  // focus fell to <body>, so the next Tab restarted at "Skip to main content"
  // while the viewport sat mid-page. Move focus somewhere meaningful instead.
  const restoreFocusAfterDismiss = () => {
    requestAnimationFrame(() => {
      const main = document.getElementById("main");
      if (main) {
        if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
        main.focus({ preventScroll: true });
      }
    });
  };

  const handleAccept = () => {
    writeStoredConsent("granted");
    pushGtagConsent("granted");
    // Also flip PostHog from opt-out (its default) to opt-in. Without
    // this, gtag tracks but PostHog stays dark even though the user
    // just gave consent. setAnalyticsConsent is a safe no-op if
    // PostHog isn't loaded (missing env var, ad-block, etc.).
    setAnalyticsConsent(true);
    setDecision("granted");
    notifyCookieConsentChanged(); // let secondary bottom bars reappear immediately
    restoreFocusAfterDismiss();
  };

  const handleReject = () => {
    writeStoredConsent("denied");
    pushGtagConsent("denied");
    setAnalyticsConsent(false);
    setDecision("denied");
    notifyCookieConsentChanged(); // let secondary bottom bars reappear immediately
    restoreFocusAfterDismiss();
  };

  // Suppress entirely on opt-out paths (e.g. /embed/* — partner site
  // owns its own consent UX; we don't want to show ours inside their iframe).
  if (HIDE_ON_PATHS.some((p) => pathname.startsWith(p))) return null;

  // Hide after a decision is made (or before storage is checked).
  if (decision === null || decision === "granted" || decision === "denied")
    return null;

  return (
    <div
      ref={bannerRef}
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      tabIndex={-1}
      // Escape dismisses, recording the same outcome as the X ("counts as
      // reject"), so this changes nothing about what is stored. Without it the
      // one dialog every keyboard user is forced into had no keyboard exit.
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        handleReject();
      }}
      data-cookie-consent-banner=""
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 px-3 pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-[0_-12px_28px_rgba(15,23,42,0.10)] outline-none backdrop-blur supports-[backdrop-filter]:bg-card/90 sm:px-4 sm:pt-4 sm:pb-[max(env(safe-area-inset-bottom),1rem)]"
    >
      {/* Compact single row on phones: text + buttons side by side (~60px
          tall), so the bar never reaches the hero's primary action in a
          375×667 first viewport. Full copy from sm:. */}
      <div className="mx-auto flex max-w-5xl flex-row items-center gap-2 sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-2.5">
          <Cookie className="hidden size-4 shrink-0 text-primary sm:block" />
          <p className="text-xs leading-snug text-foreground sm:text-sm sm:leading-relaxed">
            <strong>We use cookies</strong>
            <span className="sm:hidden">
              {" for analytics & ads. "}
              <Link
                href="/privacy"
                data-cookie-privacy-link=""
                className="inline-flex min-h-11 min-w-11 items-center font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Privacy
              </Link>
            </span>
            <span className="hidden sm:inline">
              {
                " for analytics + paid-ad measurement. Reject and only essential session cookies are set. See our "
              }
              <Link
                href="/privacy"
                data-cookie-privacy-link=""
                className="inline-flex min-h-11 min-w-11 items-center font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                privacy policy
              </Link>
              .
            </span>
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5 sm:gap-3">
          <button
            type="button"
            onClick={handleReject}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-4 sm:text-sm"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-4 sm:text-sm"
          >
            <span className="sm:hidden">Accept</span>
            <span className="hidden sm:inline">Accept all</span>
          </button>
          {/* Explicit dismiss on EVERY breakpoint (counts as reject). The bar
              is fixed to the bottom of the viewport, so on a phone it sits on
              top of the footer's legal links (privacy / terms) and would
              otherwise obscure them until a choice was made. A visible close
              control lets a mobile user clear it and reach those links. */}
          <button
            type="button"
            onClick={handleReject}
            aria-label="Dismiss (counts as reject)"
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground/60 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
