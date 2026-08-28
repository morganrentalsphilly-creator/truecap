import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("released public-tool surfaces", () => {
  it("keeps analyzer handoff CTAs to released rental capabilities", () => {
    const source = [
      "components/tools/one-percent-rule-widget.tsx",
      "components/tools/rental-cash-flow-calculator-widget.tsx",
      "components/tools/roi-calculator-widget.tsx",
      "components/tools/coc-calculator-widget.tsx",
      "components/tools/cap-rate-calculator-widget.tsx",
      "components/tools/dscr-calculator-widget.tsx",
      "components/tools/arv-calculator-widget.tsx",
      "components/tools/seventy-percent-rule-widget.tsx",
    ]
      .map(read)
      .join("\n");

    expect(source).not.toMatch(
      /(?:Run the full analysis|Screen the full deal)[^<]{0,220}\b(?:tax|exit|refi|BRRRR|flip)\b/i,
    );
    expect(source).not.toContain("rehab, refi");
  });

  it("does not expose a BRRRR refinance output in the released ARV tool", () => {
    const widget = read("components/tools/arv-calculator-widget.tsx");
    expect(widget).not.toContain("refiLoan75");
    expect(widget).not.toContain("75% LTV refi loan");
  });

  it("labels specialist strategy material as education, not released modeling", () => {
    for (const path of [
      "app/tools/arv-calculator/page.tsx",
      "app/tools/70-percent-rule-calculator/page.tsx",
      "app/tools/rehab-cost-estimator/page.tsx",
    ]) {
      const page = read(path);
      expect(page, path).toContain("Educational guide:");
      expect(page, path).toMatch(/does not\s+currently expose[\s\S]{0,100}(?:flip|BRRRR)/i);
    }

    const discovery = read("lib/calculator-registry.ts");
    expect(discovery).not.toMatch(/feeds BRRRR \+ flip/i);
    expect(discovery).not.toMatch(/screen for flips and BRRRR/i);
  });
});

describe("gated calculators expose no public discovery surface", () => {
  it("no unreleased calculator ships an opengraph-image route", async () => {
    // A tool whose page notFound()s still served /tools/<slug>/opengraph-image
    // as a real, crawlable, shareable branded card — a public surface implying
    // the tool exists. Route files are independent of the page's 404, so the
    // gate has to remove them too.
    const { existsSync } = await import("node:fs");
    const { UNRELEASED_UNDERWRITING_CALCULATORS } = await import(
      "@/lib/calculator-registry"
    );
    const leaked = UNRELEASED_UNDERWRITING_CALCULATORS.filter((slug) =>
      existsSync(join(process.cwd(), `app/tools/${slug}/opengraph-image.tsx`)),
    );
    expect(leaked, `gated tools still serving an OG card: ${leaked.join(", ")}`).toEqual(
      [],
    );
  });

  it("every unreleased calculator page fails closed", async () => {
    const { UNRELEASED_UNDERWRITING_CALCULATORS } = await import(
      "@/lib/calculator-registry"
    );
    for (const slug of UNRELEASED_UNDERWRITING_CALCULATORS) {
      const page = read(`app/tools/${slug}/page.tsx`);
      expect(
        /notFound\(\)|permanentRedirect\(/.test(page),
        `${slug} page must notFound() or redirect`,
      ).toBe(true);
    }
  });
});

describe("the 70%-rule heuristic never borrows the canonical Offer Ceiling name", () => {
  // ARV x multiplier - repairs is a rule of thumb. TrueCap's Offer Ceiling is
  // the highest modeled price satisfying explicitly adopted targets under the
  // full engine. Calling both "Offer Ceiling" told a flipper the rule of thumb
  // carried the authority of the underwriting model.
  const HEURISTIC_SURFACES = [
    "app/tools/arv-calculator/page.tsx",
    "app/tools/70-percent-rule-calculator/page.tsx",
    "app/tools/arv-calculator/opengraph-image.tsx",
    "app/tools/70-percent-rule-calculator/opengraph-image.tsx",
    "app/blog/70-percent-rule-house-flipping/page.tsx",
    "app/blog/how-to-calculate-arv/page.tsx",
  ];

  it("uses the price-screen name for the rule of thumb", () => {
    for (const path of HEURISTIC_SURFACES) {
      expect(read(path), `${path} should name the heuristic`).toMatch(
        /70%-[Rr]ule [Pp]rice [Ss]creen/,
      );
    }
  });

  it("only mentions Offer Ceiling to contrast it with the canonical solver", () => {
    for (const path of HEURISTIC_SURFACES) {
      for (const line of read(path).split("\n")) {
        if (!/Offer Ceiling/.test(line)) continue;
        // Permitted: naming TrueCap's target-backed solver as a DIFFERENT thing.
        expect(
          /target-dependent Offer Ceiling|TrueCap's Offer Ceiling|does not compute an Offer Ceiling/.test(
            line,
          ),
          `${path} uses "Offer Ceiling" for the heuristic: ${line.trim().slice(0, 120)}`,
        ).toBe(true);
      }
    }
  });

  it("never seeds the heuristic into the analyzer as a purchase price", () => {
    for (const widget of [
      "components/tools/arv-calculator-widget.tsx",
      "components/tools/seventy-percent-rule-widget.tsx",
    ]) {
      expect(read(widget)).toMatch(/buildAnalyzerHandoffUrl\(\s*\{\}\s*,/);
    }
  });
});
