/**
 * /markets — the markets hub/index.
 *
 * Lists every market page (the bespoke hand-built cities + the
 * data-driven MARKET_CITIES) grouped by state, so:
 *   - /markets resolves (the city-page breadcrumbs link here)
 *   - visitors can browse to any market
 *   - Google gets one crawlable hub linking all market pages
 *
 * Static — no params. Plain server component using the shared shell.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { Header } from "@/components/investcalc/header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { BESPOKE_MARKETS, MARKET_CITIES } from "@/lib/markets/cities";
import { STATES } from "@/lib/states";
import { getSiteUrl } from "@/lib/site-url";
import { groupMarketsByStateRange } from "@/lib/content-hub-groups";

type Entry = { slug: string; name: string; stateName: string };

const ALL: Entry[] = [
  ...BESPOKE_MARKETS,
  ...MARKET_CITIES.map((c) => ({
    slug: c.slug,
    name: c.name,
    stateName: c.stateName,
  })),
];

export const metadata: Metadata = {
  title: "Rental Property Markets by City",
  description: `Browse ${ALL.length}+ U.S. city verification guides and analyze a supported address with editable assumptions.`,
  keywords: [
    "rental property markets",
    "best cities for rental property",
    "cap rate by city",
    "rental market analysis",
    "real estate investing markets",
  ],
  alternates: { canonical: "/markets" },
  openGraph: {
    title: "Rental Property Markets by City | TrueCap",
    description: `Browse ${ALL.length}+ U.S. city verification guides and analyze a supported address with editable assumptions.`,
    url: "/markets",
    type: "website",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap rental markets",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rental Property Markets by City | TrueCap",
    description: `Browse ${ALL.length}+ U.S. city verification guides and analyze a supported address with editable assumptions.`,
    images: ["/home.jpg"],
  },
};

export default function MarketsIndexPage() {
  const siteUrl = getSiteUrl();
  const marketGroups = groupMarketsByStateRange(ALL);

  // Map state display-name → /states/<slug> so each state heading links to
  // its investing guide where one exists. This closes the orphaned-/states
  // internal-link gap (the hub previously rendered states as plain text).
  // States without a guide page stay as plain text — no broken links.
  const stateSlugByName = new Map(
    Object.values(STATES).map((s) => [s.name, s.slug] as const),
  );

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Rental property markets",
    url: `${siteUrl}/markets`,
    description: `Source-first rental-property verification guides for ${ALL.length}+ U.S. cities.`,
    isPartOf: { "@id": `${siteUrl}/#website` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }}
      />
      <Header />

      <main id="main" className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
        <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-primary font-bold">
          <MapPin className="size-3.5" /> Markets
        </p>
        <h1 className="mt-2 text-3xl sm:text-5xl font-extrabold text-foreground leading-[1.05] tracking-tight">
          Rental property markets
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Browse {ALL.length}+ city guides that separate checked-in public
          context from property-specific evidence. Unsourced cap-rate, price,
          tax, neighborhood, and investment verdicts are not published from the
          hand-curated registries.
        </p>

        <section className="mt-10 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-xl sm:text-2xl font-extrabold mb-2">
            Already have an address?
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-5">
            Skip the list: enter a supported address and asking price, review
            labeled starting assumptions, and calculate a preliminary cap rate,
            cash flow, and DSCR. The result is not an appraisal, lender
            approval, or investment recommendation.
          </p>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary-foreground px-4 font-bold text-primary transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Run a deal free →
          </Link>
        </section>

        <nav aria-label="Jump to market directory group" className="mt-10">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Browse states alphabetically
          </p>
          <div className="flex flex-wrap gap-2">
            {marketGroups.map((group) => (
              <a
                key={group.slug}
                href={`#markets-${group.slug}`}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-border bg-card px-4 text-sm font-bold text-foreground/80 transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {group.label}
              </a>
            ))}
          </div>
        </nav>

        <div className="mt-12 space-y-14" data-market-directory="grouped">
          {marketGroups.map((group) => {
            const rangeHeadingId = `markets-${group.slug}-heading`;
            return (
              <section
                key={group.slug}
                id={`markets-${group.slug}`}
                aria-labelledby={rangeHeadingId}
                className="scroll-mt-24"
              >
                <h2
                  id={rangeHeadingId}
                  className="mb-6 border-b border-border pb-3 text-2xl font-extrabold text-foreground"
                >
                  States {group.label}
                </h2>

                <div className="space-y-8">
                  {group.states.map(({ stateName, entries }) => {
                    const stateSlug = stateSlugByName.get(stateName);
                    const stateHeadingId = `market-state-${stateSlug ?? stateName.toLowerCase().replaceAll(" ", "-")}`;

                    return (
                      <section key={stateName} aria-labelledby={stateHeadingId}>
                        <h3
                          id={stateHeadingId}
                          className="mb-2 text-lg font-extrabold text-foreground"
                        >
                          {stateSlug ? (
                            <Link
                              href={`/states/${stateSlug}`}
                              className="inline-flex min-h-11 min-w-11 items-center rounded-md px-1 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {stateName}
                              <span className="sr-only"> investing guide</span>
                            </Link>
                          ) : (
                            stateName
                          )}
                        </h3>
                        <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                          {entries.map((city) => (
                            <li key={city.slug}>
                              <Link
                                href={`/markets/${city.slug}`}
                                data-market-city-link=""
                                className="inline-flex min-h-11 min-w-11 w-full items-center rounded-lg px-3 text-sm font-semibold text-foreground/80 transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                {city.name} →
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </section>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </main>

      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
