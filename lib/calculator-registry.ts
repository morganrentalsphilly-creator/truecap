/**
 * CALCULATOR_REGISTRY — the single source of truth for TrueCap's free
 * calculators. Drives the /tools index, /embed hub, footer links, sitemap,
 * OG images, cross-link cards, and every "N calculators" count.
 *
 * Why this exists: counts drifted everywhere they were hand-typed — /tools said
 * "Fourteen", /embed said "14" in one place and "13 available" in another (the
 * embed hub only renders the embeddable ones), the OG image said "9", and
 * the footer hardcoded 5. The mismatch is structural: there are more calculator
 * PAGES than EMBEDDABLE widgets (rehab-cost-estimator has a page, no
 * embed). This registry encodes that distinction once.
 *
 * Relationship to lib/embed-registry.ts: that module owns the lazy-loaded
 * widget components for the embeddable subset. The `embeddable` slugs here MUST
 * match EMBED_REGISTRY's keys (a test asserts this). Metadata (title, category,
 * counts) lives here; widget loaders live there.
 */

import { isFeatureEnabled } from "@/lib/feature-flags";

export type CalculatorCategory = "screen" | "finance" | "expenses" | "returns" | "offer";

export const CATEGORY_LABEL: Record<CalculatorCategory, string> = {
  screen: "Screen a deal",
  finance: "Finance & loan",
  expenses: "Income & expenses",
  returns: "Returns",
  offer: "Offer & strategy",
};

export type CalculatorEntry = {
  /** Matches the /tools/<slug> route AND (when embeddable) the embed slug. */
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  category: CalculatorCategory;
  /** True when a standalone iframe widget exists in lib/embed-registry.ts. */
  embeddable: boolean;
  /** Featured in the compact footer "Free calculators" column. */
  footerFeatured?: boolean;
};

const ALL_CALCULATORS: CalculatorEntry[] = [
  // Screen
  { slug: "1-percent-rule-calculator", title: "1% Rule Calculator", shortTitle: "1% Rule", description: "Pass/fail rental screening filter in 5 seconds.", category: "screen", embeddable: true, footerFeatured: true },
  { slug: "2-percent-rule-calculator", title: "2% Rule Calculator", shortTitle: "2% Rule", description: "The strict cash-flow screen — rent-to-price against the 2% and 1% bars.", category: "screen", embeddable: true },
  { slug: "gross-rent-multiplier-calculator", title: "Gross Rent Multiplier (GRM) Calculator", shortTitle: "GRM", description: "The 10-second screening ratio for triaging rental deals.", category: "screen", embeddable: true },
  { slug: "break-even-calculator", title: "Break-Even Calculator", shortTitle: "Break-Even", description: "Months until rental cash flow returns your initial investment.", category: "screen", embeddable: true },
  { slug: "50-percent-rule-calculator", title: "50% Rule Calculator", shortTitle: "50% Rule", description: "3-second expense triage — estimated expenses, NOI, and cash flow from gross rent.", category: "screen", embeddable: true },
  // Finance
  { slug: "dscr-calculator", title: "DSCR Calculator", shortTitle: "DSCR", description: "Debt Service Coverage Ratio — the metric every investment-property lender uses.", category: "finance", embeddable: true, footerFeatured: true },
  { slug: "mortgage-payment-calculator", title: "Mortgage Payment Calculator", shortTitle: "Mortgage Payment", description: "PITI breakdown — principal, interest, taxes, insurance — for investment loans.", category: "finance", embeddable: true },
  { slug: "closing-cost-calculator", title: "Closing Cost Calculator", shortTitle: "Closing Cost", description: "Line-item closing costs on a rental purchase.", category: "finance", embeddable: true },
  // Income & expenses
  { slug: "noi-calculator", title: "NOI Calculator", shortTitle: "NOI", description: "Net Operating Income with every common operating-expense category.", category: "expenses", embeddable: true },
  { slug: "vacancy-rate-calculator", title: "Vacancy Rate Calculator", shortTitle: "Vacancy", description: "Effective vacancy rate from vacant days + turnover cost.", category: "expenses", embeddable: true },
  // Returns
  { slug: "rental-cash-flow-calculator", title: "Rental Property Cash Flow Calculator", shortTitle: "Cash Flow", description: "Monthly cash flow after every operating expense and the mortgage — with the NOI / debt-service split.", category: "returns", embeddable: true, footerFeatured: true },
  { slug: "cap-rate-calculator", title: "Cap Rate Calculator", shortTitle: "Cap Rate", description: "Capitalization rate from price, rent, and operating expenses.", category: "returns", embeddable: true, footerFeatured: true },
  { slug: "cash-on-cash-calculator", title: "Cash-on-Cash Return Calculator", shortTitle: "Cash-on-Cash", description: "Return on the actual cash invested in a rental.", category: "returns", embeddable: true, footerFeatured: true },
  { slug: "roi-calculator", title: "Rental Property ROI Calculator", shortTitle: "ROI", description: "Total return — cash flow + principal paydown + appreciation in one number.", category: "returns", embeddable: true },
  // Offer & strategy
  { slug: "brrrr-calculator", title: "BRRRR Calculator", shortTitle: "BRRRR", description: "Buy, Rehab, Rent, Refinance — model the full strategy in one view.", category: "offer", embeddable: true, footerFeatured: true },
  { slug: "arv-calculator", title: "ARV Calculator (After-Repair Value + 70% Rule)", shortTitle: "ARV", description: "Estimate after-repair value from entered renovated comps and calculate an early 70%-rule price screen.", category: "offer", embeddable: true },
  { slug: "house-hacking-calculator", title: "House Hacking Calculator", shortTitle: "House Hack", description: "Live in one unit, rent the rest — your effective housing cost after tenant rent.", category: "offer", embeddable: true },
  { slug: "70-percent-rule-calculator", title: "70% Rule Calculator", shortTitle: "70% Rule", description: "70%-rule price screen = entered ARV × selected multiplier minus entered repairs — a starting screen.", category: "offer", embeddable: true },
  { slug: "rehab-cost-estimator", title: "Rehab Cost Estimator", shortTitle: "Rehab", description: "Line-item renovation budget by scope of work for early screening; replace estimates with contractor bids before committing.", category: "offer", embeddable: false },
];

