/**
 * /vs/guesty — competitor comparison landing page.
 *
 * Target queries: "guesty alternative", "guesty vs hostaway", "guesty pricing", "guesty review", "enterprise str software".
 * Guesty is short-term rental property management software with published
 * plan ranges from 1 listing through enterprise portfolios.
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
import { SiteFooter } from "@/components/marketing/site-footer";
import { ScrollToFormButton } from "@/components/marketing/scroll-to-form-button";
import { ComparisonFaq, type FaqItem } from "@/components/marketing/comparison-faq";
import { getSiteUrl } from "@/lib/site-url";
import { VsBreadcrumbSchema } from "@/components/marketing/vs-breadcrumb-schema";

export const metadata: Metadata = {
  title: "Guesty vs TrueCap (2026): STR PM vs Underwriting",
  description:
    "Guesty manages short-term rentals after purchase across Lite, Pro, and Enterprise plans. TrueCap handles pre-purchase underwriting.",
  keywords: [
    "guesty alternative",
    "guesty vs hostaway",
    "guesty pricing",
    "guesty review",
    "enterprise str software",
  ],
  alternates: { canonical: "/vs/guesty" },
  openGraph: {
    title: "Guesty vs TrueCap (2026): STR PM vs Underwriting",
    description:
      "Guesty manages short-term rentals after purchase across multiple portfolio sizes. TrueCap handles pre-purchase underwriting.",
    url: "/vs/guesty",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs Guesty" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "guesty" | "tie";
type Row = { feature: string; truecap: string; guesty: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "Primary audience", truecap: "Solo / small-portfolio STR investors (1-30 doors)", guesty: "Lite: 1-3 listings; Pro: 4-199; Enterprise: 200+", winner: "tie" },
  { feature: "Lifecycle stage", truecap: "Pre-purchase — underwrite the STR deal", guesty: "Post-purchase — operate STR listings", winner: "tie" },
  { feature: "Cap rate / CoC / DSCR analysis", truecap: "Yes — full engine, free tier", guesty: "Not modeled", winner: "truecap" },
  { feature: "10-year projection", truecap: "Pro — rent + expense + appreciation", guesty: "Not modeled", winner: "truecap" },
  { feature: "Address auto-fill (rent/rate/tax)", truecap: "Yes — HUD + FRED + state property tax", guesty: "Not applicable", winner: "truecap" },
  { feature: "Channel manager (Airbnb/Vrbo/Booking)", truecap: "No", guesty: "Yes — plan-specific capabilities", winner: "guesty" },
  { feature: "Multi-owner portal + accounting", truecap: "No", guesty: "Yes — owner statements + revenue splits", winner: "guesty" },
  { feature: "Open API for custom integrations", truecap: "No", guesty: "Yes — full REST API", winner: "guesty" },
  { feature: "AI assistant + automation", truecap: "No", guesty: "Yes — Guesty AI for guest messaging", winner: "guesty" },
  { feature: "Dynamic pricing integrations", truecap: "No", guesty: "Yes — full ecosystem", winner: "guesty" },
  { feature: "Free tier", truecap: "Yes — core cap rate, CoC, DSCR, and cash flow", guesty: "No permanent free tier; Lite trial available", winner: "truecap" },
  { feature: "Pricing (entry tier)", truecap: "Free core; paid Pro — see live pricing", guesty: "Plan and portfolio dependent — see Guesty's live pricing", winner: "tie" },
  { feature: "Built for small operators", truecap: "Yes — 1-30 doors", guesty: "Yes — Lite is published for 1-3 listings", winner: "tie" },
];

export default function VsGuestyPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Guesty vs TrueCap (2026): STR PM vs Underwriting",
    url: `${siteUrl}/vs/guesty`,
    description:
      "Guesty manages short-term rentals after purchase across Lite, Pro, and Enterprise plans. TrueCap handles pre-purchase underwriting.",
    dateModified: "2026-08-16",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <VsBreadcrumbSchema vsPath="/vs/guesty" pageName="TrueCap vs Guesty" />
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
            TrueCap vs Guesty:{" "}
            <span className="text-primary">underwrite the STR vs manage it</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Guesty is short-term rental property management software for post-purchase operations. Its published plan ranges include Lite for 1-3 listings, Pro for 4-199, and Enterprise for 200+. TrueCap is a pre-purchase underwriting calculator. The products address different stages of the lifecycle.
          </p>
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <ScrollToFormButton
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(0,112,196,0.28)] transition-transform hover:-translate-y-0.5"
            >
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
                <li>You own 1-30 STR properties and want to underwrite the next one.</li>
                <li>You want cap rate, DSCR, cash flow before buying.</li>
                <li>You want a free core underwriting tier.</li>
                <li>You&apos;re not running an STR property management business.</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Use Guesty when
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You need post-purchase STR operations for one or more listings.</li>
                <li>You manage STRs for other owners and need multi-owner accounting.</li>
                <li>You need channel management, automation, or plan-specific API access.</li>
                <li>You have a team that needs role-based access control.</li>
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
            Side-by-side on every dimension that matters for a comparison-shopping investor.
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
                    Guesty
                  </th>
                </tr>
              </thead>
              <tbody>
                {MATRIX.map((row) => (
                  <tr key={row.feature} className="border-t border-border align-top">
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
                        <WinnerBadge winner={row.winner} side="guesty" />
                        <span>{row.guesty}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Guesty details based on publicly available product info as of 2026.
            See{" "}
            <a href="https://www.guesty.com/pricing/" target="_blank" rel="noopener" className="underline">
              Guesty&apos;s official pricing page
            </a>{" "}
            for their current state.
          </p>
        </section>

        {/* Complementary workflow */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--brand-green)] mb-3">
            When STR investors graduate to Guesty
          </h2>
          <ol className="space-y-2.5 text-sm sm:text-base leading-relaxed text-foreground list-decimal pl-5">
            <li>
              <strong>Underwrite + buy 1-5 STRs with TrueCap.</strong> Solo investor workflow.
            </li>
            <li>
              <strong>Use Lodgify / Hostfully / Hostaway for ops as you scale.</strong> Mid-market tools that fit 1-50 STRs.
            </li>
            <li>
              <strong>Choose the Guesty plan that matches the portfolio.</strong> Lite, Pro, and Enterprise publish different listing ranges and capabilities.
            </li>
            <li>
              <strong>Keep TrueCap for new acquisitions.</strong> Guesty doesn&apos;t underwrite. Still need TrueCap or similar for the next property.
            </li>
          </ol>
          <p className="mt-4 text-sm leading-relaxed text-foreground">
            Want to see just the underwriting half? Try the{" "}
            <Link href="/#main" className="font-semibold text-primary hover:underline">
              cap rate calculator
            </Link>{" "}
            or the full{" "}
            <Link href="/" className="font-semibold text-primary hover:underline">
              TrueCap analyzer
            </Link>
            . Our guide on{" "}
            <Link href="/blog/how-to-underwrite-a-rental-property-in-60-seconds" className="font-semibold text-primary hover:underline">
              60-second underwriting
            </Link>{" "}
            walks through the workflow end-to-end.
          </p>
        </section>

        <ComparisonFaq competitorName="Guesty" items={GUESTY_FAQ} />

        {/* Pricing CTA */}
        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Underwrite the next deal — free.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            TrueCap free covers cap rate, CoC, DSCR, NCF, and monthly cash flow.
            Pro adds 10-year cash-flow and equity projections, sensitivity,
            Offer Ceiling, co-branded share links, and PDF reports with Pro; see live pricing for current terms.
            No card to start.
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
          <Link href="/vs/hostaway" className="font-bold text-foreground hover:underline">TrueCap vs Hostaway</Link>
          {" · "}
          <Link href="/vs/hostfully" className="font-bold text-foreground hover:underline">TrueCap vs Hostfully</Link>
          {" · "}
          <Link href="/vs/lodgify" className="font-bold text-foreground hover:underline">TrueCap vs Lodgify</Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}

