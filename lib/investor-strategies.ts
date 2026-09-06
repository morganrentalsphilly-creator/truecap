/**
 * INVESTOR STRATEGY REGISTRY — the data behind the "What's your play?" chips
 * on the calculator. Each strategy is a one-click way to tailor the form to a
 * specific investor: it sets the property type, applies a starter assumption
 * set (by reusing an existing entry in STARTER_TEMPLATES — no duplicated
 * numbers), and tells the results view which tab to LEAD with so the number
 * that matters for that play is front-and-center.
 *
 * Design constraints (Morgan's "stay easy to use" directive):
 *  - Additive + optional: with no strategy selected the calculator behaves
 *    exactly as before. Picking a chip only sets values + a focus hint.
 *  - No new nav, no new required inputs. Strategies consume what the form
 *    already collects.
 *  - Pro stays Pro: `primaryOutputIsPro` flags plays whose headline output
 *    (MAO, BRRRR/Flip) is a paid feature — the existing tab gate handles the
 *    upsell at the moment of need; this flag is just so callers/analytics know.
 *
 * Adding a strategy = append one entry below. `starterKey` MUST exist in
 * STARTER_TEMPLATES (unit-tested) and `primaryTab` MUST be a real dashboard
 * tab id (unit-tested).
 */
import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import {
  Building2,
  CalendarClock,
  Hammer,
  Home,
  Tag,
  Wrench,
} from "lucide-react";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import type { StarterTemplate } from "@/lib/starter-templates";
import type { AnalyzerStrategyKey } from "@/lib/analyzer-strategy-persistence";

/** Result tab the strategy leads with. Mirrors AnalysisDashboardTab ids that
 *  exist today; kept as a local union so this module has no UI dependency. */
export type StrategyPrimaryTab = "cash-flow" | "strategies" | "stress-test";

export interface InvestorStrategy {
  /** Stable slug — analytics + the active-chip identifier. */
  key: AnalyzerStrategyKey;
  /** Chip label. */
  label: string;
  /** One-liner under the label / in the focus hint. */
  tagline: string;
  /** Lucide icon component for the chip. */
  Icon: ComponentType<LucideProps>;
  /** Property type this play implies. */
  propertyType: InvestmentFormValues["propertyType"];
  /** Which STARTER_TEMPLATES entry supplies the assumption defaults. */
  starterKey: StarterTemplate["key"];
  /** Results tab to lead with so the key number is first. */
  primaryTab: StrategyPrimaryTab;
  /** True when that headline output is a Pro feature (gate shows at the tab). */
  primaryOutputIsPro: boolean;
  /** Short hint shown above the form once the strategy is active. */
  focusHint: string;
  /** Strategy-tailored Run-button label (falls back to "Run analysis"). */
  runCta?: string;
  /** Override the price field label (e.g. "Asking price" for wholesale). */
  priceLabel?: string;
  /** Override the rent field label (e.g. "Stabilized rent" for BRRRR). */
  rentLabel?: string;
  /** STR: collect nightly rate × occupancy (+ furnishing) instead of a hand-
   *  typed monthly rent; calc-analysis derives the income from them. */
  incomeMode?: "str";
  /** Product prominence. Advanced/beta strategies remain available by direct
   * link, but do not compete with long-term rentals in the primary selector. */
  productStage: "core" | "secondary" | "advanced-beta";
  /** Honest boundary rendered anywhere a non-core strategy is selected. */
  limitation?: string;
}

