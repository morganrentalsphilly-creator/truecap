import { describe, expect, it } from "vitest";
import {
  DEFAULT_PIPELINE_STAGE,
  MAX_TAGS_PER_DEAL,
  PIPELINE_STAGES,
  deriveStageFromFlags,
  flagsForStage,
  isActiveStage,
  isPipelineStage,
  normalizeTags,
  pipelineStageLabel,
} from "@/lib/pipeline";

describe("pipeline stages", () => {
  it("has 6 ordered stages ending in passed", () => {
    expect(PIPELINE_STAGES).toHaveLength(6);
    expect(PIPELINE_STAGES.map((s) => s.order)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(PIPELINE_STAGES[PIPELINE_STAGES.length - 1]!.id).toBe("passed");
  });

  it("validates stage ids", () => {
    expect(isPipelineStage("under_contract")).toBe(true);
    expect(isPipelineStage("closed")).toBe(true);
    expect(isPipelineStage("sold")).toBe(false);
    expect(isPipelineStage(null)).toBe(false);
  });

  it("labels stages", () => {
    expect(pipelineStageLabel("offer")).toBe("Offer made");
    expect(pipelineStageLabel(null)).toBe("");
  });

  it("treats only closed/passed as inactive", () => {
    expect(isActiveStage("researching")).toBe(true);
    expect(isActiveStage("under_contract")).toBe(true);
    expect(isActiveStage("closed")).toBe(false);
    expect(isActiveStage("passed")).toBe(false);
  });
});

describe("legacy flag bridge", () => {
  it("derives a stage from legacy flags", () => {
    expect(deriveStageFromFlags({ isCompleted: true })).toBe("closed");
    expect(deriveStageFromFlags({ isArchived: true })).toBe("passed");
    expect(deriveStageFromFlags({})).toBe(DEFAULT_PIPELINE_STAGE);
    // completed wins over archived if somehow both set.
    expect(deriveStageFromFlags({ isCompleted: true, isArchived: true })).toBe("closed");
  });

  it("mirrors flags from a stage", () => {
    expect(flagsForStage("closed")).toEqual({ is_completed: true, is_archived: false });
    expect(flagsForStage("passed")).toEqual({ is_completed: false, is_archived: true });
    expect(flagsForStage("analyzing")).toEqual({ is_completed: false, is_archived: false });
  });
});

describe("normalizeTags", () => {
  it("trims, collapses whitespace, and drops blanks", () => {
    expect(normalizeTags(["  BRRRR ", "", "  ", "out of   state"])).toEqual([
      "BRRRR",
      "out of state",
    ]);
  });

  it("de-dupes case-insensitively, keeping first casing", () => {
    expect(normalizeTags(["Rehab", "rehab", "REHAB"])).toEqual(["Rehab"]);
  });

  it("caps the number of tags", () => {
    const many = Array.from({ length: 30 }, (_, i) => `tag${i}`);
    expect(normalizeTags(many)).toHaveLength(MAX_TAGS_PER_DEAL);
  });

  it("caps tag length and ignores non-strings / non-arrays", () => {
    const long = "x".repeat(50);
    expect(normalizeTags([long])[0]!.length).toBe(24);
    expect(normalizeTags([1, true, null, "ok"])).toEqual(["ok"]);
    expect(normalizeTags("nope")).toEqual([]);
  });
});
