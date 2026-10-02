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
import { BlogByline } from "@/components/marketing/blog-byline";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { RelatedContent } from "@/components/marketing/related-content";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";
import { Header } from "@/components/investcalc/header";
import { lastmodFor } from "@/lib/seo/lastmod";
import { JsonLd } from "@/components/seo/json-ld";
import { PostSources } from "@/components/blog/post-sources";

const SLUG = "short-term-rental-underwriting-playbook";
const TITLE =
  "Short-term rental underwriting playbook: how to model an Airbnb in 2026";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Short-term rental underwriting playbook (2026)";
const DESCRIPTION =
  "How to underwrite a short-term rental: ADR, occupancy, operating expenses, the hidden costs everyone forgets, and how to stress-test a bad off-season.";
const PUBLISHED_AT = "2026-06-07";
const MODIFIED_AT = lastmodFor("/blog/short-term-rental-underwriting-playbook") ?? PUBLISHED_AT;
const READING_TIME_MIN = 14;

export const metadata: Metadata = {
  title: SERP_TITLE,
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
    title: SERP_TITLE,
    description: DESCRIPTION,
    url: `/blog/${SLUG}`,
    type: "article",
    publishedTime: PUBLISHED_AT,
    modifiedTime: MODIFIED_AT,
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: SERP_TITLE,
    description: DESCRIPTION,
    images: ["/home.jpg"],
  },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "What's the most common mistake new STR investors make?",
    a: "Treating gross revenue as cash flow. AirDNA shows you the top of the funnel — projected gross — but a long list of operating expenses comes out of that gross (cleaning, supplies, channel fees, dynamic pricing tools, lawn care, utilities, internet, hot tub maintenance, restocking, owner labor). New investors plug AirDNA gross into a long-term-rental spreadsheet that assumes 40% OpEx ratio and the deal looks great. Then year one comes in below pro forma because the STR's real operating costs were never itemized.",
  },
  {
    q: "Should I trust AirDNA's projections?",
    a: "AirDNA is the best single source we have, but treat its projections as a starting point. Always pull at least 5-8 comparable active listings yourself on Airbnb and VRBO, sort by review count to filter out new listings, and check 60-day-out availability calendars to triangulate occupancy. Treat AirDNA's projections as a useful midpoint, not the answer.",
  },
  {
    q: "How do I model occupancy realistically?",
    a: "Use a blended occupancy that accounts for seasonality. Pull the 12-month occupancy series for your top 5-10 comps, take the median, and then discount it for (a) being a new listing without reviews, (b) bookings clustering in peak months, so the off-season fills slower than the annual average suggests, and (c) cancellations and gap nights between bookings that raw occupancy data doesn't fully capture. Size that discount from your comps' evidence and disclose it, rather than applying a universal haircut.",
  },
  {
    q: "What's a realistic operating expense ratio for an STR?",
    a: "It varies by property, market and management model; build it line by line from the list below rather than assuming a ratio. The full list: cleaning fees (often passed through but with shortfall risk), supplies and restocking (priced per turnover from your own supplier quotes), channel fees (each platform publishes its host fee; check the current rate before you model it), dynamic pricing software (check each vendor's current pricing), lawn/pool/hot tub service, utilities (always included for guests), internet and streaming, linens replacement, OTA listing photography refreshes, software, accounting, lodging tax remittance, repairs (budget from the property's condition and local contractor quotes).",
  },
  {
    q: "How should I stress-test an STR deal?",
    a: "Build a reviewed base case from relevant dated comps, one or more adverse revenue/cost cases tied to observed local volatility, and a lawful fallback-use case if one exists. Disclose each change rather than applying a universal haircut. Compare the cash needs with your actual capacity and verify regulations, insurance, financing, taxes, and property restrictions. No scenario output makes the deal acceptable or tells you to walk.",
  },
  {
    q: "Are STR loans different from long-term rental loans?",
    a: "Mostly the same products with caveats. Conventional loans can count short-term rental income on one-unit investment properties, but under their own documentation rules — Fannie Mae's Selling Guide has a separate section for short-term rental income from the subject property — so ask the lender how STR income will be documented. DSCR lenders differ on whether they use long-term market rent or short-term rental history to compute DSCR; ask each lender which income it will count. Some lenders may count projected STR revenue toward DSCR; ask how they discount it and how it affects pricing, and compare written quotes. Bridge and hard money work for STR acquisitions when you need speed.",
  },
  {
    q: "What's the most under-appreciated cost in STR underwriting?",
    a: "Furnishing CapEx is the biggest. A 3-bedroom STR needs a full furnishing package (furniture, mattresses, kitchen kit, decor, smart locks, outdoor furniture, photography); price it from real quotes. Then budget an annual replacement reserve: divide the package cost by the years you expect it to last and treat that as an operating cost.",
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
    author: { "@type": "Organization", "@id": `${siteUrl}/#organization`, name: "TrueCap", url: siteUrl },
    publisher: { "@id": `${siteUrl}/#organization` },
    mainEntityOfPage: canonicalUrl,
    image: [`${siteUrl}/home.jpg`],
    inLanguage: "en-US",
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "TrueCap",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${siteUrl}/blog`,
      },
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
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={articleLd} />
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={faqLd} />

      <main id="main" className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="mb-8 sm:mb-10">
          <Link
            href="/blog"
            className="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground"
          >
            ← Blog
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-2 leading-tight text-balance">
            {TITLE}
          </h1>
          <p className="text-2xs uppercase tracking-widest text-muted-foreground font-bold mt-3">
            {new Date(PUBLISHED_AT).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}{" "}
            · {READING_TIME_MIN} min read
          </p>
          <BlogByline />
          <p className="text-base sm:text-lg text-muted-foreground mt-4 leading-relaxed">
            STR cash flow lives or dies on three numbers: ADR, occupancy, and
            operating expenses. Here&apos;s the full playbook for underwriting a
            short-term rental in 2026 — what data sources to use, what hidden
            costs everyone forgets, and how to stress-test for a bad off-season.
          </p>
        </header>

        <article className="prose prose-slate max-w-none [&>p]:max-w-[68ch] [&>ul]:max-w-[68ch] [&>ol]:max-w-[68ch] [&>blockquote]:max-w-[68ch] [&>h2]:max-w-[68ch] [&>h3]:max-w-[68ch] [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground [&_li]:leading-relaxed [&_strong]:text-foreground">
          <p>
            Short-term rentals look great on paper. A 3-bedroom mountain cabin
            renting for $300/night at 60% occupancy grosses ~$65K/year — far
            more than the $2,200/month ($26K/year) it would pull as a long-term
            rental. The math looks so obviously better that it&apos;s tempting
            to skip running it carefully.
          </p>
          <p>
            STRs aren&apos;t worse than long-term rentals — some produce more
            cash flow — but they hide costs and risks long-term-rental
            underwriting misses entirely. This post is the full playbook: what
            to model, where to get the data, what hidden costs everyone forgets,
            and how to stress-test for a bad year.
          </p>

          <h2 className="text-2xl sm:text-3xl">
            The three numbers that decide an STR
          </h2>
          <p>
            Every other input matters at the margin. These three decide whether
            the deal is profitable:
          </p>
          <ul>
            <li>
              <strong>ADR</strong> (average daily rate) — what guests actually
              pay per night, blended across all seasons.
            </li>
            <li>
              <strong>Occupancy</strong> — what percent of available nights are
              booked across the year.
            </li>
            <li>
              <strong>Operating expense ratio</strong> — what percent of gross
              revenue gets eaten by costs (cleaning, supplies, utilities,
              channel fees, etc.).
            </li>
          </ul>
          <p>
            Gross revenue = ADR × Occupancy × 365. Net operating income = Gross
            × (1 − OpEx ratio). Cash flow = NOI − debt service. Everything else
            is detail.
          </p>

          <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
            <div className="text-sm sm:text-base font-mono">
              <span className="font-bold">Annual cash flow</span> = (ADR × Occ ×
              365 × (1 − OpEx%)) − Annual debt service
            </div>
          </div>

          <p>
            Worked example. Cabin at $300 ADR, 55% occupancy, an assumed 60%
            OpEx ratio, $4,200/mo PITI:
          </p>
          <ul>
            <li>
              Gross: $300 × 0.55 × 365 = <strong>$60,225</strong>
            </li>
            <li>
              NOI: $60,225 × 0.40 = <strong>$24,090</strong>
            </li>
            <li>
              Annual debt service: $4,200 × 12 = <strong>$50,400</strong>
            </li>
            <li>
              Cash flow: $24,090 − $50,400 = <strong>−$26,310/year</strong>
            </li>
          </ul>
          <p>
            That same deal looks different to an investor who borrows a
            long-term-rental OpEx ratio of 40%: $300 × 0.55 × 365 × 0.60 =
            $36,135 NOI − $50,400 = −$14,265/yr. Shave OpEx to 35% and it&apos;s
            $39,146 NOI minus $50,400 debt service = −$11,254/yr (still bad, but
            feels survivable). Now imagine the bullish-version investor who also
            assumes 70% occupancy: $300 × 0.70 × 365 × 0.65 ≈ $49,820 NOI −
            $50,400 ≈ −$580/yr — basically break even.
          </p>
          <p>
            Same property, four different conclusions, all driven by which of
            the three numbers you flex. That&apos;s why STR underwriting
            requires discipline.
          </p>

          <h2 className="text-2xl sm:text-3xl">
            Where to get ADR and occupancy data
          </h2>

          <h3>1. AirDNA — the starting point</h3>
          <p>
            AirDNA tracks Airbnb and Vrbo listings and publishes market-level and
            property-level analytics. Its Rentalizer tool gives you projected
            ADR, occupancy, and revenue for a specific property address. It&apos;s
            the best single source — but treat it as a starting point, not the
            answer, and check it against the comps you pull yourself.
          </p>

          <h3>2. Direct comp pulls from Airbnb and VRBO</h3>
          <p>
            This is the work AirDNA does, manually, for your specific property.
            Pull 5-10 active listings within a half-mile that match yours on
            bedrooms, hot tub, view, and standout amenities. For each:
          </p>
          <ul>
            <li>
              Read 60-day-out and 90-day-out availability calendars to gauge
              near-term booking pace.
            </li>
            <li>
              Sort by review count; ignore listings with under 20 reviews (too
              new to calibrate against).
            </li>
            <li>
              Note the published nightly rate at peak, shoulder, and off-season
              weekends.
            </li>
            <li>
              Cross-check with VRBO — VRBO sometimes shows different calendars
              and pricing for the same property.
            </li>
          </ul>

          <h3>3. PriceLabs or Wheelhouse for granular pricing data</h3>
          <p>
            These dynamic pricing tools have access to real booked rate data
            (not just published rates). A PriceLabs Market Dashboard, a paid
            product (check current pricing), can show median booked prices
            alongside a market&apos;s median listed prices — usually more honest
            than scraping published nightly rates.
          </p>

          <h3>4. The local property manager call</h3>
          <p>
            One 20-minute call with a local STR property manager is worth hours
            of data work. They&apos;ll tell you the real seasonality curve, what
            amenities are non-negotiable in this market, what new regulations
            are pending, and what the operating cost structure actually looks
            like. They&apos;ll pitch you on their management service afterward —
            pay it forward by considering them seriously even if you plan to
            self-manage.
          </p>

          <h2 className="text-2xl sm:text-3xl">
            The OpEx line items that get missed
          </h2>
          <p>
            STR OpEx is the single biggest source of pro-forma misses.
            Here&apos;s the full list of what runs through your P&amp;L every
            year — well beyond what a long-term rental has:
          </p>

          <h3>Pass-through costs (mostly recovered, with shortfall risk)</h3>
          <ul>
            <li>
              <strong>Cleaning fees.</strong> Guests pay them, but if your
              cleaning fee is set below actual cost, you eat the gap on every
              turnover. Set the fee at 110% of actual cost.
            </li>
            <li>
              <strong>Linens turnover.</strong> Sheets, towels, kitchen linens
              get used hard. Plan replacement every 12-18 months.
            </li>
          </ul>

          <h3>Variable costs (scale with bookings)</h3>
          <ul>
            <li>
              <strong>Channel fees.</strong> Airbnb and Vrbo each publish their
              host fees; check the current rate on each platform before you
              model it. Direct bookings via your own site (Hostfully, Lodgify)
              cut this materially.
            </li>
            <li>
              <strong>Supplies and restocking.</strong> Priced per turnover for
              coffee, paper goods, soap, hot tub chemicals — use your own
              supplier quotes.
            </li>
            <li>
              <strong>Dynamic pricing software.</strong> PriceLabs, Wheelhouse
              or similar; check each vendor&apos;s current pricing.
            </li>
            <li>
              <strong>Channel manager / PMS.</strong> Hostfully, Hostaway,
              Guesty. Pricing varies by vendor and listing count; get a current
              quote from each vendor.
            </li>
            <li>
              <strong>Damage / overage.</strong> Even with deposits and guest
              insurance, some damage may go unrecovered — budget a reserve for
              it.
            </li>
          </ul>

          <h3>Fixed costs (don&apos;t scale with bookings)</h3>
          <ul>
            <li>
              <strong>Utilities.</strong> You pay them all, year-round. Plan for
              higher utility costs than a long-term rental, estimated from the
              property&apos;s actual utility history.
            </li>
            <li>
              <strong>Internet, streaming subscriptions.</strong> Price from
              local provider quotes.
            </li>
            <li>
              <strong>Lawn / pool / hot tub service.</strong> Weekly in season.
              Cost depends on the amenity set; get local service quotes.
            </li>
            <li>
              <strong>Pest control.</strong> Often monthly; get a local quote.
            </li>
            <li>
              <strong>STR-specific insurance.</strong> Get a binding quote for
              a policy that covers short-term rental use.
            </li>
            <li>
              <strong>Permits, lodging tax remittance.</strong> Recurring annual
              cost plus ongoing compliance time.
            </li>
            <li>
              <strong>Accounting / bookkeeping.</strong> STR P&amp;Ls are
              materially more complex than long-term rentals.
            </li>
          </ul>

          <h3>CapEx amortization (the silent killer)</h3>
          <p>
            A long-term rental needs a roof and an HVAC. An STR needs that plus:
            periodic replacement of furniture, mattresses, decor, kitchen
            equipment and listing photography, plus big-ticket items like hot
            tubs.
          </p>
          <p>
            Add it up: a $35K furnishing package you expect to replace every 7
            years, for example, amortizes to ~$5K/year in true operating cost.
            Don&apos;t put 0 here.
          </p>

          <h2 className="text-2xl sm:text-3xl">
            Modeling seasonality properly
          </h2>
          <p>
            STRs don&apos;t book evenly across the year. A hypothetical mountain
            cabin might do 85% occupancy June-August and 25% February-March.
            Modeling with a flat 55% blended occupancy hides cash flow timing
            risk — you
            might have months where revenue doesn&apos;t cover the mortgage and
            you&apos;re burning operating reserves.
          </p>
          <p>
            Better approach: pull monthly occupancy and ADR from your comps,
            build a 12-month grid, and look at the worst three months. Make sure
            you have at least 6 months of debt service in operating reserves to
            absorb that off-season cycle. Tighter than that and one bad winter
            sinks you.
          </p>

          <h2 className="text-2xl sm:text-3xl">
            The three-scenario stress test
          </h2>
          <p>
            Before relying on an STR model, build separate, disclosed scenarios
            that reflect the evidence and risks for the property. There is no
            universal number of scenarios or haircut.
          </p>

          <h3>Scenario 1: Base case</h3>
          <p>
            Use dated ADR, occupancy, seasonality, and cost evidence from a
            relevant comp set. Itemize the operating model and label every
            assumption that is not property-specific.
          </p>

          <h3>Scenario 2: Bad year</h3>
          <p>
            Vary revenue, occupancy, costs, and startup ramp using ranges tied
            to relevant local history and the property&apos;s uncertainty.
            Explain why each change was selected; do not present a generic
            percentage as a market forecast.
          </p>

          <h3>Scenario 3: Regulatory shock</h3>
          <p>
            Verify current permitted use, licensing, transferability, HOA or
            building rules, enforcement, insurance, financing, and taxes with
            authoritative local sources. If another rental use is lawful, model
            it separately from reviewed rent and cost evidence. The result
            describes a scenario; it does not decide whether to proceed.
          </p>

          <h2 className="text-2xl sm:text-3xl">
            Verify current rules for the exact property
          </h2>
          <p>
            Rules can differ by jurisdiction, zone, building, unit, ownership,
            permit history, and date—and can change. Check the current
            ordinance, zoning and licensing authorities, tax agency, HOA or
            condominium documents, insurer, and lender. A city-level blog
            summary cannot establish that the property may operate as an STR.
          </p>
          <p>
            Keep any unresolved permission or transfer question explicit in the
            model and contract review. Do not capitalize STR revenue until the
            relevant evidence supports the assumed operation.
          </p>
          <p>
            Financing has its own STR rules, too. Conventional loans can count
            short-term rental income on one-unit investment properties, but
            under their own documentation rules —{" "}
            <a
              href="https://selling-guide.fanniemae.com/sel/b3-3.8-03/rental-income-subject-property-short-term-rental"
              className="text-primary font-semibold hover:underline"
            >
              Fannie Mae&apos;s Selling Guide has a separate section for
              short-term rental income from the subject property
            </a>{" "}
            — so ask the lender how STR income will be documented.
          </p>

          <h2 className="text-2xl sm:text-3xl">
            Is the operating model within your capacity?
          </h2>
          <p>Review questions such as:</p>
          <ul>
            <li>
              What staffing, response, cleaning, maintenance, and guest
              obligations apply?
            </li>
            <li>
              What reserves and liquidity do the adverse scenarios require?
            </li>
            <li>
              Which revenue, cost, and permitted-use assumptions remain
              unverified?
            </li>
            <li>
              What management proposal and contract terms are actually
              available?
            </li>
          </ul>
          <p>
            The answers are property- and operator-specific. Use them to inform
            professional review and your own decision process rather than a
            universal STR-versus-LTR rule.
          </p>

          <div className="not-prose"></div>

          <p className="text-sm text-muted-foreground mt-6">
            Related reading:{" "}
            <Link
              href="/blog/best-short-term-rental-analysis-tool-2026"
              className="text-primary font-semibold hover:underline"
            >
              Best short-term rental analysis tool 2026
            </Link>
            ,{" "}
            <Link
              href="/vs/airdna"
              className="text-primary font-semibold hover:underline"
            >
              TrueCap vs AirDNA
            </Link>
            ,{" "}
            <Link
              href="/blog/how-to-underwrite-a-rental-property-in-60-seconds"
              className="text-primary font-semibold hover:underline"
            >
              How to underwrite a rental in 60 seconds
            </Link>
            .
          </p>

          <h2 className="text-2xl sm:text-3xl">FAQ</h2>
          {FAQS.map((f, i) => (
            <details
              key={i}
              className="not-prose bg-card border border-border rounded-xl p-4 sm:p-5 mb-3"
            >
              <summary className="cursor-pointer font-bold text-foreground">
                {f.q}
              </summary>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {f.a}
              </p>
            </details>
          ))}
        </article>
        <PostSources
          sources={[
            {
              title: "Fannie Mae Selling Guide B3-3.8-03, Rental Income from the Subject Property: Short-Term Rental",
              url: "https://selling-guide.fanniemae.com/sel/b3-3.8-03/rental-income-subject-property-short-term-rental",
            },
          ]}
        />
        <RelatedContent kind="blog" slug={SLUG} title={TITLE} className="mt-10" />

        <RelatedBlogPosts currentSlug={SLUG} />
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <NewsletterSignup variant="expanded" source="blog" />
        </div>

        <footer className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Modeling an STR deal? TrueCap&apos;s Short-term Rental mode (beta)
            models revenue as nightly rate × occupancy. Its sensitivity grid
            (free on your first decision, then Pro) reruns the deal with the
            nightly rate 10% lower and higher. There is no seasonal model, so
            run a bad off-season as a separate scenario with lower occupancy.{" "}
          </p>
        </footer>
      </main>
      <BlogStickyCta />
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
