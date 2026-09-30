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
 * Shared chrome: the same Header + SiteFooter as every marketing page. The
 * pricing block mirrors /pricing (same Stripe display prices, same sign-up
 * URL as PricingPlanButtons) so no agent-facing price or trial term can
 * differ from the pricing page.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { permanentRedirect } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Calculator,
  ClipboardCheck,
  Clock,
  FileText,
  Handshake,
  Link2,
  Sparkles,
  Tags,
  Users,
} from "lucide-react";
import { Header } from "@/components/investcalc/header";
import { AgentProPageTracker } from "@/components/analytics/agent-pro-page-tracker";
import { Disclaimer } from "@/components/marketing/disclaimer";
import { FaqSection } from "@/components/marketing/landing-sections";
import { ProductShot } from "@/components/marketing/product-shot";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { AgentProofSection } from "@/components/marketing/testimonial-card";
import { TrackedMarketingLink } from "@/components/marketing/tracked-marketing-link";
import { AGENT_FAQS } from "@/lib/agent-faqs";
import { CLIENT_RECEIVES, type ClientReceivesItem } from "@/lib/client-receives";
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
// Below-the-fold cross-links prefetch on hover or keyboard focus, not on
// scroll; hero and primary CTA links keep the default (see the component).
import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";

const PAGE_TITLE = "For Real Estate Agents — Investor Deal Analysis";
const PAGE_DESCRIPTION =
  "For real estate agents: screen a listing against each investor client's Buy Box, show their Offer Ceiling, and send a co-branded decision memo in about 60 seconds.";

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
    title: `${PAGE_TITLE} | TrueCap`,
    description: PAGE_DESCRIPTION,
    url: "/for-agents",
    type: "website",
    images: [
      {
        url: "/og/for-agents",
        width: 1200,
        height: 630,
        alt: "TrueCap for real estate agents: the decision memo your investor client receives",
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

/** NAR's order of what agents buy software for: time, client experience, closings. */
const PROMISES: { icon: typeof Clock; title: string; body: string }[] = [
  {
    icon: Clock,
    title: "Save time",
    body: "First-pass numbers from the address in about 60 seconds, at the showing, on your phone. HUD rent and a FRED rate benchmark fill in as labeled starting values; you enter the property tax bill and the client's financing.",
  },
  {
    icon: Handshake,
    title: "Improve the client experience",
    body: "Send deals that already clear the client's Buy Box, with the math attached and your name on it, instead of a stack of listings. When one doesn't fit, say so with the specific criterion it missed.",
  },
  {
    icon: ClipboardCheck,
    title: "Get to the offer sooner",
    body: "A client who already knows the highest price that still meets their targets has one less reason to wait. The decision memo travels with the numbers and the reasoning together.",
  },
];

// The list itself is shared with the homepage (lib/client-receives.ts).
const CLIENT_RECEIVES_ICONS: Record<ClientReceivesItem["key"], typeof Link2> = {
  "share-link": Link2,
  memo: FileText,
  labels: Tags,
  rerun: Calculator,
};

const WORKFLOW_STEPS = [
  "Open TrueCap on your phone or laptop at the showing.",
  "Paste the listing address. HUD area rent and the FRED 30-year benchmark fill in as editable starting values; enter the local property-tax bill or a reviewed rate yourself.",
  "Switch to the client's financing: their down payment, their lender's rate, a DSCR loan if that is what they use.",
  "Assign the deal to the client. It is screened against that client's Buy Box, and the Offer Ceiling shows the highest price that still meets their targets.",
  "Send the co-branded share link or PDF. If it misses, the memo names the criterion it missed and by how much.",
] as const;

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
    <div className="min-h-screen bg-background">
      <Header initialUser={null} initialEntitlements={null} />
      <AgentProPageTracker />
      <main id="main" className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Hero: the agent's outcome in the headline, the product in the
            subhead, the free analyzer as the primary action (same button as
            every page), Agent Pro as the secondary. */}
        <section className="mb-12 sm:mb-16">
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-12">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-1 text-2xs font-semibold uppercase tracking-widest text-primary">
                <Sparkles className="size-3" />
                For real estate agents
              </div>
              <h1 className="text-balance text-3xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
                Send your investor clients deals that already pencil.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Paste the listing. In about 60 seconds, see whether it clears
                your client&apos;s Buy Box, the highest price that still does
                (the Offer Ceiling), and what could break it. Send it
                co-branded, with every assumption visible and editable.
              </p>
              <p className="mt-2 text-xs font-semibold tracking-wide text-muted-foreground">
                Cash flow · Cap rate · Cash-on-cash · DSCR · Buy Box fit · Offer Ceiling
              </p>

              <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/analyze"
                  prefetch={false}
                  className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(0,112,196,0.28)] transition-transform hover:-translate-y-0.5"
                >
                  Analyze a property free
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <TrackedMarketingLink
                  href="#pricing"
                  event="agent_pro_cta_clicked"
                  properties={{ placement: "agent_hero" }}
                  className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted"
                >
                  <Sparkles className="size-4 text-primary" />
                  See Agent Pro pricing
                </TrackedMarketingLink>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {agentProConfigured
                  ? "Screen deals free with no card. Agent Pro is a separate plan for client workflows; cancel anytime."
                  : "Screen deals free with no card. Sending a waitlist request does not start a trial or subscription."}
              </p>
              <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm sm:flex sm:flex-wrap sm:gap-x-6">
                <div>
                  <dt className="text-3xs font-bold uppercase tracking-widest text-muted-foreground">Agent Pro</dt>
                  <dd className="font-bold text-foreground">
                    {agentProConfigured ? `${annualPerMonth}/month billed annually` : "Waitlist open"}
                  </dd>
                </div>
                <div>
                  <dt className="text-3xs font-bold uppercase tracking-widest text-muted-foreground">Or month to month</dt>
                  <dd className="font-semibold text-foreground">{monthlyLabel}/month</dd>
                </div>
                <div>
                  <dt className="text-3xs font-bold uppercase tracking-widest text-muted-foreground">Roster</dt>
                  <dd className="font-semibold text-foreground">Client roster included · up to 100 clients</dd>
                </div>
              </dl>
            </div>

            {/* What the client receives — the REAL memo from the free sample
                deal, with the disclaimer the client sees beside it. */}
            <div>
              <ProductShot
                shot="memo"
                priority
                alt="TrueCap's written decision memo for the sample deal: the decision, the Offer Ceiling with its targets, the labeled assumptions, and what to verify next"
                caption={
                  <>
                    What your client receives: the decision memo, generated from the free sample deal.{" "}
                    <IntentPrefetchLink href="/sample-decision-memo" className="font-semibold text-primary underline underline-offset-4">
                      Read the full sample memo →
                    </IntentPrefetchLink>
                  </>
                }
              />
              <Disclaimer tone="card" className="mt-3" />
            </div>
          </div>
        </section>

        {/* The three things agents buy software for, in NAR's order. */}
        <section className="mb-12 sm:mb-16" aria-labelledby="agent-promises">
          <h2 id="agent-promises" className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Investors answer the agent who already did the math.
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {PROMISES.map(({ icon: Icon, title, body }) => (
              <article key={title} className="rounded-2xl border border-border bg-card p-5">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-3 text-base font-extrabold text-foreground sm:text-lg">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Verified agent proof — self-hides until records pass the
            lib/proof-records.ts gate (first consumer of VERIFIED_AGENT_PROOF). */}
        <AgentProofSection />

        {/* What your client receives */}
        <section id="what-your-client-receives" className="mb-12 scroll-mt-24 sm:mb-16" aria-labelledby="client-receives">
          <h2 id="client-receives" className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            What your client receives
          </h2>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
            No account on their side, nothing hidden on yours. Branding is set
            up once in your profile and applies to every link and report.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {CLIENT_RECEIVES.map(({ key, title, body }) => {
              const Icon = CLIENT_RECEIVES_ICONS[key];
              return (
              <article key={title} className="rounded-2xl border border-border bg-card p-5 sm:p-6">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-3 text-base font-extrabold text-foreground">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </article>
              );
            })}
          </div>
        </section>

        {/* How the client roster works */}
        <section className="mb-12 rounded-3xl border-2 border-primary/25 bg-gradient-to-br from-[var(--brand-blue-light)] via-card to-card p-6 sm:mb-16 sm:p-8" aria-labelledby="roster-heading">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-primary" aria-hidden />
            <h2 id="roster-heading" className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              How the client roster works
            </h2>
          </div>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              [
                "A Buy Box per client",
                "Add a client to your roster (up to 100 clients) and assign a Buy Box to them: their cash-flow, cash-on-cash, DSCR, cap-rate, and price targets. An account keeps up to 12 Buy Boxes in total, yours and your clients' combined.",
              ],
              [
                "Deal assignment",
                "Assign any saved deal to a client. From then on it is screened against that client's Buy Box, not yours, and its share link opens in client-report mode with the address hidden unless you include it.",
              ],
              [
                "“Doesn't fit, and here's why”",
                "A miss names the criterion: “Biggest gap — Cap rate: 5.2% vs 6.5%.” A pass shows the tightest margin. The roster card shows how many of each client's assigned deals meet their criteria.",
              ],
              [
                "One client per deal, today",
                "A deal is screened against one client's Buy Box at a time. To check the same listing for another client, reassign it or save it again. Screening one listing against the whole roster at once is not released yet.",
              ],
            ].map(([title, body]) => (
              <li key={title} className="rounded-2xl border border-border bg-card p-4">
                <p className="text-sm font-extrabold text-foreground">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* The agent workflow */}
        <section className="mb-12 sm:mb-16" aria-labelledby="workflow-heading">
          <h2 id="workflow-heading" className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            The agent workflow
          </h2>
          <ol className="mt-4 space-y-3">
            {WORKFLOW_STEPS.map((step, i) => (
              <li key={step} className="flex items-start gap-3">
                <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-extrabold tabular-nums text-primary-foreground">
                  {i + 1}
                </span>
                <span className="text-sm leading-relaxed text-foreground sm:text-base">{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            The decision memo is to an investment purchase what a CMA is to a
            listing appointment: the document that shows the client what you
            did and why. It is a screening model, not an appraisal or an
            opinion of value.
          </p>
        </section>

        {/* Proof you can check — no counts, no logos, no quotes we can't source. */}
        <section className="mb-12 rounded-2xl border border-border bg-card p-6 sm:mb-16 sm:p-8" aria-labelledby="proof-heading">
          <h2 id="proof-heading" className="text-lg font-extrabold text-foreground sm:text-xl">
            Proof you can check
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            No customer counts, no brokerage logos, no quotes we cannot source.
            What you can verify before you pay:
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              ["/sample-decision-memo", "The sample decision memo", "Generated by the same engine, labeled as not a customer result."],
              ["/methodology", "The published methodology", "Every formula, shown. What you hand a client who asks where a number came from."],
              ["/reviews", "Proof & methodology", "How quotes get published here: real account activity, consent, first name and market."],
            ].map(([href, title, body]) => (
              <li key={href}>
                <IntentPrefetchLink href={href} className="text-sm font-bold text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary">
                  {title} →
                </IntentPrefetchLink>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Objections, answered from the code — same tone as /reviews. */}
        <div className="-mx-4 sm:-mx-6">
          <FaqSection
            id="honest-answers"
            heading="The objections, answered plainly."
            intro="Every answer below describes what TrueCap does today, not a roadmap. Where a limit exists, it is stated."
            items={AGENT_FAQS}
          />
        </div>

        {/* Share-ready resources */}
        <section className="mb-12 mt-12 rounded-2xl border border-border bg-card p-6 sm:mb-16 sm:p-8">
          <h2 className="mb-3 text-lg font-extrabold text-foreground sm:text-xl">
            Share-ready resources for investor clients
          </h2>
          <p className="text-sm leading-relaxed text-foreground">
            When a client asks &ldquo;is this a good deal?&rdquo; the cleanest
            answer cites the math: send them the{" "}
            <IntentPrefetchLink
              href="/blog/how-to-underwrite-a-rental-property-in-60-seconds"
              className="font-semibold text-primary hover:underline"
            >
              60-second underwriting workflow
            </IntentPrefetchLink>
            , the explainer on{" "}
            <IntentPrefetchLink href="/blog/what-is-a-good-cap-rate" className="font-semibold text-primary hover:underline">
              what counts as a good cap rate in 2026
            </IntentPrefetchLink>
            , or the{" "}
            <Link href="/analyze" prefetch={false} className="font-semibold text-primary hover:underline">
              TrueCap analyzer
            </Link>{" "}
            for cap rate and DSCR from one address. They land on a single,
            well-cited page instead of a long email reply.
          </p>
        </section>

        {/* Embed — the EXISTING attributed embeds as a credibility piece.
            Deliberately NOT white-label: embed_whitelabel is shipped:false for
            a legal reason (Terms) and must not be marketed. */}
        <section className="mb-12 rounded-2xl border border-border bg-card p-6 sm:mb-16 sm:p-8">
          <h2 className="mb-3 text-lg font-extrabold text-foreground sm:text-xl">
            Put the calculators on your own website
          </h2>
          <p className="text-sm leading-relaxed text-foreground">
            {EMBEDDABLE_COUNT} of TrueCap&apos;s {CALCULATOR_COUNT} free
            calculators can be embedded on your site with a copy-and-paste
            snippet that carries a &ldquo;Powered by TrueCap&rdquo; credit. A
            working calculator on your agent site is a credibility piece for
            investor visitors; it collects no leads and reports nothing back.
            Copy a snippet from the{" "}
            <IntentPrefetchLink href="/embed" className="font-semibold text-primary hover:underline">
              embed page
            </IntentPrefetchLink>
            .
          </p>
        </section>

        {/* "Land the Investor Client" scripts — published in full, same
            transparency stance as /playbook. */}
        <section className="mb-12 rounded-2xl border border-border bg-card p-6 sm:mb-16 sm:p-8">
          <h2 className="mb-3 text-lg font-extrabold text-foreground sm:text-xl">
            Land the investor client: three scripts that work with an analysis
            attached
          </h2>
          <ol className="space-y-4 text-sm leading-relaxed text-foreground">
            <li>
              <strong className="text-foreground">1 · Reactivate a cold investor lead.</strong>{" "}
              &ldquo;Hi [name] — a [3-bed in Zip/area] listed this week and it
              screens better than most of what we looked at in [month].
              I&apos;ve attached my underwrite: rent benchmark, cash flow, and
              the highest price that still meets your targets. Worth 15
              minutes this week?&rdquo;
            </li>
            <li>
              <strong className="text-foreground">2 · Follow up after a showing, same day.</strong>{" "}
              &ldquo;Before you get ten opinions from the internet: here&apos;s
              the analysis for [address] — every assumption is labeled and you
              can change any of them. At asking it [meets / misses] your
              targets; the Offer Ceiling shows the highest price that still
              does. Tell me which assumption you&apos;d challenge.&rdquo;
            </li>
            <li>
              <strong className="text-foreground">3 · Introduce yourself to an investor you want.</strong>{" "}
              &ldquo;I work with rental investors in [market] and I run the
              numbers on every property before I send it — attached is a
              sample analysis so you can see exactly how I evaluate deals. If
              you tell me your buy criteria, everything I send you will already
              be screened against them.&rdquo;
            </li>
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">
            All three work because the attachment does the arguing. The analysis
            is the asset; the message is just the handshake.
          </p>
        </section>

        {/* DealCheck, plainly. Its branded PDF on every tier is a real
            advantage and is acknowledged. */}
        <section className="mb-12 rounded-2xl border border-border bg-card p-6 sm:mb-16 sm:p-8" aria-labelledby="dealcheck-heading">
          <h2 id="dealcheck-heading" className="text-lg font-extrabold text-foreground sm:text-xl">
            If you are comparing this with DealCheck
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            DealCheck gives you a branded PDF report on its plans, including
            its free tier, for a lower yearly price; if all you need is a
            branded calculator PDF, DealCheck is fine. Agent Pro is for
            screening each listing against a specific client&apos;s Buy Box,
            showing that client&apos;s Offer Ceiling, and sending a co-branded
            decision memo with the assumptions and the risks intact. Check
            DealCheck&apos;s current pricing on its own site; the{" "}
            <IntentPrefetchLink href="/vs/dealcheck" className="font-semibold text-primary underline underline-offset-4">
              full comparison
            </IntentPrefetchLink>{" "}
            is kept deliberately fair.
          </p>
        </section>

        {/* Pricing — identical to /pricing: same amounts, same sign-up URL,
            "no card" beside the CTA, and the trial described as it is. */}
        <section id="pricing" className="mb-12 scroll-mt-24 rounded-2xl bg-primary p-6 text-primary-foreground sm:mb-16 sm:p-8" aria-labelledby="agent-pricing-heading">
          <h2 id="agent-pricing-heading" className="mb-2 text-2xl font-extrabold sm:text-3xl">
            Agent Pro
          </h2>
          <p className="mb-5 max-w-2xl text-sm opacity-90 sm:text-base">
            Everything in Pro (Offer Ceiling, downside stress test, comparisons,
            10-year projection, co-branded share pages and PDFs) plus the client
            roster: per-client Buy Boxes, deal assignment, and client-report
            share links.
          </p>
          {agentProConfigured ? (
            <dl className="mb-5 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-3xs font-bold uppercase tracking-widest opacity-80">Billed annually</dt>
                <dd className="text-2xl font-extrabold tabular-nums">
                  {annualPerMonth}
                  <span className="text-sm font-semibold opacity-90">/month</span>
                </dd>
                <dd className="text-xs opacity-90">{annualLabel} charged once a year</dd>
              </div>
              <div>
                <dt className="text-3xs font-bold uppercase tracking-widest opacity-80">Month to month</dt>
                <dd className="text-2xl font-extrabold tabular-nums">
                  {monthlyLabel}
                  <span className="text-sm font-semibold opacity-90">/month</span>
                </dd>
                <dd className="text-xs opacity-90">Cancel from your profile anytime</dd>
              </div>
              <div>
                <dt className="text-3xs font-bold uppercase tracking-widest opacity-80">To start</dt>
                <dd className="text-2xl font-extrabold tabular-nums">$0</dd>
                <dd className="text-xs opacity-90">No card. Checkout shows the exact charge before you confirm.</dd>
              </div>
            </dl>
          ) : (
            <p className="mb-5 text-sm font-bold">
              Agent Pro is not accepting new subscriptions yet. Email to ask
              about availability; no checkout or trial starts today.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <TrackedMarketingLink
              href={agentPrimaryHref}
              event="agent_pro_cta_clicked"
              properties={{ placement: "agent_final" }}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary-foreground px-4 py-2.5 font-bold text-primary transition-opacity hover:opacity-90"
            >
              {agentPrimaryLabel}
              <ArrowUpRight className="size-4" />
            </TrackedMarketingLink>
            <Link
              href="/analyze"
              prefetch={false}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary-foreground/40 bg-primary-foreground/10 px-4 py-2.5 font-bold text-primary-foreground transition-colors hover:bg-primary-foreground/20"
            >
              <Calculator className="size-4" />
              Try the free analyzer
            </Link>
            <IntentPrefetchLink href="/pricing#plans" className="text-sm font-semibold underline underline-offset-4 opacity-90 hover:opacity-100">
              Compare all plans
            </IntentPrefetchLink>
          </div>
          <p className="mt-4 max-w-2xl text-xs leading-relaxed opacity-90">
            A new account gets a {PRODUCT_EVALUATION_DAYS}-day free trial with{" "}
            {PRODUCT_EVALUATION_DEAL_LIMIT} complete Pro deals and{" "}
            {PRODUCT_EVALUATION_COMPARISON_LIMIT} comparison, no card. The client
            roster and client Buy Boxes are part of the Agent Pro subscription,
            not the trial.
          </p>
        </section>

        <footer className="border-t border-border pt-6 text-sm leading-relaxed text-muted-foreground">
          Investing yourself as well? See TrueCap for{" "}
          <IntentPrefetchLink href="/for-buy-and-hold" className="font-bold text-foreground hover:underline">
            buy-and-hold
          </IntentPrefetchLink>
          ,{" "}
          <IntentPrefetchLink href="/for-house-hackers" className="font-bold text-foreground hover:underline">
            house hackers
          </IntentPrefetchLink>
          ,{" "}
          <IntentPrefetchLink href="/for-brrrr" className="font-bold text-foreground hover:underline">
            BRRRR operators
          </IntentPrefetchLink>
          , and{" "}
          <IntentPrefetchLink href="/for-flippers" className="font-bold text-foreground hover:underline">
            fix-and-flippers
          </IntentPrefetchLink>
          .
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
