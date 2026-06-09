// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://273531778de80e317ca3e8cc6e1bf4ba@o4511448368480257.ingest.us.sentry.io/4511448369528832",

  // Replay integration is loaded lazily — the Replay package adds
  // ~45-55 KB gzipped to every page even at 10% session sampling
  // (the integration JS has to ship before it can decide whether to
  // record). Deferring to the next idle callback shaves that off the
  // initial bundle without losing replay-on-error data: errors caught
  // before Replay loads still report normally, they just don't include
  // a session recording. By the time a real user encounters one of the
  // rare errors that does warrant a replay, the integration has long
  // since loaded in the background.
  integrations: [],

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,
  // Enable Sentry log forwarding only in development. In production
  // every console.warn / console.info would otherwise ship as a Sentry
  // event, burning quota and burying real errors. Dev-only keeps the
  // signal high while preserving the local-debugging value.
  enableLogs: process.env.NODE_ENV !== "production",

  // Define how likely Replay events are sampled.
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  // PII scrubbing — sendDefaultPii includes cookies in event payloads,
  // which means the Supabase session cookie (`sb-*-auth-token`) would
  // be sent to Sentry on every event. If a Sentry data export were
  // ever compromised, those tokens could be used for account
  // impersonation. beforeSend hooks the event right before transport
  // and strips the auth cookie + any Authorization header.
  beforeSend(event) {
    // Cookies arrive as the raw `cookie` header string in
    // event.request.cookies. Scrub anything that looks like a
    // Supabase auth token.
    const reqCookies = event.request?.cookies as
      | Record<string, string>
      | undefined;
    if (reqCookies) {
      for (const key of Object.keys(reqCookies)) {
        if (/^sb-.*-auth-token/i.test(key)) {
          reqCookies[key] = "[scrubbed]";
        }
      }
    }
    // Authorization headers can also carry tokens (CRON_SECRET on
    // server-side cron requests, etc.). Scrub.
    const reqHeaders = event.request?.headers as
      | Record<string, string>
      | undefined;
    if (reqHeaders) {
      for (const key of Object.keys(reqHeaders)) {
        if (/^authorization$/i.test(key)) {
          reqHeaders[key] = "[scrubbed]";
        }
      }
    }
    // sendDefaultPii also attaches the signed-in user's email + IP to
    // every event. Keep the opaque Supabase user id (needed to count
    // affected users / dedupe) but strip direct identifiers — error
    // triage never needs the actual email address.
    if (event.user) {
      delete event.user.email;
      delete event.user.username;
      delete event.user.ip_address;
    }
    return event;
  },

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

// Lazy-load Sentry Replay after first paint so it doesn't compete with
// LCP / hydration. requestIdleCallback fires once the main thread is
// quiet (typically <500ms after the page becomes interactive on a
// fast connection, 1-3s on slow mobile). When `addIntegration` runs,
// Sentry attaches Replay to the existing client — sampling rules from
// `Sentry.init` above (10% session, 100% on error) are honored.
//
// Safari doesn't support `requestIdleCallback`, so we fall back to a
// 2-second setTimeout — far less precise but still well after first
// paint and hydration on any reasonable connection.
if (typeof window !== "undefined") {
  const loadReplay = () => {
    void import("@sentry/nextjs").then(({ replayIntegration }) => {
      Sentry.addIntegration(replayIntegration());
    });
  };
  // `requestIdleCallback` isn't in TS's lib.dom.d.ts (still considered
  // experimental even though every modern browser except Safari ships
  // it), so we resolve it through `globalThis` with a structural cast
  // and fall back to setTimeout otherwise.
  const ric = (
    globalThis as typeof globalThis & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void;
    }
  ).requestIdleCallback;
  if (typeof ric === "function") {
    ric(loadReplay, { timeout: 4000 });
  } else {
    setTimeout(loadReplay, 2000);
  }
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
