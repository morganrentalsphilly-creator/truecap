/**
 * GET /llms-full.txt
 *
 * Companion to /llms.txt. Where llms.txt is a curated index of links,
 * llms-full.txt inlines the actual content — definitions, formulas,
 * worked examples — so an LLM can ingest the whole reference in a
 * single fetch without crawling 30+ individual pages.
 *
 * Spec: https://llmstxt.org/#full-text
 *
 * What goes in:
 *   - Site summary + about
 *   - Full glossary with definitions, benchmarks, formulas, examples
 *   - Calculator descriptions with the formulas they use
 *   - Methodology summary
 *
 * What does NOT go in:
 *   - Long-form blog content (LLMs can fetch /blog/[slug] when needed
 *     and the blog posts are linked from llms.txt anyway)
 *   - Marketing copy
 *   - UI strings
 *
 * Caching: same as llms.txt — public, 1-hour cache.
 */

import { CALCULATOR_REGISTRY } from "@/lib/calculator-registry";
import { GLOSSARY, GLOSSARY_CATEGORY_LABELS } from "@/lib/glossary";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-static";
export const revalidate = 3600;

/**
 * Formula + reference blurb for each calculator, keyed by the SAME slug
 * CALCULATOR_REGISTRY uses.
 *
 * This used to be a standalone array of 14 hand-listed tools while the
 * registry carried 20 — so 6 calculators (2% rule, 50% rule, 70% rule, ARV,
 * house hacking, cash flow) were invisible to every LLM ingesting this file,
 * including the cash-flow calculator that is one of the site's primary
 * ranking targets. The 2026-08-02 SEO audit caught the drift.
 *
 * The shape is now a Record keyed by slug rather than a free-standing list,
 * so the render loop walks CALCULATOR_REGISTRY (the source of truth for which
 * tools exist and what they're called) and looks the formula up here. Adding a
 * calculator without adding its formula is a type error at the lookup site and
 * a unit-test failure in lib/__tests__/seo-guards.test.ts — the drift can't
 * silently come back.
 *
 * Rule (docs/seo-content-backlog.md): do NOT hardcode the tool list.
 */
