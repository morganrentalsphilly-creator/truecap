/**
 * Dynamic state page at /states/[slug].
 *
 * Renders the state record's own starting numbers (lib/states.ts: pitch,
 * market tier, landlord-tenant lean, typical effective property-tax rate)
 * plus HUD Fair Market Rent for every market city in the state, linked. The
 * page is `noindex, follow` unless lib/markets/indexability.ts confirms it
 * clears STATE_PAGE_MIN_WORDS of real content with at least one HUD city.
 * The record's median price/rent, eviction timeline, income-tax rate,
 * pros/cons, strategy list, and insurance note are not rendered.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Header } from "@/components/investcalc/header";
import { MarketDataAsOf } from "@/components/marketing/safe-market-page";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SeoAnalyzerCta } from "@/components/marketing/seo-analyzer-cta";
import { SiteFooter } from "@/components/marketing/site-footer";
import {
  NOINDEX_FOLLOW,
  STATE_PAGE_GUIDANCE,
  buildStateFacts,
  describeStateHudCity,
  getStateBespokeMarkets,
  getStateDataYear,
  getStateHudCities,
  isStateIndexable,
} from "@/lib/markets/indexability";
import { getSiteUrl } from "@/lib/site-url";
import { STATES, getStateBySlug } from "@/lib/states";

const usd = (value: number) => `$${Math.round(value).toLocaleString("en-US")}`;

export async function generateStaticParams() {
  return Object.values(STATES).map((state) => ({ slug: state.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const state = getStateBySlug(slug);
  if (!state) return { title: "State not found" };

  const title = `${state.name} rental property guide`;
  const description = `${state.name} starting numbers for a rental screen: market tier, landlord-tenant lean, property tax, and HUD Fair Market Rent by city.`;

  return {
    title,
    description,
    keywords: [
      `${state.name.toLowerCase()} rental property analysis`,
      `${state.name.toLowerCase()} property tax rate`,
      `${state.name.toLowerCase()} landlord tenant law`,
      `${state.abbr.toLowerCase()} rental property`,
    ],
    alternates: { canonical: `/states/${state.slug}` },
    // Thin state pages stay crawlable but unindexed.
    robots: isStateIndexable(state.slug) ? undefined : NOINDEX_FOLLOW,
    openGraph: {
      title,
      description,
      url: `/states/${state.slug}`,
      type: "article",
      images: [
        {
          url: "/home.jpg",
          width: 1200,
          height: 630,
          alt: `${state.name} rental property guide`,
        },
      ],
    },
    twitter: { card: "summary_large_image", images: ["/home.jpg"] },
  };
}

export default async function StatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const state = getStateBySlug(slug);
  if (!state) notFound();

  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/states/${state.slug}`;
  const year = getStateDataYear(state.slug);
  const facts = buildStateFacts(state);
  const hudCities = getStateHudCities(state.name);
  const bespoke = getStateBespokeMarkets(state.name);
  const description = `${state.name} starting numbers for a rental screen: market tier, landlord-tenant lean, property tax, and HUD Fair Market Rent by city.`;
  const cell =
    "px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground";

  const placeLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: state.name,
    url: canonicalUrl,
    address: {
      "@type": "PostalAddress",
      addressRegion: state.abbr,
      addressCountry: "US",
    },
  };
  const webPageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonicalUrl}#page`,
    name: `${state.name} rental property guide`,
    description,
    url: canonicalUrl,
    dateModified: "2026-09-06",
    inLanguage: "en-US",
    isPartOf: { "@id": `${siteUrl}/#website` },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: "States",
        item: `${siteUrl}/states`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: state.name,
        item: canonicalUrl,
      },
    ],
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Is ${state.name} a good state for rental property?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${state.pitch} TrueCap lists ${state.name} as a ${state.tier.toLowerCase()} market with ${facts[1].value.toLowerCase()} landlord-tenant law. Whether a specific property works depends on its own price, rent, tax bill, and insurance.`,
        },
      },
      {
        "@type": "Question",
        name: `What property-tax rate should I use for a ${state.name} rental?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `TrueCap's ${state.name} default is ${state.propertyTaxRatePct}% of value, a typical effective rate. Replace it with the parcel's current bill from the county assessor and check how the assessment resets after a sale.`,
        },
      },
      {
        "@type": "Question",
        name: `What is the rent benchmark for ${state.name} cities?`,
        acceptedAnswer: {
          "@type": "Answer",
          text:
            hudCities.length > 0
              ? `HUD Fair Market Rent, FY${year}: ${hudCities
                  .map(
                    (city) =>
                      `${city.name} ${usd(city.hud.rent2br)} (2BR) / ${usd(city.hud.rent3br)} (3BR)`,
                  )
                  .join("; ")}. Each figure is a housing-program benchmark for the county or metro, not a comp for one property.`
              : `TrueCap has no published HUD rent benchmark for a ${state.name} city yet. Use current comparable leases for the property.`,
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(placeLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <Header />

      <main id="main" className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs">
          <ol className="flex flex-wrap items-center gap-2 text-muted-foreground">
            <li>
              <Link href="/" className="hover:text-foreground">
                Home
              </Link>
            </li>
            <li aria-hidden="true">›</li>
            <li>
              <Link href="/states" className="hover:text-foreground">
                States
              </Link>
            </li>
            <li aria-hidden="true">›</li>
            <li className="font-semibold text-foreground">{state.name}</li>
          </ol>
        </nav>

        <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
          {state.abbr} · Rental property guide
        </p>
        <h1 className="mt-2 text-3xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
          {state.name} rental property guide
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-foreground">
          {state.pitch}
        </p>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          {STATE_PAGE_GUIDANCE.intro(state.name)}
        </p>
        <MarketDataAsOf year={year} />

        <section
          data-state-facts=""
          className="mt-10 rounded-2xl border border-border bg-card p-6"
        >
          <h2 className="text-xl font-extrabold text-foreground">
            {state.name} at a glance
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {fact.label}
                </dt>
                <dd className="mt-1 text-lg font-extrabold text-foreground">
                  {fact.value}
                </dd>
                <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {fact.note}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section data-state-hud-cities="" className="mt-10">
          <h2 className="text-2xl font-extrabold text-foreground">
            HUD Fair Market Rent by {state.name} city
          </h2>
          <p className="mt-2 text-base leading-relaxed text-muted-foreground">
            {STATE_PAGE_GUIDANCE.fmr(state.name, year)}
          </p>
          {hudCities.length > 0 ? (
            <div className="mt-4 overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[24rem] text-sm">
                <caption className="sr-only">
                  HUD Fair Market Rent, FY{year}, by {state.name} market city
                </caption>
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-left">
                    <th scope="col" className={cell}>
                      City
                    </th>
                    <th scope="col" className={`${cell} text-right`}>
                      2BR / month
                    </th>
                    <th scope="col" className={`${cell} text-right`}>
                      3BR / month
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {hudCities.map((city) => (
                    <tr
                      key={city.slug}
                      className="border-b border-border last:border-b-0"
                    >
                      <td className="px-4 py-2.5 font-semibold">
                        <Link
                          href={`/markets/${city.slug}`}
                          className="inline-flex min-h-11 items-center text-primary hover:underline"
                          aria-label={describeStateHudCity(city)}
                        >
                          {city.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-right text-foreground">
                        {usd(city.hud.rent2br)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-foreground">
                        {usd(city.hud.rent3br)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              TrueCap has no published HUD rent benchmark for a {state.name}{" "}
              city yet.
            </p>
          )}
          {bespoke.length > 0 ? (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              More {state.name} city pages:{" "}
              {bespoke.map((market, index) => (
                <span key={market.slug}>
                  {index > 0 ? ", " : ""}
                  <Link
                    href={`/markets/${market.slug}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    {market.name}
                  </Link>
                </span>
              ))}
              .
            </p>
          ) : null}
        </section>

        <section data-state-verify-locally="" className="mt-10">
          <h2 className="text-2xl font-extrabold text-foreground">
            Three things to verify locally
          </h2>
          <ul className="mt-4 space-y-3">
            {STATE_PAGE_GUIDANCE.verify.map((item) => (
              <li
                key={item.title}
                className="flex gap-3 text-base leading-relaxed"
              >
                <CheckCircle2 className="mt-1 size-4 shrink-0 text-primary" />
                <span>
                  <strong className="text-foreground">{item.title}.</strong>{" "}
                  <span className="text-muted-foreground">{item.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-10">
          <SeoAnalyzerCta
            context={`a ${state.name} property`}
            utmSource="state-page"
            supportingText={STATE_PAGE_GUIDANCE.run(state.name)}
          />
        </div>

        <section className="mt-12 border-t border-border pt-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Other state guides
          </p>
          <div className="flex flex-wrap gap-2 text-sm">
            {Object.values(STATES)
              .filter((candidate) => candidate.slug !== state.slug)
              .map((candidate) => (
                <Link
                  key={candidate.slug}
                  href={`/states/${candidate.slug}`}
                  className="rounded-full border border-border bg-card px-3 py-1.5 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary"
                >
                  {candidate.name}
                </Link>
              ))}
          </div>
        </section>
      </main>

      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
