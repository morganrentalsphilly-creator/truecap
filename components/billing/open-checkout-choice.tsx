"use client";

import { Loader2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

/**
 * The two actions a signed-in buyer gets when they ask for a plan while a
 * Stripe Checkout Session for other terms is still open (the server action
 * returns CHECKOUT_OPEN_OTHER_PLAN and changes nothing).
 *
 * It used to be a red toast telling them to finish that checkout or wait for
 * it to expire, which is up to 24 hours on Stripe's side. Now they choose:
 * go back to the checkout they started, or close it and open one for the
 * plan they just picked. It renders in place of the plan's button, so the
 * card still has one filled action.
 */

export type OpenCheckoutPlanSlug =
  | "pro_monthly"
  | "pro_annual"
  | "agent_pro_monthly"
  | "agent_pro_annual";

/** Plan name and billing period only. Amounts stay on the plan card. */
const PLAN_LABELS: Record<OpenCheckoutPlanSlug, string> = {
  pro_monthly: "Pro monthly",
  pro_annual: "Pro annual",
  agent_pro_monthly: "Agent Pro monthly",
  agent_pro_annual: "Agent Pro annual",
};

export function OpenCheckoutChoice({
  openPlanSlug,
  requestedPlanSlug,
  pending,
  onResume,
  onStartOver,
}: {
  /** The plan of the checkout that is still open in Stripe. */
  openPlanSlug: OpenCheckoutPlanSlug;
  /** The plan the buyer just asked for. */
  requestedPlanSlug: OpenCheckoutPlanSlug;
  /** True while the start-over request is running. */
  pending: boolean;
  onResume: () => void;
  onStartOver: () => void;
}) {
  const openLabel = PLAN_LABELS[openPlanSlug];
  const requestedLabel = PLAN_LABELS[requestedPlanSlug];
  const samePlan = openPlanSlug === requestedPlanSlug;

  return (
    <div role="status" className="space-y-3 text-left">
      <p className="text-sm leading-relaxed text-foreground text-pretty">
        {samePlan
          ? `You started a ${openLabel} checkout earlier and it is still open, on different terms.`
          : `You started a ${openLabel} checkout earlier and it is still open.`}{" "}
        Starting over closes it.
      </p>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onStartOver}
          disabled={pending}
          className={buttonVariants({
            size: "cta",
            variant: "default",
            className: "w-full px-3 text-balance",
          })}
        >
          {pending ? (
            <>
              <Loader2 aria-hidden className="size-4 animate-spin" /> Opening checkout…
            </>
          ) : samePlan ? (
            "Start over"
          ) : (
            `Start over with ${requestedLabel}`
          )}
        </button>
        <button
          type="button"
          onClick={onResume}
          disabled={pending}
          className={buttonVariants({
            size: "cta",
            variant: "outline",
            className: "w-full px-3 text-balance",
          })}
        >
          {samePlan ? "Resume the earlier checkout" : `Resume the ${openLabel} checkout`}
        </button>
      </div>
    </div>
  );
}
