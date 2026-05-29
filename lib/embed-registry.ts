/**
 * Registry of calculators available for iframe embed.
 *
 * Maps an embed slug to:
 *   - title (used in the iframe header + /embed hub)
 *   - description (used in the hub)
 *   - widget loader (so we lazy-load only the one needed per embed)
 *
 * Single source of truth: adding a new calculator to /tools/* and
 * registering it here is all that's needed to make it embeddable.
 *
 * No Supabase / auth / cookies in any of these widgets — they're pure
 * client components that compute math from local state. Safe to embed
 * on any third-party site.
 */

import type { ComponentType } from "react";
import dynamic from "next/dynamic";

/** Minimal stub used as the loading placeholder for all embeds. */
function EmbedLoading() {
  return null;
}

export type EmbedSlug =
  | "cap-rate-calculator"
  | "cash-on-cash-calculator"
  | "dscr-calculator"
  | "noi-calculator"
  | "mortgage-payment-calculator"
  | "gross-rent-multiplier-calculator"
  | "1-percent-rule-calculator"
  | "brrrr-calculator"
  | "break-even-calculator"
  | "roi-calculator"
  | "closing-cost-calculator"
  | "vacancy-rate-calculator"
  | "rental-property-tax-calculator";

export type EmbedEntry = {
  slug: EmbedSlug;
  title: string;
  shortTitle: string;
  description: string;
  /** The full /tools page URL for the "open in TrueCap" attribution link. */
  toolUrl: string;
  /** Lazily-loaded widget component. */
  Widget: ComponentType<unknown>;
  /** Estimated default iframe height. Embedded page also sends real
   *  height via postMessage so this is just a reasonable initial value
   *  before postMessage arrives. */
  defaultHeight: number;
};

