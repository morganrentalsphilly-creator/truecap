/**
 * /for-agents — the canonical landing page for real estate agents who work
 * with investor buyers (2026-09 agent-first marketing pass). Destination for
 * agent-targeted paid traffic; the homepage speaks to agents first but keeps
 * its investor topic, so agent keyword targeting lives HERE.
 *
 * What the page promises is bounded by what the code does — see
 * lib/agent-faqs.ts for the per-claim sources. In short: a share link needs
 * no account and is read-only; co-branding (Pro and Agent Pro) renders logo,
 * brand color, "Shared by" and a "Prepared by" block, with TrueCap's name
 * kept; the roster caps at 100 clients and an account at 12 Buy Boxes; a deal
 * is screened against ONE client's Buy Box; the no-card trial never includes
 * the roster. Nothing here implies leads, listings, or closings.
 *
 * Shared chrome: the same Header + SiteFooter as every marketing page (the
 * footer carries the page's one Disclaimer). The pricing block mirrors
 * /pricing (same Stripe display prices, same sign-up URL as
 * PricingPlanButtons) so no agent-facing price or trial term can differ from
 * the pricing page.
 *
 * Set on the design system's page parts (DESIGN.md, 2026-09 design pass): the
 * hero on PageHero with the memo as a document, lists on rules instead of
 * cards, the workflow as a StepList, the FAQ through FaqSection, and the
 * pricing as the page's close on the heavy rule.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { permanentRedirect } from "next/navigation";
import { Fragment } from "react";
import { Header } from "@/components/investcalc/header";
import { AgentProPageTracker } from "@/components/analytics/agent-pro-page-tracker";
import { LedgerFigure } from "@/components/ledger/ledger-parts";
// Links below the first screen prefetch on hover or keyboard focus, not on
// scroll. The hero's #pricing jump and the close's Agent Pro sign-up are
// plain <a> elements (TrackedMarketingLink renders a same-page fragment and
// /auth/ hrefs that way, so the jump scrolls every time it is used and Back
// from sign-up returns to the close); /analyze never prefetches.
// Guarded by lib/__tests__/intent-prefetch-landing.test.ts.
import { HeroAddressForm } from "@/components/marketing/hero-address-form";
import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";
import { FaqSection } from "@/components/marketing/landing-sections";
import {
  ActionRow,
  CloseSection,
  PageHero,
  RuledList,
  StepList,
} from "@/components/marketing/page-parts";
import { ClientPdfCover } from "@/components/marketing/client-pdf-cover";
import { MEMO_SHOT, ProductShot } from "@/components/marketing/product-shot";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { Section, SectionHeading } from "@/components/marketing/section";
import { SiteFooter } from "@/components/marketing/site-footer";
import { AgentProofSection } from "@/components/marketing/testimonial-card";
import { TrackedMarketingLink } from "@/components/marketing/tracked-marketing-link";
import { buttonVariants } from "@/components/ui/button";
import { AGENT_FAQS } from "@/lib/agent-faqs";
import { CLIENT_RECEIVES } from "@/lib/client-receives";
import { CALCULATOR_COUNT, EMBEDDABLE_COUNT } from "@/lib/calculator-registry";
import {
  PRODUCT_EVALUATION_COMPARISON_LIMIT,
  PRODUCT_EVALUATION_DAYS,
  PRODUCT_EVALUATION_DEAL_LIMIT,
} from "@/lib/product-access";
import {
  formatPublicUsd,
  PUBLIC_AGENT_PRO_ANNUAL_USD,
  PUBLIC_AGENT_PRO_MONTHLY_USD,
} from "@/lib/public-pricing";
import { loadStripeDisplayPrice } from "@/lib/stripe/display-prices";
import { isAgentProConfigured } from "@/lib/stripe/plan-prices";
import { OPEN_GRAPH_BASE } from "@/lib/seo/open-graph-base";

const PAGE_TITLE = "For Real Estate Agents — Investor Deal Analysis";
const PAGE_DESCRIPTION =
  "Screen a listing against each investor client's Buy Box, show their Offer Ceiling, and send a co-branded decision memo.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: [
    "real estate agent investment property analysis",
    "investor client tool for agents",
    "co-branded rental analysis",
    "investor-friendly agent tools",
    "real estate agent calculator",
    "rental analysis for agents",
  ],
  alternates: { canonical: "/for-agents" },
  openGraph: {
    ...OPEN_GRAPH_BASE,
    title: `${PAGE_TITLE} | TrueCap`,
    description: PAGE_DESCRIPTION,
    url: "/for-agents",
    type: "website",
    images: [
      {
        url: "/og/for-agents",
        width: 1200,
        height: 630,
        alt: "TrueCap for real estate agents: the sample decision memo page",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${PAGE_TITLE} | TrueCap`,
    description: PAGE_DESCRIPTION,
    images: ["/og/for-agents"],
  },
};

/** The same sign-up URL PricingPlanButtons uses for an anonymous Agent Pro CTA. */
const AGENT_PRO_SIGNUP_HREF = `/auth/sign-up?plan=agent-pro&billing=annual&next=${encodeURIComponent("/dashboard/new")}`;

