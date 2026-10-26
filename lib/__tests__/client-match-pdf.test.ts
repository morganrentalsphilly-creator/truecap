import { writeFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { extractText } from "unpdf";
import { buildCanonicalReportData } from "@/lib/report-data-builder";
import { generateInvestmentPDFArtifact } from "@/lib/pdf-generator";
import { reportDataSchema } from "@/lib/report-payload-schema";
import { SAMPLE_DEAL_VALUES } from "@/lib/sample-deal";
import { EMPTY_BUY_BOX, type NamedBuyBox } from "@/lib/buy-box";
import { buildClientMatchSnapshot } from "@/lib/client-underwriting-server";
vi.mock("@/lib/pdf/load-image", () => ({ loadPdfImage: async () => null }));
const client = { id: "client-a", name: "Fixture investor / client A", email: "private@example.invalid", phone: null, notes: "PRIVATE NOTE SHOULD NOT APPEAR", isArchived: false, createdAt: "2026-10-26", financingAssumptions: { kind: "cash" as const } };
const box: NamedBuyBox = { ...EMPTY_BUY_BOX, id: "box-a", clientId: "client-a", name: "Long-term rental criteria", strategyKind: null, isDefault: true, sortOrder: 0, minCapRatePct: 6, minCashFlowMonthly: 200, minDscr: 1.25, maxPurchasePrice: 400000, targetStates: ["PA"], propertyTypes: ["single-family"] };
describe("frozen client-specific PDF", () => {
  it.each([
    { address: SAMPLE_DEAL_VALUES.address, criteria: { ...box, targetStates: ["TX"] } },
    { address: "Unknown market", criteria: box },
    { address: SAMPLE_DEAL_VALUES.address, criteria: { ...box, propertyTypes: ["multi-family" as const] } },
  ])("does not let favorable financial targets override missing or mismatched client scope", ({ address, criteria }) => {
    const snapshot = buildClientMatchSnapshot({ ...SAMPLE_DEAL_VALUES, address }, client, criteria)!;
    const report = buildCanonicalReportData({ values: snapshot.values, maxOfferTarget: { monthlyCashFlow: 200, capRate: 6 }, maxOfferTargetSource: "buy-box", trustedPresentation: { clientScreening: { screen: snapshot.screen, screenedAt: snapshot.screenedAt, methodologyVersion: snapshot.methodologyVersion } } });
    expect(report.performance.monthlyCashFlow).toBeGreaterThan(200);
    expect(report.decision?.clearsSelectedTargets).toBe(false);
    expect(report.decision?.label).not.toBe("Meets your targets at asking");
    expect(report.maxOffer).toBeNull();
    expect(reportDataSchema.safeParse(report).success).toBe(true);
  });
  it("renders the frozen client criteria and financing with canonical financial outputs", async () => {
    const snapshot = buildClientMatchSnapshot(SAMPLE_DEAL_VALUES, client, box)!;
    const report = buildCanonicalReportData({ values: snapshot.values, maxOfferTarget: { monthlyCashFlow: 200, capRate: 6 }, maxOfferTargetSource: "buy-box", trustedPresentation: { clientScreening: { screen: snapshot.screen, screenedAt: snapshot.screenedAt, methodologyVersion: snapshot.methodologyVersion } } });
    const parsed = reportDataSchema.parse(report);
    expect(parsed.clientScreening?.screen.clientName).toBe(client.name);
    const artifact = await generateInvestmentPDFArtifact(report, { companyName: "Fixture brokerage", contactName: "Fixture agent" }, "agent");
    expect(artifact.hasBuyBoxVerdict).toBe(true);
    const bytes = new Uint8Array(await artifact.blob.arrayBuffer());
    if (process.env.TRUECAP_QA_PDF_PATH) writeFileSync(process.env.TRUECAP_QA_PDF_PATH, bytes);
    const result = await extractText(bytes, { mergePages: true });
    expect(result.text).toContain("Fixture investor / client A");
    expect(result.text).toContain("Client assumption: cash purchase");
    expect(result.text).toContain("not financing approval");
    expect(result.text).toContain("Long-term rental criteria");
    expect(result.text).not.toMatch(/PRIVATE NOTE SHOULD|private@example/);
  }, 30_000);
});
