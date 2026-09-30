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
 * Rows are grouped by what category each competitor occupies, which
 * also doubles as honest positioning — TrueCap is a rental
 * underwriter, NOT a marketplace, accounting tool, or rent-collection
 * platform, so each row frames the comparison correctly.
 *
 * Layout (DESIGN.md, 2026-09 design pass): PageHero in its single
 * column, then one Section per group holding a ruled directory (no
 * cards), then the sample-deal screenshot across the container, then the
 * close on the heavy rule. The list is the object of an index page, so it
 * starts in the first screen at 1095px; the screenshot sat in the hero's
 * 7/12 aside before, where the 1232px capture drew at about 45% (5px UI
 * text) and pushed the first group under the fold. Every row is a plain
 * server-rendered <a href>: this page is the in-graph inbound link for
 * the whole /vs library (internal-link-graph.test.tsx "no orphans"), so
 * no client filtering, tabs or pagination.
 */

import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/investcalc/header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ProductShot } from "@/components/marketing/product-shot";
import { ActionRow, CloseSection, PageHero } from "@/components/marketing/page-parts";
import { Section, SectionHeading } from "@/components/marketing/section";
import { buttonVariants } from "@/components/ui/button";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { getSiteUrl } from "@/lib/site-url";
import { JsonLd } from "@/components/seo/json-ld";
import { BreadcrumbSchema } from "@/components/marketing/breadcrumb-schema";
import { VS_HUB_CRUMB } from "@/components/marketing/vs-breadcrumb-schema";
// Below-the-fold cross-links prefetch on hover or keyboard focus, not on
// scroll; hero and primary CTA links keep the default (see the component).
import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";

