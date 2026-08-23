/**
 * Deal Q&A grounding context — the PERSONAL + ANALYTICAL layers.
 *
 * lib/deal-qa.ts builds the base "deal numbers" block (recomputed
 * server-side from the form values — the trust anchor). This module adds
 * the depth the audit flagged as missing: the user's buy-box evaluation,
 * the Max Allowable Offer ("your max offer") with its labeled basis, the
 * long-term projection headline, and pulled comps — all of which already
 * exist CLIENT-SIDE on the analysis dashboard. The client forwards them
 * (no new fetches), the server zod-validates the size-bounded block and
 * folds it into the prompt under clear section headers.
 *
 * Trust model: these sections are display-grade grounding depth, not a
 * security boundary. A tampered request could claim fake comps — the same
 * class of self-deception as typing a fake rent into the public form.
 * Auth / rate limits / entitlements are untouched by this layer; the
 * schema below only bounds SIZE so the prompt can't be ballooned.
 *
 * Pure module: no IO, client-safe (the mappers run in client components;
 * the text builder runs in the server actions). Unit-tested.
 */

import { z } from "zod";
import type { AnalysisResult } from "@/lib/calc-analysis";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import { buildDealQaContext } from "@/lib/deal-qa";
import type { BuyBoxFitSummary, NamedBuyBoxResult } from "@/lib/buy-box";
import type { PropertyEnrichment } from "@/lib/property-enrichment/rentcast";
import type { ReturnSummary } from "@/lib/returns";

// ── Zod schema (size-bounded; validated by the server actions) ────────

const shortText = (max: number) => z.string().trim().min(1).max(max);
const finite = z.number().finite();

export const dealQaBuyBoxContextSchema = z.object({
  /** Shown only with multiple boxes (matches the on-screen card). */
  boxName: shortText(80).optional(),
  passes: z.boolean(),
  /** e.g. "Misses the user's buy box on Cap rate". */
  headline: shortText(200),
  /** The card's number-carrying personal line (biggest gap / tightest margin). */
  personalLine: shortText(240).optional(),
  /** Multi-box rollup, e.g. "Deal meets 1 of 2 of the user's buy boxes". */
  summary: shortText(160).optional(),
  checks: z
    .array(
      z.object({
        label: shortText(40),
        target: shortText(60),
        actual: shortText(60),
        pass: z.boolean().nullable(),
        gapText: shortText(80).optional(),
      })
    )
    .max(10),
});

export const dealQaMaoContextSchema = z.object({
  maxOffer: finite.min(0),
  /** Labeled basis from describeMaoTarget, e.g. "break-even cash flow · DSCR ≥ 1.25". */
  basis: shortText(200),
  /** True when the basis came from the user's buy-box thresholds. */
  fromBuyBox: z.boolean(),
});

export const dealQaProjectionContextSchema = z.object({
  years: finite.min(1).max(50),
  totalProfit: finite,
  roiPct: finite.nullable().optional(),
  cagrPct: finite.nullable().optional(),
  irrPct: finite.nullable().optional(),
  equityMultiple: finite.nullable().optional(),
});

const qaCompSchema = z.object({
  address: shortText(140),
  /** Sale price (sale comps) or monthly rent (rent comps). */
  price: finite.min(0),
});

export const dealQaCompsContextSchema = z.object({
  valueEstimate: finite.nullable().optional(),
  valueLow: finite.nullable().optional(),
  valueHigh: finite.nullable().optional(),
  rentEstimate: finite.nullable().optional(),
  rentLow: finite.nullable().optional(),
  rentHigh: finite.nullable().optional(),
  listPrice: finite.nullable().optional(),
  listingStatus: shortText(40).nullable().optional(),
  saleComps: z.array(qaCompSchema).max(8),
  rentComps: z.array(qaCompSchema).max(8),
});

/** The optional context block the client forwards with a question/summary
 *  request. Every piece is optional — absent pieces are simply omitted. */
export const dealQaExtraContextSchema = z.object({
  buyBox: dealQaBuyBoxContextSchema.optional(),
  mao: dealQaMaoContextSchema.optional(),
  projection: dealQaProjectionContextSchema.optional(),
  comps: dealQaCompsContextSchema.optional(),
});

