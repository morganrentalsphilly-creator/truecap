import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");

const pageSourcesUnder = (path: string) =>
  readdirSync(join(process.cwd(), path), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => source(join(path, entry.name, "page.tsx")))
    .join("\n");

describe("specialist model release wiring", () => {
  it("gates analyzer discovery and output surfaces", () => {
    expect(source("components/investcalc/strategy-chips.tsx")).toContain(
      "isSpecialistStrategyEnabled(strategy.key)",
    );
    const dashboard = source("components/investcalc/analysis-dashboard.tsx");
    expect(dashboard).toContain("RELEASED_TABS");
    expect(dashboard).toContain(
      "isSpecialistStrategyEnabled(activeStrategy.key)",
    );
    const panel = source("components/investcalc/strategies-panel.tsx");
    expect(panel).toContain('isFeatureEnabled("brrrr_strategy_model")');
    expect(panel).toContain('isFeatureEnabled("fix_flip_strategy_model")');
  });

  it("gates shared, report and public-share calculations", () => {
    expect(
      source("components/investcalc/read-only-analysis-view.tsx"),
    ).toContain("specialistStrategyEnabled");
    expect(source("lib/report-data-builder.ts")).toContain(
      "if (!isSpecialistStrategyEnabled(strategyKey)) return null",
    );
    expect(source("lib/pdf-generator.ts")).toContain(
      "isSpecialistStrategyEnabled(d.specialistAnalysis.strategy)",
    );
    const publicShare = source("lib/public-share.ts");
    expect(
      publicShare.match(/isSpecialistStrategyEnabled\(analyzerStrategyKey\)/g),
    ).toHaveLength(2);
  });

  it("rejects direct tax and exit snapshot actions while unreleased", () => {
    expect(source("app/actions/tax-strategy.ts")).toContain(
      'if (!isFeatureReleased("tax_strategy"))',
    );
    expect(source("app/actions/exit-scenarios.ts")).toContain(
      'if (!isFeatureReleased("exit_scenarios"))',
    );
  });

  it("keeps released PDFs pre-tax and gates every tax/exit presentation", () => {
    const pdf = source("lib/pdf-generator.ts");
    const projection = pdf.slice(
      pdf.indexOf("function pageProjection("),
      pdf.indexOf("function pageDownside("),
    );
    expect(projection).toContain("Projected pre-tax operating cash flow");
    expect(projection).not.toMatch(/after-tax|Tax Effect|\.after\b/i);
    expect(pdf).toContain('if (isFeatureReleased("tax_strategy"))');
    expect(pdf).toContain(
      'if (mode === "personal" && isFeatureReleased("tax_strategy"))',
    );
    expect(pdf).toContain(
      'if (mode !== "lender" && isFeatureReleased("exit_scenarios"))',
    );
  });

  it("removes the dark BRRRR calculator from route and discovery surfaces", () => {
    const brrrrPage = source("app/tools/brrrr-calculator/page.tsx");
    expect(brrrrPage).toContain(
      'if (!isFeatureEnabled("brrrr_strategy_model"))',
    );
    expect(brrrrPage).toContain(
      'permanentRedirect(HISTORICAL_TOOL_REDIRECTS["brrrr-calculator"])',
    );
    expect(source("lib/calculator-registry.ts")).toContain(
      'isFeatureEnabled("brrrr_strategy_model")',
    );
    expect(source("app/search/page.tsx")).toContain(
      'getCalculator("brrrr-calculator")',
    );
  });

  it("keeps specialist persona routes honest and removes dark handoffs", () => {
    for (const path of [
      "app/for-brrrr/page.tsx",
      "app/for-flippers/page.tsx",
    ]) {
      const page = source(path);
      expect(page).toContain(
        "Steady-state rental analysis — use after renovation is complete.",
      );
      expect(page).toMatch(
        /integrated .+ (?:isn't offered right now|aren't offered right now)/,
      );
      expect(page).not.toMatch(/strategy=(?:brrrr|fix-flip)/);
      expect(page).not.toContain("/tools/brrrr-calculator");
    }
  });

  it("retires specialist comparison claims and removes them from discovery", () => {
    expect(source("app/vs/dealcheck-for-brrrr/page.tsx")).toContain(
      'permanentRedirect("/blog/brrrr-method-explained")',
    );
    expect(source("app/vs/dealcheck-for-fix-and-flip/page.tsx")).toContain(
      'permanentRedirect("/blog/70-percent-rule-house-flipping")',
    );

    const discovery = [
      source("app/vs/page.tsx"),
      source("app/sitemap.ts"),
    ].join("\n");
    expect(discovery).not.toContain("dealcheck-for-brrrr");
    expect(discovery).not.toContain("dealcheck-for-fix-and-flip");
  });

  it("does not sell disabled advanced modules on competitor pages", () => {
    const competitorPages = pageSourcesUnder("app/vs");
    expect(competitorPages).not.toMatch(
      /Illustrative Tax Impact|modeled exit comparisons|strategy analyzers|dedicated BRRRR analyzer|dedicated fix-and-flip analyzer/i,
    );
  });

  it("keeps public conversion copy on released capabilities", () => {
    const conversionCopy = [
      "app/tools/page.tsx",
      "app/profile/page.tsx",
      "app/manifest.ts",
      "app/llms.txt/route.ts",
      "app/actions/post-analysis-email-capture.ts",
      "app/for-buy-and-hold/page.tsx",
      "components/marketing/marketing-nav.tsx",
      "components/marketing/onboarding-tour.tsx",
      "components/marketing/pricing-value-stack.tsx",
      "components/marketing/tools-conversion-cta.tsx",
    ]
      .map(source)
      .join("\n");

    expect(conversionCopy).not.toMatch(
      /Illustrative Tax Impact|modeled exit comparisons|strategy analyzers|BRRRR analyzer|fix-and-flip analyzer/i,
    );
  });

  it("has no public direct link to the disabled BRRRR calculator", () => {
    const knownPublicConsumers = [
      "app/for-brrrr/page.tsx",
      "app/for-flippers/page.tsx",
      "app/glossary/page.tsx",
      "app/markets/cleveland/page.tsx",
      "app/markets/philadelphia/page.tsx",
      "app/blog/brrrr-method-explained/page.tsx",
      "app/blog/best-rental-property-calculator-for-brrrr/page.tsx",
      "app/blog/how-to-calculate-arv/page.tsx",
      "app/blog/70-percent-rule-house-flipping/page.tsx",
      "app/tools/rehab-cost-estimator/page.tsx",
      "app/tools/arv-calculator/page.tsx",
      "app/tools/70-percent-rule-calculator/page.tsx",
      "app/vs/dealcheck/page.tsx",
      "app/vs/biggerpockets-calculator/page.tsx",
      "app/vs/bricked/page.tsx",
      "lib/glossary.ts",
    ]
      .map(source)
      .join("\n");
    expect(knownPublicConsumers).not.toContain("/tools/brrrr-calculator");
  });
});
