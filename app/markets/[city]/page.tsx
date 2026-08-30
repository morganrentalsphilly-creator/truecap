/**
 * Dynamic city market page at /markets/[city].
 *
 * Data-driven local-SEO landing page generated from MARKET_CITIES
 * (lib/markets/cities.ts). Mirrors the bespoke market pages (e.g.
 * app/markets/philadelphia) but scales from a dataset so we can add
 * cities without hand-writing a page each time.
 *
 * Only checked-in HUD rent data is rendered as a numeric market fact. The
 * hand-curated city, cap-rate, price, tax, neighborhood, and strategy records
 * remain internal stale-review inputs until authoritative dependencies are
 * attached; they must not leak into visible copy or structured data. Bespoke
 * static routes under app/markets/<city>/page.tsx take precedence.
 */

import type { Metadata } from "next";
import { SourceMethodologyBox } from "@/components/marketing/source-methodology-box";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calculator, MapPin } from "lucide-react";
import { Header } from "@/components/investcalc/header";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import {
  MARKET_CITIES,
  getMarketCity,
  getMarketCityParams,
} from "@/lib/markets/cities";
import { HUD_RENTS } from "@/lib/markets/hud-rents";
import { SAFMR_RENTS } from "@/lib/markets/safmr-rents";
import {
  buildMarketCityDescription,
  buildMarketCityTitle,
} from "@/lib/markets/market-city-seo";
import { SeoAnalyzerCta } from "@/components/marketing/seo-analyzer-cta";
import { CityStrategyGuides } from "@/components/marketing/city-strategy-guides";
import { isCalculatorReleased } from "@/lib/calculator-registry";
import { getSiteUrl } from "@/lib/site-url";
import { STATES } from "@/lib/states";

