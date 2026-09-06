import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calculator, Hammer, Home, Percent } from "lucide-react";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";

export const metadata: Metadata = {
  title: "Fix-and-flip planning resources",
  description:
    "Use TrueCap's rehab, ARV, and 70% rule tools for early research. An integrated fix-and-flip profit model isn't offered right now.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/for-flippers" },
  openGraph: {
    title: "Fix-and-flip planning resources — TrueCap",
    description:
      "Rehab, ARV, and acquisition-screening tools, with a clear line around what TrueCap doesn't model.",
    url: "/for-flippers",
    type: "website",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap fix-and-flip planning resources",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const RESOURCES = [
  {
    icon: Hammer,
    title: "Estimate a rehab range",
    body: "Use an early square-footage and scope estimate, then replace it with itemized contractor bids, permits, contingencies, and a realistic schedule.",
    href: "/tools/rehab-cost-estimator",
    cta: "Open rehab estimator",
  },
  {
    icon: Home,
    title: "Organize ARV assumptions",
    body: "Use comparable sales to support an after-repair value range. Treat the result as a working range, not a sale price.",
    href: "/tools/arv-calculator",
    cta: "Open ARV calculator",
  },
  {
    icon: Percent,
    title: "Run a 70% rule screen",
    body: "Use the rule as a quick filter only. It omits deal-specific financing, carrying, selling, tax, and timing effects.",
    href: "/tools/70-percent-rule-calculator",
    cta: "Open 70% rule calculator",
  },
  {
    icon: Calculator,
    title: "Test a rental fallback",
    body: "If holding the property is a real alternative, screen the stabilized rental using reviewed rent, expense, and permanent-financing assumptions.",
    href: "/",
    cta: "Open rental analyzer",
  },
] as const;

export default function ForFlippersPage() {
  return (
    <div className="min-h-screen bg-background">
      <main id="main" className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <Link
          href="/"
          className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          ← TrueCap
        </Link>

        <section className="mb-12 mt-3 sm:mb-16">
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-primary">
            Fix-and-flip planning resources
          </p>
          <h1 className="max-w-3xl text-balance text-3xl font-extrabold leading-tight text-foreground sm:text-5xl">
            Build the inputs before you trust a project return.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            TrueCap currently offers separate rehab, ARV, and 70% rule tools.
            Its integrated fix-and-flip analysis—including a dated project ledger,
            financing draws, holding costs, sale proceeds, and profit—isn&apos;t offered
            right now.
          </p>
          <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-relaxed text-foreground">
            <strong>Steady-state rental analysis — use after renovation is complete.</strong>{" "}
            The core rental analyzer is not a flip-profit calculator. Model the full
            project timeline and every cash contribution in a dedicated project ledger.
          </div>
        </section>

        <section aria-labelledby="released-flip-resources" className="mb-12 sm:mb-16">
          <h2 id="released-flip-resources" className="text-2xl font-extrabold text-foreground sm:text-3xl">
            Resources you can use now
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {RESOURCES.map(({ icon: Icon, title, body, href, cta }) => (
              <article key={title} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <Icon className="size-5 text-primary" aria-hidden="true" />
                <h3 className="mt-3 text-lg font-extrabold text-foreground">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                <Link href={href} className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline">
                  {cta}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-xl font-extrabold text-foreground">Learn the screening math</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            The educational guide explains how the 70% rule is used and why a complete
            flip model must also account for time, financing, selling costs, and taxes.
          </p>
          <Link
            href="/blog/70-percent-rule-house-flipping"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
          >
            Read the 70% rule guide
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </section>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
