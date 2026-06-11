/**
 * Blog post: Cash-on-cash vs IRR — when each one tells the truth
 *
 * Mid-funnel educational content for investors comparing return
 * metrics. Helps clarify when each metric is right and when each is
 * misleading.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "cash-on-cash-vs-irr";
const TITLE = "Cash-on-cash vs IRR: which one tells the truth?";
const DESCRIPTION =
  "Cash-on-cash and IRR are both return metrics, but they answer completely different questions. When each one is right, when each one lies, and which to trust on which type of deal.";
const PUBLISHED_AT = "2026-05-24";
const MODIFIED_AT = "2026-06-01";
const READING_TIME = 7;

export const metadata: Metadata = {
  title: `${TITLE} | TrueCap`,
  description: DESCRIPTION,
  keywords: [
    "cash on cash vs irr",
    "rental property return metrics",
    "internal rate of return real estate",
    "real estate return comparison",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `/blog/${SLUG}`, type: "article", publishedTime: PUBLISHED_AT, modifiedTime: MODIFIED_AT, images: [{ url: "/home.jpg", width: 1200, height: 630, alt: TITLE }] },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

export default function CashOnCashVsIrrPost() {
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
            Cash-on-cash and IRR are both return metrics for rental real estate. They answer completely different questions, and treating them as interchangeable is one of the most common ways to convince yourself a bad deal is a good one.
          </p>
        </header>

        <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">Cash-on-cash: this year&apos;s return on this year&apos;s cash</h2>
          <p>
            <Link href="/glossary/cash-on-cash-return" className="text-primary font-semibold hover:underline">Cash-on-cash (CoC)</Link> is annual cash flow divided by total cash invested at acquisition. If you put $80k into a deal and it produces $7,200/yr of cash flow, your CoC is 9%.
          </p>
          <p>
            CoC tells you: <strong>what return am I getting on the cash sitting in this deal, right now, this year?</strong>
          </p>
          <p>
            What it does NOT include: appreciation, principal paydown (you&apos;re building equity every month as the loan amortizes), tax benefits (depreciation alone often adds 3-7% to your real return), or any change in rent / expenses / value over time. It&apos;s a snapshot of year 1.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">IRR: the time-weighted truth across the whole hold</h2>
          <p>
            <Link href="/glossary/irr" className="text-primary font-semibold hover:underline">Internal Rate of Return (IRR)</Link> is the discount rate that makes the net present value of all the deal&apos;s cash flows (initial investment, every year&apos;s operating cash flow, sale proceeds at exit) equal to zero. Said more simply: it&apos;s the time-adjusted average return you actually earned over the whole hold.
          </p>
          <p>
            IRR captures everything CoC misses: rent growth, expense growth, principal paydown, appreciation, the eventual sale (or refi cash-out), and the time value of money. A deal with 6% year-1 CoC that compounds rent + appreciation over 7 years can easily show a 15-20% IRR.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">When each one lies</h2>
          <p>
            <strong>CoC lies when</strong> you compare deals across different appreciation profiles. A 9% CoC in Cleveland (low appreciation) and a 6% CoC in Charlotte (high appreciation) can produce identical 10-year IRR. If you optimize only on CoC, you systematically over-invest in pure cash-flow markets and miss the deals where compounding appreciation does the heavy lifting.
          </p>
          <p>
            <strong>IRR lies when</strong> the appreciation assumption is wrong. IRR is hyper-sensitive to your exit-year sale price. A 1% bump in annual appreciation can move IRR by 3-4 points. If your underwriting model assumes 5%/yr appreciation in a market that actually does 2%/yr, your projected IRR is fantasy. Always stress-test IRR against a flat-appreciation scenario.
          </p>
          <p>
            <strong>Both lie when</strong> you don&apos;t include taxes. After-tax CoC and after-tax IRR are the real numbers — the 24-32% federal bracket plus state income tax (in non-NV/TX/FL/WA/TN states) takes a meaningful bite. Depreciation pulls some of that back; the net effect is deal-specific.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">Which metric to trust on which deal</h2>
          <p>
            <strong>Pure cash-flow deals</strong> (Midwest workforce neighborhoods, working-class East Coast blocks): trust CoC. Appreciation is small enough that the long-term IRR isn&apos;t materially different from the year-1 CoC compounded. If the deal cash-flows now, it cash-flows long-term.
          </p>
          <p>
            <strong>Appreciation-leaning deals</strong> (Sun Belt growth, coastal Tier-1, gentrifying inner-city): trust IRR — but only if you&apos;ve stress-tested the appreciation assumption. Don&apos;t commit to a deal whose entire return story is &quot;rent appreciates 4% and price appreciates 5% for 10 years.&quot; Both could happen. Neither is guaranteed.
          </p>
          <p>
            <strong><Link href="/glossary/brrrr" className="text-primary font-semibold hover:underline">BRRRR</Link> / value-add deals</strong>: neither metric handles BRRRR well in isolation. The whole point is capital recycled at refi — look at &quot;cash recovered as % of initial investment&quot; first, then year-1 CoC against the post-refi cash position, then long-term IRR. CoC alone misses the recycle; IRR alone smears it across the hold. (See <Link href="/blog/how-to-refinance-a-rental-property" className="text-primary font-semibold hover:underline">how to refinance a rental property</Link> for the cash-out workflow.)
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">The practical workflow</h2>
          <p>
            On every deal: look at CoC first (is this returning enough on the cash I&apos;m putting in right now to justify the risk?). Then look at IRR (over the realistic hold period, does this compound to something I&apos;m happy with?). Then stress-test the IRR (does it still work if appreciation is 1pp lower than I assumed?).
          </p>
          <p>
            If all three pass, the deal is probably good. If CoC is great but IRR collapses on stress test, you have a pure cash-flow play and should treat it that way. If IRR is great but CoC is negative, you&apos;re betting on appreciation and need a personal balance sheet that can carry negative cash flow until exit. Both are valid bets — just be clear about which one you&apos;re making.
          </p>
          <p>
            The <Link href="/" className="text-primary font-semibold hover:underline">TrueCap analyzer</Link> shows both numbers prominently, plus the Pro 10-year projection and sensitivity grid so you can stress-test before you commit.
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
