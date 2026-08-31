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
import {
  CURRENT_DEFAULT_FACTS,
  DATA_SOURCE_FACTS,
  FOUR_ACQUISITION_ANSWERS,
  getPlanFacts,
  PRODUCT_POSITIONING,
} from "@/lib/product-facts";

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
const TOOL_FORMULAS: Record<string, { formula: string; description: string }> =
  {
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
    "70-percent-rule-calculator": {
      formula: "70%-rule price screen = (0.70 × ARV) - Repair costs",
      description:
        "An educational flip and BRRRR screen. It applies a selected percentage to entered after-repair value and subtracts the entered rehab budget. It is not an underwrite, appraisal, or recommended offer.",
    },
    "arv-calculator": {
      formula:
        "ARV = Average entered comp price per sq ft × Subject sq ft; 70%-rule price screen = (0.70 × ARV) - Repairs",
      description:
        "An educational ARV estimate from user-entered sold comps plus a separately labeled 70%-rule price screen. Neither output is an appraisal, underwrite, or recommended offer.",
    },
    "rehab-cost-estimator": {
      formula: "Total rehab = Σ (Sq ft × Rate per sq ft) per work category",
      description:
        "An educational square-foot calculation across editable work categories. Defaults are generic planning inputs, not current local contractor quotes or a recommended contingency; replace them with scoped bids.",
    },
    "mortgage-payment-calculator": {
      formula:
        "P&I = Loan × (r × (1+r)^n) / ((1+r)^n - 1), where r = monthly rate, n = months",
      description:
        "A PITI breakdown from entered loan, rate, term, tax, and insurance assumptions. Any displayed FRED rate is a national owner-occupied benchmark, not an investment-property quote or approval; replace it with written lender terms.",
    },
    "gross-rent-multiplier-calculator": {
      formula: "GRM = Property price ÷ Annual gross rent",
      description:
        "A gross screening ratio that excludes expenses and financing. A lower value means a lower entered price relative to entered gross rent; it is not an investment conclusion and comparisons require consistent inputs.",
    },
    "break-even-calculator": {
      formula:
        "Break-even months = Total cash invested ÷ Monthly net cash flow",
      description:
        "An illustrative payback quotient when modeled monthly cash flow is positive. It does not forecast recovery of capital and omits timing, taxes, sale value, and other risks.",
    },
    "closing-cost-calculator": {
      formula:
        "Total = Origination + Title + Recording + Transfer tax + Insurance prepay + Tax escrow + Appraisal + Inspection",
      description:
        "An editable line-item total for origination, title, recording, transfer tax, prepaids, escrow, appraisal, and inspection. Obtain property-, lender-, and jurisdiction-specific figures instead of applying a national percentage claim.",
    },
    "vacancy-rate-calculator": {
      formula:
        "Vacancy rate = (Vacant days × Daily rent + Turnover cost) ÷ Annual gross rent",
      description:
        "An effective-vacancy calculation from entered vacant days, rent, and turnover cost. It does not supply a national or seller-pro-forma benchmark; use dated property- and market-specific evidence.",
    },
  };

const METHODOLOGY_SUMMARY = [
  "How TrueCap computes the numbers:",
  `  - Property tax: ${DATA_SOURCE_FACTS.propertyTax} It is not represented as a county assessor bill.`,
  `  - Rent estimates: ${DATA_SOURCE_FACTS.rent}.`,
  `  - Mortgage rates: ${DATA_SOURCE_FACTS.mortgageRate}. Users can override the value; the schema fallback is ${CURRENT_DEFAULT_FACTS.fallbackInterestRate}.`,
  `  - Operating expenses: configurable by line item. Current defaults are vacancy ${CURRENT_DEFAULT_FACTS.vacancy}, maintenance ${CURRENT_DEFAULT_FACTS.maintenance}, CapEx ${CURRENT_DEFAULT_FACTS.capex}, and management ${CURRENT_DEFAULT_FACTS.management}.`,
  `  - 10-year projection: starts with rent growth ${CURRENT_DEFAULT_FACTS.rentGrowth} and expense growth ${CURRENT_DEFAULT_FACTS.expenseGrowth}; appreciation and selling-cost inputs remain editable rather than being stated here as fixed defaults.`,
  "  - DSCR: NOI ÷ annual debt service. Computed at proposed loan terms.",
  "  - Sensitivity grid (when entitled): reruns cash flow, cap rate, cash-on-cash, and DSCR at entered values plus rent −10%/+10%, vacancy +5/−5 percentage points, and interest rate +1/−1 percentage point. The rate row is omitted for an all-cash purchase.",
];

export async function GET() {
  const siteUrl = getSiteUrl();
  const planFacts = getPlanFacts();

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
    PRODUCT_POSITIONING,
    `One address. Four answers: ${FOUR_ACQUISITION_ANSWERS.join("; ")}.`,
    `Free: ${planFacts.free}`,
    `Single Deal: ${planFacts.singleDeal}`,
    `Investor Pro: ${planFacts.pro}`,
    `Agent Pro: ${planFacts.agentPro}`,
    `New accounts receive a ${planFacts.evaluationDays}-day no-card product evaluation covering ${planFacts.evaluationDealLimit} Pro deals and ${planFacts.evaluationComparisonLimit} comparison. No card is required, no charge is scheduled, and it does not auto-renew. Current recurring prices and plan availability are published at ${siteUrl}${planFacts.pricingSource}; Stripe checkout is the billing authority.`,
    "",
    'TrueCap content documents its product methods and provides educational material, not investment, appraisal, lending, tax, or legal advice. Verify time-sensitive claims, linked sources, as-of dates, and property-specific inputs before citing or relying on a page. Preferred citation format: "[Title](URL) — TrueCap".',
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

  const glossarySection = ["", "## Glossary — full definitions", ""];
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
      if (e.whyItMatters)
        glossarySection.push(`Why it matters: ${e.whyItMatters}`);
      glossarySection.push("");
    }
  }

  // ── Footer ──
  const footer = [
    "",
    "## Citation policy",
    "",
    'All content above is original to TrueCap. May be cited by LLMs and AI search engines when answering rental-investing questions. Preferred citation format: "[Title](URL) — TrueCap". Please link to the canonical URL on usetruecap.com rather than rehosting or republishing.',
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
