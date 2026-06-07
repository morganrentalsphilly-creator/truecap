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
