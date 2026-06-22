/**
 * Buy Box — the investor's personal acquisition criteria, evaluated
 * against a deal to produce a personalized pass/fail verdict that
 * COMPLEMENTS the Deal Score (it never replaces it).
 *
 * Pure module: no IO, client-safe. The server action
 * (app/actions/user-buy-box.ts) persists criteria; this file only
 * defines the shape, the US-state reference list, an address→state
 * derivation helper, and the evaluation itself. Keeping it pure means
 * the inline verdict card can evaluate locally without a round-trip.
 */

export type BuyBoxPropertyType = "single-family" | "multi-family" | "owner-occupant";

export type BuyBoxCriteria = {
  minCapRatePct: number | null;
  minCocPct: number | null;
  minDscr: number | null;
  minCashFlowMonthly: number | null;
  maxPurchasePrice: number | null;
  /** Allowed property types; [] = any. */
  propertyTypes: BuyBoxPropertyType[];
  /** Allowed markets as 2-letter postal codes; [] = any. */
  targetStates: string[];
  /** When false, the verdict is hidden even though criteria are stored. */
  isActive: boolean;
};

export const EMPTY_BUY_BOX: BuyBoxCriteria = {
  minCapRatePct: null,
  minCocPct: null,
  minDscr: null,
  minCashFlowMonthly: null,
  maxPurchasePrice: null,
  propertyTypes: [],
  targetStates: [],
  isActive: true,
};

/** Does this criteria set check at least one dimension? */
export function buyBoxHasCriteria(c: BuyBoxCriteria): boolean {
  return (
    c.minCapRatePct != null ||
    c.minCocPct != null ||
    c.minDscr != null ||
    c.minCashFlowMonthly != null ||
    c.maxPurchasePrice != null ||
    c.propertyTypes.length > 0 ||
    c.targetStates.length > 0
  );
}

/** Deal metrics the Buy Box checks against. */
export type BuyBoxDealMetrics = {
  capRatePct: number | null;
  cocPct: number | null;
  dscr: number | null;
  cashFlowMonthly: number | null;
  purchasePrice: number | null;
  propertyType: BuyBoxPropertyType | null;
  /** 2-letter state code derived from the address, or null if unknown. */
  state: string | null;
  /** Cash purchases have no debt service → DSCR is N/A (not a failure). */
  isCashPurchase: boolean;
};

export type BuyBoxCheckId =
  | "capRate"
  | "coc"
  | "dscr"
  | "cashFlow"
  | "price"
  | "propertyType"
  | "state";

export type BuyBoxCheck = {
  id: BuyBoxCheckId;
  label: string;
  /** Human-readable target, e.g. "≥ 6.0%". */
  target: string;
  /** Human-readable actual, e.g. "5.2%" or "N/A". */
  actual: string;
  /** true = pass, false = fail, null = not applicable (skipped). */
  pass: boolean | null;
};

export type BuyBoxResult = {
  /** Criteria exist AND the box is active. */
  active: boolean;
  /** Overall: at least one check applied and none failed. */
  passes: boolean;
  checks: BuyBoxCheck[];
  passedCount: number;
  failedCount: number;
  /** Labels of failed checks, for a "Misses on X, Y" summary line. */
  failedLabels: string[];
};

export function buyBoxPropertyTypeLabel(t: BuyBoxPropertyType): string {
  return t === "single-family"
    ? "Single-family"
    : t === "multi-family"
      ? "Multi-family"
      : "Owner-occupant";
}

function pct(n: number): string {
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
}

