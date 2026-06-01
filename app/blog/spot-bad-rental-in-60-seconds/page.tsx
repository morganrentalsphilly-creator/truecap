/**
 * Blog post: How to spot a bad rental deal in 60 seconds
 *
 * High-intent post — investors searching "how to know if a rental is
 * a bad deal" / "rental property red flags" / "should I buy this rental"
 * are at the bottom of the funnel.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Calculator } from "lucide-react";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "spot-bad-rental-in-60-seconds";
const TITLE = "How to spot a bad rental deal in 60 seconds — 7 red flags";
const DESCRIPTION =
  "Seven red flags that tell you a rental property doesn't pencil — before you waste hours running the full underwrite. The triage every experienced investor does in their head.";
const PUBLISHED_AT = "2026-05-24";
const MODIFIED_AT = "2026-06-01";
const READING_TIME = 8;

export const metadata: Metadata = {
  title: `${TITLE} | TrueCap`,
  description: DESCRIPTION,
  keywords: [
    "rental property red flags",
    "how to know if a rental is a bad deal",
    "rental property due diligence",
    "should I buy this rental",
    "rental property warning signs",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `/blog/${SLUG}`, type: "article", publishedTime: PUBLISHED_AT, images: [{ url: "/home.jpg", width: 1200, height: 630, alt: TITLE }] },
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
    publisher: { "@id": `${siteUrl}/#organization` },
    isPartOf: { "@id": `${siteUrl}/blog#blog` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-2"><Link href="/blog" className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground">← Blog</Link></div>
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-foreground leading-tight tracking-tight text-balance">{TITLE}</h1>
          <p className="mt-3 text-[11px] uppercase tracking-widest text-muted-foreground font-bold">
            {new Date(PUBLISHED_AT).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })} · {READING_TIME} min read
          </p>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Seven red flags that tell you a rental doesn&apos;t pencil — before you waste hours running the full underwrite. The triage every experienced investor does in their head in the time it takes to load the listing.
          </p>
        </header>

        <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
          <p>
            Every serious rental investor builds a mental triage filter. They glance at a listing, look at five numbers, and either move on or open the analyzer. The point isn&apos;t to run a perfect underwrite in 60 seconds — it&apos;s to know whether the deal is worth the next 30 minutes.
          </p>
          <p>
            Here are the seven red flags I run through, in the order I check them.
          </p>

          <h2 className="text-2xl font-black text-foreground mt-10 mb-3">1. Gross rent is below 0.7% of price (the &quot;reverse 1% rule&quot;)</h2>
          <p>
            The classic <Link href="/glossary/1-percent-rule" className="text-primary font-semibold hover:underline">1% rule</Link> says monthly rent should be at least 1% of purchase price. That&apos;s gotten harder to hit since 2020 — many growing markets are 0.5-0.7% now. But under 0.7% in a typical conventional-financing market is a red flag worth pausing on.
          </p>
          <p>
            The math: a $300k house renting for $1,800/mo (0.6%) is going to have negative cash flow at almost any conventional financing in a normal rate environment. If you&apos;re still interested, you&apos;re betting on appreciation, not yield. That&apos;s a valid bet — but it&apos;s a different bet, and you should know you&apos;re making it.
          </p>

          <h2 className="text-2xl font-black text-foreground mt-10 mb-3">2. Property taxes are above 2% of value</h2>
          <p>
            <Link href="/glossary/property-tax" className="text-primary font-semibold hover:underline">Property tax</Link> is a fixed, recurring drag on cash flow that you can&apos;t negotiate. In Texas (1.6-2.5%+ effective), Illinois (2.3%+), or new-construction Sun Belt MUDs (2.8-3.2%+), a deal that looks great on rent-to-price can lose half its cash flow to the tax bill.
          </p>
          <p>
            Always pull the actual current tax bill from the County Appraisal District for the specific parcel. The seller&apos;s last bill may not reflect post-reassessment reality (especially in Jackson County MO, parts of Florida, and Texas MUDs).
          </p>

          <h2 className="text-2xl font-black text-foreground mt-10 mb-3">3. The listing photos are aggressively staged but exclude a room</h2>
          <p>
            This sounds like a soft signal. It&apos;s actually one of the strongest hard ones. When you see 30 photos and they&apos;ve photographed the same living room from 4 angles but there&apos;s no kitchen shot or no bathroom shot, the seller knows that room costs money to fix and they&apos;re not showing you. Budget rehab accordingly.
          </p>
          <p>
            Related signal: the photos look professionally staged but the comps in the neighborhood are wholesaler-flagged. You&apos;re looking at a polished wholesaler listing. Reduce your offer.
          </p>

          <h2 className="text-2xl font-black text-foreground mt-10 mb-3">4. The HOA is &quot;TBD&quot; or above $400/mo</h2>
          <p>
            HOA fees go up. Special assessments happen. An HOA that&apos;s currently $450/mo in a building that needs facade work in 5 years is a special-assessment time bomb that will eat 3 years of cash flow.
          </p>
          <p>
            For any condo or townhouse listing, the right reaction to a high HOA isn&apos;t &quot;I&apos;ll subtract it from my cash flow.&quot; It&apos;s &quot;let me request the HOA&apos;s last 2 years of financials, reserve study, and meeting minutes.&quot; If the seller can&apos;t produce them quickly, walk.
          </p>

          <h2 className="text-2xl font-black text-foreground mt-10 mb-3">5. The building was built before 1940 and the listing doesn&apos;t mention recent capex</h2>
          <p>
            Old housing stock isn&apos;t inherently bad — there are great pre-1940 rentals across Philadelphia, Cleveland, Indianapolis, KC, and the older Northeast. But the deferred-maintenance bill catches up. Roof, electrical service upgrade, plumbing replacement, foundation work, lead paint, knob-and-tube wiring, asbestos: each is a $5-20k surprise on a property that wasn&apos;t recently rehabbed.
          </p>
          <p>
            If the listing description doesn&apos;t prominently mention &quot;new roof 2023&quot; or &quot;updated electrical and plumbing,&quot; assume you&apos;re inheriting all of it. Budget 1-2% of purchase price as a first-year capex surprise even on top of your maintenance reserve.
          </p>

          <h2 className="text-2xl font-black text-foreground mt-10 mb-3">6. The seller is &quot;motivated&quot; for a reason they won&apos;t explain</h2>
          <p>
            Motivated sellers are great. Motivated sellers who give you a clear reason (relocation, inheritance, divorce, retirement) are even better — you can pattern-match the urgency and price accordingly.
          </p>
          <p>
            But when the listing screams &quot;motivated seller&quot; or &quot;quick close&quot; and there&apos;s no story, the story is usually one of three things: (a) the property has a hidden defect they don&apos;t want to disclose until inspection, (b) there&apos;s a tenant problem (squatter, non-paying long-term tenant, drug history), or (c) it&apos;s priced wrong for the market and they want speed before competing listings drop their price too. Any of those changes your offer math. Find out which.
          </p>

          <h2 className="text-2xl font-black text-foreground mt-10 mb-3">7. The DSCR is below 1.0 at your actual financing</h2>
          <p>
            <Link href="/glossary/dscr" className="text-primary font-semibold hover:underline">DSCR</Link> (debt service coverage ratio) is NOI divided by annual debt service. Below 1.0 means the property doesn&apos;t cover its mortgage from rent — you&apos;re feeding it. Below 1.25 is below the typical lender threshold for an investment-property loan, which limits your financing options to higher-rate DSCR lenders, hard money, or more cash down. (Deeper dive: <Link href="/blog/dscr-loans-explained" className="text-primary font-semibold hover:underline">DSCR loans explained</Link>.)
          </p>
          <p>
            Critical: this needs to be calculated at the rate and term YOU can actually get, not the seller&apos;s assumed rate. A deal that&apos;s 1.4 DSCR at 5% rate becomes 1.05 DSCR at 8% rate. The 60-second triage version: gross rent × 0.6 (approximate NOI) compared to annual P&amp;I. If it&apos;s less than 1.0× annual P&amp;I, walk unless you&apos;re bringing a lot of cash.
          </p>

          <h2 className="text-2xl font-black text-foreground mt-10 mb-3">The 60-second test in practice</h2>
          <p>
            Open the listing. Check (1) rent-to-price ratio, (2) property tax in the listing (or pull it fast), (3) photo gaps, (4) HOA if applicable, (5) year built + capex hints, (6) listing urgency tone, (7) rough DSCR at YOUR rate.
          </p>
          <p>
            If 5+ flags trip, move on. If 1-2 flags trip, you&apos;ve got an interesting deal that needs the full underwrite. Open <Link href="/" className="text-primary font-semibold hover:underline">TrueCap</Link>, paste the address, and let the analyzer do the rest — the form auto-fills rent, mortgage rate, and property tax, so you&apos;re running real numbers in 60 seconds.
          </p>
          <p>
            The best investors I know aren&apos;t running magic — they&apos;re running this filter, fast, on everything. The discipline isn&apos;t in the spreadsheet. It&apos;s in saying no to the 90% of listings that don&apos;t pass, so the underwriting hours go to the 10% that might.
          </p>
        </div>
      </article>
      <RelatedBlogPosts currentSlug={SLUG} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6"><NewsletterSignup variant="expanded" source="blog" /></div>
      <BlogStickyCta />
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
