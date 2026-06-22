/**
 * Blog post: Property management yes or no — the actual math
 *
 * High-intent decision post for owners debating self-management vs PM.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "property-management-yes-or-no";
const TITLE = "Should I use a property management company? The actual math.";
const DESCRIPTION =
  "8-10% of rent + lease-up fees + maintenance markup — does paying a PM still beat managing yourself? The honest break-even math, plus when to switch each direction.";
const PUBLISHED_AT = "2026-05-24";
const MODIFIED_AT = "2026-06-01";
const READING_TIME = 8;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "property management vs self management",
    "should i use a property manager",
    "property management cost",
    "self managing rental",
    "property manager fee",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `/blog/${SLUG}`, type: "article", publishedTime: PUBLISHED_AT, modifiedTime: MODIFIED_AT, images: [{ url: "/home.jpg", width: 1200, height: 630, alt: TITLE }] },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
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
    author: { "@type": "Person", name: "Morgan Page", url: siteUrl },
    publisher: { "@id": `${siteUrl}/#organization` },
    mainEntityOfPage: `${siteUrl}/blog/${SLUG}`,
    isPartOf: { "@id": `${siteUrl}/blog#blog` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <main id="main" className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <article>
        <div className="mb-2"><Link href="/blog" className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground">← Blog</Link></div>
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight tracking-tight text-balance">{TITLE}</h1>
          <p className="mt-3 text-[11px] uppercase tracking-widest text-muted-foreground font-bold">
            {new Date(PUBLISHED_AT).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })} · {READING_TIME} min read
          </p>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Property managers charge 8-10% of collected rent, plus a lease-up fee, plus a maintenance markup. That sounds like it eats your cash flow alive. The honest math: it usually doesn&apos;t — and self-managing has real hidden costs most landlords don&apos;t price in.
          </p>
        </header>

        <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">The PM cost structure (honest version)</h2>
          <p>
            A typical residential PM in the US charges:
          </p>
          <ul>
            <li><strong>8-10% of collected rent</strong> (lower in cash-flow markets like the Midwest, higher in coastal markets) — this is the line you&apos;ll see as the <Link href="/glossary/management-fee" className="text-primary font-semibold hover:underline">management fee</Link> on your operating statement</li>
            <li><strong>Lease-up fee of 50-100% of one month&apos;s rent</strong> whenever they place a new tenant — typically every 1-3 years</li>
            <li><strong>Maintenance markup of 10-20%</strong> on coordinated repairs (they manage the contractor; you pay PM&apos;s rate, not direct contractor rate)</li>
            <li><strong>Occasional fees:</strong> renewal fee ($100-300), eviction processing fee, sometimes a setup fee at onboarding</li>
          </ul>
          <p>
            On a $1,500/mo rental in a typical Midwest market: $135/mo (9%) + amortized lease-up of $50-100/mo + ~$30/mo of repair markup = <strong>~$200-275/mo all-in</strong>. That&apos;s 13-18% of gross rent, not the 8-10% the headline number suggests.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">What you actually get for that</h2>
          <p>
            The PM&apos;s job is much more than &quot;collect rent.&quot; What they actually do:
          </p>
          <ul>
            <li><strong>Tenant screening</strong> — credit, criminal, eviction, employment, prior-landlord references. A bad tenant costs you 3-12 months of lost rent + damages. PM screening at scale catches issues a single landlord wouldn&apos;t spot.</li>
            <li><strong>Marketing the unit</strong> — listing photos, Zillow/Apartments.com syndication, showings, application processing</li>
            <li><strong>Lease compliance</strong> — state-specific lease forms, security deposit handling per state law, fair-housing compliance, eviction process knowledge</li>
            <li><strong>24/7 maintenance dispatch</strong> — tenant calls them at 11pm about a broken heater, not you</li>
            <li><strong>Rent collection + late-fee enforcement</strong> — including the awkward phone call you don&apos;t want to make</li>
            <li><strong>Year-end accounting</strong> — Schedule E ready financials</li>
          </ul>
          <p>
            The value isn&apos;t the rent collection (anyone can do that). It&apos;s the systemic risk reduction — the bad-tenant problem and the legal-compliance problem are where unmanaged landlords lose real money.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">The actual self-management math</h2>
          <p>
            Self-management isn&apos;t free. The hidden costs:
          </p>
          <ul>
            <li><strong>Your time at fair-market hourly rate.</strong> Lease-up alone is 15-25 hours (photos, listing, showings, application review, lease signing). At $50-100/hr fair-market opportunity cost, that&apos;s $750-2,500 of value, every turnover.</li>
            <li><strong>Worse tenant screening.</strong> Most individual landlords don&apos;t pay for the full credit + criminal + prior-landlord-call package PMs use. Worse-screened tenant = higher eviction + damage risk. A single bad tenant can cost $5-15k.</li>
            <li><strong>Legal exposure on lease terms.</strong> Using a friend&apos;s old lease or a generic template against your state&apos;s tenant law produces unenforceable clauses + lawsuit risk. PM lease forms are state-vetted.</li>
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
            Quick framework:
          </p>
          <p>
            <strong>PM annual cost</strong> = (rent × 0.09 × 12) + (rent × 0.75 × turnover_per_year) + (annual_maintenance × 0.15) + ($300 renewal fee × keep_rate)
          </p>
          <p>
            <strong>Self-management annual cost</strong> = (lease-up hours × your hourly rate × turnover_per_year) + (admin hours × $50/hr × 12) + (expected loss from worse screening × probability)
          </p>
          <p>
            On a $1,500/mo rental with 1.5-year average tenancy and a $200/month landlord at $50/hr opportunity cost:
          </p>
          <ul>
            <li><strong>PM cost:</strong> $1,620 (annual fee) + $750 (amortized lease-up) + $300 (maint markup) + $200 (renewal) = <strong>~$2,870/year</strong></li>
            <li><strong>Self cost:</strong> ~30 hours/year × $50 = $1,500, plus ~2% higher expected loss from worse screening (~$360/year) = <strong>~$1,860/year</strong></li>
          </ul>
          <p>
            Self-management wins by ~$1,000/year here. BUT the standard deviation on self-management is much higher: one really bad tenant adds $5-15k to that &quot;worse screening loss&quot; number and self flips to a clear loss. PM is the lower-variance choice.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">The cases where PM is non-negotiable</h2>
          <ul>
            <li><strong>Out-of-state properties.</strong> Even &quot;I&apos;ll fly out for showings&quot; investors stop doing this by deal #2. Bad PMs lose you money; the answer is to vet harder, not skip PM entirely.</li>
            <li><strong>You have a full-time career you don&apos;t want to interrupt.</strong> Software engineers making $200k+ shouldn&apos;t be doing $50/hr tasks on weekends. The math doesn&apos;t work; your time is worth too much.</li>
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
            <li>They missed a state-required compliance step (security deposit handling, fair-housing process, etc.)</li>
          </ul>
          <p>
            The right PM is invisible — rent shows up monthly, statements arrive on time, problems get solved before you hear about them. If you&apos;re hearing about problems, switch.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">Modeling PM in your underwriting</h2>
          <p>
            Set the <strong>Management %</strong> field in <Link href="/" className="text-primary font-semibold hover:underline">TrueCap</Link> to <strong>9% by default</strong> for any property you don&apos;t plan to self-manage, plus add 1-2pp to the <Link href="/glossary/maintenance-reserve" className="text-primary font-semibold hover:underline">maintenance</Link> % to cover the markup. If you&apos;re going to self-manage initially but expect to switch later (after the property is in your book and you stop having time), still underwrite at 9% — it&apos;s the more conservative truth and you don&apos;t want a deal that only works when you&apos;re donating your evenings. For the full operating-expense framework, see our <Link href="/blog/rental-property-pro-forma-explained" className="text-primary font-semibold hover:underline">rental property pro forma walkthrough</Link>.
          </p>
          <p>
            A deal that pencils at 9% management can absorb a switch to PM if your life situation changes. A deal that only pencils at 0% management is fragile — you&apos;re effectively forced to never get sick, never travel, never have a baby, never have a demanding job.
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
