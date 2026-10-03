/**
 * /for-investors — the investor hub (2026-09 agent-first pass).
 *
 * The homepage now speaks to real estate agents first, so investors buying
 * for their own portfolio need one named destination from the header and
 * from the hero's investor cue. This page states the investor value prop
 * once and routes to the strategy pages, in this order: hero → strategies →
 * what you get → sources → FAQ → close. It adds nothing the product does not
 * do: the free first decision, Pro, labeled HUD/FRED benchmarks, manual
 * property tax.
 *
 * Set on the homepage's grammar (DESIGN.md, 2026-09 design pass): PageHero,
 * then Sections on rules, the strategies and the four questions as ruled
 * rows instead of cards, the sources as a source table, and the close on the
 * heavy rule. No cards (the page shows no plans), no icons, no motion.
 *
 * BRRRR and fix-and-flip route to their guides and calculators rather than
 * /for-brrrr and /for-flippers: those two are deliberately noindexed
 * planning stubs outside the sitemap (no integrated model is offered), and
 * the link-graph guard will not let a sitemap page link them.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { Header } from "@/components/investcalc/header";
// Links below the first screen prefetch on hover or keyboard focus, not on
// scroll. The hero's actions keep next/link's default; /analyze never
// prefetches. Guarded by lib/__tests__/intent-prefetch-landing.test.ts.
import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";
import { HomepageFaq } from "@/components/marketing/landing-sections";
import { ActionRow, CloseSection, PageHero, RuledList } from "@/components/marketing/page-parts";
import { DECISION_SHOT, ProductShot } from "@/components/marketing/product-shot";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { Section, SectionHeading } from "@/components/marketing/section";
import { SiteFooter } from "@/components/marketing/site-footer";
import { buttonVariants } from "@/components/ui/button";
import {
  PRODUCT_EVALUATION_COMPARISON_LIMIT,
  PRODUCT_EVALUATION_DAYS,
  PRODUCT_EVALUATION_DEAL_LIMIT,
} from "@/lib/product-access";
import { DATA_SOURCE_FACTS, PROPERTY_TAX_FACTS } from "@/lib/product-facts";
import { isAgentProConfigured } from "@/lib/stripe/plan-prices";
import { cn } from "@/lib/utils";
import { OPEN_GRAPH_BASE } from "@/lib/seo/open-graph-base";

const PAGE_TITLE = "For Rental Investors — Buy Box & Offer Ceiling";
const PAGE_DESCRIPTION =
  "Paste a listing and see whether it meets your Buy Box, the highest price that still does, and what could break it. Free first decision.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: [
    "rental property analysis",
    "investment property calculator",
    "buy box real estate",
    "cash on cash return",
    "rental property cash flow",
    "DSCR calculator",
  ],
  alternates: { canonical: "/for-investors" },
  openGraph: {
    ...OPEN_GRAPH_BASE,
    title: `${PAGE_TITLE} | TrueCap`,
    description: PAGE_DESCRIPTION,
    url: "/for-investors",
    type: "website",
  },
  // No `images` here or above: the sibling opengraph-image.tsx is the card.
  twitter: { card: "summary_large_image" },
};

/** The hero's metric strip, joined with " · " (each item keeps its dot). */
const HERO_METRICS = [
  "Cash flow",
  "Cap rate",
  "Cash-on-cash return",
  "DSCR",
  "Deal score",
  "Offer Ceiling",
] as const;

const STRATEGIES: { title: string; body: string; href: string; cta: string }[] = [
  {
    title: "Buy-and-hold",
    body: "Stabilized rentals for cash flow and equity: cap rate, cash-on-cash, DSCR, downside, the Offer Ceiling, and a 10-year projection.",
    href: "/for-buy-and-hold",
    cta: "For buy-and-hold investors",
  },
  {
    title: "House hacking",
    body: "Two to four units, owner-occupied: your unit's cost against the rent from the others, with low-down-payment financing modeled honestly.",
    href: "/for-house-hackers",
    cta: "For house hackers",
  },
  {
    title: "BRRRR",
    body: "Research each stage with the rehab estimator, the ARV calculator and the analyzer: rehab budget, ARV, DSCR on the refinance, stabilized returns. No integrated lifecycle model is offered yet.",
    href: "/blog/brrrr-method-explained",
    cta: "Read the BRRRR guide",
  },
  {
    title: "Fix and flip",
    body: "Rehab, ARV, and 70%-rule screening for early research. A complete flip model also needs time, financing, and selling costs; the guide says where.",
    href: "/blog/70-percent-rule-house-flipping",
    cta: "Read the 70% rule guide",
  },
];

