/**
 * /vs/lodgify — competitor comparison landing page.
 *
 * Target queries: "lodgify alternative", "lodgify vs hostaway", "lodgify pricing", "lodgify review", "small str software".
 * Lodgify is short-term rental software for small operators — direct-booking website builder, channel manager, reservation system. More accessible than Hostfully / Hostaway / Guesty for 1-10 STRs.
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
import { RelatedContent } from "@/components/marketing/related-content";
import { ScrollToFormButton } from "@/components/marketing/scroll-to-form-button";
import {
  ComparisonFaq,
  type FaqItem,
} from "@/components/marketing/comparison-faq";
import { getSiteUrl } from "@/lib/site-url";
import { VsBreadcrumbSchema } from "@/components/marketing/vs-breadcrumb-schema";

export const metadata: Metadata = {
  title: "Lodgify vs TrueCap (2026): STR PM vs Deal Math",
  description:
    "Lodgify is small-operator STR software. TrueCap underwrites the STR deal before. Honest comparison plus how 1-10 unit STR investors use both.",
  keywords: [
    "lodgify alternative",
    "lodgify vs hostaway",
    "lodgify pricing",
    "lodgify review",
    "small str software",
  ],
  alternates: { canonical: "/vs/lodgify" },
  openGraph: {
    title: "Lodgify vs TrueCap (2026): STR PM vs Deal Math",
    description:
      "Lodgify is small-operator STR software. TrueCap underwrites the STR deal before. Different stages.",
    url: "/vs/lodgify",
    type: "website",
    images: [
      { url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs Lodgify" },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "lodgify" | "tie";
type Row = {
  feature: string;
  truecap: string;
  lodgify: string;
  winner: Verdict;
};

const MATRIX: Row[] = [
  {
    feature: "Lifecycle stage",
    truecap: "Pre-purchase — underwrite the STR deal",
    lodgify: "Post-purchase — host + manage STRs",
    winner: "tie",
  },
  {
    feature: "Cap rate / CoC / DSCR analysis",
    truecap: "Yes — full engine, editable rent input",
    lodgify: "Not modeled",
    winner: "truecap",
  },
  {
    feature: "10-year projection",
    truecap: "Pro — rent + expense + appreciation",
    lodgify: "Not modeled",
    winner: "truecap",
  },
  {
    feature: "Starting values (rent/rate/tax)",
    truecap:
      "Editable HUD rent and FRED rate benchmarks; manual local property tax",
    lodgify: "Not applicable",
    winner: "truecap",
  },
  {
    feature: "Direct-booking website builder",
    truecap: "No",
    lodgify: "Yes — branded site builder",
    winner: "lodgify",
  },
  {
    feature: "Channel manager (Airbnb, Vrbo, Booking)",
    truecap: "No",
    lodgify: "Yes — unified inbox + calendar",
    winner: "lodgify",
  },
  {
    feature: "Guest messaging",
    truecap: "No",
    lodgify: "Yes — automated messages",
    winner: "lodgify",
  },
  {
    feature: "Reservation system",
    truecap: "No",
    lodgify: "Yes — built-in calendar + payments",
    winner: "lodgify",
  },
  {
    feature: "Sweet spot",
    truecap: "1-30 doors, solo investor underwriting",
    lodgify: "1-10 STRs, solo operator",
    winner: "tie",
  },
  {
    feature: "Free tier",
    truecap: "Yes — core cap rate, CoC, DSCR, and cash flow",
    lodgify:
      "No permanent free tier; time-limited trial — confirm current terms",
    winner: "truecap",
  },
  {
    feature: "Pricing (entry tier)",
    truecap: "Free core; paid Pro — see live pricing",
    lodgify:
      "Paid Basic, Starter, Professional, and Ultimate plans — see live pricing",
    winner: "truecap",
  },
];

export default function VsLodgifyPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Lodgify vs TrueCap (2026): STR PM vs Deal Math",
    url: `${siteUrl}/vs/lodgify`,
    description:
      "Lodgify is small-operator STR software. TrueCap underwrites the STR deal before. Honest comparison plus how 1-10 unit STR investors use both.",
    dateModified: "2026-06-07",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <VsBreadcrumbSchema vsPath="/vs/lodgify" pageName="TrueCap vs Lodgify" />
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
            TrueCap vs Lodgify:{" "}
            <span className="text-primary">
              underwrite the STR, then run it
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Lodgify is short-term rental software for hosts and property
            managers — direct-booking website, channel manager across Airbnb /
            Vrbo / Booking, and reservation tools. TrueCap is a pre-purchase
            underwriting calculator that helps investors screen an STR
            acquisition. Different stages, potentially complementary tools.
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
            caption={<>Real output from the free sample deal. <Link href="/analyze?sample=1" prefetch={false} className="font-semibold text-primary underline underline-offset-4">Run it yourself →</Link></>}
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
                <li>You&apos;re evaluating a property as a potential STR.</li>
                <li>You want cap rate, DSCR, cash flow before buying.</li>
                <li>
                  You want to compare LTR vs STR scenarios on the same property.
                </li>
                <li>You&apos;re not yet hosting guests.</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Use Lodgify when
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You operate STRs and need a website + channel manager.</li>
                <li>You want to add a direct-booking channel.</li>
                <li>
                  You have compared its current plan, payment, and channel
                  costs.
                </li>
                <li>Its hosting workflow fits your team and listing count.</li>
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
                    Lodgify
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
                        <WinnerBadge winner={row.winner} side="lodgify" />
                        <span>{row.lodgify}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Lodgify plan and trial details can change. See{" "}
            <a
              href="https://www.lodgify.com/pricing/"
              target="_blank"
              rel="noopener"
              className="underline"
            >
              Lodgify&apos;s official pricing page
            </a>{" "}
            for current terms.
          </p>
        </section>

        {/* Complementary workflow */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--brand-green)] mb-3">
            How solo STR hosts use both
          </h2>
          <ol className="space-y-2.5 text-sm sm:text-base leading-relaxed text-foreground list-decimal pl-5">
            <li>
              <strong>Find an STR-friendly property.</strong> MLS, off-market,
              or existing STR for sale.
            </li>
            <li>
              <strong>Build an STR revenue range.</strong> Use current market
              evidence or a third-party STR data source, then verify the
              assumptions.
            </li>
            <li>
              <strong>Underwrite in TrueCap.</strong> Plug AirDNA&apos;s monthly
              revenue into the rent field. Run cap rate, DSCR, cash flow.
            </li>
            <li>
              <strong>Continue due diligence.</strong> Verify local STR rules,
              insurance, financing, taxes, expenses, and revenue evidence before
              deciding.
            </li>
            <li>
              <strong>Set up Lodgify.</strong> Build your direct-booking site,
              connect Airbnb / Vrbo / Booking, configure your calendar.
            </li>
          </ol>
          <p className="mt-4 text-sm leading-relaxed text-foreground">
            Want the underwriting half on its own? The free{" "}
            <Link
              href="/tools/vacancy-rate-calculator"
              className="font-semibold text-primary hover:underline"
            >
              vacancy rate calculator
            </Link>{" "}
            turns vacant nights and turnover cost into the occupancy haircut an
            STR pro forma actually needs, and our{" "}
            <Link
              href="/blog/short-term-rental-underwriting-playbook"
              className="font-semibold text-primary hover:underline"
            >
              short-term rental underwriting playbook
            </Link>{" "}
            walks through the rest of the assumptions. Then hand the address to
            the full{" "}
            <Link
              href="/"
              className="font-semibold text-primary hover:underline"
            >
              TrueCap analyzer
            </Link>{" "}
            for cap rate, DSCR and cash flow in one pass.
          </p>
        </section>

        <ComparisonFaq competitorName="Lodgify" items={LODGIFY_FAQ} />

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

        <RelatedContent kind="vs" slug="lodgify" className="mt-10" />

        <footer className="border-t border-border pt-6 text-sm text-muted-foreground leading-relaxed">
          Other comparisons:{" "}
          <Link
            href="/vs/hostfully"
            className="font-bold text-foreground hover:underline"
          >
            TrueCap vs Hostfully
          </Link>
          {" · "}
          <Link
            href="/vs/hostaway"
            className="font-bold text-foreground hover:underline"
          >
            TrueCap vs Hostaway
          </Link>
          {" · "}
          <Link
            href="/vs/airdna"
            className="font-bold text-foreground hover:underline"
          >
            TrueCap vs AirDNA
          </Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}

