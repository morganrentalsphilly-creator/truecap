"use client";

import { useEffect, useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

function referringDomain(): string {
  try {
    return document.referrer ? new URL(document.referrer).hostname.toLowerCase() : "direct";
  } catch {
    return "unknown";
  }
}

export function EmbedReferralTracker({ calculator }: { calculator: string }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackEvent("embed_loaded", { calculator, referring_domain: referringDomain() });
  }, [calculator]);
  return null;
}

export function EmbedAttributionLink({ href, calculator }: { href: string; calculator: string }) {
  return (
    <a
      href={href}
      target="_top"
      rel="noopener"
      onClick={() => trackEvent("embed_attribution_clicked", { calculator, referring_domain: referringDomain() })}
      className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
    >
      Powered by TrueCap
      <ArrowUpRight className="h-3 w-3" />
    </a>
  );
}
