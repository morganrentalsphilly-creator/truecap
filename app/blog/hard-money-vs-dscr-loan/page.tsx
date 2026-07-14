/**
 * Strategy blog post — Hard money vs DSCR loan comparison.
 *
 * Targets high-intent queries:
 *   - "hard money vs dscr"
 *   - "dscr vs hard money"
 *   - "hard money loan vs dscr loan"
 *   - "which loan for brrrr"
 *   - "fix and flip loan"
 *   - "rental property loan options"
 *   - "non-qm investor loans"
 *   - "bridge loan vs dscr"
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Calculator } from "lucide-react";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "hard-money-vs-dscr-loan";
const TITLE = "Hard money vs DSCR: which loan product is right for your next deal in 2026";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Hard money vs DSCR loan: which to use in 2026";
const DESCRIPTION =
  "Hard money and DSCR loans solve different problems. Hard money is short-term capital for a deal you&apos;ll rehab and exit; DSCR is long-term capital for a rental you&apos;ll hold. Picking the wrong one costs you 4-6 points and 18 months of friction. Here&apos;s how to choose.";
const PUBLISHED_AT = "2026-06-07";
const MODIFIED_AT = "2026-06-07";
const READING_TIME_MIN = 11;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "hard money vs dscr",
    "dscr vs hard money",
    "hard money loan vs dscr loan",
    "which loan for brrrr",
    "fix and flip loan",
    "rental property loan options",
    "non-qm investor loans",
    "bridge loan vs dscr",
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
  twitter: {
    card: "summary_large_image",
    title: SERP_TITLE,
    description: DESCRIPTION,
    images: ["/home.jpg"],
  },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "What's the core difference between hard money and DSCR?",
    a: "Time horizon and what's being underwritten. Hard money is short-term (6-18 months), asset-collateralized capital priced for speed and ARV (after-repair value); the lender underwrites the deal, the rehab budget, and the exit plan. DSCR is long-term (30-year amortization), property-cash-flow-underwritten capital priced for a stabilized rental; the lender underwrites the property's DSCR ratio, your credit, and reserves. They're not substitutes — they're sequential.",
  },
  {
    q: "Which loan should I use for a BRRRR deal?",
    a: "Both, in sequence. Use hard money or a fix-and-flip bridge to acquire and rehab (6-12 months, 10-14% rate, 2-4 points). Once the property is stabilized and rented, refi into a DSCR loan at 30-year amortization to pull your cash out and start cash-flowing. Trying to use DSCR for the acquisition usually fails because the property doesn't yet have a tenant or condition that supports the DSCR underwrite.",
  },
  {
    q: "Which is more expensive?",
    a: "Hard money is dramatically more expensive per month — 10-14% rates, 2-4 points origination, $500-1500 in junk fees, 6-18 month terms. But you pay it for months, not years. DSCR runs 7.25-9.0% in 2026 with 0.5-1.5 points. Over a 5-year hold, total dollar cost on a $300K loan: hard money 6 months ~$15-22K all-in; DSCR 5 years ~$110-135K interest paid. They're not comparable — they're solving different problems.",
  },
  {
    q: "Can I use a DSCR loan as my exit on a fix-and-flip?",
    a: "Only if you change strategy and hold as a rental. DSCR is for hold-to-rent properties. If you intend to sell, the exit on a fix-and-flip is the buyer's purchase mortgage (the next owner's loan) — you just pay off the hard money. Don't refi into a DSCR for a property you're going to flip 60 days later; the DSCR prepayment penalty (typically 5-year step-down) wipes out any savings.",
  },
  {
    q: "How fast can each one close?",
    a: "Hard money: 5-14 days routinely, 3 days with strong relationships. DSCR: 21-30 days standard, 14 days expedited. If you're competing for a deal where the seller wants a fast close (auction, distressed listing, off-market), hard money wins. If you have 30+ days, DSCR gives you a much better long-term rate.",
  },
  {
    q: "What credit score do I need for each?",
    a: "Hard money: typically 620 minimum, some asset-based programs go to 580 or have no credit score requirement at all (they price on LTV and ARV). DSCR: 660-680 minimum, best pricing at 720+. Hard money lenders are buying the deal; DSCR lenders are buying the property plus the borrower.",
  },
  {
    q: "Should I ever use hard money for a long-term hold?",
    a: "Almost never. The only case is when you're confident the property's DSCR after rehab will support a DSCR refi within 6-9 months, you can't qualify conventionally during the rehab period (because the property isn't habitable), and the deal is too good to skip. Even then, build a hard-money-to-DSCR refi calendar before you close and confirm with the DSCR lender what conditions need to hold. The danger case is buying with hard money planning to refi to DSCR, then discovering at month 9 that the appraised rent doesn't support DSCR underwriting and you can't exit.",
  },
];

export default function BlogPost() {
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/blog/${SLUG}`;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${canonicalUrl}#article`,
    headline: TITLE,
    description: DESCRIPTION,
    datePublished: PUBLISHED_AT,
    dateModified: MODIFIED_AT,
    author: { "@type": "Person", name: "Morgan Page", url: siteUrl },
    publisher: { "@id": `${siteUrl}/#organization` },
    mainEntityOfPage: canonicalUrl,
    image: [`${siteUrl}/home.jpg`],
    inLanguage: "en-US",
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
        <header className="mb-8 sm:mb-10">
          <Link href="/blog" className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground">
            ← TrueCap Blog
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-2 leading-tight text-balance">
            {TITLE}
          </h1>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold mt-3">
            {new Date(PUBLISHED_AT).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}{" "}
            · {READING_TIME_MIN} min read
          </p>
          <p className="text-base sm:text-lg text-muted-foreground mt-4 leading-relaxed">
            Hard money and DSCR loans solve different problems. Hard money
            is short-term capital for a deal you&apos;ll rehab and exit;
            DSCR is long-term capital for a rental you&apos;ll hold.
            Picking the wrong one costs you 4-6 points and 18 months of
            friction. Here&apos;s how to choose.
          </p>
        </header>

        <article className="prose prose-slate max-w-none [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground [&_li]:leading-relaxed [&_strong]:text-foreground">
          <p>
            Both products exist for the same reason: conventional financing
            doesn&apos;t fit investor deals once you&apos;re past your
            first 1-2 properties. But they solve different problems, and
            using the wrong one costs you 4-6 percentage points of rate,
            2-3 points of fees, and often a deal-killing prepayment
            penalty.
          </p>
          <p>
            Hard money and DSCR aren&apos;t alternatives. They&apos;re
            sequential. Most experienced investors use both — hard money
            to acquire and rehab, DSCR to refi into long-term cash flow.
            This post walks through how each works, when each makes sense,
            and the BRRRR-specific sequencing that ties them together.
          </p>

          <h2 className="text-2xl sm:text-3xl">What hard money actually is</h2>
          <p>
            Hard money is short-term, asset-collateralized capital. The
            lender is a private fund or individual underwriting the
            <em> deal</em> — not you. They look at:
          </p>
          <ul>
            <li><strong>Purchase price</strong> and <strong>ARV</strong>
              (after-repair value, the value of the property post-rehab).</li>
            <li><strong>Rehab budget</strong> and your contractor&apos;s
              scope.</li>
            <li><strong>Exit plan</strong> — flip-and-sell or
              refi-and-hold — with a credible timeline.</li>
            <li><strong>Your experience</strong> — how many similar deals
              you&apos;ve completed.</li>
          </ul>
          <p>Typical terms in mid-2026:</p>
          <ul>
            <li><strong>Rate:</strong> 10-14% interest-only.</li>
            <li><strong>Origination:</strong> 2-4 points.</li>
            <li><strong>Term:</strong> 6-12 months (extendable, usually
              for another point).</li>
            <li><strong>LTV:</strong> 70-75% of purchase price; 65-70% of
              ARV total (purchase + rehab combined).</li>
            <li><strong>Down payment:</strong> 10-25% on purchase + you
              fund rehab from your own pocket (lender reimburses via
              draws).</li>
          </ul>

          <h2 className="text-2xl sm:text-3xl">What DSCR actually is</h2>
          <p>
            <Link href="/blog/dscr-loans-explained" className="text-primary font-semibold hover:underline">DSCR</Link> (Debt Service Coverage Ratio) loans are long-term,
            cash-flow-underwritten investment property mortgages. The
            lender doesn&apos;t care about your personal income. They care
            whether the property&apos;s rental income covers the mortgage
            payment with margin.
          </p>
          <p>Typical terms in mid-2026:</p>
          <ul>
            <li><strong>Rate:</strong> 7.25-9.0% fixed.</li>
            <li><strong>Term:</strong> 30-year amortization.</li>
            <li><strong>LTV:</strong> 75-80% purchase; 70-75% cash-out refi.</li>
            <li><strong>Down payment:</strong> 20-25%.</li>
            <li><strong>DSCR minimum:</strong> 1.0-1.25.</li>
            <li><strong>Prepayment penalty:</strong> typically 3-5 year
              step-down (5/4/3/2/1% of balance if you pay off early).</li>
          </ul>

          <h2 className="text-2xl sm:text-3xl">Side-by-side comparison</h2>
          <div className="not-prose overflow-x-auto rounded-xl border border-border bg-card my-6">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left p-3 font-bold text-foreground">Dimension</th>
                  <th className="text-left p-3 font-bold text-foreground">Hard money</th>
                  <th className="text-left p-3 font-bold text-foreground">DSCR loan</th>
                </tr>
              </thead>
              <tbody className="[&_td]:p-3 [&_td]:border-b [&_td]:border-border [&_tr:last-child_td]:border-0">
                <tr><td className="text-muted-foreground">Purpose</td><td>Short-term capital for acquire + rehab</td><td>Long-term capital for stabilized rental</td></tr>
                <tr><td className="text-muted-foreground">Term</td><td>6-18 months</td><td>30-year amortization</td></tr>
                <tr><td className="text-muted-foreground">Rate (2026)</td><td>10-14%</td><td>7.25-9.0%</td></tr>
                <tr><td className="text-muted-foreground">Points / fees</td><td>2-4 points + $500-1500 junk</td><td>0.5-1.5 points</td></tr>
                <tr><td className="text-muted-foreground">Speed to close</td><td>5-14 days</td><td>21-30 days</td></tr>
                <tr><td className="text-muted-foreground">What&apos;s underwritten</td><td>Deal + rehab + exit + your experience</td><td>Property DSCR + your credit + reserves</td></tr>
                <tr><td className="text-muted-foreground">LTV</td><td>70-75% purchase, 65-70% ARV total</td><td>75-80% purchase, 70-75% cash-out refi</td></tr>
                <tr><td className="text-muted-foreground">Prepay penalty</td><td>None (or 3-month minimum interest)</td><td>3-5 year step-down typical</td></tr>
                <tr><td className="text-muted-foreground">Credit score min</td><td>580-620 (some asset-only)</td><td>660-680, best pricing 720+</td></tr>
                <tr><td className="text-muted-foreground">Income docs</td><td>Minimal or none</td><td>None</td></tr>
                <tr><td className="text-muted-foreground">LLC title OK?</td><td>Yes</td><td>Yes</td></tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl sm:text-3xl">The BRRRR sequencing playbook</h2>
          <p>
            BRRRR (Buy, Rehab, Rent, Refinance, Repeat) is the use case
            where these two products work together. Done right:
          </p>
          <ol>
            <li><strong>Acquire</strong> with hard money. The property is
              distressed and won&apos;t pass conventional or DSCR
              underwriting because it&apos;s not rentable in its current
              state.</li>
            <li><strong>Rehab</strong> over 60-150 days. Hard money funds
              draws as work is completed.</li>
            <li><strong>Rent</strong> the property at market rate. Document
              the lease — you&apos;ll need it for the DSCR refi.</li>
            <li><strong>Refinance</strong> into a DSCR loan. The new
              appraisal at ARV plus the executed lease lets you pull your
              original cash out and lock 30-year financing.</li>
            <li><strong>Repeat</strong> with the recycled capital.</li>
          </ol>

          <p>Worked example. $150K purchase, $50K rehab, $250K ARV.</p>
          <ul>
            <li><strong>Hard money acquisition:</strong> 75% of $150K =
              $112.5K loan. You bring $37.5K + closing + rehab $50K =
              ~$92K cash in.</li>
            <li><strong>Rehab 4 months:</strong> ~$5K interest ($112.5K
              × 11% × 4/12) + 2 points origination = $7.25K total cost.</li>
            <li><strong>Refi to DSCR:</strong> 75% of $250K ARV = $187.5K
              new loan. Pays off $112.5K hard money + closing costs ~$5K
              = $70K cash back to you.</li>
            <li><strong>Net cash trapped after refi:</strong> $92K in
              − $70K out = $22K trapped. Property is now cash-flowing on
              a 30-year DSCR loan.</li>
          </ul>
          <p>
            Try to do this with DSCR from day one and you fail: the
            property isn&apos;t rentable, there&apos;s no lease, the DSCR
            underwriter won&apos;t finance it. Try to do it with hard
            money and hold long-term and you can&apos;t survive 12%
            interest indefinitely.
          </p>

          <h2 className="text-2xl sm:text-3xl">The fix-and-flip case (hard money only)</h2>
          <p>
            If you&apos;re flipping — rehabbing and selling within 12
            months — hard money is the entire financing stack. The exit
            isn&apos;t a refi; it&apos;s the buyer&apos;s purchase
            mortgage. You pay off the hard money at closing.
          </p>
          <p>
            Don&apos;t refi a flip into DSCR mid-project to &ldquo;save
            money.&rdquo; The DSCR prepayment penalty (5-year step-down)
            kills any rate savings, and DSCR underwriters don&apos;t
            finance properties with intent to sell.
          </p>

          <h2 className="text-2xl sm:text-3xl">The hold case (DSCR only or conventional + DSCR)</h2>
          <p>
            If you&apos;re buying a turnkey or lightly-renovated property
            that will be a long-term rental from day one, skip hard money
            entirely. Use:
          </p>
          <ul>
            <li><strong>Conventional</strong> if you have 10 or fewer
              financed properties and your personal DTI works.</li>
            <li><strong>DSCR</strong> if you&apos;re past 10 financed,
              self-employed with paper losses, buying through an LLC, or
              your personal DTI is tight.</li>
          </ul>

          <h2 className="text-2xl sm:text-3xl">The dangerous middle case</h2>
          <p>
            The case to watch for: buying a property that&apos;s habitable
            now but needs $20-40K of value-add rehab over 6-12 months.
            You could buy it conventionally and rehab from cash flow, you
            could buy it with hard money and refi after rehab, or you
            could try to do both (buy conventionally, then HELOC or
            cash-out refi for rehab).
          </p>
          <p>
            The trap: investors buy these with hard money &ldquo;to be
            safe&rdquo; and then discover their post-rehab ARV
            doesn&apos;t support a DSCR refi at the LTV they need. Now
            they&apos;re stuck paying 12% interest while they figure it
            out. Before using hard money, model the refi exit first — if
            the ARV, rent, and DSCR don&apos;t support the refi you need,
            the deal doesn&apos;t work even at 70% LTV.
          </p>

          <div className="not-prose">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-bold hover:opacity-95 transition-opacity"
            >
              <Calculator className="w-4 h-4" />
              Model the deal with both financing structures
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          <p className="text-sm text-muted-foreground mt-6">
            Related reading: <Link href="/blog/dscr-loans-explained" className="text-primary font-semibold hover:underline">DSCR loans explained</Link>, <Link href="/blog/brrrr-method-explained" className="text-primary font-semibold hover:underline">BRRRR method explained</Link>, <Link href="/blog/how-to-refinance-a-rental-property" className="text-primary font-semibold hover:underline">How to refinance a rental property</Link>.
          </p>

          <h2 className="text-2xl sm:text-3xl">FAQ</h2>
          {FAQS.map((f, i) => (
            <details key={i} className="not-prose bg-card border border-border rounded-xl p-4 sm:p-5 mb-3">
              <summary className="cursor-pointer font-bold text-foreground">
                {f.q}
              </summary>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {f.a}
              </p>
            </details>
          ))}
        </article>

        <RelatedBlogPosts currentSlug={SLUG} />
        <div className="max-w-3xl mx-auto px-4 sm:px-6"><NewsletterSignup variant="expanded" source="blog" /></div>

        <footer className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Picking the right loan product changes whether a deal pencils.
            TrueCap models DSCR live, side-by-side scenarios for cash,
            conventional, DSCR, and hard money — so you can see which
            financing structure actually makes the numbers work.{" "}
            <Link href="/" className="font-bold text-foreground hover:underline">
              Open the analyzer →
            </Link>
          </p>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
      <BlogStickyCta />
    </div>
  );
}
