/**
 * How-to blog post — How to calculate DSCR (debt service coverage ratio).
 *
 * Targets high-intent calculator-adjacent queries:
 *   - "how to calculate dscr"
 *   - "dscr formula"
 *   - "debt service coverage ratio formula"
 *   - "dscr calculator"
 *   - "how do lenders calculate dscr"
 *   - "minimum dscr for rental loan"
 *   - "dscr ratio example"
 *   - "dscr 1.25 meaning"
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

const SLUG = "how-to-calculate-dscr";
const TITLE = "How to calculate DSCR (debt service coverage ratio) — 2026 guide";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "How to calculate DSCR — 2026 guide";
const DESCRIPTION =
  "DSCR compares income with debt service. Learn the formula, worked examples, and why each lender's program-specific calculation and requirements must be confirmed.";
const PUBLISHED_AT = "2026-06-07";
const MODIFIED_AT = "2026-08-15";
const READING_TIME_MIN = 8;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "how to calculate dscr",
    "dscr formula",
    "debt service coverage ratio formula",
    "dscr calculator",
    "how do lenders calculate dscr",
    "minimum dscr for rental loan",
    "dscr ratio example",
    "dscr 1.25 meaning",
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
    q: "What's the DSCR formula?",
    a: "DSCR = annual NOI ÷ annual debt service. NOI = net operating income (gross rent minus operating expenses, before debt service). Annual debt service = monthly mortgage payment × 12 (principal + interest only, sometimes including taxes and insurance depending on the lender). A DSCR of 1.25 means the property earns $1.25 for every $1 of mortgage payment — 25% margin of safety.",
  },
  {
    q: "What DSCR do most lenders require?",
    a: "There is no universal minimum or pricing tier. Ask the specific lender for its current written formula, rent evidence, expense treatment, threshold, leverage, pricing, reserve, borrower, property, and state requirements. A ratio below 1.0 under a given formula indicates modeled income is below modeled debt service; it does not by itself describe every cash-flow line or every lender decision.",
  },
  {
    q: "How is the lender's DSCR calculation different from mine?",
    a: "Lenders can differ on rent evidence, lease treatment, appraisal forms, PITIA versus other debt-service definitions, vacancy or management adjustments, and rounding. Obtain the exact written calculation before comparing it with your operating DSCR; the lender result can be higher or lower depending on the inputs.",
  },
  {
    q: "What's a 1.25 DSCR loan in plain English?",
    a: "Mathematically, 1.25 means the numerator is 1.25 times the denominator under the formula being used. In a hypothetical NOI-based calculation, $30,000 of NOI divided by $24,000 of debt service equals 1.25. Approval, pricing, and leverage still depend on the lender's formula and full program requirements.",
  },
  {
    q: "Can DSCR be negative?",
    a: "Mathematically yes if the numerator is negative. Re-check the income, vacancy, and operating-expense inputs and treat the result as a serious coverage warning. Do not infer a universal credit decision; ask the lender about its formula and program requirements.",
  },
  {
    q: "What happens if my DSCR is right at the lender's minimum?",
    a: "You're at risk. Lenders typically have a small cushion — they'll fund 1.05 if their minimum is 1.0 — but appraised rent coming in 5% below your number can tip you below. Don't lock a rate or pay non-refundable fees until you've confirmed the appraised rent in the 1007 form. If you're underwriting to a 1.25 minimum, target 1.4+ in your own model so a 10-15% appraisal haircut doesn't kill the deal.",
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
  const howToLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to calculate DSCR on a rental property",
    description: "Four-step process: compute NOI, compute annual debt service, divide, compare to lender minimum.",
    step: [
      { "@type": "HowToStep", name: "Compute NOI", text: "Gross rent minus vacancy minus all operating expenses. Excludes mortgage payment." },
      { "@type": "HowToStep", name: "Compute annual debt service", text: "Monthly P&I × 12. Some lenders include taxes and insurance (PITIA)." },
      { "@type": "HowToStep", name: "Divide NOI by debt service", text: "Result is DSCR. Express to 2 decimals." },
      { "@type": "HowToStep", name: "Compare with the written program", text: "Confirm the lender's current formula, minimum, rent evidence, leverage, and pricing; modeled DSCR does not guarantee approval or a rate tier." },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToLd) }} />

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
            DSCR = NOI ÷ annual debt service. It&apos;s the metric DSCR
            lenders use to qualify your loan. Here&apos;s the formula,
            what lenders include and exclude, three worked examples, and
            the difference between your DSCR and the lender&apos;s DSCR
            (which is usually lower).
          </p>
        </header>

        <article className="prose prose-slate max-w-none [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground [&_li]:leading-relaxed [&_strong]:text-foreground">

          <h2 className="text-2xl sm:text-3xl">The DSCR formula</h2>
          <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
            <div className="text-base sm:text-lg font-mono">
              <span className="font-bold">DSCR</span> = Annual NOI ÷ Annual debt service
            </div>
          </div>
          <p>
            DSCR (Debt Service Coverage Ratio) measures whether the
            property earns enough to cover its own mortgage. A DSCR of
            1.25 means the property earns $1.25 of NOI for every $1.00
            of debt service — a 25% safety margin. DSCR loans (the
            non-QM product class) qualify your loan based on this
            ratio instead of your personal income.
          </p>
          <p>
            Read the full background on the loan product itself:
            <Link href="/blog/dscr-loans-explained" className="text-primary font-semibold hover:underline"> DSCR loans explained</Link>.
          </p>

          <h2 className="text-2xl sm:text-3xl">The 4-step process</h2>

          <h3>Step 1: Compute NOI</h3>
          <p>
            Net operating income = gross rent − vacancy − operating
            expenses (taxes, insurance, management, maintenance reserve,
            CapEx reserve, utilities you pay, HOA). NOT including
            mortgage. Full walkthrough in
            <Link href="/blog/how-to-calculate-cap-rate" className="text-primary font-semibold hover:underline"> how to calculate cap rate</Link>.
          </p>

          <h3>Step 2: Compute annual debt service</h3>
          <p>
            Monthly principal + interest payment × 12. Some DSCR lenders
            use PITIA (principal + interest + taxes + insurance +
            association dues) instead — check before locking. This
            matters because PITIA is meaningfully larger than P&amp;I and
            pushes DSCR lower.
          </p>

          <h3>Step 3: Divide</h3>
          <p>NOI ÷ annual debt service = DSCR. Express to 2 decimals.</p>

          <h3>Step 4: Compare to lender minimum</h3>
          <p>
            Confirm the specific program&apos;s current formula, minimum,
            rent evidence, leverage, pricing, reserves, and other
            eligibility rules in writing. A modeled DSCR does not
            guarantee approval or a particular rate tier.
          </p>

          <h2 className="text-2xl sm:text-3xl">Worked example #1: comfortable DSCR</h2>
          <p>$200K property, 25% down at 7.5% (DSCR loan).</p>
          <ul>
            <li>Gross rent: $1,900/mo × 12 = $22,800</li>
            <li>Operating expenses (~45% ratio for Tier 2): −$10,260</li>
            <li><strong>NOI:</strong> $12,540</li>
            <li>Loan: $150K at 7.5% / 30 yr = $1,049/mo P&amp;I</li>
            <li>Annual debt service (P&amp;I only): $12,588</li>
            <li><strong>DSCR (P&amp;I basis):</strong> $12,540 ÷ $12,588 = <strong>1.00</strong></li>
          </ul>
          <p>
            Right at 1.0 — comfortable for a sub-1.0 product, marginal
            for a standard 1.25 program. Most investors target 1.25+ to
            avoid being a borderline case if the appraised rent comes in
            below your number.
          </p>

          <h2 className="text-2xl sm:text-3xl">Worked example #2: the PITIA version</h2>
          <p>
            Same property, but now the lender uses PITIA. Property tax
            $3,000, insurance $1,200 (both already in operating expenses
            but the lender double-dips here for safety).
          </p>
          <ul>
            <li>NOI: $12,540 (same as above)</li>
            <li>P&amp;I: $12,588</li>
            <li>Tax + insurance escrow: $4,200</li>
            <li>Annual PITIA: $16,788</li>
            <li><strong>DSCR (PITIA basis):</strong> $12,540 ÷ $16,788 = <strong>0.75</strong></li>
          </ul>
          <p>
            Same property, but the PITIA-basis DSCR is 0.75 — well below
            any DSCR program&apos;s minimum. This is why it&apos;s
            critical to ask the lender which methodology they use before
            running your numbers. P&amp;I basis is more common; PITIA
            basis is stricter and used by some banks and credit unions.
          </p>

          <h2 className="text-2xl sm:text-3xl">Worked example #3: strong DSCR</h2>
          <p>
            $200K property in higher-cap market, $2,200/mo rent, 25% down
            at 7.5%.
          </p>
          <ul>
            <li>Gross rent: $26,400</li>
            <li>Operating expenses (~45%): −$11,880</li>
            <li>NOI: $14,520</li>
            <li>P&amp;I: $12,588 (same loan)</li>
            <li><strong>DSCR:</strong> $14,520 ÷ $12,588 = <strong>1.15</strong></li>
          </ul>
          <p>
            1.15 clears a 1.0-minimum program comfortably and qualifies
            for sub-1.25-tier pricing. If you can push rent another
            $150/mo or shave 10% off operating expenses, you cross 1.25
            and unlock the better rate tier — often worth 25-50 basis
            points on the rate over 30 years.
          </p>

          <h2 className="text-2xl sm:text-3xl">Your DSCR vs the lender&apos;s DSCR</h2>
          <p>
            Your spreadsheet may differ from the lender&apos;s result because
            the inputs and formula can differ. Common questions include:
          </p>
          <ul>
            <li><strong>Appraisal or program rent &lt; your rent.</strong> Some
              programs use an appraisal rent form or other specified evidence.
              Ask which lease or appraisal rent the program accepts and
              test any supported downside.</li>
            <li><strong>PITIA vs P&amp;I.</strong> If you computed on
              P&amp;I and the lender uses PITIA, recompute with the exact
              taxes, insurance, and association dues.</li>
            <li><strong>Lender-imposed vacancy / management add-back.</strong>
              Ask whether and how the program applies vacancy,
              management, or other adjustments.</li>
          </ul>
          <p>
            Ask the lender exactly which methodology and evidence it
            uses, then reproduce that calculation separately from your
            operating model. Choose a downside cushion based on the
            property and written program rather than a universal target.
          </p>

          <h2 className="text-2xl sm:text-3xl">Stress-test your DSCR</h2>
          <p>Before applying, run three scenarios:</p>
          <ul>
            <li><strong>Base case</strong> with your rent and rate.</li>
            <li><strong>Supported rent is lower</strong> — test a meaningful
              downside based on the available evidence.</li>
            <li><strong>Rate or costs increase</strong> — test the written
              quote&apos;s expiration and a realistic pre-lock downside.</li>
          </ul>
          <p>
            If all three pencil, the scenario has more modeled cushion;
            it still does not establish approval. If only the base case
            works, you have little modeled margin for surprises that happen
            on every other closing.
          </p>

          <div className="not-prose">
            <Link
              href="/#main"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-bold hover:opacity-95 transition-opacity"
            >
              <Calculator className="w-4 h-4" />
              Open the DSCR calculator
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          <p className="text-sm text-muted-foreground mt-6">
            Related reading: <Link href="/blog/dscr-loans-explained" className="text-primary font-semibold hover:underline">DSCR loans explained</Link>, <Link href="/blog/hard-money-vs-dscr-loan" className="text-primary font-semibold hover:underline">Hard money vs DSCR</Link>, <Link href="/blog/cap-rate-vs-cash-on-cash-vs-dscr" className="text-primary font-semibold hover:underline">Cap rate vs cash-on-cash vs DSCR</Link>.
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
            TrueCap computes DSCR live as you type — P&amp;I and PITIA
            both — alongside cap rate, cash flow, and a stress-test grid
            for appraised-rent and rate sensitivities. Lender-facing
            numbers before you make the call.{" "}
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