const LODGIFY_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a Lodgify alternative?",
    answer: (
      <>
        No — different stages. Lodgify manages STRs you already own. TrueCap
        underwrites whether to buy the property as an STR in the first place.
        Solo STR hosts use both.
      </>
    ),
    plainTextAnswer:
      "No — different stages. Lodgify manages STRs you own. TrueCap underwrites whether to buy. Solo STR hosts use both.",
  },
  {
    question: "Lodgify vs Hostaway — which one?",
    answer: (
      <>
        Compare each vendor&apos;s current quote, listing requirements, channel
        coverage, direct-booking tools, automation, integrations, support, and
        implementation terms. The better fit depends on the portfolio and
        workflow; neither has a universal size cutoff.
      </>
    ),
    plainTextAnswer:
      "Compare current quotes, listing requirements, channel coverage, direct-booking tools, automation, integrations, support, and implementation terms. The better fit depends on the portfolio and workflow; neither has a universal size cutoff.",
  },
  {
    question: "Does Lodgify have a free tier?",
    answer: (
      <>
        Lodgify does not currently publish a permanent free tier. It publishes a
        time-limited trial and paid Basic, Starter, Professional, and Ultimate
        plans. Check its official pricing page for the current rate, trial,
        property-count rules, and included features.
      </>
    ),
    plainTextAnswer:
      "Lodgify does not currently publish a permanent free tier. It publishes a time-limited trial and paid Basic, Starter, Professional, and Ultimate plans. Check its official pricing page for current terms.",
  },
  {
    question: "Can TrueCap model STR revenue?",
    answer: (
      <>
        Yes, indirectly — every input is editable. Plug a conservative monthly
        STR revenue (gross income ÷ 12, discounted for vacancy + cleaning +
        STR-specific operating costs) into the rent field. TrueCap doesn&apos;t
        pull AirDNA or Mashvisor data automatically — you&apos;d use those
        alongside.
      </>
    ),
    plainTextAnswer:
      "Yes — every input editable. Plug a conservative monthly STR revenue (gross ÷ 12, discounted for vacancy + cleaning + STR opex) into the rent field. Doesn&apos;t auto-pull AirDNA or Mashvisor data.",
  },
  {
    question: "Should I get a Lodgify direct-booking site?",
    answer: (
      <>
        It can be useful when you can generate direct demand and the net
        economics work for your portfolio. Compare Lodgify&apos;s current
        subscription, payment, marketing, support, and operating costs with the
        channel mix you actually use.{" "}
        <a
          href="https://www.airbnb.com/help/article/1857"
          target="_blank"
          rel="noopener"
          className="underline"
        >
          Airbnb publishes multiple service-fee structures
        </a>
        , so use your account&apos;s current terms instead of assuming one
        percentage or guaranteed payback.
      </>
    ),
    plainTextAnswer:
      "A direct-booking site can be useful when you can generate demand and its net economics work for your portfolio. Compare current subscription, payment, marketing, support, and operating costs with your actual channel terms; do not assume one fee percentage or guaranteed payback.",
  },
];

function WinnerBadge({
  winner,
  side,
}: {
  winner: Verdict;
  side: "row" | "truecap" | "lodgify";
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
