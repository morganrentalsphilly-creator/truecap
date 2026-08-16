/**
 * 3-way comparison blog post: DealCheck vs Stessa vs TrueCap.
 *
 * Captures the high-intent "X vs Y vs Z" search demand that
 * comparison-shoppers actively type when evaluating their rental
 * software stack. Honest positioning:
 *   - DealCheck = pre-purchase calculator (established competitor)
 *   - Stessa    = post-purchase accounting + ops
 *   - TrueCap   = pre-purchase calculator (us, the newer entrant)
 *
 * The article frames TrueCap as the modern alternative to DealCheck
 * and explicitly recommends Stessa for post-purchase ops — that's
 * honest, and lets us own the "DealCheck vs Stessa" search without
 * pretending we cover both jobs.
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

const SLUG = "dealcheck-vs-stessa-vs-truecap";
const TITLE = "DealCheck vs Stessa vs TrueCap: which one do you actually need?";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "DealCheck vs Stessa vs TrueCap (2026)";
const DESCRIPTION =
  "An honest 3-way comparison of DealCheck, Stessa, and TrueCap. Different tools for different stages — pre-purchase underwriting vs post-purchase ops — with concrete recommendations.";
const PUBLISHED_AT = "2026-06-07";
const MODIFIED_AT: string = "2026-08-16";
const READING_TIME_MIN = 11;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "dealcheck vs stessa",
    "dealcheck vs truecap",
    "stessa vs truecap",
    "best rental property software",
    "rental property analyzer comparison",
    "real estate software stack",
    "rental property tools",
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
    q: "What's the difference between DealCheck, Stessa, and TrueCap?",
    a: "DealCheck and TrueCap are pre-purchase underwriting calculators — you use them to decide if a deal is worth buying. Stessa is a post-purchase accounting and operations platform — you use it after closing to track income, expenses, and Schedule E for tax time. DealCheck and TrueCap are alternatives to each other; Stessa is complementary to both.",
  },
  {
    q: "Do I need both DealCheck (or TrueCap) and Stessa?",
    a: "It depends on your workflow. DealCheck and TrueCap help evaluate a potential purchase; Stessa focuses on accounting and operations after purchase. Investors who want both acquisition analysis and ongoing bookkeeping may use one underwriting tool alongside Stessa.",
  },
  {
    q: "Is TrueCap a DealCheck alternative?",
    a: "Yes. Both are per-deal underwriting calculators with cap rate, cash-on-cash, DSCR, and cash flow analysis. TrueCap's free core analyzer supports unlimited analyses without signup, with plain-English verdicts and editable starting assumptions from HUD, FRED, and a state effective property-tax estimate. DealCheck Starter includes its core calculators and professional reports, subject to published usage limits. DealCheck has native iOS/Android apps; TrueCap is an installable PWA.",
  },
  {
    q: "Is Stessa free?",
    a: "Stessa currently lists Essentials as its free plan, with Manage and Pro as paid plans. Features, prices, and billing terms can change, so confirm them on Stessa's official pricing page.",
  },
  {
    q: "What's the cheapest stack for a serious rental investor?",
    a: "TrueCap's free core analyzer plus Stessa Essentials can cover basic pre-purchase analysis and post-purchase accounting without a paid subscription. If you need advanced features, compare the current TrueCap Pro and Stessa Manage or Pro terms on their official pricing pages.",
  },
];

export default function DealCheckVsStessaVsTrueCapPost() {
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
              {MODIFIED_AT !== PUBLISHED_AT && ` · Updated ${MODIFIED_AT}`}
            </p>
          </header>

          {/* TL;DR */}
          <section className="mb-10 rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-primary mb-3">
              TL;DR
            </h2>
            <p className="text-sm sm:text-base leading-relaxed text-foreground">
              They&apos;re not really competitors of each other.{" "}
              <strong>DealCheck</strong> and <strong>TrueCap</strong> are
              both pre-purchase underwriting calculators — you use them to
              decide if a deal is worth buying. <strong>Stessa</strong> is
              post-purchase accounting + operations — you use it after
              closing to track income, expenses, and produce a
              Schedule E. So the real question isn&apos;t three-way; it&apos;s{" "}
              <em>which underwriting tool (DealCheck or TrueCap)</em> plus{" "}
              <em>do you want Stessa for accounting (probably yes)</em>.
              We&apos;ll explain how to choose between DealCheck and
              TrueCap, where Stessa fits, and the cheapest stack that
              actually works.
            </p>
          </section>

          <div className="prose prose-neutral max-w-none prose-headings:font-extrabold prose-headings:text-foreground prose-p:text-foreground prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-li:text-foreground prose-li:leading-relaxed">
            <h2>The three tools, in one sentence each</h2>
            <p>
              Before getting into pricing or feature matrices, get the
              positioning right. These products overlap in places, but
              they are not all designed for the same stage of ownership.
            </p>
            <ul>
              <li>
                <strong>DealCheck</strong> is a per-deal rental
                underwriting calculator. Inputs: purchase price, rent,
                financing, expenses. Outputs: cap rate, cash-on-cash,
                DSCR, monthly cash flow, 10-year pro-forma.
              </li>
              <li>
                <strong>TrueCap</strong> is the same kind of tool — a
                per-deal rental underwriting calculator — built newer
                with unlimited free core analyses, editable screening
                assumptions, and a plain-English verdict engine.
              </li>
              <li>
                <strong>Stessa</strong> is a property accounting and
                operations platform. Inputs: bank feeds, expenses,
                rent payments. Outputs: profit-and-loss reports,
                document storage, Schedule E for taxes. <em>You set it
                up after you own the property</em>, not before.
              </li>
            </ul>
            <p>
              So the real decision tree is two questions, not three:
            </p>
            <ol>
              <li>
                <strong>Which underwriting calculator?</strong> DealCheck
                or TrueCap. Pick one.
              </li>
              <li>
                <strong>Do you want post-purchase accounting?</strong>{" "}
                Stessa is the answer if yes. If you own one rental and
                use a CPA at tax time, you might skip it. If you own
                two or more, Stessa earns its place.
              </li>
            </ol>

            <h2>DealCheck vs TrueCap: the actual head-to-head</h2>
            <p>
              These are the two that compete. Both are calculators that
              take a property address + your inputs and return the
              standard underwriting metrics. Both have free and paid
              tiers. The differences come down to free tier depth,
              pricing structure, and a few feature emphases.
            </p>

            <h3>Free tier</h3>
            <p>
              <strong>TrueCap free</strong> gives you the full
              underwriting engine — cap rate, CoC, DSCR, NCF, monthly
              cash flow — on every analysis, with no monthly limit and
              no signup wall. Address auto-fill starts with a HUD area
              rent benchmark, a FRED owner-occupied 30-year rate
              benchmark, and a state effective property-tax estimate.
            </p>
            <p>
              <strong>DealCheck Starter</strong> includes its core rental,
              BRRRR, Airbnb, and flip calculators plus professional
              interactive and PDF reports. Its free plan allows up to 15
              saved properties and applies published limits to items such
              as photos, comps, and templates. An account is required.
            </p>

            <h3>Pricing</h3>
            <p>
              <strong>TrueCap</strong> offers a free core analyzer and paid
              Pro plans. Free includes read-only share links and one sale
              and rent comps lookup; Pro includes 50 comps lookups per
              month plus 10-year projections, illustrative tax impact,
              sensitivity, MAO, and dedicated BRRRR and fix-and-flip
              analyzers. A PDF is available as a one-time purchase or with
              Pro. See the live pricing page for current rates and limits.
            </p>
            <p>
              <strong>DealCheck</strong> currently offers Starter, Plus,
              and Pro plans. Its core calculators and professional reports
              are included on Starter; paid plans raise published limits
              for saved properties, photos, comps, and templates.
            </p>
            <p>
              Pricing and plan terms can change. Verify the current details
              on the official{" "}
              <a href="https://dealcheck.io/pricing/" target="_blank" rel="noreferrer">
                DealCheck pricing page
              </a>
              ,{" "}
              <a href="https://www.stessa.com/pricing/" target="_blank" rel="noreferrer">
                Stessa pricing page
              </a>
              , and{" "}
              <a href="https://usetruecap.com/pricing" target="_blank" rel="noreferrer">
                TrueCap pricing page
              </a>
              .
            </p>

            <h3>What each does better</h3>
            <ul>
              <li>
                <strong>TrueCap</strong>: unlimited no-signup core analyses, plain-English
                verdict (Strong / Solid / Mixed / Marginal / Negative),
                portfolio rollup across saved deals, illustrative tax-impact
                modeling with depreciation and estimated after-tax
                cash flow, sensitivity grid (rent ±10%, vacancy ±5pp,
                rate ±1pp), max allowable offer solver, Deal Score
                (0-100) with subscore breakdown, address auto-fill via
                authoritative open data sources you can audit.
              </li>
              <li>
                <strong>DealCheck</strong>: native iOS and Android
                apps (TrueCap is a PWA), direct property-import from
                Zillow / Redfin / MLS listings, longer track record in
                the BRRRR community, broader brand recognition.
              </li>
            </ul>

            <p>
              For investors who prioritize unlimited no-signup core
              analyses, editable screening assumptions, and a
              plain-English verdict, TrueCap may be the better fit.{" "}
              <Link href="/vs/dealcheck">
                The full TrueCap vs DealCheck comparison page
              </Link>{" "}
              has the row-by-row feature matrix if you want to dig
              deeper.
            </p>

            <h2>Where Stessa fits (and where it doesn&apos;t)</h2>
            <p>
              Stessa is unambiguously a different category. They&apos;ve
              built a great free-tier accounting platform tailored to
              rental property owners — bank-feed connection, expense
              categorization, P&amp;L reports, document storage for
              leases and receipts, and the data structure that makes
              Schedule E painless at tax time.
            </p>
            <p>
              Stessa is primarily designed for property accounting and
              operations after purchase, rather than the same acquisition-
              underwriting workflow offered by TrueCap and DealCheck.
            </p>
            <p>
              So:
            </p>
            <ul>
              <li>
                <strong>Use Stessa for</strong>: tracking the actual
                financial performance of properties you own. Bank
                feeds, expense categorization, multi-property
                dashboards, Schedule E at tax time.
              </li>
              <li>
                <strong>Don&apos;t use Stessa for</strong>: deciding
                whether to buy a new property. That&apos;s
                underwriting&apos;s job, and TrueCap or DealCheck do
                it.
              </li>
            </ul>
            <p>
              For investors who want both workflows,{" "}
              <strong>TrueCap (or DealCheck) + Stessa</strong> is the
              complementary two-tool approach:
            </p>
            <ul>
              <li>
                <strong>Pre-purchase</strong>: TrueCap / DealCheck —
                underwrite the deal.
              </li>
              <li>
                <strong>Closing day</strong>: nothing — both tools
                hand off cleanly.
              </li>
              <li>
                <strong>Post-purchase</strong>: Stessa — track actuals,
                generate Schedule E, organize documents.
              </li>
            </ul>
            <p>
              The{" "}
              <Link href="/vs/stessa">TrueCap vs Stessa comparison</Link>{" "}
              page goes deeper on the boundaries.
            </p>

            <h2>A low-cost starting stack</h2>
            <p>
              If you&apos;re cost-conscious and own 1-3 rentals, this
              stack can start without a paid subscription:
            </p>
            <ul>
              <li>
                <strong>TrueCap free</strong>: unlimited underwriting,
                cap rate / CoC / DSCR / cash flow on every deal.
              </li>
              <li>
                <strong>Stessa free</strong>: bank-feed accounting on
                unlimited properties, basic dashboards, Schedule E
                export.
              </li>
            </ul>
            <p>
              TrueCap&apos;s read-only share links remain free. If you need
              10-year projections, sensitivity, illustrative tax impact,
              more comps, or the dedicated BRRRR and flip workflows,
              compare the current Pro plans. PDF reports are available as
              a one-time purchase or with Pro. If you need more from
              Stessa, compare its current Manage and Pro plans as well.
            </p>
            <p>
              DealCheck Starter includes the core calculators and
              professional reports; its paid Plus and Pro plans mainly
              raise published usage limits. You may still pair it with an
              accounting platform if you want post-purchase bookkeeping.
            </p>

            <h2>Quick decision matrix</h2>
            <p>
              If you&apos;re just trying to pick:
            </p>
            <ul>
              <li>
                <strong>&quot;I want to underwrite my first rental
                this week.&quot;</strong> Use TrueCap free. Add Stessa
                free after you close.
              </li>
              <li>
                <strong>&quot;I&apos;m comparison-shopping calculators
                and care about mobile.&quot;</strong> DealCheck if you
                need native iOS / Android apps; TrueCap PWA if
                you&apos;re fine installing from the browser.
              </li>
              <li>
                <strong>&quot;I want unlimited core analyses without
                signup.&quot;</strong> TrueCap is designed for that workflow.
              </li>
              <li>
                <strong>&quot;I want a plain-English verdict, not just
                metrics.&quot;</strong> TrueCap — Strong / Solid /
                Mixed / Marginal / Negative tier with a Deal Score
                breakdown.
              </li>
              <li>
                <strong>&quot;I own 5+ rentals and want clean
                Schedule E reporting at tax time.&quot;</strong>{" "}
                Consider Stessa, then pair it with TrueCap or DealCheck
                when evaluating the next acquisition.
              </li>
              <li>
                <strong>&quot;I want everything in one tool.&quot;</strong>{" "}
                Compare the acquisition-analysis and post-purchase
                accounting depth carefully; these products specialize in
                different stages of the workflow.
              </li>
            </ul>

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

            <h2>Run a deal in TrueCap free</h2>
            <p>
              The easiest way to figure out which calculator you like
              is to run one of your real deals through it. TrueCap
              takes about 60 seconds — paste the address, accept the
              auto-filled rent / rate / tax, type purchase price, and
              you&apos;ll see a full underwrite with a plain-English
              verdict.
            </p>
            <p className="not-prose">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-3 font-bold hover:opacity-90"
              >
                <Calculator className="w-4 h-4" />
                Try TrueCap free
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
