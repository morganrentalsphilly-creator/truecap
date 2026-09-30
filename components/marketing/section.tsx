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

export function Section({
  rhythm = "default",
  rule = "rule",
  className,
  containerClassName,
  children,
  ...props
}: {
  rhythm?: keyof typeof RHYTHM;
  /** "rule": the section rule. "heavy": the 2px ink rule that opens a close. */
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
        rule === "rule" && "border-t border-border",
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
