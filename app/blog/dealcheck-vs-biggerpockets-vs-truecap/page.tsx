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
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "dealcheck-vs-biggerpockets-vs-truecap";
const TITLE =
  "DealCheck vs BiggerPockets vs TrueCap: which rental calculator wins?";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "DealCheck vs BiggerPockets vs TrueCap (2026)";
const DESCRIPTION =
  "Honest 3-way comparison of DealCheck, BiggerPockets Calculator, and TrueCap. Free tier depth, pricing, projections, mobile, and which fits which investor.";
const PUBLISHED_AT = "2026-06-07";
const MODIFIED_AT = "2026-08-16";
const READING_TIME_MIN = 11;

export const metadata: Metadata = {
  title: SERP_TITLE,
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
    q: `Which is cheapest — DealCheck, BiggerPockets, or TrueCap?`,
    a: `TrueCap's core analyzer and DealCheck Starter can both be used without a paid subscription, although their features and usage limits differ. BiggerPockets currently presents its rental-calculator results as a Pro feature. Paid prices change, so compare each official pricing page for the current total and included features.`,
  },
  {
    q: `Which has the best free tier?`,
    a: `TrueCap is a strong fit when the priority is unlimited core analyses without signup: cap rate, cash-on-cash, DSCR, NCF, monthly cash flow, and editable starting assumptions are included. DealCheck Starter requires an account and includes its core calculators and professional reports, with up to 15 saved properties and other published limits. BiggerPockets currently presents calculator results as a Pro feature.`,
  },
  {
    q: `Does TrueCap have native iOS and Android apps like DealCheck?`,
    a: `No — TrueCap is a Progressive Web App (PWA). You can install it from the browser to your home screen, but it isn't distributed through the App Store. DealCheck offers native iOS and Android apps, which may fit investors who prefer an app-store workflow.`,
  },
  {
    q: `Should I keep paying for BiggerPockets just for the calculator?`,
    a: `It depends on whether you use the broader BiggerPockets Pro membership. If your need is limited to underwriting, compare the current calculator access, workflow, and pricing against TrueCap and DealCheck. If you also use BiggerPockets' community and educational resources, evaluate the membership as a bundle.`,
  },
  {
    q: `Is BiggerPockets calculator more accurate than DealCheck or TrueCap?`,
    a: `The tools report many of the same standard metrics, but their results can differ because of input defaults, metric definitions, rounding, and projection assumptions. Compare them with the same verified rent, financing, tax, insurance, vacancy, maintenance, management, and capital-expenditure inputs.`,
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
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${siteUrl}/blog`,
      },
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

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
              dangerouslySetInnerHTML={{
                __html: `<strong>DealCheck</strong> combines core rental, BRRRR, Airbnb, and flip calculators with native mobile apps and listing imports; Starter includes professional interactive and PDF reports with published usage limits. <strong>BiggerPockets Calculator</strong> currently presents its results as a BiggerPockets Pro feature. <strong>TrueCap</strong> offers unlimited no-signup core analyses and editable screening assumptions. A free account adds one comps lookup and creation of read-only share links; recipients can view without an account. Pro adds 50 comps lookups per month, 10-year cash-flow and equity projections, sensitivity, Offer Ceiling, comparison, and reports. Choose based on the workflow you need, then verify current plan terms before subscribing.`,
              }}
            />
          </section>

          <p className="mb-10 text-sm text-muted-foreground">
            Access and pricing change. Check the official{" "}
            <a
              href="https://dealcheck.io/pricing/"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              DealCheck pricing
            </a>
            ,{" "}
            <a
              href="https://www.biggerpockets.com/rental-property-calculator"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              BiggerPockets calculator
            </a>
            ,{" "}
            <a
              href="https://www.biggerpockets.com/pro"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              BiggerPockets Pro
            </a>
            , and{" "}
            <a
              href="https://usetruecap.com/pricing"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              TrueCap pricing
            </a>{" "}
            pages for current terms.
          </p>

          <div className="prose prose-neutral max-w-none prose-headings:font-extrabold prose-headings:text-foreground prose-p:text-foreground prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-li:text-foreground prose-li:leading-relaxed">
            <h2>The three calculators in one sentence each</h2>
            <div
              dangerouslySetInnerHTML={{
                __html: `<ul>
              <li><strong>DealCheck</strong> — per-deal underwriting across rental, BRRRR, Airbnb, and flip strategies, with free Starter and paid Plus and Pro plans. It offers native iOS and Android apps and listing-import tools.</li>
              <li><strong>BiggerPockets Calculator</strong> — a rental-property calculator whose results are currently presented as a BiggerPockets Pro membership feature alongside broader community and educational resources.</li>
              <li><strong>TrueCap</strong> — an installable PWA with no-account preliminary core screens, labeled screening benchmarks, selected-rule fit, and a secondary Screening Index. Pro adds a 10-year cash-flow and equity projection, sensitivity, Offer Ceiling, comparison, and reports.</li>
            </ul>`,
              }}
            />

            <h2>Free tier comparison</h2>
            <div
              dangerouslySetInnerHTML={{
                __html: `<p>This is where they diverge most. The free tier sets expectations for the paid one — if free feels gated, you&apos;re skeptical of Pro.</p>
            <ul>
              <li><strong>TrueCap free</strong> — preliminary screens with cap rate, CoC, DSCR, NOI, monthly cash flow, selected-rule fit, and labeled address starting assumptions without signup. A free signed-in account adds up to 5 saved deals, dashboard access, and creation of read-only share links; recipients do not need an account.</li>
              <li><strong>DealCheck Starter</strong> — account required; core rental, BRRRR, Airbnb, and flip calculators plus professional interactive and PDF reports are included. Starter supports up to 15 saved properties and has published limits on photos, comps, and templates.</li>
              <li><strong>BiggerPockets calculator</strong> — the current official page presents calculator results as a BiggerPockets Pro feature. Check the official calculator and Pro pages because access terms can change.</li>
            </ul>
            <p>If you want to underwrite a deal immediately without paying or creating an account, TrueCap supports that workflow.</p>`,
              }}
            />

            <h2>Pricing (paid tier comparison)</h2>
            <div
              dangerouslySetInnerHTML={{
                __html: `<ul>
              <li><strong>TrueCap</strong> — free core analyzer with paid Pro plans. Creating read-only share links is included with a free signed-in account; recipients can view without an account. Pro adds PDF reports, 50 comps lookups per month, 10-year cash-flow and equity projections, sensitivity, an Offer Ceiling, editing, unlimited saves, and comparison tools.</li>
              <li><strong>DealCheck</strong> — free Starter plus paid Plus and Pro plans. The core calculators and professional reports are on Starter; paid plans raise saved-property, photo, comp, and template limits.</li>
              <li><strong>BiggerPockets Pro</strong> — bundles rental-calculator access with its broader membership benefits. Check the official Pro page for current price, trial, and renewal terms.</li>
            </ul>
            <p>Compare the current total price against the features you will use. DealCheck&apos;s paid plans primarily raise published limits, TrueCap Pro adds advanced analysis workflows, and BiggerPockets Pro combines calculator access with a broader membership.</p>`,
              }}
            />

            <h2>Mobile + at the showing</h2>
            <div
              dangerouslySetInnerHTML={{
                __html: `<p>TrueCap is a Progressive Web App that can be installed from the browser to a home screen. DealCheck offers native iOS and Android apps. BiggerPockets provides its calculator through the web.</p>
            <p>Choose DealCheck if app-store distribution is important. Choose TrueCap if an installable browser app fits your workflow. Test the interface you plan to use at showings before committing to a paid plan.</p>`,
              }}
            />

            <h2>What each does better</h2>
            <div
              dangerouslySetInnerHTML={{
                __html: `<ul>
              <li><strong>TrueCap stands out for</strong>: unlimited no-signup core analyses, labeled screening assumptions, selected-rule fit, portfolio rollup, a secondary Screening Index, target-dependent Offer Ceiling, and sensitivity.</li>
              <li><strong>DealCheck stands out for</strong>: native iOS and Android apps, listing imports, calculators for several investment strategies on Starter, and a longer product history.</li>
              <li><strong>BiggerPockets stands out for</strong>: combining calculator access with its broader investor community and educational membership resources.</li>
            </ul>`,
              }}
            />

            <h2>Quick decision matrix</h2>
            <div
              dangerouslySetInnerHTML={{
                __html: `<ul>
              <li><strong>&quot;I want to underwrite a deal right now, no signup.&quot;</strong> TrueCap supports that flow.</li>
              <li><strong>&quot;I want projections, sensitivity, Offer Ceiling, and saved-deal comparison.&quot;</strong> Compare TrueCap&apos;s current Pro plans.</li>
              <li><strong>&quot;I underwrite on my phone at every showing.&quot;</strong> DealCheck — native apps.</li>
              <li><strong>&quot;I already pay for BiggerPockets for the community.&quot;</strong> Stay with BiggerPockets&apos; calculator; you&apos;re already paying.</li>
              <li><strong>&quot;I want selected-rule context, not just metrics.&quot;</strong> TrueCap — selected-rule fit with a secondary Screening Index breakdown.</li>
              <li><strong>&quot;I want full property detail imported from a Zillow / Redfin listing.&quot;</strong> DealCheck. (TrueCap takes a pasted listing link too, but pulls only the address — not the listing&apos;s price, taxes and photos.)</li>
              <li><strong>&quot;I want a portfolio rollup across saved deals.&quot;</strong> TrueCap.</li>
            </ul>`,
              }}
            />

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
            <p>
              Run the same verified inputs through the tools you are
              considering. Their metric labels overlap, but defaults,
              definitions, and projections can produce different results;
              compare both the outputs and the workflow before choosing.
            </p>
            <p className="not-prose"></p>
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
