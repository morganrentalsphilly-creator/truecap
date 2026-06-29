"use client";

/**
 * Shared signal for "is the cookie-consent banner currently occupying the
 * bottom of the screen?" — so secondary fixed bottom bars (marketing CTAs)
 * don't render stacked behind the opaque z-50 banner on a first visit.
 *
 * Decoupled on purpose: the bars read this hook, they don't import the banner.
 * The banner calls notifyCookieConsentChanged() on a decision so same-tab
 * listeners update immediately (the native `storage` event is cross-tab only).
 *
 * Fail-OPEN: any uncertainty (SSR, unreadable storage, an opt-out path) returns
 * false so the bars show — we never want a bad read to suppress a CTA forever.
 */

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "truecap_cookie_consent_v1";
// Mirror CookieConsentBanner.HIDE_ON_PATHS — where the banner never renders, so
// it can never be "open" and must not gate the bars.
const HIDE_ON_PATHS = ["/embed"];
const CONSENT_EVENT = "truecap:cookie-consent";

/** The banner calls this on accept/reject so same-tab hooks re-read storage. */
export function notifyCookieConsentChanged(): void {
  try {
    window.dispatchEvent(new Event(CONSENT_EVENT));
  } catch {
    /* no-op */
  }
}

function bannerOpen(pathname: string): boolean {
  if (HIDE_ON_PATHS.some((p) => pathname.startsWith(p))) return false;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    // Open only while the decision is still PENDING (no stored grant/deny).
    return !(v === "granted" || v === "denied");
  } catch {
    return false; // can't read → assume not blocking
  }
}

export function useCookieBannerOpen(): boolean {
  const pathname = usePathname() ?? "/";
  // Start false (don't suppress on first paint); the effect corrects it. The
  // bars themselves only appear after a scroll threshold, so there's no flash.
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const update = () => setOpen(bannerOpen(pathname));
    update();
    window.addEventListener(CONSENT_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(CONSENT_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, [pathname]);

  return open;
}
