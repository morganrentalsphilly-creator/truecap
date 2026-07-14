/**
 * Blog post: How to estimate rehab costs on a rental property.
 *
 * Targets queries: "how to estimate rehab costs", "rental property
 * rehab budget", "BRRRR rehab estimate", "renovation cost rental
 * property", "rehab budget for flip".
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "how-to-estimate-rehab-costs";
const TITLE =
  "How to estimate rehab costs on a rental property — the honest framework";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "How to estimate rehab costs on a rental (2026)";
const DESCRIPTION =
  "Walking through a property with a budget number in your head — the framework experienced investors use. Sq-ft pricing for cosmetic, kitchen, bath, and systems. Plus the 25% contingency rule most beginners skip.";
const PUBLISHED_AT = "2026-05-27";
const MODIFIED_AT = "2026-06-01";
const READING_TIME = 12;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "how to estimate rehab costs",
    "rental property rehab budget",
    "BRRRR rehab estimate",
    "renovation cost rental property",
    "rehab budget for flip",
    "kitchen renovation cost rental",
    "fix and flip rehab estimate",
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
    q: "What's a realistic rehab budget per square foot for a rental?",
    a: "Cosmetic refresh (paint, flooring, light fixtures): $5-12/sqft. Kitchen + bath update: $15-25/sqft total project. Full gut (down to studs): $50-90/sqft. These are mid-market 2024-25 contractor prices. Adjust ±20% by metro: SF/NYC/Boston run higher, secondary metros run lower.",
  },
  {
    q: "How much should I budget for a kitchen renovation in a rental?",
    a: "Rental-quality kitchen renovation: $8-15k. That covers stock cabinets, laminate or quartz counters, mid-tier appliances, basic backsplash, and labor. Don't over-improve — granite + custom cabinets in a $1,400 rent neighborhood doesn't raise rent enough to justify the cost. Match finish quality to rent tier.",
  },
  {
    q: "What's the contingency rule for rehab budgets?",
    a: "Always add 20-25% contingency to your estimate. The honest reason: hidden conditions show up once you open walls. Knob-and-tube electrical, galvanized supply lines, mold behind drywall, foundation issues — the older the property, the more likely. Budget the contingency from day one; never plan to spend it but plan to have it.",
  },
  {
    q: "Should I get contractor bids before buying?",
    a: "Yes, on properties where the rehab is significant (>$15k). Most contractors will do a walk-through bid within 48-72 hours for a serious buyer. Get 3 bids on anything over $25k. The spread between best and worst bid on the same scope often runs 30-50% — far more than people expect. Without competitive bids, you're paying whatever the contractor wants.",
  },
  {
    q: "What's the most commonly underestimated rehab cost?",
    a: "Systems work — electrical, plumbing, HVAC. They're invisible from a property walk, expensive to replace, and often non-optional in older properties. A pre-1970 property typically needs $10-25k of systems work that's not visible during walkthrough. Get a thorough inspection (better: a contractor walkthrough alongside the inspector) before committing.",
  },
];

export default function RehabEstimatePost() {
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
            Rehab budget is where most BRRRR and fix-and-flip deals quietly fail. Not because investors don&apos;t know what work needs doing — but because they walk a property, generate a number in their head, and that number is consistently 25-40% under the real cost. Here&apos;s the framework experienced investors use to estimate rehab on the spot, with mid-market 2026 contractor pricing.
          </p>
        </header>

        <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            The three-bucket framework
          </h2>
          <p>
            Every rehab estimate breaks into three buckets. Walk the property with these in mind and you&apos;ll have a workable estimate by the time you leave.
          </p>
          <ul>
            <li>
              <strong>Cosmetic:</strong> paint, flooring, light fixtures, door hardware, plumbing fixtures, blinds. The stuff you see.
            </li>
            <li>
              <strong>Functional:</strong> kitchens, baths, appliances, water heater, HVAC. Big-ticket items that affect rent.
            </li>
            <li>
              <strong>Structural / systems:</strong> roof, foundation, electrical, plumbing, framing. Expensive, often hidden, hardest to estimate from a walk.
            </li>
          </ul>
          <p>
            The bucket order is also the risk order. Cosmetic costs are predictable. Functional costs have some variability. Systems costs can swing your entire deal — and they&apos;re the hardest to see during a walkthrough.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            Bucket 1: Cosmetic — $5-12/sqft
          </h2>
          <p>
            Full cosmetic refresh on a 1,200 sqft property runs $6,000-14,400. What that covers:
          </p>
          <ul>
            <li>Interior paint, all rooms ($2,500-4,500 for 1,200 sqft)</li>
            <li>Flooring replacement — LVP throughout ($3-7/sqft installed = $3,600-8,400)</li>
            <li>Light fixtures throughout ($400-900)</li>
            <li>Door hardware, switch plates, smoke detectors ($300-500)</li>
            <li>Window treatments / blinds ($300-700)</li>
            <li>Final cleaning + trash haul ($400-900)</li>
          </ul>
          <p>
            Cosmetic-only refreshes are the lowest-risk rehab type. If you can keep the kitchen and bath functional and just paint + floor + clean, you can produce a rent-ready property for under $10k in many markets.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            Bucket 2: Functional — the big-ticket items
          </h2>

          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">
            Kitchen: $8-15k for rental-quality
          </h3>
          <p>
            Rental-quality kitchen (not flip-quality) on stock cabinets, laminate or quartz counters, mid-tier appliances:
          </p>
          <ul>
            <li>Cabinets ($2,500-5,500 for stock; $7,500+ for semi-custom)</li>
            <li>Countertops ($1,500-3,500 for laminate or entry quartz)</li>
            <li>Sink + faucet ($350-700)</li>
            <li>Appliances — range, fridge, dishwasher, microwave ($1,800-3,200 for mid-tier)</li>
            <li>Backsplash + cabinet hardware ($600-1,200)</li>
            <li>Plumbing + electrical adjustments ($500-1,200)</li>
            <li>Demo + install labor ($1,500-3,000)</li>
          </ul>
          <p>
            Don&apos;t over-improve. Granite + soft-close cabinets + Bosch appliances in a $1,400-rent neighborhood doesn&apos;t move rent enough to justify the cost. Match finish quality to rent tier — landlords in C-class neighborhoods waste $5-10k routinely by buying B+ finishes.
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">
            Bathroom: $4-9k each
          </h3>
          <ul>
            <li>Vanity + sink + faucet ($400-1,200)</li>
            <li>Toilet ($200-500)</li>
            <li>Tub / shower surround ($1,000-3,500)</li>
            <li>Tile floor ($400-1,200 installed)</li>
            <li>Mirror, lighting, exhaust fan ($300-600)</li>
            <li>Plumbing connections + labor ($800-1,800)</li>
          </ul>
          <p>
            Most rentals need bath updates — they&apos;re the most-used room and they age fastest. Budget at least one bath update on any pre-2000 property.
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">
            HVAC: $4-12k depending on type + size
          </h3>
          <ul>
            <li>Central AC + furnace replacement: $7-12k for 1,500-2,000 sqft home</li>
            <li>Heat pump replacement: $5-10k</li>
            <li>Mini-split system (2-3 zones): $5-9k</li>
            <li>Furnace only: $3-5k</li>
            <li>AC only: $4-7k</li>
          </ul>
          <p>
            HVAC is the most common &quot;surprise&quot; rehab cost. Verify age + condition during inspection. Systems over 15 years old should be in the budget regardless of current functionality.
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">
            Water heater: $1,200-2,500
          </h3>
          <p>
            Standard 40-50 gallon tank: $1,200-1,800 installed. Tankless: $2,500-4,500. Water heaters fail without much warning; if it&apos;s over 8-10 years old, budget replacement.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            Bucket 3: Systems / structural
          </h2>

          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">
            Roof: $8-25k
          </h3>
          <ul>
            <li>Asphalt shingle reroof (2,000 sqft): $8-15k</li>
            <li>Architectural shingle reroof: $11-18k</li>
            <li>Standing seam metal: $18-28k</li>
            <li>Partial repair (a few squares): $1-3k</li>
          </ul>
          <p>
            Roof age &gt;20 years = budget reroof. Insurance carriers increasingly require roofs under 15-20 years for coverage; in some markets they&apos;ll refuse to write a policy on a 25+ year old roof.
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">
            Electrical: $3-15k
          </h3>
          <ul>
            <li>Service panel upgrade to 200-amp: $2,500-4,500</li>
            <li>Knob-and-tube replacement (whole house): $8-18k</li>
            <li>Aluminum wiring remediation: $5-12k</li>
            <li>Add circuits / GFCI updates: $500-2,000</li>
          </ul>
          <p>
            Pre-1960 homes often have knob-and-tube. Pre-1980 homes sometimes have aluminum branch wiring. Both are insurance disqualifiers in many markets. Verify during inspection — these are easy to miss on a walkthrough but $10-18k surprises.
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">
            Plumbing: $4-20k
          </h3>
          <ul>
            <li>Replace galvanized supply lines (full house): $4-9k</li>
            <li>Replace cast-iron drains: $6-15k</li>
            <li>Sewer line replacement: $3-12k</li>
            <li>Water main replacement: $2-5k</li>
          </ul>
          <p>
            Galvanized supply + cast-iron drains in pre-1970 homes typically need replacement within 5-10 years of purchase. Budget it if you&apos;re planning a long hold.
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">
            Foundation: $5-50k
          </h3>
          <p>
            Wide range because foundation issues vary enormously. Small crack repairs $500-2,000. Pier installation $5-15k. Major underpinning $20-50k+. Always get a structural engineer&apos;s opinion if any visible cracks. Don&apos;t guess foundation costs from photos.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            The 25% contingency rule
          </h2>
          <p>
            After you total bucket 1 + bucket 2 + bucket 3, multiply by 1.25. That&apos;s your real budget.
          </p>
          <p>
            The 25% covers:
          </p>
          <ul>
            <li>Hidden conditions revealed once you open walls</li>
            <li>Scope creep (you find something you didn&apos;t see during the walk)</li>
            <li>Material cost increases between estimate and execution</li>
            <li>Contractor change orders</li>
            <li>Permit + inspection fees</li>
            <li>Holding costs while work is in progress</li>
          </ul>
          <p>
            The honest reason: every rehab has surprises. The 25% buffer is the difference between a deal that pencils and a deal where you&apos;re writing checks from your savings to finish the work.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            On-site walkthrough checklist
          </h2>
          <p>
            Use this in the order you encounter things on a typical property walk:
          </p>
          <ol>
            <li><strong>Outside:</strong> roof age + condition, gutters, siding, foundation visible cracks, grading + drainage, driveway, exterior paint</li>
            <li><strong>Mechanical room (basement):</strong> furnace age, water heater age, electrical panel size + condition (knob-and-tube? aluminum? federal pacific?), plumbing supply material (galvanized? PEX? copper?)</li>
            <li><strong>Main floor:</strong> flooring condition, paint condition, window age + functionality, smoke detectors</li>
            <li><strong>Kitchen:</strong> cabinets condition, counters, appliances age + functionality, plumbing under sink, GFCI outlets present</li>
            <li><strong>Bathrooms:</strong> tile condition, grout state, vanity, toilet, tub/shower, exhaust fan</li>
            <li><strong>Bedrooms:</strong> closets, paint, flooring, outlets, ceiling condition (water stains?)</li>
            <li><strong>Attic:</strong> insulation depth, signs of leaks, ventilation, framing inspection</li>
          </ol>
          <p>
            For larger rehabs, walk the property with a contractor — even at $200-400 for the walk, it&apos;s the cheapest insurance you can buy against a bad estimate.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            Use the calculator before you bid
          </h2>
          <p>
            TrueCap&apos;s{" "}
            <Link
              href="/tools/rehab-cost-estimator"
              className="text-primary font-semibold hover:underline"
            >
              rehab cost estimator
            </Link>{" "}
            applies the sq-ft pricing above against your property&apos;s scope. Use it to sanity-check your walkthrough number before committing to an offer. Then run the whole deal through the{" "}
            <Link href="/" className="text-primary font-semibold hover:underline">
              full TrueCap analyzer
            </Link>{" "}
            to see if BRRRR cash-out math works at your estimated rehab. Related reading:{" "}
            <Link
              href="/blog/spot-bad-rental-in-60-seconds"
              className="text-primary font-semibold hover:underline"
            >
              7 red flags that kill rental deals
            </Link>{" "}
            and{" "}
            <Link
              href="/blog/rental-property-pro-forma-explained"
              className="text-primary font-semibold hover:underline"
            >
              the 7 lies in seller pro formas
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
