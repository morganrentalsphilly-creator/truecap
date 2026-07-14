/**
 * Blog post: Rental property insurance — landlord coverage, cost, and
 * how it flows into the underwrite.
 *
 * Content-gap post (Jun 2026). Targets "landlord insurance", "rental
 * property insurance", "how much is landlord insurance", "dwelling fire
 * policy", "loss of rent coverage". Insurance is the most-underestimated
 * line in a rental underwrite and the "I" in PITI — this post ties it
 * back to NOI, cash flow, and DSCR so it funnels into the analyzer.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Calculator, Umbrella } from "lucide-react";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "rental-property-insurance";
const TITLE =
  "Rental property insurance: landlord coverage and cost in 2026";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Rental property insurance: coverage & cost (2026)";
const DESCRIPTION =
  "Landlord insurance is the line most investors guess at — and the fastest-rising operating cost in 2026. What a landlord policy covers vs. homeowners, what it costs this year, how to estimate it before you have a quote, and how the premium flows straight into NOI, cash flow, and DSCR.";
const PUBLISHED_AT = "2026-06-23";
const MODIFIED_AT = "2026-06-23";
const READING_TIME_MIN = 11;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "rental property insurance",
    "landlord insurance",
    "how much is landlord insurance",
    "landlord insurance cost",
    "dwelling fire policy",
    "DP-3 policy",
    "loss of rent coverage",
    "rental property insurance cost 2026",
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
    q: "How much does landlord insurance cost in 2026?",
    a: "For a standard single-family rental, expect roughly $1,200 to $1,900 per year nationally — about 15-25% more than a comparable homeowners policy, and up high-single-digits year over year. Coastal Florida, wildfire-exposed California, and Gulf states run far higher; low-risk Midwest markets run lower. Treat any national average as a placeholder until you have a binding quote for the specific address.",
  },
  {
    q: "Does my homeowners policy cover a rental property?",
    a: "No. A standard homeowners (HO-3) policy is written for an owner-occupant. The moment a property is tenant-occupied, the carrier can deny a claim or void the policy because the occupancy was misrepresented. Rentals need a landlord policy — usually a dwelling fire policy (DP-1, DP-2, or DP-3) plus landlord liability — not a homeowners policy.",
  },
  {
    q: "What is loss of rent (fair rental value) coverage?",
    a: "It reimburses the rent you lose while a covered loss (fire, storm damage, etc.) makes the unit uninhabitable and it is being repaired. It is one of the most valuable parts of a landlord policy and is frequently underset — make sure the limit reflects your actual rent for a realistic repair timeline, not a token amount.",
  },
  {
    q: "Is landlord insurance tax deductible?",
    a: "Yes. Insurance premiums on a rental are a fully deductible operating expense, reported on Schedule E. So is the premium on a separate flood or umbrella policy tied to the rental. It reduces taxable rental income the same year you pay it.",
  },
  {
    q: "Do I need separate flood insurance?",
    a: "Often, yes. Standard landlord policies exclude flood entirely — flood is covered by a separate NFIP or private flood policy. If the property sits in a FEMA flood zone and you have a mortgage, the lender will require it. Even outside mapped zones, a meaningful share of flood claims come from 'low-risk' areas, so it is worth pricing.",
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
    author: { "@type": "Person", name: "Morgan Page", url: siteUrl },
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
            {new Date(PUBLISHED_AT).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}{" "}
            · {READING_TIME_MIN} min read
          </p>
          <p className="text-base sm:text-lg text-muted-foreground mt-4 leading-relaxed">
            {DESCRIPTION}
          </p>
        </header>

        <article className="prose prose-slate max-w-none [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground [&_li]:leading-relaxed [&_strong]:text-foreground">
          <p>
            Ask ten investors what insurance costs on a rental and you&apos;ll
            get ten guesses — usually too low, often just copied from the
            seller&apos;s old premium. That was a rounding error in 2015. In 2026
            it&apos;s one of the largest and fastest-moving lines in the whole
            underwrite, and in some markets it&apos;s the single variable that
            decides whether a deal cash flows at all.
          </p>
          <p>
            This is the practical version: what a landlord policy actually is,
            what it covers, what it costs this year, how to estimate it before
            you have a quote, and — the part most guides skip — how the premium
            flows straight through{" "}
            <Link href="/blog/piti-explained-rental-property" className="text-primary font-semibold hover:underline">PITI</Link>{" "}
            into{" "}
            <Link href="/blog/how-to-calculate-noi-rental-property" className="text-primary font-semibold hover:underline">NOI</Link>,
            cash flow, and{" "}
            <Link href="/glossary/dscr" className="text-primary font-semibold hover:underline">DSCR</Link>.
          </p>

          <h2 className="text-2xl sm:text-3xl">Landlord insurance is not homeowners insurance</h2>
          <p>
            The first and most expensive mistake is assuming a rental can ride
            on a homeowners policy. A standard homeowners policy (an HO-3) is
            written for an <em>owner-occupant</em>. The moment a property is
            tenant-occupied, you&apos;ve changed the risk the carrier priced — and
            if you have a claim, they can deny it or rescind the policy on the
            grounds that the occupancy was misrepresented.
          </p>
          <p>
            Rentals are insured with a <strong>landlord policy</strong>, which is
            usually a <strong>dwelling fire policy</strong> (the DP series —
            DP-1, DP-2, or DP-3) plus landlord liability:
          </p>
          <ul>
            <li><strong>DP-1</strong> — barebones, named-peril, actual cash value. Cheapest; pays out depreciated value, not replacement cost. Common on low-value or older properties where replacement cost coverage isn&apos;t economical.</li>
            <li><strong>DP-2</strong> — broader named perils, usually replacement cost on the dwelling.</li>
            <li><strong>DP-3</strong> — the most common landlord choice: open-peril (covers anything not explicitly excluded), replacement cost. This is the one to anchor on for a typical single-family or small-multi rental.</li>
          </ul>

          <h2 className="text-2xl sm:text-3xl">What a landlord policy actually covers</h2>
          <p>Four buckets matter, and one of them is the one investors forget:</p>
          <ol>
            <li><strong>Dwelling + other structures</strong> — the building itself (and detached garage, fence) up to your coverage limit, ideally at replacement cost.</li>
            <li><strong>Landlord liability</strong> — if a tenant or visitor is injured and you&apos;re found liable. $300k-$1M is typical; pair it with an umbrella policy if you hold multiple properties.</li>
            <li><strong>Loss of rent (fair rental value)</strong> — reimburses the rent you lose while a covered loss makes the unit uninhabitable during repairs. This is the line investors chronically underset, and it&apos;s the one that protects your cash flow exactly when you need it.</li>
            <li><strong>Optional add-ons</strong> — ordinance/law (to rebuild to current code), vandalism/malicious mischief, and equipment breakdown.</li>
          </ol>
          <p>
            What it does <strong>not</strong> cover: the tenant&apos;s belongings
            (that&apos;s on their renters policy — require it in the lease),
            <strong> flood</strong> (always a separate policy), and in many
            coastal markets, <strong>wind/named-storm</strong> is carved out into
            a separate deductible or policy. Read the exclusions page before you
            trust the headline premium.
          </p>

          <h2 className="text-2xl sm:text-3xl">What it costs in 2026</h2>
          <p>
            National averages for a standard single-family rental land roughly in
            the <strong>$1,200-$1,900 per year</strong> range — call it
            ~$100-$160 a month — and landlord coverage typically runs{" "}
            <strong>15-25% higher</strong> than a comparable homeowners policy,
            because a rental is considered higher-risk. Premiums are still rising
            into 2026 at high-single-digit rates year over year, driven by
            construction-cost inflation, weather losses, and a broad shift to
            risk-based pricing.
          </p>
          <p>
            The averages hide enormous regional spread. The number that matters
            is the one for <em>your</em> address:
          </p>
          <ul>
            <li><strong>Coastal Florida and the Gulf</strong> — post-Ian carrier exits and reinsurance costs have made this the biggest single underwriting variable. A 7% headline cap rate can quietly become 5% net once a binding wind + flood quote lands. See the{" "}
              <Link href="/states/florida" className="text-primary font-semibold hover:underline">Florida investing guide</Link>{" "}for why insurance — not price — is the FL deal-killer in 2026.</li>
            <li><strong>Wildfire-exposed California and parts of the West</strong> — non-renewals and FAIR-plan reliance push premiums up and coverage down.</li>
            <li><strong>Low-risk Midwest</strong> — Indiana, Ohio, and similar inland markets sit at the low end of the range, which is part of why they pencil for cash flow.</li>
          </ul>
          <p>
            <em>Treat every national figure as a placeholder.</em> The seller&apos;s
            expiring premium is the worst possible estimate — it reflects their
            claims history, their carrier, and last year&apos;s rates, none of which
            transfer to you. Get a binding quote before you remove contingencies.
          </p>

          <h2 className="text-2xl sm:text-3xl">How to estimate it before you have a quote</h2>
          <p>
            You still need a number to screen a deal in 60 seconds, before any
            broker is involved. Two workable rules of thumb:
          </p>
          <ul>
            <li><strong>~0.5% of property value per year</strong> for a low-risk inland market — e.g. ~$1,250 on a $250k property.</li>
            <li><strong>~0.8-1.5%+ of value per year</strong> for coastal, wind-exposed, wildfire, or older homes — the same $250k property could be $2,500-$4,000+ on the Gulf.</li>
          </ul>
          <p>
            When you run an address in{" "}
            <Link href="/" className="text-primary font-semibold hover:underline">TrueCap</Link>, a market-appropriate insurance default is already filled in alongside property tax and rent — so your first-pass cash flow isn&apos;t silently ignoring the line. Then you replace it with the real quote as soon as you have one.
          </p>

          <h2 className="text-2xl sm:text-3xl">Where the premium actually lands in the underwrite</h2>
          <p>
            Insurance isn&apos;t a footnote — it shows up twice and moves the
            numbers most underwriters care about:
          </p>
          <ul>
            <li>It&apos;s the <strong>&quot;I&quot; in PITI</strong> — part of the monthly payment your lender (and your DSCR) cares about.</li>
            <li>It&apos;s an <strong>operating expense in NOI</strong>, so it directly lowers your{" "}
              <Link href="/glossary/cap-rate" className="text-primary font-semibold hover:underline">cap rate</Link>{" "}and cash flow.</li>
          </ul>
          <p>
            Make it concrete. Take a $250,000 single-family rental, $1,650 rent,
            25% down at 7%. Underwrite insurance at a clean $1,500/year and the
            deal might show roughly <strong>+$150/month</strong> cash flow. Now
            put the same property on the Gulf and the binding quote comes back at
            <strong> $3,500/year</strong> — that&apos;s an extra ~$167/month of
            expense, which alone flips the deal to roughly{" "}
            <strong>−$17/month</strong> and drags{" "}
            <Link href="/glossary/dscr" className="text-primary font-semibold hover:underline">DSCR</Link>{" "}
            below the 1.20 most lenders want. Same house, same rent, same loan —
            the insurance line decided it.
          </p>

          <h2 className="text-2xl sm:text-3xl">Five insurance mistakes that wreck an underwrite</h2>
          <ol>
            <li><strong>Using the seller&apos;s premium.</strong> It&apos;s the single most common error and almost always understates your real cost. Quote it fresh.</li>
            <li><strong>Ignoring flood.</strong> It&apos;s excluded from the landlord policy and required by lenders in FEMA zones. Price it separately; don&apos;t assume the dwelling policy has you covered.</li>
            <li><strong>Confusing replacement cost with market value.</strong> You insure the cost to <em>rebuild</em>, not the purchase price. In low-cost markets the rebuild cost can exceed the price you paid — underinsuring triggers coinsurance penalties at claim time.</li>
            <li><strong>Setting loss-of-rent too low.</strong> A token limit won&apos;t carry you through a six-month rebuild. Match it to your actual rent and a realistic timeline.</li>
            <li><strong>Skipping liability/umbrella.</strong> A single liability claim can exceed the value of the property. For multi-property investors an umbrella policy is cheap relative to the exposure.</li>
          </ol>

          <div className="not-prose">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-bold hover:opacity-95 transition-opacity"
            >
              <Calculator className="w-4 h-4" />
              Run a deal with real insurance numbers
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          <p>
            TrueCap fills in a market-appropriate insurance estimate with your
            property tax and rent, then lets you drop in the binding quote and
            watch cap rate, cash flow, and DSCR update on the same screen — so
            the most volatile line in 2026 underwriting is never the one you
            guessed at. Premiums are also fully deductible on{" "}
            <Link href="/blog/schedule-e-rental-property" className="text-primary font-semibold hover:underline">Schedule E</Link>, and they belong in the same monthly-reserve conversation as{" "}
            <Link href="/blog/capex-maintenance-reserves-rental-property" className="text-primary font-semibold hover:underline">CapEx and maintenance reserves</Link>.
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

          <p className="text-sm text-muted-foreground">
            <Umbrella className="inline w-4 h-4 mr-1 align-text-bottom" />
            This is general educational information, not insurance advice.
            Coverage, exclusions, and pricing vary by carrier, state, and
            property — confirm specifics with a licensed insurance agent before
            you buy.
          </p>
        </article>

        <RelatedBlogPosts currentSlug={SLUG} />
        <div className="max-w-3xl mx-auto px-4 sm:px-6"><NewsletterSignup variant="expanded" source="blog" /></div>

        <footer className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Related:{" "}
            <Link href="/blog/piti-explained-rental-property" className="font-bold text-foreground hover:underline">
              PITI explained →
            </Link>{" "}
            ·{" "}
            <Link href="/blog/how-to-calculate-noi-rental-property" className="font-bold text-foreground hover:underline">
              How to calculate NOI →
            </Link>{" "}
            ·{" "}
            <Link href="/blog/capex-maintenance-reserves-rental-property" className="font-bold text-foreground hover:underline">
              CapEx &amp; reserves →
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
