import type { PipelineStage } from "@/lib/pipeline";
import { normalizeDealHistoryText } from "@/lib/deal-history";

export const MARK_AS_PASSED_TITLE = "Mark this deal as Passed?";
export const MARK_AS_PASSED_BODY =
  "It will move out of Active Deals and into Archived. You can undo this immediately.";
export const PASS_REASON_TITLE = "Why are you passing on this deal?";
export const PASS_REASON_BODY = "This reason will be saved in the Deal Log.";

/**
 * A Pass is a user-recorded terminal decision, so every single-deal stage
 * control must ask before writing it. Other stage changes remain one step.
 * Injecting the prompt keeps the decision testable without a browser DOM.
 *
 * The injected functions may be synchronous (tests) or promise-returning (the
 * in-app ActionConfirm dialogs that replaced window.confirm/window.prompt) —
 * both entry points are async and await either shape.
 */
export async function confirmPipelineStageChange({
  previousStage,
  nextStage,
  confirm,
}: {
  previousStage: PipelineStage;
  nextStage: PipelineStage;
  confirm: (title: string, body: string) => boolean | Promise<boolean>;
}): Promise<boolean> {
  if (nextStage !== "passed" || previousStage === "passed") return true;
  return await confirm(MARK_AS_PASSED_TITLE, MARK_AS_PASSED_BODY);
}

/**
 * Collect the audit context separately from confirmation. `undefined` means
 * no reason is needed; `null` means the user cancelled or supplied no text.
 */
export async function promptForPipelinePassReason({
  previousStage,
  nextStage,
  prompt,
}: {
  previousStage: PipelineStage;
  nextStage: PipelineStage;
  prompt: (title: string, body: string) => string | null | Promise<string | null>;
}): Promise<string | null | undefined> {
  if (nextStage !== "passed" || previousStage === "passed") return undefined;
  return normalizeDealHistoryText(
    await prompt(PASS_REASON_TITLE, PASS_REASON_BODY),
  );
}
