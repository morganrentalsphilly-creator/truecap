import {
  DEFAULT_PIPELINE_STAGE,
  flagsForStage,
  isActiveStage,
  isPipelineStage,
  type PipelineStage,
} from "@/lib/pipeline";

/**
 * Minimal persisted lifecycle shape shared by saved-deal server surfaces.
 *
 * `pipeline_stage` is the forward-looking lifecycle field, while the two
 * booleans remain compatibility mirrors. Historical rows and interrupted
 * deployments can disagree, so terminal state always fails closed: either a
 * terminal stage or its mirror is enough to keep a deal out of shopping and
 * editing workflows. Completed wins over archived for display because an
 * owned deal must never disappear from owned-portfolio reporting merely due
 * to a stale archive flag.
 */
export type PersistedSavedDealLifecycle = {
  pipeline_stage?: unknown;
  is_completed?: boolean | null;
  is_archived?: boolean | null;
};

export function isSavedDealCompleted(
  lifecycle: PersistedSavedDealLifecycle,
): boolean {
  return (
    lifecycle.is_completed === true || lifecycle.pipeline_stage === "closed"
  );
}

export function isSavedDealArchived(
  lifecycle: PersistedSavedDealLifecycle,
): boolean {
  if (isSavedDealCompleted(lifecycle)) return false;
  return (
    lifecycle.is_archived === true || lifecycle.pipeline_stage === "passed"
  );
}

export function effectiveSavedDealStage(
  lifecycle: PersistedSavedDealLifecycle,
): PipelineStage {
  if (isSavedDealCompleted(lifecycle)) return "closed";
  if (isSavedDealArchived(lifecycle)) return "passed";
  return isPipelineStage(lifecycle.pipeline_stage)
    ? lifecycle.pipeline_stage
    : DEFAULT_PIPELINE_STAGE;
}

/** Only genuinely active rows may enter a bulk Archive transition. */
export function isSavedDealActive(
  lifecycle: PersistedSavedDealLifecycle,
): boolean {
  if (isSavedDealCompleted(lifecycle) || isSavedDealArchived(lifecycle)) {
    return false;
  }
  return isActiveStage(effectiveSavedDealStage(lifecycle));
}

export type SimpleSavedDealState = "active" | "completed" | "archived";

/**
 * Keep the pipeline stage and compatibility flags atomic for the simple
 * lifecycle control used by non-pipeline plans and bulk management.
 */
export function persistedLifecycleForSimpleState(state: SimpleSavedDealState): {
  pipeline_stage: PipelineStage;
  is_completed: boolean;
  is_archived: boolean;
} {
  const pipelineStage =
    state === "completed"
      ? "closed"
      : state === "archived"
        ? "passed"
        : DEFAULT_PIPELINE_STAGE;
  return {
    pipeline_stage: pipelineStage,
    ...flagsForStage(pipelineStage),
  };
}
