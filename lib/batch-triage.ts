/**
 * Batch triage engine (Phase 4) — "paste N listings → a screened shortlist".
 *
 * PURE + IO-free so it's fully unit-testable and safe to import anywhere.
 * Each listing is underwritten through the SAME pipeline every other surface
 * uses (recomputeSavedDealVerdict = calculateAnalysis + computeDealScore), so
 * a triage row can never disagree with what the full analyzer would show for
 * the same inputs. The optional per-user buy box is evaluated with the
 * lib/buy-box primitives — one paste, screened against YOUR criteria.
 *
 * v1 scope: single-family listings (address, price, rent, beds). The paste
 * carries one rent, which only maps cleanly onto the single-family flow;
 * multi-family / owner-occupant triage (per-unit rents) is a documented
 * follow-up, not silently-wrong numbers. Enrichment (rate / tax) is layered
 * in by the server action and passed here as plain values — the engine stays
 * pure.
 */

import { recomputeSavedDealVerdict } from "@/lib/recompute-saved-deal-verdict";
import { defaultValues, normalizeInvestmentFormSnapshot } from "@/lib/investcalc-schema";
import {
  deriveStateFromAddress,
  evaluateBuyBoxes,
  summarizeBuyBoxFit,
  type BuyBoxDealMetrics,
  type BuyBoxFitSummary,
  type NamedBuyBox,
} from "@/lib/buy-box";
import type { DealRecommendation } from "@/lib/deal-score";
import {
  featureFlags,
  isFeatureEnabled,
  type FeatureFlagState,
} from "@/lib/feature-flags";
import {
  calculateMaxAllowableOffer,
  solveRequiredMonthlyRent,
  type MaoTarget,
} from "@/lib/max-allowable-offer";
import {
  buildMaoTarget,
  buyBoxHasReturnTargets,
  describeMaoTarget,
} from "@/lib/mao-targets";
import { parseLocationFromAddress } from "@/lib/market-benchmarks";

/** A single parsed listing (single-family v1). */
export interface TriageListingInput {
  address: string;
  purchasePrice: number;
  monthlyRent?: number;
  bedrooms?: number;
}

export interface TriageParseError {
  /** 1-indexed source line. */
  line: number;
  raw: string;
  reason: string;
}

export interface TriageParseResult {
  rows: TriageListingInput[];
  errors: TriageParseError[];
}

export type TriagePreviewField = "address" | "purchasePrice" | "monthlyRent" | "bedrooms" | "row";

export type TriagePreviewIssue = {
  field: TriagePreviewField;
  severity: "error" | "warning";
  message: string;
};

/**
 * Editable, lossless-enough representation of one pasted row. Values stay as
 * strings so an invalid partial value ("$2x0", an empty price, etc.) remains
 * visible and editable instead of being silently coerced or dropped.
 */
export interface TriagePreviewRow {
  id: string;
  sourceLine: number;
  address: string;
  purchasePrice: string;
  monthlyRent: string;
  bedrooms: string;
  /** Parser-only ambiguity that field validation cannot infer later. */
  sourceIssue?: string;
  issues: TriagePreviewIssue[];
}

/** Assumption overrides the server action fills from enrichment (rate / tax). */
export interface TriageEnrichment {
  interestRate?: number;
  propertyTaxPct?: number;
  /** Exact screening context supplied by the authenticated server action. */
  screenedAt?: string;
  state?: string | null;
  status?: "live" | "fallback";
  rateSource?: "fred" | "default";
  taxSource?: "state-static" | "default";
}

export interface TriageAssumptionContext {
  screenedAt: string | null;
  interestRatePct: number;
  propertyTaxPct: number;
  state: string | null;
  enrichmentStatus: "live" | "fallback";
  rateSource: "fred" | "default";
  taxSource: "state-static" | "default";
}

