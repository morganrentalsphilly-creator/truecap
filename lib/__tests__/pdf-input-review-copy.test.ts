import { describe, expect, it } from "vitest";

import {
  PDF_INPUT_REVIEW_DISCLOSURE,
  PDF_INPUT_REVIEW_FOOTNOTE,
  resolvePdfInputReviewStatus,
} from "@/lib/pdf-generator";

describe("PDF input-review trust copy", () => {
  it("treats browser Offer Ready as user review, never evidence completion", () => {
    expect(resolvePdfInputReviewStatus("Offer Ready")).toBe(
      "User review complete",
    );
    expect(resolvePdfInputReviewStatus("Offer Ready")).not.toBe(
      "Evidence complete",
    );
  });

  it("maps every legacy stage to truthful user-review wording", () => {
    expect(resolvePdfInputReviewStatus("Verified")).toBe("Review in progress");
    expect(resolvePdfInputReviewStatus("Screened")).toBe("Screening only");
    expect(resolvePdfInputReviewStatus("unexpected legacy label")).toBe(
      "Screening only",
    );
  });

  it("states that browser confirmation is not evidence or third-party verification", () => {
    // Voice pass (docs/voice.md): same fact, plainer words — Input Review is
    // the user's own in-browser confirmation, never evidence.
    expect(PDF_INPUT_REVIEW_DISCLOSURE).toContain(
      "your own in-browser confirmation of each value",
    );
    expect(PDF_INPUT_REVIEW_DISCLOSURE).toContain(
      "not documentary evidence or third-party verification",
    );
    expect(PDF_INPUT_REVIEW_FOOTNOTE).toContain("self-reported");
    expect(PDF_INPUT_REVIEW_FOOTNOTE).toContain(
      "not documentary evidence or third-party verification",
    );
  });
});
