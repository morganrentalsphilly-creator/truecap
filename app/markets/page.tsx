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
import { MARKET_CITIES } from "@/lib/markets/cities";
import { getSiteUrl } from "@/lib/site-url";

type Entry = { slug: string; name: string; stateName: string };

// Hand-built bespoke market pages (app/markets/<slug>/page.tsx).
const BESPOKE: Entry[] = [
  { slug: "philadelphia", name: "Philadelphia", stateName: "Pennsylvania" },
  { slug: "atlanta", name: "Atlanta", stateName: "Georgia" },
  { slug: "charlotte", name: "Charlotte", stateName: "North Carolina" },
  { slug: "cleveland", name: "Cleveland", stateName: "Ohio" },
  { slug: "dallas", name: "Dallas", stateName: "Texas" },
  { slug: "detroit", name: "Detroit", stateName: "Michigan" },
  { slug: "houston", name: "Houston", stateName: "Texas" },
  { slug: "indianapolis", name: "Indianapolis", stateName: "Indiana" },
  { slug: "kansas-city", name: "Kansas City", stateName: "Missouri" },
  { slug: "memphis", name: "Memphis", stateName: "Tennessee" },
  { slug: "phoenix", name: "Phoenix", stateName: "Arizona" },
  { slug: "tampa", name: "Tampa", stateName: "Florida" },
];

const ALL: Entry[] = [
  ...BESPOKE,
  ...MARKET_CITIES.map((c) => ({ slug: c.slug, name: c.name, stateName: c.stateName })),
];

export const metadata: Metadata = {
  title: "Rental property markets — cap rates, rents & cash flow by city | TrueCap",
  description: `Explore rental investment analysis for ${ALL.length}+ U.S. cities — cap-rate benchmarks, HUD rents, property tax, and a 60-second analyzer for every market.`,
  keywords: [
    "rental property markets",
    "best cities for rental property",
    "cap rate by city",
    "rental market analysis",
    "real estate investing markets",
  ],
  alternates: { canonical: "/markets" },
  openGraph: {
    title: "Rental property markets by city | TrueCap",
    description: `Cap rates, rents, and cash-flow analysis for ${ALL.length}+ U.S. rental markets.`,
    url: "/markets",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap rental markets" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

export default function MarketsIndexPage() {
  const siteUrl = getSiteUrl();

  const byState = new Map<string, Entry[]>();
  for (const e of ALL) {
    const list = byState.get(e.stateName) ?? [];
    list.push(e);
    byState.set(e.stateName, list);
  }
  const states = [...byState.keys()].sort();
  for (const s of states) byState.get(s)!.sort((a, b) => a.name.localeCompare(b.name));

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Rental property markets",
    url: `${siteUrl}/markets`,
    description: `Rental investment analysis for ${ALL.length}+ U.S. cities.`,
    isPartOf: { "@id": `${siteUrl}/#website` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }} />
      <Header />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
        <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-primary font-bold">
          <MapPin className="size-3.5" /> Markets
        </p>
        <h1 className="mt-2 text-3xl sm:text-5xl font-extrabold text-foreground leading-[1.05] tracking-tight">
          Rental property markets
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Cap-rate benchmarks, typical rents, and property-tax defaults for {ALL.length}+ U.S.
          markets — plus a 60-second analyzer for every city. Pick a market to start.
        </p>

        <section className="mt-10 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-xl sm:text-2xl font-extrabold mb-2">Already have an address?</h2>
          <p className="text-sm sm:text-base opacity-90 mb-5">
            Skip the list — paste any U.S. address and get cap rate, cash flow, and DSCR in 60 seconds.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity"
          >
            Run a deal free →
          </Link>
        </section>

        <div className="mt-12 space-y-10">
          {states.map((state) => (
            <section key={state}>
              <h2 className="text-lg font-extrabold text-foreground border-b border-border pb-2 mb-4">
                {state}
              </h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {byState.get(state)!.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/markets/${c.slug}`}
                    className="text-sm font-semibold text-foreground/80 hover:text-primary"
                  >
                    {c.name} →
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>

      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
