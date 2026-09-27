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
import {
  CALCULATOR_COUNT,
  CALCULATOR_REGISTRY,
  EMBEDDABLE_COUNT,
} from "@/lib/calculator-registry";
import { CANONICAL_HOST, CANONICAL_SITE_URL, getSiteUrl } from "@/lib/site-url";
import { Header } from "@/components/investcalc/header";

export const metadata: Metadata = {
  title: "Embed TrueCap Calculators on Your Site (Free)",
  description: `Embed ${EMBEDDABLE_COUNT} of TrueCap's free real estate calculators on your blog, agent website, or course platform. Copy-paste iframe code. Auto-resizing. Free to use.`,
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

/** Released calculators with no iframe widget, named from the registry so the
 *  hub never claims a different split than the one it renders. */
const PAGE_ONLY_CALCULATORS = CALCULATOR_REGISTRY.filter((c) => !c.embeddable);

function joinTitles(titles: string[]): string {
  if (titles.length <= 2) return titles.join(" and ");
  return `${titles.slice(0, -1).join(", ")}, and ${titles[titles.length - 1]}`;
}

export default function EmbedHubPage() {
  const siteUrl = getSiteUrl();
  // A partner pastes a snippet once and never updates it, so the hub must
  // never hand out an iframe src on a non-canonical origin (a stale-env build
  // once emitted truecap-pink.vercel.app here). Same rule as ToolEmbedInvite:
  // the exact canonical host or no snippet at all.
  let snippetHost: string | null = null;
  try {
    snippetHost = new URL(siteUrl).host.toLowerCase();
  } catch {
    snippetHost = null;
  }
  const snippetsAvailable = snippetHost === CANONICAL_HOST;

  return (
    <div className="min-h-screen bg-background">
      <Header initialUser={null} initialEntitlements={null} />
      <main id="main" className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-2 leading-tight tracking-tight">
            Embed our calculators on your site
          </h1>
          <p className="text-base text-muted-foreground mt-3 leading-relaxed max-w-2xl">
            Real estate bloggers, agents, course creators, and finance writers:
            grab the iframe code below and put any of our {EMBEDDABLE_COUNT}{" "}
            embeddable calculators on your site
            {PAGE_ONLY_CALCULATORS.length > 0 ? (
              <>
                {" "}— {EMBEDDABLE_COUNT} of our {CALCULATOR_COUNT} free
                calculators (the{" "}
                {joinTitles(PAGE_ONLY_CALCULATORS.map((c) => c.title))}{" "}
                {PAGE_ONLY_CALCULATORS.length === 1 ? "runs" : "run"} on
                TrueCap only)
              </>
            ) : null}
            . Free to use, no signup. Each one shows a small &ldquo;Powered by
            TrueCap&rdquo; credit that links to that calculator&apos;s page on
            TrueCap, so you get a free calculator and we get a link back.
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
                Fills your content column, up to 640px wide
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
          <p className="text-2xs font-bold uppercase tracking-widest text-muted-foreground">
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
            <a
              href="mailto:hello@usetruecap.com?subject=Embed%20request"
              className="text-primary font-semibold hover:underline"
            >
              Send us a note
            </a>{" "}
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
                {snippetsAvailable ? (
                  <EmbedCodeBlock
                    slug={entry.slug}
                    title={entry.title}
                    siteUrl={siteUrl}
                    defaultHeight={entry.defaultHeight}
                  />
                ) : (
                  <p className="rounded-xl border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                    Embed code is issued from{" "}
                    <a
                      href={`${CANONICAL_SITE_URL}/embed`}
                      className="font-semibold text-foreground underline underline-offset-4"
                    >
                      {CANONICAL_HOST}/embed
                    </a>{" "}
                    so partner snippets always point at the live site.
                  </p>
                )}
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
                a: "No. Inside the frame the calculator uses TrueCap's own styling, and the embed has no color, font, or branding settings. On your page, the snippet's inline styles only lay out the frame (full width up to 640px, a starting height that then adjusts to the calculator, no border, on its own line) and set the small gray text of the credit line under it.",
              },
              {
                q: "Do I have to keep the 'Powered by TrueCap' credit?",
                a: "The credit inside the calculator's footer is part of the embedded page, so it always shows. The snippet also puts a one-line 'Powered by TrueCap' credit under the frame, linking to that calculator's page on TrueCap. Keeping that line is the one thing we ask in return for a free, hosted calculator.",
              },
              {
                q: "How does the embed affect page loading?",
                a: 'The iframe uses loading="lazy" and renders in its own document, which limits initial work in supporting browsers. Actual performance depends on the host page, browser, placement, and content-security settings, so measure the published page.',
              },
              {
                q: "Can I track conversions from my embed?",
                a: "Not through TrueCap: there are no per-site reports. Snippets copied from this page load the frame with no referrer, so loading the calculator does not tell TrueCap which page it sits on. The 'Underwrite a full property in TrueCap' link inside the calculator carries utm_source=embed, utm_medium=referral, and a calculator-specific utm_campaign, so TrueCap can count embed traffic in aggregate. No link carries your site's identity or anything a visitor enters.",
              },
              {
                q: "What if the calculator changes?",
                a: "The iframe loads the currently released TrueCap implementation, so reviewed updates appear without replacing the snippet. Snippets for the calculators listed on this page keep working. If we withdraw a calculator, a frame that still points at it shows TrueCap's 'page not found' page instead. Keep the credit line intact and check the embed as part of your own site checks.",
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
            Embed a calculator and write a short post around it. Your readers
            get a working tool without leaving your page, and we get a credit
            link back.
          </p>
          <Link
            href="/analyze?utm_source=embed-hub-cta"
            prefetch={false}
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
