import type { EvidenceClaim, RiskClass } from "./types";

export type PageProposal = {
  path: string;
  canonical: string;
  title: string;
  description: string;
  h1: string;
  indexable: boolean;
  sitemapEligible: boolean;
  distinctIntent: string;
  informationGain: string[];
  claims: EvidenceClaim[];
  parentHub: string | null;
  internalLinksOut: string[];
  incomingLinkPlan: string[];
  hasUsefulCta: boolean;
  hasPlaceholders: boolean;
  maxTemplateSimilarity: number;
  mobileSafe: boolean;
  accessible: boolean;
  riskClass: RiskClass;
};

export type QualityGateResult = { passed: boolean; blockers: string[]; warnings: string[] };

export function runPageQualityGates(proposal: PageProposal): QualityGateResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (!proposal.path.startsWith("/")) blockers.push("path must be root-relative");
  if (!proposal.canonical.startsWith("https://usetruecap.com/")) blockers.push("canonical must use the production origin");
  if (!proposal.title.trim() || proposal.title.length > 60) blockers.push("title is missing or exceeds 60 characters");
  if (!proposal.description.trim() || proposal.description.length > 165) blockers.push("description is missing or exceeds 165 characters");
  if (!proposal.h1.trim()) blockers.push("H1 is missing");
  if (!proposal.indexable || !proposal.sitemapEligible) blockers.push("proposed public page must be indexable and sitemap-eligible");
  if (!proposal.distinctIntent.trim()) blockers.push("distinct search intent is not documented");
  if (proposal.informationGain.length === 0) blockers.push("no TrueCap-specific information gain");
  if (proposal.hasPlaceholders) blockers.push("placeholder content remains");
  if (proposal.maxTemplateSimilarity >= 0.85) blockers.push("template similarity is too high for an independent URL");
  if (!proposal.parentHub) blockers.push("parent topic hub link is missing");
  if (proposal.internalLinksOut.length < 2) blockers.push("fewer than two contextual internal links");
  if (proposal.incomingLinkPlan.length === 0) blockers.push("no incoming contextual link is planned");
  if (!proposal.hasUsefulCta) blockers.push("no useful next-step CTA");
  if (!proposal.mobileSafe || !proposal.accessible) blockers.push("mobile or accessibility gate failed");

  for (const claim of proposal.claims) {
    if (!claim.sourceId || claim.confidence < 0.8 || !claim.contradictionChecked) {
      blockers.push(`unsupported or unchecked claim: ${claim.claim}`);
    }
    if (proposal.riskClass === "high" && !claim.primarySource) {
      blockers.push(`high-risk claim lacks a primary source: ${claim.claim}`);
    }
  }
  if (proposal.claims.length === 0) warnings.push("no material factual claims were registered");
  if (proposal.riskClass === "high") warnings.push("high-risk content cannot auto-publish even when deterministic gates pass");
  return { passed: blockers.length === 0, blockers: [...new Set(blockers)], warnings };
}

export function canAutopublishProposal(proposal: PageProposal, gates = runPageQualityGates(proposal)): boolean {
  return gates.passed && proposal.riskClass === "low";
}
