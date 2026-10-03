/**
 * /tools — landing page listing TrueCap's free public calculators.
 *
 * Each calculator is its own dedicated page (SEO ranking surface) and
 * funnels into the full TrueCap analyzer via CTA.
 *
 * The list, counts, and schema are all driven by lib/calculator-registry.ts
 * (the single source of truth) so /tools, /embed, the footer, the sitemap,
 * and the OG image can never disagree on how many calculators exist.
 *
 * Layout (DESIGN.md, 2026-09 design pass): the page head is the shared
 * PageHero, the directory is one ruled list per category (its H2 above a heavy
 * rule, the rows two-up from 640px in RuledList's columns={2} grammar), the two
 * explanations share one reading column in one ruled band, and the page closes
 * on the heavy rule (CloseSection). No cards, icon tiles or trailing arrows.
 */

import type { Metadata } from "next";
import Link from "next/link";
// Internal links other than a first-screen primary action prefetch on hover
// or keyboard focus, not as they scroll into view; /analyze links stay
// next/link with prefetch={false} (lib/__tests__/intent-prefetch-shared.test.ts).
import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";
import { ActionRow, CloseSection, PageHero, UnderTitleAnalyzeLink } from "@/components/marketing/page-parts";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { Section, SectionHeading } from "@/components/marketing/section";
import { SiteFooter } from "@/components/marketing/site-footer";
import { buttonVariants } from "@/components/ui/button";
import { getSiteUrl } from "@/lib/site-url";
import {
  CALCULATOR_REGISTRY,
  CALCULATOR_COUNT,
  CALCULATOR_COUNT_WORD,
  CALCULATOR_NAMES_LIST,
  calculatorsByCategory,
} from "@/lib/calculator-registry";
import { Header } from "@/components/investcalc/header";
import { JsonLd } from "@/components/seo/json-ld";
import { BreadcrumbSchema } from "@/components/marketing/breadcrumb-schema";
import { OPEN_GRAPH_BASE } from "@/lib/seo/open-graph-base";

