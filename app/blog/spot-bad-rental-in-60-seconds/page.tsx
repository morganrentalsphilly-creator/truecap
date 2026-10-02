/**
 * Blog post: How to spot a bad rental deal in 60 seconds
 *
 * High-intent post — investors searching "how to know if a rental is
 * a bad deal" / "rental property red flags" / "should I buy this rental"
 * are at the bottom of the funnel.
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

const SLUG = "spot-bad-rental-in-60-seconds";
const TITLE = "How to spot a bad rental deal in 60 seconds — 7 red flags";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "How to spot a bad rental deal: 7 red flags";
const DESCRIPTION =
  "Seven red flags that tell you a rental may not pencil, checked before you spend hours on a full underwrite — a quick triage you can run in your head.";
const PUBLISHED_AT = "2026-05-24";
const MODIFIED_AT = lastmodFor("/blog/spot-bad-rental-in-60-seconds") ?? PUBLISHED_AT;
const READING_TIME = 8;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "rental property red flags",
    "how to know if a rental is a bad deal",
    "rental property due diligence",
    "should I buy this rental",
    "rental property warning signs",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    title: SERP_TITLE,
    description: DESCRIPTION,
    url: `/blog/${SLUG}`,
    type: "article",
    publishedTime: PUBLISHED_AT,
    modifiedTime: MODIFIED_AT,
  },
  twitter: { card: "summary_large_image" },
};

export default function SpotBadRentalPost() {
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
    isPartOf: { "@type": "Blog", "@id": `${siteUrl}/blog#blog` },
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
              Seven red flags that tell you a rental may not pencil — before
              you spend hours running the full underwrite. A quick triage you
              can run in your head in the time it takes to load the listing.
            </p>
          </header>

          <div className="prose prose-neutral max-w-none [&>p]:max-w-[68ch] [&>ul]:max-w-[68ch] [&>ol]:max-w-[68ch] [&>blockquote]:max-w-[68ch] [&>h2]:max-w-[68ch] [&>h3]:max-w-[68ch] text-foreground space-y-6 leading-relaxed">
            <p>
              Many experienced investors build a mental triage filter. They
              glance at a listing, look at five numbers, and either move on or
              open the analyzer. The point isn&apos;t to run a perfect
              underwrite in 60 seconds — it&apos;s to know whether the deal is
              worth the next 30 minutes.
            </p>
            <p>
              Here are seven red flags to run through, in this order.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              1. Gross rent is below 0.7% of price (the &quot;reverse 1%
              rule&quot;)
            </h2>
            <p>
              The classic{" "}
              <Link
                href="/glossary/1-percent-rule"
                className="text-primary font-semibold hover:underline"
              >
                1% rule
              </Link>{" "}
              says monthly rent should be at least 1% of purchase price.
              That&apos;s gotten harder to hit since 2020: FHFA&apos;s{" "}
              <a href="https://fred.stlouisfed.org/series/HPIPONM226S" className="text-primary font-semibold hover:underline">
                purchase-only house price index
              </a>{" "}
              rose about 59% from January 2020 to June 2026, while the{" "}
              <a href="https://fred.stlouisfed.org/series/CUSR0000SEHA" className="text-primary font-semibold hover:underline">
                CPI for rent of primary residence
              </a>{" "}
              rose about 33% through August 2026. But under 0.7% in a typical
              conventional-financing market is a red flag worth pausing on.
            </p>
            <p>
              The math: a $300k house renting for $1,800/mo (0.6%). At an
              assumed 7% rate with 25% down, principal and interest alone run
              about $1,500 a month, leaving roughly $300 for taxes, insurance,
              vacancy, and repairs — so expect negative cash flow. If
              you&apos;re still interested,
              you&apos;re betting on appreciation, not yield. That&apos;s a
              valid bet — but it&apos;s a different bet, and you should know
              you&apos;re making it.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              2. The parcel&apos;s property tax is above 2% of value
            </h2>
            <p>
              <Link
                href="/glossary/property-tax"
                className="text-primary font-semibold hover:underline"
              >
                Property tax
              </Link>{" "}
              is a recurring cost set by the local assessment and tax rate, not
              by the deal, and it{" "}
              <a href="https://www.consumerfinance.gov/ask-cfpb/why-did-my-monthly-mortgage-payment-go-up-or-change-en-213/" className="text-primary font-semibold hover:underline">
                can change from year to year
              </a>
              . In Illinois and New Jersey, the{" "}
              <a href="https://data.census.gov/api/access/data/table?id=ACSDT1Y2024.B25103&g=010XX00US$0400000" className="text-primary font-semibold hover:underline">
                median real estate tax bill
              </a>{" "}
              on owner-occupied homes is about 1.9% of the{" "}
              <a href="https://data.census.gov/api/access/data/table?id=ACSDT1Y2024.B25077&g=010XX00US$0400000" className="text-primary font-semibold hover:underline">
                median home value
              </a>
              , and in Texas about 1.3% (Census ACS 2024) — and rates vary by
              taxing district, so check the parcel&apos;s actual bill. A deal
              that looks great on rent-to-price can see its cash flow shrink
              sharply once the actual tax bill is in.
            </p>
            <p>
              Always pull the actual current tax bill from the local assessor or
              tax office for the specific parcel. The seller&apos;s last bill
              may not reflect the post-sale or post-reassessment amount — in
              some jurisdictions a{" "}
              <a href="https://selling-guide.fanniemae.com/sel/b3-6-03/monthly-housing-expense-subject-property" className="text-primary font-semibold hover:underline">
                transfer of ownership typically results in a reassessment
              </a>
              .
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              3. The listing photos are aggressively staged but exclude a room
            </h2>
            <p>
              This sounds like a soft signal, but it is worth a question. When
              you see 30 photos and they&apos;ve photographed the same living
              room from 4 angles but there&apos;s no kitchen shot or no bathroom
              shot, ask why and budget for the possibility that the room needs
              work.
            </p>
            <p>
              Related signal: the photos look professionally staged but the
              comps in the neighborhood are wholesaler-flagged. Check whether
              you&apos;re looking at a polished wholesaler listing, and price it
              from sold comps and your own numbers rather than the marketing.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              4. The HOA amount or condition is unresolved
            </h2>
            <p>
              HOA dues, reserves, planned work, insurance, delinquencies,
              litigation, rental restrictions, and special assessments can
              change the property&apos;s costs and permitted use. A listing
              amount alone does not resolve those questions.
            </p>
            <p>
              Request the current governing documents, budget, financial
              statements, reserve information, meeting materials, insurance, and
              assessment disclosures appropriate to the property. Review missing
              or incomplete evidence with the relevant local professionals and
              keep the risk unresolved in the model; a calculator should not
              tell you to proceed or terminate.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              5. Building systems and recent capital work are undocumented
            </h2>
            <p>
              Age alone does not establish condition or repair cost. Roof,
              electrical, plumbing, structure, moisture, environmental
              materials, and mechanical systems require property-specific
              inspection and, where appropriate, specialist review.
            </p>
            <p>
              Ask for permits, invoices, warranties, service records, and
              current condition evidence. Obtain local written estimates for
              identified work and disclose a separate uncertainty reserve
              instead of assuming a universal percentage or generic repair band.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              6. Marketing urgency is substituting for evidence
            </h2>
            <p>
              Phrases such as &quot;motivated seller&quot; or &quot;quick
              close&quot; do not prove property condition, tenant status, value,
              or the seller&apos;s reason for the requested timeline.
            </p>
            <p>
              Verify disclosures, title, leases and collections, property
              condition, comparable market evidence, and contract deadlines
              without inferring a hidden defect or tenant problem from the
              listing language.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              7. Model DSCR is based on unverified financing or NOI
            </h2>
            <p>
              <Link
                href="/glossary/dscr"
                className="text-primary font-semibold hover:underline"
              >
                DSCR
              </Link>{" "}
              divides a defined NOI by a defined debt-service amount. The result
              changes with the rent and expense evidence, rate, term,
              amortization, maturity, and the chosen convention. Lenders may
              calculate it differently and apply additional requirements. (See
              the{" "}
              <Link
                href="/blog/how-to-calculate-dscr#dscr-loans"
                className="text-primary font-semibold hover:underline"
              >
                DSCR loans guide
              </Link>
              .)
            </p>
            <p>
              Enter a current written financing proposal and property-specific
              NOI evidence. Use the ratio to identify questions for the lender
              and to compare disclosed scenarios—not as a prediction of approval
              or an instruction to buy, pass, or change leverage.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The 60-second test in practice
            </h2>
            <p>
              Open the listing. Check (1) rent-to-price ratio, (2) property tax
              in the listing (or pull it fast), (3) photo gaps, (4) HOA if
              applicable, (5) year built + capex hints, (6) listing urgency
              tone, (7) rough DSCR at YOUR rate.
            </p>
            <p>
              The number of open questions does not decide the acquisition. Use
              them to scope due diligence and identify unresolved assumptions.
              Open{" "}
              <Link
                href="/"
                className="text-primary font-semibold hover:underline"
              >
                TrueCap
              </Link>
              , paste the address, review the editable HUD rent and FRED rate
              benchmarks, then enter a local property-tax bill or reviewed rate
              before relying on the preliminary result.
            </p>
            <p>
              A fast screen should preserve uncertainty, not erase it. Spend
              deeper review time where the evidence can be obtained and the
              unresolved risks are material.
            </p>
          </div>
        </article>
        <PostSources
          sources={[
            {
              title:
                "FRED, FHFA Purchase-Only House Price Index for the United States (HPIPONM226S)",
              url: "https://fred.stlouisfed.org/series/HPIPONM226S",
            },
            {
              title:
                "FRED, BLS CPI for All Urban Consumers: Rent of Primary Residence (CUSR0000SEHA)",
              url: "https://fred.stlouisfed.org/series/CUSR0000SEHA",
            },
            {
              title: "CFPB, Why did my monthly mortgage payment go up or change?",
              url: "https://www.consumerfinance.gov/ask-cfpb/why-did-my-monthly-mortgage-payment-go-up-or-change-en-213/",
            },
            {
              title:
                "U.S. Census Bureau, American Community Survey 2024 1-year, Table B25103: Median Real Estate Taxes Paid, by state",
              url: "https://data.census.gov/api/access/data/table?id=ACSDT1Y2024.B25103&g=010XX00US$0400000",
            },
            {
              title:
                "U.S. Census Bureau, American Community Survey 2024 1-year, Table B25077: Median Value (Dollars), by state",
              url: "https://data.census.gov/api/access/data/table?id=ACSDT1Y2024.B25077&g=010XX00US$0400000",
            },
            {
              title:
                "Fannie Mae Selling Guide B3-6-03, Monthly Housing Expense for the Subject Property",
              url: "https://selling-guide.fanniemae.com/sel/b3-6-03/monthly-housing-expense-subject-property",
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
