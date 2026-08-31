import { describe, expect, it, vi } from "vitest";

import {
  MARK_AS_PASSED_BODY,
  MARK_AS_PASSED_TITLE,
  PASS_REASON_BODY,
  PASS_REASON_TITLE,
  confirmPipelineStageChange,
  promptForPipelinePassReason,
} from "@/lib/pipeline-pass-confirmation";

/**
 * Both entry points went async when the injected confirm/prompt moved from
 * window.confirm / window.prompt to the in-app ActionConfirm dialogs, whose
 * results are promises. The injected shape stays flexible: a synchronous
 * function (these tests) and a promise-returning one (production) must both
 * work, so each behavior is asserted in both shapes.
 */

describe("single-deal Pass confirmation", () => {
  it("blocks a move into Passed when the user declines", async () => {
    const confirm = vi.fn(() => false);

    await expect(
      confirmPipelineStageChange({
        previousStage: "analyzing",
        nextStage: "passed",
        confirm,
      }),
    ).resolves.toBe(false);
    expect(confirm).toHaveBeenCalledOnce();
    expect(confirm).toHaveBeenCalledWith(
      MARK_AS_PASSED_TITLE,
      MARK_AS_PASSED_BODY,
    );
  });

  it("accepts a promise-returning confirm (the dialog shape)", async () => {
    await expect(
      confirmPipelineStageChange({
        previousStage: "negotiating",
        nextStage: "passed",
        confirm: async () => true,
      }),
    ).resolves.toBe(true);
    await expect(
      confirmPipelineStageChange({
        previousStage: "negotiating",
        nextStage: "passed",
        confirm: async () => false,
      }),
    ).resolves.toBe(false);
  });

  it("does not interrupt ordinary stage changes", async () => {
    const confirm = vi.fn(() => false);

    await expect(
      confirmPipelineStageChange({
        previousStage: "analyzing",
        nextStage: "offer",
        confirm,
      }),
    ).resolves.toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it("requires and normalizes a reason after Pass confirmation", async () => {
    const prompt = vi.fn(() => "  Inspection\n  exposed foundation risk  ");

    await expect(
      promptForPipelinePassReason({
        previousStage: "under_contract",
        nextStage: "passed",
        prompt,
      }),
    ).resolves.toBe("Inspection exposed foundation risk");
    expect(prompt).toHaveBeenCalledWith(PASS_REASON_TITLE, PASS_REASON_BODY);
  });

  it("normalizes a promise-returning prompt the same way", async () => {
    await expect(
      promptForPipelinePassReason({
        previousStage: "under_contract",
        nextStage: "passed",
        prompt: async () => "  Roof is  shot  ",
      }),
    ).resolves.toBe("Roof is shot");
  });

  it("treats a cancelled or blank Pass reason as incomplete", async () => {
    await expect(
      promptForPipelinePassReason({
        previousStage: "analyzing",
        nextStage: "passed",
        prompt: () => "   ",
      }),
    ).resolves.toBeNull();
    await expect(
      promptForPipelinePassReason({
        previousStage: "analyzing",
        nextStage: "offer",
        prompt: () => null,
      }),
    ).resolves.toBeUndefined();
  });
});
