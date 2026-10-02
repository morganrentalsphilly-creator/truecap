/**
 * /vs/dealcheck — competitor comparison landing page.
 *
 * Target query: "DealCheck alternative", "DealCheck vs ...", "free
 * DealCheck", "DealCheck pricing". Extreme commercial-intent organic
 * search — the visitor has already evaluated one tool and is
 * comparison-shopping. Honest matrix wins more than puffery.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";
import { isAgentProConfigured } from "@/lib/stripe/plan-prices";
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
  VS_FOOTNOTE,
  VS_H1,
  VS_INTRO,
  VS_LEDE,
  VS_LINK_ROW,
  VS_NOTE,
  VS_PROSE,
  VS_SOURCES,
  VS_TLDR_GRID,
  VS_TLDR_LABEL,
  VS_TLDR_LIST,
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
  title: "DealCheck Alternative for Rental Analysis (2026)",
  description:
    "A TrueCap vs DealCheck workflow comparison: first screen, assumptions, purchase criteria, offer calculation, downside, and mobile access.",
  keywords: [
    "dealcheck alternative",
    "dealcheck vs truecap",
    "truecap vs dealcheck",
    "rental analysis tool comparison",
    "best rental property calculator",
  ],
  alternates: { canonical: "/vs/dealcheck" },
  openGraph: {
    title: "DealCheck Alternative for Rental Analysis (2026)",
    description:
      "Address-to-underwrite workflow vs a mature rental-analysis and native mobile ecosystem.",
    url: "/vs/dealcheck",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

type Row = { workflow: string; truecap: string; dealcheck: string };

const MATRIX: Row[] = [
  {
    workflow: "First screen",
    truecap:
      "Address-first, no-signup screen with editable assumptions and core economics.",
    dealcheck:
      "Account-based analysis with listing and property-data import workflows.",
  },
  {
    workflow: "Starting assumptions",
    truecap:
      "Labels editable HUD rent and FRED rate benchmarks, a manual tax input, fallbacks, and user edits.",
    dealcheck:
      "Imports available property data and supports user-entered assumptions.",
  },
  {
    workflow: "Purchase criteria",
    truecap: "Buy Box checks the analysis inside the decision flow.",
    dealcheck:
      "Custom purchase criteria screen properties against saved thresholds; the full set of criteria needs Plus or Pro.",
  },
  {
    workflow: "Offer Ceiling",
    truecap:
      "Offer Ceiling is connected to your Buy Box targets: the highest price that still meets them.",
    dealcheck:
      "Its Offer Calculator calculates offers from configurable buying criteria on the Plus and Pro plans.",
  },
  {
    workflow: "Downside",
    truecap:
      "Sensitivity and downside scenarios sit directly after Buy Box fit and the Offer Ceiling.",
    dealcheck:
      "Long-range analysis and editable assumptions support scenario evaluation.",
  },
  {
    workflow: "Mobile",
    truecap: "Responsive web app that can be installed as a PWA.",
    dealcheck: "Native iOS and Android apps plus web access.",
  },
  {
    workflow: "Investor clients (agents)",
    truecap:
      "Agent Pro adds a client roster (up to 100 clients) and Buy Boxes you assign to clients (up to 12 per account), deal assignment, and client-report share links that open without an account; co-branded share pages and PDFs are in Pro and Agent Pro, with TrueCap's name kept.",
    dealcheck:
      "Every DealCheck plan exports a PDF report; putting your own name and logo on it needs DealCheck Pro. Check its site for how client criteria and sharing work.",
  },
  {
    workflow: "Best fit",
    truecap: "Investors who want a guided address-to-underwrite sequence.",
    dealcheck:
      "Investors who want a mature analysis ecosystem and native mobile workflow.",
  },
];

export default function VsDealCheckPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "DealCheck Alternative for Rental Analysis (2026)",
    url: `${siteUrl}/vs/dealcheck`,
    description:
      "Side-by-side comparison of TrueCap and DealCheck for rental property underwriting.",
    dateModified: lastmodFor("/vs/dealcheck"),
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    // relative + overflow-x-clip, as on the homepage and the /vs hub: no
    // descendant can make the phone page scroll sideways.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={structuredData} />
      <VsBreadcrumbSchema
        vsPath="/vs/dealcheck"
        pageName="TrueCap vs DealCheck"
      />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <VsHero>
          <h1 className={VS_H1}>
            TrueCap vs DealCheck:{" "}
            which rental analyzer fits you?
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            DealCheck has served investors for years. TrueCap uses a different
            sequence: start with an address, inspect the assumptions, see a
            Buy Box fit, then connect the Offer Ceiling, downside,
            and presentation. Here is the comparison so you can pick the
            workflow that fits.
          </p>
          <ActionRow className={VS_ACTIONS}>
            <AnalyzeCtaLink analyticsSource="vs_hero" className={buttonVariants({ size: "cta" })}>
              Try the TrueCap free analyzer
            </AnalyzeCtaLink>
            <Link
              href="/pricing"
              className={buttonVariants({ variant: "outline", size: "cta" })}
            >
              See TrueCap pricing
            </Link>
          </ActionRow>
          <p className={VS_NOTE}>
            Free analyzer: no card or signup
          </p>
        </VsHero>

        {/* Real product screenshot from the free sample deal, set as a
            document (no fake browser frame). */}
        <Section rule="none" rhythm="tight" aria-label="What the decision looks like">
          <ProductShot
            shot="verdict"
            frame="document"
            priority
            sizes="(min-width: 768px) 768px, 100vw"
            className="max-w-3xl"
            alt="TrueCap's decision view for the sample deal: the Offer Ceiling beside the asking price, cash flow after reserves, and DSCR"
            caption={<>Real output from the free sample deal. <Link href="/analyze?sample=1" prefetch={false} className="tc-link">Run it yourself</Link></>}
          />
        </Section>

        {/* TL;DR */}
        <Section rhythm="tight" aria-labelledby="vs-tldr-heading">
          <SectionHeading id="vs-tldr-heading">
            TL;DR
          </SectionHeading>
          <div className={VS_TLDR_GRID}>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Pick TrueCap if
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>You want a fast address-to-underwrite sequence.</li>
                <li>
                  You want labeled HUD rent and FRED rate benchmarks with a
                  manual local property-tax input.
                </li>
                <li>
                  You want core economics and Buy Box fit with the
                  supporting math visible.
                </li>
                <li>You want Buy Box evaluation inside the analysis flow.</li>
                <li>
                  You want an Offer Ceiling, downside, and
                  decision packaging connected.
                </li>
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Pick DealCheck if
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>
                  You want native iOS + Android apps (TrueCap is PWA-only
                  today).
                </li>
                <li>
                  You&apos;re heavily invested in listing-import workflows.
                </li>
                <li>
                  You already have a paid DealCheck plan and the muscle memory.
                </li>
                <li>
                  You want a tool with a longer track record and BRRRR
                  analysis.
                </li>
              </ul>
            </div>
          </div>
          <p className={VS_FOOTNOTE}>
            Weighing more than these two? Full list:{" "}
            <IntentPrefetchLink
              href="/blog/best-dealcheck-alternatives"
              className="tc-link"
            >
              7 best DealCheck alternatives
            </IntentPrefetchLink>
          </p>
        </Section>

        {/* Matrix */}
        <Section aria-labelledby="vs-matrix-heading">
          <SectionHeading id="vs-matrix-heading">
            Workflow-by-workflow
          </SectionHeading>
          <p className={VS_INTRO}>
            Both products analyze rentals. The difference is how each gets you
            from inputs to action.
          </p>
          <ScrollX label="Comparison table" className="mt-8 max-w-5xl">
            <VsMatrixTable
              head={["Workflow", "TrueCap", "DealCheck"]}
              rows={MATRIX.map((row) => ({
                label: row.workflow,
                truecap: row.truecap,
                competitor: row.dealcheck,
              }))}
            />
          </ScrollX>
          <p className={VS_SOURCES}>
            Pricing, plan limits, and exact feature availability change.
            DealCheck details were reviewed against its official{" "}
            <a
              href="https://dealcheck.io/pricing/"
              target="_blank"
              rel="noopener noreferrer"
              className="tc-link"
            >
              pricing
            </a>
            ,{" "}
            <a
              href="https://help.dealcheck.io/en/articles/2047630-using-the-offer-calculator-to-calculate-offers-to-sellers"
              target="_blank"
              rel="noopener noreferrer"
              className="tc-link"
            >
              Offer Calculator
            </a>
            ,{" "}
            <a
              href="https://help.dealcheck.io/en/articles/2259844-screening-properties-with-custom-investment-criteria"
              target="_blank"
              rel="noopener noreferrer"
              className="tc-link"
            >
              custom criteria
            </a>
            , and{" "}
            <a
              href="https://help.dealcheck.io/en/articles/2047720-how-to-export-property-reports"
              target="_blank"
              rel="noopener noreferrer"
              className="tc-link"
            >
              report export
            </a>{" "}
            documentation in October 2026. Features and prices can change.
          </p>
        </Section>

        {/* Workflow fit */}
        <Section aria-labelledby="vs-fit-heading">
          <SectionHeading id="vs-fit-heading">
            Choose TrueCap when the decision sequence matters most
          </SectionHeading>
          <div className={VS_PROSE}>
            <ul>
              <li>
                <strong>Start with less setup.</strong> Enter an address for a
                first-pass screen, then refine the assumptions that matter.
              </li>
              <li>
                <strong>See where the inputs came from.</strong> TrueCap labels
                sourced starting points and keeps them editable.
              </li>
              <li>
                <strong>Move from result to review.</strong> Buy Box fit
                leads to the Offer Ceiling, downside, and verification tools
                instead of stopping at a metric summary.
              </li>
              <li>
                <strong>Reuse your own criteria.</strong> Buy Box targets stay
                connected to the verdict and offer calculation.
              </li>
            </ul>
            <p>
              Prefer to get your head around a single metric first? Our
              walkthroughs on{" "}
              <IntentPrefetchLink
                href="/blog/how-to-calculate-cap-rate"
                className="tc-link"
              >
                how to calculate cap rate
              </IntentPrefetchLink>
              ,{" "}
              <IntentPrefetchLink
                href="/blog/how-to-calculate-dscr"
                className="tc-link"
              >
                how to calculate DSCR
              </IntentPrefetchLink>
              , and the{" "}
              <IntentPrefetchLink
                href="/blog/brrrr-method-explained"
                className="tc-link"
              >
                BRRRR workflow guide
              </IntentPrefetchLink>{" "}
              each walk the math end to end before you commit to a full
              underwrite. For the workflow itself, our guide on{" "}
              <IntentPrefetchLink
                href="/blog/how-to-underwrite-a-rental-property-in-60-seconds"
                className="tc-link"
              >
                60-second underwriting
              </IntentPrefetchLink>{" "}
              shows exactly how a TrueCap user moves from listing to a reviewed
              underwrite.
            </p>
          </div>
        </Section>

        <ComparisonFaq
          competitorName="DealCheck"
          items={DEALCHECK_FAQ}
          reviewedDate="October 2026"
        />

        {/* Pricing CTA */}
        <CloseSection
          headingId="vs-close-heading"
          heading={<>Try TrueCap free — see if it fits your workflow.</>}
          lede={
            <>
              Screen a property without a card, inspect the assumptions and core
              economics, then decide whether TrueCap&apos;s connected Buy Box,
              Offer Ceiling, downside, and reporting workflow fits how you acquire
              rentals.
            </>
          }
          actions={
            <ActionRow>
              <Link
                href="/analyze" prefetch={false}
                className={buttonVariants({ size: "cta" })}
              >
                Run a deal now
              </Link>
              <IntentPrefetchLink
                href="/pricing"
                className={buttonVariants({ variant: "outline", size: "cta" })}
              >
                See Pro pricing
              </IntentPrefetchLink>
            </ActionRow>
          }
        />

        <Section rule="none" rhythm="tight">
          <div className="max-w-5xl">
            <RelatedContent kind="vs" slug="dealcheck" />
            <AuthorBio />

            <footer className="mt-10 border-t border-border pt-6">
              <p className="text-lg font-semibold">Other comparisons:</p>
              <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
                <li>
                  <IntentPrefetchLink
                    href="/vs/stessa"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Stessa
                  </IntentPrefetchLink>
                </li>
                <li>
                  <IntentPrefetchLink
                    href="/vs/mashvisor"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Mashvisor
                  </IntentPrefetchLink>
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

