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
//   3 - Premium pass: dedicated cover page ("The Bottom Line" verdict +
//       deal-score gauge + headline numbers), visual deal-score gauge,
//       chart data-ink (endpoint labels + $0 reference lines), and an
//       Assumptions & Disclosures closing page.
//   4 - Model correction: NOI/cap rate/DSCR now exclude the CapEx reserve,
//       and PMI is modeled on sub-20%-down loans — so cached PDFs must
//       regenerate to match the corrected headline numbers.
export const PDF_SNAPSHOT_VERSION = 4;
export const ANALYSIS_PDF_BUCKET = "analysis-pdfs";

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