export const metadata: Metadata = {
  title: "Free Real Estate Calculators",
  description:
    "Free, no-signup rental property utilities for mortgage payments, rent-to-price screens, vacancy, closing costs, rehab budgets, ARV, and more.",
  alternates: { canonical: "/tools" },
  openGraph: {
    ...OPEN_GRAPH_BASE,
    title: "Free Real Estate Calculators",
    description: `${CALCULATOR_COUNT_WORD} free rental property calculators — ${CALCULATOR_NAMES_LIST}. No signup.`,
    url: "/tools",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function ToolsLandingPage() {
  const siteUrl = getSiteUrl();
  // CollectionPage + ItemList schema. Tells Google "this page is a
  // curated list of related tools" so it can render richer SERP
  // results (occasional carousel of items, clearer page-intent
  // signals). Each tool gets a position so the list isn't an
  // unordered bag of links. Driven entirely by the calculator registry.
  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${siteUrl}/tools#collection`,
    name: "Free Real Estate Calculators",
    description: `${CALCULATOR_COUNT_WORD} free, no-signup rental property calculators — ${CALCULATOR_NAMES_LIST}.`,
    url: `${siteUrl}/tools`,
    isPartOf: { "@id": `${siteUrl}/#website` },
    mainEntity: {
      "@type": "ItemList",
      name: "TrueCap free calculators",
      itemListOrder: "https://schema.org/ItemListOrderAscending",
      numberOfItems: CALCULATOR_COUNT,
      itemListElement: CALCULATOR_REGISTRY.map((tool, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        url: `${siteUrl}/tools/${tool.slug}`,
        name: tool.title,
        description: tool.description,
      })),
    },
  };

  // Only categories with at least one released calculator. Every "returns"
  // calculator is unreleased today, and rendering the group anyway put a
  // "Returns" heading over an empty list. A group reappears on its own when
  // one of its calculators is released.
  const groups = calculatorsByCategory().filter((group) => group.items.length > 0);

  return (
    // relative + overflow-x-clip, as on the homepage: clips any sideways bleed
    // from a descendant without making a scroll container (sticky header ok).
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={collectionLd} />
      <BreadcrumbSchema items={[{ name: "Free Tools", path: "/tools" }]} />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        {/* The no-break space binds "real estate": at 375px text-balance
            otherwise broke the H1 as "Free real / estate calculators". */}
        <PageHero
          title={<>Free real&nbsp;estate calculators</>}
          lede="No signup. These are narrow educational screens and input utilities, not substitutes for the full TrueCap underwrite. Use the analyzer when a decision depends on cash flow, NOI, DSCR, or returns."
          actions={<UnderTitleAnalyzeLink />}
        />

        {/* Grouped by job (registry categories) so investors can find the
            calculator for the question they're answering: screen a deal,
            finance it, model income and expenses, check returns (once a
            returns calculator is released), set an offer.
            Each group is its H2 on a heavy rule across the full container,
            the rows two-up from 640px (RuledList's columns={2} grammar), so
            the directory starts on the same left edge as the prose below.
            rule="none": PageHero's bottom rule already separates the head;
            the tight rhythm keeps the first group in the first screen. */}
        <Section rule="none" rhythm="tight">
          <div className="flex flex-col gap-12 sm:gap-16">
            {groups.map((group) => (
              <section key={group.category} aria-labelledby={`cat-${group.category}`}>
                <SectionHeading id={`cat-${group.category}`}>{group.label}</SectionHeading>
                <ul className="mt-8 grid border-t-2 border-foreground sm:grid-cols-2 sm:gap-x-12">
                  {/* The title sits 16px below the rule (row pt-2 + link py-2)
                      however many lines it wraps to; py-2 around one 28px line
                      is the 44px target, and min-h-11 keeps that floor. */}
                  {group.items.map((tool) => (
                    <li key={tool.slug} className="min-w-0 border-b border-rule-soft pb-4 pt-2">
                      <h3 className="text-lg font-semibold">
                        <IntentPrefetchLink
                          href={`/tools/${tool.slug}`}
                          className="tc-link inline-flex min-h-11 py-2"
                        >
                          {tool.title}
                        </IntentPrefetchLink>
                      </h3>
                      <p className="max-w-[62ch] text-pretty text-base leading-relaxed text-muted-foreground">
                        {tool.description}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </Section>

        {/* The two explanations share one ruled band, stacked in one reading
            column (side by side they would drop under the 60ch floor at 1095). */}
        <Section rhythm="tight">
          <section aria-labelledby="tools-how" className="max-w-[68ch]">
            <SectionHeading id="tools-how">How these fit the full analysis</SectionHeading>
            <p className="mt-4 text-pretty text-lg leading-relaxed">
              Each calculator answers one question: is the rent in range for the
              price, what does the loan cost, what does a rule of thumb say
              before you spend an hour on a listing. They are deliberately
              narrow. When you want the whole picture, the analyzer underwrites
              the deal on one set of assumptions: cash flow after reserves,
              DSCR, cap rate, cash-on-cash return, Buy Box fit, and the Offer
              Ceiling. It also shows which inputs move the decision most.
              Several calculators carry the price or rent you typed into the
              analyzer, so you do not type those twice. The analyzer&apos;s
              core formulas (cap rate, cash-on-cash return, DSCR and the
              mortgage payment) are published on the{" "}
              <IntentPrefetchLink href="/methodology" className="tc-link">methodology page</IntentPrefetchLink>.
            </p>
          </section>
          <section aria-labelledby="learn-the-math" className="mt-12 max-w-[68ch] sm:mt-16">
            <SectionHeading id="learn-the-math">Learn the math behind the calculators</SectionHeading>
            <p className="mt-4 text-pretty text-lg leading-relaxed">
              Want to understand what these tools are actually computing? Our
              step-by-step guides walk through{" "}
              <IntentPrefetchLink href="/blog/how-to-calculate-cap-rate" className="tc-link">how to calculate cap rate</IntentPrefetchLink>,{" "}
              <IntentPrefetchLink href="/blog/how-to-calculate-cash-on-cash-return" className="tc-link">how to calculate cash-on-cash return</IntentPrefetchLink>,{" "}
              <IntentPrefetchLink href="/blog/how-to-calculate-dscr" className="tc-link">how to calculate DSCR</IntentPrefetchLink>, and{" "}
              <IntentPrefetchLink href="/blog/how-to-calculate-noi-rental-property" className="tc-link">how to calculate NOI</IntentPrefetchLink>{" "}
              — or see all the pieces come together in{" "}
              <IntentPrefetchLink href="/blog/how-to-underwrite-a-rental-property-in-60-seconds" className="tc-link">how to underwrite a rental property in 60 seconds</IntentPrefetchLink>.
            </p>
          </section>
        </Section>

        {/* The close on the heavy rule. A plain Link, not AnalyzeCtaLink:
            that island fires homepage_primary_cta and would count /tools
            clicks as homepage clicks. */}
        <CloseSection
          heading="Want the full picture?"
          headingId="tools-close-heading"
          lede={
            <>
              Single-purpose calculators are great for triaging deals. When
              you&apos;re ready to underwrite a stabilized rental, open the full
              TrueCap analyzer for cash flow, cap rate, cash-on-cash return,
              DSCR, projections, sensitivity, and an Offer
              Ceiling. Free to start.
            </>
          }
          actions={
            <ActionRow>
              <Link href="/analyze" prefetch={false} className={buttonVariants({ size: "cta" })}>
                Open TrueCap
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
