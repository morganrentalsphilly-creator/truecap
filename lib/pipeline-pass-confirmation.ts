import type { PipelineStage } from "@/lib/pipeline";
import { normalizeDealHistoryText } from "@/lib/deal-history";

export const MARK_AS_PASSED_CONFIRMATION =
  "Mark this deal as Passed? It will move out of Active Deals and into Archived. You can undo this immediately.";
export const PASS_REASON_PROMPT =
  "Why are you passing on this deal? This reason will be saved in the Deal Log.";

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

/**
 * Collect the audit context separately from confirmation. `undefined` means
 * no reason is needed; `null` means the user cancelled or supplied no text.
 */
export function promptForPipelinePassReason({
  previousStage,
  nextStage,
  prompt,
}: {
  previousStage: PipelineStage;
  nextStage: PipelineStage;
  prompt: (message: string) => string | null;
}): string | null | undefined {
  if (nextStage !== "passed" || previousStage === "passed") return undefined;
  return normalizeDealHistoryText(prompt(PASS_REASON_PROMPT));
}
