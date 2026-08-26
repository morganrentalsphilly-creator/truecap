import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("release hardening guards", () => {
  it("preserves the exact protected route through a same-origin login", () => {
    const proxy = read("proxy.ts");
    expect(proxy).toContain(
      'requestHeaders.set(\n    "x-truecap-request-path"',
    );
    for (const layout of [
      "app/dashboard/layout.tsx",
      "app/profile/layout.tsx",
      "app/settings/layout.tsx",
    ]) {
      const source = read(layout);
      expect(source, layout).toContain("getCurrentRequestPath");
      expect(source, layout).toContain("loginPathFor");
    }
  });

  it("never silently overwrites dirty property facts during autofill", () => {
    const source = read("components/investcalc/investcalc-page.tsx");
    const ownership = read("lib/autofill-field-ownership.ts");
    expect(source).toContain("decideAutofillFieldWrite");
    expect(source).toContain("currentValue: form.getValues(field)");
    expect(source).toContain(
      "explicitlyApproved: approvedOverwrites.has(field)",
    );
    expect(ownership).toContain('action: "conflict"');
    expect(ownership).toContain('reason: "different-value"');
    expect(source).toContain("aria-label={`${conflict.label} value source`}");
    expect(source).toContain("Keep mine");
    expect(source).toContain("Use estimate");
  });

  it("protects restored/template rate and tax values from address benchmarks", () => {
    const source = read("components/investcalc/investcalc-page.tsx");
    expect(source).toContain("mayAdoptStartingBenchmark");
    expect(source).toContain("autoApplyEligibleRef.current");
    expect(source).toContain('!form.getValues("templateId")');
    expect(source).toContain("!savedDealIdRef.current");
    expect(source).toContain("replaceableDefault: isReplaceableProductDefault");
  });

  it("does not turn aggregate query failure into a zero-value portfolio", () => {
    const route = read("app/dashboard/page.tsx");
    const home = read("components/dashboard/DashboardHome.tsx");
    expect(route).toContain('aggregateResult.error ? "unavailable" : "ready"');
    expect(home).toContain('portfolioAggregateStatus === "unavailable"');
    expect(home).toContain("Full portfolio totals are temporarily unavailable");
  });

  it("distinguishes document-list failure from an empty document list", () => {
    const source = read("components/investcalc/deal-documents-card.tsx");
    expect(source).toContain("setLoadError");
    expect(source).toContain("Couldn&apos;t load documents");
    expect(source).toContain("Try again");
    expect(source).toContain("The file was stored. Retry the document list");
  });

  it("keeps a verified checkout in an explicit activation state", () => {
    const source = read("components/marketing/billing-success-banner.tsx");
    expect(source).toContain('"checking" | "live" | "taking_longer"');
    expect(source).toContain("Refresh access");
    expect(source).toContain("Manage billing");
    expect(source).toContain("hello@usetruecap.com");
  });

  it("observes CSP before enforcement and redacts reports", () => {
    const config = read("next.config.mjs");
    const route = read("app/api/csp-report/route.ts");
    expect(config).toContain('key: "Content-Security-Policy-Report-Only"');
    expect(config).not.toContain(
      'key: "Content-Security-Policy", value: cspReportOnly',
    );
    expect(route).toContain("return `/${parts[0]}/:redacted`");
    expect(route).not.toContain("request.text()");
  });

  it("runs release browser regressions against the production server", () => {
    const workflow = read(".github/workflows/ci.yml");
    const playwrightConfig = read("playwright.config.ts");

    expect(workflow).toContain("PLAYWRIGHT_USE_PRODUCTION_SERVER: true");
    expect(workflow).toContain("name: Build the production browser target");
    expect(workflow).toContain("NEXT_PUBLIC_SUPABASE_URL=$API_URL");
    expect(playwrightConfig).toContain(
      "npm run start -- --hostname 127.0.0.1 --port 3100",
    );
  });
});
