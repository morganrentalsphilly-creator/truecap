"use client";

/**
 * Shown when a user without PDF entitlement clicks Export PDF.
 * Two paths, clearly priced:
 *
 *   - Pro ($29/mo)  → /pricing (unlimited PDFs + everything else)
 *   - Single Deal   → Stripe Checkout for one complete report
 *
 * The one-time path is the conversion-rescue: visitors who will never
 * subscribe but want this one lender package. Anonymous purchase is
 * fine - no account required.
 */

import { ArrowRight, FileDown, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TRIAL_LABEL } from "@/lib/trial";
import { getMarketingOfferConfig } from "@/lib/marketing-offer-config";

interface PdfPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBuyOneTime: () => void | Promise<void>;
  isStartingCheckout: boolean;
}

export function PdfPurchaseDialog({
  open,
  onOpenChange,
  onBuyOneTime,
  isStartingCheckout,
}: PdfPurchaseDialogProps) {
  const { singleDeal, proOfferName } = getMarketingOfferConfig();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Short-viewport max-h + scroll comes from the DialogContent base
          (components/ui/dialog.tsx) so the one-time option can never render
          below the fold unreachable. */}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete this acquisition decision</DialogTitle>
          <DialogDescription>
            Get the complete underwrite for this property, including the
            decision package and lender-ready report. Two ways to unlock it:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Pro - preferred option, listed first and framed as the repeat
              acquisition workflow at the moment of report intent. */}
          <Link
            href="/pricing"
            className="group relative flex items-start justify-between gap-3 rounded-2xl border-2 border-primary bg-gradient-to-br from-[var(--brand-blue-light)] via-card to-card p-4 transition hover:border-primary/70"
          >
            <span className="absolute -top-2.5 left-4 rounded-full bg-primary px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-primary-foreground shadow-sm">
              Best value
            </span>
            <div>
              <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                <Sparkles className="size-4 text-primary" />
                {proOfferName}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Decide and act across every opportunity: Max Offer, Buy Box,
                downside testing, saved deals, comparisons, projections, and
                unlimited branded reports.
              </p>
            </div>
            <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-right text-sm font-bold text-primary">
              {TRIAL_LABEL}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>

          {/* One-time purchase */}
          <button
            type="button"
            onClick={() => void onBuyOneTime()}
            disabled={isStartingCheckout}
            className="flex w-full items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary/40 hover:bg-muted/40 disabled:opacity-60"
          >
            <div>
              <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                <FileDown className="size-4 text-muted-foreground" />
                Single-Deal Underwrite
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                The complete TrueCap decision package for this property. One
                payment, no account, no subscription. Includes assumptions,
                Max Offer, Deal Doctor rent/rate thresholds, Deal Score,
                downside scenario, 10-year, tax, and exit views.
              </p>
            </div>
            <span className="mt-0.5 inline-flex shrink-0 items-center gap-1.5 text-sm font-bold text-foreground">
              {isStartingCheckout ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Starting…
                </>
              ) : (
                singleDeal.priceLabel
              )}
            </span>
          </button>
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Payments are processed by Stripe. Calculations are estimates based on
          your current inputs; verify assumptions independently before acting.
        </p>
      </DialogContent>
    </Dialog>
  );
}
