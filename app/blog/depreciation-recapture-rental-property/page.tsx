/**
 * Blog post: Depreciation recapture on rental property.
 *
 * Targets queries: "depreciation recapture rental property", "how is
 * depreciation recaptured when you sell", "unrecaptured section 1250
 * gain", "depreciation recapture tax rate", "rental property
 * depreciation recapture calculation", "avoid depreciation recapture".
 *
 * Companion to schedule-e-rental-property (the hold-side deduction) and
 * 1031-exchange-basics (the deferral vehicle). This post owns the
 * sell-side: what recapture is, how it's computed, and how to soften it.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "depreciation-recapture-rental-property";
const TITLE =
  "Depreciation recapture on rental property: how the tax works when you sell (2026)";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Depreciation recapture on rental property (2026)";
const DESCRIPTION =
  "Sell a depreciated rental and the IRS recaptures depreciation at up to 25%. The full math on a $250K rental sold for $360K — plus five ways to defer it.";
const PUBLISHED_AT = "2026-06-14";
const MODIFIED_AT = "2026-06-14";
const READING_TIME = 11;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "depreciation recapture rental property",
    "depreciation recapture tax rate",
    "unrecaptured section 1250 gain",
    "how is depreciation recaptured when you sell",
    "rental property depreciation recapture calculation",
    "avoid depreciation recapture",
    "depreciation recapture 25 percent",
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
    q: "What is the depreciation recapture tax rate on rental property?",
    a: "Depreciation on a residential rental building is taxed as 'unrecaptured Section 1250 gain' when you sell, at your ordinary income tax rate capped at 25%. If your ordinary marginal rate is below 25% — say you're in the 22% bracket — recapture is taxed at that lower rate, not a flat 25%. The 25% is a ceiling, not a fixed levy. Note that components broken out by a cost segregation study (appliances, carpet, land improvements) are Section 1245 property and recapture at your full ordinary rate with no 25% cap.",
  },
  {
    q: "Do I have to pay depreciation recapture if I never claimed depreciation?",
    a: "Yes. The tax code recaptures depreciation that was 'allowed or allowable,' meaning the IRS assumes you took the deduction every year whether or not you actually did. Skipping depreciation forfeits the annual deduction and still leaves you with the recapture bill at sale — the worst of both worlds. If you missed years, Form 3115 lets you claim the cumulative catch-up in the current year before you sell.",
  },
  {
    q: "Does a 1031 exchange eliminate depreciation recapture?",
    a: "It defers it, not eliminates it. A properly executed 1031 exchange rolls both the capital gain and the depreciation recapture into the replacement property, so no tax is due at the exchange. But the deferred recapture rides along in the new property's basis and comes due when you eventually sell without exchanging. The one way recapture truly disappears is a step-up in basis at death, when heirs inherit the property at fair market value and the recapture liability is wiped clean.",
  },
  {
    q: "Can the home-sale exclusion shelter recapture if I move into my rental?",
    a: "No. The Section 121 exclusion ($250,000 single / $500,000 married) can shelter appreciation if you convert a rental to your primary residence and meet the two-of-five-year test, but it never shelters depreciation taken after May 6, 1997 — that portion is always recaptured. Converting also triggers 'non-qualified use' proration that limits how much of the gain the exclusion covers, so the move is rarely the clean escape it's pitched as.",
  },
  {
    q: "Is depreciation recapture taxed as ordinary income or capital gains?",
    a: "For a straight-line-depreciated residential rental building, recapture is a special category of long-term capital gain — unrecaptured Section 1250 gain — taxed at a maximum 25% rather than the 0/15/20% rates that apply to the appreciation portion. It is not ordinary income for the building itself. The exception is Section 1245 personal property from a cost-segregation study, which does recapture at ordinary rates. High earners also owe the 3.8% net investment income tax on the entire gain on top of these rates.",
  },
];

export default function DepreciationRecapturePost() {
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
            Depreciation is the deduction that makes a cash-flowing rental
            report a loss to the IRS every year you own it. Depreciation
            recapture is the bill that comes due the year you sell. Most
            sellers run a back-of-the-napkin estimate on the appreciation
            and get blindsided — on the $250,000 rental below, the real
            federal tax is nearly three times the number they expected.
            Here&apos;s exactly how recapture is calculated, why the
            &quot;25% rate&quot; is a ceiling and not a flat tax, and the
            five legitimate ways to defer or erase it.
          </p>
        </header>

        <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            What depreciation recapture actually is
          </h2>
          <p>
            Every year you own a residential rental, the IRS lets you
            deduct the building (not the land) over 27.5 years as
            depreciation — a non-cash expense that shrinks your taxable
            income without costing you a dollar that year. A $200,000
            building throws off about <strong>$7,273 a year</strong> in
            deductions you never wrote a check for. That&apos;s the single
            biggest reason a property can put money in your pocket while
            showing a paper loss on{" "}
            <Link
              href="/blog/schedule-e-rental-property"
              className="text-primary font-semibold hover:underline"
            >
              Schedule E
            </Link>
            .
          </p>
          <p>
            Here&apos;s the catch the brochures skip: every dollar of
            depreciation you deduct also <em>reduces your cost basis</em>
            {" "}in the property. Lower basis means a bigger gain when you
            sell. Recapture is the mechanism that taxes that manufactured
            gain — the part of your profit that exists only because
            depreciation pushed your basis down. The government gave you a
            deduction against ordinary income on the way in and wants a
            piece of that benefit back on the way out — not a penalty or a
            surprise, just the second half of a deal you accepted the day
            you took the first year&apos;s depreciation.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            The three numbers that drive the whole calculation
          </h2>
          <p>
            Recapture math is just bookkeeping once you have three figures.
            Get these straight and the rest is arithmetic:
          </p>
          <ul>
            <li>
              <strong>Original cost basis</strong> — what you paid plus the
              capitalized closing costs that attach to the property (title,
              recording, transfer tax — the same ones covered in the{" "}
              <Link
                href="/blog/closing-costs-investment-property"
                className="text-primary font-semibold hover:underline"
              >
                closing-cost breakdown
              </Link>
              ) plus any improvements you capitalized over the years.
            </li>
            <li>
              <strong>Accumulated depreciation</strong> — the running total
              of every depreciation dollar you deducted (or were allowed to
              deduct) across the whole holding period. This lives on your
              preparer&apos;s depreciation schedule; reconstructing it from
              a decade of old returns is an afternoon you don&apos;t want.
            </li>
            <li>
              <strong>Adjusted basis</strong> — original cost basis minus
              accumulated depreciation. This is the number your gain is
              measured against, and it&apos;s lower than what you paid by
              exactly the depreciation you took.
            </li>
          </ul>
          <p>
            From there, your <strong>total gain</strong> is the net sale
            price (sale price minus selling costs) minus adjusted basis.
            That gain then splits into two buckets taxed at two different
            rates — and the split is the whole game.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            How the gain splits: recapture vs. true appreciation
          </h2>
          <p>
            Your total gain is carved into two pieces. The first is{" "}
            <strong>unrecaptured Section 1250 gain</strong> — the portion
            of the gain attributable to depreciation, equal to the lesser
            of your accumulated depreciation or your total gain. It&apos;s
            taxed at your ordinary income rate, <em>capped at 25%</em>. The
            second piece is everything left over — the genuine appreciation
            above your original purchase price — taxed at the long-term
            capital gains rates of 0%, 15%, or 20% depending on income.
          </p>
          <p>
            That two-bucket structure is why a quick &quot;I&apos;ll owe
            15% on my profit&quot; estimate is so often wrong. A big slice
            of your profit isn&apos;t appreciation at all — it&apos;s
            recaptured depreciation, and it&apos;s taxed at a materially
            higher rate. The longer you held and the more you depreciated,
            the larger that high-rate slice becomes.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            A complete worked example: the $250K rental sold for $360K
          </h2>
          <p>
            You bought a single-family rental for{" "}
            <strong>$250,000</strong>, with the county assessor allocating
            $50,000 to land and $200,000 to the building. Straight-line
            depreciation runs $200,000 ÷ 27.5 = <strong>$7,273 a
            year</strong>. You held it ten years (we&apos;ll use ten full
            years for clean math; in reality the first and final years are
            prorated by the mid-month convention), so accumulated
            depreciation is about <strong>$72,727</strong>. Ten years
            later you sell for <strong>$360,000</strong> and pay{" "}
            <strong>$25,000</strong> in agent commission and closing costs.
            The recapture worksheet:
          </p>
          <ul>
            <li>
              <strong>Original cost basis:</strong> $250,000
            </li>
            <li>
              <strong>Accumulated depreciation (10 yrs):</strong> −$72,727
            </li>
            <li>
              <strong>Adjusted basis:</strong> $177,273
            </li>
            <li>
              <strong>Sale price:</strong> $360,000
            </li>
            <li>
              <strong>Less selling costs:</strong> −$25,000
            </li>
            <li>
              <strong>Amount realized:</strong> $335,000
            </li>
            <li>
              <strong>Total gain</strong> ($335,000 − $177,273):{" "}
              <strong>$157,727</strong>
            </li>
            <li>
              <strong>Unrecaptured §1250 gain (= depreciation taken):</strong>{" "}
              $72,727, taxed up to 25%
            </li>
            <li>
              <strong>Long-term capital gain (appreciation):</strong>{" "}
              $85,000, taxed at 15%
            </li>
          </ul>
          <p>
            Notice the appreciation bucket is exactly{" "}
            <strong>$85,000</strong> — your $335,000 net sale price minus
            your $250,000 original cost. That&apos;s the &quot;real&quot;
            profit most sellers fixate on. Now the tax. The recapture
            piece, for a high earner who hits the cap, is $72,727 × 25% ={" "}
            <strong>$18,182</strong>. The appreciation piece is $85,000 ×
            15% = <strong>$12,750</strong>. Federal income tax subtotal:{" "}
            <strong>$30,932</strong>. A seller who eyeballed &quot;15% on
            my $85K of profit&quot; budgeted <strong>$12,750</strong> and
            is now staring at a bill <strong>2.4 times</strong> larger —
            entirely because the depreciation they happily deducted for a
            decade came home to roost.
          </p>
          <p>
            And it isn&apos;t finished. A household with this kind of
            income almost certainly owes the <strong>3.8% net investment
            income tax</strong> on the full $157,727 gain, adding another{" "}
            <strong>$5,994</strong> and pushing the federal total to about{" "}
            <strong>$36,926</strong>. State income tax — anywhere from zero
            in Texas or Florida to 13%+ in California — stacks on top of
            that. Run your own numbers through the{" "}
            <Link
              href="/tools/rental-property-tax-calculator"
              className="text-primary font-semibold hover:underline"
            >
              rental property tax calculator
            </Link>{" "}
            before you sign a listing agreement, not after.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            The 25% number is a ceiling, not a flat rate
          </h2>
          <p>
            The internet loves to say &quot;depreciation recapture is taxed
            at 25%.&quot; That&apos;s a useful shorthand and a misleading
            one. Unrecaptured Section 1250 gain is taxed at your{" "}
            <em>ordinary</em> income rate, with 25% as the maximum. An
            investor whose taxable income lands them in the 22% bracket
            pays 22% on the recapture, not 25%. The cap only bites for
            people whose ordinary rate already exceeds 25% — the 32%, 35%,
            and 37% brackets — which is exactly who benefits from it. In
            the worked example above we assumed a high earner so the 25%
            ceiling applied cleanly; a more modest household would pay less
            on the recapture slice.
          </p>
          <p>
            This is also the seed of the most important nuance in the whole
            topic. If you deducted depreciation at a 32% ordinary rate
            during the hold and recapture it at a 25% cap at sale, you
            didn&apos;t just defer the tax — you arbitraged a permanent
            seven-point rate difference on every depreciation dollar, on
            top of years of deferral. Recapture is the price of that
            benefit, not a clawback that erases it.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            &quot;Allowed or allowable&quot;: you can&apos;t skip your way out
          </h2>
          <p>
            The single most expensive recapture mistake is trying to dodge
            it by never claiming depreciation. It doesn&apos;t work. The
            statute recaptures depreciation &quot;allowed or
            allowable&quot; — the IRS computes your recapture as if you
            took every year&apos;s deduction whether you did or not. Skip
            depreciation and you give up the annual write-off worth
            thousands a year <em>and</em> still owe recapture on the
            phantom deductions at sale. If you&apos;ve under-claimed in
            prior years, a Form 3115 change of accounting method lets you
            sweep the missed depreciation into the current year as a
            catch-up adjustment, often a large one-time deduction. Taking
            depreciation is never optional in any way that helps you.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            Cost segregation raises the stakes — and changes the rate
          </h2>
          <p>
            Aggressive depreciation strategies make recapture bigger and,
            in part, meaner.{" "}
            <Link
              href="/blog/bonus-depreciation-rental-property-2026"
              className="text-primary font-semibold hover:underline"
            >
              Bonus depreciation and cost segregation
            </Link>{" "}
            front-load deductions by carving the building into shorter-life
            components — appliances, carpet, cabinetry, land improvements
            on 5-, 7-, and 15-year schedules instead of 27.5. Those
            components are <strong>Section 1245 property</strong>, and
            their recapture is taxed at your full ordinary income rate with
            no 25% cap. So a cost-seg study that accelerated $40,000 into
            five-year property can come back at 32%–37% on sale, not the
            comfortable 25% ceiling that applies to the building shell.
          </p>
          <p>
            That doesn&apos;t make cost segregation a bad idea — the time
            value of deducting now and recapturing later is usually
            positive, especially if you plan to 1031 the gain forward
            anyway. But &quot;I&apos;ll just owe 25%&quot; is doubly wrong
            for anyone who ran a study: model the exit before you
            accelerate the entrance.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            Five legitimate ways to defer or erase recapture
          </h2>
          <p>
            <strong>1. The 1031 exchange.</strong> Roll the entire deal —
            gain and recapture — into a like-kind replacement property
            within the 45-day identification and 180-day closing windows,
            and you owe nothing now. The deferred liability follows you in
            the new property&apos;s basis. It&apos;s the workhorse exit for
            investors who want to keep their capital compounding; the
            mechanics and pitfalls are in{" "}
            <Link
              href="/blog/1031-exchange-basics"
              className="text-primary font-semibold hover:underline"
            >
              1031 exchange basics
            </Link>
            .
          </p>
          <p>
            <strong>2. The installment sale.</strong> Carry the financing
            yourself and you spread the capital-gain portion across the
            years you collect payments, often keeping you in the 15% rather
            than 20% bracket and below the NIIT threshold. The unrecaptured
            1250 gain is taxed as you collect it — but be warned: any
            Section 1245 recapture from cost-segregated components must be
            recognized in full in year one, regardless of payment timing.
          </p>
          <p>
            <strong>3. Released passive losses.</strong> If your rental
            losses were suspended over the years because your income was
            too high to deduct them (the $25,000 active-participation
            allowance phases out between $100,000 and $150,000 of MAGI),
            those carryforwards all release in the year of sale and offset
            the gain — recapture included. Investors who self-file or
            switch preparers routinely forget five figures of suspended
            losses that should have absorbed the bill.
          </p>
          <p>
            <strong>4. Timing the sale into a low-income year.</strong>{" "}
            Because the recapture rate tracks your ordinary bracket up to
            the cap, and the appreciation rate tracks your capital-gains
            bracket, selling in a sabbatical year, a between-jobs year, or
            early retirement can drop both. The same sale that triggers 25%
            plus NIIT for a high earner might land at 15% with no NIIT a
            year after you stop drawing a W-2.
          </p>
          <p>
            <strong>5. The step-up at death.</strong> The one true escape.
            Hold the property until you die and your heirs inherit it at
            fair market value — the basis resets, the accumulated
            depreciation vanishes, and the recapture liability is erased
            entirely. &quot;Buy, borrow, die&quot; isn&apos;t a slogan for
            nothing: a 1031 exchange every time you trade up, then a
            step-up at the end, can move a lifetime of real estate gains to
            the next generation with zero income tax on the recapture.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            Underwrite the exit, not just the entry
          </h2>
          <p>
            The reason recapture matters at purchase, not just at sale, is
            that it changes your real after-tax return. A deal that looks
            like a clean 15%{" "}
            <Link
              href="/tools/roi-calculator"
              className="text-primary font-semibold hover:underline"
            >
              return on investment
            </Link>{" "}
            on paper can give back a chunk of that to recapture if you sell
            outright in year ten — or keep all of it if you 1031 forward.
            The deductions you take every year and the recapture you owe at
            the end are two ends of the same depreciation schedule, and
            reading them together is the difference between a return you
            projected and a return you actually keep. For the deduction
            side, see{" "}
            <Link
              href="/blog/rental-property-tax-deductions"
              className="text-primary font-semibold hover:underline"
            >
              the 14 rental tax deductions
            </Link>
            , and for how it all lands on the return each April,{" "}
            <Link
              href="/blog/schedule-e-rental-property"
              className="text-primary font-semibold hover:underline"
            >
              the Schedule E walkthrough
            </Link>
            .
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
            None of this is tax advice, and recapture is one of the spots
            where a real-estate CPA earns their fee many times over —
            especially around cost-segregation recapture, installment-sale
            timing, and the &quot;allowed or allowable&quot; catch-up. But
            the shape of it is simple: depreciation lowers your basis,
            recapture taxes the gain that lower basis creates, and the rate
            on that slice is higher than the rate on your appreciation.
            Estimate it before you list, and decide early whether
            you&apos;re selling outright, exchanging forward, or holding to
            the step-up. The{" "}
            <Link href="/" className="text-primary font-semibold hover:underline">
              TrueCap analyzer
            </Link>{" "}
            models the tax strategy and exit scenarios alongside cash flow,
            so the recapture bill is a number you chose to accept — not one
            that ambushes you at the closing table.
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
