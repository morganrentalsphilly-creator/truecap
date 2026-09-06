/**
 * Blog post: Should you put your rental property in an LLC?
 *
 * Content-gap post (Jun 2026). Targets "rental property LLC", "should I
 * put my rental in an LLC", "LLC for rental property", "transfer rental
 * to LLC due on sale". Accuracy anchors: Garn-St Germain does NOT exempt
 * LLC transfers (due-on-sale risk), and domestic LLCs are currently
 * exempt from CTA/BOI reporting after FinCEN's Mar-2025 interim rule.
 * Educational only — attorney/CPA caveats throughout.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Scale } from "lucide-react";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { RelatedContent } from "@/components/marketing/related-content";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "rental-property-llc";
const TITLE = "Should you put your rental property in an LLC? (2026)";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Rental property LLC: worth it in 2026?";
const DESCRIPTION =
  "What an LLC does (and doesn't) for asset protection and taxes, the due-on-sale trap when you transfer a mortgaged rental, and when it's worth the cost.";
const PUBLISHED_AT = "2026-06-23";
const MODIFIED_AT = "2026-06-23";
const READING_TIME_MIN = 12;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "rental property llc",
    "should i put my rental in an llc",
    "llc for rental property",
    "rental property asset protection",
    "transfer rental property to llc due on sale",
    "rental property llc taxes",
    "corporate transparency act llc 2026",
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
    q: "Does an LLC save you money on taxes?",
    a: "An LLC classification alone does not create a universal tax saving. Federal and state treatment depends on members, elections, activities, ownership, and jurisdiction. Entity choice also affects administration, liability analysis, financing, and state fees; have qualified legal and tax advisers review the proposed structure.",
  },
  {
    q: "Will my lender call the loan if I move the property into an LLC?",
    a: "It is a real contractual risk. Federal law lists protected transfers but does not list an ordinary transfer to an LLC; the loan documents and facts control whether a due-on-sale option exists and can be exercised. Payment status does not waive it. Obtain lender consent and transaction-specific legal, title, tax, and insurance advice before transferring or selecting a purchase structure.",
  },
  {
    q: "Do I have to file a BOI report for my rental LLC in 2026?",
    a: "As of 2026, no — for a domestic LLC. FinCEN's March 2025 interim final rule removed the beneficial-ownership (BOI) reporting requirement under the Corporate Transparency Act for U.S.-formed companies and U.S. persons; only foreign-formed entities registered to do business here still report. This area has changed repeatedly, and some states (e.g. New York) have their own rules — confirm current FinCEN and state guidance before relying on it.",
  },
  {
    q: "Can I get a conventional mortgage in an LLC?",
    a: "Borrower and vesting eligibility are program-specific. Many owner-occupant programs require an eligible natural-person borrower, while entity products have different terms and may involve guarantees. Obtain current written lender and counsel guidance before choosing the borrower or title holder; do not transfer later based on a generic financing rule.",
  },
  {
    q: "Do I need a separate LLC for each property?",
    a: "It's a trade-off. One LLC per property isolates each asset's liability but multiplies formation cost, annual fees, and bookkeeping. Many investors use one LLC for a few low-value properties, separate LLCs for high-equity ones, or a holding-company structure. The right answer depends on your equity at risk and state costs — an asset-protection attorney earns their fee here.",
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
      {
        "@type": "ListItem",
        position: 1,
        name: "TrueCap",
        item: `${siteUrl}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${siteUrl}/blog`,
      },
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      <main id="main" className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="mb-8 sm:mb-10">
          <Link
            href="/blog"
            className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground"
          >
            ← TrueCap Blog
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-2 leading-tight text-balance">
            {TITLE}
          </h1>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold mt-3">
            {new Date(PUBLISHED_AT).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}{" "}
            · {READING_TIME_MIN} min read
          </p>
          <p className="text-base sm:text-lg text-muted-foreground mt-4 leading-relaxed">
            {DESCRIPTION}
          </p>
        </header>

        <article className="prose prose-slate max-w-none [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground [&_li]:leading-relaxed [&_strong]:text-foreground">
          <p>
            &quot;Should I put my rental in an LLC?&quot; is probably the
            most-asked question new investors have after their first deal — and
            most of the answers online are either &quot;always yes&quot;
            (usually from someone selling LLC formations) or &quot;don&apos;t
            bother.&quot; The honest answer is that an LLC&apos;s effect depends
            on state law, separateness, contracts, insurance, financing, and the
            facts of a claim. Transferring a mortgaged property also creates a
            loan-document issue that must be reviewed before recording a deed.
          </p>

          <h2 className="text-2xl sm:text-3xl">What an LLC actually does</h2>
          <p>
            An LLC can provide a <strong>liability-separation layer</strong>,
            but it does not guarantee that a claim stays inside the entity.
            State law, personal conduct or guarantees, capitalization,
            formalities, commingling, insurance, and the pleaded claims all
            matter. Treat the entity as one risk-control layer, not a substitute
            for counsel or appropriate coverage.
          </p>
          <p>
            What an LLC is <strong>not</strong> is a tax strategy. A
            single-member LLC is a &quot;disregarded entity&quot; for federal
            taxes — your rental income and expenses land on{" "}
            <Link
              href="/blog/schedule-e-rental-property"
              className="text-primary font-semibold hover:underline"
            >
              Schedule E
            </Link>{" "}
            exactly as they would if you owned it in your own name. A
            multi-member LLC files a partnership return and passes income
            through via K-1. Either way, there&apos;s no LLC-specific tax cut —
            the{" "}
            <Link
              href="/blog/rental-property-tax-deductions"
              className="text-primary font-semibold hover:underline"
            >
              deductions
            </Link>{" "}
            and depreciation are the same. Anyone pitching an LLC as a tax dodge
            is selling something.
          </p>

          <h2 className="text-2xl sm:text-3xl">
            The due-on-sale trap (read this before you transfer anything)
          </h2>
          <p>
            Here&apos;s the mistake that catches people: you already own a
            rental with a mortgage in your personal name, you read that you
            &quot;should&quot; have an LLC, so you deed the property into a new
            LLC. That transfer can{" "}
            <strong>trigger the due-on-sale clause</strong> in your mortgage —
            the provision that lets the lender demand the entire balance when
            the property changes hands.
          </p>
          <p>
            The federal <strong>Garn-St. Germain Act</strong> protects a list of
            transfers from due-on-sale enforcement — most usefully, moving a
            property into a <em>revocable living trust</em> where you remain a
            beneficiary. But that list{" "}
            <strong>does not include transfers to an LLC</strong>. A move from
            you to your own single-member LLC is, on paper, a transfer the
            lender can act on.
          </p>
          <p>
            Whether and when a lender enforces the clause is lender- and
            fact-specific; payment status does not waive the contractual option.
            Safer review steps include:
          </p>
          <ul>
            <li>
              <strong>Buy in the LLC from day one</strong> with a DSCR or
              commercial loan — no transfer, no trigger.
            </li>
            <li>
              <strong>Get written consent</strong> from your lender before
              transferring an existing mortgaged property.
            </li>
            <li>
              <strong>Understand the trust route</strong> and its limits with an
              attorney if your goal is estate planning rather than liability
              isolation.
            </li>
          </ul>

          <h2 className="text-2xl sm:text-3xl">
            Financing changes inside an LLC
          </h2>
          <p>
            Standard owner-occupant conventional loans (Fannie/Freddie) go to
            individuals, not LLCs. To hold title in an LLC you generally use a{" "}
            <Link
              href="/blog/dscr-loans-explained"
              className="text-primary font-semibold hover:underline"
            >
              DSCR loan
            </Link>
            , a commercial/portfolio loan, or a small-bank product — usually at
            a slightly higher rate, often with a personal guarantee. That
            premium is part of the cost of the structure, and it&apos;s another
            reason buying in the entity from the start beats transferring later.
          </p>

          <h2 className="text-2xl sm:text-3xl">
            The 2026 Corporate Transparency Act reversal
          </h2>
          <p>
            If you researched LLCs in 2024, you probably read that every small
            LLC had to file a{" "}
            <strong>beneficial ownership information (BOI)</strong> report with
            FinCEN. That changed. A FinCEN interim final rule issued in
            <strong> March 2025</strong> removed the BOI reporting requirement
            for
            <strong> U.S.-formed companies and U.S. persons</strong> under the
            Corporate Transparency Act — only foreign-formed entities registered
            to do business in the U.S. still report. So a domestic rental LLC,
            as of 2026, generally has <strong>no federal BOI filing</strong>.
          </p>
          <p>
            Two caveats: this area has whipsawed through courts and rulemaking,
            so confirm current FinCEN guidance before you rely on it; and some
            states (New York, for one) have passed their own transparency rules.
            It&apos;s a &quot;check the date&quot; topic — which is exactly why
            most older articles on it are now wrong.
          </p>

          <h2 className="text-2xl sm:text-3xl">Anonymity and structure</h2>
          <p>
            A few states — Wyoming, New Mexico, Delaware — allow LLCs that
            don&apos;t publicly list members, which investors use for privacy (a
            tenant or litigant can&apos;t pull your name off the deed as
            easily). Some build a holding-company structure: anonymous parent
            LLC owning property-level LLCs. This is real, but it adds cost and
            complexity, and registering a foreign LLC back into your operating
            state can undo some of the privacy. Worthwhile for larger
            portfolios; overkill for a first duplex.
          </p>

          <h2 className="text-2xl sm:text-3xl">The cost and the discipline</h2>
          <p>
            An LLC isn&apos;t free or zero-maintenance: formation fees, annual
            report/franchise fees (California&apos;s $800/yr minimum is the
            famous one), a registered agent, and — most importantly — the
            discipline to keep it legitimate. A separate bank account, no
            commingling of personal and rental money, the property actually
            titled in the LLC, and proper leases in the LLC&apos;s name. Skip
            that and a court can support a veil-piercing or direct-liability
            argument, depending on state law and the facts.
          </p>

          <h2 className="text-2xl sm:text-3xl">So when is it worth it?</h2>
          <p>A reasonable framework:</p>
          <ul>
            <li>
              <strong>Lean toward an LLC</strong> as your equity and net worth
              grow, once you hold multiple properties, or with higher-liability
              situations — the more you have to lose, the more the shield is
              worth.
            </li>
            <li>
              <strong>It&apos;s less urgent</strong> for a brand-new investor
              with one property and little equity, where a strong landlord
              policy plus an umbrella does much of the same job at lower cost
              and friction.
            </li>
          </ul>
          <p>
            Think of it as layers: your first line of defense is a solid{" "}
            <Link
              href="/blog/rental-property-insurance"
              className="text-primary font-semibold hover:underline"
            >
              landlord and umbrella insurance
            </Link>{" "}
            policy; an LLC may add a second layer whose scope depends on state
            law and how it is maintained. Confirm the structure and coverage
            with qualified local professionals.
          </p>

          <div className="not-prose"></div>

          <p>
            Your ownership structure doesn&apos;t change whether a property is a
            good deal — but the financing it forces (DSCR vs conventional) does.
            Run the numbers in{" "}
            <Link
              href="/"
              className="text-primary font-semibold hover:underline"
            >
              TrueCap
            </Link>{" "}
            with the loan you&apos;d actually use so the rate premium of an
            LLC-held property shows up in your cash flow and{" "}
            <Link
              href="/glossary/dscr"
              className="text-primary font-semibold hover:underline"
            >
              DSCR
            </Link>{" "}
            before you commit.
          </p>

          <h2 className="text-2xl sm:text-3xl">FAQ</h2>
          {FAQS.map((f, i) => (
            <details
              key={i}
              className="not-prose bg-card border border-border rounded-xl p-4 sm:p-5 mb-3"
            >
              <summary className="cursor-pointer font-bold text-foreground">
                {f.q}
              </summary>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {f.a}
              </p>
            </details>
          ))}

          <p className="text-sm text-muted-foreground">
            <Scale className="inline w-4 h-4 mr-1 align-text-bottom" />
            General educational information, not legal or tax advice. Entity
            choice, asset-protection law, and reporting rules vary by state and
            change often — work with a qualified attorney and CPA for your
            situation.
          </p>
        </article>
        <RelatedContent kind="blog" slug={SLUG} title={TITLE} className="mt-10" />

        <RelatedBlogPosts currentSlug={SLUG} />
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <NewsletterSignup variant="expanded" source="blog" />
        </div>

        <footer className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Related:{" "}
            <Link
              href="/blog/rental-property-insurance"
              className="font-bold text-foreground hover:underline"
            >
              Rental property insurance →
            </Link>{" "}
            ·{" "}
            <Link
              href="/blog/schedule-e-rental-property"
              className="font-bold text-foreground hover:underline"
            >
              Schedule E walkthrough →
            </Link>{" "}
            ·{" "}
            <Link
              href="/blog/dscr-loans-explained"
              className="font-bold text-foreground hover:underline"
            >
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
