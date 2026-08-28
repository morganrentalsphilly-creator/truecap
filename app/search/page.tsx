/**
 * /search?q=… — public search page.
 *
 * This page exists primarily to activate Google's "sitelinks search
 * box" feature. The WebSite JSON-LD in app/page.tsx declares a
 * `potentialAction` of type SearchAction pointing at /search?q=…,
 * but Google only renders the in-SERP search box if that URL actually
 * resolves to a working search interface. Before this page existed,
 * the JSON-LD validated structurally but the SERP box wouldn't render.
 *
 * What it searches: the static content collections — blog posts,
 * glossary terms, tools, market pages, states. NOT user data (that's
 * gated behind auth at /dashboard). Pure substring match across
 * title + slug; no full-text engine needed for this content size.
 *
 * Server component so the matching happens at request time and the
 * result HTML is fully rendered for crawlers + screen readers.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Search as SearchIcon, ArrowRight } from "lucide-react";
import { Header } from "@/components/investcalc/header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { GLOSSARY } from "@/lib/glossary";
import { STATES } from "@/lib/states";
import { BLOG_POSTS } from "@/app/blog/page";
import { CALCULATOR_REGISTRY, getCalculator } from "@/lib/calculator-registry";

export const metadata: Metadata = {
  title: "Search",
  description:
    "Search TrueCap's blog, glossary, calculators, and market pages for any topic in rental property analysis.",
  alternates: { canonical: "/search" },
  // Search results are noindex by default — Google explicitly prefers
  // not to index search-result pages because they're typically thin
  // and duplicate. The page itself exists for users + the sitelinks
  // search box to function; it doesn't need to rank on its own.
  robots: { index: false, follow: true },
};

type SearchHit = {
  title: string;
  href: string;
  category: string;
  blurb?: string;
};

// Public search consumes the release-filtered registry directly. Authored dark
// widgets are not searchable just because their source directories still exist.
const TOOL_PAGES: Array<{ slug: string; title: string; blurb: string }> =
  CALCULATOR_REGISTRY.map((tool) => ({
    slug: tool.slug,
    title: tool.title,
    blurb: tool.description,
  }));

// Market city slugs — hardcoded for the same reason as tools.
const MARKET_CITIES = [
  "atlanta", "charlotte", "cleveland", "dallas", "detroit", "houston",
  "indianapolis", "kansas-city", "memphis", "philadelphia", "phoenix", "tampa",
] as const;

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function search(query: string): SearchHit[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  const tokens = q.split(" ").filter((t) => t.length >= 2);
  const matches = (haystack: string): boolean => {
    const h = normalize(haystack);
    return tokens.every((t) => h.includes(t));
  };

  const hits: SearchHit[] = [];

  // Blog posts
  for (const post of BLOG_POSTS) {
    if (!post.available) continue;
    if (matches(`${post.title} ${post.excerpt} ${post.slug}`)) {
      hits.push({
        title: post.title,
        href: `/blog/${post.slug}`,
        category: "Blog",
        blurb: post.excerpt,
      });
    }
  }

  // Glossary terms — schema uses `term` (display name), not `title`.
  for (const entry of Object.values(GLOSSARY)) {
    if (matches(`${entry.term} ${entry.definition} ${entry.slug}`)) {
      hits.push({
        title: entry.term,
        href: `/glossary/${entry.slug}`,
        category: "Glossary",
        blurb: entry.definition,
      });
    }
  }

  // Tools
  for (const tool of TOOL_PAGES) {
    if (matches(`${tool.title} ${tool.blurb} ${tool.slug}`)) {
      hits.push({
        title: tool.title,
        href: `/tools/${tool.slug}`,
        category: "Calculator",
        blurb: tool.blurb,
      });
    }
  }

  // States — STATES is a Record keyed by slug, so iterate values.
  for (const state of Object.values(STATES)) {
    if (matches(`${state.name} ${state.abbr} rental investment ${state.pitch}`)) {
      hits.push({
        title: `${state.name} rental property investing`,
        href: `/states/${state.slug}`,
        category: "State guide",
        blurb: state.pitch,
      });
    }
  }

  // Markets (cities)
  for (const city of MARKET_CITIES) {
    if (matches(`${city} market rental`)) {
      const name = city.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      hits.push({
        title: `${name} rental market`,
        href: `/markets/${city}`,
        category: "Market",
        blurb: `Rental market overview, cap rates, and strategy fit for ${name}.`,
      });
    }
  }

  // De-dupe by href just in case
  const seen = new Set<string>();
  return hits.filter((h) => {
    if (seen.has(h.href)) return false;
    seen.add(h.href);
    return true;
  });
}

export default async function SearchPage({
  searchParams,
}: {
  // Next 16 makes searchParams async — must be awaited.
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const hits = query ? search(query) : [];

  return (
    <>
      <Header />
      <main id="main" className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          {query ? `Search results for "${query}"` : "Search TrueCap"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Search across the blog, glossary, calculators, market guides, and state pages.
        </p>

        <form
          action="/search"
          method="get"
          className="mt-6 relative"
          role="search"
          aria-label="Site search"
        >
          <SearchIcon
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            name="q"
            defaultValue={query}
            autoFocus
            placeholder="Cap rate, DSCR, cash flow, Indianapolis…"
            aria-label="Search terms"
            className="w-full h-12 pl-10 pr-4 rounded-lg border border-border bg-card text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </form>

        {query && hits.length === 0 ? (
          <div className="mt-10 rounded-xl border border-border bg-muted/30 p-6 text-sm">
            <div className="font-semibold">No results for &ldquo;{query}&rdquo;.</div>
            <p className="mt-2 text-muted-foreground">
              Try a different keyword, or browse the most popular sections:
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { label: "Cap rate", href: "/glossary/cap-rate" },
                { label: "DSCR", href: "/glossary/dscr" },
                { label: "Cash-on-cash", href: "/glossary/cash-on-cash-return" },
                ...(getCalculator("brrrr-calculator")
                  ? [{ label: "BRRRR", href: "/tools/brrrr-calculator" }]
                  : []),
                { label: "Blog", href: "/blog" },
                { label: "All calculators", href: "/tools" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold hover:border-primary hover:text-primary"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {hits.length > 0 ? (
          <ul className="mt-10 space-y-3">
            {hits.map((hit) => (
              <li key={hit.href}>
                <Link
                  href={hit.href}
                  className="group block rounded-xl border border-border bg-card p-5 transition hover:border-primary hover:shadow-sm"
                >
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {hit.category}
                  </div>
                  <div className="mt-1 flex items-start justify-between gap-3">
                    <div className="font-semibold text-foreground">{hit.title}</div>
                    <ArrowRight
                      className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary"
                      aria-hidden="true"
                    />
                  </div>
                  {hit.blurb ? (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {hit.blurb}
                    </p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        {!query ? (
          <div className="mt-10 text-sm text-muted-foreground">
            Type a term above to search the site.
          </div>
        ) : null}
      </main>
      <SiteFooter />
    </>
  );
}
