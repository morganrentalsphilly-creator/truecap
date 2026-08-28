import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../../${relativePath}`, import.meta.url)),
    "utf8",
  );
}

describe("anonymous first-decision security contract", () => {
  it("mints an HttpOnly exact-resource credential and rejects a second deal", () => {
    const action = read("app/actions/anonymous-decision.ts");
    expect(action).toContain("buildEvaluationDealResourceKey(parsed.data)");
    expect(action).toContain("current.resourceKey !== resourceKey");
    expect(action).toContain('code: "LIMIT_REACHED"');
    expect(action).toContain("httpOnly: true");
    expect(action).toContain('sameSite: "lax"');
    expect(action).toContain('secure: process.env.NODE_ENV === "production"');
    expect(action).toContain("anonymousClaimRateLimit.isOverLimit");
  });

  it("requires the same server-verified grant for exact ceiling and report", () => {
    const ceiling = read("app/actions/offer-ceiling.ts");
    const report = read("app/actions/generate-report-pdf.ts");
    expect(ceiling).toContain("activeAnonymousDecisionGrantMatches(");
    expect(ceiling).not.toContain("paidAccess = true");
    expect(report).toContain(
      "await activeAnonymousDecisionGrantMatches(input.values)",
    );
    expect(report).toContain("activeMeteredEvaluationDealGrantsAccess(");
    expect(report).toContain("!evaluationDealAccess || !input.savedExport");
  });

  it("keeps the exact anonymous decision portable after account creation", () => {
    const ceiling = read("app/actions/offer-ceiling.ts");
    const report = read("app/actions/generate-report-pdf.ts");
    const analyzer = read("components/investcalc/investcalc-page.tsx");
    expect(ceiling).toContain("[hasSubscription, anonymousDecisionGrant]");
    expect(ceiling).toContain("paidAccess = hasSubscription || anonymousDecisionGrant");
    expect(ceiling).toMatch(
      /if \(!paidAccess\) \{[\s\S]*?activeMeteredEvaluationDealGrantsAccess/,
    );
    const reportGrantAt = report.indexOf(
      "activeAnonymousDecisionGrantMatches(input.values)",
    );
    expect(reportGrantAt).toBeGreaterThan(0);
    expect(reportGrantAt).toBeLessThan(
      report.indexOf("createServerSupabaseClient()", reportGrantAt),
    );
    expect(reportGrantAt).toBeLessThan(
      report.indexOf("const entitlements =", reportGrantAt),
    );
    const savedPreflight = analyzer.slice(
      analyzer.indexOf("let savedExport:"),
      analyzer.indexOf("const pendingMaoBinding", analyzer.indexOf("let savedExport:")),
    );
    expect(savedPreflight).toContain("!anonymousDecisionGrantAvailable");
    expect(savedPreflight.indexOf("!anonymousDecisionGrantAvailable")).toBeLessThan(
      savedPreflight.indexOf("getSavedAnalysisPdfExportAction"),
    );
  });

  it("neutralizes unverified Offer Ceiling provenance before solving or reporting", () => {
    const ceiling = read("app/actions/offer-ceiling.ts");
    const report = read("app/actions/generate-report-pdf.ts");
    const builder = read("lib/report-data-builder.ts");
    expect(ceiling).toContain("normalizeExternalOfferCeilingTargetSource(");
    expect(ceiling).toContain("target,");
    expect(ceiling).toContain("values: parsed.data.values");
    expect(report).toContain("target: input.maxOfferTarget, values: input.values");
    expect(builder).toContain("normalizeExternalOfferCeilingTargetSource(");
    expect(builder).toContain("target: normalizedTarget");
  });

  it("claims before rendering and never treats the client state as authority", () => {
    const analyzer = read("components/investcalc/investcalc-page.tsx");
    const claimAt = analyzer.indexOf("claimAnonymousDecisionAction(values)");
    const renderAt = analyzer.indexOf("setAnalysisResult(result)", claimAt);
    expect(claimAt).toBeGreaterThan(0);
    expect(renderAt).toBeGreaterThan(claimAt);
    expect(analyzer).toContain(
      "canExportUnsavedPdf={anonymousDecisionGrantAvailable}",
    );
    expect(analyzer).toContain('anonymousGrant.code === "RATE_LIMITED"');
    expect(analyzer).toContain('anonymousGrant.code === "UNAVAILABLE"');
    expect(analyzer).toContain("No-signup decision paused");
  });

  it("keeps the public promise aligned with one portable first report", () => {
    const landing = read("components/marketing/landing-sections.tsx");
    const pricing = read("app/pricing/page.tsx");
    expect(landing).toContain('label: "Decision memo/report"');
    expect(landing).toContain('key: "pdf_export"');
    expect(pricing).toContain(
      '["Decision memo/report", "First decision", true]',
    );
  });
});
