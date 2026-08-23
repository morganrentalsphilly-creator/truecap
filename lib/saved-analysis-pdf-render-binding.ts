import "server-only";

import { createHash } from "node:crypto";
import type { ReportComps } from "@/lib/report-comps";

/**
 * The exact server-owned inputs used to build a saved-analysis PDF. The digest
 * is intentionally content-addressed: a target edit inside resultSnapshot (or
 * any other underwriting change) must produce a different cache object.
 */
export type SavedAnalysisPdfRenderSource = {
  schemaVersion: number;
  methodologyVersion: string | null;
  formSnapshot: Record<string, unknown>;
  resultSnapshot: Record<string, unknown>;
  templateFallback: {
    id: string;
    templateName: string;
    templateDescription: string | null;
  } | null;
  /** Exact reference comps rendered into the report, already normalized to
   * the PDF shape. Comp refreshes must produce a different cache identity. */
  reportComps: ReportComps | null;
};

const PDF_RENDER_FINGERPRINT_PATTERN = /^[a-f0-9]{32}$/;

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`)
    .join(",")}}`;
}

export function fingerprintSavedAnalysisPdfRender(
  source: SavedAnalysisPdfRenderSource
): string {
  return createHash("sha256")
    .update(stableStringify(source))
    .digest("hex")
    .slice(0, 32);
}

export function isSavedAnalysisPdfRenderFingerprint(value: unknown): value is string {
  return typeof value === "string" && PDF_RENDER_FINGERPRINT_PATTERN.test(value);
}

/** Fail closed for malformed client input as well as a genuinely stale render. */
export function savedAnalysisPdfRenderMatches(
  source: SavedAnalysisPdfRenderSource,
  suppliedFingerprint: unknown
): boolean {
  return (
    isSavedAnalysisPdfRenderFingerprint(suppliedFingerprint) &&
    fingerprintSavedAnalysisPdfRender(source) === suppliedFingerprint
  );
}
