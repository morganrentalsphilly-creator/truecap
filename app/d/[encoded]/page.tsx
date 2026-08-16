/**
 * Public read-only deal viewer at /d/[encoded].
 *
 * Anyone with the link can view a snapshot of an analysis. No auth,
 * no DB lookup — the entire form snapshot is encoded in the URL.
 * Hidden Pro-only sections (10-year projections, tax strategy,
 * exit scenarios, deal score) act as upgrade prompts.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Lock } from "lucide-react";
import { decodeShareLink } from "@/lib/share-link";
import { calculateAnalysis } from "@/lib/calc-analysis";
import { investmentFormSchema } from "@/lib/investcalc-schema";
import { ReadOnlyAnalysisView } from "@/components/investcalc/read-only-analysis-view";
import { TrackSharedDealView } from "@/components/analytics/track-shared-deal-view";
import { getPublicAgentBranding } from "@/lib/agent-share";
import { verifyShareAttribution, hashShareValues } from "@/lib/share-attribution";
import { getPublicDealComps } from "@/lib/public-deal-comps";
import { LeadCaptureForm } from "@/components/investcalc/lead-capture-form";

// Next.js 15+ makes `params` async (Promise). Without awaiting it, accessing
// .encoded synchronously throws in dev and silently breaks in prod.
type Props = { params: Promise<{ encoded: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { encoded } = await params;
  const payload = decodeShareLink(encoded);
  const title = payload?.meta?.title || payload?.values?.address || "Shared deal";
  return {
    title: title,
    description:
      "A rental property analysis shared with you via TrueCap — institutional-grade math, no spreadsheet required.",
    alternates: { canonical: `/d/${encoded}` },
    robots: { index: false, follow: false }, // share links shouldn't be indexed
    openGraph: {
      title: `${title} — Rental property analysis`,
      description: "Shared via TrueCap.",
      // No images: [] here — the sibling opengraph-image.tsx file is
      // auto-detected by Next.js and generates a per-deal preview card
      // showing the address + key metrics + recommendation badge. That
      // dynamic image wins over any static URL declared here.
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} — Rental property analysis`,
      description: "Shared via TrueCap.",
    },
  };
}

export default async function PublicDealPage({ params }: Props) {
  const { encoded } = await params;
  const payload = decodeShareLink(encoded);

  if (!payload) {
    return <InvalidLink />;
  }

  // The snapshot may have come from any time — re-validate against the
  // current schema so we don't crash if a saved analysis is missing a
  // newer required field.
  const parsed = investmentFormSchema.safeParse(payload.values);
  if (!parsed.success) {
    return <InvalidLink reason="This shared analysis was saved in an older format we can no longer render." />;
  }

  let result;
  try {
    result = calculateAnalysis(parsed.data);
  } catch {
    return <InvalidLink reason="We couldn't recompute the analysis from this share link." />;
  }

  // Co-branding (T6): if a Pro owner shared this, surface their brand + a lead
  // form. Falls back to the generic TrueCap view for free/anonymous shares.
  // Comps: if a saved deal was shared, back the rent/value with its stored
  // comparables (owner-verified). Both are best-effort and parallelizable.
  // Owner attribution (co-branding + lead capture + the owner's saved comps) is
  // only honored when its HMAC verifies against {ownerId, dealId, valuesHash} —
  // otherwise a hand-edited payload could wrap this deal in any user's brand and
  // harvest leads to them. Unsigned/forged/secret-unset → generic TrueCap view.
  const valuesHash = hashShareValues(parsed.data);
  const attributionVerified = verifyShareAttribution({
    ownerId: payload.meta?.ownerId,
    dealId: payload.meta?.dealId,
    valuesHash,
    sig: payload.meta?.sig,
  });
  const verifiedOwnerId = attributionVerified ? payload.meta?.ownerId : undefined;
  const verifiedDealId = attributionVerified ? payload.meta?.dealId : undefined;

  const [agent, comps] = await Promise.all([
    getPublicAgentBranding(verifiedOwnerId),
    getPublicDealComps(verifiedDealId, verifiedOwnerId),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <TrackSharedDealView hasAddress={Boolean(parsed.data.address)} />
      {/* Top banner — agent-branded when a Pro owner shared it, else TrueCap. */}
      {agent ? (
        <div
          className="flex items-center justify-center gap-2 py-2.5 px-4 text-center text-xs font-semibold text-white sm:text-sm"
          style={{ background: agent.primaryColor ?? "var(--primary)" }}
        >
          {agent.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={agent.logoUrl} alt="" className="h-5 w-auto rounded-sm bg-white/90 p-0.5" />
          ) : null}
          <span>Shared by {agent.displayName}</span>
        </div>
      ) : (
        <div className="bg-primary text-primary-foreground py-2 px-4 text-center text-xs sm:text-sm">
          Shared via{" "}
          <Link href="/" className="font-bold underline underline-offset-2">
            TrueCap
          </Link>{" "}
          — view-only. Want to edit, save, or run your own? Start free at{" "}
          <Link href="/" className="font-bold underline underline-offset-2">
            usetruecap.com
          </Link>
          .
        </div>
      )}

      {/* pb-28/sm:pb-16 reserves clearance so the footer's last row scrolls
          clear of the fixed cookie-consent banner (z-50, bottom-0) that overlays
          /d for a first-visit, pre-consent viewer. */}
      <main id="main" className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-28 sm:pb-16">
        <header className="mb-6 sm:mb-8">
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-1">
            Shared analysis
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
            {parsed.data.address}
          </h1>
          {parsed.data.purchasePrice && (
            <p className="text-sm text-muted-foreground mt-1">
              Purchase price ${parsed.data.purchasePrice.toLocaleString("en-US")}
              {parsed.data.yearBuilt ? ` · built ${parsed.data.yearBuilt}` : ""}
            </p>
          )}
        </header>

        <ReadOnlyAnalysisView values={parsed.data} result={result} comps={comps} />

        {/* Agent lead capture (co-branded shares) OR the generic Pro upsell. */}
        {agent && verifiedOwnerId ? (
          <LeadCaptureForm
            ownerId={verifiedOwnerId}
            /* The same signed attribution this page just verified, forwarded so
               the WRITE path can re-verify it. Without it captureDealLeadAction
               trusted a bare ownerId from the request body — anyone could post
               a Pro user's uuid and land rows in their private lead inbox. */
            dealId={verifiedDealId}
            valuesHash={valuesHash}
            sig={payload.meta?.sig}
            agentName={agent.displayName}
            dealAddress={parsed.data.address}
            accentColor={agent.primaryColor}
          />
        ) : (
          <div className="mt-6 rounded-2xl border border-primary/30 bg-[var(--brand-blue-light)] p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-foreground">
                  See 10-year projections, illustrative tax impact, modeled exit comparisons, and Deal Score
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  The full analysis with multi-year cash flow projections,
                  illustrative depreciation tax modeling, and exit-year comparison is free
                  to start. Run this property in your own account — your edits
                  stay private.
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 mt-3 text-sm font-bold text-primary hover:underline"
                >
                  Start free at usetruecap.com
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        )}

        <footer className="mt-10 pb-8 text-center text-xs text-muted-foreground">
          <p className="mx-auto max-w-2xl">
            This shared analysis is for informational purposes only and is not
            financial, tax, or legal advice. The figures are estimates based on
            the assumptions entered by whoever created this link — verify rent,
            expenses, and financing independently before making any investment
            decision.
          </p>
          <p className="mt-3">
            Built with{" "}
            <Link href="/" className="font-bold text-foreground hover:underline">
              TrueCap
            </Link>{" "}
            — institutional-grade rental analysis, free to start.
          </p>
        </footer>
      </main>
    </div>
  );
}

function InvalidLink({ reason }: { reason?: string }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center">
      <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-2">
        TrueCap
      </div>
      <h1 className="text-xl sm:text-2xl font-bold text-foreground">
        Link couldn&apos;t be opened
      </h1>
      <p className="text-sm text-muted-foreground mt-2 max-w-md">
        {reason ??
          "This share link looks broken or malformed. Ask whoever sent it to re-send."}
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
      >
        Go to TrueCap
        <ArrowUpRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
