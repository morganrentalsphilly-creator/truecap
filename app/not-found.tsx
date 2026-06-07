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
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  Compass,
  Calculator,
  Search as SearchIcon,
  BookOpen,
  TrendingUp,
  HelpCircle,
  MapPin,
} from "lucide-react";
import { NotFoundTracker } from "@/components/marketing/not-found-tracker";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

const POPULAR_PAGES = [
  { href: "/tools", label: "Free calculators", icon: Calculator, blurb: "Cap rate, DSCR, BRRRR, NOI, and 10 more." },
  { href: "/blog", label: "Blog", icon: BookOpen, blurb: "Deep dives on rental analysis + underwriting." },
  { href: "/glossary", label: "Glossary", icon: HelpCircle, blurb: "Plain-English definitions for 33 metrics." },
  { href: "/markets/philadelphia", label: "Market guides", icon: MapPin, blurb: "City-level rental market intel." },
  { href: "/pricing", label: "Pricing", icon: TrendingUp, blurb: "Free + Pro plans." },
  { href: "/", label: "Run a free analysis", icon: ArrowUpRight, blurb: "Paste any address — 60-second underwrite." },
];

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 pt-16 pb-12 sm:pt-24">
      {/* Client-only tracker — captures the requested pathname to Sentry
          so we can triage broken inbound links in operational dashboards
          instead of discovering them weeks later via analytics. */}
      <NotFoundTracker />
      <div className="w-full max-w-2xl text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-[var(--brand-blue-light)] text-primary">
          <Compass className="size-6" />
        </div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-2">
          TrueCap
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
          404 — page not found
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
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
          className="mt-6 relative max-w-lg mx-auto"
        >
          <SearchIcon
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            name="q"
            placeholder="Search blog, glossary, calculators…"
            aria-label="Search the site"
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-card text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </form>

        {/* Primary CTA — the conversion action. */}
        <div className="mt-5">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-bold hover:opacity-90"
          >
            Run a free analysis
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </div>

      {/* Popular pages — 6-card grid. Covers every major content area
          so any user, regardless of intent, has a relevant next step. */}
      <div className="mt-12 grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {POPULAR_PAGES.map((page) => {
          const Icon = page.icon;
          return (
            <Link
              key={page.href}
              href={page.href}
              className="group rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary hover:shadow-sm"
            >
              <div className="flex items-center gap-2">
                <Icon className="size-4 text-primary" aria-hidden="true" />
                <div className="text-sm font-bold text-foreground">{page.label}</div>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
                {page.blurb}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
