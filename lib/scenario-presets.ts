/**
 * Strategy presets (DM-1 / AN-5) — adjust a deal's assumptions toward a given
 * strategy when spinning up a scenario. PURE + conservative by design.
 *
 * Guardrails (deliberate, to avoid baking in misleading underwriting):
 *   - We only touch fields with a CLEAR, defensible strategy norm:
 *     financing leverage (down payment) and operating character
 *     (management / vacancy / maintenance).
 *   - We NEVER touch rent. Strategy rent (STR ADR×occupancy, MTR furnished
 *     premium, Section 8 FMR) is too market-specific to guess — the user sets
 *     it. The preset description tells them to.
 *   - A scenario is an editable STARTING POINT, not a final number.
 *
 * Every change is surfaced via describeStrategyPreset() so the UI can tell the
 * user exactly what shifted.
 */

import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import { isStrategyKind, type StrategyKind } from "@/lib/strategy-kinds";

/** Per-strategy assumption overrides (only the fields listed above). */
const PRESETS: Record<
  StrategyKind,
  Partial<Pick<InvestmentFormValues, "downPaymentPct" | "mgmtPct" | "vacancyPct" | "maintenancePct">>
> = {
  buy_hold: {},
  // Owner-occupant financing — the house-hack advantage.
  house_hack: { downPaymentPct: 3.5 },
  // BRRRR refinances to ~75% LTV, i.e. ~25% "down" left in the deal.
  brrrr: { downPaymentPct: 25 },
  // A flip isn't a rental hold — the rental form can't model ARV/holding costs,
  // so leave it as a plain copy and point the user at the Fix & Flip card.
  flip: {},
  // Voucher tenancy tends to be stable + long — a touch less vacancy.
  section_8: { vacancyPct: 3 },
  // Furnished mid-term: more management, turnover, and wear.
  mtr: { mgmtPct: 12, vacancyPct: 10, maintenancePct: 12 },
  // Short-term: heavy management + real occupancy gaps + more wear.
  str: { mgmtPct: 22, vacancyPct: 28, maintenancePct: 12 },
};

const DESCRIPTIONS: Record<StrategyKind, string | null> = {
  buy_hold: null,
  house_hack: "Sets the down payment to 3.5% (owner-occupant financing).",
  brrrr: "Sets 25% down (a typical post-refinance 75% LTV). Model the rehab + refi in the BRRRR card.",
  flip: "Starts as a copy of this deal — model the flip in the Fix & Flip card.",
  section_8: "Lowers vacancy to 3% for stable voucher tenancy. Set rent to your area's HUD Fair Market Rent.",
  mtr: "Raises management, vacancy, and maintenance for furnished mid-term operations. Set your furnished monthly rent.",
  str: "Raises management to 22% and vacancy to 28% for short-term operations. Set your ADR × occupancy as the monthly rent.",
};

/**
 * Apply a strategy preset to form values. Returns a NEW object (does not
 * mutate). Unknown/null strategy or buy_hold returns the values unchanged.
 */
export function applyStrategyPreset(
  values: InvestmentFormValues,
  kind: StrategyKind | null | undefined
): InvestmentFormValues {
  if (!kind) return values;
  const overrides = PRESETS[kind];
  if (!overrides || Object.keys(overrides).length === 0) return values;
  return { ...values, ...overrides };
}

/** Human description of what a preset changes (null = no changes / plain copy).
 *  Accepts a raw string (e.g. a <select> value) and guards it. */
export function describeStrategyPreset(kind: string | null | undefined): string | null {
  return isStrategyKind(kind) ? DESCRIPTIONS[kind] : null;
}
