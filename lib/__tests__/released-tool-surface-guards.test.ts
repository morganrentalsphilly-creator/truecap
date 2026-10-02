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
  // Two more tool URLs redirect without being on the unreleased list: the
  // BRRRR calculator (its page redirects while the brrrr_strategy_model flag
  // is off) and the tax calculator (its page only redirects). Their card
  // routes returned 200 on production on 2026-10-02 with a card saying the
  // tool is "not currently released". A card for the BRRRR calculator comes
  // back in the same reviewed change that releases the tool, not before.
  const REDIRECTING_TOOL_SLUGS = [
    "brrrr-calculator",
    "rental-property-tax-calculator",
  ] as const;

  it("no unreleased or redirecting calculator ships an opengraph-image route", async () => {
    // A tool whose page redirects still serves an independently routable
    // /tools/<slug>/opengraph-image when that file exists.
    // as a real, crawlable, shareable branded card — a public surface implying
    // the tool exists. Route files are independent of the page's 404, so the
    // gate has to remove them too.
    const { existsSync } = await import("node:fs");
    const { UNRELEASED_UNDERWRITING_CALCULATORS } =
      await import("@/lib/calculator-registry");
    const { HISTORICAL_TOOL_REDIRECTS } =
      await import("@/lib/historical-tool-redirects");
    // The two slugs above are real redirects, not a typo that guards nothing.
    for (const slug of REDIRECTING_TOOL_SLUGS) {
      expect(HISTORICAL_TOOL_REDIRECTS, slug).toHaveProperty(slug);
    }
    const leaked = [
      ...UNRELEASED_UNDERWRITING_CALCULATORS,
      ...REDIRECTING_TOOL_SLUGS,
    ].filter((slug) =>
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

describe("tool social cards say only what the tool does", () => {
  // The shared template's default chips are "Live data · No signup · 60
  // seconds". Until 2026-10 every tool card inherited them, so calculators
  // that take typed numbers, and a spreadsheet download, advertised live
  // data. The same audit found a rehab card claiming "Mid-market 2024-25
  // contractor pricing" over defaults the code calls illustrative, and
  // break-even and vacancy cards promising benchmarks neither tool has.
  const toolCards = readdirSync(join(process.cwd(), "app/tools"), {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `app/tools/${entry.name}/opengraph-image.tsx`)
    .filter((file) => existsSync(join(process.cwd(), file)));

  it("finds the tool cards", () => {
    expect(toolCards.length).toBeGreaterThanOrEqual(10);
  });

  it("every tool card passes its own chips and none claims live data", () => {
    for (const file of [...toolCards, "app/tools/opengraph-image.tsx"]) {
      const card = read(file).replace(/\/\*[\s\S]*?\*\//g, "");
      expect(card, `${file} inherits the template's default chips`).toMatch(
        /pills:\s*\[/,
      );
      expect(card, file).not.toMatch(/Live data|60 seconds/i);
    }
  });

  it("no tool card claims contractor pricing or benchmarks the tool does not have", () => {
    for (const file of toolCards) {
      expect(read(file), file).not.toMatch(
        /contractor pricing|20\d\d-\d\d|benchmarks? by (?:strategy|market)/i,
      );
    }
  });

  it("the rehab card calls the defaults editable only if the page's estimator takes overrides", () => {
    // lib/rehab-estimator.ts accepts per-item `overrides`, but the estimator
    // the tool page mounts passes none: it has three number fields (square
    // feet, baths, contingency) and a checkbox per work item, and each item's
    // amount is fixed text. A card saying "Editable ... Replace each line
    // with your own bid" promised a control the page does not have.
    const page = read("app/tools/rehab-cost-estimator/page.tsx");
    expect(page).toContain("<RehabEstimatorCard />");
    // Code only: the estimator's header comment mentions overrides it does
    // not implement, and the card's own comment explains this rule.
    const code = (path: string) =>
      read(path)
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|[^:])\/\/.*$/gm, "$1");
    const takesOverrides = /\boverrides\b/.test(
      code("components/investcalc/rehab-estimator-card.tsx"),
    );
    if (takesOverrides) return;
    expect(code("app/tools/rehab-cost-estimator/opengraph-image.tsx")).not.toMatch(
      /\bedit(?:able|s)?\b|\boverrid|\breplace (?:each|every|any) line\b|your own (?:bid|number|amount)/i,
    );
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
    "app/blog/70-percent-rule-house-flipping/opengraph-image.tsx",
    "app/blog/how-to-calculate-arv/opengraph-image.tsx",
  ];

  it("uses the price-screen name for the rule of thumb", () => {
    for (const path of HEURISTIC_SURFACES) {
      expect(read(path), `${path} should name the heuristic`).toMatch(
        /70%-[Rr]ule [Pp]rice [Ss]creen/,
      );
    }
  });

  // The GRM and 1% rule posts turn their ratio into a rule-of-thumb price too
  // (target GRM x annual rent; 100 x monthly rent). Same rule: that price is a
  // price screen, never an Offer Ceiling.
  const RULE_OF_THUMB_POSTS = [
    "app/blog/gross-rent-multiplier-explained/page.tsx",
    "app/blog/1-percent-rule-rental-property/page.tsx",
  ];

  // The 70% rule post's social card. Its post stopped calling the rule of
  // thumb an Offer Ceiling; the card still printed "How to calculate a
  // 70%-rule Offer Ceiling" (2026-10 audit). This list feeds the Offer
  // Ceiling check below; a file may also sit in HEURISTIC_SURFACES, which
  // holds it to the price-screen name as well.
  const RULE_OF_THUMB_CARDS = [
    "app/blog/70-percent-rule-house-flipping/opengraph-image.tsx",
  ];

  it("only mentions Offer Ceiling to contrast it with the canonical solver", () => {
    for (const path of [
      ...HEURISTIC_SURFACES,
      ...RULE_OF_THUMB_POSTS,
      ...RULE_OF_THUMB_CARDS,
    ]) {
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
    expect(
      offenders,
      "a sentence names the analyzer and then the 70% rule before a full stop; say what the 70% rule calculator does in its own sentence, and what the analyzer does in another",
    ).toEqual([]);
  });
});
