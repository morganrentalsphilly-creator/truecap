"use client";

import type { ReactNode } from "react";
import { trackEvent } from "@/lib/analytics";
import { track } from "@/lib/analytics/site-events";
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
      onClick={() => {
        trackEvent("content_cta_clicked", {
          route_category: contentType === "tool" ? "tools" : "content",
          content_type: contentType,
          referral_source: referralSource,
        });
        // The cookieless twin (docs/analytics.md): trackEvent is PostHog-only
        // and PostHog has no key in production, so this click was recorded
        // nowhere.
        track("primary_cta_clicked", { source: `content_${referralSource}` });
      }}
    >
      {children}
    </AnalyzerHandoffLink>
  );
}
