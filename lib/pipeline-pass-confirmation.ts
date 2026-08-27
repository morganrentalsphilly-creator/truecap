import type { PipelineStage } from "@/lib/pipeline";

export const MARK_AS_PASSED_CONFIRMATION =
  "Mark this deal as Passed? It will move out of Active Deals and into Archived. You can undo this immediately.";

/**
 * A Pass is a user-recorded terminal decision, so every single-deal stage
 * control must ask before writing it. Other stage changes remain one step.
 * Injecting the prompt keeps the decision testable without a browser DOM.
 */
export function confirmPipelineStageChange({
  previousStage,
  nextStage,
  confirm,
}: {
  previousStage: PipelineStage;
  nextStage: PipelineStage;
  confirm: (message: string) => boolean;
}): boolean {
  if (nextStage !== "passed" || previousStage === "passed") return true;
  return confirm(MARK_AS_PASSED_CONFIRMATION);
}
