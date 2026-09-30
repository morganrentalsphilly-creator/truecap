/**
 * GET /embed/[slug] — embeddable calculator iframe page.
 *
 * What this is: a stripped-down, chrome-free version of any /tools/*
 * calculator widget designed to be embedded as an iframe on third-
 * party real estate blogs, agent websites, and BiggerPockets-style
 * forums. The footer carries a "Powered by TrueCap" brand link to the
 * calculator's public /tools page (new tab) and the UTM-tagged
 * "Underwrite a full property in TrueCap" call to action.
 *
 * Why this exists: every embed = a permanent backlink (SEO compounding)
 * + brand exposure on someone else's traffic + occasional conversion
 * of their visitors into TrueCap users.
 *
 * Design decisions:
 *   - No SiteHeader, no SiteFooter, no marketing nav — visually
 *     native to whatever blog it's embedded on.
 *   - Solid background (not transparent) so the calculator's contrast
 *     is preserved even on dark partner sites.
 *   - "noindex" robots — we don't want /embed/* pages competing with
 *     /tools/* pages in Google. Embeds are for traffic, not SEO.
 *   - Auto-resize via postMessage — partner site iframe shrinks/grows
 *     to fit content. No nested scrollbars.
 *   - UTM-tagged attribution link so we can measure embed-driven traffic.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmbedResizeReporter } from "@/components/embed/embed-resize-reporter";
import {
  EmbedAttributionLink,
  EmbedReferralTracker,
} from "@/components/embed/embed-referral-tracker";
import { EmbedPoweredByLink } from "@/components/embed/embed-powered-by-link";
import { EMBED_LIST, getEmbedEntry } from "@/lib/embed-registry";
import { getSiteUrl } from "@/lib/site-url";
import { buildEmbedAttributionHref } from "@/lib/embed-attribution";

export const dynamicParams = false;

export async function generateStaticParams() {
  return EMBED_LIST.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = getEmbedEntry(slug);
  if (!entry) return { title: "Embed not found" };
  return {
    title: `${entry.title} — Embed`,
    description: entry.description,
    alternates: { canonical: `/embed/${slug}` },
    robots: { index: false, follow: false },
  };
}

export default async function EmbedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getEmbedEntry(slug);
  if (!entry) notFound();

  const siteUrl = getSiteUrl();
  const attributionHref = buildEmbedAttributionHref({
    siteUrl,
    toolPath: entry.toolUrl,
    calculatorSlug: entry.slug,
  });

  const Widget = entry.Widget;

  return (
    <div className="min-h-screen bg-background">
      <EmbedResizeReporter slug={entry.slug} />
      <EmbedReferralTracker calculator={entry.slug} />
      <main id="main" className="mx-auto max-w-2xl px-4 py-4 sm:px-5 sm:py-5">
        {/* Compact header with title — keeps embed self-explanatory
            when there's no surrounding TrueCap chrome. The frame is at most
            640px wide (the snippet's max-width), so the title takes the
            display voice at the H4/H3 steps, never the page H1 sizes. */}
        <header className="mb-3">
          <h1 className="font-display text-balance text-xl text-foreground sm:text-2xl">
            {entry.title}
          </h1>
        </header>

        <Widget />

        {/* Attribution footer — small, tasteful, but clearly clickable.
            "Powered by TrueCap" names the source and opens the public tool
            page in a new tab; the call to action is UTM-tagged so we can
            measure embed-driven traffic. The same credit sits under the
            iframe in the snippet (lib/embed-snippet.ts), where it is the
            crawlable link: this page is noindex, nofollow. Both are plain
            Signal Blue links on the paper, 14px, no pill and no icon. */}
        <footer className="mt-4 flex flex-wrap items-center justify-between gap-x-3 border-t border-border pt-3 text-sm text-muted-foreground">
          <EmbedPoweredByLink slug={entry.slug} />
          <EmbedAttributionLink
            href={attributionHref}
            calculator={entry.slug}
          />
        </footer>
      </main>
    </div>
  );
}
