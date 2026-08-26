import { describe, expect, it } from "vitest";
import {
  INITIAL_SAVED_ANALYSIS_REVISION,
  parseSavedAnalysisRevision,
} from "@/lib/saved-analysis-concurrency";

describe("saved analysis concurrency revisions", () => {
  it("accepts positive safe integer database revisions", () => {
    expect(parseSavedAnalysisRevision(1)).toBe(1);
    expect(parseSavedAnalysisRevision("42")).toBe(42);
    expect(parseSavedAnalysisRevision(INITIAL_SAVED_ANALYSIS_REVISION)).toBe(1);
  });

  it.each([undefined, null, "", 0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1, "1.5"])(
    "rejects an invalid revision: %s",
    (value) => {
      expect(parseSavedAnalysisRevision(value)).toBeNull();
    }
  );
});
