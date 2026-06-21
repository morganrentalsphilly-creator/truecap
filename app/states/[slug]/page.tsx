/**
 * Dynamic state-level investing page at /states/[slug].
 *
 * Targets queries like:
 *   - "investing in [state]"
 *   - "[state] rental properties"
 *   - "best cities to invest in [state]"
 *   - "[state] landlord laws"
 *   - "[state] property tax for landlords"
 *
 * 15+ states = 15+ new ranking URLs. Each driven by lib/states.ts data.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, X } from "lucide-react";
import { Header } from "@/components/investcalc/header";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { STATES, getStateBySlug } from "@/lib/states";
import { getSiteUrl } from "@/lib/site-url";

export async function generateStaticParams() {
  return Object.values(STATES).map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const state = getStateBySlug(slug);
  if (!state) return { title: "State not found | TrueCap" };
  const title = `Investing in ${state.name} rental property in 2026 | TrueCap`;
  return {
    title,
    description: state.pitch.slice(0, 158),
    keywords: [
      `investing in ${state.name.toLowerCase()}`,
      `${state.name.toLowerCase()} rental properties`,
      `${state.name.toLowerCase()} real estate investing`,
      `best cities to invest in ${state.name.toLowerCase()}`,
      `${state.name.toLowerCase()} landlord laws`,
      `${state.name.toLowerCase()} property tax`,
      `${state.abbr.toLowerCase()} rental property`,
    ],
    alternates: { canonical: `/states/${state.slug}` },
    openGraph: {
      title,
      description: state.pitch,
      url: `/states/${state.slug}`,
      type: "article",
      images: [{ url: "/home.jpg", width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", images: ["/home.jpg"] },
  };
}

export default async function StatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const state = getStateBySlug(slug);
  if (!state) notFound();

  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/states/${state.slug}`;

  // Schema: Place + BreadcrumbList + FAQPage + WebPage (for freshness signals)
  const placeLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: `${state.name} rental property investing`,
    description: state.pitch,
    url: canonicalUrl,
    address: { "@type": "PostalAddress", addressRegion: state.abbr, addressCountry: "US" },
  };
  const webPageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonicalUrl}#page`,
    name: `Investing in ${state.name} rental property in 2026`,
    description: state.pitch,
    url: canonicalUrl,
    dateModified: "2026-06-01",
    inLanguage: "en-US",
    isPartOf: { "@id": `${siteUrl}/#website` },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "States", item: `${siteUrl}/states` },
      { "@type": "ListItem", position: 3, name: state.name, item: canonicalUrl },
    ],
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Is ${state.name} a good state for rental property investing?`,
        acceptedAnswer: { "@type": "Answer", text: state.pitch },
      },
      {
        "@type": "Question",
        name: `What's the property tax rate in ${state.name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${state.name} has an effective property tax rate of approximately ${state.propertyTaxRatePct}% on residential rental properties — verify your specific county for the exact bill.`,
        },
      },
      {
        "@type": "Question",
        name: `How landlord-friendly is ${state.name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${state.name} is rated as ${state.landlord} for landlords. Typical eviction process: ${state.evictionTimelineDays} days from filing to writ.`,
        },
      },
      {
        "@type": "Question",
        name: `What are the best cities to invest in within ${state.name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Top investing cities in ${state.name}: ${state.topCities.map((c) => c.name).join(", ")}. Each city has different cap rate, appreciation, and management dynamics.`,
        },
      },
    ],
  };

  const landlordToneClass =
    state.landlord === "Strong"
      ? "text-[color:var(--brand-green,#0f9d58)]"
      : state.landlord === "Tenant-leaning"
        ? "text-[var(--metric-negative,#dc2626)]"
        : "text-amber-600";

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(placeLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <Header />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 text-xs">
          <ol className="flex flex-wrap items-center gap-2 text-muted-foreground">
            <li><Link href="/" className="hover:text-foreground">Home</Link></li>
            <li aria-hidden="true">›</li>
            <li><Link href="/states" className="hover:text-foreground">States</Link></li>
            <li aria-hidden="true">›</li>
            <li className="font-semibold text-foreground">{state.name}</li>
          </ol>
        </nav>

        {/* Eyebrow + H1 */}
        <p className="text-[11px] uppercase tracking-widest text-primary font-bold">
          {state.tier} market · {state.abbr}
        </p>
        <h1 className="mt-2 text-3xl sm:text-5xl font-extrabold text-foreground leading-[1.05] tracking-tight">
          Investing in {state.name} rental property
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{state.pitch}</p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          For the broader landscape, see our roundup of the{" "}
          <Link href="/blog/best-states-for-rental-investors-2026" className="text-primary font-semibold hover:underline">
            best states for rental investors in 2026
          </Link>
          .
        </p>

        {/* Key metrics row */}
        <section className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Property tax", value: `${state.propertyTaxRatePct}%`, sub: "effective rate" },
            { label: "State income tax", value: state.topStateIncomeTaxPct === 0 ? "0%" : `${state.topStateIncomeTaxPct}%`, sub: state.topStateIncomeTaxPct === 0 ? "no state tax" : "top bracket" },
            { label: "Eviction timeline", value: `${state.evictionTimelineDays} days`, sub: "filing → writ" },
            { label: "Landlord friendliness", value: state.landlord, sub: "based on law" },
          ].map((m) => (
            <div key={m.label} className="rounded-xl border border-border bg-card p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{m.label}</p>
              <p className={`mt-2 text-xl font-extrabold ${m.label === "Landlord friendliness" ? landlordToneClass : "text-foreground"}`}>{m.value}</p>
              <p className="text-[11px] text-muted-foreground">{m.sub}</p>
            </div>
          ))}
        </section>

        {/* Pros + Cons */}
        <section className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-[color:var(--brand-green,#0f9d58)]/30 bg-[color:var(--brand-green-light,#dcfce7)]/40 p-6">
            <h2 className="text-xl font-extrabold text-foreground mb-3">Why investors choose {state.name}</h2>
            <ul className="space-y-2">
              {state.pros.map((p) => (
                <li key={p} className="flex items-start gap-2 text-sm leading-relaxed text-foreground">
                  <Check className="mt-0.5 size-4 shrink-0 text-[color:var(--brand-green,#0f9d58)]" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-xl font-extrabold text-foreground mb-3">The honest caveats</h2>
            <ul className="space-y-2">
              {state.cons.map((c) => (
                <li key={c} className="flex items-start gap-2 text-sm leading-relaxed text-foreground">
                  <X className="mt-0.5 size-4 shrink-0 text-muted-foreground/60" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Top cities */}
        <section className="mt-12">
          <h2 className="text-2xl font-extrabold text-foreground mb-4">Best cities for rental investing in {state.name}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {state.topCities.map((c) => (
              <article key={c.name} className="rounded-xl border border-border bg-card p-5">
                <p className="text-base font-bold text-foreground">
                  {c.slug ? (
                    <Link href={`/markets/${c.slug}`} className="hover:text-primary">{c.name} →</Link>
                  ) : (
                    c.name
                  )}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.note}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Strategy fit */}
        <section className="mt-12 rounded-2xl border border-primary/20 bg-gradient-to-br from-[var(--brand-blue-light)] via-card to-card p-6 sm:p-8">
          <h2 className="text-xl font-extrabold text-foreground mb-3">Best strategies for {state.name}</h2>
          <ul className="space-y-2">
            {state.bestStrategies.map((s) => (
              <li key={s} className="flex items-start gap-2 text-sm leading-relaxed text-foreground">
                <ArrowRight className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Insurance note */}
        <section className="mt-8 rounded-2xl border border-border bg-muted/30 p-6">
          <h2 className="text-base font-extrabold text-foreground mb-2">Insurance note for {state.name}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{state.insuranceNote}</p>
        </section>

        {/* Tool CTA */}
        <section className="mt-12 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-xl sm:text-2xl font-extrabold mb-2">Run the math on a {state.name} deal</h2>
          <p className="text-sm sm:text-base opacity-90 mb-5">
            Paste an address into TrueCap and get cap rate, cash-on-cash, DSCR, and 10-year projection in 60 seconds. State-specific property tax + insurance estimates included.
          </p>
          <Link href="/" className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity">
            Try TrueCap free <ArrowRight className="size-4" />
          </Link>
        </section>

        {/* Companion resources */}
        <section className="mt-10 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-base font-extrabold text-foreground mb-3">
            Underwrite a {state.name} deal in three steps
          </h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-foreground">
            <li>
              Screen the listing with the{" "}
              <Link href="/tools/1-percent-rule-calculator" className="text-primary font-semibold hover:underline">
                1% rule calculator
              </Link>{" "}
              — if it&apos;s in the ballpark for {state.name}, move on.
            </li>
            <li>
              Compute returns with the{" "}
              <Link href="/tools/cap-rate-calculator" className="text-primary font-semibold hover:underline">
                cap rate calculator
              </Link>{" "}
              and the{" "}
              <Link href="/tools/dscr-calculator" className="text-primary font-semibold hover:underline">
                DSCR calculator
              </Link>{" "}
              using local property tax + insurance figures.
            </li>
            <li>
              Match the deal to your strategy — see the playbooks for{" "}
              <Link href="/for-buy-and-hold" className="text-primary font-semibold hover:underline">
                buy-and-hold investors
              </Link>{" "}
              and{" "}
              <Link href="/for-brrrr" className="text-primary font-semibold hover:underline">
                BRRRR operators
              </Link>
              .
            </li>
          </ol>
        </section>

        {/* Other states */}
        <section className="mt-12 border-t border-border pt-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-3">
            Other states
          </p>
          <div className="flex flex-wrap gap-2 text-sm">
            {Object.values(STATES)
              .filter((s) => s.slug !== state.slug)
              .map((s) => (
                <Link
                  key={s.slug}
                  href={`/states/${s.slug}`}
                  className="rounded-full border border-border bg-card px-3 py-1.5 font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary"
                >
                  {s.name}
                </Link>
              ))}
          </div>
        </section>
      </main>

      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
