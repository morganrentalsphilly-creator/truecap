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
import { TRIAL_LABEL } from "@/lib/trial";

export function CheckoutCancelledBanner() {
  const searchParams = useSearchParams();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || searchParams.get("billing") !== "checkout_cancelled") {
    return null;
  }

  return (
    <div
      role="status"
      className="mx-auto mb-5 flex max-w-2xl items-start gap-2.5 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground"
    >
      <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
      <p className="flex-1 leading-relaxed">
        <strong className="font-semibold">Checkout cancelled — no charge was made.</strong>{" "}
        <span className="text-muted-foreground">
          Your {TRIAL_LABEL} is still here whenever you&apos;re ready.
        </span>
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="-mr-1 -mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
