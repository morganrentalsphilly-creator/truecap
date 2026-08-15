/**
 * Publication controls shared by every customer-proof surface.
 *
 * A quote or case study is eligible for public rendering only when both the
 * evidence review and the customer's publication approval are recorded. This
 * keeps an unverified draft from becoming a live revenue claim because it was
 * added to an array in a marketing component.
 */
export type ProofVerification =
  | { status: "unverified"; evidenceRef?: string }
  | {
      status: "verified";
      verifiedAt: string;
      verifiedBy: string;
      /** Internal reference to the interview, email, CRM note, or calculation. */
      evidenceRef: string;
    };

export type PublicationApproval = {
  publicDisplay: boolean;
  approvedAt?: string;
  /** What the customer approved: quote, attribution, metrics, and/or media. */
  scope: readonly ("quote" | "attribution" | "metrics" | "media")[];
  homepage: boolean;
  ads: boolean;
  caseStudy: boolean;
};

export type VerifiedTestimonial = {
  id: string;
  archetype: "active-investor" | "investor-focused-agent" | "newer-investor-house-hacker";
  quote: string;
  customerName: string;
  customerType: string;
  portfolioSize?: string;
  propertyType?: string;
  previousWorkflow?: string;
  timePerDealBeforeMinutes?: number;
  timePerDealAfterMinutes?: number;
  dealsScreened?: number;
  offersMade?: number;
  transactionsClosed?: number;
  photoUrl?: string;
  analysisScreenshotUrl?: string;
  maxOfferScreenshotUrl?: string;
  videoTestimonialUrl?: string;
  sourceChannel: "interview" | "email" | "support" | "survey";
  observedAt: string;
  verification: ProofVerification;
  approval: PublicationApproval;
};

export type VerifiedAgentProof = VerifiedTestimonial & {
  archetype: "investor-focused-agent";
  customerType: "investor-focused agent";
  market: string;
  investorClientVolume?: number;
  responseTimeBeforeMinutes?: number;
  responseTimeAfterMinutes?: number;
  reportsShared?: number;
};

/**
 * Intentionally empty until a permissioned quote is entered with evidence.
 * Live usage counts and deterministic product proof remain visible meanwhile.
 */
export const VERIFIED_TESTIMONIALS: readonly VerifiedTestimonial[] = [];

/** Agent Pro proof stays dark until its workflow/outcome evidence and
 * publication permission are recorded under the same gate. */
export const VERIFIED_AGENT_PROOF: readonly VerifiedAgentProof[] = [];

export function isPublicationReady(
  record: { verification?: ProofVerification; approval?: PublicationApproval },
  placement?: "homepage" | "ads" | "caseStudy"
): boolean {
  if (record.verification?.status !== "verified" || record.approval?.publicDisplay !== true) {
    return false;
  }
  return placement ? record.approval[placement] === true : true;
}
