import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, MapPin } from "lucide-react";
import { BLOG_POSTS } from "@/app/blog/page";
import { CityStrategyGuides } from "@/components/marketing/city-strategy-guides";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SeoAnalyzerCta } from "@/components/marketing/seo-analyzer-cta";
import { SiteFooter } from "@/components/marketing/site-footer";
import { calculateAnalysis } from "@/lib/calc-analysis";
import { getGlossaryEntryBySlug } from "@/lib/glossary";
import type { HudRent } from "@/lib/markets/hud-rents";
import {
  NOINDEX_FOLLOW,
  buildDataAsOfLine,
  getMarketDataYear,
  getMarketHudRent,
  isMarketIndexable,
} from "@/lib/markets/indexability";
import type { CitySafmr } from "@/lib/markets/safmr-rents";
import { SAMPLE_DEAL_FIXTURE } from "@/lib/sample-deal";
import { getSiteUrl } from "@/lib/site-url";

export type SafeMarketPageIdentity = {
  city: string;
  stateCode: string;
  stateName: string;
  stateSlug: string;
  slug: string;
  /** Optional analyzer address when the display city names a wider metro. */
  analyzerAddress?: string;
};

export function buildSafeMarketMetadata({
  city,
  stateCode,
  slug,
}: SafeMarketPageIdentity): Metadata {
  const title = `${city} rental property analysis`;
  const description = `Start a ${city}, ${stateCode} rental-property screen with editable assumptions. Verify asking price, rent, property tax, insurance, financing, and local rules before you offer.`;
  return {
    title,
    description,
    alternates: { canonical: `/markets/${slug}` },
    // A city page without HUD rent is a template, not a page worth ranking.
    robots: isMarketIndexable(slug) ? undefined : NOINDEX_FOLLOW,
    openGraph: {
      title,
      description,
      url: `/markets/${slug}`,
      type: "website",
      images: [
        {
          url: "/home.jpg",
          width: 1200,
          height: 630,
          alt: `TrueCap ${city} rental analysis`,
        },
      ],
    },
    twitter: { card: "summary_large_image", images: ["/home.jpg"] },
  };
}

const usd = (value: number) => `$${Math.round(value).toLocaleString("en-US")}`;

/* ------------------------------------------------------------------------ */
/* Shared market-page sections. Both city render paths (the programmatic     */
/* app/markets/[city] template and the bespoke SafeMarketPage) use these so  */
/* the markup cannot drift between them.                                     */
/* ------------------------------------------------------------------------ */

/** The one dating line. Replaces every former boundary paragraph. */
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

