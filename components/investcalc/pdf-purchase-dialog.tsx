"use client";

/**
 * Shown when a user without PDF entitlement clicks Export PDF.
 * Two paths, clearly priced:
 *
 *   - Pro ($29/mo)  → /pricing (unlimited PDFs + everything else)
 *   - One-time $5   → Stripe Checkout for just this report
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Short-viewport max-h + scroll comes from the DialogContent base
          (components/ui/dialog.tsx) so the $5 option can never render
          below the fold unreachable. */}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Get the lender-ready PDF</DialogTitle>
          <DialogDescription>
            Multi-page report for this deal - verdict, 10-year projection, tax
            strategy, and exit scenarios. Two ways to get it:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Pro - preferred option, listed first and framed as best value
              at the moment of intent: a warm buyer who wants a lender PDF is
              the most likely person to convert, so anchor on the free trial
              and "pays for itself after one extra report". */}
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
                TrueCap Pro
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Unlimited branded PDFs, plus saved deals, projections, tax
                strategy, and exit scenarios on every analysis. Send more than
                one report and Pro already pays for itself.
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
                Just this report
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                One-time payment, no account, no subscription. Instant download
                after checkout.
              </p>
            </div>
            <span className="mt-0.5 inline-flex shrink-0 items-center gap-1.5 text-sm font-bold text-foreground">
              {isStartingCheckout ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Starting…
                </>
              ) : (
                "$5"
              )}
            </span>
          </button>
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Payments are processed by Stripe. The PDF generates from your current
          form values the moment you return from checkout.
        </p>
      </DialogContent>
    </Dialog>
  );
}