/**
 * These legacy widgets each carry their own local version of rental
 * underwriting. They are intentionally not controlled by an environment
 * toggle: switching one back on before it delegates to the canonical engine
 * would reintroduce model drift. Keep the authored pages/widgets as migration
 * material, but require a reviewed code change (and parity tests) to release
 * any slug from this list.
 */
export const UNRELEASED_UNDERWRITING_CALCULATORS = [
  "50-percent-rule-calculator",
  "cap-rate-calculator",
  "cash-on-cash-calculator",
  "dscr-calculator",
  "house-hacking-calculator",
  "noi-calculator",
  "rental-cash-flow-calculator",
  "roi-calculator",
] as const;

const unreleasedUnderwritingCalculatorSet = new Set<string>(
  UNRELEASED_UNDERWRITING_CALCULATORS,
);

export function isCalculatorReleased(slug: string): boolean {
  if (unreleasedUnderwritingCalculatorSet.has(slug)) return false;
  if (slug === "brrrr-calculator") {
    return isFeatureEnabled("brrrr_strategy_model");
  }
  return ALL_CALCULATORS.some((calculator) => calculator.slug === slug);
}

/** Public discovery registry. Unreleased calculators stay absent from every
 * registry-driven tools, embed, footer, search and sitemap surface. */
export const CALCULATOR_REGISTRY: CalculatorEntry[] = ALL_CALCULATORS.filter(
  (calculator) => isCalculatorReleased(calculator.slug),
);

/** Total released calculator pages under /tools. */
export const CALCULATOR_COUNT = CALCULATOR_REGISTRY.length;

/** Spelled-out count for marketing/meta prose ("Fourteen…") — drift-proof.
 *  Falls back to the numeral outside the mapped range. */
const COUNT_WORDS: Record<number, string> = {
  10: "Ten", 11: "Eleven", 12: "Twelve", 13: "Thirteen", 14: "Fourteen",
  15: "Fifteen", 16: "Sixteen", 17: "Seventeen", 18: "Eighteen", 19: "Nineteen", 20: "Twenty",
};
export const CALCULATOR_COUNT_WORD = COUNT_WORDS[CALCULATOR_COUNT] ?? String(CALCULATOR_COUNT);

/** Comma-joined short names for marketing/meta copy — generated so the
 *  list can never disagree with the registry's actual membership. */
export const CALCULATOR_NAMES_LIST = CALCULATOR_REGISTRY.map((c) => c.shortTitle).join(", ");

/** Released calculators with an embeddable iframe widget. */
export const EMBEDDABLE_CALCULATORS = CALCULATOR_REGISTRY.filter((c) => c.embeddable);
export const EMBEDDABLE_COUNT = EMBEDDABLE_CALCULATORS.length;

/** Footer "Free calculators" shortlist. */
export const FOOTER_CALCULATORS = CALCULATOR_REGISTRY.filter((c) => c.footerFeatured);

export function getCalculator(slug: string): CalculatorEntry | null {
  return CALCULATOR_REGISTRY.find((c) => c.slug === slug) ?? null;
}

/** Registry grouped by category, in CATEGORY_LABEL order. */
export function calculatorsByCategory(): { category: CalculatorCategory; label: string; items: CalculatorEntry[] }[] {
  const order: CalculatorCategory[] = ["screen", "finance", "expenses", "returns", "offer"];
  return order.map((category) => ({
    category,
    label: CATEGORY_LABEL[category],
    items: CALCULATOR_REGISTRY.filter((c) => c.category === category),
  }));
}
