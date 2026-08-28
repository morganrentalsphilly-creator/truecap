import { describe, expect, it, vi } from "vitest";

import {
  MARK_AS_PASSED_CONFIRMATION,
  PASS_REASON_PROMPT,
  confirmPipelineStageChange,
  promptForPipelinePassReason,
} from "@/lib/pipeline-pass-confirmation";

describe("single-deal Pass confirmation", () => {
  it("blocks a move into Passed when the user declines", () => {
    const confirm = vi.fn(() => false);

    expect(
      confirmPipelineStageChange({
        previousStage: "analyzing",
        nextStage: "passed",
        confirm,
      }),
    ).toBe(false);
    expect(confirm).toHaveBeenCalledOnce();
    expect(confirm).toHaveBeenCalledWith(MARK_AS_PASSED_CONFIRMATION);
  });

  it("allows a move into Passed only after approval", () => {
    const confirm = vi.fn(() => true);

    expect(
      confirmPipelineStageChange({
        previousStage: "negotiating",
        nextStage: "passed",
        confirm,
      }),
    ).toBe(true);
    expect(confirm).toHaveBeenCalledOnce();
  });

  it("does not interrupt ordinary stage changes", () => {
    const confirm = vi.fn(() => false);

    expect(
      confirmPipelineStageChange({
        previousStage: "analyzing",
        nextStage: "offer",
        confirm,
      }),
    ).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it("requires and normalizes a reason after Pass confirmation", () => {
    const prompt = vi.fn(() => "  Inspection\n  exposed foundation risk  ");

    expect(
      promptForPipelinePassReason({
        previousStage: "under_contract",
        nextStage: "passed",
        prompt,
      }),
    ).toBe("Inspection exposed foundation risk");
    expect(prompt).toHaveBeenCalledWith(PASS_REASON_PROMPT);
  });

  it("treats a cancelled or blank Pass reason as incomplete", () => {
    expect(
      promptForPipelinePassReason({
        previousStage: "analyzing",
        nextStage: "passed",
        prompt: () => "   ",
      }),
    ).toBeNull();
    expect(
      promptForPipelinePassReason({
        previousStage: "analyzing",
        nextStage: "offer",
        prompt: () => null,
      }),
    ).toBeUndefined();
  });
});
