/**
 * Dynamic city + strategy verification page.
 *
 * Combo records carry hand-authored price, rent, cap-rate, neighborhood,
 * timing, legal, and strategy narratives; the route renders only the combo's
 * identity fields plus the city's HUD rent (when it exists) and a generic,
 * honest analyzer handoff. A combo whose city has no HUD rent is
 * `noindex, follow` (lib/markets/indexability.ts).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { AnalyzerHandoffLink } from "@/components/analyzer-handoff-link";
import { Header } from "@/components/investcalc/header";
import { MarketDataAsOf } from "@/components/marketing/safe-market-page";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { buildAnalyzerHandoffUrl } from "@/lib/analyzer-handoff";
import {
  CITY_STRATEGY_COMBOS,
  getCityStrategyCombo,
} from "@/lib/city-strategy-combos";
import {
  NOINDEX_FOLLOW,
  getMarketDataYear,
  getMarketHudRent,
  isStrategyIndexable,
} from "@/lib/markets/indexability";
import { getSiteUrl } from "@/lib/site-url";

export const dynamicParams = false;

const usd = (value: number) => `$${Math.round(value).toLocaleString("en-US")}`;

export async function generateStaticParams() {
  return CITY_STRATEGY_COMBOS.map((combo) => ({
    city: combo.citySlug,
    strategy: combo.strategy,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string; strategy: string }>;
}): Promise<Metadata> {
  const { city, strategy } = await params;
  const combo = getCityStrategyCombo(city, strategy);
  if (!combo) {
    return {
      title: "Guide unavailable",
      robots: { index: false, follow: false },
    };
  }

  const title = `${combo.strategyLabel} screening in ${combo.cityName}`;
  const description = `What to verify before a ${combo.strategyLabel} offer on a ${combo.cityName} property, with the HUD rent benchmark when one exists and an analyzer handoff.`;

  return {
    title,
    description,
    keywords: [
      `${combo.strategyLabel.toLowerCase()} ${combo.cityName.toLowerCase()}`,
      `${combo.cityName.toLowerCase()} rental property screening`,
      `${combo.strategyLabel.toLowerCase()} verification checklist`,
    ],
    alternates: { canonical: `/markets/${combo.citySlug}/${combo.strategy}` },
    // Thin template: noindex,follow until STRATEGY_PAGES_INDEXABLE flips
    // (lib/markets/indexability.ts); the city rule still applies after that.
    robots: isStrategyIndexable(combo.citySlug) ? undefined : NOINDEX_FOLLOW,
    openGraph: {
      title,
      description,
      url: `/markets/${combo.citySlug}/${combo.strategy}`,
      type: "article",
      images: [{ url: "/home.jpg", width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", images: ["/home.jpg"] },
  };
}

export default async function CityStrategyPage({
  params,
}: {
  params: Promise<{ city: string; strategy: string }>;
}) {
  const { city, strategy } = await params;
  const combo = getCityStrategyCombo(city, strategy);
  if (!combo) notFound();

  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/markets/${combo.citySlug}/${combo.strategy}`;
  const hud = getMarketHudRent(combo.citySlug);
  const year = getMarketDataYear(combo.citySlug);
  const description = `Review property-specific evidence for a ${combo.strategyLabel} scenario in ${combo.cityName}. TrueCap doesn't publish a market range or neighborhood recommendation for this city.`;

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
      {
        "@type": "ListItem",
        position: 3,
        name: combo.cityName,
        item: `${siteUrl}/markets/${combo.citySlug}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: combo.strategyLabel,
        item: canonicalUrl,
      },
    ],
  };
  const webPageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonicalUrl}#page`,
    name: `${combo.strategyLabel} screening in ${combo.cityName}`,
    description,
    url: canonicalUrl,
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
        name: `Does this page recommend ${combo.strategyLabel} in ${combo.cityName}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `No. This page gives you a strategy-specific verification checklist. It does not publish an investment recommendation, market range, neighborhood ranking, or promised outcome.`,
        },
      },
      {
        "@type": "Question",
        name: `What should I verify for a ${combo.cityName} ${combo.strategyLabel} scenario?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Verify the supported address, asking price, comparable rent evidence, parcel tax, insurance, condition, operating costs, legal eligibility, timeline, exit or refinance assumptions when applicable, and written financing terms.`,
        },
      },
    ],
  };

  const analyzerStrategy =
    combo.strategy === "brrrr" || combo.strategy === "house-hack"
      ? combo.strategy
      : "buy-hold";

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
              <Link
                href={`/markets/${combo.citySlug}`}
                className="hover:text-foreground"
              >
                {combo.cityName}
              </Link>
            </li>
            <li aria-hidden="true">›</li>
            <li className="font-semibold text-foreground">
              {combo.strategyLabel}
            </li>
          </ol>
        </nav>

        <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
          {combo.cityName}, {combo.state} · {combo.strategyLabel}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
          {combo.strategyLabel} screening in {combo.cityName}
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-foreground">
          A city-and-strategy label does not establish a property&apos;s price,
          rent, cap rate, neighborhood fit, legal eligibility, financing, or
          outcome. This page shows you what to verify.{" "}
          TrueCap does not publish a market range or neighborhood pick for this city.
        </p>
        {hud ? (
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            HUD Fair Market Rent, FY{hud.year}, for the area that contains{" "}
            {combo.cityName}: {usd(hud.rent2br)}/mo for 2 bedrooms,{" "}
            {usd(hud.rent3br)}/mo for 3 bedrooms. The{" "}
            <Link
              href={`/markets/${combo.citySlug}`}
              className="font-semibold text-primary hover:underline"
            >
              {combo.cityName} market page
            </Link>{" "}
            shows what that rent pencils to on a sample deal.
          </p>
        ) : null}
        <MarketDataAsOf year={year} />

        <section className="mt-10 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-xl font-extrabold text-foreground">
            Evidence to collect for this scenario
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground">
            <li>
              A supported property address, asking price, current lease, and
              comparable rent evidence.
            </li>
            <li>
              Parcel tax, property-specific insurance, condition, inspections,
              utilities, HOA terms, and operating responsibilities.
            </li>
            <li>
              Current local rules and any strategy-specific legal or program
              eligibility reviewed with qualified professionals.
            </li>
            <li>
              Written financing terms, including the lender&apos;s income,
              expense, reserve, valuation, seasoning, refinance, or occupancy
              rules that apply.
            </li>
            <li>
              Separate base and downside scenarios for uncertain rent, vacancy,
              cost, value, timeline, and exit assumptions.
            </li>
          </ul>
        </section>

        <section className="mt-12 rounded-2xl bg-primary p-6 text-primary-foreground sm:p-8">
          <h2 className="text-xl font-extrabold sm:text-2xl">
            Start a {combo.cityName} {combo.strategyLabel} screen
          </h2>
          <p className="mb-5 mt-2 text-sm opacity-90 sm:text-base">
            This link opens the analyzer with {combo.cityName}, {combo.state}{" "}
            and the closest matching strategy. Enter a supported property
            address and asking price, then review the labeled rent and rate
            benchmarks and edit any assumption. The 10-year projection is a Pro
            feature; this link does not preload market ranges.
          </p>
          <AnalyzerHandoffLink
            handoffHref={`${buildAnalyzerHandoffUrl(
              {
                address: `${combo.cityName}, ${combo.state}`,
                strategy: analyzerStrategy,
              },
              { utmSource: "combo-page" },
            )}#main`}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-foreground px-4 py-2.5 font-bold text-primary transition-opacity hover:opacity-90"
          >
            Analyze a property free <ArrowRight className="size-4" />
          </AnalyzerHandoffLink>
        </section>

        <section className="mt-12 border-t border-border pt-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Other {combo.cityName} verification guides
          </p>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link
              href={`/markets/${combo.citySlug}`}
              className="rounded-full border border-border bg-card px-3 py-1.5 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary"
            >
              {combo.cityName} market overview
            </Link>
            {CITY_STRATEGY_COMBOS.filter(
              (candidate) =>
                candidate.citySlug === combo.citySlug &&
                candidate.strategy !== combo.strategy,
            ).map((candidate) => (
              <Link
                key={candidate.strategy}
                href={`/markets/${candidate.citySlug}/${candidate.strategy}`}
                className="rounded-full border border-border bg-card px-3 py-1.5 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary"
              >
                {candidate.strategyLabel} in {candidate.cityName}
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
