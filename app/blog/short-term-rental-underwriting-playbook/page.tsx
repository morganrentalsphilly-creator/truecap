/**
 * Strategy blog post — STR underwriting playbook 2026.
 *
 * Targets high-intent queries:
 *   - "short term rental underwriting"
 *   - "str underwriting"
 *   - "how to underwrite an airbnb"
 *   - "airbnb cash flow analysis"
 *   - "str cash flow model"
 *   - "short term rental analysis"
 *   - "airdna alternative"
 *   - "vacation rental investment analysis"
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Calculator } from "lucide-react";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "short-term-rental-underwriting-playbook";
const TITLE = "Short-term rental underwriting playbook: how to model an Airbnb in 2026";
const DESCRIPTION =
  "STR cash flow lives or dies on three numbers: ADR, occupancy, and operating expenses. Here&apos;s the full playbook for underwriting a short-term rental in 2026 — what data sources to use, what hidden costs everyone forgets, and how to stress-test for a bad off-season.";
const PUBLISHED_AT = "2026-06-07";
const MODIFIED_AT = "2026-06-07";
const READING_TIME_MIN = 14;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "short term rental underwriting",
    "str underwriting",
    "how to underwrite an airbnb",
    "airbnb cash flow analysis",
    "str cash flow model",
    "short term rental analysis",
    "airdna alternative",
    "vacation rental investment analysis",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `/blog/${SLUG}`,
    type: "article",
    publishedTime: PUBLISHED_AT,
    modifiedTime: MODIFIED_AT,
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/home.jpg"],
  },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "What's the most common mistake new STR investors make?",
    a: "Treating gross revenue as cash flow. AirDNA shows you the top of the funnel — projected gross — but STRs eat 30-50% of gross in operating expenses (cleaning, supplies, channel fees, dynamic pricing tools, lawn care, utilities, internet, hot tub maintenance, restocking, owner labor). New investors plug AirDNA gross into a long-term-rental spreadsheet that assumes 40% OpEx ratio and the deal looks great. Then year one comes in 20-30% below pro forma because the OpEx ratio for an STR is closer to 55-65%.",
  },
  {
    q: "Should I trust AirDNA's projections?",
    a: "AirDNA is the best single source we have, but the projections are most reliable for established markets with deep comp pools (Smoky Mountains, Destin, Joshua Tree) and least reliable for emerging markets or unusual properties. Always pull at least 5-8 comparable active listings yourself on Airbnb and VRBO, sort by review count to filter out new listings, and check 60-day-out availability calendars to triangulate occupancy. Treat AirDNA's Investor-tier projections as a useful midpoint, not the answer.",
  },
  {
    q: "How do I model occupancy realistically?",
    a: "Use a blended occupancy that accounts for seasonality. Pull the 12-month occupancy series for your top 5-10 comps, take the median, and underwrite to 85% of that. The 15% haircut covers (a) you're a new listing without reviews, (b) bookings cluster in peak months so off-season fills slower than the annual average suggests, and (c) cancellations and gap nights between bookings aren't fully captured in raw occupancy data.",
  },
  {
    q: "What's a realistic operating expense ratio for an STR?",
    a: "55-65% of gross revenue for self-managed; 65-80% for full-service property management. The full list: cleaning fees (often passed through but with shortfall risk), supplies and restocking ($30-80 per turnover), channel fees (Airbnb 14-16%, VRBO 8% plus service fee), dynamic pricing software ($20-50/mo), lawn/pool/hot tub service, utilities (always included for guests), internet and streaming, linens replacement, OTA listing photography refreshes, software, accounting, lodging tax remittance, repairs at 2-3x long-term rental rates.",
  },
  {
    q: "How should I stress-test an STR deal?",
    a: "Three scenarios at minimum: (a) Base case = blended ADR and occupancy from your comp set. (b) Bad year = ADR -10%, occupancy -15 percentage points, OpEx +10%. This is roughly what 2020 looked like in many markets. (c) Regulatory shock = STR conversion banned, you operate as a long-term rental at market rent. If the long-term-rental scenario doesn't break you, the deal is acceptable. If it produces a $3K/month loss you can't sustain for 18 months, walk.",
  },
  {
    q: "Are STR loans different from long-term rental loans?",
    a: "Mostly the same products with caveats. Conventional investment-property loans don't distinguish STR from LTR — they qualify on personal income. DSCR loans usually compute DSCR based on long-term market rent (not projected STR revenue), which can make qualification tougher. Some specialty DSCR lenders will use AirDNA-projected STR revenue at 70-80% haircut to compute DSCR — these are great if available but typically charge 0.5-1.0pp above standard DSCR. Bridge and hard money work for STR acquisitions when you need speed.",
  },
  {
    q: "What's the most under-appreciated cost in STR underwriting?",
    a: "Furnishing CapEx is the biggest. A 3-bedroom STR typically needs $25-50K of furniture, mattresses, kitchen kit, decor, smart locks, hot tub, outdoor furniture, and photography to launch competitively in 2026. Then plan on 15-20% of that annually in replacement (mattresses every 4-5 years, sofas every 5-7, kitchenware ongoing, linens annually). Spread over 7 years that's another $5-7K/year in true operating cost most pro formas don't include.",
  },
];

export default function BlogPost() {
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/blog/${SLUG}`;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${canonicalUrl}#article`,
    headline: TITLE,
    description: DESCRIPTION,
    datePublished: PUBLISHED_AT,
    dateModified: MODIFIED_AT,
    author: { "@type": "Person", name: "Morgan Page", url: siteUrl },
    publisher: { "@id": `${siteUrl}/#organization` },
    mainEntityOfPage: canonicalUrl,
    image: [`${siteUrl}/home.jpg`],
    inLanguage: "en-US",
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "TrueCap", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${siteUrl}/blog` },
      { "@type": "ListItem", position: 3, name: TITLE, item: canonicalUrl },
    ],
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <main id="main" className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="mb-8 sm:mb-10">
          <Link href="/blog" className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground">
            ← TrueCap Blog
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-2 leading-tight text-balance">
            {TITLE}
          </h1>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold mt-3">
            {new Date(PUBLISHED_AT).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}{" "}
            · {READING_TIME_MIN} min read
          </p>
          <p className="text-base sm:text-lg text-muted-foreground mt-4 leading-relaxed">
            STR cash flow lives or dies on three numbers: ADR, occupancy, and operating expenses. Here&apos;s the full playbook for underwriting a short-term rental in 2026 — what data sources to use, what hidden costs everyone forgets, and how to stress-test for a bad off-season.
          </p>
        </header>

        <article className="prose prose-slate max-w-none [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground [&_li]:leading-relaxed [&_strong]:text-foreground">
          <p>
            Short-term rentals look great on paper. A 3-bedroom mountain
            cabin renting for $300/night at 60% occupancy grosses
            ~$65K/year — far more than the $2,200/month ($26K/year) it
            would pull as a long-term rental. The math is so obviously
            better that thousands of investors entered the space between
            2020 and 2024 without running it carefully. Many of them are
            now distressed sellers.
          </p>
          <p>
            STRs aren&apos;t worse than long-term rentals — many produce
            2-3x the cash flow. But they hide costs and risks long-term-rental
            underwriting misses entirely. This post is the full playbook:
            what to model, where to get the data, what hidden costs
            everyone forgets, and how to stress-test for a bad year.
          </p>

          <h2 className="text-2xl sm:text-3xl">The three numbers that decide an STR</h2>
          <p>
            Every other input matters at the margin. These three decide
            whether the deal is profitable:
          </p>
          <ul>
            <li><strong>ADR</strong> (average daily rate) — what guests
              actually pay per night, blended across all seasons.</li>
            <li><strong>Occupancy</strong> — what percent of available
              nights are booked across the year.</li>
            <li><strong>Operating expense ratio</strong> — what percent
              of gross revenue gets eaten by costs (cleaning, supplies,
              utilities, channel fees, etc.).</li>
          </ul>
          <p>
            Gross revenue = ADR × Occupancy × 365. Net operating income =
            Gross × (1 − OpEx ratio). Cash flow = NOI − debt service.
            Everything else is detail.
          </p>

          <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
            <div className="text-sm sm:text-base font-mono">
              <span className="font-bold">Annual cash flow</span> = (ADR × Occ × 365 × (1 − OpEx%)) − Annual debt service
            </div>
          </div>

          <p>
            Worked example. Cabin at $300 ADR, 55% occupancy, 60% OpEx
            ratio, $4,200/mo PITI:
          </p>
          <ul>
            <li>Gross: $300 × 0.55 × 365 = <strong>$60,225</strong></li>
            <li>NOI: $60,225 × 0.40 = <strong>$24,090</strong></li>
            <li>Annual debt service: $4,200 × 12 = <strong>$50,400</strong></li>
            <li>Cash flow: $24,090 − $50,400 = <strong>−$26,310/year</strong></li>
          </ul>
          <p>
            That same deal pencils for an investor who got the OpEx ratio
            wrong: $300 × 0.55 × 365 × 0.65 = $39,146 NOI minus $50,400
            debt service = −$11,254/yr (still bad, but feels survivable).
            Move OpEx to 40% (long-term-rental thinking): $36,135 NOI
            − $50,400 = −$14,265/yr. Now imagine the bullish-version
            investor who assumes 70% occupancy: $300 × 0.70 × 365 ×
            0.65 = $49,820 NOI − $50,400 = −$580/yr — basically break
            even.
          </p>
          <p>
            Same property, four different conclusions, all driven by which
            of the three numbers you flex. That&apos;s why STR underwriting
            requires discipline.
          </p>

          <h2 className="text-2xl sm:text-3xl">Where to get ADR and occupancy data</h2>

          <h3>1. AirDNA — the institutional starting point</h3>
          <p>
            AirDNA scrapes Airbnb and VRBO and publishes market-level and
            property-level analytics. Their MarketMinder and Rentalizer
            tools give you projected ADR, occupancy, and revenue for a
            specific property address. Most institutional STR investors use
            it. It&apos;s the best single source — but treat it as a
            starting point, not the answer. Coverage is excellent in
            established STR markets and weaker in emerging ones.
          </p>

          <h3>2. Direct comp pulls from Airbnb and VRBO</h3>
          <p>
            This is the work AirDNA does, manually, for your specific
            property. Pull 5-10 active listings within a half-mile that
            match yours on bedrooms, hot tub, view, and standout amenities.
            For each:
          </p>
          <ul>
            <li>Read 60-day-out and 90-day-out availability calendars to
              gauge near-term booking pace.</li>
            <li>Sort by review count; ignore listings with under 20
              reviews (too new to calibrate against).</li>
            <li>Note the published nightly rate at peak, shoulder, and
              off-season weekends.</li>
            <li>Cross-check with VRBO — VRBO sometimes shows different
              calendars and pricing for the same property.</li>
          </ul>

          <h3>3. PriceLabs or Wheelhouse for granular pricing data</h3>
          <p>
            These dynamic pricing tools have access to real booked rate
            data (not just published rates). A free PriceLabs market
            dashboard gives you actual booked ADR by market and by bedroom
            count over the last 12 months — usually more honest than
            scraping published nightly rates.
          </p>

          <h3>4. The local property manager call</h3>
          <p>
            One 20-minute call with a local STR property manager is worth
            hours of data work. They&apos;ll tell you the real seasonality
            curve, what amenities are non-negotiable in this market, what
            new regulations are pending, and what the operating cost
            structure actually looks like. They&apos;ll pitch you on their
            management service afterward — pay it forward by considering
            them seriously even if you plan to self-manage.
          </p>

          <h2 className="text-2xl sm:text-3xl">The OpEx line items that get missed</h2>
          <p>
            STR OpEx is the single biggest source of pro-forma misses.
            Here&apos;s the full list of what runs through your P&amp;L
            every year — well beyond what a long-term rental has:
          </p>

          <h3>Pass-through costs (mostly recovered, with shortfall risk)</h3>
          <ul>
            <li><strong>Cleaning fees.</strong> Guests pay them, but if
              your cleaning fee is set below actual cost, you eat the gap
              on every turnover. Set the fee at 110% of actual cost.</li>
            <li><strong>Linens turnover.</strong> Sheets, towels, kitchen
              linens get used hard. Plan replacement every 12-18 months.</li>
          </ul>

          <h3>Variable costs (scale with bookings)</h3>
          <ul>
            <li><strong>Channel fees.</strong> Airbnb charges hosts 14-16%
              of gross. VRBO is 8% commission plus per-booking service fee.
              Direct bookings via your own site (Hostfully, Lodgify) cut
              this materially.</li>
            <li><strong>Supplies and restocking.</strong> $30-80 per
              turnover for coffee, paper goods, soap, hot tub chemicals.</li>
            <li><strong>Dynamic pricing software.</strong> PriceLabs $20-50/mo,
              Wheelhouse similar.</li>
            <li><strong>Channel manager / PMS.</strong> Hostfully, Hostaway,
              Guesty $40-100/mo or 1-2% of revenue.</li>
            <li><strong>Damage / overage.</strong> Even with deposits and
              guest insurance, 1-2% of revenue annually goes to damage
              you can&apos;t recover.</li>
          </ul>

          <h3>Fixed costs (don&apos;t scale with bookings)</h3>
          <ul>
            <li><strong>Utilities.</strong> You pay them all, year-round.
              Plan 2-3x long-term rental utility cost because guests run
              the AC at 65°F in August.</li>
            <li><strong>Internet, streaming subscriptions.</strong> $80-150/mo.</li>
            <li><strong>Lawn / pool / hot tub service.</strong> Weekly in
              season. $200-600/mo depending on amenity set.</li>
            <li><strong>Pest control.</strong> Monthly. $50-100/mo.</li>
            <li><strong>STR-specific insurance.</strong> 1.5-2.5x standard
              landlord policy. Proper / CBIZ / Steadily.</li>
            <li><strong>Permits, lodging tax remittance.</strong> Recurring
              annual cost plus ongoing compliance time.</li>
            <li><strong>Accounting / bookkeeping.</strong> STR P&amp;Ls are
              materially more complex than long-term rentals.</li>
          </ul>

          <h3>CapEx amortization (the silent killer)</h3>
          <p>
            A long-term rental needs a roof and an HVAC. An STR needs that
            plus: furniture replacement every 5-7 years, mattresses every
            4-5, decor refresh every 3-4 (Airbnb listings with dated photos
            convert poorly), kitchen equipment churn, photography refresh
            every 2-3 years, and bigger-ticket items like hot tubs that
            need replacement every 7-10 years.
          </p>
          <p>
            Add it up and a $35K furnishing package amortizes to ~$5K/year
            in true operating cost. Most pro formas put 0 here.
          </p>

          <h2 className="text-2xl sm:text-3xl">Modeling seasonality properly</h2>
          <p>
            STRs don&apos;t book evenly across the year. A Smoky Mountains
            cabin might do 85% occupancy June-August and 25% February-March.
            Modeling with a flat 55% blended occupancy hides cash flow
            timing risk — you might have months where revenue doesn&apos;t
            cover the mortgage and you&apos;re burning operating reserves.
          </p>
          <p>
            Better approach: pull monthly occupancy and ADR from your comps,
            build a 12-month grid, and look at the worst three months. Make
            sure you have at least 6 months of debt service in operating
            reserves to absorb that off-season cycle. Tighter than that
            and one bad winter sinks you.
          </p>

          <h2 className="text-2xl sm:text-3xl">The three-scenario stress test</h2>
          <p>
            Before signing the contract, run three scenarios. They take 10
            minutes and save deals.
          </p>

          <h3>Scenario 1: Base case</h3>
          <p>
            Your blended ADR and occupancy from the comp set. OpEx ratio
            from the line-item buildup above (usually 55-65% for
            self-managed, 65-80% for full-service PM). This is the deal
            you&apos;re actually buying.
          </p>

          <h3>Scenario 2: Bad year</h3>
          <p>
            ADR −10%, occupancy −15 percentage points, OpEx +10%. This is
            roughly what 2020 looked like in many markets, what a
            recession looks like in discretionary-travel markets, and what
            year 1 looks like for a new listing competing against
            established hosts.
          </p>

          <h3>Scenario 3: Regulatory shock</h3>
          <p>
            STR conversion banned overnight. You operate as a long-term
            rental at market rent. If the long-term scenario at market
            rent produces a survivable cash flow (break-even or modestly
            negative you can absorb), the deal is acceptable. If it
            produces a $3K+/month bleed you can&apos;t sustain for 18
            months while you sell, walk.
          </p>

          <h2 className="text-2xl sm:text-3xl">Markets with regulatory risk to watch in 2026</h2>
          <p>
            STR regulation has tightened dramatically since 2022. As of
            mid-2026, the markets with the most active regulatory pressure
            include: New York City (effectively banned at scale), most of
            New Orleans, parts of Honolulu and Maui, Palm Springs (cap on
            new permits), most of Vermont (escalating town-by-town caps),
            and Dallas (residential STR ban litigated then largely upheld).
            Several Tennessee and Florida vacation markets have moved from
            unregulated to permit-required.
          </p>
          <p>
            None of this disqualifies a market. It just means your
            regulatory-shock scenario (#3 above) needs to be real. If the
            long-term-rental cash flow doesn&apos;t survive, you&apos;re
            taking concentrated regulatory risk you may not be pricing in.
          </p>

          <h2 className="text-2xl sm:text-3xl">When STR underwriting is worth it</h2>
          <p>STRs make sense for investors who:</p>
          <ul>
            <li>Have 6+ months of operating reserves and stable W-2 or
              business income to absorb a bad year.</li>
            <li>Are buying in markets with strong long-term rental demand
              as the floor.</li>
            <li>Want active income economics (acceptable hands-on time or
              willingness to pay 20-25% for full-service PM).</li>
            <li>Have specific local market knowledge or a property manager
              relationship that gives them edge.</li>
          </ul>
          <p>
            STRs are <em>not</em> the right play for investors who want
            mailbox money, who only have 3 months of reserves, who plan to
            self-manage from across the country, or who are using the STR
            cash flow to qualify for further borrowing. Those use cases
            want a long-term rental in a stable market.
          </p>

          <div className="not-prose">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-bold hover:opacity-95 transition-opacity"
            >
              <Calculator className="w-4 h-4" />
              Underwrite an STR deal
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          <p className="text-sm text-muted-foreground mt-6">
            Related reading: <Link href="/blog/best-short-term-rental-analysis-tool-2026" className="text-primary font-semibold hover:underline">Best short-term rental analysis tool 2026</Link>, <Link href="/vs/airdna" className="text-primary font-semibold hover:underline">TrueCap vs AirDNA</Link>, <Link href="/blog/how-to-underwrite-a-rental-property-in-60-seconds" className="text-primary font-semibold hover:underline">How to underwrite a rental in 60 seconds</Link>.
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

        <RelatedBlogPosts currentSlug={SLUG} />
        <div className="max-w-3xl mx-auto px-4 sm:px-6"><NewsletterSignup variant="expanded" source="blog" /></div>

        <footer className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Modeling an STR deal? TrueCap lets you toggle between long-term
            and short-term assumptions, run sensitivity grids on ADR and
            occupancy, and stress-test for a bad off-season — all in one
            place.{" "}
            <Link href="/" className="font-bold text-foreground hover:underline">
              Open the analyzer →
            </Link>
          </p>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
      <BlogStickyCta />
    </div>
  );
}
