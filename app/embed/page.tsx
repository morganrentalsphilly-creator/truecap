/**
 * /embed — the hub page where real estate bloggers, agents, and
 * content creators grab copy-paste code to embed TrueCap calculators
 * on their own sites.
 *
 * Each embed = a permanent backlink + brand exposure + occasional
 * conversion of their visitors into TrueCap users. Distribution is
 * passive after launch: list the page, email a few partners, then
 * the embed code spreads on its own.
 *
 * This page is on TrueCap proper (not the iframe), so it gets the
 * normal SiteFooter + nav.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Code } from "lucide-react";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { EmbedCodeBlock } from "@/components/embed/embed-code-block";
import { EMBED_LIST } from "@/lib/embed-registry";
import { EMBEDDABLE_COUNT, CALCULATOR_COUNT } from "@/lib/calculator-registry";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Embed TrueCap Calculators on Your Site (Free)",
  description: `Embed any of TrueCap's ${EMBEDDABLE_COUNT} free real estate calculators on your blog, agent website, or course platform. Copy-paste iframe code. Auto-resizing. Free to use.`,
  alternates: { canonical: "/embed" },
  openGraph: {
    title: "Embed free real estate calculators — TrueCap",
    description: `${EMBEDDABLE_COUNT} free embeddable calculators for real estate blogs, agent sites, and educational platforms.`,
    url: "/embed",
    type: "website",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap embeddable calculators",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

export default function EmbedHubPage() {
  const siteUrl = getSiteUrl();

  return (
    <div className="min-h-screen bg-background">
      <main id="main" className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="mb-10">
          <Link
            href="/"
            className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground"
          >
            ← TrueCap
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-2 leading-tight tracking-tight">
            Embed our calculators on your site
          </h1>
          <p className="text-base text-muted-foreground mt-3 leading-relaxed max-w-2xl">
            Real estate bloggers, agents, course creators, and finance writers:
            grab the iframe code below and drop any of our {EMBEDDABLE_COUNT}{" "}
            embeddable calculators on your site — {EMBEDDABLE_COUNT} of our{" "}
            {CALCULATOR_COUNT} free tools (the Rehab Cost Estimator runs on
            TrueCap only). Currently free to use. No signup and no attribution
            required beyond the small &quot;Powered by TrueCap&quot; footer
            (which links back to us — so you get a free calculator, we get a
            backlink).
          </p>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="font-bold text-foreground">
                {EMBEDDABLE_COUNT} embeddable
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Of {CALCULATOR_COUNT} TrueCap calculators
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="font-bold text-foreground">Auto-resizing</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                No nested scrollbars on your page
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="font-bold text-foreground">Mobile-friendly</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Responsive on every screen size
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="font-bold text-foreground">No account needed</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                No API key or signup for the published embeds
              </p>
            </div>
          </div>
        </header>

        {/* Quick-start instructions */}
        <section className="mb-10 rounded-2xl border border-border bg-muted/30 p-5 sm:p-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            How to embed
          </p>
          <ol className="mt-3 space-y-2 text-sm text-foreground list-decimal list-inside">
            <li>Pick the calculator below that fits your post or page.</li>
            <li>Click &quot;Copy&quot; on the embed code.</li>
            <li>
              Paste the HTML into a custom-code or embed block in a CMS that
              permits third-party iframes. Platform and security settings vary,
              so preview the published page before relying on it.
            </li>
            <li>
              Save. The calculator renders on your page with auto-sized height.
            </li>
          </ol>
          <p className="mt-3 text-xs text-muted-foreground">
            Want a calculator we don&apos;t have here?{" "}
            <Link
              href="/?utm_source=embed-hub"
              className="text-primary font-semibold hover:underline"
            >
              Send us a note
            </Link>{" "}
            — we&apos;ll consider adding it.
          </p>
        </section>

        {/* Calculator grid */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-foreground">
              Pick a calculator
            </h2>
            <p className="text-xs text-muted-foreground">
              {EMBEDDABLE_COUNT} available
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {EMBED_LIST.map((entry) => (
              <article
                key={entry.slug}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-primary" />
                    <h3 className="font-extrabold text-foreground text-base">
                      {entry.title}
                    </h3>
                  </div>
                  <Link
                    href={entry.toolUrl}
                    className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                  >
                    Preview
                    <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  {entry.description}
                </p>
                <EmbedCodeBlock
                  slug={entry.slug}
                  title={entry.title}
                  siteUrl={siteUrl}
                  defaultHeight={entry.defaultHeight}
                />
              </article>
            ))}
          </div>
        </section>

        {/* Tips / FAQ */}
        <section className="mt-12">
          <h2 className="text-xl font-extrabold text-foreground mb-4">
            Questions
          </h2>
          <div className="divide-y divide-border rounded-2xl border border-border bg-card">
            {[
              {
                q: "Can I customize the calculator's look?",
                a: "Not in v1 — the calculator inherits TrueCap's styling so it stays consistent across embeds. If there's demand for color/branding customization, we'll add it.",
              },
              {
                q: "Do I have to keep the 'Powered by TrueCap' footer?",
                a: "Yes. The footer is the only ask in exchange for free, hosted, maintained calculators. It's small, tasteful, and doesn't compete with your content.",
              },
              {
                q: "How does the embed affect page loading?",
                a: 'The iframe uses loading="lazy" and renders in its own document, which limits initial work in supporting browsers. Actual performance depends on the host page, browser, placement, and content-security settings, so measure the published page.',
              },
              {
                q: "Can I track conversions from my embed?",
                a: "The attribution link uses utm_source=embed, utm_medium=referral, and a calculator-specific utm_campaign so TrueCap can report aggregate embed traffic. It does not accept partner identity or property data.",
              },
              {
                q: "What if the calculator changes?",
                a: "The iframe loads the currently released TrueCap implementation, so reviewed updates appear without replacing the snippet. Keep the attribution intact and periodically verify the embed as part of your own site checks.",
              },
            ].map((f) => (
              <details key={f.q} className="group p-5">
                <summary className="cursor-pointer text-sm font-bold text-foreground group-open:text-primary">
                  {f.q}
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-2xl bg-primary text-primary-foreground p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold mb-2">
            Have a real estate audience?
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-4">
            Embed a calculator + write a 200-word post about it. Your readers
            get a useful tool. You get an interactive page that ranks for
            calculator queries. We get a backlink. Everyone wins.
          </p>
          <Link
            href="/?utm_source=embed-hub-cta"
            className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity"
          >
            Try the full TrueCap analyzer
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </section>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
