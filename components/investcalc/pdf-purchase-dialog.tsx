"use client";

/**
 * Shown when a user without PDF entitlement clicks Export PDF.
 * The temporary Decision Pack shutdown leaves one supported path:
 * Pro subscription → /pricing (current price, terms, and plan details).
 */

import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import type { RefObject } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getMarketingOfferConfig } from "@/lib/marketing-offer-config";

interface PdfPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
  /**
   * The export was asked for while the sample deal's full report is on the
   * page (the analyzer passes its sample Pro preview flag, not the address:
   * a re-run of the sample gates the panels again). A first-time visitor on
   * the sample has bought nothing, so the one-time-purchase notice, the
   * recovery note for past buyers and the payment sentence do not apply to
   * them; the dialog says where the sample's report is and that Pro includes
   * its PDF. The estimates line stays, worded for the sample.
   * It does not say a PDF "needs" Pro: a visitor's own first decision can be
   * exported without an account (lib/entitlements-catalog.ts, pdf_export).
   */
  sample?: boolean;
}

export function PdfPurchaseDialog({
  open,
  onOpenChange,
  returnFocusRef,
  sample = false,
}: PdfPurchaseDialogProps) {
  const { proOfferName } = getMarketingOfferConfig();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Short-viewport max-h + scroll comes from the DialogContent base
          (components/ui/dialog.tsx) so the one-time option can never render
          below the fold unreachable. */}
      <DialogContent
        className="sm:max-w-md"
        onCloseAutoFocus={(event) => {
          const trigger = returnFocusRef?.current;
          if (!trigger?.isConnected) return;
          event.preventDefault();
          trigger.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>PDF reports are included with Pro</DialogTitle>
          <DialogDescription>
            {sample
              ? "The sample's full report is on this page. A PDF of it comes with a Pro plan."
              : "One-time report purchases are temporarily unavailable."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Pro - preferred option, listed first and framed as the repeat
              acquisition workflow at the moment of report intent.
              Stacked below sm: beside the copy, "Compare plans" left the
              paragraph a 139px column in a 308px card at 390px. */}
          <Link
            href="/pricing"
            className="group relative flex flex-col items-start gap-3 rounded-2xl border-2 border-primary bg-gradient-to-br from-[var(--brand-blue-light)] via-card to-card p-4 transition hover:border-primary/70 sm:flex-row sm:justify-between"
          >
            <div>
              <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                <Sparkles className="size-4 text-primary" />
                {proOfferName}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Review every opportunity with an Offer Ceiling, Buy Box,
                downside testing, saved deals, comparisons, projections, and
                unlimited branded reports. Pricing, trial eligibility, and
                billing terms are shown before checkout.
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-primary sm:mt-0.5 sm:text-right">
              Compare plans
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>

          {sample ? null : (
            <div className="rounded-xl border border-border/70 bg-muted/35 px-3 py-2.5 text-2xs leading-relaxed text-muted-foreground">
              <p>
                <strong className="text-foreground">
                  Already purchased a one-time report?
                </strong>{" "}
                Existing paid claims and recovery remain supported. This temporary
                shutdown affects new purchases only.
              </p>
              <p className="mt-1.5">
                Need help? Email{" "}
                <a
                  href="mailto:hello@usetruecap.com"
                  className="font-semibold text-primary hover:underline"
                >
                  hello@usetruecap.com
                </a>
                . Purchase is subject to our{" "}
                <Link
                  href="/terms"
                  className="font-semibold text-primary hover:underline"
                >
                  Terms
                </Link>
                .
              </p>
            </div>
          )}
        </div>

        <p className="text-2xs leading-relaxed text-muted-foreground">
          {sample
            ? "Calculations are estimates based on the sample's inputs; verify assumptions independently before acting."
            : "Payments are processed by Stripe. Calculations are estimates based on your current inputs; verify assumptions independently before acting."}
        </p>
      </DialogContent>
    </Dialog>
  );
}
