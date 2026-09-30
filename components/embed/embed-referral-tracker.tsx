"use client";

import { useEffect, useRef } from "react";
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
  // A plain credit-row link: Signal Blue, underlined at rest, regular weight
  // like "Powered by TrueCap" beside it, with no trailing arrow (DESIGN.md
  // chrome rules: "Links are Signal Blue, underlined, and that is enough").
  // The widget's filled button stays the frame's one primary action. Focus is
  // the global 3px outline in app/globals.css.
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
      className="tc-link inline-flex min-h-11 items-center"
    >
      Underwrite a full property in TrueCap
    </a>
  );
}
