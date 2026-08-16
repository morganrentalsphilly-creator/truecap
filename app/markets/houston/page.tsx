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
import { CityStrategyGuides } from "@/components/marketing/city-strategy-guides";
import { SourceMethodologyBox } from "@/components/marketing/source-methodology-box";
import { getCapRateBenchmark } from "@/lib/market-benchmarks";
import { marketStrategyFit } from "@/lib/market-strategy-fit";
import { getSiteUrl } from "@/lib/site-url";

const CITY = "Houston";
const STATE = "TX";
const SLUG = "houston";
const TITLE = "Houston Rental Market Analysis 2026 — Cap Rates";
const DESCRIPTION =
  "Houston rental screening benchmarks with editable tax and HUD area-rent inputs. Verify flood, insurance, rent, and legal assumptions for the property.";
const PUBLISHED_AT = "2026-05-24";
const MODIFIED_AT = "2026-08-15";

export const metadata: Metadata = {
  title: TITLE,
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
    a: "Texas relies heavily on local property taxes, and a Houston-area bill can vary by parcel, school district, city, exemptions, and MUD (Municipal Utility District) levies. Broad metro ranges are only screening assumptions. A missing or understated parcel bill overstates NOI and cap rate, so verify the current appraisal-district record and taxing units before underwriting.",
  },
  {
    q: "Does no state income tax matter for rental property investors?",
    a: "It can, but the impact is taxpayer-specific rather than a fixed cash-flow lift. Texas does not levy an individual state income tax. A resident of another state may still have filing or tax obligations under that state's rules, while entity structure, passive-loss limits, credits, and sale timing can change the comparison. Model the parcel's full property-tax burden separately and ask a tax professional to compare the state-income-tax scenarios for your residency and ownership structure.",
  },
  {
    q: "What about hurricane / flood risk in Houston?",
    a: "Flood and wind exposure can materially change the deal, but a citywide premium range is not a quote. Review current flood maps plus prior-loss, drainage, elevation, roof, and property-condition evidence; obtain subject-property insurance and flood-coverage quotes with limits, deductibles, and exclusions before relying on the cash flow.",
  },
  {
    q: "How should I model Houston landlord-tenant risk?",
    a: "Do not convert a state label into a fixed eviction timeline, vacancy rate, or bad-debt allowance. Procedure and timing depend on the lease, notices, facts, court, defenses, appeals, and current law. Use property and manager history for operating assumptions and current official guidance or qualified local counsel for legal procedure.",
  },
  {
    q: "How does the energy sector affect Houston real estate?",
    a: "Energy is no longer the dominant Houston employer (medical, aerospace, port logistics, and tech now match it) but it still drives meaningful Class A apartment + single-family demand. When oil prices crash (2015-16, 2020), Class A rents soften and high-end intown SFR appreciation pauses. Cash-flow neighborhoods (Sharpstown, Alief) are less correlated because the tenant base is less oil-dependent. Worth knowing when you're underwriting an Energy Corridor or Galleria SFR vs a Sharpstown duplex.",
  },
];

export default function HoustonMarketPage() {
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
  const benchmark = getCapRateBenchmark("Houston, TX");
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
              className="group inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(0,112,196,0.28)] transition-transform hover:-translate-y-0.5"
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

          <h2 className="text-2xl sm:text-3xl">Houston <Link href="/glossary/cap-rate" className="font-semibold text-primary hover:underline">cap rate</Link> benchmarks by submarket</h2>
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

          <h3><Link href="/glossary/property-tax" className="font-semibold text-primary hover:underline">Property tax</Link>: 1.8-2.5% effective (the highest of any major US metro)</h3>
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

          <h3>No individual state income tax — a taxpayer-specific consideration</h3>
          <p>
            <Link href="/states/texas" className="font-semibold text-primary hover:underline">Texas</Link> does not levy an individual state income tax,
            but that fact alone does not establish an after-tax return.
            Residency, entity structure, passive-loss rules, other-state
            filing rules, and the eventual sale all affect the result.
            Treat state income tax as a scenario to verify with a tax
            professional, not as a fixed underwriting premium.
          </p>

          <h3>FEMA flood zone status changes the deal</h3>
          <p>
            Flood maps are a starting point, not a complete risk or cost
            estimate. Review the property&apos;s current map status, prior
            losses, drainage and elevation evidence, then obtain
            subject-property flood and hazard quotes before underwriting.
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

          <h3>Verify landlord-tenant procedure and operating history</h3>
          <p>
            Do not assign a fixed legal timeline, <Link href="/glossary/vacancy" className="font-semibold text-primary hover:underline">vacancy</Link>,
            or bad-debt rate from a &quot;landlord-friendly&quot; label. Use the
            property&apos;s collections and turnover history, manager
            records, lease terms, and explicit downside cases. Confirm
            current procedure with official local guidance or qualified
            counsel.
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

        <SourceMethodologyBox
          className="mt-10"
          sources={["HUD Fair Market Rent", "FRED 30-yr mortgage rate", "Tax Foundation (property tax)"]}
          updated="June 2026"
        />

        <footer className="mt-12 pt-8 border-t border-border text-sm text-muted-foreground leading-relaxed">
          More markets:{" "}
          <Link href="/markets/philadelphia" className="font-bold text-foreground hover:underline">Philadelphia →</Link>{" "}
          ·{" "}
          <Link href="/markets/cleveland" className="font-bold text-foreground hover:underline">Cleveland →</Link>{" "}
          ·{" "}
          <Link href="/markets/atlanta" className="font-bold text-foreground hover:underline">Atlanta →</Link>
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
