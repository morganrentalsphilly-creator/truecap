/**
 * Blog topic hubs (P2-4) — group the long-form posts into five investor
 * journeys and pair each with the matching free calculators. Each hub is an
 * SEO surface in its own right ("rental underwriting guide", "rental property
 * financing", …) and an internal-linking spine that funnels readers from a
 * post to the relevant tool to the full analyzer.
 *
 * Data only (no React) so it's safe to import in pages, the sitemap, and a
 * test. Post slugs are looked up in BLOG_POSTS at render time (a stale slug
 * simply doesn't render — no crash); calculator slugs resolve against
 * lib/calculator-registry.ts. A unit test guards the calculator slugs.
 */

export type BlogTopic = {
  /** /blog/topics/<slug> */
  slug: string;
  title: string;
  /** Meta description + hero subtitle. */
  description: string;
  /** Hero paragraph. */
  intro: string;
  /** Curated post slugs (resolved against BLOG_POSTS). */
  postSlugs: string[];
  /** Calculator slugs from lib/calculator-registry.ts. */
  calculatorSlugs: string[];
};

export const BLOG_TOPICS: BlogTopic[] = [
  {
    slug: "underwriting",
    title: "Rental Underwriting",
    description:
      "How to underwrite a rental property — cap rate, cash-on-cash, DSCR, NOI, and the pro forma that ties them together.",
    intro:
      "Underwriting is the heart of every deal: turn a listing into cap rate, cash-on-cash, DSCR, and monthly cash flow, then decide. These guides walk the metrics and the pro forma; the calculators run the math.",
    postSlugs: [
      "how-to-underwrite-a-rental-property-in-60-seconds",
      "what-is-a-good-cap-rate",
      "cap-rate-vs-cash-on-cash-vs-dscr",
      "cash-on-cash-vs-irr",
      "how-to-calculate-noi-rental-property",
      "gross-rent-multiplier-explained",
      "rental-property-pro-forma-explained",
      "spot-bad-rental-in-60-seconds",
      "50-percent-rule-rentals",
      "vacancy-rate-rental-property",
      "capex-maintenance-reserves-rental-property",
    ],
    calculatorSlugs: [
      "cap-rate-calculator",
      "cash-on-cash-calculator",
      "noi-calculator",
      "dscr-calculator",
      "gross-rent-multiplier-calculator",
      "1-percent-rule-calculator",
    ],
  },
  {
    slug: "financing",
    title: "Rental Property Financing",
    description:
      "Financing a rental — down payment, PITI, DSCR loans, closing costs, and refinancing — with the math worked out.",
    intro:
      "Financing decides whether a good property is a good deal. Down payment, rate, PITI, DSCR-loan qualification, and the refi exit all move your returns. These guides cover the choices; the calculators size the payment and the cash to close.",
    postSlugs: [
      "piti-explained-rental-property",
      "how-much-down-payment-investment-property",
      "dscr-loans-explained",
      "how-to-refinance-a-rental-property",
      "closing-costs-investment-property",
    ],
    calculatorSlugs: [
      "mortgage-payment-calculator",
      "dscr-calculator",
      "closing-cost-calculator",
    ],
  },
  {
    slug: "tax",
    title: "Rental Property Tax",
    description:
      "Rental property taxes — depreciation, Schedule E, the 1031 exchange, and the deductions that shelter your cash flow.",
    intro:
      "Tax treatment is where buy-and-hold quietly wins. Depreciation, Schedule E, deductions, and the 1031 exchange can turn positive cash flow into a paper loss. These guides explain the mechanics — then verify your specifics with a CPA.",
    postSlugs: [
      "rental-property-tax-deductions",
      "depreciation-recapture-rental-property",
      "schedule-e-rental-property",
      "1031-exchange-basics",
    ],
    calculatorSlugs: ["rental-property-tax-calculator"],
  },
  {
    slug: "strategy",
    title: "Investing Strategies",
    description:
      "Rental strategies — BRRRR, house hacking, Section 8, rehab, off-market sourcing, and single- vs multi-family.",
    intro:
      "Same property, different strategy, different outcome. BRRRR recycles your capital; a house hack gets you in for less; Section 8 trades a process for stability. These guides compare the plays; the analyzer scores any of them.",
    postSlugs: [
      "brrrr-method-explained",
      "house-hacking-explained",
      "section-8-rental-property-investing",
      "single-family-vs-multi-family-rental",
      "how-to-estimate-rehab-costs",
      "how-to-find-off-market-rental-properties",
      "property-management-yes-or-no",
    ],
    calculatorSlugs: ["brrrr-calculator", "rehab-cost-estimator", "roi-calculator"],
  },
  {
    slug: "markets",
    title: "Markets & Where to Buy",
    description:
      "Choosing a rental market — cash-flow vs appreciation, the best states for investors, and city-level snapshots.",
    intro:
      "Where you buy sets the ceiling on what any strategy can do. Cash-flow metros and appreciation metros reward different plays. These guides cover market selection; our market and state pages add sourced local snapshots.",
    postSlugs: ["best-states-for-rental-investors-2026", "cash-flow-vs-appreciation"],
    calculatorSlugs: ["cap-rate-calculator", "cash-on-cash-calculator"],
  },
];

export function getBlogTopic(slug: string): BlogTopic | null {
  return BLOG_TOPICS.find((t) => t.slug === slug) ?? null;
}
