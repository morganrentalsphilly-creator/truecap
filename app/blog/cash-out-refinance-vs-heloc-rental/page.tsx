/**
 * Blog post: Cash-out refinance vs HELOC on a rental property.
 *
 * Content-gap post (Jun 2026). Targets "cash-out refinance vs HELOC",
 * "HELOC on investment property", "pull equity from rental property",
 * "BRRRR cash out refinance". The 2026 angle: a cash-out refi resets
 * your entire first mortgage to today's ~7% rate, while a HELOC leaves
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
  "You have equity in a rental and want to put it to work. A cash-out refinance and a HELOC both unlock it — but in 2026 they are not interchangeable. The mechanics, the investment-property LTV and rate reality, the cheap-first-mortgage trap that decides most of these, and a worked side-by-side.";
const PUBLISHED_AT = "2026-06-23";
const MODIFIED_AT = "2026-06-23";
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
    a: "Yes, but it is harder than on a primary residence. Expect a 70-80% combined loan-to-value cap, a 700+ credit score (often 720-740), and 6-12 months of cash reserves. Most large national banks don't offer investment-property HELOCs at all — the product mostly lives at portfolio lenders, community banks, and credit unions, so you have to shop.",
  },
  {
    q: "What is the maximum I can pull from a rental?",
    a: "On a conventional cash-out refinance of an investment property, lenders typically cap you at 75% LTV — so on a $400k property you can have a new loan up to $300k. HELOCs on rentals run a similar 70-80% combined LTV. In both cases you keep at least 20-25% equity in the property.",
  },
  {
    q: "Will a cash-out refinance reset my low interest rate?",
    a: "Yes — and in 2026 that's the whole ballgame. A cash-out refi replaces your existing first mortgage with a new, larger one at today's rate (~7%+). If you locked 3-4% in 2020-2021, refinancing throws that away on the entire balance, not just the cash you pull. A HELOC is a second lien that leaves the cheap first mortgage untouched.",
  },
  {
    q: "Is there a seasoning requirement?",
    a: "Usually. Conventional cash-out refis generally require you to have owned the property at least six months, with the existing first mortgage at least 12 months old. The 'delayed financing' exception lets you pull cash immediately if you bought all-cash — the key that makes the BRRRR strategy work.",
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
            obvious move is to pull some out for the next down payment or a
            rehab. There are two tools for that — a <strong>cash-out
            refinance</strong> and a <strong>HELOC</strong> — and choosing wrong
            in 2026 can cost you tens of thousands in needless interest.
          </p>
          <p>
            They sound similar (both turn equity into cash) but they behave very
            differently, and the rate environment has made the gap between them
            wider than it&apos;s been in years.
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

          <h2 className="text-2xl sm:text-3xl">The investment-property reality in 2026</h2>
          <p>
            Both products are meaningfully stricter on a rental than on the home
            you live in:
          </p>
          <ul>
            <li><strong>Cash-out refi:</strong> conventional investor cash-out is generally capped at <strong>75% LTV</strong>, with seasoning rules — typically six months of ownership and an existing first mortgage at least 12 months old.</li>
            <li><strong>HELOC on a rental:</strong> <strong>70-80% combined LTV</strong>, priced at roughly prime + 0.5-2% (about 0.5-0.75% above primary-residence lines — the national average HELOC sat near 7.5% in mid-2026), <strong>700+ credit</strong> (often 720-740), and <strong>6-12 months of reserves</strong>.</li>
            <li><strong>Availability:</strong> most big national banks don&apos;t write investment-property HELOCs at all. You&apos;ll find them at portfolio lenders, community banks, and credit unions — so shop several.</li>
          </ul>

          <h2 className="text-2xl sm:text-3xl">The 2026 question that decides it: what&apos;s your current rate?</h2>
          <p>
            This is the part that matters more than any other in 2026. A
            cash-out refinance <strong>resets your entire first mortgage</strong>
            to today&apos;s rate. If you bought or refinanced in 2020-2021 and
            you&apos;re sitting on a 3-4% loan, refinancing to ~7% doesn&apos;t just
            cost more on the cash you pull — it re-prices the <em>whole
            balance</em> you already had at the cheap rate. That&apos;s often a
            five-figure mistake.
          </p>
          <p>
            A HELOC sidesteps that entirely. It leaves the cheap first mortgage
            alone and charges the higher rate only on the slice you actually
            draw. So the rule of thumb for 2026:
          </p>
          <ul>
            <li><strong>You have a low-rate first mortgage (sub-5%)</strong> → strongly favor a HELOC (or a second-position fixed loan). Don&apos;t blow up the cheap money.</li>
            <li><strong>Your existing rate is already at/above market</strong> (you bought recently, or have a higher-rate loan) → a cash-out refi can make sense, especially if you want a fixed payment and a clean single lien.</li>
          </ul>

          <h2 className="text-2xl sm:text-3xl">When each one wins</h2>
          <h3>Cash-out refinance is better when…</h3>
          <ul>
            <li>Your current rate is at or above today&apos;s — nothing cheap to protect.</li>
            <li>You want a large lump sum and a predictable fixed payment.</li>
            <li>You&apos;re running{" "}
              <Link href="/blog/brrrr-method-explained" className="text-primary font-semibold hover:underline">BRRRR</Link>{" "}
              and refinancing out of a rehab to recycle your capital (the delayed-financing exception lets all-cash buyers pull out immediately). See the full{" "}
              <Link href="/blog/how-to-refinance-a-rental-property" className="text-primary font-semibold hover:underline">refinance walkthrough</Link>.</li>
          </ul>
          <h3>HELOC is better when…</h3>
          <ul>
            <li>You have a low-rate first mortgage worth protecting.</li>
            <li>You need flexible, short-term money — fund a rehab, then pay it back and redraw on the next one.</li>
            <li>You only want to pay interest on what you actually use, not a full new loan balance.</li>
          </ul>

          <h2 className="text-2xl sm:text-3xl">Worked example: the cheap-mortgage trap</h2>
          <p>
            $400,000 property, $200,000 still owed at <strong>3.5%</strong> from a
            2021 purchase, and you want ~$100,000 for the next deal.
          </p>
          <ul>
            <li><strong>Cash-out refi to 75% LTV ($300k) at 7%:</strong> you get your $100k, but now the full $300k is at 7%. You just re-priced the original $200k from 3.5% to 7% — roughly <strong>$7,000 a year</strong> of extra interest on money you weren&apos;t even pulling out, on top of closing costs.</li>
            <li><strong>HELOC for $100k at ~8%:</strong> the $200k first mortgage stays at 3.5%. You pay ~8% only on the $100k you draw (~$8,000/yr), and the cheap money is preserved. Higher headline rate, far lower total cost — and you can pay it down and redraw.</li>
          </ul>
          <p>
            The HELOC&apos;s rate is higher, yet it&apos;s the cheaper decision by a
            wide margin — precisely because the refi&apos;s real cost is hidden in
            the balance you already had. Whatever you pull, the only honest test
            is what the new debt does to the property&apos;s{" "}
            <Link href="/glossary/dscr" className="text-primary font-semibold hover:underline">DSCR</Link>{" "}
            and monthly cash flow.
          </p>

          <h2 className="text-2xl sm:text-3xl">The risks to underwrite</h2>
          <ul>
            <li><strong>HELOC variable rate.</strong> Most are variable and can rise; some lenders can freeze or reduce the line if values drop. Don&apos;t lever a long-term plan on a callable short-term line.</li>
            <li><strong>Refi reset + closing costs.</strong> A refi costs 2-5% to close and locks in today&apos;s rate on everything. Make sure the cash you free up earns more than the rate you just accepted.</li>
            <li><strong>Over-leverage.</strong> Pulling to the 75-80% ceiling thins your cash-flow cushion right when rates and insurance are already squeezing it. Leave margin.</li>
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
