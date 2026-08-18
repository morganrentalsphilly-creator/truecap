/**
 * Blog post: How to refinance a rental property.
 *
 * Targets queries: "refinance rental property", "cash out refinance
 * investment property", "rental property refinance rates", "investment
 * property refi requirements", "DSCR refinance".
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "how-to-refinance-a-rental-property";
const TITLE = "How to refinance a rental property — rate-and-term, cash-out, and DSCR options";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "How to refinance a rental property (2026)";
const DESCRIPTION =
  "Step-by-step on refinancing a rental property: rate-and-term vs cash-out, program-specific LTV and DSCR considerations, illustrative break-even math, and five mistakes to avoid.";
const PUBLISHED_AT = "2026-05-26";
const MODIFIED_AT = "2026-08-18";
const READING_TIME = 10;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "refinance rental property",
    "cash out refinance investment property",
    "rental property refinance rates",
    "investment property refi requirements",
    "DSCR refinance",
    "rental property refi LTV",
    "when to refinance rental property",
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
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const FAQS = [
  {
    q: "When does it make sense to refinance a rental property?",
    a: "There is no universal rate-drop or break-even threshold. A refinance may be considered to change rate or term, seek cash out, remove a borrower, or restructure debt. Compare the current payoff and complete written loan estimate — including points, lender fees, third-party costs, prepayment terms, and expected holding period — with the projected savings and risks.",
  },
  {
    q: "What's the difference between rate-and-term and cash-out refi?",
    a: "A rate-and-term refinance primarily changes the existing debt's rate, term, or structure; a cash-out refinance seeks a larger new balance and returns eligible net proceeds after payoff and costs. Programs can treat pricing, leverage, and financed costs differently. Available cash depends on appraisal and full underwriting, so verify the current written terms rather than assuming a fixed premium or LTV.",
  },
  {
    q: "What's the maximum LTV on an investment property refi?",
    a: "There is no universal maximum. LTV varies by program, units, occupancy, property type, loan purpose, seasoning and value basis, credit, coverage or DTI, and lender overlays. Ask each lender to confirm the current cap and eligible appraised-value basis for your file; an LTV calculation alone is not an approval.",
  },
  {
    q: "Do I need to season the property before refinancing?",
    a: "Seasoning and the eligible value basis vary by loan program, transaction history, property type, and lender. Conventional, delayed-financing, portfolio, and DSCR rules are not interchangeable. Before relying on a refinance timeline, ask the lender to confirm in writing the required ownership period, value basis, documentation, and maximum leverage for this property.",
  },
  {
    q: "Are DSCR refis a good option?",
    a: "It depends on your situation and current quotes. DSCR programs primarily use property coverage rather than personal DTI, but still apply borrower, credit, reserve, entity, appraisal, insurance, and program requirements. Compare DSCR, conventional, and portfolio options on total cost, leverage, recourse, prepayment terms, documentation, and exit plan; no fixed rate premium applies to every file.",
  },
];

export default function RefinancePost() {
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/blog/${SLUG}`;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: TITLE,
    description: DESCRIPTION,
    datePublished: PUBLISHED_AT,
    dateModified: MODIFIED_AT,
    url: canonicalUrl,
    author: { "@type": "Person", name: "Morgan Page", url: siteUrl },
    publisher: { "@id": `${siteUrl}/#organization` },
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
            Refinancing can change a rental&apos;s payment, term, risk, or available
            equity, but it also adds quote-specific costs and underwriting risk.
            Here&apos;s how to compare the structures without assuming approval.
          </p>
        </header>

        <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">The three reasons to refinance</h2>
          <p>
            Refi exists for three core jobs. Be honest about which one applies to your situation — they have different math.
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">Reason 1: Rate-and-term refi to lower the payment</h3>
          <p>
            If a current written quote is meaningfully better than the existing
            note, a rate-and-term refinance may lower the payment. The result
            depends on balance, rate, amortization, fees, and term.
          </p>
          <p>
            <strong>The math:</strong> complete quoted closing costs divided by
            modeled monthly savings = simple break-even months. Include points,
            lender and third-party fees, any existing prepayment cost, changed
            amortization, and omitted tax effects before deciding.
          </p>
          <p>
            Illustration only: $300k loan. Current rate 7.5%, payment $2,098.
            Refi to 6.5%, payment $1,896. Savings $202/mo. Closing costs $5,500.
            Simple break-even = 27 months. Actual quotes, payments, costs, and
            the appropriate decision may differ.
          </p>
          <p>
            See our <Link href="/glossary/interest-rate" className="text-primary font-semibold hover:underline">interest rate</Link> and <Link href="/glossary/loan-term" className="text-primary font-semibold hover:underline">loan term</Link> glossary entries for more on how rate + term interact. Model the new payment with the <Link href="/tools/mortgage-payment-calculator" className="text-primary font-semibold hover:underline">mortgage payment calculator</Link> before comparing it to the current note.
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">Reason 2: Cash-out refi to recycle capital</h3>
          <p>
            If the lender accepts a higher appraised value and approves a
            cash-out loan, some eligible equity may become net proceeds after
            the existing payoff, fees, reserves, and closing costs.
          </p>
          <p>
            <strong>Illustrative math:</strong> assume the selected program
            permits a new loan at 75% of lender-accepted value. Existing debt
            gets paid off; the remainder after all costs is modeled cash to the
            borrower. Actual pricing and leverage are quote-specific.
          </p>
          <p>
            Example: bought property for $300k with a $225k loan. Assume the
            lender accepts a $400k appraisal and approves 75% LTV: $300k modeled
            gross principal. After a $225k payoff and $6k assumed closing costs,
            the illustration produces $69k; neither the value, approval, nor net
            proceeds are guaranteed.
          </p>
          <p>
            Cash-out refinancing is one possible capital-recycling step in a{" "}
            <Link href="/blog/how-to-find-off-market-rental-properties" className="text-primary font-semibold hover:underline">BRRRR strategy</Link>, subject to appraisal, proceeds, and approval. It shows up most often in high-cap-rate metros like{" "}
            <Link href="/markets/cleveland" className="text-primary font-semibold hover:underline">Cleveland</Link>, where a forced-appreciation rehab can raise the appraised value enough to pull most of the rehab cash back out.
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">Reason 3: Restructure terms</h3>
          <p>
            Sometimes the goal isn&apos;t saving money or pulling equity — it&apos;s changing the structure. Common cases:
          </p>
          <ul>
            <li><strong>ARM to fixed</strong> — locking in a fixed rate before your ARM resets</li>
            <li><strong>Interest-only to amortizing</strong> — your IO period is ending and you want to refi rather than face the payment shock</li>
            <li><strong>Removing a co-borrower</strong> — partnership dissolution, divorce, family arrangement changes</li>
            <li><strong>Changing borrower or entity</strong> — some products permit entity borrowing, but title, existing-loan, insurance, tax, guaranty, and legal consequences require lender and professional review</li>
          </ul>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">The loan types available</h2>
          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">Conventional (Fannie Mae / Freddie Mac)</h3>
          <p>
            Eligible conventional agency programs may offer competitive
            pricing, but DTI, documentation, reserves, appraisal, occupancy,
            financed-property, and lender-overlay rules apply. Pricing,
            leverage, and eligibility are file-specific; verify the current
            program guide and written quote.
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">DSCR (non-QM)</h3>
          <p>
            See our <Link href="/blog/dscr-loans-explained" className="text-primary font-semibold hover:underline">DSCR loans deep dive</Link> for the full picture. These programs primarily underwrite the property&apos;s coverage rather than using personal DTI as the main ratio, while still reviewing borrower and property risks. They can be useful when conventional income rules or financed-property limits constrain a file. Pricing, leverage, documentation, recourse, and prepayment terms vary, so compare current written quotes. See the <Link href="/glossary/dscr" className="text-primary font-semibold hover:underline">DSCR</Link> glossary entry for the math.
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">Commercial / portfolio loans</h3>
          <p>
            Commercial and portfolio structures may address properties or
            borrower situations outside a selected conventional program, but
            rate, term, amortization, leverage, documentation, recourse, and
            timing vary widely. Obtain current written proposals and compare
            total cost and exit risk.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">The refi process — stages to plan for</h2>
          <p>
            This is a process outline, not a promised timeline. Lender workload,
            appraisal availability, property complexity, title, insurance,
            borrower responsiveness, and underwriting conditions can materially
            change timing and cost. An application or appraisal does not
            guarantee clear-to-close.
          </p>
          <ol>
            <li><strong>Compare:</strong> request same-day written quotes using the same lock period, loan purpose, value, and assumptions.</li>
            <li><strong>Apply:</strong> submit the documents required for the chosen borrower, property, and program.</li>
            <li><strong>Validate collateral:</strong> complete appraisal, title, insurance, payoff, and any lease or rent review.</li>
            <li><strong>Clear underwriting:</strong> answer conditions and review final rate, points, fees, cash to close, recourse, and prepayment terms.</li>
            <li><strong>Close only after approval:</strong> sign final documents; funding, payoff, and any proceeds follow the lender&apos;s closing process.</li>
          </ol>
          <p>
            Ask the lender and settlement provider for a file-specific schedule
            and preserve contingency time; do not tie a purchase or bridge-loan
            maturity to an advertised turnaround.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">Five refinance mistakes to avoid</h2>
          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">1. Refi-ing too early (before break-even works)</h3>
          <p>
            If you&apos;ll sell or refinance again before the modeled break-even,
            quoted costs may exceed the projected savings. Run the complete
            break-even comparison before committing.
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">2. Not shopping 3+ lenders</h3>
          <p>
            Shop multiple same-day quotes using identical assumptions and
            compare rate, points, lender credits, fees, prepayment terms,
            recourse, and cash to close. As an illustration, if otherwise
            comparable $300k, 30-year quotes differ by 30bp, the modeled
            difference is about $50/month or $18k over the full term; actual
            quote spreads and realized savings vary.
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">3. Pulling too much cash out at the top of the market</h3>
          <p>
            In a simplified illustration that ignores principal paydown, a loan
            initially at 75% LTV would be about 88% LTV after a 15% value
            decline. Actual value and future refinance options may differ.
            Stress-test a lower appraisal and leave a liquidity buffer.
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">4. Ignoring DSCR options when conventional won&apos;t fit</h3>
          <p>
            When a file does not fit a selected conventional program, a DSCR or
            portfolio program may be another option. Eligibility, pricing,
            leverage, appraisal, reserves, property rules, documentation, and
            approval remain lender- and file-specific.
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">5. Refusing to refi for &quot;just&quot; 50bp</h3>
          <p>
            In this stated illustration, a $400k loan held 10 years with a 50bp
            rate difference changes the modeled payment by about $120/month and
            interest by about $36k over the stated comparison. With $6k of
            assumed costs, the simple break-even is 50 months before omitted
            costs or tax effects. Use the actual quote and expected hold period
            rather than treating 50bp as an automatic refinance signal.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">Run the math before you commit</h2>
          <p>
            Refi decisions hinge on rate, term, closing costs, and hold period.
            Run user-entered scenarios in <Link href="/" className="text-primary font-semibold hover:underline">TrueCap</Link> to compare modeled cash flow,
            break-even, and interest. TrueCap is not a lender quote, appraisal,
            underwriting decision, or approval; replace every assumption with
            the current written terms for your file.
          </p>
          <p>
            Related reading: <Link href="/blog/cap-rate-vs-cash-on-cash-vs-dscr" className="text-primary font-semibold hover:underline">cap rate vs CoC vs DSCR</Link> for how refi changes each metric, and <Link href="/blog/dscr-loans-explained" className="text-primary font-semibold hover:underline">DSCR loans explained</Link> for when DSCR refi is the right choice.
          </p>
          <p className="text-sm text-muted-foreground">
            General educational information, not a loan quote or approval.
            Verify current written pricing, leverage, seasoning, value basis,
            appraisal, DSCR or DTI treatment, credit, reserves, documentation,
            recourse, prepayment terms, costs, and timing with the lender.
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
