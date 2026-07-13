/**
 * Session persistence for the batch-triage screen (/dashboard/triage).
 *
 * A screened batch lives only in client state; before this existed, opening
 * a row, hitting Back, or refreshing discarded the whole pasted batch. The
 * client persists {text, result} to sessionStorage (tab-scoped, gone when
 * the tab closes) and rehydrates on mount.
 *
 * Pure serialize/parse half, kept out of the client component so it's
 * unit-testable. Parsing validates structure defensively: anything
 * unexpected (schema drift across a deploy, manual tampering, truncated
 * writes) fails safe to null and the user simply starts fresh — a restore
 * must never be able to crash the page.
 */

import type { BatchTriageResult } from "@/app/actions/batch-triage";

export type StoredTriageBatch = {
  text: string;
  result: Extract<BatchTriageResult, { ok: true }> | null;
};

export const TRIAGE_STORAGE_KEY = "truecap:batch-triage:v1";

const TRIAGE_SORTS = ["score", "cashFlow", "fit"] as const;

export function serializeTriageBatch(batch: StoredTriageBatch): string {
  return JSON.stringify(batch);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/**
 * Parse a persisted batch (the raw sessionStorage value, or null when the
 * key is absent). Returns null — never throws — on anything malformed.
 */
export function parseStoredTriageBatch(raw: string | null): StoredTriageBatch | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  const { text, result } = parsed;
  if (typeof text !== "string") return null;
  if (result == null) return { text, result: null };
  if (!isRecord(result)) return null;
  if (result.ok !== true) return null;
  if (!Array.isArray(result.rows) || !Array.isArray(result.parseErrors)) return null;
  if (
    typeof result.screenedCount !== "number" ||
    typeof result.buyBoxActive !== "boolean" ||
    typeof result.truncated !== "boolean"
  ) {
    return null;
  }
  if (!(TRIAGE_SORTS as readonly unknown[]).includes(result.sort)) return null;
  // Each row must at least carry the input block the table renders from;
  // deeper fields (score, dscr, …) are nullable by design so the renderers
  // already tolerate their absence.
  for (const row of result.rows) {
    if (!isRecord(row)) return null;
    const input = row.input;
    if (!isRecord(input) || typeof input.address !== "string") return null;
  }
  return { text, result: result as unknown as StoredTriageBatch["result"] };
}
