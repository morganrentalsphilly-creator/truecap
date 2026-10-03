/**
 * /playbook — The First Offer Playbook.
 *
 * The complete written path from "screening deals" to "offer submitted",
 * because the real blocker for the almost-investor is courage and process,
 * not math. Published in full and public (consistent with the public
 * methodology — confidence comes from a process you can audit); the
 * email-capture module offers the playbook plus a short verification course.
 * The former Market Intelligence Pack is not distributed while its tax/law
 * records remain high-risk and stale. Deviation from the rollout spec's
 * "gated by email" is deliberate and logged in the rollout report: a
 * fully-gated page fights the sitemap/SEO requirement and the site's
 * transparency positioning.
 *
 * Content rules: benchmarks-not-quotes framing throughout; the scripts are
 * communication templates, not legal or financial advice; nothing here
 * promises returns.
 */

import { Fragment } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/investcalc/header";
import {
  ARTICLE_META,
  ARTICLE_META_NEXT,
  ArticleBody,
} from "@/components/marketing/article";
import { ActionRow, Note, PageHero, UnderTitleAnalyzeLink } from "@/components/marketing/page-parts";
import { Section } from "@/components/marketing/section";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { GuaranteeBadge } from "@/components/marketing/guarantee-badge";
import { LeadMagnetInline } from "@/components/marketing/lead-magnet-capture";
import { SeoAnalyzerCta } from "@/components/marketing/seo-analyzer-cta";
import { getMarketingOfferConfig } from "@/lib/marketing-offer-config";
import { getSiteUrl } from "@/lib/site-url";
import { JsonLd } from "@/components/seo/json-ld";
import { OPEN_GRAPH_BASE } from "@/lib/seo/open-graph-base";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "The First Offer Playbook",
  description:
    "An educational path from rental screening to a documented decision: define your Buy Box, verify assumptions, and review your Offer Ceiling with advisers.",
  alternates: { canonical: "/playbook" },
  openGraph: {
    ...OPEN_GRAPH_BASE,
    title: "The First Offer Playbook — TrueCap",
    description:
      "Define your Buy Box, source candidates, verify the analysis, review the Offer Ceiling, and make your own documented decision.",
    url: "/playbook",
    type: "article",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "The First Offer Playbook",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const STEPS = [
  {
    id: "buy-box",
    kicker: "Step 1",
    short: "Buy Box",
    title: "Define your Buy Box before you look at a single listing",
    paragraphs: [
      "Analysis paralysis is almost never a math problem — it's a criteria problem. If you don't know what a good deal means to you, every deal is a maybe, and maybes don't get offers. Your Buy Box is the fix: the small set of numbers a property must clear before it deserves another minute of your attention.",
      "Write down five numbers: the most cash you can deploy (down payment + closing + reserves), your minimum monthly cash flow after ALL expenses (including the vacancy, maintenance, and CapEx reserves most spreadsheets skip), your minimum cash-on-cash return, the property types you'll actually manage, and the markets you're hunting in. That's it. Three of them will feel arbitrary — write them down anyway; you can revise them after ten analyses, but you can't revise a blank page.",
      "In TrueCap, save these as your Buy Box (a Pro feature) and each analysis shows which of your targets the inputs meet or miss — or keep them on a sticky note and check each analysis by hand. The tool matters less than the commitment: deals are measured against your stated criteria, not against your mood.",
    ],
    action: "Write the five numbers down. Today, before the next listing.",
  },
  {
    id: "source",
    kicker: "Step 2",
    short: "Source deals",
    title: "Source candidates in volume — screening is a numbers game",
    paragraphs: [
      "A consistent screening process helps investors compare more properties against the same rules. A workable rhythm for a W-2 schedule might be fifteen minutes a day, with each new listing in your target market receiving the same first-pass screen. Most may miss one or more rules; that is useful triage, not a final investment decision.",
      "Where to source: the listing portals for what's public, an investor-friendly agent for what's coming (tell them your Buy Box numbers — a specific ask gets specific answers), and your market's property-tax and pre-foreclosure lists when you're ready to go deeper. Start with the portals; volume beats cleverness at this stage.",
      "Track everything you screen, even the fails. Ten screened deals teach you what your market actually offers at your price point — which is exactly the calibration your Buy Box needs. Repetition turns a vague preference into a usable acquisition rule.",
    ],
    action: "Screen every new listing in your market this week — aim for ten.",
  },
  {
    id: "read",
    kicker: "Step 3",
    short: "Read the analysis",
    title: "Read the analysis like an underwriter, not a fan",
    paragraphs: [
      "When a property meets the first screen, slow down and verify the assumptions before relying on the outputs. TrueCap can start rent from a labeled HUD rent benchmark and rate from a labeled FRED national series; property tax is a manual local input with a disclosed generic fallback when blank. These are editable screening starting points, not verified facts or quotes for the property.",
      "Replace four numbers with local evidence before you believe any verdict: the rent (pull 3 comparable actual rentals, not asking rents), the tax bill (the county has the real number), insurance (one phone call), and the rate (a written quote for an investor loan, which is not the owner-occupant headline rate). Everything else — vacancy, maintenance, CapEx, management — keep conservative defaults until the property tells you otherwise.",
      "Then read three outputs in order: modeled cash flow with reserves, DSCR against your Buy Box threshold, and the downside scenario. A lender may calculate DSCR differently and will apply its own eligibility, valuation, and reserve rules.",
    ],
    action:
      "For your best candidate: verify rent, tax, insurance, and rate with real evidence.",
  },
  {
    id: "offer-ceiling",
    kicker: "Step 4",
    short: "Offer Ceiling",
    title: "Review the Offer Ceiling before negotiation",
    paragraphs: [
      "The Offer Ceiling is the highest price that still meets your targets under the assumptions shown.",
      "The solver works backward from the selected cash-flow, cash-on-cash, cap-rate, DSCR, and price constraints that apply. TrueCap Pro computes this boundary on each compatible analysis and includes it in Pro reports.",
      "If the Offer Ceiling is below asking, the page reports the gap. Verify rent, property costs, condition, financing, title, and local requirements, then decide with the advisers relevant to your situation.",
    ],
    action:
      "Calculate the Offer Ceiling, record its target profile, and verify the assumptions that could move it.",
  },
  {
    id: "offer",
    kicker: "Step 5",
    short: "Record your decision",
    title: "Record your decision — review prompts included",
    paragraphs: [
      "Offer terms, contingencies, deposits, deadlines, and legal effect vary by transaction and jurisdiction. Review the actual agreement with your agent and attorney where appropriate; do not assume a contingency or cancellation right exists unless it is written and enforceable.",
      'A neutral prompt for your agent: "I have completed an initial underwrite for [address]. Please help me verify the assumptions, comparable evidence, property disclosures, and financing terms, then review the risks and appropriate contract protections with me before I decide whether and how to offer."',
      "For an off-market conversation, keep screening estimates separate from verified facts. A report can document the assumptions, your targets, gaps, and verification plan, but it does not establish property value, proof of funds, lender approval, or an appropriate offer price.",
      "Then — win or lose — go back to Step 2. The pipeline is the strategy; any single deal is just a rep.",
    ],
    action:
      "Record your own decision and rationale after the material assumptions and contract terms are reviewed.",
  },
];

export default function PlaybookPage() {
  const siteUrl = getSiteUrl();
  const playbookLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "@id": `${siteUrl}/playbook#howto`,
    name: "The First Offer Playbook",
    description:
      "An educational path from rental screening to a documented decision: Buy Box, sourcing, verification, Offer Ceiling, and adviser review.",
    step: STEPS.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.title,
      url: `${siteUrl}/playbook#${s.id}`,
    })),
    isPartOf: { "@id": `${siteUrl}/#website` },
    inLanguage: "en-US",
  };

  return (
    <>
      <Header initialUser={null} initialEntitlements={null} />
      <ScrollDepthTracker />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        {/* Nothing sits above the H1: the playbook's name (the former
            eyebrow) is the meta line under the lede, and the step links
            follow it as plain text links with 44px targets. */}
        <PageHero
          title="From screening deals to a submitted offer."
          lede="You&apos;ve analyzed twenty deals and offered on none. The math was never the blocker — the process was. Here is the whole path, written down: five steps, one action each, scripts included."
          actions={<UnderTitleAnalyzeLink />}
        >
          <p className={ARTICLE_META}>The First Offer Playbook</p>
          <nav
            aria-label="Playbook steps"
            className="mt-2 flex flex-wrap gap-x-6"
          >
            {STEPS.map((s, i) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="tc-link inline-flex min-h-11 items-center text-base"
              >
                {i + 1}. {s.short}
              </a>
            ))}
          </nav>
        </PageHero>

        {/* The hero's bottom rule is the one rule here: Section drops its own
            when it follows a PageHero. */}
        <Section>
          <article className="max-w-[68ch]">
            <ArticleBody>
              {/* Each step's H2 carries the step's anchor id (the hero links
                  and the HowTo JSON-LD point at it). "Step N" is the meta
                  line under its heading, not a kicker above it. */}
              {STEPS.map((step) => (
                <Fragment key={step.id}>
                  <h2 id={step.id}>{step.title}</h2>
                  <p className={cn("not-prose", ARTICLE_META_NEXT)}>
                    {step.kicker}
                  </p>
                  {step.paragraphs.map((p) => (
                    <p key={p.slice(0, 40)}>{p}</p>
                  ))}
                  <p>
                    <strong>Do this now: {step.action}</strong>
                  </p>
                </Fragment>
              ))}
            </ArticleBody>

            {/* The analyzer CTA and the playbook capture stay exactly as
                shipped; each opens on its own rule, so the group needs none. */}
            <div className="mt-16 space-y-10">
              <SeoAnalyzerCta
                context="your first candidate through the playbook"
                utmSource="playbook"
              />
              <LeadMagnetInline source="playbook" />
              <div>
                <Note>
                  Want the reps to be easier? Pro runs the whole playbook on every
                  address — Buy Box verdict, downside test, Offer Ceiling,
                  lender-facing report
                  {getMarketingOfferConfig().guaranteeEnabled
                    ? " — and the risk is ours, not yours."
                    : "."}
                </Note>
                <ActionRow className="mt-4">
                  <Link
                    href="/pricing#plans"
                    className={buttonVariants({ variant: "outline", size: "cta" })}
                  >
                    See Pro plans
                  </Link>
                </ActionRow>
                <GuaranteeBadge />
              </div>
            </div>
          </article>
        </Section>
      </main>
      <SiteFooter />
      <JsonLd data={playbookLd} />
    </>
  );
}