export interface TriageRowResult {
  input: TriageListingInput;
  /** The exact market assumptions used, retained through restore + analyzer handoff. */
  assumptionContext: TriageAssumptionContext;
  /** False when the inputs don't produce a valid underwrite. */
  ok: boolean;
  score: number | null;
  recommendation: DealRecommendation | null;
  netCashFlowMonthly: number | null;
  cocReturnPct: number | null;
  capRatePct: number | null;
  dscr: number | null;
  isCashPurchase: boolean;
  /** Canonical MAO target used for this row (buy-box return targets when set,
   * otherwise break-even cash flow + 1.25 DSCR). */
  target: MaoTarget | null;
  targetLabel: string | null;
  /** Price ceiling at `target`, computed by the shared MAO solver. */
  maxOffer: number | null;
  /** Asking price minus price ceiling. Positive means asking is over ceiling. */
  askingGap: number | null;
  /** Lowest monthly rent that clears `target` at asking, when solvable. */
  requiredMonthlyRent: number | null;
  requiredRentDelta: number | null;
  requiredRentUnreachable: boolean;
  /** Unitless distance used only to break tied scores by "closest to working".
   *  Zero already clears the target; smaller positive values are closer. */
  viabilityDistance: number | null;
  /** Buy-box fit summary, or null when the user has no active box. */
  buyBoxFit: BuyBoxFitSummary | null;
}

export type TriageSort = "score" | "cashFlow" | "fit";

/** Preserve the proven live limit until the expanded workflow is enabled. */
export const LEGACY_MAX_TRIAGE_ROWS = 10;
/** Expanded batch-underwriting release limit requested for v2. */
export const BATCH_UNDERWRITING_MAX_TRIAGE_ROWS = 50;

export function resolveMaxTriageRows(flags: FeatureFlagState = featureFlags): number {
  return isFeatureEnabled("batch_underwriting", flags)
    ? BATCH_UNDERWRITING_MAX_TRIAGE_ROWS
    : LEGACY_MAX_TRIAGE_ROWS;
}

/** Build-time row cap, enforced again in the authenticated server action. */
export const MAX_TRIAGE_ROWS = resolveMaxTriageRows();

// ── Parsing ────────────────────────────────────────────────────────────────

