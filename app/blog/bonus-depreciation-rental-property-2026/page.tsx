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
const TITLE = "Bonus depreciation on rental property in 2026: what changed, what's left, and how to use it";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Bonus depreciation on rental property in 2026";
const DESCRIPTION =
  "Bonus depreciation phased down from 100% in 2022 to 40% in 2025 and 20% in 2026. But cost segregation studies, the short-term rental loophole, and the real-estate professional designation still create real tax savings. Here&apos;s the current playbook.";
const PUBLISHED_AT = "2026-06-07";
const MODIFIED_AT = "2026-06-07";
const READING_TIME_MIN = 13;

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
    a: "Normal depreciation lets you deduct a building's cost over 27.5 years (residential) or 39 years (commercial) — about 3.6%/year. Bonus depreciation lets you deduct certain shorter-life components (5/7/15-year life: appliances, carpet, fencing, landscaping, etc.) immediately in year 1 instead of stretching over their life. From 2018-2022 bonus depreciation was 100%. The TCJA phase-down took it to 80% (2023), 60% (2024), 40% (2025), 20% (2026), 0% (2027) — unless Congress extends it.",
  },
  {
    q: "Is bonus depreciation gone in 2026?",
    a: "Not yet. The 2026 rate is 20% — meaning if a cost segregation study identifies $80K of 5/15-year property, you can deduct $16K immediately (20% × $80K) and depreciate the remaining $64K over its normal 5-15 year schedule. The phase-down continues to 0% in 2027 unless Congress acts. Several bills have proposed extending or restoring 100% bonus depreciation — watch the news cycle.",
  },
  {
    q: "What is a cost segregation study and is it worth it in 2026?",
    a: "A cost seg study is an engineering analysis that breaks down a building's cost into its components: structure (27.5/39 year), 15-year land improvements (landscaping, fencing, parking), 5-year personal property (appliances, carpet, decorative lighting). Without a study, everything gets lumped into 27.5/39-year depreciation. With one, you accelerate 20-35% of the building cost into shorter-life buckets that can take bonus depreciation. Cost: $3-8K for residential, $7-15K for small commercial. Worth it any time the net present value of the accelerated deduction exceeds the study cost — usually true on properties $400K+.",
  },
  {
    q: "What is the short-term rental tax loophole?",
    a: "STR rental losses can offset W-2 / active income if (a) the average stay is 7 days or less, AND (b) you materially participate (100+ hours/year and more than anyone else, or 500+ hours). Most long-term rental losses are passive and can only offset passive income, but STR losses meeting these tests are non-passive — they offset your W-2. Combined with bonus depreciation, this is how high-earners zero out W-2 income with rental real estate.",
  },
  {
    q: "What is real estate professional status (REPS)?",
    a: "REPS is an IRS designation that lets all your rental losses offset W-2 / active income (not just STR). Requirements: (a) more than 50% of your total working time in real property trades or businesses, AND (b) more than 750 hours/year. For most W-2 employees with rentals on the side, this is unattainable. For full-time real estate investors, agents, contractors, and property managers, it's the most powerful tax planning tool in the code.",
  },
  {
    q: "How does the IRS know what hours I worked?",
    a: "They don't — until they audit. Then they ask for contemporaneous time logs. Calendar entries, project management software, dated photos, emails, contractor invoices that show your involvement. Reconstructing hours from memory after the fact is a losing audit defense. If you're claiming REPS or STR material participation, log hours weekly in a spreadsheet or app. Cheap insurance.",
  },
  {
    q: "What happens to depreciation when I sell?",
    a: "It's recaptured. Depreciation reduces your tax basis in the property; on sale, the IRS taxes the gain attributable to depreciation at the depreciation recapture rate (max 25%) — separate from the long-term capital gains rate on appreciation. A 1031 exchange defers both indefinitely. Holding until death and passing to heirs eliminates both via stepped-up basis. So depreciation is a tax deferral, not always an elimination — but deferral with proper exit planning becomes elimination.",
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
            Bonus depreciation phased down from 100% in 2022 to 40% in
            2025 and 20% in 2026. But cost segregation studies, the
            short-term rental loophole, and the real-estate professional
            designation still create real tax savings. Here&apos;s the
            current playbook.
          </p>
        </header>

        <article className="prose prose-slate max-w-none [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground [&_li]:leading-relaxed [&_strong]:text-foreground">
          <p>
            Bonus depreciation is the most powerful tax tool in
            residential real estate investing — and 2026 is the
            second-to-last year you can use it before the current
            phase-down hits zero in 2027. This post walks through what
            changed, what&apos;s still available, and the three
            strategies that actually move the needle: cost segregation,
            the STR loophole, and real estate professional status.
          </p>
          <p>
            This is educational content, not tax advice — every strategy
            here has real eligibility tests and audit risk. Run anything
            you&apos;re considering past a CPA who works with real estate
            investors before you act on it.
          </p>

          <h2 className="text-2xl sm:text-3xl">What changed and what&apos;s the 2026 rate</h2>
          <p>
            From 2018 through 2022, the Tax Cuts and Jobs Act let
            investors take <strong>100% bonus depreciation</strong> on
            qualifying short-life property in year 1. That created the
            golden era of accelerated depreciation: cost seg studies on
            $500K rentals were producing $100K+ first-year deductions.
          </p>
          <p>The TCJA built in a phase-down. Current schedule:</p>
          <div className="not-prose overflow-x-auto rounded-xl border border-border bg-card my-6">
            <table className="w-full min-w-[400px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left p-3 font-bold text-foreground">Year</th>
                  <th className="text-left p-3 font-bold text-foreground">Bonus depreciation rate</th>
                </tr>
              </thead>
              <tbody className="[&_td]:p-3 [&_td]:border-b [&_td]:border-border [&_tr:last-child_td]:border-0">
                <tr><td>2022 and earlier</td><td>100%</td></tr>
                <tr><td>2023</td><td>80%</td></tr>
                <tr><td>2024</td><td>60%</td></tr>
                <tr><td>2025</td><td>40%</td></tr>
                <tr><td className="font-bold text-foreground">2026</td><td className="font-bold text-foreground">20%</td></tr>
                <tr><td>2027+</td><td>0% (unless extended)</td></tr>
              </tbody>
            </table>
          </div>
          <p>
            Several bills in 2025-2026 have proposed extending or
            restoring 100% bonus depreciation. None have passed at the
            time of writing. Assume 20% for 2026 planning; revisit if
            Congress acts.
          </p>

          <h2 className="text-2xl sm:text-3xl">How depreciation works (and why bonus matters)</h2>
          <p>
            Residential rental buildings depreciate straight-line over
            <strong> 27.5 years</strong>. So a $400K rental (excluding
            land) deducts $14,545/year regardless of what you do. Bonus
            depreciation doesn&apos;t change that for the building shell.
          </p>
          <p>
            What it changes is the treatment of shorter-life property
            embedded in the building. Without a cost segregation study,
            the entire $400K is depreciated at 27.5 years. With a study,
            an engineer might break it down as:
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
            The $120K of 5/15-year property is eligible for bonus
            depreciation. At the 2026 rate of 20%, that&apos;s
            <strong> $24K of immediate first-year deduction</strong> on
            top of the normal depreciation. The remaining $96K depreciates
            over its 5-15 year life on a normal schedule.
          </p>

          <h2 className="text-2xl sm:text-3xl">Strategy 1: Cost segregation</h2>
          <p>
            A cost seg study is an engineering analysis (usually 4-8
            weeks turnaround) that produces an IRS-defensible breakdown
            of your building cost into its components.
          </p>
          <p>Economics in 2026:</p>
          <ul>
            <li><strong>Study cost:</strong> $3-8K for typical
              residential ($300K-1M building cost); $7-15K for small
              commercial.</li>
            <li><strong>Typical reclassification:</strong> 20-35% of
              building cost moves into 5/15-year buckets.</li>
            <li><strong>First-year bonus deduction (2026, 20%):</strong>
              on a $400K building, ~$24K immediate deduction.</li>
            <li><strong>Tax savings at 32% marginal bracket:</strong>
              ~$7.7K in actual cash kept.</li>
            <li><strong>Plus accelerated regular depreciation</strong>
              on the remaining 5/15-year property over the next 5-15
              years.</li>
          </ul>
          <p>
            Rule of thumb: cost seg pays off when net present value of
            accelerated depreciation exceeds 1.5x the study cost. That
            usually means properties of $400K+ in building cost (i.e.
            excluding land value).
          </p>
          <p>
            <strong>The catch:</strong> if the depreciation creates a
            passive loss and you don&apos;t have passive income to
            offset it, the loss is suspended — it carries forward but
            doesn&apos;t save you cash this year. Which is where the
            next two strategies come in.
          </p>

          <h2 className="text-2xl sm:text-3xl">Strategy 2: The STR loophole</h2>
          <p>
            Most rental real estate is &ldquo;passive activity&rdquo;
            under IRC §469. Passive losses can only offset passive
            income. So a $40K depreciation loss on a long-term rental
            usually just suspends — it can&apos;t reduce your $300K W-2
            salary&apos;s tax bill.
          </p>
          <p>
            Short-term rentals are different. If the property meets
            <strong> both</strong>:
          </p>
          <ul>
            <li><strong>Average stay of 7 days or less</strong> (the
              &ldquo;hotel&rdquo; test), AND</li>
            <li><strong>You materially participate</strong> — meet one
              of seven IRS tests, most commonly: (a) 500+ hours/year on
              the activity, or (b) 100+ hours and more than anyone else.</li>
          </ul>
          <p>
            ...then the activity is non-passive and losses offset your
            W-2 income. This is the &ldquo;STR loophole&rdquo; that&apos;s
            powered an entire micro-industry of high-earners buying Smoky
            Mountains cabins.
          </p>
          <p>
            Combined with cost seg + bonus depreciation, a $500K STR can
            generate $80-100K of first-year losses that wipe out W-2
            income in your top tax bracket — a $25-35K real cash tax
            savings in year 1. After year 1 the tax benefit drops sharply
            (the big accelerated deduction is gone), but the cumulative
            impact over 5-10 years is large.
          </p>
          <p>
            <strong>The audit risk:</strong> the IRS knows this strategy
            cold and audits it. Material participation hours need to be
            logged contemporaneously, not reconstructed from memory after
            the audit notice arrives. Use a calendar app or spreadsheet
            and log hours weekly. The &ldquo;more than anyone
            else&rdquo; test specifically requires that you spend more
            time than your cleaner, your handyman, and your co-host
            combined — usually meaning self-managed STRs only.
          </p>

          <h2 className="text-2xl sm:text-3xl">Strategy 3: Real estate professional status (REPS)</h2>
          <p>
            REPS is the heavy artillery: it makes <em>all</em> your
            rental losses non-passive, not just STR. So a portfolio of
            long-term rentals with cost seg studies can wipe out W-2
            income at scale.
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
            For a W-2 employee working 2,000 hours/year at a day job,
            REPS is unreachable (you&apos;d need 2,001 hours of real
            estate work). For a spouse who doesn&apos;t work outside the
            home and manages the rental portfolio, it&apos;s a real
            option. For full-time real estate agents, contractors, and
            property managers, it&apos;s often automatic.
          </p>
          <p>Common audit failures:</p>
          <ul>
            <li>No contemporaneous time log.</li>
            <li>Brokerage license alone doesn&apos;t qualify — you must
              <em> materially participate</em> in the real estate
              activity, not just hold the license.</li>
            <li>Married filing jointly — only ONE spouse needs to meet
              the test, but that spouse must individually meet both 50%
              and 750-hour tests (you can&apos;t aggregate spousal
              hours).</li>
          </ul>

          <h2 className="text-2xl sm:text-3xl">Depreciation recapture — the back end</h2>
          <p>
            Bonus depreciation is a deferral tool, not a free deduction.
            When you sell, the IRS &ldquo;recaptures&rdquo; the
            depreciation: the gain attributable to depreciation is taxed
            at up to 25% (Section 1250 recapture), separate from the
            long-term capital gains rate on actual appreciation.
          </p>
          <p>Three exit strategies that preserve the deferred-tax benefit:</p>
          <ul>
            <li><strong>1031 exchange.</strong> Roll the gain into a
              like-kind replacement property; depreciation recapture is
              deferred along with capital gains. <Link href="/blog/1031-exchange-basics" className="text-primary font-semibold hover:underline">Full 1031 walkthrough here</Link>.</li>
            <li><strong>Hold until death.</strong> Heirs receive
              stepped-up basis — depreciation recapture is eliminated
              entirely.</li>
            <li><strong>Opportunity zone fund.</strong> Defer and
              partially eliminate capital gains by reinvesting in QOFs
              (current program through 2026).</li>
          </ul>
          <p>
            Without an exit strategy, depreciation is just a 10-30 year
            zero-interest loan from the IRS. With one, it can become
            permanent tax-free wealth.
          </p>

          <h2 className="text-2xl sm:text-3xl">Bottom-line decision tree</h2>
          <p>For 2026:</p>
          <ol>
            <li>Buying a long-term rental for under $400K building cost?
              Skip cost seg. The study cost rarely pencils at that scale
              with 20% bonus.</li>
            <li>Buying a long-term rental for $400K+? Consider cost seg.
              Most cost seg firms will run a free preliminary ROI
              estimate from photos and the closing statement before you
              commit.</li>
            <li>Buying an STR you&apos;ll self-manage? Cost seg + STR
              loophole is usually a big win for W-2 earners. Make
              contemporaneous hour logging your day-one habit.</li>
            <li>You or your spouse can plausibly qualify for REPS? Cost
              seg on every property in your portfolio is usually a win.
              Hire a REPS-specialist CPA.</li>
            <li>2027 planning: assume bonus depreciation goes to zero
              unless Congress acts. Acquisitions you can close before
              year-end 2026 capture the last 20% bonus year.</li>
          </ol>

          <div className="not-prose">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-bold hover:opacity-95 transition-opacity"
            >
              <Calculator className="w-4 h-4" />
              Model the tax impact on a specific deal
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
            specific deal? TrueCap models 10-year tax strategy scenarios
            (including cost seg + bonus depreciation) so you can see the
            cash impact before you buy.{" "}
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
