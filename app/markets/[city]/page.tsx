/**
 * Dynamic city market page at /markets/[city].
 *
 * Data-driven local-SEO landing page generated from MARKET_CITIES
 * (lib/markets/cities.ts). Bespoke static routes under
 * app/markets/<city>/page.tsx take precedence; both render paths share the
 * sections in components/marketing/safe-market-page.tsx.
 *
 * What the page publishes (docs/site-overhaul.md Phase 8.1): HUD Fair Market
 * Rent for the slug (hud-rents.ts, plus ZIP-level SAFMR rows when HUD has
 * them), a sample underwrite run through the real engine with the HUD
 * 3-bedroom rent, and plain local-verification guidance. A city without HUD
 * rent stays short, honest, and `noindex, follow`
 * (lib/markets/indexability.ts). The hand-authored blurb, ranges, angle, and
 * neighborhood fields in cities.ts are not rendered.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calculator, MapPin } from "lucide-react";
import { Header } from "@/components/investcalc/header";
import { CityStrategyGuides } from "@/components/marketing/city-strategy-guides";
import {
  MarketDataAsOf,
  MarketFmrSection,
  MarketRelatedReading,
  MarketSampleUnderwrite,
  MarketVerifyLocally,
} from "@/components/marketing/safe-market-page";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SeoAnalyzerCta } from "@/components/marketing/seo-analyzer-cta";
import { SiteFooter } from "@/components/marketing/site-footer";
import { calculateAnalysis } from "@/lib/calc-analysis";
import { isCalculatorReleased } from "@/lib/calculator-registry";
import {
  MARKET_CITIES,
  getMarketCity,
  getMarketCityParams,
} from "@/lib/markets/cities";
import {
  NOINDEX_FOLLOW,
  getMarketDataYear,
  getMarketHudRent,
  isMarketIndexable,
} from "@/lib/markets/indexability";
import {
  buildMarketCityDescription,
  buildMarketCityTitle,
} from "@/lib/markets/market-city-seo";
import { SAFMR_RENTS } from "@/lib/markets/safmr-rents";
import { SAMPLE_DEAL_FIXTURE } from "@/lib/sample-deal";
import { getSiteUrl } from "@/lib/site-url";
import { STATES } from "@/lib/states";

// Candidates only. Anything not currently released is filtered out below, so
// a market page can never link a reader to a gated tool.
const RELATED_TOOL_CANDIDATES: { slug: string; label: string }[] = [
  { slug: "mortgage-payment-calculator", label: "Mortgage payment calculator" },
  { slug: "break-even-calculator", label: "Break-even calculator" },
  { slug: "vacancy-rate-calculator", label: "Vacancy rate calculator" },
  { slug: "closing-cost-calculator", label: "Closing cost calculator" },
  { slug: "gross-rent-multiplier-calculator", label: "Gross rent multiplier" },
];

const RELATED_TOOLS = RELATED_TOOL_CANDIDATES.filter((tool) =>
  isCalculatorReleased(tool.slug),
);

const usd = (value: number) => `$${Math.round(value).toLocaleString("en-US")}`;

export async function generateStaticParams() {
  return getMarketCityParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city } = await params;
  const data = getMarketCity(city);
  if (!data) return { title: "Market not found" };

  // Question-first title targeting "Is [City] a good place to buy rental
  // property in 2026?" The helper guarantees ≤50 chars pre-template —
  // unit-tested in lib/__tests__/markets-data-bar.test.ts.
  const title = buildMarketCityTitle(data.name);
  const description = buildMarketCityDescription(data.name, null);

  return {
    title,
    description,
    keywords: [
      `${data.name.toLowerCase()} rental property analysis`,
      `${data.name.toLowerCase()} cap rate`,
      `${data.name.toLowerCase()} rental property calculator`,
      `${data.name.toLowerCase()} investment property`,
      `average rent ${data.name.toLowerCase()}`,
      `${data.name.toLowerCase()} cash flow`,
      `is ${data.name.toLowerCase()} good for rental property`,
    ],
    alternates: { canonical: `/markets/${data.slug}` },
    // A city page without HUD rent is a template, not a page worth ranking.
    robots: isMarketIndexable(data.slug) ? undefined : NOINDEX_FOLLOW,
    openGraph: {
      title,
      description,
      url: `/markets/${data.slug}`,
      type: "article",
      images: [{ url: "/home.jpg", width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", images: ["/home.jpg"] },
  };
}

export default async function MarketCityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;
  const data = getMarketCity(city);
  if (!data) notFound();

  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/markets/${data.slug}`;

  // State guide for this city's state (if one exists) — breadcrumb crumb plus
  // a contextual link so city pages feed link equity up to /states.
  const stateSlug = Object.values(STATES).find(
    (s) => s.name === data.stateName,
  )?.slug;

  const hud = getMarketHudRent(data.slug);
  const year = getMarketDataYear(data.slug);
  const safmr = SAFMR_RENTS[data.slug];

  // The same sample the page renders, so the FAQ answers quote the page.
  const sample = hud
    ? calculateAnalysis({
        ...SAMPLE_DEAL_FIXTURE.values,
        address: `${data.name} sample`,
        monthlyRent: hud.rent3br,
      })
    : null;
  const samplePrice = SAMPLE_DEAL_FIXTURE.values.purchasePrice;
  const sampleCashFlow = sample ? Math.round(sample.netCashFlow) : null;

  const lead = hud
    ? `HUD Fair Market Rent, FY${hud.year}, puts a ${data.name} 2-bedroom at ${usd(hud.rent2br)}/mo and a 3-bedroom at ${usd(hud.rent3br)}/mo.`
    : `TrueCap has no published rent benchmark for ${data.name}.`;
  const detail =
    hud && sample && sampleCashFlow !== null
      ? `At a stated ${usd(samplePrice)} price with the 3-bedroom rent, the sample underwrite below comes to ${sampleCashFlow < 0 ? "−" : "+"}${usd(Math.abs(sampleCashFlow))}/mo cash flow, a ${sample.capRate.toFixed(1)}% cap rate, and a ${sample.dscr.toFixed(2)} DSCR. Whether a specific ${data.name} property works depends on its own price, rent, tax bill, and insurance.`
      : `Bring the property's own rent, tax bill, and insurance evidence, then run the address with every assumption labeled and editable.`;

  // Cross-link to other programmatic markets + a few bespoke flagship markets.
  const otherMarkets = MARKET_CITIES.filter((c) => c.slug !== data.slug).slice(
    0,
    6,
  );
  const bespokeHighlights = [
    { slug: "philadelphia", name: "Philadelphia" },
    { slug: "cleveland", name: "Cleveland" },
    { slug: "atlanta", name: "Atlanta" },
    { slug: "tampa", name: "Tampa" },
  ];

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: "Markets",
        item: `${siteUrl}/markets`,
      },
      ...(stateSlug
        ? [
            {
              "@type": "ListItem",
              position: 3,
              name: data.stateName,
              item: `${siteUrl}/states/${stateSlug}`,
            },
            {
              "@type": "ListItem",
              position: 4,
              name: data.name,
              item: canonicalUrl,
            },
          ]
        : [
            {
              "@type": "ListItem",
              position: 3,
              name: data.name,
              item: canonicalUrl,
            },
          ]),
    ],
  };

  const webPageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonicalUrl}#page`,
    name: `${data.name} rental property analysis`,
    description: buildMarketCityDescription(data.name, null),
    url: canonicalUrl,
    // Real last-substantive-change date (HUD table + sample underwrite).
    dateModified: "2026-09-06",
    inLanguage: "en-US",
    isPartOf: { "@id": `${siteUrl}/#website` },
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Is ${data.name} a good place to buy rental property in 2026?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${lead} ${detail} Enter an address and asking price and TrueCap shows cash flow, cap rate, DSCR, and the highest price that still meets your targets.`,
        },
      },
      {
        "@type": "Question",
        name: `What cap rate does a ${data.name} rental pencil to?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: sample
            ? `TrueCap's sample underwrite at a stated ${usd(samplePrice)} price with the HUD FY${hud!.year} 3-bedroom rent of ${usd(hud!.rent3br)}/mo comes to a ${sample.capRate.toFixed(1)}% cap rate. That is a sample, not a listing. A specific property's cap rate comes from its own rent, operating expenses, and price.`
            : `TrueCap doesn't publish a ${data.name} cap rate. A property's cap rate comes from its own rent, operating expenses, and price; run the address to see it.`,
        },
      },
      {
        "@type": "Question",
        name: `What's the average rent for a rental in ${data.name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: hud
            ? `HUD Fair Market Rent, FY${hud.year}, for the area that contains ${data.name} is ${usd(hud.rent2br)}/mo for 2 bedrooms and ${usd(hud.rent3br)}/mo for 3 bedrooms. It is a housing-program benchmark for the county or metro, not a comp for one property. Check it against current leases for the address.`
            : `TrueCap has no published rent benchmark for ${data.name}. Use current comparable leases for the property.`,
        },
      },
      {
        "@type": "Question",
        name: `What property tax should I use for a ${data.name} rental?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Use the parcel's current bill from the county assessor, and check how the assessment resets after a sale. TrueCap's sample uses ${SAMPLE_DEAL_FIXTURE.values.propertyTaxPct}% of price as a default; replace it with the local number.`,
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
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

      <main id="main" className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 text-xs">
          <ol className="flex flex-wrap items-center gap-2 text-muted-foreground">
            <li>
              <Link href="/" className="hover:text-foreground">
                Home
              </Link>
            </li>
            <li aria-hidden="true">›</li>
            <li>
              <Link href="/markets" className="hover:text-foreground">
                Markets
              </Link>
            </li>
            <li aria-hidden="true">›</li>
            {stateSlug ? (
              <>
                <li>
                  <Link
                    href={`/states/${stateSlug}`}
                    className="hover:text-foreground"
                  >
                    {data.stateName}
                  </Link>
                </li>
                <li aria-hidden="true">›</li>
              </>
            ) : null}
            <li className="font-semibold text-foreground">{data.name}</li>
          </ol>
        </nav>

        {/* Hero */}
        <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-primary font-bold">
          <MapPin className="size-3.5" /> {data.name}, {data.stateCode}
        </p>
        <h1 className="mt-2 text-3xl sm:text-5xl font-extrabold text-foreground leading-[1.05] tracking-tight">
          Is {data.name} a good place to buy rental property in 2026?
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-foreground">
          <strong>{lead}</strong> {detail}
        </p>
        <MarketDataAsOf year={year} />

        {hud ? (
          <>
            <MarketFmrSection city={data.name} hud={hud} safmr={safmr} />
            <MarketSampleUnderwrite city={data.name} hud={hud} />
          </>
        ) : null}

        <MarketVerifyLocally city={data.name} />

        {stateSlug ? (
          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
            For the state&apos;s starting numbers, see the{" "}
            <Link
              href={`/states/${stateSlug}`}
              className="font-semibold text-primary hover:underline"
            >
              {data.stateName} guide
            </Link>
            .
          </p>
        ) : null}

        <div className="mt-10">
          <SeoAnalyzerCta
            context={`a ${data.name} property`}
            handoff={{ address: `${data.name}, ${data.stateCode}` }}
            utmSource="market-page"
            supportingText={`Start with ${data.name} context, then verify the address, rent, property tax, insurance, and every other assumption. Every assumption is labeled and editable.`}
          />
        </div>

        {/* Long-tail strategy guides must be reachable from their city parent.
            The helper filters unreleased specialist models. */}
        <CityStrategyGuides citySlug={data.slug} cityName={data.name} />

        {hud ? <MarketRelatedReading postSlugs={data.relatedPosts} /> : null}

        {/* Related calculators — released only; hidden if the gate empties it. */}
        {RELATED_TOOLS.length > 0 ? (
          <section className="mt-12 border-t border-border pt-6">
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground font-bold mb-3">
              <Calculator className="size-3.5" /> Free calculators
            </p>
            <div className="flex flex-wrap gap-2 text-sm">
              {RELATED_TOOLS.map((t) => (
                <Link
                  key={t.slug}
                  href={`/tools/${t.slug}`}
                  className="rounded-full border border-border bg-card px-3 py-1.5 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary"
                >
                  {t.label}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {/* Other markets */}
        <section className="mt-12 border-t border-border pt-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-3">
            Explore other markets
          </p>
          <div className="flex flex-wrap gap-2 text-sm">
            {otherMarkets.map((c) => (
              <Link
                key={c.slug}
                href={`/markets/${c.slug}`}
                className="rounded-full border border-border bg-card px-3 py-1.5 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary"
              >
                {c.name}
              </Link>
            ))}
            {bespokeHighlights.map((c) => (
              <Link
                key={c.slug}
                href={`/markets/${c.slug}`}
                className="rounded-full border border-border bg-card px-3 py-1.5 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary"
              >
                {c.name}
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