/** Strip $ , and whitespace, then parse; null when not a finite number. */
function parseMoney(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Is this cell a bare number (no letters) once currency chrome is stripped? */
function isBareNumber(raw: string): boolean {
  const t = raw.trim();
  return t !== "" && /^\$?\s*[\d,]+(\.\d+)?$/.test(t);
}

function cleanedNumber(raw: string): number | null {
  return parseMoney(raw);
}

/** Validate an editable preview row without discarding its original text. */
export function validateTriagePreviewRow(
  row: Omit<TriagePreviewRow, "issues">
): TriagePreviewRow {
  const issues: TriagePreviewIssue[] = [];
  const address = row.address.trim();
  const price = cleanedNumber(row.purchasePrice);
  const rent = row.monthlyRent.trim() === "" ? null : cleanedNumber(row.monthlyRent);
  const beds = row.bedrooms.trim() === "" ? null : cleanedNumber(row.bedrooms);

  if (address.length < 5) {
    issues.push({ field: "address", severity: "error", message: "Enter a complete address." });
  } else if (!parseLocationFromAddress(address).state) {
    issues.push({ field: "address", severity: "warning", message: "City/state could not be resolved; verify the location used for tax assumptions." });
  }
  if (row.purchasePrice.trim() === "") {
    issues.push({ field: "purchasePrice", severity: "error", message: "Purchase price is required." });
  } else if (price == null || price < 1_000 || price > 100_000_000) {
    issues.push({ field: "purchasePrice", severity: "error", message: "Enter a purchase price from $1,000 to $100,000,000." });
  }
  if (row.monthlyRent.trim() === "") {
    issues.push({ field: "monthlyRent", severity: "warning", message: "Rent is missing; this row will need rent before it can be underwritten." });
  } else if (rent == null || rent < 0 || rent > 1_000_000) {
    issues.push({ field: "monthlyRent", severity: "error", message: "Enter a monthly rent from $0 to $1,000,000." });
  }
  if (row.bedrooms.trim() === "") {
    issues.push({ field: "bedrooms", severity: "warning", message: "Beds are missing; market-rent context may be less precise." });
  } else if (beds == null || !Number.isInteger(beds) || beds < 0 || beds > 20) {
    issues.push({ field: "bedrooms", severity: "error", message: "Enter a whole number from 0 to 20." });
  }
  if (row.sourceIssue) {
    issues.push({ field: "row", severity: "warning", message: row.sourceIssue });
  }

  return { ...row, issues };
}

/**
 * Parse every nonblank pasted line into an editable row, including partial or
 * ambiguous lines. Unlike parseTriageInput, this function never drops a line:
 * the user gets a chance to repair it in the preview before screening.
 */
export function parseTriagePreviewInput(text: string): TriagePreviewRow[] {
  const rows: TriagePreviewRow[] = [];
  const lines = (text ?? "").split(/\r?\n/);

  lines.forEach((rawLine, i) => {
    const line = rawLine.trim();
    if (line === "") return;
    const lineNo = i + 1;
    let cells: string[];
    let sourceIssue: string | undefined;

    if (line.includes("\t")) {
      cells = line.split("\t");
      if (cells.length > 4) sourceIssue = "Extra tab-separated columns detected; verify this row.";
    } else if (line.includes("|")) {
      cells = line.split("|");
      if (cells.length > 4) sourceIssue = "Extra pipe-separated columns detected; verify this row.";
    } else {
      const parts = line.split(",").map((p) => p.trim());
      let cut = parts.length;
      while (cut > 0 && isBareNumber(parts[cut - 1]!)) cut--;
      const numeric = parts.slice(cut);
      if (numeric.length === 0) {
        cells = [line, "", "", ""];
        sourceIssue = "Could not identify the numeric columns. Verify the address, price, rent, and beds.";
      } else {
        cells = [parts.slice(0, cut).join(", "), ...numeric.slice(0, 3)];
        if (numeric.length > 3) sourceIssue = "More than three trailing numbers were found; verify the columns.";
      }
    }

    const trimmed = cells.map((cell) => cell.trim());
    rows.push(
      validateTriagePreviewRow({
        id: `line-${lineNo}`,
        sourceLine: lineNo,
        address: trimmed[0] ?? "",
        purchasePrice: trimmed[1] ?? "",
        monthlyRent: trimmed[2] ?? "",
        bedrooms: trimmed[3] ?? "",
        sourceIssue,
      })
    );
  });

  return rows;
}

export function previewRowToListing(row: TriagePreviewRow): TriageListingInput | null {
  const validated = validateTriagePreviewRow(row);
  if (validated.issues.some((issue) => issue.severity === "error")) return null;
  const price = cleanedNumber(validated.purchasePrice);
  if (price == null) return null;
  const rent = cleanedNumber(validated.monthlyRent);
  const beds = cleanedNumber(validated.bedrooms);
  return {
    address: validated.address.trim(),
    purchasePrice: Math.round(price),
    ...(rent != null ? { monthlyRent: Math.round(rent) } : {}),
    ...(beds != null ? { bedrooms: Math.round(beds) } : {}),
  };
}

/**
 * Convert an editable row only when it can produce an actual underwrite.
 * Address + price alone remain valid preview data, but rent is required by
 * triageListing; counting that partial row in the Screen CTA would promise an
 * analysis that can only return "Needs rent."
 */
export function previewRowToScreenableListing(
  row: TriagePreviewRow
): TriageListingInput | null {
  const listing = previewRowToListing(row);
  return listing?.monthlyRent == null ? null : listing;
}

/** Serialize only underwritable rows; invalid partial rows remain in preview. */
export function formatScreenableTriageRows(rows: TriagePreviewRow[]): string {
  return formatTriageRowsAsText(
    rows
      .map(previewRowToScreenableListing)
      .filter((row): row is TriageListingInput => row != null)
  );
}

/** Keep every editable row (including invalid partials) in the paste buffer. */
export function formatTriagePreviewRowsAsText(rows: TriagePreviewRow[]): string {
  return rows
    .map((row) => [row.address, row.purchasePrice, row.monthlyRent, row.bedrooms].join("\t"))
    .join("\n");
}

export function resolvedTriageLocation(address: string): { city: string | null; state: string | null; label: string | null } {
  const { city, state } = parseLocationFromAddress(address);
  return { city, state, label: city && state ? `${city}, ${state}` : state };
}

/**
 * Parse pasted listings into structured rows. One listing per line.
 *
 * Delimiter precedence — TAB or PIPE first (unambiguous; addresses with
 * commas and $1,234-style numbers survive intact — this is a spreadsheet
 * copy-paste). Falls back to COMMA, where the address may itself contain
 * commas: the trailing run of bare-number cells is read as
 * price / rent / beds and everything before it is the address.
 *
 * Columns: Address, Price, [Rent], [Beds]. A row without a valid address
 * (≥5 chars) or a plausible price (≥ 1000) is returned as an error, never
 * silently dropped.
 */
export function parseTriageInput(text: string): TriageParseResult {
  const preview = parseTriagePreviewInput(text);
  const rows: TriageListingInput[] = [];
  const errors: TriageParseError[] = [];
  for (const row of preview) {
    const listing = previewRowToListing(row);
    if (listing) {
      rows.push(listing);
      continue;
    }
    const firstError = row.issues.find((issue) => issue.severity === "error");
    errors.push({
      line: row.sourceLine,
      raw: [row.address, row.purchasePrice, row.monthlyRent, row.bedrooms].join("\t"),
      reason: firstError?.message ?? "Verify this row before screening.",
    });
  }
  return { rows, errors };
}

/**
 * Render parsed rows back to the tab-separated block the paste box uses, so
 * AI-extracted listings drop into the SAME review-then-screen flow as a
 * hand-paste (round-trips through parseTriageInput). Tab-delimited because an
 * address can contain commas.
 */
export function formatTriageRowsAsText(rows: TriageListingInput[]): string {
  return rows
    .map((r) => [r.address, r.purchasePrice, r.monthlyRent ?? "", r.bedrooms ?? ""].join("\t"))
    .join("\n");
}

// ── Underwriting one row ─────────────────────────────────────────────────────

/** A loose form snapshot for one listing; the normalizer fills the defaults. */
export function buildTriageSnapshot(
  input: TriageListingInput,
  enrichment?: TriageEnrichment
): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {
    // Seed the canonical engine defaults first (financing, expense %s, growth
    // rates) — the normalizer re-reads each field explicitly, so a snapshot
    // missing them would validate to undefined and fail. Mirrors
    // buildNewAnalysisDefaults.
    ...defaultValues,
    propertyType: "single-family",
    address: input.address,
    purchasePrice: input.purchasePrice,
  };
  if (input.monthlyRent !== undefined) snapshot.monthlyRent = input.monthlyRent;
  if (input.bedrooms !== undefined) snapshot.bedrooms = input.bedrooms;
  // Enrichment overlays the engine defaults so the underwrite uses the real
  // market rate / tax for the address, just like the single-deal flow.
  if (enrichment?.interestRate !== undefined) snapshot.interestRate = enrichment.interestRate;
  if (enrichment?.propertyTaxPct !== undefined) snapshot.propertyTaxPct = enrichment.propertyTaxPct;
  return snapshot;
}

