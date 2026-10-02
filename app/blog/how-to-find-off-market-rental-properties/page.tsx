/**
 * Blog post: How to find off-market rental properties.
 *
 * Targets queries: "how to find off-market properties", "off market
 * deals", "wholesale real estate", "direct mail real estate", "driving
 * for dollars". High-intent investor education content.
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

const SLUG = "how-to-find-off-market-rental-properties";
const TITLE = "How to find off-market rental properties — 8 sources that actually work";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "How to find off-market rental properties (2026)";
const DESCRIPTION =
  "The 8 sources investors use to find off-market rental deals: driving for dollars, direct mail, wholesalers, networking, public records, and more.";
const PUBLISHED_AT = "2026-05-26";
const MODIFIED_AT = lastmodFor("/blog/how-to-find-off-market-rental-properties") ?? PUBLISHED_AT;
const READING_TIME = 10;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "how to find off-market rental properties",
    "off market deals real estate",
    "driving for dollars",
    "direct mail real estate investing",
    "wholesale real estate deals",
    "off market property sources",
    "find motivated sellers",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    title: SERP_TITLE,
    description: DESCRIPTION,
    url: `/blog/${SLUG}`,
    type: "article",
    publishedTime: PUBLISHED_AT,
    modifiedTime: MODIFIED_AT,
  },
  twitter: { card: "summary_large_image" },
};

export default function OffMarketPost() {
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/blog/${SLUG}`;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${canonicalUrl}#article`,
    headline: TITLE,
    description: DESCRIPTION,
    datePublished: PUBLISHED_AT,
    dateModified: MODIFIED_AT,
    url: canonicalUrl,
    author: { "@type": "Organization", "@id": `${siteUrl}/#organization`, name: "TrueCap", url: siteUrl },
    publisher: { "@id": `${siteUrl}/#organization` },
    isPartOf: { "@id": `${siteUrl}/blog#blog` },
    mainEntityOfPage: canonicalUrl,
    image: [`${siteUrl}/home.jpg`],
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "TrueCap", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${siteUrl}/blog` },
      { "@type": "ListItem", position: 3, name: TITLE, item: canonicalUrl },
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
            MLS deals are visible to every buyer, so good ones draw competing offers that bid prices up and squeeze margins. The investors closing real off-market deals at real margins are using sources most never think about. Here are the 8 channels that actually work, and what each one takes to run.
          </p>
        </header>

        <div className="prose prose-neutral max-w-none [&>p]:max-w-[68ch] [&>ul]:max-w-[68ch] [&>ol]:max-w-[68ch] [&>blockquote]:max-w-[68ch] [&>h2]:max-w-[68ch] [&>h3]:max-w-[68ch] text-foreground space-y-6 leading-relaxed">
          <p>
            One framing note before we start: <strong>off-market deal flow is a long-game effort</strong>. Most channels take months of consistent work before producing a deal. The compounding ones (PM networking, wholesaler relationships, direct mail) are the most reliable. The fast ones (driving for dollars, cold calling) require sustained energy. Pick 2-3 channels that fit your temperament and run them for 12 months before changing strategy.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">1. Property manager networking — the highest-ROI source</h2>
          <p>
            Most investors never think to pitch property managers as a deal-sourcing channel. They should. Property managers know which of their owners are tired, dealing with rising capex bills, behind on rent collection, or thinking about retirement. PMs can hear about a planned sale before the property hits the MLS.
          </p>
          <p>
            The play: build relationships with 5-10 PMs in your target market. Buy coffee with them. Ask which of their owners they think might be open to selling. Most PMs are happy to refer because (a) they often keep the management contract with the new buyer, and (b) you become a known reliable buyer they can call repeatedly.
          </p>
          <p>
            Timeline: expect months to build the relationships. Cost: mostly your time, plus coffees and lunches. Deal flow: track what your network actually produces.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">2. Direct mail to targeted owner lists</h2>
          <p>
            The classic off-market source. Buy a list (PropStream, ListSource, DataTree are common providers), filter to your target criteria (absentee owners, equity-rich owners, tax-delinquent, pre-foreclosure, code violations), and mail postcards or letters.
          </p>
          <p>
            What works:
          </p>
          <ul>
            <li><strong>Absentee owner lists</strong> — landlords who live out of the area may be open to selling. Track your own response rate.</li>
            <li><strong>Tax-delinquent lists</strong> — owners behind on property tax, who may be more motivated to sell. Track your own response rate.</li>
            <li><strong>Inherited property lists</strong> — heirs of recently-deceased owners may want to sell. These lists are harder to source; track your own response rate.</li>
            <li><strong>Pre-foreclosure</strong> — owners behind on their mortgage. Expect competition from foreclosure investors; when the home is the borrower&apos;s <a href="https://www.ecfr.gov/current/title-12/chapter-X/part-1024/subpart-C/section-1024.30" className="text-primary font-semibold hover:underline">principal residence</a>, federal servicing rules (<a href="https://www.ecfr.gov/current/title-12/chapter-X/part-1024/subpart-C/section-1024.41" className="text-primary font-semibold hover:underline">Regulation X</a>) generally bar a servicer from starting foreclosure until the loan is more than 120 days delinquent.</li>
          </ul>
          <p>
            What doesn&apos;t work: spray-and-pray to every property in a zip code. Targeting is the entire game.
          </p>
          <p>
            Budget: price the postcard, postage and list per piece with your vendors before you start, and track cost per deal from your own campaigns. Answer calls quickly and run the math fast (use <Link href="/" className="text-primary font-semibold hover:underline">TrueCap</Link> to underwrite leads in 60 seconds instead of 30 minutes).
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">3. Driving for dollars</h2>
          <p>
            Old-school: drive target neighborhoods looking for properties with signs of distress (overgrown lawn, deferred maintenance, mail piling up, broken windows, vacant). Record the addresses. Look up the owners through county property records (the assessor, appraisal district or recorder) or services like DealMachine. Cold call or mail.
          </p>
          <p>
            What works: consistent 1-2 hour Saturday drives in 2-3 target neighborhoods. Apps like DealMachine record the addresses, skip-trace owners and queue them for calls or mail. Before you call or text skip-traced numbers, check the <a href="https://www.ecfr.gov/current/title-47/chapter-I/subchapter-B/part-64/subpart-L/section-64.1200" className="text-primary font-semibold hover:underline">federal calling and texting rules</a> and your state&apos;s rules.
          </p>
          <p>
            Timeline: expect months, not weeks, and a high rejection rate — consistency is what separates results.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">4. Wholesaler relationships</h2>
          <p>
            Wholesalers source distressed properties and assign the contract to investors for a fee added to the price. Done right, they&apos;re a real source of pre-MLS deals. Done wrong, they&apos;re a way to overpay on a property dressed up as a deal.
          </p>
          <p>
            The play: build relationships with 5-10 active wholesalers in your market. Get on their cash-buyer email lists. Respond to every deal they email — fast (run it through <Link href="/" className="text-primary font-semibold hover:underline">TrueCap</Link> in 60 seconds), then either commit or pass clearly. Wholesalers prioritize investors who respond fast and close reliably; ghost their emails and you fall off their list.
          </p>
          <p>
            Verification matters. Run your OWN underwriting on every wholesale deal. Verify ARV from comps (not the wholesaler&apos;s number). Pull tax bills yourself. Read the full inspection report. <Link href="/blog/spot-bad-rental-in-60-seconds" className="text-primary font-semibold hover:underline">The red flags</Link> matter even more on wholesale deals because the wholesaler is incentivized to hide them.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">5. Networking with local agents (the right way)</h2>
          <p>
            Most agents work the MLS. A subset specializes in investor clients and hears about pocket listings (deals an owner wants to sell but hasn&apos;t listed yet). These investor-focused agents are gold.
          </p>
          <p>
            How to find them: ask wholesalers + property managers + other investors which agents have brought them deals. The same few names tend to come up. Build relationships with those agents. Make it easy for them to bring you deals — fast underwriting (60 seconds via TrueCap), clear buying criteria, reliable closes, no haggling on commission.
          </p>
          <p>
            A single well-positioned investor agent can be a steady source of deals. Worth the time investment.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">6. Public records — auctions and tax-lien sales</h2>
          <p>
            County websites publish foreclosure auction lists, tax-lien certificate sales, and sheriff sale schedules. Many counties post these online, free to access.
          </p>
          <p>
            Tax-sale systems are set by state law — some states sell tax-lien certificates, others sell the property at a tax-deed or tax-foreclosure sale — so learn which system your state and county use before bidding. Specific knowledge of your county&apos;s auction process is critical — the rules vary dramatically by jurisdiction.
          </p>
          <p>
            What doesn&apos;t: showing up to a foreclosure auction unprepared. Read the county&apos;s published sale terms first: auction purchases can require cash-equivalent payment with no financing contingency, may not allow an interior inspection, and can leave liens or occupants in place. Don&apos;t bid until you&apos;ve gone to 3-5 auctions to observe.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">7. Facebook + Nextdoor + local FB investor groups</h2>
          <p>
            Underrated. Sellers often post &quot;considering selling&quot; in local Facebook groups before going to an agent. Investors who participate in these groups for months — answering questions, being helpful, not pitching — get first call when posts go up.
          </p>
          <p>
            What works: join 3-5 local real estate Facebook groups + your neighborhood Nextdoor. Be present. Comment substantively. Never pitch in the thread (admins will ban you). When someone posts &quot;thinking about selling my rental,&quot; DM them privately and offer to chat.
          </p>
          <p>
            Timeline: expect many months of presence before deals start coming. Pays off indefinitely once it does.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">8. Bandit signs (with caveats)</h2>
          <p>
            &quot;We Buy Houses&quot; signs at intersections. Results vary, so track your own response. They can also break local sign ordinances and create brand-perception issues if you ever want to do other things in real estate.
          </p>
          <p>
            If you go this route, post in zip codes where they&apos;re legal, use cheap signs you can replace weekly, and have a dedicated phone number that goes to a virtual assistant who pre-qualifies leads. Price signs and a virtual assistant locally, and track calls per sign yourself.
          </p>
          <p>
            The bigger investors mostly use this as a brand-building tactic combined with direct mail and digital. Solo investors should weigh the legal + reputational tradeoffs.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">The honest meta-advice</h2>
          <p>
            Off-market deal sourcing is a marathon, not a sprint. The investors who succeed pick 2-3 channels that match their temperament, run them consistently for 12 months, and only evaluate results after that point.
          </p>
          <p>
            What predicts success more than channel selection:
          </p>
          <ul>
            <li><strong>Speed of response</strong> — answer calls and emails within 4 hours, ideally faster. Sellers who reach out to multiple investors often go with whoever responds first.</li>
            <li><strong>Speed of underwriting</strong> — being able to run a deal in about a minute instead of half an hour lets you respond to far more leads each month. <Link href="/" className="text-primary font-semibold hover:underline">TrueCap</Link> exists specifically for this moment.</li>
            <li><strong>Clear buying criteria</strong> — wholesalers + agents send deals to investors who say &quot;yes&quot; or &quot;no&quot; cleanly. Investors who waffle get fewer deals.</li>
            <li><strong>Reliability of close</strong> — fall through on one deal and the source stops sending you deals. Close fast, close clean, close on terms agreed.</li>
          </ul>
          <p>
            Pick your 2-3 channels. Run them for 12 months. Then judge what they produced.
          </p>
        </div>
        </article>
        <PostSources
          sources={[
            {
              title: "12 CFR 1024.41 (Regulation X), Loss mitigation procedures",
              url: "https://www.ecfr.gov/current/title-12/chapter-X/part-1024/subpart-C/section-1024.41",
            },
            {
              title: "12 CFR 1024.30 (Regulation X), Scope",
              url: "https://www.ecfr.gov/current/title-12/chapter-X/part-1024/subpart-C/section-1024.30",
            },
            {
              title: "47 CFR 64.1200, Delivery restrictions (calls and texts)",
              url: "https://www.ecfr.gov/current/title-47/chapter-I/subchapter-B/part-64/subpart-L/section-64.1200",
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
