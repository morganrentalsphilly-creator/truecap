/**
 * Strategy blog post — Bonus depreciation on rental property in 2026.
 *
 * Targets high-intent queries:
 *   - "bonus depreciation 2026"
 *   - "rental property bonus depreciation"
 *   - "cost segregation 2026"
 *   - "str loophole tax"
 *   - "real estate professional status"
 *   - "rental property depreciation"
 *   - "cost seg study cost"
 *   - "passive losses rental real estate"
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

const SLUG = "bonus-depreciation-rental-property-2026";
const TITLE = "Bonus depreciation on rental property in 2026: the restored 100% deduction and what qualifies";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Bonus depreciation on rental property in 2026";
const DESCRIPTION =
  "The 2026 bonus depreciation rate is 100% for eligible property acquired and placed in service after January 19, 2025. Learn what rental assets qualify.";
const PUBLISHED_AT = "2026-06-07";
const MODIFIED_AT = "2026-08-15";
const FACT_CHECKED_AT = "2026-08-15";
const READING_TIME_MIN = 10;

const IRS_BONUS_GUIDANCE =
  "https://www.irs.gov/newsroom/treasury-irs-issue-guidance-on-the-additional-first-year-depreciation-deduction-amended-as-part-of-the-one-big-beautiful-bill";
const IRS_PUBLICATION_946 = "https://www.irs.gov/publications/p946";
const IRS_PUBLICATION_925 = "https://www.irs.gov/publications/p925";
const IRS_PUBLICATION_544 = "https://www.irs.gov/publications/p544";

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "bonus depreciation 2026",
    "rental property bonus depreciation",
    "cost segregation 2026",
    "str loophole tax",
    "real estate professional status",
    "rental property depreciation",
    "cost seg study cost",
    "passive losses rental real estate",
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
    q: "What is bonus depreciation in plain English?",
    a: "Bonus depreciation is an additional first-year deduction for eligible property. The restored rate is 100% for qualifying property acquired and placed in service after January 19, 2025. A residential rental building itself generally has a 27.5-year recovery period and does not qualify, but certain properly classified shorter-life components may qualify.",
  },
  {
    q: "Is bonus depreciation gone in 2026?",
    a: "No. Current IRS guidance applies a permanent 100% bonus-depreciation rate to eligible property acquired and placed in service after January 19, 2025. Property acquired before January 20, 2025 can remain subject to the earlier phase-down rules, so contract, acquisition, and placed-in-service dates matter.",
  },
  {
    q: "What is a cost segregation study and is it worth it in 2026?",
    a: "A cost segregation study documents whether parts of a building should be classified separately from the 27.5- or 39-year structure. Properly classified 5-, 7-, or 15-year property can fall within the recovery-period test for bonus depreciation. Whether a study is worthwhile depends on the supported allocation, timing, tax rate, passive-loss limits, future sale plans, and study cost; there is no universal property-price threshold.",
  },
  {
    q: "Can short-term-rental losses offset non-passive income?",
    a: "Sometimes, but not because every short-term rental is automatically non-passive. IRS Publication 925 has exceptions to the rental-activity definition, including an average customer-use period of seven days or less, and separate material-participation tests. The facts, participation records, grouping, and other limitations determine treatment. A tax professional should evaluate the complete return.",
  },
  {
    q: "What is real estate professional status (REPS)?",
    a: "For the passive-activity rules, a qualifying taxpayer must perform more than half of their personal services and more than 750 hours in real-property trades or businesses in which they materially participate. Qualifying does not by itself make every rental loss non-passive; material participation, activity grouping, basis, at-risk, and other limits can still matter.",
  },
  {
    q: "What records support material participation?",
    a: "Keep reasonable, credible records of the work performed and time spent, such as calendars, appointment books, or narrative summaries supported by contemporaneous documents. The relevant test and the taxpayer's facts determine what must be shown. Do not rely on an unsupported after-the-fact estimate.",
  },
  {
    q: "What happens to depreciation when I sell?",
    a: "Depreciation reduces adjusted basis and can change the character and amount of gain on sale. Different rules can apply to the building and to shorter-life property reclassified by a cost segregation study, including section 1245 recapture and unrecaptured section 1250 gain. Model the exit with a tax professional instead of assuming one flat 25% rate.",
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
            Published {new Date(PUBLISHED_AT).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}{" "}
            · materially updated {new Date(MODIFIED_AT).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            · {READING_TIME_MIN} min read
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            By{" "}
            <Link href="/about" rel="author" className="font-semibold text-foreground hover:underline">
              Morgan Page
            </Link>
            {" · "}IRS sources verified {FACT_CHECKED_AT}
          </p>
          <p className="text-base sm:text-lg text-muted-foreground mt-4 leading-relaxed">
            Current IRS guidance restored 100% bonus depreciation for
            eligible property acquired and placed in service after January
            19, 2025. The building itself usually does not qualify; certain
            shorter-life components can. Dates, classification, and loss
            limitations all matter.
          </p>
        </header>

        <article className="prose prose-slate max-w-none [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground [&_li]:leading-relaxed [&_strong]:text-foreground">
          <p>
            The 2026 federal bonus-depreciation rate is <strong>100%</strong>
            for eligible property acquired and placed in service after
            January 19, 2025. That is a material change from the prior
            phase-down schedule. It does not mean an investor can deduct the
            full purchase price of a rental building.
          </p>
          <p>
            This is educational content, not tax advice — every strategy
            here has real eligibility tests and audit risk. Run anything
            you&apos;re considering past a CPA who works with real estate
            investors before you act on it.
          </p>

          <div className="not-prose my-6 rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm leading-relaxed text-foreground">
            <strong>Source verification:</strong> factual rules on this page
            were checked on {FACT_CHECKED_AT} against current IRS guidance and
            Publications 946, 925, and 544. This is educational information,
            not individualized tax advice.
          </div>

          <h2 className="text-2xl sm:text-3xl">What changed: 100% was restored</h2>
          <p>
            The earlier law was phasing bonus depreciation down. New
            legislation changed that rule, and the IRS now says the additional
            first-year deduction is permanently 100% for eligible property
            acquired and placed in service after January 19, 2025. See the IRS
            <a href={IRS_BONUS_GUIDANCE} className="text-primary font-semibold hover:underline"> implementation guidance</a>.
          </p>
          <p>The date boundary is essential:</p>
          <div className="not-prose overflow-x-auto rounded-xl border border-border bg-card my-6">
            <table className="w-full min-w-[400px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left p-3 font-bold text-foreground">Property timing</th>
                  <th className="text-left p-3 font-bold text-foreground">General federal rule</th>
                </tr>
              </thead>
              <tbody className="[&_td]:p-3 [&_td]:border-b [&_td]:border-border [&_tr:last-child_td]:border-0">
                <tr><td>Acquired before Jan. 20, 2025</td><td>Prior phase-down rules can still apply</td></tr>
                <tr><td className="font-bold text-foreground">Acquired and placed in service after Jan. 19, 2025</td><td className="font-bold text-foreground">100% for eligible property</td></tr>
              </tbody>
            </table>
          </div>
          <p>
            Acquisition can involve binding-contract and related rules, and
            &ldquo;placed in service&rdquo; generally means ready and available
            for its assigned use—not simply purchased. Have a qualified tax
            adviser resolve borderline dates.
          </p>

          <h2 className="text-2xl sm:text-3xl">How depreciation works (and why bonus matters)</h2>
          <p>
            Residential rental buildings depreciate straight-line over
            <strong> 27.5 years</strong>. A full straight-line year on a
            $400K residential-building basis is about $14,545 before
            placed-in-service conventions; the first-year amount and the
            amount left in the building class can differ. Bonus depreciation
            does not apply to the 27.5-year building shell itself.
          </p>
          <p>
            What it changes is the treatment of shorter-life property
            embedded in the building. If the entire $400K basis is reported in
            the residential-rental-building class, it stays on the 27.5-year
            schedule. A supportable component classification—often documented
            through a cost segregation study—might instead break it down as:
          </p>
          <ul>
            <li><strong>$280K</strong> — 27.5-year structure (shell,
              framing, roof, plumbing).</li>
            <li><strong>$60K</strong> — 15-year land improvements
              (driveway, landscaping, fencing).</li>
            <li><strong>$60K</strong> — 5-year personal property
              (appliances, carpet, decorative lighting, blinds).</li>
          </ul>
          <p>
            If the $120K classification is supportable and every eligibility
            rule is met, the restored 100% rate could produce up to a
            <strong> $120K additional first-year deduction</strong>. The
            $280K building shell remains on its applicable recovery schedule.
            This is an illustration, not a default allocation or tax result.
          </p>

          <h3>What generally qualifies</h3>
          <p>
            <a href={IRS_PUBLICATION_946} className="text-primary font-semibold hover:underline">IRS Publication 946</a>{" "}
            describes qualified property as including depreciable tangible
            property under MACRS with a recovery period of 20 years or less,
            certain computer software, and several other statutory categories.
            Eligible used property can qualify, subject to acquisition rules.
            Land is not depreciable, and a residential rental building&apos;s
            27.5-year recovery period generally puts the building itself
            outside the 20-year test.
          </p>

          <h2 className="text-2xl sm:text-3xl">Strategy 1: Cost segregation</h2>
          <p>
            A cost segregation study analyzes whether parts of a property
            should be classified separately from the building. A sound study
            documents the facts, legal classification, and allocation method;
            it does not make an otherwise ineligible asset qualify.
          </p>
          <p>Evaluate the economics with these inputs:</p>
          <ul>
            <li><strong>Supported allocation:</strong> how much basis can
              actually be classified into eligible shorter-life property.</li>
            <li><strong>Timing:</strong> whether acquisition and placed-in-service
              dates satisfy the restored rule.</li>
            <li><strong>Ability to use the deduction:</strong> basis, at-risk,
              passive-activity, and excess-business-loss rules can limit the
              current benefit.</li>
            <li><strong>Exit cost:</strong> accelerated deductions reduce basis
              and can increase taxable gain or recapture later.</li>
            <li><strong>Professional cost:</strong> study, return preparation,
              and possible Form 3115 work for property already in service.</li>
          </ul>
          <p>
            There is no reliable universal price threshold. Compare the
            present value of tax timing after all limitations and exit effects
            with the cost of obtaining and defending the classification.
          </p>

          <h2 className="text-2xl sm:text-3xl">Strategy 2: Short-term-rental activity rules</h2>
          <p>
            Most rental real estate is &ldquo;passive activity&rdquo;
            under IRC §469. Passive losses can only offset passive
            income unless an exception and the other applicable rules are
            satisfied. An unused loss may be suspended rather than produce a
            current cash benefit.
          </p>
          <p>
            Short stays can be treated differently for the passive-activity
            rules. <a href={IRS_PUBLICATION_925} className="text-primary font-semibold hover:underline">IRS Publication 925</a>{" "}
            lists circumstances in which an activity is not treated as a
            rental activity, including when the average period of customer use
            is seven days or less. That is only the first step. The taxpayer
            must also satisfy a material-participation test for non-passive
            treatment.
          </p>
          <ul>
            <li>One test is more than 500 hours of participation.</li>
            <li>Another is more than 100 hours and at least as much
              participation as any other individual.</li>
            <li>Other tests and aggregation rules may apply to the facts.</li>
          </ul>
          <p>
            Keep records that identify the work and time involved. Do not
            assume a booking platform&apos;s stay length or a large deduction
            alone proves non-passive treatment, and do not market the rule as
            an automatic way to erase salary income.
          </p>

          <h2 className="text-2xl sm:text-3xl">Strategy 3: Real estate professional status (REPS)</h2>
          <p>
            Real-estate-professional status changes how rental activities are
            analyzed under the passive-activity rules. It does not
            automatically turn every rental loss into a currently deductible
            non-passive loss.
          </p>
          <p>
            Eligibility — you must meet <strong>both</strong>:
          </p>
          <ul>
            <li><strong>50% test:</strong> more than half your total
              personal services in trades or businesses during the year
              are performed in real property trades or businesses you
              materially participate in.</li>
            <li><strong>750-hour test:</strong> more than 750 hours/year
              in those real property trades or businesses.</li>
          </ul>
          <p>
            The taxpayer must also materially participate in the rental
            activity or activities under the applicable grouping rules. Basis,
            at-risk, and other deduction limitations remain separate tests.
          </p>
          <p>Common audit failures:</p>
          <ul>
            <li>Records that do not credibly substantiate the work performed
              and time spent.</li>
            <li>A job title or license alone does not establish the hours or
              material participation required.</li>
            <li>Married filing jointly — only ONE spouse needs to meet
              the test, but that spouse must individually meet both 50%
              and 750-hour real-estate-professional tests. Spousal
              participation can be treated differently when applying the
              separate material-participation rules.</li>
          </ul>

          <h2 className="text-2xl sm:text-3xl">Depreciation recapture — the back end</h2>
          <p>
            Accelerated depreciation is not evaluated in isolation. It reduces
            adjusted basis, which can increase gain when the asset is sold.
            The building and reclassified shorter-life assets can be subject to
            different gain-character and recapture rules.
          </p>
          <p>
            <a href={IRS_PUBLICATION_544} className="text-primary font-semibold hover:underline">IRS Publication 544</a>{" "}
            explains dispositions and recapture. In a cost-segregated property,
            some personal-property gain may be ordinary income under section
            1245, while unrecaptured section 1250 gain can apply to depreciable
            real property. A single &ldquo;25% recapture rate&rdquo; does not
            accurately model every component.
          </p>
          <p>Plan the exit before claiming the deduction:</p>
          <ul>
            <li><strong>1031 exchange.</strong> Roll the gain into a
              qualifying like-kind replacement property. Eligibility,
              timing, boot, and reclassified assets require transaction-specific
              review. <Link href="/blog/1031-exchange-basics" className="text-primary font-semibold hover:underline">Read the 1031 overview</Link>.</li>
            <li><strong>Taxable sale.</strong> Model adjusted basis and the
              character of gain for each asset class, not just the headline
              sale price.</li>
            <li><strong>Estate planning.</strong> Basis rules depend on how
              property is owned and transferred; get individualized advice
              rather than assuming a particular result.</li>
          </ul>

          <h2 className="text-2xl sm:text-3xl">Bottom-line decision tree</h2>
          <p>For property placed in service in 2026:</p>
          <ol>
            <li>Confirm the acquisition and placed-in-service dates.</li>
            <li>Separate nondepreciable land and the 27.5-year building from
              any shorter-life assets using supportable allocations.</li>
            <li>Confirm each asset meets the qualified-property and used-property
              rules in Publication 946.</li>
            <li>Estimate the deduction, then apply basis, at-risk,
              passive-activity, and other limitations.</li>
            <li>Model later disposition and recapture before deciding whether
              acceleration improves the full investment outcome.</li>
            <li>Have a real-estate tax professional review the classifications,
              dates, elections, and return reporting.</li>
          </ol>

          <div className="not-prose">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-bold hover:opacity-95 transition-opacity"
            >
              <Calculator className="w-4 h-4" />
              Model the base deal and straight-line tax scenario
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          <p className="text-sm text-muted-foreground mt-6">
            Related reading: <Link href="/blog/rental-property-tax-deductions" className="text-primary font-semibold hover:underline">Rental property tax deductions</Link>, <Link href="/blog/1031-exchange-basics" className="text-primary font-semibold hover:underline">1031 exchange basics</Link>, <Link href="/blog/short-term-rental-underwriting-playbook" className="text-primary font-semibold hover:underline">STR underwriting playbook</Link>.
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
        </article>

        <RelatedBlogPosts currentSlug={SLUG} />
        <div className="max-w-3xl mx-auto px-4 sm:px-6"><NewsletterSignup variant="expanded" source="blog" /></div>

        <footer className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Curious what depreciation could actually save you on a
            specific deal? TrueCap models a 10-year straight-line depreciation
            scenario alongside cash flow, financing, and exit assumptions. It
            does not replace a cost-segregation study or tax return model.{" "}
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
