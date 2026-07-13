/**
 * Stage-aware comps freshness — DISPLAY-ONLY.
 *
 * Comps decay: a pull that was fine while researching is dangerously
 * stale when you're under contract. This module owns the per-stage
 * freshness windows and the age math behind the "Comps are N days old —
 * refresh" hint on the comps card. It never touches the server comps
 * cache TTL or refetch logic — it only decides when to nudge.
 *
 * Pure module (no IO, client-safe). Unit-tested.
 */

import type { PipelineStage } from "@/lib/pipeline";

/**
 * Days a comp pull stays fresh per pipeline stage — the closer the deal is
 * to a binding number, the tighter the window. closed/passed deals aren't
 * shopping anymore, so they keep the loosest window.
 */
export const COMPS_FRESHNESS_WINDOW_DAYS: Record<PipelineStage, number> = {
  researching: 90,
  analyzing: 45,
  offer: 45,
  under_contract: 21,
  closed: 90,
  passed: 90,
};

/** Loosest window — used when the surface has no stage (unsaved live analysis). */
export const DEFAULT_COMPS_FRESHNESS_WINDOW_DAYS = 90;

export type CompsFreshness = {
  /** Whole days since the pull (floored). */
  ageDays: number;
  /** The window that applied (stage's, or the loosest without a stage). */
  windowDays: number;
  /** True when the pull has aged past the window — show the refresh hint. */
  stale: boolean;
};

/**
 * Age a comp pull against the stage's freshness window. Returns null when
 * there's nothing truthful to say: no timestamp, an unparseable one, or a
 * future one (clock skew shouldn't produce a scary warning).
 */
export function getCompsFreshness(
  fetchedAt: string | null | undefined,
  stage: PipelineStage | null | undefined,
  now: Date = new Date()
): CompsFreshness | null {
  if (!fetchedAt) return null;
  const t = Date.parse(fetchedAt);
  if (!Number.isFinite(t)) return null;
  const ageMs = now.getTime() - t;
  if (ageMs < 0) return null;
  const ageDays = Math.floor(ageMs / 86_400_000);
  const windowDays = stage
    ? COMPS_FRESHNESS_WINDOW_DAYS[stage]
    : DEFAULT_COMPS_FRESHNESS_WINDOW_DAYS;
  return { ageDays, windowDays, stale: ageDays >= windowDays };
}
