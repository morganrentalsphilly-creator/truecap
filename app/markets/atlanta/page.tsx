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
import { getSiteUrl } from "@/lib/site-url";

const CITY = "Atlanta";
const STATE = "GA";
const SLUG = "atlanta";
const TITLE = "Atlanta rental property analysis — calculator + 2026 cap-rate benchmarks";
const DESCRIPTION =
  "Run an Atlanta rental in 60 seconds. Auto-fills GA effective property tax (~0.9%), HUD rent by metro county, and current mortgage rates. Plus 2026 cap-rate ranges by Atlanta submarket + why ATL is the dominant balanced-growth play in the Southeast.";
const PUBLISHED_AT = "2026-05-24";

export const metadata: Metadata = {
  title: `${TITLE} | TrueCap`,
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
    a: "Primarily appreciation, with meaningful cash flow available in the right submarkets. Atlanta metro has averaged 5-6% annual appreciation over the last decade — significantly above the U.S. average of ~3%. The Sun Belt growth story (population in-migration, corporate HQ relocations, BeltLine + transit investment) makes appreciation a more reliable bet here than in flat-population markets. For pure cash flow, smaller secondary metros like Birmingham or Memphis are better; for total return (cash flow + appreciation combined), Atlanta is hard to beat.",
  },
  {
    q: "Are there any Atlanta-specific rental regulations?",
    a: "City of Atlanta requires a business license for landlords and an annual rental inspection certificate. Cost is modest (~$50-150/yr/property). Some Atlanta suburbs (Decatur, Avondale) have stricter rental occupancy or zoning rules — check the specific municipality. Georgia is broadly a landlord-friendly state for evictions and lease enforcement, which materially affects underwriting (faster turnover recovery, lower bad-debt assumption).",
  },
  {
    q: "What about BRRRR in Atlanta?",
    a: "Possible but tougher than Cleveland or Philly because the spread between purchase + rehab and ARV is smaller. ATL distressed properties in transitioning neighborhoods (West End, Capitol View, parts of South Atlanta) sell at $120-200k with ARVs of $200-280k after $40-70k rehab. The all-in vs. 75%-of-ARV-refi math works, but tighter than the classic Midwest BRRRR setups. Atlanta BRRRR investors increasingly focus on adding ADUs or converting SFR to legal 2-units to expand the ARV spread.",
  },
  {
    q: "What about short-term rentals (Airbnb) in Atlanta?",
    a: "City of Atlanta requires a short-term rental certificate ($150/yr per property) and limits STRs in most residential zones unless owner-occupied. Suburbs vary widely. Strong STR markets in the Atlanta metro include the Krog Street + Old Fourth Ward area (event-driven), Buckhead (corporate travel), and certain near-Hartsfield corridors (airport adjacency). Underwrite STR-specific DSCR loans carefully — they assume sustained nightly rates that can drop quickly when local STR supply expands.",
  },
];

export default function AtlantaMarketPage() {
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/markets/${SLUG}`;

  const ld = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonicalUrl}#page`,
    name: TITLE,
    description: DESCRIPTION,
    url: canonicalUrl,
    datePublished: PUBLISHED_AT,
    dateModified: PUBLISHED_AT,
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
          <h1 className="text-3xl sm:text-4xl font-black text-foreground leading-tight tracking-tight text-balance">
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
              className="group inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(82,72,212,0.28)] transition-transform hover:-translate-y-0.5"
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

        <article className="prose prose-slate max-w-none [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-black [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground [&_li]:leading-relaxed [&_strong]:text-foreground">

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
            More than most markets, Atlanta forces investors to pick a
            lane. Premium intown caps in the 3-5% range only pencil if
            you believe Atlanta&apos;s growth thesis continues (which
            it has, decisively, for 25+ years). South Atlanta cash-flow
            plays at 8-11% caps look great until tenant quality + capex
            on aging stock catches you.
          </p>
          <p>
            <strong>The boring-but-correct ATL play:</strong> balanced
            submarkets at 5-7% cap rates with 3-4% expected
            appreciation, combined with principal paydown and tax
            savings. Total levered return in the 14-18% range with
            real downside protection. Grant Park, East Atlanta Village,
            parts of West End, parts of Smyrna/Marietta all fit this
            profile.
          </p>

          <h2 className="text-2xl sm:text-3xl">Atlanta-specific underwriting notes</h2>

          <h3>Property tax: 0.85-1.1% effective, county-dependent</h3>
          <p>
            Georgia property tax is set at the county level + school
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

          <h3>Landlord-friendly eviction law</h3>
          <p>
            Georgia evictions move faster than most blue states — 30-45
            days from non-payment to lockout if uncontested. This
            materially affects underwriting: assume lower vacancy
            recovery time + lower bad debt than you would in tenant-
            friendly markets like NJ or CA.
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
          <h2 className="text-xl sm:text-2xl font-black mb-2">
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

        <footer className="mt-12 pt-8 border-t border-border text-sm text-muted-foreground leading-relaxed">
          More markets:{" "}
          <Link href="/markets/philadelphia" className="font-bold text-foreground hover:underline">Philadelphia →</Link>{" "}
          ·{" "}
          <Link href="/markets/cleveland" className="font-bold text-foreground hover:underline">Cleveland →</Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
