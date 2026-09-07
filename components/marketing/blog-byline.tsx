/**
 * Blog post byline — the visible E-E-A-T author credit.
 *
 * Renders "By TrueCap · built by a Philadelphia rental investor" linking
 * to /about, styled to sit directly under the "date · N min read" meta
 * line in a post header. The founder's name is deliberately absent
 * everywhere on the site (their request, 2026-09-07); /about carries the
 * Organization node that post Article JSON-LD author nodes point at.
 *
 * Blog posts are standalone pages (no shared post layout/header), so
 * this currently ships in the highest-traffic posts rather than all 67.
 * Add it to the header of every NEW post you write, right after the
 * date line, and point the post's Article `author` at the site
 * Organization `@id` at the same time.
 */

import Link from "next/link";

export function BlogByline() {
  return (
    <p className="mt-1.5 text-[11px] uppercase tracking-widest text-muted-foreground font-bold">
      By{" "}
      <Link
        href="/about"
        className="text-foreground/80 transition-colors hover:text-primary"
      >
        TrueCap
      </Link>{" "}
      · built by a Philadelphia rental investor
    </p>
  );
}
