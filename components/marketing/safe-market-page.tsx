import type { Metadata } from "next";
import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";
import type { ReactNode } from "react";
import { Header } from "@/components/investcalc/header";
import { ARTICLE_META, ARTICLE_META_LINK, ARTICLE_META_NEXT } from "@/components/marketing/article";
import { BlogByline } from "@/components/marketing/blog-byline";
import { CityStrategyGuides } from "@/components/marketing/city-strategy-guides";
import { DataFaq } from "@/components/marketing/data-faq";
import { PageHero, RuledList, UnderTitleAnalyzeLink } from "@/components/marketing/page-parts";
import { Section, SectionHeading } from "@/components/marketing/section";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SeoAnalyzerCta } from "@/components/marketing/seo-analyzer-cta";
import { LedgerFigure } from "@/components/ledger/ledger-parts";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SourceMethodologyBox } from "@/components/marketing/source-methodology-box";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { calculateAnalysis } from "@/lib/calc-analysis";
import { getGlossaryEntryBySlug } from "@/lib/glossary";
import {
  FMR_DEFINITION_CLAUSE,
  HUD_FMR_OVERVIEW_URL,
  fmrLabel,
  formatIsoDate,
  usd,
} from "@/lib/markets/data-copy";
import type { HudRent } from "@/lib/markets/hud-rents";
import {
  NOINDEX_FOLLOW,
  buildDataAsOfLine,
  isMarketIndexable,
} from "@/lib/markets/indexability";
import {
  buildMarketPageData,
  type MarketPageData,
} from "@/lib/markets/market-page-data";
import {
  nearbyMarketGroups,
  stateGuideSlugFor,
  type MarketLink,
} from "@/lib/markets/nearby";
import { MARKET_DATA_ATTRIBUTE } from "@/lib/markets/thin";
import { isLinkablePath } from "@/lib/seo/link-policy";
import type { MarketFacts } from "@/lib/seo/market-facts";
import { lastmodFor } from "@/lib/seo/lastmod";
import { SAMPLE_DEAL_FIXTURE } from "@/lib/sample-deal";
import { getSiteUrl } from "@/lib/site-url";
import { ScrollX } from "@/components/ui/scroll-x";
import { JsonLd } from "@/components/seo/json-ld";
import { OPEN_GRAPH_BASE } from "@/lib/seo/open-graph-base";
import { cn } from "@/lib/utils";

export type SafeMarketPageIdentity = {
  city: string;
  stateCode: string;
  stateName: string;
  /**
   * The wrapper's state guide. The page resolves the link itself from
   * stateName (lib/markets/nearby.ts stateGuideSlugFor), so it appears only
   * while that guide is indexable.
   */
  stateSlug: string;
  slug: string;
  /** Optional analyzer address when the display city names a wider metro. */
  analyzerAddress?: string;
};

/** Meta keywords for a market page: data framing, no verdict queries. */
export function marketKeywords(city: string): string[] {
  const c = city.toLowerCase();
  return [
    `${c} rental market data`,
    `${c} fair market rent`,
    `${c} hud fmr`,
    `${c} rent by zip code`,
    `${c} rental property analysis`,
  ];
}

export function buildSafeMarketMetadata({
  city,
  stateCode,
  slug,
}: SafeMarketPageIdentity): Metadata {
  const data = buildMarketPageData({ slug, city, stateCode });
  return {
    title: data.title,
    description: data.description,
    keywords: marketKeywords(city),
    alternates: { canonical: `/markets/${slug}` },
    // A city page without HUD rent is a template, not a page worth ranking.
    robots: isMarketIndexable(slug) ? undefined : NOINDEX_FOLLOW,
    openGraph: {
      ...OPEN_GRAPH_BASE,
      title: data.title,
      description: data.description,
      url: `/markets/${slug}`,
      type: "article",
      images: [
        {
          url: "/home.jpg",
          width: 1200,
          height: 630,
          alt: data.title,
        },
      ],
    },
    twitter: { card: "summary_large_image", images: ["/home.jpg"] },
  };
}

