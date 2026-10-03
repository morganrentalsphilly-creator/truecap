/**
 * scripts/render-pdf-cover-shot.ts: the picture under "What your client
 * receives" on the homepage and /for-agents.
 *
 *   npx -y tsx scripts/render-pdf-cover-shot.ts
 *
 * It renders the real PDF report (lib/pdf-generator.ts, the generator behind
 * Export PDF) for THE sample deal (lib/sample-deal.ts), with the sample
 * targets, no branding and no person, exactly as the server action builds a
 * report: buildCanonicalReportData, then generateInvestmentPDFBlob. Page 1 is
 * rasterised with poppler's `pdftoppm` (brew install poppler) and written to
 * public/product/pdf-cover.webp at 1240 px wide. Nothing is drawn, cropped or
 * retouched: the image is the cover page as the PDF renders it.
 *
 * Run it from the repository root (the generator reads the logo from
 * public/). No server, no database and no network are involved. Re-run it
 * whenever the cover's layout or the sample deal changes, and update the
 * width and height in components/marketing/client-pdf-cover.tsx if the page
 * size changes.
 *
 * The PDF's date is pinned to the sample deal's analysis date so a re-run
 * with unchanged code produces the same page.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";

import {
  SAMPLE_DEAL_ANALYSIS_DATE,
  SAMPLE_DEAL_MAO_TARGET,
  SAMPLE_DEAL_TARGET_PROFILE,
  SAMPLE_DEAL_VALUES,
} from "@/lib/sample-deal";

const OUT = path.resolve("public/product/pdf-cover.webp");
/** Twice the widest layout slot (the homepage column is 480 CSS px). */
const WIDTH = 1240;

async function main() {
  const { buildCanonicalReportData } = await import("@/lib/report-data-builder");
  const { generateInvestmentPDFBlob } = await import("@/lib/pdf-generator");

  const report = buildCanonicalReportData({
    values: SAMPLE_DEAL_VALUES,
    maxOfferTarget: SAMPLE_DEAL_MAO_TARGET,
    maxOfferTargetSource: SAMPLE_DEAL_TARGET_PROFILE.source,
    generatedAt: new Date(`${SAMPLE_DEAL_ANALYSIS_DATE}T12:00:00.000Z`),
  });
  // No branding and the default "personal" mode: the unbranded export.
  const blob = await generateInvestmentPDFBlob(report, null, "personal");
  const pdf = Buffer.from(await blob.arrayBuffer());

  const work = mkdtempSync(path.join(tmpdir(), "pdf-cover-"));
  try {
    const pdfPath = path.join(work, "sample-report.pdf");
    writeFileSync(pdfPath, pdf);
    // Page 1 only, as one PNG, scaled to the target width.
    execFileSync("pdftoppm", [
      "-png",
      "-f", "1",
      "-l", "1",
      "-singlefile",
      "-scale-to-x", String(WIDTH),
      "-scale-to-y", "-1",
      pdfPath,
      path.join(work, "cover"),
    ]);
    const png = readFileSync(path.join(work, "cover.png"));
    const webp = await sharp(png).webp({ quality: 90, effort: 6 }).toBuffer();
    const meta = await sharp(webp).metadata();
    writeFileSync(OUT, webp);
    console.log(
      `wrote ${path.relative(process.cwd(), OUT)}: ${meta.width}x${meta.height}, ${(webp.length / 1024).toFixed(1)} KB (PDF ${(pdf.length / 1024).toFixed(1)} KB)`,
    );
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
