/**
 * Blog post: The 50% rule for rentals — is it still useful in 2026?
 *
 * Short tactical post — the 50% rule is one of the most-searched
 * heuristics in rental investing. Honest take on when it works and
 * when it lies.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { RelatedContent } from "@/components/marketing/related-content";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "50-percent-rule-rentals";
const TITLE = "The 50% rule for rentals — is it still useful in 2026?";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "The 50% rule for rentals: still useful in 2026?";
const DESCRIPTION =
  "The 50% rule says operating expenses run about half of gross rent. When it works as a triage tool, when it misleads, and what to do when it cannot.";
const PUBLISHED_AT = "2026-05-25";
const MODIFIED_AT = "2026-08-15";
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
    author: { "@type": "Person", "@id": `${siteUrl}/about#morgan`, name: "Morgan Page", url: `${siteUrl}/about` },
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
              The 50% rule says: operating expenses (everything except debt
              service) typically run ~50% of gross rent. So NOI ≈ rent × 0.5,
              and your cash flow is whatever&apos;s left after your mortgage
              payment. Three-second triage. Does it still work in 2026?
            </p>
          </header>

          <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              What the rule actually says
            </h2>
            <p>
              The 50% rule, popularized in BiggerPockets-era investor
              communities, is a shorthand for estimating{" "}
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
              P&amp;I × 12) to get cash flow. The whole calculation takes ~10
              seconds.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Where it works well
            </h2>
            <p>
              The 50% rule is genuinely accurate for a specific kind of
              property:
            </p>
            <ul>
              <li>
                <strong>1940s-70s single-family rentals</strong> in Midwest
                workforce neighborhoods (think Indianapolis, Kansas City,
                Cleveland, Memphis)
              </li>
              <li>
                <strong>
                  Renting at market rates with full PM management (8-10% fee)
                </strong>
              </li>
              <li>
                <strong>In states with mid-range property tax</strong>{" "}
                (~1.0-1.5% effective)
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
              Across a portfolio of properties matching that profile, 50% is
              shockingly accurate over multi-year averages. Vacancy +
              maintenance + CapEx + PM + tax + insurance + everything else
              really does converge near half of gross rent.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Where it lies (loudly)
            </h2>

            <h3 className="text-xl font-extrabold text-foreground mt-8 mb-2">
              Texas / Illinois — high property tax
            </h3>
            <p>
              Texas effective property tax can hit 2.5-3.2% in new-construction
              MUD suburbs. On a $300k property renting for $2,400/mo, the
              property tax alone is $7,500-9,600/year — already 25-33% of gross
              rent. Add insurance + maintenance + vacancy + CapEx + management
              and you&apos;re at 60-65% expenses, not 50%. The 50% rule
              UNDERESTIMATES expenses by 20-30% in Texas. Deals that look great
              by the 50% rule actually break even or lose money.
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
              The 50% rule assumes ~5-8% CapEx reserve. Pre-1940 housing (much
              of Cleveland, Philadelphia, Detroit, Pittsburgh, parts of
              Baltimore) routinely consumes 10-15% in real-world CapEx — roof,
              electrical service upgrades, plumbing replacement, foundation
              work, lead paint. A property that pencils at the 50% rule may
              grind to break-even once the actual CapEx hits. Underwrite older
              buildings at 55-60% expense ratio.
            </p>

            <h3 className="text-xl font-extrabold text-foreground mt-8 mb-2">
              Short-term rentals (Airbnb / VRBO)
            </h3>
            <p>
              STRs run materially higher than 50% — typical operating expenses
              (cleaning fees per turnover, higher insurance, mgmt at 15-25%,
              higher maintenance from frequent turnover) hit 60-75% of gross
              revenue. The 50% rule doesn&apos;t apply at all to STR; use
              STR-specific underwriting.
            </p>

            <h3 className="text-xl font-extrabold text-foreground mt-8 mb-2">
              High HOA condos
            </h3>
            <p>
              An HOA of $400/mo on a $1,800/mo rental is already 22% of gross
              rent before any other expense. Add tax, insurance, maintenance,
              vacancy, CapEx and you&apos;re well above 50%. Many newer condos
              in growth markets (Charlotte, Phoenix, Atlanta) fit this profile.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Where it lies (quietly)
            </h2>
            <p>
              Owner-occupant house hacks, BRRRR mid-stabilization, properties
              with utilities included, properties with significant vacancy risk
              (college towns, transient neighborhoods), and properties in states
              with rent-control regimes (CA, OR, parts of NY) all have expense
              profiles that diverge from 50%. Don&apos;t use the rule on these
              without explicit adjustment.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              How to actually use it
            </h2>
            <p>
              The 50% rule is a{" "}
              <strong>triage tool, not a final-decision tool</strong>. Use it in
              5 seconds to decide whether a property is worth opening the full
              underwrite (the free{" "}
              <Link
                href="/analyze"
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
              Use it to filter out the bottom 80% of listings so you only spend
              serious time on the top 20%. For that top 20%, run the actual
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
              input. Five seconds with the 50% rule, then a property-specific
              underwrite before relying on the result.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              A better triage filter
            </h2>
            <p>
              If you want a faster + more accurate triage than the 50% rule:
            </p>
            <p>
              <strong>For high-property-tax states (TX, IL, NJ):</strong> Use
              the 60% rule. Operating expenses run closer to 60% of gross rent.
            </p>
            <p>
              <strong>
                For high-insurance states (FL, parts of LA + coastal NC/SC):
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
              individual property quirks (rent control, parking, parking,
              parking, special assessments). Always do the full underwrite.
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
              The investors who use it best treat it as a &quot;10-second
              listing filter&quot; while keeping the actual decision math
              separate. The investors who lose money on it use it as the actual
              underwriting calculation in markets where it&apos;s wrong by 15-25
              percentage points.
            </p>
          </div>
        </article>
        <RelatedContent kind="blog" slug={SLUG} title={TITLE} className="mt-10" />
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
