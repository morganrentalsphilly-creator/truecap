/**
 * /states — index page linking to all state-level investing pages.
 *
 * Targets "best states for rental investing" / "rental property by state"
 * queries. Acts as a hub for internal-link equity to flow to each
 * /states/[slug] page.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/investcalc/header";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { STATES, STATE_COUNT } from "@/lib/states";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Rental property investing by state — 2026",
  description:
    `${STATE_COUNT} state guides for rental investors in 2026. Compare property tax, landlord laws, eviction timelines, top cities, and strategy fit.`,
  keywords: [
    "best states for rental property investors",
    "rental property by state",
    "real estate investing by state",
    "landlord friendly states",
    "rental property tax by state",
  ],
  alternates: { canonical: "/states" },
  openGraph: {
    title: "Rental property investing by state",
    description: `${STATE_COUNT} state guides for rental property investors.`,
    url: "/states",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap state-by-state investing guide" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

export default function StatesIndexPage() {
  const siteUrl = getSiteUrl();
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Rental property investing by state — ${STATE_COUNT} guides`,
    itemListElement: Object.values(STATES).map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${siteUrl}/states/${s.slug}`,
      name: s.name,
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <Header />

      <main id="main" className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
        <p className="text-[11px] uppercase tracking-widest text-primary font-bold">By state</p>
        <h1 className="mt-2 text-3xl sm:text-5xl font-extrabold text-foreground leading-[1.05] tracking-tight">
          Rental property investing by state
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-muted-foreground max-w-2xl">
          {STATE_COUNT} state guides across the variables that actually matter — property tax burden, landlord-friendliness, eviction speed, insurance volatility, and the cities where the math currently works.
        </p>

        <div className="tc-reveal mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.values(STATES)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((s) => (
              <Link
                key={s.slug}
                href={`/states/${s.slug}`}
                className="block rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <p className="text-[11px] uppercase tracking-widest text-primary font-bold">{s.tier}</p>
                <p className="mt-1 text-lg font-extrabold text-foreground">{s.name}</p>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-3">{s.pitch.slice(0, 130)}…</p>
                <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <span>Tax {s.propertyTaxRatePct}%</span>
                  <span>·</span>
                  <span>Eviction {s.evictionTimelineDays}d</span>
                  <span>·</span>
                  <span className="font-semibold text-foreground/80">{s.landlord}</span>
                </p>
              </Link>
            ))}
        </div>
      </main>

      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
