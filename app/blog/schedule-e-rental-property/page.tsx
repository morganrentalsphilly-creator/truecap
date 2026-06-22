/**
 * Blog post: How to read Schedule E for a rental property.
 *
 * Targets queries: "schedule e rental property", "how to fill out
 * schedule e", "schedule e explained", "schedule e line by line",
 * "rental property tax form", "schedule e depreciation", "schedule e
 * loss limit".
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "schedule-e-rental-property";
const TITLE =
  "Schedule E for rental property: a line-by-line walkthrough (2026)";
const DESCRIPTION =
  "Every Schedule E line that matters, a full worked example on a $250K rental, and why a property can cash flow +$139/month while reporting a $3,703 tax loss.";
const PUBLISHED_AT = "2026-06-12";
const MODIFIED_AT = "2026-06-12";
const READING_TIME = 10;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "schedule e rental property",
    "how to fill out schedule e",
    "schedule e explained",
    "schedule e line by line",
    "schedule e depreciation",
    "schedule e loss limit",
    "rental property tax form",
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
    q: "Can my rental show a loss on Schedule E if it has positive cash flow?",
    a: "Yes, and it's common. Schedule E measures taxable income, not cash flow. Depreciation is a large non-cash deduction (a $200,000 building basis produces $7,273 per year), while your principal payments are cash out the door that never appears on the form. A property collecting more than it spends can still report a paper loss once depreciation lands — that's the design, not a mistake.",
  },
  {
    q: "How much rental loss can I deduct on Schedule E?",
    a: "Rental losses are passive by default, so they offset only passive income — with one big exception. If you actively participate (approve tenants, set rents, sign off on repairs) and your modified adjusted gross income is $100,000 or less, you can deduct up to $25,000 of rental losses against wages and other ordinary income. The allowance phases out at fifty cents per dollar of MAGI above $100,000 and hits zero at $150,000. Disallowed losses aren't gone — they carry forward indefinitely and release when the property produces income or when you sell.",
  },
  {
    q: "Does mortgage principal go on Schedule E?",
    a: "No. Only the interest portion of your mortgage payment is deductible, on line 12. Principal is a transfer from your bank account to your equity, not an expense. This trips up first-year landlords constantly: a $1,247 monthly payment might be only $1,089 of deductible interest in month one, and the interest share shrinks every month after. Use the lender's Form 1098, not your payment total times twelve.",
  },
  {
    q: "Should I skip depreciation to avoid recapture when I sell?",
    a: "No — the recapture happens either way. The tax code applies recapture on depreciation that was 'allowed or allowable,' meaning the IRS assumes you took the deduction whether or not you actually did. Skipping depreciation forfeits the annual deduction and still leaves you with the recapture bill at sale. If you've skipped it in past years, Form 3115 lets you catch up the missed depreciation in the current year.",
  },
  {
    q: "What's the difference between a repair and an improvement on Schedule E?",
    a: "Repairs keep the property in its existing condition — fixing a leak, patching a wall, servicing the furnace — and are fully deductible on line 14 the year you pay them. Improvements better the property, restore it, or adapt it to a new use — a new roof, an HVAC replacement, a kitchen remodel — and must be capitalized and depreciated over 27.5 years. The de minimis safe harbor lets most small landlords expense items up to $2,500 per invoice, which captures appliances and water heaters.",
  },
];

export default function ScheduleEPost() {
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
            Schedule E is where your rental&apos;s tax story gets told —
            and it tells a different story than your bank account. A
            property that puts $139 a month in your pocket can report a
            $3,703 loss to the IRS, legally, in the same year. Here&apos;s
            every line that matters, a complete worked example, and the
            loss rules that decide whether that paper loss saves you money
            this April or waits in a carryforward.
          </p>
        </header>

        <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            What Schedule E measures (and what it doesn&apos;t)
          </h2>
          <p>
            Schedule E (Form 1040), Part I, reports income and expenses
            from rental real estate. One column per property, up to three
            per form, with overflow onto additional copies. For most
            buy-and-hold landlords it&apos;s the only place a rental
            touches the tax return — no self-employment tax, no Schedule
            C, unless you&apos;re providing hotel-style services.
          </p>
          <p>
            The critical mental shift: Schedule E measures{" "}
            <strong>taxable income</strong>, which is neither your cash
            flow nor your NOI. Three wedges separate them. Depreciation is
            a deduction you never wrote a check for this year. Mortgage
            principal is a check you wrote that isn&apos;t deductible.
            And capital improvements are checks you wrote that deduct
            slowly, over 27.5 years, instead of when you paid them. Keep
            those three in view and the form stops being mysterious.
            It&apos;s also not just a tax document — when you apply for
            your next conventional loan, the underwriter will pull your
            Schedule E to calculate the property&apos;s qualifying income,
            so sloppy categorization follows you into your next purchase
            (DSCR lenders are the exception;{" "}
            <Link
              href="/blog/dscr-loans-explained"
              className="text-primary font-semibold hover:underline"
            >
              DSCR loans
            </Link>{" "}
            qualify the property on its own rent instead).
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            The top of the form: property type and fair rental days
          </h2>
          <p>
            Before the money lines, Schedule E asks for the property
            address, a type code (1 for single-family, 2 for multi-family,
            3 for vacation/short-term, and so on), and two day counts:{" "}
            <strong>fair rental days</strong> and{" "}
            <strong>personal use days</strong>. For a pure rental, fair
            rental days is the number of days the property was rented or
            available at market rent — 365 for a full-year rental, fewer
            if you bought mid-year. Personal use days matter because more
            than 14 days of personal use (or 10% of rental days, if
            greater) reclassifies the property as a mixed-use residence
            and forces you to prorate every expense. House-hackers
            renting out units of a duplex they live in split the building:
            the rented unit&apos;s share goes on Schedule E, the
            owner&apos;s share doesn&apos;t.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            Line 3: rents received
          </h2>
          <p>
            Line 3 is gross rent actually collected during the year — not
            the lease amount, not scheduled rent. A few items that belong
            here and get missed: prepaid rent counts in the year you
            receive it (January&apos;s rent paid December 28 is this
            year&apos;s income), a security deposit you kept for damages
            or unpaid rent becomes income when you keep it (a deposit
            you&apos;ll return is not income), and tenant-paid expenses
            in lieu of rent — the tenant who covers a $400 plumbing bill
            off the rent — count as both income on line 3 and a deduction
            on the matching expense line. If a tenant simply didn&apos;t
            pay, there&apos;s no &quot;bad debt&quot; deduction for cash-basis
            landlords: the rent never entered income, so it can&apos;t be
            deducted out.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            Lines 5–19: the expense lines that do the work
          </h2>
          <p>
            Nineteen expense categories, but on a typical single-family
            rental about seven carry the weight:
          </p>
          <ul>
            <li>
              <strong>Line 7 — cleaning and maintenance:</strong> turnover
              cleans, lawn care, snow removal, gutter cleaning.
            </li>
            <li>
              <strong>Line 9 — insurance:</strong> the landlord policy
              premium, plus umbrella coverage allocated to the property.
            </li>
            <li>
              <strong>Line 11 — management fees:</strong> the property
              manager&apos;s percentage plus leasing and renewal fees.
            </li>
            <li>
              <strong>Line 12 — mortgage interest:</strong> interest only,
              from Form 1098. Principal never appears on Schedule E.
            </li>
            <li>
              <strong>Line 14 — repairs:</strong> fixes that keep the
              property in its current condition. The repair-vs-improvement
              boundary is the most audited line on the form — more below.
            </li>
            <li>
              <strong>Line 16 — taxes:</strong> property taxes. Note these
              are fully deductible against rental income — the $10,000
              SALT-style cap that applies to your personal residence does
              not apply to rentals.
            </li>
            <li>
              <strong>Line 18 — depreciation:</strong> the line that
              changes everything. It gets its own section.
            </li>
          </ul>
          <p>
            The rest — advertising (line 5), auto and travel (line 6),
            commissions (line 8), legal and professional fees (line 10),
            supplies (line 15), utilities (line 17), and the
            &quot;other&quot; catch-all on line 19 (HOA dues, software,
            bank fees, education) — are real money but rarely move the
            verdict. The complete list of what&apos;s deductible, with the
            edge cases, is in{" "}
            <Link
              href="/blog/rental-property-tax-deductions"
              className="text-primary font-semibold hover:underline"
            >
              rental property tax deductions
            </Link>
            .
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            Line 18: depreciation, the non-cash line that drives the result
          </h2>
          <p>
            Residential rental buildings depreciate over{" "}
            <strong>27.5 years, straight-line</strong>. The mechanics:
            take your purchase price plus closing costs that attach to the
            property (title fees, recording, transfer taxes — see{" "}
            <Link
              href="/blog/closing-costs-investment-property"
              className="text-primary font-semibold hover:underline"
            >
              the closing-cost breakdown
            </Link>{" "}
            for which ones), subtract the value of the land — land never
            depreciates — and divide the rest by 27.5. The land allocation
            usually comes from the county assessor&apos;s ratio of land to
            total assessed value; 20–30% land is typical for suburban
            single-family.
          </p>
          <p>
            On a $250,000 purchase with $50,000 of land value, the
            depreciable basis is $200,000 and the annual deduction is{" "}
            <strong>$7,273</strong> ($200,000 ÷ 27.5). That&apos;s $606 a
            month of deduction with zero cash leaving your account — for
            most leveraged rentals, it&apos;s the difference between a
            taxable profit and a paper loss. Two caveats: the first and
            last years are prorated by month (mid-month convention), and
            every dollar you deduct reduces your basis, setting up
            depreciation recapture — taxed at up to 25% — when you sell.
            That bill can be deferred indefinitely with a{" "}
            <Link
              href="/blog/1031-exchange-basics"
              className="text-primary font-semibold hover:underline"
            >
              1031 exchange
            </Link>
            , but it doesn&apos;t vanish.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            A complete worked example: the $250K rental
          </h2>
          <p>
            A $250,000 single-family renting for $2,100/month, bought
            January 2 with 25% down. Loan: $187,500 at 7% over 30 years —
            P&amp;I of $1,247/month, of which year-one interest is about
            $13,064 (the other $1,905 is principal). Land value $50,000,
            so depreciable basis is $200,000. Tenant pays utilities. The
            Schedule E column:
          </p>
          <ul>
            <li>
              <strong>Line 3 — rents received:</strong> $25,200
            </li>
            <li>
              <strong>Line 9 — insurance:</strong> $1,400
            </li>
            <li>
              <strong>Line 11 — management fees (8%):</strong> $2,016
            </li>
            <li>
              <strong>Line 12 — mortgage interest:</strong> $13,064
            </li>
            <li>
              <strong>Line 14 — repairs:</strong> $1,800
            </li>
            <li>
              <strong>Line 16 — property taxes:</strong> $3,000
            </li>
            <li>
              <strong>Line 18 — depreciation:</strong> $7,273
            </li>
            <li>
              <strong>Line 19 — other (HOA, software, bank fees):</strong>{" "}
              $350
            </li>
            <li>
              <strong>Line 20 — total expenses:</strong> $28,903
            </li>
            <li>
              <strong>Line 21 — income or (loss):</strong>{" "}
              <strong>($3,703)</strong>
            </li>
          </ul>
          <p>
            Now the reconciliation that makes the form make sense. Cash
            operating expenses were $8,566 (everything except interest and
            depreciation), so NOI is $16,634. Debt service was $14,969.
            Actual cash flow: <strong>+$1,665 for the year, about
            +$139/month</strong>, with a DSCR of 1.11. Same property, same
            year: <strong>+$139/month in the bank, −$3,703 to the
            IRS</strong>. The bridge is exact: cash flow ($1,665) plus
            principal paydown ($1,905, cash out but not deductible) minus
            depreciation ($7,273, deductible but not cash) equals the
            $3,703 loss. If you can do that bridge in your head, you can
            read any Schedule E. Sanity-check the operating side with the{" "}
            <Link
              href="/tools/noi-calculator"
              className="text-primary font-semibold hover:underline"
            >
              NOI calculator
            </Link>{" "}
            and the after-tax picture with the{" "}
            <Link
              href="/tools/rental-property-tax-calculator"
              className="text-primary font-semibold hover:underline"
            >
              rental property tax calculator
            </Link>
            .
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            Line 22: can you actually use the loss?
          </h2>
          <p>
            A loss on line 21 doesn&apos;t automatically reduce your
            taxes. Rental losses are <strong>passive</strong> by default,
            deductible only against passive income — unless you qualify
            for the <strong>$25,000 active participation allowance</strong>.
            Actively participate (approve tenants, set rents, authorize
            repairs — a property manager doesn&apos;t disqualify you, as
            long as you make the calls) and keep modified AGI at $100,000
            or below, and you can deduct up to $25,000 of rental losses
            against your W-2 and other ordinary income. The allowance
            phases out fifty cents per dollar of MAGI above $100,000,
            reaching zero at $150,000.
          </p>
          <p>
            On the example above: a household at $95,000 MAGI in the 22%
            bracket deducts the full $3,703 and saves about{" "}
            <strong>$815</strong> in federal tax — call it $68/month of
            after-tax yield the cash-flow statement never shows. A
            household at $160,000 MAGI deducts nothing this year; the
            $3,703 becomes a <strong>suspended loss</strong> on Form 8582
            that carries forward indefinitely, releasing against future
            rental income or, in full, when the property sells. Suspended
            losses aren&apos;t wasted — they&apos;re deferred. (Real
            estate professional status — 750+ hours and more than half
            your working time in real estate — removes the passive
            limitation entirely, but W-2 earners rarely qualify.)
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            Where the number goes from here
          </h2>
          <p>
            Whatever survives the loss limits lands on line 26 of
            Schedule E, flows to Schedule 1, and from there onto your
            Form 1040 — added to (or subtracted from) your wages and
            everything else. Two practical implications. First, rental
            income is not subject to self-employment tax, which is a
            structural advantage over most side income: a dollar of
            rental profit keeps the 15.3% that a dollar of freelance
            profit gives up. Second, because the loss allowance phases
            out on <em>modified</em> AGI, a raise, a bonus, or a big
            capital gain in the same year can silently convert a
            deductible rental loss into a suspended one. If you&apos;re
            hovering near the $100,000 line, timing a deductible repair
            into a low-income year is worth a conversation with your CPA.
            And keep the depreciation schedule itself — Form 4562 in year
            one, your preparer&apos;s carryforward schedule after that.
            When you sell, the cumulative depreciation number on that
            schedule is what recapture is computed from, and
            reconstructing it ten years later from old returns is an
            afternoon you don&apos;t want.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            The four mistakes that cost real money
          </h2>
          <p>
            <strong>Deducting capital improvements as repairs.</strong>{" "}
            The $11,000 roof on line 14 is the classic audit flag. Whole
            roofs, HVAC systems, and kitchen remodels are improvements:
            capitalized, depreciated over 27.5 years (about $400/year for
            that roof, not $11,000 once). The dividing line and the
            $2,500 de minimis safe harbor are covered in the{" "}
            <Link
              href="/blog/capex-maintenance-reserves-rental-property"
              className="text-primary font-semibold hover:underline"
            >
              capex and reserves guide
            </Link>
            . Underwriting note: this is also why a seller&apos;s
            Schedule E is weak due diligence — heavy line-14 years might
            be deferred maintenance catching up, or might be improvements
            misfiled.
          </p>
          <p>
            <strong>Deducting the full mortgage payment.</strong> Only
            interest is deductible. Writing off the $14,969 of total P&amp;I
            instead of the $13,064 of interest overstates deductions by
            $1,905 in year one — and the gap widens every year as the
            payment shifts toward principal.
          </p>
          <p>
            <strong>Skipping depreciation to dodge recapture.</strong>{" "}
            Recapture applies to depreciation &quot;allowed or
            allowable&quot; — you pay it at sale whether or not you took
            the deduction. Skipping it is pure loss. (Missed years are
            fixable with a Form 3115 catch-up.)
          </p>
          <p>
            <strong>Forgetting suspended losses at sale.</strong> Years of
            carryforwards on Form 8582 all release in the year you sell.
            Investors who switch preparers or self-file routinely lose
            track of five figures of suspended losses that should have
            offset the gain.
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
            Read the form before you buy the property
          </h2>
          <p>
            None of this is tax advice — a CPA who knows real estate earns
            their fee many times over, especially around the
            repair-vs-improvement boundary and passive loss planning. But
            the structure of Schedule E is exactly why after-tax return
            and cash-on-cash return diverge, and why two investors in
            different tax brackets can correctly disagree about the same
            deal. The{" "}
            <Link href="/" className="text-primary font-semibold hover:underline">
              TrueCap analyzer
            </Link>{" "}
            models the tax strategy alongside cash flow so you can see
            both stories — the bank&apos;s and the IRS&apos;s — before you
            write an offer. Related reading:{" "}
            <Link
              href="/blog/rental-property-tax-deductions"
              className="text-primary font-semibold hover:underline"
            >
              the 14 rental tax deductions
            </Link>
            ,{" "}
            <Link
              href="/blog/1031-exchange-basics"
              className="text-primary font-semibold hover:underline"
            >
              1031 exchange basics
            </Link>
            , and{" "}
            <Link
              href="/blog/cash-on-cash-vs-irr"
              className="text-primary font-semibold hover:underline"
            >
              cash-on-cash vs IRR
            </Link>
            .
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
