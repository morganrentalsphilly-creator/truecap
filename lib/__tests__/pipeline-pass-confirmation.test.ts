import { describe, expect, it, vi } from "vitest";

import {
  MARK_AS_PASSED_CONFIRMATION,
  confirmPipelineStageChange,
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
});