export const EMBED_REGISTRY: Record<EmbedSlug, EmbedEntry> = {
  "cap-rate-calculator": {
    slug: "cap-rate-calculator",
    title: "Cap Rate Calculator",
    shortTitle: "Cap Rate",
    description: "Capitalization rate from price, rent, and operating expenses.",
    toolUrl: "/tools/cap-rate-calculator",
    Widget: dynamic(
      () =>
        import("@/components/tools/cap-rate-calculator-widget").then(
          (m) => m.CapRateCalculatorWidget
        ),
      { ssr: false, loading: EmbedLoading }
    ),
    defaultHeight: 680,
  },
  "cash-on-cash-calculator": {
    slug: "cash-on-cash-calculator",
    title: "Cash-on-Cash Return Calculator",
    shortTitle: "Cash-on-Cash",
    description: "Return on actual cash invested in a rental.",
    toolUrl: "/tools/cash-on-cash-calculator",
    Widget: dynamic(
      () =>
        import("@/components/tools/coc-calculator-widget").then(
          (m) => m.CocCalculatorWidget
        ),
      { ssr: false, loading: EmbedLoading }
    ),
    defaultHeight: 760,
  },
  "dscr-calculator": {
    slug: "dscr-calculator",
    title: "DSCR Calculator",
    shortTitle: "DSCR",
    description:
      "Debt Service Coverage Ratio — the metric every commercial and investment-property lender uses.",
    toolUrl: "/tools/dscr-calculator",
    Widget: dynamic(
      () =>
        import("@/components/tools/dscr-calculator-widget").then(
          (m) => m.DscrCalculatorWidget
        ),
      { ssr: false, loading: EmbedLoading }
    ),
    defaultHeight: 700,
  },
  "noi-calculator": {
    slug: "noi-calculator",
    title: "NOI Calculator",
    shortTitle: "NOI",
    description:
      "Net Operating Income with every common operating expense category.",
    toolUrl: "/tools/noi-calculator",
    Widget: dynamic(
      () =>
        import("@/components/tools/noi-calculator-widget").then(
          (m) => m.NoiCalculatorWidget
        ),
      { ssr: false, loading: EmbedLoading }
    ),
    defaultHeight: 820,
  },
  "mortgage-payment-calculator": {
    slug: "mortgage-payment-calculator",
    title: "Mortgage Payment Calculator",
    shortTitle: "Mortgage Payment",
    description:
      "PITI breakdown — principal, interest, taxes, insurance — for investment property loans.",
    toolUrl: "/tools/mortgage-payment-calculator",
    Widget: dynamic(
      () =>
        import("@/components/tools/mortgage-payment-widget").then(
          (m) => m.MortgagePaymentWidget
        ),
      { ssr: false, loading: EmbedLoading }
    ),
    defaultHeight: 700,
  },
  "gross-rent-multiplier-calculator": {
    slug: "gross-rent-multiplier-calculator",
    title: "Gross Rent Multiplier (GRM) Calculator",
    shortTitle: "GRM",
    description: "The 10-second screening ratio for triaging rental deals.",
    toolUrl: "/tools/gross-rent-multiplier-calculator",
    Widget: dynamic(
      () =>
        import("@/components/tools/grm-calculator-widget").then(
          (m) => m.GrmCalculatorWidget
        ),
      { ssr: false, loading: EmbedLoading }
    ),
    defaultHeight: 560,
  },
  "1-percent-rule-calculator": {
    slug: "1-percent-rule-calculator",
    title: "1% Rule Calculator",
    shortTitle: "1% Rule",
    description: "Pass/fail rental property screening filter in 5 seconds.",
    toolUrl: "/tools/1-percent-rule-calculator",
    Widget: dynamic(
      () =>
        import("@/components/tools/one-percent-rule-widget").then(
          (m) => m.OnePercentRuleWidget
        ),
      { ssr: false, loading: EmbedLoading }
    ),
    defaultHeight: 480,
  },
  "brrrr-calculator": {
    slug: "brrrr-calculator",
    title: "BRRRR Calculator",
    shortTitle: "BRRRR",
    description:
      "Buy, Rehab, Rent, Refinance — model the full strategy in one view.",
    toolUrl: "/tools/brrrr-calculator",
    Widget: dynamic(
      () =>
        import("@/components/tools/brrrr-calculator-widget").then(
          (m) => m.BrrrrCalculatorWidget
        ),
      { ssr: false, loading: EmbedLoading }
    ),
    defaultHeight: 880,
  },
  "break-even-calculator": {
    slug: "break-even-calculator",
    title: "Break-Even Calculator",
    shortTitle: "Break-Even",
    description:
      "Months until rental cash flow returns initial investment.",
    toolUrl: "/tools/break-even-calculator",
    Widget: dynamic(
      () =>
        import("@/components/tools/break-even-calculator-widget").then(
          (m) => m.BreakEvenCalculatorWidget
        ),
      { ssr: false, loading: EmbedLoading }
    ),
    defaultHeight: 640,
  },
  "roi-calculator": {
    slug: "roi-calculator",
    title: "ROI Calculator",
    shortTitle: "ROI",
    description:
      "Total return — cash flow + principal paydown + appreciation in one composite number.",
    toolUrl: "/tools/roi-calculator",
    Widget: dynamic(
      () =>
        import("@/components/tools/roi-calculator-widget").then(
          (m) => m.RoiCalculatorWidget
        ),
      { ssr: false, loading: EmbedLoading }
    ),
    defaultHeight: 760,
  },
  "closing-cost-calculator": {
    slug: "closing-cost-calculator",
    title: "Closing Cost Calculator",
    shortTitle: "Closing Cost",
    description:
      "Line-item closing costs on a rental purchase — origination, title, transfer tax, escrow, prepaids.",
    toolUrl: "/tools/closing-cost-calculator",
    Widget: dynamic(
      () =>
        import("@/components/tools/closing-cost-calculator-widget").then(
          (m) => m.ClosingCostCalculatorWidget
        ),
      { ssr: false, loading: EmbedLoading }
    ),
    defaultHeight: 880,
  },
  "vacancy-rate-calculator": {
    slug: "vacancy-rate-calculator",
    title: "Vacancy Rate Calculator",
    shortTitle: "Vacancy",
    description:
      "Effective vacancy rate from vacant days + turnover cost. Honest underwriting math.",
    toolUrl: "/tools/vacancy-rate-calculator",
    Widget: dynamic(
      () =>
        import("@/components/tools/vacancy-rate-calculator-widget").then(
          (m) => m.VacancyRateCalculatorWidget
        ),
      { ssr: false, loading: EmbedLoading }
    ),
    defaultHeight: 700,
  },
  "rental-property-tax-calculator": {
    slug: "rental-property-tax-calculator",
    title: "Rental Property Tax Calculator",
    shortTitle: "Rental Tax",
    description:
      "Schedule E income, 27.5-year depreciation, after-tax cash flow.",
    toolUrl: "/tools/rental-property-tax-calculator",
    Widget: dynamic(
      () =>
        import("@/components/tools/rental-property-tax-calculator-widget").then(
          (m) => m.RentalPropertyTaxCalculatorWidget
        ),
      { ssr: false, loading: EmbedLoading }
    ),
    defaultHeight: 1100,
  },
};

export const EMBED_LIST: EmbedEntry[] = Object.values(EMBED_REGISTRY);

export function getEmbedEntry(slug: string): EmbedEntry | null {
  return (EMBED_REGISTRY as Record<string, EmbedEntry>)[slug] ?? null;
}
