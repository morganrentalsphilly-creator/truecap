import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(join(ROOT, dir))) {
    if (entry === "node_modules" || entry === ".next" || entry === "__tests__") continue;
    const rel = join(dir, entry);
    if (statSync(join(ROOT, rel)).isDirectory()) walk(rel, out);
    else if (/\.(tsx?|mjs|js)$/.test(rel)) out.push(rel);
  }
  return out;
}

/** Phase 7 (docs/site-overhaul.md): the structural performance rules. */
describe("performance contract", () => {
  // Next 16's App Router never prefetches a prefetch={false} link, not even on
  // hover or touch (next/dist/client/app-dir/link.js), so these links fetch
  // /analyze on click only. Hover prefetch needs IntentPrefetchLink.
  it("keeps the analyzer bundle off the homepage and never prefetches /analyze", () => {
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
    // The loader only renders after an explicit "granted" decision, so it must
    // push the granted update itself — the banner's click-time update fires
    // before window.gtag exists. Default (denied) must still come first.
    const consentDefault = google.indexOf("gtag('consent', 'default'");
    const consentUpdate = google.indexOf("gtag('consent', 'update'");
    expect(consentDefault).toBeGreaterThanOrEqual(0);
    expect(consentUpdate).toBeGreaterThan(consentDefault);
    const update = google.slice(consentUpdate, google.indexOf("});", consentUpdate));
    expect(update).toContain("analytics_storage: 'granted'");
    expect(update).toContain("ad_storage: 'granted'");
    expect(update).toContain("ad_user_data: 'granted'");
    expect(update).toContain("ad_personalization: 'granted'");
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
    expect(init).toMatch(/^\s+init\(\{$/m);
    expect(init).toContain("replaysSessionSampleRate: 0");
    expect(init).toContain("scrubSentryEventSensitiveData(event)");
    expect(init).toContain("captureRouterTransitionStart");
    // Client modules Next.js bundles into EVERY route (the root error
    // boundaries, the 404 tracker) must not import the SDK statically either,
    // or ~15 KB gzip of Sentry core lands back on every marketing page. They
    // go through lib/sentry/lazy.ts, which inits (idempotent) then captures.
    for (const path of [
      "app/error.tsx",
      "app/global-error.tsx",
      "components/marketing/not-found-tracker.tsx",
    ]) {
      const source = read(path);
      expect(source, path).not.toContain('from "@sentry/nextjs"');
      expect(source, path).toMatch(/from "@\/lib\/sentry\/lazy"/);
    }
    const lazy = read("lib/sentry/lazy.ts");
    expect(lazy).not.toContain('from "@sentry/nextjs"');
    expect(lazy).toContain('import("@/lib/sentry/client-init")');
    expect(lazy).toContain("m.initSentryClient()");
  });

  it("lets webpack tree-shake the Sentry SDK (no Replay, rrweb or Feedback on idle)", () => {
    // The package root re-exports every integration the SDK ships. Webpack
    // keeps only the names it can see being used, so a namespace import it
    // cannot follow keeps them ALL. One `await import("@sentry/nextjs")` in
    // lib/analytics.ts did exactly that: the homepage's idle Sentry load was
    // 202 KB on the wire, 112 KB of it rrweb, Feedback, profiling and the AI
    // and feature-flag integrations, none of which the config uses.
    const init = read("lib/sentry/client-init.ts");
    expect(init).not.toMatch(/import\s+\*\s+as\s+\w+\s+from\s+"@sentry\/nextjs"/);
    expect(init).toMatch(/import\s*\{[^}]*\binit\b[^}]*\}\s*from\s+"@sentry\/nextjs"/);
    const dynamicSdkImports = ["app", "components", "hooks", "lib"]
      .flatMap((dir) => walk(dir))
      .concat(["instrumentation-client.ts"])
      .filter((path) => /import\(\s*["']@sentry\/nextjs["']\s*\)/.test(read(path)));
    expect(dynamicSdkImports).toEqual([]);
    const analytics = read("lib/analytics.ts");
    expect(analytics).toContain('import { captureMessageLazy } from "@/lib/sentry/lazy";');
    expect(analytics).toContain("void captureMessageLazy(");
  });

  it("keeps the Supabase browser client out of the anonymous /analyze first load", () => {
    // cacheSavedAnalysisPdfExport is only reachable for signed-in Pro PDF
    // exports, yet a static import of it pulled supabase-js + auth-js (~64 KB
    // gzip) into the analyzer bundle for every anonymous visitor.
    const analyzer = read("components/investcalc/investcalc-page.tsx");
    expect(analyzer).not.toMatch(/^import .* from "@\/lib\/supabase\/client";/m);
    expect(analyzer).not.toMatch(/^import .* from "@\/lib\/pdf\/saved-analysis-cache";/m);
    expect(analyzer).toContain('await import("@/lib/pdf/saved-analysis-cache")');
  });

  it("enforces the budgets in CI with the accessibility and CLS gates as errors", () => {
    const lhci = JSON.parse(read("lighthouserc.json")) as { ci: { assert: { assertMatrix: Array<{ assertions: Record<string, unknown[]> }> } } };
    const home = lhci.ci.assert.assertMatrix[0].assertions;
    expect(home["categories:accessibility"][0]).toBe("error");
    expect(home["cumulative-layout-shift"][0]).toBe("error");
    expect(home["largest-contentful-paint"]).toEqual(["warn", { maxNumericValue: 2500, aggregationMethod: "median" }]);
    expect(home["total-blocking-time"]).toEqual(["warn", { maxNumericValue: 200, aggregationMethod: "median" }]);
    expect(read(".github/workflows/ci.yml")).toContain("@lhci/cli");
  });

  // Simulated throttling reports 1.8 to 4.4 s of LCP for the same page and
  // hides the font-swap shift (the unthrottled load has the font before
  // first paint). Applied throttling ("devtools") is the fix, but the CI
  // runner image lists no Arial, so next/font's fallback face would not
  // resolve there and the CLS gate is expected to fail for the runner's
  // fonts, not the site's (predicted from an emulation, never run on the
  // runner). Until the lighthouse job installs Arial the method stays
  // simulated. The three runs and the median stay: LHCI's default
  // aggregation is "optimistic", the best of the three.
  it("reads the median of three runs on the three URLs", () => {
    const lhci = JSON.parse(read("lighthouserc.json")) as {
      ci: {
        collect: { url: string[]; numberOfRuns: number; settings: { throttlingMethod: string } };
        assert: { assertMatrix: Array<{ matchingUrlPattern: string; assertions: Record<string, [string, Record<string, unknown>]> }> };
      };
    };
    expect(lhci.ci.collect.settings.throttlingMethod).toBe("simulate");
    expect(lhci.ci.collect.numberOfRuns).toBe(3);
    // /pricing is where the headline re-wrapped at the font swap (0.199).
    expect(lhci.ci.collect.url.map((u) => new URL(u).pathname)).toEqual(["/", "/analyze", "/pricing"]);
    expect(lhci.ci.assert.assertMatrix).toHaveLength(3);
    for (const { matchingUrlPattern, assertions } of lhci.ci.assert.assertMatrix) {
      expect(assertions["cumulative-layout-shift"], matchingUrlPattern).toEqual([
        "error",
        { maxNumericValue: 0.05, aggregationMethod: "median" },
      ]);
      expect(assertions["categories:accessibility"], matchingUrlPattern).toEqual(["error", { minScore: 0.95 }]);
    }
  });

  // The homepage's largest paint is the ledger's text since the 2026-09
  // design pass, so nothing on these pages preloads an image ahead of it.
  it("preloads no image ahead of the text hero", () => {
    const shots = ["components/marketing/marketing-hero.tsx", "app/pricing/page.tsx", "app/blog/page.tsx"]
      .map((p) => read(p));
    for (const source of shots) expect(source).not.toMatch(/\bpriority\b/);
  });

  // Both links sit in the first screen at desktop width. As default links
  // they prefetched the two auth routes and supabase-js (about 100 KB of
  // script) on every anonymous desktop load (go-to-market audit, P2-87).
  // They are nofollow like the footer's: robots.txt disallows /auth/ (P2-94).
  it("prefetches the header's auth links on intent, not on every desktop load", () => {
    const header = read("components/investcalc/header.tsx");
    expect(header).not.toMatch(/<Link\s[^>]*href="\/auth\//);
    expect(header).toContain('<IntentPrefetchLink href="/auth/login" rel="nofollow">');
    expect(header).toContain('<IntentPrefetchLink href="/auth/sign-up" rel="nofollow">');
  });

  // Where a product shot IS the largest paint it must not wait for layout:
  // lazy, it was the desktop LCP on every /vs page and painted about 1.4 s
  // after the text on /for-buy-and-hold on a slow phone connection.
  it("loads the first-screen product shot with priority where it is the largest paint", () => {
    const firstShot = (source: string) => source.match(/<ProductShot\b[^>]*?\balt=/)?.[0] ?? null;
    for (const path of ["app/for-investors/page.tsx", "app/for-buy-and-hold/page.tsx"]) {
      expect(firstShot(read(path)), path).toMatch(/^\s*priority$/m);
    }
    const comparisons = readdirSync(join(ROOT, "app/vs"))
      .filter((entry) => statSync(join(ROOT, "app/vs", entry)).isDirectory())
      .map((entry) => join("app/vs", entry, "page.tsx"))
      .filter((path) => read(path).includes("<ProductShot"));
    // Every comparison page that is not a redirect carries the shot. No
    // fixed count: a page that is retired or redirected must not redden this.
    expect(comparisons.length).toBeGreaterThan(0);
    for (const path of comparisons) {
      expect(firstShot(read(path)), path).toMatch(/^\s*priority$/m);
    }
  });
});
