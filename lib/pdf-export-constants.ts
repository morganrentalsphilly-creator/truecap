import { EXIT_SCENARIOS_SNAPSHOT_VERSION } from "@/lib/exit-scenarios";
import { INVESTCALC_SCHEMA_VERSION } from "@/lib/investcalc-schema";
import { TAX_STRATEGY_SNAPSHOT_VERSION } from "@/lib/tax-strategy";
import { TEN_YEAR_PROJECTION_SNAPSHOT_VERSION } from "@/lib/ten-year-projections";

// Bump this version whenever the PDF TEMPLATE changes so cached
// snapshots (in the analysis-pdfs storage bucket) are invalidated
// and regenerated on the next export. Engine (math) changes are
// handled automatically by PDF_CACHE_VERSION below — do NOT bump
// this constant for a calc fix.
//
// History:
//   1 - Original template
//   2 - Custom branding + redesigned cover header + brand color
//       throughout + removed Section N kickers + refined hero panel.
//       Anything cached at v1 looks dramatically different from a
//       fresh export, so this bump is mandatory.
//   3 - Premium pass: dedicated cover page ("The Bottom Line" verdict +
//       deal-score gauge + headline numbers), visual deal-score gauge,
//       chart data-ink (endpoint labels + $0 reference lines), and an
//       Assumptions & Disclosures closing page.
//   4 - Model correction: NOI/cap rate/DSCR now exclude the CapEx reserve,
//       and PMI is modeled on sub-20%-down loans — so cached PDFs must
//       regenerate to match the corrected headline numbers.
//   5 - Invalidate PDFs cached before the after-tax / CapEx-taxable engine
//       corrections (af2e80f after-tax projection + FHA PMI, eff3a96 CapEx
//       out of taxable income). Those bumped the in-app panel snapshot
//       versions but not this constant, so cached PDFs kept re-serving
//       over-sheltered after-tax numbers the dashboard no longer shows.
//
// NOT bumped for the July 2026 "Your buy box" block: that block renders
// ONLY for users with an active buy box, and those users' exports bypass
// the PDF cache entirely (read-time bypass in
// getSavedAnalysisPdfExportAction, mirroring the branding bypass) while
// block-carrying PDFs are stored uncacheable (see
// PDF_CACHE_VERSION_UNCACHEABLE). Box-less users' PDFs stay byte-identical,
// so flushing their caches with a bump would be pure regeneration waste.
export const PDF_SNAPSHOT_VERSION = 5;
export const ANALYSIS_PDF_BUCKET = "analysis-pdfs";

/**
 * Sentinel stored in `pdf_snapshot_version` for PDFs that must never be
 * served from the cache again. Used for exports that carried the owner's
 * "Your buy box" block: the block reflects buy-box state at generation
 * time, which the version composite can't see — if the user later deletes
 * their last box (or loses the entitlement), a version-matched cached PDF
 * would keep re-serving the stale block. Storing 0 (never equal to the
 * composite PDF_CACHE_VERSION, which is >= RADIX^4 whenever
 * PDF_SNAPSHOT_VERSION >= 1) guarantees regeneration. The complementary
 * case — box EDITS while boxes exist — is handled at read time:
 * getSavedAnalysisPdfExportAction bypasses the cache entirely while the
 * user has a usable buy box (same pattern as the branding bypass).
 */
export const PDF_CACHE_VERSION_UNCACHEABLE = 0;

/**
 * Each component version must stay within [0, RADIX). The build fails loudly
 * (module-load throw in `encodePdfCacheVersion`) if one ever grows past it,
 * rather than silently colliding two distinct version tuples.
 */
const PDF_CACHE_VERSION_RADIX = 50;

/**
 * Pack the template + engine snapshot versions into ONE integer, positional
 * base-50. Pure + deterministic so the composite is stable across server and
 * client bundles. Max possible value (all components at 49) is ~312.5M —
 * comfortably inside Postgres `integer` (the pdf_snapshot_version column).
 */
export function encodePdfCacheVersion(versions: readonly number[]): number {
  return versions.reduce((acc, v) => {
    if (!Number.isInteger(v) || v < 0 || v >= PDF_CACHE_VERSION_RADIX) {
      throw new Error(`PDF cache version component out of range [0, ${PDF_CACHE_VERSION_RADIX}): ${v}`);
    }
    return acc * PDF_CACHE_VERSION_RADIX + v;
  }, 0);
}

/**
 * The version actually stored in / compared against the numeric
 * `pdf_snapshot_version` column. A composite of the template version AND every
 * engine snapshot version that feeds the PDF's numbers, so a future engine
 * correction (which already bumps its own snapshot constant for the in-app
 * panels) auto-invalidates cached PDFs too — no one has to remember a manual
 * PDF bump (it was forgotten twice: af2e80f and eff3a96).
 *
 * Legacy rows hold the old plain template version (0-4). Those can never equal
 * this composite (>= RADIX^4 whenever PDF_SNAPSHOT_VERSION >= 1), so every
 * legacy cached PDF is treated as stale and regenerates on next export —
 * exactly the one-time flush the v5 bump wants. No migration needed.
 */
export const PDF_CACHE_VERSION = encodePdfCacheVersion([
  PDF_SNAPSHOT_VERSION,
  INVESTCALC_SCHEMA_VERSION,
  TEN_YEAR_PROJECTION_SNAPSHOT_VERSION,
  TAX_STRATEGY_SNAPSHOT_VERSION,
  EXIT_SCENARIOS_SNAPSHOT_VERSION,
]);

/**
 * Report modes — who the PDF is for. Each tailors which sections appear:
 *   - personal: the full report (cash flow, projection, tax strategy, exit).
 *   - lender:   debt-service focus — performance, property, 10-yr projection.
 *               Drops personal tax strategy + speculative exit scenarios.
 *   - partner:  returns focus — performance, projection, exit scenarios.
 *               Drops personal tax strategy.
 *   - agent:    client-facing returns summary — same sections as partner,
 *               meant to be sent branded (your logo/color/contact) to a buyer
 *               client. Drops personal tax.
 */
export type ReportMode = "personal" | "lender" | "partner" | "agent";

export const REPORT_MODES: ReadonlyArray<{ id: ReportMode; label: string; description: string }> = [
  { id: "personal", label: "Personal", description: "Full report — cash flow, projection, tax strategy, and exit scenarios." },
  { id: "lender", label: "Lender", description: "Debt-service focus — performance, property, and the 10-year projection. No personal tax or exit speculation." },
  { id: "partner", label: "Partner", description: "Returns focus — performance, projection, and exit scenarios. No personal tax." },
  { id: "agent", label: "Agent / client", description: "Client-facing returns summary to send branded to a buyer — performance, projection, and exit scenarios. No personal tax." },
];
