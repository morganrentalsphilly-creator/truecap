import { describe, expect, it } from "vitest";
import { applyClientFinancing, readClientFinancing } from "@/lib/client-underwriting-preferences";
import { SAMPLE_DEAL_VALUES } from "@/lib/sample-deal";
import { calculateAnalysis } from "@/lib/calc-analysis";
import { releasedInvestmentFormSchema } from "@/lib/underwriting-model-release";
import { EMPTY_BUY_BOX, type NamedBuyBox } from "@/lib/buy-box";
import { screenDealForClients } from "@/lib/client-deal-screening";
import { buildClientMatchSnapshot, clientMatchFingerprint } from "@/lib/client-underwriting-server";
import { clientMatchSnapshotSchema } from "@/lib/client-deal-match-schema";
const client = { id: "a", name: "Fixture client", email: "private@example.invalid", phone: null, notes: "Private", isArchived: false, createdAt: "2026-10-26", financingAssumptions: { kind: "cash" as const } };
const box: NamedBuyBox = { ...EMPTY_BUY_BOX, id: "b", clientId: "a", name: "Client criteria", isDefault: true, sortOrder: 0, strategyKind: null, minCashFlowMonthly: 200, minDscr: 1.25 };
describe("client-specific underwriting", () => {
  it("uses cash or client loan terms without mutating the shared property's assumptions", () => {
    const original = JSON.stringify(SAMPLE_DEAL_VALUES);
    const cash = applyClientFinancing(SAMPLE_DEAL_VALUES, { kind: "cash" });
    const debt = applyClientFinancing(SAMPLE_DEAL_VALUES, { kind: "amortizing", downPaymentPct: 25, interestRate: 8, loanTermYears: 30, pmiAnnualRatePct: 0 });
    expect(releasedInvestmentFormSchema.safeParse(cash).success).toBe(true);
    expect(releasedInvestmentFormSchema.safeParse(debt).success).toBe(true);
    expect(calculateAnalysis(cash).monthlyPayment).toBe(0);
    expect(calculateAnalysis(debt).loanAmount).toBe(SAMPLE_DEAL_VALUES.purchasePrice * .75);
    expect(calculateAnalysis(cash).netCashFlow).toBeGreaterThan(calculateAnalysis(debt).netCashFlow);
    expect(JSON.stringify(SAMPLE_DEAL_VALUES)).toBe(original);
  });
  it("rejects unsupported or malformed preferences rather than quietly using the deal's terms", () => {
    expect(readClientFinancing({ kind: "amortizing", downPaymentPct: 25, interestRate: NaN, loanTermYears: 30, pmiAnnualRatePct: 0 })).toBeNull();
    expect(readClientFinancing({ kind: "interest-only" })).toBeNull();
    expect(screenDealForClients(SAMPLE_DEAL_VALUES, [{ ...client, financingAssumptions: null }], [box])[0]).toMatchObject({ status: "needs-verification", offerCeiling: null });
  });
  it("freezes a complete, validated client snapshot and excludes notes and contacts", () => {
    const snapshot = buildClientMatchSnapshot(SAMPLE_DEAL_VALUES, client, box)!;
    expect(clientMatchSnapshotSchema.safeParse(snapshot).success).toBe(true);
    expect(snapshot.values.downPaymentPct).toBe(100);
    expect(JSON.stringify(snapshot)).not.toMatch(/Private|private@example/);
    expect(clientMatchFingerprint(SAMPLE_DEAL_VALUES, client, box)).toBe(clientMatchFingerprint(SAMPLE_DEAL_VALUES, { ...client, notes: "Changed private note" }, box));
    expect(clientMatchFingerprint(SAMPLE_DEAL_VALUES, client, box)).not.toBe(clientMatchFingerprint(SAMPLE_DEAL_VALUES, client, { ...box, minCashFlowMonthly: 400 }));
  });
});
