/**
 * /markets/atlanta — Atlanta, GA rental market landing page.
 *
 * Different angle from Philly + Cleveland: Atlanta is an
 * appreciation-leaning Sun Belt growth market, not a high-cap
 * cash-flow play. Content emphasis is on the balanced cash-flow +
 * appreciation thesis and the specific submarkets where each works.
 *
 * Targets: "atlanta rental property analysis", "atlanta cap rate",
 * "atlanta rental property calculator", "atlanta investment property",
 * "atlanta real estate calculator".
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

const CITY = "Atlanta";
const STATE = "GA";
const SLUG = "atlanta";
const TITLE = "Atlanta Rental Market Analysis 2026 — Cap Rates";
const DESCRIPTION =
  "2026 cap-rate ranges by Atlanta submarket + the Southeast's balanced-growth play. Run an Atlanta rental in 60 seconds — GA tax and HUD rent auto-filled.";
const PUBLISHED_AT = "2026-05-24";
const MODIFIED_AT = "2026-08-15";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "atlanta rental property analysis",
    "atlanta cap rate",
    "atlanta rental property calculator",
    "atlanta investment property",
    "atlanta real estate calculator",
    "georgia rental property",
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
  { name: "Buckhead / Midtown", capRange: "3-5%", rentRange: "$1,800-3,500", notes: "Premium Atlanta — high-rise condos + luxury SFR; appreciation, not cash flow" },
  { name: "Inman Park / Old Fourth Ward", capRange: "4-6%", rentRange: "$1,700-2,800", notes: "Highly gentrified intown, BeltLine-adjacent, strong appreciation history" },
  { name: "Grant Park / East Atlanta Village", capRange: "5-7%", rentRange: "$1,400-2,200", notes: "Balanced — meaningful cash flow + ongoing appreciation" },
  { name: "West End / Capitol View", capRange: "6-9%", rentRange: "$1,100-1,700", notes: "Currently transitioning; cap rate + likely appreciation upside" },
  { name: "Decatur / Avondale Estates", capRange: "4-6%", rentRange: "$1,800-2,600", notes: "Inner-ring suburb appreciation play; great schools premium" },
  { name: "South Atlanta / Lakewood Heights", capRange: "8-11%", rentRange: "$900-1,400", notes: "Cash-flow heavy; significant tenant + capex scrutiny needed" },
  { name: "Smyrna / Marietta (suburbs)", capRange: "5-7%", rentRange: "$1,500-2,400", notes: "Suburban Sun Belt — steady cash flow + moderate appreciation" },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "What's a typical cap rate in Atlanta?",
    a: "Atlanta cap rates in 2026 range from 3-5% in premium intown (Buckhead, Inman Park) to 5-7% in balanced submarkets (Grant Park, East Atlanta, West End in transition) to 8-11% in cash-flow neighborhoods (parts of South Atlanta). The metro-wide median for single-family rentals is roughly 5.5-6%. Atlanta is fundamentally a balanced market — most investors target the 5-7% range and capture the meaningful appreciation upside that comes with the metro's continued growth.",
  },
  {
    q: "What's the property tax rate in Atlanta?",
    a: "Georgia's effective property tax rate is one of the lower ones in the South — roughly 0.85-0.95% of fair market value statewide. Atlanta metro varies by county: Fulton County tends to land around 1.0%, DeKalb around 1.1%, Cobb / Gwinnett (suburbs) closer to 0.8-0.9%. Homestead exemption applies to owner-occupied but doesn't help on a pure rental. TrueCap auto-fills the Georgia state effective rate; confirm with the specific county for the property's actual bill.",
  },
  {
    q: "Is Atlanta good for cash flow or appreciation?",
    a: "Atlanta is often evaluated with an appreciation thesis, but historical metro growth does not establish future rent, value, or total return for an address. Verify current rent and expenses, then compare flat, base, and downside growth scenarios rather than treating appreciation as the reliable part of the deal.",
  },
  {
    q: "Are there any Atlanta-specific rental regulations?",
    a: "Licensing, inspection, occupancy, zoning, and landlord-tenant requirements depend on the property's municipality and current law. Verify the address with official local sources or qualified counsel; do not lower vacancy, bad debt, or legal-cost assumptions solely because of a state label.",
  },
  {
    q: "What about BRRRR in Atlanta?",
    a: "Atlanta contains BRRRR candidates, but a neighborhood range does not establish purchase price, rehab, legal unit count, ARV, appraisal, or refinance proceeds. Verify the address with current closed comps, contractor bids, permits and zoning, rent support, seasoning, appraisal downside, and written lender terms.",
  },
  {
    q: "What about short-term rentals (Airbnb) in Atlanta?",
    a: "City of Atlanta requires a short-term rental certificate ($150/yr per property) and limits STRs in most residential zones unless owner-occupied. Suburbs vary widely. Strong STR markets in the Atlanta metro include the Krog Street + Old Fourth Ward area (event-driven), Buckhead (corporate travel), and certain near-Hartsfield corridors (airport adjacency). Underwrite STR-specific DSCR loans carefully — they assume sustained nightly rates that can drop quickly when local STR supply expands.",
  },
];

export default function AtlantaMarketPage() {
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
  const benchmark = getCapRateBenchmark("Atlanta, GA");
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
            Atlanta is the dominant balanced-growth play in the U.S.
            Southeast. Run an ATL rental in 60 seconds: TrueCap auto-
            fills GA effective property tax (~0.9%), HUD rent for the
            metro county, and current mortgage rates. Below: 2026
            cap-rate ranges by submarket + the appreciation-vs-cash-
            flow trade-off that defines Atlanta investing.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="group inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(0,112,196,0.28)] transition-transform hover:-translate-y-0.5"
            >
              <Calculator className="size-4" />
              Analyze an Atlanta deal — free
              <ArrowUpRight className="size-4" />
            </Link>
            <Link
              href="/blog/cash-flow-vs-appreciation"
              className="inline-flex h-12 items-center gap-1.5 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Cash flow vs appreciation
            </Link>
          </div>
        </header>

        <article className="prose prose-slate max-w-none [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground [&_li]:leading-relaxed [&_strong]:text-foreground">

          <h2 className="text-2xl sm:text-3xl">Atlanta cap rate benchmarks by submarket</h2>
          <p>
            Atlanta&apos;s investment landscape is sorted by proximity
            to the BeltLine, school district, and transition stage.
            Premium intown is appreciation-first; outer suburbs are
            cash-flow-first with growth tailwinds; transitioning intown
            (West End, parts of South Atlanta) is the hybrid sweet spot
            most experienced ATL investors target.
          </p>

          <div className="not-prose mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left p-3 font-bold text-foreground">Submarket</th>
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
            <em>2026 estimates from FMLS-derived medians + Fulton /
            DeKalb / Cobb County assessor data + Atlanta Regional
            Commission reports. Single-submarket ranges vary; orient,
            then verify.</em>
          </p>

          <h2 className="text-2xl sm:text-3xl">The appreciation-vs-cash-flow trade-off in Atlanta</h2>
          <p>
            Lower-cap-rate intown deals depend more heavily on future
            rent and value assumptions, while higher-screening-cap-rate
            properties may carry different condition, vacancy, and
            management risks. Verify both at the address level.
          </p>
          <p>
            <strong>A scenario worth testing:</strong> a balanced
            submarket screen with a supported range of{" "}
            <Link href="/glossary/cap-rate" className="font-semibold text-primary hover:underline">cap rates</Link>,
            property-specific financing, and flat, base, and downside
            rent and appreciation cases. Principal paydown and any
            taxpayer-specific tax effect should be modeled separately;
            no neighborhood range guarantees total return or downside
            protection.
          </p>

          <h2 className="text-2xl sm:text-3xl">Atlanta-specific underwriting notes</h2>

          <h3>Property tax: 0.85-1.1% effective, county-dependent</h3>
          <p>
            <Link href="/states/georgia" className="font-semibold text-primary hover:underline">Georgia</Link>{" "}
            property tax is set at the county level + school
            district + city millage. Fulton County (Atlanta proper)
            effective rate runs ~1.0-1.1%. DeKalb similar. Cobb +
            Gwinnett (suburbs) closer to 0.8-0.9%. Owner-occupied
            properties get a homestead exemption (~$30k off assessed
            value) that doesn&apos;t help a pure rental.
          </p>

          <h3>BeltLine effect</h3>
          <p>
            The Atlanta BeltLine — a 22-mile loop of former railroad
            corridor being converted to trails + transit + parks — has
            been the dominant appreciation driver for the last 15
            years. BeltLine-adjacent neighborhoods (Old Fourth Ward,
            Reynoldstown, West End) have outpaced the metro average.
            The Southside trail is the next big push; properties
            within a half-mile of completed Southside trail sections
            are worth watching.
          </p>

          <h3>Verify landlord-tenant procedure</h3>
          <p>
            Procedure and timing depend on the lease, notices, facts,
            court, defenses, appeals, municipality, and current law.
            Use property and manager history for vacancy and bad debt,
            and consult current official guidance or qualified local
            counsel instead of applying a state-level timeline.
          </p>

          <h3>Schools matter more than usual</h3>
          <p>
            Atlanta school district quality varies dramatically by
            block. APS (Atlanta Public Schools) struggles in many
            zones; surrounding counties (Cobb, Gwinnett, Forsyth) have
            stronger reputations. For SFR rentals targeting families,
            school zone is a primary driver of both rent and
            appreciation. Always check the specific elementary +
            middle school assignment, not just the city.
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
            Run your Atlanta deal in 60 seconds.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-4">
            Paste an Atlanta address — TrueCap auto-fills the GA
            property tax rate, HUD market rent for your county +
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
          <Link href="/markets/philadelphia" className="font-bold text-foreground hover:underline">Philadelphia →</Link>{" "}
          ·{" "}
          <Link href="/markets/cleveland" className="font-bold text-foreground hover:underline">Cleveland →</Link>
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
