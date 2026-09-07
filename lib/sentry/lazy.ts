/**
 * Lazy Sentry capture for client modules that Next.js loads on EVERY route
 * (the root error boundaries, the 404 tracker). A
 * static namespace import of the SDK in any of those puts ~15 KB gzip
 * of Sentry core back on the critical path of every marketing page, undoing
 * the Phase 7 deferral in docs/site-overhaul.md. These helpers keep
 * `@sentry/nextjs` confined to lib/sentry/client-init.ts and load it only
 * when there is actually something to report.
 *
 * `initSentryClient` is idempotent, so calling it here is safe whether or not
 * instrumentation-client.ts has already loaded the SDK — and it closes the
 * early-crash gap: a route that throws before the idle/interaction loader ran
 * is initialised right before its capture instead of being dropped.
 */

import type { captureMessageLazyTarget } from "@/lib/sentry/client-init";

export function captureExceptionLazy(
  error: unknown,
  kind: "error" | "unhandledrejection" = "error",
): Promise<void> {
  return import("@/lib/sentry/client-init")
    .then((m) => {
      m.initSentryClient();
      m.captureBufferedError(error, kind);
    })
    .catch(() => {
      // Sentry failing to load (offline, blocked by an extension) must never
      // surface as a second error inside an error boundary.
    });
}

export function captureMessageLazy(
  message: string,
  context?: Parameters<typeof captureMessageLazyTarget>[1],
): Promise<void> {
  return import("@/lib/sentry/client-init")
    .then((m) => {
      m.initSentryClient();
      m.captureMessageLazyTarget(message, context);
    })
    .catch(() => {
      // See captureExceptionLazy.
    });
}