/** HUD Fair Market Rent by bedroom count, plus ZIP-level SAFMR rows when HUD publishes them. */
export function MarketFmrSection({
  city,
  hud,
  safmr,
}: {
  city: string;
  hud: HudRent;
  safmr?: CitySafmr;
}) {
  const cell =
    "px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground";
  return (
    <section
      data-market-fmr=""
      className="mt-10 rounded-2xl border border-border bg-card p-6"
    >
      <h2 className="text-2xl font-extrabold text-foreground">
        {city} rent benchmark
      </h2>
      <p className="mt-2 text-base leading-relaxed text-muted-foreground">
        HUD Fair Market Rent, FY{hud.year}, for the county or metro that
        contains {city}. It is a housing-program benchmark, not a comp for one
        property. Use it as your starting rent, then replace it with current
        leases for the address.
      </p>
      <div className="mt-4 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[18rem] text-sm">
          <caption className="sr-only">
            HUD Fair Market Rent, FY{hud.year}, by bedroom count for {city}
          </caption>
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left">
              <th scope="col" className={cell}>
                Bedrooms
              </th>
              <th scope="col" className={`${cell} text-right`}>
                HUD FMR / month
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <td className="px-4 py-2.5 font-semibold text-foreground">
                2 bedrooms
              </td>
              <td className="px-4 py-2.5 text-right text-foreground">
                {usd(hud.rent2br)}
              </td>
            </tr>
            <tr>
              <td className="px-4 py-2.5 font-semibold text-foreground">
                3 bedrooms
              </td>
              <td className="px-4 py-2.5 text-right text-foreground">
                {usd(hud.rent3br)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {safmr ? (
        <div className="mt-6">
          <h3 className="text-lg font-extrabold text-foreground">
            By ZIP code: HUD Small Area Fair Market Rent, FY{safmr.year}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            HUD also publishes ZIP-level rents for the {safmr.areaName}, the
            region that includes {city}. Rent varies by ZIP and bedroom count.
          </p>
          <div className="mt-3 overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[24rem] text-sm">
              <caption className="sr-only">
                HUD Small Area Fair Market Rent by ZIP code, {safmr.areaName},
                FY{safmr.year}
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
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {safmr.rows.length < safmr.zipCount
              ? `${safmr.rows.length} of ${safmr.zipCount} ZIP codes in the ${safmr.areaName}, sampled highest to lowest.`
              : `All ${safmr.zipCount} ZIP codes in the ${safmr.areaName}, highest rent first.`}
          </p>
        </div>
      ) : null}
    </section>
  );
}

/**
 * A worked sample: the shared sample deal (lib/sample-deal.ts) run through
 * the real engine with the city's HUD 3-bedroom rent in place of the
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
        What the HUD rent pencils to
      </h2>
      <p className="mt-2 text-base leading-relaxed text-muted-foreground">
        Sample underwrite at a stated {usd(price)} price using the HUD
        3-bedroom benchmark — not a listing. TrueCap ran its sample deal with{" "}
        {usd(hud.rent3br)}/mo of rent and every other assumption unchanged.
      </p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-card p-4"
          >
            <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
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

/** Plain guidance. No external links unless the repo already carries a verified URL for the city — it does not. */
export function MarketVerifyLocally({ city }: { city: string }) {
  const items = [
    {
      title: "Property tax bill",
      body: `Pull the parcel's current bill from the county assessor or treasurer, and check how the assessment resets after a sale. The sample above uses ${SAMPLE_DEAL_FIXTURE.values.propertyTaxPct}% of price; your ${city} bill may be higher or lower.`,
    },
    {
      title: "Rental licensing and permits",
      body: `Many cities require a rental license, an inspection, or a certificate of occupancy before you can lease. Confirm the ${city} rules for the address and budget the fees before you close.`,
    },
    {
      title: "Insurance quotes",
      body: "Get a written landlord-policy quote for the specific property, including wind, hail, or flood coverage where it applies. Premiums vary by ZIP, building age, and roof.",
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
    return entry ? [{ href: `/glossary/${slug}`, label: entry.term }] : [];
  });
  const preferred = new Set<string>(MARKET_BLOG_SLUGS);
  const posts = BLOG_POSTS.filter(
    (post) => post.available && preferred.has(post.slug),
  );
  const fallback = BLOG_POSTS.filter(
    (post) =>
      post.available &&
      !preferred.has(post.slug) &&
      /rent|cash-flow/.test(post.slug),
  );
  const shared = [...posts, ...fallback].slice(0, 2);
  const sharedSlugs = new Set(shared.map((post) => post.slug));
  const extra = postSlugs.flatMap((slug) => {
    if (sharedSlugs.has(slug)) return [];
    const post = BLOG_POSTS.find((entry) => entry.slug === slug);
    return post && post.available ? [post] : [];
  });
  const blog = [...shared, ...extra].map((post) => ({
    href: `/blog/${post.slug}`,
    label: post.title,
  }));
  if (glossary.length === 0 && blog.length === 0) return null;
  const chip =
    "inline-flex min-h-11 items-center rounded-full border border-border bg-card px-3 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
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

/* ------------------------------------------------------------------------ */
/* Bespoke city page (app/markets/<city>/page.tsx wrappers).                 */
/* ------------------------------------------------------------------------ */

export function SafeMarketPage(identity: SafeMarketPageIdentity) {
  const { city, stateCode, stateName, stateSlug, slug } = identity;
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/markets/${slug}`;
  const address = identity.analyzerAddress ?? `${city}, ${stateCode}`;
  const title = `${city} rental property analysis`;
  const hud = getMarketHudRent(slug);
  const year = getMarketDataYear(slug);
  const description = hud
    ? `${city}, ${stateCode} rental screen: HUD Fair Market Rent, FY${hud.year}, a sample underwrite, and what to verify before you offer.`
    : `Start a ${city}, ${stateCode} rental-property screen with labeled, editable assumptions. TrueCap has no published rent benchmark for ${city}; verify rent, tax, and insurance locally.`;
  const webpageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonicalUrl}#page`,
    name: title,
    description,
    url: canonicalUrl,
    inLanguage: "en-US",
    isPartOf: { "@id": `${siteUrl}/#website` },
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
      {
        "@type": "ListItem",
        position: 1,
        name: "TrueCap",
        item: `${siteUrl}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Markets",
        item: `${siteUrl}/markets`,
      },
      { "@type": "ListItem", position: 3, name: city, item: canonicalUrl },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webpageLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <main id="main" className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-2">
          <Link
            href="/markets"
            className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            ← Rental markets
          </Link>
        </div>

        <header className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary">
            <MapPin className="size-3" />
            {city}, {stateCode}
          </div>
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl">
            {city} rental property analysis
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {hud
              ? `Start with the HUD rent benchmark for ${city}, see what it pencils to on a sample deal, then run your own address with every assumption labeled and editable.`
              : `Start a ${city} property screen with every assumption labeled and editable. TrueCap has no published rent benchmark for ${city}, so bring the property's own rent, tax, and insurance evidence.`}
          </p>
          <MarketDataAsOf year={year} />
        </header>

        {hud ? (
          <>
            <MarketFmrSection city={city} hud={hud} />
            <MarketSampleUnderwrite city={city} hud={hud} />
          </>
        ) : null}

        <MarketVerifyLocally city={city} />

        <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
          For the state&apos;s starting numbers, see the{" "}
          <Link
            href={`/states/${stateSlug}`}
            className="font-semibold text-primary hover:underline"
          >
            {stateName} guide
          </Link>
          .
        </p>

        <div className="mt-10">
          <SeoAnalyzerCta
            context={`a ${city} property`}
            handoff={{ address }}
            utmSource="market"
            supportingText={`Start with ${address} in the address field. Review every labeled starting assumption and replace it with property-specific evidence.`}
          />
        </div>

        <CityStrategyGuides citySlug={slug} cityName={city} />

        {hud ? <MarketRelatedReading /> : null}
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
