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
import { ArrowUpRight } from "lucide-react";
import { decodeShareLink } from "@/lib/share-link";
import { calculateAnalysis } from "@/lib/calc-analysis";
import { investmentFormSchema } from "@/lib/investcalc-schema";
import { SharedDealShell } from "@/components/investcalc/shared-deal-shell";
import { getPublicAgentBranding } from "@/lib/agent-share";
import { verifyShareAttribution, hashShareValues } from "@/lib/share-attribution";
import { getPublicDealComps } from "@/lib/public-deal-comps";
import { canShowSharedProAnalysis } from "@/lib/public-share-access";

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
      "A rental property analysis shared with you via TrueCap — transparent rental math, no spreadsheet required.",
    // Do not repeat the encoded analysis snapshot in a canonical tag. The
    // request path is intentionally shareable, but metadata should not create
    // another copy for crawlers, browser extensions, or downstream tooling.
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

  const [agent, comps, showProAnalysis] = await Promise.all([
    getPublicAgentBranding(verifiedOwnerId),
    getPublicDealComps(verifiedDealId, verifiedOwnerId),
    canShowSharedProAnalysis(verifiedOwnerId),
  ]);

  return (
    <SharedDealShell
      values={parsed.data}
      result={result}
      comps={comps}
      agent={agent}
      showProAnalysis={showProAnalysis}
      leadCapture={
        agent && verifiedOwnerId
          ? {
              ownerId: verifiedOwnerId,
              dealId: verifiedDealId,
              valuesHash,
              sig: payload.meta?.sig,
            }
          : undefined
      }
    />
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
