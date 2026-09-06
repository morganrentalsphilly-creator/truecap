/**
 * The real Sentry browser init. Loaded LAZILY by instrumentation-client.ts
 * (after the page is interactive) because the SDK is the largest chunk on
 * every page (~166 KB gzipped); keeping it out of the critical path is the
 * biggest single homepage win in docs/site-overhaul.md Phase 7. Everything
 * below is the previous configuration, unchanged: PII scrubbing, Replay off,
 * tracing on, the triaged ignoreErrors list.
 */

let initialized = false;

import * as Sentry from "@sentry/nextjs";
import {
  scrubSentryBreadcrumbUrl,
  scrubSentryEventSensitiveData,
  scrubSentryRequestCookies,
  scrubSentryRequestHeaders,
  scrubSentrySpanUrl,
} from "@/lib/sentry-url-scrubber";

export function initSentryClient(): void {
  if (initialized) return;
  initialized = true;
  Sentry.init({
  dsn: "https://273531778de80e317ca3e8cc6e1bf4ba@o4511448368480257.ingest.us.sentry.io/4511448369528832",

  // Keep optional integrations explicit. Replay is deliberately absent; see
  // the zero sampling policy below.
  integrations: [],

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,
  // Enable Sentry log forwarding only in development. In production
  // every console.warn / console.info would otherwise ship as a Sentry
  // event, burning quota and burying real errors. Dev-only keeps the
  // signal high while preserving the local-debugging value.
  enableLogs: process.env.NODE_ENV !== "production",

  // Replay records rrweb metadata and DOM snapshots outside the normal
  // beforeSend event boundary. Public share routes carry encoded analyses or
  // bearer tokens in the path, so Replay remains fully disabled until Sentry
  // provides a verified route-aware transport scrub.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  // Default request/user PII is disabled. The final scrub remains in place
  // for integrations or explicit contexts that attach data independently.
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: false,

  // Navigation/fetch/xhr breadcrumbs can carry the raw pre-cleanup URL even
  // when event.request has already been scrubbed. Sanitize at breadcrumb
  // creation and again in beforeSend below for defense in depth.
  beforeBreadcrumb(breadcrumb) {
    return scrubSentryBreadcrumbUrl(
      breadcrumb,
      typeof window === "undefined" ? undefined : window.location.pathname
    );
  },

  beforeSendSpan(span) {
    return scrubSentrySpanUrl(span);
  },

  beforeSendTransaction(event) {
    return scrubSentryEventSensitiveData(event);
  },

  // Final privacy boundary for anything an integration or explicit capture
  // attaches despite default PII collection being disabled.
  beforeSend(event) {
    // Checkout/OAuth capabilities must not survive in an error event's URL or
    // parsed query string. This runs before transport even if React never
    // mounted (for example, an early hydration exception).
    scrubSentryEventSensitiveData(event);
    // Scrub parsed cookies, the raw Cookie header, secrets, and referrers.
    scrubSentryRequestCookies(
      event.request?.cookies as Record<string, string> | undefined
    );
    scrubSentryRequestHeaders(
      event.request?.headers as Record<string, string> | undefined
    );
    // Keep an explicitly attached opaque user id, but strip direct IDs.
    if (event.user) {
      delete event.user.email;
      delete event.user.username;
      delete event.user.ip_address;
    }
    // Error triage never needs request bodies containing deal inputs.
    if (event.request && "data" in event.request) {
      event.request.data = "[scrubbed]";
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
}

export function captureBufferedError(error: unknown, kind: "error" | "unhandledrejection"): void {
  Sentry.captureException(error, { tags: { buffered_before_init: "true", kind } });
}

export const routerTransitionStart = Sentry.captureRouterTransitionStart;
