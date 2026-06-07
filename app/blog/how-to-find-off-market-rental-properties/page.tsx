/**
 * Blog post: How to find off-market rental properties.
 *
 * Targets queries: "how to find off-market properties", "off market
 * deals", "wholesale real estate", "direct mail real estate", "driving
 * for dollars". High-intent investor education content.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "how-to-find-off-market-rental-properties";
const TITLE = "How to find off-market rental properties — 8 sources that actually work";
const DESCRIPTION =
  "The 8 sources serious rental investors use to find off-market deals — driving for dollars, direct mail, wholesalers, networking, public records, and the underrated channels most investors skip.";
const PUBLISHED_AT = "2026-05-26";
const MODIFIED_AT = "2026-06-01";
const READING_TIME = 10;

export const metadata: Metadata = {
  title: `${TITLE} | TrueCap`,
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
    title: TITLE,
    description: DESCRIPTION,
    url: `/blog/${SLUG}`,
    type: "article",
    publishedTime: PUBLISHED_AT,
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: TITLE }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const FAQS = [
  {
    q: "Why are off-market deals better than MLS listings?",
    a: "Two reasons. (1) No bidding war — you're often the only buyer in the conversation, so you can negotiate price and terms without competing offers driving everything up. (2) Motivated seller psychology — investors who reach an off-market seller typically find someone dealing with tax problems, inheritance, divorce, relocation, or burnout, all of which create flexibility on price. The trade-off: off-market deal flow takes work to source, where MLS deals are handed to you.",
  },
  {
    q: "How long does it take to find your first off-market deal?",
    a: "If you start direct mail today, expect 3-6 months before your first solid lead and 6-12 months before your first closed deal. Driving for dollars + cold-calling can produce a deal in 2-3 months for an aggressive caller. Networking with wholesalers can produce a deal within 30 days if you're well-positioned. The slowest-but-most-reliable channel is direct mail; the fastest-but-noisiest is wholesaler relationships.",
  },
  {
    q: "Are wholesale deals actually good?",
    a: "Some are, most aren't. Wholesalers source distressed properties and assign the contract to an investor for a markup of $5-15k. The math: you're paying the wholesaler's fee on top of what they're paying the seller. Good wholesalers source genuinely distressed properties at 60-65% ARV; their markup leaves you with a 70-75% ARV entry — enough margin for a profitable BRRRR. Bad wholesalers source properties at 80% ARV, mark up 10%, and pitch you a 90% ARV 'deal' that doesn't pencil. Always run the math yourself; never trust the wholesaler's numbers.",
  },
  {
    q: "Is direct mail still worth doing in 2026?",
    a: "Yes, with caveats. Direct mail to absentee owners (out-of-state landlords) and tax-delinquent owners still produces solid response rates (0.5-2% typical). The competition is real — large investor funds also mail these lists — but consistent monthly campaigns over 6+ months still produce results. Costs: $0.45-0.90 per piece all-in. Budget $2-5k/month to source 1-3 deals per year.",
  },
  {
    q: "What's the highest-ROI off-market source?",
    a: "Networking with property managers. PMs know which of their owners are tired, behind on rent, dealing with capex headaches, or thinking about selling. Building 5-10 PM relationships in your target market produces a steady drip of pre-listing deal flow that competitors don't see. It's slow to build (3-6 months) but lasts for years and costs nothing.",
  },
];

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
    author: { "@type": "Person", name: "Morgan Page", url: siteUrl },
    publisher: { "@id": `${siteUrl}/#organization` },
    isPartOf: { "@id": `${siteUrl}/blog#blog` },
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
            MLS deals are crowded — every listing has 5-15 investors looking at it, bidding it up, and squeezing margins. The investors closing real off-market deals at real margins are using sources most never think about. Here are the 8 channels that actually work, with realistic timelines and costs.
          </p>
        </header>

        <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
          <p>
            One framing note before we start: <strong>off-market deal flow is a long-game effort</strong>. Most channels take 3-12 months of consistent work before producing a deal. The compounding ones (PM networking, wholesaler relationships, direct mail) are the most reliable. The fast ones (driving for dollars, cold calling) require sustained energy. Pick 2-3 channels that fit your temperament and run them for 12 months before changing strategy.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">1. Property manager networking — the highest-ROI source</h2>
          <p>
            Most investors never think to pitch property managers as a deal-sourcing channel. They should. Property managers know which of their owners are tired, dealing with rising capex bills, behind on rent collection, or thinking about retirement. PMs hear about future sales 6-12 months before the property hits MLS.
          </p>
          <p>
            The play: build relationships with 5-10 PMs in your target market. Buy coffee with them. Ask which of their owners they think might be open to selling. Most PMs are happy to refer because (a) they often keep the management contract with the new buyer, and (b) you become a known reliable buyer they can call repeatedly.
          </p>
          <p>
            Timeline: 3-6 months to build the relationships. Cost: ~$200/mo in coffees + lunches. Deal flow: 1-3 deals/year from a well-built PM network, indefinitely.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">2. Direct mail to targeted owner lists</h2>
          <p>
            The classic off-market source. Buy a list (PropStream, ListSource, DataTree are common providers), filter to your target criteria (absentee owners, equity-rich owners, tax-delinquent, pre-foreclosure, code violations), and mail postcards or letters.
          </p>
          <p>
            What works in 2026:
          </p>
          <ul>
            <li><strong>Absentee owner lists</strong> — landlords who live in a different state often want out. Response rates: 0.5-2%.</li>
            <li><strong>Tax-delinquent lists</strong> — owners 1-2 years behind on property tax. Higher motivation. Response: 1-3%.</li>
            <li><strong>Inherited property lists</strong> — heirs of recently-deceased owners often want to liquidate. Response: 2-5% but lists are harder to source.</li>
            <li><strong>30-90 day pre-foreclosure</strong> — last-resort sellers. Response high (3-5%) but you'll compete with foreclosure investors.</li>
          </ul>
          <p>
            What doesn't work: spray-and-pray to every property in a zip code. Targeting is the entire game.
          </p>
          <p>
            Budget: $0.45-0.90 per piece all-in (postcard + postage + list cost). $2-5k/month sustainable budget produces 1-3 deals/year for an investor who answers calls within 4 hours and runs the math fast (use <Link href="/" className="text-primary font-semibold hover:underline">TrueCap</Link> to underwrite leads in 60 seconds instead of 30 minutes).
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">3. Driving for dollars</h2>
          <p>
            Old-school: drive target neighborhoods looking for properties with signs of distress (overgrown lawn, deferred maintenance, mail piling up, broken windows, vacant). Record the addresses. Look up the owners via county appraisal district records or services like DealMachine. Cold call or mail.
          </p>
          <p>
            What works: consistent 1-2 hour Saturday drives in 2-3 target neighborhoods. Apps like DealMachine ($59/mo) record the addresses + auto-skip-trace owners + queue them for cold call or mail.
          </p>
          <p>
            Timeline: First deal in 2-4 months for an aggressive driver who actually calls owners. Most investors quit before the 4-month mark because the rejection rate is high.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">4. Wholesaler relationships</h2>
          <p>
            Wholesalers source distressed properties + assign the contract to investors for a markup of $5-15k. Done right, they're a real source of pre-MLS deals. Done wrong, they're a way to overpay on a property dressed up as a deal.
          </p>
          <p>
            The play: build relationships with 5-10 active wholesalers in your market. Get on their cash-buyer email lists. Respond to every deal they email — fast (run it through <Link href="/" className="text-primary font-semibold hover:underline">TrueCap</Link> in 60 seconds), then either commit or pass clearly. Wholesalers prioritize investors who respond fast and close reliably; ghost their emails and you fall off their list.
          </p>
          <p>
            Verification matters. Run your OWN underwriting on every wholesale deal. Verify ARV from comps (not the wholesaler's number). Pull tax bills yourself. Read the full inspection report. <Link href="/blog/spot-bad-rental-in-60-seconds" className="text-primary font-semibold hover:underline">The red flags</Link> matter even more on wholesale deals because the wholesaler is incentivized to hide them.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">5. Networking with local agents (the right way)</h2>
          <p>
            Most agents work the MLS. A subset specializes in investor clients and hears about pocket listings (deals an owner wants to sell but hasn't listed yet). These investor-focused agents are gold.
          </p>
          <p>
            How to find them: ask wholesalers + property managers + other investors which agents have brought them deals. The same 2-3 names will come up. Build relationships with those agents. Make it easy for them to bring you deals — fast underwriting (60 seconds via TrueCap), clear buying criteria, reliable closes, no haggling on commission.
          </p>
          <p>
            The deal flow from a single well-positioned investor agent can be 5-15 properties per year. Worth the time investment.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">6. Public records — auctions and tax-lien sales</h2>
          <p>
            County websites publish foreclosure auction lists, tax-lien certificate sales, and sheriff sale schedules. These are public, free to access, and meaningfully under-shopped by individual investors (most attendees are professional flippers).
          </p>
          <p>
            What works: tax-lien auctions in landlord-friendly states (FL, IN, AZ, OH). Tax-deed sales in NC, IA. Specific knowledge of your county's auction process is critical — the rules vary dramatically by jurisdiction.
          </p>
          <p>
            What doesn't: showing up to a foreclosure auction unprepared. Most properties at auction need cash purchase (no financing contingency), have unknown condition (often you can't see inside), and have title issues (junior liens, occupancy disputes). Don't bid until you've gone to 3-5 auctions to observe.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">7. Facebook + Nextdoor + local FB investor groups</h2>
          <p>
            Underrated. Sellers often post "considering selling" in local Facebook groups before going to an agent. Investors who participate in these groups for months — answering questions, being helpful, not pitching — get first call when posts go up.
          </p>
          <p>
            What works: join 3-5 local real estate Facebook groups + your neighborhood Nextdoor. Be present. Comment substantively. Never pitch in the thread (admins will ban you). When someone posts "thinking about selling my rental," DM them privately and offer to chat.
          </p>
          <p>
            Timeline: 6-12 months of presence before the deal flow starts. Pays off indefinitely once it does.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">8. Bandit signs (with caveats)</h2>
          <p>
            "We Buy Houses" signs at intersections. They work — measurably. They're also illegal in many municipalities and create brand-perception issues if you ever want to do other things in real estate.
          </p>
          <p>
            If you go this route, post in zip codes where they're legal, use cheap signs you can replace weekly, and have a dedicated phone number that goes to a virtual assistant who pre-qualifies leads. Cost: $1-2 per sign + ~$200/mo for VA. Response: 5-15 calls/month per 100 signs in a major metro.
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
            <li><strong>Speed of response</strong> — answer calls and emails within 4 hours, ideally faster. Sellers who reach out to multiple investors go with whoever responds first.</li>
            <li><strong>Speed of underwriting</strong> — being able to run a deal in 60 seconds vs 30 minutes lets you respond to 20x more leads per month. <Link href="/" className="text-primary font-semibold hover:underline">TrueCap</Link> exists specifically for this moment.</li>
            <li><strong>Clear buying criteria</strong> — wholesalers + agents send deals to investors who say "yes" or "no" cleanly. Investors who waffle get fewer deals.</li>
            <li><strong>Reliability of close</strong> — fall through on one deal and the source stops sending you deals. Close fast, close clean, close on terms agreed.</li>
          </ul>
          <p>
            Pick your 2-3 channels. Run them for 12 months. The deals come.
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
