/**
 * /tools/rehab-cost-estimator, on the calculator page template (DESIGN.md
 * "Components"; the 1% rule calculator is the reference). The estimator sits
 * beside the H1 in PageHero: it is the card the signed-in analyzer also
 * mounts, in its "tool" rendering (the analyzer keeps the default). The guide
 * runs in a 68ch reading column (ArticleBody), the FAQ is ruled rows
 * (FaqSection; the page keeps its own FAQPage node), and the page closes once
 * on the heavy rule (CloseSection).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";
import { getSiteUrl } from "@/lib/site-url";
import { RehabEstimatorCard } from "@/components/investcalc/rehab-estimator-card";
import { ToolsConversionCta } from "@/components/marketing/tools-conversion-cta";
import { ToolEmbedInvite } from "@/components/marketing/tool-embed-invite";
import {
  ARTICLE_META,
  ARTICLE_META_LINK,
  ArticleBody,
} from "@/components/marketing/article";
import { FaqSection } from "@/components/marketing/faq-section";
import {
  ActionRow,
  CloseSection,
  PageHero,
  UnderTitleAnalyzeLink,
} from "@/components/marketing/page-parts";
import { Section } from "@/components/marketing/section";
import { buttonVariants } from "@/components/ui/button";

import { SiteFooter } from "@/components/marketing/site-footer";
import { ToolBreadcrumbSchema } from "@/components/marketing/tool-breadcrumb-schema";
import { RelatedContent } from "@/components/marketing/related-content";
import { Header } from "@/components/investcalc/header";
import { JsonLd } from "@/components/seo/json-ld";
import { buildToolAppLd } from "@/lib/seo/tool-app-ld";
import { OPEN_GRAPH_BASE } from "@/lib/seo/open-graph-base";
export const metadata: Metadata = {
  title: "Free Rehab Cost Estimator — Budget by Sq Ft",
  description:
    "Free renovation cost estimator with square-foot and per-room planning defaults for cosmetic, kitchen, bath, and systems work.",
  keywords: [
    "rehab cost estimator",
    "rehab calculator",
    "renovation cost calculator",
    "rental property rehab",
  ],
  alternates: { canonical: "/tools/rehab-cost-estimator" },
  openGraph: {
    ...OPEN_GRAPH_BASE,
    title: "Free Rehab Cost Estimator — Budget by Sq Ft",
    description:
      "Estimate rehab cost in seconds with planning defaults for common work items. Plus how to turn a directional estimate into real contractor bids.",
    url: "/tools/rehab-cost-estimator",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

const FAQS = [
  {
    q: "How accurate is a sq-ft-based rehab estimate?",
    a: "Directional, not bid-quality. The defaults are TrueCap planning starting points, not current market pricing or a survey of contractors. You switch line items on or off and set the square footage, bath count and contingency; an item's default cost cannot be changed in the tool. Real bids vary widely with local labor rates, material availability, scope clarity, and contractor markup. Use this estimator to triage deals; get local bids before committing.",
  },
  {
    q: "What contingency should I budget?",
    a: "10% on a cosmetic rehab, 15-20% on anything that touches structure, electrical, or plumbing. The bigger the project, the more surprises hide behind walls. Investors who skip contingency consistently blow budgets.",
  },
  {
    q: "Should I include holding costs in the rehab budget?",
    a: "Treat them separately. Rehab cost = labor + materials + permits + dumpster + supervision. Holding costs (mortgage interest, taxes, insurance, and utilities while no rent is coming in) belong in a dated project ledger. TrueCap does not currently offer integrated BRRRR or fix-and-flip lifecycle models.",
  },
  {
    q: "How do I estimate a kitchen renovation?",
    a: "Three tiers: (1) refresh — paint cabinets, new hardware, new faucet, $4-7k. (2) Mid-grade — IKEA cabinets, butcher block or quartz tops, new appliances, ~$22-30k. (3) Full custom — custom cabinets, premium countertops, professional installation, $40k+. Most rental flips and BRRRRs land in tier 2.",
  },
  {
    q: "What's a typical full-gut rehab cost?",
    a: "$80-150 per square foot in most US markets, $200-400 in high-cost coastal cities. Full gut = strip to studs, all-new systems (electrical, plumbing, HVAC), new windows, full finish. A 1,500 sqft full gut runs $120-225k mid-market, $300-600k in HCOL cities.",
  },
  {
    q: "Should I get one big bid or itemize?",
    a: "Itemize when you can. A lump-sum bid lets the contractor pad. An itemized bid forces transparency on which line items are real costs vs. markup. For BRRRR investors, itemized bids also make change orders less expensive when the inevitable surprises appear.",
  },
];

export default function RehabEstimatorPage() {
  const siteUrl = getSiteUrl();
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const appLd = buildToolAppLd(siteUrl, {
    slug: "rehab-cost-estimator",
    name: "Rehab Cost Estimator",
    description:
      "Free renovation cost estimator with square-foot and per-room planning defaults for cosmetic, kitchen, bath, and systems work.",
    featureList: [
      "Per-sqft + per-room rehab cost estimates",
      "Cosmetic, kitchen, bath, and systems work",
    ],
  });

  return (
    // relative + overflow-x-clip, as on the homepage: clips any sideways bleed
    // from a descendant without making a scroll container (sticky header ok).
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <ToolBreadcrumbSchema toolPath="/tools/rehab-cost-estimator" toolName="Rehab cost estimator" />
      <JsonLd data={faqLd} />
      <JsonLd data={appLd} />

      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        {/* The estimator in the first screen: from 1024px it sits beside the
            H1. The hub link is the visible half of the breadcrumb schema and
            sits under the H1, never above it. The hero's action is the one
            short analyzer link under the H1 (P2-80). */}
        <PageHero
          title="Rehab cost estimator"
          lede="Planning defaults for common rehab work items: interior paint and flooring by the square foot, baths per bath, and kitchens, roofs, HVAC, electrical and plumbing as flat amounts. Switch items on or off and set the square footage, bath count and contingency. Use it for early scope and budget triage before committing to detailed contractor bids."
          actions={<UnderTitleAnalyzeLink />}
          aside={<RehabEstimatorCard variant="tool" />}
        >
          <p className={ARTICLE_META}>
            <IntentPrefetchLink href="/tools" className={ARTICLE_META_LINK}>
              Free tools
            </IntentPrefetchLink>
          </p>
        </PageHero>

        {/* rule="none": PageHero's bottom rule already separates the head. */}
        <Section rule="none">
          <article className="max-w-[68ch]">
            <ArticleBody>
            <p>
              <strong>Educational guide:</strong> This page estimates renovation
              scope only. TrueCap does not currently expose integrated flip or
              BRRRR lifecycle modeling.
            </p>
            <h2>Why an estimator at all?</h2>
            <p>
              You can&apos;t screen a property that needs work without a renovation
              number. You also can&apos;t get a real contractor bid on every
              property you&apos;re considering. An early planning
              estimate is directional enough to filter the universe of
              potential deals down to the 10% worth a real bid.
            </p>
            <p>
              This tool ships with TrueCap planning defaults for every
              common rehab work item. Pick the scope, the calculator does
              the math, you get a number in seconds. Then add a contingency
              percentage (10-20% is common) and you have a directional planning
              figure to screen with — replace it with local contractor bids
              before you commit. For how these defaults are built, read{" "}
              <IntentPrefetchLink href="/blog/how-to-estimate-rehab-costs" className="tc-link">how to estimate rehab costs</IntentPrefetchLink>.
            </p>

            <h2>How to use the estimator</h2>
            <ol>
              <li>
                <strong>Set the sqft and bath count.</strong> Defaults to
                the property values if available; type your own numbers to
                change them.
              </li>
              <li>
                <strong>Click &ldquo;Pick work items&rdquo;</strong> to
                expand the catalog and select what the property needs.
              </li>
              <li>
                <strong>Adjust the contingency percentage.</strong> 10% for
                light cosmetic, 15-20% for anything touching systems or
                structure.
              </li>
              <li>
                <strong>Use the total as your underwriting input.</strong>{" "}
                Carry the total into your own project ledger; TrueCap does
                not currently offer integrated BRRRR or fix-and-flip models.
                New to the strategy? Start with{" "}
                <IntentPrefetchLink href="/blog/brrrr-method-explained" className="tc-link">the BRRRR method explained</IntentPrefetchLink>.
              </li>
            </ol>

            <h2>Cost categories explained</h2>
            <h3>Cosmetic ($3-15/sqft)</h3>
            <p>
              The cheap stuff that makes a rental show well: interior paint,
              new flooring (LVP is the rental standard), updated light
              fixtures and hardware, basic landscaping. Most rentals only
              need cosmetic work between tenants.
            </p>
            <h3>Kitchen ($5k refresh → $40k+ full reno)</h3>
            <p>
              The single biggest single-room cost driver. Three tiers:
              refresh (paint cabinets, hardware, faucet), mid-grade (IKEA
              cabinets, quartz, new appliances), or custom. Investors should
              almost never do custom kitchens in a rental.
            </p>
            <h3>Bath ($3k refresh → $16k full reno per bath)</h3>
            <p>
              Costs multiply by bath count. A house with 2 baths and a full
              bath reno is $30-40k. The tool multiplies bath items by bath
              count automatically.
            </p>
            <h3>Systems ($1.5k-12k per item)</h3>
            <p>
              Roof, HVAC, water heater, electrical panel, plumbing. These
              are the items that turn a deal from &ldquo;cosmetic flip&rdquo;
              into &ldquo;heavy rehab.&rdquo; They&apos;re also where
              inspection-discovered surprises live.
            </p>
            <h3>Structural ($8k-12k typical)</h3>
            <p>
              New windows, exterior repair, foundation work. Sometimes
              uncovered after demo; budget contingency to absorb at least
              one structural surprise.
            </p>

            <h2>Common rehab budgeting mistakes</h2>
            <h3>1. Skipping contingency</h3>
            <p>
              Every rehab has at least one surprise. Plumbing was wrong, the
              floor needed replacement instead of refinishing, the
              contractor found rot. Without 10-20% contingency, that one
              surprise eats your margin.
            </p>
            <h3>2. Ignoring soft costs</h3>
            <p>
              Permits, dumpster rentals, temporary power, project management
              fees, lockbox + key copies — soft costs add up to 5-10% on top
              of the materials and labor estimate. This tool has no line
              for them: budget them separately or raise the contingency.
            </p>
            <h3>3. Underestimating bath multiplication</h3>
            <p>
              A 3-bath house with a $9.5k mid-grade bath reno per bath is
              $28.5k just on bathrooms. Investors often anchor on
              &ldquo;one bath&rdquo; cost and forget to multiply.
            </p>
            <h3>4. Confusing &ldquo;estimate&rdquo; with &ldquo;bid&rdquo;</h3>
            <p>
              This estimator is for underwriting and triage. Before
              committing, get three written bids from licensed contractors.
              Real bids vary 30-50% from this estimator depending on the
              market and the contractor.
            </p>

            </ArticleBody>

            {/* The analyzer CTA where the guide hands off to TrueCap, inside
                the article, so the page closes once, on the CloseSection
                below. */}
            <ToolsConversionCta calculatorName="Rehab estimator" hook="Use the rental analyzer to screen a stabilized hold after renovation, and keep construction-period contributions, financing, and sale or refinance costs in a separate project ledger." />

            {/* The page's FAQPage node is faqLd above, built from the same
                FAQS, so the section emits none of its own. */}
            <FaqSection
              id="rehab-faq"
              variant="inline"
              heading="Frequently asked questions"
              items={FAQS}
              structuredData={false}
            />
          </article>
        </Section>

        <CloseSection
          heading="Carry the estimate into a reviewed project ledger"
          headingId="rehab-close-heading"
          lede={
            <>
              The rehab number is one input. Keep acquisition financing,
              construction carry, draws, lease-up, refinance or sale proceeds,
              and every capital contribution in a separate dated ledger. Use
              TrueCap&apos;s analyzer only for the stabilized rental case.
            </>
          }
          actions={
            <>
              <ul className="border-t-2 border-foreground">
                {[
                  "Line-item rehab range by scope of work",
                  "Separate dated ledger for construction-period cash flows",
                  "Contractor bids and contingency replace the early estimate",
                  "Stabilized-rental screen after renovation",
                  "Free to start",
                ].map((line) => (
                  <li
                    key={line}
                    className="border-b border-rule-soft py-3 text-pretty text-base"
                  >
                    {line}
                  </li>
                ))}
              </ul>
              <ActionRow className="mt-6">
                <Link href="/analyze" prefetch={false} className={buttonVariants({ size: "cta" })}>
                  Open the rental analyzer
                </Link>
              </ActionRow>
            </>
          }
        />

        {/* The tail shares the reading column. Each block spaces itself from
            the one above (mt-12); the first one, directly under the close,
            takes the close's own bottom space instead. */}
        <Section rule="none" rhythm="tight" containerClassName="pt-0 sm:pt-0">
          <div className="max-w-[68ch] [&>*:first-child]:mt-0">
            {/* Backlink engine — quiet, collapsed, renders nothing if this
                tool has no embeddable widget. See the component header. */}
            <ToolEmbedInvite slug="rehab-cost-estimator" />

            <RelatedContent kind="tool" slug="rehab-cost-estimator" title="Rehab Cost Estimator" className="mt-12" />
          </div>
        </Section>
      </main>
      <SiteFooter />
    </div>
  );
}
