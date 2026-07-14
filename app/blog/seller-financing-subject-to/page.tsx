/**
 * Blog post: Seller financing and subject-to, explained.
 *
 * Content-gap post (Jun 2026). Targets "seller financing", "subject to
 * real estate", "owner financing rental property", "subject to investing",
 * "wraparound mortgage". Accuracy anchors: subject-to's central risk is
 * the due-on-sale clause (Garn-St Germain doesn't exempt an investor
 * purchase); Dodd-Frank's owner-occupant seller-financing rules generally
 * don't apply to investment/non-owner-occupant buyers. Educational only.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Calculator, FileSignature } from "lucide-react";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "seller-financing-subject-to";
const TITLE =
  "Seller financing and subject-to: creative deals explained (2026)";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Seller financing & subject-to deals, explained";
const DESCRIPTION =
  "When bank financing is expensive or out of reach, creative structures move deals. How seller financing and subject-to actually work, the due-on-sale risk that defines subject-to, where Dodd-Frank does and doesn't apply, and how to underwrite the 2026 rate arbitrage without ignoring the downside.";
const PUBLISHED_AT = "2026-06-23";
const MODIFIED_AT = "2026-06-23";
const READING_TIME_MIN = 11;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "seller financing",
    "subject to real estate",
    "owner financing rental property",
    "subject to investing",
    "seller financing vs subject to",
    "wraparound mortgage",
    "creative financing real estate 2026",
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
    q: "Is subject-to investing legal?",
    a: "Yes, buying a property 'subject to' the existing mortgage is legal. The catch is the due-on-sale clause: transferring title while the seller's loan stays in place gives the lender the contractual right to call the full balance due. The Garn-St. Germain Act's exemptions don't cover an arm's-length investor purchase, so that risk is real and ongoing — it doesn't make the deal illegal, it makes it a risk you have to price and manage.",
  },
  {
    q: "What's the difference between seller financing and subject-to?",
    a: "In seller financing, the seller acts as the bank: they hold a note and you pay them directly, ideally when they own the property free and clear. In subject-to, you take title but the seller's existing mortgage stays in their name and you make those payments. Seller financing creates a new loan; subject-to rides an existing one.",
  },
  {
    q: "Does Dodd-Frank apply to seller-financed deals?",
    a: "Mostly not for investors. Dodd-Frank's seller-financing restrictions (ability-to-repay, balloon limits, rate caps, loan-originator rules) apply to residential loans where the buyer intends to occupy the home. They generally don't apply to investment or rental property, or to investor-buyers who won't live there. Sellers financing more than three properties in 12 months face more rules even so — confirm with counsel.",
  },
  {
    q: "What happens if the lender calls a subject-to loan?",
    a: "If the lender invokes the due-on-sale clause, the full balance becomes due. You'd typically need to refinance into your own loan or pay it off. Experienced subject-to buyers keep payments current, keep reserves, and plan an exit (refinance or sale) precisely because a call — while uncommon on a performing loan — is always possible.",
  },
  {
    q: "Why would a seller agree to finance the deal?",
    a: "Several reasons: they own free and clear and want monthly income, they want to spread the capital-gains hit over years via installment-sale treatment, they want a higher sale price in exchange for flexible terms, or the property is hard to finance conventionally. A motivated seller trading terms for price is the core of most creative deals.",
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
            With mortgage rates in the 7&apos;s, a lot of deals that don&apos;t work
            with a new bank loan still work with <strong>creative
            financing</strong> — structures where the seller, not a bank,
            provides some or all of the financing. The two you&apos;ll hear most are
            <strong> seller financing</strong> and <strong>subject-to</strong>.
            Both are legitimate and both are genuinely useful in 2026. Both also
            carry risks that the YouTube version conveniently skips, so here&apos;s
            the honest walkthrough.
          </p>

          <h2 className="text-2xl sm:text-3xl">Seller financing (owner financing)</h2>
          <p>
            The seller becomes the bank. Instead of you getting a mortgage, the
            seller holds a <strong>promissory note</strong> secured by a mortgage
            or deed of trust, and you make payments directly to them on terms you
            negotiate — rate, length, down payment, and whether there&apos;s a
            balloon. It works most cleanly when the seller owns the property{" "}
            <strong>free and clear</strong>, so there&apos;s no underlying loan in
            the picture.
          </p>
          <p>
            Why a seller agrees: monthly income on an asset they wanted to sell,
            spreading the capital-gains tax over years via installment-sale
            treatment, a higher sale price in exchange for flexible terms, or a
            faster close on a property that&apos;s hard to finance conventionally.
            The whole game is a motivated seller trading <em>terms</em> for{" "}
            <em>price</em>.
          </p>

          <h2 className="text-2xl sm:text-3xl">Subject-to (taking over payments)</h2>
          <p>
            In a subject-to deal, you take <strong>title</strong> to the property,
            but the seller&apos;s existing mortgage <strong>stays in the
            seller&apos;s name</strong> and you make the payments on it. The 2026
            appeal is obvious: you effectively &quot;inherit&quot; the seller&apos;s
            2020-2021 mortgage at 3-4% instead of taking out a new loan at ~7%.
            On a $300k balance, that rate gap is worth hundreds of dollars a month
            in cash flow.
          </p>
          <p>
            The catch is the <strong>due-on-sale clause</strong>. Almost every
            mortgage gives the lender the right to demand the full balance when
            the property&apos;s title transfers — and a subject-to purchase is
            exactly that transfer. The Garn-St. Germain Act exempts certain
            transfers (into a living trust, to relatives) but <strong>not</strong>
            an arm&apos;s-length sale to an investor. So the lender <em>can</em> call
            the loan. In practice they rarely call a loan that&apos;s paid on time,
            but as rates rose the incentive to call cheap loans went up, and the
            risk never fully goes away.
          </p>
          <p>
            That risk doesn&apos;t make subject-to illegal — it makes it a risk you
            price and manage. Serious subject-to buyers keep the payments current,
            hold reserves, keep insurance properly arranged, and plan an exit (a
            refinance or sale) so a call wouldn&apos;t be catastrophic. Treat anyone
            who tells you the due-on-sale clause &quot;never gets enforced, don&apos;t
            worry about it&quot; as a warning sign.
          </p>

          <h3>The wraparound (a hybrid)</h3>
          <p>
            A wraparound mortgage (AITD) is a blend: the seller keeps their
            underlying loan and finances you for a larger amount that &quot;wraps&quot;
            around it, pocketing the spread. It carries the same due-on-sale
            exposure as subject-to, because the underlying loan stays in place.
          </p>

          <h2 className="text-2xl sm:text-3xl">Where Dodd-Frank fits (and where it doesn&apos;t)</h2>
          <p>
            People often cite Dodd-Frank as a reason seller financing is &quot;dead.&quot;
            For investors, it mostly isn&apos;t a factor. Dodd-Frank&apos;s
            seller-financing rules — ability-to-repay, balloon limits, rate caps,
            and loan-originator requirements — apply to <strong>residential loans
            where the buyer intends to occupy the home</strong>. They generally{" "}
            <strong>do not apply to investment or rental property</strong>, or to
            an investor-buyer who won&apos;t live there.
          </p>
          <p>
            Where it does bite: if you&apos;re the <em>seller</em> financing
            owner-occupant buyers, a limited exemption covers selling up to three
            properties in a 12-month period if you follow the terms (fixed or a
            5+ year ARM with rate caps, no negative amortization). Finance more
            than three to owner-occupants and the full ability-to-repay and
            loan-originator rules kick in. None of this is legal advice — loop in
            a real-estate attorney and a title company on any creative deal.
          </p>

          <h2 className="text-2xl sm:text-3xl">The 2026 rate arbitrage, with eyes open</h2>
          <p>
            Why is this suddenly popular again? Rate arbitrage. Picture a $300,000
            property with an assumable-in-practice 3.5% loan via subject-to versus
            a new loan at 7%:
          </p>
          <ul>
            <li><strong>New 7% loan</strong> on ~$300k → principal &amp; interest near $2,000/month.</li>
            <li><strong>Subject-to at 3.5%</strong> on the same balance → P&amp;I near $1,350/month.</li>
          </ul>
          <p>
            That ~$650/month swing can be the entire difference between negative
            and positive cash flow on the deal — which is exactly why subject-to
            is back. But the honest underwrite prices the due-on-sale risk and a
            refinance exit alongside the savings; the rate gap is the reward, the
            call risk is the cost.
          </p>

          <h2 className="text-2xl sm:text-3xl">Risks on each side</h2>
          <ul>
            <li><strong>Buyer, seller financing:</strong> a balloon you can&apos;t refinance into when it comes due. Negotiate enough runway.</li>
            <li><strong>Seller, seller financing:</strong> buyer default means foreclosing to get the property back. Vet the buyer and keep a real down payment.</li>
            <li><strong>Buyer, subject-to:</strong> the due-on-sale call, plus you&apos;re relying on the seller&apos;s loan staying in good standing.</li>
            <li><strong>Seller, subject-to:</strong> the loan stays on <em>your</em> credit and your name — if the buyer stops paying, it&apos;s your default. This is why subject-to demands deep trust and airtight paperwork.</li>
          </ul>

          <div className="not-prose">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-bold hover:opacity-95 transition-opacity"
            >
              <Calculator className="w-4 h-4" />
              Underwrite a creative-financing deal
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          <p>
            Creative financing changes the <em>financing inputs</em>, not the
            underlying property math. Drop the actual terms — the inherited rate,
            the balloon, the seller-carried second — into{" "}
            <Link href="/" className="text-primary font-semibold hover:underline">TrueCap</Link>{" "}
            and you&apos;ll see what they do to cash flow and{" "}
            <Link href="/glossary/dscr" className="text-primary font-semibold hover:underline">DSCR</Link>, so the
            rate arbitrage is something you&apos;ve measured rather than something a
            seller pitched you. If a refinance is your exit, model it against a
            standard{" "}
            <Link href="/blog/how-to-refinance-a-rental-property" className="text-primary font-semibold hover:underline">refinance</Link>{" "}
            and{" "}
            <Link href="/blog/cash-out-refinance-vs-heloc-rental" className="text-primary font-semibold hover:underline">cash-out vs HELOC</Link>{" "}
            first.
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
            <FileSignature className="inline w-4 h-4 mr-1 align-text-bottom" />
            General educational information, not legal, tax, or investment advice.
            Creative-financing structures carry real legal and financial risk and
            vary by state — always work with a real-estate attorney and title
            company before entering one.
          </p>
        </article>

        <RelatedBlogPosts currentSlug={SLUG} />
        <div className="max-w-3xl mx-auto px-4 sm:px-6"><NewsletterSignup variant="expanded" source="blog" /></div>

        <footer className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Related:{" "}
            <Link href="/blog/cash-out-refinance-vs-heloc-rental" className="font-bold text-foreground hover:underline">
              Cash-out refi vs HELOC →
            </Link>{" "}
            ·{" "}
            <Link href="/blog/how-to-refinance-a-rental-property" className="font-bold text-foreground hover:underline">
              How to refinance a rental →
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
