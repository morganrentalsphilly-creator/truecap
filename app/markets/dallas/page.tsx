/**
 * /markets/dallas — Dallas-Fort Worth rental market landing page.
 *
 * Texas: no state income tax, but the highest effective property tax
 * rates in the US (1.6-2.5%+ depending on MUD / school district). DFW
 * is the largest US metro that consistently grows population +
 * employment. Cap rates compress as a result.
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

const CITY = "Dallas";
const STATE = "TX";
const SLUG = "dallas";
const TITLE = "Dallas-Fort Worth rental property analysis — calculator + 2026 cap-rate benchmarks";
const DESCRIPTION =
  "Run a Dallas rental deal in 60 seconds. Auto-fills TX property tax (1.6-2.5%+ effective), HUD rent for Dallas / Tarrant / Collin counties, current mortgage rates. Plus DFW neighborhood cap-rate ranges + the high-tax / no-income-tax trade-off.";
const PUBLISHED_AT = "2026-05-24";
const MODIFIED_AT = "2026-06-01";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "dallas rental property analysis",
    "dallas cap rate",
    "dallas rental property calculator",
    "dallas investment property",
    "dfw rentals",
    "texas rental property",
  ],
  alternates: { canonical: `/markets/${SLUG}` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `/markets/${SLUG}`, type: "website", images: [{ url: "/home.jpg", width: 1200, height: 630, alt: `TrueCap ${CITY} rental analysis` }] },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const NEIGHBORHOODS: { name: string; capRange: string; rentRange: string; notes: string }[] = [
  { name: "Uptown / Highland Park / Lakewood", capRange: "3-5%", rentRange: "$2,400-4,500", notes: "Premium core, low cap, high entry; appreciation-driven" },
  { name: "Bishop Arts / Oak Cliff (gentrifying)", capRange: "4-6%", rentRange: "$1,800-2,800", notes: "Strong appreciation tailwind, balanced cash flow" },
  { name: "East Dallas / Casa Linda / White Rock", capRange: "5-7%", rentRange: "$1,700-2,500", notes: "Established neighborhoods, family SFR" },
  { name: "South Dallas / Pleasant Grove", capRange: "8-11%", rentRange: "$1,200-1,700", notes: "Higher cap, real tenant + capex risk; deep DD" },
  { name: "Plano / Frisco / Richardson (Collin Cty)", capRange: "4-6%", rentRange: "$2,200-3,400", notes: "Premium northern suburbs, top schools, lower vacancy" },
  { name: "Arlington / Grand Prairie (Tarrant)", capRange: "5-7%", rentRange: "$1,800-2,500", notes: "Mid-cities, balanced family suburbs" },
  { name: "Garland / Mesquite / Irving", capRange: "5-7%", rentRange: "$1,700-2,300", notes: "Working-class inner suburbs, solid workforce cash flow" },
];

const FAQS: { q: string; a: string }[] = [
  { q: "What's a typical cap rate in Dallas-Fort Worth?", a: "DFW cap rates in 2026 land 3-5% in premium Uptown / Highland Park / Plano, 4-6% in gentrifying neighborhoods (Bishop Arts, parts of Oak Cliff), 5-7% in established family suburbs (East Dallas, Arlington, Garland), and 8-11%+ in South Dallas / Pleasant Grove. The cap compression vs Midwest reflects DFW's massive in-migration tailwind — Dallas-Fort Worth has added 1M+ residents in 5 years." },
  { q: "How bad is Texas property tax really?", a: "Real. Texas effective property tax rate runs 1.6-2.5%+ depending on county, school district, and Municipal Utility District (MUD) overlays. New-construction suburbs in MUDs can hit 2.8-3.2% effective. This is the single biggest variable in TX underwriting — a 'great' 6% cap rate gets eaten down to 3.5% net by tax. Always pull the actual current tax bill from the county appraisal district before underwriting. TrueCap auto-fills TX state baseline; verify the parcel." },
  { q: "Does the lack of state income tax actually help?", a: "Yes, for an income-producing rental held long term it materially helps after-tax cash flow. For a Texas resident in the 24-32% federal bracket, no state income tax means rental income + capital gains on sale are only federally taxed — typically a 5-7% after-tax CF lift vs. an equivalent deal in California or New York. The trade-off is property tax: TX takes back some of the income-tax savings via the highest property taxes in the US." },
  { q: "Which DFW suburb is best for first-time investors?", a: "For lower-risk, balanced cash + appreciation: Garland, Mesquite, Irving (mid-cities, mature, ~5-7% cap). For appreciation play with strong schools (and the rental demand that creates): Plano, Frisco, Richardson (~4-6% cap). For higher cash flow with more operational complexity: South Dallas / Pleasant Grove (~8-11% cap). Avoid newly-built MUD suburbs unless you've stress-tested the 2.8-3.2% effective tax." },
  { q: "What's the Dallas STR (Airbnb) situation?", a: "City of Dallas has been tightening STR rules — current ordinances restrict STRs in most residential single-family zones and require permits in commercial zones. Suburbs vary; Plano + Frisco are restrictive, Arlington (sports / entertainment district) is more permissive. Always check the specific city's current ordinance before underwriting STR — Dallas is one of the markets where regulatory risk can flip a deal overnight." },
  { q: "Is DFW good for out-of-state investors?", a: "Yes — DFW is one of the top 5 US markets by out-of-state investor purchase volume. PM market is highly mature (10+ major regional firms), property condition is good (mostly post-1970 stock outside the urban core), and climate is mild (lower deferred-maintenance shock vs Northeast). Watch the property tax math carefully — it's easy to be surprised by the actual bill vs national-average underwriting." },
];

export default function DallasMarketPage() {
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/markets/${SLUG}`;
  // Strategy-fit badge — a label over the market's median cap rate.
  const benchmark = getCapRateBenchmark("Dallas, TX");
  const fit = benchmark ? marketStrategyFit(benchmark.median) : null;
  const fitToneClass =
    fit?.tone === "cashflow"
      ? "bg-[var(--brand-green-light)] text-[var(--brand-green)]"
      : fit?.tone === "appreciation"
        ? "bg-[var(--brand-blue-light)] text-primary"
        : "bg-muted text-foreground";
  const ld = { "@context": "https://schema.org", "@type": "WebPage", "@id": `${canonicalUrl}#page`, name: TITLE, description: DESCRIPTION, url: canonicalUrl, datePublished: PUBLISHED_AT, dateModified: MODIFIED_AT, inLanguage: "en-US", isPartOf: { "@id": `${siteUrl}/#website` }, about: { "@type": "Place", name: `${CITY}, ${STATE}`, address: { "@type": "PostalAddress", addressLocality: CITY, addressRegion: STATE, addressCountry: "US" } } };
  const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <main id="main" className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-2"><Link href="/" className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground">← TrueCap</Link></div>
        <header className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary mb-3"><MapPin className="size-3" />{CITY}-Fort Worth, {STATE}</div>
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
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight tracking-tight">{CITY}-Fort Worth rental property analysis — calculator + 2026 cap-rate benchmarks</h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">Run a DFW rental deal in 60 seconds with TrueCap. Address auto-fills Texas property tax (1.6-2.5%+ effective depending on MUD), HUD rent by county, and current FRED mortgage rates. Below: neighborhood cap rates plus the high-tax / no-income-tax trade-off that defines TX underwriting.</p>
          <div className="mt-6 flex flex-wrap gap-3"><Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"><Calculator className="size-4" />Underwrite a DFW deal — free</Link></div>
        </header>

        <section className="mb-10">
          <h2 className="text-2xl font-extrabold text-foreground mb-3">DFW neighborhood cap-rate map (2026)</h2>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">Ranges reflect typical conventional-financing single-family + small-multi deals. DFW caps are heavily affected by property tax — verify the parcel-specific tax bill before trusting cap-rate ranges, especially in MUD suburbs.</p>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40"><tr className="text-left"><th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Submarket</th><th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cap rate</th><th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Rent</th><th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Character</th></tr></thead>
              <tbody>{NEIGHBORHOODS.map((n) => (<tr key={n.name} className="border-t border-border align-top"><td className="py-3 px-3 text-sm font-semibold text-foreground">{n.name}</td><td className="py-3 px-3 text-sm tabular-nums text-foreground">{n.capRange}</td><td className="py-3 px-3 text-sm tabular-nums text-muted-foreground">{n.rentRange}</td><td className="py-3 px-3 text-xs leading-relaxed text-muted-foreground">{n.notes}</td></tr>))}</tbody>
            </table>
          </div>
        </section>

        <section className="mb-10 rounded-2xl border border-[var(--brand-orange)]/25 bg-[var(--brand-orange-light)] p-5 sm:p-6">
          <h2 className="text-base font-extrabold uppercase tracking-widest text-[var(--brand-orange)] mb-2">The Texas property tax reality check</h2>
          <p className="text-sm leading-relaxed text-foreground">Texas has the highest effective property tax rates in the US — typically 1.6-2.5%+, with new-construction MUD suburbs hitting 2.8-3.2% effective. This is the single biggest variable in TX underwriting. A 6% headline cap can shrink to 3.5% net after the tax bill. Always pull the actual current tax record from the County Appraisal District (Dallas CAD, Tarrant CAD, Collin CAD) before committing. Don&apos;t trust generic state averages.</p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-extrabold text-foreground mb-4">Frequently asked — Dallas-Fort Worth investing</h2>
          <div className="space-y-4">{FAQS.map((f) => (<details key={f.q} className="group rounded-2xl border border-border bg-card p-4"><summary className="cursor-pointer text-sm font-bold text-foreground select-none list-none flex items-center justify-between gap-3"><span>{f.q}</span><span aria-hidden className="text-muted-foreground transition-transform group-open:rotate-90">▸</span></summary><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p></details>))}</div>
        </section>

        <section className="mb-10 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-xl sm:text-2xl font-extrabold mb-2">Run your next DFW deal in 60 seconds</h2>
          <p className="text-sm sm:text-base opacity-90 mb-4 max-w-2xl">Paste the address. Texas tax baseline, HUD rent for the right county, and current rate auto-fill. Cap rate, CoC, DSCR, and monthly cash flow in 1 second. Free to start. No card required.</p>
          <Link href="/" className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity">Open the analyzer<ArrowUpRight className="w-4 h-4" /></Link>
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
          <Link href="/markets/tampa" className="font-bold text-foreground hover:underline">Tampa</Link>{" "}·{" "}
          <Link href="/markets/charlotte" className="font-bold text-foreground hover:underline">Charlotte</Link>{" "}·{" "}
          <Link href="/markets/indianapolis" className="font-bold text-foreground hover:underline">Indianapolis</Link>{" "}·{" "}
          <Link href="/markets/kansas-city" className="font-bold text-foreground hover:underline">Kansas City</Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