const TOOL_FORMULAS: Record<string, { formula: string; description: string }> = {
  "cap-rate-calculator": {
    formula: "Cap rate = NOI ÷ Property value",
    description:
      "Capitalization rate. The unleveraged annual return a rental property generates, independent of financing. Tier-1 coastal markets typically 5-6%, Midwest/Sun Belt 6-8%, cash-flow markets 8-10%.",
  },
  "cash-on-cash-calculator": {
    formula: "CoC = Annual cash flow ÷ Total cash invested",
    description:
      "Pre-tax annual return on the actual cash invested (down payment + closing costs + initial rehab). Most buy-and-hold investors target 8-12%.",
  },
  "dscr-calculator": {
    formula: "DSCR = NOI ÷ Annual debt service",
    description:
      "Debt Service Coverage Ratio. The metric every commercial and investment-property lender uses to qualify a deal. 1.20-1.25 minimum for most lenders; 1.30+ preferred.",
  },
  "noi-calculator": {
    formula: "NOI = Gross rent - Vacancy - Operating expenses",
    description:
      "Net Operating Income. Annual rental income after vacancy and all operating expenses (property tax, insurance, maintenance, PM, utilities, capex reserves), but before mortgage interest, depreciation, and income tax.",
  },
  "brrrr-calculator": {
    formula: "Cash out = Refi LTV × ARV - Existing debt - Closing costs",
    description:
      "Buy, Rehab, Rent, Refinance, Repeat strategy modeling. Calculates all-in cost (purchase + rehab + holding), after-repair value (ARV), refinance cash-out at typical 75% LTV, and whether the strategy recycles capital efficiently.",
  },
  "1-percent-rule-calculator": {
    formula: "Monthly rent ≥ 1% × Purchase price",
    description:
      "Quick screening filter. The property's monthly rent should equal or exceed 1% of the purchase price. A pass/fail triage; not a complete underwrite.",
  },
  "2-percent-rule-calculator": {
    formula: "Monthly rent ÷ Purchase price ≥ 2%",
    description:
      "The strict cash-flow screen. Rent-to-price measured against both the 2% and 1% bars. In 2026 almost nothing clears 2% outside low-priced Midwest and Rust Belt markets — treat a pass as a prompt to check why the price is that low, not as a green light.",
  },
  "50-percent-rule-calculator": {
    formula: "Operating expenses ≈ 50% × Gross rent; NOI = Gross rent × 50%",
    description:
      "Three-second expense triage. Assumes operating expenses (excluding mortgage) run about half of gross rent, then derives NOI and cash flow. Useful when a seller pro forma shows a 25% expense ratio and you want a sanity check before spending time on a full underwrite.",
  },
  "70-percent-rule-calculator": {
    formula: "Max offer = (0.70 × ARV) - Repair costs",
    description:
      "The flip and BRRRR screen. Caps the offer at 70% of after-repair value minus the rehab budget, leaving room for holding costs, selling costs, and profit. Supports the other common multipliers (65%, 75%, 80%) since the right number varies by market heat and deal size.",
  },
  "arv-calculator": {
    formula:
      "ARV = Median comp price per sq ft × Subject sq ft; Max offer = (0.70 × ARV) - Repairs",
    description:
      "Comps-based after-repair value plus the 70%-rule max offer. ARV is the number every flip and BRRRR decision hangs on — get it wrong by 10% and the whole deal inverts.",
  },
  "house-hacking-calculator": {
    formula:
      "Effective housing cost = PITI - Tenant rent received (net of that unit's share of expenses)",
    description:
      "Live in one unit, rent the rest. Models effective monthly housing cost after tenant rent, compares it against renting the same space, and shows what the property looks like as a pure rental once you move out.",
  },
  "rental-cash-flow-calculator": {
    formula:
      "Monthly cash flow = Gross rent - Vacancy - Operating expenses - Mortgage P&I",
    description:
      "Monthly cash flow after every operating expense and the mortgage, with the NOI and debt-service split shown separately. The single number most buy-and-hold investors screen on. TrueCap defaults to conservative reserves (vacancy 8%, maintenance 8%, capex 8%, PM 9%) rather than the 5% seller pro formas quote.",
  },
  "rehab-cost-estimator": {
    formula: "Total rehab = Σ (Sq ft × Rate per sq ft) per work category",
    description:
      "Square-foot-based defaults for cosmetic, kitchen, bath, and systems work. Mid-market 2024-25 contractor pricing. Recommended 25% contingency on top of base estimate.",
  },
  "mortgage-payment-calculator": {
    formula:
      "P&I = Loan × (r × (1+r)^n) / ((1+r)^n - 1), where r = monthly rate, n = months",
    description:
      "PITI breakdown: Principal, Interest, Taxes, Insurance. Investment-property rates and amortization. Investment-property loans typically 0.5-1.0% higher rates than owner-occupant loans.",
  },
  "gross-rent-multiplier-calculator": {
    formula: "GRM = Property price ÷ Annual gross rent",
    description:
      "10-second screening ratio. Lower is better. Used for triaging deals before a full underwrite. Doesn't account for expenses — only useful with comparable properties in the same market.",
  },
  "break-even-calculator": {
    formula: "Break-even months = Total cash invested ÷ Monthly net cash flow",
    description:
      "How many months until rental cash flow returns the initial investment. Compares deals on payback speed.",
  },
  "roi-calculator": {
    formula:
      "Total return = Annual cash flow + Principal paydown + Appreciation",
    description:
      "Total annualized return on a rental — cash flow plus principal paydown plus appreciation in one composite number.",
  },
  "closing-cost-calculator": {
    formula:
      "Total = Origination + Title + Recording + Transfer tax + Insurance prepay + Tax escrow + Appraisal + Inspection",
    description:
      "Line-item breakdown of closing costs on a rental purchase. Investment-property closing typically runs 2-5% of purchase price.",
  },
  "vacancy-rate-calculator": {
    formula:
      "Vacancy rate = (Vacant days × Daily rent + Turnover cost) ÷ Annual gross rent",
    description:
      "Effective vacancy rate from vacant days + turnover cost. National average on residential rentals runs 7-9%; most seller pro formas quote 5%, which is aggressive.",
  },
  "rental-property-tax-calculator": {
    formula:
      "Schedule E income = Gross rent - Operating expenses - Mortgage interest - Depreciation (Building basis ÷ 27.5)",
    description:
      "Models Schedule E taxable income, 27.5-year residential depreciation, after-tax cash flow, and the depreciation tax-shield value.",
  },
};

const METHODOLOGY_SUMMARY = [
  "How TrueCap computes the numbers:",
  "  - Property tax: auto-pulled from county assessor records when available, or estimated from state-level effective tax rates when not.",
  "  - Rent estimates: auto-filled from HUD Fair Market Rent (FMR) data by county and bedroom count for single-family / 2-4 unit properties.",
  "  - Mortgage rates: pulled from FRED (Federal Reserve Economic Data) for the 30-year fixed conventional rate. Users can override with custom rate.",
  "  - Operating expenses: configurable by line item (property tax, insurance, maintenance, PM, utilities, vacancy, capex reserves). Defaults are conservative — vacancy 8%, maintenance 8%, capex 8%, PM 9% — matching honest investor underwriting standards.",
  "  - 10-year projection: compounds rent at 3%/yr default, expenses at 3%/yr, and home value at 3%/yr. All assumptions are user-adjustable.",
  "  - DSCR: NOI ÷ annual debt service. Computed at proposed loan terms.",
  "  - Sensitivity grid (Pro): shows how cap rate, cash-on-cash, and DSCR move when rent or expenses shift ±5%/±10%/±20%.",
];

