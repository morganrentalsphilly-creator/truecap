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

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";

const STORAGE_KEY = "truecap_cookie_consent_v1";

type ConsentValue = "granted" | "denied";

declare global {
  interface Window {
    /* gtag is already declared in track-conversion.ts; just reference it here */
  }
}

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
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, value);
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
  // Render nothing until we've checked storage — prevents banner flash
  // for users who already decided previously.
  const [decision, setDecision] = useState<ConsentValue | "pending" | null>(null);

  useEffect(() => {
    setDecision(readStoredConsent() ?? "pending");
  }, []);

  const handleAccept = () => {
    writeStoredConsent("granted");
    pushGtagConsent("granted");
    setDecision("granted");
  };

  const handleReject = () => {
    writeStoredConsent("denied");
    pushGtagConsent("denied");
    setDecision("denied");
  };

  // Hide after a decision is made (or before storage is checked).
  if (decision === null || decision === "granted" || decision === "denied") return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 px-3 py-3 shadow-[0_-12px_28px_rgba(15,23,42,0.10)] backdrop-blur supports-[backdrop-filter]:bg-card/90 sm:px-4 sm:py-4"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:items-center">
          <Cookie className="mt-0.5 size-4 shrink-0 text-primary sm:mt-0" />
          <p className="text-xs leading-relaxed text-foreground sm:text-sm">
            <strong>We use cookies</strong> for analytics + paid-ad
            measurement. Reject and only essential session cookies are
            set. See our{" "}
            <Link href="/privacy" className="font-semibold text-primary underline-offset-2 hover:underline">
              privacy policy
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleReject}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-4 text-xs font-semibold text-foreground transition-colors hover:bg-muted sm:text-sm"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 sm:text-sm"
          >
            Accept all
          </button>
          <button
            type="button"
            onClick={handleReject}
            aria-label="Dismiss (counts as reject)"
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground/60 hover:bg-muted hover:text-foreground sm:inline-flex"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