/* ------------------------------------------------------------------------ */
/* The data-page grammar (DESIGN.md "Chrome" and "As built in the rollout"). */
/* The market, state and city-strategy templates share it: PageHero with the */
/* byline, the breadcrumb as a meta line and the one analyze link under the  */
/* H1, then one 68ch reading column of sections on rules and space. No       */
/* cards, no eyebrow, no uppercase label, no arrow, nothing under 14px.      */
/* Class strings only (tokens from app/globals.css), so the three templates  */
/* cannot drift; the words stay in the pages and the data builders.          */
/* ------------------------------------------------------------------------ */

/** The page root: clips sideways bleed without a scroll container (app/page.tsx's root). */
export const DATA_PAGE_ROOT_CLASS = "relative overflow-x-clip";

/** <main id="main" tabIndex={-1}>: the skip link's target, never a focus ring. */
export const DATA_PAGE_MAIN_CLASS = "min-w-0 outline-none";

/** The hero's lede and a section's running text: marketing body, in ink. */
export const DATA_LEDE_CLASS = "mt-4 max-w-[68ch] text-pretty text-lg leading-relaxed text-foreground";
export const DATA_TEXT_CLASS = "mt-4 text-pretty text-lg leading-relaxed text-foreground";

/** A secondary line (a guidance paragraph, a table's footnote): 14px Ink 2. */
export const DATA_NOTE_CLASS = "mt-3 text-pretty text-sm leading-relaxed text-muted-foreground";

/** A section in the column: 64px above, as ArticleBody spaces an H2. */
export const DATA_SECTION_CLASS = "mt-16";

/** An H3 inside a section: the H3 step in the display voice. */
export const DATA_SUBHEADING_CLASS = "font-display text-balance text-h3-sm sm:text-2xl";

/** The breadcrumb, set as the meta line under the H1 (hub links with a 44px target). */
export const DATA_BREADCRUMB_LIST_CLASS = "flex flex-wrap items-center gap-x-2";
export const DATA_BREADCRUMB_CURRENT_CLASS = "text-foreground";

/**
 * A HUD table on rules: the 2px ink rule opens it, sentence-case heads in
 * Ink 2 on the rule, rows on soft rules, figures in DM Mono (LedgerFigure).
 * No minimum width and no card. The ScrollX wrapper pins the first column;
 * its pinned cells take the paper the table sits on, not ScrollX's raised
 * card and band.
 */
export const DATA_TABLE_SCROLL_CLASS =
  "mt-6 [&_table_td:first-child]:bg-background [&_table_th:first-child]:bg-background";
export const DATA_TABLE_CLASS = "w-full border-t-2 border-foreground text-base";
export const DATA_TABLE_HEAD_ROW_CLASS = "border-b border-border text-left align-bottom";
export const DATA_TABLE_HEAD_CELL_CLASS = "py-2.5 pr-4 text-sm font-semibold text-muted-foreground";
export const DATA_TABLE_HEAD_FIGURE_CLASS = "py-2.5 pl-4 text-right text-sm font-semibold text-muted-foreground";
export const DATA_TABLE_ROW_CLASS = "border-b border-rule-soft";
export const DATA_TABLE_LABEL_CELL_CLASS = "py-2.5 pr-4 font-semibold text-foreground";
export const DATA_TABLE_FIGURE_CELL_CLASS = "py-2.5 pl-4 text-right text-foreground";
export const DATA_TABLE_PRIOR_FIGURE_CELL_CLASS = "py-2.5 pl-4 text-right text-muted-foreground";

/** Labeled figures side by side (the sample underwrite, a state's facts): a ruled list, three columns from 640px. */
export const DATA_FIGURES_CLASS = "mt-6 grid border-t-2 border-foreground sm:grid-cols-3 sm:gap-x-8";
export const DATA_FIGURE_ITEM_CLASS = "border-b border-rule-soft py-4";
export const DATA_FIGURE_LABEL_CLASS = "text-sm font-semibold text-muted-foreground";
export const DATA_FIGURE_VALUE_CLASS = "mt-1 text-2xl font-medium text-foreground";

/** A group of cross-links under the page's ask: a rule, a sentence-case label, 2px tags with a 44px target. */
export const DATA_LINK_GROUP_CLASS = "mt-12 border-t border-border pt-6";
export const DATA_LINK_GROUP_LABEL_CLASS = "mb-3 text-base font-semibold text-foreground";
export const DATA_LINK_ROW_CLASS = "flex flex-wrap gap-2";
export const DATA_TAG_LINK_CLASS =
  "inline-flex min-h-11 min-w-11 items-center rounded-sm border border-border px-3 text-sm text-foreground transition-colors hover:bg-band";

