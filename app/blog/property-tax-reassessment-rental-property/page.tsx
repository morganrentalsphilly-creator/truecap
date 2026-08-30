/**
 * Blog post: property tax reassessment when you buy a rental.
 *
 * Targets queries: "property tax reassessment rental property", "will my
 * property taxes go up after buying a rental", "property taxes after
 * buying investment property", "reassessment upon sale", "supplemental
 * property tax bill", "how to estimate property taxes rental", "seller's
 * tax bill wrong".
 *
 * Angle: the single most common rookie underwriting error is copying the
 * seller's property-tax line off the listing. A sale usually resets the
 * assessed value toward the purchase price (and strips any owner-occupant
 * exemption), so the real bill is higher — often enough to flip a thin
 * deal negative. On-brand for TrueCap, whose enrichment pulls the
 * state-level effective tax rate rather than the seller's stale number.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "property-tax-reassessment-rental-property";
const TITLE =
  "Property tax reassessment: don't underwrite the seller's tax bill (2026)";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Property tax reassessment for rentals (2026)";
const DESCRIPTION =
  "Buying a rental usually resets property taxes toward your purchase price. Why the seller's bill misleads and how to estimate the real number before you buy.";
const PUBLISHED_AT = "2026-06-27";
const MODIFIED_AT = "2026-06-27";
const READING_TIME = 10;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "property tax reassessment rental property",
    "will property taxes go up after buying a rental",
    "property taxes after buying investment property",
    "reassessment upon sale",
    "supplemental property tax bill",
    "how to estimate property taxes rental",
    "California Prop 13 reassessment",
    "seller tax bill underwriting",
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
    q: "Will my property taxes go up when I buy a rental?",
    a: "Usually yes. In most jurisdictions a sale is a triggering event: the assessor resets the assessed value toward your purchase price, and as a landlord you lose any homestead or owner-occupant exemption the previous owner enjoyed. How big the jump is depends on your county's rules and how stale the prior assessment had become — a long-held property that was assessed years ago can see taxes rise sharply once it changes hands.",
  },
  {
    q: "Why is the seller's property tax bill lower than what I'll pay?",
    a: "Because the seller's bill reflects an assessed value that may be years out of date. Many states cap how fast an existing owner's assessment can rise, so a property held for a decade can be assessed well below market. The bill may also include a homestead or owner-occupant exemption that does not transfer to an investor. After the sale, the assessment resets toward market or purchase price and the exemption falls away, so your bill is typically higher than the number printed on the listing.",
  },
  {
    q: "How do I estimate property taxes on a rental before I buy?",
    a: "Take your expected purchase price and multiply it by the local effective property tax rate — the all-in rate after assessment ratios and exemptions, which you can get from the county assessor or by dividing a recently sold comparable's tax bill by its sale price. For example, a $400,000 purchase in a 1.5% market should be underwritten at roughly $6,000 a year, not the seller's $3,400. Do not use the seller's current bill as your forecast.",
  },
  {
    q: "What is a supplemental property tax bill?",
    a: "In reassessment-on-sale states such as California, after you close the assessor issues a one-time supplemental bill for the difference between the old and new assessed value, prorated over the remainder of the tax year — and it arrives on top of the regular bill. It is easy to miss because it shows up months after closing. Budget for it as a first-year cash item so it does not surprise you.",
  },
  {
    q: "Does buying through an LLC avoid reassessment?",
    a: "Generally no. A straight purchase is a change of ownership whether you take title personally or through an LLC you control, and a change of ownership is what triggers the reassessment. Certain transfers — some intra-family transfers, or proportional-interest changes that keep the same owners — can be exempt in specific states, but those are narrow exceptions to a general rule. Confirm the treatment with your county assessor and a local attorney before assuming any structure avoids the reset.",
  },
];

export default function PropertyTaxReassessmentPost() {
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
              The property-tax line on a listing is one of the largest operating
              expenses in a rental underwrite — and one of the most quietly
              wrong. The number you see is the <em>seller&apos;s</em> bill, set
              against an assessed value that may be a decade stale and may carry
              an owner-occupant break you will never get. Buy the property and
              the assessor resets the clock toward what you paid. Copy that
              listing figure into your pro forma and you can &quot;win&quot; a
              deal on paper that loses money the moment the real tax bill lands.
              Here is why it happens, how much it can move, and how to
              underwrite the number you will actually pay.
            </p>
          </header>

          <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Assessed value is not market value
            </h2>
            <p>
              Property taxes are charged on a property&apos;s{" "}
              <strong>assessed value</strong>, which is the county&apos;s
              number, not the market&apos;s. Assessed value drifts away from
              what a property is actually worth for two everyday reasons. First,
              most states cap how fast an existing owner&apos;s assessment can
              climb — California limits the annual increase to 2%, and many
              other states run their own caps or reassess only every few years.
              A property held since 2014 can be carried on the rolls at a value
              that has nothing to do with 2026 prices. Second, owner-occupants
              often receive a <strong>homestead exemption</strong> that shaves a
              fixed amount off the taxable value — a benefit that does not apply
              to a rental.
            </p>
            <p>
              So the seller&apos;s low tax bill is not a market quirk you get to
              inherit. It is the product of a capped, possibly years-old
              assessment plus an exemption you do not qualify for. The bill is
              real, but it describes the seller&apos;s situation, not yours.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              What a sale actually triggers
            </h2>
            <p>
              In most jurisdictions a change of ownership is a{" "}
              <strong>reassessment event</strong>. The recorded sale tells the
              assessor what the property is worth — you just proved it by paying
              for it — and the assessed value is reset upward toward that price.
              Exactly how this plays out depends on where you buy, and the
              mechanics fall into a few patterns worth recognizing:
            </p>
            <p>
              <strong>Acquisition-value states.</strong> California&apos;s
              Proposition 13 is the cleanest example: when you buy, the assessor
              sets a new base-year value equal to your purchase price, then caps
              growth at 2% a year going forward. The reset can be dramatic
              because you are replacing a base that may date back decades.
              Michigan &quot;uncaps&quot; taxable value to the state equalized
              value on transfer; Florida&apos;s Save Our Homes cap likewise
              resets when a homesteaded property sells or converts to a rental.
              In all of these, the sale itself is the moment the number jumps.
            </p>
            <p>
              <strong>Cyclical-reassessment states.</strong> Many states
              reassess on a schedule — annually, or every two, three, or five
              years — regardless of sales, but a recent sale gives the assessor
              a fresh, defensible value to apply at the next cycle. The danger
              here is timing: you may pay the old, low figure for your first
              year, then watch it leap when the cycle catches up. Underwriting
              the first-year bill as if it were permanent is a trap.
            </p>
            <p>
              Either way, the practical rule is the same: assume a purchase
              resets your taxes toward your purchase price, and treat any year
              you pay less as a temporary gift, not the baseline.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The formula — and the shortcut
            </h2>
            <p>The full mechanic is three numbers multiplied together:</p>
            <div className="rounded-xl border border-border bg-muted/30 p-5">
              <code className="text-sm sm:text-base text-foreground font-mono">
                Annual tax = Assessed value × Assessment ratio × Mill rate
              </code>
            </div>
            <p>
              The <strong>assessment ratio</strong> is the fraction of market
              value a county taxes (some assess at 100%, others at 10% or 35%),
              and the <strong>mill rate</strong> (or millage) is the tax per
              dollar of that taxable base. You can chase all three down at the
              assessor&apos;s office — and for a precise budget you eventually
              should — but for underwriting there is a faster move that folds
              them into one number:
            </p>
            <div className="rounded-xl border border-border bg-muted/30 p-5">
              <code className="text-sm sm:text-base text-foreground font-mono">
                Real annual tax ≈ Purchase price × Local effective tax rate
              </code>
            </div>
            <p>
              The <strong>effective tax rate</strong> is taxes actually paid
              divided by market value — it already bakes in the assessment ratio
              and the loss of an owner-occupant exemption. You can pull it from
              the county, or back it out yourself: find a comparable property
              that sold recently, divide its post-sale tax bill by its sale
              price, and you have a clean rate to apply to your own deal.
              Effective rates run roughly from 0.3% in the lowest states to well
              over 2% in the highest, so this is a local number, not a national
              one.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              A worked example: the duplex that flips negative
            </h2>
            <p>
              Take a $400,000 duplex. You put 25% down ($100,000) and finance
              $300,000 at 7.5% over 30 years — about par for an investment loan
              in mid-2026. That principal-and-interest payment is roughly $2,098
              a month, or about $25,170 a year (check it on the{" "}
              <Link
                href="/tools/mortgage-payment-calculator"
                className="text-primary font-semibold hover:underline"
              >
                mortgage payment calculator
              </Link>
              ). Each side rents for $1,600, so gross potential rent is $3,200 a
              month — $38,400 a year — and at a 5% vacancy assumption you
              collect about $36,480. Outside of taxes, the property costs $7,800
              a year to run: insurance, repairs, capital reserves, and
              water/lawn/admin.
            </p>
            <p>
              The listing shows property taxes of <strong>$3,400</strong> — the
              seller has owned since 2015 and lives in one unit. You, the
              investor, will be reassessed toward your $400,000 purchase price;
              at this market&apos;s 1.5% effective rate that is{" "}
              <strong>$6,000</strong> a year. One line item, wrong by $2,600.
              Here is what that single number does to the whole underwrite:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left">Annual figure</th>
                    <th className="text-right">Seller&apos;s bill ($3,400)</th>
                    <th className="text-right">Reassessed ($6,000)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Effective gross income</td>
                    <td className="text-right">$36,480</td>
                    <td className="text-right">$36,480</td>
                  </tr>
                  <tr>
                    <td>Operating expenses</td>
                    <td className="text-right">$11,200</td>
                    <td className="text-right">$13,800</td>
                  </tr>
                  <tr>
                    <td>Net operating income</td>
                    <td className="text-right">$25,280</td>
                    <td className="text-right">$22,680</td>
                  </tr>
                  <tr>
                    <td>Cap rate</td>
                    <td className="text-right">6.32%</td>
                    <td className="text-right">5.67%</td>
                  </tr>
                  <tr>
                    <td>Debt service</td>
                    <td className="text-right">$25,170</td>
                    <td className="text-right">$25,170</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>DSCR</strong>
                    </td>
                    <td className="text-right">
                      <strong>1.00</strong>
                    </td>
                    <td className="text-right">
                      <strong>0.90</strong>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Cash flow / month</strong>
                    </td>
                    <td className="text-right">
                      <strong>+$9</strong>
                    </td>
                    <td className="text-right">
                      <strong>−$208</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p>
              On the seller&apos;s bill the deal looks like a thin but real
              winner: a 6.3%{" "}
              <Link
                href="/#main"
                className="text-primary font-semibold hover:underline"
              >
                cap rate
              </Link>
              , a{" "}
              <Link
                href="/#main"
                className="text-primary font-semibold hover:underline"
              >
                DSCR
              </Link>{" "}
              right at 1.00, and a few dollars of monthly cash flow. Underwrite
              the tax bill you will actually pay and{" "}
              <Link
                href="/blog/how-to-calculate-noi-rental-property"
                className="text-primary font-semibold hover:underline"
              >
                net operating income
              </Link>{" "}
              drops $2,600, the cap rate sheds nearly two-thirds of a point,
              DSCR falls to 0.90 — below the 1.20 floor most lenders want and
              below the 1.0 line where the property stops covering its own loan
              — and cash flow swings from +$9 to −$208 a month. Same building,
              same rent, same price. The only thing that changed was using an
              honest tax number, and it turned a deal you would sign into one
              you would walk from.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The cash you forget at closing: the supplemental bill
            </h2>
            <p>
              In reassessment-on-sale states there is a second, smaller
              surprise. The annual bill resets at the next cycle, but the county
              also wants the difference between the old and new assessment for
              the part of the year you already own the place. That comes as a
              one-time <strong>supplemental tax bill</strong> (California&apos;s
              name; other states call it an escape or omitted assessment), and
              it lands weeks or months after closing — long after most buyers
              have stopped watching for new costs. On our duplex, a $2,600
              annual increase prorated over, say, eight remaining months is
              roughly $1,700 of first-year cash you did not plan for. It is not
              a recurring expense, so it does not belong in your operating
              numbers, but it absolutely belongs in your{" "}
              <Link
                href="/blog/closing-costs-investment-property"
                className="text-primary font-semibold hover:underline"
              >
                cash-to-close and first-year reserves
              </Link>
              .
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              How to get the real number before you write the offer
            </h2>
            <p>
              You do not need the assessor to bless your figure before you make
              an offer — you need a defensible estimate, and there are three
              reliable ways to build one. The fastest is the effective-rate
              shortcut above: purchase price × the local effective tax rate. The
              most accurate is to pull a{" "}
              <strong>recently sold comparable</strong> — a property that
              changed hands in the last year or two, already reassessed — and
              divide its current tax bill by its sale price; that rate has the
              reset already priced in. And the most authoritative is to call the
              county assessor with the parcel number and ask what the property
              will be assessed at on a sale at your price, and what the current
              mill rate is. Do at least the first two on every deal; do the
              third before you remove contingencies.
            </p>
            <p>
              A few traps to avoid while you are at it. Do not assume an LLC or
              a clever title structure dodges the reassessment — a purchase is a
              change of ownership regardless of who signs. Do not forget that
              the
              <strong> exemptions vanish</strong> along with the low assessment:
              a homestead, senior, or veteran exemption the seller held does not
              transfer to a landlord, and stripping it can raise the bill even
              before the value resets. And do not treat a low first-year bill in
              a cyclical state as your run-rate — find out when the next
              reassessment hits and underwrite to the post-reset number.
            </p>
            <p>
              This is the same discipline that makes the difference on every
              soft expense line. Taxes, like{" "}
              <Link
                href="/blog/rental-property-insurance"
                className="text-primary font-semibold hover:underline"
              >
                insurance
              </Link>
              , are big, lumpy, and easy to copy wrong from a listing — and both
              are exactly where an optimistic number hides a bad deal. Run the
              honest figure through the free{" "}
              <Link
                href="/#main"
                className="text-primary font-semibold hover:underline"
              >
                TrueCap analyzer
              </Link>{" "}
              and you see the cap rate the property really earns, not the one
              the seller&apos;s tax history flatters.
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
              The property-tax line on a listing is the seller&apos;s number,
              not yours, and underwriting to it is one of the most expensive
              shortcuts in the business. A purchase usually resets the
              assessment toward what you paid and strips the owner-occupant
              breaks you never qualified for, so the bill you inherit is almost
              always higher than the bill you see. Estimate it the right way —
              purchase price times the local effective rate, cross-checked
              against a recently sold comp — and budget the supplemental bill as
              a closing-year cost. The full{" "}
              <Link
                href="/"
                className="text-primary font-semibold hover:underline"
              >
                TrueCap analyzer
              </Link>{" "}
              keeps tax as a manual local input rather than copying the
              seller&apos;s figure, then re-runs cap rate, DSCR, and cash flow
              on the evidence you enter — so you find out a deal is fragile
              before you sign, not when the first real tax bill arrives. None of
              this is tax advice; confirm your specific assessment and
              exemptions with the county and a local professional before you
              close.
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
