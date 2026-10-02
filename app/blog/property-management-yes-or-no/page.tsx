/**
 * Blog post: Property management yes or no — the actual math
 *
 * High-intent decision post for owners debating self-management vs PM.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { PostSources } from "@/components/blog/post-sources";
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

const SLUG = "property-management-yes-or-no";
const TITLE = "Should I use a property management company? The actual math.";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Should I use a property management company?";
const DESCRIPTION =
  "Percent-of-rent fees, lease-up fees, and maintenance markup: does paying a PM still beat managing yourself? The break-even math, plus when to switch either way.";
const PUBLISHED_AT = "2026-05-24";
const MODIFIED_AT = lastmodFor("/blog/property-management-yes-or-no") ?? PUBLISHED_AT;
const READING_TIME = 8;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "property management vs self management",
    "should i use a property manager",
    "property management cost",
    "self managing rental",
    "property manager fee",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: { title: SERP_TITLE, description: DESCRIPTION, url: `/blog/${SLUG}`, type: "article", publishedTime: PUBLISHED_AT, modifiedTime: MODIFIED_AT },
  twitter: { card: "summary_large_image" },
};

export default function PropertyManagementPost() {
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
      { "@type": "ListItem", position: 1, name: "TrueCap", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${siteUrl}/blog` },
      { "@type": "ListItem", position: 3, name: TITLE, item: `${siteUrl}/blog/${SLUG}` },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={articleLd} />
      <JsonLd data={breadcrumbLd} />
      <main id="main" className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <article>
        <div className="mb-2"><Link href="/blog" className="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground">← Blog</Link></div>
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight tracking-tight text-balance">{TITLE}</h1>
          <p className="mt-3 text-2xs uppercase tracking-widest text-muted-foreground font-bold">
            {new Date(PUBLISHED_AT).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })} · {READING_TIME} min read
          </p>
          <BlogByline />
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Property managers usually charge a percentage of collected rent, and their fee schedules can add a lease-up fee and a maintenance markup. That sounds like it eats your cash flow alive. The honest math: it usually doesn&apos;t — and self-managing has real hidden costs that are easy to leave out of the math.
          </p>
        </header>

        <div className="prose prose-neutral max-w-none [&>p]:max-w-[68ch] [&>ul]:max-w-[68ch] [&>ol]:max-w-[68ch] [&>blockquote]:max-w-[68ch] [&>h2]:max-w-[68ch] [&>h3]:max-w-[68ch] text-foreground space-y-6 leading-relaxed">
          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">The PM cost structure (honest version)</h2>
          <p>
            A residential PM&apos;s fee schedule usually includes:
          </p>
          <ul>
            <li><strong>A percentage of collected rent</strong> (get the actual rate from local management agreements) — this is the line you&apos;ll see as the <Link href="/glossary/management-fee" className="text-primary font-semibold hover:underline">management fee</Link> on your operating statement</li>
            <li><strong>A lease-up (placement) fee</strong>, often quoted as a share of one month&apos;s rent, whenever they place a new tenant</li>
            <li><strong>A maintenance markup</strong> on coordinated repairs (they manage the contractor; you pay PM&apos;s rate, not direct contractor rate)</li>
            <li><strong>Occasional fees:</strong> renewal fee, eviction processing fee, sometimes a setup fee at onboarding</li>
          </ul>
          <p>
            An illustrative example (assumed fees, not market data) on a $1,500/mo rental: a 9% fee ($135/mo) + amortized lease-up of $50-100/mo + ~$30/mo of repair markup = <strong>~$215-265/mo all-in</strong>. That&apos;s about 14-18% of gross rent, well above the 9% headline fee alone.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">What you actually get for that</h2>
          <p>
            The PM&apos;s job is much more than &quot;collect rent.&quot; What they actually do:
          </p>
          <ul>
            <li><strong>Tenant screening</strong> — credit, criminal, eviction, employment, prior-landlord references. A bad tenant can cost you months of lost rent plus damages. PM screening at scale catches issues a single landlord wouldn&apos;t spot.</li>
            <li><strong>Marketing the unit</strong> — listing photos, Zillow/Apartments.com syndication, showings, application processing</li>
            <li><strong>Lease compliance</strong> — state-specific lease forms, security deposit handling per state law (tenant rights are usually spelled out in the lease and <a href="https://www.consumerfinance.gov/housing/housing-insecurity/help-for-renters/your-tenant-debt-collection-rights/" className="text-primary font-semibold hover:underline">state or local laws</a>), <a href="https://www.hud.gov/helping-americans/fair-housing-act-overview" className="text-primary font-semibold hover:underline">fair-housing</a> compliance, eviction process knowledge</li>
            <li><strong>24/7 maintenance dispatch</strong> — tenant calls them at 11pm about a broken heater, not you</li>
            <li><strong>Rent collection + late-fee enforcement</strong> — including the awkward phone call you don&apos;t want to make</li>
            <li><strong>Year-end accounting</strong> — <a href="https://www.irs.gov/taxtopics/tc414" className="text-primary font-semibold hover:underline">Schedule E</a> ready financials</li>
          </ul>
          <p>
            The value isn&apos;t the rent collection (anyone can do that). It&apos;s the systemic risk reduction — the bad-tenant problem and the legal-compliance problem are where unmanaged landlords lose real money.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">The actual self-management math</h2>
          <p>
            Self-management isn&apos;t free. The hidden costs:
          </p>
          <ul>
            <li><strong>Your time at fair-market hourly rate.</strong> Lease-up takes real hours (photos, listing, showings, application review, lease signing). Multiply your own hours by what your time is worth, every turnover.</li>
            <li><strong>Worse tenant screening.</strong> Some individual landlords skip parts of the credit, criminal and prior-landlord screening package many PMs use. Worse-screened tenant = higher eviction + damage risk. A single bad tenant can be expensive — model a bad-tenant scenario with your own rent and local eviction costs.</li>
            <li><strong>Legal exposure on lease terms.</strong> A friend&apos;s old lease or a generic template may include clauses your state&apos;s tenant law doesn&apos;t allow, so have the lease checked for your state.</li>
            <li><strong>Maintenance call interruptions.</strong> Pricing your evenings and weekends at $0/hr makes self-management look free. It isn&apos;t.</li>
          </ul>
          <p>
            Self-management makes sense at: 1-3 properties in your local market, you live within 30 min driving, you have evenings free, and you&apos;ve done it before (or you&apos;re willing to absorb the first-year learning curve).
          </p>
          <p>
            PM management makes sense at: 4+ properties (the time math flips), or out-of-state properties (you can&apos;t physically show or maintain remotely), or a primary career that doesn&apos;t leave evenings free, or properties in high-turnover student/transient markets.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">The break-even calculation</h2>
          <p>
            Quick framework (the 9%, 75%, 15% and $300 below are example assumptions; swap in the terms from the management agreement you&apos;d actually sign):
          </p>
          <p>
            <strong>PM annual cost</strong> = (rent × 0.09 × 12) + (rent × 0.75 × turnover_per_year) + (annual_maintenance × 0.15) + ($300 renewal fee × keep_rate)
          </p>
          <p>
            <strong>Self-management annual cost</strong> = (lease-up hours × your hourly rate × turnover_per_year) + (monthly admin hours × your hourly rate × 12) + (expected loss from worse screening × probability)
          </p>
          <p>
            On a $1,500/mo rental with 1.5-year average tenancy (about 0.67 turnovers a year, so a 0.33 keep rate), $2,000/year of maintenance, and a landlord who values their time at $50/hr:
          </p>
          <ul>
            <li><strong>PM cost:</strong> $1,620 (annual fee) + $750 (amortized lease-up) + $300 (maint markup) + $100 (renewal) = <strong>~$2,770/year</strong></li>
            <li><strong>Self cost:</strong> ~30 hours/year × $50 = $1,500, plus a higher expected loss from worse screening of ~2% of annual rent (~$360/year) = <strong>~$1,860/year</strong></li>
          </ul>
          <p>
            Self-management wins by ~$900/year here. BUT the standard deviation on self-management is much higher: one really bad tenant can add thousands to that &quot;worse screening loss&quot; number and self flips to a clear loss. PM is the lower-variance choice.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">The cases where PM is hard to skip</h2>
          <ul>
            <li><strong>Out-of-state properties.</strong> Flying out for every showing is hard to keep up past the first property. Bad PMs lose you money; the answer is to vet harder, not skip PM entirely.</li>
            <li><strong>You have a full-time career you don&apos;t want to interrupt.</strong> If your time is worth well over $50/hr, spending weekends on $50/hr tasks rarely pencils out.</li>
            <li><strong>You hate dealing with people.</strong> Yes, this is a real reason. The wrong landlord temperament will produce worse outcomes for both you and your tenants, and a PM acts as the necessary buffer.</li>
            <li><strong>Multi-family 5+ units.</strong> The compliance + turnover math at scale strongly favors PM, even for local landlords.</li>
          </ul>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">When to fire your PM</h2>
          <p>
            Switch back to self-management or change PMs when:
          </p>
          <ul>
            <li>Vacancy is materially above market — they&apos;re slow placing tenants</li>
            <li>Maintenance bills are consistently higher than what you can verify (~20%+ above local contractor pricing)</li>
            <li>Tenant complaints get routed to YOU instead of being handled before they reach you</li>
            <li>You can&apos;t get a real answer on a question within 48 hours</li>
            <li>They missed a legally required compliance step (state security-deposit rules, federal and state fair-housing requirements, etc.)</li>
          </ul>
          <p>
            The right PM is invisible — rent shows up monthly, statements arrive on time, problems get solved before you hear about them. If you&apos;re hearing about problems, switch.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">Modeling PM in your underwriting</h2>
          <p>
            Set the <strong>Management %</strong> field in <Link href="/" className="text-primary font-semibold hover:underline">TrueCap</Link> to <strong>the fee in the management agreement you&apos;d actually sign</strong> (TrueCap pre-fills 8%) for any property you don&apos;t plan to self-manage, and raise the <Link href="/glossary/maintenance-reserve" className="text-primary font-semibold hover:underline">maintenance</Link> % to cover the markup. If you&apos;re going to self-manage initially but expect to switch later (after the property is in your book and you stop having time), still underwrite at your quoted management fee — it&apos;s the more conservative truth and you don&apos;t want a deal that only works when you&apos;re donating your evenings. For the full operating-expense framework, see our <Link href="/blog/rental-property-pro-forma-explained" className="text-primary font-semibold hover:underline">rental property pro forma walkthrough</Link>.
          </p>
          <p>
            A deal that pencils at your quoted management fee can absorb a switch to PM if your life situation changes. A deal that only pencils at 0% management is fragile — you&apos;re effectively forced to never get sick, never travel, never have a baby, never have a demanding job.
          </p>
        </div>
        </article>
        <PostSources
          sources={[
            {
              title: "CFPB, Your tenant and debt collection rights",
              url: "https://www.consumerfinance.gov/housing/housing-insecurity/help-for-renters/your-tenant-debt-collection-rights/",
            },
            {
              title: "HUD, Fair Housing Act overview",
              url: "https://www.hud.gov/helping-americans/fair-housing-act-overview",
            },
            {
              title: "IRS Topic no. 414, Rental income and expenses",
              url: "https://www.irs.gov/taxtopics/tc414",
            },
          ]}
        />
        <RelatedContent kind="blog" slug={SLUG} title={TITLE} className="mt-10" />
        <RelatedBlogPosts currentSlug={SLUG} />
      </main>
      <div className="max-w-3xl mx-auto px-4 sm:px-6"><NewsletterSignup variant="expanded" source="blog" /></div>
      <BlogStickyCta />
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
