"use client";

import { useEffect, useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

export function EmbedReferralTracker({ calculator }: { calculator: string }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackEvent("embed_loaded", { calculator_slug: calculator });
  }, [calculator]);
  return null;
}

export function EmbedAttributionLink({
  href,
  calculator,
}: {
  href: string;
  calculator: string;
}) {
  return (
    <a
      href={href}
      target="_top"
      rel="noopener"
      onClick={() =>
        trackEvent("embed_cta_clicked", {
          calculator_slug: calculator,
          referral_source: "embed",
        })
      }
      className="inline-flex min-h-11 items-center gap-1 rounded-md font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      Underwrite a full property in TrueCap
      <ArrowUpRight className="h-3 w-3" />
    </a>
  );
}