export const metadata: Metadata = {
  title: "Rental Property Calculator Comparisons",
  description:
    "Compare TrueCap with rental property calculators, underwriting tools, marketplaces, and landlord software using sourced, side-by-side workflow reviews.",
  keywords: [
    "rental property tool comparison",
    "truecap alternatives",
    "best rental property calculator",
    "rental software comparison",
  ],
  alternates: { canonical: "/vs" },
  openGraph: {
    title: "Rental Property Calculator Comparisons | TrueCap",
    description:
      "Compare TrueCap with rental property calculators, underwriting tools, marketplaces, and landlord software using sourced, side-by-side workflow reviews.",
    url: "/vs",
    type: "website",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap comparisons",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rental Property Calculator Comparisons | TrueCap",
    description:
      "Compare TrueCap with rental property calculators, underwriting tools, marketplaces, and landlord software using sourced, side-by-side workflow reviews.",
    images: ["/home.jpg"],
  },
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
  // Direct alternatives — overlapping acquisition-analysis workflows
  {
    slug: "dealcheck",
    competitor: "DealCheck",
    tagline:
      "A modern rental calculator with different free limits, mobile apps, and strategy coverage; compare the published workflows directly.",
    group: "Direct alternative",
  },
  {
    slug: "biggerpockets-calculator",
    competitor: "BiggerPockets Calculator",
    tagline:
      "A community-bundled calculator compared with TrueCap's no-account preliminary screen and paid decision workflow.",
    group: "Direct alternative",
  },
  {
    slug: "stessa",
    competitor: "Stessa",
    tagline:
      "Stessa spans acquisition discovery and underwriting through owned-property operations. TrueCap is narrower acquisition decision support.",
    group: "Direct alternative",
  },
  {
    slug: "excel",
    competitor: "Excel / Google Sheets",
    tagline:
      "A structured, mobile-friendly workflow with one documented engine; keep spreadsheets for custom models that need their flexibility.",
    group: "Direct alternative",
  },

  // Complementary tools — post-purchase ops, accounting, banking
  {
    slug: "bricked",
    competitor: "Bricked AI",
    tagline:
      "Bricked focuses on flip-oriented comps, ARV, and repairs. TrueCap models rental economics under the assumptions shown.",
    group: "Complementary tool",
  },
  {
    slug: "baselane",
    competitor: "Baselane",
    tagline:
      "Baselane is rental banking + bookkeeping + rent collection. TrueCap is the pre-purchase underwrite.",
    group: "Complementary tool",
  },
  {
    slug: "rentredi",
    competitor: "RentRedi",
    tagline:
      "RentRedi collects rent. TrueCap models pre-purchase cash flow from reviewed assumptions.",
    group: "Complementary tool",
  },
  {
    slug: "avail",
    competitor: "Avail",
    tagline:
      "Avail manages your rentals after closing. TrueCap underwrites them before.",
    group: "Complementary tool",
  },
  {
    slug: "turbotenant",
    competitor: "TurboTenant",
    tagline:
      "TurboTenant runs your rentals (listings, screening, rent collection). TrueCap underwrites before you buy.",
    group: "Complementary tool",
  },
  {
    slug: "landlord-studio",
    competitor: "Landlord Studio",
    tagline:
      "Landlord Studio tracks expenses + Schedule E after closing. TrueCap is the deal-evaluation step before.",
    group: "Complementary tool",
  },
  {
    slug: "rentec-direct",
    competitor: "Rentec Direct",
    tagline:
      "Rentec Direct manages 5-100 unit landlord ops. TrueCap underwrites the next deal before you scale.",
    group: "Complementary tool",
  },
  {
    slug: "rentspree",
    competitor: "RentSpree",
    tagline:
      "RentSpree screens tenants. TrueCap underwrites the property. Agents use both.",
    group: "Complementary tool",
  },
  {
    slug: "buildium",
    competitor: "Buildium",
    tagline:
      "Buildium manages rentals after purchase. TrueCap underwrites potential acquisitions before purchase.",
    group: "Complementary tool",
  },
  {
    slug: "appfolio",
    competitor: "AppFolio",
    tagline:
      "AppFolio is post-purchase property management with a published 50-unit Core minimum. TrueCap is pre-purchase underwriting.",
    group: "Complementary tool",
  },

  // Specialized tools — single-slice tools (rent, market, listings)
  {
    slug: "roofstock",
    competitor: "Roofstock",
    tagline:
      "Roofstock offers individual-investor real-estate services. TrueCap provides a separate, assumption-driven underwrite.",
    group: "Specialized tool",
  },
  {
    slug: "mashvisor",
    competitor: "Mashvisor",
    tagline:
      "Mashvisor is market discovery (heatmaps, neighborhood scores). TrueCap is per-deal underwriting once you've picked an address.",
    group: "Specialized tool",
  },
  {
    slug: "propstream",
    competitor: "PropStream",
    tagline:
      "PropStream finds motivated-seller leads. TrueCap underwrites them. The full off-market workflow.",
    group: "Specialized tool",
  },
  {
    slug: "rentometer",
    competitor: "Rentometer",
    tagline:
      "Rentometer estimates rent. TrueCap underwrites the full deal — including the rent.",
    group: "Specialized tool",
  },
  {
    slug: "rentcast",
    competitor: "RentCast",
    tagline:
      "RentCast estimates rent + property value with an API. TrueCap underwrites the full deal.",
    group: "Specialized tool",
  },
  {
    slug: "zillow-rent-estimate",
    competitor: "Zillow Rent Estimate",
    tagline:
      "Compare Zillow's property-specific Rent Zestimate with TrueCap's editable HUD area benchmark and full underwriting workflow.",
    group: "Specialized tool",
  },
  // Short-term-rental operations software (Hostfully, Hostaway, Lodgify,
  // Guesty) runs the property after closing, as each tagline says: the
  // complementary group's "different stage of the rental lifecycle", not
  // one of the specialized group's slices.
  {
    slug: "hostfully",
    competitor: "Hostfully",
    tagline:
      "Hostfully manages short-term rentals after closing. TrueCap underwrites the STR deal before.",
    group: "Complementary tool",
  },
  {
    slug: "hostaway",
    competitor: "Hostaway",
    tagline:
      "Hostaway manages STRs at scale (3-100 properties). TrueCap underwrites the STR deal before.",
    group: "Complementary tool",
  },
  {
    slug: "airdna",
    competitor: "AirDNA",
    tagline:
      "AirDNA is the gold-standard STR revenue data. TrueCap underwrites the full deal using AirDNA's projections.",
    group: "Specialized tool",
  },
  {
    slug: "dealmachine",
    competitor: "DealMachine",
    tagline:
      "DealMachine is mobile-first driving-for-dollars lead generation. TrueCap underwrites what it surfaces.",
    group: "Specialized tool",
  },
  {
    slug: "batchleads",
    competitor: "BatchLeads",
    tagline:
      "BatchLeads is lead generation + skip-tracing (PropStream alternative). TrueCap underwrites the deals.",
    group: "Specialized tool",
  },
  {
    slug: "arrived",
    competitor: "Arrived",
    tagline:
      "Arrived sells fractional rental shares (passive). TrueCap underwrites whole properties you'd own directly.",
    group: "Specialized tool",
  },
  {
    slug: "yardi-breeze",
    competitor: "Yardi Breeze",
    tagline:
      "Yardi Breeze is small-business property management (1-100 units). TrueCap underwrites the next acquisition.",
    group: "Complementary tool",
  },
  // Round 4 additions
  {
    slug: "fundrise",
    competitor: "Fundrise",
    tagline:
      "Fundrise sells diversified non-traded REIT shares (passive). TrueCap underwrites whole properties you'd own directly.",
    group: "Specialized tool",
  },
  {
    slug: "lodgify",
    competitor: "Lodgify",
    tagline:
      "Lodgify is small-operator STR software (1-10 STRs). TrueCap underwrites the STR deal before.",
    group: "Complementary tool",
  },
  {
    slug: "guesty",
    competitor: "Guesty",
    tagline:
      "Guesty manages STR operations across Lite, Pro, and Enterprise plans. TrueCap handles pre-purchase underwriting.",
    group: "Complementary tool",
  },
  {
    slug: "crexi",
    competitor: "Crexi",
    tagline:
      "Crexi is the commercial RE marketplace (LoopNet alternative). TrueCap is residential underwriting.",
    group: "Specialized tool",
  },
  {
    slug: "reonomy",
    competitor: "Reonomy",
    tagline:
      "Reonomy is enterprise commercial RE intelligence + owner data. TrueCap is residential underwriting.",
    group: "Specialized tool",
  },
  {
    slug: "privy",
    competitor: "Privy",
    tagline:
      "Privy is investor-filtered MLS search. TrueCap underwrites the deals Privy surfaces.",
    group: "Specialized tool",
  },
  {
    slug: "quickbooks-rental",
    competitor: "QuickBooks (for rentals)",
    tagline:
      "QuickBooks is general accounting many landlords default to. TrueCap is pre-purchase underwriting.",
    group: "Complementary tool",
  },
  // Niche use-case slices
  {
    slug: "biggerpockets-for-house-hacking",
    competitor: "BiggerPockets for House Hacking",
    tagline:
      "House-hack cut of TrueCap vs BiggerPockets — owner-occupant unit modeling, FHA financing, effective rent saved.",
    group: "Direct alternative",
  },
  {
    slug: "dealcheck-for-short-term-rentals",
    competitor: "DealCheck for STRs",
    tagline:
      "STR investor's cut of TrueCap vs DealCheck — ADR, occupancy, AirDNA inputs, and tax-model limits.",
    group: "Direct alternative",
  },
  {
    slug: "mashvisor-for-short-term-rentals",
    competitor: "Mashvisor for STRs",
    tagline:
      "STR investor's cut of TrueCap vs Mashvisor — market scoring vs per-deal underwriting.",
    group: "Specialized tool",
  },
  {
    slug: "cozy",
    competitor: "Cozy.co (shut down)",
    tagline:
      "Cozy shut down in 2022. Here's what replaces it — and how TrueCap fits the underwriting half it never had.",
    group: "Specialized tool",
  },
];

