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

const SLUG = "dealcheck-vs-biggerpockets-vs-truecap";
const TITLE = "DealCheck vs BiggerPockets vs TrueCap: which rental calculator wins?";
const DESCRIPTION =
  "Honest 3-way comparison of DealCheck, BiggerPockets Calculator, and TrueCap. Free tier depth, pricing, projections, mobile, and which fits which investor.";
const PUBLISHED_AT = "2026-06-07";
const MODIFIED_AT = "2026-06-07";
const READING_TIME_MIN = 11;

export const metadata: Metadata = {
  title: `${TITLE} | TrueCap Blog`,
  description: DESCRIPTION,
  keywords: [
    "dealcheck vs biggerpockets",
    "dealcheck vs truecap",
    "biggerpockets vs truecap",
    "best rental property calculator",
    "rental analysis tool comparison",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `/blog/${SLUG}`,
    type: "article",
    publishedTime: PUBLISHED_AT,
    modifiedTime: MODIFIED_AT,
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/home.jpg"],
  },
};

const FAQ_ITEMS = [
  {
    q: `Which is cheapest — DealCheck, BiggerPockets, or TrueCap?`,
    a: `For the calculator alone, TrueCap at \$19/month is the cheapest. DealCheck Plus is ~\$25/month. BiggerPockets Pro is ~\$32.50/month (annual, \$390/year), but that bundles forums, courses, and other community access. If you want only the calculator, TrueCap is roughly half the price of the others.`,
  },
  {
    q: `Which has the best free tier?`,
    a: `TrueCap, hands down. TrueCap free covers cap rate, cash-on-cash, DSCR, NCF, monthly cash flow, and address auto-fill on unlimited analyses with no signup. DealCheck free caps the number of analyses per month and gates most outputs. BiggerPockets free gives a few reports per month before gating to the \$390/year Pro tier.`,
  },
  {
    q: `Does TrueCap have native iOS and Android apps like DealCheck?`,
    a: `No — TrueCap is a Progressive Web App (PWA). Install from the browser to your home screen and it works like a native app, but it isn't distributed through the App Store. DealCheck has true native apps with offline support, which is the better choice if you underwrite at showings all day on mobile.`,
  },
  {
    q: `Should I keep paying for BiggerPockets just for the calculator?`,
    a: `Probably not. BiggerPockets Pro is ~\$390/year and bundles forums, courses, books, podcasts, and community. If you actively use the community, it's worth it. If you're paying for the calculator specifically, TrueCap (~\$190/year on annual) is half the price and has a more capable calculator.`,
  },
  {
    q: `Is BiggerPockets calculator more accurate than DealCheck or TrueCap?`,
    a: `No — all three use the same standard rental-property formulas (cap rate, CoC, DSCR, NCF). The math is identical. The differences are in what data they auto-fill (TrueCap uses HUD FMR + FRED + state tax; DealCheck imports from listing sites), what they project (10-year, tax, exit), and how they present results.`,
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
              dangerouslySetInnerHTML={{ __html: `They&apos;re the three calculators most rental investors evaluate. <strong>DealCheck</strong> is the established competitor with native mobile apps and a tighter listing-import workflow. <strong>BiggerPockets Calculator</strong> is the household name that bundles with a \$390/year community subscription. <strong>TrueCap</strong> is the modern alternative with a deeper free tier, address auto-fill from HUD + FRED + state property tax, and a single \$19/mo Pro tier that bundles features the other two split across multiple plans. Pick TrueCap if you want the strongest free tier and simplest pricing. Pick DealCheck if you need native iOS / Android apps. Pick BiggerPockets if you&apos;re already paying for the community.` }}
            />
          </section>

          <div className="prose prose-neutral max-w-none prose-headings:font-extrabold prose-headings:text-foreground prose-p:text-foreground prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-li:text-foreground prose-li:leading-relaxed">
            <h2>The three calculators in one sentence each</h2>
            <div dangerouslySetInnerHTML={{ __html: `<ul>
              <li><strong>DealCheck</strong> — per-deal rental underwriting calculator with a 3-tier plan ladder (Starter ~\$15/mo, Plus ~\$25/mo, Premium ~\$35/mo as of 2026). Native iOS and Android apps. Strong listing-import workflow that pulls property details from Zillow / Redfin.</li>
              <li><strong>BiggerPockets Calculator</strong> — bundled with a BiggerPockets Pro subscription (~\$390/year ≈ \$32.50/mo). Big brand, decade+ of trust. Calculator UX hasn&apos;t evolved much in years; no portfolio rollup.</li>
              <li><strong>TrueCap</strong> — newer calculator with a deeper free tier (full cap rate, CoC, DSCR, NCF, monthly cash flow with no monthly cap). Pro is a single \$19/mo tier bundling everything. PWA installable to home screen (no native apps). Address auto-fill via HUD Fair Market Rent + FRED 30-year rate + state property tax — none of the others do this.</li>
            </ul>` }} />

            <h2>Free tier comparison</h2>
            <div dangerouslySetInnerHTML={{ __html: `<p>This is where they diverge most. The free tier sets expectations for the paid one — if free feels gated, you&apos;re skeptical of Pro.</p>
            <ul>
              <li><strong>TrueCap free</strong> — unlimited analyses, cap rate, CoC, DSCR, NCF, monthly cash flow, plain-English verdict, address auto-fill. No signup required to use the calculator.</li>
              <li><strong>DealCheck free</strong> — limited analyses per month, signup required, most outputs gated to paid tiers. Listing-import works on free.</li>
              <li><strong>BiggerPockets calculator free</strong> — a few free reports per month, then gated behind BiggerPockets Pro (\$390/year).</li>
            </ul>
            <p>If you want to underwrite a deal right now without paying or signing up, TrueCap is the only one of the three that lets you. That&apos;s the wedge.</p>` }} />

            <h2>Pricing (paid tier comparison)</h2>
            <div dangerouslySetInnerHTML={{ __html: `<ul>
              <li><strong>TrueCap Pro</strong> — \$19/month (or about \$190/year on the annual plan, ~\$16/mo). Single tier. Everything included: 10-year projections, tax strategy, sensitivity grid, exit scenarios, Deal Score, MAO solver, BRRRR + fix-and-flip analyzers, share links, PDF exports, branded reports, save / compare / template deals.</li>
              <li><strong>DealCheck Plus</strong> — ~\$25/month. Adds 10-year projections, tax view, save deals, PDF export.</li>
              <li><strong>DealCheck Premium</strong> — ~\$35/month. Adds more advanced analysis features, integrations, and higher analysis caps.</li>
              <li><strong>BiggerPockets Pro</strong> — ~\$32.50/month (annual). Bundles the calculator with community, courses, forums, podcasts, books. Calculator alone isn&apos;t cheaper.</li>
            </ul>
            <p>For the calculator alone, TrueCap is roughly half the price of the others. If you&apos;re paying BiggerPockets for the community, the calculator is effectively free — but if you&apos;re paying for the calculator itself, you&apos;re overpaying.</p>` }} />

            <h2>Mobile + at the showing</h2>
            <div dangerouslySetInnerHTML={{ __html: `<p>The honest one. TrueCap is a Progressive Web App — install it from the browser to your home screen and it works like a native app without going through the App Store. DealCheck has true native iOS and Android apps with offline support and better camera-tied workflows. BiggerPockets has a mobile-optimized web view and a separate forum app, but the calculator is mostly desktop-leaning.</p>
            <p>If you underwrite at showings on your phone all day, DealCheck&apos;s native apps are the most polished mobile experience. If you sometimes underwrite on mobile but mostly at a desk, TrueCap&apos;s PWA is enough. If you live in BiggerPockets and don&apos;t mind the desktop-leaning calculator, you&apos;re already there.</p>` }} />

            <h2>What each does better</h2>
            <div dangerouslySetInnerHTML={{ __html: `<ul>
              <li><strong>TrueCap wins</strong>: deepest free tier, simplest pricing, address auto-fill from authoritative open data (HUD + FRED + state tax), plain-English verdict (Strong / Solid / Mixed / Marginal / Negative), portfolio rollup across saved deals, deal score with subscore breakdown, MAO solver, sensitivity grid, tax-strategy modeling with bracket-aware after-tax cash flow.</li>
              <li><strong>DealCheck wins</strong>: native iOS + Android apps, listing-import-from-Zillow workflow, longer track record in the BRRRR community, broader brand recognition among investors.</li>
              <li><strong>BiggerPockets wins</strong>: bundled with the largest real-estate community on the internet, books + courses + forums + podcasts all in one subscription, calculator output format is the one your private-money lender or syndicate partner has already seen.</li>
            </ul>` }} />

            <h2>Quick decision matrix</h2>
            <div dangerouslySetInnerHTML={{ __html: `<ul>
              <li><strong>&quot;I want to underwrite a deal right now, no signup.&quot;</strong> TrueCap. Only one that lets you.</li>
              <li><strong>&quot;I want the cheapest Pro tier for the calculator alone.&quot;</strong> TrueCap (\$19/mo).</li>
              <li><strong>&quot;I underwrite on my phone at every showing.&quot;</strong> DealCheck — native apps.</li>
              <li><strong>&quot;I already pay for BiggerPockets for the community.&quot;</strong> Stay with BiggerPockets&apos; calculator; you&apos;re already paying.</li>
              <li><strong>&quot;I want a plain-English verdict, not just metrics.&quot;</strong> TrueCap — Strong / Solid / Mixed / Marginal / Negative with subscore breakdown.</li>
              <li><strong>&quot;I want listing import from Zillow / Redfin.&quot;</strong> DealCheck.</li>
              <li><strong>&quot;I want a portfolio rollup across saved deals.&quot;</strong> TrueCap.</li>
            </ul>` }} />

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
            <p>Run a deal in all three calculators (DealCheck free analysis, BiggerPockets free report, TrueCap free analyzer) and you&apos;ll know within an hour which UI you actually want to live in. The math is identical; the UX, free-tier depth, and pricing structure are what differ.</p>
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