/** The four questions Pro answers, as ruled term and detail rows. */
const WHAT_YOU_GET = [
  {
    term: "Does it meet my Buy Box?",
    detail: "Your cash-flow, cash-on-cash, DSCR, cap-rate, and price targets, checked on every deal with the reason for a miss.",
  },
  {
    term: "What is my Offer Ceiling?",
    detail: "The highest price that still meets your targets under the assumptions shown.",
  },
  {
    term: "What could make it fail?",
    detail: "Rent, vacancy, rate, and price stressed against the assumptions that drive the decision.",
  },
  {
    term: "Can I defend it?",
    detail: "Save unlimited deals, compare up to four, and hand a lender or partner a report with the assumptions and risks intact.",
  },
];

/**
 * Where the starting numbers come from, in the homepage source table's
 * grammar (FRED's: the value's name, then its source and how to replace it).
 * Every sentence reads lib/product-facts.ts, so the claims cannot drift from
 * the product; the property-tax row keeps PROPERTY_TAX_FACTS' own wording.
 */
const SOURCES: { label: string; source: string; flag?: string }[] = [
  {
    label: "Rent",
    source: `${DATA_SOURCE_FACTS.rent}. Check it against local comps.`,
  },
  {
    label: "Mortgage rate",
    source: `${DATA_SOURCE_FACTS.mortgageRate}, with its date shown; replace it with your lender's quote.`,
  },
  {
    label: "Property tax",
    source: PROPERTY_TAX_FACTS.notAutoFilled,
    // Flagged in ink at 600, as on the homepage: orange means a miss.
    flag: PROPERTY_TAX_FACTS.blankFieldBehavior,
  },
];

const SOURCE_ROW_GRID =
  "grid gap-x-8 gap-y-1 sm:grid-cols-[9rem_minmax(0,1fr)] lg:grid-cols-[11rem_minmax(0,1fr)]";