/** The reading column under the hero. PageHero's bottom rule separates the head, so the section adds none. */
export function DataPageBody({ children }: { children: ReactNode }) {
  return (
    <Section rule="none" rhythm="tight">
      <div className="max-w-[68ch] [&>*:first-child]:mt-0">{children}</div>
    </Section>
  );
}

/* ------------------------------------------------------------------------ */
/* Shared market-page sections. Both city render paths (the programmatic     */
/* app/markets/[city] template and the bespoke SafeMarketPage) use these and */
/* one data builder (lib/markets/market-page-data.ts), so they cannot drift. */
/* ------------------------------------------------------------------------ */

/** The strategy pages' dating line. Market and state pages date themselves in their sources box. */
export function MarketDataAsOf({ year }: { year: number }) {
  return (
    <p
      data-market-data-as-of=""
      className="mt-6 text-sm font-semibold text-muted-foreground"
    >
      {buildDataAsOfLine(year)}
    </p>
  );
}

/**
 * Home › Markets › State › City. The state crumb appears only when a state
 * guide exists. Navigation set as a meta line under the H1 (MarketHero
 * mounts it), never above it; each link keeps a 44px target.
 */
export function MarketBreadcrumb({
  city,
  stateName,
  stateSlug,
}: {
  city: string;
  stateName: string;
  stateSlug: string | null;
}) {
  return (
    <nav aria-label="Breadcrumb" className={ARTICLE_META_NEXT}>
      <ol className={DATA_BREADCRUMB_LIST_CLASS}>
        <li>
          <IntentPrefetchLink href="/" className={ARTICLE_META_LINK}>
            Home
          </IntentPrefetchLink>
        </li>
        <li aria-hidden="true">›</li>
        <li>
          <IntentPrefetchLink href="/markets" className={ARTICLE_META_LINK}>
            Markets
          </IntentPrefetchLink>
        </li>
        <li aria-hidden="true">›</li>
        {stateSlug ? (
          <>
            <li>
              <IntentPrefetchLink href={`/states/${stateSlug}`} className={ARTICLE_META_LINK}>
                {stateName}
              </IntentPrefetchLink>
            </li>
            <li aria-hidden="true">›</li>
          </>
        ) : null}
        <li className={DATA_BREADCRUMB_CURRENT_CLASS}>{city}</li>
      </ol>
    </nav>
  );
}

/** The sample deal run through the real engine with the HUD 3-bedroom FMR as a placeholder rent. */
function sampleFor(city: string, hud: HudRent) {
  return calculateAnalysis({
    ...SAMPLE_DEAL_FIXTURE.values,
    address: `${city} sample`,
    monthlyRent: hud.rent3br,
  });
}

/**
 * The page head on PageHero: the H1 (the data title), then under it the
 * place line ("{City}, {ST}", the words the old eyebrow carried), the byline,
 * the breadcrumb, the one "Analyze a deal free" link (audit row P2-80: the
 * action in the first screen) and the HUD lead with FMR's definition. The
 * link sits before the lead, as in a post header, so the long lead does not
 * push it below the first phone screen.
 */
