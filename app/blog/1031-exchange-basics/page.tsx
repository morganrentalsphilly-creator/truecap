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
const DESCRIPTION =
  "How a 1031 exchange actually works in 2026 — the 45-day and 180-day windows, qualified intermediary requirement, like-kind rules, boot, reverse exchanges, and when it's worth the complexity.";
const PUBLISHED_AT = "2026-05-25";
const READING_TIME = 11;

export const metadata: Metadata = {
  title: `${TITLE} | TrueCap`,
  description: DESCRIPTION,
  keywords: [
    "1031 exchange basics",
    "1031 exchange how it works",
    "1031 exchange rental property",
    "like kind exchange real estate",
    "1031 exchange rules 2026",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `/blog/${SLUG}`, type: "article", publishedTime: PUBLISHED_AT, images: [{ url: "/home.jpg", width: 1200, height: 630, alt: TITLE }] },
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
    dateModified: PUBLISHED_AT,
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
            A 1031 exchange lets you sell one investment property, roll the proceeds into another, and defer the capital gains tax indefinitely. The mechanics are strict and the timeline is unforgiving. Here&apos;s how it actually works for individual investors in 2026.
          </p>
          <p className="mt-3 text-sm text-muted-foreground italic">
            Not tax advice. 1031 exchanges have material tax and legal consequences — work with a qualified intermediary and a CPA who has actually closed one. This post is education only.
          </p>
        </header>

        <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
          <h2 className="text-2xl font-black text-foreground mt-10 mb-3">The 30-second version</h2>
          <p>
            You sell rental property A. Instead of taking the cash and paying capital gains tax (federal long-term capital gains: 15-20%, plus depreciation recapture at up to 25%, plus state tax in non-zero-tax states), you roll the proceeds into rental property B through a qualified intermediary. Federal taxes are deferred until you eventually sell B without exchanging — which, for serious investors, can mean &quot;forever, because I never stop exchanging until I die and my heirs inherit at stepped-up basis.&quot;
          </p>
          <p>
            The catch: a clock starts the moment property A closes, and you have very tight deadlines to identify + close property B. Miss them and the whole tax shelter collapses.
          </p>

          <h2 className="text-2xl font-black text-foreground mt-10 mb-3">The two clocks</h2>
          <p>
            Both clocks start the day property A closes (the calendar day the sale records, not 24 hours from the moment).
          </p>
          <ul>
            <li><strong>Day 1-45: Identification period.</strong> You have 45 calendar days to formally identify in writing the replacement property (or properties) you intend to acquire. Identification is done in writing through your qualified intermediary — it&apos;s NOT just "I&apos;m looking at this place." There are strict identification rules (most investors use the &quot;3-property rule&quot; — identify up to 3 candidates, then close on one or more).</li>
            <li><strong>Day 1-180: Closing period.</strong> You must close on at least one identified property within 180 days of the day property A sold. This includes the 45-day identification window — so once you blow past day 45 without identifying, you&apos;re out, even though you&apos;d still have 135 more days to theoretically close.</li>
          </ul>
          <p>
            Both deadlines are calendar days, not business days. Weekends and holidays count. There are NO extensions for any reason (illness, market conditions, contract delays) except in rare presidentially-declared disaster scenarios.
          </p>

          <h2 className="text-2xl font-black text-foreground mt-10 mb-3">The qualified intermediary (QI) — non-negotiable</h2>
          <p>
            You CANNOT take possession of the sale proceeds at any point. Not for a day, not for a minute. The moment the buyer&apos;s funds touch your bank account, you&apos;ve received "constructive receipt" and the 1031 exchange is dead.
          </p>
          <p>
            That&apos;s why a Qualified Intermediary (QI) is required by IRS regulation. The QI is a third-party entity that:
          </p>
          <ol>
            <li>Holds the proceeds from property A in escrow</li>
            <li>Holds the identification documents you submit before day 45</li>
            <li>Releases the funds directly to the seller of property B at closing</li>
          </ol>
          <p>
            QIs are not banks and are not federally regulated as such — pick one with at least a decade of track record, written bonding, and segregated escrow accounts. Cost is typically $750-$1,500 per exchange. Cheap relative to the tax savings; never cheap out on the QI.
          </p>

          <h2 className="text-2xl font-black text-foreground mt-10 mb-3">What "like-kind" actually means</h2>
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
            <li><strong>Property held primarily for sale</strong> — flippers cannot 1031 their flips. The IRS looks at intent. A property bought-rehabbed-sold within 6 months is treated as inventory, not investment.</li>
            <li><strong>Foreign real estate</strong> — must be US-to-US.</li>
            <li><strong>Personal property</strong> — since the 2017 Tax Cuts and Jobs Act, 1031 only covers real property. Equipment, vehicles, etc. no longer qualify.</li>
          </ul>

          <h2 className="text-2xl font-black text-foreground mt-10 mb-3">The full-deferral rules</h2>
          <p>
            To defer ALL the gain, two rules apply at the replacement-property closing:
          </p>
          <ul>
            <li><strong>The replacement must cost AT LEAST as much as the relinquished property sold for.</strong> (Trading up.)</li>
            <li><strong>You must reinvest all the cash proceeds AND replace the debt that was on property A.</strong> If property A had a $200k mortgage paid off at closing, property B must carry at least $200k of debt — OR you must inject $200k of new cash to replace it.</li>
          </ul>
          <p>
            If you violate either, you get partial deferral. The portion you DIDN&apos;T reinvest is called <strong>&quot;boot&quot;</strong> and is taxable in the year of the exchange. Boot can be:
          </p>
          <ul>
            <li><strong>Cash boot</strong> — you took cash out at closing</li>
            <li><strong>Mortgage boot</strong> — the replacement property has less debt than the relinquished property, and you didn&apos;t make up the difference in cash</li>
          </ul>

          <h2 className="text-2xl font-black text-foreground mt-10 mb-3">A concrete example</h2>
          <p>
            You sell a duplex you&apos;ve owned for 8 years.
          </p>
          <ul>
            <li>Sale price: $500,000</li>
            <li>Original purchase: $300,000</li>
            <li>Depreciation taken over 8 years: $87,000</li>
            <li>Mortgage payoff at sale: $180,000</li>
            <li>Adjusted basis: $300,000 - $87,000 = $213,000</li>
            <li>Total taxable gain (if you DIDN&apos;T exchange): $500,000 - $213,000 = $287,000</li>
            <li>Federal tax at standard rates (15% LTCG on $200k + 25% recapture on $87k): $30,000 + $21,750 = ~$52k of federal tax, plus state</li>
          </ul>
          <p>
            With a 1031 exchange into a property purchased for $600,000 with at least $180k in new debt (or that much fresh cash to cover the mortgage gap): you defer the entire $52k of federal tax. Your new property has a carried-over basis: $213k original adjusted basis + $100k of cash you brought to close = $313k, with depreciation continuing on the carried-over $213k portion at the original schedule, and the new $100k starting a fresh 27.5-year clock.
          </p>

          <h2 className="text-2xl font-black text-foreground mt-10 mb-3">Reverse exchanges — when you find the new property first</h2>
          <p>
            A standard 1031 sells property A first, then buys property B. But what if you find the perfect property B before you&apos;ve sold A? The reverse exchange (formally called a &quot;parking arrangement&quot; under Rev. Proc. 2000-37) lets you do it backwards.
          </p>
          <p>
            Mechanics: a QI affiliate (an Exchange Accommodation Titleholder, EAT) buys and parks property B in their name while you find a buyer for property A. You have the same 45/180-day clocks but counted from when property B was acquired. Costs are higher ($3-5k+ vs $750-1500 for standard) because the EAT carries real estate temporarily. Worth it for rare deals you can&apos;t replace.
          </p>

          <h2 className="text-2xl font-black text-foreground mt-10 mb-3">When 1031 is worth the complexity</h2>
          <p>
            Run the math: how much federal tax would you owe if you sold without exchanging? If it&apos;s &lt; $15k, 1031 is probably not worth the QI cost + the constrained timeline + the risk of being forced into a worse property B than you&apos;d otherwise pick.
          </p>
          <p>
            If federal tax due would be $25k+, 1031 starts being a no-brainer for investors who plan to roll into another deal anyway.
          </p>
          <p>
            Strategic note: many serious long-term investors chain 1031 exchanges for decades, then die without selling. Heirs inherit at stepped-up basis (current fair market value, not the original cost basis you&apos;ve been carrying), which permanently wipes out the deferred gain. That&apos;s the &quot;buy, refi, hold, exchange, die&quot; meme — it&apos;s not a joke, it&apos;s a real and durable tax strategy at scale.
          </p>

          <h2 className="text-2xl font-black text-foreground mt-10 mb-3">Common mistakes that kill exchanges</h2>
          <ul>
            <li><strong>Taking cash at closing.</strong> Even &quot;just $5k to cover closing costs.&quot; You&apos;ve received constructive receipt; exchange dead.</li>
            <li><strong>Identifying replacement property by phone, text, or verbal.</strong> Must be in writing, signed, delivered to the QI by day 45.</li>
            <li><strong>Misjudging the like-kind boundary.</strong> Property held with intent to flip doesn&apos;t qualify, even if you ended up holding it for 18 months. Intent matters; the IRS looks at facts and circumstances.</li>
            <li><strong>Hiring a QI who comingled funds.</strong> Pick a QI with segregated escrow + bonding. Several big QIs have collapsed historically with investor funds in escrow.</li>
            <li><strong>Trying to identify too many properties.</strong> The 3-property rule is the simplest path; alternative rules (200% rule, 95% rule) exist but add complexity. Start with 3.</li>
            <li><strong>Letting day 45 pass without formally identifying.</strong> No extensions. Ever.</li>
          </ul>

          <h2 className="text-2xl font-black text-foreground mt-10 mb-3">The practical next steps</h2>
          <p>
            If you&apos;re considering a 1031 on a property you&apos;re about to sell:
          </p>
          <ol>
            <li>Find and engage a Qualified Intermediary BEFORE you accept an offer on the sale property. Engaging the QI mid-closing is technically allowed but operationally risky. Names: Asset Preservation Inc, IPX1031, First American Exchange. Don&apos;t pick from a Google ad — pick from your CPA&apos;s vetted list.</li>
            <li>Have your CPA model the tax cost of NOT exchanging vs. the constraint cost of identifying within 45 days.</li>
            <li>Start screening replacement properties through{" "}
              <Link href="/" className="text-primary font-semibold hover:underline">TrueCap</Link> before you close the sale. Use the{" "}
              <Link href="/dashboard/saved-analyses" className="text-primary font-semibold hover:underline">saved-deals dashboard</Link> + portfolio rollup to track candidates against your replacement criteria.</li>
            <li>Identify at day 30-35, not day 44. Give yourself buffer in case identified properties fall through during diligence.</li>
            <li>Close as early as possible inside the 180-day window — don&apos;t let it run to day 179 unless you&apos;ve already pre-cleared inspection + appraisal + financing.</li>
          </ol>
          <p>
            The tax savings on a typical 1031 ($20-50k+ deferred) easily justify the QI cost and operational tension. The deal that makes the strategy expensive isn&apos;t the QI — it&apos;s being forced into a mediocre replacement property by a poorly-managed timeline. Plan the search before you sell.
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
