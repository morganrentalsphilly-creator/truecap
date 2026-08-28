import {
  isPipelineStage,
  pipelineStageLabel,
  type PipelineStage,
} from "@/lib/pipeline";

export const DEAL_HISTORY_REASON_MAX_LENGTH = 500;
export const DEAL_HISTORY_NOTE_MAX_LENGTH = 2_000;

export type DealHistoryDecisionStatus =
  | "undecided"
  | "pursue"
  | "negotiate"
  | "pass";

export type SavedDealHistoryEvent = {
  id: string;
  oldStage: PipelineStage | null;
  newStage: PipelineStage;
  decisionStatus: DealHistoryDecisionStatus;
  reason: string | null;
  note: string | null;
  actorUserId: string;
  occurredAt: string;
};

export type SavedDealHistoryContext = {
  reason?: string;
  note?: string;
};

const DECISION_STATUSES = new Set<DealHistoryDecisionStatus>([
  "undecided",
  "pursue",
  "negotiate",
  "pass",
]);

/** Normalize human-entered context without silently truncating its meaning. */
export function normalizeDealHistoryText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized || null;
}

/**
 * The persisted stage remains `under_contract`; the Deal Log names the work
 * happening in that stage so the acquisition timeline reads naturally.
 */
export function dealHistoryStageLabel(
  stage: PipelineStage | null | undefined,
): string {
  if (stage === "under_contract") return "Due diligence (under contract)";
  return pipelineStageLabel(stage);
}

export function dealHistoryDecisionLabel(
  status: DealHistoryDecisionStatus,
): string {
  if (status === "pursue") return "Pursue";
  if (status === "negotiate") return "Negotiate";
  if (status === "pass") return "Pass";
  return "No decision recorded";
}

/** Parse RLS-scoped database rows defensively before they reach the timeline. */
export function parseSavedDealHistoryEvents(
  rows: unknown,
): SavedDealHistoryEvent[] {
  if (!Array.isArray(rows)) return [];

  const events: SavedDealHistoryEvent[] = [];
  for (const raw of rows) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const row = raw as Record<string, unknown>;
    if (
      typeof row.id !== "string" ||
      !isPipelineStage(row.new_stage) ||
      typeof row.decision_status !== "string" ||
      !DECISION_STATUSES.has(
        row.decision_status as DealHistoryDecisionStatus,
      ) ||
      typeof row.actor_user_id !== "string" ||
      typeof row.occurred_at !== "string"
    ) {
      continue;
    }

    events.push({
      id: row.id,
      oldStage: isPipelineStage(row.old_stage) ? row.old_stage : null,
      newStage: row.new_stage,
      decisionStatus: row.decision_status as DealHistoryDecisionStatus,
      reason: normalizeDealHistoryText(row.reason),
      note: normalizeDealHistoryText(row.note),
      actorUserId: row.actor_user_id,
      occurredAt: row.occurred_at,
    });
  }
  return events;
}
