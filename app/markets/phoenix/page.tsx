/**
 * /markets/phoenix — Phoenix, AZ rental market landing page.
 *
 * Phoenix is one of the highest-growth large US metros — massive
 * net in-migration, no state tax advantages (well, low), but cap
 * rates have compressed materially as appreciation drove prices up
 * 2020-2024.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Calculator, MapPin } from "lucide-react";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SourceMethodologyBox } from "@/components/marketing/source-methodology-box";
import { getSiteUrl } from "@/lib/site-url";

const CITY = "Phoenix";
const STATE = "AZ";
const SLUG = "phoenix";
const TITLE = "Phoenix rental property analysis — calculator + 2026 cap-rate benchmarks";
const DESCRIPTION =
  "Run a Phoenix rental deal in 60 seconds. Auto-fills AZ property tax (~0.6%), HUD rent for Maricopa County, current rates. Plus neighborhood cap-rate map + Phoenix-specific notes on STR rules and water/HOA risk.";
const PUBLISHED_AT = "2026-05-24";
const MODIFIED_AT = "2026-06-01";

export const metadata: Metadata = {
  title: `${TITLE} | TrueCap`,
  description: DESCRIPTION,
  keywords: [
    "phoenix rental property analysis",
    "phoenix cap rate",
    "phoenix rental property calculator",
    "phoenix investment property",
    "arizona rental property",
    "maricopa county rentals",
  ],
  alternates: { canonical: `/markets/${SLUG}` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `/markets/${SLUG}`, type: "website", images: [{ url: "/home.jpg", width: 1200, height: 630, alt: `TrueCap ${CITY} rental analysis` }] },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const NEIGHBORHOODS: { name: string; capRange: string; rentRange: string; notes: string }[] = [
  { name: "Downtown Phoenix / Roosevelt / Arcadia", capRange: "3-5%", rentRange: "$1,800-3,200", notes: "Urban core + premium close-in; appreciation-leaning" },
  { name: "Central Phoenix / Coronado / Encanto", capRange: "4-6%", rentRange: "$1,500-2,400", notes: "Walkable historic, balanced cash + appreciation" },
  { name: "Scottsdale (north Maricopa)", capRange: "3-5%", rentRange: "$2,200-4,000", notes: "Premium suburban, top schools, low vacancy, high entry" },
  { name: "Tempe (ASU area)", capRange: "4-6%", rentRange: "$1,600-2,400", notes: "Student + workforce rentals, steady demand" },
  { name: "Mesa / Gilbert (east Maricopa)", capRange: "5-7%", rentRange: "$1,700-2,400", notes: "Family suburbs, newer SFR, growing fast" },
  { name: "West Phoenix / Maryvale / Laveen", capRange: "6-8%", rentRange: "$1,300-1,800", notes: "Working-class neighborhoods, solid cash flow" },
  { name: "Glendale / Peoria (NW Maricopa)", capRange: "5-7%", rentRange: "$1,600-2,200", notes: "Mid-cities, family suburbs, balanced" },
];

const FAQS: { q: string; a: string }[] = [
  { q: "What's a typical Phoenix cap rate in 2026?", a: "Phoenix cap rates in 2026 land 3-5% in premium close-in neighborhoods (Arcadia, Scottsdale, North Central) and 5-7% in inner suburbs (Mesa, Gilbert, Glendale, Peoria). West Phoenix workforce neighborhoods (Maryvale, Laveen) still produce 6-8%. The compression vs. Midwest reflects Phoenix's massive in-migration tailwind — the MSA has added 500k+ residents in 5 years." },
  { q: "What's the property tax rate in Phoenix?", a: "Arizona has one of the lowest effective property tax rates in the US (~0.5-0.6% statewide). Maricopa County (Phoenix metro) typically lands 0.55-0.7% effective once city + school district overlays are included. Way below Texas (1.6-2.5%+) or Illinois (2.3%+). This is a real underwriting advantage in TX-vs-AZ comparison. TrueCap auto-fills the AZ rate; verify with Maricopa County Assessor for the parcel." },
  { q: "What about Phoenix water risk?", a: "Real but often overstated for short-to-medium-term rental investing. Arizona is in a long-term drought; CAP (Colorado River) allocations have been reduced multiple times in recent years. For a 5-10 year rental hold, this is unlikely to materially affect your property value or tenancy. For a 20-30 year hold, do your own research — some far-suburban developments (Pinal County, far West Valley) face higher water-allocation risk than core Phoenix metro." },
  { q: "Is Phoenix STR (Airbnb) still viable?", a: "Mixed. Arizona state law currently preempts most local STR bans, so cities CAN'T outright prohibit STRs — but they can require permits + collect taxes. Scottsdale, Sedona-adjacent properties, and pool-equipped SFR near major events (Spring Training, Phoenix Open) still produce strong STR economics. The economics rely heavily on the winter snowbird season (Nov-April); summer months are very slow. Underwrite STR with seasonal occupancy curves, not flat annual numbers." },
  { q: "Are HOAs an issue in Phoenix rentals?", a: "Bigger issue than in most markets. A significant share of post-2000 Phoenix construction is in HOAs (planned subdivisions with monthly fees + rental restrictions). Some HOAs cap rental percentages or require minimum lease terms. Always pull the HOA's CC&Rs and current financials BEFORE committing — both for the rental restrictions and the special-assessment risk (HOA reserves are often underfunded). Avoid any HOA whose financials you can't get quickly." },
  { q: "How does Arizona's no-state-income-tax (low-tax) compare to TX or FL?", a: "Arizona has a flat 2.5% state income tax — among the lowest in the US, but not zero like TX or FL. For an investor in the 24-32% federal bracket, that's a small additional drag on after-tax cash flow vs. TX/FL. Combined with Arizona's very low property tax (~0.6% vs TX's 1.6-2.5%), Arizona often beats Texas on net carrying cost despite TX having no income tax. Run both states through TrueCap's tax model to compare." },
];

export default function PhoenixMarketPage() {
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/markets/${SLUG}`;
  const ld = { "@context": "https://schema.org", "@type": "WebPage", "@id": `${canonicalUrl}#page`, name: TITLE, description: DESCRIPTION, url: canonicalUrl, datePublished: PUBLISHED_AT, dateModified: MODIFIED_AT, inLanguage: "en-US", isPartOf: { "@id": `${siteUrl}/#website` }, about: { "@type": "Place", name: `${CITY}, ${STATE}`, address: { "@type": "PostalAddress", addressLocality: CITY, addressRegion: STATE, addressCountry: "US" } } };
  const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <main id="main" className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-2"><Link href="/" className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground">← TrueCap</Link></div>
        <header className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary mb-3"><MapPin className="size-3" />{CITY}, {STATE}</div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight tracking-tight">{CITY} rental property analysis — calculator + 2026 cap-rate benchmarks</h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">Run a Phoenix rental deal in 60 seconds with TrueCap. Address auto-fills Arizona property tax (~0.55-0.7% in Maricopa), HUD rent by county, and current FRED mortgage rates. Below: neighborhood cap-rate map plus Phoenix-specific notes on STR rules and HOA risk.</p>
          <div className="mt-6 flex flex-wrap gap-3"><Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"><Calculator className="size-4" />Underwrite a Phoenix deal — free</Link></div>
        </header>

        <section className="mb-10">
          <h2 className="text-2xl font-extrabold text-foreground mb-3">Phoenix neighborhood cap-rate map (2026)</h2>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">Ranges reflect typical conventional-financing single-family + small-multi deals. Phoenix appreciation tailwind (500k+ residents added in 5 years) keeps cap rates compressed in core/premium neighborhoods.</p>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40"><tr className="text-left"><th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Submarket</th><th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cap rate</th><th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Rent</th><th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Character</th></tr></thead>
              <tbody>{NEIGHBORHOODS.map((n) => (<tr key={n.name} className="border-t border-border align-top"><td className="py-3 px-3 text-sm font-semibold text-foreground">{n.name}</td><td className="py-3 px-3 text-sm tabular-nums text-foreground">{n.capRange}</td><td className="py-3 px-3 text-sm tabular-nums text-muted-foreground">{n.rentRange}</td><td className="py-3 px-3 text-xs leading-relaxed text-muted-foreground">{n.notes}</td></tr>))}</tbody>
            </table>
          </div>
        </section>

        <section className="mb-10 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-5 sm:p-6">
          <h2 className="text-base font-extrabold uppercase tracking-widest text-[var(--brand-green)] mb-2">Why Phoenix keeps drawing investor capital</h2>
          <p className="text-sm leading-relaxed text-foreground">Phoenix combines three favorable signals: massive net in-migration (500k+ residents in 5 years, with no end in sight), low effective property tax (~0.6% — among the lowest in the US), and a low-state-income-tax structure (2.5% flat). Trade-offs: appreciation-driven cap-rate compression in core areas, real long-term water risk for very far suburbs, and HOA-related rental restrictions on a meaningful share of post-2000 construction. For balanced cash + appreciation in a high-growth metro, Phoenix sits near the top of the US list.</p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-extrabold text-foreground mb-4">Frequently asked — Phoenix investing</h2>
          <div className="space-y-4">{FAQS.map((f) => (<details key={f.q} className="group rounded-2xl border border-border bg-card p-4"><summary className="cursor-pointer text-sm font-bold text-foreground select-none list-none flex items-center justify-between gap-3"><span>{f.q}</span><span aria-hidden className="text-muted-foreground transition-transform group-open:rotate-90">▸</span></summary><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p></details>))}</div>
        </section>

        <section className="mb-10 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-xl sm:text-2xl font-extrabold mb-2">Run your next Phoenix deal in 60 seconds</h2>
          <p className="text-sm sm:text-base opacity-90 mb-4 max-w-2xl">Paste the address. Arizona tax, HUD rent for Maricopa, and current rate auto-fill. Cap rate, CoC, DSCR, and monthly cash flow in 1 second. Free to start. No card required.</p>
          <Link href="/" className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity">Open the analyzer<ArrowUpRight className="w-4 h-4" /></Link>
        </section>

        <SourceMethodologyBox
          className="mt-10"
          sources={["HUD Fair Market Rent", "FRED 30-yr mortgage rate", "Tax Foundation (property tax)"]}
          updated="June 2026"
        />

        <footer className="border-t border-border pt-6 text-sm text-muted-foreground leading-relaxed">
          Other US markets covered:{" "}
          <Link href="/markets/atlanta" className="font-bold text-foreground hover:underline">Atlanta</Link>{" "}·{" "}
          <Link href="/markets/charlotte" className="font-bold text-foreground hover:underline">Charlotte</Link>{" "}·{" "}
          <Link href="/markets/dallas" className="font-bold text-foreground hover:underline">Dallas</Link>{" "}·{" "}
          <Link href="/markets/tampa" className="font-bold text-foreground hover:underline">Tampa</Link>{" "}·{" "}
          <Link href="/markets/houston" className="font-bold text-foreground hover:underline">Houston</Link>{" "}·{" "}
          <Link href="/markets/memphis" className="font-bold text-foreground hover:underline">Memphis</Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
