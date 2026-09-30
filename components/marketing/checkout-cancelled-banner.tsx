"use client";

/**
 * Tiny dismissible banner shown on /pricing when a user backs out of
 * Stripe checkout (billing.ts sets cancel_url to
 * /pricing?billing=checkout_cancelled#plans). Reassures them that no
 * charge was made and the trial is still available, with the plan
 * cards / ROI calculator / FAQ right below to re-handle the objection.
 *
 * Reads useSearchParams, so the /pricing page MUST mount it inside a
 * <Suspense> boundary to keep the page's static rendering intact.
 */

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Info, X } from "lucide-react";
import type { PricingEvaluationSummary } from "@/lib/pricing-evaluation";

export function CheckoutCancelledBanner({
  hadPriorSubscription = false,
  evaluation,
}: {
  /**
   * Mirrors the checkout repeat-trial guard (billing.ts grants the trial only
   * to first-time subscribers). Without it this banner promised a returning
   * ex-subscriber their "14-day free trial is still here" seconds after they
   * bailed from a checkout showing an immediate charge — the exact
   * promise-vs-behavior contradiction the trial copy elsewhere avoids.
   */
  hadPriorSubscription?: boolean;
  /** Server-read evaluation state; never infer live access from history alone. */
  evaluation: PricingEvaluationSummary;
}) {
  const searchParams = useSearchParams();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || searchParams.get("billing") !== "checkout_cancelled") {
    return null;
  }

  // A status strip on the heavy rule (DESIGN.md "Chrome": rules, not tinted
  // boxes). The icon is ink: blue is reserved for actions.
  return (
    <div
      role="status"
      className="mb-6 flex items-start gap-2.5 border-t-2 border-foreground py-3 text-base text-foreground"
    >
      <Info aria-hidden className="mt-1 size-4 shrink-0 text-foreground" />
      <p className="max-w-[68ch] flex-1 text-pretty leading-relaxed">
        <strong className="font-semibold">Checkout cancelled — no charge was made.</strong>{" "}
        <span className="text-muted-foreground">
          {/* One template string, not `{TRIAL_LABEL} is…` JSX segments — the
              SSR comment separators between segments ate the space after the
              expression in prod ("trialis"). */}
          {evaluation.status === "active"
            ? "Your active no-card free trial is unaffected; subscribe only when you choose to."
            : hadPriorSubscription
              ? "Your plan is here whenever you're ready to pick it back up."
              : evaluation.status === "exhausted"
                ? "Your free-trial runs are already used up; no subscription was started."
                : evaluation.status === "expired"
                  ? "Your free trial has already ended; no subscription was started."
                  : "Free screening remains available; subscribe only when you choose to."}
        </span>
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="-my-2 -mr-2 ml-auto flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-band hover:text-foreground"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  );
}
