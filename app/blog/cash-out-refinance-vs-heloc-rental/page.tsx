/**
 * Blog post: Cash-out refinance vs HELOC on a rental property.
 *
 * Content-gap post (Jun 2026). Targets "cash-out refinance vs HELOC",
 * "HELOC on investment property", "pull equity from rental property",
 * "BRRRR cash out refinance". The comparison angle: a cash-out refi resets
 * the entire first mortgage to the new quoted rate, while a HELOC may leave
 * a cheap existing lien alone. Funnels into the analyzer + refinance +
 * BRRRR posts.
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

const SLUG = "cash-out-refinance-vs-heloc-rental";
const TITLE =
  "Cash-out refinance vs HELOC on a rental: which pulls equity better in 2026?";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Cash-out refinance vs HELOC on a rental (2026)";
const DESCRIPTION =
  "A cash-out refinance and a HELOC can both access rental equity, but eligibility and terms vary. Compare their mechanics with an illustrative example, then verify current written lender quotes.";
const PUBLISHED_AT = "2026-06-23";
const MODIFIED_AT = "2026-08-15";
const READING_TIME_MIN = 11;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "cash-out refinance vs heloc",
    "heloc on investment property",
    "cash out refinance rental property",
    "pull equity from rental property",
    "heloc vs cash out refinance investment property",
    "brrrr cash out refinance",
    "rental property equity 2026",
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
    q: "Can you get a HELOC on an investment property?",
    a: "Some lenders offer HELOCs on investment properties, but availability, combined-LTV limits, credit tiers, reserves, lien position, property eligibility, draw terms, and recourse vary. Ask banks, credit unions, and portfolio lenders for a current written program guide and a quote on your actual file; primary-residence HELOC terms are not a reliable proxy.",
  },
  {
    q: "What is the maximum I can pull from a rental?",
    a: "There is no universal maximum. The available amount is limited by the lender's current LTV or combined-LTV matrix, appraisal, existing payoff, credit, coverage or DTI, reserves, lien position, and program rules. At an illustrative 75% LTV, a $400k appraised value would imply a $300k gross loan ceiling before the existing payoff, costs, and other constraints; verify the actual cap in writing.",
  },
  {
    q: "Will a cash-out refinance reset my low interest rate?",
    a: "A cash-out refinance generally replaces the existing first mortgage, so the new quoted rate and terms apply to the full new balance. A qualifying second-lien HELOC may leave the first mortgage in place, but its own variable-rate, draw, freeze, maturity, and repayment provisions matter. Compare complete written loan estimates rather than assuming either structure is cheaper.",
  },
  {
    q: "Is there a seasoning requirement?",
    a: "Possibly. Ownership, existing-lien, value-basis, and cash-out seasoning rules vary by program and can affect both timing and usable appraised value. Some conventional files may qualify for a delayed-financing exception after an eligible cash purchase, subject to detailed documentation and loan limits; it is not automatic or a promise of immediate cash-out. Verify the current guide with the lender before closing the acquisition.",
  },
  {
    q: "Is the interest tax deductible?",
    a: "When the borrowed funds are used for the rental business (rehab, another rental purchase, operating costs), the interest is generally deductible against rental income. If you spend it on personal items, it isn't. Tracing the use of funds matters — keep clean records and confirm with a CPA.",
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
            {DESCRIPTION}
          </p>
        </header>

        <article className="prose prose-slate max-w-none [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground [&_li]:leading-relaxed [&_strong]:text-foreground">
          <p>
            Your rental has appreciated, your tenant has paid down the loan, and
            now you&apos;re sitting on equity that isn&apos;t doing anything. The
            possible move is to pull some out for the next down payment or a
            rehab. Two tools to compare are a <strong>cash-out
            refinance</strong> and a <strong>HELOC</strong> — and choosing wrong
            can add material cost depending on the existing balance, new quote,
            fees, draw amount, and hold period.
          </p>
          <p>
            They sound similar (both turn equity into cash) but they behave very
            differently. Use live written quotes and the same draw and
            hold-period assumptions when comparing them.
          </p>

          <h2 className="text-2xl sm:text-3xl">How each one works</h2>
          <p>
            <strong>Cash-out refinance</strong> — you replace your existing
            mortgage with a new, <em>larger</em> one and take the difference in
            cash. If you owe $200k on a property worth $400k and refinance to a
            $300k loan, you walk away with ~$100k (minus closing costs) and a
            brand-new loan on the full $300k.
          </p>
          <p>
            <strong>HELOC (home equity line of credit)</strong> — a revolving
            second lien that sits <em>on top</em> of your existing mortgage. Your
            first loan is untouched; you get a credit line you can draw, repay,
            and redraw during the draw period, usually at a variable rate and
            often interest-only while you draw.
          </p>

          <h2 className="text-2xl sm:text-3xl">The investment-property variables to verify</h2>
          <p>
            Both products are meaningfully stricter on a rental than on the home
            you live in:
          </p>
          <ul>
            <li><strong>Cash-out refi:</strong> confirm the current LTV matrix, seasoning and value basis, appraisal rules, coverage or DTI treatment, reserves, pricing, and closing costs.</li>
            <li><strong>HELOC on a rental:</strong> confirm combined LTV, credit and reserve tiers, variable-rate index and margin, draw and repayment periods, line-freeze rights, fees, and lien-position rules.</li>
            <li><strong>Availability:</strong> investment-property HELOC offerings vary by institution, geography, property, and borrower. Shop several lenders and compare current written terms.</li>
          </ul>

          <h2 className="text-2xl sm:text-3xl">The first comparison: what rate are you replacing?</h2>
          <p>
            A cash-out refinance <strong>resets your entire first mortgage</strong>
            to the new note&apos;s quoted rate and terms. If an existing first
            mortgage has a materially lower rate than the new quote, refinancing doesn&apos;t just
            cost more on the cash you pull — it re-prices the <em>whole
            balance</em>. The impact depends on balance, amortization, fees,
            taxes, hold period, and the alternative line&apos;s actual usage.
          </p>
          <p>
            A HELOC sidesteps that entirely. It leaves the cheap first mortgage
            alone and charges the higher rate only on the slice you actually
            draw, if the line is approved and remains available. Use this as a
            comparison checklist, not an approval rule:
          </p>
          <ul>
            <li><strong>The existing first mortgage is materially cheaper than the new quote:</strong> compare an eligible HELOC or fixed second lien so the old first may remain in place.</li>
            <li><strong>The existing rate is near or above the new quote:</strong> a cash-out refi may compare better, particularly if a fixed payment and one lien matter.</li>
          </ul>

          <h2 className="text-2xl sm:text-3xl">When each one wins</h2>
          <h3>Cash-out refinance may fit better when…</h3>
          <ul>
            <li>Your current rate is at or above today&apos;s — nothing cheap to protect.</li>
            <li>You want a large lump sum and a predictable fixed payment.</li>
            <li>You&apos;re running{" "}
              <Link href="/blog/brrrr-method-explained" className="text-primary font-semibold hover:underline">BRRRR</Link>{" "}
              and refinancing out of a rehab to recycle capital, subject to the
              lender&apos;s current seasoning, value-basis, documentation, appraisal,
              and approval rules. See the full{" "}
              <Link href="/blog/how-to-refinance-a-rental-property" className="text-primary font-semibold hover:underline">refinance walkthrough</Link>.</li>
          </ul>
          <h3>HELOC may fit better when…</h3>
          <ul>
            <li>You have a low-rate first mortgage worth protecting.</li>
            <li>You need flexible, short-term money — fund a rehab, then pay it back and redraw on the next one.</li>
            <li>You prefer a line whose interest is based on the outstanding draw, after accounting for fees, minimums, and variable-rate terms.</li>
          </ul>

          <h2 className="text-2xl sm:text-3xl">Worked example: the cheap-mortgage trap</h2>
          <p>
            Illustrative assumptions, not current quotes or an approval:
            $400,000 property, $200,000 still owed at <strong>3.5%</strong> from a
            2021 purchase, and you want ~$100,000 for the next deal.
          </p>
          <ul>
            <li><strong>Modeled cash-out refi to 75% LTV ($300k) at 7%:</strong> the illustration produces $100k before costs, but the full $300k is now at 7%. Re-pricing the original $200k from 3.5% to 7% adds roughly <strong>$7,000 a year</strong> of simple interest before amortization and closing-cost effects.</li>
            <li><strong>Modeled HELOC draw of $100k at 8%:</strong> assume the $200k first mortgage stays at 3.5% and the line remains available. The illustration charges about $8,000/year on the fully drawn line before fees and rate changes; actual interest follows the balance and variable-rate terms.</li>
          </ul>
          <p>
            Under these assumptions, the HELOC&apos;s rate is higher yet its total
            modeled cost may be lower because the refi&apos;s cost includes
            the balance you already had. A central comparison is what the new
            debt does to the property&apos;s{" "}
            <Link href="/glossary/dscr" className="text-primary font-semibold hover:underline">DSCR</Link>{" "}
            and monthly cash flow under the same stated assumptions.
          </p>

          <h2 className="text-2xl sm:text-3xl">The risks to underwrite</h2>
          <ul>
            <li><strong>HELOC variable rate.</strong> Many lines use variable rates, and some agreements permit a lender to freeze or reduce availability under stated conditions. Read the actual agreement before relying on future draws.</li>
            <li><strong>Refi reset + closing costs.</strong> A refi applies the new note to the whole balance and carries quote-specific closing costs. Include every fee in the break-even comparison.</li>
            <li><strong>Over-leverage.</strong> Borrowing near the maximum a lender offers can thin the cash-flow cushion. Stress-test lower value, higher rate, vacancy, repairs, and a frozen line.</li>
          </ul>

          <div className="not-prose">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-bold hover:opacity-95 transition-opacity"
            >
              <Calculator className="w-4 h-4" />
              Model the new payment before you pull equity
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          <p>
            Before you pull a dollar, run the property in{" "}
            <Link href="/" className="text-primary font-semibold hover:underline">TrueCap</Link>{" "}
            with the new debt in place and watch what it does to cash flow and
            DSCR — the analyzer&apos;s mortgage scenarios let you compare a
            cash-out refi against a HELOC-on-top side by side, so the
            cheap-mortgage trap shows up before you sign. If you&apos;re recycling
            capital, pair this with the{" "}
            <Link href="/blog/brrrr-method-explained" className="text-primary font-semibold hover:underline">BRRRR method</Link>{" "}
            and{" "}
            <Link href="/blog/dscr-loans-explained" className="text-primary font-semibold hover:underline">DSCR-loan</Link>{" "}
            guides.
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

          <p className="text-sm text-muted-foreground">
            General educational information, not lending or tax advice. Rates,
            LTV caps, and qualification vary by lender and change often — confirm
            current terms with a lender and your CPA.
          </p>
        </article>

        <RelatedBlogPosts currentSlug={SLUG} />
        <div className="max-w-3xl mx-auto px-4 sm:px-6"><NewsletterSignup variant="expanded" source="blog" /></div>

        <footer className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Related:{" "}
            <Link href="/blog/how-to-refinance-a-rental-property" className="font-bold text-foreground hover:underline">
              How to refinance a rental →
            </Link>{" "}
            ·{" "}
            <Link href="/blog/brrrr-method-explained" className="font-bold text-foreground hover:underline">
              The BRRRR method →
            </Link>{" "}
            ·{" "}
            <Link href="/blog/dscr-loans-explained" className="font-bold text-foreground hover:underline">
              DSCR loans explained →
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
