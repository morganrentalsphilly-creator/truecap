/**
 * Dynamic city market page at /markets/[city].
 *
 * Data-driven local-SEO landing page generated from MARKET_CITIES
 * (lib/markets/cities.ts). Mirrors the bespoke market pages (e.g.
 * app/markets/philadelphia) but scales from a dataset so we can add
 * cities without hand-writing a page each time.
 *
 * Cap-rate context and property tax come from the same sources the
 * analyzer uses (getCapRateBenchmark, getStatePropertyTaxPct), so the
 * page never drifts from the product's own numbers. Bespoke static
 * routes under app/markets/<city>/page.tsx take precedence over this
 * dynamic route, so existing pages are untouched.
 */

import type { Metadata } from "next";
import { SourceMethodologyBox } from "@/components/marketing/source-methodology-box";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Calculator, MapPin, TrendingUp } from "lucide-react";
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
import { getCapRateBenchmark } from "@/lib/market-benchmarks";
import { marketStrategyFit } from "@/lib/market-strategy-fit";
import { buildAnalyzerHandoffUrl } from "@/lib/analyzer-handoff";
import { LeadMagnetInline } from "@/components/marketing/lead-magnet-capture";
import { getStatePropertyTaxPct } from "@/lib/property-enrichment/state-property-tax";
import { CityStrategyGuides } from "@/components/marketing/city-strategy-guides";
import { getSiteUrl } from "@/lib/site-url";
import { STATES } from "@/lib/states";

