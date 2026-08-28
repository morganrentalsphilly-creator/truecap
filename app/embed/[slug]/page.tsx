/**
 * GET /embed/[slug] — embeddable calculator iframe page.
 *
 * What this is: a stripped-down, chrome-free version of any /tools/*
 * calculator widget designed to be embedded as an iframe on third-
 * party real estate blogs, agent websites, and BiggerPockets-style
 * forums. The footer reads "Powered by TrueCap →" with a UTM-tagged
 * link back to the full /tools page.
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
import { EmbedAttributionLink, EmbedReferralTracker } from "@/components/embed/embed-referral-tracker";
import { EMBED_LIST, getEmbedEntry } from "@/lib/embed-registry";
import { getSiteUrl } from "@/lib/site-url";

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
  const attributionHref = `${siteUrl}${entry.toolUrl}?utm_source=embed&utm_medium=iframe&utm_campaign=${encodeURIComponent(entry.slug)}`;

  const Widget = entry.Widget;

  return (
    <div className="min-h-screen bg-background">
      <EmbedResizeReporter slug={entry.slug} />
      <EmbedReferralTracker calculator={entry.slug} />
      <main
        id="main"
        className="mx-auto max-w-2xl px-4 py-4 sm:px-5 sm:py-5"
      >
        {/* Compact header with title — keeps embed self-explanatory
            when there's no surrounding TrueCap chrome. */}
        <header className="mb-3">
          <h1 className="text-lg font-extrabold tracking-tight text-foreground sm:text-xl">
            {entry.title}
          </h1>
        </header>

        <Widget />

        {/* Attribution footer — small, tasteful, but clearly clickable.
            Tracks via UTM so we can measure embed-driven traffic in
            Vercel Analytics + GA. */}
        <footer className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
          <span>Free calculator</span>
          <EmbedAttributionLink href={attributionHref} calculator={entry.slug} />
        </footer>
      </main>
    </div>
  );
}
