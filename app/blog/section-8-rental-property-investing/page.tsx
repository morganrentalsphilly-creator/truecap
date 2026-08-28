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
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Section 8 rentals: how the math works in 2026";
const DESCRIPTION =
  "How to verify voucher payment standards, approved rent, tenant share, inspections, timing, and property-level underwriting assumptions.";
const PUBLISHED_AT = "2026-06-10";
const MODIFIED_AT = "2026-08-15";
const READING_TIME = 11;

export const metadata: Metadata = {
  title: SERP_TITLE,
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
    q: "How much does Section 8 pay landlords?",
    a: "Section 8 does not promise a fixed rent. The approved contract rent, utility allowance, tenant share, housing-assistance payment, payment standard, and rent-reasonableness decision are set through the administering housing authority's current process. Obtain the written property- and tenant-specific figures before underwriting income.",
  },
  {
    q: "Can I charge a Section 8 tenant more than the payment standard?",
    a: "Requested rent must satisfy the administering housing authority's current affordability and rent-reasonableness rules. Do not collect amounts outside the approved contract. Ask the PHA to confirm the payment standard, utility allowance, tenant share, and approved rent in writing for the proposed tenancy.",
  },
  {
    q: "Do I have to accept Section 8 vouchers?",
    a: "It depends on the property's jurisdiction and any applicable source-of-income protections or program obligations. Check current state and local rules or qualified local counsel before setting screening or advertising policies.",
  },
  {
    q: "What happens if the tenant doesn't pay their portion of the rent?",
    a: "The tenant share remains collection risk. Housing-assistance payments are governed by the HAP contract and program compliance and can be delayed, adjusted, suspended, or abated in some circumstances. Follow the lease, PHA notices, and current local legal procedure for any nonpayment issue.",
  },
  {
    q: "What is the NSPIRE inspection and how often does it happen?",
    a: "NSPIRE is HUD's inspection framework for covered housing, but the applicable inspection process, timing, cure period, and payment consequences depend on current program and PHA rules. Obtain the current checklist and written local process before estimating lease-up timing or repair cost.",
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
              Voucher rentals attract strong opinions, but anecdotes are not underwriting evidence. This guide shows which written inputs to collect — approved contract rent, payment standard, utility allowance, tenant share, HAP terms, inspection process, and property expenses — and how to compare scenarios without treating any payment as guaranteed.
            </p>
          </header>

          <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              How the program actually pays you
            </h2>
            <p>
              The Housing Choice Voucher program — commonly called Section 8 — is administered locally through public housing authorities (PHAs). Under an executed Housing Assistance Payments contract, the PHA pays the approved assistance portion directly to the owner, subject to the contract and continuing program compliance.
            </p>
            <p>
              The split depends on the household calculation, utility allowance, approved contract rent, and local program administration. For a hypothetical scenario, a written notice might allocate part to the tenant and part to HAP. Model those portions separately, but do not treat the assistance portion as unconditional: verify the executed contract, effective date, payment schedule, inspection status, and abatement terms.
            </p>
            <p>
              Your contract rent has to clear two separate ceilings before the PHA signs off:
            </p>
            <ul>
              <li>
                <strong>The payment standard.</strong> The PHA publishes current bedroom-count or ZIP-level standards using HUD benchmarks and applicable program rules. The standard is not an approved rent, a market-rent comp, or the amount the owner will receive.
              </li>
              <li>
                <strong>Rent reasonableness.</strong> Independent of the standard, the PHA must verify your asking rent is in line with comparable <em>unassisted</em> units nearby. If market comps support $1,450, you don&apos;t get $1,680 just because the payment standard allows it.
              </li>
            </ul>
            <p>
              The practical translation: compare the PHA&apos;s written figures with current unassisted comps. Neither FMR nor the payment standard proves a rent premium, approved contract rent, or collection outcome.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              A hypothetical worked example: a $135k single-family
            </h2>
            <p>
              Take a 3-bed single-family in a working-class Midwest neighborhood: <strong>$135,000 purchase</strong>, 25% down, $101,250 loan at 7.1% on a 30-year fixed — about <strong>$680/month</strong> in principal and interest.
            </p>
            <p>
              For illustration, assume the PHA&apos;s written property-specific approval sets contract rent at <strong>$1,500</strong>, allocates <strong>$700</strong> to the tenant, and schedules <strong>$800</strong> as HAP. Those are hypothetical inputs, not an Indianapolis or nationwide benchmark.
            </p>
            <p>
              Run the annual numbers: $18,000 gross rent, minus $2,400 property tax, $1,200 insurance, $2,200 maintenance and capex reserves, $1,800 management (10%), and $720 vacancy (4%) — that&apos;s an NOI of about <strong>$9,680</strong>, a <strong>7.2% cap rate</strong>, a DSCR of roughly <strong>1.19</strong>, and cash flow near <strong>$126/month</strong> after debt service. Check the math yourself with the{" "}
              <Link href="/#main" className="text-primary font-semibold hover:underline">
                cap rate calculator
              </Link>{" "}
              and{" "}
              <Link href="/#main" className="text-primary font-semibold hover:underline">
                DSCR calculator
              </Link>
              .
            </p>
            <p>
              In this hypothetical, an $800 scheduled HAP is larger than the $680 principal-and-interest payment. That does not prove the property services its full debt or operating costs: taxes, insurance, association dues, maintenance, vacancy, tenant collections, contract timing, and possible abatement still matter. Use the example only to test a scenario with written PHA inputs.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The pros, quantified
            </h2>
            <p>
              <strong>The payer mix changes collection exposure.</strong> In the hypothetical, 53% of scheduled rent is assigned to HAP and the balance to the tenant. Verify the executed contract and model delayed, adjusted, or abated assistance as well as tenant-portion collection risk; a rental payment is not a Treasury instrument.
            </p>
            <p>
              <strong>Use actual retention and collection records.</strong> Voucher status alone does not establish tenant duration, vacancy, collection loss, or make-ready cost. Review the property&apos;s and manager&apos;s history and run both shorter- and longer-tenancy scenarios. The{" "}
              <Link href="/blog/vacancy-rate-rental-property" className="text-primary font-semibold hover:underline">
                vacancy rate guide
              </Link>{" "}
              walks through how to derive that number from turnover instead of guessing.
            </p>
            <p>
              <strong>Measure local demand.</strong> Voucher-holder demand, bedroom mix, PHA jurisdiction, approved rent, unit condition, and competing supply vary. Ask the PHA and local managers for current evidence and retain a normal lease-up downside case.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The cons, quantified
            </h2>
            <p>
              <strong>Lease-up timing is a property-specific risk.</strong> Paperwork, rent review, inspection, corrections, contract execution, and agency workload can delay the effective date or payment. Ask the PHA for its current process and model a range of delay scenarios rather than a universal timeline.
            </p>
            <p>
              <strong>Inspections can affect timing and payment.</strong> Obtain the current checklist, inspect before submission, and price actual deficiencies with contractor bids. Cure periods and payment consequences follow the applicable rules and contract; do not substitute a property-class repair range for an inspection. Add verified work to your{" "}
              <Link href="/tools/rehab-cost-estimator" className="text-primary font-semibold hover:underline">
                rehab budget
              </Link>{" "}
              up front.
            </p>
            <p>
              <strong>Rent changes follow a process.</strong> Confirm the notice, timing, affordability, rent-reasonableness, and approval rules with the PHA. Compare approved-rent scenarios with current unassisted comps; do not assume voucher rent will lead, match, or lag the market.
            </p>
            <p>
              <strong>The tenant portion remains collection risk.</strong> Apply lawful screening consistently and verify program-specific notice obligations. Nonpayment remedies, timing, cost, and PHA coordination depend on the lease, contract, facts, and current local law.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The underwriting adjustments that actually matter
            </h2>
            <p>
              Treat a Section 8 underwrite as a normal underwrite with five line-item changes:
            </p>
            <ul>
              <li>
                <strong>Rent: use written property-specific inputs.</strong> HUD FMR and TrueCap&apos;s area benchmark are starting references only. Obtain the current payment standard, utility allowance, requested-rent decision, approved contract rent, and current unassisted comps from the relevant sources.
              </li>
              <li>
                <strong>Vacancy and lease-up:</strong> derive assumptions from property, manager, and PHA history, then add explicit paperwork, inspection, correction, and collection downside cases. Model them with the{" "}
                <Link href="/tools/vacancy-rate-calculator" className="text-primary font-semibold hover:underline">
                  vacancy rate calculator
                </Link>
                .
              </li>
              <li>
                <strong>Maintenance:</strong> use inspection findings, work orders, component condition, and current bids. Voucher status alone does not justify a fixed reserve adjustment.
              </li>
              <li>
                <strong>Rent growth:</strong> model flat, base, and downside approved-rent scenarios based on the current process and evidence rather than a fixed FMR or market-growth percentage.
              </li>
              <li>
                <strong>Financing:</strong> ask the specific lender in writing how it treats the lease, HAP contract, tenant share, appraisal rent, vacancy, and property condition. Program treatment varies.
              </li>
            </ul>
            <p>
              Then judge the deal on the same metrics as always — cash flow,{" "}
              <Link href="/#main" className="text-primary font-semibold hover:underline">
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
              A voucher scenario may compare favorably when the property&apos;s approved contract rent, tenant and assistance portions, lease-up timing, inspections, collections, and expenses outperform the supported unassisted-rent scenario. That conclusion must come from written property-specific inputs, not regional or property-class generalizations.
            </p>
            <p>
              A voucher scenario may compare poorly when supported unassisted rent exceeds the approved contract rent, lease-up takes longer, required repairs are material, or tenant- and assistance-payment risks outweigh the benefit. Run both cases from written inputs and confirm current affordability and program rules with the PHA.
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
              at all — a payer mix does not fix a bad purchase price.
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
