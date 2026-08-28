/**
 * /for-agents — persona-specific landing page for real estate agents.
 *
 * Useful as a paid-ad landing page: ad copy targeting agents
 * ("underwrite investor deals in 60 seconds") matches the page
 * messaging better than the generic homepage. Higher Quality Score
 * on Google Ads + higher conversion than generic-LP traffic.
 *
 * Agents are a high-LTV segment: each agent analyzes dozens of deals
 * per year for buyer clients, recommends tools to other agents, and
 * is naturally drawn to the co-branded share-link Pro feature (plain
 * read-only share links are free for everyone; branding is the Pro part).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { permanentRedirect } from "next/navigation";
import { ArrowRight, ArrowUpRight, Calculator, FileDown, Share2, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { TrackedMarketingLink } from "@/components/marketing/tracked-marketing-link";
import { loadStripeDisplayPrice } from "@/lib/stripe/display-prices";
import { isAgentProConfigured } from "@/lib/stripe/plan-prices";
import { PRODUCT_EVALUATION_DAYS } from "@/lib/product-access";
import { AgentProPageTracker } from "@/components/analytics/agent-pro-page-tracker";
import { AgentProofSection } from "@/components/marketing/testimonial-card";

export const metadata: Metadata = {
  title: "Agent Pro — Become the Agent Investors Call First",
  description:
    "Send a branded, data-sourced deal analysis before you leave the showing. Client rosters, per-client Buy Boxes, and deal assignment with TrueCap Agent Pro.",
  keywords: [
    "real estate agent calculator",
    "rental analysis for agents",
    "investor client tool",
    "real estate agent deal analyzer",
  ],
  alternates: { canonical: "/for-agents" },
  openGraph: {
    title: "TrueCap Agent Pro — Become the Agent Investors Call First",
    description:
      "Send a branded, data-sourced analysis before you leave the showing. Client rosters, per-client Buy Boxes, deal assignment.",
    url: "/for-agents",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap for real estate agents" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const USE_CASES: { icon: typeof Calculator; title: string; body: string }[] = [
  {
    icon: Calculator,
    title: "Review the investment case at the showing",
    body: "Paste the address, review the assumptions, and see selected-rule fit, cash flow, cap rate, cash-on-cash return, and DSCR while the property is still in front of you.",
  },
  {
    icon: Share2,
    title: "Keep a Buy Box for every investor client",
    body: "Maintain a client roster, attach acquisition criteria to each buyer, assign deals, and let TrueCap screen the same property against the right investor's targets.",
  },
  {
    icon: FileDown,
    title: "Send a co-branded analysis clients can review",
    body: "Share a polished PDF or co-branded deal link with the assumptions, selected-rule fit, projections, and context for that buyer.",
  },
  {
    icon: ShieldCheck,
    title: "Keep every starting assumption transparent",
    body: "Start from visible HUD rent, FRED rate, and state tax defaults, then edit the financing and operating assumptions for the client before presenting a result.",
  },
];

export default async function ForAgentsPage() {
  const agentProConfigured = isAgentProConfigured();
  if (!agentProConfigured) permanentRedirect("/pricing");
  const [agentMonthly, agentAnnual] = agentProConfigured
    ? await Promise.all([
        loadStripeDisplayPrice("agent_pro_monthly"),
        loadStripeDisplayPrice("agent_pro_annual"),
      ])
    : [null, null];
  const agentPrimaryHref = agentProConfigured
    ? "/pricing?checkout=agent_pro_monthly#plans"
    : "mailto:hello@usetruecap.com?subject=Agent%20Pro%20waitlist";
  const agentPrimaryLabel = agentProConfigured
    ? "Start Agent Pro"
    : "Email to join Agent Pro waitlist";

  return (
    <div className="min-h-screen bg-background">
      <AgentProPageTracker />
      <main id="main" className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Eyebrow + back link */}
        <div className="mb-2">
          <Link
            href="/"
            className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground"
          >
            ← TrueCap
          </Link>
        </div>

        {/* Hero */}
        <section className="mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary mb-4">
            <Sparkles className="size-3" />
            For real estate agents
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground leading-[1.05] tracking-tight text-balance">
            Become the agent{" "}
            <span className="text-primary">every investor calls first.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Send a branded, data-sourced deal analysis before you leave the
            showing — checked against that client&apos;s own Buy Box, with
            every assumption labeled.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm sm:w-fit">
            {agentProConfigured ? (
              <>
                <span className="font-bold text-foreground">
                  {agentMonthly
                    ? `${agentMonthly.amountLabel}/${agentMonthly.period}`
                    : "Live price temporarily unavailable"}
                </span>
                {agentAnnual ? (
                  <span className="text-muted-foreground">
                    {agentAnnual.amountLabel}/{agentAnnual.period}
                  </span>
                ) : null}
                <span className="text-muted-foreground">{PRODUCT_EVALUATION_DAYS}-day evaluation · no card</span>
                <span className="text-muted-foreground">Client roster included · up to 100 clients</span>
              </>
            ) : (
              <>
                <span className="font-bold text-foreground">Waitlist open</span>
                <span className="text-muted-foreground">
                  Agent Pro is not accepting new subscriptions yet.
                </span>
              </>
            )}
          </div>

          {/* CTAs */}
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <TrackedMarketingLink
              href={agentPrimaryHref}
              event="agent_pro_cta_clicked"
              properties={{ placement: "agent_hero" }}
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(0,112,196,0.28)] transition-transform hover:-translate-y-0.5"
            >
              <Sparkles className="size-4" />
              {agentPrimaryLabel}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </TrackedMarketingLink>
            <Link
              href="/#main"
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Analyze a property free
            </Link>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {agentProConfigured
              ? "Screen deals free with no card. Agent Pro is a separate plan for client workflows; cancel anytime."
              : "Screen deals free with no card. Sending a waitlist request does not start a trial or subscription."}
          </p>
          {/* Risk reversal at the hero CTA. The only refund mention used to
              sit in the pricing band far below the fold. */}
        </section>

        {/* Commission math — the buying logic stated plainly, first
            (2026-08 rollout). Price stays live-loaded; no hard-coded tier
            price while Agent Pro's Stripe config is pending. */}
        <section className="mb-12 rounded-3xl border-2 border-primary/25 bg-gradient-to-br from-[var(--brand-blue-light)] via-card to-card p-6 sm:mb-16 sm:p-8">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
            The commission math
          </p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            One closed investor deal pays for this many times over.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground sm:text-base">
            A typical buy-side commission on a $250,000 investor purchase runs
            in the thousands of dollars — and investors, unlike most buyers,
            purchase again and again. {agentMonthly
              ? `Agent Pro is ${agentMonthly.amountLabel}/${agentMonthly.period}.`
              : agentProConfigured
                ? "Agent Pro is a monthly plan."
                : "Agent Pro pricing will be shown before subscriptions open."}{" "}
            If being the agent with the underwrite in hand wins you a single
            additional investor deal a year, this is not a close call.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Commission figures depend on your market, brokerage split, and
            representation agreement — run your own numbers; that habit is
            rather the point.
          </p>
        </section>

        {/* Verified agent proof — self-hides until records pass the
            lib/proof-records.ts gate (first consumer of VERIFIED_AGENT_PROOF). */}
        <AgentProofSection />

        {/* Use cases */}
        <section id="use-cases" className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">
            How agents use TrueCap
          </h2>
          <p className="text-base text-muted-foreground mb-6 leading-relaxed">
            Four parts of a faster, more credible investor-client workflow.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {USE_CASES.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm"
              >
                <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-foreground">
                  {title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Workflow */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">
            The agent workflow
          </h2>
          <ol className="mt-4 space-y-3">
            {[
              "Open TrueCap on your phone or laptop at the showing.",
              "Paste the listing address. Rent, mortgage rate, and property tax auto-fill from HUD, FRED, and state data.",
              "Adjust the financing for your specific client (different down payment, DSCR-loan rate, etc).",
              "Run the analysis, then review selected-rule fit, the Offer Ceiling, and downside before presenting the result.",
              "Assign the opportunity to the right client, then send a co-branded link or report.",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-extrabold tabular-nums">
                  {i + 1}
                </span>
                <span className="text-sm sm:text-base leading-relaxed text-foreground">
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* Why agents specifically */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="size-5 text-[var(--brand-green)]" />
            <h2 className="text-sm font-extrabold uppercase tracking-widest text-[var(--brand-green)]">
              Why agents pick TrueCap over a spreadsheet
            </h2>
          </div>
          <ul className="space-y-2 text-sm sm:text-base text-foreground">
            <li><strong>Speed.</strong> Build the first-pass underwrite from the address while the property is still being discussed.</li>
            <li><strong>Defensibility.</strong> Show the source and assumption behind each starting number, then edit it for the client&apos;s financing.</li>
            <li><strong>Client context.</strong> Maintain per-client Buy Boxes and show the specific reason a property meets or misses selected criteria.</li>
            <li><strong>Brand presence.</strong> Put your logo, colors, and contact details on share links and reports.</li>
            <li><strong>Continuity.</strong> Assign opportunities to a client and keep the investment conversation organized.</li>
          </ul>
        </section>

        <section className="mb-12 sm:mb-16 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-lg sm:text-xl font-extrabold text-foreground mb-3">
            Share-ready resources for investor clients
          </h2>
          <p className="text-sm leading-relaxed text-foreground">
            When a client asks &ldquo;is this a good deal?&rdquo; the
            cleanest answer cites the math: send them the{" "}
            <Link href="/blog/how-to-underwrite-a-rental-property-in-60-seconds" className="text-primary font-semibold hover:underline">
              60-second underwriting workflow
            </Link>
            , the explainer on{" "}
            <Link href="/blog/what-is-a-good-cap-rate" className="text-primary font-semibold hover:underline">
              what counts as a good cap rate in 2026
            </Link>
            , or the standalone{" "}
            <Link href="/#main" className="text-primary font-semibold hover:underline">
              cap rate
            </Link>{" "}
            and{" "}
            <Link href="/#main" className="text-primary font-semibold hover:underline">
              DSCR
            </Link>{" "}
            calculators. They land on a single, well-cited page — better
            than a long email reply.
          </p>
        </section>

        {/* Embed bonus — the EXISTING attributed embeds, positioned as an
            agent lead surface. Deliberately NOT white-label: embed_whitelabel
            is shipped:false for a legal reason (Terms) and must not be
            marketed (pricing-catalog-consistency guard). */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-lg sm:text-xl font-extrabold text-foreground mb-3">
            Put the calculators on your own website
          </h2>
          <p className="text-sm leading-relaxed text-foreground">
            Every TrueCap calculator can be embedded on your site with a
            one-line snippet (with &ldquo;Powered by TrueCap&rdquo;
            attribution) — a working cap-rate or DSCR calculator on your
            agent site keeps investor visitors on YOUR page instead of
            sending them off to research alone. Grab the snippet from the
            &ldquo;Embed this calculator&rdquo; block on any{" "}
            <Link href="/tools" className="text-primary font-semibold hover:underline">
              free calculator page
            </Link>
            .
          </p>
        </section>

        {/* "Land the Investor Client" scripts — published in full, same
            transparency stance as /playbook. */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-lg sm:text-xl font-extrabold text-foreground mb-3">
            Land the investor client: three scripts that work with an analysis attached
          </h2>
          <ol className="space-y-4 text-sm leading-relaxed text-foreground">
            <li>
              <strong className="text-foreground">1 · Reactivate a cold investor lead.</strong>{" "}
              &ldquo;Hi [name] — a [3-bed in Zip/area] listed this week and it
              screens better than most of what we looked at in [month].
              I&apos;ve attached my underwrite: rent benchmark, cash flow, and
              the modeled price threshold under your selected targets. Worth
              15 minutes this week?&rdquo;
            </li>
            <li>
              <strong className="text-foreground">2 · Follow up after a showing, same day.</strong>{" "}
              &ldquo;Before you get ten opinions from the internet: here&apos;s
              the analysis for [address] — every assumption is labeled and you
              can change any of them. At asking it [meets / misses] the selected
              rules; the Offer Ceiling shows the modeled threshold for those targets. Tell me which assumption you&apos;d
              challenge.&rdquo;
            </li>
            <li>
              <strong className="text-foreground">3 · Introduce yourself to an investor you want.</strong>{" "}
              &ldquo;I work with rental investors in [market] and I underwrite
              every property before I send it — attached is a sample analysis
              so you can see exactly how I evaluate deals. If you tell me your
              buy criteria, everything I send you will already be screened
              against them.&rdquo;
            </li>
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">
            All three work because the attachment does the arguing. The
            analysis is the asset; the message is just the handshake.
          </p>
        </section>

        {/* Pricing */}
        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Turn a showing into a clear acquisition conversation.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            Free covers the first screen. Agent Pro adds client rosters,
            per-client Buy Boxes, deal assignment, co-branded analysis,
            and the full Pro decision workflow.
          </p>
          {agentProConfigured ? (
            <p className="mb-5 text-sm font-bold">
              {agentMonthly ? `${agentMonthly.amountLabel}/${agentMonthly.period}` : "See live pricing"}
              {agentAnnual ? ` · ${agentAnnual.amountLabel}/${agentAnnual.period}` : ""}
              {` · ${PRODUCT_EVALUATION_DAYS}-day no-card evaluation · client roster included`}
            </p>
          ) : (
            <p className="mb-5 text-sm font-bold">
              Agent Pro is not accepting new subscriptions yet. Email to ask about availability; no checkout or trial starts today.
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <TrackedMarketingLink
              href={agentPrimaryHref}
              event="agent_pro_cta_clicked"
              properties={{ placement: "agent_final" }}
              className="inline-flex min-h-11 items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
              {agentPrimaryLabel}
              <ArrowUpRight className="w-4 h-4" />
            </TrackedMarketingLink>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center gap-2 border border-primary-foreground/40 bg-primary-foreground/10 text-primary-foreground px-4 py-2.5 rounded-xl font-bold hover:bg-primary-foreground/20 transition-colors"
            >
              <Calculator className="w-4 h-4" />
              Try the free analyzer
            </Link>
          </div>
        </section>

        <footer className="border-t border-border pt-6 text-sm text-muted-foreground leading-relaxed">
          Different strategy? See pages for{" "}
          <Link href="/for-buy-and-hold" className="font-bold text-foreground hover:underline">
            buy-and-hold
          </Link>
          ,{" "}
          <Link href="/for-house-hackers" className="font-bold text-foreground hover:underline">
            house hackers
          </Link>
          ,{" "}
          <Link href="/for-brrrr" className="font-bold text-foreground hover:underline">
            BRRRR operators
          </Link>
          , and{" "}
          <Link href="/for-flippers" className="font-bold text-foreground hover:underline">
            fix-and-flippers
          </Link>
          .
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
