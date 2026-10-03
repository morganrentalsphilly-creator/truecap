import { readFileSync } from "node:fs";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import { DISCLAIMER_TEXT } from "@/components/marketing/disclaimer";
import {
  generateInvestmentPDFBlob,
  PDF_DISCLAIMER_TEXT,
  type BrandingConfig,
} from "@/lib/pdf-generator";
import { buildCanonicalReportData } from "@/lib/report-data-builder";
import { SAMPLE_DEAL_MAO_TARGET, SAMPLE_DEAL_VALUES } from "@/lib/sample-deal";

/**
 * The PDF's last-page Disclaimer and its links back to TrueCap
 * (2026-10 go-to-market audit, rows P2-66 and P2-142).
 *
 * The report printed its own Disclaimer paragraph, which never said the
 * report is not an appraisal or a lender decision, and it carried no link:
 * the unbranded footer credit was drawn text and a branded report pointed
 * nowhere. The report is rendered here from the sample deal and read back.
 */

const SITE = "https://usetruecap.com";
const METHODOLOGY = `${SITE}/methodology`;

const BRANDING: BrandingConfig = {
  companyName: "Sample Realty",
  contactName: "Sample Agent",
  contactEmail: "agent@example.com",
  contactPhone: "555-0100",
  contactWebsite: "example.com",
  logoUrl: null,
  primaryColorHex: "#225544",
  tagline: "Sample tagline",
};

async function render(branding: BrandingConfig | null) {
  const report = buildCanonicalReportData({
    values: SAMPLE_DEAL_VALUES,
    maxOfferTarget: SAMPLE_DEAL_MAO_TARGET,
    maxOfferTargetSource: "selected-targets",
    generatedAt: new Date("2026-08-25T12:00:00.000Z"),
  });
  const blob = await generateInvestmentPDFBlob(report, branding, "personal");
  const bytes = Buffer.from(await blob.arrayBuffer());
  const raw = bytes.toString("latin1");
  const chunks: string[] = [];
  const streams = /stream\r?\n/g;
  let match: RegExpExecArray | null;
  while ((match = streams.exec(raw)) !== null) {
    const start = match.index + match[0].length;
    const end = raw.indexOf("endstream", start);
    if (end < 0) break;
    try {
      chunks.push(inflateSync(bytes.subarray(start, end)).toString("latin1"));
    } catch {
      // Not a Flate stream (an image): no page text in it.
    }
  }
  // Every text run, in drawing order, joined so a wrapped paragraph reads as
  // one string again.
  const text = [...chunks.join("\n").matchAll(/\((.*?)(?<!\\)\) Tj/g)]
    .map((run) => run[1]!.replace(/\\([()\\])/g, "$1"))
    .join(" ")
    .replace(/\s+/g, " ");
  // Link annotations are plain dictionaries outside the page streams.
  const links = [...raw.matchAll(/\/URI \((.*?)\)/g)].map((link) => link[1]!);
  return { text, links };
}

describe("the PDF's Disclaimer", () => {
  it("is the site's Disclaimer, byte for byte", () => {
    expect(PDF_DISCLAIMER_TEXT).toBe(DISCLAIMER_TEXT);
  });

  it("is printed on the report in place of the report's own paragraph", async () => {
    const { text } = await render(null);
    expect(text).toContain(PDF_DISCLAIMER_TEXT);
    expect(text).toContain("It is not an appraisal, a lender decision, or investment advice.");
    expect(text).not.toContain("This report is provided for informational purposes only");
    const source = readFileSync(join(process.cwd(), "lib/pdf-generator.ts"), "utf8");
    expect(source).not.toContain("for informational purposes only");
  });
});

describe("the PDF's links back to TrueCap", () => {
  it("links the methodology line and the Disclaimer's Methodology on an unbranded report, and the credit on every page", async () => {
    const { text, links } = await render(null);
    expect(text).toContain("Made with TrueCap");
    expect(links.filter((url) => url === METHODOLOGY)).toHaveLength(2);
    // The cover's "usetruecap.com" and the footer credit of each later page.
    const pages = Number(/Page \d+ of (\d+)/.exec(text)?.[1]);
    expect(pages).toBeGreaterThan(1);
    expect(links.filter((url) => url === SITE)).toHaveLength(pages);
    expect(links.every((url) => url === SITE || url === METHODOLOGY)).toBe(true);
  });

  it("keeps the methodology links on a branded report and adds no TrueCap credit link", async () => {
    const { text, links } = await render(BRANDING);
    expect(text).not.toContain("Made with TrueCap");
    expect(text).toContain("Sample Realty");
    expect(links).toEqual([METHODOLOGY, METHODOLOGY]);
  });
});
