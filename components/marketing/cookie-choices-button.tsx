"use client";

/**
 * The footer's "Cookie choices" control: the way to change or withdraw a
 * cookie choice after the banner has gone.
 *
 * Before this, Accept, Reject, the X and Escape each stored a decision and
 * nothing on the site could reopen it. One click here:
 *
 *   1. clears the stored decision,
 *   2. pushes a denied consent update to the Google tags, if they are loaded,
 *      and opts the product-analytics SDK back out,
 *   3. deletes the cookies an earlier Accept allowed: the Google Ads tag's
 *      `_gcl_*` cookies (`_gcl_au` is the one it sets on every visit) and
 *      the first-party first-touch cookie `tc_ft`,
 *   4. tells the banner to ask again, and the consent-gated loaders to
 *      re-read the (now empty) decision.
 *
 * It records no choice of its own: until the visitor answers the banner
 * again, the state is the same as a first visit.
 */

import { usePathname } from "next/navigation";
import {
  setAnalyticsConsent,
  syncFirstTouchCookieWithConsent,
} from "@/lib/analytics";
import { notifyCookieConsentChanged } from "@/lib/use-cookie-banner";
import {
  COOKIE_CHOICE_RESET_EVENT,
  COOKIE_CONSENT_STORAGE_KEY,
  HIDE_ON_PATHS,
  pushGtagConsent,
} from "@/components/marketing/cookie-consent-banner";

/** Cookies the Google Ads tag writes once ad storage is granted. */
const GOOGLE_ADS_COOKIE_PREFIX = "_gcl_";

/**
 * Expire every `_gcl_*` cookie this document can see. The tag sets them on
 * the registrable domain, so each is expired host-only, on the host and on
 * the last two labels of the host.
 */
function deleteGoogleAdsCookies(): void {
  try {
    const names = document.cookie
      .split(/;\s*/)
      .map((entry) => entry.slice(0, Math.max(entry.indexOf("="), 0)).trim())
      .filter((name) => name.startsWith(GOOGLE_ADS_COOKIE_PREFIX));
    if (names.length === 0) return;
    const host = window.location.hostname;
    const labels = host.split(".").filter(Boolean);
    const rootDomain = labels.length >= 2 ? labels.slice(-2).join(".") : host;
    const domains = new Set(["", host, rootDomain]);
    for (const name of names) {
      for (const domain of domains) {
        document.cookie = `${name}=; Max-Age=0; Path=/${
          domain ? `; Domain=${domain}` : ""
        }; SameSite=Lax`;
      }
    }
  } catch {
    /* cookie access unavailable */
  }
}

/** Steps 1 to 4 above. Never throws. */
export function resetCookieChoice(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
  } catch {
    /* storage unavailable: nothing was stored, the banner still reopens */
  }
  pushGtagConsent("denied");
  setAnalyticsConsent(false);
  // null, not "denied": the cookie is deleted either way, and this tab's
  // session record is kept so that accepting again still works.
  syncFirstTouchCookieWithConsent(null);
  deleteGoogleAdsCookies();
  try {
    window.dispatchEvent(new Event(COOKIE_CHOICE_RESET_EVENT));
  } catch {
    /* no-op */
  }
  // Nothing is stored now, so the listeners that record a choice send
  // nothing; the Google loader unmounts and the bottom bars make room.
  notifyCookieConsentChanged();
}

export function CookieChoicesButton({ className }: { className?: string }) {
  const pathname = usePathname() ?? "/";
  // The banner's own list: no banner there, so no control.
  if (HIDE_ON_PATHS.some((p) => pathname.startsWith(p))) return null;
  return (
    <button type="button" onClick={resetCookieChoice} className={className}>
      Cookie choices
    </button>
  );
}
