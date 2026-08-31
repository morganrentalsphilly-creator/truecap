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
  Partial<
    Pick<
      InvestmentFormValues,
      "downPaymentPct" | "mgmtPct" | "vacancyPct" | "maintenancePct"
    >
  >
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
  house_hack:
    "Sets down payment to 3.5%. If this copy is not Owner Occupant yet, open it and choose House Hack to identify the owner unit and enter rent for the others.",
  brrrr:
    "Sets 25% down. Open the copy and choose BRRRR to complete its property, rehab, and refinance assumptions.",
  flip: "Starts as a copy. Open it and choose Fix & Flip to complete its property and sale assumptions.",
  section_8:
    "Lowers vacancy to 3% for stable voucher tenancy. Set rent to your area's HUD Fair Market Rent.",
  mtr: "Raises management, vacancy, and maintenance for furnished mid-term operations. Set your furnished monthly rent.",
  str: "Raises management to 22% and vacancy to 28%. Open the copy and choose Short-Term Rental to enter nightly rate and occupancy.",
};

/**
 * Apply a strategy preset to form values. Returns a NEW object (does not
 * mutate). Unknown/null strategy or buy_hold returns the values unchanged.
 */
export function applyStrategyPreset(
  values: InvestmentFormValues,
  kind: StrategyKind | null | undefined,
): InvestmentFormValues {
  if (!kind) return values;
  const overrides = PRESETS[kind];
  const clearsShortTermIncome =
    kind !== "str" &&
    (values.avgDailyRate != null ||
      values.occupancyPct != null ||
      values.strFurnishingCost != null);
  if (
    (!overrides || Object.keys(overrides).length === 0) &&
    !clearsShortTermIncome
  ) {
    return values;
  }
  return {
    ...values,
    ...overrides,
    ...(clearsShortTermIncome
      ? {
          avgDailyRate: undefined,
          occupancyPct: undefined,
          strFurnishingCost: undefined,
        }
      : {}),
  };
}

/** Human description of what a preset changes (null = no changes / plain copy).
 *  Accepts a raw string (e.g. a <select> value) and guards it. */
export function describeStrategyPreset(
  kind: string | null | undefined,
): string | null {
  return isStrategyKind(kind) ? DESCRIPTIONS[kind] : null;
}
