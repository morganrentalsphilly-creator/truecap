/**
 * /markets/detroit — Detroit, MI rental market landing page.
 *
 * Detroit is the most-discussed and most-misunderstood US cash-flow
 * market. Genuine 15%+ cap rate deals exist; so do total losses on
 * properties bought sight-unseen by out-of-state investors with bad
 * PMs. This page is honest about both sides.
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

const CITY = "Detroit";
const STATE = "MI";
const SLUG = "detroit";
const TITLE = "Detroit rental property analysis — calculator + 2026 cap-rate benchmarks";
const DESCRIPTION =
  "Run a Detroit rental deal in 60 seconds. Auto-fills MI property tax (~1.7%), HUD rent for Wayne/Oakland/Macomb counties, current rates. Plus the honest take on Detroit cap rates + neighborhood-by-neighborhood risk map.";
const PUBLISHED_AT = "2026-05-24";
const MODIFIED_AT = "2026-06-01";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "detroit rental property analysis",
    "detroit cap rate",
    "detroit rental property calculator",
    "detroit investment property",
    "detroit brrrr",
    "michigan rental property",
  ],
  alternates: { canonical: `/markets/${SLUG}` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `/markets/${SLUG}`, type: "website", images: [{ url: "/home.jpg", width: 1200, height: 630, alt: `TrueCap ${CITY} rental analysis` }] },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const NEIGHBORHOODS: { name: string; capRange: string; rentRange: string; notes: string }[] = [
  { name: "Downtown / Midtown / Corktown", capRange: "4-6%", rentRange: "$1,400-2,400", notes: "Gentrified urban core, condo + loft mix, appreciation-leaning" },
  { name: "Indian Village / West Village", capRange: "5-7%", rentRange: "$1,300-2,000", notes: "Historic SFR, stable upper-middle tenant base" },
  { name: "Bagley / Rosedale / Sherwood Forest", capRange: "6-9%", rentRange: "$1,000-1,500", notes: "Stable Northwest Detroit, working-class to middle-class" },
  { name: "East English Village / Morningside", capRange: "8-11%", rentRange: "$900-1,300", notes: "Solid East side cash-flow, manageable due diligence" },
  { name: "Brightmoor / Conant Gardens", capRange: "12-18%", rentRange: "$700-1,100", notes: "Classic Detroit BRRRR territory; significant tenant + capex risk" },
  { name: "Hamtramck (Wayne County enclave)", capRange: "7-9%", rentRange: "$900-1,300", notes: "Dense multi-family, immigrant communities, stable demand" },
  { name: "Far East / Far West blocks", capRange: "15%+", rentRange: "$600-1,000", notes: "Highest cap territory; only viable with on-the-ground PM + property scouting" },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "Are Detroit's 15%+ cap rates real?",
    a: "Yes — and also misleading. The headline cap-rate math (rent / price) on a $40k Brightmoor SFR pulling $850/mo rent is real. What it misses: vacancy on Far East/West blocks can hit 25-30% with the wrong tenant screening, capex on 80-100 year-old housing stock is brutal (roof + plumbing + electric upgrades can equal the purchase price), and lead paint compliance adds $5-15k of upfront work on many properties. The investors who actually capture 15% net are local, hands-on, with their own crews. Out-of-state buyers with bad PMs often net 0-5% or lose money on these deals.",
  },
  {
    q: "What's the property tax rate in Detroit?",
    a: "Michigan effective property tax is ~1.5-1.8% statewide. Detroit-municipality properties run higher (~1.7-2.2%) because of school + city millage stacks. Property tax assessments in Detroit have been litigated extensively in recent years — many older properties were over-assessed for years, and ongoing court cases may produce future refunds for affected owners. Always pull the current tax bill from the Wayne County Treasurer for the specific parcel.",
  },
  {
    q: "Should I buy in Detroit as an out-of-state investor?",
    a: "Only if you've done one of: (a) flown out to walk neighborhoods in person before committing, (b) hired a local mentor/scout with skin in the game, or (c) committed to buying through an established turnkey provider with a 1+ year track record and references. Buying random Far East/West cash-flow lottery tickets sight-unseen via Facebook groups is the most common way to lose money in real estate. The Northwest Detroit neighborhoods (Bagley, Rosedale, Sherwood Forest) and East English Village are the most forgiving for first-time out-of-state investors.",
  },
  {
    q: "Is Detroit a real BRRRR market in 2026?",
    a: "Yes — for the right operator. Brightmoor + Conant Gardens + parts of the East side still have $30-70k acquisition prices for distressed SFR, $25-45k typical rehab budgets, and post-rehab ARVs in the $110-160k range. Refi at 75% LTV pulls back most or all of the cash. The catch: rehab estimating in Detroit is notoriously hard (foundation/electrical/plumbing surprises are routine), and lead paint compliance ($5-15k per property in many cases) is often not in initial budgets. Build a 30-40% contingency on rehab and the math gets honest.",
  },
  {
    q: "What about the Detroit population trend?",
    a: "Detroit's population decline (down 60%+ from 1950 peak) has stabilized in the last 5-10 years; some submarkets are growing modestly. But the city is still much sparser than its housing stock implies — that's the source of both the cheap entry prices and the high vacancy risk. Stable employment hubs (Henry Ford Hospital, GM HQ, Wayne State, Quicken/Rocket) anchor demand in the core; outer neighborhoods are more variable.",
  },
  {
    q: "What's the best Detroit submarket for first-time investors?",
    a: "Bagley, Rosedale, Sherwood Forest, and Grandmont (Northwest Detroit) — 6-9% cap rates, working-class to middle-class tenants, mostly 1940s-60s SFR (built decades after the Brightmoor stock), much lower capex surprise risk. Suburbs like Ferndale and Royal Oak are appreciation plays (5-7% cap) closer to coastal-market dynamics. East English Village is the East side analog to NW Detroit — solid blocks with manageable risk.",
  },
];

export default function DetroitMarketPage() {
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/markets/${SLUG}`;
  // Strategy-fit badge — a label over the market's median cap rate.
  const benchmark = getCapRateBenchmark("Detroit, MI");
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
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">Run a Detroit rental deal in 60 seconds with TrueCap. Address auto-fills <Link href="/states/michigan" className="font-semibold text-primary hover:underline">Michigan property tax</Link> (~1.7% in Detroit proper), HUD rent by Wayne/Oakland/Macomb county, and current FRED mortgage rates. Below: the honest take on Detroit <Link href="/glossary/cap-rate" className="font-semibold text-primary hover:underline">cap rates</Link> plus neighborhood-by-neighborhood risk.</p>
          <div className="mt-6 flex flex-wrap gap-3"><Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"><Calculator className="size-4" />Underwrite a Detroit deal — free</Link></div>
        </header>

        <section className="mb-10">
          <h2 className="text-2xl font-extrabold text-foreground mb-3">Detroit neighborhood cap-rate map (2026)</h2>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">Ranges below reflect typical conventional-financing single-family + small-multi deals. Detroit&apos;s spread is the widest of any major US market — from 4-6% in gentrified Downtown to 15%+ in the most distressed blocks. The high-cap numbers are real; the operational risk to capture them is also real.</p>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40"><tr className="text-left"><th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Submarket</th><th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cap rate</th><th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Rent</th><th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Character</th></tr></thead>
              <tbody>{NEIGHBORHOODS.map((n) => (<tr key={n.name} className="border-t border-border align-top"><td className="py-3 px-3 text-sm font-semibold text-foreground">{n.name}</td><td className="py-3 px-3 text-sm tabular-nums text-foreground">{n.capRange}</td><td className="py-3 px-3 text-sm tabular-nums text-muted-foreground">{n.rentRange}</td><td className="py-3 px-3 text-xs leading-relaxed text-muted-foreground">{n.notes}</td></tr>))}</tbody>
            </table>
          </div>
        </section>

        <section className="mb-10 rounded-2xl border border-[var(--brand-orange)]/25 bg-[var(--brand-orange-light)] p-5 sm:p-6">
          <h2 className="text-base font-extrabold uppercase tracking-widest text-[var(--brand-orange)] mb-2">The honest Detroit warning</h2>
          <p className="text-sm leading-relaxed text-foreground">Detroit is the market where out-of-state investors lose the most money in US real estate. The 15%+ headline caps are mathematically real but operationally hard to capture — they assume you can collect rent, fix <Link href="/glossary/capex" className="font-semibold text-primary hover:underline">capex</Link> surprises, and screen tenants in neighborhoods you&apos;ve never set foot in. Stick to Northwest Detroit (Bagley, Rosedale, Sherwood Forest, Grandmont) or East English Village for first-time out-of-state deals. Save the 15% Brightmoor / Far East blocks for after you have local relationships.</p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-extrabold text-foreground mb-4">Frequently asked — Detroit investing</h2>
          <div className="space-y-4">{FAQS.map((f) => (<details key={f.q} className="group rounded-2xl border border-border bg-card p-4"><summary className="cursor-pointer text-sm font-bold text-foreground select-none list-none flex items-center justify-between gap-3"><span>{f.q}</span><span aria-hidden className="text-muted-foreground transition-transform group-open:rotate-90">▸</span></summary><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p></details>))}</div>
        </section>

        <section className="mb-10 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-xl sm:text-2xl font-extrabold mb-2">Run your next Detroit deal in 60 seconds</h2>
          <p className="text-sm sm:text-base opacity-90 mb-4 max-w-2xl">Paste the address. Michigan tax, HUD rent for the right county, and current rate auto-fill. Cap rate, CoC, <Link href="/glossary/dscr" className="font-semibold text-primary hover:underline">DSCR</Link>, and monthly cash flow in 1 second. Free to start. No card required.</p>
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
          <Link href="/markets/indianapolis" className="font-bold text-foreground hover:underline">Indianapolis</Link>{" "}·{" "}
          <Link href="/markets/kansas-city" className="font-bold text-foreground hover:underline">Kansas City</Link>{" "}·{" "}
          <Link href="/markets/memphis" className="font-bold text-foreground hover:underline">Memphis</Link>{" "}·{" "}
          <Link href="/markets/phoenix" className="font-bold text-foreground hover:underline">Phoenix</Link>{" "}·{" "}
          <Link href="/markets/dallas" className="font-bold text-foreground hover:underline">Dallas</Link>{" "}·{" "}
          <Link href="/markets/atlanta" className="font-bold text-foreground hover:underline">Atlanta</Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
