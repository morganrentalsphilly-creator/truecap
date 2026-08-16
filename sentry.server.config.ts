// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
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

  // PII scrubbing — same pattern as instrumentation-client.ts. Strips
  // Supabase session cookies + Authorization headers + Stripe webhook
  // signatures from event payloads so a future Sentry data export
  // couldn't be used for account impersonation or webhook replay
  // attacks. Applies to all server-side events including API routes,
  // server actions, and the Stripe webhook.
  beforeSend(event) {
    // The initial request reaches the server before the browser's head
    // bootstrap can clean its address bar. Scrub here so a legacy
    // pdf_purchase=cs_... value can never enter server-side Sentry.
    scrubSentryEventSensitiveData(event);
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
    // Error triage never needs request bodies containing deal inputs. The
    // Stripe webhook is unaffected: constructEvent runs before any capture.
    if (event.request && "data" in event.request) {
      event.request.data = "[scrubbed]";
    }
    return event;
  },
});
