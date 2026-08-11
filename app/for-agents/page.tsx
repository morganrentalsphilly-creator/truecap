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

import { TRIAL_LABEL } from "@/lib/trial";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Calculator, FileDown, Share2, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ScrollToFormButton } from "@/components/marketing/scroll-to-form-button";

export const metadata: Metadata = {
  title: "For Real Estate Agents",
  description:
    "Underwrite investor-client deals in 60 seconds. Share a read-only analysis link (free); add your branding on Pro. No signup needed.",
  keywords: [
    "real estate agent calculator",
    "rental analysis for agents",
    "investor client tool",
    "real estate agent deal analyzer",
  ],
  alternates: { canonical: "/for-agents" },
  openGraph: {
    title: "For Real Estate Agents — TrueCap",
    description:
      "Underwrite investor-client deals in 60 seconds. Share a read-only analysis link (free); add your branding on Pro.",
    url: "/for-agents",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap for real estate agents" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const USE_CASES: { icon: typeof Calculator; title: string; body: string }[] = [
  {
    icon: Calculator,
    title: "Underwrite a buyer client's target in 60 seconds",
    body: "Paste the address, see cap rate, cash-on-cash, DSCR, and 10-year cash flow live. No spreadsheet. No formulas. No 'I'll get back to you.'",
  },
  {
    icon: Share2,
    title: "Share a read-only analysis link instead of a PDF email",
    body: "Every analysis gets a clean public link free — send it in a text, clients open it on their phone with no signup. Pro adds your logo, colors and lead capture to it.",
  },
  {
    icon: FileDown,
    title: "Send lender-ready PDFs in one click",
    body: "Multi-page report with verdict, projections, tax strategy, exit scenarios. Drop it into your buyer's loan officer email; the lender already knows what to do with it.",
  },
  {
    icon: ShieldCheck,
    title: "Stop being wrong about cash flow at the showing",
    body: "Auto-fill from address (HUD rent, FRED rate, state tax). When the buyer asks 'does this cash flow?' you have the right answer in 60 seconds — not 'let me run the numbers tonight'.",
  },
];

export default function ForAgentsPage() {
  return (
    <div className="min-h-screen bg-background">
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
            Underwrite your investor client&apos;s deal{" "}
            <span className="text-primary">at the showing.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            TrueCap turns the &ldquo;does this cash flow?&rdquo; question
            into a 60-second answer with a read-only analysis link (free)
            you can share before you leave the parking lot. Add your
            branding on Pro.
          </p>

          {/* CTAs */}
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <ScrollToFormButton
              targetId="use-cases"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(0,112,196,0.28)] transition-transform hover:-translate-y-0.5"
            >
              <Calculator className="size-4" />
              Run a free analysis
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </ScrollToFormButton>
            <Link
              href="/pricing"
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Start a {TRIAL_LABEL}
            </Link>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            No card · No signup needed to use the analyzer · Cancel anytime
          </p>
        </section>

        {/* Use cases */}
        <section id="use-cases" className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">
            How agents use TrueCap
          </h2>
          <p className="text-base text-muted-foreground mb-6 leading-relaxed">
            Four moments where the right answer in 60 seconds changes
            the deal.
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
              "Hit Calculate. Cap rate, cash-on-cash, DSCR, and 10-year cash flow appear in 1 second.",
              "Hit Share for a read-only link (free) — text it to your client before you leave the property. On Pro it carries your branding.",
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
            <li><strong>Speed.</strong> 60 seconds vs 1-2 hours per deal.</li>
            <li><strong>Defensibility.</strong> Auto-filled from public data sources (HUD, FRED, state assessors). When the buyer questions a number, you can point at the source.</li>
            <li><strong>Sharing.</strong> A clean read-only link is more professional than emailing a spreadsheet that someone might break.</li>
            <li><strong>Brand presence.</strong> Shared deal links carry your TrueCap-powered analysis with the property address — clients remember where they got the analysis.</li>
            <li><strong>Mobile-first.</strong> Works on the phone at the showing. Spreadsheets don&apos;t.</li>
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
            <Link href="/tools/cap-rate-calculator" className="text-primary font-semibold hover:underline">
              cap rate
            </Link>{" "}
            and{" "}
            <Link href="/tools/dscr-calculator" className="text-primary font-semibold hover:underline">
              DSCR
            </Link>{" "}
            calculators. They land on a single, well-cited page — better
            than a long email reply.
          </p>
        </section>

        {/* Pricing */}
        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Free to start. Pro pays for itself on the first deal you don&apos;t lose.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            Free covers cash-flow analysis (cap rate, CoC, DSCR, monthly cash flow) and read-only share links — enough to underwrite at the showing and send it to a client. Pro unlocks co-branded share links, PDF export, 10-year projections, tax strategy, and the strategy analyzers. Cancel anytime.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
              Start a {TRIAL_LABEL}
              <ArrowUpRight className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 border border-primary-foreground/40 bg-primary-foreground/10 text-primary-foreground px-4 py-2.5 rounded-xl font-bold hover:bg-primary-foreground/20 transition-colors"
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