/** The hero's capability line, one term per unbreakable run. */
const HERO_TERMS = ["Cash flow", "Cap rate", "Cash-on-cash", "DSCR", "Buy Box fit", "Offer Ceiling"] as const;

/** NAR's order of what agents buy software for: time, client experience, closings. */
const PROMISES: { title: string; body: string }[] = [
  {
    title: "Save time",
    body: "First-pass numbers from the address, the asking price and a bedroom count, at the showing, on your phone. HUD rent and a FRED rate benchmark fill in as labeled starting values; you enter the property tax bill and the client's financing.",
  },
  {
    title: "Improve the client experience",
    body: "Send deals that already clear the client's Buy Box, with the math attached and your name on it, instead of a stack of listings. When one doesn't fit, say so with the specific criterion it missed.",
  },
  {
    title: "Get to the offer sooner",
    body: "A client who already knows the highest price that still meets their targets has one less reason to wait. The decision memo travels with the numbers and the reasoning together.",
  },
];

/** How the client roster works: what Agent Pro enforces today. */
const ROSTER: [title: string, body: string][] = [
  [
    "A Buy Box per client",
    "Add a client to your roster (up to 100 clients) and assign a Buy Box to them: their cash-flow, cash-on-cash, DSCR, cap-rate, and price targets. An account keeps up to 12 Buy Boxes in total, yours and your clients' combined.",
  ],
  [
    "Deal assignment",
    "Assign any saved deal to a client. From then on it is screened against that client's Buy Box, not yours. Share it as a client report: the link hides the address unless you include it.",
  ],
  [
    "“Doesn't fit, and here's why”",
    "A miss names the criterion: “Biggest gap — Cap rate: 5.2% vs 6.5%.” A pass shows the tightest margin. The roster card shows how many of each client's assigned deals meet their criteria.",
  ],
  [
    "One client per deal, today",
    "A deal is screened against one client's Buy Box at a time. To check the same listing for another client, reassign it or save it again. Screening one listing against the whole roster at once is not offered yet.",
  ],
];

const WORKFLOW_STEPS = [
  "Open TrueCap on your phone or laptop at the showing.",
  "Paste the listing address. A HUD rent benchmark and the FRED 30-year benchmark fill in as editable starting values; enter the local property-tax bill or a reviewed rate yourself.",
  "Switch to the client's financing: their down payment, their lender's rate, a DSCR loan if that is what they use.",
  "Assign the deal to the client. It is screened against that client's Buy Box, and the Offer Ceiling shows the highest price that still meets their targets.",
  "Send the co-branded share link or PDF. If it misses, the memo names the criterion it missed and by how much.",
] as const;

/** Proof you can check — no counts, no logos, no quotes we can't source. */
const PROOF_LINKS: [href: string, title: string, body: string][] = [
  ["/sample-decision-memo", "The sample decision memo", "Generated by the same engine, labeled as not a customer result."],
  ["/methodology", "The published methodology", "The core formulas, shown. What you hand a client who asks how a number was calculated."],
  ["/reviews", "Proof & methodology", "How quotes get published here: real account activity, consent, first name and market."],
];

/** Prices are compared figures: DM Mono, tabular (the Ledger Rule). */
const CLOSE_PRICE_FIGURE = "text-section-sm font-medium tracking-[-0.02em]";

