/**
 * /markets/kansas-city — Kansas City rental market landing page.
 *
 * Kansas City straddles two states (MO + KS). For our purposes we
 * cover the Missouri side primarily (the larger half) plus mention
 * Overland Park / KCK as relevant suburbs.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Calculator, MapPin } from "lucide-react";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";

const CITY = "Kansas City";
const STATE = "MO";
const SLUG = "kansas-city";
const TITLE = "Kansas City rental property analysis — calculator + 2026 cap-rate benchmarks";
const DESCRIPTION =
  "Run a Kansas City rental deal in 60 seconds. Auto-fills MO property tax (~1.0%), HUD rent for Jackson / Clay / Cass counties, current mortgage rates. Plus neighborhood cap-rate ranges + the KC cash-flow thesis for 2026.";
const PUBLISHED_AT = "2026-05-24";
const MODIFIED_AT = "2026-06-01";

export const metadata: Metadata = {
  title: `${TITLE} | TrueCap`,
  description: DESCRIPTION,
  keywords: [
    "kansas city rental property analysis",
    "kansas city cap rate",
    "kansas city rental property calculator",
    "kansas city investment property",
    "missouri rental property",
    "kcmo rentals",
  ],
  alternates: { canonical: `/markets/${SLUG}` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `/markets/${SLUG}`, type: "website", images: [{ url: "/home.jpg", width: 1200, height: 630, alt: `TrueCap ${CITY} rental analysis` }] },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const NEIGHBORHOODS: { name: string; capRange: string; rentRange: string; notes: string }[] = [
  { name: "Downtown KC / Crossroads / River Market", capRange: "4-6%", rentRange: "$1,400-2,200", notes: "Urban core, lofts + new SFR; appreciation-leaning" },
  { name: "Brookside / Waldo (south KC)", capRange: "5-7%", rentRange: "$1,200-1,800", notes: "Established walkable, good schools, premium SFR" },
  { name: "Westport / Plaza", capRange: "4-6%", rentRange: "$1,400-2,300", notes: "Walkable upscale; condo + small multi mix" },
  { name: "Midtown / Hyde Park / Valentine", capRange: "6-8%", rentRange: "$1,000-1,600", notes: "Historic neighborhoods, gentrification underway" },
  { name: "East KC / 71 Highway corridor", capRange: "9-12%", rentRange: "$700-1,100", notes: "Classic KC cash-flow territory; real tenant + capex risk" },
  { name: "Independence / Raytown (eastern Jackson)", capRange: "7-9%", rentRange: "$1,000-1,400", notes: "Working-class suburbs, steady cash flow" },
  { name: "Overland Park / Lenexa (Kansas side)", capRange: "5-7%", rentRange: "$1,500-2,200", notes: "Premium KS suburbs, family SFR, lower vacancy" },
];

const FAQS: { q: string; a: string }[] = [
  { q: "What's a typical cap rate in Kansas City?", a: "KC cap rates in 2026 land 4-6% in Downtown / Plaza / Brookside (appreciation-leaning), 5-7% in inner suburbs (Waldo, Westport, Overland Park), 7-9% in eastern Jackson County working-class areas (Raytown, Independence), and 9-12%+ in classic East KC cash-flow territory. KC is one of the most reliably cash-flow-positive top-50 US markets at conventional financing." },
  { q: "Does Kansas City have property tax issues I should know about?", a: "Missouri's effective property tax rate is ~1.0% statewide, but Jackson County (KC Missouri) has been through some assessment-process controversy in recent years — significant reassessments after long gaps led to sticker-shock tax bills for many owners 2023-2024. Most reassessments have now happened, but it's worth pulling the actual current tax record on any specific parcel rather than relying on a national average. TrueCap auto-fills MO rate as a starting point." },
  { q: "Missouri side or Kansas side?", a: "Different markets, despite being one metro. Missouri side (KCMO + eastern Jackson) is where cash-flow neighborhoods are; Kansas side (Overland Park, Lenexa, Olathe) is premium family suburbs with lower cap but lower risk. Investors looking for cash flow → MO side. Investors looking for stable appreciation in a known-good school district → KS side. Different tax structures too (KS reassesses annually; MO every other year)." },
  { q: "What about the Independence / Raytown / Grandview market?", a: "Eastern Jackson County suburbs are a sweet spot for many KC investors: 7-9% cap rates, established working-class tenant base, mostly 1950s-70s SFR (modern enough to avoid the worst capex surprises but still affordable enough to underwrite). The neighborhoods have less appreciation tailwind than KS-side suburbs but more cash flow per dollar." },
  { q: "Is KC a viable BRRRR market?", a: "Yes — eastern Jackson County in particular has solid BRRRR economics. Distressed mid-century SFR in the $50-90k range, $20-40k rehab, post-rehab ARVs $130-180k. Same caveats as Cleveland: tenant turnover in cash-flow neighborhoods can be high, capex on older houses is real. Less competition from out-of-state BRRRR investors than Cleveland or Memphis." },
  { q: "What's the property management situation in KC?", a: "Reasonably mature — 5+ regional PM firms with KC focus. Standard 8-10% of collected rent for SFR management. KC is a popular out-of-state investor market so PMs are accustomed to remote-owner workflows. As always, vet 3 PMs in person before committing if you're scaling beyond 1-2 doors." },
];

export default function KansasCityMarketPage() {
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
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">Run a Kansas City rental deal in 60 seconds with TrueCap. Address auto-fills Missouri property tax (~1.0%), HUD rent by county, and current FRED mortgage rates. Below: neighborhood-by-neighborhood cap rates plus the KC cash-flow thesis (and the MO-vs-KS-side question).</p>
          <div className="mt-6 flex flex-wrap gap-3"><Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"><Calculator className="size-4" />Underwrite a KC deal — free</Link></div>
        </header>

        <section className="mb-10">
          <h2 className="text-2xl font-black text-foreground mb-3">Kansas City neighborhood cap-rate map (2026)</h2>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">Ranges reflect typical conventional-financing single-family + small-multi deals. KC is one of the most reliably cash-flow-positive top-50 US markets; the trade-off vs Sun Belt growth markets is lower appreciation.</p>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40"><tr className="text-left"><th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Submarket</th><th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cap rate</th><th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Rent</th><th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Character</th></tr></thead>
              <tbody>{NEIGHBORHOODS.map((n) => (<tr key={n.name} className="border-t border-border align-top"><td className="py-3 px-3 text-sm font-semibold text-foreground">{n.name}</td><td className="py-3 px-3 text-sm tabular-nums text-foreground">{n.capRange}</td><td className="py-3 px-3 text-sm tabular-nums text-muted-foreground">{n.rentRange}</td><td className="py-3 px-3 text-xs leading-relaxed text-muted-foreground">{n.notes}</td></tr>))}</tbody>
            </table>
          </div>
        </section>

        <section className="mb-10 rounded-2xl border border-[var(--brand-orange)]/25 bg-[var(--brand-orange-light)] p-5 sm:p-6">
          <h2 className="text-base font-black uppercase tracking-widest text-[var(--brand-orange)] mb-2">Jackson County tax reassessment notice</h2>
          <p className="text-sm leading-relaxed text-foreground">Jackson County (KC Missouri) went through significant tax reassessments 2023-2024 after long gaps, resulting in sticker-shock bills for many owners. Always pull the actual current tax record from the Jackson County Assessor for the specific parcel before underwriting — the seller&apos;s prior tax bill may not reflect post-reassessment reality.</p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-black text-foreground mb-4">Frequently asked — Kansas City investing</h2>
          <div className="space-y-4">{FAQS.map((f) => (<details key={f.q} className="group rounded-2xl border border-border bg-card p-4"><summary className="cursor-pointer text-sm font-bold text-foreground select-none list-none flex items-center justify-between gap-3"><span>{f.q}</span><span aria-hidden className="text-muted-foreground transition-transform group-open:rotate-90">▸</span></summary><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p></details>))}</div>
        </section>

        <section className="mb-10 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-xl sm:text-2xl font-black mb-2">Run your next Kansas City deal in 60 seconds</h2>
          <p className="text-sm sm:text-base opacity-90 mb-4 max-w-2xl">Paste the address. Missouri tax, HUD rent for the right county, and current rate auto-fill. Cap rate, CoC, DSCR, and monthly cash flow in 1 second. Free to start. No card required.</p>
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
          <Link href="/markets/indianapolis" className="font-bold text-foreground hover:underline">Indianapolis</Link>{" "}·{" "}
          <Link href="/markets/dallas" className="font-bold text-foreground hover:underline">Dallas</Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
