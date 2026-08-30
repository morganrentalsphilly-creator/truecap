"use client";

import type { ReactNode } from "react";
import { trackEvent } from "@/lib/analytics";
import { AnalyzerHandoffLink } from "@/components/analyzer-handoff-link";

export type ContentCtaType =
  | "blog"
  | "comparison"
  | "glossary"
  | "playbook"
  | "tool"
  | "seo_content";

export function TrackedContentCtaLink({
  handoffHref,
  className,
  children,
  contentType,
  referralSource,
}: {
  handoffHref: string;
  className: string;
  children: ReactNode;
  contentType: ContentCtaType;
  referralSource: "inline_cta" | "sticky_cta";
}) {
  return (
    <AnalyzerHandoffLink
      handoffHref={handoffHref}
      prefetch={false}
      className={className}
      onClick={() =>
        trackEvent("content_cta_clicked", {
          route_category: contentType === "tool" ? "tools" : "content",
          content_type: contentType,
          referral_source: referralSource,
        })
      }
    >
      {children}
    </AnalyzerHandoffLink>
  );
}
