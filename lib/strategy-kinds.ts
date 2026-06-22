/**
 * Strategy kinds — the investing strategies a deal, scenario, or buy box can
 * target. Shared vocabulary across:
 *   - scenarios       (DM-1, saved_analyses.strategy_kind)
 *   - buy boxes       (DM-2, user_buy_boxes.strategy_kind)
 *   - the analyzer's Strategy step + scenario presets (AN-5)
 *
 * Pure + client-safe. Keep the string ids in lockstep with the DB column
 * values so a scenario's strategy round-trips cleanly.
 */

export const STRATEGY_KINDS = [
  "buy_hold",
  "house_hack",
  "brrrr",
  "flip",
  "section_8",
  "mtr",
  "str",
] as const;

export type StrategyKind = (typeof STRATEGY_KINDS)[number];

export const STRATEGY_LABEL: Record<StrategyKind, string> = {
  buy_hold: "Buy & hold",
  house_hack: "House hack",
  brrrr: "BRRRR",
  flip: "Fix & flip",
  section_8: "Section 8",
  mtr: "Mid-term rental",
  str: "Short-term rental",
};

/** One-line description, for pickers / tooltips. */
export const STRATEGY_BLURB: Record<StrategyKind, string> = {
  buy_hold: "Long-term rental held for cash flow + appreciation.",
  house_hack: "Live in one unit, rent the others (owner-occupant financing).",
  brrrr: "Buy, rehab, rent, refinance, repeat — recycle your capital.",
  flip: "Renovate and resell for a lump-sum profit.",
  section_8: "Voucher tenants at HUD Fair Market Rent.",
  mtr: "Furnished 1–6 month stays (travel nurses, relocations).",
  str: "Nightly / weekly vacation rental (ADR × occupancy).",
};

export function isStrategyKind(value: string | null | undefined): value is StrategyKind {
  return value != null && (STRATEGY_KINDS as readonly string[]).includes(value);
}

/** Human label for a (possibly unknown) strategy id; defaults to Buy & hold. */
export function strategyLabel(kind: string | null | undefined): string {
  return isStrategyKind(kind) ? STRATEGY_LABEL[kind] : STRATEGY_LABEL.buy_hold;
}

/** Default scenario name for a strategy, e.g. "BRRRR scenario"; "Base case" otherwise. */
export function defaultScenarioName(kind: string | null | undefined): string {
  return isStrategyKind(kind) ? `${STRATEGY_LABEL[kind]} scenario` : "Base case";
}
