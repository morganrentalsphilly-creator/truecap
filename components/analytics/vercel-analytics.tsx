"use client";

import {
  Analytics,
  type BeforeSendEvent,
} from "@vercel/analytics/next";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  sanitizeSensitiveUrl,
  shouldKeepThirdPartyTelemetryDisabled,
} from "@/lib/sensitive-url";

export function sanitizeVercelAnalyticsEvent<T extends BeforeSendEvent>(
  event: T
): T {
  return { ...event, url: sanitizeSensitiveUrl(event.url) };
}

/** Vercel pageviews share the same URL privacy boundary as PostHog/Sentry. */
export function TrueCapVercelAnalytics() {
  const pathname = usePathname();
  const [sensitiveRouteSeen, setSensitiveRouteSeen] = useState(false);
  const disabledForDocument = shouldKeepThirdPartyTelemetryDisabled(
    pathname ?? "",
    sensitiveRouteSeen
  );
  useEffect(() => {
    if (disabledForDocument && !sensitiveRouteSeen) {
      setSensitiveRouteSeen(true);
    }
  }, [disabledForDocument, sensitiveRouteSeen]);
  if (!pathname || disabledForDocument) return null;
  return <Analytics beforeSend={sanitizeVercelAnalyticsEvent} />;
}
