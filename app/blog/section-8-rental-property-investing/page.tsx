/**
 * Blog post: Section 8 rentals — how the math actually works.
 *
 * Targets queries: "section 8 rental property", "investing in section 8
 * housing", "section 8 pros and cons for landlords", "how much does
 * section 8 pay landlords", "section 8 payment standard", "is section 8
 * good for landlords", "section 8 underwriting".
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "section-8-rental-property-investing";
const TITLE =
  "Section 8 rentals: how the math actually works in 2026 (pros, cons, underwriting)";
const DESCRIPTION =
  "How Section 8 actually pays in 2026 — payment standards, FMR math, NSPIRE inspections, and the underwriting adjustments that decide whether vouchers pencil.";
const PUBLISHED_AT = "2026-06-10";
const MODIFIED_AT = "2026-06-10";
const READING_TIME = 11;

export const metadata: Metadata = {
  title: `${TITLE} | TrueCap`,
  description: DESCRIPTION,
  keywords: [
    "section 8 rental property",
    "investing in section 8 housing",
    "section 8 pros and cons for landlords",
    "how much does section 8 pay landlords",
    "section 8 payment standard",
    "fair market rent section 8",
    "is section 8 good for landlords",
    "section 8 underwriting",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    title: TITLE,
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
    q: "How much does Section 8 pay landlords?",
    a: "Section 8 doesn't pay a fixed amount — it pays the gap between your approved contract rent and the tenant's required portion, which is generally 30% of their adjusted monthly income. Your contract rent is capped by two ceilings: the housing authority's payment standard (set between 90% and 110% of HUD's Fair Market Rent for your area, higher in some ZIP-code-based markets) and a rent reasonableness test against comparable unassisted units nearby. In practice you collect the same total rent as the market supports — you just receive most of it directly from the housing authority each month.",
  },
  {
    q: "Can I charge a Section 8 tenant more than the payment standard?",
    a: "You can set contract rent above the payment standard only if the rent passes the rent reasonableness test and the tenant's total share stays affordable — at initial lease-up, the tenant's portion cannot exceed 40% of their adjusted monthly income. Anything above the payment standard comes out of the tenant's pocket, which makes approval harder and increases default risk on the tenant share. Charging the tenant anything off the books beyond the approved contract rent is program fraud.",
  },
  {
    q: "Do I have to accept Section 8 vouchers?",
    a: "It depends on where the property is. Federally, participation is voluntary for most landlords, but a growing list of states and cities have source-of-income discrimination laws that make refusing a tenant solely because they hold a voucher illegal. Check your state and local rules before you write 'No Section 8' in a listing — in many major markets that sentence is itself a violation.",
  },
  {
    q: "What happens if the tenant doesn't pay their portion of the rent?",
    a: "The housing authority's payment (the HAP) keeps arriving, but the tenant share is your collection risk, just like market-rate rent. You enforce it the same way — notice, then eviction for nonpayment under your state's process. The practical mitigation is screening for the tenant portion specifically: a tenant whose share is $150/month is a very different risk than one whose share is $700/month.",
  },
  {
    q: "What is the NSPIRE inspection and how often does it happen?",
    a: "NSPIRE is HUD's inspection standard (it replaced the older HQS standard) covering health and safety items: working smoke and CO detectors, no exposed wiring, functioning heat, secure entry doors, no serious leaks or mold, intact railings, and similar. Your unit must pass before the housing authority signs the contract and starts paying, and it's re-inspected periodically (commonly every one to two years, with some authorities using risk-based schedules). Failed items get a cure window; uncured items lead to abatement — the housing authority stops paying until you fix them.",
  },
];

export default function Section8RentalPost() {
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
              Section 8 is the most polarizing topic in landlording. One camp swears by government-backed rent that shows up on the first of the month no matter what the economy does; the other tells inspection horror stories and walked away years ago. Both camps are usually arguing about anecdotes. This is the numbers version: how the voucher program actually pays, the two ceilings that cap your rent, what the inspections cost you in time and vacancy, and the specific underwriting adjustments that tell you whether a voucher tenant makes a given deal better or worse.
            </p>
          </header>

          <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              How the program actually pays you
            </h2>
            <p>
              The Housing Choice Voucher program — what everyone calls Section 8 — is run by HUD through roughly 2,000 local public housing authorities (PHAs). The tenant holds the voucher, finds a unit on the open market, and the PHA pays a chunk of the rent directly to you every month. That payment is the <strong>HAP</strong> — Housing Assistance Payment — and it&apos;s the part of the rent that effectively cannot bounce.
            </p>
            <p>
              The split works like this. The tenant generally pays <strong>30% of their adjusted monthly income</strong> toward rent and utilities. The PHA pays the difference between that and your approved contract rent. A tenant with $2,200/month in adjusted income owes about $660; if the contract rent is $1,500, the HAP is $840 and arrives by direct deposit from the housing authority. The tenant&apos;s $660 is your collection risk — the $840 is not.
            </p>
            <p>
              Your contract rent has to clear two separate ceilings before the PHA signs off:
            </p>
            <ul>
              <li>
                <strong>The payment standard.</strong> Each PHA sets a payment standard per bedroom count, pegged between <strong>90% and 110%</strong> of HUD&apos;s published Fair Market Rent (FMR) for the area. In metros that use Small Area FMRs, the standard varies by ZIP code instead of one county-wide number — which can push standards meaningfully higher in better ZIP codes. FMRs are updated every federal fiscal year.
              </li>
              <li>
                <strong>Rent reasonableness.</strong> Independent of the standard, the PHA must verify your asking rent is in line with comparable <em>unassisted</em> units nearby. If market comps support $1,450, you don&apos;t get $1,680 just because the payment standard allows it.
              </li>
            </ul>
            <p>
              The practical translation: Section 8 doesn&apos;t pay you a premium over market — it pays you <em>at</em> market, with most of the check guaranteed. The opportunity shows up in specific situations we&apos;ll get to, not as free extra rent.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The worked example: a $135k single-family with a voucher tenant
            </h2>
            <p>
              Take a 3-bed single-family in a working-class Midwest neighborhood: <strong>$135,000 purchase</strong>, 25% down, $101,250 loan at 7.1% on a 30-year fixed — about <strong>$680/month</strong> in principal and interest.
            </p>
            <p>
              Say the county&apos;s 3-bedroom FMR is $1,680 and the PHA pays a 100% payment standard, so the program ceiling is $1,680. But rent reasonableness comps in the neighborhood support $1,500 — so <strong>$1,500 is your contract rent</strong>. The tenant&apos;s adjusted income works out to a $700/month share; the PHA wires the other <strong>$800</strong> every month.
            </p>
            <p>
              Run the annual numbers: $18,000 gross rent, minus $2,400 property tax, $1,200 insurance, $2,200 maintenance and capex reserves, $1,800 management (10%), and $720 vacancy (4%) — that&apos;s an NOI of about <strong>$9,680</strong>, a <strong>7.2% cap rate</strong>, a DSCR of roughly <strong>1.19</strong>, and cash flow near <strong>$126/month</strong> after debt service. Check the math yourself with the{" "}
              <Link href="/tools/cap-rate-calculator" className="text-primary font-semibold hover:underline">
                cap rate calculator
              </Link>{" "}
              and{" "}
              <Link href="/tools/dscr-calculator" className="text-primary font-semibold hover:underline">
                DSCR calculator
              </Link>
              .
            </p>
            <p>
              Here&apos;s the Section 8 angle on that same deal: the guaranteed $800 HAP alone covers the entire $680 mortgage payment. Even if the tenant&apos;s portion went completely uncollected for a stretch, the property services its own debt. That downside protection — not a higher rent number — is the honest financial case for the program.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The pros, quantified
            </h2>
            <p>
              <strong>Most of the rent can&apos;t default.</strong> In the example above, 53% of gross rent arrives from a government payer regardless of layoffs, recessions, or anything happening in the tenant&apos;s life. For thin-margin deals, that converts the scariest line of the pro forma — collections — into something close to a Treasury coupon.
            </p>
            <p>
              <strong>Economic vacancy collapses after lease-up.</strong> Vouchers are hard to get — waitlists at many PHAs run years and open rarely — so voucher holders who land a decent unit tend to stay. Multi-year tenancies are the norm, which means fewer turnovers, fewer vacancy months, and fewer make-ready bills. If you assume 8% vacancy on a market unit that turns every two years, a voucher tenancy that runs five-plus years can realistically justify half that. Five points of vacancy on $1,500 rent is <strong>$900/year</strong> — real money on a deal clearing $1,500/year. The{" "}
              <Link href="/blog/vacancy-rate-rental-property" className="text-primary font-semibold hover:underline">
                vacancy rate guide
              </Link>{" "}
              walks through how to derive that number from turnover instead of guessing.
            </p>
            <p>
              <strong>Deep demand at the affordable price point.</strong> List a clean 3-bed at FMR-range rent in most metros and the voucher inquiries arrive within hours. Your effective marketing time at turnover approaches zero — and you can screen from a large pool rather than taking the only applicant.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The cons, quantified
            </h2>
            <p>
              <strong>Lease-up drag is real and front-loaded.</strong> Before the first HAP arrives, the PHA has to process the tenant&apos;s paperwork (the RFTA packet), run rent reasonableness, and pass the unit through an NSPIRE inspection. Budget <strong>three to six weeks</strong> from accepted application to first payment, sometimes longer at backlogged authorities. On $1,500 rent that&apos;s <strong>$1,100–$2,250 of one-time lost income</strong> — underwrite it like an extra vacancy point in year one, or like a closing cost.
            </p>
            <p>
              <strong>Inspections have teeth.</strong> The unit is inspected at move-in and then periodically. Failed items get a cure window; if you don&apos;t fix them, the PHA <em>abates</em> — stops paying — until you do. The items are mostly legitimate health-and-safety basics (detectors, railings, wiring, heat, leaks), and a property you&apos;d be proud to rent anyway usually passes. But a C-class unit with deferred maintenance can eat $2,000–$5,000 of repairs just to enter the program — price that into your{" "}
              <Link href="/tools/rehab-cost-estimator" className="text-primary font-semibold hover:underline">
                rehab budget
              </Link>{" "}
              up front.
            </p>
            <p>
              <strong>Rent ceilings cap your upside.</strong> Annual increases require PHA approval and must still pass rent reasonableness. In hot markets where rents jump 8–10% a year, voucher rents typically lag — FMRs reset once a year and comps trail the market. You&apos;re trading upside capture for downside protection. In flat markets that trade costs you almost nothing; in booming ones it&apos;s a genuine cost.
            </p>
            <p>
              <strong>The tenant portion still defaults like normal rent.</strong> The program guarantees the HAP, not the tenant share. Screening still matters — pay history, prior landlord references, and the size of the tenant portion relative to their income. Eviction, when needed, runs through the same state process as any other tenancy, with the same timelines and costs.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The underwriting adjustments that actually matter
            </h2>
            <p>
              Treat a Section 8 underwrite as a normal underwrite with five line-item changes:
            </p>
            <ul>
              <li>
                <strong>Rent = the minimum of three numbers:</strong> the payment standard, rent reasonableness, and true market rent. Look up your county&apos;s FMR on HUD&apos;s site (TrueCap pre-fills HUD Fair Market Rent for single-family deals automatically), then call the PHA for the actual payment standard — it&apos;s public information and a five-minute call.
              </li>
              <li>
                <strong>Vacancy: lower the ongoing rate, add a lease-up haircut.</strong> Something like 4–5% ongoing instead of 8%, plus one extra month in year one for inspection and paperwork lag. Model both with the{" "}
                <Link href="/tools/vacancy-rate-calculator" className="text-primary font-semibold hover:underline">
                  vacancy rate calculator
                </Link>
                .
              </li>
              <li>
                <strong>Maintenance: nudge it up.</strong> Inspection-driven repairs and longer tenancies (less frequent full refreshes, more in-place wear) justify an extra 1–2% of gross rent in reserves.
              </li>
              <li>
                <strong>Rent growth: assume FMR-paced, not market-paced.</strong> Use 2–3% in your projections rather than whatever your metro&apos;s headline rent growth is.
              </li>
              <li>
                <strong>Financing: confirm how your lender treats HAP income.</strong> Most DSCR lenders count Section 8 rent at face value — some actually like the payment history — but ask before you apply rather than after.
              </li>
            </ul>
            <p>
              Then judge the deal on the same metrics as always — cash flow,{" "}
              <Link href="/tools/cash-on-cash-calculator" className="text-primary font-semibold hover:underline">
                cash-on-cash
              </Link>
              , cap rate, DSCR. The program changes the inputs, not the framework. If you need the framework itself, start with{" "}
              <Link href="/blog/how-to-underwrite-a-rental-property-in-60-seconds" className="text-primary font-semibold hover:underline">
                how to underwrite a rental in 60 seconds
              </Link>
              .
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              When Section 8 wins — and when it doesn&apos;t
            </h2>
            <p>
              The program shines in one specific configuration: <strong>lower-priced markets where the payment standard sits at or above achievable market rent</strong>. That&apos;s common in Midwest and Southern metros and in C/B-class neighborhoods of pricier ones. There, you collect full market rent, most of it guaranteed, from tenants who stay for years — the voucher is close to a pure upgrade, paid for with some paperwork and an annual inspection.
            </p>
            <p>
              It&apos;s a poor fit when market rent runs well above the payment standard — typical in A-class neighborhoods and expensive coastal metros without generous Small Area FMRs. There you&apos;d be leaving real rent on the table, and few voucher tenants can bridge the gap within the 40%-of-income cap anyway. It&apos;s also a poor fit for investors whose returns depend on aggressive annual rent increases, or for properties that can&apos;t pass a health-and-safety inspection without a rehab you weren&apos;t planning to do.
            </p>
            <p>
              The way to know which configuration you&apos;re in is to run the deal both ways: once at market rent with normal vacancy, once at the voucher rent with the adjustments above. Drop the property into{" "}
              <Link href="/" className="text-primary font-semibold hover:underline">
                TrueCap
              </Link>{" "}
              twice and compare cash flow, cap rate, cash-on-cash, and DSCR side by side — the spread between the two runs is the honest price (or value) of the voucher. And before you spend that effort, make sure the deal survives the{" "}
              <Link href="/blog/spot-bad-rental-in-60-seconds" className="text-primary font-semibold hover:underline">
                60-second red-flag triage
              </Link>{" "}
              at all — no rent guarantee fixes a bad purchase price.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              FAQs
            </h2>
            {FAQS.map((f) => (
              <div key={f.q}>
                <h3 className="text-xl font-bold text-foreground mt-6 mb-2">
                  {f.q}
                </h3>
                <p>{f.a}</p>
              </div>
            ))}
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
