"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { isFragmentHref } from "@/components/marketing/fragment-href";
import { trackEvent, type FunnelEvent } from "@/lib/analytics";

/**
 * Sign-up and the other /auth/ routes are a full-document navigation (a
 * plain <a>), so a visitor who backs out of the form returns to the exact
 * place on the long marketing page they left. After a client-side hop, Back
 * restored the scroll while the short auth page was still mounted, which
 * clamped it to that page's height: /for-agents reopened at 483px (1095
 * wide) or 415px (390) instead of its pricing close, in every run.
 */
function isFullDocumentHref(href: string) {
  return href.startsWith("/auth/");
}

export function TrackedMarketingLink({
  href,
  event,
  properties,
  className,
  children,
}: {
  href: string;
  event: FunnelEvent;
  properties?: Record<string, unknown>;
  className?: string;
  children: ReactNode;
}) {
  const onClick = () => trackEvent(event, properties);
  // A same-page fragment ("#pricing") is a plain <a> too: next/link does not
  // scroll when the URL already carries that fragment, so the button did
  // nothing the second time it was used (fragment-href.ts).
  if (isFullDocumentHref(href) || isFragmentHref(href)) {
    return (
      <a href={href} className={className} onClick={onClick}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