const GUESTY_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a Guesty alternative?",
    answer: (
      <>
        Not directly. Guesty handles post-purchase STR operations across portfolio sizes, including a Lite plan published for 1-3 listings. TrueCap handles pre-purchase underwriting. Some operators may use both at different stages.
      </>
    ),
    plainTextAnswer:
      "Not directly. Guesty handles post-purchase STR operations across portfolio sizes, including a Lite plan for 1-3 listings. TrueCap handles pre-purchase underwriting. Some operators may use both.",
  },
  {
    question: "Is Guesty worth it for a small STR operator?",
    answer: (
      <>
        It depends on the workflow. Guesty publishes Lite for 1-3 listings and offers a Lite trial. Compare its current features, rates, and terms with other STR operations tools before choosing; TrueCap does not replace those operational features.
      </>
    ),
    plainTextAnswer:
      "It depends on the workflow. Guesty publishes Lite for 1-3 listings and offers a Lite trial. Compare its current features, rates, and terms with other STR operations tools before choosing.",
  },
  {
    question: "Guesty vs Hostaway — which one for a 50+ STR portfolio?",
    answer: (
      <>
        Compare each vendor&apos;s current quote, channel coverage, accounting, owner-management, automation, API, support, and implementation terms. Guesty publishes Pro for 4-199 listings and Enterprise for 200+; confirm Hostaway&apos;s current fit directly with that vendor.
      </>
    ),
    plainTextAnswer:
      "Compare current quotes, channel coverage, accounting, owner-management, automation, API, support, and implementation terms. Guesty publishes Pro for 4-199 listings and Enterprise for 200+.",
  },
  {
    question: "Does Guesty underwrite deals?",
    answer: (
      <>
        No — it&apos;s purely operational. You&apos;d use TrueCap or a spreadsheet for pre-purchase underwriting, then ingest the property into Guesty post-closing.
      </>
    ),
    plainTextAnswer:
      "No — purely operational. Use TrueCap or a spreadsheet for pre-purchase underwriting, then ingest into Guesty post-closing.",
  },
  {
    question: "How do Guesty's published plans scale?",
    answer: (
      <>
        Guesty currently publishes Lite for 1-3 listings, Pro for 4-199, and Enterprise for 200+. Features and commercial terms vary by plan, so use Guesty&apos;s live pricing page as the source of truth.
      </>
    ),
    plainTextAnswer:
      "Guesty currently publishes Lite for 1-3 listings, Pro for 4-199, and Enterprise for 200+. Features and terms vary by plan; check Guesty's live pricing page.",
  },
];

function WinnerBadge({
  winner,
  side,
}: {
  winner: Verdict;
  side: "row" | "truecap" | "guesty";
}) {
  if (side === "row") return null;
  if (winner === "tie") {
    return <Minus className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />;
  }
  if (winner === side) {
    return <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--brand-green)]" />;
  }
  return <X className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />;
}
