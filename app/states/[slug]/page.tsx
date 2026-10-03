/**
 * Dynamic state page at /states/[slug].
 *
 * Data-first (F8, founder decision 2026-09-27: "state pitches become sourced
 * facts"): a short summary and three facts built only from the state's
 * sourced Census figures (content/seo/state-facts.json, validated by
 * lib/seo/state-facts.ts), HUD Fair Market Rent for every market page in the
 * state (programmatic and bespoke), a visible data-only FAQ whose FAQPage
 * JSON-LD mirrors it, and a sources box with the "Data as of HUD FY…" line.
 * The page is `noindex, follow` unless lib/markets/indexability.ts confirms it
 * clears STATE_PAGE_MIN_WORDS of real content with at least one HUD city.
 * Nothing unsourced from lib/states.ts renders: not the pitch, tier,
 * landlord-tenant lean, property-tax rate, medians, eviction timeline,
 * income-tax rate, pros/cons, strategies, or insurance note.
 */

import type { Metadata } from "next";
import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";
import { notFound } from "next/navigation";
import { Header } from "@/components/investcalc/header";
import { ARTICLE_META_LINK, ARTICLE_META_NEXT } from "@/components/marketing/article";
import { BlogByline } from "@/components/marketing/blog-byline";
import { DataFaq } from "@/components/marketing/data-faq";
import { PageHero, RuledList, UnderTitleAnalyzeLink } from "@/components/marketing/page-parts";
import {
  DATA_BREADCRUMB_CURRENT_CLASS,
  DATA_BREADCRUMB_LIST_CLASS,
  DATA_FIGURES_CLASS,
  DATA_FIGURE_ITEM_CLASS,
  DATA_FIGURE_LABEL_CLASS,
  DATA_LEDE_CLASS,
  DATA_LINK_GROUP_CLASS,
  DATA_LINK_GROUP_LABEL_CLASS,
  DATA_LINK_ROW_CLASS,
  DATA_NOTE_CLASS,
  DATA_PAGE_MAIN_CLASS,
  DATA_PAGE_ROOT_CLASS,
  DATA_SECTION_CLASS,
  DATA_TABLE_CLASS,
  DATA_TABLE_FIGURE_CELL_CLASS,
  DATA_TABLE_HEAD_CELL_CLASS,
  DATA_TABLE_HEAD_FIGURE_CLASS,
  DATA_TABLE_HEAD_ROW_CLASS,
  DATA_TABLE_LABEL_CELL_CLASS,
  DATA_TABLE_ROW_CLASS,
  DATA_TABLE_SCROLL_CLASS,
  DATA_TAG_LINK_CLASS,
  DATA_TEXT_CLASS,
  DataPageBody,
} from "@/components/marketing/safe-market-page";
import { SectionHeading } from "@/components/marketing/section";
import { LedgerFigure } from "@/components/ledger/ledger-parts";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SeoAnalyzerCta } from "@/components/marketing/seo-analyzer-cta";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SourceMethodologyBox } from "@/components/marketing/source-methodology-box";
import {
  buildHudDataAsOfLine,
  fmrLabel,
  formatIsoDate,
  usd,
  type SourceLink,
} from "@/lib/markets/data-copy";
import {
  HUD_FMR_OVERVIEW_SOURCE,
  NOINDEX_FOLLOW,
  STATE_PAGE_GUIDANCE,
  buildStateDescription,
  buildStateFacts,
  buildStateFaq,
  buildStateSummary,
  buildStateTitle,
  describeStateHudCity,
  getStateBespokeMarkets,
  getStateDataYear,
  getStateHudCities,
  getStateHudRetrievedDates,
  isStateIndexable,
  stateCityHudSource,
} from "@/lib/markets/indexability";
import { getSiteUrl } from "@/lib/site-url";
import { STATES, getStateBySlug } from "@/lib/states";
import { isLinkablePath } from "@/lib/seo/link-policy";
import { stateFactsFor } from "@/lib/seo/state-facts";
import { ScrollX } from "@/components/ui/scroll-x";
import { lastmodFor } from "@/lib/seo/lastmod";
import { JsonLd } from "@/components/seo/json-ld";
import { OPEN_GRAPH_BASE } from "@/lib/seo/open-graph-base";

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

  const title = buildStateTitle(state.name);
  const description = buildStateDescription(state.slug, state.name);

  return {
    title,
    description,
    keywords: [
      `${state.name.toLowerCase()} rental market data`,
      `${state.name.toLowerCase()} fair market rent`,
      `${state.name.toLowerCase()} median home value`,
      `${state.name.toLowerCase()} property taxes paid`,
      `${state.abbr.toLowerCase()} rental property`,
    ],
    alternates: { canonical: `/states/${state.slug}` },
    // Thin state pages stay crawlable but unindexed.
    robots: isStateIndexable(state.slug) ? undefined : NOINDEX_FOLLOW,
    openGraph: {
      ...OPEN_GRAPH_BASE,
      title,
      description,
      url: `/states/${state.slug}`,
      type: "article",
      images: [
        {
          url: "/home.jpg",
          width: 1200,
          height: 630,
          alt: title,
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
  const stateFacts = stateFactsFor(state.slug);
  const facts = stateFacts ? buildStateFacts(stateFacts) : [];
  const hudCities = getStateHudCities(state.name);
  const bespoke = getStateBespokeMarkets(state.name).filter((market) =>
    isLinkablePath(`/markets/${market.slug}`),
  );
  const title = buildStateTitle(state.name);
  const description = buildStateDescription(state.slug, state.name);
  const faq = stateFacts ? buildStateFaq(state.name, stateFacts, hudCities, year) : [];
  const hudDates = getStateHudRetrievedDates(state.slug);
  const acsDates = stateFacts
    ? [...new Set(facts.map((fact) => fact.source.retrievedAt ?? ""))].filter(Boolean)
    : [];
  const dataAsOf =
    hudDates.length > 0
      ? `${buildHudDataAsOfLine(year, hudDates)}${stateFacts ? ` Census figures: American Community Survey ${stateFacts.medianHomeValue.year} 1-year estimates (retrieved ${acsDates.map(formatIsoDate).join(" and ")}).` : ""}`
      : null;
  const cityDocs: SourceLink[] = hudCities.flatMap((city) => {
    const source = stateCityHudSource(city);
    return source ? [source] : [];
  });
  const seen = new Set<string>();
  const sources: SourceLink[] = [
    ...facts.map((fact) => fact.source),
    HUD_FMR_OVERVIEW_SOURCE,
    ...cityDocs,
  ].filter((source) => (seen.has(source.href) ? false : (seen.add(source.href), true)));

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
    name: title,
    description,
    url: canonicalUrl,
    dateModified: lastmodFor(`/states/${state.slug}`),
    inLanguage: "en-US",
    isPartOf: { "@id": `${siteUrl}/#website` },
    author: { "@id": `${siteUrl}/#organization` },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "TrueCap", item: siteUrl },
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

  return (
    <div className={DATA_PAGE_ROOT_CLASS}>
      <JsonLd data={placeLd} />
      <JsonLd data={webPageLd} />
      <JsonLd data={breadcrumbLd} />
      <Header />

      <main id="main" tabIndex={-1} className={DATA_PAGE_MAIN_CLASS}>
        {/* The head on PageHero, in the market pages' order: the H1, the
            byline, the breadcrumb as a meta line (navigation under the H1,
            never above it), the one analyze link (P2-80: the action in the
            first screen), then the sourced summary. */}
        <PageHero title={title}>
          <div className="mt-2">
            <BlogByline />
          </div>
          <nav aria-label="Breadcrumb" className={ARTICLE_META_NEXT}>
            <ol className={DATA_BREADCRUMB_LIST_CLASS}>
              <li>
                <IntentPrefetchLink href="/" className={ARTICLE_META_LINK}>
                  Home
                </IntentPrefetchLink>
              </li>
              <li aria-hidden="true">›</li>
              <li>
                <IntentPrefetchLink href="/states" className={ARTICLE_META_LINK}>
                  States
                </IntentPrefetchLink>
              </li>
              <li aria-hidden="true">›</li>
              <li className={DATA_BREADCRUMB_CURRENT_CLASS}>{state.name}</li>
            </ol>
          </nav>
          <UnderTitleAnalyzeLink />
          {stateFacts ? (
            <p data-state-summary="" className={DATA_LEDE_CLASS}>
              {buildStateSummary(state.name, stateFacts)}
            </p>
          ) : null}
          <p className="mt-3 max-w-[68ch] text-pretty text-base leading-relaxed text-muted-foreground">
            {STATE_PAGE_GUIDANCE.intro(state.name)}
          </p>
        </PageHero>

        <DataPageBody>
          {facts.length > 0 ? (
            <section data-state-facts="" className={DATA_SECTION_CLASS}>
              <SectionHeading>
                {state.name} at a glance
              </SectionHeading>
              <dl className={DATA_FIGURES_CLASS}>
                {facts.map((fact) => (
                  <div key={fact.label} className={DATA_FIGURE_ITEM_CLASS}>
                    <dt className={DATA_FIGURE_LABEL_CLASS}>
                      {fact.label}
                    </dt>
                    <dd className="mt-1 text-xl font-semibold tabular-nums text-foreground">
                      {fact.value}
                    </dd>
                    <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {fact.note}{" "}
                      <a
                        href={fact.source.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tc-link"
                      >
                        Census table
                      </a>
                      .
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          <section data-state-hud-cities="" className={DATA_SECTION_CLASS}>
            <SectionHeading>
              {fmrLabel(year)} by {state.name} city
            </SectionHeading>
            <p className={DATA_TEXT_CLASS}>
              {STATE_PAGE_GUIDANCE.fmr(state.name, year)}
            </p>
            {/* No minimum width: at 24rem the 3-bedroom figures were cut
                mid-number at 390px with no cue, and without it the table fits
                a 320px phone (the column heads wrap to two lines). If it ever
                overflows, the first column stays pinned and ScrollX shows its
                "Scroll for more" caption. The table sits on the paper on
                rules (DATA_TABLE_*), so the pinned cells take the paper. */}
            {hudCities.length > 0 ? (
              <ScrollX cue stickyFirstColumn label="Table" className={DATA_TABLE_SCROLL_CLASS}>
                <table className={DATA_TABLE_CLASS}>
                  <caption className="sr-only">
                    {fmrLabel(year)} by {state.name} market city
                  </caption>
                  <thead>
                    <tr className={DATA_TABLE_HEAD_ROW_CLASS}>
                      <th scope="col" className={DATA_TABLE_HEAD_CELL_CLASS}>
                        City
                      </th>
                      <th scope="col" className={DATA_TABLE_HEAD_FIGURE_CLASS}>
                        2BR / month
                      </th>
                      <th scope="col" className={DATA_TABLE_HEAD_FIGURE_CLASS}>
                        3BR / month
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {hudCities.map((city) => (
                      <tr key={city.slug} className={DATA_TABLE_ROW_CLASS}>
                        <td className={DATA_TABLE_LABEL_CELL_CLASS}>
                          {isLinkablePath(`/markets/${city.slug}`) ? (
                            <IntentPrefetchLink
                              href={`/markets/${city.slug}`}
                              className="tc-link -my-2.5 inline-flex min-h-11 items-center"
                              aria-label={describeStateHudCity(city)}
                            >
                              {city.name}
                            </IntentPrefetchLink>
                          ) : (
                            city.name
                          )}
                        </td>
                        <td className={DATA_TABLE_FIGURE_CELL_CLASS}>
                          <LedgerFigure>{usd(city.hud.rent2br)}</LedgerFigure>
                        </td>
                        <td className={DATA_TABLE_FIGURE_CELL_CLASS}>
                          <LedgerFigure>{usd(city.hud.rent3br)}</LedgerFigure>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollX>
            ) : (
              <p className={DATA_NOTE_CLASS}>
                TrueCap has no HUD Fair Market Rent for a {state.name} city yet.
              </p>
            )}
            {bespoke.length > 0 ? (
              <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground">
                More {state.name} city pages:{" "}
                {bespoke.map((market, index) => (
                  <span key={market.slug}>
                    {index > 0 ? ", " : ""}
                    <IntentPrefetchLink
                      href={`/markets/${market.slug}`}
                      className="tc-link"
                    >
                      {market.name}
                    </IntentPrefetchLink>
                  </span>
                ))}
                .
              </p>
            ) : null}
          </section>

          <DataFaq heading={`${state.name} rental data: common questions`} items={faq} />

          <SourceMethodologyBox
            className={DATA_SECTION_CLASS}
            dataAsOf={dataAsOf}
            sources={sources}
            note="Census figures describe the whole state; HUD figures describe the FMR area that contains each city."
          />

          <section data-state-verify-locally="" className={DATA_SECTION_CLASS}>
            <SectionHeading>
              Three things to verify locally
            </SectionHeading>
            {/* Term-and-detail rows on rules (the lead-in is the term), no icons. */}
            <RuledList
              className="mt-6"
              items={STATE_PAGE_GUIDANCE.verify.map((item) => ({
                key: item.title,
                term: <>{item.title}.</>,
                detail: item.body,
              }))}
            />
          </section>

          <div className={DATA_SECTION_CLASS}>
            <SeoAnalyzerCta
              context={`a ${state.name} property`}
              utmSource="state-page"
              supportingText={STATE_PAGE_GUIDANCE.run(state.name)}
            />
          </div>

          <section className={DATA_LINK_GROUP_CLASS}>
            <p className={DATA_LINK_GROUP_LABEL_CLASS}>
              Other state guides
            </p>
            <div className={DATA_LINK_ROW_CLASS}>
              {Object.values(STATES)
                .filter(
                  (candidate) =>
                    candidate.slug !== state.slug &&
                    isLinkablePath(`/states/${candidate.slug}`),
                )
                .map((candidate) => (
                  <IntentPrefetchLink
                    key={candidate.slug}
                    href={`/states/${candidate.slug}`}
                    className={DATA_TAG_LINK_CLASS}
                  >
                    {candidate.name}
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
