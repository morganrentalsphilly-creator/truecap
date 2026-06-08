/**
 * /vs — hub page listing every TrueCap competitor comparison.
 *
 * Why this exists: the individual /vs/<competitor> pages were built
 * purely for SEO landing — visitors arrive directly from Google
 * searches like "TrueCap vs DealCheck". Inside the site, there was
 * no path to find them at all (no nav, no footer link, only
 * cross-references between the /vs pages themselves). This hub gives
 * curious site visitors a clean directory and gives us a single URL
 * to link from the footer + blog index.
 *
 * Cards are grouped by what category each competitor occupies, which
 * also doubles as honest positioning — TrueCap is a rental
 * underwriter, NOT a marketplace, accounting tool, or rent-collection
 * platform, so each card frames the comparison correctly.
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  Calculator,
  Sparkles,
} from "lucide-react";
import { Header } from "@/components/investcalc/header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "TrueCap vs every rental tool — honest comparisons",
  description:
    "Side-by-side comparisons of TrueCap and the 10 most popular rental tools — DealCheck, BiggerPockets, Stessa, Mashvisor, Roofstock, and more.",
  keywords: [
    "rental property tool comparison",
    "truecap alternatives",
    "best rental property calculator",
    "rental software comparison",
  ],
  alternates: { canonical: "/vs" },
  // Noindex — the hub page is no longer surfaced from internal
  // navigation (footer link + blog card removed at user request).
  // Individual /vs/<competitor> pages stay indexable as SEO landing
  // surfaces. The hub URL still resolves for anyone who types it
  // directly or arrives from a stale internal link.
  robots: { index: false, follow: true },
  openGraph: {
    title: "TrueCap vs every rental tool — honest comparisons",
    description:
      "Side-by-side comparisons of TrueCap and the 10 most popular rental tools.",
    url: "/vs",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap comparisons" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type ComparisonCard = {
  slug: string;
  competitor: string;
  /** 1-line elevator pitch on what the competitor is + how it compares. */
  tagline: string;
  /** "Direct" (per-deal calculators that compete head-to-head) vs
   *  "Complementary" (different lifecycle stage / different scope). */
  group: "Direct alternative" | "Complementary tool" | "Specialized tool";
};

