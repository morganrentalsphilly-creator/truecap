/**
 * /vs/privy — competitor comparison landing page.
 *
 * Target queries: "privy alternative", "privy real estate", "privy vs propstream", "privy pricing", "investor mls tool".
 * Privy is an investor-focused MLS data + property search tool — built specifically for real estate investors who want to filter MLS data with investor criteria (cash-on-cash, rehab potential, motivated seller signals). Sister product positioning to TrueCap on the sourcing side.
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Calculator,
  Check,
  Minus,
  Sparkles,
  X,
} from "lucide-react";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { ProductShot } from "@/components/marketing/product-shot";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ScrollToFormButton } from "@/components/marketing/scroll-to-form-button";
import {
  ComparisonFaq,
  type FaqItem,
} from "@/components/marketing/comparison-faq";
import { getSiteUrl } from "@/lib/site-url";
import { VsBreadcrumbSchema } from "@/components/marketing/vs-breadcrumb-schema";

export const metadata: Metadata = {
  title: "Privy vs TrueCap (2026): Find Deals vs Underwrite",
  description:
    "Privy is investor-focused MLS search. TrueCap underwrites the deals once you've found them. Honest comparison and how investors use both.",
  keywords: [
    "privy alternative",
    "privy real estate",
    "privy vs propstream",
    "privy pricing",
    "investor mls tool",
  ],
  alternates: { canonical: "/vs/privy" },
  openGraph: {
    title: "Privy vs TrueCap (2026): Find Deals vs Underwrite",
    description:
      "Privy is investor MLS search. TrueCap underwrites the deals. Different jobs in the same workflow.",
    url: "/vs/privy",
    type: "website",
    images: [
      { url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs Privy" },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "privy" | "tie";
type Row = { feature: string; truecap: string; privy: string; winner: Verdict };

const MATRIX: Row[] = [
  {
    feature: "Primary purpose",
    truecap: "Per-deal underwriting calculator",
    privy: "Investor MLS search + filtering",
    winner: "tie",
  },
  {
    feature: "Cap rate / CoC / DSCR analysis",
    truecap: "Yes — full engine, free tier",
    privy: "Listing-level cap rate estimates",
    winner: "truecap",
  },
  {
    feature: "10-year projection",
    truecap: "Pro — rent + expense + appreciation",
    privy: "Not modeled",
    winner: "truecap",
  },
  {
    feature: "Starting values (rent/rate/tax)",
    truecap: "HUD rent + FRED rate + manual local property tax",
    privy: "MLS-pulled property data",
    winner: "truecap",
  },
  {
    feature: "Investor-filtered MLS search",
    truecap: "No",
    privy: "Yes — cash flow, rehab, motivated",
    winner: "privy",
  },
  {
    feature: "Sale + rent comps",
    truecap: "One free lookup; Pro includes 50 per month; no AVM",
    privy: "Yes — MLS-derived comp set",
    winner: "privy",
  },
  {
    feature: "Motivated-seller flagging on MLS",
    truecap: "No",
    privy: "Yes — DOM + price reduction signals",
    winner: "privy",
  },
  {
    feature: "Off-market lead generation",
    truecap: "No",
    privy: "Limited (MLS-focused)",
    winner: "privy",
  },
  {
    feature: "Mortgage + financing math",
    truecap: "Yes — PITI + DSCR + amortization",
    privy: "Not included",
    winner: "truecap",
  },
  {
    feature: "Free tier",
    truecap: "Yes — core cap rate, CoC, DSCR, and cash flow",
    privy: "Trial only; paid from ~$99/mo (as of 2026)",
    winner: "truecap",
  },
  {
    feature: "Pricing (entry tier)",
    truecap: "Free core; paid Pro — see live pricing",
    privy: "~$99/mo + setup fees",
    winner: "truecap",
  },
];

export default function VsPrivyPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Privy vs TrueCap (2026): Find Deals vs Underwrite",
    url: `${siteUrl}/vs/privy`,
    description:
      "Privy is investor-focused MLS search. TrueCap underwrites the deals once you've found them. Honest comparison and how investors use both.",
    dateModified: "2026-06-07",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <VsBreadcrumbSchema vsPath="/vs/privy" pageName="TrueCap vs Privy" />
      <main id="main" className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
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
            Honest comparison
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground leading-[1.05] tracking-tight text-balance">
            TrueCap vs Privy:{" "}
            <span className="text-primary">
              filter the MLS vs underwrite the deals
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Privy is an investor-focused MLS search tool — pull on-market
            listings filtered by investor criteria like cash flow potential,
            rehab condition, days on market, and motivated-seller signals.
            TrueCap is the underwriting calculator that runs the per-deal math
            on whatever Privy surfaces. Different jobs in the same workflow.
          </p>
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <ScrollToFormButton className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(0,112,196,0.28)] transition-transform hover:-translate-y-0.5">
              <Calculator className="size-4" />
              Run a deal — 60 seconds
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </ScrollToFormButton>
            <Link
              href="/pricing"
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              See TrueCap pricing
            </Link>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Free analyzer: no card or signup
          </p>
        </section>

        {/* Real product screenshot from the free sample deal. */}
        <section className="mb-12 sm:mb-16" aria-label="What the decision looks like">
          <ProductShot
            shot="verdict"
            alt="TrueCap's decision view for the sample deal: the Offer Ceiling beside the asking price, cash flow after reserves, and DSCR"
            caption={<>Real output from the free sample deal. <Link href="/analyze?sample=1" className="font-semibold text-primary underline underline-offset-4">Run it yourself →</Link></>}
          />
        </section>

        {/* TL;DR */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-3">
            TL;DR
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-2">
                Use TrueCap when
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You have an address and want to underwrite it.</li>
                <li>You want cap rate, DSCR, cash flow, projection.</li>
                <li>
                  You source deals through agents, MLS access, or referrals (not
                  Privy).
                </li>
                <li>You want a free tier with no monthly cap.</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Use Privy when
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You actively search MLS for investor-friendly deals.</li>
                <li>
                  You want investor-specific filters (cash flow, rehab
                  condition, motivated signals).
                </li>
                <li>
                  You don&apos;t have direct MLS access through an agent
                  license.
                </li>
                <li>
                  You&apos;re doing fix-and-flip or BRRRR and need
                  rehab-condition flagging.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Matrix */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">
            Feature-by-feature
          </h2>
          <p className="text-base text-muted-foreground mb-6 leading-relaxed">
            Side-by-side on every dimension that matters for a
            comparison-shopping investor.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Feature
                  </th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-primary">
                    TrueCap
                  </th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Privy
                  </th>
                </tr>
              </thead>
              <tbody>
                {MATRIX.map((row) => (
                  <tr
                    key={row.feature}
                    className="border-t border-border align-top"
                  >
                    <td className="py-3 px-3 text-sm font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        <WinnerBadge winner={row.winner} side="row" />
                        {row.feature}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs leading-relaxed text-foreground/85">
                      <div className="flex items-start gap-2">
                        <WinnerBadge winner={row.winner} side="truecap" />
                        <span>{row.truecap}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs leading-relaxed text-foreground/85">
                      <div className="flex items-start gap-2">
                        <WinnerBadge winner={row.winner} side="privy" />
                        <span>{row.privy}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Privy details based on publicly available product info as of 2026.
            See{" "}
            <a
              href="https://www.privy.pro/"
              target="_blank"
              rel="noopener"
              className="underline"
            >
              privy.pro
            </a>{" "}
            for their current state.
          </p>
        </section>

        {/* Complementary workflow */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--brand-green)] mb-3">
            How active investors use both
          </h2>
          <ol className="space-y-2.5 text-sm sm:text-base leading-relaxed text-foreground list-decimal pl-5">
            <li>
              <strong>Search MLS in Privy with investor filters.</strong> Filter
              by cap rate threshold, rehab condition, DOM, price reductions,
              etc.
            </li>
            <li>
              <strong>Surface a property worth a closer look.</strong> Privy
              shows you a listing-level cap rate estimate based on its
              assumptions.
            </li>
            <li>
              <strong>Underwrite in TrueCap.</strong> Paste the address to start
              from editable HUD rent and FRED rate benchmarks, then enter local
              property tax manually. Replace the rent benchmark with your best
              local comp.
            </li>
            <li>
              <strong>
                Compare TrueCap&apos;s cap rate to Privy&apos;s estimate.
              </strong>{" "}
              If they diverge, dig into the assumptions — usually the difference
              is rent (Privy uses optimistic rent) or expense ratios.
            </li>
            <li>
              <strong>Review the Offer Ceiling in TrueCap Pro.</strong> It works
              backward from your selected target return; verify the material
              assumptions before recording a decision.
            </li>
          </ol>
          <p className="mt-4 text-sm leading-relaxed text-foreground">
            Curious how TrueCap lands on a different number than Privy?{" "}
            <Link
              href="/blog/how-to-calculate-cap-rate"
              className="font-semibold text-primary hover:underline"
            >
              How to calculate cap rate
            </Link>{" "}
            shows the formula line by line, and{" "}
            <Link
              href="/blog/what-is-a-good-cap-rate"
              className="font-semibold text-primary hover:underline"
            >
              what counts as a good cap rate
            </Link>{" "}
            puts the result in context for your market. Once you want that math
            run against HUD rent and a live rate, paste the address into the{" "}
            <Link
              href="/"
              className="font-semibold text-primary hover:underline"
            >
              TrueCap analyzer
            </Link>
            .
          </p>
        </section>

        <ComparisonFaq competitorName="Privy" items={PRIVY_FAQ} />

        {/* Pricing CTA */}
        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Underwrite the next deal — free.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            TrueCap free covers cap rate, CoC, DSCR, NCF, and monthly cash flow.
            Pro adds 10-year cash-flow and equity projections, sensitivity,
            Offer Ceiling, co-branded share links, and PDF reports with Pro; see
            live pricing for current terms. No card to start.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
              See Pro pricing
              <ArrowUpRight className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 border border-primary-foreground/40 bg-primary-foreground/10 text-primary-foreground px-4 py-2.5 rounded-xl font-bold hover:bg-primary-foreground/20 transition-colors"
            >
              <Calculator className="w-4 h-4" />
              Run a deal now
            </Link>
          </div>
        </section>

        <footer className="border-t border-border pt-6 text-sm text-muted-foreground leading-relaxed">
          Other comparisons:{" "}
          <Link
            href="/vs/propstream"
            className="font-bold text-foreground hover:underline"
          >
            TrueCap vs PropStream
          </Link>
          {" · "}
          <Link
            href="/vs/dealmachine"
            className="font-bold text-foreground hover:underline"
          >
            TrueCap vs DealMachine
          </Link>
          {" · "}
          <Link
            href="/vs/dealcheck"
            className="font-bold text-foreground hover:underline"
          >
            TrueCap vs DealCheck
          </Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}

const PRIVY_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a Privy alternative?",
    answer: (
      <>
        No — they solve different problems. Privy is investor-focused MLS search
        and filtering. TrueCap is per-deal underwriting once you have an
        address. Many active MLS-sourcing investors use both.
      </>
    ),
    plainTextAnswer:
      "No — different problems. Privy is investor MLS search + filtering. TrueCap is per-deal underwriting once you have an address. Active MLS investors use both.",
  },
  {
    question: "Privy vs PropStream — which one?",
    answer: (
      <>
        Different focuses. Privy is on-market MLS data with investor filters.
        PropStream is off-market lead generation (skip-tracing, motivated-seller
        lists, direct mail). If you source through the MLS, Privy. If you source
        off-market via mail / cold call, PropStream. Some investors run both.
      </>
    ),
    plainTextAnswer:
      "Different focuses. Privy: on-market MLS with investor filters. PropStream: off-market lead gen (skip-trace, motivated lists, direct mail). MLS sourcing: Privy. Off-market: PropStream. Some run both.",
  },
  {
    question: "Why use Privy if I already have MLS access through an agent?",
    answer: (
      <>
        If you already have MLS access, Privy&apos;s value is more limited — its
        strength is the investor-specific filtering on top of MLS data, not the
        MLS data itself. If you&apos;re comfortable using Realtor.com / Zillow /
        your agent&apos;s MLS portal and applying investor logic mentally, Privy
        may not add enough.
      </>
    ),
    plainTextAnswer:
      "If you already have MLS access, Privy&apos;s value is more limited — its strength is investor-specific filtering on top, not the MLS data itself. If comfortable applying investor logic to Realtor / Zillow / agent MLS, Privy may not add enough.",
  },
  {
    question: "Does Privy underwrite deals?",
    answer: (
      <>
        Sort of — it shows listing-level cap rate estimates and rehab condition
        flags, while TrueCap adds editable financing, DSCR, sensitivity, and a
        cash-flow and equity projection for a shortlisted property. TrueCap does
        not currently expose a tax-specific module.
      </>
    ),
    plainTextAnswer:
      "Privy provides listing-level cap-rate estimates and rehab flags. TrueCap adds editable financing, DSCR, sensitivity, and a cash-flow and equity projection, but does not currently expose a tax-specific module.",
  },
  {
    question: "Is Privy worth $99/month?",
    answer: (
      <>
        Depends on volume. If you&apos;re actively sourcing MLS deals across
        multiple markets and don&apos;t have agent-grade MLS access, the
        investor filters pay off in time saved. If you have a great agent and
        look at 1-3 deals a month, Privy is overkill — TrueCap&apos;s free tier
        + your agent&apos;s MLS access cover the workflow.
      </>
    ),
    plainTextAnswer:
      "Depends on volume. Active MLS sourcing across markets without agent-grade access: filters pay off. Great agent + 1-3 deals/mo: overkill — TrueCap free + agent MLS access covers it.",
  },
];

function WinnerBadge({
  winner,
  side,
}: {
  winner: Verdict;
  side: "row" | "truecap" | "privy";
}) {
  if (side === "row") return null;
  if (winner === "tie") {
    return (
      <Minus className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />
    );
  }
  if (winner === side) {
    return (
      <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--brand-green)]" />
    );
  }
  return <X className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />;
}
