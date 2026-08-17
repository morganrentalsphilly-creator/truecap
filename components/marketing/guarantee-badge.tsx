/**
 * Compact Never Overpay Guarantee badge.
 *
 * Renders the shield pill + one-line promise linking to /guarantee. Mounted
 * directly under paid-tier CTAs (/pricing cards), in the homepage offer
 * section, and on /for-agents, so the risk reversal is visible at every
 * moment of commitment. Fails closed with the same config switch as the
 * guarantee section itself (NEXT_PUBLIC_TRUECAP_GUARANTEE_DISABLED) so the
 * badge and the policy can never disagree about whether a guarantee exists.
 *
 * No "use client": pure presentational JSX reading build-time NEXT_PUBLIC
 * config, safe in both server sections and the client pricing cards.
 */

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { getMarketingOfferConfig } from "@/lib/marketing-offer-config";

export function GuaranteeBadge({
  className = "",
  align = "center",
}: {
  className?: string;
  align?: "center" | "start";
}) {
  const { guaranteeEnabled, guaranteeTermsUrl } = getMarketingOfferConfig();
  if (!guaranteeEnabled) return null;

  return (
    <div
      className={`flex ${align === "center" ? "justify-center" : "justify-start"} ${className}`}
    >
      <Link
        href={guaranteeTermsUrl}
        className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[var(--brand-green)]/30 bg-[var(--brand-green-light)] px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:border-[var(--brand-green)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ShieldCheck aria-hidden className="size-3.5 shrink-0 text-[var(--brand-green)]" />
        <span>
          Never Overpay Guarantee
          <span className="text-muted-foreground"> — 30-day refund</span>
        </span>
      </Link>
    </div>
  );
}