/** A use-case slice ("dealcheck-for-short-term-rentals") names the product it
 *  slices by the slug before "-for-"; a plain comparison has none. */
function slicedSlug(slug: string): string | null {
  const index = slug.indexOf("-for-");
  return index > 0 ? slug.slice(0, index) : null;
}

/**
 * A group's rows in COMPARISONS order, except that each use-case slice
 * follows the product it slices ("DealCheck for STRs" right after
 * DealCheck), so a reader scanning for one product finds its rows
 * together. COMPARISONS itself keeps its order: the ItemList in the
 * JSON-LD follows it. A slice whose product sits in another group keeps
 * its own place.
 */
function inGroup(group: ComparisonCard["group"]): ComparisonCard[] {
  const items = COMPARISONS.filter((c) => c.group === group);
  const rank = (c: ComparisonCard, index: number) => {
    const sliced = slicedSlug(c.slug);
    if (!sliced) return index;
    const parent = items.findIndex(
      (p) => !slicedSlug(p.slug) && (p.slug === sliced || p.slug.startsWith(`${sliced}-`)),
    );
    // Half a step after the product; slices of one product keep their
    // order because the sort is stable.
    return parent === -1 ? index : parent + 0.5;
  };
  return items
    .map((c, index) => ({ c, key: rank(c, index) }))
    .sort((a, b) => a.key - b.key)
    .map(({ c }) => c);
}

