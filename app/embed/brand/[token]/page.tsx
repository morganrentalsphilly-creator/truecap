/**
 * GET /embed/brand/[token] — a white-label embed: the same chrome-free
 * calculator as /embed/[slug], but under an Agent Pro user's brand instead of
 * "Powered by TrueCap".
 *
 * The token is HMAC-signed (lib/signed-token) over {agentUserId, slug};
 * lib/whitelabel-embed re-checks the agent's `embed_whitelabel` entitlement and
 * that they have branding to apply. A forged, downgraded, or brand-less token
 * degrades to the ordinary TrueCap-branded embed rather than exposing a
 * chrome-less calculator — so the failure mode is "our brand" not "no brand".
 *
 * noindex, like the standard embed — this is for the agent's traffic, not SEO.
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EmbedResizeReporter } from "@/components/embed/embed-resize-reporter";
import { readSignedToken } from "@/lib/signed-token";
import { loadWhitelabelEmbed, EMBED_SCOPE } from "@/lib/whitelabel-embed";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function WhitelabelEmbedPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const decoded = readSignedToken(EMBED_SCOPE, token);

  const wl = decoded?.a && decoded?.s
    ? await loadWhitelabelEmbed({ agentUserId: decoded.a, slug: decoded.s })
    : null;

  // Fall back to the standard TrueCap-branded embed when the token can't be
  // honored — never a calculator with no attribution at all.
  if (!wl) {
    if (decoded?.s) redirect(`/embed/${decoded.s}`);
    redirect("/embed/rental-cash-flow-calculator");
  }

  const { entry, branding } = wl;
  const Widget = entry.Widget;
  const brandName = branding.displayName;
  const brandColor = branding.primaryColor ?? "var(--primary)";

  return (
    <div className="min-h-screen bg-background">
      <EmbedResizeReporter slug={entry.slug} />
      <main id="main" className="mx-auto max-w-2xl px-4 py-4 sm:px-5 sm:py-5">
        <header className="mb-3 flex items-center gap-2.5" style={{ borderBottom: `2px solid ${brandColor}`, paddingBottom: "0.5rem" }}>
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoUrl} alt={brandName} className="h-7 w-auto max-w-[140px] object-contain" />
          ) : (
            <span className="text-base font-extrabold tracking-tight text-foreground">{brandName}</span>
          )}
          <h1 className="ml-auto text-sm font-bold text-muted-foreground sm:text-base">{entry.title}</h1>
        </header>

        <Widget />

        {/* The agent's brand replaces "Powered by TrueCap". Their contact,
            when set, is the call to action — this is their lead surface. */}
        <footer className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
          <span className="font-semibold" style={{ color: brandColor }}>{brandName}</span>
          {branding.contactWebsite ? (
            <a
              href={branding.contactWebsite}
              target="_top"
              rel="noopener"
              className="font-semibold hover:underline"
              style={{ color: brandColor }}
            >
              {branding.contactName ?? "Get in touch"}
            </a>
          ) : branding.contactEmail ? (
            <a href={`mailto:${branding.contactEmail}`} className="font-semibold hover:underline" style={{ color: brandColor }}>
              {branding.contactName ?? branding.contactEmail}
            </a>
          ) : null}
        </footer>
      </main>
    </div>
  );
}
