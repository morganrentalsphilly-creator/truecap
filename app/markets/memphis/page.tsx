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
import { CityStrategyGuides } from "@/components/marketing/city-strategy-guides";
import { SourceMethodologyBox } from "@/components/marketing/source-methodology-box";
import { getCapRateBenchmark } from "@/lib/market-benchmarks";
import { marketStrategyFit } from "@/lib/market-strategy-fit";
import { getSiteUrl } from "@/lib/site-url";

const CITY = "Memphis";
const STATE = "TN";
const SLUG = "memphis";
const TITLE = "Memphis Rental Market Analysis 2026 — Cap Rates";
const DESCRIPTION =
  "Neighborhood cap-rate map + the turnkey-vs-direct trade-off for 2026. Run a Memphis rental in 60 seconds — TN tax and HUD rent auto-filled.";
const PUBLISHED_AT = "2026-05-24";
const MODIFIED_AT = "2026-08-15";

export const metadata: Metadata = {
  title: TITLE,
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
  { q: "What's a typical Memphis cap rate in 2026?", a: "The table provides rough screening ranges, not achievable returns. Replace them with the property's current rent roll or comparable leases, tax bill, insurance quote, condition, vacancy and collections history, management proposal, capital plan, and financing before relying on a cap rate." },
  { q: "What's the deal with Memphis turnkey rentals?", a: "Memphis has an established turnkey ecosystem, but 'turnkey' does not prove rehab quality, tenant performance, management quality, passivity, or return. Independently verify price against comps, completed work and permits, inspection, lease and collected funds, rent support, insurance, reserves, and the full management agreement." },
  { q: "What's the property tax rate in Memphis?", a: "Parcel tax depends on the jurisdiction, assessed value, taxing units, and any exemptions. TrueCap's state or county input is a screening estimate; confirm the current parcel record and a post-sale scenario with the relevant assessor before underwriting." },
  { q: "Is Memphis flooding/insurance a risk?", a: "Flood and insurance exposure are property-specific. Review current flood maps plus prior-loss, drainage, roof, and condition evidence, and obtain subject-property hazard and flood quotes with limits, deductibles, and exclusions rather than using a citywide premium range." },
  { q: "How's tenant quality in Memphis cash-flow neighborhoods?", a: "Do not infer tenant performance from a neighborhood, voucher status, or operator reputation. Verify the lease, collected funds, delinquency and turnover history, apply lawful screening consistently, and use current local legal guidance rather than a fixed eviction timeline." },
  { q: "Is Memphis better than Detroit for cash flow?", a: "Neither city establishes a safer or higher-return outcome. Compare address-level rent, taxes, insurance, condition, title, vacancy, management, financing, and downside scenarios using the same methodology." },
];

export default function MemphisMarketPage() {
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
  const benchmark = getCapRateBenchmark("Memphis, TN");
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
        <div className="mb-2"><Link href="/" className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground">← TrueCap</Link></div>
        <header className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary mb-3"><MapPin className="size-3" />{CITY}, {STATE}</div>
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
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">Run a Memphis rental screen in 60 seconds with TrueCap. Address inputs can start with editable tax, HUD area-rent, and national mortgage benchmarks. Replace them with the parcel record, current rent comps, an insurance quote, and borrower-specific financing. Below: rough neighborhood <Link href="/glossary/cap-rate" className="font-semibold text-primary hover:underline">cap-rate</Link> orientation plus turnkey diligence questions.</p>
          <div className="mt-6 flex flex-wrap gap-3"><Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"><Calculator className="size-4" />Underwrite a Memphis deal — free</Link></div>
        </header>

        <section className="mb-10">
          <h2 className="text-2xl font-extrabold text-foreground mb-3">Memphis neighborhood cap-rate map (2026)</h2>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">Ranges are rough orientation, not appraisal-grade comps or achievable returns. Verify the address, condition, rent, expenses, management, and financing; independently diligence any turnkey operator and pricing.</p>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40"><tr className="text-left"><th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Submarket</th><th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cap rate</th><th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Rent</th><th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Character</th></tr></thead>
              <tbody>{NEIGHBORHOODS.map((n) => (<tr key={n.name} className="border-t border-border align-top"><td className="py-3 px-3 text-sm font-semibold text-foreground">{n.name}</td><td className="py-3 px-3 text-sm tabular-nums text-foreground">{n.capRange}</td><td className="py-3 px-3 text-sm tabular-nums text-muted-foreground">{n.rentRange}</td><td className="py-3 px-3 text-xs leading-relaxed text-muted-foreground">{n.notes}</td></tr>))}</tbody>
            </table>
          </div>
        </section>

        <section className="mb-10 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-5 sm:p-6">
          <h2 className="text-base font-extrabold uppercase tracking-widest text-[var(--brand-green)] mb-2">Why out-of-state investors screen Memphis</h2>
          <p className="text-sm leading-relaxed text-foreground">Memphis combines accessible inventory with an established property-management and turnkey ecosystem. That can simplify vendor discovery, but it does not make ownership passive or validate an operator&apos;s price, rehab, tenant, fees, or return projection. Compare providers and verify every property input independently.</p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-extrabold text-foreground mb-4">Frequently asked — Memphis investing</h2>
          <div className="space-y-4">{FAQS.map((f) => (<details key={f.q} className="group rounded-2xl border border-border bg-card p-4"><summary className="cursor-pointer text-sm font-bold text-foreground select-none list-none flex items-center justify-between gap-3"><span>{f.q}</span><span aria-hidden className="text-muted-foreground transition-transform group-open:rotate-90">▸</span></summary><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p></details>))}</div>
        </section>

        <section className="mb-10 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-xl sm:text-2xl font-extrabold mb-2">Run your next Memphis deal in 60 seconds</h2>
          <p className="text-sm sm:text-base opacity-90 mb-4 max-w-2xl">Paste the address to start with editable tax, HUD area-rent, and national rate benchmarks. Replace them with property- and borrower-specific evidence before relying on cap rate, CoC, <Link href="/glossary/dscr" className="font-semibold text-primary hover:underline">DSCR</Link>, or monthly cash flow. Free to start. No card required.</p>
          <Link href="/" className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity">Open the analyzer<ArrowUpRight className="w-4 h-4" /></Link>
        </section>

        <SourceMethodologyBox
          className="mt-10"
          sources={["HUD Fair Market Rent", "FRED 30-yr mortgage rate", "Tax Foundation (property tax)"]}
          updated="August 2026"
        />

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
