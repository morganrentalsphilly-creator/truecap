/**
 * Registry of calculators available for iframe embed.
 *
 * Single source of truth split:
 *   - lib/calculator-registry.ts owns the CANONICAL metadata (title,
 *     shortTitle, description, category, which slugs exist) for every
 *     calculator page. Counts and labels come from there.
 *   - THIS module owns only the embeddable subset's lazy-loaded widget
 *     components + default iframe heights. Metadata is pulled FROM the
 *     calculator registry so the two can never drift (the ROI title,
 *     descriptions, etc. live in exactly one place).
 *
 * Adding a new embeddable calculator = add a /tools/<slug> page, register
 * it in calculator-registry.ts (embeddable: true), and add its widget
 * loader to EMBED_WIDGETS below. The composed EMBED_REGISTRY fails loud at
 * import if a widget has no matching calculator-registry entry.
 *
 * No Supabase / auth / cookies in any of these widgets — they're pure
 * client components that compute math from local state. Safe to embed
 * on any third-party site.
 */

import type { ComponentType } from "react";
import dynamic from "next/dynamic";
import { getCalculator } from "@/lib/calculator-registry";

/** Minimal stub used as the loading placeholder for all embeds. */
function EmbedLoading() {
  return null;
}

export type EmbedSlug =
  | "rental-cash-flow-calculator"
  | "cap-rate-calculator"
  | "cash-on-cash-calculator"
  | "dscr-calculator"
  | "noi-calculator"
  | "mortgage-payment-calculator"
  | "gross-rent-multiplier-calculator"
  | "1-percent-rule-calculator"
  | "brrrr-calculator"
  | "arv-calculator"
  | "break-even-calculator"
  | "roi-calculator"
  | "closing-cost-calculator"
  | "vacancy-rate-calculator"
  | "house-hacking-calculator"
  | "70-percent-rule-calculator"
  | "50-percent-rule-calculator"
  | "2-percent-rule-calculator";

export type EmbedEntry = {
  slug: EmbedSlug;
  title: string;
  shortTitle: string;
  description: string;
  /** The full /tools page URL for the "open in TrueCap" attribution link. */
  toolUrl: `/tools/${EmbedSlug}`;
  /** Lazily-loaded widget component. */
  Widget: ComponentType<unknown>;
  /** Estimated default iframe height. Embedded page also sends real
   *  height via postMessage so this is just a reasonable initial value
   *  before postMessage arrives. */
  defaultHeight: number;
};

/** The only thing that is unique to embeds: the widget loader + the
 *  initial iframe height. Title/description/etc. come from the registry. */
type EmbedWidgetSpec = {
  Widget: ComponentType<unknown>;
  defaultHeight: number;
};

