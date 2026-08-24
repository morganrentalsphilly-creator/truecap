/**
 * Blog post: how to calculate ARV (after-repair value).
 *
 * Targets queries: "how to calculate ARV", "ARV real estate", "after
 * repair value", "ARV formula", "how to determine ARV", "ARV meaning
 * real estate", "what is ARV", "ARV comps".
 *
 * Angle: ARV is the number the whole flip / BRRRR stack is built on —
 * the 70%-rule Offer Ceiling, the refinance loan amount, and the flip
 * profit all key off it — yet it's a forecast of an appraisal, not a
 * formula. Give the comps method step by step with a worked 1,400 sq ft
 * example, the adjustment discipline, where ARV feeds the deal math,
 * and a sensitivity table showing what a 5/10/15% ARV miss does to
 * BRRRR cash-left-in and flip profit. Slots into the 70%-rule / BRRRR /
 * rehab-cost cluster and funnels into the rehab estimator and BRRRR
 * calculator.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "how-to-calculate-arv";
const TITLE_PLAIN =
  "How to calculate ARV (after-repair value): the comps method, step by step (2026)";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE_PLAIN.
const SERP_TITLE = "How to calculate ARV (2026): the comps method";
const DESCRIPTION =
  "How to calculate ARV: pull renovated comps, adjust, and apply price per square foot. A worked example, a 70%-rule Offer Ceiling, and BRRRR refinance math.";
const PUBLISHED_AT = "2026-07-10";
const MODIFIED_AT = "2026-07-10";
const READING_TIME = 11;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "how to calculate ARV",
    "ARV real estate",
    "after repair value",
    "ARV formula",
    "how to determine ARV",
    "ARV meaning real estate",
    "ARV comps",
    "after repair value calculator",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    title: SERP_TITLE,
    description: DESCRIPTION,
    url: `/blog/${SLUG}`,
    type: "article",
    publishedTime: PUBLISHED_AT,
    modifiedTime: MODIFIED_AT,
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: TITLE_PLAIN }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const FAQS = [
  {
    q: "What does ARV mean in real estate?",
    a: "ARV stands for after-repair value: the projected price a property could sell for—or appraise at—after the planned renovation. It is not purchase price plus rehab. It is a forecast based on renovated comparable sales, adjusted for the subject property. Flippers use ARV to calculate an Offer Ceiling, and BRRRR investors use it to model a refinance appraisal. Neither is guaranteed.",
  },
  {
    q: "What is the formula for ARV?",
    a: "There is no closed-form formula, because ARV is a market forecast, not a computation. The standard method is: pull 3–6 recently sold comps that are already renovated to the level you're planning, compute each comp's price per square foot, adjust for meaningful differences (beds, baths, garage, lot, condition), take the average or median dollars per square foot, and multiply by your property's finished square footage. The common shorthand ARV = average renovated $/sq ft × subject sq ft is the last step of that process — the work is in choosing and adjusting the comps.",
  },
  {
    q: "Can I use a Zestimate or online estimate as my ARV?",
    a: "No. Automated estimates price the property in its current condition and blend renovated and unrenovated sales indiscriminately, which is exactly the distinction ARV exists to capture. A distressed house with dated finishes will carry an automated estimate far below its after-repair value, and in a hot market the estimate can also lag closed sales by months. Use online tools to find candidate comps quickly, then do the renovated-only, adjusted comp work yourself — or ask an investor-friendly agent to pull MLS comps.",
  },
  {
    q: "What's the difference between ARV and appraised value?",
    a: "ARV is your forecast; the appraisal is the referee's call. On a BRRRR refinance, the lender orders an appraisal after the rehab, and the loan is sized as a percentage of that appraised value — typically 70–75% — regardless of what your spreadsheet said. If your ARV was $255,000 but the appraiser comes in at $235,000, your cash-out loan just shrank by roughly $15,000 and that money stays trapped in the deal. That's why disciplined investors underwrite ARV conservatively and stress-test the deal at 5–10% below their estimate.",
  },
];

export default function HowToCalculateArvPost() {
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/blog/${SLUG}`;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: TITLE_PLAIN,
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
      { "@type": "ListItem", position: 3, name: TITLE_PLAIN, item: canonicalUrl },
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
              How to calculate ARV (after-repair value): the comps method, step
              by step (2026)
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
              Every flip and every BRRRR deal is built on one number: the
              after-repair value, or ARV — what the property will sell for, or
              appraise at, once the renovation is done. Your Offer Ceiling keys
              off it. Your refinance loan is sized as a percentage of it. Your
              flip profit is whatever&apos;s left of it after costs. And unlike
              rent or taxes, you can&apos;t look it up anywhere — you have to
              build it from comparable sales, which means it&apos;s also the
              number investors most often get wrong. Overestimate ARV by 10% and
              a profitable flip quietly becomes a break-even; on a BRRRR, the
              same miss can double the cash trapped in the deal. Here&apos;s
              what ARV actually is, the comps method step by step with a worked
              example, where the number feeds your deal math, and how much an
              ARV miss really costs.
            </p>
          </header>

          <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              What ARV is — and the mistake baked into most estimates
            </h2>
            <p>
              ARV is the market value of the property <em>after</em> your
              planned renovation: the price a fully renovated version of your
              house would trade for today, in that neighborhood, to a normal
              buyer with normal financing. Two things follow from that
              definition. First, ARV is <strong>not</strong> purchase price plus
              rehab budget. Spending $45,000 renovating a house does not add
              $45,000 of value — it might add $70,000 in a neighborhood that
              rewards renovated product, or $25,000 in one that&apos;s already
              priced near its ceiling. The market decides, not your invoices.
              Second, ARV is a <strong>forecast of an appraisal</strong>. On a
              refinance, a licensed appraiser will pull renovated comparable
              sales and reconcile them to a value — your job when estimating ARV
              is to run the same play the appraiser will run, before you commit
              money to the deal.
            </p>
            <div className="rounded-xl border border-border bg-muted/30 p-5">
              <code className="text-sm sm:text-base text-foreground font-mono">
                ARV ≈ average renovated-comp $/sq ft × subject finished sq ft
              </code>
            </div>
            <p>
              That one-liner is the last step of the process, not the process
              itself. The work — and the accuracy — lives in which comps you
              select and how you adjust them.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Why ARV runs the whole deal
            </h2>
            <p>
              Three load-bearing numbers key directly off ARV. The{" "}
              <Link
                href="/blog/70-percent-rule-house-flipping"
                className="text-primary font-semibold hover:underline"
              >
                70% rule
              </Link>{" "}
              calculates a 70%-rule Offer Ceiling as 70% of ARV minus rehab costs — get ARV
              wrong and the modeled boundary moves by 70 cents on the
              dollar. On a{" "}
              <Link
                href="/blog/brrrr-method-explained"
                className="text-primary font-semibold hover:underline"
              >
                BRRRR
              </Link>
              , the refinance lender sizes your cash-out loan at typically
              70–75% of the <em>appraised</em> value, so ARV determines how much
              of your capital comes back out to fund the next deal. And on a
              straight flip, profit is ARV minus everything else — purchase,
              rehab, holding, and selling costs — so ARV error flows through to
              the bottom line dollar for dollar. Rehab overruns get the blame
              for most bad flips, but an optimistic ARV does at least as much
              damage, because it inflates the top line that every other number
              is subtracted from.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The comps method, step by step
            </h2>
            <p>
              Take a concrete deal: a dated 3-bed, 2-bath single-family, 1,400
              finished square feet, asking $185,000, needing roughly $45,000 of
              work to reach the neighborhood&apos;s renovated standard. (Build
              that budget line by line — the{" "}
              <Link
                href="/blog/how-to-estimate-rehab-costs"
                className="text-primary font-semibold hover:underline"
              >
                rehab estimating guide
              </Link>{" "}
              and the{" "}
              <Link
                href="/tools/rehab-cost-estimator"
                className="text-primary font-semibold hover:underline"
              >
                rehab cost estimator
              </Link>{" "}
              cover that side.) Here&apos;s how to turn sold data into an ARV —
              and if you want to run the $/sq ft math live while you read, the
              free{" "}
              <Link
                href="/tools/arv-calculator"
                className="text-primary font-semibold hover:underline"
              >
                ARV calculator
              </Link>{" "}
              is preloaded with this exact example.
            </p>
            <p>
              <strong>Step 1 — pull renovated sales only.</strong> Search closed
              sales within roughly half a mile (a mile in rural areas), sold in
              the last 3–6 months, same property type, within about 20% of your
              square footage — and, critically, renovated to the condition
              you&apos;re delivering. A dated sale tells you what your house is
              worth <em>now</em>, which is a different question.{" "}
              <strong>Step 2 — demand at least three, prefer five.</strong> With
              fewer than three true comps, widen the radius or time window
              before you loosen the renovated-condition filter.{" "}
              <strong>Step 3 — compute price per square foot</strong> for each
              comp. <strong>Step 4 — adjust for real differences</strong> (more
              on this below). <strong>Step 5 — reconcile</strong>: average or
              take the median of the adjusted $/sq ft and multiply by your
              finished square footage, then sanity-check the result against the
              comps&apos; raw sale prices.
            </p>
            <p>Our four best comps:</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left">Comp</th>
                    <th className="text-right">Sq ft</th>
                    <th className="text-right">Sale price</th>
                    <th className="text-right">$/sq ft</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>A — 0.3 mi, sold 6 wks ago</td>
                    <td className="text-right">1,450</td>
                    <td className="text-right">$262,000</td>
                    <td className="text-right">$180.69</td>
                  </tr>
                  <tr>
                    <td>B — 0.4 mi, sold 2 mo ago</td>
                    <td className="text-right">1,350</td>
                    <td className="text-right">$248,500</td>
                    <td className="text-right">$184.07</td>
                  </tr>
                  <tr>
                    <td>C — 0.2 mi, sold 3 mo ago</td>
                    <td className="text-right">1,500</td>
                    <td className="text-right">$270,000</td>
                    <td className="text-right">$180.00</td>
                  </tr>
                  <tr>
                    <td>D — 0.5 mi, sold 5 wks ago</td>
                    <td className="text-right">1,380</td>
                    <td className="text-right">$255,300</td>
                    <td className="text-right">$185.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              The four comps average <strong>$182.44 per square foot</strong>{" "}
              (the median is $182.38 — when the two agree this closely, no
              single comp is skewing the answer). Applied to 1,400 finished
              square feet: 1,400 × $182.44 ≈ <strong>$255,400</strong>. Round
              conservatively and call the ARV <strong>$255,000</strong> — a
              number that sits comfortably inside the comps&apos; $248,500 to
              $270,000 range, which is your final sanity check. An ARV that
              lands above every comp&apos;s actual sale price should make you
              deeply suspicious of your adjustments.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Adjusting comps without fooling yourself
            </h2>
            <p>
              Raw $/sq ft comparisons hide real differences, so appraisers — and
              you — adjust the comp&apos;s sale price before dividing. The
              usual suspects: a bedroom or bathroom count difference (a second
              full bath is commonly worth $5,000–$15,000 depending on the
              market), garage versus no garage, finished basement space (worth
              roughly half of above-grade $/sq ft in most markets), lot size,
              and busy-road or backing-to-commercial locations. Adjust the{" "}
              <em>comp</em> toward your subject: if Comp B has one fewer bath
              than your finished product, add the bath value to B&apos;s price
              before computing its $/sq ft. Two disciplines keep this honest.
              First, small square-footage differences are already handled by the
              $/sq ft math — don&apos;t double-adjust. Second, beware the
              smaller-house trap: $/sq ft rises as houses shrink, so a 1,100 sq
              ft comp will flatter a 1,400 sq ft subject. Stay within that ±20%
              size band and lean on the comps closest to your size when
              reconciling.
            </p>
            <p>
              Here&apos;s what an adjustment looks like in practice. Suppose Comp
              B — the $248,500 sale — has only one and a half baths, while your
              finished product will have two full baths, and second full baths
              in this market are worth about $7,500 at resale. Adjust B&apos;s
              price up to $256,000 before dividing: $256,000 ÷ 1,350 = $189.63
              per square foot, and the four-comp average moves from $182.44 to
              about $183.83, nudging the ARV from $255,400 to roughly $257,400.
              Notice how small that is — a $7,500 adjustment on one of four
              comps moved the final answer about $2,000. That&apos;s the sign of
              a healthy comp set. When a single adjustment swings your ARV by
              $10,000 or more, the set is too thin or too scattered to trust,
              and the fix is better comps, not bigger adjustments.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              When comps are thin
            </h2>
            <p>
              In rural markets, unusual property types, or neighborhoods where
              nothing renovated has traded recently, the textbook method runs
              out of comps. Widen in this order: extend the sale window to 9–12
              months before you extend the radius, because a stale comp in the
              right neighborhood usually beats a fresh one in the wrong one —
              but apply a market-trend adjustment to older sales (if the metro
              is up 4% year over year, a 9-month-old comp gets roughly a 3%
              bump). Pending sales are the next-best evidence; an
              investor-friendly agent can often tell you the contract price, and
              pendings reflect today&apos;s market better than anything that
              closed last quarter. If you&apos;re still reconciling from two
              comps and a prayer, say so in your underwriting: widen your
              margin of safety from the usual 5–10% ARV haircut to 15%, or pay
              a few hundred dollars for a pre-purchase appraisal or a
              broker&apos;s price opinion before you commit. One more BRRRR
              wrinkle worth knowing while you&apos;re here: many refinance
              lenders impose a <strong>seasoning period</strong> — commonly six
              months of ownership — before they&apos;ll lend against the new
              appraised value instead of your purchase price, so the ARV
              you&apos;re projecting may not be usable until month six.
              Budget holding costs accordingly.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Where the ARV feeds the deal math
            </h2>
            <p>
              With ARV pinned at $255,000, the deal numbers fall out fast.{" "}
              <strong>Offer Ceiling:</strong> the 70% rule says 0.70 × $255,000 −
              $45,000 rehab = <strong>$133,500</strong> — a long way below the
              $185,000 ask, which tells you this property needs a heavy
              negotiation, a wholesale-style acquisition, or a different
              strategy than a flip. <strong>BRRRR refinance:</strong> suppose
              you negotiate to $150,000, spend the $45,000, and carry $8,000 of
              closing and holding costs — <strong>$203,000 all-in</strong>. A
              75% LTV cash-out{" "}
              <Link
                href="/blog/how-to-refinance-a-rental-property"
                className="text-primary font-semibold hover:underline"
              >
                refinance
              </Link>{" "}
              against the $255,000 appraisal produces a $191,250 loan; net of
              about $4,000 in refi costs you recover $187,250, leaving just{" "}
              <strong>$15,750 of your cash</strong> in a stabilized rental.{" "}
              <strong>Flip profit:</strong> sell at $255,000, pay about 8%
              ($20,400) in commissions and closing, and clear $255,000 −
              $203,000 − $20,400 = <strong>$31,600</strong>. Run your own
              acquisition through the{" "}
              <Link
                href="/tools/brrrr-calculator"
                className="text-primary font-semibold hover:underline"
              >
                BRRRR calculator
              </Link>{" "}
              to see the refinance and cash-left-in math end to end.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              What an ARV miss actually costs
            </h2>
            <p>
              Now hold every cost fixed and let only the appraisal disappoint.
              Same purchase, same rehab, same $203,000 all-in — the only thing
              that changes is what the property is actually worth when the work
              is done:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left">Actual value vs. $255K ARV</th>
                    <th className="text-right">BRRRR cash left in</th>
                    <th className="text-right">Flip profit</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>On target ($255,000)</td>
                    <td className="text-right">$15,750</td>
                    <td className="text-right">$31,600</td>
                  </tr>
                  <tr>
                    <td>5% low ($242,250)</td>
                    <td className="text-right">$25,312</td>
                    <td className="text-right">$19,870</td>
                  </tr>
                  <tr>
                    <td>10% low ($229,500)</td>
                    <td className="text-right">$34,875</td>
                    <td className="text-right">$8,140</td>
                  </tr>
                  <tr>
                    <td>15% low ($216,750)</td>
                    <td className="text-right">$44,437</td>
                    <td className="text-right">−$3,590</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              The asymmetry is the lesson. A 10% ARV miss — the difference
              between a careful comp set and a hopeful one — cuts the flip
              profit by 74% and more than doubles the cash trapped in the
              BRRRR. At 15% low, the flip loses money outright even though the
              renovation went perfectly to budget. Every 5% of ARV error moves
              the refinance loan by about $9,600 on this deal (75% of the value
              change), which is exactly why the standard practice is to
              underwrite at your comp-supported number and then confirm the
              deal still works at 5–10% below it.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Five ways people get ARV wrong
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Comping against unrenovated sales.</strong> Mixing dated
                sales into the set drags the $/sq ft down — or worse, tempts you
                to &quot;adjust up&quot; by guesswork. Renovated comps only;
                that&apos;s the entire point of the exercise.
              </li>
              <li>
                <strong>Using list prices instead of closed sales.</strong>{" "}
                Anyone can ask anything. Only closed prices are evidence, and in
                a softening market even 6-month-old closings can be stale.
              </li>
              <li>
                <strong>Trusting an automated estimate.</strong> Online
                estimates price the house as it sits today and blend conditions
                indiscriminately. They&apos;re a comp-finding tool, not an ARV.
              </li>
              <li>
                <strong>Comping outside the neighborhood boundary.</strong> A
                school-district line or a highway can move value 15% across one
                street. Half a mile is a guideline; the boundary is the rule.
              </li>
              <li>
                <strong>Letting the deal set the ARV.</strong> If you catch
                yourself hunting for one more comp to justify the price that
                makes the deal work, stop — the comps are supposed to discipline
                the offer, not the other way around.
              </li>
            </ul>

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
              ARV is a forecast of an appraisal, built from renovated,
              recently-closed, truly comparable sales — never from your costs,
              a list price, or an algorithm&apos;s guess. Pull three to six
              renovated comps inside the neighborhood, adjust them toward your
              subject, reconcile the $/sq ft, and keep the answer inside the
              range the comps actually sold in. Then let the number do its
              three jobs: calculate the Offer Ceiling through the 70% rule, size the
              BRRRR refinance, and cap the flip profit — and confirm the deal
              survives an appraisal 5–10% below your estimate before you wire
              a deposit. When the property&apos;s endgame is a rental, run the
              stabilized numbers through the{" "}
              <Link href="/" className="text-primary font-semibold hover:underline">
                TrueCap analyzer
              </Link>{" "}
              so the ARV, the refinance, and the cash flow all come from one
              consistent set of assumptions. None of this is investment advice;
              verify comps, rehab scope, and lender terms on any specific deal
              before you rely on an ARV.
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
