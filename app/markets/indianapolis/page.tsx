/**
 * /markets/indianapolis — Indianapolis, IN rental market landing page.
 *
 * Indianapolis is one of the most consistently mentioned US cash-flow
 * markets — low entry prices, low property tax (Indiana caps at 2% of
 * gross assessed value for non-homestead), legitimately healthy
 * rent-to-price ratios still hitting 1%+ in many neighborhoods.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Calculator, MapPin } from "lucide-react";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";

const CITY = "Indianapolis";
const STATE = "IN";
const SLUG = "indianapolis";
const TITLE = "Indianapolis rental property analysis — calculator + 2026 cap-rate benchmarks";
const DESCRIPTION =
  "Run an Indianapolis rental deal in 60 seconds. Auto-fills IN property tax (2% gross-assessed cap), HUD rent for Marion County, current mortgage rates. Plus neighborhood cap-rate ranges + why Indy stays a top cash-flow market.";
const PUBLISHED_AT = "2026-05-24";
const MODIFIED_AT = "2026-06-01";

export const metadata: Metadata = {
  title: `${TITLE} | TrueCap`,
  description: DESCRIPTION,
  keywords: [
    "indianapolis rental property analysis",
    "indianapolis cap rate",
    "indianapolis rental property calculator",
    "indianapolis investment property",
    "indiana rental property",
    "marion county rentals",
  ],
  alternates: { canonical: `/markets/${SLUG}` },
  openGraph: {
    title: TITLE, description: DESCRIPTION, url: `/markets/${SLUG}`, type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: `TrueCap ${CITY} rental analysis` }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const NEIGHBORHOODS: { name: string; capRange: string; rentRange: string; notes: string }[] = [
  { name: "Downtown / Mass Ave / Fountain Square", capRange: "4-6%", rentRange: "$1,400-2,200", notes: "Urban core, condo + new SFR; appreciation-leaning" },
  { name: "Broad Ripple / Meridian-Kessler", capRange: "5-7%", rentRange: "$1,300-1,900", notes: "Established walkable neighborhoods, solid tenant base" },
  { name: "Irvington / Garfield Park (east)", capRange: "7-9%", rentRange: "$1,000-1,500", notes: "Gentrifying east side, balanced cash + appreciation" },
  { name: "Mars Hill / Stringtown (west)", capRange: "9-12%", rentRange: "$800-1,200", notes: "Classic Indy cash-flow territory; heavier capex risk" },
  { name: "Lawrence / Castleton (northeast)", capRange: "6-8%", rentRange: "$1,200-1,700", notes: "Workforce SFR, lower-density family neighborhoods" },
  { name: "Greenwood (southern suburb, Johnson Cty)", capRange: "5-7%", rentRange: "$1,400-1,900", notes: "Family suburbs, newer SFR, lower vacancy" },
  { name: "Far Eastside / Pendleton Pike corridor", capRange: "10-13%", rentRange: "$750-1,100", notes: "Highest cap territory; deep PM + tenant scrutiny needed" },
];

const FAQS: { q: string; a: string }[] = [
  { q: "What's a typical cap rate in Indianapolis?", a: "Indianapolis cap rates in 2026 land 4-6% in core Downtown / Mass Ave, 5-7% in Broad Ripple / Meridian-Kessler, 6-8% in workforce east + northeast neighborhoods, and 9-13%+ in classic west/far-east cash-flow territory. Indy still routinely produces 1% rule deals (gross monthly rent ≥ 1% of price) in working-class blocks — increasingly rare in coastal markets." },
  { q: "How does Indiana property tax work?", a: "Indiana caps property tax at 2% of gross assessed value for non-homestead properties (1% for primary residences, 3% for commercial). Marion County (Indianapolis) effective rate lands around 1.0-1.5% of market value for rentals depending on township, with most landing near 1.2%. The cap is a real advantage vs neighboring Illinois (2.3%+ effective) and Ohio (~1.4-1.8% effective). TrueCap auto-fills the IN rate; confirm with the Marion County Assessor for the parcel." },
  { q: "Why does Indianapolis keep showing up on cash-flow lists?", a: "Three reasons. (1) Entry prices are still genuinely low — sub-$100k single-family deals exist in many neighborhoods. (2) Rents are reasonable for tenant incomes — collection risk is lower than higher-cap northern markets like Cleveland. (3) Property tax cap is structural — you can't get a property-tax surprise from a reassessment. The trade-off is appreciation: Indy MSA appreciates 2-4%/yr, well below growth-market levels." },
  { q: "What about Indianapolis property condition / age?", a: "Mixed. West side and far east side neighborhoods have meaningful pre-1950 housing stock with the maintenance + lead-paint issues that come with it. North side (Broad Ripple, Meridian-Kessler) and southern/eastern suburbs (Greenwood, Lawrence) are mostly post-1960 construction. Build CapEx assumptions into your underwriting per neighborhood — 8-10% on older houses, 4-6% on newer." },
  { q: "Is Indianapolis good for first-time out-of-state investors?", a: "Among the better Midwest options. PM market is mature (several big regional PM firms), property condition varies less dramatically than Cleveland, and the city government is functional (no Detroit-style legacy issues). The hardest part is picking the right neighborhood — 'Indianapolis' as a market label spans everything from a $50k Far Eastside fix to a $400k Meridian-Kessler bungalow. Treat each submarket as its own market." },
  { q: "What's the STR / Airbnb situation in Indianapolis?", a: "Indianapolis (Marion County) requires STR operators to register with the city + collect/remit the county innkeeper's tax. Most residential zoning allows STR with the permit. Strongest STR economics are near downtown (Conventions, sporting events at Lucas Oil Stadium / Bankers Life), the Indianapolis Motor Speedway corridor during May, and Broad Ripple for nightlife-oriented stays. Underwrite with permit + tax included." },
];

export default function IndianapolisMarketPage() {
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
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">Run an Indianapolis rental deal in 60 seconds with TrueCap. Address auto-fills Indiana property tax (2% gross-assessed cap; ~1.0-1.5% effective in Marion County), HUD rent by county, and current FRED mortgage rates. Below: neighborhood-by-neighborhood cap rates plus the Indy cash-flow thesis.</p>
          <div className="mt-6 flex flex-wrap gap-3"><Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"><Calculator className="size-4" />Underwrite an Indy deal — free</Link></div>
        </header>

        <section className="mb-10">
          <h2 className="text-2xl font-extrabold text-foreground mb-3">Indianapolis neighborhood cap-rate map (2026)</h2>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">Ranges below reflect typical conventional-financing single-family + small-multi deals in each submarket. Indy still routinely produces 1% rule deals in workforce neighborhoods — pure cash-flow without the operational complexity of higher-cap Cleveland or Detroit blocks.</p>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40"><tr className="text-left"><th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Submarket</th><th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cap rate</th><th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Rent</th><th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Character</th></tr></thead>
              <tbody>{NEIGHBORHOODS.map((n) => (<tr key={n.name} className="border-t border-border align-top"><td className="py-3 px-3 text-sm font-semibold text-foreground">{n.name}</td><td className="py-3 px-3 text-sm tabular-nums text-foreground">{n.capRange}</td><td className="py-3 px-3 text-sm tabular-nums text-muted-foreground">{n.rentRange}</td><td className="py-3 px-3 text-xs leading-relaxed text-muted-foreground">{n.notes}</td></tr>))}</tbody>
            </table>
          </div>
        </section>

        <section className="mb-10 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-5 sm:p-6">
          <h2 className="text-base font-extrabold uppercase tracking-widest text-[var(--brand-green)] mb-2">Why Indianapolis stays on the cash-flow list</h2>
          <p className="text-sm leading-relaxed text-foreground">Indianapolis is one of the only major US markets where the 1% rule still routinely works in 2026. Combine sub-$100k entry prices in workforce neighborhoods with Indiana&apos;s 2% gross-assessed property tax cap, and you get genuine cash-flow math without the operational complexity of higher-cap northern industrial markets. Just don&apos;t expect coastal-style appreciation — Indy MSA appreciates 2-4%/yr.</p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-extrabold text-foreground mb-4">Frequently asked — Indianapolis investing</h2>
          <div className="space-y-4">{FAQS.map((f) => (<details key={f.q} className="group rounded-2xl border border-border bg-card p-4"><summary className="cursor-pointer text-sm font-bold text-foreground select-none list-none flex items-center justify-between gap-3"><span>{f.q}</span><span aria-hidden className="text-muted-foreground transition-transform group-open:rotate-90">▸</span></summary><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p></details>))}</div>
        </section>

        <section className="mb-10 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-xl sm:text-2xl font-extrabold mb-2">Run your next Indianapolis deal in 60 seconds</h2>
          <p className="text-sm sm:text-base opacity-90 mb-4 max-w-2xl">Paste the address. Indiana tax cap, HUD rent for Marion County, and current rate auto-fill. Cap rate, CoC, DSCR, and monthly cash flow in 1 second. Free to start. No card required.</p>
          <Link href="/" className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity">Open the analyzer<ArrowUpRight className="w-4 h-4" /></Link>
        </section>

        <footer className="border-t border-border pt-6 text-sm text-muted-foreground leading-relaxed">
          Other US markets covered:{" "}
          <Link href="/markets/philadelphia" className="font-bold text-foreground hover:underline">Philadelphia</Link>{" "}·{" "}
          <Link href="/markets/cleveland" className="font-bold text-foreground hover:underline">Cleveland</Link>{" "}·{" "}
          <Link href="/markets/atlanta" className="font-bold text-foreground hover:underline">Atlanta</Link>{" "}·{" "}
          <Link href="/markets/houston" className="font-bold text-foreground hover:underline">Houston</Link>{" "}·{" "}
          <Link href="/markets/tampa" className="font-bold text-foreground hover:underline">Tampa</Link>{" "}·{" "}
          <Link href="/markets/charlotte" className="font-bold text-foreground hover:underline">Charlotte</Link>{" "}·{" "}
          <Link href="/markets/kansas-city" className="font-bold text-foreground hover:underline">Kansas City</Link>{" "}·{" "}
          <Link href="/markets/dallas" className="font-bold text-foreground hover:underline">Dallas</Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
