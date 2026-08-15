import type { CaseStudyData } from "@/components/marketing/case-study";

/**
 * Publication-safe case studies only.
 *
 * Add an entry after the customer has approved the attribution, workflow,
 * property imagery, and any quantitative result. An empty array intentionally
 * hides the homepage section; it must never render invented proof.
 */
export const VERIFIED_CASE_STUDIES: readonly CaseStudyData[] = [];

