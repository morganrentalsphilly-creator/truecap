/**
 * Branded 404 page. Renders for any URL that doesn't match a route in
 * the App Router. Designed as a RECOVERY page, not a dead-end:
 *  - search box (POSTs to /search — same one wired into the SearchAction
 *    sitelinks markup in the root layout)
 *  - 6 popular destinations covering every major content area
 *  - primary CTA back to the calculator (the conversion event)
 *
 * Industry rule of thumb: ~30-40% of 404 visits can be recovered with
 * a well-designed page. Worth a few extra lines of JSX.
 *
 * The glossary count is read from the registry, the same list /glossary
 * renders, and is never typed here: it said "33 metrics" while the glossary
 * held 44 terms.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Search as SearchIcon } from "lucide-react";
import { NotFoundTracker } from "@/components/marketing/not-found-tracker";
import { GLOSSARY } from "@/lib/glossary";
import { linkableGlossaryTerms } from "@/lib/seo/link-policy";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

/** The terms /glossary lists (app/glossary/page.tsx filters the same way). */
const GLOSSARY_TERM_COUNT = linkableGlossaryTerms(
  Object.values(GLOSSARY),
).length;

const POPULAR_PAGES = [
  { href: "/tools", label: "Free calculators", blurb: "Mortgage, vacancy, rent-to-price, rehab, and cost screens." },
  { href: "/blog", label: "Blog", blurb: "Deep dives on rental analysis + underwriting." },
  { href: "/glossary", label: "Glossary", blurb: `Plain-English definitions for ${GLOSSARY_TERM_COUNT} terms.` },
  { href: "/markets", label: "Market guides", blurb: "City-level rental market intel." },
  { href: "/pricing", label: "Pricing", blurb: "Free + Pro plans." },
  { href: "/analyze", label: "Run a free analysis", blurb: "An address, the asking price and a bedroom count: a first-pass underwrite." },
];

export default function NotFound() {
  return (
    <main id="main" className="min-h-screen bg-background bg-sheet-grid px-4 pt-16 pb-12 sm:pt-24">
      {/* Client-only tracker — captures the requested pathname to Sentry
          so we can triage broken inbound links in operational dashboards
          instead of discovering them weeks later via analytics. */}
      <NotFoundTracker />
      <div className="mx-auto w-full max-w-2xl">
        <p className="font-mono text-xs text-muted-foreground">404</p>
        <h1 className="mt-2 font-display text-balance text-display-sm text-foreground">
          404 — page not found
        </h1>
        <p className="mt-4 max-w-[52ch] text-pretty text-lg text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
          Search the site or jump to one of the most-visited sections below.
        </p>

        {/* Site search — the same /search route that powers Google's
            sitelinks search box markup. Pure GET form, no JavaScript
            needed for it to work (great for crawlers + accessibility). */}
        <form
          action="/search"
          method="get"
          role="search"
          aria-label="Search TrueCap"
          className="relative mt-6 max-w-lg"
        >
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            name="q"
            placeholder="Search blog, glossary, calculators…"
            aria-label="Search the site"
            // 16px: iOS Safari zooms the page when a focused field is smaller.
            className="h-12 w-full rounded-md border border-input bg-field pr-4 pl-10 text-base text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </form>

        {/* Primary CTA — the conversion action. */}
        <div className="mt-5">
          <Link
            href="/analyze"
            prefetch={false}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-[background-color] duration-150 hover:bg-primary-deep"
          >
            Run a free analysis
          </Link>
        </div>

        {/* Popular pages — a ruled list. Covers every major content area
            so any user, regardless of intent, has a relevant next step. */}
        <ul className="mt-12 border-t border-border">
          {POPULAR_PAGES.map((page) => (
            <li key={page.href} className="border-b border-rule-soft">
              <Link
                href={page.href}
                prefetch={false}
                className="group flex min-h-11 flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:gap-4"
              >
                <span className="text-base font-semibold text-primary underline-offset-[3px] group-hover:underline sm:w-44 sm:shrink-0">
                  {page.label}
                </span>
                <span className="text-pretty text-sm text-muted-foreground">
                  {page.blurb}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
