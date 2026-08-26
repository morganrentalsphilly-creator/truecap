import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

function section(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  expect(start, `missing source marker: ${startMarker}`).toBeGreaterThanOrEqual(0);
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(end, `missing source marker: ${endMarker}`).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("portal and saved-deal Max Offer continuity", () => {
  it("shows paid analysis after the Agent Portal entitlement has been proven", () => {
    const source = read("app/portal/[token]/d/[dealId]/page.tsx");
    const entitlementGate = source.indexOf(
      'if (!hasPlanFeature(entitlements, "agent_portal")) notFound();'
    );
    const releaseGate = source.indexOf(
      'if (!isFeatureReleased("agent_portal")) notFound();'
    );
    const enablePaidView = source.indexOf("showProAnalysis = true;", entitlementGate);

    expect(releaseGate).toBeGreaterThanOrEqual(0);
    expect(releaseGate).toBeLessThan(source.indexOf("readSignedToken("));
    expect(entitlementGate).toBeGreaterThanOrEqual(0);
    expect(enablePaidView).toBeGreaterThan(entitlementGate);
    expect(source).not.toContain('hasPlanFeature(entitlements, "max_offer")');
    expect(source).toContain('.from("agent_clients")');
    expect(source).toContain("if (!client || client.is_archived) notFound()");
    expect(source).toContain("resolveSavedAnalysisResult({");
    expect(source).toContain("if (!methodologyResolution.result) notFound()");
    expect(source).toContain("recordedResult={recordedResult}");
    expect(source).not.toContain("calculateAnalysis(values)");
    expect(source).toContain("normalizeMaoTarget(");
    expect(source).toContain("maoTarget={maoTarget}");
  });

  it("does not recompute a historical Offer Ceiling inside an authorized recorded view", () => {
    const source = read("app/portal/[token]/d/[dealId]/page.tsx");
    const releaseGate = source.indexOf(
      'if (!isFeatureReleased("agent_portal")) notFound();'
    );
    const tokenGate = source.indexOf("readSignedToken(", releaseGate);
    const entitlementGate = source.indexOf(
      'if (!hasPlanFeature(entitlements, "agent_portal")) notFound();',
      tokenGate
    );
    const clientGate = source.indexOf(
      "if (!client || client.is_archived) notFound();",
      entitlementGate
    );
    const dealGate = source.indexOf("if (!deal) notFound();", clientGate);
    const methodologyGate = source.indexOf(
      "if (!methodologyResolution.result) notFound();",
      dealGate
    );
    const financingNormalization = source.indexOf(
      "normalizeMaoTargetForFinancing(savedMaoTarget",
      methodologyGate
    );
    const sourceNormalization = source.indexOf(
      "normalizeOfferCeilingTargetSource(",
      financingNormalization
    );
    const recordedResolution = source.indexOf(
      "readRecordedOfferCeiling(savedResultSnapshot)",
      sourceNormalization
    );
    const exactResolution = source.indexOf(
      "resolveOfferCeilingForAccess({",
      recordedResolution
    );
    const shellPayload = source.indexOf(
      "offerCeilingAccess={offerCeilingAccess}",
      exactResolution
    );

    expect(releaseGate).toBeGreaterThanOrEqual(0);
    expect(tokenGate).toBeGreaterThan(releaseGate);
    expect(entitlementGate).toBeGreaterThan(tokenGate);
    expect(clientGate).toBeGreaterThan(entitlementGate);
    expect(dealGate).toBeGreaterThan(clientGate);
    expect(methodologyGate).toBeGreaterThan(dealGate);
    expect(financingNormalization).toBeGreaterThan(methodologyGate);
    expect(sourceNormalization).toBeGreaterThan(financingNormalization);
    expect(recordedResolution).toBeGreaterThan(sourceNormalization);
    expect(exactResolution).toBeGreaterThan(recordedResolution);
    expect(shellPayload).toBeGreaterThan(exactResolution);
    expect(source.slice(exactResolution, shellPayload)).toContain("paidAccess: true");
    expect(source.slice(sourceNormalization, recordedResolution)).toContain(
      "if (maoTarget && recordedResult)"
    );
    expect(source.slice(recordedResolution, exactResolution)).not.toContain(
      "resolveOfferCeilingForAccess({"
    );
    expect(source).toContain("isCashPurchase: result.monthlyPayment <= 0");
    expect(source).toMatch(/\?\?\s*"selected-targets"/);
    expect(source).toContain("maoTargetSource={maoTargetSource}");
  });

  it("normalizes duplicate targets and keeps edit reopen owner-scoped and durable", () => {
    const source = read("components/investcalc/open-saved-deal-in-analyzer.tsx");
    const analyzer = read("components/investcalc/investcalc-page.tsx");
    const duplicate = section(
      source,
      "export async function duplicateSavedDealInAnalyzer(",
      "export async function openSavedDealInAnalysisTab("
    );
    const edit = section(
      source,
      "export async function openSavedDealInAnalysisTab(",
      "export function OpenFullAnalysisButton"
    );

    expect(source).toContain(
      "const maxOfferTarget = normalizeMaoTarget(resultSnapshot.maxOfferTarget);"
    );
    expect(source).toContain("delete normalizedResultSnapshot.maxOfferTarget;");
    expect(duplicate).toContain(
      "normalizeSavedDealHandoffTarget(result.resultSnapshot)"
    );
    expect(duplicate).toContain(
      "? { maxOfferTarget, maxOfferTargetSource }"
    );
    expect(edit).toContain("`/?savedDeal=${encodeURIComponent(id)}`");
    expect(edit).not.toContain("writeNonceKeyedHandoffPayload");
    expect(analyzer).toContain("normalizeMaoTarget(savedResultRecord?.maxOfferTarget)");
  });
});
