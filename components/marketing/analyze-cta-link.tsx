"use client";

/**
 * A real link to /analyze with funnel attribution. The smallest possible
 * client island: the parent sections stay server components.
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { trackEvent } from "@/lib/analytics";

type Props = {
  className?: string;
  analyticsSource: string;
  href?: string;
  children: ReactNode;
};

export function AnalyzeCtaLink({ className, analyticsSource, href = "/analyze", children }: Props) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => trackEvent("homepage_primary_cta", { source: analyticsSource })}
    >
      {children}
    </Link>
  );
}
