/**
 * Blog post: Rental property pro forma explained.
 *
 * Targets queries: "rental property pro forma", "how to read a pro
 * forma", "real estate pro forma", "rental pro forma template", "pro
 * forma cap rate". High-intent investor education content.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "rental-property-pro-forma-explained";
const TITLE = "How to read a rental property pro forma (and the 7 lies inside most of them)";
const DESCRIPTION =
  "A pro forma is a seller's projection of how a rental property will perform — and it's almost always optimistic. Here's how to translate seller pro formas into real numbers, and the 7 line items most pro formas understate.";
const PUBLISHED_AT = "2026-05-26";
const MODIFIED_AT = "2026-06-01";
const READING_TIME = 9;

export const metadata: Metadata = {
  title: `${TITLE} | TrueCap`,
  description: DESCRIPTION,
  keywords: [
    "rental property pro forma",
    "how to read a pro forma",
    "real estate pro forma explained",
    "rental property pro forma template",
    "pro forma cap rate",
    "actual vs pro forma rent",
    "real estate underwriting pro forma",
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
    q: "What's the difference between pro forma and actual?",
    a: "Pro forma is what the seller projects the property will do AFTER you take it over. Actual is what the property has historically done. Pro formas typically assume higher rents, lower vacancy, lower expenses, and zero capex — the optimistic version of operations. Actuals reflect the real numbers, which are almost always less rosy. ALWAYS ask for actuals (T-12: trailing 12-month income/expense statement) and underwrite based on those, not on the pro forma.",
  },
  {
    q: "Why are pro formas always optimistic?",
    a: "Three reasons. (1) The seller's incentive is to make the property look good — pro formas are marketing documents. (2) Sellers often assume the buyer can raise rents to 'market' immediately; in practice that takes 1-3 years of turnover. (3) Sellers leave out capex reserves because the IRS doesn't require them on operating statements, and including them lowers the apparent cap rate. The pro forma 'cap rate' is almost always 1-3 percentage points higher than what you'd actually achieve.",
  },
  {
    q: "What's a T-12 and why does it matter?",
    a: "T-12 = trailing twelve months of actual income and expenses. It's the most important document in commercial real estate underwriting (5+ unit properties). For SFR purchases, ask for at least the last 12 months of bank statements showing actual rent collected and the actual property tax bill. The T-12 cuts through pro forma optimism and shows you what the property actually produces. If the seller won't provide it, that's a red flag.",
  },
  {
    q: "Can I trust a pro forma's vacancy assumption?",
    a: "Rarely. Most pro formas assume 3-5% vacancy. Real vacancy in most markets runs 6-10%. A single 30-day turnover = 8.3% vacancy for that year. Adjust upward — use 7-8% for B-class, 9-11% for C-class, 5-6% only for very stable A-class properties with long-term tenants. The pro forma's vacancy line is often the single biggest source of inflated cap rate.",
  },
  {
    q: "What expenses does the pro forma typically understate?",
    a: "Seven big ones: (1) maintenance (often shown at 4-5%, real is 6-10% for newer / 10-15% for older). (2) capex reserves (often $0, real is $50-200/mo per unit). (3) vacancy (3-5% pro forma, 6-10% real). (4) management (sometimes shown at $0 for 'self-managed,' but you should budget 8-10% even if you self-manage). (5) insurance (often shown at last year's rate, not current quote). (6) utilities (sometimes shown net of tenant reimbursements that don't actually happen). (7) legal/bad-debt (rarely shown at all; budget 1-2% of gross rent).",
  },
];

export default function ProFormaPost() {
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <main id="main" className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <article>
        <div className="mb-2"><Link href="/blog" className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground">← Blog</Link></div>
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight tracking-tight text-balance">{TITLE}</h1>
          <p className="mt-3 text-[11px] uppercase tracking-widest text-muted-foreground font-bold">
            {new Date(PUBLISHED_AT).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })} · {READING_TIME} min read
          </p>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Every rental property listed for sale comes with a pro forma — a seller&apos;s projection of how the property will perform after you take it over. And almost every one of those pro formas is misleading. Here&apos;s how to read one, what to verify, and the 7 line items where pro formas reliably lie.
          </p>
        </header>

        <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">What a pro forma actually is</h2>
          <p>
            A pro forma is a one-page (sometimes multi-page) projection of expected income and expenses for a rental property. Sellers use them to justify asking price by showing a strong projected cap rate. They&apos;re marketing documents, not financial statements.
          </p>
          <p>
            The lines are standard: gross rent, vacancy, operating expenses (broken into categories), net operating income (<Link href="/glossary/noi" className="text-primary font-semibold hover:underline">NOI</Link>), and the implied <Link href="/glossary/cap-rate" className="text-primary font-semibold hover:underline">cap rate</Link> at asking price.
          </p>
          <p>
            Your job as a buyer: translate the pro forma into reality, which usually means lowering rent assumptions, raising expense assumptions, adding line items the seller skipped, and recomputing the cap rate.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">Lie #1: Pro forma rent is &quot;market rent,&quot; not current rent</h2>
          <p>
            Many pro formas show &quot;projected market rent&quot; — what the seller thinks units could rent for after you raise them. Current actuals are often $200-400/mo less per unit.
          </p>
          <p>
            <strong>The translation:</strong> ask for the actual rent roll. Compare unit-by-unit to pro forma. If current rents are below pro forma, factor in 1-3 years of turnover before you reach pro forma rents — which means lower year-1 and year-2 cash flow than the pro forma shows.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">Lie #2: Vacancy at 3-5% (real is 6-10%)</h2>
          <p>
            Most pro formas use 3-5% vacancy. In reality, a single 30-day turnover = 8.3% vacancy for that year. Two turnovers per year on a 4-unit property = 4-8% blended.
          </p>
          <p>
            <strong>The translation:</strong> use 6-8% for B-class, 9-12% for C-class properties. Only use 5% if you have multiple years of actuals showing it.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">Lie #3: Insurance at last year&apos;s rate</h2>
          <p>
            The seller&apos;s pro forma insurance number is from their last bill. In hardening markets (FL, LA, TX coastal, CA fire zones), your new-buyer quote can be 40-80% higher than the seller&apos;s current premium.
          </p>
          <p>
            <strong>The translation:</strong> ALWAYS quote insurance yourself before closing. Use the higher of (a) your fresh quote and (b) the seller&apos;s number times 1.20.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">Lie #4: Property tax at current assessment (post-sale reassessment coming)</h2>
          <p>
            Many states reassess property tax based on sale price. Some counties have caps; others don&apos;t. If the seller bought 10 years ago and the property tax has been frozen, your post-sale tax bill might be 30-100% higher than the pro forma.
          </p>
          <p>
            <strong>The translation:</strong> ask your local title rep what the post-sale tax bill will be. Or check the county assessor&apos;s rules. Use the post-sale number in your underwriting.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">Lie #5: Zero capex reserve</h2>
          <p>
            Pro formas almost never include capex reserves — the savings you set aside each month for big-ticket replacements like roof, HVAC, and water heaters. This makes NOI (and therefore cap rate) look better than it actually is.
          </p>
          <p>
            <strong>The translation:</strong> add 5-10% of gross rent as <Link href="/glossary/capex" className="text-primary font-semibold hover:underline">capex reserve</Link>. For older properties (40+ years), use 8-12%. The cap rate drops accordingly — typically by 1-2 percentage points.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">Lie #6: Maintenance at 5% (real is 8-15%)</h2>
          <p>
            Maintenance differs from capex — these are the smaller, more frequent fixes (HVAC service, plumbing calls, appliance repairs, paint touch-ups, landscaping). Pro formas often show 3-5%; real numbers run 8-15% depending on age and class.
          </p>
          <p>
            <strong>The translation:</strong> 6-8% of rent for newer (post-2000) properties. 10-15% for pre-1980. Older Philadelphia rowhouses or Cleveland pre-WW2 stock can hit 15-20% in capex-heavy years.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">Lie #7: Management at $0 (because the owner self-manages)</h2>
          <p>
            Sellers who self-manage often show $0 management on the pro forma. This makes NOI look ~10% higher than it would be for a buyer who hires a property manager.
          </p>
          <p>
            <strong>The translation:</strong> always model 8-10% <Link href="/glossary/management-fee" className="text-primary font-semibold hover:underline">management</Link>, even if you plan to self-manage. Why? Your time has cost. AND if you ever sell or hand off the property, the next owner will need PM. A deal that only works at 0% management is a fragile deal.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">Lie #8 (bonus): Legal + bad debt at $0</h2>
          <p>
            Pro formas rarely include legal expenses (eviction processing, lease enforcement, attorney consultations) or bad debt (rent that&apos;s owed but never collected). Both are real costs.
          </p>
          <p>
            <strong>The translation:</strong> budget 1-2% of gross rent for combined legal + bad debt. Lower in landlord-friendly states (TX, FL, GA) with fast eviction processes; higher in tenant-leaning states (NY, NJ, CA, IL) where evictions take 60-180 days.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">The real-cap-rate worksheet</h2>
          <p>
            Take the seller&apos;s pro forma. For each line, apply the translation above:
          </p>
          <ul>
            <li><strong>Rent</strong>: use current rent (from rent roll), not projected market rent</li>
            <li><strong>Vacancy</strong>: use 7-8% B-class / 10-12% C-class</li>
            <li><strong>Insurance</strong>: use fresh quote in your name</li>
            <li><strong>Property tax</strong>: use post-sale reassessment estimate</li>
            <li><strong>Maintenance</strong>: 8-12% of rent depending on age</li>
            <li><strong>Capex reserve</strong>: 5-10% of rent (higher for older properties)</li>
            <li><strong>Management</strong>: 8-10% even if you self-manage</li>
            <li><strong>Legal / bad debt</strong>: 1-2% of gross rent</li>
          </ul>
          <p>
            Recompute NOI. Divide by asking price. You now have the realistic cap rate.
          </p>
          <p>
            In my experience, the realistic cap rate runs 1.5-3 percentage points BELOW the pro forma cap rate on most deals. An 8.5% pro forma cap often translates to a real 6-7% — still good in many markets, just not 8.5%.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">When to walk based on the gap</h2>
          <p>
            If the real cap is within 1 point of the pro forma cap, you&apos;re looking at an honest pro forma. Worth pursuing.
          </p>
          <p>
            If the gap is 1-2 points, normal optimism. Negotiate price down 5-8% to make the math work for you.
          </p>
          <p>
            If the gap is 2+ points, the seller either doesn&apos;t understand their own property or is actively misleading buyers. Walk OR negotiate hard.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">The TrueCap shortcut</h2>
          <p>
            You don&apos;t have to do this translation by hand on every deal. <Link href="/" className="text-primary font-semibold hover:underline">TrueCap</Link> takes the listing data, applies realistic expense assumptions for your property&apos;s age and market, and shows you the real cap rate next to the pro forma cap rate in 60 seconds. The number it shows is what you&apos;d actually achieve — not what the seller wants you to believe.
          </p>
          <p>
            For a refresher on the underlying math, see our <Link href="/blog/how-to-underwrite-a-rental-property-in-60-seconds" className="text-primary font-semibold hover:underline">60-second underwriting framework</Link>.
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
