import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calculator, Hammer, Home, Landmark } from "lucide-react";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";

export const metadata: Metadata = {
  title: "BRRRR planning resources",
  description:
    "Research a BRRRR deal stage by stage in the TrueCap analyzer — rehab budget, ARV, DSCR, and stabilized rental returns. An integrated BRRRR lifecycle model isn't offered right now.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/for-brrrr" },
  openGraph: {
    title: "BRRRR planning resources — TrueCap",
    description:
      "Work through rehab, ARV, DSCR, and stabilized rental returns in the analyzer, with a clear line around what it doesn't model.",
    url: "/for-brrrr",
    type: "website",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap BRRRR planning resources",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const RESOURCES = [
  {
    icon: Hammer,
    title: "Build a rehab range",
    body: "Use the standalone estimator as an early budget anchor, then replace its assumptions with contractor bids and a contingency appropriate to the project.",
    href: "/tools/rehab-cost-estimator",
    cta: "Open rehab estimator",
  },
  {
    icon: Home,
    title: "Research the after-repair value",
    body: "Use the ARV worksheet to organize comparable-sale assumptions. An appraisal or qualified local valuation should support a refinance decision.",
    href: "/tools/arv-calculator",
    cta: "Open ARV calculator",
  },
  {
    icon: Landmark,
    title: "Check refinance debt coverage",
    body: "Test a lender-specific loan amount, rate, term, and qualifying NOI. Refinance proceeds and requirements vary by lender and borrower.",
    href: "/#main",
    cta: "Check refinance DSCR",
  },
  {
    icon: Calculator,
    title: "Screen the stabilized rental",
    body: "Run the core analyzer only with the expected post-renovation rent, expenses, value, and permanent financing assumptions clearly reviewed.",
    href: "/",
    cta: "Open rental analyzer",
  },
] as const;

export default function ForBrrrrPage() {
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
            BRRRR planning resources
          </p>
          <h1 className="max-w-3xl text-balance text-3xl font-extrabold leading-tight text-foreground sm:text-5xl">
            Research each stage without pretending it is one finished model.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            TrueCap&apos;s analyzer covers rehab budget, ARV, DSCR, and stabilized
            rental returns as separate steps. Its integrated BRRRR lifecycle analysis—including acquisition
            financing, refinance proceeds, capital recovery, and post-refinance
            returns—isn&apos;t offered right now.
          </p>
          <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-relaxed text-foreground">
            <strong>Steady-state rental analysis — use after renovation is complete.</strong>{" "}
            The core analyzer does not join a construction-period cash-flow ledger to
            a later cash-out refinance. Track every capital contribution and lender fee
            separately before making an investment decision.
          </div>
        </section>

        <section aria-labelledby="released-resources" className="mb-12 sm:mb-16">
          <h2 id="released-resources" className="text-2xl font-extrabold text-foreground sm:text-3xl">
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
          <h2 className="text-xl font-extrabold text-foreground">Learn the BRRRR workflow</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            The educational guide explains the sequence, key inputs, and failure modes.
            It is not a substitute for a lender quote, appraisal, scope of work, or
            project-level cash-flow model.
          </p>
          <Link
            href="/blog/brrrr-method-explained"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
          >
            Read the BRRRR guide
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </section>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
