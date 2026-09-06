/**
 * 3-way comparison blog post: DealCheck vs Stessa vs TrueCap.
 *
 * Captures the high-intent "X vs Y vs Z" search demand that
 * comparison-shoppers actively type when evaluating their rental
 * software stack. Honest positioning:
 *   - DealCheck = pre-purchase calculator (established competitor)
 *   - Stessa    = acquisition marketplace + underwriting + owned-property ops
 *   - TrueCap   = pre-purchase calculator (us, the newer entrant)
 *
 * Stessa's current acquisition workflow materially overlaps with DealCheck and
 * TrueCap, so the article compares that overlap before explaining Stessa's
 * broader accounting and landlord-operations scope.
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

const SLUG = "dealcheck-vs-stessa-vs-truecap";
const TITLE = "DealCheck vs Stessa vs TrueCap: which one do you actually need?";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "DealCheck vs Stessa vs TrueCap (2026)";
const DESCRIPTION =
  "A dated comparison of DealCheck, Stessa, and TrueCap. All three support acquisition analysis; Stessa also spans listing discovery and owned-property operations.";
const PUBLISHED_AT = "2026-06-07";
const MODIFIED_AT: string = "2026-08-27";
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
    a: "DealCheck and TrueCap are focused per-deal acquisition analyzers. Stessa now overlaps during acquisition with an investment-property marketplace, buy boxes, comps, and editable underwriting, then continues into accounting and landlord operations after closing.",
  },
  {
    q: "Do I need both DealCheck (or TrueCap) and Stessa?",
    a: "Not necessarily. Stessa may cover discovery, acquisition analysis, and ongoing operations for one workflow. Investors who prefer the dedicated decision features in DealCheck or TrueCap may still pair one with Stessa for accounting, but the pairing is optional.",
  },
  {
    q: "Is TrueCap a DealCheck alternative?",
    a: "Yes. Both are per-deal underwriting calculators with cap rate, cash-on-cash, DSCR, and cash flow analysis. TrueCap provides no-account preliminary screens with Buy Box fit, a Deal score, and editable labeled starting assumptions. DealCheck Starter includes its core calculators and reports subject to its published limits. DealCheck has native iOS/Android apps; TrueCap is an installable PWA.",
  },
  {
    q: "Is Stessa free?",
    a: "Stessa currently lists Essentials as its free plan, with Manage and Pro as paid plans. Features, prices, and billing terms can change, so confirm them on Stessa's official pricing page.",
  },
  {
    q: "What's the cheapest stack for a serious rental investor?",
    a: "Stessa publishes a public returns calculator and a free Essentials plan for basic owned-property accounting. TrueCap also publishes a free core analyzer. Compare each workflow's current access and feature depth before choosing a free stack.",
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
              {MODIFIED_AT !== PUBLISHED_AT && ` · Updated ${MODIFIED_AT}`}
            </p>
            <p className="mt-2 text-xs font-semibold text-foreground/75">
              Competitor facts reviewed August 27, 2026 against the official
              sources linked below.
            </p>
          </header>

          {/* TL;DR */}
          <section className="mb-10 rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-primary mb-3">
              TL;DR
            </h2>
            <p className="text-sm sm:text-base leading-relaxed text-foreground">
              All three now overlap during acquisition.{" "}
              <strong>DealCheck</strong> and <strong>TrueCap</strong> are
              focused per-deal analyzers.
              <strong> Stessa</strong> adds a marketplace with investor filters,
              buy-box alerts, comps, and editable underwriting, then continues
              into accounting and landlord operations. The useful question is
              how much discovery, decision depth, and post-close workflow you
              want in one product—not a simple before-versus-after split.
            </p>
          </section>

          <div className="prose prose-neutral max-w-none prose-headings:font-extrabold prose-headings:text-foreground prose-p:text-foreground prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-li:text-foreground prose-li:leading-relaxed">
            <h2>The three tools, in one sentence each</h2>
            <p>
              Before getting into pricing or feature matrices, get the
              positioning right. These products overlap in places, but their
              scope and center of gravity differ.
            </p>
            <ul>
              <li>
                <strong>DealCheck</strong> is a per-deal rental underwriting
                calculator. Inputs: purchase price, rent, financing, expenses.
                Outputs: cap rate, cash-on-cash, DSCR, monthly cash flow,
                10-year pro-forma.
              </li>
              <li>
                <strong>TrueCap</strong> is the same kind of tool — a per-deal
                rental underwriting calculator — built newer with unlimited free
                core analyses, editable screening assumptions, Buy Box
                fit, and a Deal score.
              </li>
              <li>
                <strong>Stessa</strong> is a property accounting and operations
                platform with a current acquisition marketplace. Before closing
                it offers listing filters, buy boxes, comps, projected returns,
                and editable offer/financing/rent/expense inputs. After closing
                it adds bank feeds, rent collection, documents, financial
                reports, and plan-dependent Schedule E.
              </li>
            </ul>
            <p>Compare the workflow in three questions:</p>
            <ol>
              <li>
                <strong>Do you need listing discovery?</strong> Stessa includes
                an investor marketplace; DealCheck and TrueCap primarily analyze
                properties you bring.
              </li>
              <li>
                <strong>Which acquisition decision workflow fits?</strong>{" "}
                Compare each tool&apos;s inputs, targets, scenarios, reports,
                and limits on the current product—not its historical category.
              </li>
              <li>
                <strong>
                  Do you want post-purchase operations in the same system?
                </strong>{" "}
                Stessa extends into accounting and landlord operations;
                DealCheck and TrueCap stay focused on acquisition analysis.
              </li>
            </ol>

            <h2>DealCheck vs TrueCap: the focused-analyzer head-to-head</h2>
            <p>
              These are the two focused per-deal analyzers. Both take a property
              address + your inputs and return the standard underwriting
              metrics. Both have free and paid tiers. The differences come down
              to free tier depth, pricing structure, and a few feature emphases.
            </p>

            <h3>Free tier</h3>
            <p>
              <strong>TrueCap free</strong> gives you the full underwriting
              engine — cap rate, CoC, DSCR, NCF, monthly cash flow — on every
              analysis, with no monthly limit and no signup wall. Address
              auto-fill starts with a HUD area rent benchmark and a FRED
              owner-occupied 30-year rate benchmark. Property tax remains a
              manual local input; if left blank, the screen discloses a generic
              1.1% purchase-price fallback rather than a state or parcel
              estimate.
            </p>
            <p>
              <strong>DealCheck Starter</strong> includes its core rental,
              BRRRR, Airbnb, and flip calculators plus professional interactive
              and PDF reports. Its free plan allows up to 15 saved properties
              and applies published limits to items such as photos, comps, and
              templates. An account is required.
            </p>

            <h3>Pricing</h3>
            <p>
              <strong>TrueCap</strong> offers a free core analyzer and paid Pro
              plans. A free signed-in account can create read-only share links
              and includes one sale and rent comps lookup; Pro includes 50 comps
              lookups per month plus 10-year cash-flow and equity projections,
              sensitivity, an Offer Ceiling, and saved-deal comparison. PDF
              export is included with Pro. See the live pricing page for current
              rates and limits.
            </p>
            <p>
              <strong>DealCheck</strong> currently offers Starter, Plus, and Pro
              plans. Its core calculators and professional reports are included
              on Starter; paid plans raise published limits for saved
              properties, photos, comps, and templates.
            </p>
            <p>
              Pricing and plan terms can change. Verify the current details on
              the official{" "}
              <a
                href="https://dealcheck.io/pricing/"
                target="_blank"
                rel="noreferrer"
              >
                DealCheck pricing page
              </a>
              ,{" "}
              <a
                href="https://www.stessa.com/pricing/"
                target="_blank"
                rel="noreferrer"
              >
                Stessa pricing page
              </a>
              , and{" "}
              <a
                href="https://usetruecap.com/pricing"
                target="_blank"
                rel="noreferrer"
              >
                TrueCap pricing page
              </a>
              .
            </p>

            <h3>What each does better</h3>
            <ul>
              <li>
                <strong>TrueCap</strong>: unlimited no-signup core analyses,
                Buy Box fit, portfolio
                rollup across saved deals, pre-tax operating cash flow and
                loan-coverage screening, sensitivity grid (rent ±10%, vacancy
                ±5pp, rate ±1pp), Offer Ceiling, Deal
                score (0-100) with subscore breakdown, address auto-fill via
                authoritative open data sources you can audit.
              </li>
              <li>
                <strong>DealCheck</strong>: native iOS and Android apps (TrueCap
                is a PWA), direct property-import from Zillow / Redfin / MLS
                listings, longer track record in the BRRRR community, broader
                brand recognition.
              </li>
            </ul>

            <p>
              For investors who prioritize unlimited no-signup core analyses,
              editable screening assumptions, and a Buy Box fit and
              Deal score, TrueCap may be the better fit.{" "}
              <Link href="/vs/dealcheck">
                The full TrueCap vs DealCheck comparison page
              </Link>{" "}
              has the row-by-row feature matrix if you want to dig deeper.
            </p>

            <h2>Where Stessa overlaps—and where its scope goes further</h2>
            <p>
              Stessa&apos;s official marketplace now helps investors find,
              evaluate, and act on listings. It documents investor filters,
              buy-box alerts, projected rent, rental and sale comps,
              neighborhood metrics, and a calculator with editable offer price,
              financing, rent, and operating costs. The calculator reports
              projected cash flow, cap rate, and ROI; Stessa also publishes a
              separate returns calculator with NOI, cash-on-cash, DSCR,
              depreciation, and after-tax outputs.
            </p>
            <p>
              That is real acquisition underwriting, not a post-purchase-only
              product. Stessa&apos;s broader distinction is that the same brand
              also serves owned-property accounting and landlord operations. Its
              current pricing lists bank feeds, reports, document storage, rent
              collection, maintenance, screening, and plan-dependent Schedule E
              and eSignatures.
            </p>
            <ul>
              <li>
                <strong>Evaluate Stessa for</strong>: discovering listings,
                screening opportunities with its data and assumptions, and
                carrying acquired properties into accounting and operations.
              </li>
              <li>
                <strong>Evaluate TrueCap or DealCheck for</strong>: a dedicated
                per-deal decision workflow when its target logic, scenarios,
                reports, or usage model better matches how you underwrite.
              </li>
            </ul>
            <p>
              A two-tool stack remains reasonable, but it is not mandatory. If
              you already use Stessa, test its marketplace underwrite before
              assuming you need a second calculator. If you prefer TrueCap or
              DealCheck for acquisition, Stessa can still become the system for
              actuals after closing.
            </p>
            <p>
              The <Link href="/vs/stessa">TrueCap vs Stessa comparison</Link>{" "}
              page has the dated, source-linked feature matrix.
            </p>
            <p>
              Primary Stessa sources reviewed August 27, 2026: the official{" "}
              <a
                href="https://www.stessa.com/investment-property-marketplace/"
                target="_blank"
                rel="noreferrer"
              >
                Investment Property Marketplace
              </a>
              ,{" "}
              <a
                href="https://support.stessa.com/en/articles/10779191-stessa-investment-properties-marketplace"
                target="_blank"
                rel="noreferrer"
              >
                marketplace help article
              </a>
              ,{" "}
              <a
                href="https://support.stessa.com/en/articles/11146447-investment-property-metrics-faq"
                target="_blank"
                rel="noreferrer"
              >
                investment metrics FAQ
              </a>
              ,{" "}
              <a
                href="https://www.stessa.com/rental-returns-and-income-tax-calculator/"
                target="_blank"
                rel="noreferrer"
              >
                returns and income-tax calculator
              </a>
              , and{" "}
              <a
                href="https://www.stessa.com/pricing/"
                target="_blank"
                rel="noreferrer"
              >
                pricing page
              </a>
              .
            </p>

            <h2>A low-cost starting stack</h2>
            <p>
              If you&apos;re cost-conscious and own 1-3 rentals, this stack can
              start without a paid subscription:
            </p>
            <ul>
              <li>
                <strong>TrueCap free</strong>: unlimited underwriting, cap rate
                / CoC / DSCR / cash flow on every deal.
              </li>
              <li>
                <strong>Stessa Essentials</strong>: the current free plan lists
                unlimited properties, automatic bank feeds, and basic financial
                reports. Current pricing places Schedule E on Manage and Pro.
              </li>
            </ul>
            <p>
              Creating a new TrueCap read-only share link remains free but
              requires sign-in; anyone who receives the link can view it without
              an account. If you need 10-year cash-flow and equity projections,
              sensitivity, more comps, or saved-deal comparison, compare the
              current Pro plans. PDF reports are included with Pro. If you need
              more from Stessa, compare its current Manage and Pro plans as
              well.
            </p>
            <p>
              DealCheck Starter includes the core calculators and professional
              reports; its paid Plus and Pro plans mainly raise published usage
              limits. You may still pair it with an accounting platform if you
              want post-purchase bookkeeping.
            </p>

            <h2>Quick decision matrix</h2>
            <p>If you&apos;re just trying to pick:</p>
            <ul>
              <li>
                <strong>
                  &quot;I want to underwrite my first rental this week.&quot;
                </strong>{" "}
                Compare a focused analyzer such as TrueCap or DealCheck with
                Stessa&apos;s current marketplace underwrite.
              </li>
              <li>
                <strong>
                  &quot;I&apos;m comparison-shopping calculators and care about
                  mobile.&quot;
                </strong>{" "}
                DealCheck if you need native iOS / Android apps; TrueCap PWA if
                you&apos;re fine installing from the browser.
              </li>
              <li>
                <strong>
                  &quot;I want unlimited core analyses without signup.&quot;
                </strong>{" "}
                TrueCap is designed for that workflow.
              </li>
              <li>
                <strong>
                  &quot;I want to know if it fits my targets, not just the metrics.&quot;
                </strong>{" "}
                TrueCap shows Buy Box fit with a Deal score
                breakdown.
              </li>
              <li>
                <strong>
                  &quot;I own 5+ rentals and want clean Schedule E reporting at
                  tax time.&quot;
                </strong>{" "}
                Consider Stessa. Pairing it with TrueCap or DealCheck for the
                next acquisition is optional and depends on the decision
                workflow you need.
              </li>
              <li>
                <strong>&quot;I want everything in one tool.&quot;</strong>{" "}
                Stessa is the broadest of these three across discovery,
                acquisition, and operations. Compare its acquisition depth with
                the dedicated workflows in DealCheck and TrueCap.
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
              The easiest way to figure out which calculator you like is to run
              one of your real deals through it. TrueCap starts from an address.
              Review the imported facts and starting assumptions, enter the
              property values that are still missing, and you&apos;ll see the
              modeled underwrite.
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