// Ordered roughly by audience size + search demand so the most-relevant
// comparisons land first.
const COMPARISONS: ComparisonCard[] = [
  // Direct alternatives — head-to-head calculators
  { slug: "dealcheck", competitor: "DealCheck",
    tagline: "The other modern rental calculator. Deeper free tier, simpler pricing, plain-English verdict.",
    group: "Direct alternative" },
  { slug: "biggerpockets-calculator", competitor: "BiggerPockets Calculator",
    tagline: "The household name. We're newer, faster, and roughly half the price for the calculator alone.",
    group: "Direct alternative" },
  { slug: "excel", competitor: "Excel / Google Sheets",
    tagline: "Your spreadsheet is brittle, mobile-hostile, and quietly wrong. Validated math, every device, no formulas to break.",
    group: "Direct alternative" },

  // Complementary tools — post-purchase ops, accounting, banking
  { slug: "stessa", competitor: "Stessa",
    tagline: "Stessa is rental accounting for properties you own. TrueCap underwrites the ones you're considering buying.",
    group: "Complementary tool" },
  { slug: "baselane", competitor: "Baselane",
    tagline: "Baselane is rental banking + bookkeeping + rent collection. TrueCap is the pre-purchase underwrite.",
    group: "Complementary tool" },
  { slug: "rentredi", competitor: "RentRedi",
    tagline: "RentRedi collects rent. TrueCap decides if the deal cash-flows in the first place.",
    group: "Complementary tool" },
  { slug: "avail", competitor: "Avail",
    tagline: "Avail manages your rentals after closing. TrueCap underwrites them before.",
    group: "Complementary tool" },
  { slug: "turbotenant", competitor: "TurboTenant",
    tagline: "TurboTenant runs your rentals (listings, screening, rent collection). TrueCap underwrites before you buy.",
    group: "Complementary tool" },
  { slug: "landlord-studio", competitor: "Landlord Studio",
    tagline: "Landlord Studio tracks expenses + Schedule E after closing. TrueCap is the deal-evaluation step before.",
    group: "Complementary tool" },
  { slug: "rentec-direct", competitor: "Rentec Direct",
    tagline: "Rentec Direct manages 5-100 unit landlord ops. TrueCap underwrites the next deal before you scale.",
    group: "Complementary tool" },
  { slug: "rentspree", competitor: "RentSpree",
    tagline: "RentSpree screens tenants. TrueCap underwrites the property. Agents use both.",
    group: "Complementary tool" },
  { slug: "buildium", competitor: "Buildium",
    tagline: "Buildium is enterprise property management (50+ units). TrueCap is solo-investor underwriting.",
    group: "Complementary tool" },
  { slug: "appfolio", competitor: "AppFolio",
    tagline: "AppFolio is enterprise PM for 1000+ unit operators. TrueCap is solo-investor underwriting.",
    group: "Complementary tool" },

  // Specialized tools — single-slice tools (rent, market, listings)
  { slug: "roofstock", competitor: "Roofstock",
    tagline: "Roofstock sells the property. TrueCap is the independent second opinion on any turnkey listing.",
    group: "Specialized tool" },
  { slug: "mashvisor", competitor: "Mashvisor",
    tagline: "Mashvisor is market discovery (heatmaps, neighborhood scores). TrueCap is per-deal underwriting once you've picked an address.",
    group: "Specialized tool" },
  { slug: "propstream", competitor: "PropStream",
    tagline: "PropStream finds motivated-seller leads. TrueCap underwrites them. The full off-market workflow.",
    group: "Specialized tool" },
  { slug: "rentometer", competitor: "Rentometer",
    tagline: "Rentometer estimates rent. TrueCap underwrites the full deal — including the rent.",
    group: "Specialized tool" },
  { slug: "rentcast", competitor: "RentCast",
    tagline: "RentCast estimates rent + property value with an API. TrueCap underwrites the full deal.",
    group: "Specialized tool" },
  { slug: "zillow-rent-estimate", competitor: "Zillow Rent Estimate",
    tagline: "Zillow's Rent Zestimate is fast but often 10-25% off market. TrueCap uses HUD Fair Market Rent plus full underwriting.",
    group: "Specialized tool" },
  { slug: "hostfully", competitor: "Hostfully",
    tagline: "Hostfully manages short-term rentals after closing. TrueCap underwrites the STR deal before.",
    group: "Specialized tool" },
  { slug: "hostaway", competitor: "Hostaway",
    tagline: "Hostaway manages STRs at scale (3-100 properties). TrueCap underwrites the STR deal before.",
    group: "Specialized tool" },
  { slug: "airdna", competitor: "AirDNA",
    tagline: "AirDNA is the gold-standard STR revenue data. TrueCap underwrites the full deal using AirDNA's projections.",
    group: "Specialized tool" },
  { slug: "dealmachine", competitor: "DealMachine",
    tagline: "DealMachine is mobile-first driving-for-dollars lead generation. TrueCap underwrites what it surfaces.",
    group: "Specialized tool" },
  { slug: "batchleads", competitor: "BatchLeads",
    tagline: "BatchLeads is lead generation + skip-tracing (PropStream alternative). TrueCap underwrites the deals.",
    group: "Specialized tool" },
  { slug: "arrived", competitor: "Arrived",
    tagline: "Arrived sells fractional rental shares (passive). TrueCap underwrites whole properties you'd own directly.",
    group: "Specialized tool" },
  { slug: "yardi-breeze", competitor: "Yardi Breeze",
    tagline: "Yardi Breeze is small-business property management (1-100 units). TrueCap underwrites the next acquisition.",
    group: "Complementary tool" },
  { slug: "cozy", competitor: "Cozy.co (shut down)",
    tagline: "Cozy shut down in 2022. Here's what replaces it — and how TrueCap fits the underwriting half it never had.",
    group: "Specialized tool" },
];

