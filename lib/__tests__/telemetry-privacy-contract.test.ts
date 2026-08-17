import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

describe("telemetry privacy contract", () => {
  it("keeps Sentry Replay and default PII disabled in every runtime", () => {
    const client = read("instrumentation-client.ts");
    const server = read("sentry.server.config.ts");
    const edge = read("sentry.edge.config.ts");

    expect(client).toContain("replaysSessionSampleRate: 0");
    expect(client).toContain("replaysOnErrorSampleRate: 0");
    expect(client).not.toContain("replayIntegration");
    for (const source of [client, server, edge]) {
      expect(source).toContain("sendDefaultPii: false");
      expect(source).toContain("scrubSentryEventSensitiveData(event)");
    }
  });

  it("prevents PostHog from persisting initial URLs or page titles", () => {
    const analytics = read("lib/analytics.ts");
    for (const source of [
      'save_campaign_params: false',
      'save_referrer: false',
      'persistence: "localStorage"',
      'property_denylist: ["title"]',
      "advanced_disable_flags: true",
      "disable_session_recording: true",
      "mask_all_text: true",
      "mask_all_element_attributes: true",
    ]) {
      expect(analytics).toContain(source);
    }
    expect(analytics).toContain("preparePostHogPersistence(key)");
    expect(analytics).toContain("posthog.unregister(legacyKey)");
  });

  it("route-gates Google and sanitizes Vercel pageviews", () => {
    const google = read("components/analytics/google-measurement.tsx");
    const vercel = read("components/analytics/vercel-analytics.tsx");
    const layout = read("app/layout.tsx");

    expect(google).toContain(
      "shouldKeepThirdPartyTelemetryDisabled"
    );
    expect(google).toContain('referrerPolicy="no-referrer"');
    expect(layout).toContain("<GoogleMeasurement />");
    expect(layout).not.toContain("googletagmanager.com/gtm.js");
    expect(vercel).toContain("beforeSend={sanitizeVercelAnalyticsEvent}");
    expect(vercel).toContain("sanitizeSensitiveUrl(event.url)");
    expect(vercel).toContain("shouldKeepThirdPartyTelemetryDisabled");

    const config = read("next.config.mjs");
    for (const route of ["/d/:path+", "/s/:path+", "/portal/:path+", "/embed/brand/:path+"]) {
      expect(config).toContain(`source: \"${route}\"`);
    }
    expect(config.match(/value: \"no-referrer\"/g)).toHaveLength(4);
  });
});
