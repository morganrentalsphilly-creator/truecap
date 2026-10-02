"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  sanitizeSensitiveUrl,
  shouldKeepThirdPartyTelemetryDisabled,
} from "@/lib/sensitive-url";
import { stripAdClickIds } from "@/lib/analytics/ad-click-ids";

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

/** Vercel pageviews share the same URL privacy boundary as PostHog/Sentry. */
function TrueCapVercelAnalyticsInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const location = `${pathname}${searchParams?.size ? `?${searchParams.toString()}` : ""}`;
  const [sensitiveRouteSeen, setSensitiveRouteSeen] = useState(false);
  const disabledForDocument = shouldKeepThirdPartyTelemetryDisabled(
    location,
    sensitiveRouteSeen,
  );
  useEffect(() => {
    if (disabledForDocument && !sensitiveRouteSeen) {
      setSensitiveRouteSeen(true);
    }
  }, [disabledForDocument, sensitiveRouteSeen]);
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
