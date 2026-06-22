/**
 * Blog post: What vacancy rate to assume when underwriting a rental.
 *
 * Targets queries: "vacancy rate rental property", "what vacancy rate
 * to assume", "average rental vacancy rate", "economic vs physical
 * vacancy", "how does vacancy affect DSCR", "vacancy rate assumption
 * underwriting".
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "vacancy-rate-rental-property";
const TITLE =
  "Vacancy rate for rentals: what to assume in 2026 (and why 5% is usually a guess)";
const DESCRIPTION =
  "How to pick a vacancy assumption that matches reality: physical vs economic vacancy, the turnover math behind the number, and what 5 points does to DSCR.";
const PUBLISHED_AT = "2026-06-07";
const MODIFIED_AT = "2026-06-07";
const READING_TIME = 10;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "vacancy rate rental property",
    "what vacancy rate to assume",
    "average rental vacancy rate",
    "economic vacancy vs physical vacancy",
    "vacancy rate underwriting",
    "how does vacancy affect DSCR",
    "rental vacancy assumption",
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
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const FAQS = [
  {
    q: "What is a good vacancy rate assumption for a rental property?",
    a: "Derive it from expected turnover, then sanity-check against property class: 4-6% for A-class properties in stable metros with long tenancies, 6-9% for typical B-class workforce rentals, 8-12% for C-class properties with annual turnover, and higher for student rentals that turn over every year on a fixed calendar. The popular default of 5% is only correct when tenants stay about two years and units re-lease in under a month.",
  },
  {
    q: "What is the difference between physical and economic vacancy?",
    a: "Physical vacancy counts days the unit sits empty between tenants. Economic vacancy counts every dollar of scheduled rent you didn't collect — empty days plus concessions (one free month on a 12-month lease is 8.3% by itself), non-payment and eviction timelines, and units rented below market. A C-class property can show 3% physical vacancy and 12% economic vacancy in the same year. Underwrite on economic vacancy; it's the one that pays your mortgage.",
  },
  {
    q: "How does vacancy affect DSCR?",
    a: "Two ways. In your own underwrite, vacancy reduces effective income, which reduces NOI dollar-for-dollar — and because NOI sits on top of fixed debt service, a 5-point vacancy swing can move DSCR by 0.10 or more, often across a lender's 1.20-1.25 floor. At the loan desk, most DSCR lenders qualify on gross market rent ÷ PITIA without a vacancy haircut — which means the lender may approve a loan the property's real collected income can't comfortably service. Passing the lender's test is not the same as the deal working.",
  },
  {
    q: "What is the average rental vacancy rate in the US?",
    a: "The Census Bureau's national rental vacancy rate has run roughly 6-7% in recent years, but the national number is nearly useless for underwriting a specific property — it blends hot coastal metros under 4% with soft markets over 10%, and Class A with Class C. Use your submarket and property class, and when in doubt ask a local property manager what their actual days-on-market and renewal rates look like.",
  },
  {
    q: "Is 0% vacancy ever a reasonable assumption?",
    a: "No — not even for a long-term tenant in place. Every property eventually turns over, and one month vacant in a 24-month tenancy is 4.2% all by itself. A 0% line is the single most common tell that a seller's pro forma is marketing, not math. If the deal only pencils at 0% vacancy, the deal doesn't pencil.",
  },
];

export default function VacancyRatePost() {
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/blog/${SLUG}`;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: TITLE,
    description: DESCRIPTION,
    datePublished: PUBLISHED_AT,
    dateModified: MODIFIED_AT,
    url: canonicalUrl,
    author: { "@type": "Person", name: "Morgan Page", url: siteUrl },
    publisher: { "@id": `${siteUrl}/#organization` },
    mainEntityOfPage: canonicalUrl,
    image: [`${siteUrl}/home.jpg`],
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      <main id="main" className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <article>
        <div className="mb-2">
          <Link
            href="/blog"
            className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground"
          >
            ← Blog
          </Link>
        </div>
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight tracking-tight text-balance">
            {TITLE}
          </h1>
          <p className="mt-3 text-[11px] uppercase tracking-widest text-muted-foreground font-bold">
            {new Date(PUBLISHED_AT).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}{" "}
            · {READING_TIME} min read
          </p>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Vacancy is the most quietly manipulated line in rental
            underwriting. Sellers set it to 0%. Gurus default it to 5%.
            Most investors copy whichever number they saw first — on the
            one assumption that routinely decides whether a deal&apos;s cash
            flow is real. Here&apos;s where the number actually comes from,
            what it does to your returns and your DSCR, and how to pick one
            you can defend.
          </p>
        </header>

        <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            What vacancy actually measures (it&apos;s not just empty units)
          </h2>
          <p>
            <strong>Physical vacancy</strong> is the obvious one: days the
            unit sits empty between tenants, as a share of the year. One
            month empty out of twelve is 8.3%.
          </p>
          <p>
            <strong>Economic vacancy</strong> is the number that matters: every
            dollar of scheduled rent you didn&apos;t collect. It includes
            empty days, plus three categories most underwrites skip:
          </p>
          <ul>
            <li>
              <strong>Concessions.</strong> &quot;First month free&quot; on a
              12-month lease is 8.3% economic vacancy on a unit that was never
              physically vacant for a day of the lease.
            </li>
            <li>
              <strong>Non-payment and evictions.</strong> A tenant who stops
              paying in month 8 and leaves after a 90-day eviction process
              produces ~25% economic vacancy for that year — while the unit
              shows as occupied the whole time.
            </li>
            <li>
              <strong>Loss-to-lease.</strong> A long-term tenant paying $1,150
              against a $1,300 market rent is ~11.5% below scheduled market
              income. Sellers love to advertise the market rent and the
              full-occupancy history in the same flyer.
            </li>
          </ul>
          <p>
            This is why a C-class building can truthfully report 3% physical
            vacancy and still be missing 12% of its scheduled income. When
            you read a seller&apos;s package, this gap is one of the seven
            standard tricks covered in{" "}
            <Link
              href="/blog/rental-property-pro-forma-explained"
              className="text-primary font-semibold hover:underline"
            >
              how to read a rental property pro forma
            </Link>
            . Underwrite on economic vacancy. It&apos;s the version that pays
            the mortgage.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            The turnover math: derive the number, don&apos;t pick it
          </h2>
          <p>
            A defensible vacancy assumption is just two estimates multiplied
            together:
          </p>
          <p>
            <strong>
              Vacancy rate ≈ days vacant per turnover ÷ (average tenancy in
              days + days vacant)
            </strong>
          </p>
          <p>Run the realistic scenarios:</p>
          <ul>
            <li>
              <strong>Good operator, B-class, 2-year average tenancy, 30 days
              to turn and re-lease:</strong> 30 ÷ 760 ≈ <strong>4%</strong>
            </li>
            <li>
              <strong>Same property, 1-year tenancies:</strong> 30 ÷ 395 ≈{" "}
              <strong>7.6%</strong>
            </li>
            <li>
              <strong>C-class, annual turnover, 45 days to turn (more repairs,
              slower lease-up):</strong> 45 ÷ 410 ≈ <strong>11%</strong>
            </li>
            <li>
              <strong>Student rental on a strict August calendar:</strong>{" "}
              often 1 month guaranteed-empty per year — 8.3% floor before
              anything goes wrong
            </li>
          </ul>
          <p>
            Notice what drives the result: <em>tenancy length</em>, far more
            than days-on-market. Cutting re-lease time from 30 days to 20 saves
            you about a point; getting tenants to stay a second year cuts
            vacancy nearly in half. That asymmetry should shape how you
            operate — and it&apos;s the real reason renewals beat rent
            maximization for most small landlords. The{" "}
            <Link
              href="/tools/vacancy-rate-calculator"
              className="text-primary font-semibold hover:underline"
            >
              vacancy rate calculator
            </Link>{" "}
            runs this turnover math both directions.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            What 5 points of vacancy does to a real deal
          </h2>
          <p>
            A $300,000 duplex, $1,400/unit, 25% down, $225,000 loan at 7%
            over 30 years (P&amp;I ≈ $1,497/month). Monthly operating
            expenses before vacancy: $300 taxes, $125 insurance, 10%
            maintenance/capex ($280), 8% property management ($224).
          </p>
          <ul>
            <li>
              <strong>At 5% vacancy ($140/mo):</strong> NOI ≈ $20,772/year,
              cap rate 6.9%, cash flow ≈ <strong>$234/month</strong>, DSCR
              (NOI ÷ debt service) ≈ <strong>1.16</strong>
            </li>
            <li>
              <strong>At 10% vacancy ($280/mo):</strong> NOI ≈ $19,092/year,
              cap rate 6.4%, cash flow ≈ <strong>$94/month</strong>, DSCR ≈{" "}
              <strong>1.06</strong>
            </li>
          </ul>
          <p>
            Five points of vacancy — the gap between &quot;copied a guru
            default&quot; and &quot;C-class with annual turnover&quot; — cut
            this deal&apos;s cash flow by <strong>60%</strong> and dropped
            DSCR from acceptable to fragile. No other single assumption in
            the underwrite moves the answer this much per percentage point
            except rent itself. That&apos;s the entire argument for spending
            ten minutes on this line instead of zero.
          </p>
          <p>
            And the duplex math has a wrinkle a single-family doesn&apos;t:
            vacancy arrives in 50% chunks. A &quot;7% vacancy year&quot; on a
            duplex is really one unit empty for seven weeks — $1,400 of
            missing rent concentrated in two months, not $98 missing evenly
            every month. Hold reserves accordingly. Stress-test your own
            numbers in the{" "}
            <Link
              href="/tools/cash-on-cash-calculator"
              className="text-primary font-semibold hover:underline"
            >
              cash-on-cash calculator
            </Link>{" "}
            at both your base case and base-plus-five.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            The DSCR loan wrinkle: your lender ignores vacancy
          </h2>
          <p>
            Here&apos;s the part that surprises investors using{" "}
            <Link
              href="/blog/dscr-loans-explained"
              className="text-primary font-semibold hover:underline"
            >
              DSCR loans
            </Link>
            : most DSCR lenders qualify the loan on <strong>gross market
            rent ÷ PITIA</strong> — no vacancy haircut at all. The appraiser
            fills out a rent schedule (the 1007 form), the lender divides by
            your payment, and if the ratio clears 1.0-1.25 the loan works.
          </p>
          <p>
            On the duplex above: $2,800 gross rent against roughly $1,922 of
            PITIA is a 1.46 lender DSCR — comfortably approved. But your
            own NOI-based coverage at 10% economic vacancy was 1.06. The
            lender&apos;s test says yes; the property&apos;s actual collected
            income barely covers the payment after real-world expenses. The
            gap between those two numbers is risk you carry, not the bank.
            Run both versions in the{" "}
            <Link
              href="/tools/dscr-calculator"
              className="text-primary font-semibold hover:underline"
            >
              DSCR calculator
            </Link>{" "}
            before you treat an approval as validation of the deal.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            Benchmarks by property class (sanity checks, not answers)
          </h2>
          <ul>
            <li>
              <strong>A-class, stable metro:</strong> 4-6%. Long tenancies,
              fast lease-up, tenants with options who behave like it.
            </li>
            <li>
              <strong>B-class workforce housing:</strong> 6-9%. The bread
              and butter of small-portfolio investing; turnover roughly every
              18-24 months.
            </li>
            <li>
              <strong>C-class:</strong> 8-12% <em>economic</em> — physical
              vacancy may look fine while non-payment and turnover costs eat
              the difference.
            </li>
            <li>
              <strong>Student rentals:</strong> 8.3% structural floor (one
              guaranteed turn per year) plus whatever the summer market
              doesn&apos;t absorb.
            </li>
          </ul>
          <p>
            The Census Bureau&apos;s national rental vacancy figure has
            hovered around 6-7% recently, but national averages blend
            markets that have nothing to do with each other. The better
            calibration source is free: call two local property managers and
            ask their average days-on-market and renewal rate for your
            property type. They know the real number because they live in it
            — and the same conversation helps you decide whether{" "}
            <Link
              href="/blog/property-management-yes-or-no"
              className="text-primary font-semibold hover:underline"
            >
              hiring a PM
            </Link>{" "}
            pencils at all.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            Where to find the real number before you buy
          </h2>
          <p>
            For an occupied property, the truth is in the paperwork — ask for
            it during due diligence and read it like an auditor:
          </p>
          <ul>
            <li>
              <strong>The 12-month ledger, not the rent roll.</strong> A rent
              roll is a snapshot of scheduled rent on one day. The ledger
              shows what was actually collected, month by month. Sum the
              collections, divide by scheduled rent × 12 — the difference is
              the property&apos;s real economic vacancy, including every late
              month and concession the listing didn&apos;t mention.
            </li>
            <li>
              <strong>Lease start dates.</strong> Three tenants who all
              started within the last 8 months is a turnover pattern, not a
              coincidence. Ask what happened to the previous tenants.
            </li>
            <li>
              <strong>Days-on-market for comparable listings.</strong> Pull
              current rental listings in the same zip and note how long
              they&apos;ve been sitting. Thirty-plus days across the comps
              means your 2-week lease-up assumption is fantasy.
            </li>
            <li>
              <strong>Two phone calls to local PMs.</strong> Ask their
              average days-to-lease and renewal rate for your property type
              and street, not the metro. Ten minutes, free, and more accurate
              than any national dataset.
            </li>
          </ul>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            One common modeling mistake: double-counting (or zero-counting)
          </h2>
          <p>
            Vacancy is an income-side adjustment — it reduces collected rent
            before operating expenses. Two errors show up constantly in
            homemade spreadsheets. First, investors using the{" "}
            <Link
              href="/blog/50-percent-rule-rentals"
              className="text-primary font-semibold hover:underline"
            >
              50% rule
            </Link>{" "}
            sometimes apply the 50% to gross rent <em>and</em> subtract
            vacancy separately — but the classic 50% heuristic already
            includes vacancy, so they&apos;ve counted it twice and killed a
            deal that pencils. Second, and worse, investors itemizing
            expenses (taxes, insurance, maintenance, PM) forget the vacancy
            line entirely because it isn&apos;t a bill anyone sends you —
            there&apos;s no invoice for an empty month. Pick one structure:
            either the heuristic with vacancy baked in for triage, or
            itemized expenses with an explicit vacancy percentage for the
            real underwrite. Never both, never neither.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            How operators actually push vacancy down
          </h2>
          <p>
            <strong>Price 3-5% under top-of-market.</strong> The spreadsheet
            says squeeze every dollar; the turnover math says otherwise. On a
            $1,400 unit, holding out for $1,460 while the unit sits an extra
            three weeks costs more than the annual difference — and
            under-market tenants renew more.
          </p>
          <p>
            <strong>Start renewal conversations at day 90.</strong> A signed
            renewal 60 days out converts your single biggest vacancy driver
            (turnover) to zero for another year. Modest renewal increases
            beat market-rate re-leases net of turn costs in almost every
            case.
          </p>
          <p>
            <strong>Pre-lease during the notice period.</strong> Showing the
            unit in the last 30 days of a tenancy and turning it in under a
            week converts a 30-day vacancy into a 5-day one — worth nearly a
            point of vacancy rate by itself on annual-turnover properties.
          </p>
          <p>
            <strong>Screen for tenure, not just credit.</strong> A 680-score
            applicant with five years at their last address is a better
            vacancy bet than a 740 who moves every year. The score protects
            against non-payment; the history protects against turnover. Both
            are vacancy.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            FAQ
          </h2>
          {FAQS.map((f) => (
            <div key={f.q}>
              <h3 className="text-xl font-bold text-foreground mt-6 mb-2">
                {f.q}
              </h3>
              <p>{f.a}</p>
            </div>
          ))}

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            Put the number in context
          </h2>
          <p>
            Vacancy is one line, but it touches everything downstream — NOI,
            cap rate, cash flow, DSCR, and ultimately the verdict on the
            deal. The full{" "}
            <Link href="/" className="text-primary font-semibold hover:underline">
              TrueCap analyzer
            </Link>{" "}
            carries your vacancy assumption through all of it in one pass,
            so you can flip between 5% and 10% and watch the whole underwrite
            move. Related reading:{" "}
            <Link
              href="/blog/how-to-underwrite-a-rental-property-in-60-seconds"
              className="text-primary font-semibold hover:underline"
            >
              how to underwrite a rental in 60 seconds
            </Link>
            ,{" "}
            <Link
              href="/blog/50-percent-rule-rentals"
              className="text-primary font-semibold hover:underline"
            >
              the 50% rule
            </Link>
            , and{" "}
            <Link
              href="/blog/rental-property-pro-forma-explained"
              className="text-primary font-semibold hover:underline"
            >
              reading a pro forma
            </Link>
            .
          </p>
        </div>
        </article>
      </main>
      <RelatedBlogPosts currentSlug={SLUG} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <NewsletterSignup variant="expanded" source="blog" />
      </div>
      <BlogStickyCta />
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
