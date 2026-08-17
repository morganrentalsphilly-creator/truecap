/**
 * Blog post: House hacking explained — live (almost) for free in a 2-4 unit
 *
 * High-intent post for first-time buyers researching the strategy.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "house-hacking-explained";
const TITLE = "House hacking explained: how to (almost) live for free in a 2-4 unit";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "House hacking explained: live (almost) free (2026)";
const DESCRIPTION =
  "The actual math behind house hacking: FHA 3.5% down, owner-occupant rules, year-2 transition planning, and the deal types that make this strategy work in 2026.";
const PUBLISHED_AT = "2026-05-24";
const MODIFIED_AT = "2026-06-01";
const READING_TIME = 9;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "house hacking",
    "house hack investment",
    "fha 3.5 owner occupant",
    "2-4 unit owner occupant",
    "how to house hack",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: { title: SERP_TITLE, description: DESCRIPTION, url: `/blog/${SLUG}`, type: "article", publishedTime: PUBLISHED_AT, modifiedTime: MODIFIED_AT, images: [{ url: "/home.jpg", width: 1200, height: 630, alt: TITLE }] },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

export default function HouseHackingPost() {
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
      { "@type": "ListItem", position: 1, name: "TrueCap", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${siteUrl}/blog` },
      { "@type": "ListItem", position: 3, name: TITLE, item: `${siteUrl}/blog/${SLUG}` },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <main id="main" className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <article>
        <div className="mb-2"><Link href="/blog" className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground">← Blog</Link></div>
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight tracking-tight text-balance">{TITLE}</h1>
          <p className="mt-3 text-[11px] uppercase tracking-widest text-muted-foreground font-bold">
            {new Date(PUBLISHED_AT).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })} · {READING_TIME} min read
          </p>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            House hacking is the most under-rated path into rental investing. Done right, your tenants pay your mortgage and you build equity in property you live in — with as little as 3.5% down. Here&apos;s the actual math, the rules, and how to tell whether a specific 2-4 unit pencils.
          </p>
        </header>

        <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">What house hacking actually is</h2>
          <p>
            House hacking = you buy a 2-4 unit property using owner-occupant financing (FHA, conventional 5% down, or VA if you qualify), live in one unit yourself, and rent the others to cover most or all of your housing cost. After a year (the FHA + conventional owner-occupant residency minimum), you can move out and the property converts to a full investment rental.
          </p>
          <p>
            The leverage advantage is enormous. Compare:
          </p>
          <ul>
            <li><strong>Investment property:</strong> use a current written quote and include <Link href="/glossary/down-payment" className="text-primary font-semibold hover:underline">down payment</Link>, reserves, rate, points, insurance, and closing costs</li>
            <li><strong>Owner-occupant scenario:</strong> eligible borrowers may have lower-down-payment options, but rent is unverified and does not guarantee a housing-cost offset</li>
          </ul>
          <p>
            Compare actual quotes on the same property. A generic down-payment
            example cannot establish eligibility, cash to close, or capital
            efficiency for a borrower.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">The rules — what counts as a &quot;house hack&quot;</h2>
          <p>
            Owner-occupant requirements vary by program and loan documents. For
            example, current FHA policy generally includes:
          </p>
          <ul>
            <li><strong>You must occupy the property as your primary residence</strong> within 60 days of closing</li>
            <li><strong>Intent to continue principal-residence occupancy for at least one year</strong>, subject to Handbook exceptions and the facts</li>
            <li><strong>Eligible property and unit-count rules</strong> that the lender must verify</li>
            <li><strong>FHA Net Self-Sufficiency Rental Income Eligibility</strong> on 3-4 unit properties, calculated by the lender under the current Handbook</li>
          </ul>
          <p>
            Conventional programs use different eligibility and underwriting.
            Ask lenders for current written scenarios; the absence of FHA&apos;s
            calculation does not imply approval.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">The actual math — does it pencil?</h2>
          <p>
            The trap most first-timers fall into: they look at &quot;total rent collected vs. total mortgage&quot; and think they&apos;re living free. The honest math:
          </p>
          <p>
            <strong>True monthly out-of-pocket =</strong> Mortgage + property tax + insurance + utilities (for your unit) + reserves for vacancy + reserves for maintenance + reserves for CapEx — <strong>rent from other units</strong>.
          </p>
          <p>
            If you skip reserves, you&apos;ll get crushed the first year someone moves out or the roof needs work. Build them in: 5% vacancy on rented units, 10% maintenance, 5% CapEx (newer building) to 10% CapEx (older building).
          </p>
          <p>
            Quick triage:
          </p>
          <ul>
            <li><strong>True out-of-pocket = $0 or negative:</strong> Exceptional house hack. Your tenants pay 100%+ of your housing. Rare but real.</li>
            <li><strong>True out-of-pocket = $200-600/mo:</strong> Strong house hack. You&apos;re paying a fraction of market rent for your unit AND building equity.</li>
            <li><strong>True out-of-pocket = $600-1200/mo:</strong> Decent. Compare to market rent for similar housing in the area — usually still saves you money.</li>
            <li><strong>True out-of-pocket &gt; $1500/mo or close to market rent:</strong> Skip. You&apos;re basically just buying a primary residence with extra hassle.</li>
          </ul>
          <p>
            On TrueCap, set <strong>Property type = Owner-occupant</strong>, then enter per-unit rents (zero for your unit). The score uses owner-occupant break-even bands ($300/mo near-zero), not investor cash-flow bands ($1,000/mo).
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">FHA MIP — the catch nobody mentions</h2>
          <p>
            Mortgage-insurance amount and duration depend on the current program,
            loan terms, origination date, LTV, and payment history. Use the
            lender&apos;s written FHA and conventional quotes rather than a generic
            annual percentage or cancellation timeline.
          </p>
          <p>
            Translation: compare the complete written scenarios, including APR,
            points, mortgage insurance, reserves, cash to close, property
            requirements, and occupancy terms. Neither FHA nor conventional is
            universally cheaper or more available.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">The year-2 transition — when you move out</h2>
          <p>
            A year-2 move-out is a scenario, not an entitlement or a cash-flow
            promise. Before changing use, review the occupancy representations
            and loan documents, insurance, local rental rules, lawful unit status,
            and current rent evidence.
          </p>
          <p>
            Example scenario: a Philadelphia triplex at $400,000 with 5% down,
            two modeled rents of $1,400 in year 1, and a third modeled rent of
            $1,500 after a permitted move-out. If verified income and all modeled
            costs produced $900 per month, the simple <Link href="/glossary/cash-on-cash-return" className="text-primary font-semibold hover:underline">cash-on-cash calculation</Link>
            against only the $20,000 down payment would be 54%. That is not a
            forecast: include closing costs, reserves, vacancy, maintenance,
            capital work, taxes, insurance, utilities, management, loan terms,
            and lawful achievable rent before using the result.
          </p>
          <p>
            Model both years before you commit. TrueCap&apos;s 10-year projection
            shows entered scenarios; it does not establish that year 1 breaks
            even, a move-out is permitted, or later years produce positive cash
            flow.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">What to look for in a house-hack property</h2>
          <p>
            Best house-hack targets share traits:
          </p>
          <ul>
            <li><strong>2-4 units in a livable city neighborhood</strong> — you&apos;re going to live there for at least a year</li>
            <li><strong>Owner-occupied-friendly rent-to-price ratio</strong> — units should rent for 0.6-1%+ of price each</li>
            <li><strong>Separate utilities</strong> — sub-metered electric/gas means tenants pay their own, no allocation disputes</li>
            <li><strong>Newer roof, electrical, HVAC</strong> — you can&apos;t cash-out-refi-rehab during your live-in year easily; pick a property that doesn&apos;t need major capex up front</li>
            <li><strong>Good local PM market</strong> — when you move out in year 2, you&apos;ll likely hand it to a PM. Check fees and references before buying.</li>
            <li><strong>Reasonable school district</strong> for the next owner-occupant who buys it from you in 5-10 years</li>
          </ul>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">The honest downsides</h2>
          <p>
            House hacking isn&apos;t magic:
          </p>
          <ul>
            <li><strong>You live next to your tenants.</strong> Loud party at 2am? You&apos;re the one on the wall. Maintenance call at 7am? You&apos;re probably the one walking over.</li>
            <li><strong>You can only do this with FHA once at a time</strong> (FHA requires 1 primary residence per borrower at a time, mostly). You can chain conventional 5%-down owner-occupant loans but each needs the year of residency.</li>
            <li><strong>Year 1 cash flow is usually break-even or negative.</strong> Your personal balance sheet needs to carry that for 12 months until you can move out.</li>
            <li><strong>Tenant turnover during your residency hurts more</strong> — you can&apos;t easily move other units while you&apos;re living there to do rehab during turnover.</li>
          </ul>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">The bottom line</h2>
          <p>
            House hacking is the highest-leverage strategy in real estate that&apos;s actually accessible to a normal-income buyer. $10-20k down for a $300-400k 2-4 unit, year of living break-even, then year 2 onward producing real cash flow on what was originally your housing.
          </p>
          <p>
            The deals that pencil are out there in most US markets — Philadelphia, Cleveland, Indianapolis, Memphis, Pittsburgh, and the Midwest in general have the highest hit rate. Coastal markets are harder but not impossible (Sacramento, Oakland, parts of Boston). Run any specific property through{" "}
            <Link href="/" className="text-primary font-semibold hover:underline">TrueCap with property type = owner-occupant</Link> to see whether the math works before you commit. The starter template &quot;Starter — House hack&quot; on{" "}
            <Link href="/auth/sign-up?next=%2Fpricing%3Fcheckout%3Dpro_monthly%23plans" className="text-primary font-semibold hover:underline">Pro templates</Link> pre-seeds the right defaults. To find the kinds of motivated-seller 2-4 unit deals that make house hacking work, read <Link href="/blog/how-to-find-off-market-rental-properties" className="text-primary font-semibold hover:underline">how to find off-market rental properties</Link>.
          </p>
        </div>
        </article>
      </main>
      <RelatedBlogPosts currentSlug={SLUG} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6"><NewsletterSignup variant="expanded" source="blog" /></div>
      <BlogStickyCta />
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
