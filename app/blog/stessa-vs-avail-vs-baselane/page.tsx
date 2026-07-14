/**
 * 3-way comparison blog post.
 *
 * Captures the high-intent "X vs Y vs Z" search demand by giving an
 * honest matrix of how three competitors stack up, with TrueCap framed
 * appropriately — sometimes the answer, sometimes the upstream / downstream
 * layer the other three don't address.
 *
 * Schema: Article + Breadcrumb + FAQPage for maximum SERP eligibility.
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

const SLUG = "stessa-vs-avail-vs-baselane";
const TITLE = "Stessa vs Avail vs Baselane: 3-way landlord ops comparison";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Stessa vs Avail vs Baselane (2026)";
const DESCRIPTION =
  "Stessa is accounting. Avail is leasing + rent collection. Baselane bundles both with banking. Honest 3-way comparison plus where TrueCap fits before any of them.";
const PUBLISHED_AT = "2026-06-07";
const MODIFIED_AT = "2026-06-07";
const READING_TIME_MIN = 10;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "stessa vs avail",
    "stessa vs baselane",
    "avail vs baselane",
    "best rental property software",
    "landlord operations software",
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

const FAQ_ITEMS = [
  {
    q: `Should I use Stessa, Avail, or Baselane?`,
    a: `Pick based on what you need most. Stessa for accounting (especially if you have existing business banking). Avail for leasing + ACH rent collection (especially if you're placing new tenants often). Baselane if you want banking + bookkeeping + rent collection in one platform and don't mind moving your rental banking. Many landlords end up using two of the three.`,
  },
  {
    q: `Is Baselane really FDIC-insured?`,
    a: `Yes. Baselane partners with FDIC-insured banks (Thread Bank and Blue Ridge Bank as of 2026) for deposit insurance up to standard FDIC limits (\$250k per depositor per bank). They're a fintech with bank partners, not a chartered bank themselves — common structure for modern business banking products.`,
  },
  {
    q: `Are all three really free?`,
    a: `Yes, with caveats. Stessa free covers unlimited properties + bank-feed accounting. Avail free covers listings, applications, lease signing, and ACH rent collection (tenants pay for their own screening). Baselane free covers banking + basic bookkeeping + ACH rent collection (Baselane makes money on interchange + interest spread). Premium tiers add advanced features but the free tiers are genuinely useful.`,
  },
  {
    q: `Does TrueCap replace any of these?`,
    a: `No. TrueCap is pre-purchase underwriting — cap rate, DSCR, cash flow, projection, deal score. Stessa / Avail / Baselane are post-purchase ops. They cover entirely different stages of the rental lifecycle. Most landlords use TrueCap to underwrite + one or two of the others to operate.`,
  },
  {
    q: `Avail vs Stessa — which one if I can only pick one?`,
    a: `If you're filling units and managing tenants actively, Avail is more useful (listings, screening, leases, rent collection). If you already have tenants in place and just need accounting + Schedule E for tax time, Stessa is more useful. Most landlords with 3+ units end up wanting both eventually.`,
  },
];

export default function ThreeWayComparisonPost() {
  const siteUrl = getSiteUrl();
  const url = `${siteUrl}/blog/${SLUG}`;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: TITLE,
    description: DESCRIPTION,
    image: [`${siteUrl}/home.jpg`],
    datePublished: PUBLISHED_AT,
    dateModified: MODIFIED_AT,
    author: { "@type": "Organization", name: "TrueCap", url: siteUrl },
    publisher: { "@id": `${siteUrl}/#organization` },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${siteUrl}/blog` },
      { "@type": "ListItem", position: 3, name: TITLE, item: url },
    ],
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <main id="main" className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-2">
          <Link
            href="/blog"
            className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground"
          >
            ← TrueCap Blog
          </Link>
        </div>

        <article>
          <header className="mb-8 sm:mb-10">
            <div className="text-[11px] uppercase tracking-widest text-primary font-bold mb-3">
              Comparison · {READING_TIME_MIN} min read
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground leading-[1.05] tracking-tight text-balance">
              {TITLE}
            </h1>
            <p className="mt-4 text-base sm:text-lg leading-relaxed text-muted-foreground">
              {DESCRIPTION}
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Published {PUBLISHED_AT}
            </p>
          </header>

          {/* TL;DR */}
          <section className="mb-10 rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-primary mb-3">
              TL;DR
            </h2>
            <p
              className="text-sm sm:text-base leading-relaxed text-foreground"
              dangerouslySetInnerHTML={{ __html: `All three are post-purchase landlord ops platforms — they help you run rentals you already own. <strong>Stessa</strong> is the accounting + bookkeeping leader (bank-feed sync, Schedule E). <strong>Avail</strong> (owned by Realtor.com) is the leasing-and-collection leader (listings, applications, screening, lease signing, rent collection). <strong>Baselane</strong> bundles both into one platform plus rental banking (FDIC-insured business checking per property). All three have free tiers. Most landlords end up with two of them, or just one Baselane. <strong>TrueCap</strong> isn&apos;t in this category — it&apos;s the pre-purchase underwriting calculator you&apos;d use BEFORE setting up any of these tools.` }}
            />
          </section>

          <div className="prose prose-neutral max-w-none prose-headings:font-extrabold prose-headings:text-foreground prose-p:text-foreground prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-li:text-foreground prose-li:leading-relaxed">
            <h2>The three in one sentence each</h2>
            <div dangerouslySetInnerHTML={{ __html: `<ul>
              <li><strong>Stessa</strong> — rental accounting + bookkeeping. Connect your bank, transactions auto-categorize, Schedule E builds itself. Free tier covers unlimited properties. Stessa Pro (~\$12/mo) adds advanced reporting + document organization.</li>
              <li><strong>Avail</strong> — DIY landlord ops: listings (syndicated to Realtor.com / Zillow / Apartments.com), online rental applications, TransUnion-powered tenant screening, state-specific lease templates, ACH rent collection. Free Unlimited tier; Unlimited Plus is ~\$7/unit/month.</li>
              <li><strong>Baselane</strong> — banking + bookkeeping + rent collection. FDIC-insured business checking per property (Thread Bank / Blue Ridge Bank partners), auto-categorized expenses synced with your bank feed, Schedule E reports, ACH rent collection — all in one platform. Free banking + bookkeeping tier; advanced features ~\$22/mo (as of 2026).</li>
            </ul>` }} />

            <h2>Stessa vs Baselane — accounting head-to-head</h2>
            <div dangerouslySetInnerHTML={{ __html: `<p>This is the closest match. Both do bookkeeping; the difference is whose bank feed.</p>
            <ul>
              <li><strong>Stessa</strong> connects your existing bank account(s) — you keep banking wherever you already are (a credit union, your current business checking, etc.). Transactions auto-categorize into rental-property buckets. Strong reporting + multi-property dashboards.</li>
              <li><strong>Baselane</strong> bundles a dedicated FDIC-insured business checking account per property. Because Baselane IS the bank, categorization is tighter and reconciliation is automatic. You&apos;d be moving your rental banking to Baselane.</li>
            </ul>
            <p>If you have rentals across multiple LLCs or already have business banking set up the way you like, Stessa is the less disruptive choice. If you&apos;re starting fresh or willing to switch banks, Baselane&apos;s integrated approach is genuinely faster + simpler.</p>` }} />

            <h2>Avail vs Baselane — rent collection head-to-head</h2>
            <div dangerouslySetInnerHTML={{ __html: `<p>Both collect rent via ACH for free. The difference is what surrounds the rent collection.</p>
            <ul>
              <li><strong>Avail</strong> bundles rent collection with the leasing workflow (listings + applications + screening + lease). If you&apos;re placing tenants and managing the full lease lifecycle, Avail is more complete.</li>
              <li><strong>Baselane</strong> bundles rent collection with banking + bookkeeping. The rent lands in your Baselane account and is auto-categorized for accounting. If you don&apos;t need leasing tools (e.g. you have long-term tenants already in place), Baselane is more focused.</li>
            </ul>
            <p>For new landlords filling units, Avail wins. For established landlords focused on bookkeeping + banking, Baselane wins.</p>` }} />

            <h2>Free tier comparison</h2>
            <div dangerouslySetInnerHTML={{ __html: `<ul>
              <li><strong>Stessa free</strong> — unlimited properties, bank-feed sync, basic Schedule E reports, document storage. Genuinely usable forever.</li>
              <li><strong>Avail free</strong> (&quot;Unlimited&quot;) — unlimited listings, applications, lease signing, ACH rent collection. Tenants pay for screening (~\$30-55).</li>
              <li><strong>Baselane free</strong> — FDIC-insured business checking, ACH rent collection, basic bookkeeping. Their banking partner pays them via interchange + interest spread, so the &quot;free&quot; is real.</li>
            </ul>
            <p>All three have legitimately useful free tiers. The decision isn&apos;t price — it&apos;s which features you need.</p>` }} />

            <h2>Which combo to use?</h2>
            <div dangerouslySetInnerHTML={{ __html: `<p>For most landlords, here&apos;s how the stacks shake out:</p>
            <ul>
              <li><strong>Stessa + Avail</strong> — Stessa handles accounting, Avail handles leasing + rent collection. Most common pairing. Tradeoff: rent payment data lives in Avail but accounting categorization happens in Stessa, so there&apos;s some friction reconciling.</li>
              <li><strong>Just Baselane</strong> — one platform for banking + bookkeeping + rent collection. Simplest stack. Tradeoff: no leasing / screening / applications, so you&apos;d still need Avail or a separate screening tool when filling units.</li>
              <li><strong>Stessa + Avail + Baselane</strong> — full coverage if you want best-in-class for each, but three logins.</li>
              <li><strong>Baselane + Avail</strong> — Baselane for banking/bookkeeping, Avail for leasing. Avoids Stessa entirely.</li>
            </ul>` }} />

            <h2>Where TrueCap fits</h2>
            <div dangerouslySetInnerHTML={{ __html: `<p>Upstream of all three. TrueCap is the pre-purchase underwriting calculator — cap rate, DSCR, cash flow, 10-year projection, deal score. You use TrueCap to decide whether to buy a property; then you use Stessa / Avail / Baselane to operate it.</p>
            <p>The full investor stack (cheapest version): TrueCap free (underwriting) + Stessa free OR Baselane free (accounting/banking) + Avail free (leasing). \$0/month for the basics.</p>` }} />

            <h2>FAQ</h2>
            <div className="not-prose space-y-3">
              {FAQ_ITEMS.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-xl border border-border bg-card p-4 sm:p-5"
                >
                  <summary className="cursor-pointer list-none flex items-start justify-between gap-3 font-bold text-sm sm:text-base text-foreground">
                    <span>{item.q}</span>
                    <span
                      aria-hidden
                      className="mt-1 size-5 shrink-0 rounded-full border border-border text-muted-foreground text-xs leading-none flex items-center justify-center transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <div className="mt-3 text-sm text-muted-foreground leading-relaxed">
                    {item.a}
                  </div>
                </details>
              ))}
            </div>

            <h2>Try TrueCap free</h2>
            <p>Run your next deal through TrueCap (free) before you set up Stessa, Avail, or Baselane. The underwriting tells you whether the property is worth operating in the first place.</p>
            <p className="not-prose">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-3 font-bold hover:opacity-90"
              >
                <Calculator className="w-4 h-4" />
                Run a deal — 60 seconds
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </p>
          </div>

          <div className="mt-10">
            <NewsletterSignup />
          </div>

          <div className="mt-10">
            <RelatedBlogPosts currentSlug={SLUG} limit={3} />
          </div>
        </article>
      </main>

      <BlogStickyCta />
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
