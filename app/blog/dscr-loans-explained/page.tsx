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
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "dscr-loans-explained";
const TITLE = "DSCR loans explained: what they are, when they make sense, what they cost in 2026";
const DESCRIPTION =
  "DSCR loans approve based on the property's economics, not your personal income. Here's how they work, who they're for, what rates and DSCR ratios look like in 2026, and the trade-offs vs. conventional financing.";
const PUBLISHED_AT = "2026-05-24";
const READING_TIME_MIN = 10;

export const metadata: Metadata = {
  title: `${TITLE} | TrueCap Blog`,
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
    title: TITLE,
    description: DESCRIPTION,
    url: `/blog/${SLUG}`,
    type: "article",
    publishedTime: PUBLISHED_AT,
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/home.jpg"],
  },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is a DSCR loan?",
    a: "A DSCR (Debt Service Coverage Ratio) loan is a non-QM mortgage that qualifies the BORROWER based on the PROPERTY's ability to cover its own mortgage from rental income — not on your personal W-2 income, tax returns, or DTI ratio. The lender looks at projected rent divided by projected mortgage payment; if that ratio (the DSCR) is above their minimum (typically 1.0-1.25), you get approved.",
  },
  {
    q: "What's the minimum DSCR most lenders require?",
    a: "Most DSCR programs in 2026 require 1.0-1.25 minimum, with better rate tiers at 1.25 and 1.5. Some 'no-DSCR' or 'sub-1.0' products exist but they carry meaningful rate premiums (1.5-2.5 percentage points above market) and tighter LTVs (65-70% instead of 75-80%).",
  },
  {
    q: "What rates do DSCR loans charge in 2026?",
    a: "DSCR loan rates typically run 0.75-1.5 percentage points above conventional investment-property rates. With 30-year fixed conventional investment rates at 6.5-7.5% in mid-2026, DSCR rates land roughly 7.25-9% depending on credit score, LTV, and the property's actual DSCR. Higher DSCR (1.5+) gets you closer to the bottom of the range; tight DSCR (1.0-1.15) closer to the top.",
  },
  {
    q: "Do DSCR loans need a down payment?",
    a: "Yes. Standard DSCR products require 20-25% down. Some lenders go to 80% LTV (20% down) for strong borrowers with DSCR ≥ 1.25 and credit scores above 720. Stricter products top out at 75% LTV. Cash-out refis on DSCR loans typically max at 70-75% LTV.",
  },
  {
    q: "When should I use a DSCR loan vs a conventional loan?",
    a: "DSCR loans make sense when (a) you're self-employed and your tax returns don't show enough income to qualify conventionally, (b) you already have 10 financed properties (the Fannie/Freddie limit) and need a non-QM product, (c) you're using an LLC for asset protection (most conventional loans require personal title), or (d) the property's DSCR is strong but your personal DTI is tight. If your W-2 income easily qualifies and you don't need an LLC, conventional financing is almost always cheaper.",
  },
  {
    q: "What documentation do DSCR loans require?",
    a: "Minimal compared to conventional. Typically: credit report, two months of bank statements (to verify reserves), the executed purchase contract or refi appraisal, and lease/market rent comps. You don't provide tax returns, W-2s, pay stubs, or DTI calculations. That's the whole point.",
  },
  {
    q: "Can I use a DSCR loan for a short-term rental (Airbnb)?",
    a: "Yes, with caveats. Most DSCR lenders will underwrite based on the property's long-term market rent regardless of how you intend to operate it. Some specialized lenders will use AirDNA or similar projected STR revenue to compute DSCR, which can dramatically improve your qualification if the property's STR income materially exceeds market long-term rent. Rates on STR-based DSCR loans typically run 0.5-1.0 percentage points above standard DSCR.",
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
    dateModified: PUBLISHED_AT,
    author: { "@type": "Organization", name: "TrueCap", url: siteUrl },
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
          <h1 className="text-3xl sm:text-4xl font-black text-foreground mt-2 leading-tight text-balance">
            {TITLE}
          </h1>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold mt-3">
            {new Date(PUBLISHED_AT).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}{" "}
            · {READING_TIME_MIN} min read
          </p>
          <p className="text-base sm:text-lg text-muted-foreground mt-4 leading-relaxed">
            {DESCRIPTION}
          </p>
        </header>

        <article className="prose prose-slate max-w-none [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-black [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground [&_li]:leading-relaxed [&_strong]:text-foreground">
          <p>
            For a decade, &ldquo;getting a mortgage&rdquo; meant proving your
            personal income — tax returns, W-2s, debt-to-income ratios, the
            whole drill. That broke down fast for serious real estate
            investors. By your 5th rental, your tax returns show paper losses
            from depreciation, your DTI is technically wrecked even though
            your portfolio is throwing off cash, and Fannie/Freddie cap you at
            10 financed properties anyway. DSCR loans were built for exactly
            this gap.
          </p>

          <p>
            This post walks through what a DSCR loan actually is, who they
            make sense for, what they cost in 2026&apos;s rate environment,
            and the specific trade-offs vs. conventional financing.
          </p>

          <h2 className="text-2xl sm:text-3xl">What a DSCR loan is</h2>
          <p>
            DSCR stands for <strong>Debt Service Coverage Ratio</strong> —
            the property&apos;s annual net operating income divided by its
            annual debt service. A DSCR of 1.25 means the property earns
            $1.25 of NOI for every $1.00 of mortgage payment.
          </p>
          <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
            <div className="text-sm sm:text-base font-mono">
              <span className="font-bold">DSCR</span> = Annual NOI ÷ Annual Debt Service
            </div>
          </div>
          <p>
            A <em>DSCR loan</em> is a non-QM mortgage that qualifies the
            borrower based on this ratio instead of personal income. The
            lender doesn&apos;t care about your W-2 or your tax returns.
            They care whether the property can pay its own mortgage. If the
            DSCR is above their minimum (usually 1.0-1.25), you&apos;re
            approvable.
          </p>
          <p>
            <Link href="/tools/dscr-calculator" className="text-primary font-semibold hover:underline">
              Compute DSCR on a real property →
            </Link>
          </p>

          <h2 className="text-2xl sm:text-3xl">Who DSCR loans are for</h2>
          <p>
            Four classic use cases. If any of them describes you, DSCR is
            usually the right product. If none of them does, conventional
            financing is almost always cheaper and a better fit.
          </p>

          <h3>1. Self-employed with paper losses</h3>
          <p>
            You make real money, but your Schedule C / Schedule E shows
            depreciation, business expenses, and other paper losses that
            crater your taxable income. Conventional lenders look at the tax
            returns, not the underlying business. DSCR loans don&apos;t
            care about your tax returns.
          </p>

          <h3>2. Already maxed on Fannie/Freddie</h3>
          <p>
            Fannie Mae and Freddie Mac cap an individual borrower at 10
            financed 1-4 unit properties. If you&apos;re at the cap, your
            11th deal needs non-QM financing. DSCR is the most common
            product for that next stage.
          </p>

          <h3>3. Buying through an LLC for asset protection</h3>
          <p>
            Most conventional residential loans require the property to be
            titled in your personal name. If you want the LLC liability
            shield from day one — which most investors do once they have
            more than 2-3 properties — you need a DSCR loan or a portfolio
            loan from a regional bank.
          </p>

          <h3>4. Strong property, tight personal DTI</h3>
          <p>
            Sometimes the deal is great but your personal balance sheet
            (recent job change, high credit card balance, divorce-related
            debt, etc.) keeps the conventional underwriter from approving.
            If the property has DSCR above 1.25 you can sidestep the
            personal-finance scrutiny entirely.
          </p>

          <h2 className="text-2xl sm:text-3xl">What DSCR loans cost in 2026</h2>
          <p>
            The rate premium is the trade-off. DSCR loans typically run
            <strong> 0.75-1.5 percentage points above</strong> conventional
            investment-property rates. With current conventional 30-year
            fixed investment rates at 6.5-7.5%, DSCR rates in mid-2026 land
            roughly in the <strong>7.25-9.0%</strong> range.
          </p>
          <p>
            What moves you within that range:
          </p>
          <ul>
            <li>
              <strong>DSCR ratio.</strong> Stronger DSCR (1.5+) → bottom of
              the range. Tight DSCR (1.0-1.15) → top of the range.
            </li>
            <li>
              <strong>Credit score.</strong> 720+ unlocks the best tier; 660
              minimum on most products.
            </li>
            <li>
              <strong>LTV.</strong> 75% LTV gets better rates than 80% LTV.
              Cash-out refis at 70-75% LTV.
            </li>
            <li>
              <strong>Reserves.</strong> 6+ months of mortgage payments in
              the bank → tier improvement; 3 months is the typical floor.
            </li>
            <li>
              <strong>Property type.</strong> Single-family lands at the
              bottom of the range; 2-4 unit slightly higher; 5+ unit moves
              into commercial-loan territory.
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
                <tr><td className="text-muted-foreground">Income docs needed</td><td>None</td><td>2 years tax returns, W-2s, pay stubs</td></tr>
                <tr><td className="text-muted-foreground">Qualifying metric</td><td>Property DSCR</td><td>Personal DTI</td></tr>
                <tr><td className="text-muted-foreground">Title in LLC?</td><td>Yes</td><td>No (usually)</td></tr>
                <tr><td className="text-muted-foreground">Property cap</td><td>None</td><td>10 financed Fannie/Freddie</td></tr>
                <tr><td className="text-muted-foreground">Typical rate (2026)</td><td>7.25-9.0%</td><td>6.5-7.5%</td></tr>
                <tr><td className="text-muted-foreground">Min down</td><td>20-25%</td><td>15-25%</td></tr>
                <tr><td className="text-muted-foreground">Closing timeline</td><td>21-30 days</td><td>30-45 days</td></tr>
                <tr><td className="text-muted-foreground">Min credit score</td><td>660-680</td><td>620-640</td></tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl sm:text-3xl">The DSCR trap to watch for</h2>
          <p>
            DSCR lenders compute the ratio using <em>market rent</em> from a
            1007/1025 form (the lender&apos;s appraiser&apos;s rent
            estimate). If that estimate comes in 10-15% below what you
            assumed when you ran your underwriting, your DSCR can flip from
            1.25 to 1.05 — and you&apos;re suddenly in a different rate tier
            or, worse, declined.
          </p>
          <p>
            Defense: before locking your rate, ask the lender what market
            rent figure they&apos;re using. If it&apos;s materially below
            your number, pull rental comps from Rentometer, Zillow, and the
            local property management companies. A second appraisal or rent
            comp letter can sometimes move the needle 5-10%.
          </p>

          <h2 className="text-2xl sm:text-3xl">Stress-testing your DSCR</h2>
          <p>
            Before you apply, run the DSCR yourself. Three scenarios:
          </p>
          <ul>
            <li>
              <strong>Base case</strong> — your expected rent and rate.
              DSCR should be 1.25+ to be comfortable.
            </li>
            <li>
              <strong>Lender appraisal -10% rent</strong> — what if the
              1007 comes back 10% below your estimate? DSCR should still
              hold above 1.10.
            </li>
            <li>
              <strong>Rate +0.5pp</strong> — what if rates spike before
              you lock? DSCR should still be above your lender&apos;s
              minimum.
            </li>
          </ul>
          <p>
            If all three scenarios pencil, you&apos;re bankable. If only the
            base case works, you have no margin for the kinds of surprises
            that happen on every other closing.
          </p>

          <div className="not-prose">
            <Link
              href="/tools/dscr-calculator"
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
