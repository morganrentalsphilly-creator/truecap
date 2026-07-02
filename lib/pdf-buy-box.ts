/**
 * Buy box → PDF verdict block (pure).
 *
 * Maps the owner's saved buy boxes + a deal's recomputed metrics into the
 * compact payload the Pro PDF's "Your buy box" card draws — the exact data
 * BuyBoxVerdictCard shows in the app (Meets/Misses headline, N/M criteria
 * met, the personal gap line, per-criterion actual-vs-target checks), so an
 * exported report can never disagree with the screen it came from.
 *
 * Pure + client-safe, like lib/buy-box.ts. All evaluation goes through the
 * canonical primitives (evaluateBuyBoxes / summarizeBuyBoxFit) — no
 * re-implemented threshold math. The server action
 * (getBuyBoxPdfVerdictAction in app/actions/saved-analyses.ts) owns the
 * RLS-scoped box read and calls this to shape the result.
 */

import {
  buyBoxHasCriteria,
  evaluateBuyBoxes,
  summarizeBuyBoxFit,
  type BuyBoxCheckId,
  type BuyBoxDealMetrics,
  type NamedBuyBox,
} from "@/lib/buy-box";

export type BuyBoxPdfCheck = {
  id: BuyBoxCheckId;
  label: string;
  /** ASCII-safe target ("≥"/"≤" → ">="/"<=") — see toWinAnsiSafe below. */
  target: string;
  actual: string;
  /** true = pass, false = fail, null = not applicable (skipped). */
  pass: boolean | null;
  /** Favor-aware distance to target, e.g. "0.8pp short". */
  gapText?: string;
};

export type BuyBoxPdfVerdict = {
  /** Name of the box detailed below (default-first, highest priority active box). */
  boxName: string;
  /** More than one active box was screened. */
  multi: boolean;
  /** Active boxes screened / how many the deal passes (the "meets N of M" rollup). */
  activeCount: number;
  passingCount: number;
  /** Overall verdict for the detailed (default) box. */
  passes: boolean;
  /** "Meets your buy box" / "Misses on X, Y" / "Can't evaluate on this deal yet". */
  headline: string;
  passedCount: number;
  applicableCount: number;
  /** The biggest-gap / tightest-margin sentence, ASCII-safe. */
  personalLine: string | null;
  checks: BuyBoxPdfCheck[];
};

/**
 * jsPDF's built-in Helvetica uses WinAnsi encoding, which has no glyphs for
 * "≥" / "≤" (they render as garbage in the PDF). The em dash and "…" the
 * template already uses ARE in WinAnsi, so only the comparison operators
 * need rewriting.
 */
function toWinAnsiSafe(s: string): string {
  return s.replace(/≥/g, ">=").replace(/≤/g, "<=");
}

/**
 * Build the "Your buy box" PDF block from the owner's boxes + the deal's
 * recomputed metrics. Mirrors BuyBoxVerdictCard's gating exactly: only
 * active boxes with ≥1 criterion count, the default box is detailed, and
 * null means "render no block" (the PDF stays byte-identical to a
 * no-buy-box export).
 */
export function buildBuyBoxPdfVerdict(
  boxes: NamedBuyBox[],
  metrics: BuyBoxDealMetrics
): BuyBoxPdfVerdict | null {
  const usable = boxes.filter((b) => b.isActive && buyBoxHasCriteria(b));
  if (usable.length === 0) return null;

  const results = evaluateBuyBoxes(usable, metrics).filter((r) => r.result.active);
  if (results.length === 0) return null;

  const summary = summarizeBuyBoxFit(results);
  // Detail the default box (evaluateBuyBoxes returns default-first).
  const primary = results[0]!;
  const r = primary.result;

  const headline = r.passes
    ? "Meets your buy box"
    : r.failedLabels.length > 0
      ? `Misses on ${r.failedLabels.join(", ")}`
      : "Can't evaluate on this deal yet";

  return {
    // Box names are free text (a box named "DSCR ≥ 1.2" is plausible) —
    // sanitize like every other string or jsPDF's WinAnsi Helvetica
    // renders garbled glyphs in the kicker.
    boxName: toWinAnsiSafe(primary.box.name),
    multi: results.length > 1,
    activeCount: summary.activeCount,
    passingCount: summary.passingCount,
    passes: r.passes,
    headline,
    passedCount: r.passedCount,
    applicableCount: r.checks.filter((c) => c.pass !== null).length,
    personalLine: r.personalLine ? toWinAnsiSafe(r.personalLine) : null,
    checks: r.checks.map((c) => ({
      id: c.id,
      label: c.label,
      target: toWinAnsiSafe(c.target),
      actual: c.actual,
      pass: c.pass,
      ...(c.gapText ? { gapText: c.gapText } : {}),
    })),
  };
}
