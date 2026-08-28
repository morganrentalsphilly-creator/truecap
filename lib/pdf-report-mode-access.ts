import type { ReportMode } from "@/lib/pdf-export-constants";

/**
 * The server-side authority that paid for, or otherwise unlocked, one PDF.
 * This vocabulary is deliberately narrower than product-access states: report
 * modes are an artifact-publication permission, not a general UI capability.
 */
export type PdfReportAuthority =
  | "anonymous_grant"
  | "one_time_claim"
  | "metered_evaluation"
  | "paid_plan";

/**
 * Decide which audience-specific report a proven authority may publish.
 *
 * Anonymous, one-time, and evaluation access are all deal-bound personal
 * decision memos. Lender and partner variants are paid-plan features. Agent
 * output is narrower still: the deployment must have released Agent Pro and
 * the caller's live plan entitlements must contain its agent-only capability.
 */
export function reportModeAllowedForAuthority(input: {
  mode: ReportMode;
  authority: PdfReportAuthority;
  agentProReleased?: boolean;
  hasAgentEntitlement?: boolean;
}): boolean {
  if (input.mode === "personal") return true;
  if (input.authority !== "paid_plan") return false;
  if (input.mode !== "agent") return true;
  return input.agentProReleased === true && input.hasAgentEntitlement === true;
}
