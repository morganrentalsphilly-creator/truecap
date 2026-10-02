/**
 * Blog post: Best states for rental property investors in 2026
 *
 * Anchor SEO piece. Targets "best states for rental property" + state-
 * specific variants. Cross-links to every market page we have, so the
 * post acts as a hub that distributes link equity to the city-level
 * landing pages.
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

const SLUG = "best-states-for-rental-investors-2026";
const TITLE = "Best states for rental property investors in 2026";
const DESCRIPTION =
  "The top 10 US states for rental property investors in 2026, compared on property tax, income tax, landlord laws, and which fits your strategy.";
const PUBLISHED_AT = "2026-05-25";
const MODIFIED_AT = lastmodFor("/blog/best-states-for-rental-investors-2026") ?? PUBLISHED_AT;
const READING_TIME = 12;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "best states for rental property",
    "best states to invest in real estate",
    "rental property best states 2026",
    "cash flow states rental",
    "appreciation states rental",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `/blog/${SLUG}`,
    type: "article",
    publishedTime: PUBLISHED_AT,
    modifiedTime: MODIFIED_AT,
  },
  twitter: { card: "summary_large_image" },
};

export default function BestStatesPost() {
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
              &quot;Best state&quot; depends on what you&apos;re actually
              optimizing for. Pure cash flow? Appreciation tailwind? After-tax
              return? Landlord-friendly eviction law? Lowest insurance exposure?
              Each one points at a different state. Here&apos;s the honest 2026
              ranking with the trade-offs that matter.
            </p>
          </header>

          <div className="prose prose-neutral max-w-none [&>p]:max-w-[68ch] [&>ul]:max-w-[68ch] [&>ol]:max-w-[68ch] [&>blockquote]:max-w-[68ch] [&>h2]:max-w-[68ch] [&>h3]:max-w-[68ch] text-foreground space-y-6 leading-relaxed">
            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The framework — pick your axis first
            </h2>
            <p>
              Before picking a state, pick what you&apos;re optimizing for. The
              states that produce the highest cash flow are mostly NOT the
              states that produce the highest appreciation, and the states that
              are most landlord-friendly are not always the highest-yielding.
              Trying to optimize all dimensions simultaneously produces a
              mediocre choice on every axis.
            </p>
            <p>Five axes that matter:</p>
            <ul>
              <li>
                <strong>
                  <Link
                    href="/glossary/cap-rate"
                    className="text-primary font-semibold hover:underline"
                  >
                    Cap rate
                  </Link>{" "}
                  / cash flow
                </strong>{" "}
                — how much current yield per dollar invested
              </li>
              <li>
                <strong>
                  <Link
                    href="/glossary/appreciation-rate"
                    className="text-primary font-semibold hover:underline"
                  >
                    Appreciation
                  </Link>{" "}
                  potential
                </strong>{" "}
                — long-term value growth, usually tied to net in-migration + job
                growth
              </li>
              <li>
                <strong>After-tax yield</strong> — affected by state income tax
                (or absence of it) +{" "}
                <Link
                  href="/glossary/property-tax"
                  className="text-primary font-semibold hover:underline"
                >
                  property tax
                </Link>{" "}
                +{" "}
                <Link
                  href="/glossary/insurance"
                  className="text-primary font-semibold hover:underline"
                >
                  insurance
                </Link>
              </li>
              <li>
                <strong>Landlord legal climate</strong> — eviction speed,
                security deposit limits, rent control exposure
              </li>
              <li>
                <strong>Insurance + climate risk</strong> — hurricane, flood,
                wildfire, water-shortage exposure
              </li>
            </ul>
            <p>
              Where this guide gives property tax as a percentage of median home
              value, it divides Census ACS 2024 median real estate taxes paid (
              <a
                href="https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/1YRData/acsdt1y2024-b25103.dat"
                className="text-primary font-semibold hover:underline"
              >
                table B25103
              </a>
              ) by median home value (
              <a
                href="https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/1YRData/acsdt1y2024-b25077.dat"
                className="text-primary font-semibold hover:underline"
              >
                table B25077
              </a>
              ). Both tables cover owner-occupied homes only.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Tier 1 — Cash flow leaders
            </h2>
            <p>
              Cash-flow-oriented states — test each listing against the 1% rule
              (gross monthly rent ≥ 1% of price):
            </p>

            <h3 className="text-xl font-extrabold text-foreground mt-8 mb-2">
              1. Indiana (Indianapolis + smaller cities)
            </h3>
            <p>
              Indianapolis workforce neighborhoods are a common cash-flow
              target; verify each property&apos;s cap rate from its own rent,
              expense, and price evidence. Indiana caps property taxes on
              non-homestead residential property, including rentals, at 2% of
              gross assessed value (Indiana Constitution Article 10), but the{" "}
              <a
                href="https://www.in.gov/dlgf/files/240429-Fact-Sheet-Circuit-Breaker-Caps.pdf"
                className="text-primary font-semibold hover:underline"
              >
                Indiana DLGF&apos;s property tax caps fact sheet
              </a>{" "}
              notes that assessed values are adjusted every year and that
              voter-approved referendum funds are generally exempt from the
              caps, so a rental&apos;s bill can still rise. Mature
              out-of-state PM market.{" "}
              <a
                href="https://fred.stlouisfed.org/series/ATNHPIUS26900Q"
                className="text-primary font-semibold hover:underline"
              >
                FHFA&apos;s Indianapolis-area house price index
              </a>{" "}
              rose about 3.7% a year from 1991 to mid-2026 and about 7.5% a year
              over the last decade (nominal).
            </p>
            <p>
              <strong>Indianapolis rental market data:</strong>{" "}
              <Link
                href="/markets/indianapolis"
                className="text-primary font-semibold hover:underline"
              >
                /markets/indianapolis
              </Link>
              {" · "}
              <Link
                href="/states/indiana"
                className="text-primary font-semibold hover:underline"
              >
                Indiana rental market data
              </Link>
            </p>

            <h3 className="text-xl font-extrabold text-foreground mt-8 mb-2">
              2. Ohio (Cleveland + Cincinnati + Columbus)
            </h3>
            <p>
              Cleveland&apos;s cap rates vary widely by neighborhood — verify
              each property&apos;s numbers rather than relying on neighborhood
              ranges. Real BRRRR market with distressed inventory at low entry
              prices. The tradeoff: older housing stock means significant capex
              risk on properties that haven&apos;t been recently rehabbed.
              For owner-occupied homes, Ohio&apos;s statewide median property
              tax is{" "}
              <a
                href="https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/1YRData/acsdt1y2024-b25103.dat"
                className="text-primary font-semibold hover:underline"
              >
                about 1.2% of median home value (Census ACS 2024)
              </a>{" "}
              — higher than Indiana&apos;s 0.74% and a little below Texas&apos;s
              1.31% — and about 1.4–1.8% in the Columbus, Cincinnati and
              Cleveland counties (Franklin 1.40%, Hamilton 1.44%, Cuyahoga
              1.80%); a rental&apos;s bill can be higher.
            </p>
            <p>
              <strong>Cleveland rental market data:</strong>{" "}
              <Link
                href="/markets/cleveland"
                className="text-primary font-semibold hover:underline"
              >
                /markets/cleveland
              </Link>
              {" · "}
              <Link
                href="/states/ohio"
                className="text-primary font-semibold hover:underline"
              >
                Ohio rental market data
              </Link>
            </p>

            <h3 className="text-xl font-extrabold text-foreground mt-8 mb-2">
              3. Missouri (Kansas City + St. Louis)
            </h3>
            <p>
              Kansas City is the most-reliable Missouri play. Eastern Jackson
              County (Raytown, Independence, Grandview) has working-class
              suburbs where cap rates are worth testing, with manageable due
              diligence. Caveat: Jackson County&apos;s 2023 reassessment led to
              a{" "}
              <a
                href="https://stc.mo.gov/wp-content/uploads/sites/5/2024/08/Order-of-STC-to-Jackson-County-Regarding-2023-and-2024-Assessments.pdf"
                className="text-primary font-semibold hover:underline"
              >
                Missouri State Tax Commission order correcting 2023 and 2024
                residential assessments
              </a>{" "}
              — always pull current tax records, not seller&apos;s prior bill.
            </p>
            <p>
              <strong>Kansas City rental market data:</strong>{" "}
              <Link
                href="/markets/kansas-city"
                className="text-primary font-semibold hover:underline"
              >
                /markets/kansas-city
              </Link>
              {" · "}
              <Link
                href="/states/missouri"
                className="text-primary font-semibold hover:underline"
              >
                Missouri rental market data
              </Link>
            </p>

            <h3 className="text-xl font-extrabold text-foreground mt-8 mb-2">
              4. Michigan (Detroit metro)
            </h3>
            <p>
              Detroit&apos;s distressed neighborhoods can show very high
              headline cap rates, but the operational risk to capture them is
              also high. Northwest Detroit (Bagley, Rosedale) and East English
              Village are commonly treated as safer entry points; verify each
              property&apos;s cap rate. Deals in the most distressed pockets are
              harder to run without local relationships.
            </p>
            <p>
              <strong>Detroit rental market data:</strong>{" "}
              <Link
                href="/markets/detroit"
                className="text-primary font-semibold hover:underline"
              >
                /markets/detroit
              </Link>
              {" · "}
              <Link
                href="/states/michigan"
                className="text-primary font-semibold hover:underline"
              >
                Michigan rental market data
              </Link>
            </p>

            <h3 className="text-xl font-extrabold text-foreground mt-8 mb-2">
              5. Tennessee (Memphis + Nashville)
            </h3>
            <p>
              Tennessee does not tax individual wage income, but that fact alone
              does not determine a rental investor&apos;s after-tax result.
              Verify parcel-level property tax, insurance, local operating
              costs, entity and residency facts, and applicable state sourcing
              with current sources. Memphis and Nashville also have materially
              different property-level income, expense, and price dynamics.
            </p>
            <p>
              <strong>Memphis rental market data:</strong>{" "}
              <Link
                href="/markets/memphis"
                className="text-primary font-semibold hover:underline"
              >
                /markets/memphis
              </Link>
              {" · "}
              <Link
                href="/states/tennessee"
                className="text-primary font-semibold hover:underline"
              >
                Tennessee rental market data
              </Link>
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Tier 2 — Balanced cash + appreciation
            </h2>

            <h3 className="text-xl font-extrabold text-foreground mt-8 mb-2">
              6. North Carolina (Charlotte + Raleigh)
            </h3>
            <p>
              Charlotte is the best example of a market where you can still get
              conventional cash flow in some suburbs AND ride a real
              appreciation tailwind (the{" "}
              <a
                href="https://www2.census.gov/programs-surveys/popest/datasets/2020-2025/metro/totals/cbsa-est2025-alldata.csv"
                className="text-primary font-semibold hover:underline"
              >
                MSA added more than 50,000 residents a year in 2022–2025, per
                Census estimates
              </a>
              ; fintech + banking hub). NC property tax is low: in Mecklenburg
              County, median real estate taxes run{" "}
              <a
                href="https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/1YRData/acsdt1y2024-b25103.dat"
                className="text-primary font-semibold hover:underline"
              >
                about 0.68% of median home value (Census ACS 2024)
              </a>{" "}
              for owner-occupied homes; rentals can pay more.{" "}
              <a
                href="https://www.ncleg.gov/EnactedLegislation/Statutes/HTML/BySection/Chapter_105/GS_105-286.html"
                className="text-primary font-semibold hover:underline"
              >
                N.C. General Statute 105-286
              </a>{" "}
              requires each county to reappraise all real property at least
              every eighth year, and a county may adopt a shorter cycle, so
              expect step-changes rather than annual creep.
            </p>
            <p>
              <strong>Charlotte rental market data:</strong>{" "}
              <Link
                href="/markets/charlotte"
                className="text-primary font-semibold hover:underline"
              >
                /markets/charlotte
              </Link>
              {" · "}
              <Link
                href="/states/north-carolina"
                className="text-primary font-semibold hover:underline"
              >
                North Carolina rental market data
              </Link>
            </p>

            <h3 className="text-xl font-extrabold text-foreground mt-8 mb-2">
              7. Georgia (Atlanta + secondary cities)
            </h3>
            <p>
              Atlanta is a balanced cash + appreciation play; confirm the
              current dispossessory process and timelines for the county with
              local counsel before underwriting. Property tax is reasonable:
              Census ACS 2024 puts median real estate taxes at{" "}
              <a
                href="https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/1YRData/acsdt1y2024-b25103.dat"
                className="text-primary font-semibold hover:underline"
              >
                about 0.86% of median home value in Fulton County
              </a>{" "}
              for owner-occupied homes; rentals without homestead exemptions
              can pay more, so pull the parcel&apos;s bill.
            </p>
            <p>
              <strong>Atlanta rental market data:</strong>{" "}
              <Link
                href="/markets/atlanta"
                className="text-primary font-semibold hover:underline"
              >
                /markets/atlanta
              </Link>
              {" · "}
              <Link
                href="/states/georgia"
                className="text-primary font-semibold hover:underline"
              >
                Georgia rental market data
              </Link>
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Tier 3 — Appreciation leaders (low cap, growth bet)
            </h2>

            <h3 className="text-xl font-extrabold text-foreground mt-8 mb-2">
              8. Arizona (Phoenix)
            </h3>
            <p>
              Phoenix combines very low property tax (Census ACS 2024:{" "}
              <a
                href="https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/1YRData/acsdt1y2024-b25103.dat"
                className="text-primary font-semibold hover:underline"
              >
                median taxes about 0.40% of median home value in Maricopa
                County
              </a>{" "}
              for owner-occupied homes; rentals can pay more), low state income
              tax (
              <a
                href="https://azdor.gov/forms/individual/form-140-x-y-tables"
                className="text-primary font-semibold hover:underline"
              >
                a 2.5% flat rate for tax year 2023 and beyond, per the Arizona
                Department of Revenue
              </a>
              ), and strong net in-migration (
              <a
                href="https://www2.census.gov/programs-surveys/popest/datasets/2020-2025/metro/totals/cbsa-est2025-alldata.csv"
                className="text-primary font-semibold hover:underline"
              >
                about 300,000 net migrants and 354,000 added residents from July
                2020 to July 2025, per Census estimates
              </a>
              ). Cap rates are lower in core neighborhoods than in inner
              suburbs; verify each property&apos;s numbers. Long-term water
              supply for some far suburbs is a real question; check the
              parcel&apos;s water provider and any development restrictions.
              STR-permissive at state level: under{" "}
              <a
                href="https://www.azleg.gov/ars/9/00500-39.htm"
                className="text-primary font-semibold hover:underline"
              >
                A.R.S. 9-500.39
              </a>
              , a city or town may require a local permit or license but may
              not prohibit short-term rentals.
            </p>
            <p>
              <strong>Phoenix rental market data:</strong>{" "}
              <Link
                href="/markets/phoenix"
                className="text-primary font-semibold hover:underline"
              >
                /markets/phoenix
              </Link>
              {" · "}
              <Link
                href="/states/arizona"
                className="text-primary font-semibold hover:underline"
              >
                Arizona rental market data
              </Link>
            </p>

            <h3 className="text-xl font-extrabold text-foreground mt-8 mb-2">
              9. Florida (Tampa + Orlando + Jacksonville)
            </h3>
            <p>
              Florida is the textbook no-income-tax appreciation play. The catch
              in 2026 is insurance: property insurance is a large, volatile
              expense in Florida, so price it with a binding quote. A 7%
              headline cap, for example, can become 5% net once that quote is
              in. Always pull the binding quote BEFORE you commit; the
              seller&apos;s prior policy is not what you&apos;ll pay.
            </p>
            <p>
              <strong>Tampa rental market data:</strong>{" "}
              <Link
                href="/markets/tampa"
                className="text-primary font-semibold hover:underline"
              >
                /markets/tampa
              </Link>
              {" · "}
              <Link
                href="/states/florida"
                className="text-primary font-semibold hover:underline"
              >
                Florida rental market data
              </Link>
            </p>

            <h3 className="text-xl font-extrabold text-foreground mt-8 mb-2">
              10. Texas (Dallas-Fort Worth + Houston)
            </h3>
            <p>
              Texas is the trickiest top-10 entry. No state income tax + massive
              growth = the obvious appreciation thesis. The catch: Texas has the{" "}
              <a
                href="https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/1YRData/acsdt1y2024-b25103.dat"
                className="text-primary font-semibold hover:underline"
              >
                eighth-highest ratio of median property tax to median home value
                among the 50 states
              </a>{" "}
              — Census ACS 2024: about 1.31% statewide and about 1.4–1.5% in
              Dallas, Harris and Tarrant counties for owner-occupied homes (a
              rental&apos;s bill can differ), and homes in municipal utility
              districts (MUDs) can owe an extra district property tax (see{" "}
              <a
                href="https://www.tceq.texas.gov/downloads/water-districts/guidance/gi-043.pdf"
                className="text-primary font-semibold hover:underline"
              >
                TCEQ&apos;s guide to Texas water districts
              </a>
              ). The income-tax
              savings often get clawed back through property tax. Always pull
              the parcel-specific tax record from the County Appraisal District
              (Dallas CAD, Tarrant CAD, Collin CAD, Harris CAD).
            </p>
            <p>
              <strong>Dallas and Houston rental market data:</strong>{" "}
              <Link
                href="/markets/dallas"
                className="text-primary font-semibold hover:underline"
              >
                /markets/dallas
              </Link>{" "}
              ·{" "}
              <Link
                href="/markets/houston"
                className="text-primary font-semibold hover:underline"
              >
                /markets/houston
              </Link>
              {" · "}
              <Link
                href="/states/texas"
                className="text-primary font-semibold hover:underline"
              >
                Texas rental market data
              </Link>
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Honorable mentions
            </h2>
            <p>
              <strong>
                <Link
                  href="/states/pennsylvania"
                  className="text-foreground hover:text-primary hover:underline"
                >
                  Pennsylvania
                </Link>{" "}
                (Philadelphia + Pittsburgh)
              </strong>{" "}
              — Philly has uniquely strong neighborhood-by-neighborhood
              variation; the BRRRR + buy-and-hold math works in working-class
              North Philly while South Philly is appreciation-leaning. See the{" "}
              <Link
                href="/markets/philadelphia"
                className="text-primary font-semibold hover:underline"
              >
                Philadelphia rental market data
              </Link>
              .
            </p>
            <p>
              <strong>
                <Link
                  href="/states/alabama"
                  className="text-foreground hover:text-primary hover:underline"
                >
                  Alabama
                </Link>{" "}
                (Birmingham + Huntsville)
              </strong>{" "}
              — Birmingham has workforce neighborhoods where cap rates are worth
              testing, with low entry prices. Owner-occupied homes pay low
              property tax there (Alabama&apos;s statewide median real estate
              tax is{" "}
              <a
                href="https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/1YRData/acsdt1y2024-b25103.dat"
                className="text-primary font-semibold hover:underline"
              >
                about 0.38% of median home value, second-lowest among states
                after Hawaii
              </a>
              ; about 0.59% in Jefferson County — Census ACS 2024), but a rental
              is assessed at a higher ratio: the{" "}
              <a
                href="https://www.revenue.alabama.gov/property-tax/property-tax-assessment"
                className="text-primary font-semibold hover:underline"
              >
                Alabama Department of Revenue&apos;s assessment classes
              </a>{" "}
              put single-family owner-occupied homes in Class III at 10% of
              value and property not otherwise classified, which includes
              rentals, in Class II at 20%. Pull the parcel&apos;s bill.
            </p>
            <p>
              <strong>
                <Link
                  href="/states/oklahoma"
                  className="text-foreground hover:text-primary hover:underline"
                >
                  Oklahoma
                </Link>{" "}
                (Oklahoma City + Tulsa)
              </strong>{" "}
              — a cash-flow market with low entry prices (Census ACS 2024{" "}
              <a
                href="https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/1YRData/acsdt1y2024-b25077.dat"
                className="text-primary font-semibold hover:underline"
              >
                median home value: $244,000 in Oklahoma County and $259,100 in
                Tulsa County, vs $360,600 nationally
              </a>
              ). Property taxes on owner-occupied homes run near the national
              norm in Oklahoma City and Tulsa (Census ACS 2024:{" "}
              <a
                href="https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/1YRData/acsdt1y2024-b25103.dat"
                className="text-primary font-semibold hover:underline"
              >
                about 0.94% and 0.90% of median home value, vs 0.89%
                nationally
              </a>
              ); rentals can pay more.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              States to be cautious about
            </h2>
            <p>
              <strong>California</strong> — state and local rent, termination,
              notice, registration, and just-cause rules can depend on the
              property, exemption status, tenancy, and city. Verify current
              official guidance and local counsel; do not use a statewide
              cap-rate or eviction-time generalization as underwriting evidence.
            </p>
            <p>
              <strong>New York</strong> — tax and landlord-tenant rules vary
              sharply by locality, property, regulatory status, and proceeding.
              Obtain the current assessment, insurance quote, applicable
              rent-regulation status, and local legal process before modeling a
              deal.
            </p>
            <p>
              <strong>Illinois</strong> — assessment, taxes, licensing, tenant
              protections, and court procedure vary materially between Chicago,
              Cook County, and other municipalities. Use property-specific bills
              and current local legal guidance rather than a statewide ranking
              or fixed timeline.
            </p>
            <p>
              <strong>New Jersey</strong> — verify the actual assessment,
              municipal tax bill, permitted rent and lease terms, registration
              requirements, and current possession process for the property. A
              statewide label does not establish expense or legal risk.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              How to actually pick
            </h2>
            <p>
              Don&apos;t pick a state in the abstract. Pick a strategy first,
              then pick the state. Three common matches:
            </p>
            <ol>
              <li>
                <strong>Pure cash flow, hands-on or local PM:</strong>{" "}
                Indianapolis, Cleveland, Memphis, Kansas City, Birmingham
              </li>
              <li>
                <strong>
                  Balanced cash + appreciation, lower operational risk:
                </strong>{" "}
                Charlotte, Atlanta, Phoenix, Houston suburbs
              </li>
              <li>
                <strong>Value-growth thesis requiring downside tests:</strong>{" "}
                Nashville, Tampa, and DFW examples still require parcel-specific
                tax, insurance, operating-cost, and exit assumptions; state tax
                labels do not establish after-tax yield.
              </li>
            </ol>
            <p>
              Once you&apos;ve picked a state, pick the specific submarket using
              the city-level guides linked above, then run the actual property
              through{" "}
              <Link
                href="/"
                className="text-primary font-semibold hover:underline"
              >
                TrueCap
              </Link>{" "}
              with the address — the analyzer starts with a HUD area rent
              benchmark, a mortgage-rate benchmark, and editable assumptions.
              Enter the current local property-tax bill or a reviewed rate and
              verify every assumption before using the underwrite.
            </p>
          </div>
        </article>
        <PostSources
          sources={[
            {
              title: "U.S. Census Bureau, American Community Survey 2024 1-year, B25103 Median Real Estate Taxes Paid, owner-occupied housing units (summary file)",
              url: "https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/1YRData/acsdt1y2024-b25103.dat",
            },
            {
              title: "U.S. Census Bureau, American Community Survey 2024 1-year, B25077 Median Value, Owner-Occupied Housing Units (summary file)",
              url: "https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/1YRData/acsdt1y2024-b25077.dat",
            },
            {
              title: "Indiana Department of Local Government Finance, Property Tax Caps / Circuit Breaker Credits fact sheet (April 2024)",
              url: "https://www.in.gov/dlgf/files/240429-Fact-Sheet-Circuit-Breaker-Caps.pdf",
            },
            {
              title: "FHFA All-Transactions House Price Index for Indianapolis-Carmel-Anderson, IN (MSA), via FRED",
              url: "https://fred.stlouisfed.org/series/ATNHPIUS26900Q",
            },
            {
              title: "State Tax Commission of Missouri, Order to Jackson County regarding 2023 and 2024 assessments (August 6, 2024)",
              url: "https://stc.mo.gov/wp-content/uploads/sites/5/2024/08/Order-of-STC-to-Jackson-County-Regarding-2023-and-2024-Assessments.pdf",
            },
            {
              title: "U.S. Census Bureau, Vintage 2025 Metropolitan Population Estimates (CBSA-EST2025-alldata)",
              url: "https://www2.census.gov/programs-surveys/popest/datasets/2020-2025/metro/totals/cbsa-est2025-alldata.csv",
            },
            {
              title: "North Carolina General Statutes § 105-286 (county reappraisal schedule)",
              url: "https://www.ncleg.gov/EnactedLegislation/Statutes/HTML/BySection/Chapter_105/GS_105-286.html",
            },
            {
              title: "Arizona Department of Revenue, Form 140 X and Y tables page (flat 2.5% rate from tax year 2023)",
              url: "https://azdor.gov/forms/individual/form-140-x-y-tables",
            },
            {
              title: "Arizona Revised Statutes § 9-500.39 (city and town rules for vacation and short-term rentals)",
              url: "https://www.azleg.gov/ars/9/00500-39.htm",
            },
            {
              title: "Texas Commission on Environmental Quality, GI-043 Texas Water Districts: A General Guide (October 2019)",
              url: "https://www.tceq.texas.gov/downloads/water-districts/guidance/gi-043.pdf",
            },
            {
              title: "Alabama Department of Revenue, Property Tax Assessment (classes of property and assessment ratios)",
              url: "https://www.revenue.alabama.gov/property-tax/property-tax-assessment",
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