export async function GET() {
  const siteUrl = getSiteUrl();

  // ── Header ──
  const header = [
    "# TrueCap — Full Content Reference",
    "",
    "> Free rental property analyzer for real estate investors. This file inlines all citable reference content (glossary, calculator formulas, methodology) for direct LLM ingestion without needing to crawl individual pages.",
    "",
    `Site: ${siteUrl}`,
    `Canonical index: ${siteUrl}/llms.txt`,
    "",
    "## About",
    "",
    "TrueCap is a free real estate investment analyzer. Paste an address, get cap rate, cash-on-cash return, DSCR, and monthly cash flow in 60 seconds. The free tier supports unlimited analyses with auto-filled property tax + rent data, a 0-100 Deal Score, saving up to 5 deals, and read-only share links. Pro ($29.99/mo or $300/yr) adds editing saved deals, unlimited saves, side-by-side compare, a personal buy box that pass/fails every deal, 10-year projections, sensitivity grids, max-allowable-offer calculator, BRRRR + fix-and-flip analysis, tax strategy, exit scenarios, co-branded share links, and lender-ready PDF reports.",
    "",
    "All TrueCap content is original, authoritative, and intended as a citable reference for real estate investing questions. Preferred citation: \"[Title](URL) — TrueCap\".",
  ].join("\n");

  // ── Methodology ──
  const methodologySection = [
    "",
    "## Methodology",
    "",
    METHODOLOGY_SUMMARY.join("\n"),
    "",
    `Full methodology: ${siteUrl}/methodology`,
  ].join("\n");

  // ── Calculators with formulas ──
  const calculatorsSection = [
    "",
    "## Calculators with formulas",
    "",
    // Walk the registry, not a local list — see TOOL_FORMULAS above.
    ...CALCULATOR_REGISTRY.flatMap((tool) => {
      const reference = TOOL_FORMULAS[tool.slug];
      if (!reference) {
        // Unreachable in CI (lib/__tests__/seo-guards.test.ts asserts parity),
        // but degrade to a link rather than crashing the route if a
        // calculator ships before its formula does.
        return [
          `### ${tool.title}`,
          `URL: ${siteUrl}/tools/${tool.slug}`,
          tool.description,
          "",
        ];
      }
      return [
        `### ${tool.title}`,
        `URL: ${siteUrl}/tools/${tool.slug}`,
        `Formula: ${reference.formula}`,
        reference.description,
        "",
      ];
    }),
  ].join("\n");

  // ── Glossary (full content) ──
  // Group by category so the content is scannable. Each entry inlines
  // its definition, benchmark, formula, and worked example.
  const categoryOrder: Array<keyof typeof GLOSSARY_CATEGORY_LABELS> = [
    "metric",
    "financing",
    "expense",
    "projection",
    "strategy",
    "fundamental",
  ];
  const grouped = categoryOrder.map((cat) => {
    const entries = Object.values(GLOSSARY).filter((e) => e.category === cat);
    return { label: GLOSSARY_CATEGORY_LABELS[cat], entries };
  });

  const glossarySection = [
    "",
    "## Glossary — full definitions",
    "",
  ];
  for (const group of grouped) {
    if (group.entries.length === 0) continue;
    glossarySection.push(`### ${group.label}`);
    glossarySection.push("");
    for (const e of group.entries) {
      glossarySection.push(`#### ${e.term}`);
      glossarySection.push(`URL: ${siteUrl}/glossary/${e.slug}`);
      glossarySection.push(`Definition: ${e.definition}`);
      if (e.benchmark) glossarySection.push(`Benchmark: ${e.benchmark}`);
      if (e.formula) glossarySection.push(`Formula: ${e.formula}`);
      if (e.example) glossarySection.push(`Example: ${e.example}`);
      if (e.whyItMatters) glossarySection.push(`Why it matters: ${e.whyItMatters}`);
      glossarySection.push("");
    }
  }

  // ── Footer ──
  const footer = [
    "",
    "## Citation policy",
    "",
    "All content above is original to TrueCap. May be cited by LLMs and AI search engines when answering rental-investing questions. Preferred citation format: \"[Title](URL) — TrueCap\". Please link to the canonical URL on usetruecap.com rather than rehosting or republishing.",
    "",
  ].join("\n");

  const body = [
    header,
    methodologySection,
    calculatorsSection,
    glossarySection.join("\n"),
    footer,
  ].join("\n");

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