const GROUPS = [
  {
    id: "vs-direct-alternatives",
    label: "Direct alternatives",
    description:
      "Tools whose acquisition-analysis workflow overlaps with TrueCap. Compare scope, assumptions, pricing, and free access directly.",
    items: inGroup("Direct alternative"),
  },
  {
    id: "vs-complementary-tools",
    label: "Complementary tools",
    description:
      "Tools that solve a different stage of the rental lifecycle. We don't compete — most landlords use TrueCap + one of these together.",
    items: inGroup("Complementary tool"),
  },
  {
    id: "vs-specialized-tools",
    label: "Specialized tools",
    description:
      "Tools that handle one slice (rent estimates, market discovery, turnkey listings). TrueCap can replace or complement depending on your workflow.",
    items: inGroup("Specialized tool"),
  },
];

const NBSP = String.fromCharCode(0xa0);

/**
 * Sets a line of directory copy so it breaks between ideas. The characters
 * render as written; only where a line may break changes:
 * - a hyphenated compound or range ("pre-purchase", "(1-10") never splits
 *   at its hyphen;
 * - a number stays with the word after it ("60 seconds", "5-100 unit");
 * - a "+" or "—" stays on the line of the word before it instead of
 *   opening the next line.
 */
function keepTogether(text: string): ReactNode[] {
  return text
    .replace(/(\d) (?=[A-Za-z])/g, `$1${NBSP}`)
    .replace(/ ([+—])/g, `${NBSP}$1`)
    .split(/(\S+-\S+)/)
    .map((part, index) =>
      index % 2 === 1 ? (
        <span key={index} className="whitespace-nowrap">
          {part}
        </span>
      ) : (
        part
      ),
    );
}

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
    // relative + overflow-x-clip, as on the homepage: no descendant can make
    // the phone page scroll sideways, and an sr-only span re-parents here.
    <div className="relative overflow-x-clip">
      <JsonLd data={structuredData} />
      <BreadcrumbSchema items={[VS_HUB_CRUMB]} />
      <Header />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <PageHero
          title="TrueCap vs every rental tool that matters."
          lede={`${COMPARISONS.length} side-by-side comparisons. Honest feature matrices. Where each tool does the job better. When TrueCap fits, when something else does, and how to combine them.`}
          actions={
            <ActionRow>
              <Link href="/analyze" prefetch={false} className={buttonVariants({ size: "cta" })}>
                Try TrueCap free
              </Link>
              <Link href="/pricing" className={buttonVariants({ variant: "outline", size: "cta" })}>
                See pricing
              </Link>
            </ActionRow>
          }
        />

        {/* The directory: one section per group, each a ruled list of
            whole-row links. The hero's bottom rule opens the first group.
            Two columns at most, as RuledList offers (the groups hold 6, 16
            and 16 rows today; three columns left a ragged last row). Each
            link fills its grid cell and the cue sits at the cell's foot, so
            two rows side by side end on one line when one tagline runs a
            line longer than the other. */}
        {GROUPS.map((group, index) => (
          <Section
            key={group.id}
            rhythm="tight"
            rule={index === 0 ? "none" : "rule"}
            aria-labelledby={`${group.id}-heading`}
          >
            <SectionHeading id={`${group.id}-heading`}>{group.label}</SectionHeading>
            <p className="mt-3 max-w-[60ch] text-pretty text-lg leading-relaxed text-muted-foreground">
              {group.description}
            </p>
            <ul className="mt-8 grid grid-cols-[minmax(0,1fr)] border-t-2 border-foreground sm:grid-cols-2 sm:gap-x-12">
              {group.items.map((c) => (
                <li key={c.slug} className="flex min-w-0 flex-col border-b border-rule-soft">
                  <Link href={`/vs/${c.slug}`} className="group flex flex-1 flex-col py-4">
                    <h3 className="text-balance text-lg font-semibold text-foreground">
                      {/* Keeps the link's name in step with the ItemList
                          names ("TrueCap vs …") without a visible kicker. */}
                      <span className="sr-only">{"TrueCap vs "}</span>
                      {c.competitor}
                    </h3>
                    <p className="mt-1 max-w-[64ch] text-pretty text-base leading-relaxed text-muted-foreground">
                      {keepTogether(c.tagline)}
                    </p>
                    <span className="tc-link mt-auto self-start pt-2 text-base font-medium group-hover:text-primary-deep">
                      Read the comparison
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        ))}

        {/* Real product screenshot from the free sample deal, set as a
            document (a rule, no browser chrome; frame={false} would drop the
            caption). It spans the container after the directory, as on
            /for-buy-and-hold: the capture is 1232 CSS px wide, so the
            container keeps its text at 80-96% of its own size where the
            hero's 7/12 aside set it near 5px. The caption link takes a 44px
            target from padding the negative margin takes back out of the
            line box. */}
        <Section rhythm="tight" aria-label="What the decision looks like">
          <ProductShot
            shot="verdict"
            frame="document"
            sizes="(min-width: 1280px) 1184px, 100vw"
            alt="TrueCap's decision view for the sample deal: the Offer Ceiling beside the asking price, cash flow after reserves, and DSCR"
            caption={
              <>
                Real output from the free sample deal.{" "}
                <Link
                  href="/analyze?sample=1"
                  prefetch={false}
                  className="tc-link -my-3 inline-block py-3 font-medium"
                >
                  Run it yourself
                </Link>
              </>
            }
          />
        </Section>

        <CloseSection
          heading="Stop comparison-shopping. Run your next deal."
          headingId="vs-close-heading"
          lede={keepTogether(
            "The fastest way to know whether TrueCap fits your workflow is to paste an address and see the analysis. 60 seconds, no signup, no card.",
          )}
          actions={
            <ActionRow>
              <Link href="/analyze" prefetch={false} className={buttonVariants({ size: "cta" })}>
                Run a deal — 60 seconds
              </Link>
              <Link href="/pricing" className={buttonVariants({ variant: "outline", size: "cta" })}>
                See Pro pricing
              </Link>
            </ActionRow>
          }
        />
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
