/**
 * /markets/memphis — Memphis, TN rental market landing page.
 *
 * Memphis is the de facto US "turnkey rental capital" — the highest
 * concentration of out-of-state-investor-oriented PM + acquisition
 * services in any single market. Cap rates are real, the ecosystem
 * is mature, but turnkey premium pricing means net returns are often
 * lower than the headline numbers suggest.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Calculator, MapPin } from "lucide-react";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";

const CITY = "Memphis";
const STATE = "TN";
const SLUG = "memphis";
const TITLE = "Memphis rental property analysis — calculator + 2026 cap-rate benchmarks";
const DESCRIPTION =
  "Run a Memphis rental deal in 60 seconds. Auto-fills TN property tax (~0.7%), HUD rent for Shelby County, current rates. Plus neighborhood cap-rate map + the turnkey-vs-direct trade-off for 2026.";
const PUBLISHED_AT = "2026-05-24";
const MODIFIED_AT = "2026-06-01";

export const metadata: Metadata = {
  title: `${TITLE} | TrueCap`,
  description: DESCRIPTION,
  keywords: [
    "memphis rental property analysis",
    "memphis cap rate",
    "memphis rental property calculator",
    "memphis investment property",
    "memphis turnkey rental",
    "tennessee rental property",
  ],
  alternates: { canonical: `/markets/${SLUG}` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `/markets/${SLUG}`, type: "website", images: [{ url: "/home.jpg", width: 1200, height: 630, alt: `TrueCap ${CITY} rental analysis` }] },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const NEIGHBORHOODS: { name: string; capRange: string; rentRange: string; notes: string }[] = [
  { name: "Downtown / Harbor Town / South Main", capRange: "4-6%", rentRange: "$1,400-2,400", notes: "Urban revival, lofts + condos; appreciation-leaning" },
  { name: "Midtown / Cooper-Young / Overton Square", capRange: "5-7%", rentRange: "$1,200-1,900", notes: "Walkable established neighborhoods, solid tenant base" },
  { name: "East Memphis / Germantown (suburb)", capRange: "5-7%", rentRange: "$1,400-2,100", notes: "Premium family suburbs, top schools, lower vacancy" },
  { name: "Bartlett / Cordova (north suburbs)", capRange: "6-8%", rentRange: "$1,200-1,700", notes: "Family neighborhoods, steady demand, newer SFR" },
  { name: "Whitehaven / Westwood (south)", capRange: "8-10%", rentRange: "$900-1,300", notes: "Working-class neighborhoods, common turnkey targets" },
  { name: "Frayser / Raleigh (north)", capRange: "10-13%", rentRange: "$700-1,100", notes: "Higher cap, real tenant + property risk; deep due diligence" },
  { name: "Orange Mound / South Memphis", capRange: "12%+", rentRange: "$650-1,000", notes: "Highest cap territory; requires hands-on PM relationships" },
];

const FAQS: { q: string; a: string }[] = [
  { q: "What's a typical Memphis cap rate in 2026?", a: "Memphis cap rates land 4-6% in Downtown/Midtown (appreciation-leaning), 5-7% in inner suburbs (East Memphis, Germantown, Bartlett, Cordova), 8-10% in workforce neighborhoods (Whitehaven, Westwood), and 10-13%+ in classic cash-flow territory (Frayser, Raleigh, Orange Mound). The headline numbers are real but turnkey-bought properties typically trade at a premium (5-10% above local owner-occupant pricing), which compresses net cap." },
  { q: "What's the deal with Memphis turnkey rentals?", a: "Memphis has the deepest turnkey-rental ecosystem in the US — companies that buy distressed properties, rehab them, place tenants, and sell to out-of-state investors with their PM company attached. Pro: lowest-friction entry for first-time out-of-state landlords; deals are vetted, occupied, and managed. Con: you pay a 5-10% turnkey premium on price, plus 8-10% ongoing PM fees, so your net is typically 2-4% lower than the headline cap. Best for passive investors; bad for hands-on BRRRR operators." },
  { q: "What's the property tax rate in Memphis?", a: "Tennessee has no state income tax (huge advantage), and effective property tax is among the lowest in the US (~0.6-0.7% statewide). Memphis (Shelby County) lands ~0.7-1.1% depending on city + school district overlays. Lower than every Midwest market and most Sun Belt markets. TrueCap auto-fills the TN rate; confirm with Shelby County Assessor for the specific parcel." },
  { q: "Is Memphis flooding/insurance a risk?", a: "Less than coastal Florida, more than the Midwest. Memphis has Mississippi River flood zones (especially south/southwest of downtown — Riverside Drive area, Presidents Island). Most residential neighborhoods are not in flood zones. Insurance runs $1,200-2,400/yr on typical SFR — higher than Indianapolis or Kansas City but well below Tampa. Always check FEMA flood maps for the specific parcel — flood is NOT covered by standard property insurance." },
  { q: "How's tenant quality in Memphis cash-flow neighborhoods?", a: "Variable. Memphis has significant economic diversity within neighborhoods, so quality screening matters more than market-wide reputation. The mature turnkey companies have decades of refined tenant screening for their target neighborhoods; independent landlords need to replicate that rigor. Eviction process in Tennessee is relatively landlord-favorable (faster than CA/NY) but still 4-8 weeks typical." },
  { q: "Is Memphis better than Detroit for cash flow?", a: "Different trade-offs. Detroit has higher headline caps but materially higher operational risk + capex surprises on older housing stock. Memphis has slightly lower caps (10-13% vs 15%+) but more mature PM market, newer housing stock (more 1960s+), and warmer climate (lower deferred-maintenance shock). For first-time out-of-state investors: Memphis is the safer bet. For experienced BRRRR operators with on-the-ground crews: Detroit can produce better numbers." },
];

export default function MemphisMarketPage() {
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
          <h1 className="text-3xl sm:text-4xl font-black text-foreground leading-tight tracking-tight">{CITY} rental property analysis — calculator + 2026 cap-rate benchmarks</h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">Run a Memphis rental deal in 60 seconds with TrueCap. Address auto-fills Tennessee property tax (~0.7-1.1% in Shelby County), HUD rent by county, and current FRED mortgage rates. Below: neighborhood cap-rate map plus the turnkey vs. direct trade-off most Memphis investors face.</p>
          <div className="mt-6 flex flex-wrap gap-3"><Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"><Calculator className="size-4" />Underwrite a Memphis deal — free</Link></div>
        </header>

        <section className="mb-10">
          <h2 className="text-2xl font-black text-foreground mb-3">Memphis neighborhood cap-rate map (2026)</h2>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">Ranges reflect typical conventional-financing single-family + small-multi deals. Memphis is one of the top US markets for out-of-state investors thanks to a mature PM ecosystem; the trade-off is turnkey-pricing premium on the cleanest deals.</p>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40"><tr className="text-left"><th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Submarket</th><th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cap rate</th><th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Rent</th><th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Character</th></tr></thead>
              <tbody>{NEIGHBORHOODS.map((n) => (<tr key={n.name} className="border-t border-border align-top"><td className="py-3 px-3 text-sm font-semibold text-foreground">{n.name}</td><td className="py-3 px-3 text-sm tabular-nums text-foreground">{n.capRange}</td><td className="py-3 px-3 text-sm tabular-nums text-muted-foreground">{n.rentRange}</td><td className="py-3 px-3 text-xs leading-relaxed text-muted-foreground">{n.notes}</td></tr>))}</tbody>
            </table>
          </div>
        </section>

        <section className="mb-10 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-5 sm:p-6">
          <h2 className="text-base font-black uppercase tracking-widest text-[var(--brand-green)] mb-2">Why Memphis keeps drawing out-of-state capital</h2>
          <p className="text-sm leading-relaxed text-foreground">Memphis has three things together that few markets match: low property tax (~0.7-1.1%), no state income tax, and the deepest turnkey ecosystem in the country (15+ established PM/turnkey firms competing for your business). For passive out-of-state investors, this means lower friction at every step — buy, manage, sell — than almost any other cash-flow market. The trade-off is turnkey premium pricing and the ongoing PM fee that comes with it.</p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-black text-foreground mb-4">Frequently asked — Memphis investing</h2>
          <div className="space-y-4">{FAQS.map((f) => (<details key={f.q} className="group rounded-2xl border border-border bg-card p-4"><summary className="cursor-pointer text-sm font-bold text-foreground select-none list-none flex items-center justify-between gap-3"><span>{f.q}</span><span aria-hidden className="text-muted-foreground transition-transform group-open:rotate-90">▸</span></summary><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p></details>))}</div>
        </section>

        <section className="mb-10 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-xl sm:text-2xl font-black mb-2">Run your next Memphis deal in 60 seconds</h2>
          <p className="text-sm sm:text-base opacity-90 mb-4 max-w-2xl">Paste the address. Tennessee tax, HUD rent for Shelby County, and current rate auto-fill. Cap rate, CoC, DSCR, and monthly cash flow in 1 second. Free to start. No card required.</p>
          <Link href="/" className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity">Open the analyzer<ArrowUpRight className="w-4 h-4" /></Link>
        </section>

        <footer className="border-t border-border pt-6 text-sm text-muted-foreground leading-relaxed">
          Other US markets covered:{" "}
          <Link href="/markets/cleveland" className="font-bold text-foreground hover:underline">Cleveland</Link>{" "}·{" "}
          <Link href="/markets/detroit" className="font-bold text-foreground hover:underline">Detroit</Link>{" "}·{" "}
          <Link href="/markets/indianapolis" className="font-bold text-foreground hover:underline">Indianapolis</Link>{" "}·{" "}
          <Link href="/markets/kansas-city" className="font-bold text-foreground hover:underline">Kansas City</Link>{" "}·{" "}
          <Link href="/markets/atlanta" className="font-bold text-foreground hover:underline">Atlanta</Link>{" "}·{" "}
          <Link href="/markets/charlotte" className="font-bold text-foreground hover:underline">Charlotte</Link>{" "}·{" "}
          <Link href="/markets/phoenix" className="font-bold text-foreground hover:underline">Phoenix</Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
