import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

describe("persisted Tune-target propagation across saved-deal surfaces", () => {
  it("normalizes and passes the saved target on My Deals behind the paid MAO gate", () => {
    const source = read("../../app/dashboard/saved-analyses/page.tsx");

    const gate = source.indexOf("if (!canShowMao) return null;");
    const solve = source.indexOf("computeDealOfferLine(values, activeBuyBoxes", gate);
    expect(source).toContain("const canShowMao = isPremium");
    expect(source).not.toContain('isPremium && hasPlanFeature(entitlements, "mao")');
    expect(gate).toBeGreaterThan(-1);
    expect(solve).toBeGreaterThan(gate);
    expect(source).toContain("normalizeMaoTarget(row.result_snapshot?.maxOfferTarget)");
    expect(source).toContain("persistedMaoTarget,");
    expect(source).toContain("buyBoxesResolved");
    expect(source).toContain("if (!persistedMaoTarget && !buyBoxesResolved) return null;");
  });

  it("keeps dashboard MAO solving inside the paid gate and exposes exact criteria", () => {
    const page = read("../../app/dashboard/page.tsx");
    const table = read("../../components/dashboard/your-deals-table.tsx");

    const gate = page.indexOf("if (canShowMao) {");
    const solve = page.indexOf("computeDealOfferLine(values, activeBuyBoxes", gate);
    expect(page).toContain("const canShowMao = isPremium");
    expect(page).not.toContain('isPremium && hasPlanFeature(entitlements, "mao")');
    expect(gate).toBeGreaterThan(-1);
    expect(solve).toBeGreaterThan(gate);
    expect(page).toMatch(
      /normalizeMaoTarget\(\s*row\.result_snapshot\?\.maxOfferTarget\s*\)/
    );
    expect(page).toContain("maxOfferBasisLabel: basisLabelById.get(deal.id) ?? null");
    expect(table).toContain("Criteria: {deal.maxOfferBasisLabel}");
  });

  it("gates Compare MAO and recomputes it from the persisted target", () => {
    const source = read("../../app/dashboard/compare/page.tsx");
    const client = read("../../components/investcalc/compare-deals-client.tsx");

    const gate = source.indexOf("canShowMao &&");
    const solve = source.indexOf("computeDealOfferLine(values, activeBuyBoxes", gate);
    expect(source).toContain("const canShowMao = isPremium");
    expect(source).not.toContain('isPremium && hasPlanFeature(entitlements, "mao")');
    expect(gate).toBeGreaterThan(-1);
    expect(solve).toBeGreaterThan(gate);
    expect(source).toMatch(
      /normalizeMaoTarget\(\s*row\.result_snapshot\?\.maxOfferTarget\s*\)/
    );
    expect(source).toContain("maxOfferBasisLabel = maxOffer != null && basisLabel ? basisLabel : null");
    expect(client).toContain("Criteria: {deal.maxOfferBasisLabel}");
    expect(source).toContain("mapDeal(row, activeCompareBuyBoxes, canShowMao, compareBuyBoxesResolved)");
    expect(source).not.toContain("Max Offer is not persisted anywhere");
  });
});
