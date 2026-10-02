import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, MapPin } from "lucide-react";
import { Header } from "@/components/investcalc/header";
import { BlogByline } from "@/components/marketing/blog-byline";
import { CityStrategyGuides } from "@/components/marketing/city-strategy-guides";
import { DataFaq } from "@/components/marketing/data-faq";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SeoAnalyzerCta } from "@/components/marketing/seo-analyzer-cta";
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

/** Home › Markets › State › City. The state crumb appears only when a state guide exists. */
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
              <Link href={`/states/${stateSlug}`} className="hover:text-foreground">
                {stateName}
              </Link>
            </li>
            <li aria-hidden="true">›</li>
          </>
        ) : null}
        <li className="font-semibold text-foreground">{city}</li>
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

/** Eyebrow, H1 (the data title), byline, and the HUD lead with FMR's definition. */
export function MarketHero({
  city,
  stateCode,
  data,
}: {
  city: string;
  stateCode: string;
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
    <header>
      <p className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-widest text-primary">
        <MapPin className="size-3.5" /> {city}, {stateCode}
      </p>
      <h1 className="mt-2 text-3xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
        {data.h1}
      </h1>
      <BlogByline />
      <p className="mt-5 text-lg leading-relaxed text-foreground">
        {data.lead ? (
          <>
            <strong>{data.lead}</strong> {FMR_DEFINITION_CLAUSE} (
            <a
              href={HUD_FMR_OVERVIEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary hover:underline"
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
                  className="font-semibold text-primary hover:underline"
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
    </header>
  );
}

/** HUD Fair Market Rent by bedroom count (with the prior fiscal year), plus ZIP-level SAFMR rows when HUD publishes them. */
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
  const cell =
    "px-4 py-2.5 text-2xs font-bold uppercase tracking-widest text-muted-foreground";
  const rows = [
    { label: "2 bedrooms", now: hud.rent2br, before: prior?.rent2br ?? null },
    { label: "3 bedrooms", now: hud.rent3br, before: prior?.rent3br ?? null },
  ];
  return (
    <section
      data-market-fmr=""
      className="mt-10 rounded-2xl border border-border bg-card p-6"
    >
      <h2 className="text-2xl font-extrabold text-foreground">
        {city} {fmrLabel(hud.year)}
      </h2>
      <p className="mt-2 text-base leading-relaxed text-muted-foreground">
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
              className="font-semibold text-primary hover:underline"
            >
              HUD&apos;s FY{area.year} page for this area
            </a>{" "}
            shows every bedroom size.
          </>
        ) : null}
      </p>
      <ScrollX label="Market table" className="mt-4 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[18rem] text-sm">
          <caption className="sr-only">
            {fmrLabel(hud.year)} by bedroom count, {area ? area.areaName : city}
          </caption>
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left">
              <th scope="col" className={cell}>
                Bedrooms
              </th>
              {prior ? (
                <th scope="col" className={`${cell} text-right`}>
                  FY{prior.year} / month
                </th>
              ) : null}
              <th scope="col" className={`${cell} text-right`}>
                FY{hud.year} / month
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-border last:border-b-0">
                <td className="px-4 py-2.5 font-semibold text-foreground">{row.label}</td>
                {prior ? (
                  <td className="px-4 py-2.5 text-right text-muted-foreground">
                    {row.before === null ? "—" : usd(row.before)}
                  </td>
                ) : null}
                <td className="px-4 py-2.5 text-right text-foreground">{usd(row.now)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollX>

      {safmr ? (
        <div className="mt-6">
          <h3 className="text-lg font-extrabold text-foreground">
            By ZIP code: HUD Small Area Fair Market Rent (FY{safmr.year})
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
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
                  className="font-semibold text-primary hover:underline"
                >
                  HUD&apos;s ZIP table
                </a>{" "}
                lists every ZIP.
              </>
            ) : null}
          </p>
          <ScrollX label="Market table" className="mt-3 overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[24rem] text-sm">
              <caption className="sr-only">
                HUD Small Area Fair Market Rent (FY{safmr.year}) by ZIP code, {safmr.areaName}
              </caption>
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th scope="col" className={cell}>
                    ZIP code
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
                {safmr.rows.map((row) => (
                  <tr
                    key={row.zip}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-4 py-2.5 font-semibold text-foreground">
                      {row.zip}
                    </td>
                    <td className="px-4 py-2.5 text-right text-foreground">
                      {usd(row.rent2br)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-foreground">
                      {usd(row.rent3br)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollX>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
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
    <section data-market-sample-underwrite="" className="mt-10">
      <h2 className="text-2xl font-extrabold text-foreground">
        What the HUD FMR pencils to
      </h2>
      <p className="mt-2 text-base leading-relaxed text-muted-foreground">
        Sample underwrite at a stated {usd(price)} price with the HUD
        3-bedroom FMR as a placeholder rent — not a listing. TrueCap ran its sample deal with{" "}
        {usd(hud.rent3br)}/mo of rent and every other assumption unchanged.
      </p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-card p-4"
          >
            <dt className="text-3xs font-bold uppercase tracking-widest text-muted-foreground">
              {stat.label}
            </dt>
            <dd className="mt-1 text-2xl font-extrabold text-foreground">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
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
    <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">
      Source:{" "}
      <a
        href={s.url}
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-dotted underline-offset-2 hover:text-foreground"
      >
        {s.title}
      </a>{" "}
      ({s.publisher}), retrieved {formatIsoDate(s.retrievedAt)}
    </dd>
  );
  return (
    <section data-market-local-data="" className="mt-10 rounded-2xl border border-border bg-card p-6">
      <h2 className="text-2xl font-extrabold text-foreground">Local data for {city}</h2>
      <dl className="mt-4 space-y-4">
        {tax ? (
          <div>
            <dt className="text-3xs font-bold uppercase tracking-widest text-muted-foreground">
              {tax.county} effective property tax rate
            </dt>
            <dd className="mt-1 text-lg font-extrabold text-foreground">
              {tax.value}% (tax year {tax.year})
            </dd>
            {source(tax.source)}
          </div>
        ) : null}
        {licensing ? (
          <div>
            <dt className="text-3xs font-bold uppercase tracking-widest text-muted-foreground">
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
      className="mt-10"
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
    <section data-market-verify-locally="" className="mt-10">
      <h2 className="text-2xl font-extrabold text-foreground">
        Three things to verify locally
      </h2>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item.title} className="flex gap-3 text-base leading-relaxed">
            <CheckCircle2 className="mt-1 size-4 shrink-0 text-primary" />
            <span>
              <strong className="text-foreground">{item.title}.</strong>{" "}
              <span className="text-muted-foreground">{item.body}</span>
            </span>
          </li>
        ))}
      </ul>
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
  const chip =
    "inline-flex min-h-11 items-center rounded-full border border-border bg-card px-3 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";
  return (
    <section
      data-market-related-reading=""
      className="mt-12 border-t border-border pt-6"
    >
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        The terms behind the numbers
      </p>
      <div className="flex flex-wrap gap-2 text-sm">
        {glossary.map((link) => (
          <Link key={link.href} href={link.href} className={chip}>
            {link.label}
          </Link>
        ))}
      </div>
      {blog.length > 0 ? (
        <>
          <p className="mb-3 mt-6 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Related reading
          </p>
          <ul className="space-y-1.5 text-sm">
            {blog.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline"
                >
                  {link.label} →
                </Link>
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
    <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
      For {stateName} data, see the{" "}
      <Link
        href={`/states/${stateSlug}`}
        className="font-semibold text-primary hover:underline"
      >
        {stateName} guide
      </Link>
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
    <div className="flex flex-wrap gap-2 text-sm">
      {markets.map((market) => (
        <Link
          key={market.slug}
          href={`/markets/${market.slug}`}
          className="inline-flex min-h-11 items-center rounded-full border border-border bg-card px-3 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {market.name}, {market.stateCode}
        </Link>
      ))}
    </div>
  );
  return (
    <section data-market-nearby="" className="mt-12 border-t border-border pt-6">
      {sameState.length > 0 ? (
        <div data-market-group="state">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
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
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
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
    <div className="min-h-screen bg-background">
      <JsonLd data={webpageLd} />
      <JsonLd data={breadcrumbLd} />
      <Header />
      <main
        id="main"
        {...mainData}
        className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12"
      >
        <MarketBreadcrumb city={city} stateName={stateName} stateSlug={stateSlug} />
        <MarketHero city={city} stateCode={stateCode} data={data} />

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

        <div className="mt-10">
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
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
