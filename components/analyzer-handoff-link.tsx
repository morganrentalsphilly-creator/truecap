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
  ...props
}: AnalyzerHandoffLinkProps) {
  const renderedHref = scrubAnalyzerHandoffHref(handoffHref);

  return (
    <Link
      {...props}
      href={renderedHref}
      target={target}
      onClick={(event) => {
        onClick?.(event);
        stageAnalyzerHandoffForClick(handoffHref, target, event);
      }}
    />
  );
}
