/**
 * /markets/philadelphia — local-SEO landing page.
 *
 * Target queries:
 *   - "philadelphia rental property analysis"
 *   - "philadelphia cap rate"
 *   - "philadelphia rental property calculator"
 *   - "philadelphia investment property"
 *   - "philly real estate analyzer"
 *
 * Strategy: substantive market-specific content (cap rate benchmarks,
 * PA property tax rate, neighborhood rent ranges, FAQ) so the page
 * has real SEO weight — not a thin landing page. Prototype for the
 * other markets we'll add later if this performs.
 *
 * Why Philadelphia first: it's Morgan's home market, the content can
 * be more grounded + specific than for markets we don't know well.
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

const CITY = "Philadelphia";
const STATE = "PA";
const SLUG = "philadelphia";
const TITLE = "Philadelphia Rental Market Analysis 2026";
const DESCRIPTION =
  "2026 cap-rate benchmarks by Philly neighborhood. Run a Philadelphia rental in 60 seconds — city property tax (1.49%) and HUD rent auto-filled.";
const PUBLISHED_AT = "2026-05-24";
const MODIFIED_AT = "2026-06-01";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "philadelphia rental property analysis",
    "philadelphia cap rate",
    "philadelphia rental property calculator",
    "philadelphia investment property",
    "philly real estate calculator",
    "philadelphia cash flow",
    "philadelphia property tax",
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
  { name: "Fishtown / Kensington", capRange: "5-7%", rentRange: "$1,400-2,200", notes: "Gentrifying, strong appreciation last 10 years; new-construction premiums" },
  { name: "South Philly (Passyunk / Pennsport)", capRange: "5-7%", rentRange: "$1,500-2,400", notes: "Stable, walkable, mix of row-home + condo" },
  { name: "Brewerytown / Strawberry Mansion", capRange: "7-10%", rentRange: "$1,100-1,700", notes: "Higher cap, higher operational complexity" },
  { name: "West Philly (University City / Powelton)", capRange: "5-7%", rentRange: "$1,400-2,100", notes: "Strong student-rental demand near Penn / Drexel" },
  { name: "Northwest (Manayunk / Roxborough)", capRange: "5-6%", rentRange: "$1,500-2,300", notes: "Appreciation-leaning, lower vacancy" },
  { name: "Northeast (Mayfair / Tacony)", capRange: "6-8%", rentRange: "$1,200-1,800", notes: "Solid cash-flow market, working-class tenant base" },
  { name: "Olney / Logan / Frankford", capRange: "8-12%", rentRange: "$900-1,500", notes: "High-cap territory; scrutinize tenant quality + capex" },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "What's a typical cap rate for Philadelphia rentals?",
    a: "Philadelphia cap rates in 2026 range from 5-7% in gentrifying / stable neighborhoods (Fishtown, South Philly, Passyunk, Manayunk) to 7-10% in cash-flow neighborhoods (Brewerytown, Mayfair, parts of Northeast Philly) and 10%+ in distressed / heavy-rehab territory (parts of North Philly, Olney). The city-wide average for single-family + 2-4 unit rentals is roughly 6-7%.",
  },
  {
    q: "What's the property tax rate in Philadelphia?",
    a: "Philadelphia's effective property tax rate is roughly 1.49% of assessed value (8.264 mills / 1000 + 0.6317% school tax + various). TrueCap auto-fills this rate when you enter a PA address. Actual tax bills vary based on the OPA (Office of Property Assessment) market value of the specific property — always confirm with the assessor for the address.",
  },
  {
    q: "Is Philadelphia good for cash flow or appreciation?",
    a: "Both, depending on neighborhood. Center City + close-in gentrifying neighborhoods (Fishtown, Northern Liberties, Graduate Hospital) lean appreciation. Northeast Philly, parts of West Philly, and historically cash-flow neighborhoods like Brewerytown and Olney offer 7%+ cap rates. The hybrid sweet spot — 6% cap + 3% appreciation — exists in solid working-class neighborhoods like Mayfair, Tacony, and parts of South Philly.",
  },
  {
    q: "What rent should I charge in Philadelphia?",
    a: "TrueCap auto-fills HUD Fair Market Rent for Philadelphia County (the metro is part of the Philadelphia-Camden-Wilmington MSA for HUD purposes) by bedroom count. Long-term market rent in most Philly neighborhoods runs at or slightly above HUD FMR. Cross-check with Zillow + Rentometer for the specific address. Section 8 voucher properties typically rent right at FMR.",
  },
  {
    q: "What about the BRRRR strategy in Philadelphia?",
    a: "Philly is one of the best BRRRR markets in the country because of the abundance of distressed 2-3 unit row homes priced $80-180k with realistic ARVs in the $180-280k range after a $40-80k rehab. The math works particularly well in transitioning neighborhoods (West Kensington, parts of North Philly, Strawberry Mansion). Caveats: permit timelines can be long, and L&I (Licenses & Inspections) is unpredictable — budget extra holding cost.",
  },
  {
    q: "Do I need any special Philadelphia-specific licenses to rent out a property?",
    a: "Yes. Philadelphia requires a Rental License (~$60/year per unit) and a separate Activity License. Single-family rentals also require a Lead Safe Certificate if built before 1978 (which most Philly row homes were). Budget $200-400 in initial certifications. None of this changes the underwriting math but it's real operational friction worth knowing about.",
  },
];

export default function PhiladelphiaMarketPage() {
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
  const benchmark = getCapRateBenchmark("Philadelphia, PA");
  const fit = benchmark ? marketStrategyFit(benchmark.median) : null;
  const fitToneClass =
    fit?.tone === "cashflow"
      ? "bg-[var(--brand-green-light)] text-[var(--brand-green)]"
      : fit?.tone === "appreciation"
        ? "bg-[var(--brand-blue-light)] text-primary"
        : "bg-muted text-foreground";

  // Schema: a Place-augmented WebPage targeting the city specifically.
  // Plus FAQPage for the FAQ section.
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

        {/* Hero */}
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
            {CITY} rental property analysis — calculator + 2026 benchmarks
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Run a Philly rental in 60 seconds. TrueCap auto-fills the PA
            property tax rate (~1.49%), HUD market rent by bedroom count,
            and current 30-yr fixed mortgage rate. Plus 2026 cap-rate
            benchmarks by neighborhood below.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="group inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(0,112,196,0.28)] transition-transform hover:-translate-y-0.5"
            >
              <Calculator className="size-4" />
              Analyze a Philly deal — free
              <ArrowUpRight className="size-4" />
            </Link>
            <Link
              href="/tools/cap-rate-calculator"
              className="inline-flex h-12 items-center gap-1.5 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Standalone cap rate calculator
            </Link>
          </div>
        </header>

        <article className="prose prose-slate max-w-none [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground [&_li]:leading-relaxed [&_strong]:text-foreground">

          <h2 className="text-2xl sm:text-3xl">Philadelphia cap rate benchmarks by neighborhood</h2>
          <p>
            Philly is one of the more cap-rate-diverse major U.S. metros
            — yields range from low-5% in coastal-feel gentrifying
            neighborhoods to 10%+ in distressed-but-recovering blocks
            within a 15-minute drive. Pick the right neighborhood and
            the deal pencils with positive leverage; pick the wrong one
            and you&apos;re fighting{" "}
            <Link href="/glossary/vacancy" className="font-semibold text-primary hover:underline">vacancy</Link>{" "}
            +{" "}
            <Link href="/glossary/capex" className="font-semibold text-primary hover:underline">capex</Link>{" "}
            you didn&apos;t underwrite for.
          </p>

          <div className="not-prose mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left p-3 font-bold text-foreground">Neighborhood</th>
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
            <em>2026 estimates from MLS-derived medians + Philadelphia
            OPA assessment data + active TrueCap user analyses. Single
            neighborhood ranges can vary substantially — these are
            rough orientation, not appraisal-grade comps.</em>
          </p>

          <h2 className="text-2xl sm:text-3xl">Philadelphia-specific underwriting notes</h2>

          <h3>Property tax: 1.49% effective + the Homestead Exemption</h3>
          <p>
            Philadelphia{" "}
            <Link href="/glossary/property-tax" className="font-semibold text-primary hover:underline">property tax</Link>{" "}
            is based on 100% of the OPA
            (Office of Property Assessment) market value × 1.3998%
            combined rate, and is one of the higher rates across{" "}
            <Link href="/states/pennsylvania" className="font-semibold text-primary hover:underline">Pennsylvania</Link>.
            Effective rate runs ~1.49% of fair market
            value once you account for assessment lag + actual sales
            prices. Owner-occupied properties qualify for the Homestead
            Exemption ($80,000 off assessed value) — doesn&apos;t help
            on a pure rental but DOES help on a house-hack where
            you&apos;ll live in one unit.
          </p>

          <h3>Permits + L&amp;I</h3>
          <p>
            Philadelphia&apos;s L&amp;I (Licenses &amp; Inspections) is
            famously slow + unpredictable. For BRRRR / flip
            underwriting, budget an extra 30-90 days of holding cost vs
            other markets to absorb permit delays + inspection
            rejections. The single biggest unforced error new Philly
            flippers make is underbudgeting holding cost.
          </p>

          <h3>Rental License + lead certification</h3>
          <p>
            Every rental unit in Philadelphia requires a Rental License
            (~$60/year per unit) + Activity License. Pre-1978 buildings
            — most Philly row homes — also require a Lead Safe
            Certificate. Initial setup typically $200-400; ongoing $60+
            per unit annually. Real but small operational friction —
            doesn&apos;t change underwriting math, just know about it.
          </p>

          <h3>Section 8 + voucher rents</h3>
          <p>
            Philly has a deep Section 8 market. Voucher payment
            standards from the Philadelphia Housing Authority are set
            at HUD FMR. Many cash-flow-heavy neighborhoods (Olney,
            Logan, parts of North Philly) lean heavily on voucher
            tenants. Pros: guaranteed rent + automatic renewals. Cons:
            longer move-in inspections, tighter PHA standards on
            property condition.
          </p>

          <h2 className="text-2xl sm:text-3xl">BRRRR in Philadelphia</h2>
          <p>
            Philadelphia is arguably one of the top BRRRR markets in
            the U.S. right now. The reason: abundant distressed
            2-3 unit row homes in transitioning neighborhoods, priced
            $80-180k with realistic ARVs of $180-280k after $40-80k of
            renovation. The classic BRRRR loop — buy distressed, rehab,
            refi at 75% of ARV — works cleanly when the spread between
            purchase + rehab and ARV is large enough.
          </p>
          <p>
            Best Philly BRRRR neighborhoods in 2026: West Kensington
            (still gentrifying, prices not fully priced in), parts of
            North Philly along the Broad St / Temple corridor,
            Strawberry Mansion / Brewerytown overlap, and parts of
            Tioga. Avoid blocks with active L&amp;I violations or
            heavy crime data; the rehab math works but the post-rehab
            rent + appreciation thesis doesn&apos;t.
          </p>
          <p>
            <Link href="/tools/brrrr-calculator" className="text-primary font-semibold hover:underline">
              Model a Philly BRRRR →
            </Link>
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
            Run your next Philly deal in 60 seconds.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-4">
            Address autocomplete is restricted to U.S. results. Paste a
            Philadelphia address and TrueCap auto-fills the PA property
            tax rate, HUD market rent for your county + bedroom count,
            and current mortgage rates.
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
          More markets coming. Want us to add yours?{" "}
          <a href="mailto:hello@usetruecap.com" className="font-bold text-foreground hover:underline">
            hello@usetruecap.com
          </a>
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
