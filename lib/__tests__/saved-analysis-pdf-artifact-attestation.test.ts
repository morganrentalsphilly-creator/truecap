import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  signSavedAnalysisPdfArtifact,
  verifySavedAnalysisPdfArtifact,
} from "@/lib/pdf/saved-analysis-artifact-attestation";

const ORIGINAL_SECRET = process.env.SHARE_LINK_SECRET;
const BASE = {
  userId: "5deb3957-957c-480d-b793-bcd0618ef1f6",
  analysisId: "06e8d13c-5eb5-46a8-8f79-cae7db6ced2d",
  cacheVersion: 123,
  renderFingerprint: "0123456789abcdef0123456789abcdef",
  pdfBytes: new Uint8Array(Buffer.from("%PDF-1.7 TrueCap verified bytes")),
};

describe("saved-analysis PDF artifact attestation", () => {
  beforeEach(() => {
    process.env.SHARE_LINK_SECRET = "test-only-artifact-attestation-secret";
  });

  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) delete process.env.SHARE_LINK_SECRET;
    else process.env.SHARE_LINK_SECRET = ORIGINAL_SECRET;
  });

  it("verifies only the exact server-rendered bytes and identity", () => {
    const attestation = signSavedAnalysisPdfArtifact(BASE);
    expect(attestation).toMatch(/^[a-f0-9]{64}$/);
    expect(verifySavedAnalysisPdfArtifact({ ...BASE, attestation })).toBe(true);
    expect(
      verifySavedAnalysisPdfArtifact({
        ...BASE,
        pdfBytes: new Uint8Array(Buffer.from("%PDF forged bytes")),
        attestation,
      }),
    ).toBe(false);
    expect(
      verifySavedAnalysisPdfArtifact({
        ...BASE,
        analysisId: "f7c4c844-f4d5-4503-a255-737721cd4df7",
        attestation,
      }),
    ).toBe(false);
  });

  it("fails closed when the server secret is unavailable", () => {
    delete process.env.SHARE_LINK_SECRET;
    expect(signSavedAnalysisPdfArtifact(BASE)).toBeNull();
    expect(
      verifySavedAnalysisPdfArtifact({ ...BASE, attestation: "a".repeat(64) }),
    ).toBe(false);
  });
});
