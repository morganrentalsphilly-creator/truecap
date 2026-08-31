/**
 * Blog post: How to spot a bad rental deal in 60 seconds
 *
 * High-intent post — investors searching "how to know if a rental is
 * a bad deal" / "rental property red flags" / "should I buy this rental"
 * are at the bottom of the funnel.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "spot-bad-rental-in-60-seconds";
const TITLE = "How to spot a bad rental deal in 60 seconds — 7 red flags";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "How to spot a bad rental deal: 7 red flags";
const DESCRIPTION =
  "Seven red flags that tell you a rental property doesn't pencil — before you waste hours running the full underwrite. The triage every experienced investor does in their head.";
const PUBLISHED_AT = "2026-05-24";
const MODIFIED_AT = "2026-08-29";
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
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: TITLE }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
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
    author: { "@type": "Person", name: "Morgan Page", url: siteUrl },
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
        item: `${siteUrl}/`,
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
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
              Seven red flags that tell you a rental doesn&apos;t pencil —
              before you waste hours running the full underwrite. The triage
              every experienced investor does in their head in the time it takes
              to load the listing.
            </p>
          </header>

          <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
            <p>
              Every serious rental investor builds a mental triage filter. They
              glance at a listing, look at five numbers, and either move on or
              open the analyzer. The point isn&apos;t to run a perfect
              underwrite in 60 seconds — it&apos;s to know whether the deal is
              worth the next 30 minutes.
            </p>
            <p>
              Here are the seven red flags I run through, in the order I check
              them.
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
              That&apos;s gotten harder to hit since 2020 — many growing markets
              are 0.5-0.7% now. But under 0.7% in a typical
              conventional-financing market is a red flag worth pausing on.
            </p>
            <p>
              The math: a $300k house renting for $1,800/mo (0.6%) is going to
              have negative cash flow at almost any conventional financing in a
              normal rate environment. If you&apos;re still interested,
              you&apos;re betting on appreciation, not yield. That&apos;s a
              valid bet — but it&apos;s a different bet, and you should know
              you&apos;re making it.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              2. Property taxes are above 2% of value
            </h2>
            <p>
              <Link
                href="/glossary/property-tax"
                className="text-primary font-semibold hover:underline"
              >
                Property tax
              </Link>{" "}
              is a fixed, recurring drag on cash flow that you can&apos;t
              negotiate. In Texas (1.6-2.5%+ effective), Illinois (2.3%+), or
              new-construction Sun Belt MUDs (2.8-3.2%+), a deal that looks
              great on rent-to-price can lose half its cash flow to the tax
              bill.
            </p>
            <p>
              Always pull the actual current tax bill from the County Appraisal
              District for the specific parcel. The seller&apos;s last bill may
              not reflect post-reassessment reality (especially in Jackson
              County MO, parts of Florida, and Texas MUDs).
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              3. The listing photos are aggressively staged but exclude a room
            </h2>
            <p>
              This sounds like a soft signal. It&apos;s actually one of the
              strongest hard ones. When you see 30 photos and they&apos;ve
              photographed the same living room from 4 angles but there&apos;s
              no kitchen shot or no bathroom shot, the seller knows that room
              costs money to fix and they&apos;re not showing you. Budget rehab
              accordingly.
            </p>
            <p>
              Related signal: the photos look professionally staged but the
              comps in the neighborhood are wholesaler-flagged. You&apos;re
              looking at a polished wholesaler listing. Reduce your offer.
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
                href="/blog/dscr-loans-explained"
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
