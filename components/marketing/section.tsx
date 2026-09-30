/**
 * The marketing section wrapper (DESIGN.md "Components"): paper, a rule on top,
 * one of three rhythms, and the page container. Replaces the hand-rolled
 * `<section className="border-t …"><div className="mx-auto max-w-… px-4 py-14
 * sm:py-20">` that every section repeated with slightly different values.
 */

import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

const RHYTHM = {
  /** Dense passages: tables, the close of a page. 48px / 64px. */
  tight: "py-12 sm:py-16",
  /** Most sections. 72px / 96px. */
  default: "py-18 sm:py-24",
  /** Sections that carry the page's explanation. 96px / 128px. */
  open: "py-24 sm:py-32",
} as const;

/** The page container every marketing section, the header and the footer share. */
export const PAGE_CONTAINER = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-12";

/**
 * A page hero (PageHero, MarketingHero) carries data-page-hero, and its
 * bottom rule is the one rule between the hero and what follows. A ruled
 * section drops its own top rule when it directly follows one: as the hero's
 * next sibling, or as the first child of that sibling (the homepage wraps its
 * sections in a display:contents div). Pages need no rule="none" for it.
 */
const HERO_ADJACENT = "[[data-page-hero]+&]:border-t-0 [[data-page-hero]+*>&:first-child]:border-t-0";

export function Section({
  rhythm = "default",
  rule = "rule",
  className,
  containerClassName,
  children,
  ...props
}: {
  rhythm?: keyof typeof RHYTHM;
  /**
   * "rule": the section rule. "heavy": the 2px ink rule that opens a close.
   * The section rule gives way to a page hero's bottom rule when the section
   * comes straight after the hero (see HERO_ADJACENT), so the page shows one
   * rule there, not two stacked 1px rules that read as a stray 2px weight.
   */
  rule?: "rule" | "heavy" | "none";
  className?: string;
  containerClassName?: string;
  children: ReactNode;
} & Omit<ComponentProps<"section">, "className" | "children">) {
  return (
    <section
      className={cn(
        // No scroll margin of its own: the html scroll padding in globals.css
        // already keeps a fragment target clear of the sticky header.
        "bg-background",
        rule === "rule" && `border-t border-border ${HERO_ADJACENT}`,
        rule === "heavy" && "border-t-2 border-foreground",
        className,
      )}
      {...props}
    >
      <div className={cn(PAGE_CONTAINER, RHYTHM[rhythm], containerClassName)}>
        {children}
      </div>
    </section>
  );
}

/** A section's H2 in the display voice. */
export function SectionHeading({
  id,
  children,
  className,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2
      id={id}
      className={cn(
        "font-display text-balance text-section-sm sm:text-section",
        className,
      )}
    >
      {children}
    </h2>
  );
}
