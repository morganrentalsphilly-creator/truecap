"use client";

/**
 * Share-link button + inline popover.
 *
 * Mints an opaque, server-backed public URL and surfaces it with a
 * copy-to-clipboard button. Deal inputs never enter the URL.
 */

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Share2, Copy, Check, Loader2, LogIn, UserPlus } from "lucide-react";
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
import type { MaoTarget } from "@/lib/max-allowable-offer";
import type { OfferCeilingTargetSource } from "@/lib/offer-ceiling-contract";
import { createPublicShareAction } from "@/app/actions/public-shares";
import { trackEvent } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";

interface ShareLinkButtonProps {
  values: InvestmentFormValues | null;
  /** Presentation hint only. The server action independently authenticates
   *  immediately before any service-role mint. */
  isAuthenticated: boolean;
  className?: string;
  /** Saved deal id, when sharing a saved analysis. Lets the public viewer pull
   *  this deal's stored sale/rent comps (verified against the owner). */
  savedDealId?: string | null;
  /** Exact acquisition criteria shown with the current Offer Ceiling. */
  maoTarget?: MaoTarget | null;
  /** Provenance shown beside that exact target. */
  maoTargetSource?: OfferCeilingTargetSource | null;
  /** Agent Pro deal workspace context. This changes only the user-facing label
   *  and emits the already-declared, PII-safe client-report funnel event. */
  context?: "analysis" | "client-report";
  /** External consistency gate (for example, while account Buy Box targets
   *  are still resolving). */
  disabled?: boolean;
  disabledReason?: string;
  /** Best-effort draft persistence before leaving for authentication. */
  onPrepareAuth?: () => void;
}

