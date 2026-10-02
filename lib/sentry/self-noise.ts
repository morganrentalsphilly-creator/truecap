/**
 * Notices the site raises about its own configuration on every page load.
 *
 * lib/analytics.ts reports "[analytics] NEXT_PUBLIC_POSTHOG_KEY missing from
 * the production build" from initAnalytics() whenever the PostHog key is
 * absent. PostHog is on hold, so the key is absent on purpose, and the report
 * left every visitor's browser once per full page load: one error-quota event
 * per load. On 2026-10-01 the organisation's error quota ran out and Sentry
 * answered every error envelope with 429. Browser, server and edge share one
 * DSN, so a blocked checkout or an unbound paid event would have raised no
 * alert either.
 *
 * This one message is now dropped in two places. captureMessageLazy
 * (lib/sentry/lazy.ts), the helper lib/analytics.ts calls, returns before it
 * loads the SDK, so nothing is sent or counted. beforeSend
 * (lib/sentry/client-init.ts) is the backstop for any other caller. Sentry
 * stays on, tracesSampleRate and the ignoreErrors list are untouched, and
 * every other captureMessage still reaches Sentry. If PostHog comes off hold
 * and the alert is wanted back, send it once per deployment from the server
 * instead of once per page view.
 *
 * The prefix must keep matching the literal in lib/analytics.ts;
 * lib/__tests__/sentry-self-noise.test.ts reads that file and fails if the
 * two drift apart.
 */
export const POSTHOG_KEY_MISSING_NOTICE_PREFIX =
  "[analytics] NEXT_PUBLIC_POSTHOG_KEY missing";

type NoticeLike = {
  message?: unknown;
  logentry?: { message?: unknown } | null;
};

/** True for the per-page-load notice above, false for every other event. */
export function isPerPageLoadConfigNotice(event: NoticeLike): boolean {
  const message =
    typeof event.message === "string"
      ? event.message
      : typeof event.logentry?.message === "string"
        ? event.logentry.message
        : "";
  return message.startsWith(POSTHOG_KEY_MISSING_NOTICE_PREFIX);
}
