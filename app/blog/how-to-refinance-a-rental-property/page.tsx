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
const DESCRIPTION =
  "Step-by-step on refinancing a rental property: when refi makes sense, rate-and-term vs cash-out, LTV limits, DSCR loans, the break-even math, and the 5 mistakes most investors make.";
const PUBLISHED_AT = "2026-05-26";
const MODIFIED_AT = "2026-06-01";
const READING_TIME = 10;

export const metadata: Metadata = {
  title: `${TITLE} | TrueCap`,
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
    title: TITLE,
    description: DESCRIPTION,
    url: `/blog/${SLUG}`,
    type: "article",
    publishedTime: PUBLISHED_AT,
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: TITLE }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const FAQS = [
  {
    q: "When does it make sense to refinance a rental property?",
    a: "Three scenarios. (1) Rate drop of 0.75% or more from your current rate, with a holding plan past the break-even (typically 24-36 months). (2) You need to pull equity for the next deal — cash-out refi recycles capital. (3) You want to remove a co-borrower or restructure terms (interest-only to amortizing, ARM to fixed). If none of those apply, the closing costs ($4-8k typical on an investment property) usually outweigh the savings.",
  },
  {
    q: "What's the difference between rate-and-term and cash-out refi?",
    a: "Rate-and-term refi: you replace your existing loan with a new loan of the same balance at a better rate (or different term). No cash comes out. Closing costs are paid from savings or rolled into the loan. Cash-out refi: the new loan is LARGER than the existing balance, and you take the difference in cash at closing. Cash-out has slightly higher rates (10-25bp typically) and lower max LTV (usually 75% on investment property, vs 80% for rate-and-term).",
  },
  {
    q: "What's the maximum LTV on an investment property refi?",
    a: "Conventional rate-and-term: typically 75-80% LTV. Conventional cash-out: 75% LTV. DSCR (non-QM) cash-out: typically 70-75% LTV depending on the lender. Most cash-out refis on investment properties cap at 75% — that's the practical ceiling. Above that, you're either in primary-residence territory or paying significant rate premium.",
  },
  {
    q: "Do I need to season the property before refinancing?",
    a: "Yes, in most cases. Conventional lenders typically require 6 months from purchase before allowing a cash-out refi. The 'delayed financing' rule lets you avoid the 6-month seasoning IF you bought cash AND meet certain other criteria. DSCR lenders often allow 0-3 month seasoning but at lower max LTV. Plan the timing carefully — a BRRRR that requires fast cash-out refi needs DSCR financing or the delayed-financing route.",
  },
  {
    q: "Are DSCR refis a good option?",
    a: "Depends on your situation. DSCR (Debt Service Coverage Ratio) loans qualify the property, not you — useful when your personal DTI doesn't pencil conventional, or when you've maxed out conventional loan slots (Fannie/Freddie cap individual borrowers at 10 financed properties). DSCR rates run 100-200bp higher than conventional. Use DSCR when conventional isn't available; default to conventional when it is.",
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
      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-2"><Link href="/blog" className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground">← Blog</Link></div>
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight tracking-tight text-balance">{TITLE}</h1>
          <p className="mt-3 text-[11px] uppercase tracking-widest text-muted-foreground font-bold">
            {new Date(PUBLISHED_AT).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })} · {READING_TIME} min read
          </p>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Refinancing a rental property is one of the most underused levers in real estate investing. Done right, it recycles capital, lowers your monthly payment, or both. Done wrong, it costs $4-8k in closing fees with little to show for it. Here&apos;s how to know which case you&apos;re in.
          </p>
        </header>

        <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">The three reasons to refinance</h2>
          <p>
            Refi exists for three core jobs. Be honest about which one applies to your situation — they have different math.
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">Reason 1: Rate-and-term refi to lower the payment</h3>
          <p>
            You currently pay X% rate. Current market rate is meaningfully lower. You refi to the lower rate, same loan balance, and your monthly payment drops by $100-500.
          </p>
          <p>
            <strong>The math:</strong> closing costs ($4-8k typical on investment property) divided by monthly savings = break-even months. If you&apos;ll hold past the break-even, refi. If you&apos;ll sell or refi again before, skip.
          </p>
          <p>
            Example: $300k loan. Current rate 7.5%, payment $2,098. Refi to 6.5%, payment $1,896. Savings $202/mo. Closing costs $5,500. Break-even = 27 months. If you&apos;ll hold past 27 months, refi.
          </p>
          <p>
            See our <Link href="/glossary/interest-rate" className="text-primary font-semibold hover:underline">interest rate</Link> and <Link href="/glossary/loan-term" className="text-primary font-semibold hover:underline">loan term</Link> glossary entries for more on how rate + term interact.
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">Reason 2: Cash-out refi to recycle capital</h3>
          <p>
            The property has appreciated since you bought. You refi at the new higher value, pulling out the equity in cash to fund your next deal.
          </p>
          <p>
            <strong>The math:</strong> new loan = 75% of current value. Existing loan gets paid off. Difference (minus closing costs) = cash to you. The cost: higher monthly payment on the larger loan + higher rate (cash-out typically 10-25bp above rate-and-term).
          </p>
          <p>
            Example: Bought property for $300k with $225k loan. Value now $400k. Cash-out refi at 75% LTV = $300k new loan. After paying off $225k existing balance and $6k closing, $69k of cash to you. Now you have $69k to deploy on the next deal.
          </p>
          <p>
            Cash-out is the engine of the <Link href="/blog/how-to-find-off-market-rental-properties" className="text-primary font-semibold hover:underline">BRRRR strategy</Link> and any portfolio-scaling plan that doesn&apos;t rely on adding outside capital.
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">Reason 3: Restructure terms</h3>
          <p>
            Sometimes the goal isn&apos;t saving money or pulling equity — it&apos;s changing the structure. Common cases:
          </p>
          <ul>
            <li><strong>ARM to fixed</strong> — locking in a fixed rate before your ARM resets</li>
            <li><strong>Interest-only to amortizing</strong> — your IO period is ending and you want to refi rather than face the payment shock</li>
            <li><strong>Removing a co-borrower</strong> — partnership dissolution, divorce, family arrangement changes</li>
            <li><strong>Changing entity</strong> — moving the loan into an LLC structure for asset protection</li>
          </ul>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">The loan types available</h2>
          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">Conventional (Fannie Mae / Freddie Mac)</h3>
          <p>
            The default. Best rates (typically 50-100bp lower than DSCR), strongest terms, but stricter qualification (DTI, income docs, asset reserves). Investment property cash-out cap: typically 75% LTV. Individual borrowers limited to 10 financed properties total.
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">DSCR (non-QM)</h3>
          <p>
            See our <Link href="/blog/dscr-loans-explained" className="text-primary font-semibold hover:underline">DSCR loans deep dive</Link> for the full picture. DSCR loans qualify on the property&apos;s cash flow, not your income. Useful when conventional doesn&apos;t work — high-DTI buyers, self-employed without easy income docs, investors past the 10-property conventional cap. Rate premium: 100-200bp. Lower max LTV than conventional. See the <Link href="/glossary/dscr" className="text-primary font-semibold hover:underline">DSCR</Link> glossary entry for the math.
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">Commercial / portfolio loans</h3>
          <p>
            For 5+ unit properties or investors with portfolios above conventional limits. Rates typically 50-150bp above conventional. Terms vary widely (5/1 ARM with 25-year amortization is common). LTV often 70-75%. Faster underwriting than conventional but more expensive long-term.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">The refi process — typical timeline</h2>
          <ol>
            <li><strong>Day 1-7:</strong> shop 3-5 lenders (the spread is wider than you think — often 30-50bp from worst to best quote)</li>
            <li><strong>Day 7-14:</strong> formally apply with chosen lender; submit income docs, asset statements, current mortgage statement, insurance declarations, rent rolls (for multi-unit)</li>
            <li><strong>Day 14-30:</strong> appraisal ordered (typically $500-700 for SFR, $1,000-2,000 for multi-unit)</li>
            <li><strong>Day 30-45:</strong> underwriting review; expect to provide 2-5 rounds of additional documentation</li>
            <li><strong>Day 45-60:</strong> clear to close, schedule closing</li>
            <li><strong>Day 60-65:</strong> closing — sign documents, new loan funds, old loan paid off, any cash-out proceeds wired</li>
          </ol>
          <p>
            Total: 45-65 days from application to close on most rate-and-term refis. Cash-out refis sometimes faster (45-50 days) because lenders process them frequently.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">The 5 most common mistakes</h2>
          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">1. Refi-ing too early (before break-even works)</h3>
          <p>
            If you&apos;ll sell or refi again before the break-even, the math doesn&apos;t work. The closing costs eat the savings. Always run break-even before committing.
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">2. Not shopping 3+ lenders</h3>
          <p>
            The spread between best and worst lender quote on the same deal is typically 30-50bp. On a $300k loan over 30 years, 30bp of difference is $50/mo or $18k of lifetime interest. Always shop — the 2 hours of work returns thousands.
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">3. Pulling too much cash out at the top of the market</h3>
          <p>
            Cash-out refis at peak market value feel great until the next downturn. If you cash-out 75% LTV and values drop 15%, you&apos;re at 88% LTV with limited refi options. Build a buffer — don&apos;t cash out to the absolute max unless you have a specific high-confidence deployment for the cash.
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">4. Ignoring DSCR options when conventional won&apos;t fit</h3>
          <p>
            Investors who&apos;ve hit their conventional loan cap (10 properties) often think they can&apos;t refi at all. DSCR refis exist for exactly this case. The rate is higher but the refi is still doable.
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">5. Refusing to refi for &quot;just&quot; 50bp</h3>
          <p>
            On a $400k loan held 10 years, a 50bp rate difference is ~$120/mo and ~$36k of lifetime interest. Even with $6k of closing costs, the break-even is 50 months and you keep collecting savings for 5+ years after. &quot;Only&quot; 50bp is often worth doing.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">Run the math before you commit</h2>
          <p>
            Refi decisions hinge on rate, term, closing costs, and hold period. Run the scenarios in <Link href="/" className="text-primary font-semibold hover:underline">TrueCap</Link> — it&apos;ll show you current-rate vs refi-rate cash flow + break-even + total interest paid side-by-side. Pro&apos;s A/B mortgage compare puts both scenarios in one view so you can decide in 60 seconds whether the refi is worth doing.
          </p>
          <p>
            Related reading: <Link href="/blog/cap-rate-vs-cash-on-cash-vs-dscr" className="text-primary font-semibold hover:underline">cap rate vs CoC vs DSCR</Link> for how refi changes each metric, and <Link href="/blog/dscr-loans-explained" className="text-primary font-semibold hover:underline">DSCR loans explained</Link> for when DSCR refi is the right choice.
          </p>
        </div>
      </article>
      <RelatedBlogPosts currentSlug={SLUG} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6"><NewsletterSignup variant="expanded" source="blog" /></div>
      <BlogStickyCta />
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
