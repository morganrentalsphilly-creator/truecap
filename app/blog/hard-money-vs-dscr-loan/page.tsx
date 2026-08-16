/**
 * Strategy blog post — Hard money vs DSCR loan comparison.
 *
 * Targets high-intent queries:
 *   - "hard money vs dscr"
 *   - "dscr vs hard money"
 *   - "hard money loan vs dscr loan"
 *   - "which loan for brrrr"
 *   - "fix and flip loan"
 *   - "rental property loan options"
 *   - "non-qm investor loans"
 *   - "bridge loan vs dscr"
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

const SLUG = "hard-money-vs-dscr-loan";
const TITLE = "Hard money vs DSCR: which loan product is right for your next deal in 2026";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Hard money vs DSCR loan: which to use in 2026";
const DESCRIPTION =
  "Hard money and DSCR loans can solve different investor-financing problems. Compare their structures through an illustrative BRRRR sequence, then verify current written terms with each lender.";
const PUBLISHED_AT = "2026-06-07";
const MODIFIED_AT = "2026-08-15";
const READING_TIME_MIN = 11;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "hard money vs dscr",
    "dscr vs hard money",
    "hard money loan vs dscr loan",
    "which loan for brrrr",
    "fix and flip loan",
    "rental property loan options",
    "non-qm investor loans",
    "bridge loan vs dscr",
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

const FAQS: { q: string; a: string }[] = [
  {
    q: "What's the core difference between hard money and DSCR?",
    a: "Time horizon and underwriting emphasis. Hard-money programs often use shorter bridge terms and emphasize collateral, rehab scope, experience, and exit risk. Many DSCR programs are designed for stabilized rentals and emphasize property coverage alongside borrower, credit, reserve, appraisal, insurance, and entity requirements. Neither label determines approval or terms; compare the current written program guides for your file.",
  },
  {
    q: "Which loan should I use for a BRRRR deal?",
    a: "A bridge-to-rental sequence is one possible BRRRR structure, not a guaranteed exit. Ask prospective acquisition and refinance lenders for current written terms covering property condition, rent evidence, appraisal, seasoning, reserves, borrower and entity requirements, fees, and maturity. Model a delayed or unavailable refinance before closing.",
  },
  {
    q: "Which is more expensive?",
    a: "Neither product has one universal price. A bridge quote may carry a higher short-term rate, points, draw fees, minimum-interest provisions, and extension fees; a DSCR quote may carry long-term interest, points, and a prepayment charge. Compare lender worksheets over the period you expect to hold each loan. The dollar examples below are illustrations, not current market quotes.",
  },
  {
    q: "Can I use a DSCR loan as my exit on a fix-and-flip?",
    a: "Potentially, if the property will be held as a qualifying rental and the file satisfies a specific DSCR program. A planned sale may conflict with program purpose or make points and any prepayment charge uneconomic. Ask the lender to confirm occupancy, property-condition, prepayment, and exit-plan rules in writing before treating a DSCR refinance as an exit.",
  },
  {
    q: "How fast can each one close?",
    a: "There is no universal closing timeline. Some bridge lenders are built for faster execution, while a DSCR file may require appraisal, title, insurance, lease or rent evidence, and additional underwriting. Ask each lender for a file-specific estimate, required-document list, appraisal timing, and conditions that could delay closing; do not make the contract deadline depend on an advertised turnaround.",
  },
  {
    q: "What credit score do I need for each?",
    a: "There is no single minimum for either category. Credit floors and pricing tiers vary by lender, leverage, property, experience, reserves, recourse, and other borrower factors; even collateral-focused bridge programs may review credit and guarantors. Have lenders run your actual profile and return written terms rather than relying on a generic score threshold.",
  },
  {
    q: "Should I ever use hard money for a long-term hold?",
    a: "Short-term bridge debt can be a poor long-term hold structure because carrying, maturity, and extension risk can compound. If you plan to refinance after rehab, obtain current written exit assumptions from prospective lenders and stress-test a delayed, smaller, or unavailable refinance. A preliminary quote or modeled DSCR does not guarantee the later appraisal, rent treatment, loan amount, or approval.",
  },
];

export default function BlogPost() {
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/blog/${SLUG}`;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${canonicalUrl}#article`,
    headline: TITLE,
    description: DESCRIPTION,
    datePublished: PUBLISHED_AT,
    dateModified: MODIFIED_AT,
    author: { "@type": "Person", name: "Morgan Page", url: siteUrl },
    publisher: { "@id": `${siteUrl}/#organization` },
    mainEntityOfPage: canonicalUrl,
    image: [`${siteUrl}/home.jpg`],
    inLanguage: "en-US",
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
        <header className="mb-8 sm:mb-10">
          <Link href="/blog" className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground">
            ← TrueCap Blog
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-2 leading-tight text-balance">
            {TITLE}
          </h1>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold mt-3">
            {new Date(PUBLISHED_AT).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}{" "}
            · {READING_TIME_MIN} min read
          </p>
          <p className="text-base sm:text-lg text-muted-foreground mt-4 leading-relaxed">
            Hard money and DSCR loans solve different problems. Hard money
            is short-term capital for a deal you&apos;ll rehab and exit;
            DSCR is long-term capital for a rental you&apos;ll hold.
            A mismatched structure can add material carrying cost, fees, and
            delay. Here&apos;s how to compare current written options.
          </p>
        </header>

        <article className="prose prose-slate max-w-none [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground [&_li]:leading-relaxed [&_strong]:text-foreground">
          <p>
            Conventional financing may not fit a particular investor deal
            because of property condition, borrower documentation, entity,
            timing, or program limits. Bridge and DSCR products address
            different constraints, and a mismatched structure can add
            material interest, fees, maturity risk, or prepayment cost.
          </p>
          <p>
            Hard money and DSCR aren&apos;t alternatives. They&apos;re
            automatically interchangeable. Some investors use a bridge loan
            to acquire and rehab, then pursue DSCR or another long-term
            refinance after stabilization; that exit remains conditional.
            This post walks through how each works, when each makes sense,
            and the BRRRR-specific sequencing that ties them together.
          </p>

          <h2 className="text-2xl sm:text-3xl">What hard money actually is</h2>
          <p>
            Hard money is short-term, asset-collateralized capital. The
            lender may be a private fund or individual placing substantial
            weight on the <em>deal</em>, while still reviewing borrower,
            guarantor, experience, liquidity, and compliance factors. A file
            may include:
          </p>
          <ul>
            <li><strong>Purchase price</strong> and <strong>ARV</strong>
              (after-repair value, the value of the property post-rehab).</li>
            <li><strong>Rehab budget</strong> and your contractor&apos;s
              scope.</li>
            <li><strong>Exit plan</strong> — flip-and-sell or
              refi-and-hold — with a credible timeline.</li>
            <li><strong>Your experience</strong> — how many similar deals
              you&apos;ve completed.</li>
          </ul>
          <p>
            Illustrative bridge assumptions used in the worked example below
            — not current market terms or an approval promise:
          </p>
          <ul>
            <li><strong>Modeled rate:</strong> 11% interest-only.</li>
            <li><strong>Modeled origination:</strong> 2 points.</li>
            <li><strong>Modeled term:</strong> 12 months.</li>
            <li><strong>Modeled advance:</strong> 75% of purchase price.</li>
            <li><strong>Rehab funding:</strong> assumed borrower-funded here;
              actual draw, inspection, reimbursement, and holdback rules vary.</li>
          </ul>
          <p>
            Verify rate, points, leverage definitions, required cash, draw
            mechanics, fees, extension rights, recourse, and maturity in a
            current written lender quote.
          </p>

          <h2 className="text-2xl sm:text-3xl">What DSCR actually is</h2>
          <p>
            <Link href="/blog/dscr-loans-explained" className="text-primary font-semibold hover:underline">DSCR</Link> (Debt Service Coverage Ratio) loans are long-term,
            cash-flow-underwritten investment property mortgages. The
            property&apos;s rental coverage is the primary ratio under many
            programs, rather than personal DTI. The lender still reviews
            credit, reserves, borrower or guarantor documents, appraisal,
            insurance, and program eligibility; requirements vary.
          </p>
          <p>Common structures to verify in a current written quote:</p>
          <ul>
            <li><strong>Rate and points:</strong> quote-specific and often higher than comparable conventional financing.</li>
            <li><strong>Term:</strong> long-term amortization is common, but fixed and adjustable structures vary.</li>
            <li><strong>LTV and equity:</strong> matrix-specific; cash-out is often more constrained than a purchase.</li>
            <li><strong>DSCR minimum:</strong> defined by the program&apos;s rent and payment methodology.</li>
            <li><strong>Prepayment penalty:</strong> may apply and must be reviewed for amount, duration, exceptions, and state eligibility.</li>
          </ul>

          <h2 className="text-2xl sm:text-3xl">Side-by-side comparison</h2>
          <div className="not-prose overflow-x-auto rounded-xl border border-border bg-card my-6">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left p-3 font-bold text-foreground">Dimension</th>
                  <th className="text-left p-3 font-bold text-foreground">Hard money</th>
                  <th className="text-left p-3 font-bold text-foreground">DSCR loan</th>
                </tr>
              </thead>
              <tbody className="[&_td]:p-3 [&_td]:border-b [&_td]:border-border [&_tr:last-child_td]:border-0">
                <tr><td className="text-muted-foreground">Purpose</td><td>Short-term capital for acquire + rehab</td><td>Long-term capital for stabilized rental</td></tr>
                <tr><td className="text-muted-foreground">Term</td><td>Often shorter bridge maturity; quote-specific</td><td>Longer amortizing structures may be available; program-specific</td></tr>
                <tr><td className="text-muted-foreground">Rate</td><td>Quote-specific; generally priced for short-term risk</td><td>Quote-specific; often above comparable conventional</td></tr>
                <tr><td className="text-muted-foreground">Points / fees</td><td>Quote-specific; compare all lender and draw fees</td><td>Quote-specific; compare points and prepayment terms</td></tr>
                <tr><td className="text-muted-foreground">Speed to close</td><td>File, appraisal/title, and lender-specific</td><td>File, appraisal/title, and lender-specific</td></tr>
                <tr><td className="text-muted-foreground">What&apos;s underwritten</td><td>Deal + rehab + exit + your experience</td><td>Property DSCR + your credit + reserves</td></tr>
                <tr><td className="text-muted-foreground">Leverage</td><td>Purchase-price, cost, and ARV definitions vary</td><td>Purchase/cash-out matrices and DSCR sizing vary</td></tr>
                <tr><td className="text-muted-foreground">Prepay / minimum interest</td><td>Review minimum-interest and extension provisions</td><td>Review charge, duration, exceptions, and state eligibility</td></tr>
                <tr><td className="text-muted-foreground">Credit</td><td>Program and pricing tier-specific</td><td>Program and pricing tier-specific</td></tr>
                <tr><td className="text-muted-foreground">Income docs</td><td>Program-specific; borrower and business documents may apply</td><td>Personal DTI often not primary; requirements vary</td></tr>
                <tr><td className="text-muted-foreground">Entity title</td><td>Often permitted with program conditions</td><td>Often permitted with program conditions and guaranties</td></tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl sm:text-3xl">The BRRRR sequencing playbook</h2>
          <p>
            BRRRR (Buy, Rehab, Rent, Refinance, Repeat) is the use case
            where these two products work together. Done right:
          </p>
          <ol>
            <li><strong>Acquire</strong> with hard money. The property is
              distressed and may not satisfy a particular conventional or
              DSCR program&apos;s current property-condition or rent-readiness
              rules.</li>
            <li><strong>Rehab</strong> on the modeled timeline. If the bridge
              includes rehab funds, follow its written draw and inspection
              process.</li>
            <li><strong>Rent</strong> the property at market rate. Document
              the lease and rent evidence a prospective refinance program
              requires.</li>
            <li><strong>Pursue a refinance</strong> after stabilization. A new
              appraisal, eligible rent, DSCR, borrower review, seasoning, and
              program matrix determine whether a DSCR or other long-term loan
              closes and how much cash, if any, comes back.</li>
            <li><strong>Repeat</strong> with the recycled capital.</li>
          </ol>

          <p>
            Illustrative worked example, not a quote, appraisal, or approval:
            $150K purchase, $50K rehab, $250K assumed ARV.
          </p>
          <ul>
            <li><strong>Hard money acquisition:</strong> 75% of $150K =
              $112.5K loan. You bring $37.5K + closing + rehab $50K =
              ~$92K cash in.</li>
            <li><strong>Rehab 4 months:</strong> ~$5K interest ($112.5K
              × 11% × 4/12) + 2 points origination = $7.25K total cost.</li>
            <li><strong>Refi to DSCR:</strong> 75% of $250K ARV = $187.5K
              new loan. Pays off $112.5K hard money + closing costs ~$5K
              = $70K modeled cash back, if that appraisal, leverage, and
              approval are actually available.</li>
            <li><strong>Net cash trapped after refi:</strong> $92K in
              − $70K out = $22K trapped. The scenario then models the property
              on a long-term DSCR loan.</li>
          </ul>
          <p>
            A DSCR acquisition may not fit when the property is not rent-ready
            or lacks acceptable rent evidence; program rules vary. Keeping
            short-maturity bridge debt for a long hold can also create serious
            carrying and extension risk. Verify both the acquisition and exit
            with lenders before closing.
          </p>

          <h2 className="text-2xl sm:text-3xl">The fix-and-flip case (compare bridge options)</h2>
          <p>
            If you&apos;re rehabbing to sell, a bridge loan is one possible
            acquisition structure and the planned sale proceeds would repay
            it. The actual financing stack, maturity, extension rights, and
            payoff conditions remain lender- and deal-specific.
          </p>
          <p>
            A DSCR refinance may be a poor match for a near-term sale. Program
            purpose, property condition, points, and any prepayment charge can
            overwhelm modeled savings; have the lender confirm those terms and
            the intended exit in writing.
          </p>

          <h2 className="text-2xl sm:text-3xl">The hold case (compare long-term options)</h2>
          <p>
            If you&apos;re buying a rent-ready property for a long-term hold,
            compare bridge debt with longer-term options before paying for a
            short-term structure. Possibilities include:
          </p>
          <ul>
            <li><strong>Conventional</strong> if the current program&apos;s
              borrower, financed-property, DTI, documentation, property, and
              occupancy rules fit the file.</li>
            <li><strong>DSCR</strong> as another program-specific option when
              property coverage is the primary ratio; borrower, credit,
              reserve, appraisal, entity, and other rules still apply.</li>
          </ul>

          <h2 className="text-2xl sm:text-3xl">The dangerous middle case</h2>
          <p>
            The case to watch for: buying a property that&apos;s habitable
            now but needs $20-40K of value-add rehab over 6-12 months.
            You could buy it conventionally and rehab from cash flow, you
            could buy it with hard money and refi after rehab, or you
            could try to do both (buy conventionally, then HELOC or
            cash-out refi for rehab).
          </p>
          <p>
            The trap: investors buy these with hard money &ldquo;to be
            safe&rdquo; and then discover their post-rehab ARV
            doesn&apos;t support a DSCR refi at the LTV they need. Now
            they&apos;re stuck carrying expensive short-term debt while they figure it
            out. Before using hard money, model the refi exit first — if
            the ARV, rent, and DSCR don&apos;t support the refi you need,
            the planned exit does not work at the leverage actually offered.
          </p>

          <div className="not-prose">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-bold hover:opacity-95 transition-opacity"
            >
              <Calculator className="w-4 h-4" />
              Model the deal with both financing structures
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          <p className="text-sm text-muted-foreground mt-6">
            Related reading: <Link href="/blog/dscr-loans-explained" className="text-primary font-semibold hover:underline">DSCR loans explained</Link>, <Link href="/blog/brrrr-method-explained" className="text-primary font-semibold hover:underline">BRRRR method explained</Link>, <Link href="/blog/how-to-refinance-a-rental-property" className="text-primary font-semibold hover:underline">How to refinance a rental property</Link>.
          </p>

          <p className="text-sm text-muted-foreground">
            General educational information, not a loan quote or approval.
            Rates, credit, leverage, appraisal, DSCR, reserves, documentation,
            seasoning, recourse, and timing vary by lender and file. Verify
            current written terms with both the acquisition and exit lenders.
          </p>

          <h2 className="text-2xl sm:text-3xl">FAQ</h2>
          {FAQS.map((f, i) => (
            <details key={i} className="not-prose bg-card border border-border rounded-xl p-4 sm:p-5 mb-3">
              <summary className="cursor-pointer font-bold text-foreground">
                {f.q}
              </summary>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {f.a}
              </p>
            </details>
          ))}
        </article>

        <RelatedBlogPosts currentSlug={SLUG} />
        <div className="max-w-3xl mx-auto px-4 sm:px-6"><NewsletterSignup variant="expanded" source="blog" /></div>

        <footer className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Picking the right loan product changes whether a deal pencils.
            TrueCap models DSCR live, side-by-side scenarios for cash,
            conventional, DSCR, and hard money — so you can see which
            financing structure actually makes the numbers work.{" "}
            <Link href="/" className="font-bold text-foreground hover:underline">
              Open the analyzer →
            </Link>
          </p>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
      <BlogStickyCta />
    </div>
  );
}
