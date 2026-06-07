/**
 * Methodology blog post — "How TrueCap's Verdict Engine decides
 * Strong Buy vs Avoid". Explains the actual thresholds in
 * lib/verdict.ts in plain English. Builds trust + earns
 * organic search for "is this rental a good deal" / "rental
 * property deal score" queries.
 *
 * IMPORTANT: the thresholds quoted in this post are pulled
 * directly from lib/verdict.ts. If verdict.ts changes (per
 * CLAUDE.md item #5 in out-of-scope), THIS POST MUST BE
 * UPDATED — drift between code and the methodology page
 * destroys trust faster than not having the page at all.
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

const SLUG = "how-truecap-verdict-engine-works";
const TITLE = "How TrueCap's verdict engine decides Strong Buy vs Avoid";
const DESCRIPTION =
  "The exact cash flow, DSCR, cap rate, and cash-on-cash thresholds TrueCap uses to classify a rental deal as Strong / Solid / Mixed / Marginal / Negative — pulled directly from the production code.";
const PUBLISHED_AT = "2026-06-07";
const MODIFIED_AT = "2026-06-07";
const READING_TIME_MIN = 10;

export const metadata: Metadata = {
  title: `${TITLE} | TrueCap Blog`,
  description: DESCRIPTION,
  keywords: [
    "rental property verdict engine",
    "is this rental a good deal",
    "rental property deal score",
    "rental underwriting thresholds",
    "rental property classification",
    "good cap rate rental",
    "good dscr rental",
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
    q: "How does TrueCap decide if a rental property is a good deal?",
    a: "TrueCap classifies each deal as Strong, Solid, Mixed, Marginal, or Negative based on four metrics: monthly cash flow, debt service coverage ratio (DSCR), cap rate, and cash-on-cash return. Strong requires cash flow ≥ $400/mo, DSCR ≥ 1.25, and CoC ≥ 10%. Solid requires cash flow ≥ $100/mo, DSCR ≥ 1.15, and CoC ≥ 6%. Marginal and Negative trigger when cash flow goes negative or DSCR drops below 1.0.",
  },
  {
    q: "What cash flow does TrueCap consider 'good'?",
    a: "$400/month or more net monthly cash flow (after all operating expenses and debt service) clears the Strong threshold. $100-400/month is Solid territory. Below $100/month but still positive is Mixed. Negative cash flow drops you into Marginal (down to -$200) or Negative (worse than -$200).",
  },
  {
    q: "What DSCR is required for TrueCap's Strong verdict?",
    a: "1.25 or higher. That's the threshold most investment-property lenders require, so a DSCR ≥ 1.25 means the deal would likely qualify for a standard DSCR loan. 1.15-1.25 is the Solid range. 1.0-1.15 is Mixed/Marginal (above breakeven but lender-tight). Below 1.0 means operating income doesn't cover debt service and we classify the deal as Negative.",
  },
  {
    q: "How does TrueCap handle all-cash purchases for DSCR?",
    a: "DSCR doesn't apply to cash purchases — there's no debt service. The verdict engine detects this (monthlyPayment <= 0) and switches to a cash-only classifier that leans on cash flow, cap rate, and cash-on-cash. A cash deal with $400+/mo cash flow, ≥ 7% cap rate, and ≥ 8% CoC is Strong; ≥ $100/mo, ≥ 5% cap, ≥ 5% CoC is Solid.",
  },
  {
    q: "What's the difference between the verdict and the Pro Deal Score?",
    a: "The verdict is the free-tier rule-of-thumb classifier (Strong / Solid / Mixed / Marginal / Negative). The Pro Deal Score is a 0-100 weighted score with subscore breakdown that lives behind a Pro subscription. The verdict is intentionally simpler — it tells you which bucket the deal lands in. The Deal Score tells you why, with contribution from each underlying metric.",
  },
];

export default function HowVerdictEngineWorksPost() {
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
              Methodology · {READING_TIME_MIN} min read
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground leading-[1.05] tracking-tight text-balance">
              {TITLE}
            </h1>
            <p className="mt-4 text-base sm:text-lg leading-relaxed text-muted-foreground">
              {DESCRIPTION}
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Published {PUBLISHED_AT}
              {MODIFIED_AT !== PUBLISHED_AT && ` · Updated ${MODIFIED_AT}`}
            </p>
          </header>

          {/* TL;DR */}
          <section className="mb-10 rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-primary mb-3">
              TL;DR
            </h2>
            <p className="text-sm sm:text-base leading-relaxed text-foreground">
              TrueCap&apos;s verdict engine is a small set of explicit
              thresholds that classify a deal into one of five tiers:{" "}
              <strong>Strong, Solid, Mixed, Marginal, Negative</strong>.
              Strong needs <strong>$400+/mo cash flow, DSCR ≥ 1.25, and
              CoC ≥ 10%</strong>. Solid needs <strong>$100+/mo, DSCR ≥
              1.15, and CoC ≥ 6%</strong>. Negative cash flow or DSCR
              below 1.0 trips Marginal / Negative. Cash purchases get
              their own simpler classifier because DSCR doesn&apos;t
              apply. Everything else is Mixed. The exact thresholds and
              the rationale are below.
            </p>
          </section>

          <div className="prose prose-neutral max-w-none prose-headings:font-extrabold prose-headings:text-foreground prose-p:text-foreground prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-li:text-foreground prose-li:leading-relaxed">
            <h2>Why we built a verdict engine at all</h2>
            <p>
              A rental analysis spits out numbers — cap rate, cash flow,
              DSCR, cash-on-cash, IRR — and a new investor stares at
              them wondering if 6.5% is good. An experienced investor
              knows the rules of thumb (DSCR ≥ 1.25, cap rate ≥ 7% in
              most markets, etc.) but still wants a second eye that
              hasn&apos;t fallen in love with the deal.
            </p>
            <p>
              The verdict engine answers <em>&quot;is this a deal?&quot;</em>{" "}
              with one of five tiers and a one-paragraph rationale. It
              runs free, on every analysis, on every property. Pro
              users get the more sophisticated Deal Score on top, but
              the verdict is the baseline.
            </p>
            <p>
              The whole engine is open — the source code is at{" "}
              <code>lib/verdict.ts</code> in the codebase that powers
              this site. This post explains the thresholds with the
              same numbers the production code uses.
            </p>

            <h2>The five tiers, in one sentence each</h2>
            <ul>
              <li>
                <strong>Strong</strong> — clears every metric with
                margin. Move on it if the assumptions check out.
              </li>
              <li>
                <strong>Solid</strong> — clears every threshold but
                without a huge buffer. Worth a deeper underwrite.
              </li>
              <li>
                <strong>Mixed</strong> — one or two metrics are below
                target. Stress-test before offering.
              </li>
              <li>
                <strong>Marginal</strong> — cash flow is negative or
                DSCR is below 1.0. The deal works only if your
                assumptions are too conservative.
              </li>
              <li>
                <strong>Negative</strong> — cash flow is meaningfully
                negative or DSCR is well below 1.0. The numbers
                don&apos;t support a buy-and-hold thesis.
              </li>
            </ul>

            <h2>The exact thresholds (financed purchase)</h2>
            <p>
              Most rental purchases use financing, so this is the
              primary path. The verdict checks four metrics and picks
              the tier where the deal first matches.
            </p>

            <h3>Strong</h3>
            <p>All three must hold:</p>
            <ul>
              <li>Monthly net cash flow ≥ <strong>$400</strong></li>
              <li>DSCR ≥ <strong>1.25</strong></li>
              <li>Cash-on-cash ≥ <strong>10%</strong></li>
            </ul>
            <p>
              The $400/month cash flow floor is the equivalent of about
              $5,000/year in real money — enough to absorb a vacancy or
              minor capex without going underwater. 1.25 DSCR is the
              standard non-QM and DSCR lender threshold; clearing it
              means the deal would qualify for normal investor
              financing. 10% CoC is well above typical alternatives
              (savings, indexed equity ETFs, money-market funds), which
              is the bar a real-estate deal should beat to justify the
              illiquidity.
            </p>

            <h3>Solid</h3>
            <p>All three must hold:</p>
            <ul>
              <li>Monthly net cash flow ≥ <strong>$100</strong></li>
              <li>DSCR ≥ <strong>1.15</strong></li>
              <li>Cash-on-cash ≥ <strong>6%</strong></li>
            </ul>
            <p>
              Solid is &quot;works on paper, no cushion.&quot; A $100/month
              cash flow buffer disappears the moment vacancy ticks up
              or a major appliance breaks. 1.15 DSCR is above breakeven
              but below the 1.25 most lenders want, which is a common
              spot for deals where you bring extra down to qualify. 6%
              CoC is roughly in line with the long-run S&amp;P 500
              dividend yield plus a modest premium — fair compensation
              for the operational work of being a landlord.
            </p>

            <h3>Mixed</h3>
            <p>
              Anything that doesn&apos;t hit Strong or Solid but still
              has positive cash flow and DSCR ≥ 1.0 lands here. Cash
              flow is positive but maybe only by a few dollars. DSCR
              clears breakeven but tightly. CoC may be modest. The deal
              probably works under one set of assumptions but breaks
              under realistic ones.
            </p>

            <h3>Marginal</h3>
            <ul>
              <li>Monthly cash flow is negative but not worse than{" "}
                <strong>-$200</strong>, <em>or</em></li>
              <li>DSCR drops between <strong>0.9 and 1.0</strong></li>
            </ul>
            <p>
              Marginal is &quot;the math doesn&apos;t work today, but
              the deal could become real if rents come in above your
              projection or you lock in below-market financing.&quot;
              It&apos;s a deal worth a second look, but only if you
              have a specific reason to think your assumptions are
              conservative.
            </p>

            <h3>Negative</h3>
            <ul>
              <li>Monthly cash flow worse than <strong>-$200</strong>, <em>or</em></li>
              <li>DSCR below <strong>0.9</strong></li>
            </ul>
            <p>
              Negative is &quot;the numbers don&apos;t support a
              buy-and-hold thesis as entered.&quot; Either the
              purchase price needs to come down, the rent needs to
              come up, or you&apos;re betting on appreciation rather
              than operational returns. There&apos;s nothing wrong
              with that as a strategy — just don&apos;t lie to
              yourself about it being a cash-flowing rental.
            </p>

            <h2>The cash-purchase path</h2>
            <p>
              When the analysis says <code>monthlyPayment &lt;= 0</code>{" "}
              — i.e., there&apos;s no financing — DSCR doesn&apos;t
              mean anything. There&apos;s no debt service to cover.
              The verdict engine detects this and switches to a
              simpler classifier:
            </p>
            <ul>
              <li>
                <strong>Strong</strong>: cash flow ≥ $400/mo, cap rate
                ≥ 7%, CoC ≥ 8%.
              </li>
              <li>
                <strong>Solid</strong>: cash flow ≥ $100/mo, cap rate
                ≥ 5%, CoC ≥ 5%.
              </li>
              <li>
                <strong>Mixed</strong>: positive cash flow but below
                Solid thresholds.
              </li>
              <li>
                <strong>Marginal / Negative</strong>: same negative
                cash flow cutoffs as financed (-$200 boundary).
              </li>
            </ul>
            <p>
              CoC thresholds are slightly lower than the financed
              path because cash purchases are giving up leverage —
              the &quot;same&quot; 8% CoC on cash represents a higher
              risk-adjusted return than 8% CoC on a financed deal,
              because there&apos;s no debt-service risk.
            </p>

            <h2>How the engine talks about each metric</h2>
            <p>
              The verdict isn&apos;t just a tier — it&apos;s a paragraph.
              Each metric gets one sentence with a band-appropriate
              read.
            </p>

            <h3>Cap rate sentences</h3>
            <ul>
              <li>
                <strong>≥ 7%</strong> — &quot;healthy for most markets,
                indicating the property earns its own way independent
                of how it&apos;s financed.&quot;
              </li>
              <li>
                <strong>5-7%</strong> — &quot;typical range for stable
                / appreciation-focused markets.&quot;
              </li>
              <li>
                <strong>3-5%</strong> — &quot;on the low end — common
                in coastal / Tier-1 markets where appreciation is the
                dominant return.&quot;
              </li>
              <li>
                <strong>&lt; 3%</strong> — &quot;well below market
                norms; verify the rent assumption and operating
                expense estimates.&quot;
              </li>
            </ul>

            <h3>DSCR sentences</h3>
            <ul>
              <li>
                <strong>Cash purchase</strong> — &quot;DSCR isn&apos;t
                applicable for an all-cash purchase.&quot;
              </li>
              <li>
                <strong>≥ 1.25</strong> — &quot;clears the typical ≥
                1.25 lender threshold; the property comfortably covers
                debt service.&quot;
              </li>
              <li>
                <strong>1.0 - 1.25</strong> — &quot;in tight territory
                (above breakeven but below the ≥ 1.25 most lenders
                require for investment loans).&quot;
              </li>
              <li>
                <strong>&lt; 1.0</strong> — &quot;below 1.0 —
                operating income doesn&apos;t cover debt service, so
                the owner subsidizes the property each month.&quot;
              </li>
            </ul>

            <h3>Cash-on-cash sentences</h3>
            <ul>
              <li><strong>≥ 12%</strong> — &quot;strong.&quot;</li>
              <li><strong>8 - 12%</strong> — &quot;healthy target for buy-and-hold.&quot;</li>
              <li><strong>4 - 8%</strong> — &quot;modest, likely an appreciation play.&quot;</li>
              <li><strong>0 - 4%</strong> — &quot;below typical alternatives.&quot;</li>
              <li><strong>&lt; 0%</strong> — &quot;negative — investor capital loses value year over year on cash terms alone.&quot;</li>
            </ul>

            <h2>What the verdict <em>doesn&apos;t</em> do</h2>
            <p>
              These are deliberate scope decisions:
            </p>
            <ul>
              <li>
                <strong>No appreciation modeling.</strong> The verdict
                is operations-only — it asks &quot;does this property
                earn its keep today?&quot; not &quot;will it be worth
                more in 5 years?&quot; That&apos;s by design. The Pro
                tier&apos;s 10-year projection and exit-scenarios
                modeling cover the appreciation side.
              </li>
              <li>
                <strong>No subjective &quot;location quality&quot; score.</strong>{" "}
                Plenty of tools muddy the financial verdict with a
                neighborhood-vibes rating. We don&apos;t — location
                quality is what you know about the market, not what an
                algorithm tells you.
              </li>
              <li>
                <strong>No partial credit.</strong> Strong requires
                <em>all three</em> thresholds. Two-out-of-three knocks
                you to Solid. We thought about a weighted score
                (that&apos;s what the Pro Deal Score does) but for the
                free verdict tier, hard cutoffs are easier to trust.
              </li>
            </ul>

            <h2>How to read your own verdict</h2>
            <p>
              When you run a property through{" "}
              <Link href="/">the TrueCap analyzer</Link>, the verdict
              shows up on the cover of the analysis. Use it like this:
            </p>
            <ol>
              <li>
                <strong>Strong</strong>: do a deeper diligence pass —
                verify the rent assumption against actual market
                comps, validate the property tax and insurance lines,
                walk the property. If the numbers hold, write the
                offer.
              </li>
              <li>
                <strong>Solid</strong>: this is the most common
                acceptable verdict for a real-world deal. Stress-test
                rent (drop it 5-10%) and vacancy (bump it from 5% to
                8%) and see if the deal stays in Solid. If it drops
                to Mixed under stress, factor that into your offer
                price.
              </li>
              <li>
                <strong>Mixed</strong>: you need a specific reason to
                like this deal beyond the numbers — maybe the location
                is improving, the cosmetic value-add is obvious,
                you&apos;re house-hacking and the &quot;rent&quot; you
                save changes the math. Don&apos;t buy on the numbers
                alone.
              </li>
              <li>
                <strong>Marginal / Negative</strong>: either bring the
                purchase price down materially, find better
                financing, or pass. Don&apos;t talk yourself into a
                Marginal deal because the property is interesting.
              </li>
            </ol>

            <h2>If you want the math behind the verdict</h2>
            <p>
              The underlying calculations come from{" "}
              <code>lib/calc-analysis.ts</code> — the single source of
              truth for cap rate, cash-on-cash, DSCR, and monthly cash
              flow across the entire site. Same engine drives the
              free analyzer, the saved-deal PDF, the share link, the
              dashboard, and the OG image. If you&apos;ve seen the
              number 6.4% as the cap rate in your TrueCap analysis,
              that&apos;s the same 6.4% the verdict engine reads.
            </p>
            <p>
              For deeper reading on the individual metrics, our
              guides on{" "}
              <Link href="/blog/cap-rate-vs-cash-on-cash-vs-dscr">
                cap rate vs cash-on-cash vs DSCR
              </Link>{" "}
              and{" "}
              <Link href="/blog/what-is-a-good-cap-rate">
                what is a good cap rate
              </Link>{" "}
              go into the &quot;what number is good?&quot; question
              one metric at a time.
            </p>

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

            <h2>See your verdict on a real deal</h2>
            <p>
              The fastest way to understand the verdict is to run
              one. TrueCap is free — paste an address, accept the
              auto-filled rent / rate / tax, type purchase price.
              You&apos;ll see the tier within seconds, with a
              one-paragraph rationale built from the exact thresholds
              described above.
            </p>
            <p className="not-prose">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-3 font-bold hover:opacity-90"
              >
                <Calculator className="w-4 h-4" />
                Get your verdict free
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
