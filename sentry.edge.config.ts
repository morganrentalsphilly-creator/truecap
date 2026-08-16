// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import {
  scrubSentryBreadcrumbUrl,
  scrubSentryEventSensitiveData,
  scrubSentryRequestCookies,
  scrubSentryRequestHeaders,
  scrubSentrySpanUrl,
} from "@/lib/sentry-url-scrubber";

Sentry.init({
  dsn: "https://273531778de80e317ca3e8cc6e1bf4ba@o4511448368480257.ingest.us.sentry.io/4511448369528832",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Default request/user PII is off; beforeSend still scrubs any fields an
  // integration or explicit capture attaches.
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: false,

  beforeBreadcrumb(breadcrumb) {
    return scrubSentryBreadcrumbUrl(breadcrumb);
  },

  beforeSendSpan(span) {
    return scrubSentrySpanUrl(span);
  },

  beforeSendTransaction(event) {
    return scrubSentryEventSensitiveData(event);
  },

  // PII scrubbing — mirrors sentry.server.config.ts. The edge layer
  // runs proxy.ts (every request's Supabase session refresh), so an
  // unscrubbed event here could carry the auth cookie or the user's
  // email. This config previously had NO beforeSend at all.
  beforeSend(event) {
    // proxy/edge instrumentation observes the raw incoming URL before any
    // browser code runs, so this is a required token-scrubbing boundary.
    scrubSentryEventSensitiveData(event);
    scrubSentryRequestCookies(
      event.request?.cookies as Record<string, string> | undefined
    );
    scrubSentryRequestHeaders(
      event.request?.headers as Record<string, string> | undefined
    );
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
});
