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
  "DSCR = NOI ÷ annual debt service. It&apos;s the metric DSCR lenders use to qualify your loan. Here&apos;s the formula, what lenders include and exclude, three worked examples, and the difference between your DSCR and the lender&apos;s DSCR (which is usually lower).";
const PUBLISHED_AT = "2026-06-07";
const MODIFIED_AT = "2026-06-07";
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
    a: "Most DSCR loan programs require 1.0-1.25 minimum, with rate tier improvements at 1.25 and 1.5. Some 'no-DSCR' or 'sub-1.0' products exist but they carry meaningful rate premiums (1.5-2.5 percentage points above market) and tighter LTVs (65-70% instead of 75-80%). Above 1.25 is comfortable; below 1.0 means the property doesn't generate enough to cover its mortgage and is bleeding cash monthly.",
  },
  {
    q: "How is the lender's DSCR calculation different from mine?",
    a: "Three usual differences. (1) Most DSCR lenders use the 1007/1025 form 'market rent' from the appraiser — NOT your lease rent. If the appraiser comes in below your number, the lender's DSCR is lower than yours. (2) Many lenders use PITIA (principal + interest + taxes + insurance + association dues) as debt service, not just P&I. This makes the denominator bigger and DSCR lower. (3) Lenders often haircut your NOI by adding a vacancy and management deduction even if you self-manage. Net effect: the lender's DSCR is usually 5-15% lower than what you calculated.",
  },
  {
    q: "What's a 1.25 DSCR loan in plain English?",
    a: "A loan where the property must produce $1.25 of net operating income for every $1 of debt service, i.e. 25% margin. If the mortgage payment is $2,000/month ($24,000/year), the property must produce at least $30,000 of NOI annually to clear the 1.25 threshold. If NOI is lower, the loan either gets denied at 1.25 or shifts to a 1.0-tier product with worse rate and LTV.",
  },
  {
    q: "Can DSCR be negative?",
    a: "Mathematically yes if NOI is negative (operating expenses exceed gross rent), but no DSCR lender will fund a deal with negative DSCR — it means the property loses money before the mortgage payment, which is a non-starter. If your DSCR calculation goes negative, you either have operating expenses wildly out of line or unrealistically low rents — re-check both before going further.",
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
      { "@type": "HowToStep", name: "Compare to lender minimum", text: "Most lenders require 1.0-1.25. Higher DSCR unlocks better rate tiers." },
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
            Most DSCR programs require 1.0-1.25. Rate tier improvements
            at 1.25 and 1.5. Below 1.0 either denies or moves you to a
            more expensive sub-1.0 product with worse LTV.
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
            Your spreadsheet says 1.30. The lender comes back with 1.08
            and a different rate tier. Three usual reasons:
          </p>
          <ul>
            <li><strong>Appraiser rent &lt; your rent.</strong> The
              lender uses the 1007/1025 form &ldquo;market rent.&rdquo;
              If the appraiser comes in 10% below your number, NOI drops
              ~10% and DSCR drops proportionally.</li>
            <li><strong>PITIA vs P&amp;I.</strong> If you computed on
              P&amp;I and the lender uses PITIA, expect 0.10-0.20 lower
              DSCR.</li>
            <li><strong>Lender-imposed vacancy / management add-back.</strong>
              Some lenders deduct 5-10% for vacancy and 8% for
              management even if you self-manage — to underwrite the
              property without assuming free labor.</li>
          </ul>
          <p>
            Defense: ask the lender exactly which methodology they use,
            then build your model that way. If you&apos;re targeting a
            1.25 DSCR program, underwrite to 1.4+ to absorb the
            appraisal and methodology haircut without dropping below
            their minimum.
          </p>

          <h2 className="text-2xl sm:text-3xl">Stress-test your DSCR</h2>
          <p>Before applying, run three scenarios:</p>
          <ul>
            <li><strong>Base case</strong> with your rent and rate.</li>
            <li><strong>Appraiser comes in 10% under rent</strong> —
              does DSCR still clear the lender&apos;s minimum?</li>
            <li><strong>Rate +0.5pp</strong> — does DSCR still hold up
              if rates spike before you lock?</li>
          </ul>
          <p>
            If all three pencil, you&apos;re bankable. If only the base
            case works, you have no margin for the surprises that happen
            on every other closing.
          </p>

          <div className="not-prose">
            <Link
              href="/tools/dscr-calculator"
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
            for appraised-rent and rate sensitivities. Lender-ready
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
