"use client";

/**
 * Inline Pro-feature gate used for cards that sit in the main column of
 * the analysis dashboard (MaxOfferCard, SensitivityGrid, etc.) - i.e.
 * features that aren't tab-gated.
 *
 * Renders a teaser card that hints at the value (title + value-prop
 * line) and routes the user to /pricing on click. Designed to drive
 * conversion at the moment the user would have seen the feature, not
 * to hide its existence.
 */

import { Lock } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";
import { usePostCheckoutUpsellSuppression } from "@/hooks/use-post-checkout-upsell-suppression";
import { GuaranteeBadge } from "@/components/marketing/guarantee-badge";

interface ProInlineGateProps {
  /** The gated feature's icon; accepted for the callers, no longer drawn (no icon tiles). */
  icon?: React.ComponentType<{ className?: string }>;
  /** Headline of the gated feature, e.g. "Offer Ceiling". */
  title: string;
  /** One-line description of what the user would see if unlocked. */
  description: string;
  /** Compact "preview" pill values - make the feature feel tangible. */
  previewBullets: string[];
}

export function ProInlineGate({ title, description, previewBullets }: ProInlineGateProps) {
  // Post-checkout suppression: while BillingSuccessBanner is confirming a
  // fresh purchase (billing=success poll pending), render nothing — a buyer
  // must never see a trial pitch seconds after paying. Fails OPEN to false
  // (gate behaves exactly as today) for everyone else.
  const suppressed = usePostCheckoutUpsellSuppression();

  // Upsell attribution: fire once when this gate renders (the user reached a
  // Pro feature), and again if they click through - closes the
  // analysis_completed → saw-upsell → pro_checkout_started gap. `feature` is
  // the gate title (e.g. "Offer Ceiling"); no PII.
  const fired = useRef(false);
  useEffect(() => {
    if (suppressed || fired.current) return;
    fired.current = true;
    trackEvent("upsell_prompt_shown", { feature: title, placement: "analysis_dashboard" });
    trackEvent("upgrade_modal_viewed", { feature: title, placement: "analysis_dashboard" });
    if (title.toLowerCase().includes("max")) {
      trackEvent("max_offer_view_attempted", { placement: "analysis_dashboard" });
    }
  }, [title, suppressed]);

  if (suppressed) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-lg text-foreground">{title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-border px-1.5 py-0.5 font-mono text-2xs text-muted-foreground">
          <Lock className="size-3" aria-hidden />
          Pro
        </span>
      </div>

      {/* What the unlocked feature shows, as rows on lines. */}
      <ul className="mt-4 border-t border-border">
        {previewBullets.map((bullet) => (
          <li
            key={bullet}
            className="border-b border-rule-soft py-2 text-sm text-foreground"
          >
            {bullet}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Link
        href="/pricing"
        onClick={() =>
          {
            trackEvent("upsell_prompt_clicked", { feature: title, placement: "analysis_dashboard" });
            trackEvent("upgrade_cta_click", { feature: title, placement: "analysis_dashboard" });
          }
        }
        // min-h-11: 44px target (the global floor covers buttons, not links).
        className="group mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
      >
        See {title} for this deal · Compare Pro plans
      </Link>
      {/* Risk reversal at the moment of the ask, same as every paid CTA on
          the marketing side. */}
      <GuaranteeBadge align="start" className="mt-3" />
    </div>
  );
}
