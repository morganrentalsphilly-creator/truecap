/**
 * Blog post: 1031 exchange basics for individual investors
 *
 * High-intent + medium competition. Targets investors at the sale
 * decision point — who are most likely to start a new search for "where
 * to buy next" right after.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "1031-exchange-basics";
const TITLE = "1031 exchange basics for individual rental investors";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "1031 exchange basics for rental investors";
const DESCRIPTION =
  "How a 1031 exchange works in 2026 — the identification and exchange periods, qualified-intermediary safe harbor, like-kind rules, boot, reverse exchanges, and trade-offs.";
const PUBLISHED_AT = "2026-05-25";
const MODIFIED_AT = "2026-08-15";
const READING_TIME = 11;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "1031 exchange basics",
    "1031 exchange how it works",
    "1031 exchange rental property",
    "like kind exchange real estate",
    "1031 exchange rules 2026",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: { title: SERP_TITLE, description: DESCRIPTION, url: `/blog/${SLUG}`, type: "article", publishedTime: PUBLISHED_AT, modifiedTime: MODIFIED_AT, images: [{ url: "/home.jpg", width: 1200, height: 630, alt: TITLE }] },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

export default function ExchangePost() {
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
            A qualifying section 1031 exchange may postpone recognition of
            gain when eligible real property is exchanged for like-kind real
            property and every requirement is met. It does not make a sale
            permanently tax-free. Here are the core mechanics for individual
            investors in 2026.
          </p>
          <p className="mt-3 text-sm text-muted-foreground italic">
            Not tax advice. Start with current <a href="https://www.irs.gov/publications/p544" className="text-primary font-semibold hover:underline">IRS Publication 544</a> and <a href="https://www.irs.gov/businesses/small-businesses-self-employed/like-kind-exchanges-real-estate-tax-tips" className="text-primary font-semibold hover:underline">IRS like-kind exchange guidance</a>, then work with qualified tax and legal advisers and, when used, a vetted intermediary before the transfer.
          </p>
        </header>

        <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">The 30-second version</h2>
          <p>
            In a qualifying exchange, current recognition of gain may be
            postponed by carrying basis into eligible replacement real
            property. Cash, debt relief, or other non-like-kind property can
            cause some gain to be recognized. The calculation depends on
            adjusted basis, liabilities, transaction costs, property use, and
            the rest of the exchange—not a headline tax rate.
          </p>
          <p>
            The deferred-exchange deadlines start when the relinquished
            property is transferred. Missing a requirement can make some or
            all gain currently recognizable, so the exchange team and written
            plan should be in place before that transfer.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">The two clocks</h2>
          <p>
            Both clocks start the day property A closes (the calendar day the sale records, not 24 hours from the moment).
          </p>
          <ul>
            <li><strong>Day 1-45: Identification period.</strong> Replacement property generally must be unambiguously identified in a signed writing delivered to a permitted party within 45 calendar days. Detailed three-property, 200%, and 95% rules govern multiple identifications.</li>
            <li><strong>Exchange period.</strong> Replacement property generally must be received by the earlier of 180 days after the transfer or the due date, including extensions, of the return for the transfer year. The 45-day period runs inside this exchange period.</li>
          </ul>
          <p>
            These are calendar-day deadlines. Do not assume a private contract
            delay extends them. Limited IRS relief can apply in specified
            federally declared disasters, but eligibility and revised dates
            must be confirmed from the applicable notice.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">The qualified intermediary (QI) safe harbor</h2>
          <p>
            Actual or constructive receipt of proceeds can make gain currently
            recognizable. A properly documented QI arrangement is a common
            safe harbor for a deferred exchange because the taxpayer&apos;s rights
            to receive or control the funds are restricted.
          </p>
          <p>
            A QI is not the only structure addressed by the regulations, and a
            direct simultaneous exchange can be different. For a typical
            deferred sale-and-replacement transaction, engage tax and legal
            advisers before the sale and have the exchange agreement executed
            before the taxpayer receives the proceeds. A QI commonly:
          </p>
          <ol>
            <li>Holds the proceeds from property A in escrow</li>
            <li>Holds the identification documents you submit before day 45</li>
            <li>Releases the funds directly to the seller of property B at closing</li>
          </ol>
          <p>
            Intermediary regulation and client-fund protections vary. Review
            ownership, financial controls, bonding or insurance, segregated-
            account practices, agreement terms, references, security, and the
            bank holding the funds. Fees vary and should be compared with the
            full exchange risk and after-tax scenario, not an assumed saving.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">What &quot;like-kind&quot; actually means</h2>
          <p>
            Like-kind is broader than most investors realize. Any investment-purpose US real estate exchanges for any other investment-purpose US real estate. You can exchange:
          </p>
          <ul>
            <li>A single-family rental → an apartment building</li>
            <li>A vacant lot → a duplex</li>
            <li>A self-storage facility → raw farmland</li>
            <li>A retail strip → an office condo</li>
          </ul>
          <p>
            What does NOT qualify:
          </p>
          <ul>
            <li><strong>Your primary residence</strong> — 1031 is for investment property only. The Section 121 primary residence exclusion is a different tax benefit.</li>
            <li><strong>Property held primarily for sale</strong> — inventory or dealer property does not qualify. Intent is based on facts and circumstances; there is no universal six-month holding-period test that decides every property.</li>
            <li><strong>Foreign real estate</strong> — must be US-to-US.</li>
            <li><strong>Personal property</strong> — since the 2017 Tax Cuts and Jobs Act, 1031 only covers real property. Equipment, vehicles, etc. no longer qualify.</li>
          </ul>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">Full-deferral planning is more than two slogans</h2>
          <p>
            Acquiring replacement property of equal or greater value and
            reinvesting net equity while replacing debt or adding cash are
            common planning guideposts. They are not a complete statement of
            the recognized-gain calculation. Basis, liabilities, exchange
            expenses, money or non-like-kind property received, related-party
            rules, and property eligibility all matter.
          </p>
          <ul>
            <li><strong>Value and equity.</strong> Have the adviser model both realized gain and the amount that would be recognized under the proposed replacement.</li>
            <li><strong>Liabilities.</strong> Net debt relief can affect recognized gain, while additional cash may offset a liability reduction in the calculation.</li>
          </ul>
          <p>
            Money or non-like-kind property received is commonly called
            <strong> &quot;boot&quot;</strong> and can trigger current gain up to the
            applicable amount. It does not automatically make the entire
            exchange fail.
          </p>
          <ul>
            <li><strong>Cash boot</strong> — you took cash out at closing</li>
            <li><strong>Mortgage boot</strong> — the replacement property has less debt than the relinquished property, and you didn&apos;t make up the difference in cash</li>
          </ul>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">A concrete example</h2>
          <p>
            Suppose a duplex sells for $500,000 and has a preliminary adjusted
            basis of $213,000 before selling costs and other adjustments. The
            simple $287,000 difference is a starting realized-gain figure, not
            the tax bill.
          </p>
          <ul>
            <li>Confirm original and adjusted basis, including land allocation, improvements, and depreciation allowed or allowable.</li>
            <li>Subtract eligible selling or exchange expenses under the applicable rules.</li>
            <li>Account for cash, liabilities, and any non-like-kind property on both sides.</li>
            <li>Report the exchange on Form 8824 and carry the properly adjusted basis into the replacement property.</li>
          </ul>
          <p>
            A qualifying exchange may postpone some or all recognized gain, but
            replacement basis and <Link href="/glossary/depreciation-period" className="text-primary font-semibold hover:underline">depreciation</Link> require the full Form 8824 and
            depreciation calculations. Do not multiply this simplified gain by
            headline tax rates or assume full deferral without adviser review.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">Reverse exchanges — when you find the new property first</h2>
          <p>
            A standard 1031 sells property A first, then buys property B. But what if you find the perfect property B before you&apos;ve sold A? The reverse exchange (formally called a &quot;parking arrangement&quot; under Rev. Proc. 2000-37) lets you do it backwards.
          </p>
          <p>
            A qualifying exchange accommodation arrangement uses an Exchange
            Accommodation Titleholder to hold qualified indications of
            ownership while the required transfers occur. Written-agreement,
            identification, transfer, related-party, and 180-day limits apply.
            Fees and financing consequences vary; model them before deciding
            that a reverse structure is worthwhile.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">When 1031 is worth the complexity</h2>
          <p>
            Compare the estimated current tax without an exchange with
            intermediary, advisory, financing, and transaction costs; the
            basis and future tax profile of the replacement; liquidity; and
            the investment quality of available replacements.
          </p>
          <p>
            There is no universal tax-dollar threshold that makes an exchange
            a no-brainer. A deferral can be a poor trade if the deadline pushes
            the investor into a weak property or expensive financing. If
            you&apos;re considering a refinance instead, read our guide on <Link href="/blog/how-to-refinance-a-rental-property" className="text-primary font-semibold hover:underline">how to refinance a rental property</Link> and compare the risks separately.
          </p>
          <p>
            Estate-basis rules can affect inherited property under current law,
            but eligibility, valuation, prior gifts, ownership, estate tax,
            state law, and future legislation matter. Do not market a chain of
            exchanges and death as permanently wiping out deferred gain or as a
            durable outcome. Coordinate exchange and estate planning with
            qualified advisers using the law then in effect.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">Common mistakes that kill exchanges</h2>
          <ul>
            <li><strong>Receiving or controlling cash.</strong> Actual or constructive receipt can create current gain or defeat the intended safe harbor; have the closing flow approved in advance.</li>
            <li><strong>Using an invalid identification.</strong> Replacement property generally must be unambiguously identified in a signed writing delivered to a permitted party by day 45.</li>
            <li><strong>Misjudging the like-kind boundary.</strong> Property held with intent to flip doesn&apos;t qualify, even if you ended up holding it for 18 months. Intent matters; the IRS looks at facts and circumstances.</li>
            <li><strong>Hiring a QI who comingled funds.</strong> Pick a QI with segregated escrow + bonding. Several big QIs have collapsed historically with investor funds in escrow.</li>
            <li><strong>Trying to identify too many properties.</strong> The 3-property rule is the simplest path; alternative rules (200% rule, 95% rule) exist but add complexity. Start with 3.</li>
            <li><strong>Letting day 45 pass without a valid identification.</strong> The deadline is strict; only rely on relief expressly provided by applicable IRS guidance.</li>
          </ul>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">The practical next steps</h2>
          <p>
            If you&apos;re considering a 1031 on a property you&apos;re about to sell:
          </p>
          <ol>
            <li>Before transferring the sale property, have qualified tax and legal advisers confirm eligibility and document the exchange structure. If using a QI, complete due diligence and execute the agreement before receiving or controlling proceeds.</li>
            <li>Have your CPA model the tax cost of NOT exchanging vs. the constraint cost of identifying within 45 days.</li>
            <li>Start screening replacement properties through{" "}
              <Link href="/" className="text-primary font-semibold hover:underline">TrueCap</Link> before you close the sale. Use the{" "}
              <Link href="/auth/sign-up?next=%2Fdashboard%2Fsaved-analyses" className="text-primary font-semibold hover:underline">saved-deals dashboard</Link> + portfolio rollup to track candidates against your replacement criteria. Pair this with our broader guide on <Link href="/blog/rental-property-tax-deductions" className="text-primary font-semibold hover:underline">rental property tax deductions</Link> to discuss depreciation and basis with your tax adviser.</li>
            <li>Identify at day 30-35, not day 44. Give yourself buffer in case identified properties fall through during diligence.</li>
            <li>Close as early as possible inside the 180-day window — don&apos;t let it run to day 179 unless you&apos;ve already pre-cleared inspection + appraisal + financing.</li>
          </ol>
          <p>
            A 1031 exchange changes the timing and basis of tax; it does not
            guarantee savings or justify its costs by default. Plan the search
            before the transfer, preserve the option to reject a weak
            replacement, and compare the complete after-tax alternatives.
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
