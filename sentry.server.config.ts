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
    return event;
  },
});