function money(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function ratio(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/**
 * Evaluate a deal against the Buy Box. Only criteria the user actually
 * set produce a check; a metric we can't read (or DSCR on a cash deal)
 * yields a `pass: null` check that doesn't count for or against the
 * deal. The overall `passes` is true only when ≥1 check applied and
 * none failed.
 */
export function evaluateBuyBox(criteria: BuyBoxCriteria, metrics: BuyBoxDealMetrics): BuyBoxResult {
  const checks: BuyBoxCheck[] = [];

  if (criteria.minCapRatePct != null) {
    const a = metrics.capRatePct;
    checks.push({
      id: "capRate",
      label: "Cap rate",
      target: `≥ ${pct(criteria.minCapRatePct)}`,
      actual: a == null ? "N/A" : pct(a),
      pass: a == null ? null : a >= criteria.minCapRatePct,
    });
  }

  if (criteria.minCocPct != null) {
    const a = metrics.cocPct;
    checks.push({
      id: "coc",
      label: "Cash-on-cash",
      target: `≥ ${pct(criteria.minCocPct)}`,
      actual: a == null ? "N/A" : pct(a),
      pass: a == null ? null : a >= criteria.minCocPct,
    });
  }

  if (criteria.minDscr != null) {
    const a = metrics.dscr;
    const cashNa = metrics.isCashPurchase;
    checks.push({
      id: "dscr",
      label: "DSCR",
      target: `≥ ${ratio(criteria.minDscr)}`,
      actual: cashNa ? "N/A (cash)" : a == null ? "N/A" : ratio(a),
      pass: cashNa || a == null ? null : a >= criteria.minDscr,
    });
  }

  if (criteria.minCashFlowMonthly != null) {
    const a = metrics.cashFlowMonthly;
    checks.push({
      id: "cashFlow",
      label: "Monthly cash flow",
      target: `≥ ${money(criteria.minCashFlowMonthly)}`,
      actual: a == null ? "N/A" : `${a < 0 ? "-" : ""}${money(Math.abs(a))}`,
      pass: a == null ? null : a >= criteria.minCashFlowMonthly,
    });
  }

  if (criteria.maxPurchasePrice != null) {
    const a = metrics.purchasePrice;
    checks.push({
      id: "price",
      label: "Purchase price",
      target: `≤ ${money(criteria.maxPurchasePrice)}`,
      actual: a == null ? "N/A" : money(a),
      pass: a == null ? null : a <= criteria.maxPurchasePrice,
    });
  }

  if (criteria.propertyTypes.length > 0) {
    const a = metrics.propertyType;
    checks.push({
      id: "propertyType",
      label: "Property type",
      target: criteria.propertyTypes.map(buyBoxPropertyTypeLabel).join(", "),
      actual: a ? buyBoxPropertyTypeLabel(a) : "N/A",
      pass: a == null ? null : criteria.propertyTypes.includes(a),
    });
  }

  if (criteria.targetStates.length > 0) {
    const a = metrics.state;
    checks.push({
      id: "state",
      label: "Market",
      target: criteria.targetStates.join(", "),
      actual: a ?? "Unknown",
      pass: a == null ? null : criteria.targetStates.includes(a),
    });
  }

  const applicable = checks.filter((c) => c.pass !== null);
  const failed = applicable.filter((c) => c.pass === false);

  return {
    active: criteria.isActive && checks.length > 0,
    passes: applicable.length > 0 && failed.length === 0,
    checks,
    passedCount: applicable.filter((c) => c.pass === true).length,
    failedCount: failed.length,
    failedLabels: failed.map((c) => c.label),
  };
}

/** All US states + DC, for the target-markets picker and state derivation. */
export const US_STATE_OPTIONS: ReadonlyArray<{ abbr: string; name: string }> = [
  { abbr: "AL", name: "Alabama" },
  { abbr: "AK", name: "Alaska" },
  { abbr: "AZ", name: "Arizona" },
  { abbr: "AR", name: "Arkansas" },
  { abbr: "CA", name: "California" },
  { abbr: "CO", name: "Colorado" },
  { abbr: "CT", name: "Connecticut" },
  { abbr: "DE", name: "Delaware" },
  { abbr: "DC", name: "District of Columbia" },
  { abbr: "FL", name: "Florida" },
  { abbr: "GA", name: "Georgia" },
  { abbr: "HI", name: "Hawaii" },
  { abbr: "ID", name: "Idaho" },
  { abbr: "IL", name: "Illinois" },
  { abbr: "IN", name: "Indiana" },
  { abbr: "IA", name: "Iowa" },
  { abbr: "KS", name: "Kansas" },
  { abbr: "KY", name: "Kentucky" },
  { abbr: "LA", name: "Louisiana" },
  { abbr: "ME", name: "Maine" },
  { abbr: "MD", name: "Maryland" },
  { abbr: "MA", name: "Massachusetts" },
  { abbr: "MI", name: "Michigan" },
  { abbr: "MN", name: "Minnesota" },
  { abbr: "MS", name: "Mississippi" },
  { abbr: "MO", name: "Missouri" },
  { abbr: "MT", name: "Montana" },
  { abbr: "NE", name: "Nebraska" },
  { abbr: "NV", name: "Nevada" },
  { abbr: "NH", name: "New Hampshire" },
  { abbr: "NJ", name: "New Jersey" },
  { abbr: "NM", name: "New Mexico" },
  { abbr: "NY", name: "New York" },
  { abbr: "NC", name: "North Carolina" },
  { abbr: "ND", name: "North Dakota" },
  { abbr: "OH", name: "Ohio" },
  { abbr: "OK", name: "Oklahoma" },
  { abbr: "OR", name: "Oregon" },
  { abbr: "PA", name: "Pennsylvania" },
  { abbr: "RI", name: "Rhode Island" },
  { abbr: "SC", name: "South Carolina" },
  { abbr: "SD", name: "South Dakota" },
  { abbr: "TN", name: "Tennessee" },
  { abbr: "TX", name: "Texas" },
  { abbr: "UT", name: "Utah" },
  { abbr: "VT", name: "Vermont" },
  { abbr: "VA", name: "Virginia" },
  { abbr: "WA", name: "Washington" },
  { abbr: "WV", name: "West Virginia" },
  { abbr: "WI", name: "Wisconsin" },
  { abbr: "WY", name: "Wyoming" },
];

const STATE_ABBRS = new Set(US_STATE_OPTIONS.map((s) => s.abbr));
const STATE_NAME_TO_ABBR = new Map(US_STATE_OPTIONS.map((s) => [s.name.toLowerCase(), s.abbr]));

/**
 * Best-effort 2-letter state code from a free-text address. Google
 * Places autocomplete yields "…, City, ST 19103, USA", so we anchor on
 * a comma-preceded 2-letter token (optionally before a ZIP) — this
 * avoids false positives from words like "IN" or "OR" mid-address.
 * Falls back to a full state-name match. Returns null when unsure, in
 * which case the Market criterion is skipped rather than failed.
 */
export function deriveStateFromAddress(address: string | null | undefined): string | null {
  if (!address) return null;
  const upper = address.toUpperCase();

  // ", ST 19103" — state code directly before a 5-digit ZIP.
  const beforeZip = upper.match(/,\s*([A-Z]{2})\s+\d{5}/);
  if (beforeZip && STATE_ABBRS.has(beforeZip[1]!)) return beforeZip[1]!;

  // ", ST," or ", ST" at a segment end (e.g. "…, PA, USA" or "…, PA").
  const commaAnchored = upper.match(/,\s*([A-Z]{2})\b(?=\s*,|\s*$)/);
  if (commaAnchored && STATE_ABBRS.has(commaAnchored[1]!)) return commaAnchored[1]!;

  // Full state name anywhere in the address.
  const lower = address.toLowerCase();
  for (const [name, abbr] of STATE_NAME_TO_ABBR) {
    if (lower.includes(name)) return abbr;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────
// Multiple Buy Boxes (DM-2) — thin, pure layer over evaluateBuyBox so a deal
// can be screened against every box the user keeps (e.g. a Memphis-BRRRR box
// and a Philly-house-hack box). Backed by the user_buy_boxes table; ships
// dormant until that migration is applied.
// ─────────────────────────────────────────────────────────────────────────

/** A saved Buy Box with identity + ordering. */
export type NamedBuyBox = BuyBoxCriteria & {
  id: string;
  name: string;
  /** Strategy this box screens for (e.g. 'brrrr','house_hack'); null = any. */
  strategyKind: string | null;
  isDefault: boolean;
  sortOrder: number;
};

export type NamedBuyBoxResult = {
  box: NamedBuyBox;
  result: BuyBoxResult;
};

/**
 * Evaluate a deal against every box, returned default-first then by sort
 * order so the highest-priority box leads. Pure — reuses evaluateBuyBox.
 */
export function evaluateBuyBoxes(
  boxes: NamedBuyBox[],
  metrics: BuyBoxDealMetrics
): NamedBuyBoxResult[] {
  return [...boxes]
    .sort((a, b) =>
      a.isDefault === b.isDefault ? a.sortOrder - b.sortOrder : a.isDefault ? -1 : 1
    )
    .map((box) => ({ box, result: evaluateBuyBox(box, metrics) }));
}

export type BuyBoxFitSummary = {
  /** Boxes that are active (have criteria AND isActive). */
  activeCount: number;
  /** Active boxes the deal passes. */
  passingCount: number;
  /** True when the deal passes at least one active box. */
  anyPass: boolean;
  /** Highest-priority passing box (default first), or null. */
  bestFit: NamedBuyBox | null;
};

/**
 * Roll up per-box results into a one-glance "passes N of M boxes" summary.
 * Expects the output of evaluateBuyBoxes (already priority-ordered), so
 * bestFit is simply the first passing box.
 */
export function summarizeBuyBoxFit(results: NamedBuyBoxResult[]): BuyBoxFitSummary {
  const active = results.filter((r) => r.result.active);
  const passing = active.filter((r) => r.result.passes);
  return {
    activeCount: active.length,
    passingCount: passing.length,
    anyPass: passing.length > 0,
    bestFit: passing[0]?.box ?? null,
  };
}