export type DealQaBuyBoxContext = z.infer<typeof dealQaBuyBoxContextSchema>;
export type DealQaMaoContext = z.infer<typeof dealQaMaoContextSchema>;
export type DealQaProjectionContext = z.infer<typeof dealQaProjectionContextSchema>;
export type DealQaCompsContext = z.infer<typeof dealQaCompsContextSchema>;
export type DealQaExtraContext = z.infer<typeof dealQaExtraContextSchema>;

// ── Client-side mappers (build the context from what's already in memory) ─

const clip = (s: string, max: number): string =>
  s.length > max ? `${s.slice(0, max - 1)}…` : s;

const fin = (n: number | null | undefined): number | null =>
  typeof n === "number" && Number.isFinite(n) ? n : null;

/** What BuyBoxVerdictCard reports up: the prompt-ready context plus the
 *  primary box's numeric thresholds (the canonical MAO basis — see
 *  lib/mao-targets). */
export type DealQaBuyBoxReport = {
  context: DealQaBuyBoxContext;
  maoThresholds: {
    minCapRatePct: number | null;
    minCocPct: number | null;
    minDscr: number | null;
    minCashFlowMonthly: number | null;
  };
};

/**
 * Compact buy-box context from the evaluation BuyBoxVerdictCard already
 * ran (results are priority-ordered, default box first — the same box the
 * card details on screen, so the AI and the UI can never disagree).
 */
export function buildBuyBoxQaReport(
  results: NamedBuyBoxResult[],
  summary: BuyBoxFitSummary
): DealQaBuyBoxReport | null {
  const primary = results[0];
  if (!primary || !primary.result.active) return null;
  const r = primary.result;
  const multi = results.length > 1;
  const headline = r.passes
    ? "Meets the user's buy box"
    : r.failedLabels.length > 0
      ? `Misses the user's buy box on ${r.failedLabels.join(", ")}`
      : "The user's buy box could not be evaluated on this deal";
  const boxName = primary.box.name.trim();
  return {
    context: {
      ...(multi && boxName ? { boxName: clip(boxName, 80) } : {}),
      passes: r.passes,
      headline: clip(headline, 200),
      ...(r.personalLine ? { personalLine: clip(r.personalLine, 240) } : {}),
      ...(multi
        ? {
            summary: clip(
              `Deal meets ${summary.passingCount} of ${summary.activeCount} of the user's buy boxes`,
              160
            ),
          }
        : {}),
      checks: r.checks.slice(0, 10).map((c) => ({
        label: clip(c.label, 40),
        target: clip(c.target, 60),
        actual: clip(c.actual, 60),
        pass: c.pass,
        ...(c.gapText ? { gapText: clip(c.gapText, 80) } : {}),
      })),
    },
    maoThresholds: {
      minCapRatePct: primary.box.minCapRatePct,
      minCocPct: primary.box.minCocPct,
      minDscr: primary.box.minDscr,
      minCashFlowMonthly: primary.box.minCashFlowMonthly,
    },
  };
}

/** Max comp entries forwarded per list — the prompt needs the range and a
 *  few anchors, not the whole set. */
const MAX_QA_COMPS = 5;

/** Compact comps context from the enrichment PropertyCompsCard is showing.
 *  Drops price-less entries and non-finite figures; null when there's
 *  nothing usable (so the piece is omitted rather than sent empty). */
export function buildCompsQaContext(e: PropertyEnrichment): DealQaCompsContext | null {
  const mapComps = (
    comps: PropertyEnrichment["saleComps"]
  ): DealQaCompsContext["saleComps"] =>
    (comps ?? [])
      .filter((c) => typeof c.address === "string" && c.address.trim().length > 0 && fin(c.price) != null)
      .slice(0, MAX_QA_COMPS)
      .map((c) => ({ address: clip(c.address.trim(), 140), price: c.price as number }));

  const ctx: DealQaCompsContext = {
    valueEstimate: fin(e.valueEstimate),
    valueLow: fin(e.valueRange?.low),
    valueHigh: fin(e.valueRange?.high),
    rentEstimate: fin(e.rentEstimate),
    rentLow: fin(e.rentRange?.low),
    rentHigh: fin(e.rentRange?.high),
    listPrice: fin(e.listPrice),
    listingStatus:
      typeof e.listingStatus === "string" && e.listingStatus.trim()
        ? clip(e.listingStatus.trim(), 40)
        : null,
    saleComps: mapComps(e.saleComps),
    rentComps: mapComps(e.rentComps),
  };
  const hasAnything =
    ctx.valueEstimate != null ||
    ctx.rentEstimate != null ||
    ctx.listPrice != null ||
    ctx.saleComps.length > 0 ||
    ctx.rentComps.length > 0;
  return hasAnything ? ctx : null;
}

