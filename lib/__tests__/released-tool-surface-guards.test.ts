import { existsSync, readFileSync, readdirSync } from "node:fs";
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

    // The CTA's label, and the caption line set right under the link when a
    // widget splits what the analysis adds out of the button (the 1% rule
    // widget: "Run the full analysis with these numbers", then "cap rate,
    // CoC, DSCR, and cash flow — free in TrueCap"). Either half naming an
    // unreleased capability fails.
    expect(source).not.toMatch(
      /(?:Run the full analysis|Screen the full deal)[^<]{0,220}(?:<\/[A-Za-z.]+>\s*<p\b[^>]*>[^<]{0,220})?\b(?:tax|exit|refi|BRRRR|flip)\b/i,
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
      expect(page, path).toMatch(
        /does not\s+currently expose[\s\S]{0,100}(?:flip|BRRRR)/i,
      );
    }

    const discovery = read("lib/calculator-registry.ts");
    expect(discovery).not.toMatch(/feeds BRRRR \+ flip/i);
    expect(discovery).not.toMatch(/screen for flips and BRRRR/i);
  });
});

describe("gated calculators expose no public discovery surface", () => {
  it("no unreleased calculator ships an opengraph-image route", async () => {
    // A tool whose page redirects still serves an independently routable
    // /tools/<slug>/opengraph-image when that file exists.
    // as a real, crawlable, shareable branded card — a public surface implying
    // the tool exists. Route files are independent of the page's 404, so the
    // gate has to remove them too.
    const { existsSync } = await import("node:fs");
    const { UNRELEASED_UNDERWRITING_CALCULATORS } =
      await import("@/lib/calculator-registry");
    const leaked = UNRELEASED_UNDERWRITING_CALCULATORS.filter((slug) =>
      existsSync(join(process.cwd(), `app/tools/${slug}/opengraph-image.tsx`)),
    );
    expect(
      leaked,
      `gated tools still serving an OG card: ${leaked.join(", ")}`,
    ).toEqual([]);
  });

  it("every unreleased calculator page fails closed", async () => {
    const { UNRELEASED_UNDERWRITING_CALCULATORS } =
      await import("@/lib/calculator-registry");
    for (const slug of UNRELEASED_UNDERWRITING_CALCULATORS) {
      const page = read(`app/tools/${slug}/page.tsx`);
      expect(
        /notFound\(\)|permanentRedirect\(/.test(page),
        `${slug} page must fail closed or redirect`,
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
        // Permitted: naming TrueCap's own solver as a DIFFERENT thing.
        expect(
          /TrueCap(?:'s|&apos;s) Offer Ceiling|does not compute an Offer Ceiling/.test(
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

  it("no blog post says the analyzer runs the 70% rule", () => {
    // The 70% Rule Calculator (/tools/70-percent-rule-calculator) runs the
    // price screen. The analyzer has no 70%-rule screen and no flip model, so
    // a post may name the rule next to the standalone tools, never as
    // something the analyzer does. Tags and JSX spacers are stripped first, so
    // a sentence that wraps around a <Link> is still read as one sentence; the
    // match stops at a full stop or a closing quote, so two neighbouring
    // strings in a list are not read as one.
    const offenders: string[] = [];
    for (const entry of readdirSync(join(process.cwd(), "app/blog"), {
      withFileTypes: true,
    })) {
      if (!entry.isDirectory()) continue;
      const file = `app/blog/${entry.name}/page.tsx`;
      if (!existsSync(join(process.cwd(), file))) continue;
      const prose = read(file)
        .replace(/<[^>]+>/g, " ")
        .replace(/\{" "\}/g, " ")
        .replace(/&apos;/g, "'")
        .replace(/\s+/g, " ");
      const hit = /\banalyzer\b[^."]{0,160}\b70%[- ]rule\b/i.exec(prose);
      if (hit) offenders.push(`${file}: ${hit[0]}`);
    }
    expect(offenders).toEqual([]);
  });
});
