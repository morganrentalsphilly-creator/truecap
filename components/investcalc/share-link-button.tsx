"use client";

/**
 * Share-link button + inline popover.
 *
 * Encodes the current analysis form values into a URL-safe payload,
 * generates a public /d/[encoded] URL, and surfaces it to the user
 * with a copy-to-clipboard button. No server roundtrip, no DB.
 */

import { useState } from "react";
import { Share2, Copy, Check, Loader2 } from "lucide-react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import {
  encodeShareLink,
  buildShareUrl,
  sanitizeShareValues,
} from "@/lib/share-link";
import { getSignedShareAttribution } from "@/app/actions/share-attribution";
import { trackEvent } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";

interface ShareLinkButtonProps {
  values: InvestmentFormValues | null;
  className?: string;
  /** Saved deal id, when sharing a saved analysis. Lets the public viewer pull
   *  this deal's stored sale/rent comps (verified against the owner). */
  savedDealId?: string | null;
  /** Agent Pro deal workspace context. This changes only the user-facing label
   *  and emits the already-declared, PII-safe client-report funnel event. */
  context?: "analysis" | "client-report";
}

export function ShareLinkButton({
  values,
  className,
  savedDealId,
  context = "analysis",
}: ShareLinkButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>("");
  // The signed-attribution round-trip below runs BEFORE the dialog opens, so
  // without this the click gets no answer at all — same in-flight treatment as
  // the Save / Export / Compare buttons next to it in the toolbar.
  const [isPreparing, setIsPreparing] = useState(false);
  const { toast } = useToast();

  const openShare = async () => {
    if (!values) return;
    setIsPreparing(true);
    try {
      const shareValues = sanitizeShareValues(values);
      // Mint a SIGNED owner attribution server-side (the only place that holds
      // SHARE_LINK_SECRET). It lets the public viewer co-brand the page + route
      // a captured lead back to the owner — but only because the signature
      // proves the owner actually generated this link. Anonymous sharers, or a
      // server without the secret, get null and the page stays generic.
      let attribution: Awaited<ReturnType<typeof getSignedShareAttribution>> = null;
      try {
        attribution = await getSignedShareAttribution({
          values: shareValues,
          savedDealId: savedDealId ?? undefined,
        });
      } catch {
        /* signing failed → share stays generic */
      }
      const encoded = encodeShareLink({
        v: 1,
        values: shareValues,
        meta: {
          sharedAt: new Date().toISOString(),
          title: shareValues.address || "Shared deal",
          ...(attribution
            ? {
                ownerId: attribution.ownerId,
                sig: attribution.sig,
                // Only present when the owner actually owns this saved deal.
                ...(attribution.dealId ? { dealId: attribution.dealId } : {}),
              }
            : {}),
        },
      });
      setShareUrl(buildShareUrl(encoded));
      setOpen(true);
      setCopied(false);
    } catch (err) {
      // Encoding failure used to be a silent no-op - user clicked Share
      // and nothing happened. Surface a toast so they know to try again,
      // and capture to Sentry so we know when this is happening.
      Sentry.captureException(err, {
        tags: { feature: "share-link-encode" },
      });
      toast({
        title: "Couldn't generate share link",
        description: "Try again - if it persists let us know.",
        variant: "destructive",
      });
    } finally {
      setIsPreparing(false);
    }
  };

  const copy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      trackEvent("share_link_copied", { has_address: Boolean(values?.address) });
      if (context === "client-report") {
        trackEvent("client_report_shared", { report_type: "analysis_link" });
      }
    } catch {
      // Fallback for browsers without clipboard API: select the input.
      const el = document.getElementById("share-link-url") as HTMLInputElement | null;
      el?.select();
    }
  };

  const disabled = !values || !values.purchasePrice || !values.address;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={openShare}
        disabled={disabled || isPreparing}
        className={cn("h-9 gap-1.5 rounded-xl text-xs sm:text-sm", className)}
        title={
          disabled
            ? "Enter an address and price first"
            : context === "client-report"
              ? "Share a read-only client report"
              : "Share a read-only view of this deal"
        }
      >
        {isPreparing ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="hidden sm:inline">Preparing…</span>
          </>
        ) : (
          <>
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {context === "client-report" ? "Client report" : "Share"}
            </span>
          </>
        )}
      </Button>

      {/* Dialog primitive (was a hand-rolled fixed overlay): inherits the
          standard fade+zoom, Escape-to-close, focus trap, scroll lock,
          overlay-click dismiss, and a built-in close button. Controlled open
          because openShare mints the signed link before showing. */}
      <Dialog open={open} onOpenChange={setOpen}>
        {/* sm:-prefixed, so the primitive's `max-w-[calc(100%-2rem)]` phone
            gutter survives tailwind-merge (an unprefixed max-w-* deletes it
            and the dialog goes edge-to-edge). */}
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {context === "client-report" ? "Share client report" : "Share this analysis"}
            </DialogTitle>
            <DialogDescription>
              {context === "client-report"
                ? "Send this read-only analysis to the assigned client. Anyone with the link can view the snapshot; saved public branding is included when configured, and no account is needed to open it."
                : "Anyone with the link can view a read-only version — the details are encoded in the URL, no account needed to open it."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2">
            <input
              id="share-link-url"
              readOnly
              value={shareUrl}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Shareable URL"
              className="flex-1 truncate rounded-md border border-input bg-background px-3 py-2 font-mono text-xs text-foreground"
            />
            <Button
              type="button"
              onClick={copy}
              className="h-auto rounded-md bg-primary px-3 font-semibold text-primary-foreground"
            >
              {copied ? (
                <>
                  <Check className="mr-1 h-3.5 w-3.5" /> Copied
                </>
              ) : (
                <>
                  <Copy className="mr-1 h-3.5 w-3.5" /> Copy
                </>
              )}
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Note: the link contains a snapshot of the analysis at this moment. If
            you change inputs later and want viewers to see updates, generate a
            new share link. Links do not currently expire or revoke, so treat one
            like a document you chose to share.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
