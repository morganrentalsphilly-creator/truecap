"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  sanitizeSensitiveUrl,
  shouldKeepThirdPartyTelemetryDisabled,
} from "@/lib/sensitive-url";

export function sanitizeVercelAnalyticsEvent<T extends BeforeSendEvent>(
  event: T,
): T {
  return { ...event, url: sanitizeSensitiveUrl(event.url) };
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
