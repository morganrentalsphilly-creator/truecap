/**
 * Blog post: House hacking explained — live (almost) for free in a 2-4 unit
 *
 * High-intent post for first-time buyers researching the strategy.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "house-hacking-explained";
const TITLE = "House hacking explained: how to (almost) live for free in a 2-4 unit";
const DESCRIPTION =
  "The actual math behind house hacking: FHA 3.5% down, owner-occupant rules, year-2 transition planning, and the deal types that make this strategy work in 2026.";
const PUBLISHED_AT = "2026-05-24";
const MODIFIED_AT = "2026-06-01";
const READING_TIME = 9;

export const metadata: Metadata = {
  title: `${TITLE} | TrueCap`,
  description: DESCRIPTION,
  keywords: [
    "house hacking",
    "house hack investment",
    "fha 3.5 owner occupant",
    "2-4 unit owner occupant",
    "how to house hack",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `/blog/${SLUG}`, type: "article", publishedTime: PUBLISHED_AT, images: [{ url: "/home.jpg", width: 1200, height: 630, alt: TITLE }] },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

export default function HouseHackingPost() {
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
            House hacking is the most under-rated path into rental investing. Done right, your tenants pay your mortgage and you build equity in property you live in — with as little as 3.5% down. Here&apos;s the actual math, the rules, and how to tell whether a specific 2-4 unit pencils.
          </p>
        </header>

        <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">What house hacking actually is</h2>
          <p>
            House hacking = you buy a 2-4 unit property using owner-occupant financing (FHA, conventional 5% down, or VA if eligible), live in one unit yourself, and rent the others to cover most or all of your housing cost. After a year (the FHA + conventional owner-occupant residency minimum), you can move out and the property converts to a full investment rental.
          </p>
          <p>
            The leverage advantage is enormous. Compare:
          </p>
          <ul>
            <li><strong>Investment property:</strong> 20-25% <Link href="/glossary/down-payment" className="text-primary font-semibold hover:underline">down payment</Link> ($60-75k on a $300k purchase), DSCR-loan rates, no living-cost offset</li>
            <li><strong>House hack:</strong> 3.5% FHA ($10.5k on the same $300k purchase), owner-occupant rates (lower), your tenants partially pay your housing cost</li>
          </ul>
          <p>
            $10.5k vs $60-75k to control the same property. That capital efficiency is why house hacking is the most-recommended first step in serious investor communities.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">The rules — what counts as a "house hack"</h2>
          <p>
            FHA + Fannie/Freddie owner-occupant loans require:
          </p>
          <ul>
            <li><strong>You must occupy the property as your primary residence</strong> within 60 days of closing</li>
            <li><strong>You must live there at least 1 year</strong> before converting to a pure rental (per the standard owner-occupant clause)</li>
            <li><strong>1-4 units only</strong> (5+ unit properties are commercial, no owner-occupant loans)</li>
            <li><strong>FHA self-sufficiency rule</strong> on 3-4 unit properties: the property&apos;s rental income must independently support the mortgage. This excludes some otherwise-attractive deals.</li>
          </ul>
          <p>
            Conventional 5% owner-occupant loans (Fannie Mae HomeReady, Freddie Mac Home Possible) don&apos;t have the self-sufficiency rule and can be easier to qualify in expensive markets. Worth running both loan options against the same property.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">The actual math — does it pencil?</h2>
          <p>
            The trap most first-timers fall into: they look at &quot;total rent collected vs. total mortgage&quot; and think they&apos;re living free. The honest math:
          </p>
          <p>
            <strong>True monthly out-of-pocket =</strong> Mortgage + property tax + insurance + utilities (for your unit) + reserves for vacancy + reserves for maintenance + reserves for CapEx — <strong>rent from other units</strong>.
          </p>
          <p>
            If you skip reserves, you&apos;ll get crushed the first year someone moves out or the roof needs work. Build them in: 5% vacancy on rented units, 8% maintenance, 5% CapEx (newer building) to 10% CapEx (older building).
          </p>
          <p>
            Quick triage:
          </p>
          <ul>
            <li><strong>True out-of-pocket = $0 or negative:</strong> Exceptional house hack. Your tenants pay 100%+ of your housing. Rare but real.</li>
            <li><strong>True out-of-pocket = $200-600/mo:</strong> Strong house hack. You&apos;re paying a fraction of market rent for your unit AND building equity.</li>
            <li><strong>True out-of-pocket = $600-1200/mo:</strong> Decent. Compare to market rent for similar housing in the area — usually still saves you money.</li>
            <li><strong>True out-of-pocket &gt; $1500/mo or close to market rent:</strong> Skip. You&apos;re basically just buying a primary residence with extra hassle.</li>
          </ul>
          <p>
            On TrueCap, set <strong>Property type = Owner-occupant</strong>, then enter per-unit rents (zero for your unit). The score uses owner-occupant break-even bands ($300/mo near-zero), not investor cash-flow bands ($1,000/mo).
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">FHA MIP — the catch nobody mentions</h2>
          <p>
            FHA loans require Mortgage Insurance Premium (MIP) for the life of the loan (or 11 years if you put 10%+ down). MIP runs ~0.55-0.85% of the loan annually. On a $300k loan that&apos;s $1,650-2,550/year ($138-213/month). It&apos;s a real recurring cost that conventional 5% down doesn&apos;t have (conventional has PMI which falls off at 80% LTV, typically 5-7 years in).
          </p>
          <p>
            Translation: FHA is the lowest-down-payment path but you pay for it forever. Running both FHA 3.5% AND conventional 5% scenarios through the calculator usually shows that 5% conventional has better long-term economics — if you can come up with the extra $4-5k down.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">The year-2 transition — when you move out</h2>
          <p>
            The full power of house hacking shows up in year 2. You&apos;ve satisfied the owner-occupant residency requirement; you move out, rent your unit at market rate, and the property converts from break-even owner-occupied to cash-flowing pure rental.
          </p>
          <p>
            Example: A Philadelphia triplex you bought at $400k with 5% down ($20k). Year 1: you live in unit 1, units 2 + 3 rent for $1,400 each. You pay ~$300/mo true out-of-pocket. Year 2: you move out, rent unit 1 at $1,500. Now you collect $4,300/mo, pay maybe $3,400/mo all-in. <strong>+$900/mo cash flow on a $20k investment — that&apos;s 54% <Link href="/glossary/cash-on-cash-return" className="text-primary font-semibold hover:underline">cash-on-cash</Link>.</strong>
          </p>
          <p>
            Pro tip: model both years before you commit. TrueCap&apos;s 10-year projection (Pro) shows year-1 break-even followed by year-2+ cash flow. The post-transition numbers are usually what justifies the strategy on paper; year-1 is the cost of admission.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">What to look for in a house-hack property</h2>
          <p>
            Best house-hack targets share traits:
          </p>
          <ul>
            <li><strong>2-4 units in a livable city neighborhood</strong> — you&apos;re going to live there for at least a year</li>
            <li><strong>Owner-occupied-friendly rent-to-price ratio</strong> — units should rent for 0.6-1%+ of price each</li>
            <li><strong>Separate utilities</strong> — sub-metered electric/gas means tenants pay their own, no allocation disputes</li>
            <li><strong>Newer roof, electrical, HVAC</strong> — you can&apos;t cash-out-refi-rehab during your live-in year easily; pick a property that doesn&apos;t need major capex up front</li>
            <li><strong>Good local PM market</strong> — when you move out in year 2, you&apos;ll likely hand it to a PM. Check fees and references before buying.</li>
            <li><strong>Reasonable school district</strong> for the next owner-occupant who buys it from you in 5-10 years</li>
          </ul>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">The honest downsides</h2>
          <p>
            House hacking isn&apos;t magic:
          </p>
          <ul>
            <li><strong>You live next to your tenants.</strong> Loud party at 2am? You&apos;re the one on the wall. Maintenance call at 7am? You&apos;re probably the one walking over.</li>
            <li><strong>You can only do this with FHA once at a time</strong> (FHA requires 1 primary residence per borrower at a time, mostly). You can chain conventional 5%-down owner-occupant loans but each needs the year of residency.</li>
            <li><strong>Year 1 cash flow is usually break-even or negative.</strong> Your personal balance sheet needs to carry that for 12 months until you can move out.</li>
            <li><strong>Tenant turnover during your residency hurts more</strong> — you can&apos;t easily move other units while you&apos;re living there to do rehab during turnover.</li>
          </ul>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">The bottom line</h2>
          <p>
            House hacking is the highest-leverage strategy in real estate that&apos;s actually accessible to a normal-income buyer. $10-20k down for a $300-400k 2-4 unit, year of living break-even, then year 2 onward producing real cash flow on what was originally your housing.
          </p>
          <p>
            The deals that pencil are out there in most US markets — Philadelphia, Cleveland, Indianapolis, Memphis, Pittsburgh, and the Midwest in general have the highest hit rate. Coastal markets are harder but not impossible (Sacramento, Oakland, parts of Boston). Run any specific property through{" "}
            <Link href="/" className="text-primary font-semibold hover:underline">TrueCap with property type = owner-occupant</Link> to see whether the math works before you commit. The starter template &quot;Starter — House hack&quot; on{" "}
            <Link href="/dashboard/templates" className="text-primary font-semibold hover:underline">/dashboard/templates</Link> pre-seeds the right defaults. To find the kinds of motivated-seller 2-4 unit deals that make house hacking work, read <Link href="/blog/how-to-find-off-market-rental-properties" className="text-primary font-semibold hover:underline">how to find off-market rental properties</Link>.
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
