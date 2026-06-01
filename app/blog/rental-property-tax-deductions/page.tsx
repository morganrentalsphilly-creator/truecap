/**
 * Blog post: Rental property tax deductions — the 14 deductions every
 * investor should know.
 *
 * Targets massive-volume queries:
 *   - "rental property tax deductions"
 *   - "what can you deduct on a rental property"
 *   - "rental property write offs"
 *   - "schedule e deductions"
 *   - "depreciation rental property"
 *
 * Strategy: comprehensive list-style post + worked examples + clear
 * Schedule E categorization. Pulls heavy long-tail traffic.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "rental-property-tax-deductions";
const TITLE = "Rental property tax deductions — the 14 every investor should know";
const DESCRIPTION =
  "Every deductible expense on a rental property, organized by Schedule E line. Worked examples, common-mistake callouts, and the depreciation move that often saves more than all other deductions combined.";
const PUBLISHED_AT = "2026-05-26";
const MODIFIED_AT = "2026-06-01";
const READING_TIME = 11;

export const metadata: Metadata = {
  title: `${TITLE} | TrueCap`,
  description: DESCRIPTION,
  keywords: [
    "rental property tax deductions",
    "rental property write offs",
    "what can you deduct on a rental property",
    "schedule e deductions",
    "rental property depreciation",
    "real estate tax deductions",
    "landlord tax deductions",
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
    q: "What's the most valuable rental property tax deduction?",
    a: "Depreciation, almost always. Residential rentals depreciate over 27.5 years (commercial: 39 years). On a $400,000 building (excluding land), that's roughly $14,500 of annual depreciation deduction — a non-cash expense that shows up on Schedule E and reduces taxable rental income directly. At a 32% effective bracket, that's ~$4,600/year of real tax savings, every year you own the property.",
  },
  {
    q: "Can I deduct my mortgage payment?",
    a: "You can deduct the INTEREST portion of your mortgage payment, but NOT the principal portion. Principal is treated as building equity, not an expense. The interest is fully deductible on Schedule E line 12. Lenders send you a 1098 each year showing the deductible interest amount.",
  },
  {
    q: "What about repairs vs improvements?",
    a: "Repairs are fully deductible the year you pay them (Schedule E line 14). Improvements have to be capitalized and depreciated over the property's life. The IRS line: repairs RESTORE a property to working condition; improvements ADD value, extend useful life, or adapt to new use. A new roof = improvement (capitalized). Roof patching = repair (deducted). Painting = repair. Full bathroom renovation = improvement.",
  },
  {
    q: "Can I deduct travel to my rental property?",
    a: "Yes — if the travel's primary purpose is managing or maintaining the property. Mileage to check on the property, meet with PM, inspect after a turnover, or visit the local home-improvement store IS deductible. Travel that's primarily personal (a vacation that happens to include 'checking on the rental') is NOT. Keep a mileage log; the 2026 IRS rate is 67 cents/mile for business use.",
  },
  {
    q: "What's a 'real estate professional' status and why does it matter?",
    a: "If you (or your spouse) qualify as a real estate professional under IRS rules — at least 750 hours per year in real estate trades, more than half your working time in real estate, materially participating in each property — your rental losses become FULLY deductible against your other income (W-2, business, etc.). Without that status, rental losses are 'passive' and can only offset passive income (other rentals, partnerships) and limited W-2 phase-outs. This is the biggest tax move available to serious investors with a non-W-2 spouse who can take on the real-estate-professional designation.",
  },
  {
    q: "Should I use a CPA or do my own rental property taxes?",
    a: "DIY for one or two properties if you're using TurboTax + Schedule E and you keep good records. CPA from property #3 onward, or anytime you have: cost segregation studies, 1031 exchanges, multi-LLC structures, real-estate-professional status, partnership returns, or a sale event. A good real-estate-focused CPA costs $1,500-3,000/year and typically saves you 3-5x that in deductions you'd miss.",
  },
];

export default function TaxDeductionsPost() {
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/blog/${SLUG}`;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${canonicalUrl}#article`,
    headline: TITLE,
    description: DESCRIPTION,
    datePublished: PUBLISHED_AT,
    dateModified: MODIFIED_AT,
    url: canonicalUrl,
    author: { "@type": "Person", name: "Morgan Page", url: siteUrl },
    publisher: { "@id": `${siteUrl}/#organization` },
    isPartOf: { "@id": `${siteUrl}/blog#blog` },
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
      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-2"><Link href="/blog" className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground">← Blog</Link></div>
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight tracking-tight text-balance">{TITLE}</h1>
          <p className="mt-3 text-[11px] uppercase tracking-widest text-muted-foreground font-bold">
            {new Date(PUBLISHED_AT).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })} · {READING_TIME} min read
          </p>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Every dollar you deduct on Schedule E is a dollar that doesn&apos;t get taxed. Most rental property investors leave money on the table because they don&apos;t know what they can deduct, or they confuse repairs with improvements. Here are the 14 deductions every landlord should know, organized by Schedule E line, with worked examples.
          </p>
        </header>

        <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
          <p>
            A note before we start: this is general education, not tax advice. Your situation has nuance that requires a CPA who specializes in real estate. Use this as a checklist for the conversation, not a substitute for one.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">1. Mortgage interest (Schedule E line 12)</h2>
          <p>
            The interest portion of your mortgage payment is fully deductible. NOT the principal — principal is building equity, not an expense.
          </p>
          <p>
            <strong>Worked example:</strong> $300k loan at 7% interest, 30-year fixed. Year-1 interest paid: ~$20,800. That&apos;s a $20,800 deduction on Schedule E line 12. Your lender sends a 1098 form each January showing the exact deductible amount. (Remember: deductible interest reduces taxable income — it doesn&apos;t affect the property&apos;s <Link href="/glossary/noi" className="text-primary font-semibold hover:underline">NOI</Link>, which is computed before debt service.)
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">2. Depreciation (Schedule E line 18)</h2>
          <p>
            The biggest deduction in rental investing, and the one most commonly under-used. Residential rental property depreciates over 27.5 years; commercial over 39 years. You depreciate the BUILDING value only (not land).
          </p>
          <p>
            <strong>Worked example:</strong> $500k purchase, 80% allocated to building = $400k depreciable basis. $400k ÷ 27.5 = $14,545/year of depreciation deduction. At a 32% effective tax bracket, that&apos;s ~$4,650/year of tax savings — without you spending a dollar. To estimate the impact on your specific deal in one shot, use the <Link href="/tools/rental-property-tax-calculator" className="text-primary font-semibold hover:underline">rental property tax calculator</Link>.
          </p>
          <p>
            <strong>Power-up: cost segregation.</strong> A cost segregation study reclassifies portions of the building (appliances, carpeting, landscaping, electrical fixtures) to 5, 7, or 15-year schedules instead of 27.5. Front-loads 25-35% of depreciation into the first 5 years. Worth doing on properties over ~$250k that you&apos;ll hold 7+ years. See our <Link href="/blog/cap-rate-vs-cash-on-cash-vs-dscr" className="text-primary font-semibold hover:underline">return metrics deep-dive</Link> for how this impacts IRR.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">3. Property tax (Schedule E line 16)</h2>
          <p>
            Annual real estate tax paid to the county. Pull it from the county appraisal district website — do NOT rely on the seller&apos;s last-year number, which may have changed with reassessment.
          </p>
          <p>
            <Link href="/blog/50-percent-rule-rentals" className="text-primary font-semibold hover:underline">Pro move</Link>: file a property tax appeal if your assessed value diverges from comparable sales. Average successful appeal saves $400-1,800/year, and the savings are deductible the year you pay them.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">4. Insurance (Schedule E line 9)</h2>
          <p>
            Landlord insurance premiums. Note: this is landlord insurance specifically, not homeowner&apos;s insurance — the policies are different and one won&apos;t protect the other use case.
          </p>
          <p>
            Mortgage insurance (PMI) is also deductible on rental property, with limits based on adjusted gross income. Confirm with your CPA if you have PMI on a rental.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">5. Repairs (Schedule E line 14)</h2>
          <p>
            Fully deductible the year you pay them. The IRS distinguishes repairs from improvements by intent: repairs RESTORE a property to its working condition; improvements ADD value or extend useful life.
          </p>
          <p>
            <strong>Deductible repairs:</strong> roof patching, painting, replacing a broken window, fixing a leaky pipe, replacing a worn-out appliance with a similar model, repairing a fence.
          </p>
          <p>
            <strong>Capitalized as improvements:</strong> new roof (full replacement), kitchen remodel, addition (new bathroom/bedroom), HVAC system replacement, full re-piping.
          </p>
          <p>
            The line gets fuzzy. Spend an extra hour with your CPA on year-1 capex categorization — getting this right vs wrong can shift $5-10k of deductions.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">6. Property management fees (Schedule E line 11)</h2>
          <p>
            All fees paid to a property manager — the monthly percentage (typically 8-10% of rent), placement fees, renewal fees, eviction processing, maintenance markup. All deductible the year paid.
          </p>
          <p>
            If you self-manage, you can&apos;t deduct your own labor — but you CAN deduct the cost of tools, software (think TenantCloud, Buildium, even <Link href="/" className="text-primary font-semibold hover:underline">TrueCap Pro</Link>), and mileage related to management.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">7. Utilities (Schedule E line 17)</h2>
          <p>
            Any utility you pay as the landlord — water, sewer, trash, sometimes gas or electric in multi-family — is deductible. Most SFR investors put utilities on the tenant; multi-family often has owner-paid utilities.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">8. Cleaning + maintenance (Schedule E line 7)</h2>
          <p>
            Turnover cleaning, lawn service, pest control, snow removal, gutter cleaning, HVAC servicing, carpet cleaning. All deductible the year paid.
          </p>
          <p>
            Don&apos;t confuse with capital improvements — a deep clean between tenants is a maintenance expense. Replacing all the carpeting because it&apos;s worn out is an improvement (capitalized).
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">9. Travel (Schedule E line 6)</h2>
          <p>
            Travel to manage or maintain your rental property is deductible. 2026 IRS rate: 67 cents/mile.
          </p>
          <p>
            <strong>Deductible:</strong> mileage to inspect the property, meet a contractor, attend an HOA meeting, drive to Home Depot for repair supplies, visit a prospective tenant.
          </p>
          <p>
            <strong>Not deductible:</strong> primary-purpose-personal trips where you happen to drop by the rental.
          </p>
          <p>
            Keep a mileage log. The simplest tool: a free mileage-tracker app like MileIQ or Stride. Without a log, the IRS won&apos;t accept the deduction in an audit.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">10. Professional services (Schedule E line 11)</h2>
          <p>
            CPA fees, attorney fees, real estate agent commissions (when buying or selling), bookkeeper costs. Note: the seller-side commission paid at sale gets ADDED to the cost basis (reducing capital gains) rather than being a current-year deduction.
          </p>
          <p>
            Your annual CPA fee for filing Schedule E is straightforward — fully deductible in the year paid.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">11. HOA fees (Schedule E line 14)</h2>
          <p>
            Monthly HOA dues on a condo or townhouse rental are deductible. Special assessments paid into the HOA&apos;s reserves are also deductible.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">12. Advertising (Schedule E line 4)</h2>
          <p>
            Costs to advertise vacant units — Zillow listings, Craigslist, Apartments.com fees, MLS listing fees, photography for the listing. All deductible the year paid.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">13. Loan-origination costs (amortized)</h2>
          <p>
            Closing costs related to the loan itself (origination fees, discount points, appraisal fees) are amortized over the life of the loan rather than deducted in the year paid. On a 30-year loan with $6,000 of origination costs, that&apos;s a $200/year deduction for 30 years.
          </p>
          <p>
            Other closing costs (title insurance, recording fees) get added to the cost basis, reducing capital gains at sale.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">14. Home office (if you qualify)</h2>
          <p>
            If you have a dedicated space in your primary residence used exclusively and regularly for rental property management, you can deduct a portion of your home expenses (mortgage interest, utilities, depreciation) proportional to the office&apos;s square footage. Typical savings: $500-2,000/year.
          </p>
          <p>
            The exclusive-and-regular-use test is strict. The IRS doesn&apos;t accept "I sometimes work from the kitchen table." Use a dedicated home office only.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">The passive activity loss rules — why your losses might not deduct</h2>
          <p>
            Here&apos;s the catch most investors hit. Rental property losses are classified as &quot;passive&quot; under IRS rules. Passive losses can only offset passive income (other rental properties, limited partnerships) — NOT your W-2 or active business income.
          </p>
          <p>
            Two important exceptions:
          </p>
          <p>
            <strong>$25,000 active-participation allowance.</strong> If your modified adjusted gross income (MAGI) is under $100,000, you can deduct up to $25,000 of rental losses against your W-2 income each year. The allowance phases out between $100k and $150k MAGI; above $150k, it&apos;s zero. This is why high-W-2 earners often see depreciation deductions "trapped" as passive losses that carry forward but don&apos;t reduce current-year taxes.
          </p>
          <p>
            <strong>Real estate professional status.</strong> If you or your spouse qualifies as a real-estate professional (750+ hours/year in real estate, more than half of working time in real estate, materially participating), all rental losses become non-passive and fully deductible against any income. This is the secret weapon for two-earner couples where one spouse handles real estate full-time.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">When you sell — depreciation recapture</h2>
          <p>
            Every dollar of depreciation you took during ownership gets "recaptured" when you sell. The IRS taxes recaptured depreciation at a max of 25%, separately from capital gains.
          </p>
          <p>
            Example: $400k property depreciated $50k over 5 years. Sold for $500k. The $50k of depreciation gets taxed at up to 25% ($12,500 in additional tax). The remaining $50k of appreciation gets long-term capital gains treatment (0%, 15%, or 20% depending on your bracket).
          </p>
          <p>
            The fix: use a <Link href="/blog/1031-exchange-basics" className="text-primary font-semibold hover:underline">1031 exchange</Link> to roll the sale proceeds into a new property. 1031 defers both the capital gains AND the depreciation recapture — and you keep depreciating into the next property indefinitely.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">The action plan</h2>
          <p>
            (1) Pull last year&apos;s Schedule E and check whether you claimed each of the 14 categories above. The ones you missed are this year&apos;s found money.
          </p>
          <p>
            (2) If your annual rental income is over $50k, do a cost segregation study on at least one property. The $4-7k cost typically pays back 4-10x over the first 5 years.
          </p>
          <p>
            (3) Talk to a real-estate-focused CPA about real estate professional status if your spouse can qualify. This is the single biggest tax move available to investor families.
          </p>
          <p>
            (4) Run your deals through <Link href="/" className="text-primary font-semibold hover:underline">TrueCap</Link> with the tax-savings field turned on — it models depreciation impact automatically so you see the after-tax cash flow, not just the pre-tax number.
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
