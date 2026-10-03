import Link from "next/link";

import { TrialAllowanceCount } from "@/components/dashboard/trial-allowance-count";
import { summarizePricingEvaluation } from "@/lib/pricing-evaluation";
import type { ProductAccessState } from "@/lib/product-access";

/**
 * One line of trial budget on the signed-in analyzer (2026-09 audit: "three
 * Pro deal analyses and one full comparison" was promised at sign-up and on
 * /pricing, then never shown again inside the product). Renders nothing
 * unless a no-card evaluation is active — invisible until useful.
 *
 * The count is a small client part so it follows each newly metered run on
 * the page instead of staying at the number the page loaded with.
 */
export function TrialAllowanceStrip({
  access,
}: {
  access: ProductAccessState | null;
}) {
  if (!access || access.kind !== "evaluation") return null;
  const summary = summarizePricingEvaluation(access);
  const endsOn = access.evaluationExpiresAt
    ? access.evaluationExpiresAt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      })
    : null;

  return (
    <p
      role="status"
      className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-2 gap-y-1 px-4 pt-4 text-xs text-muted-foreground sm:px-6"
    >
      <span className="font-semibold text-foreground">Free trial:</span>
      <TrialAllowanceCount
        initial={summary}
        suffix={endsOn ? ` · ends ${endsOn}` : ""}
      />
      <Link
        href="/pricing"
        className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-2 hover:underline"
      >
        See Pro plans
      </Link>
    </p>
  );
}
