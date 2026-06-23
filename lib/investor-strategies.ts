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
import { Building2, CalendarClock, Hammer, Home, Tag, Wrench } from "lucide-react";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import type { StarterTemplate } from "@/lib/starter-templates";

/** Result tab the strategy leads with. Mirrors AnalysisDashboardTab ids that
 *  exist today; kept as a local union so this module has no UI dependency. */
export type StrategyPrimaryTab = "cash-flow" | "strategies" | "stress-test";

export interface InvestorStrategy {
  /** Stable slug — analytics + the active-chip identifier. */
  key: string;
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
}

export const INVESTOR_STRATEGIES: InvestorStrategy[] = [
  {
    key: "buy-hold",
    label: "Buy & Hold",
    tagline: "Long-term cash flow",
    Icon: Building2,
    propertyType: "single-family",
    starterKey: "long-term-rental",
    primaryTab: "cash-flow",
    primaryOutputIsPro: false,
    focusHint: "Enter the address and rent — we'll run cap rate, cash-on-cash, and monthly cash flow on buy-and-hold defaults.",
  },
  {
    key: "house-hack",
    label: "House Hack",
    tagline: "Live in one unit",
    Icon: Home,
    propertyType: "owner-occupant",
    starterKey: "house-hack",
    primaryTab: "cash-flow",
    primaryOutputIsPro: false,
    focusHint: "Owner-occupant defaults applied — set each unit's rent to see your effective housing cost after the house hack.",
  },
  {
    key: "brrrr",
    label: "BRRRR",
    tagline: "Buy, rehab, rent, refi",
    Icon: Wrench,
    propertyType: "single-family",
    starterKey: "brrrr",
    primaryTab: "strategies",
    primaryOutputIsPro: true,
    focusHint: "BRRRR defaults applied — model the rehab, refinance, and cash left in the deal.",
  },
  {
    key: "wholesale-mao",
    label: "Wholesale / MAO",
    tagline: "Max offer to hit your number",
    Icon: Tag,
    propertyType: "single-family",
    starterKey: "wholesaler-mao",
    primaryTab: "stress-test",
    primaryOutputIsPro: true,
    focusHint: "Enter the address and rent — we'll reverse-solve your max allowable offer for the return you set.",
  },
  {
    key: "fix-flip",
    label: "Fix & Flip",
    tagline: "Rehab and resell",
    Icon: Hammer,
    propertyType: "single-family",
    starterKey: "hard-money-flip",
    primaryTab: "strategies",
    primaryOutputIsPro: true,
    focusHint: "Flip defaults applied — model rehab budget, holding costs, and resale margin.",
  },
  {
    key: "short-term",
    label: "Short-term Rental",
    tagline: "Nightly / STR",
    Icon: CalendarClock,
    propertyType: "single-family",
    starterKey: "short-term-rental",
    primaryTab: "cash-flow",
    primaryOutputIsPro: false,
    focusHint: "STR defaults applied — higher vacancy and management baked in; enter your projected nightly-equivalent monthly rent.",
  },
];

/** Resolve a strategy by key; null/unknown returns null (used for "clear"). */
export function getStrategyByKey(key: string | null | undefined): InvestorStrategy | null {
  if (!key) return null;
  return INVESTOR_STRATEGIES.find((s) => s.key === key) ?? null;
}
