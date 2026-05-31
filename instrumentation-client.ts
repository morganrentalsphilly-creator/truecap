// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://273531778de80e317ca3e8cc6e1bf4ba@o4511448368480257.ingest.us.sentry.io/4511448369528832",

  // Add optional integrations for additional features
  integrations: [Sentry.replayIntegration()],

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,
  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Define how likely Replay events are sampled.
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  // Filter out benign noise errors that don't represent real bugs.
  // These get captured because Supabase/libraries throw them as
  // unhandled rejections, but they're expected behavior.
  ignoreErrors: [
    // Supabase Auth uses Web Locks API to coordinate token refreshes
    // across browser tabs. When a user has the site open in multiple
    // tabs, the second tab's lock acquisition "immediately fails" by
    // design — the first tab holds the lock. The failing tab retries
    // on the next tick. No real bug, just multi-tab coordination.
    /Acquiring an exclusive Navigator LockManager lock/,
    /lock:sb-.*-auth-token/,
    // Catches the whole class of Supabase Auth instrumentation errors
    // in Safari. GoTrueClient attaches diagnostic properties to caught
    // errors — `isAcquireTimeout` on lock timeouts, `__isAuthError` on
    // AuthError subclass discrimination. Safari sometimes returns these
    // error objects frozen, so the property assignment throws
    // "Cannot add property X, object is not extensible". This is an
    // instrumentation pattern, never a real logic bug — the underlying
    // operation already failed; only the failure-reporting fails. One
    // broad pattern catches all current + future variants without
    // playing whack-a-mole on each new property name.
    /Cannot add property .+, object is not extensible/,
    // Network errors that aren't actionable (user is offline, etc.).
    // Each browser uses different language for the same underlying
    // condition — Chrome says "Failed to fetch", Firefox says
    // "NetworkError when attempting to fetch resource", and Safari
    // (desktop + iOS) says "Load failed". All three mean the request
    // didn't complete due to network, abort, or content blocker —
    // never a code bug. Filter all three.
    /NetworkError when attempting to fetch resource/,
    /Failed to fetch/,
    /Load failed/,
    // Aborted requests — fires when the user navigates away or
    // backgrounds the app mid-fetch. Mobile Safari does this aggressively.
    /AbortError/,
    /The user aborted a request/,
    /The operation was aborted/,
    /signal is aborted without reason/,
    // ResizeObserver loop noise — fired by browsers when ResizeObserver
    // can't deliver all observations in a single frame. Benign and
    // common, especially on iOS Safari.
    /ResizeObserver loop/,
    // Browser extension noise — not our code, can't fix it.
    /Non-Error promise rejection captured with value:/,
  ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
