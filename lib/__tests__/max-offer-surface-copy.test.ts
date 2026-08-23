import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const CLARIFICATION =
  "Calculated from your selected targets. This is not a recommended offer.";

function read(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

describe("rental price-ceiling surface copy", () => {
  it("prints exact criteria beside every numerical PDF price ceiling", () => {
    const pdf = read("../pdf-generator.ts");
    expect(pdf).not.toContain('"canonical target"');
    expect(pdf).toContain("if (d.maxOffer !== undefined) {");
    expect(pdf).toContain('"PRICE CEILING",');
    expect(pdf).toContain(
      'd.maxOffer ? fmtCurrency(d.maxOffer.maxPrice) : "Not solvable"'
    );
    expect(pdf).toContain(
      '`${d.maxOffer.sourceLabel ?? "Captured targets"}: ${d.maxOffer.basis}`'
    );
    expect(pdf).toContain(
      '`Price ceiling — ${d.maxOffer.sourceLabel ?? "captured targets"}: ${d.maxOffer.basis}`'
    );
    expect(pdf).toContain('`Price ceiling ${fmtCurrency(d.maxOffer.maxPrice)}`');
    expect(pdf.match(new RegExp(CLARIFICATION.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"))?.length)
      .toBeGreaterThanOrEqual(1);
    expect(pdf.match(/This is not a recommended offer\./g)?.length)
      .toBeGreaterThanOrEqual(3);
  });

  it("keeps saved-deal ceilings labeled, criterion-bound, and non-advisory", () => {
    const workspace = read("../../app/dashboard/saved-analyses/[id]/page.tsx");
    expect(workspace).toContain("Price ceiling");
    expect(workspace).toContain("Targets: {maoBasisLabel}");
    expect(workspace).toContain(CLARIFICATION);

    const list = read("../../components/investcalc/saved-analyses-page-v2.tsx");
    expect(list).toContain("Price ceiling:");
    expect(list).toContain("Criteria: {basisLabel}");
    expect(list).toContain(CLARIFICATION);
    expect(list).toContain("basisLabel={item.offerBasisLabel}");

    const server = read("../../app/dashboard/saved-analyses/page.tsx");
    expect(server).toContain("offerBasisLabel: offerResult?.basisLabel");
  });

  it("shows exact buy-box criteria with its solved ceiling", () => {
    const verdict = read("../../components/investcalc/buy-box-verdict-card.tsx");
    expect(verdict).toContain("Price ceiling: {money(yourNumber.maxPrice)}");
    expect(verdict).toContain("Criteria: {yourNumberCriteria}");
    expect(verdict).toContain("describeMaoTarget(target)");
    // describeMaoTarget includes maxPurchasePrice exactly once; a prior manual
    // append duplicated that criterion beside the ceiling.
    expect(verdict).not.toContain('criteria.push(`purchase price');
    expect(verdict).toContain(CLARIFICATION);
  });

  it("labels shortlist thresholds as price ceilings with adjacent criteria", () => {
    const shortlist = read("../../components/investcalc/batch-triage-client.tsx");
    expect(shortlist).toContain("Price ceiling");
    expect(shortlist).toContain("row.targetLabel");
    expect(shortlist).toContain(CLARIFICATION);
  });

  it("grounds Deal Q&A in a criterion-bound ceiling, not an offer recommendation", () => {
    const context = read("../deal-qa-context.ts");
    expect(context).toContain("the user's price ceiling for this deal");
    expect(context).toContain("Price ceiling: ${money(m.maxOffer)}");
    expect(context).toContain("${m.basis}");
    expect(context).toContain(CLARIFICATION);
  });
});
