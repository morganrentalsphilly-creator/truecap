"use client";

import type { ComponentProps, MouseEventHandler } from "react";
import Link from "next/link";
import { scrubAnalyzerHandoffHref } from "@/lib/analyzer-handoff";
import { stageAnalyzerHandoffForClick } from "@/lib/analyzer-handoff-navigation";

export type AnalyzerHandoffLinkProps = Omit<
  ComponentProps<typeof Link>,
  "href" | "onClick"
> & {
  /** May contain exact inputs in memory; it is never forwarded to the DOM. */
  handoffHref: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
};

/**
 * Render a clean analyzer URL while preserving exact same-tab prefill through
 * short-lived session storage. Existing click handlers run first so a caller
 * can cancel navigation without leaving a stale staged payload.
 */
export function AnalyzerHandoffLink({
  handoffHref,
  onClick,
  target,
  // Every handoff goes to /analyze, whose bundle stays off marketing pages
  // (docs/site-overhaul.md, Phase 7): never prefetched, not even on hover.
  // 20 callers (the calculator widgets, the content CTA) set no prefetch, so
  // each one prefetched the analyzer as soon as it rendered.
  prefetch = false,
  ...props
}: AnalyzerHandoffLinkProps) {
  const renderedHref = scrubAnalyzerHandoffHref(handoffHref);

  return (
    <Link
      {...props}
      prefetch={prefetch}
      href={renderedHref}
      target={target}
      onClick={(event) => {
        onClick?.(event);
        stageAnalyzerHandoffForClick(handoffHref, target, event);
      }}
    />
  );
}