export default function ForInvestorsPage() {
  const agentProConfigured = isAgentProConfigured();
  return (
    // relative + overflow-x-clip, as on the homepage: nothing a section
    // bleeds can scroll the page sideways, and `clip` keeps the sticky
    // header working (it creates no scroll container).
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        {/* Hero: the investor's outcome; the same free analyzer as every page. */}
        <PageHero
          title="Know the highest price that still meets your targets before you write the offer."
          lede={
            <>
              <p>
                Paste a listing. In about 60 seconds, see whether the rental
                works at asking, whether it meets your Buy Box, the Offer
                Ceiling for your targets, and what could break the deal.
                Every assumption is labeled and yours to change.
              </p>
              {/* Each metric keeps its trailing separator, so a wrapped line
                  never opens on a dot; balance keeps "Offer Ceiling" from
                  standing alone on the second line. */}
              <p className="mt-2 text-balance text-sm font-medium text-muted-foreground">
                {HERO_METRICS.map((metric, index) => (
                  <Fragment key={metric}>
                    {index > 0 ? " " : null}
                    <span className="whitespace-nowrap">
                      {index < HERO_METRICS.length - 1 ? `${metric} ·` : metric}
                    </span>
                  </Fragment>
                ))}
              </p>
            </>
          }
          actions={
            <ActionRow>
              <Link href="/analyze" prefetch={false} className={buttonVariants({ size: "cta" })}>
                Analyze a property free
              </Link>
              <Link href="/pricing" className={buttonVariants({ variant: "outline", size: "cta" })}>
                See Pro pricing
              </Link>
            </ActionRow>
          }
          note={
            <>
              Free. No account. Your first full decision is included. A free
              account adds a {PRODUCT_EVALUATION_DAYS}-day trial with{" "}
              {PRODUCT_EVALUATION_DEAL_LIMIT} Pro deals and{" "}
              {PRODUCT_EVALUATION_COMPARISON_LIMIT} comparison, no card.
            </>
          }
          aside={
            // A real capture shown as a document, never in a browser frame.
            // Not the homepage's Verdict Ledger: its double rule draws in,
            // and that motion belongs to the homepage alone.
            <ProductShot
              shot={DECISION_SHOT}
              frame="document"
              priority
              alt="TrueCap's decision view for the sample deal: the Offer Ceiling beside the asking price, cash flow after reserves, DSCR, and the best next step"
              caption={
                <>
                  Real output from the free sample deal.{" "}
                  <Link href="/analyze?sample=1" prefetch={false} className="tc-link font-medium">
                    Run it yourself
                  </Link>
                </>
              }
            />
          }
        />

        {/* Strategies: ruled rows, the title, what the numbers cover, the way in. */}
        <Section aria-labelledby="strategies-heading">
          <SectionHeading id="strategies-heading">Pick your strategy</SectionHeading>
          {/* Two lines at desktop: balance sets them evenly instead of
              leaving "you buy." alone on the second. */}
          <p className="mt-3 max-w-[62ch] text-balance text-lg leading-relaxed text-muted-foreground">
            The analyzer is the same; each page shows how the numbers apply to
            the way you buy.
          </p>
          {/* The homepage source table's grid (11rem term, 16rem link), so
              the body column starts at the same x as the source table below;
              the titles are row terms in RuledList's voice. */}
          <ul className="mt-8 border-t-2 border-foreground">
            {STRATEGIES.map(({ title, body, href, cta }) => (
              <li
                key={title}
                className="grid gap-x-8 gap-y-2 border-b border-rule-soft py-5 lg:grid-cols-[11rem_minmax(0,1fr)_16rem] lg:items-baseline"
              >
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="max-w-[64ch] text-pretty text-base leading-relaxed text-muted-foreground">
                  {body}
                </p>
                {/* justify-self-start: the 44px target stays the label's
                    width instead of stretching across the grid cell. */}
                <IntentPrefetchLink href={href} className="tc-link inline-flex min-h-11 items-center justify-self-start text-base">
                  {cta}
                </IntentPrefetchLink>
              </li>
            ))}
          </ul>
        </Section>

        {/* What you get, free and Pro */}
        <Section aria-labelledby="get-heading">
          <SectionHeading id="get-heading">
            Free screens the deal. Pro answers four questions on every deal.
          </SectionHeading>
          <RuledList items={WHAT_YOU_GET} columns={2} className="mt-8" />
          <p className="mt-5 text-base">
            <IntentPrefetchLink href="/pricing" className="tc-link inline-flex min-h-11 items-center">
              Compare Free and Pro
            </IntentPrefetchLink>
          </p>
        </Section>

        {/* Sources */}
        <Section rhythm="tight" aria-labelledby="sources-heading">
          <SectionHeading id="sources-heading">
            Where the starting numbers come from
          </SectionHeading>
          <dl className="mt-8 border-t-2 border-foreground">
            {SOURCES.map((s) => (
              <div key={s.label} className={cn(SOURCE_ROW_GRID, "border-b border-rule-soft py-4")}>
                <dt className="font-semibold">{s.label}</dt>
                <dd className="min-w-0 max-w-[68ch] text-pretty text-base leading-relaxed">
                  {s.source}
                  {s.flag ? <span className="mt-1 block font-semibold">{s.flag}</span> : null}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-base">
            <IntentPrefetchLink href="/methodology" className="tc-link inline-flex min-h-11 items-center">
              Read the methodology
            </IntentPrefetchLink>
          </p>
        </Section>

        {/* The investor FAQ set. No FAQPage here: "/" claims the one question
            the two sets share, and claiming the rest on this URL is a
            separate SEO decision. */}
        <HomepageFaq structuredData={false} audience="investors" />

        <CloseSection
          heading="Paste a listing. See if it works before you write the offer."
          headingId="final-cta-heading"
          actions={
            <ActionRow>
              <Link href="/analyze" prefetch={false} className={buttonVariants({ size: "cta" })}>
                Analyze a property free
              </Link>
            </ActionRow>
          }
        >
          {/* /for-agents redirects while Agent Pro is unconfigured, so the
              link renders only behind the same gate as its sitemap entry. */}
          {agentProConfigured ? (
            <p className="mt-4 border-t border-rule-soft pt-2.5 text-base">
              Working with investor clients as an agent?{" "}
              <IntentPrefetchLink href="/for-agents" className="tc-link -my-3 inline-block py-3">
                See TrueCap for agents
              </IntentPrefetchLink>
            </p>
          ) : null}
        </CloseSection>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
