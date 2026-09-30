/**
 * /vs/biggerpockets-for-house-hacking — niche use-case comparison.
 *
 * Target queries: "biggerpockets house hacking", "house hacking
 * calculator", "biggerpockets calculator for house hacking",
 * "best house hack analysis tool". Long-tail audience slicing:
 * BiggerPockets calculator framed against TrueCap specifically for
 * house-hackers (owner-occupant 2-4 unit deals).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { AuthorBio } from "@/components/marketing/author-bio";
import { BlogByline } from "@/components/marketing/blog-byline";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { ProductShot } from "@/components/marketing/product-shot";
import { SiteFooter } from "@/components/marketing/site-footer";
import { RelatedContent } from "@/components/marketing/related-content";
import { AnalyzeCtaLink } from "@/components/marketing/analyze-cta-link";
import {
  ComparisonFaq,
  type FaqItem,
} from "@/components/marketing/comparison-faq";
import { ActionRow, CloseSection } from "@/components/marketing/page-parts";
import { Section, SectionHeading } from "@/components/marketing/section";
import {
  VS_ACTIONS,
  VS_H1,
  VS_INTRO,
  VS_LEDE,
  VS_LINK_ROW,
  VS_NOTE,
  VS_PROSE,
  VS_SOURCES,
  VsHero,
  VsMatrixTable,
} from "@/components/marketing/vs-page";
import { getSiteUrl } from "@/lib/site-url";
import { VsBreadcrumbSchema } from "@/components/marketing/vs-breadcrumb-schema";
import { buttonVariants } from "@/components/ui/button";
import { ScrollX } from "@/components/ui/scroll-x";
import { Header } from "@/components/investcalc/header";
import { lastmodFor } from "@/lib/seo/lastmod";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "BiggerPockets vs TrueCap for House Hacking (2026)",
  description:
    "Both calculators run house-hack deals. See which one models owner-occupant unit usage, FHA financing, and effective rent saved more cleanly.",
  keywords: [
    "biggerpockets house hacking",
    "house hacking calculator",
    "biggerpockets calculator for house hacking",
    "best house hack analysis tool",
    "truecap house hack",
    "owner occupant rental analysis",
  ],
  alternates: { canonical: "/vs/biggerpockets-for-house-hacking" },
  openGraph: {
    title: "BiggerPockets vs TrueCap for House Hacking (2026)",
    description:
      "House-hack-specific comparison: owner-occupant unit modeling, FHA financing, effective rent saved. Which calculator fits the house-hack workflow.",
    url: "/vs/biggerpockets-for-house-hacking",
    type: "website",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap vs BiggerPockets for House Hacking",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "biggerpockets" | "tie";
type Row = {
  feature: string;
  truecap: string;
  biggerpockets: string;
  winner: Verdict;
};

const MATRIX: Row[] = [
  {
    feature: "Owner-occupant property type",
    truecap:
      "Yes — explicit 'owner-occupant' property type with per-unit setup",
    biggerpockets: "Standard multifamily form; you manually adjust",
    winner: "truecap",
  },
  {
    feature: "Per-unit rent + status modeling",
    truecap: "Yes — mark which unit YOU live in; other units' rent counted",
    biggerpockets: "Manual — you adjust the rent calculation yourself",
    winner: "truecap",
  },
  {
    feature: "Effective 'rent saved' calculation",
    truecap: "Yes — surfaces what your monthly housing cost actually is",
    biggerpockets: "You compute it yourself from the spreadsheet",
    winner: "truecap",
  },
  {
    feature: "FHA financing assumptions (3.5% down)",
    truecap: "Yes — configurable down payment goes as low as 3.5%",
    biggerpockets: "Yes — configurable",
    winner: "tie",
  },
  {
    feature: "Cap rate framing",
    truecap: "Standard property-level cap rate; no full-vs-rental-only toggle",
    biggerpockets: "Standard cap rate; adjust inputs for each scenario",
    winner: "tie",
  },
  {
    feature: "Starting values (rent/rate/tax)",
    truecap: "HUD FMR per unit + FRED rate + manual local property tax",
    biggerpockets: "Manual entry",
    winner: "truecap",
  },
  {
    feature: "DSCR screening ratio",
    truecap: "Yes — screening output, not a lender approval model",
    biggerpockets: "Available in its calculator; not lender approval",
    winner: "tie",
  },
  {
    feature: "Post-move-out scenario",
    truecap: "Save a separate fully rented scenario; no move-out-year switch",
    biggerpockets: "Adjust and save a separate scenario",
    winner: "tie",
  },
  {
    feature: "Sensitivity grid (vacancy on rental units)",
    truecap: "Pro — rent ±10%, vacancy ±5pp on rental units only",
    biggerpockets: "Manual re-runs",
    winner: "truecap",
  },
  {
    feature: "Mobile UX at the showing",
    truecap: "PWA installable",
    biggerpockets: "Desktop-leaning calculator + separate mobile app",
    winner: "tie",
  },
  {
    feature: "Free tier covers house hacking",
    truecap: "Yes — core owner-occupant underwriting on free tier",
    biggerpockets: "Current calculator presents results as a Pro feature",
    winner: "truecap",
  },
  {
    feature: "Pricing",
    truecap: "Free core; paid Pro — see live pricing",
    biggerpockets: "Calculator bundled with Pro — see live pricing",
    winner: "tie",
  },
];

const BP_HOUSE_HACK_FAQ: FaqItem[] = [
  {
    question: "Which is better for house hackers — TrueCap or BiggerPockets?",
    answer: (
      <>
        TrueCap provides a more explicit house-hack setup. The main difference
        is the explicit &quot;owner-occupant&quot; property type — you mark
        which unit you&apos;ll live in, and TrueCap automatically excludes that
        unit&apos;s &quot;rent&quot; from the income side of the underwriting
        (because you&apos;re paying yourself, effectively). BiggerPockets&apos;
        calculator treats the property as a generic multifamily and makes you
        mentally adjust the math for the owner-occupied unit. Both work; TrueCap
        is just less manual setup for the house-hack workflow.
      </>
    ),
  },
  {
    question: "Does TrueCap handle FHA 3.5%-down house hacks?",
    answer: (
      <>
        Yes — TrueCap&apos;s down payment field is configurable. Set it to 3.5%
        for FHA, 5% for conventional owner-occupant, 10-15% for bigger deals
        where you want a lower PMI burden. PITI and DSCR recalculate
        automatically. Enter the lender&apos;s annual FHA mortgage insurance
        premium in the dedicated PMI / MIP field and select the loan-life option
        when it applies. If an upfront premium is not financed, include that
        cash amount in closing costs.
      </>
    ),
  },
  {
    question: "What's 'effective rent saved' and why does it matter?",
    answer: (
      <>
        When you house-hack, your monthly housing cost isn&apos;t the full PITI
        — it&apos;s the PITI minus the rent your rental units bring in. That gap
        is your &quot;effective rent saved&quot; vs a regular apartment lease.
        TrueCap surfaces this number explicitly so you can compare house-hacking
        vs renting an apartment using the same assumptions. BiggerPockets&apos;
        calculator requires you to compute it from the cash-flow line yourself.
      </>
    ),
  },
  {
    question: "Does the cap rate apply differently to a house hack?",
    answer: (
      <>
        Cap rate remains property-level NOI divided by purchase price. TrueCap
        does not provide a dedicated full-property versus rental-units-only
        cap-rate toggle. Model the current owner-occupied case, then save a
        separate fully rented scenario to review the post-move-out case.
      </>
    ),
  },
  {
    question: "Is BiggerPockets Pro worth it for the calculator alone?",
    answer: (
      <>
        It depends on which membership benefits you use. BiggerPockets currently
        presents calculator results as a Pro feature, and its membership
        includes benefits beyond the calculator. TrueCap has free core
        owner-occupant underwriting and paid Pro analysis tools. Compare both
        live pricing pages and the features you actually need.
      </>
    ),
  },
  {
    question: "What changes when I model the post-move-out scenario?",
    answer: (
      <>
        When you move out of the owner-occupied unit and rent it to a third
        tenant, you&apos;re back to a standard rental underwrite — all units
        producing rent, your housing cost moves elsewhere. TrueCap does not have
        a dedicated &quot;year you move out&quot; switch. Save a separate fully
        rented multi-family scenario and compare it with the current
        owner-occupied case. Pro can compare saved deals side-by-side and add
        10-year projections to each.
      </>
    ),
  },
];

export default function VsBiggerPocketsForHouseHackingPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "BiggerPockets vs TrueCap for House Hacking (2026)",
    url: `${siteUrl}/vs/biggerpockets-for-house-hacking`,
    description:
      "House-hack-specific comparison of TrueCap and BiggerPockets — owner-occupant modeling, FHA financing, effective rent saved.",
    dateModified: lastmodFor("/vs/biggerpockets-for-house-hacking"),
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    // relative + overflow-x-clip, as on the homepage and the /vs hub: no
    // descendant can make the phone page scroll sideways.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={structuredData} />
      <VsBreadcrumbSchema
        vsPath="/vs/biggerpockets-for-house-hacking"
        pageName="TrueCap vs BiggerPockets for House Hacking"
      />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <VsHero>
          <h1 className={VS_H1}>
            TrueCap vs BiggerPockets for House Hacking:{" "}
            which calculator handles owner-occupant deals correctly?
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            Both run house-hack underwriting. This is the house-hacker cut:
            which one models owner-occupant unit usage cleanly, FHA 3.5%-down
            financing, and surfaces &quot;effective rent saved&quot; — the
            metric that actually decides whether the deal beats just renting an
            apartment.
          </p>
          <ActionRow className={VS_ACTIONS}>
            <AnalyzeCtaLink analyticsSource="vs_hero" className={buttonVariants({ size: "cta" })}>
              Underwrite a house hack
            </AnalyzeCtaLink>
            <Link
              href="/for-house-hackers"
              className={buttonVariants({ variant: "outline", size: "cta" })}
            >
              For house hackers
            </Link>
          </ActionRow>
          <p className={VS_NOTE}>
            No card · Free analyzer covers house-hack underwriting
          </p>
        </VsHero>

        {/* Real product screenshot from the free sample deal, set as a
            document (no fake browser frame). */}
        <Section rule="none" rhythm="tight" aria-label="What the decision looks like">
          <ProductShot
            shot="verdict"
            frame="document"
            sizes="(min-width: 768px) 768px, 100vw"
            className="max-w-3xl"
            alt="TrueCap's decision view for the sample deal: the Offer Ceiling beside the asking price, cash flow after reserves, and DSCR"
            caption={<>Real output from the free sample deal. <Link href="/analyze?sample=1" prefetch={false} className="tc-link">Run it yourself</Link></>}
          />
        </Section>

        {/* TL;DR */}
        <Section rhythm="tight" aria-labelledby="vs-tldr-heading">
          <SectionHeading id="vs-tldr-heading">
            TL;DR for house hackers
          </SectionHeading>
          <div className={VS_PROSE}>
            <p>
              <strong>TrueCap</strong> wins for house-hacking specifically — the
              explicit &quot;owner-occupant&quot; property type auto-excludes your
              unit from the rent income side, surfaces an &quot;effective rent
              saved&quot; metric, while keeping every rent and expense input
              editable.
              <strong> BiggerPockets&apos;</strong> calculator treats the property
              as generic multifamily and requires you to mentally adjust the math
              for your owner-occupied unit. TrueCap has a free core
              owner-occupant workflow, while BiggerPockets currently presents
              calculator results as a Pro membership feature. Compare both live
              pricing pages.
            </p>
          </div>
        </Section>

        {/* Matrix */}
        <Section aria-labelledby="vs-matrix-heading">
          <SectionHeading id="vs-matrix-heading">
            House-hack feature-by-feature
          </SectionHeading>
          <p className={VS_INTRO}>
            Where each tool wins on the house-hack-specific workflow.
          </p>
          <ScrollX label="Comparison table" className="mt-8 max-w-5xl">
            <VsMatrixTable
              head={["Feature", "TrueCap", "BiggerPockets"]}
              rows={MATRIX.map((row) => ({
                label: row.feature,
                truecap: row.truecap,
                competitor: row.biggerpockets,
                winner: row.winner === "biggerpockets" ? "competitor" : row.winner,
              }))}
            />
          </ScrollX>
          <p className={VS_SOURCES}>
            BiggerPockets calculator details based on publicly available product
            info as of 2026. See{" "}
            <a
              href="https://www.biggerpockets.com/rental-property-calculator"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              BiggerPockets&apos; official rental calculator page
            </a>{" "}
            for their current state.
          </p>
          <div className={VS_PROSE}>
            <p>
              New to running an owner-occupant deal? Our{" "}
              <Link
                href="/blog/house-hack-underwriting-guide"
                className="tc-link"
              >
                house hack underwriting guide
              </Link>{" "}
              walks through counting only the rental units&apos; income. To
              pressure-test the numbers on your own deal, our{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                free deal analyzer
              </Link>{" "}
              returns cap rate and cash-on-cash return for the same owner-occupant
              setup.
            </p>
          </div>
        </Section>

        <ComparisonFaq
          competitorName="BiggerPockets (House Hacking)"
          items={BP_HOUSE_HACK_FAQ}
        />

        {/* Pricing CTA */}
        <CloseSection
          headingId="vs-close-heading"
          heading={<>Underwrite your first house hack — free.</>}
          lede={
            <>
              TrueCap&apos;s free tier covers owner-occupant property types,
              per-unit rent + status, FHA financing, and effective-rent-saved
              math. Pro adds a 10-year cash-flow and equity planning view,
              sensitivity, Offer Ceiling, and saved-deal comparison. Model
              post-move-out as a separate fully rented scenario; see live pricing
              and check trial eligibility.
            </>
          }
          actions={
            <ActionRow>
              <Link
                href="/analyze" prefetch={false}
                className={buttonVariants({ size: "cta" })}
              >
                Run a deal — 60 seconds
              </Link>
              <Link
                href="/for-house-hackers"
                className={buttonVariants({ variant: "outline", size: "cta" })}
              >
                For house hackers
              </Link>
            </ActionRow>
          }
        />

        <Section rule="none" rhythm="tight">
          <div className="max-w-5xl">
            <RelatedContent kind="vs" slug="biggerpockets-for-house-hacking" />
            <AuthorBio />

            <footer className="mt-10 border-t border-border pt-6">
              <p className="text-lg font-semibold">Other comparisons:</p>
              <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
                <li>
                  <Link
                    href="/vs/biggerpockets-calculator"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs BiggerPockets
                  </Link>
                </li>
                <li>
                  <Link
                    href="/vs/dealcheck"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs DealCheck
                  </Link>
                </li>
              </ul>
            </footer>
          </div>
        </Section>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
