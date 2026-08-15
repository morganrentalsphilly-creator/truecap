import type { CaseStudyData } from "@/components/marketing/case-study";

/**
 * Publication-safe case studies only.
 *
 * Add an entry only with the required source, observation date, evidence
 * reference, verification record, and explicit publication approval. An empty
 * array intentionally hides the homepage section; it must never render
 * invented or merely anecdotal proof.
 */
export const VERIFIED_CASE_STUDIES: readonly CaseStudyData[] = [];