function triageAssumptionContext(enrichment?: TriageEnrichment): TriageAssumptionContext {
  return {
    screenedAt: enrichment?.screenedAt ?? null,
    interestRatePct: Number(enrichment?.interestRate ?? defaultValues.interestRate),
    propertyTaxPct: Number(enrichment?.propertyTaxPct ?? defaultValues.propertyTaxPct),
    state: enrichment?.state ?? null,
    enrichmentStatus: enrichment?.status ?? "fallback",
    rateSource: enrichment?.rateSource ?? "default",
    taxSource: enrichment?.taxSource ?? "default",
  };
}

const EMPTY_ROW = (input: TriageListingInput, enrichment?: TriageEnrichment): TriageRowResult => ({
  input,
  assumptionContext: triageAssumptionContext(enrichment),
  ok: false,
  score: null,
  recommendation: null,
  netCashFlowMonthly: null,
  cocReturnPct: null,
  capRatePct: null,
  dscr: null,
  isCashPurchase: false,
  target: null,
  targetLabel: null,
  maxOffer: null,
  askingGap: null,
  requiredMonthlyRent: null,
  requiredRentDelta: null,
  requiredRentUnreachable: false,
  viabilityDistance: null,
  buyBoxFit: null,
});

/**
 * Underwrite + screen ONE listing. Pure: composes recomputeSavedDealVerdict
 * (the canonical form→verdict pipeline) with the buy-box primitives. Returns
 * an ok:false row when the inputs don't validate (e.g. no rent → no cash-flow
 * verdict) rather than throwing, so one bad row never sinks the batch.
 */
