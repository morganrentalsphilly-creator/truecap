/**
 * Anchor blog post #3 — "DSCR loans explained: what they are, when
 * they make sense, what they cost in 2026"
 *
 * Targets high-intent financing queries:
 *   - "dscr loan"
 *   - "dscr loans explained"
 *   - "what is a dscr loan"
 *   - "dscr loan requirements"
 *   - "dscr loan rates 2026"
 *   - "dscr vs conventional loan"
 *
 * People searching these terms are actively shopping for investment-
 * property financing — high-intent traffic that converts well when the
 * post answers the question and funnels into the analyzer.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Calculator } from "lucide-react";
import { BlogByline } from "@/components/marketing/blog-byline";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "dscr-loans-explained";
const TITLE = "DSCR loans explained: what they are, when they make sense, what they cost in 2026";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "DSCR loans explained: costs & when they fit (2026)";
const DESCRIPTION =
  "DSCR loans primarily underwrite a rental property's coverage instead of using personal DTI as the main ratio. Learn the borrower checks, program variation, costs, and trade-offs.";
const PUBLISHED_AT = "2026-05-24";
const MODIFIED_AT = "2026-08-21";
const READING_TIME_MIN = 10;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "dscr loan",
    "dscr loans explained",
    "what is a dscr loan",
    "dscr loan requirements",
    "dscr loan rates",
    "dscr vs conventional loan",
    "rental property financing",
    "investment property loan",
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
    q: "What is a DSCR loan?",
    a: "A DSCR (Debt Service Coverage Ratio) loan is generally a business-purpose, non-QM investment-property loan that uses the property's rental coverage as a primary qualifying metric instead of personal DTI. Clearing a program's DSCR threshold is only one condition: lenders can still review credit, liquidity and reserves, borrower or guarantor background, entity documents, property eligibility, appraisal, insurance, and other program requirements.",
  },
  {
    q: "What's the minimum DSCR most lenders require?",
    a: "Published program matrices commonly use thresholds around 1.0-1.25, while some programs allow lower coverage with different leverage, reserves, pricing, or property restrictions. There is no market-wide approval line. Ask the lender which rent, payment components, and rounding rules it uses, then obtain the current written matrix or term sheet.",
  },
  {
    q: "What rates do DSCR loans charge in 2026?",
    a: "There is no single DSCR rate. Quotes can change daily and vary with credit, LTV, DSCR, property type, occupancy, loan size, reserves, points, prepayment terms, and lender. These loans are often priced above comparable conventional financing, but only same-day written quotes with matching fees and prepayment terms support a useful comparison.",
  },
  {
    q: "Do DSCR loans need a down payment?",
    a: "Purchase programs commonly require meaningful borrower equity, and many published matrices cap leverage near 75-80% LTV. Actual maximum LTV can be lower based on DSCR, credit, property type, loan purpose, experience, or market. A quoted LTV is a program limit, not a promise that the file will close at that leverage.",
  },
  {
    q: "When should I use a DSCR loan vs a conventional loan?",
    a: "A DSCR loan can be worth comparing when income-based conventional underwriting is a constraint, the borrower wants an eligible entity structure, or a lender's property-coverage approach better fits the transaction. Compare it with conventional and portfolio options using total cost, recourse, reserves, prepayment terms, documentation, and exit plan—not the note rate alone.",
  },
  {
    q: "What documentation do DSCR loans require?",
    a: "Requirements vary by lender, program, state, borrower, and property. Many DSCR programs do not use tax returns, W-2s, or pay stubs to calculate personal DTI, but a lender may still request income or business documents for compliance, exceptions, guarantor review, ability-to-repay questions, or another condition. Expect identity and entity documents, credit authorization, asset and reserve evidence, appraisal or rent support, insurance, title, and transaction documents, then confirm the lender's checklist in writing.",
  },
  {
    q: "Can I use a DSCR loan for a short-term rental (Airbnb)?",
    a: "Some programs allow short-term-rental properties, but eligibility and income methodology vary. A lender may use long-term market rent, documented operating history, or a specialized appraisal method, and it may impose different leverage, reserves, licensing, management, or market restrictions. Confirm the exact income evidence and property-use rules before relying on projected STR revenue.",
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
    // Author points at the /about Person entity (E-E-A-T anchor @id).
    author: { "@type": "Person", "@id": `${siteUrl}/about#morgan`, name: "Morgan Page", url: `${siteUrl}/about` },
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
          <BlogByline />
          <p className="text-base sm:text-lg text-muted-foreground mt-4 leading-relaxed">
            {DESCRIPTION}
          </p>
        </header>

        <article className="prose prose-slate max-w-none [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground [&_li]:leading-relaxed [&_strong]:text-foreground">
          <p>
            Conventional mortgage underwriting commonly uses documented
            personal income and debt-to-income ratios. That approach may be a
            constraint for some self-employed or portfolio investors, even
            when a proposed rental supports its debt under a separate property
            analysis. DSCR programs are one non-QM option for that gap, but
            they still underwrite both the collateral and defined borrower
            risks.
          </p>

          <p>
            This post walks through what a DSCR loan actually is, who they
            make sense for, what they cost in 2026&apos;s rate environment,
            and the specific trade-offs vs. conventional financing.
          </p>

          <h2 className="text-2xl sm:text-3xl">What a DSCR loan is</h2>
          <p>
            <Link href="/glossary/dscr" className="text-primary font-semibold hover:underline">DSCR</Link> stands for <strong>Debt Service Coverage Ratio</strong> —
            the property&apos;s annual net operating income divided by its
            annual debt service. A DSCR of 1.25 means the property earns
            $1.25 of <Link href="/glossary/noi" className="text-primary font-semibold hover:underline">NOI</Link> for every $1.00 of mortgage payment — see
            our breakdown of <Link href="/blog/what-is-a-good-dscr" className="text-primary font-semibold hover:underline">what counts as a good DSCR</Link> for
            what that threshold means for your offer price.
          </p>
          <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
            <div className="text-sm sm:text-base font-mono">
              <span className="font-bold">DSCR</span> = Annual NOI ÷ Annual Debt Service
            </div>
          </div>
          <p>
            A <em>DSCR loan</em> is a non-QM mortgage that qualifies the
            transaction primarily on property coverage instead of using
            personal DTI as the main ratio. Many programs do not use W-2s or
            tax returns to calculate that ratio, but the lender still reviews
            borrower or guarantor credit, reserves, identity, entity
            documents, and the property itself. A DSCR above the program
            minimum satisfies one condition; it does not guarantee approval.
          </p>
          <p>
            <Link href="/#main" className="text-primary font-semibold hover:underline">
              Compute DSCR on a real property →
            </Link>
          </p>

          <h2 className="text-2xl sm:text-3xl">Who DSCR loans are for</h2>
          <p>
            Four common use cases follow. They identify reasons to compare a
            DSCR quote—not proof that it is the right or least-expensive
            product for a particular borrower.
          </p>

          <h3>1. Self-employed with paper losses</h3>
          <p>
            You make real money, but your Schedule C / Schedule E shows
            depreciation, business expenses, and other paper losses that
            reduce taxable income. Conventional programs apply their own
            income-calculation rules. A DSCR program may avoid using tax
            returns to calculate personal DTI, although documentation and
            exception requirements still vary by lender and program.
          </p>

          <h3>2. Already maxed on Fannie/Freddie</h3>
          <p>
            Agency financed-property rules can constrain an individual
            borrower with a larger portfolio. Depending on the transaction,
            alternatives can include DSCR, bank portfolio, commercial, or
            other financing; the right comparison depends on current program
            eligibility and total cost.
          </p>

          <h3>3. Buying through an LLC for asset protection</h3>
          <p>
            Some DSCR and portfolio programs permit eligible entities, often
            with personal guaranties and specific vesting documents. Agency
            and conventional title rules differ. Choose an entity with legal
            and tax advice, then confirm that exact vesting with the lender
            before signing a purchase contract.
          </p>

          <h3>4. Strong property, tight personal DTI</h3>
          <p>
            Sometimes the deal is great but your personal balance sheet
            (recent job change, high credit card balance, divorce-related
            debt, etc.) keeps the conventional underwriter from approving.
            A property-coverage program may remove personal DTI as the primary
            qualifying ratio, but it does not remove credit, liquidity,
            identity, guarantor, or other borrower review.
          </p>

          <h2 className="text-2xl sm:text-3xl">What DSCR loans cost in 2026</h2>
          <p>
            Pricing is quote-specific and can move daily. DSCR loans are often
            priced above comparable conventional investment-property loans,
            but a rate-only comparison is incomplete. Compare the same loan
            amount and lock date, then include points, lender fees, reserves,
            amortization, recourse, and any prepayment penalty.
          </p>
          <p>
            Common pricing and eligibility inputs include:
          </p>
          <ul>
            <li>
              <strong>DSCR ratio.</strong> Stronger coverage may improve
              pricing or leverage under a particular matrix.
            </li>
            <li>
              <strong>Credit profile.</strong> Score, history, and recent
              credit events can change pricing or eligibility.
            </li>
            <li>
              <strong><Link href="/glossary/ltv" className="text-primary font-semibold hover:underline">LTV</Link>.</strong> Lower leverage commonly improves pricing,
              while cash-out and purchase matrices can differ.
            </li>
            <li>
              <strong>Reserves.</strong> Required months and eligible asset
              types vary; more liquidity can help on some files.
            </li>
            <li>
              <strong>Property and use.</strong> Unit count, short-term-rental
              use, rural or condo status, loan size, and market can affect the
              matrix. Coverage is easier to clear in high-rent-to-price
              markets like <Link href="/markets/memphis" className="text-primary font-semibold hover:underline">Memphis</Link> than in appreciation-driven metros
              where rent lags the purchase price.
            </li>
          </ul>

          <h2 className="text-2xl sm:text-3xl">DSCR vs conventional — side by side</h2>
          <div className="not-prose overflow-x-auto rounded-xl border border-border bg-card my-6">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left p-3 font-bold text-foreground">Feature</th>
                  <th className="text-left p-3 font-bold text-foreground">DSCR loan</th>
                  <th className="text-left p-3 font-bold text-foreground">Conventional investment</th>
                </tr>
              </thead>
              <tbody className="[&_td]:p-3 [&_td]:border-b [&_td]:border-border [&_tr:last-child_td]:border-0">
                <tr><td className="text-muted-foreground">Income underwriting</td><td>Personal DTI often not primary; documents vary</td><td>Documented-income and DTI rules apply</td></tr>
                <tr><td className="text-muted-foreground">Primary coverage metric</td><td>Program-defined property DSCR</td><td>Personal DTI plus agency underwriting</td></tr>
                <tr><td className="text-muted-foreground">Eligible title</td><td>Entities often permitted; guaranties common</td><td>Program and vesting rules apply</td></tr>
                <tr><td className="text-muted-foreground">Portfolio limits</td><td>No agency cap; lender exposure limits can apply</td><td>Agency financed-property rules can apply</td></tr>
                <tr><td className="text-muted-foreground">Rate and fees</td><td>Quote-specific; often higher</td><td>Quote-specific; often lower if you qualify</td></tr>
                <tr><td className="text-muted-foreground">Equity required</td><td>Often 20%+; matrix-specific</td><td>Purpose and program-specific</td></tr>
                <tr><td className="text-muted-foreground">Closing timeline</td><td>Lender and file-specific</td><td>Lender and file-specific</td></tr>
                <tr><td className="text-muted-foreground">Credit threshold</td><td>Program-specific</td><td>Program and automated-underwriting specific</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            This comparison describes common structures, not a commitment or
            universal program matrix. Requirements vary by lender and program.
          </p>

          <h2 className="text-2xl sm:text-3xl">The DSCR trap to watch for</h2>
          <p>
            Lender formulas are not uniform. A program may use appraiser
            market rent, an eligible lease, or another documented amount,
            and may divide it by PITIA or a differently defined payment. If
            the accepted rent comes in below your assumption, the lender&apos;s
            ratio and available pricing or leverage can change materially.
          </p>
          <p>
            Before paying non-refundable fees or locking, ask which rent
            evidence, payment components, and rounding rules the lender will
            use, and what reconsideration process exists. Independent rental
            comps can inform your own decision but do not compel an appraiser
            or lender to change a value. If you&apos;re using a DSCR cash-out to pull equity, our guide on <Link href="/blog/how-to-refinance-a-rental-property" className="text-primary font-semibold hover:underline">refinancing a rental property</Link> walks through the post-refi DSCR math.
          </p>

          <h2 className="text-2xl sm:text-3xl">Stress-testing your DSCR</h2>
          <p>
            Before you apply, run the DSCR yourself. Three scenarios:
          </p>
          <ul>
            <li>
              <strong>Base case</strong> — your expected rent and rate.
              Compare it with the lender&apos;s written threshold and your own
              operating cushion.
            </li>
            <li>
              <strong>Lender appraisal -10% rent</strong> — what if the
              lender-accepted rent comes back 10% below your estimate? Check
              whether the file and your own cash-flow plan still work.
            </li>
            <li>
              <strong>Rate +0.5pp</strong> — what if rates spike before
              you lock? DSCR should still be above your lender&apos;s
              minimum.
            </li>
          </ul>
          <p>
            If all three scenarios pencil, the model has a better underwriting
            buffer. That still does not establish lender approval, appraised
            rent, insurability, title clearance, or final pricing. If only the
            base case works, the financing has little modeled room for change.
          </p>

          <div className="not-prose">
            <Link
              href="/#main"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-bold hover:opacity-95 transition-opacity"
            >
              <Calculator className="w-4 h-4" />
              Compute DSCR now
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

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
            Want to see DSCR on a specific deal before you call a lender?
            TrueCap computes DSCR live as you type, alongside cash flow,
            cap rate, and a 10-year projection.{" "}
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