export const INVESTOR_STRATEGIES: InvestorStrategy[] = [
  {
    key: "buy-hold",
    productStage: "core",
    label: "Buy & Hold",
    tagline: "Long-term cash flow",
    Icon: Building2,
    propertyType: "single-family",
    starterKey: "long-term-rental",
    primaryTab: "cash-flow",
    primaryOutputIsPro: false,
    focusHint:
      "Enter the address and rent — we'll run cap rate, cash-on-cash, and monthly cash flow on buy-and-hold defaults.",
  },
  {
    key: "house-hack",
    productStage: "secondary",
    limitation:
      "Models the live-in period. Model a later move-out as a separate saved scenario; automatic year-two transition logic is not included.",
    runCta: "Run house-hack numbers",
    label: "House Hack",
    tagline: "Live in one unit",
    Icon: Home,
    propertyType: "owner-occupant",
    starterKey: "house-hack",
    primaryTab: "cash-flow",
    primaryOutputIsPro: false,
    focusHint:
      "Review the owner-occupant assumptions and enter rent for each unit you will lease. The unit you live in is fixed at $0 income so the result shows your effective housing cost.",
  },
  {
    key: "brrrr",
    productStage: "advanced-beta",
    limitation:
      "Advanced screening model. Verify rehab, ARV, seasoning, refinance proceeds, and lender terms independently.",
    runCta: "Continue to BRRRR inputs",
    rentLabel: "Stabilized rent (after rehab)",
    label: "BRRRR",
    tagline: "Buy, rehab, rent, refi",
    Icon: Wrench,
    propertyType: "single-family",
    starterKey: "brrrr",
    primaryTab: "strategies",
    primaryOutputIsPro: true,
    focusHint:
      "Review the current acquisition assumptions, then add rehab, ARV, and refinance terms to model cash left in the deal.",
  },
  {
    key: "wholesale-mao",
    productStage: "advanced-beta",
    limitation:
      "Advanced wholesale view. The Offer Ceiling is a rental number, not an assignment-fee or buyer-demand forecast.",
    runCta: "Calculate my Offer Ceiling",
    priceLabel: "Asking price",
    rentLabel: "Market rent",
    label: "Wholesale / Offer Ceiling",
    tagline: "The highest price that still meets your targets",
    Icon: Tag,
    propertyType: "single-family",
    starterKey: "wholesaler-mao",
    primaryTab: "stress-test",
    primaryOutputIsPro: true,
    focusHint:
      "Review the current address, rent, and targets before modeling the Offer Ceiling. Verify every material assumption before negotiating or offering.",
  },
  {
    key: "fix-flip",
    productStage: "advanced-beta",
    limitation:
      "Advanced screening model. Verify rehab scope, ARV, holding period, financing, selling costs, and local comps independently.",
    runCta: "Continue to flip inputs",
    rentLabel: "Rent (only if you hold)",
    label: "Fix & Flip",
    tagline: "Rehab and resell",
    Icon: Hammer,
    propertyType: "single-family",
    starterKey: "hard-money-flip",
    primaryTab: "strategies",
    primaryOutputIsPro: true,
    focusHint:
      "Review the current acquisition assumptions, then add rehab, ARV, holding costs, and sale terms.",
  },
  {
    key: "short-term",
    productStage: "advanced-beta",
    limitation:
      "Beta revenue screen only. It does not fully model platform fees, turnover, lodging tax, seasonality, or local STR eligibility.",
    runCta: "Run STR numbers",
    incomeMode: "str",
    label: "Short-term Rental",
    tagline: "Nightly / STR",
    Icon: CalendarClock,
    propertyType: "single-family",
    starterKey: "short-term-rental",
    primaryTab: "cash-flow",
    primaryOutputIsPro: false,
    focusHint:
      "Review the current assumptions, then enter nightly rate and occupancy; revenue is modeled as ADR × occupancy.",
  },
];

export const CORE_INVESTOR_STRATEGIES = INVESTOR_STRATEGIES.filter(
  (strategy) => strategy.productStage === "core",
);

export const SECONDARY_INVESTOR_STRATEGIES = INVESTOR_STRATEGIES.filter(
  (strategy) => strategy.productStage === "secondary",
);

export const ADVANCED_INVESTOR_STRATEGIES = INVESTOR_STRATEGIES.filter(
  (strategy) => strategy.productStage === "advanced-beta",
);

/** Resolve a strategy by key; null/unknown returns null (used for "clear"). */
export function getStrategyByKey(
  key: string | null | undefined,
): InvestorStrategy | null {
  if (!key) return null;
  return INVESTOR_STRATEGIES.find((s) => s.key === key) ?? null;
}

/**
 * Buy & Hold is the general rental workflow, so its property model remains a
 * user choice. Specialist strategies lock the model their calculations and
 * copy require (for example House Hack must stay owner-occupant).
 */
export function canChoosePropertyTypeForStrategy(
  key: string | null | undefined,
): boolean {
  return key == null || key === "buy-hold";
}

/** Main analyzer heading follows the selected model instead of claiming that
 * every active strategy is a buy-and-hold rental. Unknown/cleared keys retain
 * the familiar default starting experience. */
export function getUnderwritingHeading(key: string | null | undefined): string {
  const strategy = getStrategyByKey(key);
  return strategy
    ? `${strategy.label} Underwriting`
    : "Underwrite a Buy & Hold Rental";
}
