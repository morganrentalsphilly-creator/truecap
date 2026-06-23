"use client";

/**
 * Share-link button + inline popover.
 *
 * Encodes the current analysis form values into a URL-safe payload,
 * generates a public /d/[encoded] URL, and surfaces it to the user
 * with a copy-to-clipboard button. No server roundtrip, no DB.
 */

import { useState } from "react";
import { Share2, Copy, Check, X } from "lucide-react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import { encodeShareLink, buildShareUrl } from "@/lib/share-link";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";

interface ShareLinkButtonProps {
  values: InvestmentFormValues | null;
  className?: string;
}

export function ShareLinkButton({ values, className }: ShareLinkButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>("");
  const { toast } = useToast();

  const openShare = async () => {
    if (!values) return;
    try {
      // Include the signed-in sharer's id so the public viewer can co-brand
      // the page and route a captured lead back to them (T6). Anonymous
      // sharers simply omit it and the page stays generic.
      let ownerId: string | undefined;
      try {
        const { data } = await createBrowserSupabaseClient().auth.getUser();
        ownerId = data.user?.id;
      } catch {
        /* not signed in - share stays generic */
      }
      const encoded = encodeShareLink({
        v: 1,
        values,
        meta: {
          sharedAt: new Date().toISOString(),
          title: values.address || "Shared deal",
          ...(ownerId ? { ownerId } : {}),
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
    }
  };

  const copy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      trackEvent("share_link_copied", { has_address: Boolean(values?.address) });
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
        disabled={disabled}
        className={cn("h-9 gap-1.5 rounded-xl text-xs sm:text-sm", className)}
        title={disabled ? "Enter an address and price first" : "Share a read-only view of this deal"}
      >
        <Share2 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Share</span>
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-xl p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="font-semibold text-foreground">
                  Share this analysis
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Anyone with the link can view a read-only version. The
                  details encoded in the URL - no account needed to open it.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close share dialog"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-2">
              <input
                id="share-link-url"
                readOnly
                value={shareUrl}
                onFocus={(e) => e.currentTarget.select()}
                aria-label="Shareable URL"
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground font-mono truncate"
              />
              <Button
                type="button"
                onClick={copy}
                className="bg-primary text-primary-foreground rounded-md font-semibold h-auto px-3"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                  </>
                )}
              </Button>
            </div>

            <p className="text-[11px] text-muted-foreground mt-3">
              Note: the link contains a snapshot of the analysis at this
              moment. If you change inputs later and want viewers to see
              updates, generate a new share link.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
