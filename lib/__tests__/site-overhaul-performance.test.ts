import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

/** Phase 7 (docs/site-overhaul.md): the structural performance rules. */
describe("performance contract", () => {
  it("keeps the analyzer bundle off the homepage and prefetches /analyze only on hover", () => {
    for (const path of ["app/page.tsx", "app/home-authed/page.tsx"]) {
      expect(read(path), path).not.toContain("components/investcalc/investcalc-page");
    }
    for (const path of [
      "components/marketing/analyze-cta-link.tsx",
      "components/marketing/sticky-conversion-bar.tsx",
      "components/marketing/hero-address-form.tsx",
      "components/marketing/marketing-nav.tsx",
      "components/investcalc/header.tsx",
    ]) {
      const source = read(path);
      const analyzeLinks = source.match(/href=(?:"\/analyze(?:\?[^"]*)?"|\{href\})/g) ?? [];
      expect(analyzeLinks.length, path).toBeGreaterThan(0);
      expect((source.match(/prefetch=\{false\}/g) ?? []).length, path).toBeGreaterThanOrEqual(analyzeLinks.length);
    }
  });

  it("loads GTM and the Ads tag only after cookie consent, lazily", () => {
    const google = read("components/analytics/google-measurement.tsx");
    expect(google).toContain("readStoredAnalyticsConsent() === \"granted\"");
    expect(google).toContain("!consentGranted");
    expect(google).not.toContain('strategy="afterInteractive"');
    expect((google.match(/strategy="lazyOnload"/g) ?? []).length).toBe(3);
    expect(google).toContain("COOKIE_CONSENT_EVENT");
  });

  it("targets modern browsers so the legacy polyfills chunk is not shipped", () => {
    const pkg = JSON.parse(read("package.json")) as { browserslist?: string[]; devDependencies: Record<string, string>; scripts: Record<string, string> };
    expect(pkg.browserslist).toEqual(["last 2 versions", "not dead", "> 0.5%"]);
    expect(pkg.devDependencies["@next/bundle-analyzer"]).toBeTruthy();
    expect(pkg.scripts.analyze).toContain("ANALYZE=true");
  });

  it("trims the Sentry client bundle and keeps error capture", () => {
    const config = read("next.config.mjs");
    expect(config).toContain("bundleSizeOptimizations");
    expect(config).toContain("excludeReplayShadowDom: true");
    expect(config).toContain("withBundleAnalyzer(nextConfig)");
    // The SDK is loaded lazily (interaction / idle / 4 s), with an early
    // error buffer, from lib/sentry/client-init.ts — which keeps the full
    // previous configuration.
    const entry = read("instrumentation-client.ts");
    expect(entry).not.toContain('from "@sentry/nextjs"');
    expect(entry).toContain('import("@/lib/sentry/client-init")');
    expect(entry).toContain('window.addEventListener("error", onError)');
    expect(entry).toContain("export function onRouterTransitionStart");
    const init = read("lib/sentry/client-init.ts");
    expect(init).toContain("Sentry.init(");
    expect(init).toContain("replaysSessionSampleRate: 0");
    expect(init).toContain("scrubSentryEventSensitiveData(event)");
    expect(init).toContain("captureRouterTransitionStart");
  });

  it("enforces the budgets in CI with the accessibility and CLS gates as errors", () => {
    const lhci = JSON.parse(read("lighthouserc.json")) as { ci: { assert: { assertMatrix: Array<{ assertions: Record<string, unknown[]> }> } } };
    const home = lhci.ci.assert.assertMatrix[0].assertions;
    expect(home["categories:accessibility"][0]).toBe("error");
    expect(home["cumulative-layout-shift"][0]).toBe("error");
    expect(home["largest-contentful-paint"]).toEqual(["warn", { maxNumericValue: 2500 }]);
    expect(home["total-blocking-time"]).toEqual(["warn", { maxNumericValue: 200 }]);
    expect(read(".github/workflows/ci.yml")).toContain("@lhci/cli");
  });

  it("keeps priority on the hero image only", () => {
    const shots = ["components/marketing/marketing-hero.tsx", "app/pricing/page.tsx", "app/blog/page.tsx", "app/for-buy-and-hold/page.tsx"]
      .map((p) => read(p));
    expect(shots[0]).toContain("priority");
    for (const source of shots.slice(1)) expect(source).not.toMatch(/\bpriority\b/);
  });
});