export function MarketHero({
  city,
  stateCode,
  stateName,
  stateSlug,
  data,
}: {
  city: string;
  stateCode: string;
  stateName: string;
  /** The state guide's slug, or null while that guide is not indexable. */
  stateSlug: string | null;
  data: MarketPageData;
}) {
  const { hud } = data;
  const sample = hud ? sampleFor(city, hud) : null;
  const cashFlow = sample ? Math.round(sample.netCashFlow) : null;
  const detail =
    hud && sample && cashFlow !== null
      ? `At a stated ${usd(SAMPLE_DEAL_FIXTURE.values.purchasePrice)} price with the 3-bedroom FMR as a placeholder rent, TrueCap's sample underwrite below comes to ${cashFlow < 0 ? "−" : "+"}${usd(Math.abs(cashFlow))}/mo cash flow, a ${sample.capRate.toFixed(1)}% cap rate, and a ${sample.dscr.toFixed(2)} DSCR. A specific ${city} property runs on its own price, rent, tax bill, and insurance.`
      : `TrueCap has no HUD figure for ${city}. Bring the property's own rent, tax bill, and insurance evidence, then run the address with every assumption labeled and editable.`;
  return (
    <PageHero title={data.h1}>
      <p className={ARTICLE_META}>
        {city}, {stateCode}
      </p>
      <BlogByline />
      <MarketBreadcrumb city={city} stateName={stateName} stateSlug={stateSlug} />
      <UnderTitleAnalyzeLink />
      <p className={DATA_LEDE_CLASS}>
        {data.lead ? (
          <>
            <strong>{data.lead}</strong> {FMR_DEFINITION_CLAUSE} (
            <a
              href={HUD_FMR_OVERVIEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="tc-link"
            >
              HUD
            </a>
            ).{" "}
            {data.voucherNote ? (
              <>
                {data.voucherNote.text} (
                <a
                  href={data.voucherNote.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-market-voucher-note=""
                  className="tc-link"
                >
                  {data.voucherNote.linkLabel}
                </a>
                ).{" "}
              </>
            ) : null}
          </>
        ) : null}
        {detail}
      </p>
    </PageHero>
  );
}

/**
 * HUD Fair Market Rent by bedroom count (with the prior fiscal year), plus
 * ZIP-level SAFMR rows when HUD publishes them.
 *
 * Neither table sets a minimum width. The ZIP table's 24rem minimum, inside
 * a card's padding, hid its whole 3-bedroom column at 390px (78px cut,
 * nothing to say so), and the bedroom table's 18rem overflowed at 360px.
 * Without them, and without the card, both have the column's full width. If
 * a table still overflows, its first column stays pinned and ScrollX shows
 * its "Scroll for more" caption. The tables sit on the paper on rules
 * (DATA_TABLE_*), so the pinned cells take the paper too.
 */
export function MarketFmrSection({
  city,
  data,
}: {
  city: string;
  data: MarketPageData;
}) {
  const { hud, area, safmr } = data;
  if (!hud) return null;
  const prior = area?.prior ?? null;
  const rows = [
    { label: "2 bedrooms", now: hud.rent2br, before: prior?.rent2br ?? null },
    { label: "3 bedrooms", now: hud.rent3br, before: prior?.rent3br ?? null },
  ];
  return (
    <section data-market-fmr="" className={DATA_SECTION_CLASS}>
      <SectionHeading>
        {city} {fmrLabel(hud.year)}
      </SectionHeading>
      <p className={DATA_TEXT_CLASS}>
        {fmrLabel(hud.year)} for {data.areaPhrase}. It is an area
        benchmark, not what a specific unit rents for: compare it with current
        leases for the address.
        {area ? (
          <>
            {" "}
            <a
              href={area.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="tc-link"
            >
              HUD&apos;s FY{area.year} page for this area
            </a>{" "}
            shows every bedroom size.
          </>
        ) : null}
      </p>
      <ScrollX cue stickyFirstColumn label="Market table" className={DATA_TABLE_SCROLL_CLASS}>
        <table className={DATA_TABLE_CLASS}>
          <caption className="sr-only">
            {fmrLabel(hud.year)} by bedroom count, {area ? area.areaName : city}
          </caption>
          <thead>
            <tr className={DATA_TABLE_HEAD_ROW_CLASS}>
              <th scope="col" className={DATA_TABLE_HEAD_CELL_CLASS}>
                Bedrooms
              </th>
              {prior ? (
                <th scope="col" className={DATA_TABLE_HEAD_FIGURE_CLASS}>
                  FY{prior.year} / month
                </th>
              ) : null}
              <th scope="col" className={DATA_TABLE_HEAD_FIGURE_CLASS}>
                FY{hud.year} / month
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className={DATA_TABLE_ROW_CLASS}>
                <td className={DATA_TABLE_LABEL_CELL_CLASS}>{row.label}</td>
                {prior ? (
                  <td className={DATA_TABLE_PRIOR_FIGURE_CELL_CLASS}>
                    <LedgerFigure>{row.before === null ? "—" : usd(row.before)}</LedgerFigure>
                  </td>
                ) : null}
                <td className={DATA_TABLE_FIGURE_CELL_CLASS}>
                  <LedgerFigure>{usd(row.now)}</LedgerFigure>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollX>

      {safmr ? (
        <div className="mt-10">
          <h3 className={DATA_SUBHEADING_CLASS}>
            By ZIP code: HUD Small Area Fair Market Rent (FY{safmr.year})
          </h3>
          <p className={DATA_TEXT_CLASS}>
            HUD also publishes ZIP-level Fair Market Rents for the{" "}
            {safmr.areaName}, the region that includes {city}. They vary by
            ZIP and bedroom count.
            {area?.safmrSourceUrl ? (
              <>
                {" "}
                <a
                  href={area.safmrSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tc-link"
                >
                  HUD&apos;s ZIP table
                </a>{" "}
                lists every ZIP.
              </>
            ) : null}
          </p>
          <ScrollX cue stickyFirstColumn label="Market table" className={DATA_TABLE_SCROLL_CLASS}>
            <table className={DATA_TABLE_CLASS}>
              <caption className="sr-only">
                HUD Small Area Fair Market Rent (FY{safmr.year}) by ZIP code, {safmr.areaName}
              </caption>
              <thead>
                <tr className={DATA_TABLE_HEAD_ROW_CLASS}>
                  <th scope="col" className={DATA_TABLE_HEAD_CELL_CLASS}>
                    ZIP code
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
                {safmr.rows.map((row) => (
                  <tr key={row.zip} className={DATA_TABLE_ROW_CLASS}>
                    <td className={DATA_TABLE_LABEL_CELL_CLASS}>
                      <LedgerFigure>{row.zip}</LedgerFigure>
                    </td>
                    <td className={DATA_TABLE_FIGURE_CELL_CLASS}>
                      <LedgerFigure>{usd(row.rent2br)}</LedgerFigure>
                    </td>
                    <td className={DATA_TABLE_FIGURE_CELL_CLASS}>
                      <LedgerFigure>{usd(row.rent3br)}</LedgerFigure>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollX>
          <p className={DATA_NOTE_CLASS}>
            {safmr.rows.length < safmr.zipCount
              ? `${safmr.rows.length} of ${safmr.zipCount} ZIP codes in the ${safmr.areaName}, sampled highest to lowest.`
              : `All ${safmr.zipCount} ZIP codes in the ${safmr.areaName}, highest first.`}
          </p>
        </div>
      ) : null}
    </section>
  );
}

/**
 * A worked sample: the shared sample deal (lib/sample-deal.ts) run through
 * the real engine with the city's HUD 3-bedroom FMR in place of the
 * fixture's rent. Same price, same financing, same expense assumptions —
 * only the rent changes, so cities compare on one axis.
 */
export function MarketSampleUnderwrite({
  city,
  hud,
}: {
  city: string;
  hud: HudRent;
}) {
  const values = {
    ...SAMPLE_DEAL_FIXTURE.values,
    address: `${city} sample`,
    monthlyRent: hud.rent3br,
  };
  const result = calculateAnalysis(values);
  const price = values.purchasePrice;
  const cashFlow = Math.round(result.netCashFlow);
  const cashFlowLabel = `${cashFlow < 0 ? "−" : "+"}${usd(Math.abs(cashFlow))}/mo`;
  const stats = [
    { label: "Monthly cash flow", value: cashFlowLabel },
    { label: "Cap rate", value: `${result.capRate.toFixed(1)}%` },
    { label: "DSCR", value: result.dscr.toFixed(2) },
  ];
  const assumptions = [
    `${values.downPaymentPct}% down`,
    `${values.interestRate}% rate, ${values.loanTermYears}-year loan`,
    `${values.closingCostsPct}% closing costs`,
    `${values.propertyTaxPct}% property tax`,
    `${values.insurancePct}% insurance`,
    `${values.vacancyPct}% vacancy`,
    `${values.mgmtPct}% management`,
    `${values.maintenancePct}% maintenance`,
    `${values.capexPct}% CapEx reserve`,
  ];

  return (
    <section data-market-sample-underwrite="" className={DATA_SECTION_CLASS}>
      <SectionHeading>
        What the HUD FMR pencils to
      </SectionHeading>
      <p className={DATA_TEXT_CLASS}>
        Sample underwrite at a stated {usd(price)} price with the HUD
        3-bedroom FMR as a placeholder rent — not a listing. TrueCap ran its sample deal with{" "}
        {usd(hud.rent3br)}/mo of rent and every other assumption unchanged.
      </p>
      <dl className={DATA_FIGURES_CLASS}>
        {stats.map((stat) => (
          <div key={stat.label} className={DATA_FIGURE_ITEM_CLASS}>
            <dt className={DATA_FIGURE_LABEL_CLASS}>
              {stat.label}
            </dt>
            <dd className={DATA_FIGURE_VALUE_CLASS}>
              <LedgerFigure>{stat.value}</LedgerFigure>
            </dd>
          </div>
        ))}
      </dl>
      <p className={DATA_NOTE_CLASS}>
        Assumptions: {usd(price)} price, {usd(hud.rent3br)}/mo rent (HUD FMR,
        3 bedrooms), {assumptions.join(", ")}. Change any of them in the
        analyzer and the numbers move with you.
      </p>
    </section>
  );
}

/**
 * Sourced local facts from content/seo/market-facts.json (county effective
 * tax rate, rental licensing). Renders nothing until the slug has one.
 */
export function MarketLocalData({
  city,
  facts,
}: {
  city: string;
  facts: MarketFacts | null;
}) {
  const tax = facts?.countyEffectiveTaxRate ?? null;
  const licensing = facts?.rentalLicensing ?? null;
  if (!tax && !licensing) return null;
  const source = (s: { url: string; title: string; publisher: string; retrievedAt: string }) => (
    <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
      Source:{" "}
      <a
        href={s.url}
        target="_blank"
        rel="noopener noreferrer"
        className="tc-link"
      >
        {s.title}
      </a>{" "}
      ({s.publisher}), retrieved {formatIsoDate(s.retrievedAt)}
    </dd>
  );
  return (
    <section data-market-local-data="" className={DATA_SECTION_CLASS}>
      <SectionHeading>Local data for {city}</SectionHeading>
      <dl className="mt-6 border-t-2 border-foreground">
        {tax ? (
          <div className={DATA_FIGURE_ITEM_CLASS}>
            <dt className={DATA_FIGURE_LABEL_CLASS}>
              {tax.county} effective property tax rate
            </dt>
            <dd className="mt-1 text-lg font-semibold text-foreground">
              {tax.value}% (tax year {tax.year})
            </dd>
            {source(tax.source)}
          </div>
        ) : null}
        {licensing ? (
          <div className={DATA_FIGURE_ITEM_CLASS}>
            <dt className={DATA_FIGURE_LABEL_CLASS}>
              Rental licensing or registration
            </dt>
            <dd className="mt-1 text-base font-semibold text-foreground">
              {licensing.required ? "Required." : "Not required."}{" "}
              <span className="font-normal text-muted-foreground">{licensing.summary}</span>
            </dd>
            {source(licensing.source)}
          </div>
        ) : null}
      </dl>
    </section>
  );
}

/** The page's sources box: the dating line, every cited source, the closing line. */
export function MarketSources({ data }: { data: MarketPageData }) {
  return (
    <SourceMethodologyBox
      className={DATA_SECTION_CLASS}
      dataAsOf={data.dataAsOf}
      sources={data.sources}
      note="HUD figures come from HUD's published tables for the area. The sample underwrite runs TrueCap's sample deal through the analyzer's own math."
    />
  );
}

/** Plain guidance. No external links unless the repo already carries a verified URL for the city — it does not. */
export function MarketVerifyLocally({ city }: { city: string }) {
  const items = [
    {
      title: "Property tax bill",
      body: `Pull the parcel's current bill from the county assessor or treasurer, and check whether a sale changes the assessment. The sample above uses ${SAMPLE_DEAL_FIXTURE.values.propertyTaxPct}% of price; enter the ${city} bill instead.`,
    },
    {
      title: "Rental licensing and permits",
      body: `Check whether ${city} requires a rental license, registration, inspection, or certificate of occupancy for the address, and budget any fees before you close.`,
    },
    {
      title: "Insurance quotes",
      body: "Get a written landlord-policy quote for the specific property, with wind, hail, or flood coverage where the property needs it, and enter that premium instead of a default.",
    },
  ];
  return (
    <section data-market-verify-locally="" className={DATA_SECTION_CLASS}>
      <SectionHeading>
        Three things to verify locally
      </SectionHeading>
      {/* Term-and-detail rows on rules (the lead-in is the term), no icons. */}
      <RuledList
        className="mt-6"
        items={items.map((item) => ({
          key: item.title,
          term: <>{item.title}.</>,
          detail: item.body,
        }))}
      />
    </section>
  );
}

const MARKET_GLOSSARY_SLUGS = ["cap-rate", "dscr", "cash-on-cash-return"] as const;
const MARKET_BLOG_SLUGS = [
  "how-to-estimate-rent-rental-property",
  "cash-flow-vs-appreciation",
] as const;

/**
 * Glossary terms behind the sample numbers, two rent / cash-flow guides, and
 * any city-specific posts the caller already links (cities.ts relatedPosts).
 */
export function MarketRelatedReading({
  postSlugs = [],
}: {
  postSlugs?: readonly string[];
}) {
  const glossary = MARKET_GLOSSARY_SLUGS.flatMap((slug) => {
    const entry = getGlossaryEntryBySlug(slug);
    return entry && isLinkablePath(`/glossary/${slug}`)
      ? [{ href: `/glossary/${slug}`, label: entry.term }]
      : [];
  });
  // Published, linkable posts only (lib/seo/link-policy.ts).
  const readable = BLOG_POSTS.filter(
    (post) => post.available && isLinkablePath(`/blog/${post.slug}`),
  );
  const preferred = new Set<string>(MARKET_BLOG_SLUGS);
  const posts = readable.filter((post) => preferred.has(post.slug));
  const fallback = readable.filter(
    (post) => !preferred.has(post.slug) && /rent|cash-flow/.test(post.slug),
  );
  const shared = [...posts, ...fallback].slice(0, 2);
  const sharedSlugs = new Set(shared.map((post) => post.slug));
  const extra = postSlugs.flatMap((slug) => {
    if (sharedSlugs.has(slug)) return [];
    const post = readable.find((entry) => entry.slug === slug);
    return post ? [post] : [];
  });
  const blog = [...shared, ...extra].map((post) => ({
    href: `/blog/${post.slug}`,
    label: post.title,
  }));
  if (glossary.length === 0 && blog.length === 0) return null;
  return (
    <section data-market-related-reading="" className={DATA_LINK_GROUP_CLASS}>
      <p className={DATA_LINK_GROUP_LABEL_CLASS}>
        The terms behind the numbers
      </p>
      <div className={DATA_LINK_ROW_CLASS}>
        {glossary.map((link) => (
          <IntentPrefetchLink key={link.href} href={link.href} className={DATA_TAG_LINK_CLASS}>
            {link.label}
          </IntentPrefetchLink>
        ))}
      </div>
      {blog.length > 0 ? (
        <>
          <p className={cn(DATA_LINK_GROUP_LABEL_CLASS, "mt-6")}>
            Related reading
          </p>
          {/* A post title is the link; no arrow after it (DESIGN.md chrome). */}
          <ul className="text-base">
            {blog.map((link) => (
              <li key={link.href}>
                <IntentPrefetchLink
                  href={link.href}
                  className="tc-link inline-flex min-h-11 items-center"
                >
                  {link.label}
                </IntentPrefetchLink>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}

/**
 * "For {State} data, see the {State} guide." Rendered only when the state
 * guide is indexable (lib/markets/nearby.ts stateGuideSlugFor), so a city
 * page never points readers or crawlers at a noindexed state page.
 */
export function MarketStateGuideLink({
  stateName,
  stateSlug,
}: {
  stateName: string;
  stateSlug: string | null;
}) {
  if (!stateSlug) return null;
  return (
    <p className="mt-6 text-pretty text-base leading-relaxed text-muted-foreground">
      For {stateName} data, see the{" "}
      <IntentPrefetchLink
        href={`/states/${stateSlug}`}
        className="tc-link"
      >
        {stateName} guide
      </IntentPrefetchLink>
      .
    </p>
  );
}

/**
 * Up to five other markets (lib/markets/nearby.ts), under labels the data
 * supports. The repo has no coordinates, so the block does not say "nearby":
 * "More {State} markets" lists the state's own picks (markets sharing the
 * county or HUD FMR area first, then the state's next markets
 * alphabetically), and "Across the state line" lists a market in another
 * state that shares the HUD FMR area. Renders nothing when the city has no
 * linkable neighbour.
 */
export function MarketNearby({ slug }: { slug: string }) {
  const groups = nearbyMarketGroups(slug);
  if (!groups) return null;
  const { stateName, sameState, acrossStateLine } = groups;
  if (sameState.length === 0 && acrossStateLine.length === 0) return null;
  const chips = (markets: MarketLink[]) => (
    <div className={DATA_LINK_ROW_CLASS}>
      {markets.map((market) => (
        <IntentPrefetchLink
          key={market.slug}
          href={`/markets/${market.slug}`}
          className={DATA_TAG_LINK_CLASS}
        >
          {market.name}, {market.stateCode}
        </IntentPrefetchLink>
      ))}
    </div>
  );
  return (
    <section data-market-nearby="" className={DATA_LINK_GROUP_CLASS}>
      {sameState.length > 0 ? (
        <div data-market-group="state">
          <p className={DATA_LINK_GROUP_LABEL_CLASS}>
            More {stateName} markets
          </p>
          {chips(sameState)}
        </div>
      ) : null}
      {acrossStateLine.length > 0 ? (
        <div
          data-market-group="across-state-line"
          className={sameState.length > 0 ? "mt-6" : undefined}
        >
          <p className={DATA_LINK_GROUP_LABEL_CLASS}>
            Across the state line
          </p>
          {chips(acrossStateLine)}
        </div>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------------ */
/* Bespoke city page (app/markets/<city>/page.tsx wrappers).                 */
/* ------------------------------------------------------------------------ */

export function SafeMarketPage(identity: SafeMarketPageIdentity) {
  const { city, stateCode, stateName, slug } = identity;
  // The wrapper names its state; link it only while that guide is indexable.
  const stateSlug = stateGuideSlugFor(stateName);
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/markets/${slug}`;
  const address = identity.analyzerAddress ?? `${city}, ${stateCode}`;
  const data = buildMarketPageData({ slug, city, stateCode });
  const webpageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonicalUrl}#page`,
    name: data.title,
    description: data.description,
    url: canonicalUrl,
    // The page's own last significant change (content/seo/lastmod.json); omitted when it has none.
    dateModified: lastmodFor(`/markets/${slug}`),
    inLanguage: "en-US",
    isPartOf: { "@id": `${siteUrl}/#website` },
    author: { "@id": `${siteUrl}/#organization` },
    about: {
      "@type": "Place",
      name: `${city}, ${stateCode}`,
      address: {
        "@type": "PostalAddress",
        addressLocality: city,
        addressRegion: stateCode,
        addressCountry: "US",
      },
    },
  };
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
              name: stateName,
              item: `${siteUrl}/states/${stateSlug}`,
            },
            { "@type": "ListItem", position: 4, name: city, item: canonicalUrl },
          ]
        : [{ "@type": "ListItem", position: 3, name: city, item: canonicalUrl }]),
    ],
  };
  const mainData = { [MARKET_DATA_ATTRIBUTE]: data.status };

  return (
    <div className={DATA_PAGE_ROOT_CLASS}>
      <JsonLd data={webpageLd} />
      <JsonLd data={breadcrumbLd} />
      <Header />
      <main id="main" {...mainData} tabIndex={-1} className={DATA_PAGE_MAIN_CLASS}>
        <MarketHero
          city={city}
          stateCode={stateCode}
          stateName={stateName}
          stateSlug={stateSlug}
          data={data}
        />

        <DataPageBody>
          {data.hud ? (
            <>
              <MarketFmrSection city={city} data={data} />
              <MarketSampleUnderwrite city={city} hud={data.hud} />
            </>
          ) : null}

          <MarketLocalData city={city} facts={data.facts} />

          <DataFaq heading={`${city} rental data: common questions`} items={data.faq} />

          <MarketSources data={data} />

          <MarketVerifyLocally city={city} />

          <MarketStateGuideLink stateName={stateName} stateSlug={stateSlug} />

          <div className={DATA_SECTION_CLASS}>
            <SeoAnalyzerCta
              context={`a ${city} property`}
              handoff={{ address }}
              utmSource="market"
              supportingText={`Start with a street address in ${city}, ${stateCode}. Review every labeled starting assumption and replace it with property-specific evidence.`}
            />
          </div>

          <CityStrategyGuides citySlug={slug} cityName={city} />

          {data.hud ? <MarketRelatedReading /> : null}

          <MarketNearby slug={slug} />
        </DataPageBody>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
