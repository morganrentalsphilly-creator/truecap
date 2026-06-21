// Bump this version whenever the PDF template changes so cached
// snapshots (in the analysis-pdfs storage bucket) are invalidated
// and regenerated on the next export.
//
// History:
//   1 - Original template
//   2 - Custom branding + redesigned cover header + brand color
//       throughout + removed Section N kickers + refined hero panel.
//       Anything cached at v1 looks dramatically different from a
//       fresh export, so this bump is mandatory.
export const PDF_SNAPSHOT_VERSION = 2;
export const ANALYSIS_PDF_BUCKET = "analysis-pdfs";

/**
 * Report modes — who the PDF is for. Each tailors which sections appear:
 *   - personal: the full report (cash flow, projection, tax strategy, exit).
 *   - lender:   debt-service focus — performance, property, 10-yr projection.
 *               Drops personal tax strategy + speculative exit scenarios.
 *   - partner:  returns focus — performance, projection, exit scenarios.
 *               Drops personal tax strategy.
 */
export type ReportMode = "personal" | "lender" | "partner";

export const REPORT_MODES: ReadonlyArray<{ id: ReportMode; label: string; description: string }> = [
  { id: "personal", label: "Personal", description: "Full report — cash flow, projection, tax strategy, and exit scenarios." },
  { id: "lender", label: "Lender", description: "Debt-service focus — performance, property, and the 10-year projection. No personal tax or exit speculation." },
  { id: "partner", label: "Partner", description: "Returns focus — performance, projection, and exit scenarios. No personal tax." },
];