const RELATED_TOOLS: { slug: string; label: string }[] = [
  { slug: "cap-rate-calculator", label: "Cap rate calculator" },
  { slug: "cash-on-cash-calculator", label: "Cash-on-cash calculator" },
  { slug: "dscr-calculator", label: "DSCR calculator" },
  { slug: "mortgage-payment-calculator", label: "Mortgage payment calculator" },
  { slug: "rental-property-tax-calculator", label: "Rental property tax calculator" },
];

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
  const benchmark = getCapRateBenchmark(`${data.name}, ${data.stateCode}`);
  const tone = benchmark ? marketStrategyFit(benchmark.median).tone : null;
  const description = buildMarketCityDescription(data.name, tone);

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
      description: data.blurb,
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
  const stateSlug = Object.values(STATES).find((s) => s.name === data.stateName)?.slug;

  const benchmark = getCapRateBenchmark(`${data.name}, ${data.stateCode}`);
  const capMedian = benchmark ? `${benchmark.median.toFixed(1)}%` : "—";
  // Strategy-fit badge — a label over the same median cap rate shown below.
  const fit = benchmark ? marketStrategyFit(benchmark.median) : null;
  const fitToneClass =
    fit?.tone === "cashflow"
      ? "bg-[var(--brand-green-light)] text-[var(--brand-green)]"
      : fit?.tone === "appreciation"
        ? "bg-[var(--brand-blue-light)] text-primary"
        : "bg-muted text-foreground";
  const capScope = benchmark
    ? benchmark.scope === "metro"
      ? `${benchmark.scopeName} metro`
      : benchmark.scope === "state"
        ? `${benchmark.scopeName} state`
        : "U.S."
    : "U.S.";

  const taxRaw = getStatePropertyTaxPct(data.stateCode);
  const taxPct = typeof taxRaw === "number" ? `${taxRaw.toFixed(2)}%` : "varies";

  // Prefer real HUD Fair Market Rent (from build-market-rents) over the
  // hand-authored estimate range; fall back to the estimate when absent.
  const hud = HUD_RENTS[data.slug];
  const rentDisplay = hud
    ? `$${hud.rent2br.toLocaleString("en-US")}–$${hud.rent3br.toLocaleString("en-US")}/mo`
    : data.typicalRent;
  const rentSub = hud ? `HUD FMR · 2–3BR · ${hud.year}` : "est., SFR / small multi";

  // ZIP-level Small Area FMR table (build-market-safmr) — only ~1/3 of
  // market cities sit in a HUD SAFMR entity; the section renders nothing
  // for the rest (invisible until useful).
  const safmr = SAFMR_RENTS[data.slug];

  // Verdict-first answer to the H1 question, built from the same data the
  // rest of the page shows (cap-rate benchmark, HUD rent, state tax).
  // The ~6.5% national-median reference mirrors lib/market-strategy-fit.ts.
  const verdictLead =
    fit?.tone === "cashflow"
      ? "Short answer: yes — for cash-flow investors."
      : fit?.tone === "appreciation"
        ? "Short answer: it depends on your strategy."
        : fit
          ? "Short answer: yes — for balanced buy-and-hold."
          : "Short answer: run the numbers.";
  const verdictDetail =
    fit?.tone === "cashflow"
      ? `${data.name}'s median cap rate runs about ${capMedian} (${capScope} median), above the ~6.5% national median, with typical rent at ${rentDisplay} and ${data.stateName} property tax near ${taxPct}.`
      : fit?.tone === "appreciation"
        ? `${data.name} is an appreciation-first market — its ~${capMedian} median cap rate (${capScope}) sits below the ~6.5% national median, so the play is long-term price growth more than day-one cash flow. Typical rent runs ${rentDisplay}; ${data.stateName} property tax is about ${taxPct}.`
        : fit
          ? `${data.name}'s median cap rate of about ${capMedian} (${capScope} median) sits near the ~6.5% national median, with typical rent at ${rentDisplay} and ${data.stateName} property tax near ${taxPct}.`
          : `Typical rent runs ${rentDisplay} and ${data.stateName} property tax is about ${taxPct} — whether ${data.name} works depends on the specific deal.`;

  // Cross-link to other programmatic markets + a few bespoke flagship markets.
  const otherMarkets = MARKET_CITIES.filter((c) => c.slug !== data.slug).slice(0, 6);
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
      { "@type": "ListItem", position: 2, name: "Markets", item: `${siteUrl}/markets` },
      ...(stateSlug
        ? [
            {
              "@type": "ListItem",
              position: 3,
              name: data.stateName,
              item: `${siteUrl}/states/${stateSlug}`,
            },
            { "@type": "ListItem", position: 4, name: data.name, item: canonicalUrl },
          ]
        : [{ "@type": "ListItem", position: 3, name: data.name, item: canonicalUrl }]),
    ],
  };

  const webPageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonicalUrl}#page`,
    name: `${data.name} rental property analysis`,
    description: data.blurb,
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
          text: `${verdictLead} ${verdictDetail} Run any specific ${data.name} address through TrueCap for a full verdict — cap rate, cash flow, DSCR, and a 10-year projection — in about 60 seconds.`,
        },
      },
      {
        "@type": "Question",
        name: `What's a good cap rate in ${data.name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `In ${data.name}, cap rates typically run around ${capMedian} (${capScope} median). A deal above that line is outperforming the local market; below it, you're paying up for appreciation or stability. TrueCap shows where any specific ${data.name} deal lands versus this benchmark.`,
        },
      },
      {
        "@type": "Question",
        name: `What's the average rent for a rental in ${data.name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `A typical rental in ${data.name} runs about ${rentDisplay}${hud ? " (HUD Fair Market Rent, 2–3BR)" : " (estimate; varies by neighborhood, size, and condition)"}. TrueCap auto-fills HUD Fair Market Rent for the exact address you enter.`,
        },
      },
      {
        "@type": "Question",
        name: `What is the property tax rate in ${data.stateName}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${data.stateName}'s effective property tax rate is about ${taxPct} of value per year — the figure TrueCap applies by default for ${data.name} deals. You can override it with the exact local rate.`,
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <Header />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 text-xs">
          <ol className="flex flex-wrap items-center gap-2 text-muted-foreground">
            <li><Link href="/" className="hover:text-foreground">Home</Link></li>
            <li aria-hidden="true">›</li>
            <li><Link href="/markets" className="hover:text-foreground">Markets</Link></li>
            <li aria-hidden="true">›</li>
            {stateSlug ? (
              <>
                <li>
                  <Link href={`/states/${stateSlug}`} className="hover:text-foreground">
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
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">{data.blurb}</p>

        {/* Market snapshot */}
        <section className="mt-10 rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] uppercase tracking-widest text-primary font-bold">{data.name} market snapshot</p>
            {fit && (
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold ${fitToneClass}`}
                title={fit.blurb}
              >
                {fit.label}
              </span>
            )}
          </div>
          {fit && (
            <p className="mb-4 text-xs leading-relaxed text-muted-foreground">{fit.blurb}</p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Typical cap rate</p>
              <p className="mt-1 text-lg font-extrabold text-foreground">{capMedian}</p>
              <p className="text-[11px] text-muted-foreground">{capScope} median</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Typical rent</p>
              <p className="mt-1 text-lg font-extrabold text-foreground">{rentDisplay}</p>
              <p className="text-[11px] text-muted-foreground">{rentSub}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Typical price</p>
              <p className="mt-1 text-lg font-extrabold text-foreground">{data.typicalPrice}</p>
              <p className="text-[11px] text-muted-foreground">est., all-in</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Property tax</p>
              <p className="mt-1 text-lg font-extrabold text-foreground">{taxPct}</p>
              <p className="text-[11px] text-muted-foreground">{data.stateName} effective</p>
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Rent is HUD Fair Market Rent where available, otherwise a market estimate; price is a market estimate. Cap-rate and tax are the defaults TrueCap applies — enter a specific address for exact, auto-filled numbers.
          </p>
          <SourceMethodologyBox
            className="mt-4"
            sources={["HUD Fair Market Rent", "FRED 30-yr mortgage rate", "Tax Foundation (property tax)"]}
            updated="July 2026"
          />
        </section>

        {/* Rent-by-ZIP (HUD Small Area FMR) — only for cities in a SAFMR entity */}
        {safmr ? (
          <section className="mt-12">
            <h2 className="text-2xl font-extrabold text-foreground mb-3">
              What rents actually look like in {data.name}
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              One number never tells the story — HUD publishes ZIP-level Small Area Fair Market
              Rents for the {safmr.areaName}, the metro-wide FMR region that includes
              {" "}{data.name}, and the spread across its ZIP codes is where deals are won or
              lost. Same purchase price, different ZIP, very different rent.
            </p>
            <div className="mt-4 overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[24rem] text-sm">
                <caption className="sr-only">
                  HUD Small Area Fair Market Rent by ZIP code, {safmr.areaName}, FY{safmr.year}
                </caption>
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-left">
                    <th scope="col" className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">ZIP code</th>
                    <th scope="col" className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-widest text-muted-foreground">2BR rent</th>
                    <th scope="col" className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-widest text-muted-foreground">3BR rent</th>
                  </tr>
                </thead>
                <tbody>
                  {safmr.rows.map((r) => (
                    <tr key={r.zip} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-2.5 font-semibold text-foreground">{r.zip}</td>
                      <td className="px-4 py-2.5 text-right text-foreground">${r.rent2br.toLocaleString("en-US")}/mo</td>
                      <td className="px-4 py-2.5 text-right text-foreground">${r.rent3br.toLocaleString("en-US")}/mo</td>
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
              . TrueCap auto-fills the exact ZIP-level figure when you enter a {data.name} address.
            </p>
          </section>
        ) : null}

        {/* Why invest here */}
        <section className="mt-12">
          <h2 className="text-2xl font-extrabold text-foreground mb-3">Why {data.name} works for rental investors</h2>
          <p className="text-base leading-relaxed text-foreground">{data.investorAngle}</p>
          {stateSlug ? (
            <p className="mt-4 text-sm">
              <Link
                href={`/states/${stateSlug}`}
                className="font-semibold text-primary hover:underline"
              >
                See the full {data.stateName}{" "}investing guide — taxes, landlord law &amp; top metros →
              </Link>
            </p>
          ) : null}
        </section>

        {/* Neighborhoods */}
        <section className="mt-12">
          <h2 className="text-2xl font-extrabold text-foreground mb-4">Neighborhoods to look at in {data.name}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.neighborhoods.map((n) => (
              <article key={n.name} className="rounded-xl border border-border bg-card p-5">
                <p className="text-base font-bold text-foreground">{n.name}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{n.why}</p>
              </article>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Neighborhood notes are starting points, not recommendations — always underwrite the specific property.
          </p>
        </section>

        {/* Tool CTA */}
        <section className="mt-12 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="flex items-center gap-2 text-xl sm:text-2xl font-extrabold mb-2">
            <TrendingUp className="size-6" /> Run a {data.name} deal in 60 seconds
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-5">
            Paste a {data.name} address into TrueCap and get cap rate, cash-on-cash, DSCR, cash flow, and a 10-year projection — auto-filled with {data.stateName} tax and HUD rent so you start from the right assumptions.
          </p>
          <Link
            // Geo-prefilled handoff: the analyzer mounts with the city
            // pre-typed so the visitor is one address away from a verdict.
            // #main lands them ON the analyzer, not the top of the homepage.
            href={`${buildAnalyzerHandoffUrl(
              { address: `${data.name}, ${data.stateCode}` },
              { utmSource: "market-page" }
            )}#main`}
            className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity"
          >
            Get My Max Offer <ArrowRight className="size-4" />
          </Link>
        </section>

        {/* Lead magnet — the pack carries this market's HUD benchmarks. */}
        <div className="mt-10">
          <LeadMagnetInline source="markets" />
        </div>

        {/* City strategy guides (if any) — shared with the bespoke city
            pages via CityStrategyGuides so the two can't drift. */}
        <CityStrategyGuides citySlug={data.slug} cityName={data.name} />

        {/* Related calculators */}
        <section className="mt-12 border-t border-border pt-6">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground font-bold mb-3">
            <Calculator className="size-3.5" /> Free calculators
          </p>
          <div className="flex flex-wrap gap-2 text-sm">
            {RELATED_TOOLS.map((t) => (
              <Link key={t.slug} href={`/tools/${t.slug}`} className="rounded-full border border-border bg-card px-3 py-1.5 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary">
                {t.label}
              </Link>
            ))}
          </div>
        </section>

        {/* Related reading */}
        {data.relatedPosts.length > 0 ? (
          <section className="mt-12 border-t border-border pt-6">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-3">Related reading</p>
            <ul className="space-y-1.5 text-sm">
              {data.relatedPosts.map((slug) => (
                <li key={slug}>
                  <Link href={`/blog/${slug}`} className="text-primary font-semibold hover:underline">
                    /blog/{slug.replaceAll("-", " ")} →
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Other markets */}
        <section className="mt-12 border-t border-border pt-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-3">Explore other markets</p>
          <div className="flex flex-wrap gap-2 text-sm">
            {otherMarkets.map((c) => (
              <Link key={c.slug} href={`/markets/${c.slug}`} className="rounded-full border border-border bg-card px-3 py-1.5 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary">
                {c.name}
              </Link>
            ))}
            {bespokeHighlights.map((c) => (
              <Link key={c.slug} href={`/markets/${c.slug}`} className="rounded-full border border-border bg-card px-3 py-1.5 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary">
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
