"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { trackEvent, type FunnelEvent } from "@/lib/analytics";

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
  return (
    <Link
      href={href}
      className={className}
      onClick={() => trackEvent(event, properties)}
    >
      {children}
    </Link>
  );
}