const EMBED_WIDGETS: Record<EmbedSlug, EmbedWidgetSpec> = {
  "rental-cash-flow-calculator": {
    Widget: dynamic(
      () =>
        import("@/components/tools/rental-cash-flow-calculator-widget").then(
          (m) => m.RentalCashFlowCalculatorWidget,
        ),
      { loading: EmbedLoading },
    ),
    defaultHeight: 880,
  },
  "cap-rate-calculator": {
    Widget: dynamic(
      () =>
        import("@/components/tools/cap-rate-calculator-widget").then(
          (m) => m.CapRateCalculatorWidget,
        ),
      { loading: EmbedLoading },
    ),
    defaultHeight: 680,
  },
  "cash-on-cash-calculator": {
    Widget: dynamic(
      () =>
        import("@/components/tools/coc-calculator-widget").then(
          (m) => m.CocCalculatorWidget,
        ),
      { loading: EmbedLoading },
    ),
    defaultHeight: 760,
  },
  "dscr-calculator": {
    Widget: dynamic(
      () =>
        import("@/components/tools/dscr-calculator-widget").then(
          (m) => m.DscrCalculatorWidget,
        ),
      { loading: EmbedLoading },
    ),
    defaultHeight: 700,
  },
  "noi-calculator": {
    Widget: dynamic(
      () =>
        import("@/components/tools/noi-calculator-widget").then(
          (m) => m.NoiCalculatorWidget,
        ),
      { loading: EmbedLoading },
    ),
    defaultHeight: 820,
  },
  "mortgage-payment-calculator": {
    Widget: dynamic(
      () =>
        import("@/components/tools/mortgage-payment-widget").then(
          (m) => m.MortgagePaymentWidget,
        ),
      { loading: EmbedLoading },
    ),
    defaultHeight: 700,
  },
  "gross-rent-multiplier-calculator": {
    Widget: dynamic(
      () =>
        import("@/components/tools/grm-calculator-widget").then(
          (m) => m.GrmCalculatorWidget,
        ),
      { loading: EmbedLoading },
    ),
    defaultHeight: 560,
  },
  "1-percent-rule-calculator": {
    Widget: dynamic(
      () =>
        import("@/components/tools/one-percent-rule-widget").then(
          (m) => m.OnePercentRuleWidget,
        ),
      { loading: EmbedLoading },
    ),
    defaultHeight: 480,
  },
  "brrrr-calculator": {
    Widget: dynamic(
      () =>
        import("@/components/tools/brrrr-calculator-widget").then(
          (m) => m.BrrrrCalculatorWidget,
        ),
      { loading: EmbedLoading },
    ),
    defaultHeight: 880,
  },
  "arv-calculator": {
    Widget: dynamic(
      () =>
        import("@/components/tools/arv-calculator-widget").then(
          (m) => m.ArvCalculatorWidget,
        ),
      { loading: EmbedLoading },
    ),
    defaultHeight: 940,
  },
  "break-even-calculator": {
    Widget: dynamic(
      () =>
        import("@/components/tools/break-even-calculator-widget").then(
          (m) => m.BreakEvenCalculatorWidget,
        ),
      { loading: EmbedLoading },
    ),
    defaultHeight: 640,
  },
  "roi-calculator": {
    Widget: dynamic(
      () =>
        import("@/components/tools/roi-calculator-widget").then(
          (m) => m.RoiCalculatorWidget,
        ),
      { loading: EmbedLoading },
    ),
    defaultHeight: 760,
  },
  "closing-cost-calculator": {
    Widget: dynamic(
      () =>
        import("@/components/tools/closing-cost-calculator-widget").then(
          (m) => m.ClosingCostCalculatorWidget,
        ),
      { loading: EmbedLoading },
    ),
    defaultHeight: 880,
  },
  "vacancy-rate-calculator": {
    Widget: dynamic(
      () =>
        import("@/components/tools/vacancy-rate-calculator-widget").then(
          (m) => m.VacancyRateCalculatorWidget,
        ),
      { loading: EmbedLoading },
    ),
    defaultHeight: 700,
  },
  "house-hacking-calculator": {
    Widget: dynamic(
      () =>
        import("@/components/tools/house-hacking-calculator-widget").then(
          (m) => m.HouseHackingCalculatorWidget,
        ),
      { loading: EmbedLoading },
    ),
    defaultHeight: 980,
  },
  "70-percent-rule-calculator": {
    Widget: dynamic(
      () =>
        import("@/components/tools/seventy-percent-rule-widget").then(
          (m) => m.SeventyPercentRuleWidget,
        ),
      { loading: EmbedLoading },
    ),
    defaultHeight: 820,
  },
  "50-percent-rule-calculator": {
    Widget: dynamic(
      () =>
        import("@/components/tools/fifty-percent-rule-widget").then(
          (m) => m.FiftyPercentRuleWidget,
        ),
      { loading: EmbedLoading },
    ),
    defaultHeight: 760,
  },
  "2-percent-rule-calculator": {
    Widget: dynamic(
      () =>
        import("@/components/tools/two-percent-rule-widget").then(
          (m) => m.TwoPercentRuleWidget,
        ),
      { loading: EmbedLoading },
    ),
    defaultHeight: 520,
  },
};

/** Compose the embed entry by pulling metadata from the canonical
 *  calculator registry + attaching the local widget loader. */
function buildEmbedEntry(slug: EmbedSlug): EmbedEntry | null {
  const meta = getCalculator(slug);
  if (!meta) {
    // The widget loader remains bundled for a reversible release, but a
    // default-off calculator is absent from the public registry and embeds.
    return null;
  }
  const spec = EMBED_WIDGETS[slug];
  return {
    slug,
    title: meta.title,
    shortTitle: meta.shortTitle,
    description: meta.description,
    toolUrl: `/tools/${slug}`,
    Widget: spec.Widget,
    defaultHeight: spec.defaultHeight,
  };
}

export const EMBED_REGISTRY: Partial<Record<EmbedSlug, EmbedEntry>> =
  Object.fromEntries(
    (Object.keys(EMBED_WIDGETS) as EmbedSlug[]).flatMap((slug) => {
      const entry = buildEmbedEntry(slug);
      return entry ? [[slug, entry]] : [];
    }),
  );

export const EMBED_LIST: EmbedEntry[] = Object.values(EMBED_REGISTRY).filter(
  (entry): entry is EmbedEntry => Boolean(entry),
);

export function getEmbedEntry(slug: string): EmbedEntry | null {
  return (EMBED_REGISTRY as Record<string, EmbedEntry>)[slug] ?? null;
}
