// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://273531778de80e317ca3e8cc6e1bf4ba@o4511448368480257.ingest.us.sentry.io/4511448369528832",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  // PII scrubbing — same pattern as instrumentation-client.ts. Strips
  // Supabase session cookies + Authorization headers + Stripe webhook
  // signatures from event payloads so a future Sentry data export
  // couldn't be used for account impersonation or webhook replay
  // attacks. Applies to all server-side events including API routes,
  // server actions, and the Stripe webhook.
  beforeSend(event) {
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
    const reqHeaders = event.request?.headers as
      | Record<string, string>
      | undefined;
    if (reqHeaders) {
      for (const key of Object.keys(reqHeaders)) {
        if (/^(authorization|stripe-signature)$/i.test(key)) {
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
    // sendDefaultPii also populates event.request.data with the request body —
    // for our forms that's property prices, rents, and financial assumptions.
    // Error triage never needs the raw body, so scrub it to shrink the PII
    // blast radius if a Sentry token/export is ever compromised. (The Stripe
    // webhook is unaffected: constructEvent runs on the raw body before any
    // capture, and stripe-signature is already scrubbed above.)
    if (event.request && "data" in event.request) {
      event.request.data = "[scrubbed]";
    }
    return event;
  },
});