const GROUPS = [
  {
    label: "Direct alternatives",
    description:
      "Tools that try to do the same job TrueCap does — underwrite a rental deal end-to-end. Compare features, pricing, and free tier depth.",
    items: COMPARISONS.filter((c) => c.group === "Direct alternative"),
  },
  {
    label: "Complementary tools",
    description:
      "Tools that solve a different stage of the rental lifecycle. We don't compete — most landlords use TrueCap + one of these together.",
    items: COMPARISONS.filter((c) => c.group === "Complementary tool"),
  },
  {
    label: "Specialized tools",
    description:
      "Tools that handle one slice (rent estimates, market discovery, turnkey listings). TrueCap can replace or complement depending on your workflow.",
    items: COMPARISONS.filter((c) => c.group === "Specialized tool"),
  },
];

export default function VsHubPage() {
  const siteUrl = getSiteUrl();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "TrueCap comparisons",
    url: `${siteUrl}/vs`,
    description:
      "Index of side-by-side comparisons between TrueCap and other rental property tools.",
    publisher: { "@id": `${siteUrl}/#organization` },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: COMPARISONS.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${siteUrl}/vs/${c.slug}`,
        name: `TrueCap vs ${c.competitor}`,
      })),
    },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Header />
      <main id="main" className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero */}
        <section className="mb-12 sm:mb-16 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary mb-4">
            <Sparkles className="size-3" />
            Honest comparisons
          </div>
          <h1 className="mx-auto max-w-3xl text-balance text-3xl sm:text-5xl font-extrabold text-foreground leading-[1.05] tracking-tight">
            TrueCap vs every <span className="text-primary">rental tool</span> that matters.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-balance text-base sm:text-lg leading-relaxed text-muted-foreground">
            Ten side-by-side comparisons. Honest feature matrices. Where each
            tool does the job better. When TrueCap fits, when something else
            does, and how to combine them.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(82,72,212,0.28)] transition hover:-translate-y-0.5"
            >
              <Calculator className="size-4" />
              Try TrueCap free
            </Link>
            <Link
              href="/pricing"
              className="inline-flex h-12 items-center gap-1.5 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              See pricing
            </Link>
          </div>
        </section>

        {/* Comparison cards grouped by category */}
        {GROUPS.map((group, gi) => (
          <section key={group.label} className={gi === 0 ? "mb-10 sm:mb-14" : "mb-10 sm:mb-14"}>
            <div className="mb-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-1.5">
                {group.label}
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground max-w-2xl">
                {group.description}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.items.map((c) => (
                <Link
                  key={c.slug}
                  href={`/vs/${c.slug}`}
                  className="group flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      TrueCap vs
                    </span>
                    <ArrowUpRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
                  </div>
                  <h2 className="text-lg font-extrabold text-foreground leading-tight">
                    {c.competitor}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground flex-1">
                    {c.tagline}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary group-hover:underline">
                    Read the comparison
                    <ArrowUpRight className="size-3" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {/* Bottom CTA */}
        <section className="mt-14 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Stop comparison-shopping. Run your next deal.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            The fastest way to know whether TrueCap fits your workflow is to
            paste an address and see the analysis. 60 seconds, no signup, no
            card.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
              <Calculator className="w-4 h-4" />
              Run a deal — 60 seconds
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 border border-primary-foreground/40 bg-primary-foreground/10 text-primary-foreground px-4 py-2.5 rounded-xl font-bold hover:bg-primary-foreground/20 transition-colors"
            >
              See Pro pricing
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
