/**
 * /markets/houston — Houston, TX rental market landing page.
 *
 * Third angle (after Philly's gentrifying-rowhomes + Cleveland's BRRRR
 * + Atlanta's appreciation): Houston is the no-state-income-tax,
 * energy-economy-volatile, high-property-tax-but-no-zoning Sun Belt
 * giant. Content emphasis on the TX-specific structural factors
 * (high property tax, no state income tax, landlord-friendly law,
 * no zoning).
 *
 * Targets: "houston rental property analysis", "houston cap rate",
 * "houston rental property calculator", "houston investment property",
 * "houston real estate calculator".
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Calculator, MapPin } from "lucide-react";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";

const CITY = "Houston";
const STATE = "TX";
const SLUG = "houston";
const TITLE = "Houston rental property analysis — calculator + 2026 cap-rate benchmarks";
const DESCRIPTION =
  "Run a Houston rental in 60 seconds. Auto-fills TX effective property tax (~1.8% — highest of any major US metro), HUD rent by Harris County, and current mortgage rates. Plus the no-state-income-tax + landlord-friendly trade-offs that make Houston a distinctive Sun Belt play.";
const PUBLISHED_AT = "2026-05-24";
const MODIFIED_AT = "2026-06-01";

export const metadata: Metadata = {
  title: `${TITLE} | TrueCap`,
  description: DESCRIPTION,
  keywords: [
    "houston rental property analysis",
    "houston cap rate",
    "houston rental property calculator",
    "houston investment property",
    "houston real estate calculator",
    "texas rental property",
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
  { name: "Inner Loop (Montrose, Heights, Rice Military)", capRange: "4-6%", rentRange: "$1,800-3,200", notes: "Premium intown; appreciation + walkability premium" },
  { name: "EaDo / East Downtown", capRange: "5-7%", rentRange: "$1,600-2,500", notes: "Recently transitioned, mixed-use development; strong recent appreciation" },
  { name: "Third Ward / Midtown", capRange: "5-7%", rentRange: "$1,400-2,300", notes: "Mid-gentrification; near downtown + universities" },
  { name: "Garden Oaks / Oak Forest", capRange: "5-6%", rentRange: "$1,800-2,800", notes: "Established inner-ring SFR market; family demand drives rent" },
  { name: "Spring Branch", capRange: "6-8%", rentRange: "$1,400-2,200", notes: "Mid-cycle gentrification with school district variability" },
  { name: "Sharpstown / Alief / Gulfton", capRange: "8-10%", rentRange: "$1,000-1,500", notes: "Cash-flow plays; diverse renter base, property-condition diligence matters" },
  { name: "Sugar Land / Katy / Cypress (suburbs)", capRange: "5-7%", rentRange: "$1,800-2,800", notes: "Master-planned suburbs; strong schools premium, slower appreciation than inner loop" },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "What's a typical cap rate in Houston?",
    a: "Houston cap rates in 2026 run from 4-6% inside the Loop (Heights, Montrose, Rice Military) to 5-7% in mid-cycle neighborhoods (EaDo, Spring Branch, Third Ward) to 8-10% in cash-flow neighborhoods (Sharpstown, Alief, parts of Gulfton). Metro median for single-family rentals is roughly 5.5-6.5%. Houston cap rates tend to be slightly HIGHER than other major Sun Belt metros (Atlanta, Phoenix) because the high property tax + occasional energy-sector pullback get baked into pricing.",
  },
  {
    q: "Why is Texas property tax so high?",
    a: "Texas has no state income tax — the budget shortfall is filled by some of the highest property tax rates in the U.S. Harris County (Houston) effective rate runs 2.0-2.3% of market value once you include school district + MUD (Municipal Utility District) levies. Sugar Land, Katy, and other master-planned suburbs often hit 2.3-2.8% effective because of higher MUD rates. This is the single biggest reason Houston cap rates look attractive on paper but compress after tax — always include the full effective rate when underwriting.",
  },
  {
    q: "Does no state income tax matter for rental property investors?",
    a: "Significantly, for in-state residents. Your rental income gets federal tax + depreciation deduction treatment same as any state — but Texas residency means you don't pay GA / CA / NY-style state income tax on the rental income. For out-of-state investors, this matters less (you pay your home state's income tax on rental income regardless of where the property is). For in-state Texas residents, expect ~3-7% higher after-tax cash flow vs the same deal in a state-income-tax state.",
  },
  {
    q: "What about hurricane / flood risk in Houston?",
    a: "Real and material. Post-Harvey (2017), insurance rates in Houston have risen 40-100% in many areas. Flood insurance for properties in or near FEMA flood zones can run $2,000-6,000/year — easily enough to flip a cash-flow deal negative. Always pull the FEMA flood map for the specific address (msc.fema.gov) before underwriting. Properties OUTSIDE the 500-year floodplain in Houston have meaningfully different insurance economics than properties inside it.",
  },
  {
    q: "Is Houston landlord-friendly?",
    a: "Texas is one of the most landlord-friendly states in the U.S. for evictions. From notice-to-vacate to lockout typically runs 21-45 days uncontested. No state-level rent control. Lease enforcement is reliable. This materially affects underwriting: vacancy assumption can be lower than in tenant-friendly markets, bad-debt allowance is smaller. Houston specifically has streamlined Justice of the Peace courts that move evictions efficiently.",
  },
  {
    q: "How does the energy sector affect Houston real estate?",
    a: "Energy is no longer the dominant Houston employer (medical, aerospace, port logistics, and tech now match it) but it still drives meaningful Class A apartment + single-family demand. When oil prices crash (2015-16, 2020), Class A rents soften and high-end intown SFR appreciation pauses. Cash-flow neighborhoods (Sharpstown, Alief) are less correlated because the tenant base is less oil-dependent. Worth knowing when you're underwriting an Energy Corridor or Galleria SFR vs a Sharpstown duplex.",
  },
];

export default function HoustonMarketPage() {
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
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight tracking-tight text-balance">
            {CITY} rental property analysis — calculator + 2026 cap-rate benchmarks
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Houston is the most distinctive of the big Sun Belt
            markets: no state income tax, but property tax 2x the
            national average. Run an HTX rental in 60 seconds:
            TrueCap auto-fills the TX property tax rate, HUD market
            rent for Harris County, and current mortgage rates. Below:
            cap-rate benchmarks by submarket + the TX-specific
            structural factors that change your underwriting.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="group inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(82,72,212,0.28)] transition-transform hover:-translate-y-0.5"
            >
              <Calculator className="size-4" />
              Analyze a Houston deal — free
              <ArrowUpRight className="size-4" />
            </Link>
            <Link
              href="/tools/dscr-calculator"
              className="inline-flex h-12 items-center gap-1.5 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              DSCR calculator
            </Link>
          </div>
        </header>

        <article className="prose prose-slate max-w-none [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground [&_li]:leading-relaxed [&_strong]:text-foreground">

          <h2 className="text-2xl sm:text-3xl">Houston cap rate benchmarks by submarket</h2>
          <p>
            Houston has no zoning. The submarkets are defined by
            distance from the Loop, school district, and (uniquely)
            distance from refining + petrochemical corridors. Inner
            Loop intown is appreciation + walkability premium; outer
            suburbs are family-rental cash-flow plays; cash-flow-
            heavy intown neighborhoods (Sharpstown, Alief) have
            different tenant economics than the Loop.
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
            <em>2026 estimates from HAR-derived medians + Harris
            County Appraisal District data + Greater Houston
            Partnership reports. MUD-heavy suburbs can have meaningfully
            higher effective tax rates than the city — always check.</em>
          </p>

          <h2 className="text-2xl sm:text-3xl">Houston-specific underwriting notes</h2>

          <h3>Property tax: 1.8-2.5% effective (the highest of any major US metro)</h3>
          <p>
            This is the single most-mis-modeled number in Houston
            underwriting. Harris County base + Houston ISD + city
            millage gets you to ~2.0-2.1%. Add a MUD if the property
            is in one (most suburban master-planned communities are)
            and the effective rate can hit 2.3-2.8%. The TrueCap
            default uses the state-level Texas average (~1.8%) — for
            Houston specifically, manually bump property tax %
            upward unless you know the property is in an
            unusually-low-MUD area.
          </p>

          <h3>No state income tax = real cash-flow advantage for residents</h3>
          <p>
            For Texas residents, rental income flows through to the
            federal return without state income tax on top.
            Comparable to other no-tax states (FL, NV, WA, TN, NH).
            For out-of-state investors, your home-state income tax
            still applies — the advantage only accrues to TX
            residents.
          </p>

          <h3>FEMA flood zone status changes the deal</h3>
          <p>
            Post-Harvey (2017), flood insurance for properties in or
            near FEMA-designated flood zones in Houston has gotten
            expensive. Mandatory flood insurance can run $1,500-$5,000+
            per year — easily enough to break a marginal cash-flow
            deal. Always pull the FEMA flood map for the specific
            address before locking in numbers. Outside the 500-year
            zone is meaningfully different from inside.
          </p>

          <h3>No zoning + ADU / lot-split opportunities</h3>
          <p>
            Houston has no traditional zoning code — instead, deed
            restrictions and minimum-lot-size ordinances govern
            density. This creates interesting value-add plays:
            certain lots can be legally subdivided or built up with
            an ADU, materially expanding the ARV vs. the
            single-house base case. Worth investigating with a Houston
            land-use attorney on any larger-lot deal.
          </p>

          <h3>Landlord-friendly eviction climate</h3>
          <p>
            Texas evictions move fast (21-45 days uncontested). No
            state rent control. Lease enforcement is reliable. These
            factors compress your vacancy + bad-debt assumption
            relative to tenant-friendly markets. Realistic vacancy in
            mid-tier Houston SFR rentals runs 4-6%; bad debt under
            1.5% with proper tenant screening.
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
            Run your Houston deal in 60 seconds.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-4">
            Paste a Houston address. TrueCap auto-fills tax + HUD
            rent + mortgage rate. For Houston specifically, manually
            bump the property tax % up to ~2.0-2.3% to match real
            Harris County effective rates.
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
          <Link href="/markets/cleveland" className="font-bold text-foreground hover:underline">Cleveland →</Link>{" "}
          ·{" "}
          <Link href="/markets/atlanta" className="font-bold text-foreground hover:underline">Atlanta →</Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
