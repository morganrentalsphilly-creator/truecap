/**
 * /markets/charlotte — Charlotte, NC rental market landing page.
 *
 * Charlotte = a major US banking/tech employment center with strong
 * net in-migration. Cap rates compress in core neighborhoods but
 * inner suburbs still produce conventional-financing cash flow.
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

const CITY = "Charlotte";
const STATE = "NC";
const SLUG = "charlotte";
const TITLE = "Charlotte Rental Market Analysis 2026 — Cap Rates";
const DESCRIPTION =
  "Neighborhood cap-rate ranges + the Charlotte job-growth picture for 2026. Run a Charlotte rental in 60 seconds — NC tax and HUD rent auto-filled.";
const PUBLISHED_AT = "2026-05-24";
const MODIFIED_AT = "2026-06-01";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "charlotte rental property analysis",
    "charlotte cap rate",
    "charlotte rental property calculator",
    "charlotte investment property",
    "north carolina rental property",
    "mecklenburg county rentals",
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
  { name: "Uptown / South End / Dilworth", capRange: "3-5%", rentRange: "$2,000-3,500", notes: "Urban core, condo + new-construction; appreciation-leaning" },
  { name: "NoDa / Plaza Midwood", capRange: "4-6%", rentRange: "$1,700-2,800", notes: "Gentrified inner-city, balanced cash + appreciation" },
  { name: "East Charlotte (Eastland / Idlewild)", capRange: "6-8%", rentRange: "$1,300-1,800", notes: "Stable workforce cash flow neighborhoods" },
  { name: "West Charlotte / Wilkinson", capRange: "7-9%", rentRange: "$1,100-1,600", notes: "Higher cap, gentrification underway in pockets" },
  { name: "Steele Creek (south Mecklenburg)", capRange: "5-7%", rentRange: "$1,700-2,400", notes: "Family suburbs, newer SFR, lower vacancy" },
  { name: "University City (UNCC area)", capRange: "5-7%", rentRange: "$1,300-1,900", notes: "Student + tech workforce, dense apartment stock" },
  { name: "Concord / Kannapolis (Cabarrus County)", capRange: "5-7%", rentRange: "$1,500-2,100", notes: "Affordable suburbs, growing fast, light commute to Uptown" },
];

const FAQS: { q: string; a: string }[] = [
  { q: "What's a typical cap rate in Charlotte?", a: "Charlotte cap rates in 2026 land 3-5% in Uptown / South End (appreciation-driven), 5-7% in inner suburbs (Steele Creek, University City, Concord), and 6-9% in East/West Charlotte working-class neighborhoods. The Charlotte MSA's strong net in-migration keeps appreciation tailwinds going, which compresses cap rates everywhere — sub-5% cap deals are typically being underwritten on appreciation, not yield." },
  { q: "What's the property tax rate in Charlotte?", a: "North Carolina's effective property tax rate is ~0.7-0.85% — well below the U.S. average. Mecklenburg County (Charlotte) tends to land at 0.85-0.95% effective once city + school district millages are included. NC reassesses every 4-8 years (Mecklenburg is on a 4-year cycle), so expect step-changes rather than annual creep. TrueCap auto-fills the NC state rate; confirm with Mecklenburg County tax records for the specific parcel." },
  { q: "Is Charlotte still a good cash-flow market?", a: "Pure cash-flow purity has eroded as appreciation has driven prices up — but Charlotte still produces solid 5-7% cap rates in workforce neighborhoods (East Charlotte, parts of Steele Creek, Cabarrus County). The thesis has shifted from 'cheap cash flow' to 'balanced cash + appreciation in a growing metro' — comparable to early-2010s Atlanta. The MSA is adding 50k+ residents per year." },
  { q: "How does Charlotte's job growth affect rental demand?", a: "Materially. Charlotte is the #2 US banking center (Bank of America HQ, Wells Fargo East-coast HQ) and a growing fintech + tech hub. Net in-migration has been positive every year since 2010. For rental demand this means consistent absorption — vacancy in core neighborhoods runs 3-5% vs. 6-8% national average. The downside: rent growth has outpaced wage growth in some submarkets, which creates affordability ceilings to underwrite carefully." },
  { q: "What about Charlotte STRs (Airbnb)?", a: "Charlotte STR regulations vary by zoning. City of Charlotte requires a permit for whole-home rentals + restricts in single-family residential zones. Concord/Kannapolis are more permissive. Best STR economics tend to be near Uptown for business travelers and near Carowinds / Charlotte Motor Speedway for event-driven nights. Underwrite STR with a permit-status check first." },
  { q: "Is buying property in Charlotte as an out-of-state investor doable?", a: "Yes. Charlotte is a top-15 US market by out-of-state investor purchase volume. The metro's PM market is competitive (3-5 reputable firms per submarket), property condition is generally better than older Northern markets, and the climate is mild (lower deferred-maintenance shock). Standard advice applies: vet PMs in person before scaling beyond 1-2 doors." },
];

export default function CharlotteMarketPage() {
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
  const benchmark = getCapRateBenchmark("Charlotte, NC");
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <main id="main" className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-2">
          <Link href="/" className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground">← TrueCap</Link>
        </div>
        <header className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary mb-3">
            <MapPin className="size-3" />{CITY}, {STATE}
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
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight tracking-tight">{CITY} rental property analysis — calculator + 2026 cap-rate benchmarks</h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Run a Charlotte rental deal in 60 seconds with TrueCap. Address auto-fills <Link href="/states/north-carolina" className="font-semibold text-primary hover:underline">NC property tax</Link> (~0.85-0.95% effective in Mecklenburg), HUD rent by county, and current FRED mortgage rates. Below: neighborhood-by-neighborhood <Link href="/glossary/cap-rate" className="font-semibold text-primary hover:underline">cap rates</Link> plus the Charlotte job-growth context.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"><Calculator className="size-4" />Underwrite a Charlotte deal — free</Link>
          </div>
        </header>

        <section className="mb-10">
          <h2 className="text-2xl font-extrabold text-foreground mb-3">Charlotte neighborhood cap-rate map (2026)</h2>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">Ranges below reflect typical conventional-financing single-family + small-multi deals in each submarket. Uptown / South End premium compresses to 3-5% (appreciation-driven); workforce neighborhoods on the east/west still produce 6-9% cap.</p>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40"><tr className="text-left"><th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Submarket</th><th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cap rate</th><th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Rent</th><th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Character</th></tr></thead>
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

        <section className="mb-10 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-5 sm:p-6">
          <h2 className="text-base font-extrabold uppercase tracking-widest text-[var(--brand-green)] mb-2">Why Charlotte keeps showing up on lists</h2>
          <p className="text-sm leading-relaxed text-foreground">Charlotte is one of the few US metros with all three positive signals at once: net in-migration (50k+ residents/yr), employment growth (banking + fintech + tech), and <Link href="/glossary/property-tax" className="font-semibold text-primary hover:underline">property tax</Link> in the low end (~0.85-0.95%). The trade-off is appreciation-driven cap-rate compression — the days of 8% caps in inner Charlotte are gone. But for balanced cash + appreciation in a growing market, it&apos;s hard to beat.</p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-extrabold text-foreground mb-4">Frequently asked — Charlotte investing</h2>
          <div className="space-y-4">
            {FAQS.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-border bg-card p-4">
                <summary className="cursor-pointer text-sm font-bold text-foreground select-none list-none flex items-center justify-between gap-3"><span>{f.q}</span><span aria-hidden className="text-muted-foreground transition-transform group-open:rotate-90">▸</span></summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mb-10 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-xl sm:text-2xl font-extrabold mb-2">Run your next Charlotte deal in 60 seconds</h2>
          <p className="text-sm sm:text-base opacity-90 mb-4 max-w-2xl">Paste the address. NC tax, HUD rent for Mecklenburg, and current rate auto-fill. Cap rate, CoC, <Link href="/glossary/dscr" className="font-semibold text-primary hover:underline">DSCR</Link>, and monthly cash flow in 1 second. Free to start. No card required.</p>
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