// Candidates only. Anything not currently released is filtered out below, so
// a market page can never link a reader to a gated tool. The previous list
// pointed four of its five links at calculators that now fail closed.
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

  // Question-first title targeting "Is [City] a good place to buy rental
  // property in 2026?" (the SERP moving companies currently win). The
  // helper guarantees ≤50 chars pre-template — unit-tested in
  // lib/__tests__/markets-data-bar.test.ts. Detail lives in the description.
  const title = buildMarketCityTitle(data.name);
  // Built from fixed-width parts so it always lands under ~160 chars —
  // the old `.slice(0, 300)` shipped over-length, mid-word-truncated
  // descriptions. The blurb still leads og:description below.
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

  // State investing guide for this city's state (if one exists) — used for
  // the breadcrumb crumb + a contextual link so city pages feed link equity
  // up to the previously-orphaned /states cluster.
  const stateSlug = Object.values(STATES).find(
    (s) => s.name === data.stateName,
  )?.slug;

  // Checked-in HUD Fair Market Rent is the only numeric market context this
  // template may publish. Never fall back to the hand-authored city range.
  const hud = HUD_RENTS[data.slug];
  const rentDisplay = hud
    ? `$${hud.rent2br.toLocaleString("en-US")}–$${hud.rent3br.toLocaleString("en-US")}/mo`
    : "No checked-in HUD value";

  // ZIP-level Small Area FMR table (build-market-safmr) — only ~1/3 of
  // market cities sit in a HUD SAFMR entity; the section renders nothing
  // for the rest (invisible until useful).
  const safmr = SAFMR_RENTS[data.slug];

  const verdictLead = `A citywide label cannot determine whether a ${data.name} property fits your criteria.`;
  const verdictDetail = hud
    ? `HUD's FY${hud.year} area benchmark for 2–3 bedroom units is ${rentDisplay}. It is not a property rent comp, collected-rent claim, or investment conclusion.`
    : "This page does not substitute an unsourced cap-rate, price, tax, or rent estimate for property-specific evidence.";

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
    // Real last-substantive-change date (2026 retarget + SAFMR tables).
    dateModified: "2026-07-14",
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
          text: `${verdictLead} ${verdictDetail} For a supported address and asking price, TrueCap can calculate a preliminary cap rate, cash flow, and DSCR from labeled, editable assumptions. A 10-year planning view requires entitled access. No result is an appraisal, lender approval, or investment recommendation.`,
        },
      },
      {
        "@type": "Question",
        name: `How should I evaluate a cap rate in ${data.name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `There is no authoritative cap-rate figure in this page's checked-in sources. Calculate the property from verified income, operating expenses, and asking price, then compare it with dated local evidence using the same NOI convention.`,
        },
      },
      {
        "@type": "Question",
        name: `What's the average rent for a rental in ${data.name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: hud
            ? `HUD's FY${hud.year} Fair Market Rent area benchmark for 2–3 bedroom units is ${rentDisplay}. It is not an address-level comp, asking-rent forecast, payment standard, or collection promise. Verify it against current comparable leases and the specific property.`
            : `This page does not publish an unsourced city rent estimate. Use current comparable leases and property-specific evidence. TrueCap may start with a labeled HUD area benchmark when available.`,
        },
      },
      {
        "@type": "Question",
        name: `What is the property tax rate in ${data.stateName}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `This page does not publish a statewide rate as the property's tax. Enter a current parcel bill or reviewed local effective rate and investigate the applicable assessment, exemption, transfer, and appeal rules with authoritative local sources.`,
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
          <strong>{verdictLead}</strong> {verdictDetail}
        </p>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Review the specific address, asking price, rent evidence, parcel tax,
          insurance, condition, operating costs, financing, and local rules.
          Hand-curated city estimates remain hidden until their source and as-of
          dependencies are attached.
        </p>

        {/* Checked-in public context */}
        <section className="mt-10 rounded-2xl border border-border bg-card p-6">
          <p className="text-[11px] uppercase tracking-widest text-primary font-bold">
            {data.name} checked-in public context
          </p>
          {hud ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  HUD 2BR area benchmark
                </p>
                <p className="mt-1 text-lg font-extrabold text-foreground">
                  ${hud.rent2br.toLocaleString("en-US")}/mo
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  HUD 3BR area benchmark
                </p>
                <p className="mt-1 text-lg font-extrabold text-foreground">
                  ${hud.rent3br.toLocaleString("en-US")}/mo
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              No checked-in HUD rent value is available for this page. No
              hand-authored market estimate is substituted.
            </p>
          )}
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            HUD FMR is an area housing-program benchmark, not a property rent
            comp, asking-rent forecast, or collection promise. This template
            intentionally omits unsourced cap-rate, price, property-tax,
            appreciation, vacancy, and strategy-fit values.
          </p>
          {hud ? (
            <SourceMethodologyBox
              className="mt-4"
              sources={["HUD Fair Market Rent"]}
              updated={`HUD FY${hud.year}`}
              note="Only the displayed HUD area benchmark is attributed to this source. No cap-rate, price, tax, legal, or investment conclusion is inferred from it."
              confidence="Area-level housing-program benchmark; verify current property-specific comparable leases and program figures."
            />
          ) : null}
        </section>

        {/* Rent-by-ZIP (HUD Small Area FMR) — only for cities in a SAFMR entity */}
        {safmr ? (
          <section className="mt-12">
            <h2 className="text-2xl font-extrabold text-foreground mb-3">
              HUD Small Area Fair Market Rents for {data.name}
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              HUD publishes ZIP-level Small Area Fair Market Rents for the{" "}
              {safmr.areaName}, the FMR region that includes {data.name}. These
              housing-program benchmarks vary by ZIP and bedroom count; they are
              not property rent comps or investment conclusions.
            </p>
            <div className="mt-4 overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[24rem] text-sm">
                <caption className="sr-only">
                  HUD Small Area Fair Market Rent by ZIP code, {safmr.areaName},
                  FY{safmr.year}
                </caption>
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-left">
                    <th
                      scope="col"
                      className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground"
                    >
                      ZIP code
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-widest text-muted-foreground"
                    >
                      2BR rent
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-widest text-muted-foreground"
                    >
                      3BR rent
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {safmr.rows.map((r) => (
                    <tr
                      key={r.zip}
                      className="border-b border-border last:border-b-0"
                    >
                      <td className="px-4 py-2.5 font-semibold text-foreground">
                        {r.zip}
                      </td>
                      <td className="px-4 py-2.5 text-right text-foreground">
                        ${r.rent2br.toLocaleString("en-US")}/mo
                      </td>
                      <td className="px-4 py-2.5 text-right text-foreground">
                        ${r.rent3br.toLocaleString("en-US")}/mo
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {safmr.rows.length < safmr.zipCount
                ? `Showing ${safmr.rows.length} of ${safmr.zipCount} ZIP codes in the ${safmr.areaName} — the HUD FMR region that includes ${data.name} — sampled highest to lowest across the rent range. `
                : `All ${safmr.zipCount} ZIP codes in the ${safmr.areaName}, highest rent first. `}
              Source:{" "}
              <a
                href="https://www.huduser.gov/portal/datasets/fmr/smallarea/index.html"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary hover:underline"
              >
                HUD FY{safmr.year} Small Area Fair Market Rents
              </a>
              . For a supported {data.name} address, TrueCap starts with a HUD
              rent benchmark at the ZIP level when available and otherwise uses
              the broader FMR area; verify property-specific rent independently.
            </p>
          </section>
        ) : null}

        {/* Property-specific review boundary. Hand-authored city narratives and
            neighborhood recommendations stay hidden while stale-review. */}
        <section className="mt-12">
          <h2 className="text-2xl font-extrabold text-foreground mb-3">
            What to verify for a {data.name} property
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-base leading-relaxed text-foreground">
            <li>
              Current comparable leases and the subject property&apos;s lease or
              collection history.
            </li>
            <li>
              The parcel&apos;s current tax bill and applicable assessment,
              exemption, and transfer rules.
            </li>
            <li>
              Property-specific insurance availability, coverage, exclusions,
              deductibles, and premium.
            </li>
            <li>
              Condition, inspection findings, operating responsibilities,
              utilities, HOA terms, and planned work.
            </li>
            <li>
              Written financing terms and the lender&apos;s own
              qualifying-income, expense, DSCR, and reserve method.
            </li>
          </ul>
          {stateSlug ? (
            <p className="mt-4 text-sm">
              <Link
                href={`/states/${stateSlug}`}
                className="font-semibold text-primary hover:underline"
              >
                Review the {data.stateName} source-and-verification guide →
              </Link>
            </p>
          ) : null}
        </section>

        <div className="mt-12">
          <SeoAnalyzerCta
            context={`a ${data.name} property`}
            handoff={{ address: `${data.name}, ${data.stateCode}` }}
            utmSource="market-page"
            supportingText={`Start with safe ${data.name} market context, then verify the address, rent, property tax, insurance, and every other assumption before relying on the screen.`}
          />
        </div>

        {/* Source-first long-tail pages must be reachable from their city
            parent. The shared registry filters unreleased specialist models,
            so this creates crawl paths only for released strategy guides. */}
        <CityStrategyGuides citySlug={data.slug} cityName={data.name} />

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

        {/* Related reading */}
        {data.relatedPosts.length > 0 ? (
          <section className="mt-12 border-t border-border pt-6">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-3">
              Related reading
            </p>
            <ul className="space-y-1.5 text-sm">
              {data.relatedPosts.map((slug) => (
                <li key={slug}>
                  <Link
                    href={`/blog/${slug}`}
                    className="text-primary font-semibold hover:underline"
                  >
                    /blog/{slug.replaceAll("-", " ")} →
                  </Link>
                </li>
              ))}
            </ul>
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
