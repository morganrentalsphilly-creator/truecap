/**
 * Blog post: buying a rental property with tenants in place.
 *
 * Targets queries: "buying a rental property with tenants", "buying a
 * house with tenants in it", "do I have to honor the lease when I buy
 * a rental", "inherited tenants", "estoppel certificate real estate",
 * "security deposit transfer when property sold", "raising rent after
 * buying a rental property".
 *
 * Angle: tenant-occupied listings look like a gift — day-one income,
 * no lease-up risk — but the lease survives the sale, and most of the
 * time the rent it carries is below market. Cover the legal baseline
 * (leases transfer with the deed), the underwriting rule (in-place
 * rent, not pro forma), worked loss-to-lease and turnover-payback
 * math on a $250K duplex, the document checklist (estoppel, ledger,
 * deposits), closing mechanics, and the post-closing rent-increase
 * playbook. Companion to the rent-roll post: that one verifies the
 * numbers, this one covers buying the tenancy itself.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "buying-rental-property-with-tenants";
const TITLE_PLAIN =
  "Buying a rental property with tenants in place: the lease, the estoppel, and the below-market rent math (2026)";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE_PLAIN.
const SERP_TITLE = "Buying a rental property with tenants (2026)";
const DESCRIPTION =
  "Buying a rental with tenants in place: which lease terms survive the sale, estoppel certificates, deposit transfer, and the below-market rent math.";
const PUBLISHED_AT = "2026-07-13";
const MODIFIED_AT = "2026-07-13";
const READING_TIME = 11;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "buying a rental property with tenants",
    "buying a house with tenants in it",
    "do I have to honor the lease when I buy a rental",
    "inherited tenants",
    "estoppel certificate",
    "security deposit transfer property sale",
    "raising rent after buying a rental",
    "tenant occupied property",
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
    q: "Do I have to honor the existing lease when I buy a rental property?",
    a: "Yes. In every US state, a lease is attached to the property, not the owner — when the deed transfers, you step into the seller's shoes as landlord under the same terms: same rent, same end date, same deposit obligations, same renewal clauses. You cannot raise the rent, shorten the term, or move a tenant out mid-lease just because ownership changed. Month-to-month tenancies are the flexible exception: you inherit those too, but you can end or modify them with proper statutory notice — typically 30 to 60 days, longer in some states and cities. If you need the property vacant at closing, that has to be negotiated with the seller before closing, as a condition of the contract.",
  },
  {
    q: "What is an estoppel certificate and why do I need one?",
    a: "An estoppel certificate is a short form the tenant signs confirming the facts of their tenancy: the rent amount, lease start and end dates, the deposit they paid, any prepaid rent, and — critically — any side deals or landlord promises not written in the lease. Its legal effect is that the tenant is later 'estopped' from claiming something different, so the $200-a-month 'I mow the lawn' discount or the verbal promise of a new roof surfaces before closing instead of after. On any tenant-occupied purchase, make signed estoppels a contract contingency. If a seller resists producing them, treat that as information.",
  },
  {
    q: "What happens to security deposits when a rental property is sold?",
    a: "The deposits transfer to you — and so does the liability. At closing, the seller credits the total deposit amount to the buyer on the settlement statement, and from that moment the tenants' claims run against you, whether or not you actually collected the money. Verify the deposit amounts on the lease, the rent roll, and the estoppel certificate all match, confirm the credit appears on your closing statement, and check your state's rules: many require holding deposits in a separate or escrow account, and some require notifying tenants in writing of where their deposit now sits.",
  },
  {
    q: "How soon can I raise the rent after buying a tenant-occupied property?",
    a: "For a tenant on a fixed-term lease, not until the lease ends — the term you inherited binds you. At renewal, you can offer a new rate. For month-to-month tenants, you can raise rent after giving the statutory notice, commonly 30 days for smaller increases and 60 or 90 days for larger ones in many states, and always subject to any local rent-control or anti-gouging caps. The practical playbook for a well-below-market tenant is a staged path to market over one or two renewals, or a cash-for-keys offer if you want the unit back sooner — run the numbers first, because a paying tenant at 85% of market often beats a month of vacancy plus turn costs.",
  },
];

export default function BuyingRentalWithTenantsPost() {
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
              Buying a rental property with tenants in place: the lease, the
              estoppel, and the below-market rent math (2026)
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
              A tenant-occupied listing reads like a gift: rent from day one,
              no lease-up gap, a tenant already screened by someone else. And
              sometimes it is. But you&apos;re not just buying a building —
              you&apos;re buying a legal relationship you didn&apos;t
              negotiate, at a rent you didn&apos;t set, documented (you hope)
              in paperwork you haven&apos;t seen yet. The lease survives the
              sale in all fifty states, the deposits transfer with their
              liability attached, and the rent the tenant actually pays is the
              rent your lender — and your underwriting — must live with.
              Here&apos;s the whole picture: what legally carries over, the
              worked math on below-market tenants, the three documents that
              protect you, what happens at closing, and the playbook for
              getting an inherited rent to market without torching the
              relationship or the cash flow.
            </p>
          </header>

          <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The lease survives the sale — you&apos;re the new landlord, same
              deal
            </h2>
            <p>
              Start with the legal baseline, because everything else follows
              from it. A lease attaches to the property, not to the person who
              signed it as landlord. When the deed transfers, you inherit the
              lease exactly as written: the rent, the end date, the renewal
              options, the pet clause, the deposit terms. &quot;I&apos;m the
              new owner&quot; changes who collects the rent — nothing else. You
              can&apos;t raise the rent mid-term, can&apos;t shorten the lease,
              and can&apos;t ask a tenant with eight months remaining to leave
              because you&apos;d rather renovate. The two meaningful
              exceptions: <strong>month-to-month tenancies</strong>, which you
              also inherit but can modify or end with statutory notice
              (commonly 30–60 days, longer for long-tenured tenants in some
              states), and an <strong>early-termination-on-sale clause</strong>{" "}
              written into the original lease — rare, but worth checking for.
              If your plan requires the property vacant — a gut rehab, an
              owner-occupant loan with its move-in requirement — vacancy has
              to be negotiated with the <em>seller</em> as a condition of
              closing. It is the seller&apos;s problem to deliver, at the
              seller&apos;s cost, before the property becomes yours.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Underwrite the rent you&apos;re buying, not the rent in the ad
            </h2>
            <p>
              Listings for tenant-occupied properties love the phrase
              &quot;market rent $1,300.&quot; The number that matters is the
              one on the lease. Say you&apos;re looking at a{" "}
              <strong>$250,000 duplex</strong> with 25% down — a $187,500 loan
              at 7% on 30 years, about <strong>$1,247</strong> a month in
              principal and interest. The tenants in place pay $1,050 and
              $1,100; true market rent, confirmed the way the{" "}
              <Link
                href="/blog/how-to-estimate-rent-rental-property"
                className="text-primary font-semibold hover:underline"
              >
                rent estimation guide
              </Link>{" "}
              lays out, is $1,300 per side. That gap — $450 a month,{" "}
              <strong>$5,400 a year</strong> — is called{" "}
              <strong>loss to lease</strong>, and it belongs in your
              underwriting as a fact, not a footnote. At in-place rents the
              property grosses $25,800 a year; assume 40% of gross for
              operating expenses (taxes, insurance, vacancy, maintenance,
              management) and NOI is about <strong>$15,480</strong> — a{" "}
              <strong>6.2% cap rate</strong> on your price. At pro-forma
              market rents, the same math says $18,720 of NOI and a 7.5% cap.
              The seller is pricing you the second number; the bank account
              only receives the first. Run both through the{" "}
              <Link
                href="/#main"
                className="text-primary font-semibold hover:underline"
              >
                TrueCap analyzer
              </Link>{" "}
              and negotiate from in-place.
            </p>
            <p>
              Cash flow makes the point harder. Debt service runs $14,964 a
              year, so in-place NOI of $15,480 leaves{" "}
              <strong>$516 a year — $43 a month</strong> — of cash flow.
              Essentially break-even. At market rents the same building throws
              off $3,756 a year, about $313 a month. Both numbers are
              &quot;true&quot;; only one exists on the day you close, and
              getting from the first to the second takes renewals, notices,
              possibly turnovers — months, not a signature. Lenders already
              think this way: a DSCR lender underwrites to the{" "}
              <strong>lease in place</strong> (or the appraiser&apos;s market
              rent, if lower), so the below-market tenant doesn&apos;t just
              cost you monthly income — it can move your{" "}
              <Link
                href="/#main"
                className="text-primary font-semibold hover:underline"
              >
                DSCR
              </Link>{" "}
              down a pricing tier and raise your rate on top.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The turnover math: when chasing market rent pays, and when it
              doesn&apos;t
            </h2>
            <p>
              So a tenant is $250 under market. The reflex is &quot;get them
              to market or get them out.&quot; Do the arithmetic first,
              because turnover is the single most expensive routine event in
              rental ownership. Turning that $1,050 unit to re-lease at $1,300
              plausibly costs: one month vacant at the new rent
              (<strong>$1,300</strong>), make-ready paint, cleaning, and
              repairs (<strong>$2,500</strong> on a dated unit), and a leasing
              fee of half a month (<strong>$650</strong>) — call it{" "}
              <strong>$4,450</strong> all-in. The prize is $250 a month, or
              $3,000 a year, which means the turn pays for itself in about{" "}
              <strong>18 months</strong>. That&apos;s a fine trade if
              you&apos;re holding for years and the tenant was leaving anyway
              — and a bad one if the tenant would have accepted a staged
              increase to $1,175 at renewal, no vacancy, no make-ready. A
              long-tenured tenant paying 90% of market who treats the place
              well and always pays is frequently worth <em>more</em> than the
              spread, once you price the vacancy risk honestly — the{" "}
              <Link
                href="/blog/vacancy-rate-rental-property"
                className="text-primary font-semibold hover:underline"
              >
                vacancy rate guide
              </Link>{" "}
              covers what turnover actually does to a year of cash flow. The
              rule: price the gap, price the turn, and let the smaller number
              win.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The three documents that protect you
            </h2>
            <p>
              Every dollar of that analysis rests on the tenancy being what
              the seller says it is — so verify it in writing, before your
              inspection contingency expires. <strong>First, the actual
              leases</strong> — every page, every amendment, for every unit.
              Read for the rent, the end date, renewal options the tenant
              controls, and anything unusual: a purchase option, a
              rent-controlled addendum, a co-signer. <strong>Second, the
              rent ledger</strong> — twelve months of payment history showing
              what was collected and when, not just what was owed. A tenant
              &quot;paying&quot; $1,100 who actually pays $700 in week one and
              the rest whenever is a different asset than the rent roll
              implies; the{" "}
              <Link
                href="/blog/how-to-read-a-rent-roll"
                className="text-primary font-semibold hover:underline"
              >
                rent roll guide
              </Link>{" "}
              walks through the five places sellers&apos; income documents
              mislead. <strong>Third, a signed estoppel certificate from each
              tenant</strong>: a one-page form where the tenant confirms their
              rent, term, deposit, any prepaid rent, and any promises the
              landlord made outside the lease. The estoppel is where the
              verbal deals surface — the $150 discount for mowing, the
              &quot;landlord said he&apos;d replace the carpet,&quot; the
              deposit that was &quot;applied to last month&apos;s rent&quot;
              two owners ago. Make estoppels a contract contingency. A seller
              who won&apos;t produce them is telling you something.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Closing day mechanics: deposits, prorations, and the
              hello-letter
            </h2>
            <p>
              Three transfers happen at closing that first-time buyers of
              occupied property routinely fumble. <strong>Security
              deposits:</strong> the seller credits the full deposit total to
              you on the settlement statement, and the liability to return
              those deposits becomes yours — even if the credit never
              happened. Check that the lease amount, the estoppel amount, and
              the closing-statement credit all match, and put the money in a
              separate account if your state requires it (many do).{" "}
              <strong>Prorated rent:</strong> if you close on the 10th, the
              seller keeps ten days of that month&apos;s rent and credits you
              the other twenty — verify the proration uses rent actually
              collected. <strong>Notice to tenants:</strong> send a letter,
              ideally co-signed by the seller, on day one: who you are, where
              to pay, where their deposit is held, how to submit maintenance
              requests. Nothing destabilizes an inherited tenancy faster than
              a tenant who isn&apos;t sure the new owner is real —
              and nothing starts it better than rent that knows where to go on
              the first of the month.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Getting to market rent without burning the asset
            </h2>
            <p>
              Post-closing, you hold a below-market tenancy and three honest
              paths. <strong>Stage it at renewal.</strong> When the lease
              expires, offer renewal at a defensible step toward market —
              $1,050 to $1,175, then to $1,300 the following year. Tenants
              accept staged increases at a far higher rate than single jumps,
              and each signed renewal is another year of zero vacancy.{" "}
              <strong>Wait it out on month-to-month.</strong> Serve the
              statutory notice (30–60 days in most states; check local
              rent-cap ordinances first) and reprice. You keep the tenant if
              they stay, and you&apos;ve started the clock if they don&apos;t.{" "}
              <strong>Buy the unit back.</strong> If the plan needs the unit
              sooner — a renovation that justifies full market rent, an
              owner-move-in — a <strong>cash-for-keys</strong> offer is often
              cheaper than waiting: $1,500 for keys in three weeks, against a
              tenant nine months from lease-end who is $250 under market,
              costs you $1,500 to recover $2,250 of loss-to-lease plus the
              renovation months you didn&apos;t spend waiting. One caution
              that saves real money: if the inherited tenant holds a{" "}
              <Link
                href="/blog/section-8-rental-property-investing"
                className="text-primary font-semibold hover:underline"
              >
                Section 8 voucher
              </Link>
              , the increase goes through the housing authority&apos;s
              reasonable-rent review on its timeline, not yours — underwrite
              the current contract rent and treat approval of an increase as
              upside.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Five mistakes buyers make with inherited tenants
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Underwriting the pro-forma rent.</strong> The listing
                says $1,300; the lease says $1,050. Your mortgage gets paid
                out of the lease. Buy on in-place numbers and treat the gap as
                earned upside, not day-one income.
              </li>
              <li>
                <strong>Skipping estoppels because the rent roll looks
                clean.</strong> The rent roll is the seller&apos;s claim; the
                estoppel is the tenant&apos;s sworn version. The gap between
                the two is exactly where post-closing surprises live.
              </li>
              <li>
                <strong>Forgetting the deposits are a liability.</strong> If
                the credit isn&apos;t on the settlement statement, you just
                donated a month&apos;s rent per unit to the seller — and you
                still owe the tenants every dollar when they move out.
              </li>
              <li>
                <strong>Raising rent to market in week one.</strong> Even
                where notice periods allow it, a maximal increase on day one
                converts your best-case scenario (cooperative tenant, staged
                path to market) into your worst (immediate vacancy, hostile
                move-out, full turn cost).
              </li>
              <li>
                <strong>Assuming an owner-occupant loan works on an occupied
                property.</strong> FHA and other owner-occupant programs
                require you to move in within 60 days. A tenant with ten
                months left on the lease makes that impossible — vacancy at
                closing has to be in the contract, or the financing
                doesn&apos;t fit the plan.
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
              Tenants in place are neither a bonus nor a defect — they&apos;re
              a term of the deal, and they should be priced like one. The
              lease transfers with the deed, so underwrite the rent it
              actually carries: on the worked duplex, that&apos;s the
              difference between $43 and $313 a month of cash flow on the
              same building. Verify the tenancy with leases, a real payment
              ledger, and signed estoppels before your contingencies expire;
              collect the deposit credit at closing; and get to market rent
              on a schedule the turnover math supports rather than the one
              your pro-forma wishes for. A below-market tenant you bought at
              the right price is a good problem — loss to lease is upside you
              control, which beats upside you have to hope for. Run the deal
              both ways — in-place and at market — through the{" "}
              <Link href="/" className="text-primary font-semibold hover:underline">
                TrueCap analyzer
              </Link>{" "}
              and make sure it works on the first set of numbers before you
              pay for the second. None of this is legal advice: notice
              periods, deposit rules, and rent caps vary by state and city —
              verify the rules where the property sits.
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
