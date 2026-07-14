/**
 * /markets/tampa — Tampa, FL rental market landing page.
 *
 * Florida is no-state-income-tax which materially affects after-tax
 * cash flow. Tampa specifically has been one of the top US population-
 * growth + appreciation markets. The wild card is property insurance
 * (post-Ian + ongoing carrier exits) which can swing a deal materially.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Calculator, MapPin } from "lucide-react";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SourceMethodologyBox } from "@/components/marketing/source-methodology-box";
import { getCapRateBenchmark } from "@/lib/market-benchmarks";
import { marketStrategyFit } from "@/lib/market-strategy-fit";
import { getSiteUrl } from "@/lib/site-url";

const CITY = "Tampa";
const STATE = "FL";
const SLUG = "tampa";
const TITLE = "Tampa Rental Market Analysis 2026 — Cap Rates";
const DESCRIPTION =
  "Neighborhood cap-rate ranges + the Tampa insurance picture for 2026. Run a Tampa rental in 60 seconds — FL tax and HUD rent auto-filled.";
const PUBLISHED_AT = "2026-05-24";
const MODIFIED_AT = "2026-06-01";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "tampa rental property analysis",
    "tampa cap rate",
    "tampa rental property calculator",
    "tampa investment property",
    "florida rental property",
    "tampa real estate calculator",
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
  { name: "South Tampa / Hyde Park / Davis Islands", capRange: "3-5%", rentRange: "$2,200-3,800", notes: "Premium appreciation play; low cap, low vacancy, high entry price" },
  { name: "Seminole Heights / Tampa Heights", capRange: "5-7%", rentRange: "$1,600-2,400", notes: "Gentrified inner-city, balanced appreciation + cash flow" },
  { name: "West Tampa / Town N Country", capRange: "6-8%", rentRange: "$1,400-2,000", notes: "Solid cash-flow neighborhoods, working-class tenant base" },
  { name: "USF area / North Tampa", capRange: "6-8%", rentRange: "$1,300-1,900", notes: "Student + workforce rentals near University of South Florida" },
  { name: "Brandon / Riverview (eastern suburbs)", capRange: "5-7%", rentRange: "$1,700-2,400", notes: "Family suburbs, newer construction, lower insurance risk inland" },
  { name: "St. Petersburg (Pinellas County)", capRange: "4-6%", rentRange: "$1,800-2,800", notes: "Strong appreciation, urban revival, beach access premium" },
  { name: "East Tampa / Sulphur Springs", capRange: "8-11%", rentRange: "$1,100-1,500", notes: "Higher cap, real tenant + property risk; deep due diligence required" },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "What's a typical cap rate in Tampa?",
    a: "Tampa cap rates in 2026 range from 3-5% in premium South Tampa neighborhoods (Hyde Park, Davis Islands) to 8-11% in East Tampa / Sulphur Springs. Most working-investor deals land in the 5-7% range across Seminole Heights, West Tampa, Brandon, and Riverview. The compression vs Midwest markets reflects Tampa's strong appreciation tailwind — cap-rate buyers in Tampa are paying for population growth as much as for current yield.",
  },
  {
    q: "What's the property tax rate in Tampa?",
    a: "Florida's effective property tax rate sits around 0.8-0.9% statewide, with Hillsborough County (Tampa) typically 0.95-1.05% of market value depending on millage. The Save Our Homes amendment caps assessed-value growth for primary residences at 3%/yr, but rentals reset to market value at each sale — so the next owner pays more even on the same property. TrueCap auto-fills the FL state rate; confirm with the Hillsborough Property Appraiser for the specific parcel.",
  },
  {
    q: "How bad is the Tampa property insurance situation in 2026?",
    a: "Real. Florida property insurance has been the biggest underwriting story of the last 3 years. Citizens (the state insurer of last resort) now writes a meaningful share of policies; private carriers continue to exit or restrict new business. For an investment property in Tampa, budget $2,500-4,500/yr on a typical single-family in non-flood-zone neighborhoods, materially higher near the coast or in flood zones. Always get a binding insurance quote BEFORE you commit — the rate you see online for the seller's policy is not the rate you'll get as a new buyer.",
  },
  {
    q: "Does the lack of state income tax help my Tampa rental's after-tax cash flow?",
    a: "Yes, meaningfully. Florida has no state income tax, so rental income (and capital gains on sale) is only federally taxed. For an investor in the 24-32% federal bracket, this can mean a 5-7% after-tax cash-flow improvement vs. an equivalent deal in a high-tax state. TrueCap's Tax Strategy tab models federal tax only — you don't need to deduct a state line, which already reflects FL reality.",
  },
  {
    q: "Are Tampa STRs (short-term rentals / Airbnb) still a good play?",
    a: "Mixed. Beach-adjacent markets (Indian Rocks, Clearwater, St. Pete Beach) still produce strong STR economics for well-positioned properties, but most City of Tampa proper neighborhoods either prohibit STRs or require expensive permits + restrictions. Hillsborough County unincorporated has more permissive rules but lower nightly rates. Underwrite STR strategy with a hyper-local lens — sometimes a property 0.5 miles makes a 30-day-minimum difference.",
  },
  {
    q: "What about hurricane risk?",
    a: "Real and risk-rated by insurance. Tampa Bay proper has not taken a direct major-hurricane hit in over 100 years (statistically anomalous; arguably overdue). Properties in evacuation zones A/B carry higher insurance premiums but also higher renter demand for coastal proximity. Inland Hillsborough properties (Brandon, Riverview, Plant City) have lower insurance + flood exposure. Always check FEMA flood maps for the specific parcel — flood is NOT covered by standard property insurance.",
  },
];

export default function TampaMarketPage() {
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
  const benchmark = getCapRateBenchmark("Tampa, FL");
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
      <main id="main" className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-2">
          <Link href="/" className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground">
            ← TrueCap
          </Link>
        </div>

        <header className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary mb-3">
            <MapPin className="size-3" />
            {CITY}, {STATE}
          </div>
          {fit && (
            <div className="mb-3">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold ${fitToneClass}`}
                title={fit.blurb}
              >
                {fit.label}
              </span>
            </div>
          )}
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight tracking-tight">
            {CITY} rental property analysis — calculator + 2026 cap-rate benchmarks
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Run a Tampa rental deal in 60 seconds with TrueCap. Address
            auto-fills{" "}
            <Link href="/states/florida" className="font-semibold text-primary hover:underline">Florida</Link>{" "}
            <Link href="/glossary/property-tax" className="font-semibold text-primary hover:underline">property tax</Link>{" "}
            (~0.95-1.05%), HUD rent for
            Hillsborough + Pinellas counties, and current FRED mortgage rates.
            Below: neighborhood-by-neighborhood cap rates and the insurance
            picture for 2026.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
            >
              <Calculator className="size-4" />
              Underwrite a Tampa deal — free
            </Link>
          </div>
        </header>

        <section className="mb-10">
          <h2 className="text-2xl font-extrabold text-foreground mb-3">
            Tampa neighborhood cap-rate map (2026)
          </h2>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            Ranges below reflect typical conventional-financing single-family +
            small-multi deals in each submarket. Rent ranges are gross monthly.
            Premium neighborhoods compress to 3-5% (appreciation-driven); high-
            cap east-side blocks earn 8-11%+ but carry real operational risk.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Submarket</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cap rate</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Rent</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Character</th>
                </tr>
              </thead>
              <tbody>
                {NEIGHBORHOODS.map((n) => (
                  <tr key={n.name} className="border-t border-border align-top">
                    <td className="py-3 px-3 text-sm font-semibold text-foreground">{n.name}</td>
                    <td className="py-3 px-3 text-sm tabular-nums text-foreground">{n.capRange}</td>
                    <td className="py-3 px-3 text-sm tabular-nums text-muted-foreground">{n.rentRange}</td>
                    <td className="py-3 px-3 text-xs leading-relaxed text-muted-foreground">{n.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-10 rounded-2xl border border-[var(--brand-orange)]/25 bg-[var(--brand-orange-light)] p-5 sm:p-6">
          <h2 className="text-base font-extrabold uppercase tracking-widest text-[var(--brand-orange)] mb-2">
            The Tampa insurance reality check
          </h2>
          <p className="text-sm leading-relaxed text-foreground">
            Property insurance is the biggest single underwriting variable in
            Florida right now. Standard rule of thumb in 2026: budget
            $2,500–$4,500/yr for a typical inland Tampa single-family,
            materially higher near the coast or in flood zones. Insurance can
            single-handedly turn a 7% cap into a 5% cap. Always pull a binding
            quote from a Florida-active carrier BEFORE committing — the
            seller&apos;s old policy is not what you&apos;ll pay.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-extrabold text-foreground mb-4">
            Frequently asked — Tampa investing
          </h2>
          <div className="space-y-4">
            {FAQS.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-border bg-card p-4">
                <summary className="cursor-pointer text-sm font-bold text-foreground select-none list-none flex items-center justify-between gap-3">
                  <span>{f.q}</span>
                  <span aria-hidden className="text-muted-foreground transition-transform group-open:rotate-90">▸</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mb-10 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-xl sm:text-2xl font-extrabold mb-2">
            Run your next Tampa deal in 60 seconds
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-4 max-w-2xl">
            Paste the address. Florida tax, HUD rent for the right county, and
            current rate auto-fill.{" "}
            <Link href="/glossary/cap-rate" className="font-semibold text-primary hover:underline">Cap rate</Link>,
            CoC,{" "}
            <Link href="/glossary/dscr" className="font-semibold text-primary hover:underline">DSCR</Link>,
            and monthly cash flow
            in 1 second. Free to start. No card required.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity"
          >
            Open the analyzer
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </section>

        <SourceMethodologyBox
          className="mt-10"
          sources={["HUD Fair Market Rent", "FRED 30-yr mortgage rate", "Tax Foundation (property tax)"]}
          updated="June 2026"
        />

        <footer className="border-t border-border pt-6 text-sm text-muted-foreground leading-relaxed">
          Other US markets covered:{" "}
          <Link href="/markets/philadelphia" className="font-bold text-foreground hover:underline">Philadelphia</Link>{" "}·{" "}
          <Link href="/markets/cleveland" className="font-bold text-foreground hover:underline">Cleveland</Link>{" "}·{" "}
          <Link href="/markets/atlanta" className="font-bold text-foreground hover:underline">Atlanta</Link>{" "}·{" "}
          <Link href="/markets/houston" className="font-bold text-foreground hover:underline">Houston</Link>{" "}·{" "}
          <Link href="/markets/charlotte" className="font-bold text-foreground hover:underline">Charlotte</Link>{" "}·{" "}
          <Link href="/markets/indianapolis" className="font-bold text-foreground hover:underline">Indianapolis</Link>{" "}·{" "}
          <Link href="/markets/kansas-city" className="font-bold text-foreground hover:underline">Kansas City</Link>{" "}·{" "}
          <Link href="/markets/dallas" className="font-bold text-foreground hover:underline">Dallas</Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
