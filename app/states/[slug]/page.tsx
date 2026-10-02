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
import { CheckCircle2 } from "lucide-react";
import { Header } from "@/components/investcalc/header";
import { BlogByline } from "@/components/marketing/blog-byline";
import { DataFaq } from "@/components/marketing/data-faq";
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
  const cell =
    "px-4 py-2.5 text-2xs font-bold uppercase tracking-widest text-muted-foreground";

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
    <div className="min-h-screen bg-background">
      <JsonLd data={placeLd} />
      <JsonLd data={webPageLd} />
      <JsonLd data={breadcrumbLd} />
      <Header />

      <main id="main" className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs">
          <ol className="flex flex-wrap items-center gap-2 text-muted-foreground">
            <li>
              <IntentPrefetchLink href="/" className="hover:text-foreground">
                Home
              </IntentPrefetchLink>
            </li>
            <li aria-hidden="true">›</li>
            <li>
              <IntentPrefetchLink href="/states" className="hover:text-foreground">
                States
              </IntentPrefetchLink>
            </li>
            <li aria-hidden="true">›</li>
            <li className="font-semibold text-foreground">{state.name}</li>
          </ol>
        </nav>

        <h1 className="mt-2 text-3xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
          {title}
        </h1>
        <BlogByline />
        {stateFacts ? (
          <p data-state-summary="" className="mt-5 text-lg leading-relaxed text-foreground">
            {buildStateSummary(state.name, stateFacts)}
          </p>
        ) : null}
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          {STATE_PAGE_GUIDANCE.intro(state.name)}
        </p>

        {facts.length > 0 ? (
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
                  <dt className="text-3xs font-bold uppercase tracking-widest text-muted-foreground">
                    {fact.label}
                  </dt>
                  <dd className="mt-1 text-lg font-extrabold text-foreground">
                    {fact.value}
                  </dd>
                  <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {fact.note}{" "}
                    <a
                      href={fact.source.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-dotted underline-offset-2 hover:text-foreground"
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

        <section data-state-hud-cities="" className="mt-10">
          <h2 className="text-2xl font-extrabold text-foreground">
            {fmrLabel(year)} by {state.name} city
          </h2>
          <p className="mt-2 text-base leading-relaxed text-muted-foreground">
            {STATE_PAGE_GUIDANCE.fmr(state.name, year)}
          </p>
          {/* No minimum width: at 24rem the 3-bedroom figures were cut
              mid-number at 390px with no cue, and without it the table fits
              a 320px phone (the column heads wrap to two lines). If it ever
              overflows, the first column stays pinned and ScrollX shows its
              "Scroll for more" caption. The pinned cells take the card's
              background (components/ui/scroll-x.tsx), so the table sits on
              the card and its header row is the solid band. */}
          {hudCities.length > 0 ? (
            <ScrollX cue stickyFirstColumn label="Table" className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  {fmrLabel(year)} by {state.name} market city
                </caption>
                <thead>
                  <tr className="border-b border-border bg-muted text-left">
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
                        {isLinkablePath(`/markets/${city.slug}`) ? (
                          <IntentPrefetchLink
                            href={`/markets/${city.slug}`}
                            className="inline-flex min-h-11 items-center text-primary hover:underline"
                            aria-label={describeStateHudCity(city)}
                          >
                            {city.name}
                          </IntentPrefetchLink>
                        ) : (
                          city.name
                        )}
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
            </ScrollX>
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              TrueCap has no HUD Fair Market Rent for a {state.name} city yet.
            </p>
          )}
          {bespoke.length > 0 ? (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              More {state.name} city pages:{" "}
              {bespoke.map((market, index) => (
                <span key={market.slug}>
                  {index > 0 ? ", " : ""}
                  <IntentPrefetchLink
                    href={`/markets/${market.slug}`}
                    className="font-semibold text-primary hover:underline"
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
          className="mt-10"
          dataAsOf={dataAsOf}
          sources={sources}
          note="Census figures describe the whole state; HUD figures describe the FMR area that contains each city."
        />

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
              .filter(
                (candidate) =>
                  candidate.slug !== state.slug &&
                  isLinkablePath(`/states/${candidate.slug}`),
              )
              .map((candidate) => (
                <IntentPrefetchLink
                  key={candidate.slug}
                  href={`/states/${candidate.slug}`}
                  className="rounded-full border border-border bg-card px-3 py-1.5 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary"
                >
                  {candidate.name}
                </IntentPrefetchLink>
              ))}
          </div>
        </section>
      </main>

      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