/** Projection headline from the exit-scenario return summary the dashboard
 *  already computes (lib/returns). Null when the summary can't anchor. */
export function buildProjectionQaContext(
  s: ReturnSummary | null
): DealQaProjectionContext | null {
  if (!s) return null;
  if (fin(s.years) == null || s.years < 1 || fin(s.totalProfit) == null) return null;
  return {
    years: Math.min(s.years, 50),
    totalProfit: s.totalProfit,
    roiPct: fin(s.roiPct),
    cagrPct: fin(s.cagrPct),
    irrPct: fin(s.irrPct),
    equityMultiple: fin(s.equityMultiple),
  };
}

// ── Prompt text builder (runs in the server actions) ──────────────────

/** ~2k tokens. Comp LISTS are trimmed to fit; buy-box / MAO / projection
 *  lines never are (the personal context is the point of the feature). */
export const DEAL_QA_CONTEXT_MAX_CHARS = 8_000;

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const pct1 = (n: number) => `${n.toFixed(1)}%`;

function rangeText(low: number | null | undefined, high: number | null | undefined, suffix = ""): string {
  const l = fin(low);
  const h = fin(high);
  if (l == null && h == null) return "";
  return ` (range ${l == null ? "—" : money(l)}–${h == null ? "—" : money(h)}${suffix})`;
}

function buyBoxSection(b: DealQaBuyBoxContext): string {
  const lines = [
    "YOUR BUY BOX (the user's saved acquisition criteria, evaluated against this deal):",
    `Verdict: ${b.headline}${b.boxName ? ` (box: "${b.boxName}")` : ""}`,
  ];
  if (b.summary) lines.push(b.summary);
  if (b.personalLine) lines.push(b.personalLine);
  for (const c of b.checks) {
    const status = c.pass === true ? "PASS" : c.pass === false ? "FAIL" : "N/A";
    lines.push(`- ${c.label}: ${c.actual} vs target ${c.target} — ${status}${c.gapText ? ` (${c.gapText})` : ""}`);
  }
  return lines.join("\n");
}

function maoSection(m: DealQaMaoContext): string {
  return [
    "YOUR MAX ALLOWABLE OFFER (the user's price ceiling for this deal):",
    `Price ceiling: ${money(m.maxOffer)} — the highest price that still hits: ${m.basis}${
      m.fromBuyBox ? " (targets from the user's buy box)" : " (TrueCap's default floor)"
    }.`,
    "Calculated from your selected targets. This is not a recommended offer.",
    "Compare it to the purchase price in THE DEAL to judge whether the asking price is above or below the user's price ceiling.",
  ].join("\n");
}

function projectionSection(p: DealQaProjectionContext): string {
  const parts = [`Modeled hold: ${Math.round(p.years)} years`, `Total profit: ${money(p.totalProfit)}`];
  const roi = fin(p.roiPct);
  if (roi != null) parts.push(`Total ROI: ${roi >= 0 ? "+" : ""}${Math.round(roi)}% (cumulative, not annual)`);
  const cagr = fin(p.cagrPct);
  if (cagr != null) parts.push(`Annualized return (CAGR): ${pct1(cagr)}`);
  const irr = fin(p.irrPct);
  if (irr != null) parts.push(`IRR: ${pct1(irr)}`);
  const em = fin(p.equityMultiple);
  if (em != null) parts.push(`Equity multiple: ${em.toFixed(2)}x`);
  return `${Math.round(p.years)}-YEAR PROJECTION (modeled hold + sale, same engine as the exit scenarios):\n${parts.join(" · ")}`;
}

