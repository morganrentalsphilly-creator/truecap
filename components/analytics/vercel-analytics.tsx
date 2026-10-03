"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  sanitizeSensitiveUrl,
  shouldKeepCookielessPageAnalyticsDisabled,
} from "@/lib/sensitive-url";
import { stripAdClickIds } from "@/lib/analytics/ad-click-ids";
import { recordCookieConsentChoice } from "@/lib/analytics/site-events";
import { COOKIE_CONSENT_EVENT } from "@/lib/use-cookie-banner";

/**
 * Two steps, in this order: credentials and deal inputs out
 * (lib/sensitive-url.ts), then ad click ids out
 * (lib/analytics/ad-click-ids.ts). Vercel Web Analytics is cookieless and
 * runs whatever the banner choice, so a paid landing's gclid must not reach
 * it. `utm_*` stays.
 */
export function sanitizeVercelAnalyticsEvent<T extends BeforeSendEvent>(
  event: T,
): T {
  return { ...event, url: stripAdClickIds(sanitizeSensitiveUrl(event.url)) };
}

/**
 * Vercel pageviews share the same URL privacy boundary as PostHog/Sentry,
 * with one exception that applies to this mount only: sign-up and login URLs
 * whose `next` is exactly /dashboard/new or a pricing checkout return stay
 * counted (`isCountedNextLocation` in lib/sensitive-url.ts). `next` is still
 * removed from the reported URL by `sanitizeVercelAnalyticsEvent` above.
 */
function TrueCapVercelAnalyticsInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const location = `${pathname}${searchParams?.size ? `?${searchParams.toString()}` : ""}`;
  const [sensitiveRouteSeen, setSensitiveRouteSeen] = useState(false);
  const disabledForDocument = shouldKeepCookielessPageAnalyticsDisabled(
    location,
    sensitiveRouteSeen,
  );
  useEffect(() => {
    if (disabledForDocument && !sensitiveRouteSeen) {
      setSensitiveRouteSeen(true);
    }
  }, [disabledForDocument, sensitiveRouteSeen]);
  // The banner's Accept or Reject, counted once per click through the same
  // cookieless transport (docs/analytics.md). The banner dispatches
  // COOKIE_CONSENT_EVENT only from those two handlers, after it has stored
  // the decision. Nothing is sent from a document where Vercel is switched
  // off for a sensitive route.
  useEffect(() => {
    if (disabledForDocument) return;
    const onChoice = () => {
      recordCookieConsentChoice();
    };
    window.addEventListener(COOKIE_CONSENT_EVENT, onChoice);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, onChoice);
  }, [disabledForDocument]);
  if (!pathname || disabledForDocument) return null;
  return <Analytics beforeSend={sanitizeVercelAnalyticsEvent} />;
}

export function TrueCapVercelAnalytics() {
  return (
    <Suspense fallback={null}>
      <TrueCapVercelAnalyticsInner />
    </Suspense>
  );
}
