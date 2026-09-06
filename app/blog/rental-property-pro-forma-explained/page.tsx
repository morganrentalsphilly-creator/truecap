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
import { RelatedContent } from "@/components/marketing/related-content";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "rental-property-pro-forma-explained";
const TITLE = "How to read a rental property pro forma (and verify its assumptions)";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "How to read a rental property pro forma (2026)";
const DESCRIPTION =
  "A pro forma is a seller's projection, not a result. Learn how to verify rent, vacancy, insurance, taxes, maintenance, reserves, management, and bad debt.";
const PUBLISHED_AT = "2026-05-26";
const MODIFIED_AT = "2026-08-15";
const READING_TIME = 9;

export const metadata: Metadata = {
  title: SERP_TITLE,
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

const FAQS = [
  {
    q: "What's the difference between pro forma and actual?",
    a: "A pro forma is a forward-looking projection; actuals show historical operations. Neither should be accepted without reconciliation. Request the rent roll, leases, collections, invoices, tax bills, insurance information, utility records, and a trailing operating statement, then adjust for ownership and post-sale changes.",
  },
  {
    q: "Why can a pro forma be optimistic?",
    a: "A seller may use projected rent, normalized vacancy, incomplete expenses, or no capital reserve. Compare every input with source documents and run current, downside, and delayed-rent scenarios. The gap from the seller's cap rate is property-specific; there is no universal haircut that predicts performance.",
  },
  {
    q: "What's a T-12 and why does it matter?",
    a: "T-12 = trailing twelve months of actual income and expenses. It's the most important document in commercial real estate underwriting (5+ unit properties). For SFR purchases, ask for at least the last 12 months of bank statements showing actual rent collected and the actual property tax bill. The T-12 cuts through pro forma optimism and shows you what the property actually produces. If the seller won't provide it, that's a red flag.",
  },
  {
    q: "Can I trust a pro forma's vacancy assumption?",
    a: "Treat vacancy as an assumption to verify. Derive it from the property's collections and turnover history, comparable properties, lease expirations, current concessions, manager records, and a downside case. Property class alone does not establish a defensible vacancy percentage.",
  },
  {
    q: "What expenses does the pro forma typically understate?",
    a: "Common omissions include maintenance, component replacements, vacancy and concessions, management, current buyer insurance, post-sale taxes, owner-paid utilities, legal costs, and bad debt. Support each line with property records, current quotes or bids, applicable tax information, and explicit downside scenarios rather than universal percentages.",
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
    author: { "@type": "Person", "@id": `${siteUrl}/about#morgan`, name: "Morgan Page", url: `${siteUrl}/about` },
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
            Your job as a buyer is to reconcile the projection to source documents, current quotes, and post-sale conditions, add omitted line items, and recompute the cap rate under base and downside scenarios.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">Risk #1: Projected &quot;market rent&quot; is not current collected rent</h2>
          <p>
            Many pro formas show projected market rent rather than current collected rent. The gap and the time required to reach a supported rent depend on the leases, unit condition, turnover, concessions, local rules, and current comps.
          </p>
          <p>
            <strong>Verification:</strong> obtain the rent roll, leases, concessions, deposits, and collection ledger. Compare unit by unit with current comparable leases and model the actual timing and cost of any turnover or renovation.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">Risk #2: Vacancy is a default rather than property evidence</h2>
          <p>
            A single annual percentage can hide physical vacancy, concessions, delinquency, bad debt, and make-ready downtime. The same percentage can imply very different operating histories.
          </p>
          <p>
            <strong>Verification:</strong> derive a base case from collections, turnover, lease expirations, concessions, and comparable manager data. Add a downside case with longer downtime or collection loss.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">Risk #3: Insurance at the seller&apos;s rate</h2>
          <p>
            The seller&apos;s premium may reflect different coverage, deductibles, claims, bundling, occupancy, or underwriting than a buyer will receive.
          </p>
          <p>
            <strong>Verification:</strong> obtain a current subject-property quote in the expected ownership and occupancy structure, then review limits, deductibles, exclusions, flood or wind needs, and loss-of-rent coverage.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">Risk #4: Property tax carried forward without a sale scenario</h2>
          <p>
            Assessment rules, exemptions, sale treatment, and billing cycles vary by jurisdiction. The seller&apos;s bill may not represent the buyer&apos;s stabilized obligation.
          </p>
          <p>
            <strong>Verification:</strong> review the parcel record and current assessor guidance, remove seller-specific exemptions, and model the applicable post-sale or reassessment case.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">Risk #5: Zero capital reserve</h2>
          <p>
            A pro forma may omit reserves for roofs, HVAC, water heaters, paving, plumbing, or other components. Omitting a reserve can make the projected cash available to the owner look stronger.
          </p>
          <p>
            <strong>Verification:</strong> build the <Link href="/glossary/capex" className="text-primary font-semibold hover:underline">capital reserve</Link> from component age, condition, remaining life, replacement scope, and current bids. Show it separately if the cap-rate convention excludes reserves from NOI.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">Risk #6: Maintenance based only on a percentage</h2>
          <p>
            Maintenance differs from capital replacement and includes recurring service, plumbing calls, appliance repairs, paint, landscaping, and other smaller work. A percentage alone does not capture property condition or service history.
          </p>
          <p>
            <strong>Verification:</strong> review work orders, invoices, inspection findings, service contracts, and manager experience with similar local properties. Run a higher-cost downside year separately.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">Risk #7: Management at $0 because the seller self-manages</h2>
          <p>
            A self-managed pro forma may show no management cost even when a buyer expects to hire a manager or wants to compare the property on an operator-neutral basis.
          </p>
          <p>
            <strong>Verification:</strong> obtain local <Link href="/glossary/management-fee" className="text-primary font-semibold hover:underline">management</Link> proposals that include leasing, renewal, maintenance markup, inspections, and termination fees. Model the actual plan and a third-party-management comparison.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">Risk #8: Legal costs and bad debt at $0</h2>
          <p>
            Pro formas rarely include legal expenses (eviction processing, lease enforcement, attorney consultations) or bad debt (rent that&apos;s owed but never collected). Both are real costs.
          </p>
          <p>
            <strong>Verification:</strong> use the property&apos;s collection history, manager records, lease terms, and current local legal guidance. Model a downside case rather than assigning a fixed cost from a state label or eviction timeline.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">The real-cap-rate worksheet</h2>
          <p>
            Take the seller&apos;s pro forma. For each line, apply the translation above:
          </p>
          <ul>
            <li><strong>Rent</strong>: use current rent (from rent roll), not projected market rent</li>
            <li><strong>Vacancy and bad debt</strong>: derive from collections, turnover, concessions, lease expirations, and a downside case</li>
            <li><strong>Insurance</strong>: use fresh quote in your name</li>
            <li><strong>Property tax</strong>: use post-sale reassessment estimate</li>
            <li><strong>Maintenance</strong>: use work orders, invoices, condition, and local service costs</li>
            <li><strong>Capital reserve</strong>: build from component age, remaining life, scope, and current bids</li>
            <li><strong>Management</strong>: use a current proposal matching the services you expect</li>
            <li><strong>Legal</strong>: use property history and current local guidance, plus a downside case</li>
          </ul>
          <p>
            Recompute NOI and divide by price. You now have a supported scenario, not a guaranteed cap rate.
          </p>
          <p>
            Compare the supported base and downside cases with the seller&apos;s projection. The gap is property-specific and should be explained by evidence, not a universal haircut.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">When to walk based on the gap</h2>
          <p>
            A small gap does not prove the projection is reliable. Confirm that the underlying rent, expense, timing, and condition evidence is complete.
          </p>
          <p>
            If the supported result differs, identify which assumptions create the gap and reprice only from the verified cash flows and your required return.
          </p>
          <p>
            A large unexplained gap is a diligence signal, not proof of intent. Request source documents, correct the model, and stop if material inputs cannot be verified.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">The TrueCap shortcut</h2>
          <p>
            You don&apos;t have to recompute every line by hand. <Link href="/" className="text-primary font-semibold hover:underline">TrueCap</Link> applies editable screening defaults and shows how the modeled cap rate changes when you replace them with verified property inputs. Its output is a scenario, not actual future performance.
          </p>
          <p>
            For a refresher on the underlying math, see our <Link href="/blog/how-to-underwrite-a-rental-property-in-60-seconds" className="text-primary font-semibold hover:underline">60-second underwriting framework</Link>.
          </p>
        </div>
        </article>
        <RelatedContent kind="blog" slug={SLUG} title={TITLE} className="mt-10" />
      </main>
      <RelatedBlogPosts currentSlug={SLUG} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6"><NewsletterSignup variant="expanded" source="blog" /></div>
      <BlogStickyCta />
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
