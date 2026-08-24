import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const NON_ADVICE = "This is not a recommended offer";

function read(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

describe("rental Offer Ceiling surface copy", () => {
  it("prints exact criteria beside every numerical PDF Offer Ceiling", () => {
    const pdf = read("../pdf-generator.ts");
    expect(pdf).not.toContain('"canonical target"');
    expect(pdf).toContain("if (d.maxOffer !== undefined) {");
    expect(pdf).toContain('"OFFER CEILING",');
    expect(pdf).toContain(
      'd.maxOffer ? fmtCurrency(d.maxOffer.maxPrice) : "Not solvable"'
    );
    expect(pdf).toContain(
      '`${d.maxOffer.sourceLabel ?? "Captured targets"}: ${d.maxOffer.basis}`'
    );
    expect(pdf).toContain(
      '`Offer Ceiling — ${d.maxOffer.sourceLabel ?? "captured targets"}: ${d.maxOffer.basis}`'
    );
    expect(pdf).toContain('`Offer Ceiling ${fmtCurrency(d.maxOffer.maxPrice)}`');
    expect(pdf.match(/Highest modeled price that still meets/g)?.length)
      .toBeGreaterThanOrEqual(3);
    expect(pdf.match(/This is not a recommended offer\./g)?.length)
      .toBeGreaterThanOrEqual(3);
  });

  it("keeps saved-deal ceilings labeled, criterion-bound, and non-advisory", () => {
    const workspace = read("../../app/dashboard/saved-analyses/[id]/page.tsx");
    expect(workspace).toContain("Offer Ceiling");
    expect(workspace).toContain("Targets: {maoBasisLabel}");
    expect(workspace).toContain(NON_ADVICE);

    const list = read("../../components/investcalc/saved-analyses-page-v2.tsx");
    expect(list).toContain("Offer Ceiling:");
    expect(list).toContain("Criteria: {basisLabel}");
    expect(list).toContain(NON_ADVICE);
    expect(list).toContain("basisLabel={item.offerBasisLabel}");

    const server = read("../../app/dashboard/saved-analyses/page.tsx");
    expect(server).toContain("offerBasisLabel: offerResult?.basisLabel");
  });

  it("shows exact buy-box criteria with its solved ceiling", () => {
    const verdict = read("../../components/investcalc/buy-box-verdict-card.tsx");
    expect(verdict).toContain("Offer Ceiling: {money(yourNumber.maxPrice)}");
    expect(verdict).toContain("Criteria: {yourNumberCriteria}");
    expect(verdict).toContain("describeMaoTarget(target)");
    // describeMaoTarget includes maxPurchasePrice exactly once; a prior manual
    // append duplicated that criterion beside the ceiling.
    expect(verdict).not.toContain('criteria.push(`purchase price');
    expect(verdict).toContain(NON_ADVICE);
  });

  it("labels shortlist thresholds as Offer Ceilings with adjacent criteria", () => {
    const shortlist = read("../../components/investcalc/batch-triage-client.tsx");
    expect(shortlist).toContain("Offer Ceiling");
    expect(shortlist).toContain("row.targetLabel");
    expect(shortlist).toContain("not a recommended offer");
  });

  it("grounds Deal Q&A in a criterion-bound ceiling, not an offer recommendation", () => {
    const context = read("../deal-qa-context.ts");
    expect(context).toContain("OFFER CEILING (a target-dependent modeled boundary)");
    expect(context).toContain("Offer Ceiling: ${money(m.maxOffer)}");
    expect(context).toContain("${m.basis}");
    expect(context).toContain(NON_ADVICE);
  });
});
