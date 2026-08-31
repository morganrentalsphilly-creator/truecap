import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    "utf8",
  );
}

describe("public trust copy guards", () => {
  it("does not turn planning ratios into loan eligibility or refinance promises", () => {
    const source = [
      "../../app/tools/house-hacking-calculator/page.tsx",
      "../../app/blog/house-hack-underwriting-guide/page.tsx",
      "../../app/blog/house-hacking-explained/page.tsx",
      "../../app/blog/how-truecap-verdict-engine-works/page.tsx",
      "../../app/tools/arv-calculator/page.tsx",
      "../../app/tools/70-percent-rule-calculator/page.tsx",
      "../../app/blog/70-percent-rule-house-flipping/page.tsx",
      "../../app/tools/brrrr-calculator/page.tsx",
      "../../app/tools/mortgage-payment-calculator/page.tsx",
      "../glossary.ts",
      "../city-strategy-combos.ts",
    ]
      .map(read)
      .join("\n");

    expect(source).not.toMatch(/would qualify for normal investor financing/i);
    expect(source).not.toMatch(
      /cash-out refinance[^.]{0,120}typically maxes out at 75%/i,
    );
    expect(source).not.toMatch(
      /most cash-out refi lenders[^.]{0,100}(?:75%|6 months)/i,
    );
    expect(source).not.toMatch(/refinance can return most or all/i);
    expect(source).not.toMatch(/after 12 months you can move out/i);
    expect(source).not.toMatch(/below the .* most lenders require/i);
    expect(source).toMatch(/establish(?:es)? loan eligibility or approval/i);
    expect(source).toContain(
      "There is no universal investment-property cash-out LTV",
    );
  });

  it("keeps tax and legal education conditional", () => {
    const source = [
      "../../app/tools/rental-property-tax-calculator/page.tsx",
      "../../app/blog/depreciation-recapture-rental-property/page.tsx",
      "../../app/blog/seller-financing-subject-to/page.tsx",
      "../../app/blog/rental-property-llc/page.tsx",
      "../glossary.ts",
    ]
      .map(read)
      .join("\n");

    expect(source).not.toMatch(/all deductible in the year paid/i);
    expect(source).not.toMatch(
      /almost certainly owes[^.]{0,80}net investment income tax/i,
    );
    expect(source).not.toMatch(/yes, buying a property ['\u2018]subject to/i);
    expect(source).not.toMatch(/mostly not for investors/i);
    expect(source).not.toMatch(
      /keeps the claim contained to the assets inside/i,
    );
    expect(source).not.toMatch(
      /most rental properties show a Schedule E tax loss/i,
    );
    expect(source).not.toMatch(/real estate professional status .* bypasses/i);
    expect(source).toContain(
      "does not guarantee that a claim stays inside the entity",
    );
    expect(source).toMatch(
      /A rate\s+gap alone does not establish savings or\s+cash flow/i,
    );
  });

  it("does not present rent heuristics or modeled returns as achieved outcomes", () => {
    const source = [
      "../../app/blog/vacancy-rate-rental-property/page.tsx",
      "../../app/blog/50-percent-rule-rentals/page.tsx",
      "../../app/tools/cash-on-cash-calculator/page.tsx",
      "../../app/tools/noi-calculator/page.tsx",
      "../../app/blog/how-to-calculate-noi-rental-property/page.tsx",
      "../../app/blog/cash-flow-vs-appreciation/page.tsx",
      "../glossary.ts",
      "../../emails/content/2026-10-13.json",
    ]
      .map(read)
      .join("\n");

    expect(source).not.toMatch(/guaranteed-empty|guaranteed turn/i);
    expect(source).not.toMatch(/money would work harder elsewhere/i);
    expect(source).not.toMatch(/almost always wins/i);
    expect(source).not.toMatch(/cash-flow row is bulletproof/i);
    expect(source).not.toMatch(/FMR is a useful[^.]{0,80}floor/i);
    expect(source).not.toMatch(
      /beat market-rate re-leases[^.]{0,80}almost every/i,
    );
    expect(source).toContain("FMR is an area benchmark");
    expect(source).toContain("There is no universal good cash-on-cash return");
  });
});
