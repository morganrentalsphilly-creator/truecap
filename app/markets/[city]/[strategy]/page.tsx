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
import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";
import { notFound } from "next/navigation";
import { AnalyzerHandoffLink } from "@/components/analyzer-handoff-link";
import { Header } from "@/components/investcalc/header";
import { ARTICLE_META, ARTICLE_META_LINK, ARTICLE_META_NEXT } from "@/components/marketing/article";
import { PageHero, UnderTitleAnalyzeLink } from "@/components/marketing/page-parts";
import {
  DATA_BREADCRUMB_CURRENT_CLASS,
  DATA_BREADCRUMB_LIST_CLASS,
  DATA_LEDE_CLASS,
  DATA_LINK_GROUP_CLASS,
  DATA_LINK_GROUP_LABEL_CLASS,
  DATA_LINK_ROW_CLASS,
  DATA_PAGE_MAIN_CLASS,
  DATA_PAGE_ROOT_CLASS,
  DATA_SECTION_CLASS,
  DATA_SUBHEADING_CLASS,
  DATA_TAG_LINK_CLASS,
  DataPageBody,
  MarketDataAsOf,
} from "@/components/marketing/safe-market-page";
import { SectionHeading } from "@/components/marketing/section";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
import { lastmodFor } from "@/lib/seo/lastmod";
import { fmrLabel } from "@/lib/markets/data-copy";
import { JsonLd } from "@/components/seo/json-ld";
import { OPEN_GRAPH_BASE } from "@/lib/seo/open-graph-base";

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
      ...OPEN_GRAPH_BASE,
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
      { "@type": "ListItem", position: 1, name: "TrueCap", item: siteUrl },
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
    dateModified: lastmodFor(`/markets/${combo.citySlug}/${combo.strategy}`),
    inLanguage: "en-US",
    isPartOf: { "@id": `${siteUrl}/#website` },
  };
  const analyzerStrategy =
    combo.strategy === "brrrr" || combo.strategy === "house-hack"
      ? combo.strategy
      : "buy-hold";

  return (
    <div className={DATA_PAGE_ROOT_CLASS}>
      <JsonLd data={webPageLd} />
      <JsonLd data={breadcrumbLd} />
      <Header />

      <main id="main" tabIndex={-1} className={DATA_PAGE_MAIN_CLASS}>
        {/* The head on PageHero, in the market pages' order. The H1's words
            are the page's own ("{strategy} screening in {city}"); most
            strategy labels are lowercase, so the block's first letter is
            capitalised in CSS and the text stays as written. Under it: the
            place and strategy line (the old eyebrow's words), the breadcrumb
            as a meta line, and the one analyze link (P2-80). */}
        <PageHero
          title={
            <span className="block first-letter:uppercase">
              {combo.strategyLabel} screening in {combo.cityName}
            </span>
          }
        >
          <p className={ARTICLE_META}>
            {combo.cityName}, {combo.state} · {combo.strategyLabel}
          </p>
          <nav aria-label="Breadcrumb" className={ARTICLE_META_NEXT}>
            <ol className={DATA_BREADCRUMB_LIST_CLASS}>
              <li>
                <IntentPrefetchLink href="/" className={ARTICLE_META_LINK}>
                  Home
                </IntentPrefetchLink>
              </li>
              <li aria-hidden="true">›</li>
              <li>
                <IntentPrefetchLink
                  href={`/markets/${combo.citySlug}`}
                  className={ARTICLE_META_LINK}
                >
                  {combo.cityName}
                </IntentPrefetchLink>
              </li>
              <li aria-hidden="true">›</li>
              <li className={DATA_BREADCRUMB_CURRENT_CLASS}>
                {combo.strategyLabel}
              </li>
            </ol>
          </nav>
          <UnderTitleAnalyzeLink />
          <p className={DATA_LEDE_CLASS}>
            A city-and-strategy label does not establish a property&apos;s price,
            rent, cap rate, neighborhood fit, legal eligibility, financing, or
            outcome. This page shows you what to verify.{" "}
            TrueCap does not publish a market range or neighborhood pick for this city.
          </p>
          {hud ? (
            <p className="mt-3 max-w-[68ch] text-pretty text-base leading-relaxed text-muted-foreground">
              {fmrLabel(hud.year)} for the area that contains{" "}
              {combo.cityName}: {usd(hud.rent2br)}/mo for 2 bedrooms,{" "}
              {usd(hud.rent3br)}/mo for 3 bedrooms. The{" "}
              <IntentPrefetchLink
                href={`/markets/${combo.citySlug}`}
                className="tc-link"
              >
                {combo.cityName} market page
              </IntentPrefetchLink>{" "}
              shows what that rent pencils to on a sample deal.
            </p>
          ) : null}
          <MarketDataAsOf year={year} />
        </PageHero>

        <DataPageBody>
          <section className={DATA_SECTION_CLASS}>
            <SectionHeading>
              Evidence to collect for this scenario
            </SectionHeading>
            {/* The checklist as rows on rules, not bullets in a card. */}
            <ul className="mt-6 border-t-2 border-foreground">
              <li className="border-b border-rule-soft py-3 text-pretty text-base leading-relaxed">
                A supported property address, asking price, current lease, and
                comparable rent evidence.
              </li>
              <li className="border-b border-rule-soft py-3 text-pretty text-base leading-relaxed">
                Parcel tax, property-specific insurance, condition, inspections,
                utilities, HOA terms, and operating responsibilities.
              </li>
              <li className="border-b border-rule-soft py-3 text-pretty text-base leading-relaxed">
                Current local rules and any strategy-specific legal or program
                eligibility reviewed with qualified professionals.
              </li>
              <li className="border-b border-rule-soft py-3 text-pretty text-base leading-relaxed">
                Written financing terms, including the lender&apos;s income,
                expense, reserve, valuation, seasoning, refinance, or occupancy
                rules that apply.
              </li>
              <li className="border-b border-rule-soft py-3 text-pretty text-base leading-relaxed">
                Separate base and downside scenarios for uncertain rent, vacancy,
                cost, value, timeline, and exit assumptions.
              </li>
            </ul>
          </section>

          {/* The page's ask, in SeoAnalyzerCta's grammar (the 2px ink rule,
              the heading at the H3 step, Ink 2 support, one marketing button,
              no card, no arrow icon). The handoff href is unchanged. */}
          <section className={cn(DATA_SECTION_CLASS, "border-t-2 border-foreground pt-6")}>
            <h2 className={DATA_SUBHEADING_CLASS}>
              Start a {combo.cityName} {combo.strategyLabel} screen
            </h2>
            <p className="mt-2 max-w-[56ch] text-pretty text-base leading-relaxed text-muted-foreground">
              This link opens the analyzer with {combo.cityName}, {combo.state}{" "}
              and the closest matching strategy. Enter a supported property
              address and asking price, then review the labeled rent and rate
              benchmarks and edit any assumption. The 10-year projection is a Pro
              feature; this link does not preload market ranges.
            </p>
            <AnalyzerHandoffLink
              handoffHref={buildAnalyzerHandoffUrl(
                {
                  address: `${combo.cityName}, ${combo.state}`,
                  strategy: analyzerStrategy,
                },
                { utmSource: "combo-page" },
              )}
              className={cn(buttonVariants({ size: "cta" }), "mt-5")}
            >
              Analyze a property free
            </AnalyzerHandoffLink>
          </section>

          <section className={DATA_LINK_GROUP_CLASS}>
            <p className={DATA_LINK_GROUP_LABEL_CLASS}>
              Other {combo.cityName} verification guides
            </p>
            <div className={DATA_LINK_ROW_CLASS}>
              <IntentPrefetchLink
                href={`/markets/${combo.citySlug}`}
                className={DATA_TAG_LINK_CLASS}
              >
                {combo.cityName} market overview
              </IntentPrefetchLink>
              {CITY_STRATEGY_COMBOS.filter(
                (candidate) =>
                  candidate.citySlug === combo.citySlug &&
                  candidate.strategy !== combo.strategy,
              ).map((candidate) => (
                <IntentPrefetchLink
                  key={candidate.strategy}
                  href={`/markets/${candidate.citySlug}/${candidate.strategy}`}
                  className={DATA_TAG_LINK_CLASS}
                >
                  {candidate.strategyLabel} in {candidate.cityName}
                </IntentPrefetchLink>
              ))}
            </div>
          </section>
        </DataPageBody>
      </main>

      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