/**
 * /for-agents permanently redirects to /pricing while Agent Pro's Stripe
 * Price is absent on a deployment; the link-graph guard forbids linking a
 * redirect, so that deployment links the plan cards instead.
 */
const AGENTS_HREF = isAgentProConfigured() ? "/for-agents" : "/pricing#plans";

const DEALCHECK_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a free alternative to DealCheck?",
    answer: (
      <>
        TrueCap offers a no-signup first-pass screen with cap rate, cash-on-cash
        return, DSCR, monthly cash flow, and Buy Box fit. DealCheck also
        publishes a free plan; check its official{" "}
        <a
          href="https://dealcheck.io/pricing/"
          target="_blank"
          rel="noopener noreferrer"
          className="tc-link"
        >
          pricing page
        </a>{" "}
        for current limits. The better fit depends on whether you prefer
        TrueCap&apos;s address-to-underwrite sequence or DealCheck&apos;s
        established analysis and import workflow.
      </>
    ),
  },
  {
    question: "How much does TrueCap cost compared to DealCheck?",
    answer: (
      <>
        See TrueCap&apos;s{" "}
        <IntentPrefetchLink href="/pricing" className="tc-link">
          live pricing page
        </IntentPrefetchLink>{" "}
        and DealCheck&apos;s official{" "}
        <a
          href="https://dealcheck.io/pricing/"
          target="_blank"
          rel="noopener noreferrer"
          className="tc-link"
        >
          pricing page
        </a>
        . Comparing the current pages is safer than relying on copied prices
        because either company can change plans.
      </>
    ),
  },
  {
    question: "Which tool is better for new investors?",
    answer: (
      <>
        TrueCap can fit a newer investor who values an address-first screen,
        labeled starting assumptions, and Buy Box fit. DealCheck can fit
        someone who wants its established property-import and native mobile
        workflow. Neither tool replaces verification or due diligence.
      </>
    ),
  },
  {
    question: "Does TrueCap have a mobile app like DealCheck?",
    answer: (
      <>
        TrueCap is a Progressive Web App (PWA) — you install it from the browser
        to your home screen. DealCheck has true native iOS and Android apps,
        which is the right call if you&apos;re heavy on mobile-first workflows
        like walking properties and analyzing on the spot. Both work on phones;
        the difference is delivery mechanism.
      </>
    ),
  },
  {
    question: "Can I import properties from Zillow or Redfin with TrueCap?",
    answer: (
      <>
        Partly. You can paste a Zillow, Redfin, Realtor.com, Homes.com or
        Trulia link and TrueCap pulls the <strong>address</strong> out of it,
        then can pre-fill editable HUD area rent and the FRED owner-occupied 30-year
        mortgage-rate benchmark. Property tax stays manual. What it does{" "}
        <em>not</em> do is scrape the listing page for price, taxes and photos —
        DealCheck&apos;s full property-detail import is deeper there. The
        trade-off is deliberate: TrueCap labels the source beside each starting
        value so you can review and replace it.
      </>
    ),
  },
  {
    question: "Which is better for an agent with investor clients?",
    answer: (
      <>
        It depends on the job. Every DealCheck plan exports a PDF report;
        putting your own name and logo on it needs DealCheck Pro. If all you
        need is a calculator PDF for a client, DealCheck covers that. TrueCap
        Agent Pro is
        for screening each listing against a specific client&apos;s Buy Box,
        showing that client&apos;s Offer Ceiling, and sending a co-branded
        decision memo the client can open without an account and rerun with
        their own assumptions. See{" "}
        <IntentPrefetchLink href={AGENTS_HREF} className="tc-link">
          TrueCap for agents
        </IntentPrefetchLink>{" "}
        for what the client receives.
      </>
    ),
  },
  {
    question: "When should I pick DealCheck over TrueCap?",
    answer: (
      <>
        Pick DealCheck if you&apos;re primarily mobile-first walking many
        properties a day, you want a native app, and listing-site property
        import is your top workflow. Pick TrueCap if you want an address-first
        screen connected to Buy Box fit, Offer Ceiling, downside
        analysis, and presentation tools.
      </>
    ),
  },
];
