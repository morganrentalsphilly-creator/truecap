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
  // The frame's call to action: a Signal Blue link at 600, underlined at rest,
  // with no trailing arrow (DESIGN.md chrome rules). Focus is the global 3px
  // outline in app/globals.css.
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
      className="tc-link inline-flex min-h-11 items-center font-semibold"
    >
      Underwrite a full property in TrueCap
    </a>
  );
}
