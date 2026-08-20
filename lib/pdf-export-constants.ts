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
//   6 - Trust-language pass: versioned underwriting-standard stamp plus
//       explicit HUD/FRED, illustrative-tax, and modeled-exit disclosures.
//   7 - The report itself changed shape, so every cached copy is now stale:
//       charts became jsPDF vectors instead of chart.js rasters, a Year 1
//       Operating Statement block was added to the inputs page, the comps
//       table gained a $/sqft column and a RentCast pull date, the verdict
//       panels were renamed to one label, and document metadata was set.
//       Without this bump a Pro user re-exporting a previously-cached deal
//       would keep receiving the OLD document — no charts changes, no
//       operating statement — with no way to tell it was stale.
//
// NOT bumped for the July 2026 "Your buy box" block: that block renders
// ONLY for users with an active buy box, and those users' exports bypass
// the PDF cache entirely (read-time bypass in
// getSavedAnalysisPdfExportAction, mirroring the branding bypass) while
// block-carrying PDFs are stored uncacheable (see
// PDF_CACHE_VERSION_UNCACHEABLE). Box-less users' PDFs stay byte-identical,
// so flushing their caches with a bump would be pure regeneration waste.
export const PDF_SNAPSHOT_VERSION = 7;
export const ANALYSIS_PDF_BUCKET = "analysis-pdfs";

/**
 * TTL for the signed download URL minted for a cached PDF. The bucket is
 * PRIVATE (migration 20260802120000) — it used to be public, which made every
 * user's underwrite anonymously listable and downloadable. Long enough for a
 * click-to-download round trip on a slow connection, short enough that a URL
 * leaked through history / a shared screenshot dies quickly.
 */
export const ANALYSIS_PDF_SIGNED_URL_TTL_SECONDS = 120;

/**
 * THE object path for a cached export. Single source of truth — the client
 * uploads to exactly this path and the server re-derives it when it records
 * the export, so no caller ever hands a storage path across the wire (a
 * client-supplied path is a write-anywhere primitive waiting to happen).
 *
 * The first segment MUST be the owner's user id: every `analysis-pdfs` RLS
 * policy is a `(storage.foldername(name))[1] = auth.uid()::text` check.
 * The version is embedded so an engine/template bump writes a NEW object
 * instead of upserting over the old one (a CDN-cached copy of the old path
 * can never be re-served as the "fresh" PDF).
 */
export function buildAnalysisPdfObjectPath(
  userId: string,
  analysisId: string,
  cacheVersion: number
): string {
  return `${userId}/${analysisId}/investment-analysis-v${cacheVersion}.pdf`;
}

/**
 * Normalize whatever `saved_analyses.pdf_url` holds into an owner-scoped
 * storage OBJECT PATH, or null if it can't be trusted.
 *
 * Two shapes exist in the column:
 *   - new rows: the bare object path (`<user_id>/<analysis_id>/…​.pdf`);
 *   - legacy rows: a full public URL, from back when the bucket was public
 *     (`https://<ref>.supabase.co/storage/v1/object/public/analysis-pdfs/…`).
 * Legacy rows are parsed back to the path so applying the private-bucket
 * migration doesn't invalidate everyone's cached export.
 *
 * Returns null — i.e. "regenerate" — rather than throwing for anything
 * suspicious: a foreign host's URL, a different bucket, path traversal, or a
 * first segment that isn't `userId`. That last check is the important one:
 * it means a tampered/mis-migrated row can never be used to mint a signed URL
 * for another tenant's object.
 */
export function resolveAnalysisPdfObjectPath(
  stored: string | null | undefined,
  userId: string
): string | null {
  if (!stored || !userId) return null;

  let candidate = stored.trim();
  if (!candidate) return null;

  if (/^https?:\/\//i.test(candidate)) {
    let pathname: string;
    try {
      pathname = new URL(candidate).pathname;
    } catch {
      return null;
    }
    // Both the legacy public shape (/object/public/<bucket>/…) and the signed
    // shape (/object/sign/<bucket>/…) contain the bucket segment; anything
    // that doesn't name this bucket is not ours to sign.
    const marker = `/${ANALYSIS_PDF_BUCKET}/`;
    const at = pathname.indexOf(marker);
    if (at === -1) return null;
    candidate = pathname.slice(at + marker.length);
    try {
      candidate = decodeURIComponent(candidate);
    } catch {
      return null;
    }
  }

  candidate = candidate.replace(/^\/+/, "");
  if (!candidate) return null;

  const segments = candidate.split("/");
  if (segments.length < 2) return null;
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    return null;
  }
  if (segments[0] !== userId) return null;

  return candidate;
}

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
  { id: "personal", label: "Personal", description: "Full report — cash flow, projection, illustrative tax impact, and modeled exit comparisons." },
  { id: "lender", label: "Lender", description: "Debt-service focus — performance, property, and the 10-year projection. Excludes personal tax and modeled exits." },
  { id: "partner", label: "Partner", description: "Returns focus — performance, projection, and modeled exit comparisons. Excludes personal tax." },
  { id: "agent", label: "Agent / client", description: "Client-facing returns summary to send branded to a buyer — performance, projection, and modeled exit comparisons. Excludes personal tax." },
];
