/**
 * Blog post: PITI explained for rental properties.
 *
 * Targets queries: "PITI", "what is PITI", "PITI meaning", "how to
 * calculate PITI", "PITI investment property", "PITI vs PITIA",
 * "does PITI include HOA", "PITI escrow", "is PITI the same as my
 * mortgage payment".
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "piti-explained-rental-property";
const TITLE = "PITI explained: the real monthly payment on a rental (2026)";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "PITI explained: a rental's real payment (2026)";
const DESCRIPTION =
  "PITI — principal, interest, taxes, insurance — is a rental's real monthly payment. How to estimate each part, handle escrow, and turn it into DSCR.";
const PUBLISHED_AT = "2026-06-20";
const MODIFIED_AT = "2026-08-15";
const READING_TIME = 11;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "PITI",
    "what is PITI",
    "PITI meaning",
    "how to calculate PITI",
    "PITI investment property",
    "PITI vs PITIA",
    "does PITI include HOA",
    "PITI escrow",
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
    q: "What does PITI stand for?",
    a: "PITI is principal, interest, taxes, and insurance — the four parts of the payment a lender collects each month on a mortgaged property. Principal and interest pay down the loan; taxes and insurance are usually collected into an escrow account and paid out by the servicer when the bills come due. PITI is the number that actually leaves your bank account, which is why it — not bare principal and interest — is the right figure to underwrite a rental on.",
  },
  {
    q: "What is the difference between PITI and PITIA?",
    a: "PITIA adds an 'A' for association dues (HOA or condo fees). Plain PITI is correct for a single-family house with no HOA. The moment there is an HOA, condo, or co-op fee, lenders fold it into the housing payment and call it PITIA. DSCR lenders almost always quote PITIA because the association fee is a mandatory carrying cost the rent has to cover. If your property has no HOA, PITI and PITIA are the same number.",
  },
  {
    q: "Does an investment property require escrow or PMI?",
    a: "PMI (private mortgage insurance) generally does not apply to investment-property loans, because you almost always put at least 20-25% down, keeping the loan-to-value at or below 80%. Escrow is a separate question: many conventional investment loans require it, while a lot of DSCR and portfolio loans let you waive escrow (sometimes for a small rate bump) and pay taxes and insurance yourself. Waiving escrow does not lower your cost — it just moves the timing onto you, so budget the same monthly amount into a reserve.",
  },
  {
    q: "Is PITI the same as my total monthly cost on a rental?",
    a: "No — PITI is the floor, not the all-in. It captures the loan payment plus taxes and insurance, but leaves out vacancy, maintenance, capital reserves, and property management — roughly 25-40% of rent on a typical buy-and-hold. Underwriting a rental on PITI alone is the most common way investors talk themselves into a deal that loses money each month.",
  },
  {
    q: "Why did my fixed-rate payment go up if PITI is fixed?",
    a: "Only the principal-and-interest slice of PITI is fixed on a fixed-rate loan. Taxes and insurance drift — property taxes get reassessed and insurance premiums climb almost every year. Each year the servicer runs an escrow analysis; if taxes or insurance rose, your escrow comes up short and the monthly payment is raised to refill it (often plus a catch-up for the prior shortage). A 'fixed' mortgage payment is only fixed on two of its four letters.",
  },
];

export default function PitiExplainedPost() {
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
        <article>
          <div className="mb-2">
            <Link
              href="/blog"
              className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground"
            >
              ← Blog
            </Link>
          </div>
          <header className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight tracking-tight text-balance">
              {TITLE}
            </h1>
            <p className="mt-3 text-[11px] uppercase tracking-widest text-muted-foreground font-bold">
              {new Date(PUBLISHED_AT).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}{" "}
              · {READING_TIME} min read
            </p>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              Almost every mortgage calculator hands you a
              principal-and-interest number and calls it your payment. It
              isn&apos;t. The amount that actually leaves your account each
              month is PITI — principal, interest, taxes, and insurance — and on
              a typical rental the two letters most calculators ignore add a
              quarter to a third on top of the loan payment. Here&apos;s how
              each piece works with 2026 numbers, and how PITI becomes the input
              for DSCR, break-even, and cash flow.
            </p>
          </header>

          <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              What PITI stands for
            </h2>
            <p>
              PITI breaks the housing payment into four parts:{" "}
              <strong>P</strong>rincipal, <strong>I</strong>nterest,{" "}
              <strong>T</strong>axes, and <strong>I</strong>nsurance. The first
              two are the loan: principal pays down what you borrowed, interest
              is the lender&apos;s charge for the money. The second two are the
              cost of owning the asset regardless of how it&apos;s financed:
              property taxes go to the county, and a hazard/landlord insurance
              premium protects the building. Lenders bundle all four because all
              four have to be paid for the loan to stay current — an unpaid tax
              bill becomes a lien that outranks the mortgage, and a lapsed
              policy leaves their collateral uninsured.
            </p>
            <p>
              You will also see <strong>PITIA</strong> — the same thing with an{" "}
              <strong>A</strong> for association dues (HOA, condo, or co-op
              fees). If the property has no HOA, PITI and PITIA are identical.
              The moment there is a mandatory association fee, it joins the
              housing payment, and lenders — especially DSCR lenders — quote
              PITIA because that fee is a carrying cost the rent must cover.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The worked example: a $250k single-family rental
            </h2>
            <p>
              Take a $250,000 single-family rental bought as a
              non-owner-occupied investment with 25% down ($62,500), financing
              $187,500 on a 30-year fixed at 7%. Here is the full PITI, built
              one letter at a time.
            </p>
            <p>
              <strong>Principal &amp; interest.</strong> $187,500 at 7% over 30
              years works out to about <strong>$1,247/month</strong>. (Quick
              mental math: $100k at 7% for 30 years is ~$665/month, so 1.875 ×
              $665 ≈ $1,247.) Early on, the split is lopsided — in month one
              roughly $1,094 of that is interest and only $153 is principal —
              but the total stays flat for the life of the loan. Check any rate
              and term with the{" "}
              <Link
                href="/tools/mortgage-payment-calculator"
                className="text-primary font-semibold hover:underline"
              >
                mortgage payment calculator
              </Link>
              .
            </p>
            <p>
              <strong>Taxes.</strong> Property tax varies wildly by state and
              county — from under 0.5% of value a year (Hawaii, Alabama) to over
              2% (New Jersey, Illinois, parts of Texas). At a 1.2% effective
              rate on $250,000, that&apos;s $3,000/year, or{" "}
              <strong>$250/month</strong>. Verify the parcel&apos;s current
              assessment, exemptions, millage, and reassessment rules with the
              county assessor or treasurer before trusting the number on the
              listing.
            </p>
            <p>
              <strong>Insurance.</strong> A landlord policy (a DP-3 dwelling
              policy, not the homeowner&apos;s HO-3 you&apos;d buy for your own
              house) typically runs more than an owner-occupied quote because it
              adds loss-of-rent coverage and liability for tenant claims. Call
              it $1,800/year, or <strong>$150/month</strong>. In coastal or
              wildfire-exposed markets it can be multiples of that, and rising
              premiums are one of the biggest line-item surprises of the last
              few years.
            </p>
            <p>
              Add it up: $1,247 + $250 + $150 ={" "}
              <strong>$1,647/month PITI</strong>. The taxes-and-insurance slice
              is $400 — about{" "}
              <strong>32% on top of the $1,247 loan payment.</strong> An
              investor who underwrote this deal on principal and interest alone
              just understated the real payment by nearly a third before a
              single repair or vacancy.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              How escrow actually works
            </h2>
            <p>
              You don&apos;t write the county a check once a year. With an
              escrow (impound) account, the servicer collects one-twelfth of
              your annual taxes and insurance every month alongside principal
              and interest, holds it, and pays the bills when they come due. On
              our deal that escrow portion is the $400/month — $250 toward the
              $3,000 tax bill, $150 toward the $1,800 premium.
            </p>
            <p>
              Two mechanics trip people up. First, the{" "}
              <strong>escrow cushion</strong>: federal rules (RESPA) let the
              servicer keep up to two months of T&amp;I as a buffer, which is
              why you pre-fund several months of escrow at closing on top of
              your down payment — it shows up in prepaids on the settlement
              statement, covered in the{" "}
              <Link
                href="/blog/closing-costs-investment-property"
                className="text-primary font-semibold hover:underline"
              >
                closing costs breakdown
              </Link>
              . Second, the <strong>annual escrow analysis</strong>: once a year
              the servicer reconciles what it collected against what it paid. If
              taxes or insurance rose — they almost always do — your account is
              short, and the servicer raises your monthly payment to refill it,
              often adding a catch-up for the prior shortfall. That is how a
              &quot;fixed-rate&quot; mortgage payment goes up: the P&amp;I never
              moved, but the T&amp;I did.
            </p>
            <p>
              Many DSCR and portfolio loans let investors{" "}
              <strong>waive escrow</strong> and pay taxes and insurance
              directly, sometimes for a small rate add-on. That doesn&apos;t
              lower the cost — it just hands you the timing risk. Whether
              escrowed or not, the $400 is part of your monthly carry.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The reassessment trap on the tax line
            </h2>
            <p>
              The most expensive PITI mistake is copying the property-tax figure
              straight off the listing or the seller&apos;s last bill. In many
              jurisdictions the assessed value resets toward your{" "}
              <em>purchase price</em> after a sale. If the current owner has
              held the place for fifteen years, their assessment — and their tax
              bill — can be far below what yours will be the year after you buy.
            </p>
            <p>
              Suppose the seller&apos;s bill reflects a $150,000 assessment at
              1.2% — $1,800/year, or $150/month. You pay $250,000, the county
              reassesses to something near that, and your bill jumps to
              ~$3,000/year. That &quot;$150&quot; tax line you underwrote is
              actually $250, and your PITI just rose by $100/month — $1,200 a
              year straight off the bottom line. Always underwrite taxes on{" "}
              <em>your</em> purchase price and the local rate — not the
              seller&apos;s legacy assessment — and check how your state handles
              reassessment on transfer.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              How investment-property PITI differs from a primary residence
            </h2>
            <p>
              The four letters are the same, but the numbers behind them shift
              when the property is a rental:
            </p>
            <ul>
              <li>
                <strong>Higher interest rate.</strong> Non-owner-occupied loans
                price roughly 0.5–0.75 percentage points above an owner-occupied
                rate for the same borrower — that alone adds about $75–115/month
                to the P&amp;I on a $187,500 loan.
              </li>
              <li>
                <strong>Bigger down payment, usually no PMI.</strong> Investment
                loans want 20–25% down (more on 2–4 units), which keeps you at
                or below 80% LTV and sidesteps private mortgage insurance.
                House-hackers on an owner-occupied loan are the exception — less
                down, but PMI until they reach ~20% equity.
              </li>
              <li>
                <strong>Pricier insurance.</strong> A landlord DP-3 with
                loss-of-rent and liability coverage costs more than a comparable
                homeowner&apos;s policy.
              </li>
              <li>
                <strong>Lenders quote PITIA and judge it against rent.</strong>{" "}
                On a primary residence the lender checks PITI against your
                income (the front-end ratio). On a rental — especially with a
                DSCR loan — the lender checks PITIA against the property&apos;s
                rent. That changes PITI from a number you simply pay into the
                number that decides how much you can borrow.
              </li>
            </ul>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              From PITI to DSCR
            </h2>
            <p>
              Some DSCR programs use a rent-to-PITIA ratio, while other lender
              and investor formulas differ. In this illustration, our rental
              brings $2,100/month and carries $1,647 of PITI (no HOA, so PITIA
              is the same $1,647):
            </p>
            <p>
              <strong>DSCR = $2,100 ÷ $1,647 = 1.27.</strong>
            </p>
            <p>
              That produces 1.27 under this formula. It does not establish a
              lender threshold, approval, or pricing. If you used only the
              $1,247 P&amp;I, the ratio would be 1.68; adding the stated taxes
              and insurance changes it to 1.27. Ask the lender for its exact
              formula and current requirements. Walk through the full mechanics
              in{" "}
              <Link
                href="/blog/how-to-calculate-dscr"
                className="text-primary font-semibold hover:underline"
              >
                how to calculate DSCR
              </Link>
              , or run a property through the{" "}
              <Link
                href="/#main"
                className="text-primary font-semibold hover:underline"
              >
                TrueCap analyzer
              </Link>
              .
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              PITI is the floor, not the all-in cost
            </h2>
            <p>
              Here&apos;s the line that separates investors who keep their
              properties from the ones who get surprised: PITI is the{" "}
              <em>minimum</em> monthly cost, not the total. It covers the loan,
              taxes, and insurance — but a rental also burns money on vacancy,
              repairs, capital reserves, and management, none of which appear in
              PITI. On our deal, with the same $2,100 rent:
            </p>
            <ul>
              <li>
                <strong>PITI:</strong> $1,647
              </li>
              <li>
                <strong>Vacancy reserve</strong> (5% of rent): $105
              </li>
              <li>
                <strong>Maintenance + CapEx</strong> (10% of rent): $210 — see{" "}
                <Link
                  href="/blog/capex-maintenance-reserves-rental-property"
                  className="text-primary font-semibold hover:underline"
                >
                  how much to budget for reserves
                </Link>
              </li>
              <li>
                <strong>Property management</strong> (8% of rent): $168
              </li>
            </ul>
            <p>
              Total monthly cost with professional management: ~$2,130 — a hair{" "}
              <em>above</em> the $2,100 rent, so the deal runs about{" "}
              <strong>−$30/month</strong>. Self-managed, you drop the $168 PM
              fee and net roughly <strong>+$138/month</strong>. Same property,
              same PITI; the difference between a small loss and a thin profit
              is entirely in the costs PITI never showed you. The lender was
              happy at 1.27 DSCR — DSCR only looks at PITIA — which is exactly
              why a loan approval is not the same thing as a good deal.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Break-even: how much rent does PITI demand?
            </h2>
            <p>
              Flip the question around. With self-management and the reserve
              assumptions above, your fixed monthly outflow is the $1,647 PITI
              plus $315 of vacancy and reserves — about $1,962. That&apos;s your{" "}
              <strong>break-even rent</strong>: below it the property bleeds,
              above it it earns. At $2,100 you&apos;re $138 over the line; a
              single percentage point of extra vacancy or a $40/month insurance
              hike at renewal eats a big slice of that margin. The{" "}
              <Link
                href="/tools/break-even-calculator"
                className="text-primary font-semibold hover:underline"
              >
                break-even calculator
              </Link>{" "}
              shows how much cushion sits between your rent and the edge.
            </p>
            <p>
              One caution: PITI mixes financing (P&amp;I) with operating costs
              (T&amp;I). Net operating income does the opposite — it excludes
              the loan but includes taxes and insurance, because NOI measures
              the property before financing. If that distinction is fuzzy, the{" "}
              <Link
                href="/blog/how-to-calculate-noi-rental-property"
                className="text-primary font-semibold hover:underline"
              >
                NOI walkthrough
              </Link>{" "}
              draws the line clearly.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              A quick way to estimate PITI on any listing
            </h2>
            <p>You can get within a few percent in under a minute:</p>
            <ul>
              <li>
                <strong>P&amp;I:</strong> for a 30-year loan at 7%, multiply
                each $100k borrowed by ~$665 (at 6.5%, ~$632; at 7.5%, ~$700).
              </li>
              <li>
                <strong>Taxes:</strong> purchase price × local effective rate ÷
                12. Use ~1.1–1.2% if you don&apos;t know it, then verify.
              </li>
              <li>
                <strong>Insurance:</strong> $1,500–2,400/year for an average
                single-family landlord policy, divided by 12 — higher near
                coasts and in wildfire zones.
              </li>
              <li>
                <strong>Association dues:</strong> add the monthly HOA/condo fee
                if there is one (this is the &quot;A&quot; that turns PITI into
                PITIA).
              </li>
            </ul>
            <p>
              For our $250k example: 1.875 × $665 = $1,247, plus $250 taxes,
              plus $150 insurance = $1,647. The full{" "}
              <Link
                href="/"
                className="text-primary font-semibold hover:underline"
              >
                TrueCap analyzer
              </Link>{" "}
              does this automatically — it pulls a current rate, estimates taxes
              and insurance from the address, layers in vacancy and reserves,
              and returns cash flow, DSCR, and a selected-rule fit in one pass.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              FAQ
            </h2>
            {FAQS.map((f) => (
              <div key={f.q}>
                <h3 className="text-xl font-bold text-foreground mt-6 mb-2">
                  {f.q}
                </h3>
                <p>{f.a}</p>
              </div>
            ))}

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The bottom line
            </h2>
            <p>
              PITI is the honest version of &quot;the payment&quot; — the loan
              plus the two ownership costs that ride with it — and on a rental
              it&apos;s the number your lender underwrites and the floor your
              rent has to clear. Estimate all four letters from your own
              purchase price (not the seller&apos;s old tax bill), remember
              taxes and insurance drift upward, and never confuse PITI with the
              all-in cost: vacancy, maintenance, reserves, and management still
              sit on top. Get PITI right and the rest of the underwrite —{" "}
              <Link
                href="/#main"
                className="text-primary font-semibold hover:underline"
              >
                DSCR
              </Link>
              , break-even, cash flow — falls into place.
            </p>
          </div>
        </article>
      </main>
      <RelatedBlogPosts currentSlug={SLUG} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <NewsletterSignup variant="expanded" source="blog" />
      </div>
      <BlogStickyCta />
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
