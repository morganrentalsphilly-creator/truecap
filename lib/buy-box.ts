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
  /**
   * Signed distance to target for numeric checks, favor-aware — e.g.
   * "0.8pp short", "$120/mo to spare", "$15,000 over budget". Undefined
   * for non-numeric checks (property type / market) and skipped checks.
   */
  gapText?: string;
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
  /**
   * One personal, number-carrying line about the deal vs THIS investor's
   * criteria: on a miss, the biggest gap ("Biggest gap — Cap rate: 5.2%
   * vs ≥ 6.0% (0.8pp short)"); on a pass, the tightest margin. Null when
   * no numeric check applied (e.g. only property-type / market rules).
   */
  personalLine: string | null;
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
 * Gap magnitude formatters (unsigned) for the "distance to target" text.
 * pp = percentage points (cap rate / CoC), ratio units (DSCR), $/mo (cash
 * flow), and plain money (price). Kept separate from the level formatters
 * so a cap-rate gap reads "0.8pp" not "0.8%" (a point-difference, not a
 * rate).
 */
function gapPp(diff: number): string {
  return `${Math.abs(diff).toLocaleString("en-US", { maximumFractionDigits: 1 })}pp`;
}
function gapRatio(diff: number): string {
  return Math.abs(diff).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/** Favor-aware phrase for a "≥ target" (higher-is-better) check. */
function minGapText(diff: number, mag: string): string {
  return diff >= 0 ? `${mag} to spare` : `${mag} short`;
}

/** Internal ranking record so the personal line can pick the biggest miss
 *  / tightest margin across mixed units via a normalized relative gap. */
type GapRank = { check: BuyBoxCheck; isMiss: boolean; rel: number };
function relGap(diff: number, target: number): number {
  const denom = Math.abs(target);
  return denom > 0 ? Math.abs(diff) / denom : Math.abs(diff);
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
  const gaps: GapRank[] = [];

  if (criteria.minCapRatePct != null) {
    const a = metrics.capRatePct;
    const check: BuyBoxCheck = {
      id: "capRate",
      label: "Cap rate",
      target: `≥ ${pct(criteria.minCapRatePct)}`,
      actual: a == null ? "N/A" : pct(a),
      pass: a == null ? null : a >= criteria.minCapRatePct,
    };
    checks.push(check);
    if (a != null) {
      const diff = a - criteria.minCapRatePct;
      check.gapText = minGapText(diff, gapPp(diff));
      gaps.push({ check, isMiss: diff < 0, rel: relGap(diff, criteria.minCapRatePct) });
    }
  }

  if (criteria.minCocPct != null) {
    const a = metrics.cocPct;
    const check: BuyBoxCheck = {
      id: "coc",
      label: "Cash-on-cash",
      target: `≥ ${pct(criteria.minCocPct)}`,
      actual: a == null ? "N/A" : pct(a),
      pass: a == null ? null : a >= criteria.minCocPct,
    };
    checks.push(check);
    if (a != null) {
      const diff = a - criteria.minCocPct;
      check.gapText = minGapText(diff, gapPp(diff));
      gaps.push({ check, isMiss: diff < 0, rel: relGap(diff, criteria.minCocPct) });
    }
  }

  if (criteria.minDscr != null) {
    const a = metrics.dscr;
    const cashNa = metrics.isCashPurchase;
    const check: BuyBoxCheck = {
      id: "dscr",
      label: "DSCR",
      target: `≥ ${ratio(criteria.minDscr)}`,
      actual: cashNa ? "N/A (cash)" : a == null ? "N/A" : ratio(a),
      pass: cashNa || a == null ? null : a >= criteria.minDscr,
    };
    checks.push(check);
    if (!cashNa && a != null) {
      const diff = a - criteria.minDscr;
      check.gapText = minGapText(diff, gapRatio(diff));
      gaps.push({ check, isMiss: diff < 0, rel: relGap(diff, criteria.minDscr) });
    }
  }

  if (criteria.minCashFlowMonthly != null) {
    const a = metrics.cashFlowMonthly;
    const check: BuyBoxCheck = {
      id: "cashFlow",
      label: "Monthly cash flow",
      target: `≥ ${money(criteria.minCashFlowMonthly)}`,
      actual: a == null ? "N/A" : `${a < 0 ? "-" : ""}${money(Math.abs(a))}`,
      pass: a == null ? null : a >= criteria.minCashFlowMonthly,
    };
    checks.push(check);
    if (a != null) {
      const diff = a - criteria.minCashFlowMonthly;
      check.gapText = minGapText(diff, `${money(Math.abs(diff))}/mo`);
      gaps.push({ check, isMiss: diff < 0, rel: relGap(diff, criteria.minCashFlowMonthly) });
    }
  }

  if (criteria.maxPurchasePrice != null) {
    const a = metrics.purchasePrice;
    const check: BuyBoxCheck = {
      id: "price",
      label: "Purchase price",
      target: `≤ ${money(criteria.maxPurchasePrice)}`,
      actual: a == null ? "N/A" : money(a),
      pass: a == null ? null : a <= criteria.maxPurchasePrice,
    };
    checks.push(check);
    if (a != null) {
      // ≤ check: headroom = budget − price (positive = under budget).
      const diff = criteria.maxPurchasePrice - a;
      check.gapText =
        diff >= 0 ? `${money(Math.abs(diff))} under budget` : `${money(Math.abs(diff))} over budget`;
      gaps.push({ check, isMiss: diff < 0, rel: relGap(diff, criteria.maxPurchasePrice) });
    }
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

  // Personal one-liner: the biggest miss on a fail, the tightest margin on
  // a pass — ranked by normalized relative gap so pp / $ / ratio units
  // compare fairly. Null when no numeric check applied (only type/market).
  let personalLine: string | null = null;
  const numericMisses = gaps.filter((g) => g.isMiss).sort((x, y) => y.rel - x.rel);
  if (failed.length > 0 && numericMisses.length > 0) {
    const c = numericMisses[0]!.check;
    personalLine = `Biggest gap — ${c.label}: ${c.actual} vs ${c.target} (${c.gapText})`;
  } else if (applicable.length > 0 && failed.length === 0) {
    const tightest = gaps.filter((g) => !g.isMiss).sort((x, y) => x.rel - y.rel)[0];
    if (tightest) {
      const c = tightest.check;
      personalLine = `Tightest margin — ${c.label}: ${c.actual} vs ${c.target} (${c.gapText})`;
    }
  }

  return {
    active: criteria.isActive && checks.length > 0,
    passes: applicable.length > 0 && failed.length === 0,
    checks,
    passedCount: applicable.filter((c) => c.pass === true).length,
    failedCount: failed.length,
    failedLabels: failed.map((c) => c.label),
    personalLine,
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
  /** Agent Pro: the client this box screens for; null/undefined = the
   *  agent's own box. Optional so pre-migration rows and non-agent callers
   *  never see the field. */
  clientId?: string | null;
};

export type NamedBuyBoxResult = {
  box: NamedBuyBox;
  result: BuyBoxResult;
};

/**
 * The boxes that legitimately screen ONE deal.
 *
 * Agent Pro lets a box carry a clientId ("The Nguyens' criteria"). Without this
 * filter every such box screened every deal the agent owned, so one buyer's
 * criteria drove the verdict, the fit badge and the MAO "your number" on
 * unrelated deals — and the tier's headline promise ("deals screened to each
 * client's criteria") did nothing at all.
 *
 * The rule:
 *   - clientId null/undefined  → the agent's OWN box; screens every deal.
 *   - clientId set             → screens ONLY deals assigned to that client.
 *
 * Callers with no deal-client context (batch triage of pasted listings, the
 * dashboard rollup) pass null and correctly get just the agent's own boxes.
 */
/**
 * One-line, human summary of a box's criteria ("Cap ≥ 6% · CF ≥ $200/mo").
 * Lives here (not in the settings card) so the client portal can tell a buyer
 * exactly what their agent screened against — "screened to your criteria" is
 * only credible if the criteria are visible.
 */

const KNOWN_STATE_ABBRS = new Set(US_STATE_OPTIONS.map((s) => s.abbr));

/** Raw user_buy_boxes row shape (client_id optional — pre-migration rows). */
export type BuyBoxesRow = {
  id: string;
  name: string | null;
  strategy_kind: string | null;
  min_cap_rate_pct: number | string | null;
  min_coc_pct: number | string | null;
  min_dscr: number | string | null;
  min_cash_flow_monthly: number | string | null;
  max_purchase_price: number | string | null;
  property_types: string[] | null;
  target_states: string[] | null;
  is_active: boolean | null;
  is_default: boolean | null;
  sort_order: number | null;
  client_id?: string | null;
};

function toNumOrNull(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Map a raw user_buy_boxes row to the model. Exported from the shared lib (not
 * the "use server" action) so server-side READERS outside that module — notably
 * the public client portal — can load a client's criteria directly.
 */
export function rowToNamedBuyBox(row: BuyBoxesRow): NamedBuyBox {
  const propertyTypes = (row.property_types ?? []).filter(
    (t): t is BuyBoxPropertyType =>
      t === "single-family" || t === "multi-family" || t === "owner-occupant"
  );
  const targetStates = (row.target_states ?? [])
    .map((s) => s.toUpperCase())
    .filter((s) => KNOWN_STATE_ABBRS.has(s));
  return {
    id: row.id,
    name: row.name ?? "My Buy Box",
    strategyKind: typeof row.strategy_kind === "string" ? row.strategy_kind : null,
    isDefault: row.is_default ?? false,
    sortOrder: row.sort_order ?? 0,
    clientId: row.client_id ?? null,
    minCapRatePct: toNumOrNull(row.min_cap_rate_pct),
    minCocPct: toNumOrNull(row.min_coc_pct),
    minDscr: toNumOrNull(row.min_dscr),
    minCashFlowMonthly: toNumOrNull(row.min_cash_flow_monthly),
    maxPurchasePrice: toNumOrNull(row.max_purchase_price),
    propertyTypes,
    targetStates,
    isActive: row.is_active ?? true,
  };
}

export function summarizeBuyBoxCriteria(box: NamedBuyBox): string {
  const parts: string[] = [];
  if (box.minCapRatePct != null) parts.push(`Cap ≥ ${box.minCapRatePct}%`);
  if (box.minCocPct != null) parts.push(`CoC ≥ ${box.minCocPct}%`);
  if (box.minDscr != null) parts.push(`DSCR ≥ ${box.minDscr}`);
  if (box.minCashFlowMonthly != null) parts.push(`CF ≥ $${box.minCashFlowMonthly}/mo`);
  if (box.maxPurchasePrice != null)
    parts.push(`≤ $${Math.round(box.maxPurchasePrice).toLocaleString("en-US")}`);
  if (box.propertyTypes.length) parts.push(box.propertyTypes.map(buyBoxPropertyTypeLabel).join("/"));
  if (box.targetStates.length) parts.push(box.targetStates.join(", "));
  return parts.length ? parts.join(" · ") : "No criteria set yet";
}

export function boxesForDealClient(
  boxes: NamedBuyBox[],
  dealClientId: string | null | undefined
): NamedBuyBox[] {
  return boxes.filter((b) => b.clientId == null || b.clientId === dealClientId);
}

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

/**
 * Select the single Buy Box that owns this decision and its Offer Ceiling.
 *
 * A multi-box rollup may say that a deal meets *any* saved box. Pairing that
 * aggregate fit with the default box's thresholds creates an impossible
 * hybrid decision when a non-default box is the one that passed. Use the
 * highest-priority passing box; when none pass, use the highest-priority box
 * so the miss and the price ceiling still share one explicit basis.
 */
export function selectDecidingBuyBoxResult(
  results: NamedBuyBoxResult[]
): NamedBuyBoxResult | null {
  const active = results.filter((entry) => entry.result.active);
  return active.find((entry) => entry.result.passes) ?? active[0] ?? null;
}

/** "X of your N active deals pass this box" — the save-feedback count. */
export type BuyBoxFitCount = { passing: number; evaluated: number };

/**
 * Count how many deals pass ONE criteria set — the inverse of
 * summarizeBuyBoxFit (one box across many deals rather than one deal across
 * many boxes). Pure — reuses evaluateBuyBox; a deal counts as passing only
 * when the box is active with ≥1 applicable check (result.active &&
 * result.passes, the exact dashboard / My Deals rule).
 */
export function countBuyBoxFit(
  criteria: BuyBoxCriteria,
  metricsList: BuyBoxDealMetrics[]
): BuyBoxFitCount {
  let passing = 0;
  for (const metrics of metricsList) {
    const result = evaluateBuyBox(criteria, metrics);
    if (result.active && result.passes) passing += 1;
  }
  return { passing, evaluated: metricsList.length };
}
