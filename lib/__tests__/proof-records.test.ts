import { describe, expect, it } from "vitest";

import { isPublicationReady, type PublicationApproval, type ProofVerification } from "@/lib/proof-records";

const verified: ProofVerification = {
  status: "verified",
  verifiedAt: "2026-08-15",
  verifiedBy: "proof-reviewer",
  evidenceRef: "crm:test-evidence",
};

const approved: PublicationApproval = {
  publicDisplay: true,
  approvedAt: "2026-08-15",
  scope: ["quote", "attribution"],
  homepage: true,
  ads: false,
  caseStudy: true,
};

describe("customer-proof publication gate", () => {
  it("rejects proof that has not been verified", () => {
    expect(
      isPublicationReady({
        verification: { status: "unverified", evidenceRef: "crm:draft" },
        approval: approved,
      })
    ).toBe(false);
  });

  it("rejects verified proof without public-display approval", () => {
    expect(
      isPublicationReady({
        verification: verified,
        approval: { ...approved, publicDisplay: false },
      })
    ).toBe(false);
  });

  it("enforces approval for the requested placement", () => {
    const record = { verification: verified, approval: approved };

    expect(isPublicationReady(record, "homepage")).toBe(true);
    expect(isPublicationReady(record, "caseStudy")).toBe(true);
    expect(isPublicationReady(record, "ads")).toBe(false);
  });
});
