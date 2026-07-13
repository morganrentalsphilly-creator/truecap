/**
 * Blog topic hubs (P2-4) — group the long-form posts into eight investor
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
      "rental-property-insurance",
      "1-percent-rule-rental-property",
      "break-even-occupancy-rental-property",
      "operating-expense-ratio-rental-property",
      "return-on-equity-rental-property",
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
      "mortgage-points-investment-property",
      "dscr-loans-explained",
      "how-to-refinance-a-rental-property",
      "closing-costs-investment-property",
      "cash-out-refinance-vs-heloc-rental",
      "seller-financing-subject-to",
      "hard-money-vs-dscr-loan",
      "debt-to-income-ratio-investment-property",
      "negative-leverage-real-estate",
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
      "rental-property-llc",
      "bonus-depreciation-rental-property-2026",
      "property-tax-reassessment-rental-property",
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
      "house-hack-underwriting-guide",
      "short-term-rental-underwriting-playbook",
      "70-percent-rule-house-flipping",
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
  {
    slug: "deal-analysis",
    title: "Deal Analysis How-Tos",
    description:
      "Step-by-step guides to the core rental calculations — cap rate, cash-on-cash, DSCR, ARV, and exit cap rate — with worked examples.",
    intro:
      "Every verdict starts with a calculation done right. These guides walk each core metric step by step — inputs, formula, worked example, and the mistakes that skew the answer — and the calculators run the same math instantly.",
    postSlugs: [
      "how-to-calculate-cap-rate",
      "how-to-calculate-cash-on-cash-return",
      "how-to-calculate-dscr",
      "how-to-calculate-arv",
      "exit-cap-rate-rental-property",
      "how-truecap-verdict-engine-works",
    ],
    calculatorSlugs: [
      "cap-rate-calculator",
      "cash-on-cash-calculator",
      "dscr-calculator",
      "roi-calculator",
    ],
  },
  {
    slug: "due-diligence",
    title: "Due Diligence & Buying",
    description:
      "Verifying a deal before you close — rent rolls, appraisals, market-rent estimates, and buying with tenants in place.",
    intro:
      "The listing tells you a story; due diligence tells you the truth. These guides cover the checks that happen between offer and closing — reading the rent roll, surviving the appraisal, pinning down market rent, and inheriting tenants — so the numbers you underwrote are the numbers you get.",
    postSlugs: [
      "how-to-read-a-rent-roll",
      "investment-property-appraisal",
      "how-to-estimate-rent-rental-property",
      "buying-rental-property-with-tenants",
    ],
    calculatorSlugs: [
      "gross-rent-multiplier-calculator",
      "1-percent-rule-calculator",
      "noi-calculator",
    ],
  },
  {
    slug: "comparisons",
    title: "Tool Comparisons",
    description:
      "Honest side-by-side comparisons of rental analysis calculators, deal-discovery platforms, and landlord software.",
    intro:
      "Picking software shouldn't take longer than picking the deal. These side-by-side comparisons cover rental calculators, deal-discovery platforms, and landlord ops tools — what each does well, where each falls short, and which investor each one actually fits.",
    postSlugs: [
      "best-rental-property-calculator-2026",
      "best-free-rental-property-calculator-2026",
      "best-rental-property-calculator-for-brrrr",
      "best-rental-analysis-tool-for-house-hackers",
      "best-short-term-rental-analysis-tool-2026",
      "dealcheck-vs-biggerpockets-vs-truecap",
      "dealcheck-vs-stessa-vs-truecap",
      "roofstock-vs-mashvisor-vs-propstream",
      "stessa-vs-avail-vs-baselane",
      "hostfully-vs-hostaway-vs-guesty",
    ],
    calculatorSlugs: [
      "cap-rate-calculator",
      "cash-on-cash-calculator",
      "brrrr-calculator",
    ],
  },
];

export function getBlogTopic(slug: string): BlogTopic | null {
  return BLOG_TOPICS.find((t) => t.slug === slug) ?? null;
}
