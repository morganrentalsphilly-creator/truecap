/**
 * Pins the owner-scoping of cached-PDF storage paths.
 *
 * Background: `analysis-pdfs` used to be a PUBLIC bucket with a blanket
 * public-read policy, so every user's exported underwrite was anonymously
 * listable and downloadable. Migration 20260802120000 makes the bucket
 * private with an owner-scoped SELECT policy, and the app now mints a
 * short-lived signed URL instead of a permanent public one.
 *
 * These tests cover the pure half of that fix: the path builder both sides
 * share, and the resolver that turns whatever `saved_analyses.pdf_url` holds
 * (new bare paths AND legacy public URLs) into a path we're willing to sign.
 * The resolver is the last line of defence before `createSignedUrl` — if it
 * ever returned another tenant's path, RLS would still refuse, but we should
 * never get that far.
 */
import { describe, expect, it } from "vitest";

import {
  ANALYSIS_PDF_SIGNED_URL_TTL_SECONDS,
  buildAnalysisPdfObjectPath,
  resolveAnalysisPdfObjectPath,
} from "../pdf-export-constants";

const OWNER = "5deb3957-957c-480d-b793-bcd0618ef1f6";
const OTHER = "fe357995-65bd-490e-8576-7c4f5c9ef382";
const DEAL = "06e8d13c-5eb5-46a8-8f79-cae7db6ced2d";
const RENDER_FINGERPRINT = "0123456789abcdef0123456789abcdef";

describe("buildAnalysisPdfObjectPath", () => {
  it("puts the owner id first — every analysis-pdfs RLS policy keys off segment 1", () => {
    const path = buildAnalysisPdfObjectPath(OWNER, DEAL, 12345);
    expect(path.split("/")[0]).toBe(OWNER);
    expect(path).toBe(`${OWNER}/${DEAL}/investment-analysis-v12345.pdf`);
  });

  it("embeds the cache version so a bump writes a new object instead of upserting", () => {
    expect(buildAnalysisPdfObjectPath(OWNER, DEAL, 1)).not.toBe(
      buildAnalysisPdfObjectPath(OWNER, DEAL, 2)
    );
  });

  it("content-addresses current exports to the exact render fingerprint", () => {
    const path = buildAnalysisPdfObjectPath(OWNER, DEAL, 42, RENDER_FINGERPRINT);
    expect(path).toBe(
      `${OWNER}/${DEAL}/investment-analysis-v42-${RENDER_FINGERPRINT}.pdf`
    );
    expect(resolveAnalysisPdfObjectPath(path, OWNER)).toBe(path);
  });

  it("rejects an unsafe or malformed render fingerprint instead of placing it in a path", () => {
    expect(() => buildAnalysisPdfObjectPath(OWNER, DEAL, 42, "../other.pdf")).toThrow(
      /render fingerprint/i
    );
    expect(() => buildAnalysisPdfObjectPath(OWNER, DEAL, 42, "ABCDEF")).toThrow(
      /render fingerprint/i
    );
  });

  it("round-trips through the resolver for the owner", () => {
    const path = buildAnalysisPdfObjectPath(OWNER, DEAL, 42);
    expect(resolveAnalysisPdfObjectPath(path, OWNER)).toBe(path);
  });
});

