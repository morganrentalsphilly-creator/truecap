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
}

export function PdfPurchaseDialog({
  open,
  onOpenChange,
  returnFocusRef,
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
            One-time report purchases are temporarily unavailable.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Pro - preferred option, listed first and framed as the repeat
              acquisition workflow at the moment of report intent. */}
          <Link
            href="/pricing"
            className="group relative flex items-start justify-between gap-3 rounded-2xl border-2 border-primary bg-gradient-to-br from-[var(--brand-blue-light)] via-card to-card p-4 transition hover:border-primary/70"
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
            <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-right text-sm font-bold text-primary">
              Compare plans
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>

          <div className="rounded-xl border border-border/70 bg-muted/35 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
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
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Payments are processed by Stripe. Calculations are estimates based on
          your current inputs; verify assumptions independently before acting.
        </p>
      </DialogContent>
    </Dialog>
  );
}