export default async function ForAgentsPage() {
  const agentProConfigured = isAgentProConfigured();
  // Agent Pro is deployment-configured: without a catalog-verified Stripe
  // Price there is nothing to sell, and the plan cards explain the tiers
  // that do exist. Keep the persona page from advertising a tier this
  // deployment cannot check out.
  if (!agentProConfigured) permanentRedirect("/pricing");

  const [agentMonthly, agentAnnual] = await Promise.all([
    loadStripeDisplayPrice("agent_pro_monthly"),
    loadStripeDisplayPrice("agent_pro_annual"),
  ]);
  // Mirror /pricing: the annual card shows the effective monthly figure with
  // the real annual charge under it. Amounts come from the Stripe display
  // price, with the public catalog as the documented fallback.
  const annualAmount =
    Number(agentAnnual?.amountLabel.replace(/[^\d.]/g, "")) || PUBLIC_AGENT_PRO_ANNUAL_USD;
  const annualPerMonth = `$${(annualAmount / 12).toFixed(2)}`;
  const annualLabel = agentAnnual?.amountLabel ?? formatPublicUsd(PUBLIC_AGENT_PRO_ANNUAL_USD);
  const monthlyLabel = agentMonthly?.amountLabel ?? formatPublicUsd(PUBLIC_AGENT_PRO_MONTHLY_USD);

  // The waitlist branch is unreachable behind the redirect above; it stays so
  // a deployment that removes the redirect can never sell an unconfigured tier.
  const agentPrimaryHref = agentProConfigured
    ? AGENT_PRO_SIGNUP_HREF
    : "mailto:hello@usetruecap.com?subject=Agent%20Pro%20waitlist";
  // Sign-up creates a free account with the no-card trial; Agent Pro itself
  // starts at checkout from the dashboard. The label says exactly that
  // (mirrors PricingPlanButtons' anonymous Agent Pro CTA).
  const agentPrimaryLabel = agentProConfigured
    ? "Create a free account — no card"
    : "Email to join Agent Pro waitlist";

  return (
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <AgentProPageTracker />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        {/* Hero: the agent's outcome in the headline, the product in the
            lede, the free analyzer's address form as the primary action,
            Agent Pro as the secondary. The aside is a capture of the /sample-decision-memo
            page (public/product/manifest.json), shown as a printed document
            and captioned as the sample page it is: it is NOT the share page
            or the PDF an agent's client receives, and the caption must not
            say so until a real co-branded capture replaces it. */}
        <PageHero
          title="Send your investor clients deals that already pencil."
          lede={
            <>
              <p>
                Paste the listing. See whether it clears your client&apos;s
                Buy Box, the highest price that still does (the Offer
                Ceiling), and what could break it. Send it co-branded with Pro
                or Agent Pro; your client can rerun it with their own numbers.
              </p>
              {/* Each term keeps its separator and never splits ("Buy Box" /
                  "fit"), so the line only breaks after a "·". */}
              <p className="mt-2 text-pretty text-sm font-medium text-muted-foreground">
                {HERO_TERMS.map((term, index) => (
                  <Fragment key={term}>
                    {index > 0 ? " " : null}
                    <span className="whitespace-nowrap">
                      {index < HERO_TERMS.length - 1 ? `${term} ·` : term}
                    </span>
                  </Fragment>
                ))}
              </p>
            </>
          }
          actions={
            <>
              {/* The page's first action is the homepage hero's own one-field
                  form (audit row P1-64): same component, same placeholder,
                  same handoff to /analyze, no other field. Its top margin is
                  the actions slot's. */}
              <HeroAddressForm className="mt-0 sm:mt-0" />
              <ActionRow className="mt-3">
                <TrackedMarketingLink
                  href="#pricing"
                  event="agent_pro_cta_clicked"
                  properties={{ placement: "agent_hero" }}
                  className={buttonVariants({ size: "cta", variant: "outline" })}
                >
                  See Agent Pro pricing
                </TrackedMarketingLink>
              </ActionRow>
            </>
          }
          note={
            agentProConfigured
              ? "Screen deals free with no card. Agent Pro is a separate plan for client workflows; cancel anytime."
              : "Screen deals free with no card. Sending a waitlist request does not start a trial or subscription."
          }
          aside={
            <ProductShot
              shot={MEMO_SHOT}
              frame="document"
              priority
              sizes="(min-width: 1280px) 660px, (min-width: 1024px) 52vw, 100vw"
              alt="TrueCap's sample decision memo page for the sample deal: the decision at asking, the Offer Ceiling with its targets, cash flow, cap rate, cash-on-cash and DSCR, what could break the decision, and what to verify next"
              caption={
                <>
                  The sample decision memo page, computed from the free sample deal. The share link and PDF your client receives are laid out differently.{" "}
                  <IntentPrefetchLink href="/sample-decision-memo" className="tc-link -my-3 inline-block py-3 font-medium">
                    Read the full sample memo
                  </IntentPrefetchLink>
                </>
              }
            />
          }
        >
          {/* The price strip on a soft rule, the homepage investor cue's
              form: labels in the text face, amounts in DM Mono. A grid at
              every width: the two prices side by side (packed left from
              640px), the roster on its own row. */}
          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-rule-soft pt-2.5 text-base sm:grid-cols-[auto_auto] sm:justify-start sm:gap-x-8">
            <div>
              <dt className="text-sm font-semibold text-muted-foreground">Agent Pro</dt>
              <dd>
                {agentProConfigured ? (
                  <>
                    <LedgerFigure className="font-medium">{annualPerMonth}</LedgerFigure>/month{" "}
                    <span className="whitespace-nowrap">billed annually</span>
                  </>
                ) : (
                  "Waitlist open"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-muted-foreground">Or month to month</dt>
              <dd>
                <LedgerFigure className="font-medium">{monthlyLabel}</LedgerFigure>/month
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-sm font-semibold text-muted-foreground">Roster</dt>
              <dd>Client roster included · up to 100 clients</dd>
            </div>
          </dl>
        </PageHero>

        {/* The three things agents buy software for, in NAR's order. The
            heading sits over its list, as the homepage stacks every section
            but the FAQ (the 5/7 split is kept for a left column with content). */}
        <Section aria-labelledby="agent-promises">
          <SectionHeading id="agent-promises">
            Investors answer the agent who already did the math.
          </SectionHeading>
          <RuledList
            className="mt-8 max-w-[68ch]"
            items={PROMISES.map(({ title, body }) => ({ key: title, term: title, detail: body }))}
          />
        </Section>

        {/* Verified agent proof — self-hides until records pass the
            lib/proof-records.ts gate (first consumer of VERIFIED_AGENT_PROOF). */}
        <AgentProofSection />

        {/* What your client receives: the list is shared with the homepage
            (lib/client-receives.ts), and so is the picture beside it, page 1
            of the real PDF report (ClientPdfCover). The hero's aside is the
            sample memo page, not the client's share page. */}
        <Section id="what-your-client-receives" aria-labelledby="client-receives">
          <div className="grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <div className="min-w-0">
              <SectionHeading id="client-receives">What your client receives</SectionHeading>
              <p className="mt-3 max-w-[60ch] text-lg leading-relaxed text-muted-foreground">
                No account on their side, nothing hidden on yours. Branding is set
                up once in Settings and applies to every link and report.
              </p>
              <RuledList
                className="mt-8"
                items={CLIENT_RECEIVES.map(({ key, title, body }) => ({ key, term: title, detail: body }))}
              />
            </div>
            <ClientPdfCover className="lg:pt-2" />
          </div>
        </Section>

        {/* How the client roster works. The roster is what Agent Pro sells,
            and the page's next action was thousands of pixels away (the
            close), so the hero's pricing jump repeats under it: one outline
            button, on intent like every link below the first screen. */}
        <Section aria-labelledby="roster-heading">
          <SectionHeading id="roster-heading">How the client roster works</SectionHeading>
          <RuledList
            className="mt-8 max-w-[68ch]"
            items={ROSTER.map(([title, body]) => ({ key: title, term: title, detail: body }))}
          />
          <ActionRow className="mt-8">
            <IntentPrefetchLink
              href="#pricing"
              className={buttonVariants({ size: "cta", variant: "outline" })}
            >
              See Agent Pro pricing
            </IntentPrefetchLink>
          </ActionRow>
        </Section>

        {/* The agent workflow: a real sequence, showing to send. */}
        <Section aria-labelledby="workflow-heading">
          <SectionHeading id="workflow-heading">The agent workflow</SectionHeading>
          <StepList className="mt-8" steps={WORKFLOW_STEPS} />
          <p className="mt-5 max-w-[68ch] text-pretty text-base leading-relaxed text-muted-foreground">
            The decision memo is to an investment purchase what a CMA is to a
            listing appointment: the document that shows the client what you
            did and why. It is a screening model, not an appraisal or an
            opinion of value.
          </p>
        </Section>

        {/* Proof you can check — no counts, no logos, no quotes we can't source. */}
        <Section aria-labelledby="proof-heading">
          <SectionHeading id="proof-heading">Proof you can check</SectionHeading>
          <p className="mt-3 max-w-[62ch] text-lg leading-relaxed text-muted-foreground">
            No customer counts, no brokerage logos, no quotes we cannot source.
            What you can verify before you pay:
          </p>
          <RuledList
            className="mt-8 max-w-[68ch]"
            items={PROOF_LINKS.map(([href, title, body]) => ({
              key: href,
              // A 44px tap target from padding the negative margin takes back
              // out of the line box, so the term keeps the list's spacing.
              term: (
                <IntentPrefetchLink href={href} className="tc-link -my-3 inline-block py-3">
                  {title}
                </IntentPrefetchLink>
              ),
              detail: body,
            }))}
          />
        </Section>

        {/* Objections, answered from the code — same tone as /reviews. This
            is the page's one FAQPage node. */}
        <FaqSection
          id="honest-answers"
          heading="The objections, answered plainly."
          intro="Every answer below describes what TrueCap does today, not a roadmap. Where a limit exists, it is stated."
          items={AGENT_FAQS}
          layout="split"
        />

        {/* Share-ready resources, then the embeds: one idea per section, each
            a heading over its paragraph in the reading column. */}
        <Section aria-labelledby="share-resources-heading">
          <SectionHeading id="share-resources-heading">
            Share-ready resources for investor clients
          </SectionHeading>
          <p className="mt-4 max-w-[68ch] text-pretty text-lg leading-relaxed">
            When a client asks &ldquo;is this a good deal?&rdquo; the cleanest
            answer cites the math: send them the{" "}
            <IntentPrefetchLink href="/blog/how-to-underwrite-a-rental-property-in-60-seconds" className="tc-link">
              60-second underwriting workflow
            </IntentPrefetchLink>
            , the explainer on{" "}
            <IntentPrefetchLink href="/blog/what-is-a-good-cap-rate" className="tc-link">
              what counts as a good cap rate in 2026
            </IntentPrefetchLink>
            , or the{" "}
            <Link href="/analyze" prefetch={false} className="tc-link">
              TrueCap analyzer
            </Link>{" "}
            for cap rate and DSCR from an address, the asking price and a
            bedroom count. They land on a single, well-cited page instead of a
            long email reply.
          </p>
        </Section>

        {/* Embed — the EXISTING attributed embeds as a credibility piece.
            Deliberately NOT white-label: embed_whitelabel is shipped:false for
            a legal reason (Terms) and must not be marketed. */}
        <Section aria-labelledby="embed-heading">
          <SectionHeading id="embed-heading">Put the calculators on your own website</SectionHeading>
          <p className="mt-4 max-w-[68ch] text-pretty text-lg leading-relaxed">
            {EMBEDDABLE_COUNT} of TrueCap&apos;s {CALCULATOR_COUNT} free
            calculators can be embedded on your site with a copy-and-paste
            snippet that carries a &ldquo;Powered by TrueCap&rdquo; credit. A
            working calculator on your agent site is a credibility piece for
            investor visitors; it collects no leads and reports nothing back.
            Copy a snippet from the{" "}
            <IntentPrefetchLink href="/embed" className="tc-link">
              embed page
            </IntentPrefetchLink>
            .
          </p>
        </Section>

        {/* "Land the Investor Client" scripts — published in full, same
            transparency stance as /playbook. */}
        <Section aria-labelledby="scripts-heading">
          {/* Heading, scripts and note share one reading column (68ch of the
              16px body face, the StepList's edge), so the H2 breaks to the
              list it heads instead of running the container. */}
          <div className="max-w-[68ch]">
            <SectionHeading id="scripts-heading">
              Land the investor client: three scripts that work with an analysis
              attached
            </SectionHeading>
            <RuledList
              className="mt-8"
              items={[
                {
                  key: "reactivate",
                  term: "1 · Reactivate a cold investor lead.",
                  detail: (
                    <>
                      &ldquo;Hi [name] — a [3-bed in Zip/area] listed this week and it
                      screens better than most of what we looked at in [month].
                      I&apos;ve attached my underwrite: rent benchmark, cash flow, and
                      the highest price that still meets your targets. Worth 15
                      minutes this week?&rdquo;
                    </>
                  ),
                },
                {
                  key: "follow-up",
                  term: "2 · Follow up after a showing, same day.",
                  detail: (
                    <>
                      &ldquo;Before you get ten opinions from the internet: here&apos;s
                      the analysis for [address]. You can rerun it with your own
                      numbers and change any assumption. At asking it [meets / misses] your
                      targets; the Offer Ceiling shows the highest price that still
                      does. Tell me which assumption you&apos;d challenge.&rdquo;
                    </>
                  ),
                },
                {
                  key: "introduce",
                  term: "3 · Introduce yourself to an investor you want.",
                  detail: (
                    <>
                      &ldquo;I work with rental investors in [market] and I run the
                      numbers on every property before I send it — attached is a
                      sample analysis so you can see exactly how I evaluate deals. If
                      you tell me your buy criteria, everything I send you will already
                      be screened against them.&rdquo;
                    </>
                  ),
                },
              ]}
            />
            <p className="mt-5 text-pretty text-base leading-relaxed text-muted-foreground">
              All three work because the attachment does the arguing. The analysis
              is the asset; the message is just the handshake.
            </p>
          </div>
        </Section>

        {/* DealCheck, plainly. Every DealCheck plan exports a PDF report;
            custom branding on it is a DealCheck Pro feature (dealcheck.io/pricing
            as rendered 2026-10-01: "Property Reports with Custom Branding" is
            marked unavailable on Starter and Plus). Re-check the vendor page
            before changing this paragraph. */}
        <Section aria-labelledby="dealcheck-heading">
          <SectionHeading id="dealcheck-heading">If you are comparing this with DealCheck</SectionHeading>
          <p className="mt-4 max-w-[68ch] text-pretty text-lg leading-relaxed text-foreground">
            Every DealCheck plan exports a PDF report; putting your own name
            and logo on it needs DealCheck Pro. If a branded calculator PDF is
            all you need, DealCheck Pro covers that. Agent Pro is for
            screening each listing against a specific client&apos;s Buy Box,
            showing that client&apos;s Offer Ceiling, and sending a co-branded
            decision memo that carries the numbers and what could break the
            deal. Check
            DealCheck&apos;s current pricing on its own site; the{" "}
            <IntentPrefetchLink href="/vs/dealcheck" className="tc-link">
              full comparison
            </IntentPrefetchLink>{" "}
            is kept deliberately fair.
          </p>
        </Section>

        {/* Pricing, the page's close — identical to /pricing: same amounts,
            same sign-up URL, "no card" beside the CTA, and the trial
            described as it is. The wrapper carries the #pricing fragment the
            hero's secondary action jumps to (CloseSection takes no id). The
            trial terms sit under the case on the left. A fragment of actions
            gives CloseSection's "split" layout: both columns hang from the
            heavy rule, so the heading is level with the price table. */}
        <div id="pricing">
          <CloseSection
            heading="Agent Pro"
            headingId="agent-pricing-heading"
            lede={
              <>
                Everything in Pro (Offer Ceiling, downside stress test, comparisons,
                10-year projection, co-branded share pages and PDFs) plus the client
                roster: per-client Buy Boxes, deal assignment, and client-report
                share links.
                <span className="mt-4 block text-pretty text-sm">
                  A new account gets a {PRODUCT_EVALUATION_DAYS}-day free trial with{" "}
                  {PRODUCT_EVALUATION_DEAL_LIMIT} Pro analyses and{" "}
                  {PRODUCT_EVALUATION_COMPARISON_LIMIT} comparison, no card. A rerun with
                  changed inputs counts as a new analysis. Co-branding,
                  the client roster and client Buy Boxes are part of the Agent Pro
                  subscription, not the trial.
                </span>
              </>
            }
            actions={
              <>
                {agentProConfigured ? (
                  <dl className="grid border-t-2 border-foreground sm:grid-cols-3 sm:gap-x-8">
                    <div className="border-b border-rule-soft py-3">
                      <dt className="text-base font-semibold">Billed annually</dt>
                      <dd className="mt-1">
                        <LedgerFigure className={CLOSE_PRICE_FIGURE}>{annualPerMonth}</LedgerFigure>
                        <span className="text-base text-muted-foreground">/month</span>
                      </dd>
                      <dd className="mt-1 text-sm text-muted-foreground">{annualLabel} charged once a year</dd>
                    </div>
                    <div className="border-b border-rule-soft py-3">
                      <dt className="text-base font-semibold">Month to month</dt>
                      <dd className="mt-1">
                        <LedgerFigure className={CLOSE_PRICE_FIGURE}>{monthlyLabel}</LedgerFigure>
                        <span className="text-base text-muted-foreground">/month</span>
                      </dd>
                      <dd className="mt-1 text-sm text-muted-foreground">Cancel from your profile anytime</dd>
                    </div>
                    {/* The $0 is the no-card trial, which never includes the
                        roster (lib/entitlements.ts): labeled as what it is,
                        not as a way to start Agent Pro. */}
                    <div className="border-b border-rule-soft py-3">
                      <dt className="text-base font-semibold">Free trial</dt>
                      <dd className="mt-1">
                        <LedgerFigure className={CLOSE_PRICE_FIGURE}>$0</LedgerFigure>
                      </dd>
                      <dd className="mt-1 text-sm text-muted-foreground">
                        {PRODUCT_EVALUATION_DAYS} days, {PRODUCT_EVALUATION_DEAL_LIMIT} Pro analyses, no
                        card. A rerun with changed inputs counts as a new one. The
                        roster starts with Agent Pro.
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-base font-semibold">
                    Agent Pro is not accepting new subscriptions yet. Email to ask
                    about availability; no checkout or trial starts today.
                  </p>
                )}
                <ActionRow className="mt-6">
                  <TrackedMarketingLink
                    href={agentPrimaryHref}
                    event="agent_pro_cta_clicked"
                    properties={{ placement: "agent_final" }}
                    className={buttonVariants({ size: "cta" })}
                  >
                    {agentPrimaryLabel}
                  </TrackedMarketingLink>
                  <Link
                    href="/analyze"
                    prefetch={false}
                    className={buttonVariants({ size: "cta", variant: "outline" })}
                  >
                    Try the free analyzer
                  </Link>
                  <IntentPrefetchLink href="/pricing#plans" className="tc-link inline-flex min-h-11 items-center text-base">
                    Compare all plans
                  </IntentPrefetchLink>
                </ActionRow>
              </>
            }
          >
            {/* The other personas, on the close's soft rule (FinalCta's
                investor cue). BRRRR and fix-and-flip go to their guides, which
                are in the sitemap: /for-brrrr and /for-flippers are noindex
                and left out of it, so a link from this indexable page would
                break the link graph. */}
            {/* Each link holds its trailing punctuation (nowrap), so a line
                never starts with a comma or a full stop. */}
            <p className="mt-6 border-t border-rule-soft pt-2.5 text-base text-muted-foreground">
              Investing yourself as well? See TrueCap for{" "}
              <IntentPrefetchLink href="/for-buy-and-hold" className="tc-link -my-3 inline-block py-3">
                buy-and-hold
              </IntentPrefetchLink>{" "}
              and{" "}
              <span className="whitespace-nowrap">
                <IntentPrefetchLink href="/for-house-hackers" className="tc-link -my-3 inline-block py-3">
                  house hackers
                </IntentPrefetchLink>
                ,
              </span>{" "}
              or read{" "}
              <IntentPrefetchLink href="/blog/brrrr-method-explained" className="tc-link -my-3 inline-block py-3">
                the BRRRR guide
              </IntentPrefetchLink>{" "}
              and{" "}
              <span className="whitespace-nowrap">
                <IntentPrefetchLink href="/blog/70-percent-rule-house-flipping" className="tc-link -my-3 inline-block py-3">
                  the 70% rule guide
                </IntentPrefetchLink>
                .
              </span>
            </p>
          </CloseSection>
        </div>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