export function triageListing(
  input: TriageListingInput,
  opts?: { enrichment?: TriageEnrichment; buyBoxes?: NamedBuyBox[] | null }
): TriageRowResult {
  // Never let the schema's demonstration/default rent turn a missing pasted
  // rent into a real-looking underwrite. The preview flags this row and the
  // result asks for rent; the canonical engine only runs once rent is real.
  if (input.monthlyRent === undefined) return EMPTY_ROW(input, opts?.enrichment);
  const snapshot = buildTriageSnapshot(input, opts?.enrichment);
  const verdict = recomputeSavedDealVerdict(snapshot);
  if (!verdict) return EMPTY_ROW(input, opts?.enrichment);

  let buyBoxFit: BuyBoxFitSummary | null = null;
  const boxes = opts?.buyBoxes;
  if (boxes && boxes.length > 0) {
    const metrics: BuyBoxDealMetrics = {
      capRatePct: verdict.capRatePct ?? null,
      cocPct: verdict.cocReturnPct ?? null,
      dscr: verdict.dscr ?? null,
      cashFlowMonthly: verdict.netCashFlowMonthly ?? null,
      purchasePrice: input.purchasePrice,
      propertyType: "single-family",
      state: deriveStateFromAddress(input.address),
      isCashPurchase: verdict.isCashPurchase,
    };
    const results = evaluateBuyBoxes(boxes, metrics).filter((r) => r.result.active);
    if (results.length > 0) buyBoxFit = summarizeBuyBoxFit(results);
  }

  // Decision path — reuse the exact target builder + MAO/inverse solvers used
  // by the full deal workspace. No financial formula is duplicated here.
  const values = normalizeInvestmentFormSnapshot(snapshot);
  let target: MaoTarget | null = null;
  let targetLabel: string | null = null;
  let maxOffer: number | null = null;
  let askingGap: number | null = null;
  let requiredMonthlyRent: number | null = null;
  let requiredRentDelta: number | null = null;
  let requiredRentUnreachable = false;
  let viabilityDistance: number | null = null;
  if (values) {
    const targetBox = boxes?.find(buyBoxHasReturnTargets) ?? null;
    if (targetBox) {
      target = buildMaoTarget(targetBox, { isCashPurchase: verdict.isCashPurchase });
      targetLabel = describeMaoTarget(target);
      const mao = calculateMaxAllowableOffer(values, target);
      maxOffer = mao?.maxPrice ?? null;
      askingGap = maxOffer == null ? null : input.purchasePrice - maxOffer;

      const rentPath = solveRequiredMonthlyRent(values, target);
      if (rentPath) {
        requiredRentUnreachable = rentPath.unreachable;
        if (!rentPath.unreachable) {
          requiredMonthlyRent = rentPath.value;
          const currentRent = input.monthlyRent ?? 0;
          requiredRentDelta = Math.max(0, Math.round(rentPath.value - currentRent));
          viabilityDistance = rentPath.alreadyMet
            ? 0
            : currentRent > 0
              ? requiredRentDelta / currentRent
              : requiredRentDelta;
        }
      }
      if (viabilityDistance == null) {
        // Fallback for an unreachable/missing inverse solve: price gap is still
        // a canonical, comparable distance to the same adopted Buy Box target.
        viabilityDistance = askingGap == null
          ? null
          : Math.max(0, askingGap) / Math.max(1, input.purchasePrice);
      }
    }
  }

  return {
    input,
    assumptionContext: triageAssumptionContext(opts?.enrichment),
    ok: true,
    score: verdict.score,
    recommendation: verdict.recommendation,
    netCashFlowMonthly: verdict.netCashFlowMonthly,
    cocReturnPct: verdict.cocReturnPct,
    capRatePct: verdict.capRatePct,
    dscr: verdict.dscr,
    isCashPurchase: verdict.isCashPurchase,
    target,
    targetLabel,
    maxOffer,
    askingGap,
    requiredMonthlyRent,
    requiredRentDelta,
    requiredRentUnreachable,
    viabilityDistance,
    buyBoxFit,
  };
}