function compsSection(c: DealQaCompsContext, maxComps: number): string {
  const lines = ["PULLED COMPS (RentCast — the user ran comps on this address):"];
  const ve = fin(c.valueEstimate);
  if (ve != null) lines.push(`Estimated value: ${money(ve)}${rangeText(c.valueLow, c.valueHigh)}`);
  const re = fin(c.rentEstimate);
  if (re != null) lines.push(`Estimated market rent: ${money(re)}/mo${rangeText(c.rentLow, c.rentHigh, "/mo")}`);
  const lp = fin(c.listPrice);
  if (lp != null) lines.push(`Active listing (asking) price: ${money(lp)}${c.listingStatus ? ` (${c.listingStatus})` : ""}`);
  const sale = c.saleComps.filter((x) => fin(x.price) != null).slice(0, maxComps);
  if (sale.length > 0) {
    lines.push("Sale comps:");
    for (const s of sale) lines.push(`- ${s.address}: ${money(s.price)}`);
    if (c.saleComps.length > sale.length) lines.push(`(+${c.saleComps.length - sale.length} more sale comps omitted)`);
  }
  const rent = c.rentComps.filter((x) => fin(x.price) != null).slice(0, maxComps);
  if (rent.length > 0) {
    lines.push("Rent comps:");
    for (const r of rent) lines.push(`- ${r.address}: ${money(r.price)}/mo`);
    if (c.rentComps.length > rent.length) lines.push(`(+${c.rentComps.length - rent.length} more rent comps omitted)`);
  }
  // Header-only means every figure was non-finite — treat as nothing to say.
  return lines.length > 1 ? lines.join("\n") : "";
}

/**
 * Full grounding block: the base deal numbers (recomputed server-side)
 * plus whichever personal/analytical sections the client forwarded, plus
 * an explicit NOT-PROVIDED note so the model says "run comps to answer
 * that" instead of guessing. Deterministic, capped at ~2k tokens — comp
 * list entries are dropped first; buy-box / MAO / projection lines never.
 */
export function buildGroundedDealContext(
  values: InvestmentFormValues,
  result: AnalysisResult,
  extra?: DealQaExtraContext | null,
  opts?: { maxChars?: number }
): string {
  const maxChars = opts?.maxChars ?? DEAL_QA_CONTEXT_MAX_CHARS;

  // Effective availability — a piece with no usable finite numbers counts
  // as absent so NaN/garbage can never leak into the prompt text.
  const buyBox = extra?.buyBox ?? null;
  const mao = extra?.mao && fin(extra.mao.maxOffer) != null ? extra.mao : null;
  const projection =
    extra?.projection && fin(extra.projection.years) != null && fin(extra.projection.totalProfit) != null
      ? extra.projection
      : null;
  const comps = extra?.comps ?? null;

  const base = `THE DEAL (computed by TrueCap's calculator from the user's inputs):\n${buildDealQaContext(values, result)}`;

  const assemble = (maxComps: number): string => {
    const sections = [base];
    if (buyBox) sections.push(buyBoxSection(buyBox));
    if (mao) sections.push(maoSection(mao));
    if (projection) sections.push(projectionSection(projection));
    let compsIncluded = false;
    if (comps) {
      const section = compsSection(comps, maxComps);
      if (section) {
        sections.push(section);
        compsIncluded = true;
      }
    }
    const missing: string[] = [];
    if (!buyBox) missing.push("buy box fit (the user has no active buy box evaluated on this deal — they can set one up in Settings)");
    if (!mao) missing.push('max allowable offer ("your max offer" — available in the Stress Test tab)');
    if (!projection) missing.push("long-term projection / exit returns");
    if (!compsIncluded) missing.push('sale & rent comps (the user has not run comps — the "Run comps" button on the analysis pulls them)');
    if (missing.length > 0) {
      sections.push(
        `NOT PROVIDED for this deal (if asked about these, say the data isn't available and how to get it — NEVER estimate it): ${missing.join("; ")}.`
      );
    }
    return sections.join("\n\n");
  };

  let maxComps = Math.max(comps?.saleComps.length ?? 0, comps?.rentComps.length ?? 0);
  let text = assemble(maxComps);
  while (text.length > maxChars && maxComps > 0) {
    maxComps -= 1;
    text = assemble(maxComps);
  }
  return text;
}
