/**
 * /markets/cleveland — Cleveland, OH rental market landing page.
 *
 * Why Cleveland second (after Philly): Cleveland is one of the most
 * BRRRR-discussed markets in the country — abundant distressed
 * single-family + 2-4 unit inventory at low entry prices, with the
 * cap rates to match. Well-documented public data (Cuyahoga County
 * assessor + Cleveland Housing Network + Federal Reserve regional
 * reports) so we can write defensible content.
 *
 * Targets: "cleveland rental property analysis", "cleveland cap rate",
 * "cleveland rental property calculator", "cleveland investment property",
 * "cleveland BRRRR".
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Calculator, MapPin } from "lucide-react";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { CityStrategyGuides } from "@/components/marketing/city-strategy-guides";
import { SourceMethodologyBox } from "@/components/marketing/source-methodology-box";
import { getCapRateBenchmark } from "@/lib/market-benchmarks";
import { marketStrategyFit } from "@/lib/market-strategy-fit";
import { getSiteUrl } from "@/lib/site-url";

const CITY = "Cleveland";
const STATE = "OH";
const SLUG = "cleveland";
const TITLE = "Cleveland Rental Market Analysis 2026 — Cap Rates";
const DESCRIPTION =
  "Neighborhood cap-rate ranges + why Cleveland is a top US BRRRR market in 2026. Run a Cleveland rental in 60 seconds — OH tax and HUD rent auto-filled.";
const PUBLISHED_AT = "2026-05-24";
const MODIFIED_AT = "2026-06-01";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "cleveland rental property analysis",
    "cleveland cap rate",
    "cleveland rental property calculator",
    "cleveland investment property",
    "cleveland brrrr",
    "cleveland real estate calculator",
    "ohio rental property",
  ],
  alternates: { canonical: `/markets/${SLUG}` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `/markets/${SLUG}`,
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: `TrueCap ${CITY} rental analysis` }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const NEIGHBORHOODS: { name: string; capRange: string; rentRange: string; notes: string }[] = [
  { name: "Downtown / Ohio City / Tremont", capRange: "5-7%", rentRange: "$1,200-1,900", notes: "Gentrifying, appreciation-leaning, condo + new-construction mix" },
  { name: "Detroit-Shoreway / Edgewater", capRange: "6-8%", rentRange: "$1,100-1,600", notes: "Stable cash flow, lake-adjacent, working through gentrification phases" },
  { name: "Cleveland Heights / University Heights", capRange: "6-8%", rentRange: "$1,300-1,900", notes: "Inner-ring suburbs, good schools, mostly older single-family + small multi" },
  { name: "Slavic Village / Union-Miles", capRange: "10-14%", rentRange: "$700-1,100", notes: "Classic Cleveland BRRRR territory — low entry, high cap, heavy due diligence" },
  { name: "Old Brooklyn / Brooklyn Centre", capRange: "8-11%", rentRange: "$900-1,300", notes: "Solid cash-flow neighborhoods, blue-collar tenant base" },
  { name: "Lakewood (suburb)", capRange: "5-7%", rentRange: "$1,200-1,800", notes: "Most desirable Cleveland 'burb; appreciation play with stable rent" },
  { name: "East Side blocks (Hough, Glenville, Mt. Pleasant)", capRange: "12%+", rentRange: "$650-1,000", notes: "Highest cap territory; significant capex + vacancy risk; deep tenant-quality scrutiny needed" },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "What's a typical cap rate in Cleveland?",
    a: "Cleveland cap rates in 2026 span the widest range of any major U.S. market — 5-7% in gentrified Downtown / Ohio City / Tremont, 6-8% in stable inner-ring suburbs (Cleveland Heights, Lakewood), 8-11% in working-class neighborhoods (Old Brooklyn, parts of West Side), and 10-14%+ in classic BRRRR territory (Slavic Village, Union-Miles, parts of East Side). The high-cap east-side blocks come with real capex + vacancy risk — they're not free money.",
  },
  {
    q: "What's the property tax rate in Cleveland?",
    a: "Ohio property tax effective rate is roughly 1.4% of market value, varying by county and school district. Cuyahoga County (Cleveland metro) tends to land at the high end of that range — closer to 1.5-1.8% effective for properties in Cleveland-municipality school districts. TrueCap auto-fills the Ohio state rate; confirm with the Cuyahoga County Fiscal Officer for the specific property's actual tax bill.",
  },
  {
    q: "Is Cleveland really a good BRRRR market?",
    a: "Yes — and arguably the best in the US in 2026 for first-time BRRRR investors. The math works: distressed single-family + 2-4 unit properties in transitioning neighborhoods sell at $40-90k, need $25-50k of rehab, and post-rehab ARVs land $120-180k. Refi at 75% of ARV pulls most or all of the cash back out. Caveats: tenant turnover can be high in cash-flow neighborhoods, capex is real on 100-year-old housing stock, and lead-paint compliance adds initial cost.",
  },
  {
    q: "What's the best Cleveland neighborhood for cash flow?",
    a: "Old Brooklyn, Brooklyn Centre, and West Park (West Side neighborhoods) consistently produce 8-10% cap rates with manageable tenant quality + property condition. East side high-cap neighborhoods produce higher headline numbers but with real operational complexity. For first-time out-of-state investors, West Side cash-flow neighborhoods are the lower-risk path.",
  },
  {
    q: "Does Cleveland appreciate, or is it strictly a cash-flow market?",
    a: "Both, depending on neighborhood. Cleveland MSA averaged ~3% annual appreciation over the last decade — comparable to the U.S. average. Gentrifying neighborhoods (Ohio City, Tremont, Detroit-Shoreway) have outpaced that at 5-7%. Cash-flow neighborhoods have generally appreciated 1-3%, with appreciation concentrated in the few years immediately following neighborhood transition. Don't underwrite a cash-flow purchase on appreciation thesis alone.",
  },
  {
    q: "What about out-of-state investing in Cleveland?",
    a: "Cleveland is the #1 or #2 market by out-of-state investor volume year after year. Pros: low entry price + high cap rates make 'cash-flow per dollar' very attractive. Cons: managing 100+ year old housing stock remotely is genuinely hard; bad property managers compound problems. The investors who win in Cleveland from out-of-state either (a) own enough doors to negotiate priority service with a great PM, or (b) build local relationships before scaling. Don't buy 5 distressed houses sight-unseen on day one.",
  },
];

export default function ClevelandMarketPage() {
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/markets/${SLUG}`;
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "TrueCap", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: "Markets", item: `${siteUrl}/markets` },
      { "@type": "ListItem", position: 3, name: CITY, item: canonicalUrl },
    ],
  };

  // Strategy-fit badge — a label over the market's median cap rate.
  const benchmark = getCapRateBenchmark("Cleveland, OH");
  const fit = benchmark ? marketStrategyFit(benchmark.median) : null;
  const fitToneClass =
    fit?.tone === "cashflow"
      ? "bg-[var(--brand-green-light)] text-[var(--brand-green)]"
      : fit?.tone === "appreciation"
        ? "bg-[var(--brand-blue-light)] text-primary"
        : "bg-muted text-foreground";

  const ld = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonicalUrl}#page`,
    name: TITLE,
    description: DESCRIPTION,
    url: canonicalUrl,
    datePublished: PUBLISHED_AT,
    dateModified: MODIFIED_AT,
    inLanguage: "en-US",
    isPartOf: { "@id": `${siteUrl}/#website` },
    about: {
      "@type": "Place",
      name: `${CITY}, ${STATE}`,
      address: {
        "@type": "PostalAddress",
        addressLocality: CITY,
        addressRegion: STATE,
        addressCountry: "US",
      },
    },
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <main id="main" className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-2">
          <Link href="/" className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground">
            ← TrueCap
          </Link>
        </div>

        <header className="mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary mb-4">
            <MapPin className="size-3" />
            Markets · {CITY}, {STATE}
          </div>
          {fit && (
            <div className="mb-4">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold ${fitToneClass}`}
                title={fit.blurb}
              >
                {fit.label}
              </span>
            </div>
          )}
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight tracking-tight text-balance">
            {CITY} rental property analysis — calculator + 2026 cap-rate benchmarks
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Run a Cleveland rental in 60 seconds. TrueCap auto-fills
            the <Link href="/states/ohio" className="font-semibold text-primary hover:underline">Ohio property tax rate</Link>, HUD market rent for Cuyahoga +
            surrounding counties, and current 30-yr fixed mortgage
            rate. Plus 2026 <Link href="/glossary/cap-rate" className="font-semibold text-primary hover:underline">cap-rate</Link> benchmarks by neighborhood + why
            Cleveland is arguably the top US BRRRR market in 2026.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="group inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(0,112,196,0.28)] transition-transform hover:-translate-y-0.5"
            >
              <Calculator className="size-4" />
              Analyze a Cleveland deal — free
              <ArrowUpRight className="size-4" />
            </Link>
            <Link
              href="/tools/brrrr-calculator"
              className="inline-flex h-12 items-center gap-1.5 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              BRRRR calculator
            </Link>
          </div>
        </header>

        <article className="prose prose-slate max-w-none [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground [&_li]:leading-relaxed [&_strong]:text-foreground">

          <h2 className="text-2xl sm:text-3xl">Cleveland cap rate benchmarks by neighborhood</h2>
          <p>
            Cleveland has the widest cap-rate spread of any major U.S.
            metro — you can find 5% cap deals in Tremont and 12% cap
            deals in Slavic Village in the same day. The wide spread
            reflects real underlying differences in tenant quality,
            property condition, and <Link href="/glossary/appreciation-rate" className="font-semibold text-primary hover:underline">appreciation</Link> thesis. Pick the wrong
            neighborhood for your risk tolerance and you&apos;re
            fighting issues you didn&apos;t underwrite for.
          </p>

          <div className="not-prose mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left p-3 font-bold text-foreground">Neighborhood</th>
                  <th className="text-left p-3 font-bold text-foreground">Typical cap</th>
                  <th className="text-left p-3 font-bold text-foreground">Rent range</th>
                  <th className="text-left p-3 font-bold text-foreground">Notes</th>
                </tr>
              </thead>
              <tbody className="[&_td]:p-3 [&_td]:border-b [&_td]:border-border [&_tr:last-child_td]:border-0">
                {NEIGHBORHOODS.map((n) => (
                  <tr key={n.name}>
                    <td className="font-semibold text-foreground">{n.name}</td>
                    <td className="text-foreground tabular-nums">{n.capRange}</td>
                    <td className="text-muted-foreground tabular-nums">{n.rentRange}</td>
                    <td className="text-muted-foreground">{n.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            <em>2026 estimates from MLS-derived medians + Cuyahoga
            County Fiscal Officer assessment data + Federal Reserve
            Bank of Cleveland regional reports. Single-neighborhood
            ranges can vary substantially — orient, then verify with
            local comps.</em>
          </p>

          <h2 className="text-2xl sm:text-3xl">Why Cleveland is the top US BRRRR market in 2026</h2>
          <p>
            The classic BRRRR math — buy distressed, rehab, rent,
            refinance at 75% of ARV — works in Cleveland more reliably
            than almost anywhere else. The reason: an unusual abundance
            of $40-90k single-family + 2-4 unit properties in
            transitioning neighborhoods, with realistic post-rehab
            ARVs in the $120-180k range after $25-50k of work. Refi at
            75% of $150k ARV = $112.5k, vs. an all-in cost of maybe
            $90-130k. The spread funds the &ldquo;infinite return&rdquo; outcome.
          </p>
          <p>
            <strong>Best Cleveland BRRRR neighborhoods in 2026:</strong> Detroit-Shoreway, Old Brooklyn (West Side options with manageable risk); Slavic Village, Brooklyn Centre, Buckeye-Shaker (East Side options with higher cap but more operational complexity). Avoid blocks with active arson/abandonment patterns or aggressive code-enforcement campaigns — the rehab math works, but the post-rehab rent + appreciation thesis breaks.
          </p>

          <h2 className="text-2xl sm:text-3xl">Cleveland-specific underwriting notes</h2>

          <h3>Property tax: 1.4-1.8% effective, school district matters</h3>
          <p>
            Ohio <Link href="/glossary/property-tax" className="font-semibold text-primary hover:underline">property tax</Link> is set at the county + school district
            level. Cuyahoga County combined rates in Cleveland Municipal
            School District (most of the city) effective out to ~1.5-1.8%
            of market value. Inner-ring suburbs (Lakewood, Cleveland
            Heights, University Heights) often have similar or higher
            rates but better schools (which supports rent + appreciation).
            Verify the actual rate for the address via the Cuyahoga
            County Fiscal Officer&apos;s site.
          </p>

          <h3>Lead paint compliance + rental registration</h3>
          <p>
            Cleveland requires Lead Safe Certification for all rental
            units. Properties built before 1978 (most Cleveland housing
            stock) need certification before being rented. Cost ranges
            from $200-600 for compliance + certification depending on
            inspection findings. Annual rental registration (~$70/unit)
            is also required. Real but manageable operational friction.
          </p>

          <h3>Heating + winterization costs</h3>
          <p>
            Cleveland winters are real. Properties need functional heat,
            insulation, and pipe protection. Budget ~$2,500-5,000 in
            initial winterization work on neglected properties. Also
            budget higher Q1 utility expenses if you cover any tenant
            utilities — winter gas bills in older buildings can run
            $300-500/month.
          </p>

          <h3>Tenant quality + screening</h3>
          <p>
            Cleveland&apos;s rental market is tenant-rich at all price
            points. Aggressive tenant screening (income 3x rent, no
            recent evictions, prior landlord references) is critical in
            high-cap neighborhoods where the headline numbers look great
            but tenant turnover can destroy the math. Pay a property
            manager who actually screens; the 8-10% PM fee is the best
            money you spend.
          </p>

          <h2 className="text-2xl sm:text-3xl">FAQ</h2>
          {FAQS.map((f, i) => (
            <details key={i} className="not-prose bg-card border border-border rounded-xl p-4 sm:p-5 mb-3">
              <summary className="cursor-pointer font-bold text-foreground">
                {f.q}
              </summary>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {f.a}
              </p>
            </details>
          ))}
        </article>

        <section className="mt-10 rounded-2xl bg-primary text-primary-foreground p-6 sm:p-8 text-center">
          <h2 className="text-xl sm:text-2xl font-extrabold mb-2">
            Run your Cleveland deal in 60 seconds.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-4">
            Paste a Cleveland address and TrueCap auto-fills the Ohio
            property tax rate, HUD market rent for Cuyahoga County +
            bedroom count, and current mortgage rates.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity"
          >
            <Calculator className="w-4 h-4" />
            Open TrueCap
          </Link>
        </section>

        <SourceMethodologyBox
          className="mt-10"
          sources={["HUD Fair Market Rent", "FRED 30-yr mortgage rate", "Tax Foundation (property tax)"]}
          updated="June 2026"
        />

        <footer className="mt-12 pt-8 border-t border-border text-sm text-muted-foreground leading-relaxed">
          More markets:{" "}
          <Link href="/markets/philadelphia" className="font-bold text-foreground hover:underline">Philadelphia →</Link>
        </footer>

        {/* City strategy guides — the crawl path down to this city's
            /markets/<city>/<strategy> combo pages. Shared with the
            dynamic /markets/[city] route; renders nothing if this city
            has no combos. */}
        <CityStrategyGuides citySlug={SLUG} cityName={CITY} />

      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
