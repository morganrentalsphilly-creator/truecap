/**
 * Dynamic city market page at /markets/[city].
 *
 * Data-first local page generated from MARKET_CITIES (lib/markets/cities.ts).
 * Bespoke static routes under app/markets/<city>/page.tsx take precedence;
 * both render paths share the sections in
 * components/marketing/safe-market-page.tsx and one data builder,
 * lib/markets/market-page-data.ts.
 *
 * What the page publishes (F8, founder decision 2026-09-27: "reframe to
 * data"): the title and H1 "{City}, {ST} Rental Market Data ({HUD FY})"; HUD
 * Fair Market Rent for the slug's FMR area with its prior fiscal year
 * (hud-rents.ts, hud-fmr-areas.ts) and ZIP-level SAFMR rows when HUD has them;
 * a sample underwrite run through the real engine with the HUD 3-bedroom FMR;
 * any sourced local facts (content/seo/market-facts.json); a visible,
 * data-only FAQ whose FAQPage JSON-LD mirrors it; and a sources box with the
 * "Data as of HUD FY…" line. A city without HUD rent stays short, honest, and
 * `noindex, follow` (lib/markets/indexability.ts). The hand-authored blurb,
 * ranges, angle, and neighborhood fields in cities.ts are not rendered.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calculator } from "lucide-react";
import { Header } from "@/components/investcalc/header";
import { CityStrategyGuides } from "@/components/marketing/city-strategy-guides";
import { DataFaq } from "@/components/marketing/data-faq";
import {
  MarketBreadcrumb,
  MarketFmrSection,
  MarketHero,
  MarketLocalData,
  MarketRelatedReading,
  MarketSampleUnderwrite,
  MarketSources,
  MarketVerifyLocally,
  marketKeywords,
} from "@/components/marketing/safe-market-page";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SeoAnalyzerCta } from "@/components/marketing/seo-analyzer-cta";
import { SiteFooter } from "@/components/marketing/site-footer";
import { isCalculatorReleased } from "@/lib/calculator-registry";
import {
  BESPOKE_MARKETS,
  MARKET_CITIES,
  getMarketCity,
  getMarketCityParams,
} from "@/lib/markets/cities";
import { NOINDEX_FOLLOW, isMarketIndexable } from "@/lib/markets/indexability";
import { buildMarketPageData } from "@/lib/markets/market-page-data";
import { MARKET_DATA_ATTRIBUTE } from "@/lib/markets/thin";
import { getSiteUrl } from "@/lib/site-url";
import { STATES } from "@/lib/states";
import { lastmodFor } from "@/lib/seo/lastmod";
import { JsonLd } from "@/components/seo/json-ld";

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

  // "{City}, {ST} Rental Market Data ({HUD FY})". The helper keeps it within
  // MARKET_TITLE_MAX pre-template — unit-tested in
  // lib/__tests__/markets-data-bar.test.ts.
  const page = buildMarketPageData({
    slug: data.slug,
    city: data.name,
    stateCode: data.stateCode,
  });

  return {
    title: page.title,
    description: page.description,
    keywords: marketKeywords(data.name),
    alternates: { canonical: `/markets/${data.slug}` },
    // A city page without HUD rent is a template, not a page worth ranking.
    robots: isMarketIndexable(data.slug) ? undefined : NOINDEX_FOLLOW,
    openGraph: {
      title: page.title,
      description: page.description,
      url: `/markets/${data.slug}`,
      type: "article",
      images: [{ url: "/home.jpg", width: 1200, height: 630, alt: page.title }],
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
  const page = buildMarketPageData({
    slug: data.slug,
    city: data.name,
    stateCode: data.stateCode,
  });

  // State guide for this city's state (if one exists) — breadcrumb crumb plus
  // a contextual link so city pages feed link equity up to /states.
  const stateSlug =
    Object.values(STATES).find((s) => s.name === data.stateName)?.slug ?? null;

  // Cross-link to other programmatic markets + a few bespoke metros.
  const otherMarkets = MARKET_CITIES.filter((c) => c.slug !== data.slug).slice(
    0,
    6,
  );
  const bespokeHighlights = BESPOKE_MARKETS.filter((m) =>
    ["philadelphia", "cleveland", "atlanta", "tampa"].includes(m.slug),
  );

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "TrueCap", item: siteUrl },
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
    name: page.title,
    description: page.description,
    url: canonicalUrl,
    // The page's own last significant change (content/seo/lastmod.json); omitted when it has none.
    dateModified: lastmodFor(`/markets/${data.slug}`),
    inLanguage: "en-US",
    isPartOf: { "@id": `${siteUrl}/#website` },
    author: { "@id": `${siteUrl}/#organization` },
  };
  const mainData = { [MARKET_DATA_ATTRIBUTE]: page.status };

  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={webPageLd} />
      <JsonLd data={breadcrumbLd} />
      <Header />

      <main
        id="main"
        {...mainData}
        className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12"
      >
        <MarketBreadcrumb
          city={data.name}
          stateName={data.stateName}
          stateSlug={stateSlug}
        />
        <MarketHero city={data.name} stateCode={data.stateCode} data={page} />

        {page.hud ? (
          <>
            <MarketFmrSection city={data.name} data={page} />
            <MarketSampleUnderwrite city={data.name} hud={page.hud} />
          </>
        ) : null}

        <MarketLocalData city={data.name} facts={page.facts} />

        <DataFaq
          heading={`${data.name} rental data: common questions`}
          items={page.faq}
        />

        <MarketSources data={page} />

        <MarketVerifyLocally city={data.name} />

        {stateSlug ? (
          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
            For {data.stateName} data, see the{" "}
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

        {page.hud ? <MarketRelatedReading postSlugs={data.relatedPosts} /> : null}

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
            {[...otherMarkets, ...bespokeHighlights].map((c) => (
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
