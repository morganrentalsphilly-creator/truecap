/**
 * Shared deal-aging thresholds — when a saved deal counts as "aging" in a
 * time-sensitive acquisition stage. Extracted from the in-workspace
 * DealAgingNudge so the dashboard home's aging line and the workspace banner
 * can never disagree about what "aging" means. Pure module (no IO,
 * client-safe), same contract as lib/pipeline.
 *
 * Honesty note (carried from the nudge): we only have created_at (when the
 * deal was SAVED), not a stage-entry timestamp, so consuming copy must say
 * "saved N days ago" — never a false "in this stage N days." A future
 * stage_changed_at column would make it precise; until then we don't
 * overclaim.
 */

import type { PipelineStage } from "@/lib/pipeline";

/** Stages where sitting still lets the deal go cold (offer out / in escrow). */
export const DEAL_AGING_STAGES: readonly PipelineStage[] = ["offer", "under_contract"];

/** Minimum whole days since SAVE before a deal in an aging stage counts. */
export const DEAL_AGING_MIN_DAYS = 7;

/** Whole days since the deal was saved; null when created_at is missing or unparseable. */
export function daysSinceSaved(
  createdAt: string | null | undefined,
  nowMs: number = Date.now()
): number | null {
  if (!createdAt) return null;
  const days = Math.floor((nowMs - new Date(createdAt).getTime()) / 86_400_000);
  return Number.isFinite(days) ? days : null;
}
