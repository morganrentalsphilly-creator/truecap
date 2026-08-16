import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildCityStrategyAnalyzerHref,
  CITY_STRATEGY_ANALYZER_STRATEGY,
} from "@/lib/city-strategy-analyzer-handoff";
import type { StrategyKey } from "@/lib/city-strategy-combos";

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

describe("calculator acquisition offer boundary", () => {
  it("renders one canonical free-core / Pro boundary instead of caller-supplied claims", () => {
    const source = read("components/marketing/tools-conversion-cta.tsx");

    expect(source).toContain(
      "export function ToolsConversionCta({ calculatorName }: ToolsConversionCtaProps)"
    );
    expect(source).not.toContain("{hook ??");
    expect(source).toContain("a free account to save up to 5 deals");
    expect(source).toContain("Pro adds 10-year projections");
    expect(source).toContain('href="/#main"');
  });

  it("does not label Pro-only outputs as free in calculator result links", () => {
    const files = execFileSync(
      "git",
      ["ls-files", "components/tools/*widget.tsx"],
      { cwd: ROOT, encoding: "utf8" }
    )
      .split("\n")
      .filter(Boolean);

    expect(files.length).toBeGreaterThan(10);
    for (const file of files) {
      const source = read(file);
      expect(source, file).not.toMatch(
        /(?:10[- ]year|10-yr|projections?|tax savings?|exit scenarios?|modeled exits?|compare them|comparisons?|export PDFs?|PDF export)[^.\n]{0,100}(?:—\s*)?free(?:\s+in TrueCap)?/i
      );
      expect(source, file).not.toMatch(
        /(?:full (?:property )?analysis|full deal|full house-hack underwrite)[^.\n]{0,140}\bfree\b/i
      );
    }
  });
});

describe("SEO landing pages preserve truthful acquisition intent", () => {
  it("maps every city-strategy slug to a supported analyzer strategy and #main", () => {
    const expected: Record<StrategyKey, string> = {
      brrrr: "brrrr",
      "house-hack": "house-hack",
      "cash-flow": "buy-hold",
      "section-8": "buy-hold",
      turnkey: "buy-hold",
      appreciation: "buy-hold",
    };

    expect(CITY_STRATEGY_ANALYZER_STRATEGY).toEqual(expected);
    for (const strategy of Object.keys(expected) as StrategyKey[]) {
      const url = new URL(
        buildCityStrategyAnalyzerHref(strategy),
        "https://usetruecap.com"
      );
      expect(url.pathname, strategy).toBe("/");
      expect(url.hash, strategy).toBe("#main");
      expect(url.searchParams.get("strategy"), strategy).toBe(expected[strategy]);
      expect(url.searchParams.get("utm_source"), strategy).toBe(
        `city-strategy-${strategy}`
      );
    }
  });

  it("separates the free core screen from advanced outputs on market and state CTAs", () => {
    for (const file of [
      "app/markets/[city]/page.tsx",
      "app/markets/[city]/[strategy]/page.tsx",
      "app/states/[slug]/page.tsx",
    ]) {
      const source = read(file);
      expect(source, file).toContain("free core screen");
      expect(source, file).toContain("Pro adds");
      if (file.includes("[strategy]")) {
        expect(source, file).toContain("buildCityStrategyAnalyzerHref");
      } else {
        expect(source, file).toContain("#main");
      }
    }
  });

  it("does not call area-level market defaults exact address facts", () => {
    const source = read("app/markets/[city]/page.tsx");
    expect(source).not.toMatch(/exact, auto-filled numbers/i);
    expect(source).not.toMatch(/Fair Market Rent for the exact address/i);
    expect(source).not.toMatch(/auto-fills the exact ZIP-level figure/i);
    expect(source).toContain("not a property-specific rent comp");
    expect(source).toContain("not parcel-level facts");
  });
});

describe("acquisition copy disclosures", () => {
  it("aligns the homepage instruction with its address-first control", () => {
    const source = read("components/marketing/marketing-hero.tsx");
    expect(source).toContain("Enter a rental address");
    expect(source).not.toContain("Paste a rental listing");
  });

  it("keeps save limits aligned on the buy-and-hold page", () => {
    const source = read("app/for-buy-and-hold/page.tsx");
    expect(source).toContain("Free saves up to 5 deals");
    expect(source).toContain("Pro adds unlimited saves");
    expect(source).not.toMatch(/Save 10 deals/i);
  });

  it("discloses the one-time Pack's operating constraints before checkout", () => {
    const source = read("app/pricing/page.tsx");
    expect(source).toContain("One generation for these exact inputs");
    expect(source).toContain("same browser tab within 30 days");
    expect(source).toContain("No account or cloud copy is created");
  });

  it("qualifies DSCR thresholds as lender-specific screening context", () => {
    const page = read("app/tools/dscr-calculator/page.tsx");
    const widget = read("components/tools/dscr-calculator-widget.tsx");
    expect(`${page}\n${widget}`).toContain("common screening benchmark");
    expect(`${page}\n${widget}`).toMatch(/programs? var(?:y|ies)/i);
    expect(widget).not.toContain('label: "Bankable"');
    expect(`${page}\n${widget}`).not.toMatch(/most conventional lenders want/i);
  });
});