export function ShareLinkButton({
  values,
  isAuthenticated,
  className,
  savedDealId,
  maoTarget,
  maoTargetSource,
  context = "analysis",
  disabled: externallyDisabled = false,
  disabledReason,
  onPrepareAuth,
}: ShareLinkButtonProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [includeAddress, setIncludeAddress] = useState(false);
  const [audience, setAudience] = useState<
    "investment-partner" | "client" | "lender-review"
  >("investment-partner");
  // Creating the opaque row happens after the user confirms disclosure
  // choices. Keep its in-flight state visible like the neighboring actions.
  const [isPreparing, setIsPreparing] = useState(false);
  const [sessionAuthRequired, setSessionAuthRequired] = useState(false);
  const { toast } = useToast();
  const needsSignIn = !isAuthenticated || sessionAuthRequired;
  const returnPath =
    pathname.startsWith("/") && !pathname.startsWith("//") ? pathname : "/";
  const encodedReturnPath = encodeURIComponent(returnPath);
  const prepareAuthNavigation = () => {
    try {
      onPrepareAuth?.();
    } catch {
      // Draft continuity is best-effort and must never block authentication.
    }
  };

  const openShare = () => {
    if (!values) return;
    setShareUrl("");
    setCopied(false);
    setSessionAuthRequired(false);
    // Privacy choices are per-link intent. Never carry an earlier explicit
    // disclosure into the next share dialog.
    setIncludeAddress(false);
    setAudience(context === "client-report" ? "client" : "investment-partner");
    setOpen(true);
  };

  const prepareShare = async () => {
    if (!values) return;
    setIsPreparing(true);
    try {
      // Mint a server-backed share whose URL is
      // just a random token — no address, rent, or assumptions in the path.
      // Fail closed if storage is unavailable. Falling back to /d/<base64>
      // would put the address and financial snapshot into browser, referrer,
      // proxy, and telemetry URLs.
      const opaque = await createPublicShareAction({
        values,
        title: includeAddress ? values.address || undefined : undefined,
        dealId: savedDealId ?? undefined,
        maoTarget: maoTarget ?? undefined,
        maoTargetSource: maoTargetSource ?? undefined,
        audience,
        addressVisibility: includeAddress ? "full" : "hidden",
      });
      if (!opaque.ok) {
        if (opaque.code === "SIGN_IN_REQUIRED") {
          prepareAuthNavigation();
          setSessionAuthRequired(true);
          return;
        }
        throw new Error(opaque.code);
      }
      setShareUrl(opaque.url);
      setCopied(false);
      trackEvent("share_created", {
        audience,
        address_included: includeAddress,
      });
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
      trackEvent("share_link_copied", { has_address: includeAddress });
      if (context === "client-report") {
        trackEvent("client_report_shared", { report_type: "analysis_link" });
      }
    } catch {
      // Fallback for browsers without clipboard API: select the input.
      const el = document.getElementById("share-link-url") as HTMLInputElement | null;
      el?.select();
    }
  };

  const missingRequiredValues = !values || !values.purchasePrice || !values.address;
  const disabled = externallyDisabled || missingRequiredValues;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={openShare}
        disabled={disabled || isPreparing}
        className={cn("min-h-11 gap-1.5 rounded-xl text-xs sm:text-sm", className)}
        title={
          externallyDisabled
            ? disabledReason ?? "This action is temporarily unavailable."
            : missingRequiredValues
            ? "Enter an address and price first"
            : !isAuthenticated
              ? "Sign in to create a share link"
              : context === "client-report"
                ? "Share a read-only client report"
                : "Share a read-only view of this deal"
        }
      >
        {isPreparing ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Preparing…</span>
          </>
        ) : (
          <>
            <Share2 className="w-3.5 h-3.5" />
            <span>
              {context === "client-report" ? "Client report" : "Share"}
            </span>
          </>
        )}
      </Button>

      {/* Dialog primitive (was a hand-rolled fixed overlay): inherits the
          standard fade+zoom, Escape-to-close, focus trap, scroll lock,
          overlay-click dismiss, and a built-in close button. Controlled open
          so disclosure and authentication choices stay inside the modal. */}
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
              {needsSignIn
                ? "Sign in or create a free account to make a new share link. Anyone who receives the link can view it without signing in."
                : context === "client-report"
                  ? "Create a read-only snapshot for the assigned client. The exact address stays hidden unless you explicitly include it."
                  : "Choose what to disclose, then create an opaque, expiring link. The exact address stays hidden by default."}
            </DialogDescription>
          </DialogHeader>

          {needsSignIn ? (
            <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
              <div>
                <p className="font-semibold text-foreground">Sign in to create this link</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  New links belong to your account, so you can revoke them later. After
                  authentication, you’ll return to this page and can finish sharing.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button asChild className="min-h-11 rounded-xl font-semibold">
                  <Link
                    href={`/auth/sign-up?next=${encodedReturnPath}`}
                    onClick={prepareAuthNavigation}
                  >
                    <UserPlus className="mr-2 h-4 w-4" aria-hidden />
                    Create free account
                  </Link>
                </Button>
                <Button asChild variant="outline" className="min-h-11 rounded-xl font-semibold">
                  <Link
                    href={`/auth/login?next=${encodedReturnPath}`}
                    onClick={prepareAuthNavigation}
                  >
                    <LogIn className="mr-2 h-4 w-4" aria-hidden />
                    Sign in
                  </Link>
                </Button>
              </div>
            </div>
          ) : !shareUrl ? (
            <div className="space-y-4">
              <fieldset>
                <legend className="text-sm font-semibold text-foreground">Intended audience</legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {([
                    ["investment-partner", "Partner"],
                    ["client", "Client"],
                    ["lender-review", "Lender review"],
                  ] as const).map(([value, label]) => (
                    <label key={value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 text-sm focus-within:ring-2 focus-within:ring-ring">
                      <input
                        type="radio"
                        name="share-audience"
                        value={value}
                        checked={audience === value}
                        onChange={() => setAudience(value)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-border p-3 text-sm focus-within:ring-2 focus-within:ring-ring">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={includeAddress}
                  onChange={(event) => setIncludeAddress(event.target.checked)}
                />
                <span>
                  <span className="font-semibold text-foreground">Include the exact property address</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                    Off by default. The shared page still includes underwriting outputs and the
                    financial assumptions needed to explain them.
                  </span>
                </span>
              </label>

              <Button
                type="button"
                onClick={prepareShare}
                disabled={isPreparing}
                className="min-h-11 w-full rounded-xl font-semibold"
              >
                {isPreparing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Share2 className="mr-2 h-4 w-4" aria-hidden />}
                {isPreparing ? "Creating secure link…" : "Create secure link"}
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                id="share-link-url"
                readOnly
                value={shareUrl}
                onFocus={(e) => e.currentTarget.select()}
                aria-label="Shareable URL"
                className="min-h-11 flex-1 truncate rounded-md border border-input bg-background px-3 py-2 font-mono text-xs text-foreground"
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
          )}

          <p className="text-[11px] text-muted-foreground">
            {needsSignIn ? (
              <>
                Existing links still open without an account. Creating a new link requires
                sign-in so it has an owner who can revoke it.
              </>
            ) : (
              <>
                The link opens a snapshot of the analysis at this moment. Anyone who receives
                the link can open it. If you change inputs later and want viewers to see updates,
                generate a new share link. New links attached to your signed-in account can be
                revoked there and expire automatically; still treat one like a document you chose
                to share.
              </>
            )}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
