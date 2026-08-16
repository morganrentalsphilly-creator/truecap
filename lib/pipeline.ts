/**
 * Saved-deal pipeline — the acquisition funnel a deal moves through, plus
 * free-form tags. Pure module (no IO, client-safe). The server actions in
 * app/actions/saved-analyses.ts persist `pipeline_stage` + `tags`; this
 * file owns the stage metadata, ordering, the legacy-flag bridge, and tag
 * normalization.
 *
 * pipeline_stage is the single lifecycle dimension. The legacy
 * is_completed / is_archived flags are derived mirrors (see flagsForStage)
 * so the stale-archive cron + older filters keep working.
 */

export type PipelineStage =
  | "researching"
  | "watching"
  | "screening"
  | "analyzing"
  | "verifying"
  | "offer_ready"
  | "negotiating"
  | "offer"
  | "under_contract"
  | "closed"
  | "passed";

export type PipelineStageTone = "neutral" | "active" | "progress" | "success" | "muted";

export type PipelineStageMeta = {
  id: PipelineStage;
  label: string;
  short: string;
  order: number;
  tone: PipelineStageTone;
  description: string;
};

/** Ordered funnel. `passed` is the terminal "no" and sorts last. */
export const PIPELINE_STAGES: PipelineStageMeta[] = [
  // `researching` is retained for every persisted legacy row and remains
  // selectable. New workflows can use the more precise Watching/Screening
  // stages without rewriting a user's history behind their back.
  { id: "researching", label: "Researching", short: "Research", order: 1, tone: "neutral", description: "Early look — gathering the numbers." },
  { id: "watching", label: "Watching", short: "Watch", order: 2, tone: "neutral", description: "Monitoring the opportunity for a price or assumption change." },
  { id: "screening", label: "Screening", short: "Screen", order: 3, tone: "neutral", description: "Checking the listing against the first-pass criteria." },
  { id: "analyzing", label: "Analyzing", short: "Analyze", order: 4, tone: "active", description: "Underwriting the deal and its downside." },
  { id: "verifying", label: "Verifying", short: "Verify", order: 5, tone: "active", description: "Replacing estimates with property-specific evidence." },
  { id: "offer_ready", label: "Offer ready", short: "Ready", order: 6, tone: "progress", description: "The underwrite is ready to support an offer decision." },
  { id: "negotiating", label: "Negotiating", short: "Negotiate", order: 7, tone: "progress", description: "Working toward acceptable seller terms." },
  { id: "offer", label: "Offer made", short: "Offer", order: 8, tone: "progress", description: "Offer submitted to the seller." },
  { id: "under_contract", label: "Under contract", short: "Contract", order: 9, tone: "progress", description: "Accepted — in due diligence." },
  { id: "closed", label: "Closed", short: "Closed", order: 10, tone: "success", description: "Owned — the deal closed." },
  { id: "passed", label: "Passed", short: "Passed", order: 11, tone: "muted", description: "Not pursuing this one." },
];

export const DEFAULT_PIPELINE_STAGE: PipelineStage = "analyzing";

const STAGE_BY_ID = new Map<PipelineStage, PipelineStageMeta>(
  PIPELINE_STAGES.map((s) => [s.id, s])
);

export function isPipelineStage(value: unknown): value is PipelineStage {
  return typeof value === "string" && STAGE_BY_ID.has(value as PipelineStage);
}

export function pipelineStageMeta(id: PipelineStage): PipelineStageMeta {
  return STAGE_BY_ID.get(id) ?? STAGE_BY_ID.get(DEFAULT_PIPELINE_STAGE)!;
}

export function pipelineStageLabel(id: PipelineStage | null | undefined): string {
  if (!id) return "";
  return STAGE_BY_ID.get(id)?.label ?? id;
}

/** "Active" = still in the funnel (not closed and not passed). */
export function isActiveStage(id: PipelineStage): boolean {
  return id !== "closed" && id !== "passed";
}

/**
 * Derive a stage from the legacy is_completed/is_archived flags — used when
 * a row predates pipeline_stage (or the column is null).
 */
export function deriveStageFromFlags(flags: {
  isCompleted?: boolean | null;
  isArchived?: boolean | null;
}): PipelineStage {
  if (flags.isCompleted) return "closed";
  if (flags.isArchived) return "passed";
  return DEFAULT_PIPELINE_STAGE;
}

/**
 * The legacy mirror flags for a stage, so the stale-archive cron and older
 * filters stay consistent. closed ⇒ completed, passed ⇒ archived.
 */
export function flagsForStage(stage: PipelineStage): { is_completed: boolean; is_archived: boolean } {
  return {
    is_completed: stage === "closed",
    is_archived: stage === "passed",
  };
}

export const MAX_TAGS_PER_DEAL = 12;
export const MAX_TAG_LENGTH = 24;

/**
 * Clean a raw tag list: trim, collapse whitespace, cap length, drop blanks,
 * case-insensitively de-dupe (keeping first casing), cap the count.
 */
export function normalizeTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const cleaned = raw.trim().replace(/\s+/g, " ").slice(0, MAX_TAG_LENGTH);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
    if (out.length >= MAX_TAGS_PER_DEAL) break;
  }
  return out;
}
