"use client";

/**
 * 404 tracker — captures the requested pathname to Sentry whenever the
 * not-found page renders. Without this, broken inbound links accumulate
 * silently and the only way you'd find out is via traffic analytics
 * (which usually surfaces them too late to recover the visitors).
 *
 * Why a tiny client component instead of doing this in middleware or
 * the server not-found:
 *   - Next.js' not-found.tsx renders WITHOUT request context, so we
 *     can't read the URL server-side without a separate handler.
 *   - Middleware can detect 404s but adding Sentry capture there hurts
 *     edge-runtime cold start.
 *   - A 4kB client component mounted only on the not-found page is the
 *     simplest cleanest path. It runs after hydration so the user's
 *     view of the page isn't blocked.
 *
 * The captureMessage uses 'info' level — these aren't errors per se,
 * they're operational signals. Filter by tag `feature: not-found` in
 * the Sentry dashboard to triage.
 */

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import * as Sentry from "@sentry/nextjs";

export function NotFoundTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname === "/404") return;
    Sentry.captureMessage("404: page not found", {
      level: "info",
      tags: { feature: "not-found" },
      extra: {
        pathname,
        referrer: typeof document !== "undefined" ? document.referrer : "",
      },
    });
  }, [pathname]);

  return null;
}
