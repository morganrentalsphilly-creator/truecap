/**
 * Blog post: The 50% rule for rentals — is it still useful in 2026?
 *
 * Short tactical post — the 50% rule is one of the most-searched
 * heuristics in rental investing. Honest take on when it works and
 * when it lies.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { BlogByline } from "@/components/marketing/blog-byline";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { RelatedContent } from "@/components/marketing/related-content";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";
import { Header } from "@/components/investcalc/header";
import { lastmodFor } from "@/lib/seo/lastmod";
import { JsonLd } from "@/components/seo/json-ld";
import { PostSources } from "@/components/blog/post-sources";

const SLUG = "50-percent-rule-rentals";
const TITLE = "The 50% rule for rentals — is it still useful in 2026?";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "The 50% rule for rentals: still useful in 2026?";
const DESCRIPTION =
  "The 50% rule says operating expenses run about half of gross rent. When it works as a triage tool, when it misleads, and what to do when it cannot.";
const PUBLISHED_AT = "2026-05-25";
const MODIFIED_AT = lastmodFor("/blog/50-percent-rule-rentals") ?? PUBLISHED_AT;
const READING_TIME = 6;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "50 percent rule rental",
    "50% rule real estate",
    "rental property operating expense ratio",
    "rental triage rule",
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
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

export default function FiftyPercentRulePost() {
  const siteUrl = getSiteUrl();
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: TITLE,
    description: DESCRIPTION,
    datePublished: PUBLISHED_AT,
    dateModified: MODIFIED_AT,
    url: `${siteUrl}/blog/${SLUG}`,
    author: { "@type": "Organization", "@id": `${siteUrl}/#organization`, name: "TrueCap", url: siteUrl },
    publisher: { "@id": `${siteUrl}/#organization` },
    mainEntityOfPage: `${siteUrl}/blog/${SLUG}`,
    isPartOf: { "@id": `${siteUrl}/blog#blog` },
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
      {
        "@type": "ListItem",
        position: 3,
        name: TITLE,
        item: `${siteUrl}/blog/${SLUG}`,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={articleLd} />
      <JsonLd data={breadcrumbLd} />
      <main id="main" className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <article>
          <div className="mb-2">
            <Link
              href="/blog"
              className="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground"
            >
              ← Blog
            </Link>
          </div>
          <header className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight tracking-tight text-balance">
              {TITLE}
            </h1>
            <p className="mt-3 text-2xs uppercase tracking-widest text-muted-foreground font-bold">
              {new Date(PUBLISHED_AT).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}{" "}
              · {READING_TIME} min read
            </p>
            <BlogByline />
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              The 50% rule says: operating expenses (everything except debt
              service) typically run ~50% of gross rent. So NOI ≈ rent × 0.5,
              and your cash flow is whatever&apos;s left after your mortgage
              payment. Triage in seconds. Does it still work in 2026?
            </p>
          </header>

          <div className="prose prose-neutral max-w-none [&>p]:max-w-[68ch] [&>ul]:max-w-[68ch] [&>ol]:max-w-[68ch] [&>blockquote]:max-w-[68ch] [&>h2]:max-w-[68ch] [&>h3]:max-w-[68ch] text-foreground space-y-6 leading-relaxed">
            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              What the rule actually says
            </h2>
            <p>
              The 50% rule, a long-standing investor rule of thumb, is a
              shorthand for estimating{" "}
              <Link
                href="/glossary/noi"
                className="text-primary font-semibold hover:underline"
              >
                Net Operating Income (NOI)
              </Link>{" "}
              without itemizing every expense — see our{" "}
              <Link
                href="/blog/how-to-calculate-noi-rental-property"
                className="text-primary font-semibold hover:underline"
              >
                line-by-line NOI walkthrough
              </Link>{" "}
              for the version that doesn&apos;t guess. The math:
            </p>
            <p>
              <strong>Estimated NOI = Gross Annual Rent × 50%</strong>
            </p>
            <p>
              Operating expenses are everything OTHER than your mortgage
              P&amp;I:{" "}
              <Link
                href="/glossary/property-tax"
                className="text-primary font-semibold hover:underline"
              >
                property tax
              </Link>
              , insurance,{" "}
              <Link
                href="/glossary/maintenance-reserve"
                className="text-primary font-semibold hover:underline"
              >
                maintenance
              </Link>
              ,{" "}
              <Link
                href="/glossary/vacancy"
                className="text-primary font-semibold hover:underline"
              >
                vacancy reserve
              </Link>
              ,{" "}
              <Link
                href="/glossary/management-fee"
                className="text-primary font-semibold hover:underline"
              >
                management fee
              </Link>
              ,{" "}
              <Link
                href="/glossary/capex"
                className="text-primary font-semibold hover:underline"
              >
                CapEx reserve
              </Link>
              , HOA, utilities (if landlord-paid), trash, lawn care, snow
              removal, etc.
            </p>
            <p>
              Once you have NOI, you subtract annual debt service (mortgage
              P&amp;I × 12) to get cash flow. Pull that P&amp;I figure from
              the{" "}
              <Link
                href="/tools/mortgage-payment-calculator"
                className="text-primary font-semibold hover:underline"
              >
                mortgage payment calculator
              </Link>{" "}
              instead of estimating it — the whole triage still takes under a
              minute.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Where it works well
            </h2>
            <p>
              The 50% rule is most defensible as a starting assumption for a
              specific kind of property:
            </p>
            <ul>
              <li>
                <strong>1940s-70s single-family rentals</strong> in Midwest
                workforce neighborhoods (think Indianapolis and Kansas City)
                and{" "}
                <a
                  href="https://www2.census.gov/geo/pdfs/maps-data/maps/reference/us_regdiv.pdf"
                  className="text-primary font-semibold hover:underline"
                >
                  similar Southern markets such as Memphis
                </a>
              </li>
              <li>
                <strong>
                  Renting at market rates with full-service property
                  management
                </strong>{" "}
                (use the manager&apos;s written fee schedule)
              </li>
              <li>
                <strong>
                  In places where the parcel&apos;s property tax bill is near
                  the national norm
                </strong>
              </li>
              <li>
                <strong>Without HOA</strong>
              </li>
              <li>
                <strong>Long-term tenancies</strong> (not high-turnover STR or
                college-student housing)
              </li>
            </ul>
            <p>
              For properties matching that profile, 50% can be a reasonable
              starting assumption, but check it against the property&apos;s
              actual expense lines: vacancy + maintenance + CapEx + PM + tax +
              insurance + everything else, added up from that property&apos;s
              own numbers.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Where it lies (loudly)
            </h2>

            <h3 className="text-xl font-extrabold text-foreground mt-8 mb-2">
              Texas / Illinois — high property tax
            </h3>
            <p>
              Texas property tax runs well above the national norm (Census ACS
              2024 puts the state&apos;s{" "}
              <a
                href="https://data.census.gov/table/ACSDT1Y2024.B25103?g=040XX00US48"
                className="text-primary font-semibold hover:underline"
              >
                median real-estate-tax bill at $4,108
              </a>
              , against{" "}
              <a
                href="https://data.census.gov/table/ACSDT1Y2024.B25103?g=010XX00US"
                className="text-primary font-semibold hover:underline"
              >
                $3,211 nationally
              </a>
              ), and individual parcels can run far above the state median, so
              pull the actual tax bill. Illinois runs higher still, with a{" "}
              <a
                href="https://data.census.gov/table/ACSDT1Y2024.B25103?g=040XX00US17"
                className="text-primary font-semibold hover:underline"
              >
                2024 median bill of $5,399
              </a>
              . At an illustrative 2.5-3.2% tax rate, a $300k property renting
              for $2,400/mo pays $7,500-9,600/year in property tax alone —
              already 26-33% of gross rent. To stay at 50%, insurance +
              maintenance + vacancy + CapEx + management would have to fit in
              the remaining 17-24% of rent. Price those lines from the
              property&apos;s own quotes and history; if they add up to more,
              expenses run past 50%, and a deal that looks fine by the 50%
              rule can break even or lose money.
            </p>
            <p>
              See the{" "}
              <Link
                href="/markets/dallas"
                className="text-primary font-semibold hover:underline"
              >
                Dallas-Fort Worth market guide
              </Link>{" "}
              and the{" "}
              <Link
                href="/markets/houston"
                className="text-primary font-semibold hover:underline"
              >
                Houston market guide
              </Link>{" "}
              for the parcel-level tax math.
            </p>

            <h3 className="text-xl font-extrabold text-foreground mt-8 mb-2">
              Florida — insurance
            </h3>
            <p>
              Florida premiums can vary sharply by exact location, roof and
              building characteristics, coverage, wind mitigation, flood
              exposure, carrier, and renewal date. A statewide or inland-versus-
              coastal range is not a substitute for an insurable quote. Replace
              the 50% rule&apos;s implicit insurance allowance with a current
              quote for the subject property before relying on the screen.
            </p>
            <p>
              See the{" "}
              <Link
                href="/markets/tampa"
                className="text-primary font-semibold hover:underline"
              >
                Tampa market guide
              </Link>{" "}
              for the binding-quote workflow.
            </p>

            <h3 className="text-xl font-extrabold text-foreground mt-8 mb-2">
              Pre-1940 housing stock — CapEx
            </h3>
            <p>
              The 50% rule has no separate CapEx line, so it can&apos;t flex
              for older buildings. Pre-1940 housing, which makes up much of
              the stock in{" "}
              <a
                href="https://data.census.gov/table/ACSDT1Y2024.B25034?g=160XX00US3916000"
                className="text-primary font-semibold hover:underline"
              >
                Cleveland
              </a>
              ,{" "}
              <a
                href="https://data.census.gov/table/ACSDT1Y2024.B25034?g=160XX00US4260000"
                className="text-primary font-semibold hover:underline"
              >
                Philadelphia
              </a>
              ,{" "}
              <a
                href="https://data.census.gov/table/ACSDT1Y2024.B25034?g=160XX00US2622000"
                className="text-primary font-semibold hover:underline"
              >
                Detroit
              </a>
              ,{" "}
              <a
                href="https://data.census.gov/table/ACSDT1Y2024.B25034?g=160XX00US4261000"
                className="text-primary font-semibold hover:underline"
              >
                Pittsburgh
              </a>{" "}
              and{" "}
              <a
                href="https://data.census.gov/table/ACSDT1Y2024.B25034?g=160XX00US2404000"
                className="text-primary font-semibold hover:underline"
              >
                Baltimore
              </a>
              , can need major capital work (roof, electrical service
              upgrades, plumbing replacement, foundation work, lead paint), so
              budget CapEx from an inspection, not a percentage. A property
              that pencils at the 50% rule may grind to break-even once the
              actual CapEx hits. Itemize the expense lines instead of nudging
              the flat percentage up.
            </p>

            <h3 className="text-xl font-extrabold text-foreground mt-8 mb-2">
              Short-term rentals (Airbnb / VRBO)
            </h3>
            <p>
              STRs carry expense lines a long-term rental doesn&apos;t
              (cleaning per turnover, higher insurance, higher management
              fees, more wear from frequent turnover), so the 50% rule
              doesn&apos;t apply; use{" "}
              <Link
                href="/blog/short-term-rental-underwriting-playbook"
                className="text-primary font-semibold hover:underline"
              >
                STR-specific underwriting
              </Link>
              .
            </p>

            <h3 className="text-xl font-extrabold text-foreground mt-8 mb-2">
              High HOA condos
            </h3>
            <p>
              An HOA of $400/mo on a $1,800/mo rental is already 22% of gross
              rent before any other expense. Add tax, insurance, maintenance,
              vacancy, CapEx and you&apos;re well above 50%. Check the HOA
              dues first on any condo; in some buildings they alone push
              expenses well past 50%.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Where it lies (quietly)
            </h2>
            <p>
              Owner-occupant house hacks, BRRRR mid-stabilization, properties
              with utilities included, properties with significant vacancy risk
              (college towns, transient neighborhoods), and properties subject
              to state or local rent-regulation rules all have expense
              profiles that diverge from 50%. Don&apos;t use the rule on these
              without explicit adjustment.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              How to actually use it
            </h2>
            <p>
              The 50% rule is a{" "}
              <strong>triage tool, not a final-decision tool</strong>. Use it in
              a few seconds to decide whether a property is worth opening the full
              underwrite (the free{" "}
              <Link
                href="/analyze" prefetch={false}
                className="text-primary font-semibold hover:underline"
              >
                TrueCap analyzer
              </Link>{" "}
              runs the same steps on a real address, and swaps the flat 50% for
              your actual expense lines — exactly the adjustment the failure
              modes above demand):
            </p>
            <ol>
              <li>Look at gross monthly rent (from listing or rough comps)</li>
              <li>Annualize: gross rent × 12</li>
              <li>Halve it: that&apos;s rough NOI</li>
              <li>
                Subtract annual P&amp;I at your rate: that&apos;s rough cash
                flow
              </li>
              <li>
                If cash flow is positive: the deal MIGHT pencil — open the full
                underwrite
              </li>
              <li>
                If the rough cash flow is negative or zero: flag the listing for
                a property-specific underwrite; do not treat the shortcut as a
                pass decision
              </li>
            </ol>
            <p>
              Above all:{" "}
              <strong>do not commit to a deal based on the 50% rule.</strong>{" "}
              Use it to filter out most listings so you only spend serious
              time on the few that survive. For those, run the actual
              property through{" "}
              <Link
                href="/"
                className="text-primary font-semibold hover:underline"
              >
                TrueCap
              </Link>{" "}
              with the address — the analyzer replaces the 50% guess with
              editable expense lines, can start rent and rate from labeled
              HUD/FRED benchmarks, and keeps property tax as a manual local
              input. A few seconds with the 50% rule, then a property-specific
              underwrite before relying on the result.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              A better triage filter
            </h2>
            <p>
              If you want a faster + more accurate triage than the 50% rule:
            </p>
            <p>
              <strong>
                For high-property-tax states such as Texas, Illinois and{" "}
                <a
                  href="https://data.census.gov/table/ACSDT1Y2024.B25103?g=040XX00US34"
                  className="text-primary font-semibold hover:underline"
                >
                  New Jersey
                </a>
                :
              </strong>{" "}
              Replace the 50% rule&apos;s implied tax allowance with the
              parcel&apos;s actual tax bill before relying on the screen.
            </p>
            <p>
              <strong>
                For{" "}
                <a
                  href="https://home.treasury.gov/system/files/311/Analyses_of_US_Homeowners_Insurance_Markets_2018-2022_Climate-Related_Risks_and_Other_Factors_0.pdf"
                  className="text-primary font-semibold hover:underline"
                >
                  hurricane-exposed coastal areas
                </a>{" "}
                (FL, LA and the Carolinas, for example):
              </strong>{" "}
              Pull a binding insurance quote BEFORE you do any other math. That
              single number is more diagnostic than any rule of thumb.
            </p>
            <p>
              <strong>For Midwest workforce SFR:</strong> The 50% rule may be a
              useful triage assumption when it is calibrated against that
              property&apos;s actual tax, insurance, utilities, condition,
              management, vacancy, and capital needs. For a faster gut-check,
              see our walkthrough of{" "}
              <Link
                href="/blog/how-to-underwrite-a-rental-property-in-60-seconds"
                className="text-primary font-semibold hover:underline"
              >
                underwriting a rental in 60 seconds
              </Link>
              .
            </p>
            <p>
              <strong>
                For appreciation-leaning coastal Tier-1 (CA, parts of WA, NYC):
              </strong>{" "}
              No rule of thumb works because expense ratios are dominated by
              individual property quirks (rent control, parking, special
              assessments). Always do the full underwrite.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The bottom line
            </h2>
            <p>
              The 50% rule is commonly associated with older workforce-rental
              heuristics, but its accuracy is property-specific. Use it only as
              a directional sanity check and replace it with verified expense
              lines before making a decision.
            </p>
            <p>
              The investors who use it best treat it as a quick listing
              filter while keeping the actual decision math separate. The
              investors who lose money on it use it as the actual
              underwriting calculation in markets where it&apos;s badly wrong.
            </p>
          </div>
        </article>
        <PostSources
          sources={[
            {
              title: "U.S. Census Bureau, Census Regions and Divisions of the United States",
              url: "https://www2.census.gov/geo/pdfs/maps-data/maps/reference/us_regdiv.pdf",
            },
            {
              title: "U.S. Census Bureau, American Community Survey 2024 1-year, B25103 Median Real Estate Taxes Paid, Texas",
              url: "https://data.census.gov/table/ACSDT1Y2024.B25103?g=040XX00US48",
            },
            {
              title: "U.S. Census Bureau, American Community Survey 2024 1-year, B25103 Median Real Estate Taxes Paid, United States",
              url: "https://data.census.gov/table/ACSDT1Y2024.B25103?g=010XX00US",
            },
            {
              title: "U.S. Census Bureau, American Community Survey 2024 1-year, B25103 Median Real Estate Taxes Paid, Illinois",
              url: "https://data.census.gov/table/ACSDT1Y2024.B25103?g=040XX00US17",
            },
            {
              title: "U.S. Census Bureau, American Community Survey 2024 1-year, B25034 Year Structure Built, Cleveland city, Ohio",
              url: "https://data.census.gov/table/ACSDT1Y2024.B25034?g=160XX00US3916000",
            },
            {
              title: "U.S. Census Bureau, American Community Survey 2024 1-year, B25034 Year Structure Built, Philadelphia city, Pennsylvania",
              url: "https://data.census.gov/table/ACSDT1Y2024.B25034?g=160XX00US4260000",
            },
            {
              title: "U.S. Census Bureau, American Community Survey 2024 1-year, B25034 Year Structure Built, Detroit city, Michigan",
              url: "https://data.census.gov/table/ACSDT1Y2024.B25034?g=160XX00US2622000",
            },
            {
              title: "U.S. Census Bureau, American Community Survey 2024 1-year, B25034 Year Structure Built, Pittsburgh city, Pennsylvania",
              url: "https://data.census.gov/table/ACSDT1Y2024.B25034?g=160XX00US4261000",
            },
            {
              title: "U.S. Census Bureau, American Community Survey 2024 1-year, B25034 Year Structure Built, Baltimore city, Maryland",
              url: "https://data.census.gov/table/ACSDT1Y2024.B25034?g=160XX00US2404000",
            },
            {
              title: "U.S. Census Bureau, American Community Survey 2024 1-year, B25103 Median Real Estate Taxes Paid, New Jersey",
              url: "https://data.census.gov/table/ACSDT1Y2024.B25103?g=040XX00US34",
            },
            {
              title: "U.S. Treasury Federal Insurance Office, Analyses of U.S. Homeowners Insurance Markets, 2018-2022 (January 2025)",
              url: "https://home.treasury.gov/system/files/311/Analyses_of_US_Homeowners_Insurance_Markets_2018-2022_Climate-Related_Risks_and_Other_Factors_0.pdf",
            },
          ]}
        />
        <RelatedContent kind="blog" slug={SLUG} title={TITLE} className="mt-10" />
        <RelatedBlogPosts currentSlug={SLUG} />
      </main>
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <NewsletterSignup variant="expanded" source="blog" />
      </div>
      <BlogStickyCta />
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