// ── Ranking ──────────────────────────────────────────────────────────────────

/**
 * Rank the shortlist. Unscored (ok:false) rows always sink to the bottom.
 * "fit" leads with buy-box passers, then score — the "which of these meet MY
 * criteria" shortlist; "score" and "cashFlow" are the generic power sorts.
 * Exact metric ties finish alphabetically, never by arbitrary paste order.
 */
export function rankTriageRows(rows: TriageRowResult[], sort: TriageSort): TriageRowResult[] {
  const keyed = rows.map((row, index) => ({ row, index }));
  const scoreOf = (r: TriageRowResult) => r.score ?? Number.NEGATIVE_INFINITY;
  const distanceOf = (r: TriageRowResult) => r.viabilityDistance ?? Number.POSITIVE_INFINITY;
  keyed.sort((a, b) => {
    // ok:false rows last, regardless of sort.
    if (a.row.ok !== b.row.ok) return a.row.ok ? -1 : 1;
    if (sort === "cashFlow") {
      const av = a.row.netCashFlowMonthly ?? Number.NEGATIVE_INFINITY;
      const bv = b.row.netCashFlowMonthly ?? Number.NEGATIVE_INFINITY;
      if (av !== bv) return bv - av;
    } else if (sort === "fit") {
      const ap = a.row.buyBoxFit?.anyPass ? 1 : 0;
      const bp = b.row.buyBoxFit?.anyPass ? 1 : 0;
      if (ap !== bp) return bp - ap;
      if (scoreOf(a.row) !== scoreOf(b.row)) return scoreOf(b.row) - scoreOf(a.row);
    } else {
      if (scoreOf(a.row) !== scoreOf(b.row)) return scoreOf(b.row) - scoreOf(a.row);
    }
    // A tied/zero score must still answer "which is closest to working?".
    // Smaller target distance wins, then stronger DSCR and cash flow. The
    // address is the final deterministic tie-break — never arbitrary paste
    // order. (Input index remains only for duplicate-identical rows.)
    if (distanceOf(a.row) !== distanceOf(b.row)) return distanceOf(a.row) - distanceOf(b.row);
    const aDscr = a.row.isCashPurchase ? Number.POSITIVE_INFINITY : (a.row.dscr ?? Number.NEGATIVE_INFINITY);
    const bDscr = b.row.isCashPurchase ? Number.POSITIVE_INFINITY : (b.row.dscr ?? Number.NEGATIVE_INFINITY);
    if (aDscr !== bDscr) return bDscr - aDscr;
    const aCf = a.row.netCashFlowMonthly ?? Number.NEGATIVE_INFINITY;
    const bCf = b.row.netCashFlowMonthly ?? Number.NEGATIVE_INFINITY;
    if (aCf !== bCf) return bCf - aCf;
    const byAddress = a.row.input.address.localeCompare(b.row.input.address, "en-US", { sensitivity: "base" });
    return byAddress || a.index - b.index;
  });
  return keyed.map((k) => k.row);
}
