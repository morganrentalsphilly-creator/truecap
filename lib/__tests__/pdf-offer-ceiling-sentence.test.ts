import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import { DEFAULT_MAO_TARGET } from "@/lib/mao-targets";
import {
  generateInvestmentPDFBlob,
  offerCeilingTargetsPhrase,
  type ReportData,
} from "@/lib/pdf-generator";
import { buildCanonicalReportData } from "@/lib/report-data-builder";
import { SAMPLE_DEAL_MAO_TARGET, SAMPLE_DEAL_VALUES } from "@/lib/sample-deal";

/**
 * The Offer Ceiling sentence on the PDF cover and on page 2.
 *
 * `maxOffer.sourceLabel` is a line opener ("Under your selected targets").
 * The report spliced it after "meets" and printed "The highest price that
 * still meets Under your selected targets under the assumptions shown."
 * twice in every export with a solved ceiling. `npm run pdf:check` cannot see
 * it: its fixture carries no source label. So this renders the real report
 * for each source that reaches a PDF and reads the text back out of the file.
 */

const NOW = new Date("2026-08-23T12:00:00.000Z");

/** Every text run drawn in the PDF, with jsPDF's page streams inflated. */
async function drawnText(report: ReportData): Promise<string> {
  const blob = await generateInvestmentPDFBlob(report);
  const bytes = Buffer.from(await blob.arrayBuffer());
  const raw = bytes.toString("latin1");
  const chunks: string[] = [];
  const streams = /stream\r?\n/g;
  let match: RegExpExecArray | null;
  while ((match = streams.exec(raw)) !== null) {
    const start = match.index + match[0].length;
    const end = raw.indexOf("endstream", start);
    if (end < 0) break;
    const body = bytes.subarray(start, end);
    try {
      chunks.push(inflateSync(body).toString("latin1"));
    } catch {
      // Not a Flate stream (an image or a font program): no page text in it.
    }
  }
  // Text is written as (…) Tj; unescape the three characters jsPDF escapes.
  return chunks
    .join("\n")
    .replace(/\\([()\\])/g, "$1");
}

function report(source: "selected-targets" | "starter-criteria"): ReportData {
  return buildCanonicalReportData({
    values: SAMPLE_DEAL_VALUES,
    // Starter criteria are only honoured for the product's own default
    // targets; any other target is relabelled as the visitor's selection.
    maxOfferTarget:
      source === "starter-criteria" ? DEFAULT_MAO_TARGET : SAMPLE_DEAL_MAO_TARGET,
    maxOfferTargetSource: source,
    generatedAt: NOW,
  });
}

describe("the PDF's Offer Ceiling sentence", () => {
  // A Buy Box source claimed from outside is relabelled "selected-targets"
  // by the report builder, so these are the two sources a PDF built this way
  // can carry; the Buy Box phrase is pinned on the helper below.
  it.each([
    ["selected-targets", "your selected targets"],
    ["starter-criteria", "TrueCap starter criteria"],
  ] as const)(
    "names the %s targets as the object of the sentence",
    async (source, phrase) => {
      const data = report(source);
      // The case must be the one it claims to be, with a solved ceiling.
      expect(data.maxOffer?.source).toBe(source);
      expect(data.maxOffer?.sourceLabel).toMatch(/^Under /);

      const text = await drawnText(data);
      const sentence = `The highest price that still meets ${phrase} under the assumptions shown.`;
      // Once on the cover and once on page 2.
      expect(text.split(sentence).length - 1).toBe(2);
      expect(text).not.toContain("meets Under");
      // The label still opens the criteria lines, where it reads correctly.
      expect(text).toContain(`${data.maxOffer?.sourceLabel}: `);
    },
  );

  it("never splices a line opener after the verb, whatever the payload carries", () => {
    expect(offerCeilingTargetsPhrase({ source: "buy-box" })).toBe(
      "your Buy Box",
    );
    expect(
      offerCeilingTargetsPhrase({ source: "screening-defaults" }),
    ).toBe("the screening defaults");
    // A stored payload from before `source` existed carries only the label.
    expect(
      offerCeilingTargetsPhrase({ sourceLabel: "Under your Buy Box" }),
    ).toBe("your Buy Box");
    expect(offerCeilingTargetsPhrase({ sourceLabel: "  " })).toBe(
      "the captured targets",
    );
    expect(offerCeilingTargetsPhrase({})).toBe("the captured targets");
  });
});