describe("resolveAnalysisPdfObjectPath", () => {
  it("accepts a bare path owned by the caller", () => {
    expect(
      resolveAnalysisPdfObjectPath(`${OWNER}/${DEAL}/investment-analysis-v5.pdf`, OWNER)
    ).toBe(`${OWNER}/${DEAL}/investment-analysis-v5.pdf`);
  });

  it("parses a legacy public URL back to its path so old rows keep working", () => {
    const legacy = `https://cpfbtvblaufrnxsrvmnm.supabase.co/storage/v1/object/public/analysis-pdfs/${OWNER}/${DEAL}/investment-analysis-v2.pdf`;
    expect(resolveAnalysisPdfObjectPath(legacy, OWNER)).toBe(
      `${OWNER}/${DEAL}/investment-analysis-v2.pdf`
    );
  });

  it("parses a signed URL shape and drops its query string", () => {
    const signed = `https://cpfbtvblaufrnxsrvmnm.supabase.co/storage/v1/object/sign/analysis-pdfs/${OWNER}/${DEAL}/investment-analysis-v2.pdf?token=abc.def`;
    expect(resolveAnalysisPdfObjectPath(signed, OWNER)).toBe(
      `${OWNER}/${DEAL}/investment-analysis-v2.pdf`
    );
  });

  it("decodes percent-encoded path segments", () => {
    const encoded = `https://x.supabase.co/storage/v1/object/public/analysis-pdfs/${OWNER}/${DEAL}/investment%2Danalysis%2Dv2.pdf`;
    expect(resolveAnalysisPdfObjectPath(encoded, OWNER)).toBe(
      `${OWNER}/${DEAL}/investment-analysis-v2.pdf`
    );
  });

  it("REFUSES another tenant's object — the whole point of the fix", () => {
    expect(
      resolveAnalysisPdfObjectPath(`${OTHER}/${DEAL}/investment-analysis-v5.pdf`, OWNER)
    ).toBeNull();
    expect(
      resolveAnalysisPdfObjectPath(
        `https://x.supabase.co/storage/v1/object/public/analysis-pdfs/${OTHER}/${DEAL}/investment-analysis-v2.pdf`,
        OWNER
      )
    ).toBeNull();
  });

  it("refuses path traversal that would climb out of the owner folder", () => {
    expect(resolveAnalysisPdfObjectPath(`${OWNER}/../${OTHER}/x.pdf`, OWNER)).toBeNull();
    expect(resolveAnalysisPdfObjectPath(`${OWNER}/./x.pdf`, OWNER)).toBeNull();
    expect(resolveAnalysisPdfObjectPath(`${OWNER}//x.pdf`, OWNER)).toBeNull();
  });

  it("refuses a URL for a different bucket or a foreign host's path", () => {
    expect(
      resolveAnalysisPdfObjectPath(
        `https://x.supabase.co/storage/v1/object/public/deal-documents/${OWNER}/${DEAL}/x.pdf`,
        OWNER
      )
    ).toBeNull();
    expect(resolveAnalysisPdfObjectPath("https://evil.example.com/whatever.pdf", OWNER)).toBeNull();
  });

  it("refuses a bare filename with no owner folder", () => {
    expect(resolveAnalysisPdfObjectPath("investment-analysis-v5.pdf", OWNER)).toBeNull();
    expect(resolveAnalysisPdfObjectPath(`/${OWNER}`, OWNER)).toBeNull();
  });

  it("returns null for empty / missing values instead of throwing", () => {
    expect(resolveAnalysisPdfObjectPath(null, OWNER)).toBeNull();
    expect(resolveAnalysisPdfObjectPath(undefined, OWNER)).toBeNull();
    expect(resolveAnalysisPdfObjectPath("   ", OWNER)).toBeNull();
    expect(resolveAnalysisPdfObjectPath(`${OWNER}/${DEAL}/x.pdf`, "")).toBeNull();
    expect(resolveAnalysisPdfObjectPath("http://[malformed", OWNER)).toBeNull();
  });

  it("tolerates a leading slash on a stored path", () => {
    expect(resolveAnalysisPdfObjectPath(`/${OWNER}/${DEAL}/x.pdf`, OWNER)).toBe(
      `${OWNER}/${DEAL}/x.pdf`
    );
  });
});

describe("ANALYSIS_PDF_SIGNED_URL_TTL_SECONDS", () => {
  it("is short-lived — a leaked download URL must expire quickly", () => {
    expect(ANALYSIS_PDF_SIGNED_URL_TTL_SECONDS).toBeGreaterThan(0);
    expect(ANALYSIS_PDF_SIGNED_URL_TTL_SECONDS).toBeLessThanOrEqual(300);
  });
});
