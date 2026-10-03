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
import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";
import { Header } from "@/components/investcalc/header";
import { ARTICLE_META } from "@/components/marketing/article";
import { PageHero } from "@/components/marketing/page-parts";
import {
  DATA_LINK_GROUP_LABEL_CLASS,
  DATA_LINK_ROW_CLASS,
  DATA_PAGE_MAIN_CLASS,
  DATA_PAGE_ROOT_CLASS,
  DATA_SUBHEADING_CLASS,
  DATA_TAG_LINK_CLASS,
} from "@/components/marketing/safe-market-page";
import { Section, SectionHeading } from "@/components/marketing/section";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { BESPOKE_MARKETS, MARKET_CITIES } from "@/lib/markets/cities";
import { STATES } from "@/lib/states";
import { getSiteUrl } from "@/lib/site-url";
import { groupMarketsByStateRange } from "@/lib/content-hub-groups";
import { JsonLd } from "@/components/seo/json-ld";
import { BreadcrumbSchema } from "@/components/marketing/breadcrumb-schema";
import { linkableMarkets, linkableStates } from "@/lib/seo/link-policy";
import { OPEN_GRAPH_BASE } from "@/lib/seo/open-graph-base";

type Entry = { slug: string; name: string; stateName: string };

// Every market page a block may link: an unindexable or noindexed city drops
// out (lib/seo/link-policy.ts); today that is none of the 162.
const ALL: Entry[] = linkableMarkets([
  ...BESPOKE_MARKETS,
  ...MARKET_CITIES.map((c) => ({
    slug: c.slug,
    name: c.name,
    stateName: c.stateName,
  })),
]);

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
    ...OPEN_GRAPH_BASE,
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
    linkableStates(Object.values(STATES)).map((s) => [s.name, s.slug] as const),
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
    <div className={DATA_PAGE_ROOT_CLASS}>
      <JsonLd data={collectionLd} />
      <BreadcrumbSchema items={[{ name: "Markets", path: "/markets" }]} />
      <Header />

      <main id="main" tabIndex={-1} className={DATA_PAGE_MAIN_CLASS}>
        {/* The hero carries the page's action: the "Already have an address?"
            ask sits in the hero's wide column from 1024px and directly under
            the lede on phones, on the 2px ink rule with one marketing button
            (no blue panel, no arrow). "Markets", the old eyebrow's word, is
            the meta line under the H1. */}
        <PageHero
          title="Rental property markets"
          aside={
            <section aria-labelledby="markets-ask-heading" className="border-t-2 border-foreground pt-6">
              <h2 id="markets-ask-heading" className={DATA_SUBHEADING_CLASS}>
                Already have an address?
              </h2>
              <p className="mt-2 max-w-[56ch] text-pretty text-base leading-relaxed text-muted-foreground">
                Skip the list. Enter a supported address and asking price, review
                the labeled starting assumptions, and get cap rate, cash flow, and
                DSCR. Every assumption is editable.
              </p>
              {/* The hub names itself as the city and state templates do
                  (market-page, state-page). It travels as from, not utm_source:
                  this is a hop inside the site. Nothing reads the value. */}
              <Link
                href="/analyze?from=markets-hub" prefetch={false}
                className={cn(buttonVariants({ size: "cta" }), "mt-5")}
              >
                Run a deal free
              </Link>
            </section>
          }
        >
          <p className={ARTICLE_META}>
            Markets
          </p>
          <p className="mt-4 max-w-[52ch] text-pretty text-lg leading-normal text-foreground">
            Browse {ALL.length}+ city guides. Each one separates public context,
            like HUD rent benchmarks, from the property-specific evidence you
            still need to verify. TrueCap doesn&apos;t publish city-level cap
            rates, prices, taxes, neighborhood picks, or investment verdicts.
          </p>
        </PageHero>

        {/* The directory: the jump links as 2px tags, then one block per
            alphabet range, each state a ruled list of city links (rules and
            space, no pills, no arrows). The hero's bottom rule opens it. */}
        <Section rule="none" rhythm="tight">
          <nav aria-label="Jump to market directory group">
            <p className={DATA_LINK_GROUP_LABEL_CLASS}>
              Browse states alphabetically
            </p>
            <div className={DATA_LINK_ROW_CLASS}>
              {marketGroups.map((group) => (
                <a
                  key={group.slug}
                  href={`#markets-${group.slug}`}
                  className={cn(DATA_TAG_LINK_CLASS, "justify-center px-4")}
                >
                  {group.label}
                </a>
              ))}
            </div>
          </nav>

          <div className="mt-12 space-y-16" data-market-directory="grouped">
            {marketGroups.map((group) => {
              const rangeHeadingId = `markets-${group.slug}-heading`;
              return (
                <section
                  key={group.slug}
                  id={`markets-${group.slug}`}
                  aria-labelledby={rangeHeadingId}
                  className="border-t-2 border-foreground pt-6"
                >
                  <SectionHeading id={rangeHeadingId}>
                    States {group.label}
                  </SectionHeading>

                  <div className="mt-6 space-y-8">
                    {group.states.map(({ stateName, entries }) => {
                      const stateSlug = stateSlugByName.get(stateName);
                      const stateHeadingId = `market-state-${stateSlug ?? stateName.toLowerCase().replaceAll(" ", "-")}`;

                      return (
                        <section key={stateName} aria-labelledby={stateHeadingId}>
                          <h3
                            id={stateHeadingId}
                            className="border-b border-border text-lg font-semibold text-foreground"
                          >
                            {stateSlug ? (
                              <IntentPrefetchLink
                                href={`/states/${stateSlug}`}
                                className="tc-link inline-flex min-h-11 min-w-11 items-center"
                              >
                                {stateName}
                                <span className="sr-only"> investing guide</span>
                              </IntentPrefetchLink>
                            ) : (
                              <span className="inline-flex min-h-11 items-center">{stateName}</span>
                            )}
                          </h3>
                          <ul className="grid sm:grid-cols-2 sm:gap-x-12 lg:grid-cols-3">
                            {entries.map((city) => (
                              <li key={city.slug} className="border-b border-rule-soft">
                                <IntentPrefetchLink
                                  href={`/markets/${city.slug}`}
                                  data-market-city-link=""
                                  className="tc-link inline-flex min-h-11 min-w-11 w-full items-center text-base"
                                >
                                  {city.name}
                                </IntentPrefetchLink>
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
        </Section>
      </main>

      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
