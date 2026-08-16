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
import { defaultValues } from "@/lib/investcalc-schema";
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

/** Assumption overrides the server action fills from enrichment (rate / tax). */
export interface TriageEnrichment {
  interestRate?: number;
  propertyTaxPct?: number;
}

export interface TriageRowResult {
  input: TriageListingInput;
  /** False when the inputs don't produce a valid underwrite. */
  ok: boolean;
  score: number | null;
  recommendation: DealRecommendation | null;
  netCashFlowMonthly: number | null;
  cocReturnPct: number | null;
  capRatePct: number | null;
  dscr: number | null;
  isCashPurchase: boolean;
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
  const rows: TriageListingInput[] = [];
  const errors: TriageParseError[] = [];
  const lines = (text ?? "").split(/\r?\n/);

  lines.forEach((rawLine, i) => {
    const line = rawLine.trim();
    if (line === "") return;
    const lineNo = i + 1;

    let cells: string[];
    if (line.includes("\t")) cells = line.split("\t");
    else if (line.includes("|")) cells = line.split("|");
    else {
      // Comma mode: peel the trailing bare-number run (price/rent/beds) off
      // the right; the rest (which may contain commas) is the address.
      const parts = line.split(",").map((p) => p.trim());
      let cut = parts.length;
      while (cut > 0 && isBareNumber(parts[cut - 1]!)) cut--;
      const numeric = parts.slice(cut);
      // Need at least the price; too many trailing numbers is ambiguous.
      if (numeric.length === 0 || numeric.length > 3) {
        errors.push({ line: lineNo, raw: line, reason: "Couldn't read address + price. Use: Address, Price, Rent, Beds." });
        return;
      }
      cells = [parts.slice(0, cut).join(", "), ...numeric];
    }

    cells = cells.map((c) => c.trim());
    const address = (cells[0] ?? "").trim();
    const price = parseMoney(cells[1] ?? "");
    const rent = cells[2] != null && cells[2] !== "" ? parseMoney(cells[2]) : undefined;
    const bedsRaw = cells[3] != null && cells[3] !== "" ? parseMoney(cells[3]) : undefined;

    if (address.length < 5) {
      errors.push({ line: lineNo, raw: line, reason: "Address must be at least 5 characters." });
      return;
    }
    if (price == null || price < 1000) {
      errors.push({ line: lineNo, raw: line, reason: "Enter a purchase price (e.g. 265000)." });
      return;
    }

    const row: TriageListingInput = { address, purchasePrice: Math.round(price) };
    if (rent != null && rent >= 0) row.monthlyRent = Math.round(rent);
    if (bedsRaw != null && bedsRaw >= 0 && bedsRaw <= 20) row.bedrooms = Math.round(bedsRaw);
    rows.push(row);
  });

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

const EMPTY_ROW = (input: TriageListingInput): TriageRowResult => ({
  input,
  ok: false,
  score: null,
  recommendation: null,
  netCashFlowMonthly: null,
  cocReturnPct: null,
  capRatePct: null,
  dscr: null,
  isCashPurchase: false,
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
  const snapshot = buildTriageSnapshot(input, opts?.enrichment);
  const verdict = recomputeSavedDealVerdict(snapshot);
  if (!verdict) return EMPTY_ROW(input);

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

  return {
    input,
    ok: true,
    score: verdict.score,
    recommendation: verdict.recommendation,
    netCashFlowMonthly: verdict.netCashFlowMonthly,
    cocReturnPct: verdict.cocReturnPct,
    capRatePct: verdict.capRatePct,
    dscr: verdict.dscr,
    isCashPurchase: verdict.isCashPurchase,
    buyBoxFit,
  };
}

// ── Ranking ──────────────────────────────────────────────────────────────────

/**
 * Rank the shortlist. Unscored (ok:false) rows always sink to the bottom.
 * "fit" leads with buy-box passers, then score — the "which of these meet MY
 * criteria" shortlist; "score" and "cashFlow" are the generic power sorts.
 * Stable within equal keys (a stable input order is preserved).
 */
export function rankTriageRows(rows: TriageRowResult[], sort: TriageSort): TriageRowResult[] {
  const keyed = rows.map((row, index) => ({ row, index }));
  const scoreOf = (r: TriageRowResult) => r.score ?? Number.NEGATIVE_INFINITY;
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
    return a.index - b.index; // stable
  });
  return keyed.map((k) => k.row);
}
